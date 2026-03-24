# タスク計画書: 未保存変更チェックメッセージの取込

## メタデータ
- **作成日時**: 2026-03-24 11:33
- **タスクID**: unsaved-changes-check
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

MAIML編集画面（PetriNetEditorScreen）にて修正をした後に保存せずに「戻る」ボタンを押した場合に確認メッセージが表示されるよう、reference版の実装を現行版に取り込む。

## 現状の問題

### reference版（動作する）
- `PetriNetEditorInner.jsx` の `PetriNetEditorContent` が `setHasUnsavedChanges` をpropsで受け取る
- 以下のハンドラーで `setHasUnsavedChanges(true)` を呼び出している：
  - `handleAddNode` (ノード追加)
  - `handleNodesDelete` (ノード削除)
  - `handleDeleteNode` (PropertyPanelからノード削除)
  - `handleConnect` (エッジ接続)
  - `handleEdgesDelete` (エッジ削除)
  - `handleDeleteEdge` (PropertyPanelからエッジ削除)
  - `handleNodeDragStop` (ノード移動)
  - `handleUpdateNodeProperty` (プロパティ更新)
  - `handleUpdateNodeId` (ノードID変更)
  - `handleUpdateEdgeProperty` (エッジID変更)
  - `handleSaveDocument` (Document保存)
  - `handleSaveTemplate` (テンプレート保存)
  - `handlePaneClick` (ショートカットキーでノード追加)
- 保存成功後（S3/ローカル）は `setHasUnsavedChanges(false)` でリセット

### 現行版（問題あり）
1. `PetriNetEditorScreen.tsx`:
   - `hasUnsavedChanges` ステートは定義されている
   - `handleContentChange` 関数は定義されている
   - **しかし `PetriNetEditorInner` に `onContentChange` を渡していない**
   - `handleBack` 関数は `hasUnsavedChanges` を参照しているが、常にfalseのまま

2. `PetriNetEditorInner.tsx`:
   - **`onContentChange` / `setHasUnsavedChanges` のpropが存在しない**
   - 各ハンドラーで未保存変更フラグを設定する処理がない

## 目的と期待される成果

- [ ] MAIML編集画面で何らかの変更を行った後に「戻る」ボタンを押すと、「保存されていない変更があります。破棄して戻りますか？」の確認ダイアログが表示される
- [ ] 保存（S3保存）完了後は未保存フラグがクリアされ、確認ダイアログが表示されない

## 実装ステップ

### Phase 1: PetriNetEditorInner.tsx の修正
- [ ] `PetriNetEditorInnerProps` インターフェースに `onContentChange?: () => void` を追加
- [ ] `PetriNetEditorContent` のprops分割に `onContentChange` を追加
- [ ] 以下のハンドラーで `onContentChange?.()` を呼び出す：
  - `handleAddNode`
  - `handleNodesDelete`
  - `handleDeleteNode`
  - `handleConnect`
  - `handleEdgesDelete`
  - `handleDeleteEdge`
  - `handleNodeDragStop`
  - `handleUpdateNodeProperty`
  - `handleUpdateNodeId`
  - `handleUpdateEdgeProperty`
  - `handleSaveDocument`
  - `handleSaveTemplate`
  - `handlePaneClick`（ショートカットキーでのノード追加時）
- [ ] 保存成功後（`handleSaveConfirmAction` でS3/ローカル保存完了時）は `onContentSaved?.()` を呼び出す（または別のコールバックで対応）

### Phase 2: PetriNetEditorScreen.tsx の修正
- [ ] `PetriNetEditorInner` に `onContentChange={handleContentChange}` を渡す
- [ ] 保存完了時のコールバックを追加する（`onContentSaved` → `setHasUnsavedChanges(false)`）

## 変更ファイル一覧

| ファイル | 変更内容 |
|--------|--------|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | `onContentChange` prop追加、各ハンドラーで呼び出し、保存成功後のリセット |
| `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` | `PetriNetEditorInner` に `onContentChange` prop を渡す |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `onContentChange` の呼び出しが漏れる | 低 | 低 | reference版と照合して確認 |
| 保存完了フラグのリセットが機能しない | 中 | 低 | S3保存/ローカルダウンロード両方に対応を確認 |

## 承認記録

- **計画書提示日時**: 2026-03-24 11:33
- **承認日時**: 
- **承認者コメント**: 
