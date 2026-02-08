# Requirements Document

## Project Description (Input)
実験作業者画面のプロジェクト選択コンボボックスに表示するプロジェクト一覧を取得する機能を実装したい。
仕様の部分についてはdocs/design/api/api_project_management.mdの2.16実験作業者用プロジェクト一覧取得を確認してください。

## Introduction

本仕様は、実験作業者画面のプロジェクト選択コンボボックスに表示するプロジェクト一覧を取得するAPIの要件を定義します。実験作業者は実験作業が実施できるプロジェクトから作業するものを選択し、各プロジェクトの進捗状況を確認できます。

**対象API**: `GET /api/v1/projects/worker-accessible`

**主な用途**: 実験作業者画面のプロジェクト選択UI（コンボボックス、セレクトボックス）

**技術スタック**:
- Backend: Node.js 18+, Express.js, TypeScript, PostgreSQL
- 認証: JWT + Session Hybrid
- アーキテクチャ: マルチテナントシステム、RBAC

## Requirements

### Requirement 1: アクセス可能なプロジェクト一覧の取得

**Objective:** 実験作業者として、自分がアクセス可能なプロジェクトの一覧を取得したい。これにより、作業対象のプロジェクトを選択できる。

#### Acceptance Criteria

1. When 実験作業者がプロジェクト一覧APIを呼び出す, the Worker Project API shall 自分に少なくとも1つのタスクが割り当てられているプロジェクトのみを返却する
2. While プロジェクトステータスが `pending`, `in_progress`, `review_waiting` のいずれかである, the Worker Project API shall そのプロジェクトを一覧に含める
3. The Worker Project API shall 各プロジェクトに以下の基本情報を含める:
   - プロジェクトID（project_id）
   - プロジェクト名（project_name）
   - 説明（description）
   - プロジェクトステータス（project_status）
4. When 実験管理者またはシステム管理者がAPIを呼び出す, the Worker Project API shall すべてのアクセス可能なプロジェクトを返却する

### Requirement 2: 日時情報の提供

**Objective:** 実験作業者として、プロジェクトの作成日時と更新日時を確認したい。これにより、プロジェクトの新しさや更新状況を把握できる。

#### Acceptance Criteria

1. The Worker Project API shall 各プロジェクトに作成日時（created_at）を含める
2. The Worker Project API shall 各プロジェクトに更新日時（updated_at）を含める
3. The Worker Project API shall 日時をISO 8601形式（UTC）で返却する
4. The Worker Project API shall 日時を `YYYY-MM-DDTHH:mm:ss.sssZ` 形式で返却する

### Requirement 3: フィルタリング機能

**Objective:** 実験作業者として、プロジェクトをステータスで絞り込みたい。これにより、進行中のプロジェクトのみを表示するなど、効率的にプロジェクトを選択できる。

#### Acceptance Criteria

1. When `status` クエリパラメータが指定される, the Worker Project API shall 指定されたステータスのプロジェクトのみを返却する
2. The Worker Project API shall 以下のステータス値をサポートする: `pending`, `in_progress`, `review_waiting`
3. When `status` パラメータが未指定である, the Worker Project API shall デフォルトで `pending`, `in_progress`, `review_waiting` のプロジェクトを返却する
4. If 無効なステータス値が指定される, then the Worker Project API shall 400 Bad Requestエラーを返却し、有効な値を示す

### Requirement 4: ソート機能

**Objective:** 実験作業者として、プロジェクト一覧を任意の順序で並べ替えたい。これにより、最新のプロジェクトや名前順のプロジェクトから選択できる。

#### Acceptance Criteria

1. When `sort_by` パラメータが指定される, the Worker Project API shall 指定された項目でソートする
2. The Worker Project API shall 以下のソート項目をサポートする: `create_at`, `project_name`, `update_at`
3. When `order` パラメータが `asc` である, the Worker Project API shall 昇順でソートする
4. When `order` パラメータが `desc` である, the Worker Project API shall 降順でソートする
5. When `sort_by` が未指定である, the Worker Project API shall `create_at` を使用する（デフォルト）
6. When `order` が未指定である, the Worker Project API shall 降順（`desc`）を使用する（デフォルト）

### Requirement 5: ページネーション

**Objective:** 実験作業者として、多数のプロジェクトがある場合でも快適に一覧を閲覧したい。これにより、レスポンス速度を維持しながら全てのプロジェクトにアクセスできる。

#### Acceptance Criteria

1. When `page` パラメータが指定される, the Worker Project API shall 指定されたページ番号のデータを返却する
2. When `limit` パラメータが指定される, the Worker Project API shall 1ページあたりの件数を指定された値に設定する
3. When `page` が未指定である, the Worker Project API shall ページ番号を1とする（デフォルト）
4. When `limit` が未指定である, the Worker Project API shall 1ページあたり20件を返却する（デフォルト）
5. The Worker Project API shall `limit` の値を1から100の範囲に制限する
6. If `page` が1未満である, then the Worker Project API shall 400 Bad Requestエラーを返却する
7. If `limit` が範囲外である, then the Worker Project API shall 400 Bad Requestエラーを返却する
8. The Worker Project API shall レスポンスに以下のページネーション情報を含める:
   - 現在のページ番号（page）
   - 1ページあたりの件数（limit）
   - 総件数（totalItems）
   - 総ページ数（totalPages）
   - 次ページの有無（hasNext）
   - 前ページの有無（hasPrev）

### Requirement 6: 認証・認可

**Objective:** システムとして、適切な権限を持つユーザーのみがAPIにアクセスできるようにしたい。これにより、セキュリティを確保する。

#### Acceptance Criteria

1. The Worker Project API shall JWTトークンによる認証を必須とする
2. If 認証トークンが無効または期限切れである, then the Worker Project API shall 401 Unauthorizedエラーを返却する
3. The Worker Project API shall 以下のロールのアクセスを許可する: `experiment_worker`, `experiment_admin`, `system_admin`
4. If ユーザーロールが許可されたロールに含まれない, then the Worker Project API shall 403 Forbiddenエラーを返却する
5. When セッション情報からユーザー情報を取得する, the Worker Project API shall `req.user` から `userId`, `role`, `organizationId` を取得する
6. The Worker Project API shall ミドルウェアチェーン（auth → permissionCheck）を適用する

### Requirement 7: マルチテナント分離

**Objective:** システムとして、組織間のデータを完全に分離したい。これにより、他組織のデータへの不正アクセスを防止する。

#### Acceptance Criteria

1. The Worker Project API shall すべてのデータベースクエリに `organization_id` フィルタを必須で含める
2. The Worker Project API shall `req.user.organizationId` から組織IDを取得する
3. The Worker Project API shall 自組織のプロジェクトのみを返却する
4. If `organization_id` が取得できない, then the Worker Project API shall 401 Unauthorizedエラーを返却する
5. When System Adminロールでアクセスする, the Worker Project API shall 現在の組織のプロジェクトのみを表示する（クロステナントアクセス禁止）
6. The Worker Project API shall すべてのJOINに `organization_id` フィルタを含める

### Requirement 8: エラーハンドリング

**Objective:** システムとして、適切なエラー情報をクライアントに返したい。これにより、問題の特定と解決を容易にする。

#### Acceptance Criteria

1. If データベースエラーが発生する, then the Worker Project API shall 500 Internal Server Errorを返却し、詳細をログに記録する
2. If バリデーションエラーが発生する, then the Worker Project API shall 400 Bad Requestを返却し、エラー詳細を含める
3. The Worker Project API shall すべてのエラーレスポンスに以下の情報を含める:
   - success: false
   - error.code（エラーコード）
   - error.message（エラーメッセージ）
   - error.details（詳細情報、オプション）
   - meta.timestamp（タイムスタンプ）
   - meta.requestId（リクエストID）
4. The Worker Project API shall エラー発生時に適切なHTTPステータスコードを返却する
5. The Worker Project API shall エラーログに以下の情報を記録する: userId, organizationId, requestId, エラー詳細、スタックトレース

### Requirement 9: レスポンス形式

**Objective:** システムとして、統一されたレスポンス形式を提供したい。これにより、クライアント側の実装を簡素化し、APIの一貫性を保つ。

#### Acceptance Criteria

1. When API呼び出しが成功する, the Worker Project API shall 以下の形式でレスポンスを返却する:
   - success: true
   - data（プロジェクト配列）
   - pagination（ページネーション情報）
   - meta.timestamp（ISO 8601形式）
   - meta.requestId（UUID形式）
2. The Worker Project API shall 各プロジェクトデータをキャメルケース（camelCase）で返却する
3. The Worker Project API shall 日時データをISO 8601形式（UTC）で返却する
4. The Worker Project API shall ブール値を `true` / `false` で返却する（文字列ではない）
5. The Worker Project API shall 数値を数値型で返却する（文字列ではない）
6. The Worker Project API shall 既存の統一レスポンス形式に準拠する

### Requirement 10: パフォーマンス

**Objective:** システムとして、高速なレスポンスを提供したい。これにより、ユーザーエクスペリエンスを向上させ、コンボボックスの選択が快適になる。

#### Acceptance Criteria

1. The Worker Project API shall データベースクエリを最適化し、N+1問題を回避する
2. The Worker Project API shall 必要最小限のJOINを使用してデータを取得する
3. The Worker Project API shall インデックスを活用した効率的なクエリを実行する
4. When 大量のプロジェクトが存在する, the Worker Project API shall ページネーションにより適切なデータ量を返却する
5. The Worker Project API shall 通常時2秒以内にレスポンスを返却する
6. The Worker Project API shall プロジェクトごとの統計情報を効率的に集計する

## Non-Functional Requirements

### セキュリティ
- Parameterized Queriesを使用してSQLインジェクションを防止
- JWTトークンの検証を必須とする
- セッション管理でユーザー情報を安全に取得
- マルチテナント分離を徹底

### 監査
- すべてのAPI呼び出しをログに記録
- エラー発生時は詳細情報をログに記録
- ユーザーID、組織ID、リクエストIDを含める

### 互換性
- 既存のミドルウェアチェーン（auth → permissionCheck）に準拠
- 既存の統一レスポンス形式に準拠
- 既存のエラーコード体系に準拠

### 保守性
- TypeScriptの型定義を完全に実装
- 単体テストを実装（カバレッジ70%以上）
- APIドキュメントをOpenAPI形式で提供