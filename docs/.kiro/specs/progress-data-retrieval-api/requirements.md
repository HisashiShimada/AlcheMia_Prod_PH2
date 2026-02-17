# Requirements Document

## Project Description (Input)
実験作業者画面の進捗データ取得を行うバックエンドの機能を実装する。

仕様の部分については
'docs\design\api\api_progress_monitoring.md'
の3. 進捗データ取得APIを確認してください。

---

## Introduction

本要件定義書は、実験作業者画面における進捗データ取得APIの機能要件を定義します。本APIは、指定されたプロジェクト・メソッド・タスクに紐づくトランジションレベルの進捗情報を取得し、実験管理者および実験作業者が実験の進捗状況を把握できるようにすることを目的としています。

### 対象API
- **エンドポイント**: `GET /api/v1/progress/:projectId/:methodId/:taskNo`
- **対象ユーザーロール**: experiment_admin, experiment_worker, system_admin
- **主要機能**: トランジション単位の進捗データ取得、全体進捗率計算

---

## Requirements

### Requirement 1: 進捗データ取得機能

**目的**: 実験管理者および実験作業者として、指定したタスクの詳細な進捗情報を取得したい。これにより、実験の現在の状態と完了度を正確に把握できる。

#### Acceptance Criteria

1. When ユーザーが有効なprojectId、methodId、taskNoを指定してAPIをリクエストした場合、the 進捗データ取得APIは該当タスクの基本情報（project_id, project_name, method_id, method_name, task_no, task_name）を含むレスポンスを返却すること

2. When タスクに紐づくトランジション情報が存在する場合、the 進捗データ取得APIは各トランジションの詳細情報（transition_id, transition_name, status, progress, last_updated）を配列形式で返却すること

3. When 進捗データが取得される場合、the 進捗データ取得APIは全体進捗情報（total_transitions, completed, in_progress, not_started, overall_percentage）を計算して返却すること

4. When トランジションの進捗率（progress）が計算される場合、the 進捗データ取得APIは0から100の範囲の整数値として返却すること

5. When 全体進捗率（overall_percentage）が計算される場合、the 進捗データ取得APIは全トランジションの進捗率の平均値を小数点第1位まで算出すること

6. When 実験記録データが存在するトランジションの場合、the 進捗データ取得APIはhas_dataフラグをtrueに設定し、data_countに記録数を設定すること

7. When 実験記録データが存在しないトランジションの場合、the 進捗データ取得APIはhas_dataフラグをfalseに設定し、data_countを0に設定すること

8. The 進捗データ取得APIはトランジションのステータスとして「not_started」「in_progress」「completed」のいずれかを返却すること

---

### Requirement 2: 認証と認可

**目的**: システム管理者として、APIアクセスが適切に認証・認可されることで、セキュリティを確保したい。

#### Acceptance Criteria

1. When ユーザーがAuthorizationヘッダーなしでAPIをリクエストした場合、the 進捗データ取得APIは401 Unauthorizedステータスコードを返却すること

2. When ユーザーが無効なJWTトークンでAPIをリクエストした場合、the 進捗データ取得APIは401 Unauthorizedステータスコードとエラーメッセージを返却すること

3. When ユーザーが有効なJWTトークン（maiml_session-{sessionId}_{timestamp}形式）でリクエストした場合、the 進捗データ取得APIはセッション情報を検証し、req.userにユーザー情報を格納すること

4. When 認証されたユーザーのロールがexperiment_admin、experiment_worker、system_admin以外の場合、the 進捗データ取得APIは403 Forbiddenステータスコードを返却すること

5. When 認証されたユーザーのロールがexperiment_admin、experiment_worker、system_adminのいずれかの場合、the 進捗データ取得APIは処理を続行すること

6. When authMiddlewareがセッションを検証する場合、the 進捗データ取得APIはreq.userにorganizationIdを含むユーザー情報を設定すること

---

### Requirement 3: マルチテナントデータ分離

**目的**: システム管理者として、組織間のデータが完全に分離されることで、データ漏洩を防止したい。

#### Acceptance Criteria

1. When データベースクエリを実行する場合、the 進捗データ取得APIはすべてのクエリにorganization_idフィルタを適用すること

2. When project_taskテーブルを検索する場合、the 進捗データ取得APIはreq.user.organizationIdと一致するレコードのみを取得すること

3. When experiment_recordテーブルを検索する場合、the 進捗データ取得APIはreq.user.organizationIdと一致するレコードのみを取得すること

4. When 異なる組織に属するタスクIDが指定された場合、the 進捗データ取得APIは404 Not Foundステータスコードを返却すること

5. The 進捗データ取得APIはクロステナントアクセスを一切許可しないこと

---

### Requirement 4: MAIMLファイルとの連携

**目的**: 開発者として、MAIMLファイルからメソッド構造とトランジション情報を取得することで、動的な進捗管理を実現したい。

#### Acceptance Criteria

1. When タスクに紐づくプロジェクト情報が取得される場合、the 進捗データ取得APIはS3/Swift storageからMAIMLファイル（projects/{project_name}/{project_name}.maiml）をダウンロードすること

2. When MAIMLファイルがダウンロードされる場合、the 進捗データ取得APIはorganization prefixを使用してマルチテナント分離されたパスからファイルを取得すること

3. When MAIMLファイルがパースされる場合、the 進捗データ取得APIはparseMultipleMethodsStructure関数を使用して複数メソッド構造を解析すること

4. When 指定されたmethodIdが存在しない場合、the 進捗データ取得APIは404 Not Foundステータスコードと「メソッドが見つかりません」エラーメッセージを返却すること

5. When メソッド構造が取得される場合、the 進捗データ取得APIはmethod_nameをMAIMLファイルから取得した値に設定すること

6. When トランジション情報が取得される場合、the 進捗データ取得APIは各トランジションのtransition_idとtransition_nameをMAIMLファイルのpetriNet.transitions配列から取得すること

7. When MAIMLファイルのダウンロードに失敗した場合、the 進捗データ取得APIは500 Internal Server Errorステータスコードとエラーメッセージを返却すること

---

### Requirement 5: データ取得とレスポンス生成

**目的**: 開発者として、効率的なデータ取得とレスポンス生成により、パフォーマンスを最適化したい。

#### Acceptance Criteria

1. When タスク基本情報を取得する場合、the 進捗データ取得APIはproject_taskテーブルとprojectテーブルをJOINして1クエリで取得すること

2. When トランジションごとの実験記録を取得する場合、the 進捗データ取得APIはPromise.allを使用して並列処理すること

3. When 実験記録の最新ステータスを取得する場合、the 進捗データ取得APIはupdate_atでDESCソートし、executeTakeFirstで最新レコードのみを取得すること

4. When 実験記録のデータ件数を取得する場合、the 進捗データ取得APIはdb.fn.countを使用してカウントクエリを実行すること

5. When 全体進捗を計算する場合、the 進捗データ取得APIはcompleted、in_progress、not_startedの各カウントを正確に算出すること

6. When overall_percentageを計算する場合、the 進捗データ取得APIは全トランジションの進捗率の合計をトランジション数で除算し、小数点第1位に丸めること

7. When レスポンスデータを生成する場合、the 進捗データ取得APIは統一レスポンス形式（success, data, meta）に従うこと

---

### Requirement 6: エラーハンドリング

**目的**: ユーザーとして、エラーが発生した場合に明確なエラーメッセージを受け取ることで、問題を理解し対処できるようにしたい。

#### Acceptance Criteria

1. When リクエストパラメータのバリデーションに失敗した場合、the 進捗データ取得APIは400 Bad Requestステータスコードと具体的なエラーメッセージを返却すること

2. When projectIdがUUID形式でない場合、the 進捗データ取得APIは400 Bad Requestステータスコードを返却すること

3. When taskNoが整数でない場合、the 進捗データ取得APIは400 Bad Requestステータスコードを返却すること

4. When 指定されたタスクが存在しない場合、the 進捗データ取得APIは404 Not Foundステータスコードと「タスクが見つかりません」エラーメッセージを返却すること

5. When 指定されたプロジェクトが存在しない場合、the 進捗データ取得APIは404 Not Foundステータスコードと「プロジェクトが見つかりません」エラーメッセージを返却すること

6. When データベース接続エラーが発生した場合、the 進捗データ取得APIは500 Internal Server Errorステータスコードを返却し、詳細エラーをログに記録すること

7. When エラーレスポンスを返却する場合、the 進捗データ取得APIは統一エラーレスポンス形式（success: false, error: {code, message, details}, meta）に従うこと

8. If 予期しない例外が発生した場合、then the 進捗データ取得APIは汎用的なエラーメッセージを返却し、スタックトレースをクライアントに公開しないこと

---

### Requirement 7: ログ記録と監査

**目的**: システム管理者として、APIアクセスログと監査ログを記録することで、トラブルシューティングとセキュリティ監査を実施できるようにしたい。

#### Acceptance Criteria

1. When APIリクエストが受信される場合、the 進捗データ取得APIはリクエストID、タイムスタンプ、ユーザーID、organizationIdをログに記録すること

2. When APIレスポンスが返却される場合、the 進捗データ取得APIはレスポンスステータスコード、処理時間をログに記録すること

3. When データベースクエリが実行される場合、the 進捗データ取得APIはクエリ実行時間をデバッグログに記録すること

4. When エラーが発生した場合、the 進捗データ取得APIはエラーレベルログにエラー詳細、スタックトレース、コンテキスト情報を記録すること

5. When MAIMLファイルがダウンロードされる場合、the 進捗データ取得APIはファイルパスとファイルサイズを情報ログに記録すること

6. The 進捗データ取得APIはWinstonロガーを使用してログを記録すること

---

### Requirement 8: パフォーマンスと最適化

**目的**: 開発者として、APIレスポンス時間を最適化することで、ユーザーエクスペリエンスを向上させたい。

#### Acceptance Criteria

1. When 複数のトランジションの実験記録を取得する場合、the 進捗データ取得APIは並列処理（Promise.all）を使用して処理時間を短縮すること

2. When データベースクエリを実行する場合、the 進捗データ取得APIは必要なカラムのみをSELECTし、不要なデータ取得を避けること

3. When JOINクエリを実行する場合、the 進捗データ取得APIは適切なインデックスが使用されるようクエリを最適化すること

4. When レスポンスサイズが大きくなる場合、the 進捗データ取得APIは不要な冗長データを除外すること

5. The 進捗データ取得APIは通常のリクエストに対して1秒以内にレスポンスを返却すること（目標値）

6. The 進捗データ取得APIはデータベース接続プールを使用して接続オーバーヘッドを削減すること

---

### Requirement 9: データ整合性

**目的**: データ管理者として、返却されるデータの整合性が保証されることで、正確な進捗管理を実現したい。

#### Acceptance Criteria

1. When トランジションのステータスがcompletedの場合、the 進捗データ取得APIはprogressを100に設定すること

2. When トランジションのステータスがnot_startedの場合、the 進捗データ取得APIはprogressを0に設定すること

3. When 実験記録テーブルにデータが存在しない場合、the 進捗データ取得APIはステータスを「not_started」、progressを0、last_updatedをnullに設定すること

4. When データカウントが実行される場合、the 進捗データ取得APIは削除済みレコードを除外してカウントすること

5. When 全体進捗率が計算される場合、the 進捗データ取得APIはトランジション数が0の場合は0を返却すること

6. When レスポンスにタイムスタンプを含める場合、the 進捗データ取得APIはISO 8601形式（YYYY-MM-DDTHH:mm:ssZ）を使用すること

---

### Requirement 10: API仕様準拠

**目的**: 開発者として、統一されたAPI設計原則に従うことで、一貫性のあるAPI体験を提供したい。

#### Acceptance Criteria

1. The 進捗データ取得APIはHTTP GETメソッドを使用すること

2. The 進捗データ取得APIはRESTful URLパターン（/api/v1/progress/:projectId/:methodId/:taskNo）に従うこと

3. The 進捗データ取得APIは成功時に200 OKステータスコードを返却すること

4. The 進捗データ取得APIはContent-Typeヘッダーに「application/json」を設定すること

5. The 進捗データ取得APIはCORSヘッダーを適切に設定すること

6. The 進捗データ取得APIはレスポンスにX-Request-Idヘッダーを含めること

7. The 進捗データ取得APIはリクエストメタデータ（timestamp, requestId）をレスポンスのmetaオブジェクトに含めること

8. The 進捗データ取得APIはキャメルケースではなくスネークケースを使用してJSONキーを命名すること

---

## Non-Functional Requirements

### セキュリティ
- すべてのデータベースクエリはParameterized Queriesを使用してSQLインジェクションを防止すること
- エラーメッセージには機密情報（内部パス、データベース構造など）を含めないこと
- JWTトークンの有効期限を適切に検証すること

### 可用性
- APIの可用性目標を99.9%とすること
- データベース接続失敗時は適切なリトライロジックを実装すること

### 拡張性
- 新しいトランジションステータスが追加されても対応可能な設計とすること
- 新しい進捗計算ロジックを追加可能なアーキテクチャとすること

### 保守性
- コードは適切にモジュール化し、Controller/Service/Repositoryパターンに従うこと
- ユニットテストでコードカバレッジ70%以上を達成すること

---

## Dependencies

### 外部依存
- **S3/Swift Storage**: MAIMLファイルのダウンロード
- **PostgreSQLデータベース**: project_task, experiment_record, projectテーブル
- **MAIMLパーサー**: parseMultipleMethodsStructure関数

### 内部依存
- **認証ミドルウェア**: authMiddleware
- **権限チェックミドルウェア**: permissionCheck
- **ストレージサービス**: storageService.downloadFile

---

## Glossary

| 用語 | 定義 |
|------|------|
| トランジション | Petri Netにおける実験手順の各ステップを表す要素 |
| メソッド | 実験の手法・手順を定義する単位（MAIMLファイル内で定義） |
| タスク | 実験作業者に割り当てられる作業単位 |
| MAIML | Materials Informatics Markup Language（材料情報記述言語） |
| 全体進捗率 | すべてのトランジションの進捗率の平均値 |
| マルチテナント分離 | 組織ごとにデータを完全に分離するセキュリティ機能 |
