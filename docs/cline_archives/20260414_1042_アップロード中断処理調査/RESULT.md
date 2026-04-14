# 実施結果: アップロード中断処理修正

## メタデータ
- **完了日時**: 2026-04-14 11:22
- **タスクID**: アップロード中断処理調査・修正
- **対象ファイル**:
  - `frontend/src/components/project/BulkUploadDialog.tsx`
  - `frontend/src/components/project/FormatUploadDialog.tsx`
  - `frontend/src/services/fileAccessService.ts`
  - `backend/src/controllers/fileAccessController.ts`
  - `backend/src/routes/fileAccessRoutes.ts`

---

## 修正内容サマリー

### Phase 1: バックエンド バッチ先行作成API新設
**ファイル**: `backend/src/controllers/fileAccessController.ts`, `backend/src/routes/fileAccessRoutes.ts`

- `POST /api/v1/files/init-batch` エンドポイントを新設
- アップロード開始前にバッチレコードを `pending` 状態で作成
- `batchName`・`uploadType` をリクエストボディで受け取る
- レスポンス: `{ batchId: string }`

### Phase 2: フロントエンドサービス層 initBatch 追加
**ファイル**: `frontend/src/services/fileAccessService.ts`

- `initBatch({ uploadType, batchName? })` 関数を追加
- `POST /api/v1/files/init-batch` を呼び出して `batchId` (string) を返す

### Phase 3: ダイアログ アップロード開始時に batchId 先行取得
**ファイル**: `BulkUploadDialog.tsx`, `FormatUploadDialog.tsx`

- `batchIdRef = useRef<string | null>(null)` を追加
- `handleUpload` の `try` 冒頭で `initBatch()` を呼び出し、`setBatchId` + `batchIdRef.current` に保存
- `initBatch()` の失敗はウォーニングログのみで続行（degraded gracefully）

### Phase 4: インライン「キャンセル」ボタンに確認ダイアログ追加
**ファイル**: `BulkUploadDialog.tsx`, `FormatUploadDialog.tsx`

**修正前の問題**:
```typescript
// 確認なしで即座に abort していた
const handleCancelUpload = useCallback(async () => {
  if (!abortController) return;
  abortController.abort(); // ← 即中断、確認なし
}, [abortController]);
```

**修正後**:
- `Modal.confirm` で「中断するとアップロード済みのファイルも削除されます」確認ダイアログを表示
- OK押下時に以下を順次実行:
  1. `abortController.abort()` — HTTP リクエスト中断
  2. `abortChunkUpload(id)` × 全セッション — チャンクセッション中断
  3. `cancelBatch(batchIdRef.current)` — バッチをキャンセル状態に更新
- `batchIdRef.current` 経由で最新のbatchIdを参照（stale closure 回避）

### Phase 5: FormatUploadDialog catch ブロック修正
**ファイル**: `FormatUploadDialog.tsx`

**修正前の問題**:
```typescript
catch (error) {
  // ❌ まずエラーメッセージを表示してから…
  const errorMessage = extractErrorMessage(error);
  message.error(errorMessage);
  // ❌ その後に CanceledError を判定（順序が逆）
  if ((error as any).name === 'CanceledError') {
    message.info('キャンセルされました');
    // cancelBatch を batchId state で参照（stale closure）
  }
}
```

**修正後**:
- `CanceledError` を最初に判定（BulkUploadDialogと同じ構造に統一）
- キャンセル時には `message.error` を出さず `message.info` のみ
- `cancelBatch` の呼び出しを `handleCancelUpload` 側に移動（catch では不要）
- `batchId` state の代わりに `batchIdRef.current` を使用

### Phase 6: フッターボタン「閉じる」に変更 + handleClose修正
**ファイル**: `BulkUploadDialog.tsx`, `FormatUploadDialog.tsx`

- フッターの「キャンセル」ボタンを「閉じる」に変更（`key` も `close` に変更）
- `handleClose` 内の `cancelBatch` 呼び出しを `batchId` state → `batchIdRef.current` に変更

---

## 修正前後の比較

### 中断フロー比較

| 操作 | 修正前 | 修正後 |
|------|--------|--------|
| インライン「キャンセル」ボタン | 確認なしで即中断 | 確認ダイアログ → 中断 |
| チャンクセッション中断 | なし | `abortChunkUpload` 全セッション |
| バッチキャンセル（インライン） | なし | `cancelBatch(batchIdRef.current)` |
| バッチキャンセル（×ボタン） | `batchId` state（stale） | `batchIdRef.current`（最新値） |
| CanceledError catch順序 | エラー表示後に判定 | 最初に判定 |
| batchId取得タイミング | uploadFiles完了後 | アップロード開始前（先行取得） |

### stale closure 問題の解消

`handleCancelUpload` は `useCallback` でメモ化されるため、内部で `batchId` state を参照すると
クロージャが古い値（`null`）を参照する stale closure が発生していた。

```typescript
// ❌ 修正前: handleCancelUpload 内の batchId は null のまま
const handleCancelUpload = useCallback(async () => {
  await cancelBatch(batchId); // batchId = null（stale）
}, [abortController]); // batchId が依存配列にない

// ✅ 修正後: ref は常に最新値を参照
const handleCancelUpload = useCallback(() => {
  const currentBatchId = batchIdRef.current; // 常に最新
  await cancelBatch(currentBatchId);
}, [abortController]);
```

---

## 残存課題・注意事項

1. **`handleClose` の依存配列**: `[uploadState.isUploading, batchId, onClose]` に `batchId` が残っているが、
   内部では `batchIdRef.current` を使用しているため実害なし。次回リファクタリング時に除去推奨。

2. **`handleUpload` の依存配列**: `[..., batchId]` が含まれているが、
   `initBatch` の先行取得により `batchId` は handleUpload 内で設定されるため実質不要。次回リファクタリング時に除去推奨。

3. **initBatch の認証**: バックエンドの `initBatch` エンドポイントは認証ミドルウェア (`authMiddleware`) を適用済み。
   認証失敗時はウォーニングログのみで続行するため、アップロード自体は正常動作する。

---

## テスト確認項目

- [ ] アップロード中にインライン「キャンセル」ボタンを押すと確認ダイアログが表示される
- [ ] 確認ダイアログで「続行」を押すとアップロードが再開される
- [ ] 確認ダイアログで「中断する」を押すとアップロードが中断される
- [ ] 中断後、バッチが `cancelled` 状態になっている（DB確認）
- [ ] アップロード中に×ボタン（handleClose）を押すと確認ダイアログが表示される
- [ ] フッター「閉じる」ボタンがアップロード中は disabled になっている
- [ ] アップロード完了後に「閉じる」ボタンで正常にダイアログが閉じられる
- [ ] FormatUploadDialog でも同様の動作が確認できる
