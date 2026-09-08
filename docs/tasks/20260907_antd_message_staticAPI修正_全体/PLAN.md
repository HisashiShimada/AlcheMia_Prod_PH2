# タスク計画書: antd message静的API警告修正（全体）

## メタデータ
- **作成日時**: 2026-09-07
- **タスクID**: antd_message_static_fix_all
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要
`frontend/src/components/project` 以外のフォルダにも同様の antd message静的API警告が存在するため、全体を調査・修正する。

## 修正対象ファイル一覧（36件）

### components/ExperimentWorker/
- [ ] `IssueManagementModal.tsx`
- [ ] `WorkRecordPanel.tsx`

### components/TransitionSetSearch/
- [ ] `TransitionSetSearchModal.tsx`

### components/auth/
- [ ] `AuthContainer.tsx`

### components/editorv2/
- [ ] `MethodTabPanel.tsx`
- [ ] `PropertyPanel.tsx`
- [ ] `TemplateEditorDialog.tsx`
- [ ] `ValidationPanel.tsx`
- [ ] `WorkflowSelectorDialog.tsx`

### components/encryption/
- [ ] `EncryptionManagement.tsx`
- [ ] `KeyCreateModal.tsx`
- [ ] `KeyExportModal.tsx`
- [ ] `KeyImportModal.tsx`
- [ ] `KeyManagement.tsx`
- [ ] `KeyRotateModal.tsx`

### components/format/
- [ ] `CreateFormatFolderModal.tsx`
- [ ] `FormatEditorDialog.tsx`

### components/namespace/
- [ ] `DetailModal.tsx`
- [ ] `GlobalNamespaceView.tsx`
- [ ] `NamespaceAddDialog.tsx`
- [ ] `NamespaceMain.tsx`
- [ ] `PrefixManagement.tsx`
- [ ] `TermManagement.tsx`

### components/progress/
- [ ] `ProgressMonitoring.tsx`

### components/uncertainty/
- [ ] `UncertaintyCreateModal.tsx`
- [ ] `UncertaintyCriteriaSelectorModal.tsx`
- [ ] `UncertaintyCriteriaSelectorPanel.tsx`
- [ ] `UncertaintyDetailModal.tsx`
- [ ] `UncertaintyExportModal.tsx`
- [ ] `UncertaintyImportModal.tsx`
- [ ] `UncertaintyManagement.tsx`

### components/viewer/
- [ ] `PetriNetViewer.tsx`
- [ ] `ViewRenderer.tsx`

### contexts/
- [ ] `ProjectMaimlContext.tsx`

### hooks/
- [ ] `useContentGridEditor.ts`
- [ ] `useInsertionEditor.ts`

## 修正方針
各ファイルで以下の変更を行う：
1. antd import から `message` を削除し `App` を追加
2. コンポーネント/フック本体の先頭に `const { message } = App.useApp();` を追加

## 承認記録
- **計画書提示日時**: 2026-09-07
- **承認日時**: act モードにて即時実施
