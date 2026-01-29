# Requirements Document

## Project Description (Input)
実験作業者画面の承認依頼を行うバックエンドの機能を実装する。
仕様の部分については@docs/design/api/api_project_management.mdの2.15承認依頼を確認してください。
また、画面側の仕様については@docs\design\ui\ui_experiment_worker_main.mdを確認してください。

---

## Introduction

本要件定義書は、実験作業者が実験作業完了後に実験管理者へ承認依頼を送信するバックエンドAPI機能の要件を定義します。

### 背景
実験作業者（experiment_worker）が担当するタスクをすべて完了した際、実験管理者（experiment_admin）に対して承認を依頼する必要があります。承認依頼機能により、実験作業の完了状態を正式に通知し、承認プロセスを開始できます。

### 目的
- 実験作業完了時の承認ワークフローを自動化する
- プロジェクトステータスの整合性を保証する
- 承認依頼の監査証跡を記録する

### スコープ
本要件定義では以下を対象とします：
- 承認依頼APIエンドポイントの実装（POST /api/v1/projects/:projectId/approval-request）
- 承認依頼の前提条件検証ロジック
- プロジェクトステータスの更新処理
- マルチテナント分離とセキュリティ制御

---

## Requirements

### Requirement 1: 承認依頼の受付
**Objective:** 実験作業者として、実験作業完了後に実験管理者へ承認依頼を送信したい。これにより、作業完了を正式に通知し、承認プロセスを開始できる。

#### Acceptance Criteria
1. When 実験作業者が承認依頼を送信する, the 承認依頼API shall プロジェクトIDとオプショナルなコメントを受け付ける
2. When 承認依頼リクエストを受信する, the 承認依頼API shall 送信ユーザーの認証情報（JWT）を検証する
3. When 承認依頼リクエストを受信する, the 承認依頼API shall organization_idを自動的にセッション情報から取得する
4. When コメントが1000文字を超える, the 承認依頼API shall 400 Bad Requestエラーを返却する
5. When プロジェクトIDが不正な形式である, the 承認依頼API shall 400 Bad Requestエラーを返却する

---

### Requirement 2: 権限とアクセス制御
**Objective:** システム管理者として、承認依頼機能へのアクセスを適切なロールに制限したい。これにより、セキュリティとデータ整合性を保証できる。

#### Acceptance Criteria
1. When 認証されていないユーザーが承認依頼を送信する, the 承認依頼API shall 401 Unauthorizedエラーを返却する
2. When experiment_workerロールのユーザーが承認依頼を送信する, the 承認依頼API shall リクエストを受け付ける
3. When experiment_adminロールのユーザーが承認依頼を送信する, the 承認依頼API shall リクエストを受け付ける
4. When system_adminロールのユーザーが承認依頼を送信する, the 承認依頼API shall リクエストを受け付ける
5. While マルチテナント環境で動作している, the 承認依頼API shall 自組織のプロジェクトのみアクセス可能にする

---

### Requirement 3: プロジェクト存在確認
**Objective:** システムとして、承認依頼対象のプロジェクトが存在することを確認したい。これにより、不正なリクエストを防止できる。

#### Acceptance Criteria
1. When プロジェクトIDが指定される, the 承認依頼API shall projectテーブルからプロジェクト情報を取得する
2. When プロジェクトが存在しない, the 承認依頼API shall 404 Not Foundエラーを返却する
3. When プロジェクトが別組織に属する, the 承認依頼API shall 404 Not Foundエラーを返却する（マルチテナント分離）
4. While プロジェクト情報を取得する, the 承認依頼API shall organization_idフィルタを必須で適用する

---

### Requirement 4: プロジェクトステータス検証
**Objective:** システムとして、承認依頼可能なプロジェクトステータスを検証したい。これにより、不適切なタイミングでの承認依頼を防止できる。

#### Acceptance Criteria
1. When プロジェクトステータスが'active'である, the 承認依頼API shall 承認依頼を受け付ける
2. When プロジェクトステータスが'draft'である, the 承認依頼API shall 409 Conflictエラーを返却する
3. When プロジェクトステータスが'waiting_approval'である, the 承認依頼API shall 409 Conflictエラーを返却し「既に承認依頼が送信されています」メッセージを返す
4. When プロジェクトステータスが'approved'である, the 承認依頼API shall 409 Conflictエラーを返却する
5. When プロジェクトステータスが'archived'である, the 承認依頼API shall 409 Conflictエラーを返却する

---

### Requirement 5: プロジェクトステータス更新
**Objective:** システムとして、承認依頼送信後にプロジェクトステータスを更新したい。これにより、プロジェクトの現在状態を正確に反映できる。

#### Acceptance Criteria
1. When すべての検証を通過する, the 承認依頼API shall プロジェクトステータスを'waiting_approval'に更新する
2. When プロジェクトステータスを更新する, the 承認依頼API shall update_atタイムスタンプを現在時刻に設定する
3. When プロジェクトステータスを更新する, the 承認依頼API shall update_user_idを送信ユーザーのIDに設定する
4. While プロジェクトステータスを更新する, the 承認依頼API shall トランザクション内で実行する
5. If プロジェクトステータス更新に失敗する, the 承認依頼API shall トランザクション全体をロールバックする

---

### Requirement 6: トランザクション制御
**Objective:** システムとして、承認依頼処理の原子性を保証したい。これにより、部分的な失敗を防止し、データ整合性を維持できる。

#### Acceptance Criteria
1. When 承認依頼処理を開始する, the 承認依頼API shall データベーストランザクションを開始する
2. While トランザクション内で動作する, the 承認依頼API shall プロジェクトステータスを更新する
3. When すべての処理が成功する, the 承認依頼API shall トランザクションをコミットする
4. If いずれかの処理が失敗する, the 承認依頼API shall トランザクション全体をロールバックする
5. If データベースエラーが発生する, the 承認依頼API shall 500 Internal Server Errorを返却する

---

### Requirement 7: レスポンスの生成
**Objective:** クライアントとして、承認依頼の結果を明確に受け取りたい。これにより、ユーザーに適切なフィードバックを提供できる。

#### Acceptance Criteria
1. When 承認依頼が成功する, the 承認依頼API shall 200 OKステータスコードを返却する
2. When 承認依頼が成功する, the 承認依頼API shall 統一レスポンス形式（success: true）でレスポンスを返却する
3. When 承認依頼が成功する, the 承認依頼API shall dataフィールドにプロジェクト情報を含める（project_id, project_name, previous_status, new_status）
4. When 承認依頼が成功する, the 承認依頼API shall dataフィールドに送信者情報を含める（requested_by, requested_by_name, requested_at）
5. When 承認依頼が成功する, the 承認依頼API shall dataフィールドにコメントを含める
6. When 承認依頼が成功する, the 承認依頼API shall metaフィールドにタイムスタンプとリクエストIDを含める
7. If エラーが発生する, the 承認依頼API shall 統一エラーレスポンス形式（success: false）でレスポンスを返却する
8. If エラーが発生する, the 承認依頼API shall errorフィールドにエラーコード、メッセージ、詳細を含める

---

### Requirement 8: 監査ログの記録
**Objective:** システム管理者として、承認依頼の履歴を監査できるようにしたい。これにより、コンプライアンスとトレーサビリティを確保できる。

#### Acceptance Criteria
1. When 承認依頼が成功する, the 承認依頼API shall 監査ログを記録する
2. When 監査ログを記録する, the 承認依頼API shall プロジェクトID、プロジェクト名を含める
3. When 監査ログを記録する, the 承認依頼API shall 送信ユーザーID、組織IDを含める
4. When 監査ログを記録する, the 承認依頼API shall コメント内容を含める
5. When 監査ログを記録する, the 承認依頼API shall ログレベルを'info'に設定する

---

### Requirement 9: エラーハンドリング
**Objective:** システムとして、発生しうるエラーを適切に処理したい。これにより、ユーザーに明確なエラーメッセージを提供できる。

#### Acceptance Criteria
1. When バリデーションエラーが発生する, the 承認依頼API shall 400 Bad Requestを返却する
2. When 認証エラーが発生する, the 承認依頼API shall 401 Unauthorizedを返却する
3. When 権限エラーが発生する, the 承認依頼API shall 403 Forbiddenを返却する
4. When リソースが見つからない, the 承認依頼API shall 404 Not Foundを返却する
5. When ビジネスルール違反が発生する, the 承認依頼API shall 409 Conflictを返却する
6. When データベースエラーが発生する, the 承認依頼API shall 500 Internal Server Errorを返却し、詳細をログに記録する
7. When エラーレスポンスを返却する, the 承認依頼API shall ユーザーフレンドリーなエラーメッセージを日本語で提供する
8. When エラーレスポンスを返却する, the 承認依頼API shall スタックトレースを含めない（セキュリティ）

---

### Requirement 10: パフォーマンスと最適化
**Objective:** システムとして、承認依頼処理を効率的に実行したい。これにより、レスポンス時間を最小化できる。

#### Acceptance Criteria
1. When 承認依頼を処理する, the 承認依頼API shall 2秒以内にレスポンスを返却する（通常時）
2. When データベースクエリを実行する, the 承認依頼API shall Parameterized Queriesを使用する（SQLインジェクション対策）
3. When 複数のデータベースクエリを実行する, the 承認依頼API shall インデックスを活用して最適化する
4. While トランザクションを実行する, the 承認依頼API shall デッドロックを回避する設計とする
5. When ユーザー名を取得する, the 承認依頼API shall 必要な場合のみJOINまたは追加クエリを実行する

---

### Requirement 11: セキュリティとマルチテナント分離
**Objective:** システムとして、セキュリティとデータ分離を徹底したい。これにより、組織間のデータ漏洩を防止できる。

#### Acceptance Criteria
1. While 承認依頼を処理する, the 承認依頼API shall すべてのデータベースクエリにorganization_idフィルタを適用する
2. When プロジェクト情報を取得する, the 承認依頼API shall 自組織のプロジェクトのみ取得する
3. When 通知を作成する, the 承認依頼API shall 自組織のorganization_idを設定する
4. While リクエストを処理する, the 承認依頼API shall クロステナントアクセスを厳禁とする
5. When 機密情報を扱う, the 承認依頼API shall ログに機密情報を出力しない

---

### Requirement 12: ミドルウェアチェーン
**Objective:** システムとして、標準的なミドルウェアチェーンを適用したい。これにより、セキュリティと一貫性を保証できる。

#### Acceptance Criteria
1. When 承認依頼APIが呼び出される, the 承認依頼API shall authMiddlewareで認証を検証する
2. When authMiddlewareを通過する, the 承認依頼API shall req.userにユーザー情報（userId, organizationId, role）を格納する
3. When authMiddlewareを通過する, the 承認依頼API shall permissionCheckミドルウェアで権限を検証する
4. When permissionCheckを実行する, the 承認依頼API shall ['experiment_worker', 'experiment_admin', 'system_admin']ロールを許可する
5. When ミドルウェアチェーンを通過する, the 承認依頼API shall コントローラーハンドラーを実行する

---

### Requirement 13: API仕様への準拠
**Objective:** 開発者として、既定のAPI設計ポリシーに準拠した実装としたい。これにより、システム全体の一貫性を維持できる。

#### Acceptance Criteria
1. The 承認依頼API shall RESTful設計原則に従う（POST /api/v1/projects/:projectId/approval-request）
2. The 承認依頼API shall 統一レスポンス形式を使用する（success, data, error, meta）
3. The 承認依頼API shall HTTPステータスコードを適切に使用する
4. The 承認依頼API shall Content-Type: application/jsonでリクエスト・レスポンスを処理する
5. The 承認依頼API shall APIバージョニング（/api/v1/）を含める
6. The 承認依頼API shall エラーコード体系（VALIDATION_*, AUTH_*, PERMISSION_*, RESOURCE_*, BUSINESS_*, SYSTEM_*）に従う
7. The 承認依頼API shall レート制限（50回/分/ユーザー）の対象とする

---

## 非機能要件

### パフォーマンス
- レスポンス時間: 通常時2秒以内、ピーク時5秒以内
- 同時リクエスト処理: 最低100リクエスト/秒をサポート
- データベースクエリ最適化: インデックス活用、N+1問題の回避

### 可用性
- API稼働率: 99.9%以上
- エラーレート: 0.1%未満
- グレースフルデグラデーション: データベースエラー時も適切なエラーレスポンスを返す

### セキュリティ
- 認証: JWT + Session Hybrid認証
- 認可: RBAC（ロールベースアクセス制御）
- マルチテナント分離: 全クエリでorganization_idフィルタ必須
- SQLインジェクション対策: Parameterized Queries必須
- ログ: 機密情報を含めない

### 保守性
- コード品質: TypeScript型定義、ESLintルール準拠
- テストカバレッジ: 80%以上
- ドキュメント: API仕様書、コメント、JSDoc
- ログ: 構造化ログ（Winston）、適切なログレベル

### 互換性
- Node.js: 18+
- PostgreSQL: 18+
- ブラウザ: Chrome, Firefox, Safari, Edge（最新版）

---

## 関連ドキュメント
- API設計仕様: `docs/design/api/api_project_management.md` (セクション 2.15)
- UI設計仕様: `docs/design/ui/ui_experiment_worker_main.md` (セクション 3.2.3, 15.2)
- データベース構造: `docs/.kiro/specs/references/db_structure.md`
- API設計ポリシー: `.clinerules/development/api.md`
- バックエンド規約: `.clinerules/development/backend.md`
- セキュリティ規約: `.clinerules/development/security.md`

---

## 用語集
- **実験作業者（experiment_worker）**: 実験タスクを実行する担当者
- **実験管理者（experiment_admin）**: 実験プロジェクトを管理し、承認を行う管理者
- **承認依頼（approval request）**: 実験作業完了後、実験管理者に承認を求める申請
- **プロジェクトステータス**: プロジェクトの現在状態（draft, active, waiting_approval, approved, archived）
- **マルチテナント分離**: 複数の組織が同一システムを使用する際のデータ分離
- **監査証跡**: システム内の重要な操作履歴の記録

---

## 変更履歴
| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-28 | 初版作成 | Kiro Spec Generator |
| 1.1.0 | 2026-01-28 | Requirement 5,6削除（タスク完了状態・未解決問題の検証を削除） | User Request |
| 1.2.0 | 2026-01-29 | 通知機能削除（Requirement 6削除、関連箇所修正） | User Request |
