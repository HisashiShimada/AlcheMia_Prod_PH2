# Requirements Document

## Project Description (Input)
実験作業者画面の問題一覧取得を行うバックエンドの機能を実装する。

仕様の部分については
'docs\design\api\api_issue_management.md' 
の3. 問題一覧取得APIを確認してください。

## イントロダクション

本ドキュメントは、実験作業者画面における問題一覧取得APIの要件を定義します。このAPIは、プロジェクト、メソッド、タスク、トランジション単位で発生した問題を取得し、関連するコメントも含めて表示する機能を提供します。

### システムコンテキスト
- **システム名**: 問題管理システム（Issue Management System）
- **対象コンポーネント**: 問題一覧取得API
- **技術スタック**: Node.js + Express.js + PostgreSQL
- **アーキテクチャ**: RESTful API、マルチテナントシステム

### スコープ
本要件は、既存の問題管理API（`docs/design/api/api_issue_management.md`）の「3. 問題一覧取得API」のバックエンド実装を対象とします。

**対象範囲:**
- 問題一覧の取得機能（GET /api/v1/issues）
- プロジェクト・メソッド・タスク・トランジション単位のフィルタリング
- 問題に紐づくコメントの親子関係取得
- マルチテナント分離とセキュリティ制御

**対象外:**
- 問題報告API（POST /api/v1/issues）
- コメント投稿API（POST /api/v1/issues/:issueId/comments）
- 問題詳細取得API（GET /api/v1/issues/:issueId）
- 問題ステータス変更API（PATCH /api/v1/issues/:issueId/status）

## ステークホルダー

### 主要ステークホルダー
1. **実験作業者（Worker）**
   - 自分が担当する実験で発生した問題を確認したい
   - 問題の詳細とコメントのやり取りを確認したい

2. **実験管理者（Manager）**
   - プロジェクト全体の問題状況を把握したい
   - 特定のタスクやトランジションに絞って問題を確認したい

3. **システム管理者（Admin）**
   - 全組織の問題を監視したい（マルチテナント管理）

### 二次ステークホルダー
1. **フロントエンド開発チーム**
   - 問題一覧画面の実装に必要なデータ構造を取得したい

2. **QAチーム**
   - APIの動作を検証したい

## 要件

### 要件1: 問題一覧の取得
**目的:** 実験作業者として、特定のプロジェクト・メソッド・タスク・トランジションに関連する問題一覧を確認できるようにし、問題の内容とコメント履歴を把握できるようにする。

#### 受入基準
1. When クライアントがGET /api/v1/issuesを呼び出し、project_id、method_id、task_no、transition_idのクエリパラメータを指定したとき、the Issue Management Systemは指定された条件に一致する問題一覧を返す
2. When 問題一覧を取得するとき、the Issue Management Systemは各問題に紐づくコメントを親子関係として含める
3. When 問題一覧を取得するとき、the Issue Management Systemはcreated_atの降順（最新が先頭）でソートして返す
4. When 問題一覧を取得するとき、the Issue Management Systemは各問題のプロジェクト名、報告者名を含めて返す
5. When 問題一覧を取得するとき、the Issue Management Systemは各コメントの投稿者名を含めて返す
6. When コメントを取得するとき、the Issue Management Systemはsequence_noの昇順でソートして返す

### 要件2: 問題対象種別に基づくフィルタリング
**目的:** 実験管理者として、問題の対象種別（プロジェクト・タスク・トランジション）に応じて適切な条件でフィルタリングできるようにし、目的の問題を効率的に見つけられるようにする。

#### 受入基準
1. When issue_targetが'project'の問題を取得するとき、the Issue Management Systemはproject_idのみで一致判定を行う
2. When issue_targetが'task'の問題を取得するとき、the Issue Management Systemはproject_id、method_id、task_noで一致判定を行う
3. When issue_targetが'transition'の問題を取得するとき、the Issue Management Systemはproject_id、method_id、transition_idで一致判定を行う
4. When 複数の対象種別の問題が存在するとき、the Issue Management Systemは上記条件のいずれかに一致する問題をすべて返す

### 要件3: 入力パラメータのバリデーション
**目的:** システムとして、不正な入力パラメータを拒否することで、データの整合性を保ち、セキュリティを確保する。

#### 受入基準
1. When project_idがUUID形式でないとき、the Issue Management Systemは400 Bad Requestエラーを返す
2. When 必須パラメータ（project_id、method_id、task_no、transition_id）が欠けているとき、the Issue Management Systemは400 Bad Requestエラーを返す
3. When method_idが空文字列のとき、the Issue Management Systemは400 Bad Requestエラーを返す
4. When task_noが正の整数でないとき、the Issue Management Systemは400 Bad Requestエラーを返す
5. When transition_idが空文字列のとき、the Issue Management Systemは400 Bad Requestエラーを返す
6. When バリデーションエラーが発生したとき、the Issue Management Systemはエラーの詳細を含むレスポンスを返す

### 要件4: 認証と認可
**目的:** システムとして、認証されたユーザーのみがAPIを利用でき、適切な権限を持つユーザーのみがアクセスできるようにする。

#### 受入基準
1. When 認証されていないリクエストを受信したとき、the Issue Management Systemは401 Unauthorizedエラーを返す
2. When Worker、Manager、Admin以外のロールのユーザーがアクセスしたとき、the Issue Management Systemは403 Forbiddenエラーを返す
3. When 有効なJWTトークンを持つWorker以上のユーザーがアクセスしたとき、the Issue Management Systemは問題一覧を返す
4. The Issue Management Systemは、すべてのリクエストでJWT認証を必須とする
5. The Issue Management Systemは、auth → tenantIsolation → permissionCheckのミドルウェアチェーンを適用する

### 要件5: マルチテナント分離
**目的:** システムとして、組織間のデータ分離を保証し、他組織のデータへのアクセスを防ぐ。

#### 受入基準
1. The Issue Management Systemは、すべてのデータベースクエリでorganization_idフィルタを適用する
2. When ユーザーが問題一覧を取得するとき、the Issue Management Systemは自組織に属する問題のみを返す
3. When プロジェクトが存在確認を行うとき、the Issue Management Systemは自組織に属するプロジェクトのみを対象とする
4. When コメントを取得するとき、the Issue Management Systemは自組織に属する問題のコメントのみを取得する
5. If 他組織のプロジェクトIDが指定されたとき、then the Issue Management Systemは空の配列を返す（404エラーではない）

## 非機能要件

### 要件6: レスポンス形式の統一
**目的:** システムとして、すべてのAPIで統一されたレスポンス形式を使用し、クライアント側の処理を簡素化する。

#### 受入基準
1. The Issue Management Systemは、成功時に`success: true`、`data`配列、`meta`オブジェクトを含むJSON形式でレスポンスを返す
2. The Issue Management Systemは、エラー時に`success: false`、`error`オブジェクト、`meta`オブジェクトを含むJSON形式でレスポンスを返す
3. The Issue Management Systemは、`meta`オブジェクトに`timestamp`と`requestId`を含める
4. The Issue Management Systemは、エラー時に`error.code`、`error.message`、オプションで`error.details`配列を含める

### 要件7: パフォーマンス
**目的:** システムとして、大量の問題データを効率的に取得し、応答時間を最小化する。

#### 受入基準
1. The Issue Management Systemは、適切なインデックス（organization_id, project_id, status）を使用してクエリを最適化する
2. The Issue Management Systemは、1回のリクエストで問題とコメントを効率的に取得する（N+1問題の回避）
3. While 問題一覧を取得する場合、the Issue Management Systemはレスポンス時間を1秒以内に保つ（100件以下の問題）
4. The Issue Management Systemは、JOINクエリを使用してデータベースアクセス回数を最小化する

### 要件8: エラーハンドリング
**目的:** システムとして、適切なエラーメッセージとHTTPステータスコードを返し、クライアント側のエラー処理を容易にする。

#### 受入基準
1. When データベースエラーが発生したとき、the Issue Management Systemは500 Internal Server Errorを返す
2. When バリデーションエラーが発生したとき、the Issue Management Systemは400 Bad Requestとエラー詳細を返す
3. When 認証エラーが発生したとき、the Issue Management Systemは401 Unauthorizedを返す
4. When 権限エラーが発生したとき、the Issue Management Systemは403 Forbiddenを返す
5. The Issue Management Systemは、エラーメッセージに機密情報（DBスキーマ、内部パスなど）を含めない
6. The Issue Management Systemは、すべてのエラーをWinston構造化ログで記録する

### 要件9: セキュリティ
**目的:** システムとして、SQLインジェクションやXSSなどの攻撃から保護する。

#### 受入基準
1. The Issue Management Systemは、すべてのデータベースクエリでParameterized Queriesを使用する
2. The Issue Management Systemは、ユーザー入力をサニタイズしてXSS攻撃を防ぐ
3. The Issue Management Systemは、HTTPSでの通信を必須とする（本番環境）
4. The Issue Management Systemは、セキュアCookie設定（httpOnly, secure, sameSite）を使用する
5. The Issue Management Systemは、レスポンスに適切なセキュリティヘッダーを含める

## 制約条件

### 技術的制約
1. **データベース**: PostgreSQL 18以上を使用する
2. **Node.jsバージョン**: Node.js 24以上を使用する
3. **既存のミドルウェア**: auth、tenantIsolation、permissionCheckミドルウェアを使用する
4. **既存のテーブル構造**: issue、issue_comment、projects、organization_userテーブルを使用する
5. **レスポンス形式**: 既存のAPI設計ポリシー（`docs/design/api/api_list.md`）に準拠する

### 設計制約
1. **RESTful API**: GET /api/v1/issuesエンドポイントとして実装する
2. **読み取り専用**: このAPIはデータの読み取りのみを行い、更新は行わない
3. **トランザクション**: 読み取り専用のため、トランザクションは不要
4. **キャッシング**: リアルタイム性を重視し、キャッシングは実装しない

### 運用制約
1. **既存の実装**: 問題管理API（`docs/design/api/api_issue_management.md`）の仕様に従う
2. **既存のルートファイル**: backend/src/routes/issueRoutes.tsに実装する
3. **既存のサービスファイル**: backend/src/services/issueService.tsに実装する
4. **既存のコントローラー**: backend/src/controllers/issueController.tsに実装する

### データ制約
1. **必須パラメータ**: project_id、method_id、task_no、transition_idは必須
2. **データ型**: project_idはUUID、task_noは正の整数、その他は文字列
3. **ソート順**: 問題はcreated_at降順、コメントはsequence_no昇順

## トレーサビリティ

### 関連ドキュメント
- **API設計書**: `docs/design/api/api_issue_management.md` (Section 3)
- **API一覧**: `docs/design/api/api_list.md`
- **データベース構造**: `docs/design/db/db_table_list.md`
- **API設計ポリシー**: `.clinerules/development/api.md`
- **バックエンド規約**: `.clinerules/development/backend.md`
- **セキュリティ規約**: `.clinerules/development/security.md`

### 使用するデータベーステーブル
1. **issue**: 問題のメインテーブル
2. **issue_comment**: コメントテーブル
3. **projects**: プロジェクト情報（JOIN用）
4. **organization_user**: ユーザー名取得（JOIN用）

### 実装ファイルパス
- **ルート**: `backend/src/routes/issueRoutes.ts`
- **コントローラー**: `backend/src/controllers/issueController.ts`
- **サービス**: `backend/src/services/issueService.ts`
- **テスト**: `backend/tests/routes/issueRoutes.test.ts`

---

**承認記録**
- 要件生成日: 2026-02-05
- 次のステップ: 本要件書をレビューし、承認後に`/spec-design issue-list-retrieval-api -y`を実行してください





