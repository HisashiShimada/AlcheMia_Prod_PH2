# アップロード中断処理 調査レポート

- **調査日時**: 2026-04-14 10:42
- **対象ファイル**:
  - `frontend/src/components/project/BulkUploadDialog.tsx`
  - `frontend/src/components/project/FormatUploadDialog.tsx`
  - `frontend/src/services/fileAccessService.ts`

---

## 1. 概要

両ダイアログのアップロード中断処理を調査した結果、**複数のバグ・設計上の問題**が確認された。
特に `FormatUploadDialog` のキャンセルエラーハンドリングには明確な実装ミスがあり、`BulkUploadDialog` にも `batchId` の取得タイミングに関する競合問題が存在する。

---

## 2. 中断処理の全体フロー（設計上の意図）

```
[ユーザーが「キャンセル」ボタン押下]
        ↓
handleCancelUpload()
  abortController.abort()   ← HTTPリクエストにAbortSignalを送信
        ↓
uploadFiles() の中で進行中の axios.post が ERR_CANCELED で reject
        ↓
fileAccessService.ts の uploadFiles()
  → ERR_CANCELED を検知して CanceledError に変換してthrow
        ↓
handleUpload() の catch ブロック
  → error.name === 'CanceledError' で分岐
  → cancelBatch(batchId) でサーバー側のバッチを取り消し
        ↓
[ダイアログを閉じる場合]
handleClose() → Modal.confirm → onOk
  → abortChunkUpload(id) × N  ← チャンクセッションの一時ファイル削除
  → cancelBatch(batchId)       ← バッチレコードをcancelled状態に更新
```

---

## 3. 発見されたバグ・問題点

### 【問題1】FormatUploadDialog: キャンセルエラーの検知が機能しない ❌（重大）

**ファイル**: `FormatUploadDialog.tsx` L324〜402

**現状のコード**:
```typescript
} catch (error) {
  // ← ① まずエラーメッセージを取り出してstateにセット＆toast表示
  const errorMessage = extractErrorMessage(error);
  setUploadState(prev => ({ ...prev, isUploading: false, error: errorMessage }));
  message.error(errorMessage);

  // ← ② その後でキャンセル判定
  if ((error as any).name === 'CanceledError') {
    message.info('アップロードがキャンセルされました');
    if (batchId) { ... }
    setUploadState(prev => ({ ...prev, isUploading: false, error: 'キャンセルされました' }));
  } else {
    // MAIMLバリデーションエラー処理 ...
  }
}
```

**問題の詳細**:

1. **キャンセル時にエラートーストが誤表示される**: `CanceledError` を検知する `if` 文よりも**前**に `message.error(errorMessage)` が無条件で実行されるため、ユーザーキャンセルなのにエラートーストが表示される。
2. **エラーメッセージが「キャンセルされました」で上書きされるが、一瞬エラー表示が出る**: `setUploadState` が2回呼ばれ、最終的には `error: 'キャンセルされました'` になるが、一瞬 `error: errorMessage` でレンダリングされる。
3. **設計意図と逆順**: `CanceledError` かどうかを最初に判定すべきところを、最後に判定している。

**`BulkUploadDialog` との比較**（こちらは正しい）:
```typescript
} catch (error) {
  // ← ① 先にキャンセル判定
  if ((error as { name?: string }).name === 'CanceledError') {
    message.info('アップロードがキャンセルされました');
    if (batchId) { await cancelBatch(batchId); }
    setUploadState(...);
  } else {
    // ← ② それ以外のエラーを処理
    const errorMessage = extractErrorMessage(error);
    ...
  }
}
```

`BulkUploadDialog` は `CanceledError` を**先に**チェックしており正しい実装。

---

### 【問題2】FormatUploadDialog: キャンセル時にbatchIdが参照できない可能性 ❌（重大）

**ファイル**: `FormatUploadDialog.tsx` L290〜293, L337〜343

**現状のコード**:
```typescript
// try ブロック内（正常完了後）
if (response.batchId) {
  setBatchId(response.batchId);  // ← stateに保存
}

// catch ブロック内（キャンセル時）
if (batchId) {  // ← state の batchId を参照
  await cancelBatch(batchId);
}
```

**問題の詳細**:

- `setBatchId()` は React の `useState` の更新であるため、**非同期**で適用される。
- ファイルアップロード中（`uploadFiles()` の実行中）にキャンセルされた場合、`batchId` は `null` のままであり、`setBatchId(response.batchId)` は**正常完了後**にしか呼ばれない。
- したがって、アップロード途中でキャンセルした場合は常に `batchId === null` となり、`cancelBatch()` が**呼ばれない**。

この問題は `BulkUploadDialog` にも**同様に存在**する（L297〜299, L340〜346）。

**根本原因**: `batchId` はバックエンドからアップロード完了後にレスポンスとして返却される値（`response.batchId`）であり、アップロードが**途中でキャンセルされた場合はそもそも取得できない**。

---

### 【問題3】BulkUploadDialog / FormatUploadDialog: handleCancelUpload が AbortController を abort するだけ ⚠️（中程度）

**ファイル**: 両ダイアログ共通

**現状のコード**:
```typescript
const handleCancelUpload = useCallback(async () => {
  if (!abortController) return;
  abortController.abort();  // ← これだけ
}, [abortController]);
```

**問題の詳細**:

- `abortController.abort()` により `axios` リクエストは中断されるが、**チャンクアップロード（10MB超のファイル）の場合**、`abortChunkUpload(uploadId)` が呼ばれない。
- チャンクアップロードのキャンセルは `handleClose()` の中の `onOk` コールバックで `abortChunkUpload()` を呼ぶ設計になっているが、**「キャンセル」ボタンのみを押した場合（ダイアログを閉じない場合）はチャンクセッションの一時ファイルがサーバーに残り続ける**。
- `activeUploadIdsRef.current` に `uploadId` が蓄積されているが、`handleCancelUpload` ではこれを使っていない。

**`handleClose()` のチャンク中断処理（正しく実装されている部分）**:
```typescript
const ids = activeUploadIdsRef.current;
if (ids.length > 0) {
  await Promise.all(ids.map((id) => abortChunkUpload(id)));
  activeUploadIdsRef.current = [];
}
```
この処理が `handleCancelUpload` では行われていない。

---

### 【問題4】FormatUploadDialog: MAIMLバリデーションエラー時に二重エラー表示 ❌（中程度）

**ファイル**: `FormatUploadDialog.tsx` L324〜402

前述の問題1と同じ構造で発生する。

**処理フロー**:
```
catch(error)
  ① message.error(errorMessage)  ← エラートースト表示
  ② else { if (errorCode === 'MAIML_VALIDATION_ERROR') { ... Modal.error() } }
```

MAIMLバリデーションエラーの場合：
- まず `message.error(errorMessage)` でトーストが表示される
- その後 `Modal.error()` でモーダルが表示される

**結果**: エラートーストとエラーモーダルの**二重表示**が発生する。

`BulkUploadDialog` では `CanceledError` を先にチェックした後、`else` 内で `MAIMLバリデーションエラー` を処理しており、`message.error` は `else` のさらに内側の `else` でのみ実行されるため二重表示しない。

---

### 【問題5】fileAccessService: チャンクアップロード中のAbortSignalが渡されていない ⚠️（中程度）

**ファイル**: `fileAccessService.ts` L385〜425

**現状のコード**:
```typescript
const uploadSingleFileWithChunks = async (file: File): Promise<UploadedFileInfo> => {
  const filePath = `${targetPath.replace(/\/+$/, '')}/${file.name}`;
  const fileKey = await uploadFileWithChunks(file, filePath, {
    onProgress: ...,
    onSessionInit,
    onRetry,
    // ← signal が渡されていない！
  });
  ...
};
```

**`uploadFileWithChunks`関数のシグネチャ（`ChunkUploadOptions`型）の確認が必要**だが、`signal` が `ChunkUploadOptions` に存在するかどうかに関わらず、現状のコードでは `signal` をチャンクアップロードに渡していない。

これにより、**10MB超のファイルのチャンクアップロードでは `AbortController.abort()` が効かない**可能性がある。`withRetry` 内の `axios` リクエストに `signal` が設定されていないため。

---

## 4. 問題点まとめ表

| # | ファイル | 問題内容 | 深刻度 |
|---|---------|---------|--------|
| 1 | FormatUploadDialog | catch ブロックの処理順序ミスによりキャンセル時にエラートーストが表示される | 🔴 重大 |
| 2 | 両ダイアログ | アップロード途中キャンセル時は `batchId` が取得できないため `cancelBatch()` が呼ばれない | 🔴 重大 |
| 3 | 両ダイアログ | 「キャンセル」ボタン押下時にチャンクセッション（`abortChunkUpload`）が中断されない | 🟡 中程度 |
| 4 | FormatUploadDialog | MAIMLバリデーションエラー時にエラートーストとモーダルが二重表示される | 🟡 中程度 |
| 5 | fileAccessService | チャンクアップロードに `AbortSignal` が渡されておらず abort が効かない可能性 | 🟡 中程度 |

---

## 5. フロー別の動作実態

### 5-1. 通常アップロード（10MB以下）でキャンセルボタンを押した場合

| | BulkUploadDialog | FormatUploadDialog |
|--|--|--|
| HTTP中断 | ✅ `abortController.abort()` | ✅ `abortController.abort()` |
| キャンセルトースト表示 | ✅ 「キャンセルされました」 | ❌ まずエラートーストが出てから「キャンセルされました」が表示 |
| サーバー側バッチ取り消し | ❌ `batchId=null`のため呼ばれない | ❌ `batchId=null`のため呼ばれない |
| エラーstate処理 | ✅ 正常 | ❌ 一瞬エラーが表示される |

### 5-2. チャンクアップロード（10MB超）でキャンセルボタンを押した場合

| | BulkUploadDialog | FormatUploadDialog |
|--|--|--|
| HTTP中断 | ❓ signalが渡されていない可能性 | ❓ signalが渡されていない可能性 |
| チャンクセッション削除 | ❌ `abortChunkUpload`が呼ばれない | ❌ `abortChunkUpload`が呼ばれない |
| サーバー側バッチ取り消し | ❌ `batchId=null`のため呼ばれない | ❌ `batchId=null`のため呼ばれない |

### 5-3. ダイアログの「×」ボタン or フッターの「キャンセル」ボタンでダイアログを閉じる場合（アップロード中）

| | BulkUploadDialog | FormatUploadDialog |
|--|--|--|
| 確認モーダル表示 | ✅ | ✅ |
| チャンクセッション削除 | ✅ `abortChunkUpload` が呼ばれる | ✅ `abortChunkUpload` が呼ばれる |
| サーバー側バッチ取り消し | ❌ `batchId=null`のため呼ばれない | ❌ `batchId=null`のため呼ばれない |

---

## 6. 修正方針

### 問題1・4（FormatUploadDialog の catch 順序）

`catch` ブロックを `BulkUploadDialog` と同様の構造に修正する。

```typescript
// 修正後
} catch (error) {
  if ((error as { name?: string }).name === 'CanceledError') {
    // キャンセル処理
    message.info('アップロードがキャンセルされました');
    if (batchId) { await cancelBatch(batchId); }
    setUploadState(prev => ({ ...prev, isUploading: false, error: 'キャンセルされました' }));
  } else {
    const axiosError = error as any;
    const errorCode = axiosError?.response?.data?.error?.code;
    if (errorCode === 'MAIML_VALIDATION_ERROR') {
      // MAIMLバリデーションエラー処理（message.error を出さない）
      ...
    } else {
      const errorMessage = extractErrorMessage(error);
      setUploadState(prev => ({ ...prev, isUploading: false, error: errorMessage }));
      message.error(errorMessage);
    }
  }
}
```

### 問題2（batchId が取得できない）

`batchId` は**アップロード完了後**にしか取得できないという設計上の限界がある。キャンセル時のバッチ取り消しには以下の選択肢がある：

**案A**: アップロード開始時にバックエンドで先にバッチレコードを作成し、フロントエンドに `batchId` を返す設計に変更する（バックエンド改修が必要）。

**案B**: `batchId` を `useRef` で保持し、React の state 更新の非同期性を回避する（現状のロジックでも `response.batchId` が取得できた後にキャンセルした場合には機能させる）。

```typescript
// batchIdRef を追加
const batchIdRef = useRef<string | null>(null);

// batchId 取得時に ref も更新
if (response.batchId) {
  setBatchId(response.batchId);
  batchIdRef.current = response.batchId;  // ← 追加
}

// catch ブロックでは ref を参照
if (batchIdRef.current) {
  await cancelBatch(batchIdRef.current);
}
```

ただし、アップロード途中（`uploadFiles()` 実行中）にキャンセルした場合は根本的に `batchId` が存在しないため、案Aのバックエンド改修が望ましい。

### 問題3（handleCancelUpload でチャンクセッションが中断されない）

```typescript
const handleCancelUpload = useCallback(async () => {
  if (!abortController) return;
  
  // チャンクセッションも中断
  const ids = activeUploadIdsRef.current;
  if (ids.length > 0) {
    await Promise.all(ids.map((id) => abortChunkUpload(id)));
    activeUploadIdsRef.current = [];
  }
  
  abortController.abort();
}, [abortController]);
```

### 問題5（チャンクアップロードに AbortSignal が渡されていない）

`fileAccessService.ts` の `uploadSingleFileWithChunks` に `signal` を渡し、`uploadFileWithChunks` の `ChunkUploadOptions` にも `signal` を追加する対応が必要（型定義と実装の両方を確認・修正）。

---

## 7. 影響範囲

- **ユーザーへの影響**: アップロード途中でキャンセルしてもサーバー側にファイルや一時データが残る可能性がある。`FormatUploadDialog` では意図しないエラートーストが表示される。
- **データ整合性への影響**: `cancelBatch` が呼ばれないため、`upload_batch` テーブルのレコードがキャンセル状態に更新されない。

