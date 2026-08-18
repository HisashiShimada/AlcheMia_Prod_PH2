# API一覧対応表

## メタデータ
- **作成日**: 2026-01-20
- **バージョン**: 3.0.0
- **最終更新**: 2026-08-14
- **最終更新コミット**: `651973aae` (feature/phase2_mock)
- **担当**: Development Team

---

## 概要

このドキュメントは、mmdpfプロジェクトの全APIエンドポイントを一覧化し、実装ファイルとAPI設計書を対応付けます。

### 使用方法

1. **API名で検索**: 実装したいAPIをこの一覧から探す
2. **ルートファイルを特定**: 実装ファイルパスで該当ファイルを開く
3. **API設計書を参照**: 詳細仕様を確認
4. **実装状態を確認**: 実装済み/未実装を確認

---

## 📋 API一覧

### 1. 認証API（Authentication）

**API設計書**: [api_auth.md](./api_auth.md)  
**ルートファイル**: `backend/src/routes/authRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 1.1 | POST | /api/v1/auth/login | 初回ログイン（PINコード送信） | ✅ 実装済み | AuthController.login |
| 1.2 | POST | /api/v1/auth/verify-pin | PINコード検証・本セッション生成 | ✅ 実装済み | AuthController.verifyPin |
| 1.3 | POST | /api/v1/auth/resend-pin | PINコード再送信 | ✅ 実装済み | AuthController.resendPin |
| 1.4 | POST | /api/v1/auth/reset-password-request | パスワードリセット要求 | ✅ 実装済み | AuthController.resetPasswordRequest |
| 1.5 | POST | /api/v1/auth/reset-password | パスワードリセット実行 | ✅ 実装済み | AuthController.resetPassword |
| 1.6 | POST | /api/v1/auth/logout | ログアウト | ✅ 実装済み | AuthController.logout |
| 1.7 | POST | /api/v1/auth/refresh | リフレッシュトークンによるアクセストークン更新 | ✅ 実装済み | AuthController.refreshToken |
| 1.8 | POST | /api/v1/auth/heartbeat | セッションハートビート（有効期限延長） | ✅ 実装済み | AuthController.heartbeat |
| 1.9 | POST | /api/v1/auth/change-password | パスワード変更 | ✅ 実装済み | AuthController.changePassword |

**ミドルウェアチェーン:**
- 1.1, 1.4: 認証不要
- 1.2, 1.3: 仮セッショントークン必須
- 1.5: リセットトークン必須
- 1.6: JWT認証 + テナント分離
- 1.7〜1.9: JWT認証必須

**備考:**
- JWT + Session Hybrid認証を使用
- PINコードは6桁数字、有効期限5分
- セッション有効期限はロール別（12〜48時間）

---

### 2. プロジェクト管理API（Project Management）

**API設計書**: [api_project_management.md](./api_project_management.md)  
**ルートファイル**: `backend/src/routes/projectRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 2.1 | GET | /api/v1/projects | プロジェクト一覧取得 | ✅ 実装済み | ProjectController.list |
| 2.2 | POST | /api/v1/projects | プロジェクト作成 | ✅ 実装済み | ProjectController.create |
| 2.3 | GET | /api/v1/projects/:projectId | プロジェクト詳細取得 | ✅ 実装済み | ProjectController.getById |
| 2.4 | POST | /api/v1/projects/:projectName/checkout | チェックアウト | ✅ 実装済み | ProjectController.checkout |
| 2.5 | POST | /api/v1/projects/:projectName/checkin | チェックイン | ✅ 実装済み | ProjectController.checkin |
| 2.6 | GET | /api/v1/projects/:projectId/checkout-status | チェックアウト状態取得 | ✅ 実装済み | ProjectController.getCheckoutStatus |
| 2.7 | GET | /api/v1/projects/:projectName/files | ファイル一覧取得 | ✅ 実装済み | ProjectController.getProjectFiles |
| 2.8 | GET | /api/v1/projects/:projectName/tasks | タスク一覧取得 | ✅ 実装済み | ProjectController.getProjectTasks |
| 2.9 | POST | /api/v1/projects/:projectName/instructions | 指示送信（タスク作成） | ⏳ 未実装 | ProjectController.createInstruction |
| 2.10 | GET | /api/v1/projects/:projectName/instructions | 指示一覧取得 | ⏳ 未実装 | ProjectController.listInstructions |
| 2.11 | POST | /api/v1/projects/search | プロジェクト詳細検索 | ⏳ 未実装 | ProjectController.search |
| 2.12 | POST | /api/v1/projects/:projectName/publish | MaiML公開ジョブ投入 | ✅ 実装済み | ProjectController.publish |
| 2.12b | POST | /api/v1/projects/:projectName/unpublish | MaiML非公開ジョブ投入 | ✅ 実装済み | ProjectController.unpublish |
| 2.12c | GET | /api/v1/projects/:projectName/publish-status | 公開ジョブステータス取得 | ✅ 実装済み | ProjectController.getPublishStatus |
| 2.13 | GET | /api/v1/projects/:projectName/worker-instructions | 指示一覧取得（実験作業者用） | ✅ 実装済み | ProjectController.getWorkerInstructions |
| 2.14 | PUT | /api/v1/projects/:projectName/instructions/:instructionId/confirm | 指示確認完了 | ✅ 実装済み | ProjectController.confirmInstruction |
| 2.15 | PATCH | /api/v1/projects/:projectName/approval-request | 承認依頼 | ✅ 実装済み | ProjectController.requestApproval |
| 2.16 | GET | /api/v1/projects/worker-accessible | 実験作業者用プロジェクト一覧取得 | ✅ 実装済み | WorkerProjectController.listWorkerAccessible |
| 2.17 | GET | /api/v1/projects/:projectName/maiml | MAIMLファイル取得（プロジェクト） | ✅ 実装済み | ProjectController.getProjectMaiml |
| 2.18 | DELETE | /api/v1/projects/:projectName | プロジェクト削除 | ✅ 実装済み | ProjectController.deleteProject |
| 2.19 | POST | /api/v1/projects/:projectName/tasks/complete-review | レビュー待ちタスク一括完了 | ✅ 実装済み | ProjectController.completeReviewTasks |
| 2.20 | GET | /api/v1/projects/:projectName/instructions/status | タスク登録状況取得 | ✅ 実装済み | ProjectInstructionController.getTaskRegistrationStatus |
| 2.21 | PUT | /api/v1/projects/:projectName/instructions/:instructionId | 指示更新（未送信のみ） | ✅ 実装済み | ProjectInstructionController.updateInstruction |
| 2.22 | DELETE | /api/v1/projects/:projectName/instructions/:instructionId | 指示削除（未送信のみ） | ✅ 実装済み | ProjectInstructionController.deleteInstruction |
| 2.23 | POST | /api/v1/projects/:projectName/instructions/send | 未送信指示一括送信 | ✅ 実装済み | ProjectInstructionController.sendInstructions |
| 2.24 | PATCH | /api/v1/projects/:projectName/rename | プロジェクト名変更 | 🔴 未実装（renameService.renameProject未実装） | ProjectController.renameProjectHandler |

**ミドルウェアチェーン:**
- すべて: `auth` → `tenantIsolation` → `permissionCheck`
- 権限: Manager以上（Worker は閲覧のみ可能）

**備考:**
- すべてのクエリに organization_id フィルタ必須
- S3操作には organization_prefix を強制適用
- チェックアウト/チェックインで排他編集制御
- パスパラメータ: 一部APIで`:projectId`（UUID）、一部で`:projectName`（文字列）を使用

---

### 3. フォーマット管理API（Format Management）

**API設計書**: [api_format_management.md](./api_format_management.md)  
**ルートファイル**: `backend/src/routes/formatRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 3.1 | GET | /api/v1/formats | フォーマット一覧取得 | ✅ 実装済み | FormatController.getFormats |
| 3.2 | GET | /api/v1/formats/:folderName/files | フォーマットファイル一覧取得 | ✅ 実装済み | FormatController.getFormatFiles |
| 3.3 | POST | /api/v1/formats/:folderName/files | 新規ファイル作成 | ✅ 実装済み | FormatController.createFormatFile |
| 3.4 | POST | /api/v1/formats/folders | 新規フォーマットフォルダ作成（部門直下） | ✅ 実装済み | FormatController.createFormatFolder |
| 3.5 | POST | /api/v1/formats/subfolders | フォーマット内サブフォルダ作成 | ✅ 実装済み | FormatController.createFormatSubfolder |
| 3.6 | PUT | /api/v1/formats/:formatId/files/:fileId | ファイル編集（保存） | ⏳ 未実装 | FormatController.updateFile |

**ミドルウェアチェーン:**
- 3.1-3.2: `authMiddleware` → `checkPermission('040000', 0)`
- 3.3-3.5: `authMiddleware` → `checkPermission('040000', 1)`

---

### 4. MAIML編集API（MAIML Editor）

**API設計書**: [api_maiml_editor.md](./api_maiml_editor.md)  
**ルートファイル**: `backend/src/routes/maimlRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 4.1 | POST | /api/v1/maiml/parse | MAIML解析（基本） | ✅ 実装済み | maimlController.parse |
| 4.2 | POST | /api/v1/maiml/parse-petri-net-structure | ペトリネット構造解析 | ✅ 実装済み | maimlController.parsePetriNetStructure |
| 4.3 | POST | /api/v1/maiml/save | MAIMLファイル保存 | ✅ 実装済み | maimlController.save |
| 4.4 | POST | /api/v1/maiml/load | MAIMLファイル読込 | ✅ 実装済み | maimlController.load |
| 4.5 | GET | /api/v1/maiml/list | MAIMLファイル一覧取得 | ✅ 実装済み | maimlController.list |
| 4.6 | POST | /api/v1/maiml/validate | MAIMLバリデーション | ✅ 実装済み | maimlController.validate |
| 4.7 | POST | /api/v1/maiml/auto-correct | MAIML自動補正（リアルタイム） | ✅ 実装済み | maimlController.autoCorrect |
| 4.8 | POST | /api/v1/maiml/correct | MAIML自動補正（基本） | ✅ 実装済み | maimlController.correct |
| 4.9 | POST | /api/v1/maiml/session/start | 編集セッション開始 | ✅ 実装済み | maimlController.startSession |
| 4.10 | POST | /api/v1/maiml/session/end | 編集セッション終了 | ✅ 実装済み | maimlController.endSession |
| 4.11 | GET | /api/v1/maiml/files | ファイル一覧取得 | ✅ 実装済み | maimlController.getFiles |
| 4.12 | GET | /api/v1/maiml/file-content | ファイル内容取得 | ✅ 実装済み | maimlController.getFileContent |
| 4.13 | GET | /api/v1/maiml/health | ヘルスチェック | ✅ 実装済み | maimlController.health |
| 4.14 | POST | /api/v1/maiml/draft | Draft保存 | ✅ 実装済み | maimlController.saveDraft |
| 4.15 | GET | /api/v1/maiml/draft/:draftKey | Draft読み込み | ✅ 実装済み | maimlController.loadDraft |
| 4.16 | GET | /api/v1/maiml/drafts | Draft一覧取得 | ✅ 実装済み | maimlController.listDrafts |
| 4.17 | DELETE | /api/v1/maiml/draft/:draftKey | Draft削除 | ✅ 実装済み | maimlController.deleteDraft |
| 4.18 | GET | /api/v1/maiml/formats | 名前空間テンプレートフォルダ＆ファイル一覧取得 | ✅ 実装済み | maimlController.listFormats |

---

### 5. 進捗確認API（Progress Monitoring）

**API設計書**: [api_progress_monitoring.md](./api_progress_monitoring.md)  
**ルートファイル**: `backend/src/routes/progressRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 5.1 | GET | /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/details | タスク詳細取得 | ✅ 実装済み | ProgressController.getTaskDetail |
| 5.2 | GET | /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions | 進捗データ取得 | ✅ 実装済み | ProgressController.getProgressData |
| 5.3 | GET | /api/v1/progress/projects/:projectName/worker-tasks | タスク一覧取得（実験作業者用） | ✅ 実装済み | ProgressController.getWorkerTasks |
| 5.4 | PATCH | /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status | タスクステータス更新 | ✅ 実装済み | ProgressController.updateTaskStatus |
| 5.5 | PATCH | /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status | トランジションステータス更新 | ✅ 実装済み | ProgressController.updateTransitionStatus |
| 5.6 | GET | /api/v1/progress/projects/:projectName/work-details | 作業詳細一括取得 | ✅ 実装済み | ProgressController.getWorkDetails |
| 5.7 | GET | /api/v1/progress/projects/:projectName/methods/:methodId/tasks | タスク一覧取得（追加） | ✅ 実装済み | ProgressController.getTasks |

---

### 6. 問題管理API（Issue Management）

**API設計書**: [api_issue_management.md](./api_issue_management.md)  
**ルートファイル**: `backend/src/routes/issueRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 6.1 | POST | /api/v1/issues | 問題報告 | ✅ 実装済み | IssueController.create |
| 6.2 | POST | /api/v1/issues/comments | コメント投稿 | ✅ 実装済み | IssueController.addComment |
| 6.3 | GET | /api/v1/issues | 問題一覧取得 | ✅ 実装済み | IssueController.list |
| 6.4 | GET | /api/v1/issues/:issueId | 問題詳細取得 | ✅ 実装済み | IssueController.getById |
| 6.5 | PATCH | /api/v1/issues/status | 問題ステータス変更 | ✅ 実装済み | IssueController.updateStatus |

---

### 7. 実験データ記録API（Experiment Data Recording）

**API設計書**: [api_experiment_data.md](./api_experiment_data.md)  
**ルートファイル**: `backend/src/routes/experimentRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 7.1 | GET | /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data | テンプレート実績一覧取得 | ✅ 実装済み | experimentController.getTemplateData |
| 7.2 | POST | /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data | 実験データ一括保存 | ✅ 実装済み | experimentController.saveBatchData |

---

### 8. 実験評価API（Experiment Evaluation）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/experimentEvaluationRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 8.1 | GET | /api/v1/experiment-evaluations/... | 実験評価取得 | ✅ 実装済み | experimentEvaluationController |
| 8.2 | POST | /api/v1/experiment-evaluations/... | 実験評価作成 | ✅ 実装済み | experimentEvaluationController |
| 8.3 | POST | /api/v1/experiment-evaluations/... | 実験評価更新 | ✅ 実装済み | experimentEvaluationController |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。設計書は未作成。

---

### 9. 実験指示API（Experiment Instruction）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/experimentInstructionRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 9.1 | GET | /api/v1/experiment-instructions/... | 実験指示一覧取得① | ✅ 実装済み | experimentInstructionController |
| 9.2 | GET | /api/v1/experiment-instructions/... | 実験指示一覧取得② | ✅ 実装済み | experimentInstructionController |
| 9.3 | PUT | /api/v1/experiment-instructions/... | 実験指示更新① | ✅ 実装済み | experimentInstructionController |
| 9.4 | PUT | /api/v1/experiment-instructions/... | 実験指示更新② | ✅ 実装済み | experimentInstructionController |
| 9.5 | GET | /api/v1/experiment-instructions/... | 実験指示詳細取得 | ✅ 実装済み | experimentInstructionController |
| 9.6 | GET | /api/v1/experiment-instructions/... | 実験指示取得③ | ✅ 実装済み | experimentInstructionController |
| 9.7 | PUT | /api/v1/experiment-instructions/... | 実験指示更新③ | ✅ 実装済み | experimentInstructionController |
| 9.8 | DELETE | /api/v1/experiment-instructions/... | 実験指示削除 | ✅ 実装済み | experimentInstructionController |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。設計書は未作成。

---

### 10. 部署管理API（Department Management）

**API設計書**: [api_department_management.md](./api_department_management.md)  
**ルートファイル**: `backend/src/routes/departmentUnitRoutes.ts`

> ⚠️ **注意**: 旧 `departmentRoutes.ts` から `departmentUnitRoutes.ts` に移行済み（2026-07月）。設計書（api_department_management.md）は旧仕様のまま要更新。

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 10.1 | GET | /api/v1/department-units | 部門ユニット一覧取得 | ✅ 実装済み | departmentUnitController.getList |
| 10.2 | GET | /api/v1/department-units/... | 部門ユニット詳細取得① | ✅ 実装済み | departmentUnitController |
| 10.3 | POST | /api/v1/department-units | 部門ユニット作成 | ✅ 実装済み | departmentUnitController.create |
| 10.4 | GET | /api/v1/department-units/... | 部門ユニット詳細取得② | ✅ 実装済み | departmentUnitController |
| 10.5 | PUT | /api/v1/department-units/... | 部門ユニット更新 | ✅ 実装済み | departmentUnitController.update |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。

---

### 11. ロール管理API（Role Management）

**API設計書**: [api_role_management.md](./api_role_management.md)  
**ルートファイル**: `backend/src/routes/roleRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 11.1 | GET | /api/v1/master/role | ロール一覧取得 | ✅ 実装済み | roleController.getRoles |
| 11.2 | GET | /api/v1/master/role/download-csv | ロールCSVダウンロード | ✅ 実装済み | roleController.downloadRoleCsv |
| 11.3 | GET | /api/v1/master/role/:roleId | ロール詳細取得 | ✅ 実装済み | roleController.getRoleById |
| 11.4 | POST | /api/v1/master/role | ロール新規追加 | ✅ 実装済み | roleController.createRole |
| 11.5 | POST | /api/v1/master/role/upload-csv | ロールCSVアップロード | ✅ 実装済み | roleController.uploadRoleCsv |
| 11.6 | PUT | /api/v1/master/role/:roleId | ロール更新 | ✅ 実装済み | roleController.updateRole |
| 11.7 | PUT | /api/v1/master/role/:roleId/permissions | ロール権限更新 | ✅ 実装済み | roleController.updateRolePermissions |
| 11.8 | PATCH | /api/v1/master/role/:roleId/status | ロールアクティブ状態更新 | ✅ 実装済み | roleController.updateRoleStatus |

---

### 12. マスタ管理API（Master Data Management）

**API設計書**: [api_master_management.md](./api_master_management.md)  
**ルートファイル**: `backend/src/routes/masterRoutes.ts`

#### 12.1 Creatorマスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 12.1.1 | GET | /api/v1/master/creator | Creator一覧取得 | ✅ 実装済み | masterController.getCreators |
| 12.1.2 | GET | /api/v1/master/creator/download-csv | CreatorCSVダウンロード | ✅ 実装済み | masterController.downloadCreatorsCsv |
| 12.1.3 | POST | /api/v1/master/creator/upload-csv | CreatorCSVアップロード | ✅ 実装済み | masterController.uploadCreatorsCsv |
| 12.1.4 | GET | /api/v1/master/creator/:creatorId | Creator詳細取得 | ✅ 実装済み | masterController.getCreatorById |
| 12.1.5 | POST | /api/v1/master/creator | Creator新規作成 | ✅ 実装済み | masterController.createCreator |
| 12.1.6 | PUT | /api/v1/master/creator/:creatorId | Creator更新 | ✅ 実装済み | masterController.updateCreator |
| 12.1.7 | PATCH | /api/v1/master/creator/:creatorId/status | Creatorアクティブ状態更新 | ✅ 実装済み | masterController.updateCreatorStatus |

#### 12.2 Vendorマスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 12.2.1 | GET | /api/v1/master/vendor | Vendor一覧取得 | ✅ 実装済み | masterController.getVendors |
| 12.2.2 | GET | /api/v1/master/vendor/download-csv | VendorCSVダウンロード | ✅ 実装済み | masterController.downloadVendorsCsv |
| 12.2.3 | POST | /api/v1/master/vendor/upload-csv | VendorCSVアップロード | ✅ 実装済み | masterController.uploadVendorsCsv |
| 12.2.4 | GET | /api/v1/master/vendor/:vendorId | Vendor詳細取得 | ✅ 実装済み | masterController.getVendorById |
| 12.2.5 | POST | /api/v1/master/vendor | Vendor新規作成 | ✅ 実装済み | masterController.createVendor |
| 12.2.6 | PUT | /api/v1/master/vendor/:vendorId | Vendor更新 | ✅ 実装済み | masterController.updateVendor |
| 12.2.7 | PATCH | /api/v1/master/vendor/:vendorId/status | Vendorアクティブ状態更新 | ✅ 実装済み | masterController.updateVendorStatus |

#### 12.3 Instrumentマスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 12.3.1 | GET | /api/v1/master/instrument | Instrument一覧取得 | ✅ 実装済み | masterController.getInstruments |
| 12.3.2 | GET | /api/v1/master/instrument/download-csv | InstrumentCSVダウンロード | ✅ 実装済み | masterController.downloadInstrumentsCsv |
| 12.3.3 | POST | /api/v1/master/instrument/upload-csv | InstrumentCSVアップロード | ✅ 実装済み | masterController.uploadInstrumentsCsv |
| 12.3.4 | GET | /api/v1/master/instrument/:instrumentId | Instrument詳細取得 | ✅ 実装済み | masterController.getInstrumentById |
| 12.3.5 | POST | /api/v1/master/instrument | Instrument新規作成 | ✅ 実装済み | masterController.createInstrument |
| 12.3.6 | PUT | /api/v1/master/instrument/:instrumentId | Instrument更新 | ✅ 実装済み | masterController.updateInstrument |
| 12.3.7 | PATCH | /api/v1/master/instrument/:instrumentId/status | Instrumentアクティブ状態更新 | ✅ 実装済み | masterController.updateInstrumentStatus |

#### 12.4 コードマスタ（codeMaster）

**ルートファイル**: `backend/src/routes/codeMasterRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 12.4.1 | GET | /api/v1/code-master/... | コードマスタ一覧取得 | ✅ 実装済み | codeMasterController |
| 12.4.2 | POST | /api/v1/code-master/... | コードマスタ登録 | ✅ 実装済み | codeMasterController |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。

---

### 13. 会社管理API（Corporation Management）

**API設計書**: [api_corporation_management.md](./api_corporation_management.md)  
**ルートファイル**: `backend/src/routes/corporationRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 13.1 | GET | /api/v1/provider/corporation | 会社一覧取得 | ✅ 実装済み | corporationController.getCorporation |
| 13.2 | GET | /api/v1/provider/corporation/download-csv | 会社CSVダウンロード | ✅ 実装済み | corporationController.downloadCorporationCsv |
| 13.3 | POST | /api/v1/provider/corporation/upload-csv | 会社CSVアップロード | ✅ 実装済み | corporationController.uploadCorporationCsv |
| 13.4 | GET | /api/v1/provider/corporation/:corporationId | 会社詳細取得 | ✅ 実装済み | corporationController.getCorporationById |
| 13.5 | POST | /api/v1/provider/corporation | 会社新規作成 | ✅ 実装済み | corporationController.createCorporation |
| 13.6 | PUT | /api/v1/provider/corporation/:corporationId | 会社更新 | ✅ 実装済み | corporationController.updateCorporation |
| 13.7 | PATCH | /api/v1/provider/corporation/:corporationId/status | 会社アクティブ状態更新 | ✅ 実装済み | corporationController.updateCorporationStatus |

---

### 14. ファイルアクセスAPI（File Access）

**API設計書**: [api_file_access.md](./api_file_access.md)  
**ルートファイル**: `backend/src/routes/fileAccessRoutes.ts`


| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 14.1 | POST | /api/v1/files/upload | ファイルアップロード | ✅ 実装済み | fileAccessController.uploadFiles |
| 14.2 | POST | /api/v1/files/download-folder-as-zip | フォルダZIPダウンロード | ✅ 実装済み | fileAccessController.downloadFolderAsZip |
| 14.3 | POST | /api/v1/files/download-url | 署名付きURL取得 | ✅ 実装済み | fileAccessController.getFileDownloadUrl |
| 14.4 | GET | /api/v1/projects/:projectId/files/:fileName/download | 単一ファイルダウンロード（レガシー） | ✅ 実装済み | fileAccessController.downloadFile |
| 14.5 | GET | /api/v1/files/batches | バッチ履歴取得 | ✅ 実装済み | fileAccessController.getBatchHistory |
| 14.6 | GET | /api/v1/files/batches/:batchId/progress | バッチ進捗取得 | ✅ 実装済み | fileAccessController.getBatchProgress |
| 14.7 | POST | /api/v1/files/batches/:batchId/cancel | バッチキャンセル | ✅ 実装済み | fileAccessController.cancelBatch |
| 14.8 | PATCH | /api/v1/files/rename | ファイルリネーム | ✅ 実装済み | fileAccessController.renameFileHandler |
| 14.9〜14.17+ | （各種） | /api/v1/files/... | その他ファイル操作 | ✅ 実装済み | fileAccessController |

> ⚠️ **確認事項**: 14.9以降の詳細なエンドポイント（チャンクアップロード等）はソースの精査が必要。

---

### 15. 組織管理API（Organization Management）

**API設計書**: [api_organization_management.md](./api_organization_management.md)  
**ルートファイル**: `backend/src/routes/organizationRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 15.1 | GET | /api/v1/provider/organization | 組織一覧取得 | ✅ 実装済み | organizationController.getOrganizations |
| 15.2 | GET | /api/v1/provider/organization/download-csv | 組織CSVダウンロード | ✅ 実装済み | organizationController.downloadOrganizationCsv |
| 15.3 | POST | /api/v1/provider/organization/upload-csv | 組織CSVアップロード | ✅ 実装済み | organizationController.uploadOrganizationCsv |
| 15.4 | GET | /api/v1/provider/organization/:organizationId | 組織詳細取得 | ✅ 実装済み | organizationController.getOrganizationById |
| 15.5 | GET | /api/v1/provider/organization/:organizationId/system-admins | システム管理者一覧取得 | ✅ 実装済み | organizationController.getSystemAdminsByOrganizationId |
| 15.6 | POST | /api/v1/provider/organization | 組織新規作成 | ✅ 実装済み | organizationController.createOrganization |
| 15.7 | PUT | /api/v1/provider/organization/:organizationId | 組織更新 | ✅ 実装済み | organizationController.updateOrganization |
| 15.8 | PATCH | /api/v1/provider/organization/:organizationId/status | 組織アクティブ状態更新 | ✅ 実装済み | organizationController.updateOrganizationStatus |
| 15.9 | GET | /api/v1/provider/organization/:organizationId/certificate | クライアント証明書ダウンロード | ✅ 実装済み | organizationController.downloadCertificate |
| 15.10 | GET | /api/v1/provider/organization/download-information-csv | 情報CSVダウンロード | ✅ 実装済み | organizationController.downloadInformationCsv |

---

### 16. 組織グループ管理API（Organization Group Management）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/organizationGroupRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 16.1 | GET | /api/v1/organization-groups | 組織グループ一覧取得 | ✅ 実装済み | organizationGroupController.getOrganizationGroups |
| 16.2 | POST | /api/v1/organization-groups | 組織グループ新規作成 | ✅ 実装済み | organizationGroupController.createOrganizationGroup |
| 16.3 | GET | /api/v1/organization-groups/users | 組織内ユーザー一覧取得（メンバー選択用） | ✅ 実装済み | organizationGroupController.getOrgUsers |
| 16.4 | GET | /api/v1/organization-groups/:groupCd/members | グループメンバー一覧取得 | ✅ 実装済み | organizationGroupController.getOrganizationGroupMembers |
| 16.5 | PUT | /api/v1/organization-groups/:groupCd/members | グループメンバー一括更新 | ✅ 実装済み | organizationGroupController.setOrganizationGroupMembers |
| 16.6 | PUT | /api/v1/organization-groups/:groupCd/chief | グループ代表者変更 | ✅ 実装済み | organizationGroupController.updateOrganizationGroupChief |
| 16.7 | GET | /api/v1/organization-groups/:groupCd | 組織グループ単件取得 | ✅ 実装済み | organizationGroupController.getOrganizationGroupById |
| 16.8 | PUT | /api/v1/organization-groups/:groupCd | 組織グループ更新 | ✅ 実装済み | organizationGroupController.updateOrganizationGroup |
| 16.9 | PATCH | /api/v1/organization-groups/:groupCd/status | 組織グループアクティブ状態更新 | ✅ 実装済み | organizationGroupController.updateOrganizationGroupStatus |

**ミドルウェアチェーン:**
- すべて: `authMiddleware` → `tenantIsolation`

---

### 17. システム概要API（System Overview）

**API設計書**: [api_system_overview.md](./api_system_overview.md)  
**ルートファイル**: `backend/src/routes/systemOverviewRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 17.1 | GET | /api/v1/systemManagement/system-overview | システム概要統計取得 | ✅ 実装済み | systemOverviewController.getOverview |

---

### 18. セマンティック検索API（Semantic Search）

**API設計書**: [api_semantic_search.md](./api_semantic_search.md)  
**ルートファイル**: `backend/src/routes/semanticSearchRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 18.1 | POST | /api/v1/semantic-search/search | セマンティック検索 | ✅ 実装済み | semanticSearchController.search |
| 18.2 | POST | /api/v1/semantic-search/decompose | クエリ分解（AI4軸分解） | ✅ 実装済み | semanticSearchController.decompose |
| 18.3 | DELETE | /api/v1/semantic-search/... | インデックス削除 | ✅ 実装済み | semanticSearchController |
| 18.4 | POST | /api/v1/semantic-search/index | ファイルインデックス登録 | ✅ 実装済み | semanticSearchController.indexFile |
| 18.5 | GET | /api/v1/semantic-search/stats | インデックス統計取得 | ✅ 実装済み | semanticSearchController.getStats |
| 18.6 | POST | /api/v1/semantic-search/batch | バッチ処理開始 | ✅ 実装済み | semanticSearchController.startBatch |
| 18.7 | GET | /api/v1/semantic-search/batch | バッチジョブ一覧取得 | ✅ 実装済み | semanticSearchController.listBatchJobs |
| 18.8 | GET | /api/v1/semantic-search/batch/stats | バッチ統計取得 | ✅ 実装済み | semanticSearchController.getBatchStats |
| 18.9 | DELETE | /api/v1/semantic-search/batch/:jobId | バッチジョブキャンセル | ✅ 実装済み | semanticSearchController.cancelBatchJob |
| 18.10 | GET | /api/v1/semantic-search/health | ヘルスチェック | ✅ 実装済み | semanticSearchController.health |

---

### 19. ユーザー管理API（User Management）

**API設計書**: [api_user_management.md](./api_user_management.md)  
**ルートファイル**: `backend/src/routes/userRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 19.1 | GET | /api/v1/systemManagement/user | ユーザー一覧取得 | ✅ 実装済み | userController.getUsers |
| 19.2 | GET | /api/v1/systemManagement/user/:userId | ユーザー詳細取得 | ✅ 実装済み | userController.getUserById |
| 19.3 | POST | /api/v1/systemManagement/user | ユーザー新規作成 | ✅ 実装済み | userController.createUser |
| 19.4 | PUT | /api/v1/systemManagement/user/:userId | ユーザー更新 | ✅ 実装済み | userController.updateUser |
| 19.5 | PATCH | /api/v1/systemManagement/user/:userId/status | アクティブ状態更新 | ✅ 実装済み | userController.updateUserStatus |
| 19.6 | GET | /api/v1/systemManagement/user/download-csv | CSVダウンロード | ✅ 実装済み | userController.downloadUsersCsv |
| 19.7 | POST | /api/v1/systemManagement/user/upload-csv | CSVアップロード | ✅ 実装済み | userController.uploadUsersCsv |

---

### 20. 名前空間管理API（Namespace Management）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/namespaceRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 20.1 | GET | /api/v1/namespaces | 名前空間（Prefix）一覧取得 | ✅ 実装済み | namespaceController.getNamespaces |
| 20.2 | POST | /api/v1/namespaces | 名前空間（Prefix）新規登録 | ✅ 実装済み | namespaceController.createNamespace |
| 20.3 | DELETE | /api/v1/namespaces/:prefix | 名前空間（Prefix）削除 | ✅ 実装済み | namespaceController.deleteNamespace |
| 20.4 | GET | /api/v1/namespaces/declarations | 名前空間宣言一覧取得（prefix + uri） | ✅ 実装済み | namespaceController.getDeclarations |
| 20.5 | GET | /api/v1/namespaces/terms | 用語一覧取得 | ✅ 実装済み | namespaceController.getTerms |
| 20.6 | POST | /api/v1/namespaces/terms | 用語新規登録 | ✅ 実装済み | namespaceController.createTerm |
| 20.7 | PUT | /api/v1/namespaces/terms/:prefix/:localName | 用語更新 | ✅ 実装済み | namespaceController.updateTerm |
| 20.8 | DELETE | /api/v1/namespaces/terms/:prefix/:localName | 用語削除 | ✅ 実装済み | namespaceController.deleteTerm |
| 20.9 | PATCH | /api/v1/namespaces/terms/:prefix/:localName/active | 用語アクティブ/非アクティブ切替 | ✅ 実装済み | namespaceController.toggleTermActive |
| 20.10 | GET | /api/v1/namespaces/project-declarations | プロジェクトスコープ絞り込み名前空間宣言一覧 | ✅ 実装済み | namespaceController.getDeclarationsByProject |

**ミドルウェアチェーン:**
- すべて: `authMiddleware` → `tenantIsolation`

---

### 21. 不確かさ基準管理API（Uncertainty Criteria）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/uncertaintyCriteriaRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 21.1 | GET | /api/v1/uncertainty-criteria | 不確かさ基準一覧取得 | ✅ 実装済み | uncertaintyCriteriaController.getList |
| 21.2 | GET | /api/v1/uncertainty-criteria/for-selector | セレクター用一覧取得（有効レコードのみ） | ✅ 実装済み | uncertaintyCriteriaController.getForSelector |
| 21.3 | POST | /api/v1/uncertainty-criteria | 不確かさ基準 新バージョン保存 | ✅ 実装済み | uncertaintyCriteriaController.createNewVersion |
| 21.4 | GET | /api/v1/uncertainty-criteria/:uncertaintyKey | 不確かさ基準詳細取得（バージョン指定） | ✅ 実装済み | uncertaintyCriteriaController.getDetail |

**ミドルウェアチェーン:**
- すべて: `authMiddleware` → `tenantIsolation`

**備考:**
- 評価方式: 1=定量評価、2=定性評価（直感評価）
- 定性評価の選択肢は `intuition_selector` テーブルに格納
- `for-selector` は `/:uncertaintyKey` より前に定義（パスが競合するため）

---

### 22. 暗号化・鍵管理API（Encryption & Key Management）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/encryptionRoutes.ts`

#### 22.1 MAIML暗号化操作

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 22.1.1 | GET | /api/v1/encryption/projects/:projectName/structure | MAIML構造取得 | ✅ 実装済み | encryptionController.getMaimlStructure |
| 22.1.2 | POST | /api/v1/encryption/projects/:projectName/preview | 暗号化プレビュー | ✅ 実装済み | encryptionController.previewEncryption |
| 22.1.3 | POST | /api/v1/encryption/projects/:projectName/encrypt | 要素暗号化実行 | ✅ 実装済み | encryptionController.encryptElement |
| 22.1.4 | POST | /api/v1/encryption/projects/:projectName/decrypt-preview | 復号プレビュー | ✅ 実装済み | encryptionController.decryptPreview |
| 22.1.5 | POST | /api/v1/encryption/projects/:projectName/decrypt-execute | 復号実行 | ✅ 実装済み | encryptionController.executeDecrypt |
| 22.1.6 | GET | /api/v1/encryption/check-insertion/:projectName/:nodePath | 挿入可能チェック | ✅ 実装済み | encryptionController.checkInsertion |
| 22.1.7 | GET | /api/v1/encryption/projects/:projectName/encrypted-children | 暗号化済み子要素一覧取得 | ✅ 実装済み | encryptionController.getEncryptedChildren |
| 22.1.8 | POST | /api/v1/encryption/upa-check | UPA制約チェック | ✅ 実装済み | encryptionController.checkUpaConstraints |

#### 22.2 鍵管理

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 22.2.1 | GET | /api/v1/encryption/keys | 鍵一覧取得 | ✅ 実装済み | encryptionController.listKeys |
| 22.2.2 | GET | /api/v1/encryption/keys/:keyId | 鍵詳細取得 | ✅ 実装済み | encryptionController.getKey |
| 22.2.3 | POST | /api/v1/encryption/keys | 鍵作成 | ✅ 実装済み | encryptionController.createKey |
| 22.2.4 | DELETE | /api/v1/encryption/keys/:keyId | 鍵削除 | ✅ 実装済み | encryptionController.deleteKey |
| 22.2.5 | POST | /api/v1/encryption/keys/:keyId/export | 鍵エクスポート | ✅ 実装済み | encryptionController.exportKey |
| 22.2.6 | POST | /api/v1/encryption/keys/import | 鍵インポート | ✅ 実装済み | encryptionController.importKey |
| 22.2.7 | POST | /api/v1/encryption/keys/:keyId/rotate | 鍵ローテーション | ✅ 実装済み | encryptionController.rotateKey |
| 22.2.8 | POST | /api/v1/encryption/keys/generate | 鍵生成 | ✅ 実装済み | encryptionController.generateKey |
| 22.2.9 | POST | /api/v1/encryption/keys/upload | 鍵ファイルアップロード | ✅ 実装済み | encryptionController.uploadKeyFile |

---

### 23. 署名・完全性検証API（Signature & Integrity）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/signatureRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 23.1 | POST | /api/v1/signature/projects/:projectName/sign | MAIML署名 | ✅ 実装済み | signatureController.signMaiml |
| 23.2 | POST | /api/v1/signature/projects/:projectName/verify | 署名検証 | ✅ 実装済み | signatureController.verifyMaiml |
| 23.3 | GET | /api/v1/signature/projects/:projectName/hash | MAIMLハッシュ取得 | ✅ 実装済み | signatureController.getMaimlHash |
| 23.4 | POST | /api/v1/signature/certificates/validate | 証明書バリデーション | ✅ 実装済み | signatureController.validateCertificate |
| 23.5 | GET | /api/v1/signature/audit-log | 監査ログ取得 | ✅ 実装済み | signatureController.getAuditLog |

---

### 24. セッション管理API（Session Management）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/sessionRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 24.1 | GET | /api/v1/sessions/... | セッション情報取得 | ✅ 実装済み | sessionController |
| 24.2 | DELETE | /api/v1/sessions/... | セッション削除 | ✅ 実装済み | sessionController |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。

---

### 25. システム設定API（System Config）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/systemConfigRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 25.1 | GET | /api/v1/system-config/... | システム設定取得 | ✅ 実装済み | systemConfigController |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。

---

### 26. タスク管理API（Tasks）

**API設計書**: （未作成）  
**ルートファイル**: `backend/src/routes/tasksRoutes.ts`

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | コントローラー |
|----|-------------|---------------|------|---------|--------------|
| 26.1 | GET | /api/v1/tasks/... | タスク一覧取得 | ✅ 実装済み | tasksController |

> ⚠️ **確認事項**: 詳細なエンドポイントパスはソースの精査が必要。

---

## 📊 実装状況サマリー

### 全体統計（2026-08-14時点）

| カテゴリ | No | ルートファイル | 実装EP数 | 設計書 |
|---------|----|----|---------|--------|
| 認証API | 1 | authRoutes.ts | 9 | [api_auth.md](./api_auth.md) |
| プロジェクト管理API | 2 | projectRoutes.ts | 25 | [api_project_management.md](./api_project_management.md) |
| フォーマット管理API | 3 | formatRoutes.ts | 6 | [api_format_management.md](./api_format_management.md) |
| MAIML編集API | 4 | maimlRoutes.ts | 18 | [api_maiml_editor.md](./api_maiml_editor.md) |
| 進捗確認API | 5 | progressRoutes.ts | 7 | [api_progress_monitoring.md](./api_progress_monitoring.md) |
| 問題管理API | 6 | issueRoutes.ts | 5 | [api_issue_management.md](./api_issue_management.md) |
| 実験データ記録API | 7 | experimentRoutes.ts | 2 | [api_experiment_data.md](./api_experiment_data.md) |
| 実験評価API | 8 | experimentEvaluationRoutes.ts | 3 | **未作成** |
| 実験指示API | 9 | experimentInstructionRoutes.ts | 8 | **未作成** |
| 部門ユニット管理API | 10 | departmentUnitRoutes.ts | 5 | [api_department_management.md](./api_department_management.md)（要更新） |
| ロール管理API | 11 | roleRoutes.ts | 8 | [api_role_management.md](./api_role_management.md) |
| マスタ管理API | 12 | masterRoutes.ts / codeMasterRoutes.ts | 23 | [api_master_management.md](./api_master_management.md) |
| 会社管理API | 13 | corporationRoutes.ts | 7 | [api_corporation_management.md](./api_corporation_management.md) |
| ファイルアクセスAPI | 14 | fileAccessRoutes.ts | 17 | [api_file_access.md](./api_file_access.md) |
| 組織管理API | 15 | organizationRoutes.ts | 10 | [api_organization_management.md](./api_organization_management.md) |
| 組織グループ管理API | 16 | organizationGroupRoutes.ts | 9 | **未作成** |
| システム概要API | 17 | systemOverviewRoutes.ts | 1 | [api_system_overview.md](./api_system_overview.md) |
| セマンティック検索API | 18 | semanticSearchRoutes.ts | 10 | [api_semantic_search.md](./api_semantic_search.md) |
| ユーザー管理API | 19 | userRoutes.ts | 7 | [api_user_management.md](./api_user_management.md) |
| 名前空間管理API | 20 | namespaceRoutes.ts | 10 | **未作成** |
| 不確かさ基準管理API | 21 | uncertaintyCriteriaRoutes.ts | 4 | **未作成** |
| 暗号化・鍵管理API | 22 | encryptionRoutes.ts | 17 | **未作成** |
| 署名・完全性検証API | 23 | signatureRoutes.ts | 5 | **未作成** |
| セッション管理API | 24 | sessionRoutes.ts | 2 | [api_misc.md](./api_misc.md) |
| システム設定API | 25 | systemConfigRoutes.ts | 1 | [api_misc.md](./api_misc.md) |
| タスク管理API | 26 | tasksRoutes.ts | 1 | [api_misc.md](./api_misc.md) |
| **合計** | | **26ルートファイル** | **~220+** | |

### 設計書対応状況

| 状態 | 対象 |
|------|------|
| ✅ 設計書あり（最新） | 問題管理、実験データ、ロール管理、会社管理、組織管理、システム概要、セマンティック検索、ユーザー管理 |
| ⚠️ 設計書あり（要更新） | 部門ユニット（旧仕様）、プロジェクト管理 |
| ❌ 設計書未作成 | 実験評価、実験指示、組織グループ、名前空間、不確かさ基準、暗号化・鍵管理、署名 |

---

## 🛠️ 実装ファイルパス一覧

### ルートファイル
```
backend/src/routes/
├── authRoutes.ts                          # 認証API（9EP）
├── projectRoutes.ts                       # プロジェクト管理API（25EP）
├── formatRoutes.ts                        # フォーマット管理API（6EP）
├── maimlRoutes.ts                         # MAIML編集API（18EP）
├── progressRoutes.ts                      # 進捗確認API（7EP）
├── issueRoutes.ts                         # 問題管理API（5EP）
├── experimentRoutes.ts                    # 実験データ記録API（2EP）
├── experimentEvaluationRoutes.ts          # 実験評価API（3EP）※設計書未作成
├── experimentInstructionRoutes.ts         # 実験指示API（8EP）※設計書未作成
├── departmentUnitRoutes.ts                # 部門ユニット管理API（5EP）
├── roleRoutes.ts                          # ロール管理API（8EP）
├── masterRoutes.ts                        # マスタ管理API（21EP）
├── codeMasterRoutes.ts                    # コードマスタAPI（2EP）※設計書未作成
├── corporationRoutes.ts                   # 会社管理API（7EP）
├── fileAccessRoutes.ts                    # ファイルアクセスAPI（17+EP）
├── organizationRoutes.ts                  # 組織管理API（10EP）
├── organizationGroupRoutes.ts             # 組織グループ管理API（9EP）※設計書未作成
├── systemOverviewRoutes.ts                # システム概要API（1EP）
├── semanticSearchRoutes.ts                # セマンティック検索API（10EP）
├── userRoutes.ts                          # ユーザー管理API（7EP）
├── namespaceRoutes.ts                     # 名前空間管理API（10EP）※設計書未作成
├── uncertaintyCriteriaRoutes.ts           # 不確かさ基準管理API（4EP）※設計書未作成
├── encryptionRoutes.ts                    # 暗号化・鍵管理API（17EP）※設計書未作成
├── signatureRoutes.ts                     # 署名・完全性検証API（5EP）※設計書未作成
├── sessionRoutes.ts                       # セッション管理API（2EP）→ api_misc.md
├── systemConfigRoutes.ts                  # システム設定API（1EP）→ api_misc.md
└── tasksRoutes.ts                         # タスク管理API（1EP）→ api_misc.md
```

---

## ⚠️ 重要な設計原則

### マルチテナント分離（必須）

すべてのAPIで以下を徹底：
```typescript
// ✅ 良い例
const projects = await db.query(
  'SELECT * FROM projects WHERE organization_id = $1',
  [organizationId]
);

// ❌ 悪い例
const projects = await db.query('SELECT * FROM projects');
```

### ミドルウェアチェーン（必須）

```typescript
router.get('/projects',
  auth,                        // 1. JWT認証
  tenantIsolation,            // 2. テナント分離
  permissionCheck(['manager']), // 3. 権限チェック
  projectController.list       // 4. ルートハンドラ
);
```

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 3.0.0 | 2026-08-14 | feature/phase2_mock (commit: 651973aae) に合わせて全体更新 | Cline |
| | | - 新規カテゴリ11件追加（組織グループ、名前空間、不確かさ基準、暗号化・鍵管理、署名・完全性検証、実験評価、実験指示、部門ユニット、コードマスタ、セッション、システム設定、タスク） | |
| | | - 認証API: 6→9エンドポイントに更新 | |
| | | - ファイルアクセスAPI: 8→17+エンドポイントに更新（詳細要確認） | |
| | | - 設計書未作成のカテゴリを明示 | |
| | | - 設計書要更新のカテゴリを明示 | |
| | | - カテゴリ番号を全体的に整理（旧番号から変更あり） | |
| 2.19.0 | 2026-03-30 | プロジェクト管理APIに未記載の6件のエンドポイントを追加 | Cline |
| 2.18.0 | 2026-03-12 | 進捗確認API・実験データ記録API・プロジェクト管理APIの実装状況を更新 | Cline |
| 2.17.0 | 2026-03-11 | 進捗確認API - 作業詳細一括取得API追加 | Cline |
