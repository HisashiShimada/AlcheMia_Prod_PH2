# 画面一覧

## 概要

このドキュメントは、mmdpfプロジェクトの全画面ファイルの詳細情報を管理します。

**重要**: 新規画面を追加した際や画面を変更した際は、このファイルを必ず更新してください。

---

## 📋 画面一覧表（ロール別）

### 1. 認証関連（ログイン前）

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| LoginPage.tsx | ログインページ | frontend/src/components/LoginPage.tsx | ログインページコンポーネント |
| AuthContainer.tsx | 認証コンテナ | frontend/src/components/auth/AuthContainer.tsx | 認証画面全体のコンテナコンポーネント |
| LoginForm.tsx | ログインフォーム | frontend/src/components/auth/LoginForm.tsx | ログインフォーム（ユーザーID・パスワード入力） |
| PasswordResetRequest.tsx | パスワードリセット申請 | frontend/src/components/auth/PasswordResetRequest.tsx | パスワードリセット申請画面 |
| PasswordResetExecute.tsx | パスワードリセット実行 | frontend/src/components/auth/PasswordResetExecute.tsx | パスワードリセット実行画面 |
| PINCodeForm.tsx | PINコード入力フォーム | frontend/src/components/auth/PINCodeForm.tsx | PINコード入力画面 |

---

### 2. 共通コンポーネント（全ユーザー）

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ThemeProviderWrapper.tsx | テーマプロバイダラッパー | frontend/src/components/ThemeProviderWrapper.tsx | Ant Designテーマプロバイダ |
| Header.tsx | ヘッダー | frontend/src/components/common/Header.tsx | アプリケーション共通ヘッダー |
| SubHeader.tsx | サブヘッダー | frontend/src/components/common/SubHeader.tsx | メニュー切り替え用サブヘッダー |
| MenuCard.tsx | メニューカード | frontend/src/components/common/MenuCard.tsx | メニュー表示用カードコンポーネント |
| DebugLoginPanel.tsx | デバッグログインパネル | frontend/src/components/common/DebugLoginPanel.tsx | 開発用簡易ログインパネル |

**共通ビューアコンポーネント:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| ViewRenderer.tsx | ビューレンダラー | frontend/src/components/viewer/ViewRenderer.tsx | [ui_view_renderer.md](experiment_admin/05_Viewer/ui_view_renderer.md) | 汎用ビューレンダラー |
| ViewRendererDialog.tsx | ビューレンダラーダイアログ | frontend/src/components/viewer/ViewRendererDialog.tsx | [ui_view_renderer_dialog.md](experiment_admin/05_Viewer/ui_view_renderer_dialog.md) | ダイアログ形式ビューレンダラー |
| ImageViewer.tsx | 画像ビューア | frontend/src/components/viewer/ImageViewer.tsx | [ui_image_viewer.md](experiment_admin/05_Viewer/ui_image_viewer.md) | 画像表示ビューア |
| TiffViewer.tsx | TIFFビューア | frontend/src/components/viewer/TiffViewer.tsx | [ui_tiff_viewer.md](experiment_admin/05_Viewer/ui_tiff_viewer.md) | TIFF画像表示ビューア |
| PetriNetViewer.tsx | PetriNetビューア | frontend/src/components/viewer/PetriNetViewer.tsx | [ui_petri_net_viewer.md](experiment_admin/05_Viewer/ui_petri_net_viewer.md) | PetriNet閲覧専用ビューア |
| ErrorBoundary.tsx | エラーバウンダリ | frontend/src/components/viewer/ErrorBoundary.tsx | [ui_error_boundary.md](experiment_admin/05_Viewer/ui_error_boundary.md) | エラーハンドリング用コンポーネント |
| PropertyViewer.tsx | プロパティビューア | frontend/src/components/viewer/dialogs/PropertyViewer.tsx | [ui_property_viewer.md](experiment_admin/05_Viewer/dialogs/ui_property_viewer.md) | プロパティ表示ビューア |
| PropertyViewerWithSelection.tsx | 選択機能付きプロパティビューア | frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx | [ui_property_viewer_with_selection.md](experiment_admin/05_Viewer/dialogs/ui_property_viewer_with_selection.md) | ノード選択機能付きプロパティビューア |
| StructuredPropertySelector.tsx | 構造化プロパティセレクタ | frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx | [ui_structured_property_selector.md](experiment_admin/05_Viewer/dialogs/ui_structured_property_selector.md) | 構造化プロパティ選択コンポーネント |
| SubNetViewer.tsx | サブネットビューア | frontend/src/components/viewer/dialogs/SubNetViewer.tsx | [ui_sub_net_viewer.md](experiment_admin/05_Viewer/dialogs/ui_sub_net_viewer.md) | サブネット表示ビューア |
| PetriNetVisualization.tsx | PetriNet可視化 | frontend/src/components/progress/PetriNetVisualization.tsx | [ui_petri_net_visualization.md](experiment_admin/03_progress_monitoring/ui_petri_net_visualization.md) | PetriNetの可視化コンポーネント |

**共通ノードコンポーネント（editorv2）:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| TransitionNode.tsx | トランジションノード | frontend/src/components/editorv2/components/nodes/TransitionNode.tsx | [ui_transition_node.md](experiment_admin/04_maiml_editor/petri_net/nodes/ui_transition_node.md) | PetriNetのトランジションノード |
| MaterialPlaceNode.tsx | Materialプレースノード | frontend/src/components/editorv2/components/nodes/MaterialPlaceNode.tsx | [ui_place_nodes.md](experiment_admin/04_maiml_editor/petri_net/nodes/ui_place_nodes.md) | Materialプレースノード |
| ConditionPlaceNode.tsx | Conditionプレースノード | frontend/src/components/editorv2/components/nodes/ConditionPlaceNode.tsx | [ui_place_nodes.md](experiment_admin/04_maiml_editor/petri_net/nodes/ui_place_nodes.md) | Conditionプレースノード |
| ResultPlaceNode.tsx | Resultプレースノード | frontend/src/components/editorv2/components/nodes/ResultPlaceNode.tsx | [ui_place_nodes.md](experiment_admin/04_maiml_editor/petri_net/nodes/ui_place_nodes.md) | Resultプレースノード |

---

### 3. プロバイダ用画面（Provider）

**メニュー:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ProviderMenu.tsx | プロバイダメニュー | frontend/src/components/menus/ProviderMenu.tsx | プロバイダ用メニュー |

**機能画面（タブ順序: 組織管理 → 会社管理 → 情報ダウンロード）:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| OrganizationManagement.tsx | 組織管理 | frontend/src/components/Provider/OrganizationManagement.tsx | [ui_organization_main.md](provider/ui_organization_main.md) | 組織マスタ管理画面（タブ1） |
| CorporationManagement.tsx | 会社管理 | frontend/src/components/Provider/CorporationManagement.tsx | [ui_corporation_main.md](provider/ui_corporation_main.md) | 会社マスタ管理画面（タブ2） |
| InformationDownload.tsx | 情報ダウンロード | frontend/src/components/Provider/InformationDownload.tsx | [ui_information_download_main.md](provider/ui_information_download_main.md) | 全組織統計情報CSVダウンロード画面（タブ3） |

---

### 4. システム管理者用画面（System Admin）

**メニュー:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| SystemAdminMenu.tsx | システム管理メニュー | frontend/src/components/menus/SystemAdminMenu.tsx | システム管理者用メニュー |

**機能画面:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| SystemOverviewMock.tsx | システム概要 | frontend/mock/components/SystemOverviewMock.tsx | システム全体の概要表示（モック） |
| OrganizationStatisticsMock.tsx | 組織統計情報 | frontend/mock/components/OrganizationStatisticsMock.tsx | 組織別の統計情報表示（モック） |
| UserManagement.tsx | ユーザー管理 | frontend/mock/components/UserManagement.tsx | ユーザー管理画面 |
| SessionManagementMock.tsx | セッション管理 | frontend/mock/components/SessionManagementMock.tsx | セッション管理画面（モック） |
| MasterManagementMock.tsx | マスタ管理 | frontend/mock/components/MasterManagementMock.tsx | 部署管理・ロール管理などのマスタ管理（モック） |
| CompanyManagementMock.tsx | 会社管理 | frontend/mock/components/CompanyManagementMock.tsx | 会社管理画面（モック） |
| RoleManagementMock.tsx | ロール管理 | frontend/mock/components/RoleManagementMock.tsx | ロール管理画面（モック） |

---

### 5. データ管理者用画面（Data Admin）

**メニュー:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| DataAdminMenu.tsx | データ管理メニュー | frontend/src/components/menus/DataAdminMenu.tsx | データ管理者用メニュー |

**機能画面:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| MasterManagementMock.tsx | マスタ管理 | frontend/mock/components/MasterManagementMock.tsx | マスタデータ管理画面（モック） |
| OrganizationManagementMock.tsx | 組織管理 | frontend/mock/components/OrganizationManagementMock.tsx | 組織管理画面（モック） |
| InformationDownloadMock.tsx | 情報ダウンロード | frontend/mock/components/InformationDownloadMock.tsx | 情報ダウンロード画面（モック） |

---

### 6. 実験管理者用画面（Experiment Admin）

**メニュー:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ExperimentAdminMenu.tsx | 実験管理メニュー | frontend/src/components/menus/ExperimentAdminMenu.tsx | 実験管理者用メニュー |

**プロジェクト管理:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| ProjectManagement.tsx | プロジェクト管理 | frontend/src/components/project/ProjectManagement.tsx | [ui_project_management.md](experiment_admin/01_project_management/ui_project_management.md) | プロジェクト管理メイン画面 |
| CreateProjectModal.tsx | プロジェクト作成モーダル | frontend/src/components/project/CreateProjectModal.tsx | [ui_create_project_modal.md](experiment_admin/01_project_management/ui_create_project_modal.md) | プロジェクト作成モーダル |
| ProjectDetailModal.tsx | プロジェクト詳細モーダル | frontend/src/components/project/ProjectDetailModal.tsx | [ui_project_detail_modal.md](experiment_admin/01_project_management/ui_project_detail_modal.md) | プロジェクト詳細モーダル |
| ProjectSearchModal.tsx | プロジェクト検索モーダル | frontend/src/components/project/ProjectSearchModal.tsx | [ui_project_search_modal.md](experiment_admin/01_project_management/ui_project_search_modal.md) | プロジェクト検索モーダル |
| ProjectFolderTree.tsx | プロジェクトフォルダツリー | frontend/src/components/project/ProjectFolderTree.tsx | [ui_project_folder_tree.md](experiment_admin/01_project_management/ui_project_folder_tree.md) | プロジェクトフォルダツリー表示 |
| FileListTable.tsx | ファイル一覧テーブル | frontend/src/components/project/FileListTable.tsx | [ui_file_list_table.md](experiment_admin/01_project_management/ui_file_list_table.md) | ファイル一覧テーブル |
| BulkUploadDialog.tsx | 一括アップロードダイアログ | frontend/src/components/project/BulkUploadDialog.tsx | [ui_bulk_upload_dialog.md](experiment_admin/01_project_management/ui_bulk_upload_dialog.md) | ファイル一括アップロードダイアログ |
| WorkerScreenOverlay.tsx | ワーカー画面オーバーレイ | frontend/src/components/project/WorkerScreenOverlay.tsx | [ui_worker_screen_overlay.md](experiment_admin/01_project_management/ui_worker_screen_overlay.md) | 実験作業者向けの操作オーバーレイ画面 |
| InstructionRegistrationTab.tsx | 指示登録タブ | frontend/src/components/project/InstructionRegistrationTab.tsx | [ui_instruction_registration_tab.md](experiment_admin/01_project_management/ui_instruction_registration_tab.md) | 指示一覧表示・追加・編集・削除・一括送信 |
| TaskRegistrationTab.tsx | タスク登録タブ | frontend/src/components/project/TaskRegistrationTab.tsx | [ui_task_registration_tab.md](experiment_admin/01_project_management/ui_task_registration_tab.md) | タスク順序設定・試行回数設定（ドラッグ&ドロップ対応） |
| InstructionEditDialog.tsx | 指示編集ダイアログ | frontend/src/components/project/InstructionEditDialog.tsx | [ui_instruction_edit_dialog.md](experiment_admin/01_project_management/ui_instruction_edit_dialog.md) | 単一指示の追加・編集ダイアログ（連続指示機能付き） |
| InstructionDialog.tsx | 作業指示送信ダイアログ | frontend/src/components/project/InstructionDialog.tsx | [ui_instruction_registration_tab.md](experiment_admin/01_project_management/ui_instruction_registration_tab.md) | タスク詳細設定と複数指示入力の統合ダイアログ |
| TaskResultsTable.tsx | タスク結果一覧テーブル | frontend/src/components/project/TaskResultsTable.tsx | [ui_task_results_table.md](experiment_admin/01_project_management/ui_task_results_table.md) | タスク実行結果の一覧表示 |

**フォーマット管理:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| FormatManagement.tsx | フォーマット管理 | frontend/src/components/format/FormatManagement.tsx | [ui_format_management.md](experiment_admin/02_format_management/ui_format_management.md) | フォーマットファイル管理画面 |
| FormatFolderTree.tsx | フォーマットフォルダツリー | frontend/src/components/format/FormatFolderTree.tsx | [ui_format_folder_tree.md](experiment_admin/02_format_management/ui_format_folder_tree.md) | フォーマットフォルダツリー表示 |
| FormatFileListTable.tsx | フォーマットファイル一覧テーブル | frontend/src/components/format/FormatFileListTable.tsx | [ui_format_file_list_table.md](experiment_admin/02_format_management/ui_format_file_list_table.md) | フォーマットファイル一覧テーブル |
| CreateFormatFileModal.tsx | フォーマットファイル作成モーダル | frontend/src/components/format/CreateFormatFileModal.tsx | [ui_create_format_file_modal.md](experiment_admin/02_format_management/ui_create_format_file_modal.md) | フォーマットファイル作成モーダル |
| CreateFormatFolderModal.tsx | フォーマットフォルダ作成モーダル | frontend/src/components/format/CreateFormatFolderModal.tsx | [ui_create_format_folder_modal.md](experiment_admin/02_format_management/ui_create_format_folder_modal.md) | フォーマットフォルダ作成モーダル |
| CreateFormatModal.tsx | フォーマット作成モーダル | frontend/src/components/format/CreateFormatModal.tsx | [ui_create_format_modal.md](experiment_admin/02_format_management/ui_create_format_modal.md) | 新規フォーマット（部門・フォルダ）作成モーダル |
| FormatFileDetailModal.tsx | フォーマットファイル詳細モーダル | frontend/src/components/format/FormatFileDetailModal.tsx | [ui_format_file_detail_modal.md](experiment_admin/02_format_management/ui_format_file_detail_modal.md) | フォーマットファイル詳細モーダル |
| FormatSearchModal.tsx | フォーマット検索モーダル | frontend/src/components/format/FormatSearchModal.tsx | [ui_format_search_modal.md](experiment_admin/02_format_management/ui_format_search_modal.md) | フォーマット検索モーダル |
| FormatUploadDialog.tsx | フォーマットアップロードダイアログ | frontend/src/components/format/FormatUploadDialog.tsx | [ui_format_upload_dialog.md](experiment_admin/02_format_management/ui_format_upload_dialog.md) | フォーマットアップロードダイアログ |

**TransitionSet検索（TransitionSetSearch）:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| TransitionSetSearchModal.tsx | TransitionSet検索モーダル | frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx | [ui_transition_set_search_modal.md](experiment_admin/01_project_management/ui_transition_set_search_modal.md) | セマンティック類似検索によるTransitionSet検索モーダル |
| SearchResults.tsx | 検索結果コンポーネント | frontend/src/components/TransitionSetSearch/SearchResults.tsx | [ui_transition_search_results.md](experiment_admin/01_project_management/ui_transition_search_results.md) | TransitionSet検索結果の一覧表示 |
| WeightSliders.tsx | 重みスライダーコンポーネント | frontend/src/components/TransitionSetSearch/WeightSliders.tsx | [ui_weight_sliders.md](experiment_admin/01_project_management/ui_weight_sliders.md) | 類似度重みパラメータ調整スライダー |
| TransitionSetBatchProcessingPanel.tsx | バッチ処理パネル | frontend/src/components/TransitionSetSearch/TransitionSetBatchProcessingPanel.tsx | [ui_transition_set_batch_processing_panel.md](experiment_admin/01_project_management/ui_transition_set_batch_processing_panel.md) | TransitionSetバッチ登録・進捗管理パネル |

**PetriNetエディタ（editorv2）:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| PetriNetEditor.tsx | PetriNetエディタ | frontend/src/components/editorv2/PetriNetEditor.tsx | [ui_petri_net_editor.md](experiment_admin/04_maiml_editor/petri_net/ui_petri_net_editor.md) | PetriNet形式の実験ワークフロー編集エディタ |
| PetriNetEditorScreen.tsx | PetriNetエディタ画面 | frontend/src/components/editorv2/PetriNetEditorScreen.tsx | [ui_petri_net_editor_screen.md](experiment_admin/04_maiml_editor/petri_net/ui_petri_net_editor_screen.md) | PetriNetエディタ画面コンテナ |
| EditorToolbar.tsx | エディタツールバー | frontend/src/components/editorv2/components/EditorToolbar.tsx | [ui_editor_toolbar.md](experiment_admin/04_maiml_editor/petri_net/ui_editor_toolbar.md) | エディタ操作用ツールバー |
| PropertyPanel.tsx | プロパティパネル | frontend/src/components/editorv2/components/PropertyPanel.tsx | [ui_property_panel.md](experiment_admin/04_maiml_editor/petri_net/ui_property_panel.md) | ノード・エッジのプロパティ表示・編集パネル |
| ValidationPanel.tsx | バリデーションパネル | frontend/src/components/editorv2/components/ValidationPanel.tsx | [ui_validation_panel.md](experiment_admin/04_maiml_editor/petri_net/ui_validation_panel.md) | バリデーション結果表示パネル |
| MethodTabPanel.tsx | メソッドタブパネル | frontend/src/components/editorv2/components/MethodTabPanel.tsx | [ui_method_tab_panel.md](experiment_admin/04_maiml_editor/petri_net/ui_method_tab_panel.md) | 複数メソッドのタブ切り替えパネル |
| SaveDialog.tsx | 保存ダイアログ | frontend/src/components/editorv2/components/SaveDialog.tsx | [ui_save_dialog.md](experiment_admin/04_maiml_editor/petri_net/ui_save_dialog.md) | 保存ダイアログ（Draft機能付き） |
| SaveConfirmDialog.tsx | 保存確認ダイアログ | frontend/src/components/editorv2/components/SaveConfirmDialog.tsx | [ui_save_confirm_dialog.md](experiment_admin/04_maiml_editor/petri_net/ui_save_confirm_dialog.md) | 保存確認ダイアログ |
| WorkflowSelectorDialog.tsx | ワークフロー選択ダイアログ | frontend/src/components/editorv2/components/WorkflowSelectorDialog.tsx | [ui_workflow_selector_dialog.md](experiment_admin/04_maiml_editor/petri_net/ui_workflow_selector_dialog.md) | ワークフロー選択ダイアログ |
| NestedPropertyEditor.tsx | ネストプロパティエディタ | frontend/src/components/editorv2/components/NestedPropertyEditor.tsx | [ui_nested_property_editor.md](experiment_admin/04_maiml_editor/petri_net/ui_nested_property_editor.md) | ネスト構造プロパティ編集 |

**ドキュメント編集（editorv2）:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| DocumentEditDialog.tsx | ドキュメント編集ダイアログ | frontend/src/components/editorv2/components/DocumentEditDialog.tsx | [ui_document_edit_dialog.md](experiment_admin/04_maiml_editor/document/ui_document_edit_dialog.md) | MAIMLドキュメント編集ダイアログ |
| TemplateEditor.tsx | テンプレートエディタ | frontend/src/components/editorv2/components/TemplateEditor.tsx | [ui_template_editor.md](experiment_admin/04_maiml_editor/document/ui_template_editor.md) | テンプレート編集（Material/Condition/Result） |
| MultiObjectEditor.tsx | 複数オブジェクトエディタ | frontend/src/components/editorv2/components/MultiObjectEditor.tsx | [ui_multi_object_editor.md](experiment_admin/04_maiml_editor/document/ui_multi_object_editor.md) | 複数オブジェクト一括編集エディタ |
| DraftManager.tsx | ドラフト管理 | frontend/src/components/editorv2/components/DraftManager.tsx | [ui_draft_manager.md](experiment_admin/04_maiml_editor/document/ui_draft_manager.md) | 編集内容の一時保存・復元機能 |

**進捗管理:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ProgressMonitoring.tsx | 進捗モニタリング | frontend/src/components/progress/ProgressMonitoring.tsx | 実験進捗モニタリング画面 |
| WorkProgressDetailDialog.tsx | 作業進捗詳細ダイアログ | frontend/src/components/progress/WorkProgressDetailDialog.tsx | 作業進捗詳細ダイアログ |
| TaskResultsTable.tsx | タスク結果テーブル | frontend/src/components/project/TaskResultsTable.tsx | タスク結果一覧テーブル |

**作業指示:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| InstructionDialog.tsx | 指示ダイアログ | frontend/src/components/project/InstructionDialog.tsx | 作業指示送信ダイアログ |

---

### 7. 名前空間管理ツール画面（Namespace Management）

**機能画面:**

| 物理名 | 論理名 | ファイルパス | UI仕様書 | 用途・説明 |
|--------|--------|--------------|----------|-----------|
| NamespaceMain.tsx | 名前空間管理メイン | frontend/src/components/namespace/NamespaceMain.tsx | [ui_namespace_main.md](namespace_management/ui_namespace_main.md) | 3ペイン構成のメイン画面（名前空間ツリー / 用語リスト / 詳細表示・XMLプレビュー） |
| NamespaceAddDialog.tsx | 名前空間追加ダイアログ | frontend/src/components/namespace/NamespaceAddDialog.tsx | [ui_namespace_add_dialog.md](namespace_management/ui_namespace_add_dialog.md) | 名前空間追加モーダルダイアログ（グローバル / 組織 / 個人レベル対応） |
| NamespaceMaimlEditor.tsx | MaiMLファイルエディター | frontend/src/components/namespace/NamespaceMaimlEditor.tsx | [ui_namespace_maiml_editor.md](namespace_management/ui_namespace_maiml_editor.md) | MaiMLファイルのxmlns宣言を管理するエディター（ドラッグ＆ドロップ対応） |

---

### 8. 実験作業者用画面（Experiment Worker）

**メニュー:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ExperimentWorkerMenu.tsx | 実験作業メニュー | frontend/src/components/menus/ExperimentWorkerMenu.tsx | 実験作業者用メニュー |

**メインタブ:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ExperimentRecordTab.tsx | 実験記録タブ | frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx | 実験データ記録メインタブ |
| ProgressCheckTab.tsx | 進捗確認タブ | frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx | 実験進捗確認タブ |
| InstructionConfirmationTab.tsx | 指示確認タブ | frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx | 作業指示確認タブ |

**実験記録関連:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| DataRecordDialog.tsx | データ記録ダイアログ | frontend/src/components/ExperimentWorker/DataRecordDialog.tsx | 実験データ記録ダイアログ |
| TransitionList.tsx | トランジション一覧 | frontend/src/components/ExperimentWorker/TransitionList.tsx | トランジション一覧表示 |
| InstructionFlowDialog.tsx | 指示フロー図ダイアログ | frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx | 指示フロー図表示ダイアログ |
| TransitionFlowDiagram.tsx | トランジションフロー図 | frontend/src/components/ExperimentWorker/TransitionFlowDiagram.tsx | トランジションフロー図表示コンポーネント |
| TransitionFlowNode.tsx | トランジションフローノード | frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx | トランジションフローノード表示コンポーネント |
| TaskListTable.tsx | タスク一覧テーブル | frontend/src/components/ExperimentWorker/TaskListTable.tsx | タスク一覧テーブル表示 |

**進捗確認関連:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ProgressCheckTable.tsx | 進捗確認テーブル | frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx | 進捗確認テーブル |
| WorkflowStats.tsx | ワークフロー統計 | frontend/src/components/ExperimentWorker/WorkflowStats.tsx | ワークフロー統計情報表示 |

**指示確認関連:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| InstructionCard.tsx | 指示カード | frontend/src/components/ExperimentWorker/InstructionCard.tsx | 作業指示表示カード |
| InstructionConfirmationModal.tsx | 指示確認モーダル | frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx | 作業指示確認モーダル |
| InstructionGroup.tsx | 指示グループ | frontend/src/components/ExperimentWorker/InstructionGroup.tsx | 指示のグループ表示コンポーネント |
| InstructionStats.tsx | 指示統計 | frontend/src/components/ExperimentWorker/InstructionStats.tsx | 指示の統計情報表示 |

**問題管理:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| IssueManagementModal.tsx | 問題管理モーダル | frontend/src/components/ExperimentWorker/IssueManagementModal.tsx | 問題管理モーダル |

**選択ダイアログ:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ProjectSelectionModal.tsx | プロジェクト選択モーダル | frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx | プロジェクト選択モーダル |
| ~~TaskSelector.tsx~~ | ~~タスクセレクタ~~ | ~~frontend/src/components/ExperimentWorker/TaskSelector.tsx~~ | ❌ **未使用**（MethodTaskSelector.tsx に置き換えられました） |
| MethodTaskSelectionModal.tsx | メソッド・タスク選択モーダル | frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx | メソッドとタスクを一緒に選択するモーダル |
| MethodTaskSelector.tsx | メソッド・タスクセレクタ | frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx | ✅ **現在使用中** - メソッドとタスク選択コンポーネント（TaskSelector.tsx の代替） |
| UnifiedSelectionDialog.tsx | 統合選択ダイアログ | frontend/src/components/ExperimentWorker/UnifiedSelectionDialog.tsx | 統合選択ダイアログ |
| SelectionDialog.tsx | 選択ダイアログ | frontend/src/components/ExperimentWorker/SelectionDialog.tsx | 汎用選択ダイアログ |

**操作ボタン:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| TaskActionButtons.tsx | タスク操作ボタン | frontend/src/components/ExperimentWorker/TaskActionButtons.tsx | タスク操作用ボタン群 |

---

## 📝 使用API一覧（主要なもの）

**詳細は各API設計書を参照**:
- [認証API](../api/api_auth.md)
- [プロジェクト管理API](../api/api_project_management.md)
- [MAIML編集API](../api/api_maiml_editor.md)
- [ファイルアクセスAPI](../api/api_file_access.md)
- [問題管理API](../api/api_issue_management.md)
- [API一覧対応表](../api/api_list.md)

### 認証API
- POST /api/v1/auth/login - ログイン（PINコード送信）
- POST /api/v1/auth/verify-pin - PINコード検証
- POST /api/v1/auth/logout - ログアウト

### プロジェクト管理API（実装済み13/16）
- GET /api/v1/projects - プロジェクト一覧取得 ✅
- POST /api/v1/projects - プロジェクト作成 ✅
- GET /api/v1/projects/:projectId - プロジェクト詳細取得 ✅
- POST /api/v1/projects/:projectName/checkout - チェックアウト ✅
- POST /api/v1/projects/:projectName/checkin - チェックイン ✅
- GET /api/v1/projects/:projectId/checkout-status - チェックアウト状態取得 ✅
- GET /api/v1/projects/:projectName/files - ファイル一覧取得 ✅
- GET /api/v1/projects/:projectName/tasks - タスク一覧取得 ✅
- GET /api/v1/projects/:projectName/worker-instructions - 指示一覧取得（実験作業者用） ✅
- PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm - 指示確認完了 ✅
- POST /api/v1/projects/:projectId/approval-request - 承認依頼 ✅
- GET /api/v1/projects/worker-accessible - 実験作業者用プロジェクト一覧取得 ✅
- GET /api/v1/projects/:projectId/maiml - MAIMLファイル取得（プロジェクト） ✅

### MAIML編集API（実装済み17/17、100%完了）
- POST /api/v1/maiml/parse - MAIML解析（基本） ✅
- POST /api/v1/maiml/parse-petri-net-structure - ペトリネット構造解析（複数method対応） ✅
- POST /api/v1/maiml/save - MAIMLファイル保存 ✅
- POST /api/v1/maiml/load - MAIMLファイル読込 ✅
- GET /api/v1/maiml/list - MAIMLファイル一覧取得 ✅
- POST /api/v1/maiml/validate - MAIMLバリデーション ✅
- POST /api/v1/maiml/auto-correct - MAIML自動補正（リアルタイム） ✅
- POST /api/v1/maiml/correct - MAIML自動補正（基本） ✅
- POST /api/v1/maiml/session/start - 編集セッション開始 ✅
- POST /api/v1/maiml/session/end - 編集セッション終了 ✅
- GET /api/v1/maiml/files - ファイル一覧取得 ✅
- GET /api/v1/maiml/file-content - ファイル内容取得 ✅
- GET /api/v1/maiml/health - ヘルスチェック ✅
- POST /api/v1/maiml/draft - Draft保存 ✅
- GET /api/v1/maiml/draft/:draftKey - Draft読み込み ✅
- GET /api/v1/maiml/drafts - Draft一覧取得 ✅
- DELETE /api/v1/maiml/draft/:draftKey - Draft削除 ✅

### ファイルアクセスAPI（実装済み6/6、100%完了）
- POST /api/v1/files/upload - ファイルアップロード ✅
- POST /api/v1/files/download-folder-as-zip - フォルダZIPダウンロード ✅
- POST /api/v1/files/download-url - 署名付きURL取得 ✅
- GET /api/v1/projects/:projectId/files/:fileName/download - 単一ファイルダウンロード（レガシー） ✅
- GET /api/v1/files/batches - バッチ履歴取得 ✅
- GET /api/v1/files/batches/:batchId/progress - バッチ進捗取得 ✅

### フォーマット管理API（未実装）
- GET /api/v1/formats - フォーマット一覧取得
- GET /api/v1/formats/:formatId/files - フォーマットファイル一覧取得
- POST /api/v1/formats/:formatId/files - 新規ファイル作成

### 問題管理API（実装済み5/5、100%完了）
- POST /api/v1/issues - 問題報告 ✅
- POST /api/v1/issues/:issueId/comments - コメント投稿 ✅
- GET /api/v1/issues - 問題一覧取得 ✅
- GET /api/v1/issues/:issueId - 問題詳細取得 ✅
- PATCH /api/v1/issues/:issueId/status - 問題ステータス変更 ✅

---

## 🔧 メンテナンス

### 新規画面追加時のチェックリスト

- [ ] 物理名（ファイル名）を記録
- [ ] 論理名（画面名）を記録
- [ ] ファイルパスを記録
- [ ] 用途・説明を記載
- [ ] アクセス権限を設定
- [ ] 使用するAPIを記載
- [ ] 関連コンポーネントを記載
- [ ] カテゴリに追加
- [ ] `.clinerules/references/ui_structure.md` のカテゴリセクションも更新

### 画面変更時のチェックリスト

- [ ] 変更内容をこのファイルに反映
- [ ] 論理名が変更された場合は更新
- [ ] ファイルパスが変更された場合は更新
- [ ] 用途・説明を最新化
- [ ] 使用APIが変更された場合は更新

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-05-07 | フォーマット管理コンポーネント9ファイルのファイルパスを `project/` → `format/` に変更（ファイル移動に伴うドキュメント更新） | Cline |
| 2026-04-07 | プロバイダ用画面のタブ順序を変更（会社管理→組織管理 の順 → 組織管理→会社管理 の順）、機能画面一覧をモックから実装済みコンポーネントに更新し、UI仕様書リンクを追加 | Cline |
| 2026-03-06 | UI仕様書追加 - project/（WorkerScreenOverlay, FormatManagement系9ファイル）とTransitionSetSearch/（4ファイル）のUI仕様書を新規作成し、ui_screen_list.mdにリンクを追記 | Cline |
| 2026-02-19 17:12 | 使用API一覧を更新 - プロジェクト管理API（13/16実装済み）、MAIML編集API（17/17、100%完了）、ファイルアクセスAPI（6/6、100%完了）を反映 | Cline |
| 2026-02-19 | editorv2対応完了 - 全ファイルパスをeditorv2配下に更新、UI仕様書リンク追加、ノード名をPlaceNodeに変更 | Cline |
| 2026-01-27 | MAIML編集機能統合完了 - TemplateListView.tsx, TemplateListItem.tsx追加 | Cline |
| | | Phase 4-7完了により、PetriNetEditor関連コンポーネントが完全統合 | |
| 2026-01-21 | TaskSelector.tsx を未使用として明記、MethodTaskSelector.tsx が代替コンポーネントであることを明示 | Cline |
| 2026-01-16 | 実装ファイルとの差分を更新 - ExperimentWorker実験記録関連コンポーネント追加（InstructionFlowDialog、TransitionFlowDiagram、TransitionFlowNode、TaskListTable）、System Admin用モック追加（CompanyManagement、RoleManagement） | Cline |
| 2026-01-09 | システム管理者用・データ管理者用・プロバイダ用のモックコンポーネントを追加 | Cline |
| 2026-01-09 | 初版作成 - 全コンポーネントファイルをロール別に登録 | Cline |

---

## 📌 備考

- **論理名**や**用途・説明**については、ユーザーからの情報提供により随時更新します
- **使用API**の詳細については、各画面の実装状況に応じて追記します
- アクセス権限は以下のロールに基づきます：
  - `provider` - プロバイダ
  - `system_admin` - システム管理者
  - `data_admin` - データ管理者
  - `experiment_admin` - 実験管理者
  - `experiment_worker` - 実験作業者
  - `mi_engineer` - MI エンジニア
  - `未認証` - 認証前のユーザー
  - `全ユーザー` - 認証済みの全ユーザー
