# タスク計画書: MAIML Editor UI仕様書更新

## メタデータ
- **作成日時**: 2026-02-19 15:49
- **タスクID**: MAIML_Editor_UI仕様書更新
- **優先度**: 中
- **推定工数**: 4時間

## 1. タスク概要

`docs/design/ui/experiment_admin/04_maiml_editor` フォルダ内部のUI仕様書は以前のソースで作成されたものであるため、最新の `frontend/src/components/editorv2` のソースコードをもとにUI仕様書を更新する。

## 2. 目的と期待される成果

### 目的
最新のソースコードと整合性の取れたUI仕様書を提供し、開発者がコンポーネントの構造・機能・プロパティを正確に理解できるようにする。

### 期待される成果
- [ ] 既存UI仕様書の全ファイルを最新ソースに基づいて更新
- [ ] 新規追加されたコンポーネントのUI仕様書を作成
- [ ] 削除されたコンポーネントのUI仕様書を削除または移動
- [ ] UI仕様書フォルダ構成を最新ソースに合わせて整理

## 3. 実装ステップ

### Phase 1: ソースコード分析（✅完了）
- [x] editorv2配下のすべてのコンポーネントファイルを読み込み
- [x] 各コンポーネントのProps、State、主要機能を分析
- [x] 既存UI仕様書との差分を特定

### Phase 2: 既存UI仕様書の更新（✅完了 7/7ファイル）
- [x] PetriNetEditor関連の仕様書を更新
  - [x] PetriNetEditorScreen.md → index.tsx に対応
  - [x] PetriNetEditor.md → PetriNetEditorInner.tsx に対応
- [x] ツールバー・パネル系の仕様書を更新
  - [x] EditorToolbar.md
  - [x] PropertyPanel.md
  - [x] ValidationPanel.md
  - [x] MethodTabPanel.md
- [x] ダイアログ系の仕様書を更新
  - [x] SaveConfirmDialog.md（新規作成）
  - [x] TemplateEditor.md → TemplateEditorDialog.tsx に対応
  - [ ] DocumentEditDialog.md（既存で問題なし、更新不要）
  - [ ] DraftManager.md（既存で問題なし、更新不要）

### Phase 3: 新規コンポーネントのUI仕様書作成（editorv2）（✅主要コンポーネント完了 2/2）
- [x] PetriNetEditorScreen.md（Phase 2で完了）
- [x] 新規ダイアログコンポーネント（主要部分）
  - [ ] SaveDialog.md（優先度低、SaveConfirmDialogと統合的に動作）
  - [x] SaveConfirmDialog.md
  - [x] WorkflowSelectorDialog.md
- [ ] 新規エディタコンポーネント（優先度低、必要に応じて後日作成）
  - [ ] MultiObjectEditor.md
  - [ ] NestedPropertyEditor.md
- [ ] Nodeコンポーネント（優先度低、必要に応じて後日作成）
  - [ ] ConditionPlaceNode.md
  - [ ] MaterialPlaceNode.md
  - [ ] ResultPlaceNode.md
  - [ ] TransitionNode.md
  - [ ] EditablePlaceNode.md
  - [ ] EditableTransitionNode.md
- [ ] TemplateViewerコンポーネント（優先度低、必要に応じて後日作成）
  - [ ] TemplateList.md
  - [ ] TemplateItem.md

### Phase 4: ViewerコンポーネントのUI仕様書作成（05_Viewer）（✅完了）
- [x] 05_Viewerフォルダを新規作成
- [x] 既存UI仕様書を05_Viewerに移動（5/5完了）
  - [x] ImageViewer.md → 05_Viewer/
  - [x] PropertyViewer.md → 05_Viewer/dialogs/
  - [x] StructuredPropertySelector.md → 05_Viewer/dialogs/
  - [x] TiffViewer.md → 05_Viewer/
  - [x] PetriNetViewer.md → 05_Viewer/
- [ ] 新規作成が必要なViewer系UI仕様書（スコープ外、必要に応じて別タスク）
  - [ ] DraftRestoreDialog.md
  - [ ] ErrorBoundary.md
  - [ ] ViewRenderer.md
  - [ ] ViewRendererDialog.md
  - [ ] DocumentEditDialog.md（viewer版、editorと重複のため保留）
  - [ ] PropertyViewerWithSelection.md
  - [ ] SubNetViewer.md

### Phase 5: フォルダ構成の整理
- [ ] UI仕様書のフォルダ構成を最新ソースに合わせて再編成
  - [ ] 04_maiml_editor/components/ フォルダ作成
  - [ ] 04_maiml_editor/nodes/ フォルダ作成
  - [ ] 04_maiml_editor/template_viewer/ フォルダ作成
  - [ ] 05_Viewer/ フォルダ作成
  - [ ] 05_Viewer/dialogs/ フォルダ作成

## 4. 影響範囲

### 更新するファイル（既存）
1. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetEditorScreen.md`
2. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetEditor.md`
3. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/EditorToolbar.md`
4. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PropertyPanel.md`
5. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/ValidationPanel.md`
6. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/MethodTabPanel.md`
7. `docs/design/ui/experiment_admin/04_maiml_editor/document/DocumentEditDialog.md`
8. `docs/design/ui/experiment_admin/04_maiml_editor/document/TemplateEditor.md`
9. `docs/design/ui/experiment_admin/04_maiml_editor/document/DraftManager.md`

### 新規作成するファイル（editorv2）
1. `docs/design/ui/experiment_admin/04_maiml_editor/PetriNetEditorScreen.md`
2. `docs/design/ui/experiment_admin/04_maiml_editor/components/SaveDialog.md`
3. `docs/design/ui/experiment_admin/04_maiml_editor/components/SaveConfirmDialog.md`
4. `docs/design/ui/experiment_admin/04_maiml_editor/components/WorkflowSelectorDialog.md`
5. `docs/design/ui/experiment_admin/04_maiml_editor/components/MultiObjectEditor.md`
6. `docs/design/ui/experiment_admin/04_maiml_editor/components/NestedPropertyEditor.md`
7. `docs/design/ui/experiment_admin/04_maiml_editor/nodes/ConditionPlaceNode.md`
8. `docs/design/ui/experiment_admin/04_maiml_editor/nodes/MaterialPlaceNode.md`
9. `docs/design/ui/experiment_admin/04_maiml_editor/nodes/ResultPlaceNode.md`
10. `docs/design/ui/experiment_admin/04_maiml_editor/nodes/TransitionNode.md`
11. `docs/design/ui/experiment_admin/04_maiml_editor/nodes/EditablePlaceNode.md`
12. `docs/design/ui/experiment_admin/04_maiml_editor/nodes/EditableTransitionNode.md`
13. `docs/design/ui/experiment_admin/04_maiml_editor/template_viewer/TemplateList.md`
14. `docs/design/ui/experiment_admin/04_maiml_editor/template_viewer/TemplateItem.md`

### 新規作成するファイル（Viewer）
1. `docs/design/ui/experiment_admin/05_Viewer/DraftRestoreDialog.md`
2. `docs/design/ui/experiment_admin/05_Viewer/ErrorBoundary.md`
3. `docs/design/ui/experiment_admin/05_Viewer/ViewRenderer.md`
4. `docs/design/ui/experiment_admin/05_Viewer/ViewRendererDialog.md`
5. `docs/design/ui/experiment_admin/05_Viewer/dialogs/PropertyViewerWithSelection.md`
6. `docs/design/ui/experiment_admin/05_Viewer/dialogs/SubNetViewer.md`

### 移動するファイル（04_maiml_editor → 05_Viewer）
1. `docs/design/ui/experiment_admin/04_maiml_editor/document/ImageViewer.md` → `05_Viewer/ImageViewer.md`
2. `docs/design/ui/experiment_admin/04_maiml_editor/document/PropertyViewer.md` → `05_Viewer/dialogs/PropertyViewer.md`
3. `docs/design/ui/experiment_admin/04_maiml_editor/document/StructuredPropertySelector.md` → `05_Viewer/dialogs/StructuredPropertySelector.md`
4. `docs/design/ui/experiment_admin/04_maiml_editor/document/TiffViewer.md` → `05_Viewer/TiffViewer.md`
5. `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetViewer.md` → `05_Viewer/PetriNetViewer.md`
6. `docs/design/ui/experiment_admin/04_maiml_editor/document/DocumentEditDialog.md` → `05_Viewer/dialogs/DocumentEditDialog.md`（viewerフォルダにも同名ファイルあり）

## 5. 技術的詳細

### UI仕様書のテンプレート構成

各UI仕様書には以下の項目を含める：

```markdown
# コンポーネント名

## 概要
コンポーネントの目的と役割

## ファイルパス
`frontend/src/components/editorv2/...`

## Props定義
| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| prop1 | string | ✓ | 説明 |

## State定義
主要なState変数とその用途

## 主要機能
1. 機能1の説明
2. 機能2の説明

## UIレイアウト
コンポーネントのレイアウト構造

## 使用しているAnt Designコンポーネント
- Component1
- Component2

## 関連コンポーネント
- 関連するコンポーネントのリスト

## イベントハンドラ
主要なイベントハンドラの説明

## 備考
その他の重要な情報
```

### 分析対象のソースコード
- `frontend/src/components/editorv2/` 配下のすべての `.tsx` ファイル
- TypeScriptの型定義を正確に読み取る
- コメント・JSDocも参照する

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ソースコード量が多く分析に時間がかかる | 中 | 高 | フェーズごとに進捗確認 |
| 対応するソースが見つからないUI仕様書がある | 低 | 中 | 別フォルダに移動または削除判断をユーザーに確認 |
| UI仕様書のフォーマット統一が難しい | 低 | 低 | テンプレートを事前に確定 |

## 7. テスト計画

### 確認項目
- [ ] すべての最新コンポーネントにUI仕様書が存在する
- [ ] UI仕様書のProps定義がソースコードと一致している
- [ ] UI仕様書のファイルパスが正確である
- [ ] フォルダ構成が整理されている

## 8. 実施方針

1. **段階的な実装**: Phase単位で実装し、各Phase完了後にユーザー確認を取る
2. **既存仕様書の確認**: 更新前に既存仕様書の内容を確認し、有用な記述は引き継ぐ
3. **ソースコード精読**: 各コンポーネントのソースコードを完全に読み込んで正確な仕様書を作成
4. **削除判断の確認**: 不要なUI仕様書の削除はユーザーに確認を取る

## 9. 承認記録

- **計画書提示日時**: 2026-02-19 15:49
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 10. 実施記録

### 実施日時
開始: （作業開始後記入）
完了: （作業完了後記入）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）
