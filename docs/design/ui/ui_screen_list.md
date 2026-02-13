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

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ViewRenderer.tsx | ビューレンダラー | frontend/src/components/viewer/ViewRenderer.tsx | 汎用ビューレンダラー |
| ViewRendererDialog.tsx | ビューレンダラーダイアログ | frontend/src/components/viewer/ViewRendererDialog.tsx | ダイアログ形式ビューレンダラー |
| ImageViewer.tsx | 画像ビューア | frontend/src/components/viewer/ImageViewer.tsx | 画像表示ビューア |
| TiffViewer.tsx | TIFFビューア | frontend/src/components/viewer/TiffViewer.tsx | TIFF画像表示ビューア |
| ErrorBoundary.tsx | エラーバウンダリ | frontend/src/components/viewer/ErrorBoundary.tsx | エラーハンドリング用コンポーネント |
| PropertyViewer.tsx | プロパティビューア | frontend/src/components/viewer/dialogs/PropertyViewer.tsx | プロパティ表示ビューア |
| PropertyViewerWithSelection.tsx | 選択機能付きプロパティビューア | frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx | ノード選択機能付きプロパティビューア |
| StructuredPropertySelector.tsx | 構造化プロパティセレクタ | frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx | 構造化プロパティ選択コンポーネント |
| SubNetViewer.tsx | サブネットビューア | frontend/src/components/viewer/dialogs/SubNetViewer.tsx | サブネット表示ビューア |
| PetriNetVisualization.tsx | PetriNet可視化 | frontend/src/components/progress/PetriNetVisualization.tsx | PetriNetの可視化コンポーネント |

**共通ノードコンポーネント:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| TransitionNode.tsx | トランジションノード | frontend/src/components/nodes/TransitionNode.tsx | PetriNetのトランジションノード |
| MaterialTemplateNode.tsx | Materialテンプレートノード | frontend/src/components/nodes/MaterialTemplateNode.tsx | Materialテンプレートノード |
| ConditionTemplateNode.tsx | Conditionテンプレートノード | frontend/src/components/nodes/ConditionTemplateNode.tsx | Conditionテンプレートノード |
| ResultTemplateNode.tsx | Resultテンプレートノード | frontend/src/components/nodes/ResultTemplateNode.tsx | Resultテンプレートノード |

---

### 3. プロバイダ用画面（Provider）

**メニュー:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ProviderMenu.tsx | プロバイダメニュー | frontend/src/components/menus/ProviderMenu.tsx | プロバイダ用メニュー |

**機能画面:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| OrganizationManagementMock.tsx | 組織管理 | frontend/mock/components/OrganizationManagementMock.tsx | 組織管理画面（モック） |
| InformationDownloadMock.tsx | 情報ダウンロード | frontend/mock/components/InformationDownloadMock.tsx | 情報ダウンロード画面（モック） |

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

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| ProjectManagement.tsx | プロジェクト管理 | frontend/src/components/project/ProjectManagement.tsx | プロジェクト管理メイン画面 |
| CreateProjectModal.tsx | プロジェクト作成モーダル | frontend/src/components/project/CreateProjectModal.tsx | プロジェクト作成モーダル |
| ProjectDetailModal.tsx | プロジェクト詳細モーダル | frontend/src/components/project/ProjectDetailModal.tsx | プロジェクト詳細モーダル |
| ProjectSearchModal.tsx | プロジェクト検索モーダル | frontend/src/components/project/ProjectSearchModal.tsx | プロジェクト検索モーダル |
| ProjectFolderTree.tsx | プロジェクトフォルダツリー | frontend/src/components/project/ProjectFolderTree.tsx | プロジェクトフォルダツリー表示 |
| FileListTable.tsx | ファイル一覧テーブル | frontend/src/components/project/FileListTable.tsx | ファイル一覧テーブル |
| BulkUploadDialog.tsx | 一括アップロードダイアログ | frontend/src/components/project/BulkUploadDialog.tsx | ファイル一括アップロードダイアログ |

**フォーマット管理:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| FormatManagement.tsx | フォーマット管理 | frontend/src/components/project/FormatManagement.tsx | フォーマットファイル管理画面 |
| FormatFolderTree.tsx | フォーマットフォルダツリー | frontend/src/components/project/FormatFolderTree.tsx | フォーマットフォルダツリー表示 |
| FormatFileListTable.tsx | フォーマットファイル一覧テーブル | frontend/src/components/project/FormatFileListTable.tsx | フォーマットファイル一覧テーブル |
| CreateFormatFileModal.tsx | フォーマットファイル作成モーダル | frontend/src/components/project/CreateFormatFileModal.tsx | フォーマットファイル作成モーダル |
| CreateFormatFolderModal.tsx | フォーマットフォルダ作成モーダル | frontend/src/components/project/CreateFormatFolderModal.tsx | フォーマットフォルダ作成モーダル |
| FormatFileDetailModal.tsx | フォーマットファイル詳細モーダル | frontend/src/components/project/FormatFileDetailModal.tsx | フォーマットファイル詳細モーダル |
| FormatSearchModal.tsx | フォーマット検索モーダル | frontend/src/components/project/FormatSearchModal.tsx | フォーマット検索モーダル |
| FormatUploadDialog.tsx | フォーマットアップロードダイアログ | frontend/src/components/project/FormatUploadDialog.tsx | フォーマットアップロードダイアログ |

**PetriNetエディタ:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| PetriNetEditor.tsx | PetriNetエディタ | frontend/src/components/editor/PetriNetEditor.tsx | PetriNet形式の実験ワークフロー編集エディタ |
| PetriNetEditorScreen.tsx | PetriNetエディタ画面 | frontend/src/components/viewer/PetriNetEditorScreen.tsx | PetriNetエディタ画面コンテナ |
| PetriNetViewer.tsx | PetriNetビューア | frontend/src/components/viewer/PetriNetViewer.tsx | PetriNet閲覧専用ビューア |
| EditorToolbar.tsx | エディタツールバー | frontend/src/components/editor/EditorToolbar.tsx | エディタ操作用ツールバー |
| PropertyPanel.tsx | プロパティパネル | frontend/src/components/editor/PropertyPanel.tsx | ノード・エッジのプロパティ表示・編集パネル |
| ValidationPanel.tsx | バリデーションパネル | frontend/src/components/editor/ValidationPanel.tsx | バリデーション結果表示パネル |
| MethodTabPanel.tsx | メソッドタブパネル | frontend/src/components/editor/MethodTabPanel.tsx | 複数メソッドのタブ切り替えパネル |

**ドキュメント編集:**

| 物理名 | 論理名 | ファイルパス | 用途・説明 |
|--------|--------|--------------|-----------|
| DocumentEditDialog.tsx | ドキュメント編集ダイアログ | frontend/src/components/editor/DocumentEditDialog.tsx | MAIMLドキュメント編集ダイアログ |
| TemplateEditorDialog.tsx | テンプレート編集ダイアログ | frontend/src/components/editor/TemplateEditorDialog.tsx | テンプレート編集ダイアログ（Material/Condition/Result） |
| TemplateListView.tsx | テンプレート一覧ビュー | frontend/src/components/editor/TemplateListView.tsx | テンプレート一覧表示（カテゴリ別・エラーバッジ付き） |
| TemplateListItem.tsx | テンプレート一覧アイテム | frontend/src/components/editor/TemplateListItem.tsx | テンプレート詳細表示アイテム |
| MultiObjectEditor.tsx | 複数オブジェクトエディタ | frontend/src/components/editor/MultiObjectEditor.tsx | 複数オブジェクト一括編集エディタ |
| DraftManager.tsx | ドラフト管理 | frontend/src/components/editor/DraftManager.tsx | 編集内容の一時保存・復元機能 |
| DraftRestoreDialog.tsx | ドラフト復元ダイアログ | frontend/src/components/viewer/DraftRestoreDialog.tsx | ドラフト復元ダイアログ |
| SaveConfirmDialog.tsx | 保存確認ダイアログ | frontend/src/components/editor/SaveConfirmDialog.tsx | 保存確認ダイアログ |
| WorkflowSelectorDialog.tsx | ワークフロー選択ダイアログ | frontend/src/components/editor/WorkflowSelectorDialog.tsx | ワークフロー選択ダイアログ |

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

### 7. 実験作業者用画面（Experiment Worker）

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

### 認証API
- POST /api/auth/login - ログイン
- POST /api/auth/logout - ログアウト
- GET /api/auth/verify-session - セッション検証

### プロジェクト管理API
- GET /api/projects - プロジェクト一覧取得
- POST /api/projects - プロジェクト作成
- GET /api/projects/:id - プロジェクト詳細取得
- PUT /api/projects/:id - プロジェクト更新
- DELETE /api/projects/:id - プロジェクト削除

### フォーマット管理API
- GET /api/formats - フォーマット一覧取得
- POST /api/formats - フォーマット作成
- GET /api/formats/:id - フォーマット詳細取得

### 実験記録API
- GET /api/experiments - 実験一覧取得
- POST /api/experiments - 実験記録作成
- PUT /api/experiments/:id - 実験記録更新

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
