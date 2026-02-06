# Requirements Document

## Project Description (Input)
実験作業者画面の指示一覧取得（実験作業者用）を行うバックエンドの機能を実装する。

仕様の部分については
'docs\design\api\api_project_management.md'
の11. 指示一覧取得（実験作業者用）APIを確認してください。

---

## Introduction

本要件書は、実験作業者が自分に割り当てられた指示を確認するためのバックエンドAPI機能を定義します。
このAPIは、プロジェクト管理APIの一部として、実験作業者が効率的に作業指示を確認・フィルタリングできる機能を提供します。

**対象API**: `GET /api/v1/projects/:projectName/worker-instructions`

**対象ユーザー**:
- 実験作業者（experiment_worker）

**主要機能**:
- 指示一覧の取得と表示
- 複数条件によるフィルタリング
- 確認状態の管理
- マルチテナント分離の保証

---

## Requirements

### Requirement 1: 指示一覧取得機能
**Objective**: 実験作業者として、自分に割り当てられた指示の一覧を確認したい。そのため、プロジェクト内の指示を取得できる必要がある。

#### Acceptance Criteria

1. When 実験作業者がプロジェクト名を指定して指示一覧を要求した場合、the Worker Instructions API shall 自分に割り当てられたタスクに紐づく指示のみを返却する

2. When 実験管理者またはシステム管理者が指示一覧を要求した場合、the Worker Instructions API shall プロジェクト内のすべての指示を返却する

3. When 指示一覧を取得する場合、the Worker Instructions API shall 以下の情報を含む指示データを返却する:
   - 指示ID（instruction_id）
   - プロジェクト情報（project_id, project_name）
   - メソッド情報（method_id, method_name）
   - タスク情報（task_no）
   - トランジション情報（transition_id, transition_name）
   - 指示対象（instruction_target）
   - 指示内容（instruction_content）
   - 優先度（priority）
   - タイプ（type）
   - 確認状態（is_acknowledged, acknowledged_at, acknowledged_user_id）
   - 作成情報（created_at, created_by, created_by_name）

4. When 指示が存在しない場合、the Worker Instructions API shall 空の配列を返却する

5. The Worker Instructions API shall 指示を作成日時の降順（最新が先頭）で返却する

---

### Requirement 2: フィルタリング機能
**Objective**: 実験作業者として、特定の条件で指示を絞り込みたい。そのため、複数のフィルタリングオプションを使用できる必要がある。

#### Acceptance Criteria

1. When projectIdクエリパラメータが指定された場合、the Worker Instructions API shall 指定されたプロジェクトIDの指示のみを返却する

2. When 複数のフィルタリング条件が指定された場合、the Worker Instructions API shall すべての条件を満たす指示のみを返却する（AND条件）

3. When フィルタリング条件が指定されない場合、the Worker Instructions API shall すべての指示を返却する

---

### Requirement 3: 認証と認可
**Objective**: システムとして、不正なアクセスを防止したい。そのため、適切な認証と権限チェックを実施する必要がある。

#### Acceptance Criteria

1. When APIリクエストを受信した場合、the Worker Instructions API shall Authorizationヘッダーに有効なJWTトークンが含まれることを検証する

2. If Authorizationヘッダーが存在しない、またはトークンが無効な場合、then the Worker Instructions API shall 401 Unauthorizedエラーを返却する

3. When 認証が成功した場合、the Worker Instructions API shall ユーザーのロールがexperiment_worker、experiment_admin、またはsystem_adminであることを検証する

4. If ユーザーのロールが許可されていない場合、then the Worker Instructions API shall 403 Forbiddenエラーを返却する

5. When 実験作業者がリクエストした場合、the Worker Instructions API shall 自分に割り当てられたタスクに紐づく指示のみにアクセスを制限する

6. When 実験管理者またはシステム管理者がリクエストした場合、the Worker Instructions API shall 所属組織内のすべての指示へのアクセスを許可する

---

### Requirement 4: マルチテナント分離
**Objective**: システムとして、組織間のデータ分離を保証したい。そのため、すべてのデータアクセスで組織IDを検証する必要がある。

#### Acceptance Criteria

1. When データベースクエリを実行する場合、the Worker Instructions API shall organization_idフィルタを必ず含める

2. When 指示データを取得する場合、the Worker Instructions API shall リクエストユーザーの所属組織のデータのみを返却する

3. If 異なる組織のデータへのアクセスが試みられた場合、then the Worker Instructions API shall 404 Not Foundエラーを返却する（データの存在を隠蔽）

4. The Worker Instructions API shall クロステナントアクセスを一切許可しない（system_adminを含む）

---

### Requirement 5: エラーハンドリング
**Objective**: システムとして、エラー発生時に適切な情報を提供したい。そのため、統一されたエラーレスポンス形式を使用する必要がある。

#### Acceptance Criteria

1. If バリデーションエラーが発生した場合、then the Worker Instructions API shall 400 Bad Requestステータスコードとエラー詳細を返却する

2. If 認証エラーが発生した場合、then the Worker Instructions API shall 401 Unauthorizedステータスコードとエラーメッセージを返却する

3. If 権限エラーが発生した場合、then the Worker Instructions API shall 403 Forbiddenステータスコードとエラーメッセージを返却する

4. If システムエラーが発生した場合、then the Worker Instructions API shall 500 Internal Server Errorステータスコードとエラーメッセージを返却する

5. When エラーレスポンスを返却する場合、the Worker Instructions API shall 以下の形式を使用する:
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
       "requestId": "リクエストID"
     }
   }
   ```

6. The Worker Instructions API shall すべてのエラーを適切にログに記録する

---

### Requirement 6: レスポンス形式
**Objective**: クライアントとして、一貫した形式でデータを受け取りたい。そのため、統一されたレスポンス形式を使用する必要がある。

#### Acceptance Criteria

1. When 成功レスポンスを返却する場合、the Worker Instructions API shall 以下の形式を使用する:
   ```json
   {
     "success": true,
     "data": [指示の配列],
     "meta": {
       "timestamp": "ISO8601形式",
       "requestId": "リクエストID"
     }
   }
   ```

2. The Worker Instructions API shall すべての日時データをISO8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）で返却する

3. The Worker Instructions API shall すべてのUUID型データを標準UUID形式（8-4-4-4-12）で返却する

4. The Worker Instructions API shall nullableなフィールドが値を持たない場合にnullを返却する

---

### Requirement 7: パフォーマンスとスケーラビリティ
**Objective**: システムとして、効率的にデータを取得したい。そのため、適切なデータベースクエリを実行する必要がある。

#### Acceptance Criteria

1. When 指示一覧を取得する場合、the Worker Instructions API shall 必要最小限のデータベースクエリを実行する

2. The Worker Instructions API shall JOINクエリを使用して、複数テーブルの情報を効率的に取得する

3. When 大量の指示が存在する場合でも、the Worker Instructions API shall 5秒以内にレスポンスを返却する

4. The Worker Instructions API shall データベース接続プールを使用して、接続リソースを効率的に管理する

---

### Requirement 8: 監査とロギング
**Objective**: システムとして、API使用状況を追跡したい。そのため、適切なログを記録する必要がある。

#### Acceptance Criteria

1. When APIリクエストを受信した場合、the Worker Instructions API shall リクエスト情報（ユーザーID、組織ID、パラメータ）をログに記録する

2. When レスポンスを返却する場合、the Worker Instructions API shall レスポンスステータスと処理時間をログに記録する

3. If エラーが発生した場合、then the Worker Instructions API shall エラー詳細とスタックトレースをログに記録する

4. The Worker Instructions API shall すべてのログに一意のrequestIdを含める

5. The Worker Instructions API shall ログレベル（info, warn, error）を適切に使い分ける

---

## 実装上の注意事項

### データベーステーブル
- `project_instruction`: 指示の基本情報
- `project_task`: タスクとワーカーの割り当て情報
- `project`: プロジェクト情報
- `organization_user`: ユーザー情報
- `user_authentication`: ユーザー認証情報

### S3パス構成
- プロジェクトMAIMLファイル: `org_{organization_prefix}/projects/{project_name}/{project_name}.maiml`

### ミドルウェアチェーン
1. `authMiddleware`: JWT認証とセッション検証
2. `permissionCheck(['experiment_worker', 'experiment_admin', 'system_admin'])`: 権限チェック
3. コントローラー処理

### 外部依存関係
- S3ストレージサービス（MAIMLファイル取得）
- MAIMLパーサー（メソッド・タスク情報抽出）
- データベース接続プール