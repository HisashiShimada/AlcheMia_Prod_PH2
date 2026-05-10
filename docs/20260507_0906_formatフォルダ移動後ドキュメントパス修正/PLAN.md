# タスク計画書: formatフォルダ移動後のドキュメントパス修正

## メタデータ
- **作成日時**: 2026-05-07 09:07
- **タスクID**: format-path-fix
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`frontend/src/components/format/` フォルダを新規作成し、以前は `project/` フォルダに格納されていたフォーマット管理関連コンポーネントを移動した。
本タスクでは、移動漏れがないかを確認し、ドキュメント（UI仕様書・画面一覧）に記載されている古いパス（`project/Format*`）を正しいパス（`format/Format*`）に修正する。

---

## 調査結果

### 1. 移動済みファイルの確認（`format/` フォルダ）

以下の10ファイルが `frontend/src/components/format/` に存在しており、移動は完了している。

| ファイル名 | 移動状況 |
|-----------|---------|
| `FormatManagement.tsx` | ✅ 移動済み |
| `FormatFolderTree.tsx` | ✅ 移動済み |
| `FormatFileListTable.tsx` | ✅ 移動済み |
| `CreateFormatFileModal.tsx` | ✅ 移動済み |
| `CreateFormatFolderModal.tsx` | ✅ 移動済み |
| `CreateFormatModal.tsx` | ✅ 移動済み |
| `FormatFileDetailModal.tsx` | ✅ 移動済み |
| `FormatSearchModal.tsx` | ✅ 移動済み |
| `FormatUploadDialog.tsx` | ✅ 移動済み |
| `FormatEditorDialog.tsx` | ✅ 移動済み |

### 2. `project/` フォルダに残留するFormat関連ファイル

`frontend/src/components/project/` フォルダを確認した結果、Format関連のファイルは存在しない（移動漏れなし）。

残留しているのはプロジェクト管理の固有ファイルのみ（ProjectManagement.tsx、CreateProjectModal.tsx 等）。

### 3. パス修正が必要なドキュメント

以下のドキュメントに `frontend/src/components/project/Format*` または `project/Format*` のパスが記載されており、修正が必要。

**注意**: `docs/20260xxx_*/` 配下のタスク固有フォルダ（過去の作業記録）は修正対象外とする（履歴記録のため）。

#### 修正対象ドキュメント一覧

| # | ファイルパス | 修正箇所の概要 |
|---|-------------|-------------|
| 1 | `docs/design/ui/ui_screen_list.md` | フォーマット管理セクション（10コンポーネント）のファイルパスを `project/` → `format/` に変更 |
| 2 | `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` | FormatManagement.tsx のパス記載を修正 |
| 3 | `docs/design/ui/experiment_admin/02_format_management/ui_format_management.md` | `メインファイル` のパスを修正 |
| 4 | `docs/design/ui/experiment_admin/02_format_management/ui_format_folder_tree.md` | `メインファイル`・`親コンポーネント` のパスを修正 |
| 5 | `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` | `メインファイル`・`親コンポーネント` のパスを修正 |
| 6 | `docs/design/ui/experiment_admin/02_format_management/ui_format_file_detail_modal.md` | `メインファイル`・`親コンポーネント` のパスを修正 |
| 7 | `docs/design/ui/experiment_admin/02_format_management/ui_format_editor_dialog.md` | `メインファイル`・`親コンポーネント` のパスを修正 |
| 8 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_modal.md` | `親コンポーネント` のパスを修正 |
| 9 | `docs/design/ui/experiment_admin/02_format_management/ui_format_upload_dialog.md` | `メインファイル`・`親コンポーネント` のパスを修正 |
| 10 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_folder_modal.md` | `親コンポーネント` のパスを修正 |
| 11 | `docs/design/ui/experiment_admin/02_format_management/ui_format_search_modal.md` | `メインファイル`・`親コンポーネント` のパスを修正 |
| 12 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_file_modal.md` | `親コンポーネント` のパスを修正 |

---

## 目的と期待される成果

### 目的
ファイル移動後のドキュメントとソースコードの整合性を保つ。誤ったパスのままだとドキュメントを参照したときに混乱が生じる。

### 期待される成果
- [ ] `docs/design/ui/ui_screen_list.md` のフォーマット管理セクション全10行のパスが `format/` に修正される
- [ ] `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` のパスが修正される
- [ ] `docs/design/ui/experiment_admin/02_format_management/` 配下10ファイルの全パス記載が `format/` に修正される

---

## 実装ステップ

### Phase 1: 画面一覧（ui_screen_list.md）の修正
- [ ] `docs/design/ui/ui_screen_list.md` のフォーマット管理セクション（10コンポーネント）のパスを `project/` → `format/` に変更
- [ ] 更新履歴に変更内容を追記

### Phase 2: メニュー仕様書の修正
- [ ] `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` の FormatManagement パスを修正

### Phase 3: 02_format_management/ 配下の各UI仕様書の修正（10ファイル）
- [ ] `ui_format_management.md` - メインファイルパスを修正
- [ ] `ui_format_folder_tree.md` - メインファイル・親コンポーネントパスを修正
- [ ] `ui_format_file_list_table.md` - メインファイル・親コンポーネントパスを修正
- [ ] `ui_format_file_detail_modal.md` - メインファイル・親コンポーネントパスを修正
- [ ] `ui_format_editor_dialog.md` - メインファイル・親コンポーネントパスを修正
- [ ] `ui_create_format_modal.md` - 親コンポーネントパスを修正
- [ ] `ui_format_upload_dialog.md` - メインファイル・親コンポーネントパスを修正
- [ ] `ui_create_format_folder_modal.md` - 親コンポーネントパスを修正
- [ ] `ui_format_search_modal.md` - メインファイル・親コンポーネントパスを修正
- [ ] `ui_create_format_file_modal.md` - 親コンポーネントパスを修正

---

## 変更するファイル一覧

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `docs/design/ui/ui_screen_list.md` | フォーマット管理10行のパスを `project/` → `format/` に変更、更新履歴追記 |
| 2 | `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` | FormatManagementパスを修正 |
| 3 | `docs/design/ui/experiment_admin/02_format_management/ui_format_management.md` | メインファイルパスを修正 |
| 4 | `docs/design/ui/experiment_admin/02_format_management/ui_format_folder_tree.md` | メインファイル・親コンポーネントパスを修正 |
| 5 | `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` | メインファイル・親コンポーネントパスを修正 |
| 6 | `docs/design/ui/experiment_admin/02_format_management/ui_format_file_detail_modal.md` | メインファイル・親コンポーネントパスを修正 |
| 7 | `docs/design/ui/experiment_admin/02_format_management/ui_format_editor_dialog.md` | メインファイル・親コンポーネントパスを修正 |
| 8 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_modal.md` | 親コンポーネントパスを修正 |
| 9 | `docs/design/ui/experiment_admin/02_format_management/ui_format_upload_dialog.md` | メインファイル・親コンポーネントパスを修正 |
| 10 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_folder_modal.md` | 親コンポーネントパスを修正 |
| 11 | `docs/design/ui/experiment_admin/02_format_management/ui_format_search_modal.md` | メインファイル・親コンポーネントパスを修正 |
| 12 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_file_modal.md` | 親コンポーネントパスを修正 |

---

## 修正対象外（過去記録）

以下は過去タスクの作業履歴であり、修正不要。

- `docs/PLAN.md` 内の `project/Format*` 記載
- `docs/deliverables/release_notes_20260421.md` 内の記載
- `docs/20260422_1056_antd非推奨警告修正/PLAN.md` 内の記載
- `docs/20260501_1415_未使用import変数整理/PLAN.md` 内の記載
- その他 `docs/20260xxx_*/` 配下のタスクフォルダ内記載

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正漏れ | 低 | 低 | 修正後に `search_files` で `project/Format` を再検索して確認 |
| 誤った箇所を修正 | 低 | 低 | 過去タスク記録フォルダは修正対象外ルールを徹底 |

---

## テスト計画

- [ ] 修正後、`docs/design/` 配下を対象に `project/Format` で検索し、残留がないことを確認
- [ ] `docs/` 全体を対象に `project/Format` で検索し、`docs/design/` 以外（過去記録）のみに絞られていることを確認

---

## 承認記録

- **計画書提示日時**: 2026-05-07 09:07
- **承認日時**: 2026-05-07 09:07
- **承認者コメント**: 計画通り実施

## 11. 実施記録

### 実施日時
開始: 2026-05-07 09:07  
完了: 2026-05-07 09:13

### 最終的な成果物
- [x] `docs/design/ui/ui_screen_list.md` のフォーマット管理10行のパスを `project/` → `format/` に変更、更新履歴追記
- [x] `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` の FormatManagement パスを修正
- [x] `docs/design/ui/experiment_admin/02_format_management/` 配下10ファイルの全パス記載を `format/` に修正

### 修正確認
修正後 `docs/design/` 配下を対象に `components/project/Format` で再検索した結果、0件（残留なし）を確認。
