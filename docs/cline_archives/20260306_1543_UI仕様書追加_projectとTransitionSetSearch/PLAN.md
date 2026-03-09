# タスク計画書: UI仕様書追加（project + TransitionSetSearch）

## メタデータ
- **作成日時**: 2026-03-06 15:43
- **タスクID**: UI仕様書追加_projectとTransitionSetSearch
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`frontend/src/components/project` および `frontend/src/components/TransitionSetSearch` フォルダ内のソースコードに対応するUI仕様書が不足しているため、これらを新規作成し、`ui_screen_list.md` に追記する。

## 不足しているUI仕様書（14ファイル）

### project/ フォルダ（仕様書なし or 一覧未登録）

| ソースファイル | 作成する仕様書 | 格納場所 |
|---|---|---|
| WorkerScreenOverlay.tsx | ui_worker_screen_overlay.md | docs/design/ui/experiment_admin/01_project_management/ |
| FormatManagement.tsx | ui_format_management.md | docs/design/ui/experiment_admin/02_format_management/ |
| FormatFolderTree.tsx | ui_format_folder_tree.md | docs/design/ui/experiment_admin/02_format_management/ |
| FormatFileListTable.tsx | ui_format_file_list_table.md | docs/design/ui/experiment_admin/02_format_management/ |
| CreateFormatFileModal.tsx | ui_create_format_file_modal.md | docs/design/ui/experiment_admin/02_format_management/ |
| CreateFormatFolderModal.tsx | ui_create_format_folder_modal.md | docs/design/ui/experiment_admin/02_format_management/ |
| CreateFormatModal.tsx | ui_create_format_modal.md | docs/design/ui/experiment_admin/02_format_management/ |
| FormatFileDetailModal.tsx | ui_format_file_detail_modal.md | docs/design/ui/experiment_admin/02_format_management/ |
| FormatSearchModal.tsx | ui_format_search_modal.md | docs/design/ui/experiment_admin/02_format_management/ |
| FormatUploadDialog.tsx | ui_format_upload_dialog.md | docs/design/ui/experiment_admin/02_format_management/ |

### TransitionSetSearch/ フォルダ（全て仕様書なし）

| ソースファイル | 作成する仕様書 | 格納場所 |
|---|---|---|
| TransitionSetSearchModal.tsx | ui_transition_set_search_modal.md | docs/design/ui/experiment_admin/01_project_management/ |
| SearchResults.tsx | ui_transition_search_results.md | docs/design/ui/experiment_admin/01_project_management/ |
| WeightSliders.tsx | ui_weight_sliders.md | docs/design/ui/experiment_admin/01_project_management/ |
| TransitionSetBatchProcessingPanel.tsx | ui_transition_set_batch_processing_panel.md | docs/design/ui/experiment_admin/01_project_management/ |

## 実装ステップ

### Phase 1: ディレクトリ作成
- [x] docs/design/ui/experiment_admin/02_format_management/ ディレクトリ作成

### Phase 2: TransitionSetSearch 仕様書作成（4ファイル）
- [x] ui_transition_set_search_modal.md 作成
- [x] ui_transition_search_results.md 作成
- [x] ui_weight_sliders.md 作成
- [x] ui_transition_set_batch_processing_panel.md 作成

### Phase 3: WorkerScreenOverlay 仕様書作成（1ファイル）
- [x] ui_worker_screen_overlay.md 作成

### Phase 4: FormatManagement 系仕様書作成（9ファイル）
- [x] ui_format_management.md 作成
- [x] ui_format_folder_tree.md 作成
- [x] ui_format_file_list_table.md 作成
- [x] ui_create_format_file_modal.md 作成
- [x] ui_create_format_folder_modal.md 作成
- [x] ui_create_format_modal.md 作成
- [x] ui_format_file_detail_modal.md 作成
- [x] ui_format_search_modal.md 作成
- [x] ui_format_upload_dialog.md 作成

### Phase 5: ui_screen_list.md への追記
- [x] ProjectManagement テーブルに WorkerScreenOverlay, TransitionSetSearchModal 等を追記
- [x] フォーマット管理テーブルに仕様書リンクを追記
- [x] TransitionSetSearch 系を新しいセクションとして追記

## 変更ファイル

### 新規作成（14ファイル）
1. `docs/design/ui/experiment_admin/01_project_management/ui_worker_screen_overlay.md`
2. `docs/design/ui/experiment_admin/01_project_management/ui_transition_set_search_modal.md`
3. `docs/design/ui/experiment_admin/01_project_management/ui_transition_search_results.md`
4. `docs/design/ui/experiment_admin/01_project_management/ui_weight_sliders.md`
5. `docs/design/ui/experiment_admin/01_project_management/ui_transition_set_batch_processing_panel.md`
6. `docs/design/ui/experiment_admin/02_format_management/ui_format_management.md`
7. `docs/design/ui/experiment_admin/02_format_management/ui_format_folder_tree.md`
8. `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md`
9. `docs/design/ui/experiment_admin/02_format_management/ui_create_format_file_modal.md`
10. `docs/design/ui/experiment_admin/02_format_management/ui_create_format_folder_modal.md`
11. `docs/design/ui/experiment_admin/02_format_management/ui_create_format_modal.md`
12. `docs/design/ui/experiment_admin/02_format_management/ui_format_file_detail_modal.md`
13. `docs/design/ui/experiment_admin/02_format_management/ui_format_search_modal.md`
14. `docs/design/ui/experiment_admin/02_format_management/ui_format_upload_dialog.md`

### 更新（1ファイル）
15. `docs/design/ui/ui_screen_list.md` - 仕様書リンクの追記

## 承認記録
- **計画書提示日時**: 2026-03-06 15:43
- **承認日時**: -
