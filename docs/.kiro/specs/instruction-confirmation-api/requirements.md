# Requirements Document

## Project Description (Input)
実験作業者画面の指示確認完了を行うバックエンドの機能を実装する。

仕様の部分については
'docs\design\api\api_project_management.md' (see below for file content)
の12. 指示確認完了APIを確認してください。

---

## Introduction

本ドキュメントは、実験作業者が実験管理者から受け取った指示を確認済みとしてマークするためのバックエンドAPI機能の要件を定義します。この機能は、実験ワークフローにおける指示の伝達と確認のトレーサビリティを確保し、実験管理者と実験作業者間のコミュニケーションを円滑にすることを目的としています。

**対象API**: PUT /api/v1/instructions/:instructionId/confirm

**実装対象**:
- バックエンドAPIエンドポイント
- 認証・認可ミドルウェア
- ビジネスロジック検証
- データベース更新処理
- エラーハンドリング
- 監査ログ記録

---

## Requirements

### Requirement 1: APIエンドポイント実装

**Objective:** 実験作業者として、割り当てられた指示を確認済みとしてマークしたい。これにより、実験管理者が指示の確認状況を把握できるようにする。

#### Acceptance Criteria

1. When 実験作業者が PUT /api/v1/instructions/:instructionId/confirm にリクエストを送信する, the 指示確認API shall 指定された指示IDに対応する指示を確認済み状態に更新する

2. When 指示確認APIが実行される, the 指示確認API shall レスポンスに確認日時、確認ユーザーIDを含める

3. When 指示確認が成功する, the 指示確認API shall HTTPステータスコード200と統一レスポンス形式でデータを返却する

4. The 指示確認API shall パスパラメータとして instructionId (UUID形式) を受け取る

5. The 指示確認API shall レスポンスボディに success, data, meta フィールドを含める

---

### Requirement 2: 認証と認可

**Objective:** システム管理者として、適切な権限を持つユーザーのみが指示確認機能にアクセスできるようにしたい。これにより、セキュリティとデータの整合性を保証する。

#### Acceptance Criteria

1. When ユーザーが指示確認APIにアクセスする, the 指示確認API shall Authorizationヘッダーに有効なJWTトークンを要求する

2. When 認証トークンが無効または存在しない, then the 指示確認API shall HTTPステータスコード401とエラーコード AUTH_TOKEN_INVALID を返却する

3. When ユーザーが指示確認APIにアクセスする, the 指示確認API shall 所属組織内のすべての指示を確認可能とする

4. The 指示確認API shall authMiddlewareのミドルウェアチェーンを適用する

---

### Requirement 3: ビジネスロジック検証

**Objective:** データ管理者として、指示確認処理が適切なビジネスルールに従って実行されることを保証したい。これにより、データの整合性と業務フローの正確性を確保する。

#### Acceptance Criteria

1. When 指定された instructionId が存在しない, then the 指示確認API shall HTTPステータスコード404とエラーコード RESOURCE_NOT_FOUND を返却する

2. When 指定された指示が既に確認済み (is_acknowledged = true), then the 指示確認API shall HTTPステータスコード400とエラーメッセージ「この指示は既に確認済みです」を返却する

3. When 指示が存在し未確認状態である, the 指示確認API shall 指示確認処理を続行する

4. The 指示確認API shall project_task テーブルから担当者情報を検証する

---

### Requirement 4: マルチテナント分離

**Objective:** システム管理者として、組織間のデータ分離を厳密に維持したい。これにより、セキュリティとプライバシーを保護する。

#### Acceptance Criteria

1. When 指示確認APIがデータベースクエリを実行する, the 指示確認API shall すべてのクエリに organization_id フィルタを含める

2. When ユーザーが他組織の指示を確認しようとする, then the 指示確認API shall HTTPステータスコード404を返却する（存在しないものとして扱う）

3. When 指示を検索する, the 指示確認API shall リクエストユーザーの organization_id と一致する指示のみを対象とする

4. The 指示確認API shall クロステナントアクセスを防止する（system_adminを除く）

5. The 指示確認API shall req.user.organizationId を使用してテナント分離を実装する

---

### Requirement 5: データベース更新処理

**Objective:** 開発者として、指示確認情報をデータベースに正確かつ一貫性を持って保存したい。これにより、データの信頼性とトレーサビリティを確保する。

#### Acceptance Criteria

1. When 指示確認処理が実行される, the 指示確認API shall instruction_acknowledged_history テーブルに新しいレコードを追加する

2. When instruction_acknowledged_history レコードを追加する, the 指示確認API shall instruction_id フィールドにリクエストの instructionId を設定する

3. When instruction_acknowledged_history レコードを追加する, the 指示確認API shall acknowledged_user_id フィールドにリクエストユーザーのuser_idを設定する

4. When instruction_acknowledged_history レコードを追加する, the 指示確認API shall acknowledged_at フィールドに現在のタイムスタンプ（ISO8601形式）を設定する

5. When instruction_acknowledged_history レコードを追加する, the 指示確認API shall organization_id フィールドにリクエストユーザーの organization_id を設定する

6. When データベース更新が失敗する, then the 指示確認API shall HTTPステータスコード500とエラーコード SYSTEM_DATABASE_ERROR を返却する

7. The 指示確認API shall Parameterized Queries（Kysely）を使用してSQLインジェクションを防止する

8. The 指示確認API shall レコード追加後にユーザー名を user_authentication テーブルから取得する

9. The 指示確認API shall project_instruction テーブルは更新しない（履歴管理のみ）

---

### Requirement 6: レスポンス形成

**Objective:** フロントエンド開発者として、API呼び出し結果を統一された形式で受け取りたい。これにより、フロントエンド実装の一貫性と保守性を向上させる。

#### Acceptance Criteria

1. When 指示確認が成功する, the 指示確認API shall 以下のフィールドを含むレスポンスを返却する: instruction_id, is_acknowledged, acknowledged_at, acknowledged_user_id, acknowledged_user_name

2. When レスポンスを返却する, the 指示確認API shall success: true フィールドを含める

3. When レスポンスを返却する, the 指示確認API shall meta オブジェクトに timestamp と requestId を含める

4. When エラーが発生する, the 指示確認API shall success: false と error オブジェクト（code, message, details）を含める

5. The 指示確認API shall acknowledged_at フィールドを ISO8601 形式（YYYY-MM-DDTHH:mm:ss.sssZ）で返却する

6. The 指示確認API shall 統一レスポンス形式（ApiResponse<T>型）に準拠する

---

### Requirement 7: エラーハンドリング

**Objective:** 運用担当者として、エラー発生時に適切な情報を取得し、問題を迅速に特定・解決したい。

#### Acceptance Criteria

1. When バリデーションエラーが発生する, then the 指示確認API shall HTTPステータスコード400とエラーコード VALIDATION_ERROR を返却する

2. When 指示が既に確認済みの場合, then the 指示確認API shall HTTPステータスコード400とエラーメッセージ「この指示は既に確認済みです」を返却する

3. When リソースが見つからない場合, then the 指示確認API shall HTTPステータスコード404とエラーコード RESOURCE_NOT_FOUND を返却する

4. When 権限不足の場合, then the 指示確認API shall HTTPステータスコード403とエラーコード PERMISSION_INSUFFICIENT を返却する

5. When システムエラーが発生する, then the 指示確認API shall HTTPステータスコード500とエラーコード SYSTEM_ERROR を返却する

6. When データベースエラーが発生する, then the 指示確認API shall HTTPステータスコード500とエラーコード SYSTEM_DATABASE_ERROR を返却する

7. When エラーが発生する, the 指示確認API shall エラーメッセージを日本語で提供する

8. The 指示確認API shall エラーレスポンスにスタックトレースを含めない（セキュリティ保護）

---

### Requirement 8: 監査ログとロギング

**Objective:** セキュリティ管理者として、指示確認操作の完全な監査証跡を記録したい。これにより、コンプライアンスと問題調査を支援する。

#### Acceptance Criteria

1. When 指示確認処理が実行される, the 指示確認API shall ログに以下の情報を記録する: instruction_id, user_id, organization_id, acknowledged_at

2. When 指示確認が成功する, the 指示確認API shall INFOレベルのログを出力する

3. When エラーが発生する, the 指示確認API shall ERRORレベルのログにエラー詳細とスタックトレースを出力する

4. When 権限エラーが発生する, the 指示確認API shall WARNレベルのログに不正アクセス試行を記録する

5. The 指示確認API shall ログに requestId を含めてリクエストをトレース可能にする

6. The 指示確認API shall Winston ロガーを使用して構造化ログを出力する

---

### Requirement 9: パフォーマンスと可用性

**Objective:** システム運用者として、APIが高速かつ安定して動作することを保証したい。これにより、ユーザーエクスペリエンスとシステムの信頼性を向上させる。

#### Acceptance Criteria

1. When 指示確認APIが呼び出される, the 指示確認API shall 通常時500ms以内にレスポンスを返却する

2. When データベースクエリを実行する, the 指示確認API shall 最小限のクエリ数で処理を完了する（理想的には2-3クエリ）

3. When 同時に複数の指示確認リクエストが発生する, the 指示確認API shall 各リクエストを独立して処理する

4. The 指示確認API shall PostgreSQL接続プールを使用してデータベース接続を効率化する

5. The 指示確認API shall N+1クエリ問題を回避する

---

### Requirement 10: 統合とテスト可能性

**Objective:** QAエンジニアとして、APIの動作を自動テストで検証できるようにしたい。これにより、品質保証と継続的デリバリーを実現する。

#### Acceptance Criteria

1. When テストが実行される, the 指示確認API shall 単体テストでビジネスロジックを検証可能な構造とする

2. When 統合テストが実行される, the 指示確認API shall モックデータベースでテスト可能な実装とする

3. When APIテストが実行される, the 指示確認API shall 正常系・異常系の両方をカバーするテストケースを提供する

4. The 指示確認API shall サービス層、コントローラー層、ルート層を分離したレイヤードアーキテクチャを採用する

5. The 指示確認API shall 依存性注入可能な設計とする

---

### Requirement 11: 実装ファイル構成

**Objective:** 開発者として、コードベースの保守性と一貫性を維持したい。これにより、長期的な開発効率を向上させる。

#### Acceptance Criteria

1. The 指示確認API shall ルート定義を backend/src/routes/projectRoutes.ts に配置する

2. The 指示確認API shall コントローラー実装を backend/src/controllers/projectController.ts の confirmInstruction メソッドに配置する

3. The 指示確認API shall サービス実装を backend/src/services/projectService.ts の confirmInstruction メソッドに配置する

4. The 指示確認API shall 型定義を backend/src/types/ 配下に配置する

5. The 指示確認API shall テストコードを backend/tests/routes/projectRoutes.test.ts および backend/tests/services/projectService.test.ts に配置する

6. The 指示確認API shall バックエンド規約（.clinerules/development/backend.md）に準拠した実装とする

---

## Non-Functional Requirements

### セキュリティ要件

1. The 指示確認API shall すべてのリクエストで HTTPS 通信を強制する
2. The 指示確認API shall レート制限を適用する（1分間に100リクエストまで）
3. The 指示確認API shall セキュアなセッションCookie設定（httpOnly, secure, sameSite: 'strict'）を使用する

### 可用性要件

1. The 指示確認API shall 99.9%以上のアップタイムを目標とする
2. The 指示確認API shall データベース障害時にグレースフルにエラーを返却する

### 互換性要件

1. The 指示確認API shall Node.js 18以上で動作する
2. The 指示確認API shall PostgreSQL 13以上と互換性を持つ
3. The 指示確認API shall TypeScript 5.x で型安全性を保証する

---

## Success Metrics

1. **機能完全性**: すべての受入基準を満たす
2. **テストカバレッジ**: 80%以上のコードカバレッジ
3. **パフォーマンス**: 95パーセンタイルで500ms以内のレスポンス
4. **エラー率**: 0.1%未満のエラー率
5. **セキュリティ**: セキュリティ脆弱性ゼロ

---

## Dependencies

### 技術スタック
- Node.js 18+
- Express.js 4.18+
- TypeScript 5.x
- Kysely (Query Builder)
- PostgreSQL 13+

### 関連システム
- 認証サービス（JWT + Session Hybrid）
- データベース（project_instruction, project_task テーブル）
- ロギングサービス（Winston）

### 外部ドキュメント
- `docs/design/api/api_project_management.md` - API仕様書
- `.clinerules/development/backend.md` - バックエンド規約
- `.clinerules/development/security.md` - セキュリティ規約
- `.clinerules/development/api.md` - API設計ポリシー

---

## Risks and Mitigations

| リスク | 影響度 | 緩和策 |
|--------|--------|--------|
| データベース接続障害 | 高 | 接続プール、リトライロジック、タイムアウト設定 |
| 同時実行競合（重複確認） | 中 | データベーストランザクション、楽観的ロック |
| 権限チェック漏れ | 高 | ミドルウェアチェーン強制、統合テスト |
| マルチテナント分離不備 | 致命的 | すべてのクエリにorganization_idフィルタ必須化、コードレビュー |
| パフォーマンス劣化 | 中 | インデックス最適化、クエリパフォーマンステスト |

---

## Approval Checklist

実装前に以下を確認:
- [ ] すべての要件がEARS形式で記述されている
- [ ] セキュリティ要件が明確に定義されている
- [ ] マルチテナント分離が考慮されている
- [ ] エラーハンドリングが網羅的に定義されている
- [ ] テスト可能な要件になっている
- [ ] 既存のAPI設計ポリシーに準拠している