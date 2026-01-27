# Requirements Document

## Project Description (Input)
指示送信（タスク作成）API実装

## Introduction

本仕様は、実験管理者が実験プロジェクトに対して作業指示を送信し、タスクを作成するためのバックエンドAPIの要件を定義します。このAPIは、プロジェクト計画段階から実行段階への遷移を実現し、複数のデータベーステーブル（project、project_instruction、project_task、project_task_detail）に対するトランザクション管理を行います。

**対象システム**: mmdpfバックエンドAPI  
**主要ユーザー**: 実験管理者（Experiment Admin）  
**関連システム**: PostgreSQLデータベース、マルチテナント認証基盤

---

## Requirements

### Requirement 1: 指示送信エンドポイントの提供

**Objective:** 実験管理者として、プロジェクトに対する作業指示とタスクを一括で作成できるようにすることで、実験作業者への指示伝達を効率化する

#### Acceptance Criteria

1. When 実験管理者が `POST /api/v1/projects/:projectId/instructions` にリクエストを送信した場合、the Task Instruction API shall プロジェクトIDの形式を検証する
2. When 有効なプロジェクトIDを受信した場合、the Task Instruction API shall 複数のタスクと指示を含むリクエストボディを受け付ける
3. The Task Instruction API shall 以下のリクエストフィールドをサポートする: tasks（配列）、instructions（配列）
4. The Task Instruction API shall リクエストに対して201 Created または適切なエラーステータスコードを返却する
5. When 処理が成功した場合、the Task Instruction API shall 作成されたタスク数を含むレスポンスを返却する

---

### Requirement 2: 認証と認可の実施

**Objective:** システム管理者として、認証されたユーザーのみがAPIにアクセスでき、適切な権限を持つユーザーのみが指示送信できるようにすることで、セキュリティを確保する

#### Acceptance Criteria

1. When 認証トークンなしでリクエストが送信された場合、the Task Instruction API shall 401 Unauthorized エラーを返却する
2. When 無効または期限切れのトークンでリクエストが送信された場合、the Task Instruction API shall 401 Unauthorized エラーを返却する
3. When Workerロールのユーザーがリクエストを送信した場合、the Task Instruction API shall 403 Forbidden エラーを返却する
4. When Manager以上のロールのユーザーがリクエストを送信した場合、the Task Instruction API shall リクエストを処理する
5. The Task Instruction API shall 全てのリクエストでJWT + Session Hybrid認証を実施する

---

### Requirement 3: マルチテナント分離の保証

**Objective:** システム管理者として、組織間のデータが完全に分離され、クロステナントアクセスが防止されることで、データ漏洩リスクを排除する

#### Acceptance Criteria

1. When リクエストにX-Organization-Idヘッダーが含まれていない場合、the Task Instruction API shall 400 Bad Request エラーを返却する
2. When X-Organization-Idがセッション情報の組織IDと一致しない場合、the Task Instruction API shall 403 Forbidden エラーを返却する
3. The Task Instruction API shall 全てのデータベースクエリにorganization_idフィルタを適用する
4. When System Adminロール以外のユーザーがアクセスした場合、the Task Instruction API shall 自組織のプロジェクトのみへのアクセスを許可する
5. The Task Instruction API shall 全てのテーブル操作でorganization_idを複合キーとして使用する

---

### Requirement 4: リクエストデータのバリデーション

**Objective:** 開発者として、不正なデータがシステムに登録されないようにすることで、データ整合性を保証する

#### Acceptance Criteria

1. When projectIdがUUID形式でない場合、the Task Instruction API shall 400 Bad Request エラーを返却する
2. When tasks配列が空の場合、the Task Instruction API shall 400 Bad Request エラーを「最低1件以上のタスクが必要」というメッセージとともに返却する
3. When instructions配列が空の場合、the Task Instruction API shall 400 Bad Request エラーを「最低1件以上の指示が必要」というメッセージとともに返却する
4. When tasks[].methodIdが空または255文字を超える場合、the Task Instruction API shall 400 Bad Request エラーを返却する
5. When experimentConditionが0または1以外の場合、the Task Instruction API shall 400 Bad Request エラーを返却する
6. When trialCountが1未満または999を超える場合、the Task Instruction API shall 400 Bad Request エラーを返却する
7. When instructions[].contentが空または1000文字を超える場合、the Task Instruction API shall 400 Bad Request エラーを返却する
8. When instructions[].priorityが0〜3の範囲外の場合、the Task Instruction API shall 400 Bad Request エラーを返却する
9. When instructions[].typeが0〜4の範囲外の場合、the Task Instruction API shall 400 Bad Request エラーを返却する
10. When instructions[].targetTypeが0〜2の範囲外の場合、the Task Instruction API shall 400 Bad Request エラーを返却する
11. When targetType=2でtransitionIdがnullの場合、the Task Instruction API shall 400 Bad Request エラーを返却する
12. When targetType=1でtaskNumberがnullまたは1未満の場合、the Task Instruction API shall 400 Bad Request エラーを返却する

---

### Requirement 5: プロジェクト状態の検証

**Objective:** 実験管理者として、適切なタイミングでのみ指示送信ができるようにすることで、プロジェクトのライフサイクル管理を適切に行う

#### Acceptance Criteria

1. When 指定されたprojectIdが存在しない場合、the Task Instruction API shall 404 Not Found エラーを返却する
2. When プロジェクトが別の組織に属する場合、the Task Instruction API shall 403 Forbidden エラーを返却する
3. When プロジェクトのproject_statusが0（プロジェクト計画中）以外の場合、the Task Instruction API shall 409 Conflict エラーを「指示送信不可な状態」というメッセージとともに返却する
4. When プロジェクトのproject_statusが0の場合、the Task Instruction API shall 指示送信処理を続行する
5. The Task Instruction API shall プロジェクト状態の検証を全てのデータベース操作の前に実行する

---

### Requirement 6: トランザクション管理

**Objective:** 開発者として、複数テーブルへのデータ登録が一貫性を保って実行されることで、データの整合性を保証する

#### Acceptance Criteria

1. When 指示送信処理を開始する場合、the Task Instruction API shall データベーストランザクションを開始する
2. When project_instructionテーブルへの登録が失敗した場合、the Task Instruction API shall 全ての変更をロールバックする
3. When project_taskテーブルへの登録が失敗した場合、the Task Instruction API shall 全ての変更をロールバックする
4. When project_task_detailテーブルへの登録が失敗した場合、the Task Instruction API shall 全ての変更をロールバックする
5. When projectテーブルの更新が失敗した場合、the Task Instruction API shall 全ての変更をロールバックする
6. When 全ての操作が成功した場合、the Task Instruction API shall トランザクションをコミットする
7. When トランザクション中にエラーが発生した場合、the Task Instruction API shall 500 Internal Server Error エラーを返却する

---

### Requirement 7: project_instructionテーブルへのデータ登録

**Objective:** 実験管理者として、作成した指示が適切にデータベースに保存されることで、実験作業者が指示を参照できるようにする

#### Acceptance Criteria

1. When 指示を登録する場合、the Task Instruction API shall 各指示に対してUUID v4形式の一意なexperiment_instruction_idを生成する
2. The Task Instruction API shall organization_idとしてセッション情報から取得した組織IDを使用する
3. The Task Instruction API shall project_idとしてパスパラメータから取得したプロジェクトIDを使用する
4. The Task Instruction API shall instructionsカラムにリクエストのcontentフィールドの値を格納する
5. The Task Instruction API shall instruction_user_idとしてログインユーザーのユーザーIDを使用する
6. The Task Instruction API shall instruction_dateとして現在日時を使用する
7. The Task Instruction API shall instruction_targetとしてリクエストのtargetTypeフィールドの値を格納する
8. The Task Instruction API shall priorityとしてリクエストのpriorityフィールドの値を格納する
9. The Task Instruction API shall typeとしてリクエストのtypeフィールドの値を格納する
10. When targetType=1の場合、the Task Instruction API shall task_noとしてリクエストのtaskNumberフィールドの値を格納する
11. When targetType=2の場合、the Task Instruction API shall transition_idとしてリクエストのtransitionIdフィールドの値を格納する
12. The Task Instruction API shall 全てのParameterized Queryを使用してSQLインジェクションを防止する

---

### Requirement 8: project_taskテーブルへのデータ登録

**Objective:** 実験管理者として、メソッド単位のタスク情報が適切に保存されることで、タスク管理の基盤を提供する

#### Acceptance Criteria

1. When タスクを登録する場合、the Task Instruction API shall リクエストのtasks配列内の各タスクに対してレコードを作成する
2. The Task Instruction API shall organization_idとしてセッション情報から取得した組織IDを使用する
3. The Task Instruction API shall project_idとしてパスパラメータから取得したプロジェクトIDを使用する
4. The Task Instruction API shall method_idとしてリクエストのmethodIdフィールドの値を使用する
5. When 同じmethod_idのレコードが既に存在する場合、the Task Instruction API shall UPSERT操作を実行する
6. The Task Instruction API shall experiment_conditionとしてリクエストのexperimentConditionフィールドの値を格納する
7. When trialCountが指定されている場合、the Task Instruction API shall attempts_countとしてその値を格納する
8. The Task Instruction API shall 複合主キー(organization_id, project_id, method_id)を使用してレコードを識別する

---

### Requirement 9: project_task_detailテーブルへのデータ登録

**Objective:** 実験作業者として、自分に割り当てられたタスクの詳細情報が参照できることで、実験作業を開始できるようにする

#### Acceptance Criteria

1. When タスク詳細を登録する場合、the Task Instruction API shall リクエストのtasks配列とそのtrialCount（または1）の積の数だけレコードを作成する
2. The Task Instruction API shall organization_idとしてセッション情報から取得した組織IDを使用する
3. The Task Instruction API shall project_idとしてパスパラメータから取得したプロジェクトIDを使用する
4. The Task Instruction API shall method_idとしてリクエストのmethodIdフィールドの値を使用する
5. The Task Instruction API shall task_noとして1から始まる連番を割り当てる
6. The Task Instruction API shall task_statusとして0（実行待ち）を固定値で設定する
7. The Task Instruction API shall experiment_user_id、experiment_start_at、experiment_end_at、reviewed_at、review_user_idをNULLで初期化する
8. The Task Instruction API shall 複合主キー(organization_id, project_id, method_id, task_no)を使用してレコードを識別する

---

### Requirement 10: プロジェクトステータスの更新

**Objective:** 実験管理者として、指示送信完了後にプロジェクトステータスが自動的に更新されることで、プロジェクトが実行可能な状態になる

#### Acceptance Criteria

1. When 全てのテーブルへの登録が成功した場合、the Task Instruction API shall projectテーブルのproject_statusを1（タスク実行待ち）に更新する
2. The Task Instruction API shall organization_idとproject_idを使用してプロジェクトを特定する
3. The Task Instruction API shall ステータス更新をトランザクションの一部として実行する
4. When ステータス更新が失敗した場合、the Task Instruction API shall トランザクション全体をロールバックする

---

### Requirement 11: レスポンスの生成

**Objective:** フロントエンド開発者として、処理結果を明確に把握できるレスポンスを受け取ることで、UI更新を適切に行える

#### Acceptance Criteria

1. When 処理が成功した場合、the Task Instruction API shall 201 Created ステータスコードを返却する
2. The Task Instruction API shall レスポンスボディにsummaryオブジェクトを含める
3. The Task Instruction API shall summary.totalTasksとして作成されたタスクの総数を返却する
4. The Task Instruction API shall summary.createdTasksとして正常に作成されたタスクの数を返却する
5. The Task Instruction API shall metaオブジェクトにtimestampとrequestIdを含める
6. The Task Instruction API shall 全てのフィールド名をキャメルケースで返却する
7. When エラーが発生した場合、the Task Instruction API shall 統一されたエラーレスポンス形式を返却する

---

### Requirement 12: エラーハンドリング

**Objective:** 運用担当者として、エラー発生時に適切な情報が提供されることで、問題の迅速な解決を可能にする

#### Acceptance Criteria

1. When バリデーションエラーが発生した場合、the Task Instruction API shall 400 Bad Request と詳細なエラーメッセージを返却する
2. When 認証エラーが発生した場合、the Task Instruction API shall 401 Unauthorized を返却する
3. When 認可エラーが発生した場合、the Task Instruction API shall 403 Forbidden を返却する
4. When リソースが見つからない場合、the Task Instruction API shall 404 Not Found を返却する
5. When プロジェクトステータスが不正な場合、the Task Instruction API shall 409 Conflict を返却する
6. When データベースエラーが発生した場合、the Task Instruction API shall 500 Internal Server Error を返却する
7. The Task Instruction API shall 全てのエラーレスポンスにerror.code、error.message、meta.requestIdを含める
8. The Task Instruction API shall 機密情報をエラーメッセージに含めない
9. The Task Instruction API shall 全てのエラーをログに記録する

---

### Requirement 13: セキュリティ保護

**Objective:** セキュリティ担当者として、SQLインジェクションやその他の攻撃から保護されることで、システムの安全性を確保する

#### Acceptance Criteria

1. The Task Instruction API shall 全てのSQLクエリでParameterized Queryを使用する
2. The Task Instruction API shall 入力値のサニタイゼーションを実施する
3. The Task Instruction API shall 文字列連結によるSQLクエリ構築を禁止する
4. When 特殊文字を含む入力を受信した場合、the Task Instruction API shall 適切にエスケープ処理を行う
5. The Task Instruction API shall 全ての操作を監査ログに記録する
6. The Task Instruction API shall レート制限を適用する（50回/分/ユーザー）
7. The Task Instruction API shall HTTPSでの通信を必須とする

---

### Requirement 14: パフォーマンス要件

**Objective:** システム管理者として、APIが適切なパフォーマンスで動作することで、ユーザー体験を向上させる

#### Acceptance Criteria

1. The Task Instruction API shall 通常時のレスポンスタイムを1000ms以内に保つ
2. When 10件以下のタスクを登録する場合、the Task Instruction API shall レスポンスタイムを500ms以内に保つ
3. The Task Instruction API shall 同時リクエスト処理50 req/sec以上をサポートする
4. The Task Instruction API shall データベース接続プールを使用して接続を効率化する
5. When トランザクションがタイムアウトした場合、the Task Instruction API shall 適切にロールバックして500エラーを返却する

---

### Requirement 15: ロギングと監査

**Objective:** 運用担当者として、全ての指示送信操作が記録されることで、監査とトラブルシューティングを可能にする

#### Acceptance Criteria

1. When 指示送信リクエストを受信した場合、the Task Instruction API shall リクエストの詳細をログに記録する
2. The Task Instruction API shall ログにrequestId、organizationId、projectId、userId、timestampを含める
3. When エラーが発生した場合、the Task Instruction API shall エラーの詳細とスタックトレースをログに記録する
4. The Task Instruction API shall トランザクション開始とコミット/ロールバックをログに記録する
5. The Task Instruction API shall 成功時のログレベルをinfoとする
6. The Task Instruction API shall エラー時のログレベルをerrorとする
7. The Task Instruction API shall ログに機密情報を含めない

---

## Non-Functional Requirements

### Availability
- The Task Instruction API shall 99.9%以上の稼働率を維持する

### Scalability
- The Task Instruction API shall 最大100件のタスクを含む指示送信リクエストを処理できる

### Maintainability
- The Task Instruction API shall コードカバレッジ70%以上のテストを保持する

### Compatibility
- The Task Instruction API shall PostgreSQL 18以降をサポートする
- The Task Instruction API shall Node.js 24以降で動作する

---

## Constraints

1. **Technology Stack**: Node.js 24+、Express.js、TypeScript、PostgreSQL 18+を使用する
2. **Database Design**: 既存のテーブル構造（project、project_instruction、project_task、project_task_detail）を変更しない
3. **Authentication**: 既存のJWT + Session Hybrid認証基盤を使用する
4. **Multi-Tenancy**: 全てのデータ操作でorganization_idフィルタを必須とする
5. **Transaction Isolation**: READ COMMITTEDレベルを使用する

---

## Dependencies

1. **Authentication Service**: ユーザー認証とセッション管理
2. **Permission Service**: ロールベースアクセス制御
3. **Database**: PostgreSQL 18+
4. **Middleware**: auth、tenantIsolation、permissionCheck
5. **Logging Service**: Winston

---

## Assumptions

1. プロジェクトIDは作成時にUUID v4形式で生成されている
2. ユーザーは既に認証され、有効なセッションを持っている
3. Organization IDはセッション情報から取得できる
4. code_masterテーブルにステータス・優先度・タイプのマスタデータが登録されている
5. データベース接続プールは適切に設定されている

---

## Open Questions

1. タスク数の上限は100件で十分か？より多くのタスクを扱う必要があるか？
2. トランザクションタイムアウトの適切な値は？（現在未定義）
3. 指示の更新・削除機能は必要か？（現在は作成のみ）
4. タスクの並び替え・優先順位変更機能は必要か？

---

## References

- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティルール](../../.clinerules/development/security.md)
- [プロジェクト管理API仕様](../../docs/design/api/api_project_management.md) セクション2.4
- [データベース設計](../../docs/design/db/)
