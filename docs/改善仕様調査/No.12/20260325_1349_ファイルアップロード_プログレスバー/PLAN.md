# タスク計画書: ファイルアップロード プログレスバー実装

## メタデータ
- **作成日時**: 2026-03-25 13:49
- **更新日時**: 2026-03-25 15:40（統一計算式に変更）
- **タスクID**: upload-progress-bar
- **優先度**: 中
- **推定工数**: 1〜2時間

## タスク概要

チャンク分割アップロードの進捗をユーザーに視覚的に伝えるため、アップロードダイアログにプログレスバーを実装する。  
ファイルサイズ（10MB 以下・超）にかかわらず、**統一計算式**でプログレスバーを制御する。

---

## プログレスバーの進捗計算方式（統一計算式）

**ファイルサイズにかかわらず、すべてのアップロードで以下の統一計算式を使用する。**

```
進捗 = (完了済みバイト数 + e.loaded) / file.size × 100
```

- `完了済みバイト数`: これまでに送り終えたバイト数
- `e.loaded`: axios が報告する「現在のリクエストで送信済みのバイト数」
- `file.size`: ファイル全体のバイト数

**この計算式は `uploadFiles()`（通常方式）と `uploadFileWithChunks()`（チャンク方式）の 2 か所に実装する。**  
`完了済みバイト数` に入れる値だけが異なる（通常方式: `0`、チャンク方式: `完了チャンク数 × chunkSize`）。

### 計算例

**通常方式（5MB ファイル、3MB 送信済み）:**
```
進捗 = (0 + 3MB) / 5MB × 100 = 60%
```

**チャンク方式（35MB ファイル、チャンク 1, 2 完了・チャンク 3 を 6MB 送信中）:**
```
進捗 = (2 × 10MB + 6MB) / 35MB × 100
     = 26MB / 35MB × 100
     ≈ 74%
```

### プログレスバーの動き

どちらの方式でも **スムーズに 0→99%→100% と連続的に動く**。

```
【通常方式（5MB ファイル）】
  0%  ░░░░░░░░░░░░░░░░░░░░
 40%  ████████░░░░░░░░░░░░  ← 送信中（連続更新）
 99%  ████████████████████  ← 送信完了（99%キャップ）
100%  ████████████████████ ✅ サーバーレスポンス成功後

【チャンク方式（35MB ファイル）】
  0%  ░░░░░░░░░░░░░░░░░░░░  チャンク1 開始
 28%  █████░░░░░░░░░░░░░░░  チャンク1 完了 → チャンク2 開始（途切れなし）
 57%  ████████████░░░░░░░░  チャンク2 完了 → チャンク3 開始（途切れなし）
 85%  █████████████████░░░  チャンク3 完了 → チャンク4 開始（途切れなし）
 99%  ████████████████████  チャンク4 完了（99%キャップ、complete API 待ち）
100%  ████████████████████ ✅ complete API 成功後
```

### 実装コード

**通常方式（`uploadFiles()` 内）:**
```typescript
onUploadProgress: (e: AxiosProgressEvent) => {
  const percent = Math.min(
    Math.round((e.loaded / file.size) * 100),
    99  // 100% はサーバーレスポンス成功後にのみ設定
  );
  onProgress(percent);
}
// サーバーレスポンス成功後
onProgress(100);
```

**チャンク方式（`uploadFileWithChunks()` 内）:**
```typescript
await client.post(`/files/chunks/${uploadId}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (e: AxiosProgressEvent) => {
    if (options.onProgress) {
      const completedBytes = i * chunkSize;   // 完了チャンク分のバイト数
      const percent = Math.min(
        Math.round(((completedBytes + e.loaded) / file.size) * 100),
        99  // 100% は complete API 成功後にのみ設定
      );
      options.onProgress(percent);
    }
  },
});
// complete API 成功後
options.onProgress(100);
```

---

## 目的と期待される成果

- [ ] アップロード中に進捗（0〜100%）がリアルタイムで表示される
- [ ] 通常方式・チャンク方式ともに同じ計算式でスムーズに進捗が更新される
- [ ] アップロード完了時（サーバーレスポンス / complete API 成功後）にプログレスバーが 100% になる
- [ ] エラー・中断時にプログレスバーがエラー状態（赤）で表示される

---

## 実装ステップ

### Phase 1: 型定義追加
- [ ] `frontend/src/types/file.ts` に `UploadProgressState` 型を追加
  - `percent`: 現在の進捗（0〜100）
  - `status`: `'active'` / `'success'` / `'exception'` / `'normal'`
  - `currentChunk`: 現在送信中のチャンク番号（チャンク方式のみ、参考情報）
  - `totalChunks`: 総チャンク数（チャンク方式のみ、参考情報）
- [ ] `ChunkUploadOptions.onProgress` のシグネチャを変更
  - 変更前: `(sentChunks: number, totalChunks: number) => void`
  - 変更後: `(percent: number) => void`（統一計算済みの percent を受け取る）

### Phase 2: サービス層 - 統一計算式の実装
- [ ] `frontend/src/services/fileAccessService.ts` の `uploadFileWithChunks()` を改修
  - 各チャンク送信の `client.post()` に `onUploadProgress` を追加
  - 統一計算式: `Math.min(Math.round(((i × chunkSize + e.loaded) / file.size) * 100), 99)`
  - complete API 成功後に `options.onProgress(100)` を呼び出す
- [ ] `uploadFiles()` の通常方式（10MB 以下）の進捗コールバックを統一計算式に変更
  - 変更前: `Math.round((e.loaded * 100) / e.total)`
  - 変更後: `Math.min(Math.round((e.loaded / file.size) * 100), 99)`
  - サーバーレスポンス成功後に `onProgress(100)` を呼び出す

### Phase 3: UIコンポーネント改修
- [ ] `frontend/src/components/project/BulkUploadDialog.tsx` にプログレスバーを追加
  - `useState<Map<string, UploadProgressState>>` でファイルごとの進捗状態を管理
  - Ant Design `<Progress>` コンポーネントを各ファイル行に表示
  - アップロード完了後: `status: 'success'`（緑）
  - エラー時: `status: 'exception'`（赤）

---

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `frontend/src/types/file.ts` | 修正 | `UploadProgressState` 型追加、`onFileProgress` コールバック追加 |
| `frontend/src/services/fileAccessService.ts` | 修正 | `uploadFiles()` をファイルごと個別リクエスト並行方式（`Promise.allSettled`）に変更、`onFileProgress` で各ファイルの進捗を通知 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 修正 | `fileProgressMap` state 追加、各ファイル行に `<Progress>` 表示、`onFileProgress` コールバック接続 |

---

## 進捗計算仕様まとめ

| アップロード方式 | 計算式 | 100% になるタイミング |
|---|---|---|
| 通常方式（10MB 以下） | `Math.min(Math.round((e.loaded / file.size) × 100), 99)` | サーバーレスポンス成功後 |
| チャンク方式（10MB 超） | `Math.min(Math.round(((完了チャンク × chunkSize + e.loaded) / file.size) × 100), 99)` | complete API 成功後 |

---

## UI 仕様

| 状態 | 表示 |
|---|---|
| アップロード前 | プログレスバー非表示 |
| アップロード中 | `status="active"`（青・ストライプアニメーション）、パーセント表示 |
| 完了 | `status="success"`（緑）、100% |
| エラー | `status="exception"`（赤）、エラーメッセージ表示 |
| リトライ中 | `status="active"`（青）、「リトライ中... (X/3)」のラベル表示 |

---

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| 複数ファイル同時アップロード時の状態管理の複雑化 | 中 | ファイルごとにキーを持つ `Map<string, UploadProgressState>` で管理 |
| `onProgress` シグネチャ変更による呼び出し箇所の修正漏れ | 中 | `uploadFiles()` 内のコールバック呼び出し箇所を一括確認して修正 |
| 小ファイルで進捗が 0→100 に一瞬で変わる | 低 | 許容範囲として扱う（UX 上の問題なし） |
| `onUploadProgress` の発火頻度がブラウザ・ネットワーク環境によって異なる | 低 | 問題なし（発火頻度が変わるだけで計算式は正確） |

---

## テスト計画

- [ ] 10MB 超のファイル: チャンク送信中もプログレスバーが連続的に更新されること
- [ ] 10MB 超のファイル: complete API 成功後に 100% になること（99% でキャップされていること）
- [ ] 10MB 以下のファイル: スムーズに進捗が更新されること
- [ ] 10MB 以下のファイル: サーバーレスポンス成功後に 100% になること（99% でキャップされていること）
- [ ] アップロード完了後: プログレスバーが 100%（緑）になること
- [ ] エラー発生時: プログレスバーがエラー状態（赤）になること
- [ ] 複数ファイル同時アップロード: 各ファイルの進捗が独立して表示されること

---

## まとめ

複数ファイルを同時アップロードする際に各ファイルの進捗を独立して表示するプログレスバーを実装した。全ファイルを 1 リクエストにまとめる方式ではファイルごとの進捗取得が不可能なため、各ファイルを個別リクエストで並行送信する方式（`Promise.allSettled`）に変更した。

変更対象はフロントエンド **4 ファイル**（型定義・サービス・BulkUploadDialog・**FormatUploadDialog**）。アップロード中は `active`（青）、完了時は `success`（緑）、失敗時は `exception`（赤）でプログレスバーを表示する。

| ファイル | 変更内容 |
|---|---|
| `frontend/src/types/file.ts` | `UploadProgressState` 型追加、`onFileProgress` コールバック追加 |
| `frontend/src/services/fileAccessService.ts` | `uploadFiles()` をファイルごと個別リクエスト並行方式（`Promise.allSettled`）に変更、`onFileProgress` で各ファイルの進捗を通知 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | `fileProgressMap` state 追加、各ファイル行に `<Progress>` 表示、`onFileProgress` コールバック接続 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | 同上（BulkUploadDialog と同一の対応） |

なお、`onFileProgress` は `BulkUploadDialog` のみに接続されており、`FormatUploadDialog` では `onProgress`（全体進捗）経由で各ファイルのプログレスバーを更新する実装となっている点に留意。
