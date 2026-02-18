# Requirements Document

## Project Description (Input)
実験作業者画面の実験データ保存を行うバックエンドの機能を実装する。

詳細な仕様については以下を参照してください：
- [API仕様書](../../../design/api/api_experiment_data.md) - 実験データ記録APIの詳細設計（v2.1.0）

**API一覧:**
1. **実験データ一括保存API** (POST)
   - エンドポイント: `/api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data`
   - 複数プレースの実験データを一括保存
   
2. **トランジションステータス更新API** (PUT)
   - エンドポイント: `/api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status`
   - トランジションのステータスと進捗率を更新

---

## Introduction

本ドキュメントは、実験作業者が実験データを記録・管理するためのバックエンドAPI機能の要件を定義します。実験データの一括保存、トランジションステータスの更新、およびそれらに関連するセキュリティ・トランザクション管理を含みます。

### 対象機能
- **実験データ一括保存API**: 複数プレースの実験データを一括で保存
- **トランジションステータス更新API**: トランジションの進捗状況を更新

### 対象ユーザー
- **実験作業者（Worker）**: 実験データの記録とステータス更新
- **実験管理者（Manager）**: 上記機能に加え、データ確認・承認
- **システム管理者（Admin）**: 全権限

---

## Requirements

### Requirement 1: 実験データ一括保存

**Objective:** 実験作業者として、複数のプレースに対する実験データ（Material、Condition、Result）を一度に保存したい。これにより、データ入力の効率を向上させ、データの整合性を保証する。

#### Acceptance Criteria

1. When 実験作業者が有効なJWTトークンとorganization_idを含むリクエストを送信した場合, the Experiment Data Service shall 認証・認可チェックを実行し、Worker以上の権限を持つユーザーのみアクセスを許可する

2. When リクエストボディに1件以上のrecords配列が含まれている場合, the Experiment Data Service shall 各レコードのバリデーションを実行し、すべてが有効な場合のみ処理を継続する

3. The Experiment Data Service shall パスパラメータとしてprojectId（UUID形式）、methodId（文字列）、taskNo（1以上の整数）を受け取る

4. When 各レコードにplaceId、templateType、templateId、dataフィールドが含まれている場合, the Experiment Data Service shall それらの必須フィールドが存在することを検証する

5. When templateTypeが指定されている場合, the Experiment Data Service shall その値が"material"、"condition"、"result"のいずれかであることを検証する

6. When statusが指定されている場合, the Experiment Data Service shall その値が"initial"、"preparing"、"ready"、"running"、"paused"、"completed"、"error"のいずれかであることを検証する

7. When commentが指定されている場合, the Experiment Data Service shall その長さが2000文字以内であることを検証する

8. When バリデーションが完了した後, the Experiment Data Service shall 指定されたprojectIdが自組織に属し、ステータスが編集可能（draft/active/waiting_approval）であることを確認する

9. If プロジェクトステータスがarchived または completedの場合, then the Experiment Data Service shall HTTPステータスコード403でエラーレスポンスを返す

10. When プロジェクトステータスが編集可能である場合, the Experiment Data Service shall 指定されたtaskNoが該当プロジェクトに属することを確認する

11. If taskNoが存在しない または 別の組織に属する場合, then the Experiment Data Service shall HTTPステータスコード404でエラーレスポンスを返す

12. When すべての事前チェックが完了した場合, the Experiment Data Service shall records配列の各要素に対してtemplate_dataテーブルへのUPSERT操作を実行する

13. The Experiment Data Service shall 一意キー(organization_id, project_id, method_id, task_no, place_id)で既存レコードを検索し、存在する場合は更新、存在しない場合は新規作成する

14. The Experiment Data Service shall dataフィールドをJSONB形式でデータベースに保存する

15. The Experiment Data Service shall recorded_byフィールドに現在のユーザーIDを設定し、recorded_atフィールドに現在時刻を設定する

16. The Experiment Data Service shall すべてのINSERT/UPDATE操作を単一のデータベーストランザクション内で実行する

17. If 1件でもINSERT/UPDATE操作が失敗した場合, then the Experiment Data Service shall 全体をロールバックし、HTTPステータスコード400でエラーレスポンスを返す

18. When すべてのINSERT/UPDATE操作が成功した場合, the Experiment Data Service shall トランザクションをコミットし、HTTPステータスコード201で成功レスポンスを返す

19. The Experiment Data Service shall レスポンスに保存件数と各レコードの詳細情報（id、recordedAt、recordedBy等）を含める

20. The Experiment Data Service shall DataGrid（2次元配列）形式のデータをネストプロパティとして適切に保存する

### Requirement 2: トランザクション管理

**Objective:** システム管理者として、実験データの保存が原子性を持つことを保証したい。これにより、部分的なデータ保存によるデータ不整合を防止する。

#### Acceptance Criteria

1. The Experiment Data Service shall すべての実験データ保存操作をAll or Nothing方式で実行する

2. When トランザクションが開始された場合, the Experiment Data Service shall プロジェクトステータス確認、タスク存在確認、データ保存をすべて同一トランザクション内で実行する

3. If トランザクション内のいずれかの操作が失敗した場合, then the Experiment Data Service shall データベースへの変更を一切コミットせず、完全にロールバックする

4. When トランザクションがロールバックされた場合, the Experiment Data Service shall 失敗した操作の詳細情報をエラーレスポンスに含める

5. The Experiment Data Service shall トランザクション中にデータベース接続エラーが発生した場合、適切にロールバックを実行する

6. When 並行トランザクションが同一リソースにアクセスする場合, the Experiment Data Service shall デッドロックを検出し、適切にエラーハンドリングを実行する

### Requirement 3: トランジションステータス更新

**Objective:** 実験作業者として、トランジションの進捗状況を手動で更新したい。これにより、実験の進行状況をリアルタイムで記録できる。

#### Acceptance Criteria

1. When 実験作業者が有効なJWTトークンでステータス更新リクエストを送信した場合, the Experiment Data Service shall Worker以上の権限を持つユーザーのみアクセスを許可する

2. The Experiment Data Service shall パスパラメータとしてprojectId、methodId、taskNo、transitionIdを受け取る

3. When リクエストボディにstatusフィールドが含まれている場合, the Experiment Data Service shall その値が有効なステータス値であることを検証する

4. When progressRateが指定されている場合, the Experiment Data Service shall その値が0から100の整数であることを検証する

5. When statusが"completed"の場合, the Experiment Data Service shall progressRateを自動的に100に設定する

6. When 指定されたtransitionIdが該当プロジェクト・メソッド・タスクに属することが確認された場合, the Experiment Data Service shall transition_dataテーブルのレコードを更新する

7. The Experiment Data Service shall updated_byフィールドに現在のユーザーIDを設定し、updated_atフィールドに現在時刻を設定する

8. When ステータス更新が成功した場合, the Experiment Data Service shall maiml_event_logテーブルにイベント履歴を記録する

9. The Experiment Data Service shall イベントログにorganization_id、project_id、sequence_no（自動採番）、更新内容（JSON形式）を含める

10. When イベントログの記録が完了した場合, the Experiment Data Service shall HTTPステータスコード200で更新後のトランジション情報を返す

11. While プロジェクトステータスが編集可能である場合, the Experiment Data Service shall ステータス更新操作を許可する

12. If プロジェクトステータスがarchived または completedの場合, then the Experiment Data Service shall HTTPステータスコード403でエラーを返す

### Requirement 4: マルチテナント分離

**Objective:** システム管理者として、組織間のデータが完全に分離されることを保証したい。これにより、セキュリティとプライバシーを確保する。

#### Acceptance Criteria

1. The Experiment Data Service shall すべてのAPIリクエストでorganization_idの検証を必須とする

2. When データベースクエリを実行する場合, the Experiment Data Service shall WHERE句にorganization_idフィルタを必ず含める

3. The Experiment Data Service shall リクエストユーザーのorganization_idと異なるorganization_idのデータへのアクセスを拒否する

4. When JOINクエリを実行する場合, the Experiment Data Service shall 参加するすべてのテーブルでorganization_idフィルタを適用する

5. The Experiment Data Service shall tenantIsolationミドルウェアを使用してorganization_idをreq.organizationIdに格納する

6. If リクエストにorganization_idが含まれていない場合, then the Experiment Data Service shall HTTPステータスコード400でエラーを返す

7. The Experiment Data Service shall System Adminロールを持つユーザーのみ、複数組織のデータにアクセスできるようにする

8. When S3操作を実行する場合, the Experiment Data Service shall すべてのファイルパスにorg_{organization_id}プレフィックスを含める

### Requirement 5: 入力バリデーション

**Objective:** 開発者として、すべての入力データが適切に検証されることを保証したい。これにより、セキュリティ脆弱性とデータ不整合を防止する。

#### Acceptance Criteria

1. The Experiment Data Service shall すべてのパスパラメータとリクエストボディパラメータにバリデーションを適用する

2. When projectIdが指定されている場合, the Experiment Data Service shall それがUUID v4形式であることを検証する

3. When methodIdが指定されている場合, the Experiment Data Service shall それが空文字列でないことを検証する

4. When taskNoが指定されている場合, the Experiment Data Service shall それが1以上の整数であることを検証する

5. When records配列が指定されている場合, the Experiment Data Service shall それが1件以上の要素を含むことを検証する

6. The Experiment Data Service shall すべてのSQLクエリでParameterized Queriesを使用し、SQLインジェクションを防止する

7. When JSONB型データを保存する場合, the Experiment Data Service shall JSON形式として有効であることを検証する

8. The Experiment Data Service shall 文字列型フィールドの最大長制限を強制する

9. If バリデーションエラーが発生した場合, then the Experiment Data Service shall HTTPステータスコード400でエラー詳細を含むレスポンスを返す

10. The Experiment Data Service shall XSS攻撃を防ぐため、ユーザー入力のサニタイゼーションを実行する

### Requirement 6: 認証と認可

**Objective:** セキュリティ管理者として、適切な権限を持つユーザーのみがAPIにアクセスできることを保証したい。これにより、不正アクセスを防止する。

#### Acceptance Criteria

1. The Experiment Data Service shall すべてのエンドポイントでJWT認証を必須とする

2. When JWTトークンが無効 または 期限切れの場合, then the Experiment Data Service shall HTTPステータスコード401でエラーを返す

3. The Experiment Data Service shall authミドルウェアを使用してJWTトークンを検証し、ユーザー情報をreq.userに格納する

4. When ユーザー権限を検証する場合, the Experiment Data Service shall permissionCheckミドルウェアを使用する

5. The Experiment Data Service shall 実験データ保存APIにWorker、Manager、Adminのいずれかの権限を要求する

6. The Experiment Data Service shall トランジションステータス更新APIにWorker、Manager、Adminのいずれかの権限を要求する

7. If ユーザーが必要な権限を持たない場合, then the Experiment Data Service shall HTTPステータスコード403でエラーを返す

8. When セッション検証に失敗した場合, the Experiment Data Service shall HTTPステータスコード401でエラーを返す

9. The Experiment Data Service shall ミドルウェアチェーン（auth → tenantIsolation → permissionCheck）を正しい順序で適用する

### Requirement 7: エラーハンドリング

**Objective:** 開発者として、すべてのエラーが一貫した形式で処理されることを保証したい。これにより、クライアント側でのエラー処理を容易にする。

#### Acceptance Criteria

1. The Experiment Data Service shall 統一されたエラーレスポンス形式を使用する

2. The Experiment Data Service shall エラーレスポンスにsuccess（false）、error（code、message、details）、meta（timestamp、requestId）フィールドを含める

3. When バリデーションエラーが発生した場合, the Experiment Data Service shall エラーコード"VALIDATION_ERROR"とHTTPステータスコード400を返す

4. When 認証エラーが発生した場合, the Experiment Data Service shall エラーコード"AUTH_TOKEN_EXPIRED"またはそれに相当するコードとHTTPステータスコード401を返す

5. When 認可エラーが発生した場合, the Experiment Data Service shall エラーコード"PERMISSION_INSUFFICIENT"とHTTPステータスコード403を返す

6. When リソースが見つからない場合, the Experiment Data Service shall エラーコード"RESOURCE_NOT_FOUND"とHTTPステータスコード404を返す

7. When データベースエラーが発生した場合, the Experiment Data Service shall エラーコード"SYSTEM_DATABASE_ERROR"とHTTPステータスコード500を返す

8. The Experiment Data Service shall エラーメッセージに機密情報（パスワード、トークン、内部パス等）を含めない

9. The Experiment Data Service shall すべてのエラーをwinstonロガーを使用してログファイルに記録する

10. The Experiment Data Service shall エラーログにスタックトレース、リクエストパス、ユーザーID、organization_IDを含める

### Requirement 8: レスポンス形式

**Objective:** フロントエンド開発者として、一貫したレスポンス形式でデータを受け取りたい。これにより、クライアント側の実装を簡素化する。

#### Acceptance Criteria

1. The Experiment Data Service shall すべての成功レスポンスに統一された形式を使用する

2. The Experiment Data Service shall レスポンスにsuccess（true）、data、meta（timestamp、requestId）フィールドを含める

3. When 実験データ一括保存が成功した場合, the Experiment Data Service shall HTTPステータスコード201を返す

4. When トランジションステータス更新が成功した場合, the Experiment Data Service shall HTTPステータスコード200を返す

5. The Experiment Data Service shall dataフィールドに保存されたレコードの完全な情報を含める

6. The Experiment Data Service shall レスポンスのtimestampフィールドにISO 8601形式の現在時刻を設定する

7. The Experiment Data Service shall レスポンスのrequestIdフィールドに一意のリクエスト識別子を設定する

8. The Experiment Data Service shall Content-Typeヘッダーを"application/json"に設定する

9. The Experiment Data Service shall JSONレスポンスのキー名にcamelCaseを使用する

10. When 一括保存レスポンスを返す場合, the Experiment Data Service shall 保存件数（saved）と各レコードの配列（records）を含める

### Requirement 9: パフォーマンスと最適化

**Objective:** システム管理者として、APIが適切なパフォーマンスで動作することを保証したい。これにより、ユーザーエクスペリエンスを向上させる。

#### Acceptance Criteria

1. The Experiment Data Service shall template_dataテーブルの一意キー(organization_id, project_id, method_id, task_no, place_id)にインデックスを使用する

2. The Experiment Data Service shall JSONB型のdataカラムにGINインデックスを使用する

3. The Experiment Data Service shall PostgreSQL接続プールを使用し、最大接続数を20に設定する

4. The Experiment Data Service shall N+1クエリ問題を回避するため、必要に応じてJOINまたはバッチ取得を使用する

5. When 大量のrecords配列を処理する場合, the Experiment Data Service shall バッチINSERT/UPDATEを効率的に実行する

6. The Experiment Data Service shall 不要なデータベースクエリを実行しない

7. The Experiment Data Service shall データベース接続のタイムアウトを2秒に設定する

8. The Experiment Data Service shall データベースクエリのレスポンスタイムを監視し、遅いクエリをログに記録する

### Requirement 10: 監査とロギング

**Objective:** 監査担当者として、すべてのデータ変更操作が記録されることを保証したい。これにより、セキュリティインシデントの調査とコンプライアンスを実現する。

#### Acceptance Criteria

1. When トランジションステータスが更新された場合, the Experiment Data Service shall maiml_event_logテーブルにイベントを記録する

2. The Experiment Data Service shall イベントログにevent_type、method_id、task_no、transition_id、status、progress_rate、updated_byを含める

3. The Experiment Data Service shall sequence_noを(organization_id, project_id)単位で自動採番する

4. The Experiment Data Service shall イベントログデータをJSONB形式でlogカラムに格納する

5. The Experiment Data Service shall すべてのAPI呼び出しをwinstonロガーを使用してログファイルに記録する

6. The Experiment Data Service shall ログにリクエストパス、HTTPメソッド、ステータスコード、レスポンスタイム、ユーザーID、organization_idを含める

7. The Experiment Data Service shall ログファイルを日次でローテーションし、最大14日間保存する

8. The Experiment Data Service shall 機密情報（パスワード、トークン）をログに記録しない

9. When データベースエラーが発生した場合, the Experiment Data Service shall エラーレベルでログを記録し、スタックトレースを含める

10. The Experiment Data Service shall 本番環境ではログをAWS CloudWatch Logsに送信する

---

## Non-Functional Requirements

### セキュリティ要件
- すべてのAPIエンドポイントでHTTPS通信を必須とする
- JWTトークンの有効期限をロール別に設定する（Admin: 48時間、Manager: 24時間、Worker: 12時間）
- レート制限を実装し、POST/PUTリクエストを50回/分/ユーザーに制限する
- セキュリティヘッダー（X-Content-Type-Options、X-Frame-Options等）を自動付与する

### 可用性要件
- API可用性99.5%以上を目標とする
- データベース接続障害時は適切なエラーメッセージを返す
- タイムアウト時間を適切に設定する（データベース: 2秒、API: 30秒）

### 拡張性要件
- 将来的な機能追加に対応できる柔軟なアーキテクチャを採用する
- API バージョニング（/api/v1）をサポートする
- 後方互換性を維持しながら変更を行う

### テスタビリティ要件
- すべてのサービス層にユニットテストを実装する
- 主要なAPIエンドポイントに統合テストを実装する
- テストカバレッジ80%以上を目標とする

---

## Constraints

### 技術的制約
- Node.js 18以上、TypeScript、Express.jsを使用する
- PostgreSQL 18以上をデータベースとして使用する
- Kysely（TypeScript Query Builder）をデータベースアクセスに使用する
- AWS S3をファイルストレージとして使用する

### ビジネス制約
- プロジェクトステータスがarchived/completedの場合、データ編集を禁止する
- マルチテナント分離を厳格に適用し、System Admin以外はクロステナントアクセスを禁止する

### 運用制約
- 既存のミドルウェアチェーン（auth → tenantIsolation → permissionCheck）を使用する
- 統一されたエラーレスポンス形式を使用する
- 既存のログ基盤（Winston + Daily Rotate File）を使用する

---

## Dependencies

### 内部依存
- 認証システム（JWT + Session Hybrid）
- テナント分離システム
- 権限管理システム（RBAC）
- ロギングシステム（Winston）

### 外部依存
- PostgreSQLデータベース
- AWS S3（ファイルストレージ）
- AWS CloudWatch Logs（本番環境ログ）

### データベーステーブル依存
- template_data（主テーブル）
- transition_data（ステータス管理）
- maiml_event_log（イベント履歴）
- projects（プロジェクト情報）
- project_task（タスク情報）
- organization（組織情報）
- users（ユーザー情報）

---

## Related Documents

### 設計書
- [API仕様書](../../../design/api/api_experiment_data.md) - 実験データ記録APIの詳細設計（v2.1.0）
- [API一覧](../../../design/api/api_list.md) - 全API一覧と実装状態
- [データベース構造](../../../design/db/db_table_list.md) - テーブル定義

### UI設計書（使用側）
- [実験データ記録ダイアログ](../../../design/ui/ui_data_record_dialog.md) - データ記録UI
- [実験記録タブ](../../../design/ui/ui_experiment_record_tab.md) - 実験記録メイン画面
- [トランジション一覧](../../../design/ui/ui_transition_list.md) - トランジションリスト表示

### 規約・ガイドライン
- [API設計ポリシー](../../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../../.clinerules/development/security.md) - セキュリティ要件

---

## Glossary

- **UPSERT**: INSERT or UPDATEの略。レコードが存在しない場合は新規作成、存在する場合は更新する操作
- **All or Nothing**: すべての操作が成功するか、すべて失敗するかのいずれか（トランザクションの原子性）
- **JSONB**: PostgreSQLのバイナリJSON型。GINインデックスによる高速検索が可能
- **Parameterized Query**: パラメータ化されたクエリ。SQLインジェクション対策として必須
- **Pre-signed URL**: 一時的なアクセス権限を持つ署名付きURL。S3アクセス制御に使用
- **EARS**: Easy Approach to Requirements Syntax。要件記述の標準フォーマット
- **placeId**: Petri Netにおけるプレース（状態）の識別子。トランジション前後の状態を表す
- **records配列**: 複数プレースのデータを一括保存するための配列構造

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 3.0.0 | 2026-02-17 | api_experiment_data.md v2.1.0に準拠した全面改訂 | Cline |
| | | - APIエンドポイント更新（パスパラメータ化） | |
| | | - Project Descriptionセクション更新 | |
| | | - 用語集追加（placeId, records配列） | |
| | | - 変更履歴セクション追加 | |
| 2.0.0 | 2026-02-17 | 大規模仕様変更（未実装） | - |
| | | - テーブル変更: experiment_records → template_data | |
| | | - パラメータ変更: taskId (UUID) → taskNo (integer) | |
| | | - パラメータ追加: placeId（必須） | |
| | | - 一括保存対応: records配列による複数データ保存 | |
| 1.0.0 | 2026-01-XX | 初版作成 | - |
| | | - 実験データ記録API要件定義 | |

**注記:** v2.0.0の変更内容は[api_experiment_data.md](../../../design/api/api_experiment_data.md)の変更履歴に記載されていますが、requirements.mdには未反映でした。v3.0.0で完全に同期しました。
