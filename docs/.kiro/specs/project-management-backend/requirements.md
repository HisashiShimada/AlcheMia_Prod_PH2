# Requirements Document

## Introduction
本ドキュメントは、プロジェクト管理画面のバックエンド機能に関する要件を定義します。マルチテナント環境において、プロジェクトのライフサイクル管理、タスク管理、実験指示管理を行うためのRESTful APIを提供します。

既存のデータベーススキーマ（project、project_task、project_instruction）を活用し、TypeScript + Express.js + PostgreSQLによる実装を前提とします。

## Requirements

### Requirement 1: プロジェクト基本管理
**Objective:** 実験管理者として、プロジェクトの作成・閲覧・更新・削除を行い、実験ワークフローを効率的に管理できるようにする

#### Acceptance Criteria
1. When 実験管理者がプロジェクト作成APIを呼び出す, the Project Management Service shall 新しいプロジェクトレコードをデータベースに作成し、一意のproject_idを生成する
2. When プロジェクト作成時にproject_nameが指定されていない, the Project Management Service shall バリデーションエラー（400 Bad Request）を返す
3. While ユーザーが組織に所属している, the Project Management Service shall そのorganization_idに紐づくプロジェクトのみを取得する
4. When プロジェクト一覧取得APIが呼び出される, the Project Management Service shall ページネーション付きでプロジェクト一覧を返す（デフォルト: 20件/ページ）
5. When プロジェクト詳細取得APIが呼び出される, the Project Management Service shall 指定されたproject_idのプロジェクト情報を返す
6. If 存在しないproject_idが指定される, then the Project Management Service shall 404 Not Foundエラーを返す
7. When プロジェクト更新APIが呼び出される, the Project Management Service shall 指定されたフィールドのみを更新し、updated_atタイムスタンプを更新する
8. When プロジェクト削除APIが呼び出される, the Project Management Service shall プロジェクトレコードを論理削除または物理削除する
9. The Project Management Service shall すべてのクエリにorganization_idフィルタを含め、マルチテナント分離を保証する
10. If 他組織のプロジェクトへのアクセスが試みられる, then the Project Management Service shall 403 Forbiddenエラーを返す

### Requirement 2: プロジェクトステータス管理
**Objective:** 実験管理者として、プロジェクトの進行状況を適切に管理し、ワークフローの各段階を追跡できるようにする

#### Acceptance Criteria
1. The Project Management Service shall プロジェクトステータスとして以下の状態をサポートする（project_status: 0=未開始, 1=進行中, 2=一時停止, 3=完了, 4=中止）
2. When プロジェクトステータス更新APIが呼び出される, the Project Management Service shall ステータスの妥当性を検証し、不正な値の場合はバリデーションエラーを返す
3. When プロジェクトステータスが更新される, the Project Management Service shall 更新履歴をログに記録する
4. When プロジェクト一覧取得時にステータスフィルタが指定される, the Project Management Service shall 指定されたステータスのプロジェクトのみを返す
5. The Project Management Service shall checkout_status（チェックアウトステータス）をサポートし、プロジェクトの排他制御を行う
6. When プロジェクトがチェックアウトされている, the Project Management Service shall 他のユーザーによる編集を防止する

### Requirement 3: プロジェクトタスク管理
**Objective:** 実験管理者として、プロジェクトに紐づくタスク（メソッド）を管理し、実験の構造を定義できるようにする

#### Acceptance Criteria
1. When タスク作成APIが呼び出される, the Project Management Service shall project_taskテーブルに新しいタスクレコードを作成する
2. The Project Management Service shall タスクのmethod_idをユニークキーとして扱い、重複を防ぐ
3. When タスク一覧取得APIが呼び出される, the Project Management Service shall 指定されたproject_idに紐づくすべてのタスクを返す
4. When タスク取得時にexperiment_orderが指定されている, the Project Management Service shall 実験順序でソートされたタスクリストを返す
5. When タスク更新APIが呼び出される, the Project Management Service shall task_name、experiment_order、experiment_condition、attempts_countを更新する
6. When タスク削除APIが呼び出される, the Project Management Service shall タスクレコードを削除する
7. If タスク削除時に関連する実験記録が存在する, then the Project Management Service shall 依存関係エラー（409 Conflict）を返す
8. The Project Management Service shall タスクのattests_count（試行回数）を管理し、実験の進捗を追跡する

### Requirement 4: プロジェクト指示管理
**Objective:** 実験管理者として、実験作業者に対する指示を作成・管理し、タスク単位またはトランジション単位で詳細な指示を提供できるようにする

#### Acceptance Criteria
1. When 指示作成APIが呼び出される, the Project Management Service shall project_instructionテーブルに新しい指示レコードを作成し、experiment_instruction_idを生成する
2. The Project Management Service shall 指示対象（instruction_target）として以下をサポートする（1=ファイル全体、2=タスク、3=トランジション）
3. When 指示作成時にinstruction_targetが指定される, the Project Management Service shall 対応するtask_noまたはtransition_idの妥当性を検証する
4. When 指示一覧取得APIが呼び出される, the Project Management Service shall 指定されたproject_idに紐づくすべての指示を返す
5. When 指示取得時にinstruction_targetでフィルタリングが指定される, the Project Management Service shall 指定された対象の指示のみを返す
6. When 指示更新APIが呼び出される, the Project Management Service shall instructions（指示内容）、priority（優先度）、type（タイプ）を更新する
7. When 指示が作成される, the Project Management Service shall instruction_user_idに現在のユーザーIDを設定し、instruction_dateに現在のタイムスタンプを記録する
8. The Project Management Service shall 指示の優先度（priority）をサポートし、ソート機能を提供する
9. When 指示削除APIが呼び出される, the Project Management Service shall 指示レコードを削除する

### Requirement 5: プロジェクトMAIML連携
**Objective:** 実験管理者として、プロジェクトにMAIMLファイルを関連付け、Petri Net形式の実験ワークフローを管理できるようにする

#### Acceptance Criteria
1. The Project Management Service shall project_maiml_flgフィールドを管理し、MAIMLファイルの有無を追跡する
2. When プロジェクトにMAIMLファイルがアップロードされる, the Project Management Service shall project_maiml_flgをtrueに設定する
3. When MAIMLファイルが削除される, the Project Management Service shall project_maiml_flgをfalseに設定する
4. When プロジェクト詳細取得時にMAIMLファイルが存在する, the Project Management Service shall MAIMLファイルのメタデータ（ファイル名、サイズ、最終更新日）を含める
5. The Project Management Service shall MAIMLファイルのS3パスを`org_{organization_id}/projects/{project_id}/maiml/`形式で管理する
6. When MAIMLファイルアクセスAPIが呼び出される, the Project Management Service shall 署名付きURL（有効期限: 1時間）を生成して返す

### Requirement 6: セキュリティとアクセス制御
**Objective:** システム全体として、マルチテナント環境でのデータ分離とロールベースアクセス制御を保証する

#### Acceptance Criteria
1. The Project Management Service shall すべてのAPIエンドポイントで認証ミドルウェア（JWT検証）を適用する
2. The Project Management Service shall すべてのAPIエンドポイントでテナント分離ミドルウェアを適用し、organization_idを検証する
3. When APIリクエストにX-Organization-Idヘッダーが含まれない, the Project Management Service shall 400 Bad Requestエラーを返す
4. The Project Management Service shall 実験管理者（experiment_admin）ロール以上のユーザーにのみプロジェクト作成・更新・削除を許可する
5. The Project Management Service shall 実験作業者（experiment_worker）ロールのユーザーにはプロジェクトの閲覧のみを許可する
6. When System Adminロールのユーザーがアクセスする, the Project Management Service shall organization_id制限を適用せず、全組織のプロジェクトにアクセスを許可する
7. The Project Management Service shall すべてのデータベースクエリでParameterized Queryを使用し、SQLインジェクション攻撃を防ぐ
8. The Project Management Service shall レート制限（100リクエスト/分/ユーザー）を適用し、DoS攻撃を防ぐ

### Requirement 7: エラーハンドリングとロギング
**Objective:** システム全体として、適切なエラーハンドリングとロギングを実装し、問題の追跡と解決を容易にする

#### Acceptance Criteria
1. When バリデーションエラーが発生する, the Project Management Service shall 400 Bad Requestステータスコードと詳細なエラーメッセージを返す
2. When データベースエラーが発生する, the Project Management Service shall 500 Internal Server Errorステータスコードを返し、詳細をログに記録する
3. The Project Management Service shall すべてのAPIレスポンスで統一されたJSON形式を使用する（success、data/error、meta）
4. When エラーが発生する, the Project Management Service shall スタックトレースをログに記録し、ユーザーには汎用的なエラーメッセージを返す
5. The Project Management Service shall すべてのAPIリクエストにrequestIdを付与し、トレーシングを可能にする
6. The Project Management Service shall Winston loggingを使用し、構造化ログを出力する
7. The Project Management Service shall ログレベル（error、warn、info、debug）を適切に使い分ける
8. When 重要な操作（作成、更新、削除）が実行される, the Project Management Service shall 操作ログを記録する（ユーザーID、organization_id、操作内容、タイムスタンプ）

### Requirement 8: パフォーマンスと最適化
**Objective:** システム全体として、高いパフォーマンスとスケーラビリティを提供する

#### Acceptance Criteria
1. The Project Management Service shall データベースクエリで適切なインデックスを使用し、N+1問題を回避する
2. When 大量のプロジェクトを取得する, the Project Management Service shall ページネーションを使用し、1リクエストあたりの最大件数を100件に制限する
3. The Project Management Service shall 頻繁にアクセスされるマスタデータ（ステータス定義など）をメモリキャッシュする（TTL: 1時間）
4. The Project Management Service shall データベース接続プールを使用し、最大接続数を20に設定する
5. When 複数テーブルの結合クエリを実行する, the Project Management Service shall 外部SQLファイルを使用し、クエリの可読性と保守性を向上させる
6. The Project Management Service shall レスポンスサイズが大きい場合、圧縮（gzip）を適用する

### Requirement 9: APIドキュメントとテスト
**Objective:** 開発チームとして、APIの仕様を明確に文書化し、品質を保証するためのテストを実装する

#### Acceptance Criteria
1. The Project Management Service shall すべてのAPIエンドポイントでOpenAPI（Swagger）仕様を提供する
2. The Project Management Service shall 各APIエンドポイントにJSDocコメントを含め、パラメータと戻り値を明示する
3. The Project Management Service shall ユニットテスト（Jest）を実装し、コードカバレッジ70%以上を維持する
4. The Project Management Service shall 統合テストを実装し、主要なAPIフローを検証する
5. When CI/CDパイプラインが実行される, the Project Management Service shall すべてのテストが成功することを確認する

### Requirement 10: データ整合性とトランザクション
**Objective:** システム全体として、データの整合性を保証し、エラー時の適切なロールバックを実行する

#### Acceptance Criteria
1. When 複数テーブルに対する操作を含むAPI呼び出しが行われる, the Project Management Service shall データベーストランザクションを使用する
2. If トランザクション内でエラーが発生する, then the Project Management Service shall すべての変更をロールバックする
3. When プロジェクト作成時にタスクも同時に作成される, the Project Management Service shall 単一のトランザクションで両方のレコードを作成する
4. The Project Management Service shall 外部キー制約を使用し、参照整合性を保証する
5. When プロジェクト削除時に関連タスクや指示が存在する, the Project Management Service shall カスケード削除またはエラーを返す（ビジネスルールに応じて）
6. The Project Management Service shall updated_atタイムスタンプを自動更新し、楽観的ロックを可能にする