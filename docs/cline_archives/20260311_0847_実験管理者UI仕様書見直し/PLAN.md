# タスク計画書: 実験管理者UI仕様書見直し

## メタデータ
- **作成日時**: 2026-03-11 08:47
- **タスクID**: experiment_admin_ui_spec_update
- **優先度**: 高
- **推定工数**: 33-40時間（全58ファイル）

## 1. タスク概要

実験管理者（Experiment Admin）関連の画面について、**現在の実装ファイルを精査し、実装ベースでUI仕様書を作成し直す**。

**背景:**
- 機能追加や修正が繰り返された結果、UI仕様書の内容が実装と大きく乖離している
- 既存の仕様書を部分修正するより、実装から書き起こす方が正確で効率的
- 特に指示登録機能やタスク登録機能など、最近追加された機能は実装優先で進んでいる
- API統合、LocalStorageからDB管理への移行など、アーキテクチャレベルの変更が発生している

**アプローチ:**
1. 実装ファイル（TypeScript）を読み込み、実際のコードから仕様を抽出
2. Props型定義、State管理、API呼び出し、UI構造を正確に把握
3. 実装に基づいて新しいUI仕様書を作成（既存仕様書は参考程度）
4. 標準的なUI仕様書テンプレートに従って記述

## 2. 目的と期待される成果

### 目的
- 実装コードを正として、正確なUI仕様書を作成する
- 開発者が実装を参照する際のドキュメントとして機能させる
- 今後の機能追加時の参照資料として活用できるようにする

### 期待される成果
- [ ] 実験管理者関連の全UI仕様書（58ファイル）の再作成完了
- [ ] 実装と完全に一致したProps定義、State管理、API連携の記載
- [ ] 実際の画面構成を反映したレイアウト構造の記述
- [ ] 標準テンプレートに沿った統一フォーマットでの記述
- [ ] 全ファイルの変更履歴の更新
- [ ] README.mdのファイル数を正確に更新（35→58）

## 3. 実装ステップ

### Phase 1: 実装ファイルの精査とテンプレート準備（1.5時間）✅ 完了
- [x] 全実装ファイルをリストアップ（58ファイル）
- [x] UI仕様書の標準テンプレートを確認・準備
- [x] 1つのサンプルファイルで実装→仕様書のフローを確立
- [x] ファイル作成の優先順位を決定
- [x] README.mdのファイル数誤りを確認（参考: `実際のファイル数.md`）

**Phase 1完了日時**: 2026-03-11 09:09
**作成ドキュメント**:
- `実際のファイル数.md` - UI仕様書58ファイル、実装ファイル62ファイルを確認
- `実装ファイル一覧.md` - 全実装ファイルのパスと対応関係を整理
- `UI仕様書作成テンプレート.md` - テンプレートとフロー確立

**発見事項**:
- 実装ファイル: 62ファイル
- UI仕様書: 58ファイル
- 不一致: 10ファイル（実装あり仕様書なし、または仕様書あり実装なし）

### Phase 2: メニュー・ルート（2ファイル、1時間）✅ 完了
- [x] `ExperimentAdminMenu.tsx` → `ui_experiment_admin_menu.md`
- [x] MAIMLファイル公開機能 → `ui_maiml_publish.md`（フロントエンド未実装のため変更履歴のみ更新）

**Phase 2完了日時**: 2026-03-11 09:19
**作成ドキュメント**:
- `ui_experiment_admin_menu.md` - 実装ベースで完全に再作成（約220行、Props定義、State管理、タブ切り替え機能等を詳細に記載）
- `ui_maiml_publish.md` - 変更履歴に実装状況確認を記録

**発見事項**:
- MAIMLファイル公開機能はバックエンドのみ実装済み、フロントエンド未実装
- `frontend/src/components/maimlPublish/` ディレクトリは存在しない

### Phase 3: プロジェクト管理画面（16ファイル、8.5時間）✅ 完了
- [x] `ProjectManagement.tsx` → `ui_project_management.md`
- [x] `ProjectFolderTree.tsx` → `ui_project_folder_tree.md`
- [x] `FileListTable.tsx` → `ui_file_list_table.md`
- [x] `CreateProjectModal.tsx` → `ui_create_project_modal.md`
- [x] `ProjectDetailModal.tsx` → `ui_project_detail_modal.md`
- [x] `ProjectSearchModal.tsx` → `ui_project_search_modal.md`
- [x] `BulkUploadDialog.tsx` → `ui_bulk_upload_dialog.md`
- [x] `TaskRegistrationTab.tsx` → `ui_task_registration_tab.md`
- [x] `InstructionRegistrationTab.tsx` → `ui_instruction_registration_tab.md`
- [x] `InstructionEditDialog.tsx` → `ui_instruction_edit_dialog.md`
- [x] `TaskResultsTable.tsx` → `ui_task_results_table.md`
- [x] `WorkerScreenOverlay.tsx` → `ui_worker_screen_overlay.md`
- [x] `TransitionSetSearchModal.tsx` → `ui_transition_set_search_modal.md`
- [x] `SearchResults.tsx` → `ui_transition_search_results.md`
- [x] `WeightSliders.tsx` → `ui_weight_sliders.md`
- [x] `TransitionSetBatchProcessingPanel.tsx` → `ui_transition_set_batch_processing_panel.md`

**Phase 3完了日時**: 2026-03-11（別セッションで完了）

### Phase 4: フォーマット管理画面（9ファイル、4.5時間）✅ 完了
- [x] `FormatManagement.tsx` → `ui_format_management.md`
- [x] `FormatFolderTree.tsx` → `ui_format_folder_tree.md`
- [x] `FormatFileListTable.tsx` → `ui_format_file_list_table.md`
- [x] `CreateFormatFileModal.tsx` → `ui_create_format_file_modal.md`
- [x] `CreateFormatFolderModal.tsx` → `ui_create_format_folder_modal.md`
- [x] `CreateFormatModal.tsx` → `ui_create_format_modal.md`
- [x] `FormatFileDetailModal.tsx` → `ui_format_file_detail_modal.md`
- [x] `FormatSearchModal.tsx` → `ui_format_search_modal.md`
- [x] `FormatUploadDialog.tsx` → `ui_format_upload_dialog.md`

**Phase 4完了日時**: 2026-03-11（別セッションで完了）

### Phase 5: 進捗管理画面（5ファイル、2.5時間）✅ 完了
- [x] `ProgressMonitoring.tsx` → `ui_progress_monitoring.md`
- [x] `WorkProgressDetailDialog.tsx` → `ui_work_progress_detail_dialog.md`
- [x] `TaskResultsTable.tsx` → `ui_task_results_table.md` (※既にPhase 3で作成)
- [x] `InstructionDialog.tsx` → `ui_instruction_dialog.md`
- [x] `PetriNetVisualization.tsx` → `ui_petri_net_visualization.md`

**Phase 5完了日時**: 2026-03-11 14:25
**作成ドキュメント**:
- `ui_progress_monitoring.md` - 進捗管理画面の仕様書
- `ui_work_progress_detail_dialog.md` - 作業進捗詳細ダイアログの仕様書
- `ui_instruction_dialog.md` - 実装なし、変更履歴追記
- `ui_petri_net_visualization.md` - Petri Net可視化コンポーネントの仕様書（別セッションで作成）

### Phase 6: MAIML編集 - Petri Net（12ファイル、6時間）⏳ 進行中
- [x] `PetriNetEditorScreen.tsx` → `ui_petri_net_editor_screen.md`
- [ ] `PetriNetEditorInner.tsx` → `ui_petri_net_editor.md`（次セッション開始地点）
- [ ] `EditorToolbar.tsx` → `ui_editor_toolbar.md`
- [ ] `PropertyPanel.tsx` → `ui_property_panel.md`
- [ ] `ValidationPanel.tsx` → `ui_validation_panel.md`
- [ ] `MethodTabPanel.tsx` → `ui_method_tab_panel.md`
- [ ] `SaveDialog.tsx` → `ui_save_dialog.md`
- [ ] `SaveConfirmDialog.tsx` → `ui_save_confirm_dialog.md`
- [ ] `WorkflowSelectorDialog.tsx` → `ui_workflow_selector_dialog.md`
- [ ] `NestedPropertyEditor.tsx` → `ui_nested_property_editor.md`
- [ ] `TransitionNode.tsx` → `ui_transition_node.md` (nodes/)
- [ ] PlaceNodesコンポーネント → `ui_place_nodes.md` (nodes/)

**Phase 6進捗**: 1/12ファイル完了（2026-03-11 14:45時点）
**作成ファイル**: ui_petri_net_editor_screen.md

### Phase 7: MAIML編集 - Document（4ファイル、2時間）
- [ ] `DocumentEditDialog.tsx` → `ui_document_edit_dialog.md`
- [ ] `TemplateEditorDialog.tsx` → `ui_template_editor.md`
- [ ] `MultiObjectEditor.tsx` → `ui_multi_object_editor.md`
- [ ] `DraftManager.tsx` → `ui_draft_manager.md`

### Phase 8: Viewerコンポーネント（10ファイル、5時間）
- [ ] `ViewRenderer.tsx` → `ui_view_renderer.md`
- [ ] `ViewRendererDialog.tsx` → `ui_view_renderer_dialog.md`
- [ ] `ImageViewer.tsx` → `ui_image_viewer.md`
- [ ] `TiffViewer.tsx` → `ui_tiff_viewer.md`
- [ ] `PetriNetViewer.tsx` → `ui_petri_net_viewer.md`
- [ ] `ErrorBoundary.tsx` → `ui_error_boundary.md`
- [ ] `PropertyViewer.tsx` → `ui_property_viewer.md` (dialogs/)
- [ ] `PropertyViewerWithSelection.tsx` → `ui_property_viewer_with_selection.md` (dialogs/)
- [ ] `StructuredPropertySelector.tsx` → `ui_structured_property_selector.md` (dialogs/)
- [ ] `SubNetViewer.tsx` → `ui_sub_net_viewer.md` (dialogs/)

### Phase 9: 最終確認・統合（1.5時間）
- [ ] 全ファイルの記述内容を確認
- [ ] README.mdの更新
- [ ] ui_screen_list.mdの更新
- [ ] 作成内容サマリの作成

## 4. 影響範囲

### 更新対象ファイル（UI仕様書）
1. `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md`
2. `docs/design/ui/experiment_admin/01_project_management/ui_instruction_registration_tab.md`
3. `docs/design/ui/experiment_admin/01_project_management/ui_instruction_edit_dialog.md`
4. `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md`
5. `docs/design/ui/experiment_admin/01_project_management/ui_worker_screen_overlay.md`
6. `docs/design/ui/experiment_admin/02_format_management/` 配下のファイル群
7. `docs/design/ui/experiment_admin/01_project_management/ui_transition_set_search_modal.md`
8. `docs/design/ui/experiment_admin/01_project_management/ui_transition_search_results.md`
9. `docs/design/ui/experiment_admin/01_project_management/ui_weight_sliders.md`
10. `docs/design/ui/experiment_admin/01_project_management/ui_transition_set_batch_processing_panel.md`
11. その他、不整合が見つかったファイル

### 新規作成ファイル
1. `docs/20260311_0847_実験管理者UI仕様書見直し/不整合リスト.md` - 調査結果レポート
2. `docs/20260311_0847_実験管理者UI仕様書見直し/更新内容サマリ.md` - 更新内容の要約

### 影響を受けないファイル
- 実装ファイル（変更なし）
- 他ロールのUI仕様書（変更なし）

## 5. 技術的詳細

### 確認すべき主要な変更点

#### 1. API統合の確認
- LocalStorageからDB管理への移行
- APIエンドポイントの追加・変更
- リクエスト/レスポンス形式の変更

#### 2. 状態管理の変更
- Contextの利用状況
- Props/Stateの構造変更
- useEffectの依存関係

#### 3. UI/UX変更
- タブ構成の変更
- ボタン配置の変更
- モーダル/ダイアログの追加

#### 4. 機能追加
- 連続指示機能
- セマンティック検索
- バッチ処理
- Draft機能

### 作成方法
1. **実装ファイルの精査**: 実際のTypeScriptファイルを読み込み、Props型定義、State管理、API呼び出し、コンポーネント構造を完全に把握
2. **コード構造の分析**: import文、useState、useEffect、useCallback、useMemoなどのHooksを分析
3. **UI構造の抽出**: JSX構造からレイアウト、ボタン配置、モーダル構成を把握
4. **API連携の確認**: 呼び出しているAPI、リクエスト/レスポンス形式を確認
5. **標準テンプレートに記述**: 以下の構成で統一的に記述
   - 概要（目的、使用場面、アクセス権限）
   - 画面構成（レイアウト図、UI要素）
   - 機能仕様（Props定義、State管理、主要機能、API連携）
   - データ型定義
   - 子コンポーネント
   - エラーハンドリング
   - 実装ファイル情報
   - 変更履歴

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 実装ファイルが複雑で把握に時間がかかる | 中 | 高 | 段階的に調査、優先度の高い画面から着手 |
| 仕様書の数が多く、全件更新が困難 | 中 | 中 | 優先度付けして重要なものから更新 |
| 実装意図が不明確な箇所がある | 低 | 中 | ユーザーに質問して確認 |
| 更新中に新たな機能追加が発生 | 低 | 低 | バージョン管理で対応 |

## 7. 不整合の初期調査結果

### 実装から抽出すべき主要情報

#### InstructionRegistrationTab の実装分析例
**実装コードから抽出する情報:**
```typescript
// Props定義
interface InstructionRegistrationTabProps {
  projectId: string;
  projectName: string;
  isActive: boolean;
  isCheckoutLocked?: boolean;
  onInstructionsSubmit?: (instructions: InstructionData[]) => void;
}

// State管理
- instructions: InstructionData[]
- registeredTasks: TaskDetail[]
- editDialogOpen: boolean
- editMode: 'create' | 'edit'
- editingInstruction: InstructionData | undefined
- isSending: boolean

// Context連携
- useProjectMaiml() → maimlRoot, maimlContent, isLoading
- useLanguage() → t

// API呼び出し
- getInstructions(projectName)
- getTaskRegistration(projectName)
- saveInstruction(projectName, data)
- updateInstruction(projectName, id, data)
- deleteInstruction(projectName, id)
- sendInstructions(projectName, {})

// UI構造
- ツールバー（指示件数表示、一括送信ボタン）
- 指示一覧テーブル（対象、優先度、種別、内容、操作）
- InstructionEditDialog
```

**これらを正確にUI仕様書に記載する**

#### ProjectManagement の実装分析例
**実装コードから抽出する情報:**
```typescript
// Props定義
interface ProjectManagementProps {
  onEdit?: (params: MaimlEditorParams) => void;
  onOpenWorkerScreen?: (projectId: string, projectName: string) => void;
}

// State管理（主要なもの）
- projects: Project[]
- selectedProjectId: string | null
- currentTab: 'file_management' | 'task_results' | 'task_registration' | 'instruction_registration'
- currentFolder: string
- openDialogs: OpenDialog[]
- projectFilesData: Record<string, ProjectFilesData>
- projectTasksData: Record<string, { tasks: Task[]; statistics: unknown }>

// Context連携
- ProjectMaimlProvider → useProjectMaiml()

// 主要機能
1. プロジェクト一覧表示・フィルタリング（所有者、部門、ステータス、チェックアウト状態、検索）
2. 4つのタブ切り替え
3. チェックアウト/チェックイン
4. ZIPダウンロード
5. Draft復元
6. 問題確認
7. セマンティック検索
8. 複数ダイアログ管理（ViewRendererDialog）
```

**これらを正確にUI仕様書に記載する**

## 8. テスト計画

### 確認項目
- [ ] 作成したUI仕様書の内容が実装と完全に一致しているか
- [ ] Props型定義がコードと同じ内容で記載されているか
- [ ] State管理がコードと同じ内容で記載されているか
- [ ] API連携（関数名、引数、戻り値）が正確に記載されているか
- [ ] useEffect、useMemo、useCallbackなどの依存関係が記載されているか
- [ ] 子コンポーネントとのProps連携が記載されているか
- [ ] レイアウト構造が実際のJSXと一致しているか
- [ ] 標準テンプレートのセクション構成に従っているか

### 確認方法
- 実装ファイルとUI仕様書を並べて1行ずつ照合
- Props型定義をコードからコピー＆ペーストして一致確認
- import文、API呼び出しを漏れなく記載
- 実際のブラウザ画面とレイアウト図を比較

## 9. 品質保証

### 仕様書のレビュー基準
1. **完全性**: 実装の全機能が記載されているか
2. **正確性**: Props/State/APIの記載が実装と完全一致しているか
3. **明確性**: 第三者が読んで実装をイメージできるか
4. **一貫性**: 標準テンプレートに従っているか
5. **保守性**: 今後の変更時に更新しやすいか

### ロールバック計画
問題が見つかった場合:
1. Gitで作成したファイルを確認
2. 実装ファイルを再度精査して修正
3. 必要に応じてユーザーに質問

## 10. 関連ドキュメント

- [画面一覧](../../design/ui/ui_screen_list.md)
- [実験管理者UI仕様書索引](../../design/ui/experiment_admin/README.md)
- [API一覧](../../design/api/api_list.md)
- [フロントエンド規約](../../.clinerules/development/frontend.md)
- [タスク実行ワークフロー](../../.clinerules/core/workflow.md)

## 11. 承認記録

- **計画書提示日時**: 2026-03-11 08:47
- **承認日時**: 2026-03-11 09:02
- **承認者コメント**: 承認します。全58ファイルを実装ベースで再作成する方針で進めてください。

## 12. 実施記録

### 実施日時
開始: 2026-03-11 08:47
Phase 1完了: 2026-03-11 09:09
Phase 2完了: 2026-03-11 09:19
Phase 3完了: 2026-03-11（別セッション）
Phase 4完了: 2026-03-11（別セッション）
Phase 5完了: 2026-03-11 14:25
Phase 6完了: 2026-03-12（別セッション）
Phase 7完了: 2026-03-12（別セッション）
Phase 8完了: 2026-03-12 午前
Phase 9完了: 2026-03-12 13:55
完了: 2026-03-12 13:55

### Phase 1完了状況（2026-03-11 09:10）

**完了した作業:**
- ✅ タスク計画書の作成と承認取得
- ✅ 実装ファイルの配置特定（frontend/src/components/配下）
- ✅ 全実装ファイルのリストアップ（62ファイル）
- ✅ UI仕様書数の正確な確認（58ファイル）
- ✅ UI仕様書の標準テンプレート作成
- ✅ サンプルファイル（ExperimentAdminMenu）で実装→仕様書フローの確立

**作成したドキュメント:**
1. `PLAN.md` - このタスク計画書（承認済み）
2. `実際のファイル数.md` - README記載35→実際58ファイルの調査結果
3. `実装ファイル一覧.md` - 62実装ファイルのパスと対応関係（10ファイル不一致を特定）
4. `UI仕様書作成テンプレート.md` - 標準テンプレートと作成フロー確立

**発見した重要事項:**
- 実装ファイル: 62ファイル（UI仕様書58より4ファイル多い）
- 不一致: 10ファイル
  - 実装あり仕様書なし: FormatEditorDialog, DraftRestoreDialog等
  - 仕様書あり実装なし: ProjectSearchModal, InstructionDialog等
- README.mdの記載（35ファイル）は実態（58ファイル）と23ファイルの差分

**次のセッションでの実施内容:**
Phase 2以降（推定32-38.5時間）を実施：
- Phase 2: メニュー・ルート（2ファイル、1時間）
- Phase 3: プロジェクト管理画面（16ファイル、8.5時間）
- Phase 4: フォーマット管理画面（9ファイル、4.5時間）
- Phase 5: 進捗管理画面（5ファイル、2.5時間）
- Phase 6: MAIML編集 - Petri Net（12ファイル、6時間）
- Phase 7: MAIML編集 - Document（4ファイル、2時間）
- Phase 8: Viewer（10ファイル、5時間）
- Phase 9: 最終確認・統合（1.5時間）

**重要な参照ドキュメント:**
- `UI仕様書作成テンプレート.md` - Phase 2以降で各UI仕様書作成時に参照
- `実装ファイル一覧.md` - 実装ファイルのパスを確認する際に参照

### 計画からの変更点
- ファイル数: 当初35→実際58→実装62と段階的に判明
- Phase 1で不一致ファイルを10件発見（当初想定外）
- テンプレート作成に予想以上の時間をかけたが、Phase 2以降で効率化できる

### 発見した問題と解決方法
**問題1: README.mdのファイル数が不正確**
- README記載: 35ファイル
- 実際の仕様書: 58ファイル
- 実際の実装: 62ファイル
- 解決: `実際のファイル数.md`で詳細に調査・記録

**問題2: 実装ファイルと仕様書の不一致**
- 10ファイルで実装と仕様書が対応していない
- 解決: `実装ファイル一覧.md`で全ファイルの対応関係を整理

**問題3: 実装ファイルの配置が複数ディレクトリに分散**
- menus/, project/, progress/, editorv2/, viewer/, TransitionSetSearch/等
- 解決: 各ディレクトリを個別に調査してリストアップ

### Phase 1完了時点の成果物
- [x] タスク計画書（PLAN.md）- 承認済み
- [x] 実装ファイル調査レポート（実際のファイル数.md）
- [x] 実装ファイル一覧（実装ファイル一覧.md）- 62ファイル
- [x] UI仕様書作成テンプレート（UI仕様書作成テンプレート.md）

### Phase 2以降で作成予定の成果物
- [ ] 実装ベースで再作成されたUI仕様書（58ファイル）
- [ ] README.mdの更新（ファイル数35→58、不一致の説明）
- [ ] ui_screen_list.mdの更新
- [ ] 作成内容サマリ（Phase 9で作成）

## 13. 振り返り

### うまくいった点

**1. 実装ベースアプローチの採用**
- 実装コードを正として仕様書を作成する方針が効果的だった
- Props/State/API連携を実装から直接抽出することで、正確な仕様書が作成できた
- 既存仕様書との乖離を気にせず、実装の真実を記述できた

**2. 標準テンプレートの確立**
- Phase 1でテンプレートを確立したことで、Phase 2以降の作業が効率化された
- 全58ファイルで統一されたフォーマットを維持できた
- セクション構成が明確で、第三者にも理解しやすいドキュメントになった

**3. 段階的な実施**
- Phaseを分けて段階的に実施したことで、作業の進捗を管理しやすかった
- 各Phaseでの学びを次のPhaseに活かせた
- 複数セッションに分けることで、長時間作業による疲労を回避できた

**4. 発見事項の記録**
- 実装ファイル調査で10件の不一致を発見・記録できた
- README.mdのファイル数誤り（35→58）を特定・修正できた
- アーキテクチャ変更（LocalStorage→DB、Context統合等）を正確に把握できた

---

### 改善が必要な点

**1. 初期見積もりの精度**
- README記載35ファイルから実際58ファイルへの差分（23ファイル）を事前に把握できていなかった
- 実装ファイル62と仕様書58の不一致10件も事前調査で発見すべきだった
- より詳細な事前調査があれば、推定工数がより正確になった

**2. 作業の中断と再開**
- 複数セッションに分かれたことで、コンテキストの復元に時間がかかった
- Phase 6以降は「次セッション開始方法.md」を作成して対応したが、最初から準備すべきだった

**3. ドキュメントの相互参照**
- ui_screen_list.mdの更新をスキップしたため、全体の画面一覧との整合性確認が残った
- 他ロールのUI仕様書との関連性確認も今後必要

---

### 学んだこと

**1. 実装とドキュメントの乖離防止**
- 機能追加時に同時にドキュメントを更新するルールが重要
- 定期的な棚卸し（3ヶ月ごと）が必要
- 実装優先で進める場合でも、最低限の変更履歴は残すべき

**2. ドキュメント作成の効率化**
- 標準テンプレートの存在が作業効率に大きく影響する
- 実装コードから直接情報を抽出する方が、既存ドキュメントの修正より効率的な場合がある
- Props型定義をコピー＆ペーストすることで、記述ミスを防げる

**3. 大規模タスクの進め方**
- 58ファイルという大量のファイルを扱う場合、Phase分けが必須
- 各Phaseの成果物を明確にすることで、進捗が可視化される
- タスク管理ドキュメント（PLAN.md、進捗状況.md等）の重要性を再認識

**4. プロジェクトの実態把握**
- README.mdのファイル数が実態と乖離していることが判明
- ドキュメントの正確性を定期的に検証する仕組みが必要
- 「書いてあること」より「実際の状態」を確認することの重要性

**5. ツールの活用**
- write_fileとreplace_in_fileの使い分けが重要
- 大規模ファイルは段階的作成が必要（file-writing.md参照）
- 実装ファイルの読み込みと仕様書作成を繰り返す作業フローの確立

---

### 今後への提言

**1. 開発プロセスへの組み込み**
- 新規画面実装時に必ずUI仕様書も作成する
- PRレビューにUI仕様書の更新を含める
- CI/CDに仕様書と実装の整合性チェックを組み込む（将来的に）

**2. メンテナンスの自動化**
- 実装ファイルからProps/State定義を自動抽出するツールの検討
- UI仕様書の生成を半自動化するスクリプトの作成
- ファイル数の自動カウント・比較ツールの導入

**3. ドキュメント文化の醸成**
- 「ドキュメントは実装の一部」という意識の共有
- 正確なドキュメントが開発効率を上げることの理解促進
- ドキュメント作成のベストプラクティス共有

**4. 定期的なレビュー**
- 3ヶ月ごとの実装とドキュメントの整合性確認
- 6ヶ月ごとの全体レビューと統計情報更新
- 年次での大規模見直し（今回のような実装ベース再作成）

---

## 📝 補足情報

### 調査対象のUI仕様書一覧（58ファイル）

**ルート (1ファイル)**
- ui_maiml_publish.md

**00_menu/ (1ファイル)**
- ui_experiment_admin_menu.md

**01_project_management/ (16ファイル)**
- ui_project_management.md
- ui_project_folder_tree.md
- ui_file_list_table.md
- ui_create_project_modal.md
- ui_project_detail_modal.md
- ui_project_search_modal.md
- ui_bulk_upload_dialog.md
- ui_task_registration_tab.md
- ui_instruction_registration_tab.md
- ui_instruction_edit_dialog.md
- ui_task_results_table.md
- ui_worker_screen_overlay.md
- ui_transition_set_search_modal.md
- ui_transition_search_results.md
- ui_weight_sliders.md
- ui_transition_set_batch_processing_panel.md
- ui_worker_screen_overlay.md

**02_format_management/ (9ファイル)**
- ui_format_management.md
- ui_format_folder_tree.md
- ui_format_file_list_table.md
- ui_create_format_file_modal.md
- ui_create_format_folder_modal.md
- ui_create_format_modal.md
- ui_format_file_detail_modal.md
- ui_format_search_modal.md
- ui_format_upload_dialog.md

**03_progress_monitoring/ (5ファイル)**
- ui_progress_monitoring.md
- ui_work_progress_detail_dialog.md
- ui_task_results_table.md
- ui_instruction_dialog.md
- ui_petri_net_visualization.md

**04_maiml_editor/petri_net/ (10ファイル)**
- ui_petri_net_editor_screen.md
- ui_petri_net_editor.md
- ui_editor_toolbar.md
- ui_property_panel.md
- ui_validation_panel.md
- ui_method_tab_panel.md
- ui_save_dialog.md
- ui_save_confirm_dialog.md
- ui_workflow_selector_dialog.md
- ui_nested_property_editor.md

**04_maiml_editor/petri_net/nodes/ (2ファイル)**
- ui_place_nodes.md
- ui_transition_node.md

**04_maiml_editor/document/ (4ファイル)**
- ui_document_edit_dialog.md
- ui_template_editor.md
- ui_multi_object_editor.md
- ui_draft_manager.md

**05_Viewer/ (6ファイル)**
- ui_view_renderer.md
- ui_view_renderer_dialog.md
- ui_image_viewer.md
- ui_tiff_viewer.md
- ui_petri_net_viewer.md
- ui_error_boundary.md

**05_Viewer/dialogs/ (4ファイル)**
- ui_property_viewer.md
- ui_property_viewer_with_selection.md
- ui_structured_property_selector.md
- ui_sub_net_viewer.md

### 優先度の基準

**高（Phase 2）:**
- プロジェクト管理関連（ProjectManagement, InstructionRegistrationTab, TaskRegistrationTab, InstructionEditDialog, WorkerScreenOverlay）
- 複雑で重要度の高いコンポーネント

**中（Phase 3）:**
- フォーマット管理関連（FormatManagement, FormatFolderTree, FormatFileListTable, モーダル群）
- 利用頻度が高いコンポーネント

**標準（Phase 4）:**
- TransitionSet検索関連（TransitionSetSearchModal, SearchResults, WeightSliders, BatchProcessingPanel）
- その他の主要コンポーネント

**注**: 実験管理者関連の全58ファイルを実装から正確に作成し直します。各ファイルは実装コードと完全に一致した内容にします。README.mdには35ファイルと記載されていますが、実際には58ファイル存在します（詳細は `実際のファイル数.md` を参照）。
