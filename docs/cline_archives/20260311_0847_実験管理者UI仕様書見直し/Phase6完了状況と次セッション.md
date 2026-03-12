# Phase 6完了状況と次セッション指示

## 📊 Phase 6進捗状況（2026-03-12 11:50時点）

### ✅ 完了（9/12ファイル）

1. ✅ PetriNetEditorScreen.tsx → ui_petri_net_editor_screen.md（Phase 6初回セッションで完了）
2. ✅ PetriNetEditorInner.tsx → ui_petri_net_editor_inner.md
3. ✅ EditorToolbar.tsx → ui_editor_toolbar.md
4. ✅ PropertyPanel.tsx → ui_property_panel.md
5. ✅ ValidationPanel.tsx → ui_validation_panel.md
6. ✅ MethodTabPanel.tsx → ui_method_tab_panel.md
7. ✅ WorkflowSelectorDialog.tsx → ui_workflow_selector_dialog.md
8. ✅ NestedPropertyEditor.tsx → ui_nested_property_editor.md
9. ✅ TransitionNode.tsx → ui_transition_node.md（nodes/配下）

### ⏳ 残り（3ファイル）

10. ⏳ PlaceNodesコンポーネント → ui_place_nodes.md（nodes/配下）
    - MaterialPlaceNode.tsx - 読み込み済み
    - ConditionPlaceNode.tsx - 読み込み済み
    - ResultPlaceNode.tsx - 読み込み済み
    - **実装を3つ統合して1つのUI仕様書を作成**

11. ⏳ SaveDialog.tsx → ui_save_dialog.md
    - ファイルパス: frontend/src/components/editorv2/components/SaveDialog.tsx

12. ⏳ SaveConfirmDialog.tsx → ui_save_confirm_dialog.md
    - ファイルパス: frontend/src/components/editorv2/components/SaveConfirmDialog.tsx

---

## 🎯 次セッション開始方法

### コマンド（コピー＆ペースト用）

```
docs/20260311_0847_実験管理者UI仕様書見直し/PLAN.md を読んで、Phase 6の残り3ファイルを完成させてください。

1. ui_place_nodes.md を作成（MaterialPlaceNode, ConditionPlaceNode, ResultPlaceNodeの3コンポーネントを統合）
2. SaveDialog.tsx → ui_save_dialog.md を作成
3. SaveConfirmDialog.tsx → ui_save_confirm_dialog.md を作成

3つのPlaceNodeは既に読み込み済みなので、ui_place_nodes.mdを作成してください。SaveDialog/SaveConfirmDialogは実装を読み込んでからUI仕様書を作成してください。
```

---

## 📋 Phase 7以降の残タスク

### Phase 7: MAIML編集 - Document（4ファイル、推定2時間）

**ファイルパス:** `frontend/src/components/editorv2/components/`

1. ⏳ DocumentEditDialog.tsx → ui_document_edit_dialog.md
2. ⏳ TemplateEditorDialog.tsx → ui_template_editor.md
3. ⏳ MultiObjectEditor.tsx → ui_multi_object_editor.md
4. ⏳ DraftManager.tsx → ui_draft_manager.md

### Phase 8: Viewerコンポーネント（10ファイル、推定5時間）

**ファイルパス:** `frontend/src/components/viewer/`

1. ⏳ ViewRenderer.tsx → ui_view_renderer.md
2. ⏳ ViewRendererDialog.tsx → ui_view_renderer_dialog.md
3. ⏳ ImageViewer.tsx → ui_image_viewer.md
4. ⏳ TiffViewer.tsx → ui_tiff_viewer.md
5. ⏳ PetriNetViewer.tsx → ui_petri_net_viewer.md
6. ⏳ ErrorBoundary.tsx → ui_error_boundary.md

**dialogs/配下:**

7. ⏳ PropertyViewer.tsx → ui_property_viewer.md
8. ⏳ PropertyViewerWithSelection.tsx → ui_property_viewer_with_selection.md
9. ⏳ StructuredPropertySelector.tsx → ui_structured_property_selector.md
10. ⏳ SubNetViewer.tsx → ui_sub_net_viewer.md

### Phase 9: 最終確認・統合（推定1.5時間）

- [ ] 全ファイルの記述内容を確認
- [ ] README.mdの更新
- [ ] ui_screen_list.mdの更新
- [ ] 作成内容サマリの作成

---

## 📝 Phase 6で作成したファイル一覧

| # | UI仕様書 | 行数（推定） | 作成日 |
|---|---------|-----------|--------|
| 1 | ui_petri_net_editor_screen.md | ~250行 | 2026-03-11 |
| 2 | ui_petri_net_editor_inner.md | ~550行 | 2026-03-12 |
| 3 | ui_editor_toolbar.md | ~400行 | 2026-03-12 |
| 4 | ui_property_panel.md | ~500行 | 2026-03-12 |
| 5 | ui_validation_panel.md | ~350行 | 2026-03-12 |
| 6 | ui_method_tab_panel.md | ~450行 | 2026-03-12 |
| 7 | ui_workflow_selector_dialog.md | ~450行 | 2026-03-12 |
| 8 | ui_nested_property_editor.md | ~600行 | 2026-03-12 |
| 9 | ui_transition_node.md | ~400行 | 2026-03-12 |

**合計:** 約3,950行のUI仕様書を作成

---

## 🔍 PlaceNodesコンポーネントの統合方針

### 3つのコンポーネントの共通点

| 項目 | MaterialPlace | ConditionPlace | ResultPlace |
|------|--------------|---------------|------------|
| **形状** | 円形（角丸大） | 円形（角丸大） | 円形（角丸大） |
| **カラー** | Primary（青） | Warning（橙） | Success（緑） |
| **ハンドル** | 上:入力、下:出力 | 上:入力、下:出力 | 上:入力、下:出力 |
| **Props** | label, isFormatFile, templateRef | 同左 | 同左 |
| **機能** | Formatバッジ、テンプレート参照 | 同左 | 同左 |

### UI仕様書の構成案

1. **概要**: 3つのPlaceノードの目的とPetri Netでの役割
2. **共通仕様**: Props、State、スタイル、ハンドル配置
3. **個別仕様**: 各Placeノードのカラーテーマと用途
4. **実装ファイル**: 3ファイルのパスと関連コンポーネント
5. **使用例**: ReactFlowでの登録と使用方法

---

## 📂 関連ファイルパス

### Phase 6の実装ファイル

```
frontend/src/components/editorv2/
├── PetriNetEditorScreen.tsx
├── PetriNetEditorInner.tsx
└── components/
    ├── EditorToolbar.tsx
    ├── PropertyPanel.tsx
    ├── ValidationPanel.tsx
    ├── MethodTabPanel.tsx
    ├── SaveDialog.tsx
    ├── SaveConfirmDialog.tsx
    ├── WorkflowSelectorDialog.tsx
    ├── NestedPropertyEditor.tsx
    └── nodes/
        ├── MaterialPlaceNode.tsx
        ├── ConditionPlaceNode.tsx
        ├── ResultPlaceNode.tsx
        └── TransitionNode.tsx
```

### Phase 6のUI仕様書

```
docs/design/ui/experiment_admin/04_maiml_editor/petri_net/
├── ui_petri_net_editor_screen.md ✅
├── ui_petri_net_editor_inner.md ✅
├── ui_editor_toolbar.md ✅
├── ui_property_panel.md ✅
├── ui_validation_panel.md ✅
├── ui_method_tab_panel.md ✅
├── ui_save_dialog.md ⏳
├── ui_save_confirm_dialog.md ⏳
├── ui_workflow_selector_dialog.md ✅
├── ui_nested_property_editor.md ✅
└── nodes/
    ├── ui_place_nodes.md ⏳
    └── ui_transition_node.md ✅
```

---

## ✅ Phase 6完了後の次ステップ

Phase 6が完了したら、以下のコマンドでPhase 7を開始してください：

```
docs/20260311_0847_実験管理者UI仕様書見直し/PLAN.md を読んで、Phase 7（MAIML編集 - Document）の4ファイルを開始してください。

1. DocumentEditDialog.tsx → ui_document_edit_dialog.md
2. TemplateEditorDialog.tsx → ui_template_editor.md
3. MultiObjectEditor.tsx → ui_multi_object_editor.md
4. DraftManager.tsx → ui_draft_manager.md

各ファイルは実装を読み込んでからUI仕様書を作成してください。
```

---

## 📊 全体進捗状況

| Phase | ファイル数 | 完了 | 残り | 進捗率 |
|-------|----------|------|------|--------|
| Phase 1 | - | ✅ | - | 100% |
| Phase 2 | 2 | ✅ | - | 100% |
| Phase 3 | 16 | ✅ | - | 100% |
| Phase 4 | 9 | ✅ | - | 100% |
| Phase 5 | 5 | ✅ | - | 100% |
| **Phase 6** | **12** | **9** | **3** | **75%** |
| Phase 7 | 4 | 0 | 4 | 0% |
| Phase 8 | 10 | 0 | 10 | 0% |
| Phase 9 | - | - | - | 0% |
| **合計** | **58** | **41** | **17** | **71%** |

**推定残り時間:** 約8-9時間

---

**作成日時:** 2026-03-12 11:50  
**作成者:** Cline
