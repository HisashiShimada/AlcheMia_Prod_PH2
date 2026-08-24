# タスク計画書: Insertion 保存時アップロード方式変更

## メタデータ
- **作成日時**: 2026-08-20 16:25
- **タスクID**: insertion-deferred-upload
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## 1. タスク概要

現在 `useInsertionEditor` はファイル選択後に確認ダイアログで「アップロードする」を選ぶと即座にS3へアップロードを実行している。そのため保存ボタンを押さずにダイアログを閉じると、S3にはファイルが残るが Insertion のデータは保存されない（孤立ファイル問題）が発生する。

### 変更後のフロー

```
ファイル選択 → ハッシュ計算 → URI = file:///ファイル名 で即セット
  → uploadTargetPath あり → 確認ダイアログ表示
      「ローカル参照のみ」→ file:///ファイル名 のまま確定（File オブジェクト破棄）
      「保存時にアップロードする」
           → S3キーを事前計算: targetPath/file.name
           → URI = buildStorageUri(s3Key) で更新（この時点ではまだアップロードしない）
           → File オブジェクトをフック内部（pendingFile）で保持
           → 保存ボタン押下 → uploadPendingFile() 実行 → 実際のアップロード
           → ダイアログキャンセル → pendingFile 破棄・S3 には何も残らない
```

---

## 2. 期待される成果

- [ ] `frontend/src/hooks/useInsertionEditor.ts` 修正
- [ ] `frontend/src/components/common/InsertionEditorForm.tsx` 修正
- [ ] `frontend/src/components/common/InsertionEditorCompact.tsx` 修正
- [ ] `frontend/src/components/editorv2/TemplateEditorDialog.tsx` 修正
- [ ] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` 修正
- [ ] `frontend/src/locales/ja.json` 修正
- [ ] `frontend/src/locales/en.json` 修正

---

## 3. 実装ステップ

### Phase 1: `useInsertionEditor.ts` 変更
- [ ] `pendingFile: File | null` / `pendingS3Key: string | null` state を追加
- [ ] `uploadPendingFile: () => Promise<void>` を戻り値に追加
- [ ] 確認ダイアログの `onOk` を「S3キー事前計算 + pendingFile保持」に変更（即時アップロード廃止）
- [ ] `handleClear` で pendingFile / pendingS3Key もクリア
- [ ] `UseInsertionEditorReturn` 型に `pendingFile` / `uploadPendingFile` を追加

### Phase 2: UI コンポーネント修正
- [ ] `InsertionEditorForm.tsx` に `onUploadPendingFileReady` prop 追加・pendingFile バッジ表示
- [ ] `InsertionEditorCompact.tsx` 同上

### Phase 3: `TemplateEditorDialog.tsx` 修正
- [ ] `uploadPendingFileRef` を追加し `handleSave` 内で `await uploadPendingFile()` を呼び出し

### Phase 4: `WorkRecordPanel.tsx` 修正
- [ ] `uploadFnMapRef` で複数スロットの uploadPendingFile を一元管理
- [ ] `handleSave` / `handleSaveAndNext` の先頭で全 pendingFile をアップロード

### Phase 5: i18n 変更
- [ ] `uploadConfirmOk`: 「保存時にアップロードする」
- [ ] `uploadConfirmCancel`: 「ローカル参照のみ」
- [ ] `pendingUploadBadge`（新規）: 「保存時にアップロード予定」

### Phase 6: tsc 確認
- [ ] `cd frontend && npx tsc --noEmit` で今回変更ファイルに起因するエラー 0 件

---

## 4. 承認記録

- **計画書提示日時**: 2026-08-20 16:25
- **承認日時**: 2026-08-20 16:25（Actモード切り替えで承認確認）

---

## 5. 実施記録

### 実施日時
- 開始: 2026-08-20 16:25
- 完了: 2026-08-20 17:20

### 完了チェックリスト
- [x] `frontend/src/hooks/useInsertionEditor.ts` 修正（pendingFile保持・uploadPendingFile公開・即時アップロード廃止）
- [x] `frontend/src/components/common/InsertionEditorForm.tsx` 修正（pendingFileバッジ・onUploadPendingFileReady prop追加）
- [x] `frontend/src/components/common/InsertionEditorCompact.tsx` 修正（同上）
- [x] `frontend/src/components/editorv2/TemplateEditorDialog.tsx` 修正（保存時にuploadPendingFile呼び出し・handleSave async化）
- [x] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` 修正（uploadFnMapRef・handleSave/handleSaveAndNext async化）
- [x] `frontend/src/locales/ja.json` 修正（文言変更・pendingUploadBadge追加）
- [x] `frontend/src/locales/en.json` 修正（同上）
- [x] `tsc --noEmit` で今回変更ファイルに起因するエラー 0 件を確認
