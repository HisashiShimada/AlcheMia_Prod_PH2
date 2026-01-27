# Requirements Document

## Project Description (Input)
ファイル一覧取得API、タスク一覧取得API作成

**参照元**: `docs/design/api/api_project_management.md`（セクション5, 6）

---

## 導入

本ドキュメントは、プロジェクト管理画面における以下2つのAPIのバックエンド実装要件を定義します：

- **ファイル一覧取得API**: `GET /api/v1/projects/:projectId/files`
- **タスク一覧取得API**: `GET /api/v1/projects/:projectId/tasks`

両APIは、マルチテナント環境において、プロジェクトに紐づくファイルとタスクのデータを安全かつ効率的に取得する機能を実現します。これらは実験管理者（Experiment Admin）画面のプロジェクト管理機能の一部として実装されます。

---

## Requirements

### 要件1: ファイル一覧API - 認証・認可

**目的:** システム管理者として、認証されたユーザーのみがファイル一覧にアクセスできるようにしたい。これにより、不正アクセスを防止し、データの安全性を確保する。

#### 受入基準

1. When APIリクエストを受信した場合、ファイル一覧APIはJWTトークンとセッションの両方を検証しなければならない
2. If Authorizationヘッダーが存在しない場合、ファイル一覧APIは401エラー（AUTH_TOKEN_INVALID）を返却しなければならない
3. If JWTトークンの有効期限が切れている場合、ファイル一覧APIは401エラー（AUTH_TOKEN_EXPIRED）を返却しなければならない
4. When ユーザーがexperiment_admin権限を持つ場合、ファイル一覧APIは自組織のプロジェクトのファイル一覧を返却しなければならない
5. When ユーザーがsystem_admin権限を持つ場合、ファイル一覧APIは全組織のプロジェクトのファイル一覧を返却できなければならない
6. If ユーザーがexperiment_worker権限の場合、ファイル一覧APIは403エラー（PERMISSION_INSUFFICIENT）を返却しなければならない
7. ファイル一覧APIは、authミドルウェア、permissionCheckミドルウェアを適用しなければならない

---

### 要件2: ファイル一覧API - マルチテナント分離

**目的:** 実験管理者として、自組織のファイルのみが表示されることを保証したい。これにより、組織間のデータ漏洩を防止する。

#### 受入基準

1. ファイル一覧APIは、プロジェクトの存在確認時にorganization_idフィルタを含めなければならない
2. When APIリクエストを受信した場合、ファイル一覧APIはauthMiddlewareによって`req.user`に格納されたorganizationIdを使用しなければならない
3. ファイル一覧APIは、コントローラーで`req.user.organizationId`を使用してテナント分離されたデータにアクセスしなければならない
4. If projectIdがUUID形式でない場合、ファイル一覧APIは400エラー（VALIDATION_ERROR）を返却しなければならない
5. When プロジェクトの存在確認クエリを実行する場合、ファイル一覧APIはParameterized Queriesを使用しなければならない
6. ファイル一覧APIは、S3パスに`org_{organization_prefix}`プレフィックスが含まれることを検証しなければならない
7. ファイル一覧APIは、クロステナントアクセスを防止しなければならない
8. ファイル一覧APIは、セッション情報から取得したorganization_idのみを使用し、リクエストヘッダーで`X-Organization-Id`を受け取ってはならない

---

### 要件3: ファイル一覧API - データ取得・フィルタリング

**目的:** 実験管理者として、プロジェクト内のファイル（現在のファイルとアーカイブ）を取得したい。これにより、ファイルの変更履歴を確認できる。

#### 受入基準

1. ファイル一覧APIは、S3から`org_{organization_prefix}/projects/{project_name}/`配下のファイル一覧を取得しなければならない
2. ファイル一覧APIは、現在のファイル（プロジェクトフォルダ直下の.maimlファイル）を`files`配列に含めなければならない
3. When include_archive=true（デフォルトはfalse）の場合、ファイル一覧APIは`archive/`サブフォルダのファイルを`archive_files`配列に含めなければならない
4. When include_archive=falseの場合、ファイル一覧APIは`archive_files`配列を空にしなければならない
5. ファイル一覧APIは、各ファイルについて以下の情報を取得しなければならない: file_id, file_name, file_path, file_size, file_type, is_archive, version, created_at, updated_at
6. ファイル一覧APIは、アーカイブファイルのバージョン番号を`_v{number}`パターンから抽出しなければならない
7. ファイル一覧APIは、レスポンスにproject_idとproject_nameを含めなければならない
8. ファイル一覧APIは、取得したデータをキャメルケースに変換してJSON形式で返却しなければならない
9. If S3接続エラーが発生した場合、ファイル一覧APIは500エラー（SYSTEM_ERROR）を返却しなければならない
10. If プロジェクトが存在しない場合、ファイル一覧APIは404エラー（RESOURCE_NOT_FOUND）を返却しなければならない

---

### 要件4: ファイル一覧API - レスポンス形式

**目的:** フロントエンド開発者として、統一されたレスポンス形式を受け取りたい。これにより、APIレスポンスの処理を標準化できる。

#### 受入基準

1. ファイル一覧APIは、成功時に以下の構造のJSONを返却しなければならない: {success: true, data: {project_id, project_name, files: [...], archive_files: [...]}, meta: {...}}
2. ファイル一覧APIは、data.filesフィールドに現在のファイル配列を含めなければならない
3. ファイル一覧APIは、data.archive_filesフィールドにアーカイブファイル配列を含めなければならない
4. ファイル一覧APIは、metaフィールドにtimestamp（ISO 8601形式）とrequestIdを含めなければならない
5. ファイル一覧APIは、日付・時刻をISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）で返却しなければならない
6. ファイル一覧APIは、成功時にHTTPステータスコード200を返却しなければならない
7. ファイル一覧APIは、Content-Typeヘッダーをapplication/jsonに設定しなければならない
8. When ファイルが1件も存在しない場合、ファイル一覧APIは空の配列を返却しなければならない（エラーにしない）

---

### 要件5: タスク一覧API - 認証・認可

**目的:** システム管理者として、認証されたユーザーのみがタスク一覧にアクセスできるようにしたい。これにより、不正アクセスを防止し、データの安全性を確保する。

#### 受入基準

1. When APIリクエストを受信した場合、タスク一覧APIはJWTトークンとセッションの両方を検証しなければならない
2. If Authorizationヘッダーが存在しない場合、タスク一覧APIは401エラー（AUTH_TOKEN_INVALID）を返却しなければならない
3. If JWTトークンの有効期限が切れている場合、タスク一覧APIは401エラー（AUTH_TOKEN_EXPIRED）を返却しなければならない
4. When ユーザーがexperiment_admin権限を持つ場合、タスク一覧APIは自組織のプロジェクトのタスク一覧を返却しなければならない
5. When ユーザーがsystem_admin権限を持つ場合、タスク一覧APIは全組織のプロジェクトのタスク一覧を返却できなければならない
6. If ユーザーがexperiment_worker権限の場合、タスク一覧APIは403エラー（PERMISSION_INSUFFICIENT）を返却しなければならない
7. タスク一覧APIは、authミドルウェア、permissionCheckミドルウェアを適用しなければならない

---

### 要件6: タスク一覧API - マルチテナント分離

**目的:** 実験管理者として、自組織のタスクのみが表示されることを保証したい。これにより、組織間のデータ漏洩を防止する。

#### 受入基準

1. タスク一覧APIは、すべてのデータベースクエリにorganization_idフィルタを含めなければならない
2. When APIリクエストを受信した場合、タスク一覧APIはauthMiddlewareによって`req.user`に格納されたorganizationIdを使用しなければならない
3. タスク一覧APIは、コントローラーで`req.user.organizationId`を使用してテナント分離されたデータにアクセスしなければならない
4. If projectIdがUUID形式でない場合、タスク一覧APIは400エラー（VALIDATION_ERROR）を返却しなければならない
5. When データベースクエリを実行する場合、タスク一覧APIはParameterized Queriesを使用しなければならない
6. タスク一覧APIは、`req.user.organizationId`（セッション情報から取得）を使用してクエリを実行しなければならない
7. タスク一覧APIは、クロステナントアクセスを防止しなければならない
8. タスク一覧APIは、セッション情報から取得したorganization_idのみを使用し、リクエストヘッダーで`X-Organization-Id`を受け取ってはならない

---

### 要件7: タスク一覧API - データ取得・フィルタリング

**目的:** 実験管理者として、プロジェクト内のタスクをステータスに応じてフィルタリングして取得したい。これにより、必要なタスクのみを効率的に閲覧できる。

#### 受入基準

1. タスク一覧APIは、project_taskテーブルから以下のフィールドを取得しなければならない: task_id, task_name, task_status, assigned_to, method_name, transition_name, created_at, updated_at, completed_at
2. タスク一覧APIは、指定されたproject_idに紐づくタスクのみを返却しなければならない
3. When statusパラメータが`all`（デフォルト）の場合、タスク一覧APIはすべてのステータスのタスクを返却しなければならない
4. When statusパラメータが`pending`の場合、タスク一覧APIは保留中のタスクのみを返却しなければならない
5. When statusパラメータが`in_progress`の場合、タスク一覧APIは実行中のタスクのみを返却しなければならない
6. When statusパラメータが`completed`の場合、タスク一覧APIは完了したタスクのみを返却しなければならない
7. When statusパラメータが`failed`の場合、タスク一覧APIは失敗したタスクのみを返却しなければならない
8. If statusパラメータが許可されていない値（all, pending, in_progress, completed, failed以外）の場合、タスク一覧APIは400エラー（VALIDATION_ERROR）を返却しなければならない
9. タスク一覧APIは、ワーカー名（assigned_user_name）をJOINで取得しなければならない
10. タスク一覧APIは、取得したデータをキャメルケースに変換してJSON形式で返却しなければならない
11. If データベース接続エラーが発生した場合、タスク一覧APIは500エラー（SYSTEM_ERROR）を返却しなければならない
12. If プロジェクトが存在しない場合、タスク一覧APIは404エラー（RESOURCE_NOT_FOUND）を返却しなければならない

---

### 要件8: タスク一覧API - 統計情報

**目的:** 実験管理者として、タスクのステータス別集計を取得したい。これにより、プロジェクトの進捗状況を一目で把握できる。

#### 受入基準

1. タスク一覧APIは、レスポンスに`statistics`オブジェクトを含めなければならない
2. タスク一覧APIは、statistics.totalフィールドに全タスク数を含めなければならない
3. タスク一覧APIは、statistics.pendingフィールドに保留中のタスク数を含めなければならない
4. タスク一覧APIは、statistics.in_progressフィールドに実行中のタスク数を含めなければならない
5. タスク一覧APIは、statistics.completedフィールドに完了したタスク数を含めなければならない
6. タスク一覧APIは、statistics.failedフィールドに失敗したタスク数を含めなければならない
7. タスク一覧APIは、statisticsの集計をデータベースクエリで実行しなければならない（アプリケーション側での集計ではなく）

---

### 要件9: タスク一覧API - レスポンス形式

**目的:** フロントエンド開発者として、統一されたレスポンス形式を受け取りたい。これにより、APIレスポンスの処理を標準化できる。

#### 受入基準

1. タスク一覧APIは、成功時に以下の構造のJSONを返却しなければならない: {success: true, data: {project_id, project_name, tasks: [...], statistics: {...}}, meta: {...}}
2. タスク一覧APIは、data.tasksフィールドにタスク配列を含めなければならない
3. タスク一覧APIは、data.statisticsフィールドに統計情報オブジェクトを含めなければならない
4. タスク一覧APIは、metaフィールドにtimestamp（ISO 8601形式）とrequestIdを含めなければならない
5. タスク一覧APIは、日付・時刻をISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）で返却しなければならない
6. タスク一覧APIは、成功時にHTTPステータスコード200を返却しなければならない
7. タスク一覧APIは、Content-Typeヘッダーをapplication/jsonに設定しなければならない
8. When タスクが1件も存在しない場合、タスク一覧APIは空の配列を返却しなければならない（エラーにしない）

---

### 要件10: 共通 - エラーハンドリング

**目的:** システム運用者として、エラーの原因を特定できる詳細な情報を取得したい。これにより、迅速な問題解決が可能になる。

#### 受入基準

1. If バリデーションエラーが発生した場合、両APIは400エラーとVALIDATION_ERRORコードを返却しなければならない
2. If 認証エラーが発生した場合、両APIは401エラーとAUTH_TOKEN_INVALIDコードを返却しなければならない
3. If 権限不足エラーが発生した場合、両APIは403エラーとPERMISSION_INSUFFICIENTコードを返却しなければならない
4. If リソース（プロジェクト）が見つからない場合、両APIは404エラーとRESOURCE_NOT_FOUNDコードを返却しなければならない
5. If データベースエラーが発生した場合、両APIは500エラーとSYSTEM_ERRORを返却しなければならない
6. If S3接続エラーが発生した場合、ファイル一覧APIは500エラーとSYSTEM_ERRORを返却しなければならない
7. 両APIは、エラー時に以下の構造のJSONを返却しなければならない: {success: false, error: {code, message, details}, meta: {...}}
8. 両APIは、エラーメッセージを日本語で返却しなければならない
9. 両APIは、エラー詳細に機密情報（パスワード、トークン等）を含めてはならない
10. 両APIは、すべてのエラーをログに記録しなければならない

---

### 要件11: 共通 - パフォーマンス

**目的:** システム運用者として、応答時間を最適化したい。これにより、ユーザーエクスペリエンスを向上させる。

#### 受入基準

1. ファイル一覧APIとタスク一覧APIは、通常時200ms以内でレスポンスを返却しなければならない
2. ファイル一覧APIとタスク一覧APIは、最大でも500ms以内でレスポンスを返却しなければならない
3. タスク一覧APIは、データベース接続にコネクションプールを使用しなければならない
4. タスク一覧APIは、必要最小限のカラムのみをSELECTしなければならない
5. タスク一覧APIは、organization_idとproject_idにインデックスが存在することを前提としなければならない
6. ファイル一覧APIは、S3リクエストをキャッシュできなければならない（TTL: 5分）
7. 両APIは、同時に50リクエスト/秒を処理できなければならない

---

### 要件12: 共通 - セキュリティ

**目的:** セキュリティ担当者として、SQLインジェクションやその他の攻撃を防止したい。これにより、システムの安全性を確保する。

#### 受入基準

1. タスク一覧APIは、すべてのDBクエリでParameterized Queriesを使用しなければならない
2. 両APIは、ユーザー入力値（projectId、statusパラメータ等）をサニタイゼーションしなければならない
3. タスク一覧APIは、文字列連結でSQLクエリを構築してはならない
4. 両APIは、authミドルウェアを適用しなければならない
5. 両APIは、permissionCheckミドルウェア（experiment_admin, system_admin）を適用しなければならない
7. 両APIは、機密情報をログに出力してはならない
8. 両APIは、レート制限（100リクエスト/分/ユーザー）を適用しなければならない
9. ファイル一覧APIは、S3パスのorganization_prefixを検証しなければならない

---

## テスト要件

### ファイル一覧API - 受入テスト

1. **正常系テスト**
   - 認証済みExperiment Adminによるファイル一覧取得が成功すること
   - System Adminによる全組織のプロジェクトのファイル取得が成功すること
   - 現在のファイルがfiles配列に含まれていること
   - include_archive=falseでarchive_files配列が空であること
   - include_archive=trueでarchive_files配列にアーカイブファイルが含まれていること
   - アーカイブファイルのバージョン番号が正しく抽出されていること
   - project_idとproject_nameがレスポンスに含まれていること

2. **異常系テスト**
   - 未認証ユーザーによるアクセスで401エラーが返却されること
   - Experiment Workerによるアクセスで403エラーが返却されること
   - 他組織のプロジェクトへのアクセスで404エラーが返却されること
   - 不正なprojectId（UUID形式でない）で400エラーが返却されること
   - 存在しないprojectIdで404エラーが返却されること
   - S3接続エラーで500エラーが返却されること

3. **パフォーマンステスト**
   - レスポンスタイムが200ms以内であること
   - 50リクエスト/秒の同時処理が可能であること

4. **セキュリティテスト**
   - クロステナントアクセスが防止されていること
   - S3パスのorganization_prefixが検証されていること
   - レート制限が正しく動作すること

---

### タスク一覧API - 受入テスト

1. **正常系テスト**
   - 認証済みExperiment Adminによるタスク一覧取得が成功すること
   - System Adminによる全組織のプロジェクトのタスク取得が成功すること
   - status=allですべてのタスクが取得できること
   - status=pendingで保留中のタスクのみが取得できること
   - status=in_progressで実行中のタスクのみが取得できること
   - status=completedで完了したタスクのみが取得できること
   - status=failedで失敗したタスクのみが取得できること
   - statisticsオブジェクトに正しい集計値が含まれていること
   - ワーカー名（assigned_user_name）がJOINで取得されていること

2. **異常系テスト**
   - 未認証ユーザーによるアクセスで401エラーが返却されること
   - Experiment Workerによるアクセスで403エラーが返却されること
   - 他組織のプロジェクトへのアクセスで404エラーが返却されること
   - 不正なprojectId（UUID形式でない）で400エラーが返却されること
   - 不正なstatusパラメータで400エラーが返却されること
   - 存在しないprojectIdで404エラーが返却されること

3. **パフォーマンステスト**
   - レスポンスタイムが200ms以内であること
   - 50リクエスト/秒の同時処理が可能であること
   - 統計情報の集計がデータベースで実行されていること

4. **セキュリティテスト**
   - SQLインジェクション攻撃が防止されていること
   - クロステナントアクセスが防止されていること
   - レート制限が正しく動作すること

---

## 非機能要件

### 可用性
- ファイル一覧APIとタスク一覧APIは、99.9%以上の稼働率を維持しなければならない

### 拡張性
- ファイル一覧APIは、プロジェクトあたり100ファイルまで増加しても性能劣化しないこと
- タスク一覧APIは、プロジェクトあたり1,000タスクまで増加しても性能劣化しないこと

### 保守性
- 両APIは、既存のプロジェクト一覧APIと同じアーキテクチャパターンを採用すること
- 両APIは、統一されたエラーハンドリングパターンを使用すること
- 両APIは、ログ記録を標準化すること

### 互換性
- 両APIは、HTTP/1.1およびHTTP/2をサポートすること
- 両APIは、主要なブラウザ（Chrome, Firefox, Safari, Edge）と互換性を持つこと

---

## 実装ファイルパス

### ファイル一覧API
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`getProjectFiles`)
- **サービス**: `backend/src/services/projectService.ts` (`getProjectFiles`)

### タスク一覧API
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`getProjectTasks`)
- **サービス**: `backend/src/services/projectService.ts` (`getProjectTasks`)

---

## 関連ドキュメント

- **API仕様書**: `docs/design/api/api_project_management.md`（セクション5, 6）
- **API設計ポリシー**: `.clinerules/development/api.md`
- **バックエンド規約**: `.clinerules/development/backend.md`
- **セキュリティ規約**: `.clinerules/development/security.md`
- **S3構造定義**: `.clinerules/references/s3_structure.md`
- **データベース構造**: `.clinerules/references/db_structure.md`