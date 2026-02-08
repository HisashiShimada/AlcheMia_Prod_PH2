# Requirements Document

## Project Description (Input)
実験作業者画面のタスクステータス更新するバックエンドの機能を実装する。
仕様の部分についてはdocs/design/api/api_project_management.mdの6.5タスクステータス更新を確認してください。
また、画面側の仕様についてはdocs\design\ui\ui_progress_check_tab.mdを確認してください。

---

## Introduction

本ドキュメントは、実験作業者がタスクのステータスを更新するためのバックエンドAPI機能の要件を定義します。実験作業者は進捗確認タブから自分に割り当てられたタスクのステータスを変更でき、これによりタスクの進行状況をリアルタイムで管理できるようになります。

### 背景
- 実験作業者が進捗確認タブでタスクの開始、完了、強制終了などのステータス変更を行う必要がある
- タスクステータスの変更履歴を記録し、トレーサビリティを確保する必要がある
- マルチテナント環境において、組織間のデータ分離を厳格に維持する必要がある

### 対象ユーザー
- **実験作業者（experiment_worker）**: 自分に割り当てられたタスクのステータス更新
- **実験管理者（experiment_admin）**: すべてのタスクのステータス確認・管理
- **システム管理者（system_admin）**: 全組織のタスク管理

---

## Requirements

### Requirement 1: タスクステータス更新

**Objective:** 実験作業者として、自分に割り当てられたタスクのステータスを更新したい。これにより、タスクの進行状況をシステムに反映できる。

#### Acceptance Criteria

1. When 実験作業者が自分に割り当てられたタスクのステータス更新をリクエストした場合、the タスクステータス更新APIは、タスクステータスをリクエストされた値に更新すること

2. When タスクステータス更新リクエストを受信した場合、the タスクステータス更新APIは、以下のステータス遷移ルールを検証すること：
   - `pending` → `in_progress`（開始）
   - `in_progress` → `completed`（完了）
   - `in_progress` → `forced_terminated`（強制終了）
   - その他の遷移は許可しない

3. If タスクが存在しない場合、then the タスクステータス更新APIは、404 Not Foundエラーを返却すること

4. If 実験作業者が自分に割り当てられていないタスクのステータス更新を試みた場合、then the タスクステータス更新APIは、403 Forbiddenエラーを返却すること

5. If 不正なステータス遷移がリクエストされた場合、then the タスクステータス更新APIは、400 Bad Requestエラーとステータス遷移ルール違反の詳細を返却すること

6. When タスクステータスが正常に更新された場合、the タスクステータス更新APIは、更新後のタスク情報（task_id、task_status、updated_at）を含む200 OKレスポンスを返却すること

7. The タスクステータス更新APIは、タスクステータス更新時に`update_at`タイムスタンプを現在時刻に更新すること

8. When タスクステータスが`completed`に更新された場合、the タスクステータス更新APIは、`completed_at`フィールドに現在時刻を記録すること

9. When タスクステータスが`in_progress`に更新された場合で`started_at`がnullの場合、the タスクステータス更新APIは、`started_at`フィールドに現在時刻を記録すること

### Requirement 2: マルチテナント分離

**Objective:** システム管理者として、組織間のデータが完全に分離されることを保証したい。これにより、セキュリティとプライバシーを確保できる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、すべてのデータベースクエリに`organization_id`フィルタを含めること

2. When タスクステータス更新リクエストを受信した場合、the タスクステータス更新APIは、リクエストユーザーの`organization_id`とタスクの`organization_id`が一致することを検証すること

3. If organization_idが一致しない場合、then the タスクステータス更新APIは、404 Not Foundエラーを返却すること（403を返さないことで、他組織のデータ存在を隠蔽）

4. The タスクステータス更新APIは、クロステナントアクセスを完全に防止すること（system_adminを除く）

5. When system_adminロールのユーザーがリクエストした場合、the タスクステータス更新APIは、すべての組織のタスクにアクセスを許可すること

### Requirement 3: 認証と認可

**Objective:** セキュリティ担当者として、適切な認証と認可が実施されることを保証したい。これにより、不正アクセスを防止できる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、有効なJWTトークン（`maiml_session-{sessionId}_{timestamp}`形式）を必須とすること

2. If JWTトークンが無効または期限切れの場合、then the タスクステータス更新APIは、401 Unauthorizedエラーを返却すること

3. The タスクステータス更新APIは、`experiment_worker`、`experiment_admin`、または`system_admin`ロールのユーザーのみにアクセスを許可すること

4. If 許可されていないロールのユーザーがアクセスした場合、then the タスクステータス更新APIは、403 Forbiddenエラーを返却すること

5. When experiment_workerロールのユーザーがリクエストした場合、the タスクステータス更新APIは、`project_task`テーブルの`assign_user_id`がリクエストユーザーの`user_id`と一致するタスクのみに更新を許可すること

6. When experiment_adminまたはsystem_adminロールのユーザーがリクエストした場合、the タスクステータス更新APIは、所属組織内のすべてのタスクに更新を許可すること

### Requirement 4: バリデーション

**Objective:** 開発者として、入力データが適切に検証されることを保証したい。これにより、データ整合性を維持できる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、`task_id`パラメータがUUID形式であることを検証すること

2. If task_idがUUID形式でない場合、then the タスクステータス更新APIは、400 Bad Requestエラーを返却すること

3. The タスクステータス更新APIは、`new_status`パラメータが許可された値（`pending`、`in_progress`、`completed`、`forced_terminated`）のいずれかであることを検証すること

4. If new_statusが許可されていない値の場合、then the タスクステータス更新APIは、400 Bad Requestエラーと許可された値のリストを返却すること

5. When オプションの`comment`パラメータが提供された場合、the タスクステータス更新APIは、commentが1000文字以内であることを検証すること

6. If commentが1000文字を超える場合、then the タスクステータス更新APIは、400 Bad Requestエラーを返却すること

### Requirement 5: 監査ログとトレーサビリティ

**Objective:** 監査担当者として、タスクステータス変更の完全な履歴を追跡したい。これにより、コンプライアンスと問題調査を支援できる。

#### Acceptance Criteria

1. When タスクステータスが更新された場合、the タスクステータス更新APIは、アプリケーションログに以下の情報を記録すること：
   - タスクID
   - 更新前のステータス
   - 更新後のステータス
   - 更新実行ユーザーID
   - organization_id
   - タイムスタンプ
   - IPアドレス
   - コメント（存在する場合）

2. The タスクステータス更新APIは、ログレベル「info」でステータス更新を記録すること

3. If タスクステータス更新が失敗した場合、then the タスクステータス更新APIは、ログレベル「error」で失敗理由とスタックトレースを記録すること

4. When 重要なステータス変更（`completed`または`forced_terminated`への遷移）が発生した場合、the タスクステータス更新APIは、ログレベル「warn」で記録すること

### Requirement 6: エラーハンドリング

**Objective:** ユーザーとして、エラーが発生した際に明確でアクションに繋がる情報を受け取りたい。これにより、問題を迅速に解決できる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、統一されたエラーレスポンス形式を返却すること：
   ```json
   {
     "success": false,
     "error": {
       "code": "ERROR_CODE",
       "message": "エラーメッセージ",
       "details": []
     },
     "meta": {
       "timestamp": "ISO8601形式",
       "requestId": "UUID"
     }
   }
   ```

2. When データベースエラーが発生した場合、the タスクステータス更新APIは、500 Internal Server Errorを返却し、エラーコード「SYSTEM_DATABASE_ERROR」を含めること

3. When バリデーションエラーが発生した場合、the タスクステータス更新APIは、400 Bad Requestを返却し、エラーコード「VALIDATION_ERROR」と具体的なフィールドエラー情報を含めること

4. The タスクステータス更新APIは、エラーレスポンスにスタックトレースや内部実装詳細を含めないこと

5. When タイムアウトが発生した場合、the タスクステータス更新APIは、504 Gateway Timeoutを返却すること

### Requirement 7: パフォーマンス

**Objective:** システム運用者として、APIが適切なパフォーマンスを提供することを保証したい。これにより、ユーザー体験を向上できる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、95パーセンタイルで500ミリ秒以内にレスポンスを返却すること

2. The タスクステータス更新APIは、データベース接続プールを使用して接続オーバーヘッドを最小化すること

3. The タスクステータス更新APIは、単一のトランザクション内でタスクステータス更新を完了すること

4. When 同時実行リクエストが発生した場合、the タスクステータス更新APIは、楽観的ロック（バージョン番号またはupdate_atチェック）を使用してデータ競合を防止すること

5. If データ競合が検出された場合、then the タスクステータス更新APIは、409 Conflictエラーを返却し、再試行を促すこと

### Requirement 8: APIインターフェース

**Objective:** フロントエンド開発者として、明確で一貫性のあるAPIインターフェースを使用したい。これにより、統合を容易にできる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、以下のエンドポイントを提供すること：
   ```
   PUT /api/v1/tasks/:taskId/status
   ```

2. The タスクステータス更新APIは、以下のリクエストボディを受け付けること：
   ```json
   {
     "new_status": "in_progress",
     "comment": "タスクを開始しました（オプション）"
   }
   ```

3. When タスクステータス更新が成功した場合、the タスクステータス更新APIは、以下のレスポンスを返却すること：
   ```json
   {
     "success": true,
     "data": {
       "task_id": "UUID",
       "previous_status": "pending",
       "new_status": "in_progress",
       "updated_at": "ISO8601形式",
       "updated_by": "user_id",
       "started_at": "ISO8601形式（該当する場合）",
       "completed_at": "ISO8601形式（該当する場合）"
     },
     "meta": {
       "timestamp": "ISO8601形式",
       "requestId": "UUID"
     }
   }
   ```

4. The タスクステータス更新APIは、Content-Type `application/json` を使用すること

5. The タスクステータス更新APIは、適切なHTTPステータスコード（200、400、401、403、404、409、500）を返却すること

### Requirement 9: データベース整合性

**Objective:** データベース管理者として、データベースの整合性が維持されることを保証したい。これにより、データ品質を確保できる。

#### Acceptance Criteria

1. The タスクステータス更新APIは、タスクステータス更新をトランザクション内で実行すること

2. If トランザクション中にエラーが発生した場合、then the タスクステータス更新APIは、すべての変更をロールバックすること

3. The タスクステータス更新APIは、`project_task`テーブルの外部キー制約を尊重すること

4. When タスクステータスを更新する場合、the タスクステータス更新APIは、関連する`project`テーブルの`update_at`フィールドも更新すること

5. The タスクステータス更新APIは、Parameterized Queriesを使用してSQLインジェクションを防止すること

---

## Non-Functional Requirements

### セキュリティ要件
- すべての通信はHTTPS経由で行うこと
- JWTトークンはHTTPOnly Cookieとして保存すること
- レート制限: 1分あたり50リクエスト/ユーザー

### 可用性要件
- APIの可用性目標: 99.9%
- 計画的メンテナンス時を除く

### スケーラビリティ要件
- 同時接続ユーザー数: 最大500ユーザー
- 1日あたりのタスクステータス更新: 最大10,000件

### モニタリング要件
- すべてのAPIリクエストのレスポンスタイムを記録
- エラー率を監視（目標: 1%未満）
- CloudWatch Logsへのログ出力

---

## Dependencies

### 外部依存
- PostgreSQLデータベース（バージョン18+）
- JWTライブラリ（jsonwebtoken）
- Winstonロギングライブラリ

### 内部依存
- 認証ミドルウェア（authMiddleware）
- 権限チェックミドルウェア（permissionCheck）
- テナント分離ミドルウェア（tenantIsolation - 暗黙的にauthMiddlewareが提供）

### データベーステーブル
- `project_task` - タスク情報（メイン）
- `project` - プロジェクト情報（update_at更新用）
- `organization_user` - ユーザー情報（権限検証用）

---

## Related Documents

- [API設計ポリシー](.clinerules/development/api.md)
- [バックエンド規約](.clinerules/development/backend.md)
- [セキュリティ規約](.clinerules/development/security.md)
- [プロジェクト管理API仕様書](docs/design/api/api_project_management.md)
- [進捗確認タブUI設計書](docs/design/ui/ui_progress_check_tab.md)
- [データベース構造](.clinerules/references/db_structure.md)