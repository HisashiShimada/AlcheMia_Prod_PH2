# Requirements Document

## Project Description (Input)
実験作業者画面の問題ステータス変更を行うバックエンドの機能を実装する。

仕様の部分については
'docs\design\api\api_issue_management.md'
の5. 問題ステータス変更APIを確認してください。

---

## Introduction
本ドキュメントは、問題管理システムにおける問題ステータス変更APIの要件を定義します。実験作業中に報告された問題に対して、問題のステータスを「未解決（unresolved）」または「解決済（resolved）」に変更できる機能を提供します。

本APIは、マルチテナントアーキテクチャに基づき、組織間のデータ分離を保証し、適切な権限管理とセキュリティ対策を実装します。

---

## Requirements

### Requirement 1: 問題ステータス変更機能
**目的:** 実験管理者として、報告された問題のステータスを変更したい。そうすることで、問題の解決状況を適切に管理できるようにする。

#### Acceptance Criteria
1. When 実験管理者が有効な問題IDとステータス"resolved"を指定してステータス変更リクエストを送信した場合、the 問題管理API shall 問題のstatusを"resolved"に更新し、resolved_byに現在のユーザーID、resolved_atに現在時刻を設定する
2. When 実験管理者が有効な問題IDとステータス"unresolved"を指定してステータス変更リクエストを送信した場合、the 問題管理API shall 問題のstatusを"unresolved"に更新し、resolved_byとresolved_atをNULLにクリアする
3. When ステータス変更が成功した場合、the 問題管理API shall 更新された問題の詳細情報（id、status、resolvedBy、resolvedByName、resolvedAt、updatedAt）を含む200 OKレスポンスを返す
4. When ステータスが"resolved"に変更された場合、the 問題管理API shall レスポンスにresolvedByとしてユーザーIDを、resolvedByNameとしてユーザー名を含める
5. When ステータスが"unresolved"に変更された場合、the 問題管理API shall レスポンスのresolvedBy、resolvedByName、resolvedAtを空文字列として返す

### Requirement 2: 認証と認可
**目的:** システム管理者として、適切な権限を持つユーザーのみが問題ステータスを変更できるようにしたい。そうすることで、問題管理の整合性とセキュリティを保証する。

#### Acceptance Criteria
1. When 認証されていないユーザーがステータス変更リクエストを送信した場合、the 問題管理API shall 401 Unauthorizedエラーレスポンスを返す
2. When Worker権限のユーザーがステータス変更リクエストを送信した場合、the 問題管理API shall 403 Forbiddenエラーレスポンスを返し、エラーメッセージ"Only managers and admins can change issue status"を含める
3. When Manager権限以上のユーザーがステータス変更リクエストを送信した場合、the 問題管理API shall リクエストを処理し、ステータス変更を実行する
4. The 問題管理API shall すべてのリクエストでJWT認証を必須とし、有効なトークンがない場合はリクエストを拒否する

### Requirement 3: マルチテナント分離
**目的:** システム管理者として、組織間のデータ分離を保証したい。そうすることで、異なる組織のユーザーが他組織の問題にアクセスできないようにする。

#### Acceptance Criteria
1. When ユーザーが問題ステータス変更リクエストを送信した場合、the 問題管理API shall リクエスト元ユーザーのorganization_idを自動的に取得し、データベースクエリに含める
2. When データベースから問題を検索する際、the 問題管理API shall 必ずorganization_idでフィルタリングし、自組織に属する問題のみを対象とする
3. If 指定された問題IDが他組織に属する場合、the 問題管理API shall 404 Not Foundエラーレスポンスを返し、エラーメッセージ"Issue not found or does not belong to your organization"を含める
4. The 問題管理API shall すべてのデータベース操作でParameterized Queriesを使用し、SQLインジェクション攻撃を防止する

### Requirement 4: 入力バリデーション
**目的:** 開発者として、無効なデータによるシステムエラーを防ぎたい。そうすることで、データ整合性を維持し、適切なエラーメッセージをユーザーに提供する。

#### Acceptance Criteria
1. When リクエストボディのstatusが"unresolved"または"resolved"以外の値である場合、the 問題管理API shall 400 Bad Requestエラーレスポンスを返し、バリデーションエラーの詳細を含める
2. When リクエストボディにstatusパラメータが含まれていない場合、the 問題管理API shall 400 Bad Requestエラーレスポンスを返し、必須パラメータが不足していることを示すエラーメッセージを含める
3. When パスパラメータのissueIdが無効な形式である場合、the 問題管理API shall 400 Bad Requestエラーレスポンスを返す
4. If 指定された問題IDがデータベースに存在しない場合、the 問題管理API shall 404 Not Foundエラーレスポンスを返す

### Requirement 5: エラーハンドリングとレスポンス形式
**目的:** API利用者として、エラー発生時に明確な情報を受け取りたい。そうすることで、問題の原因を特定し、適切な対応を取ることができる。

#### Acceptance Criteria
1. When APIエラーが発生した場合、the 問題管理API shall 統一されたエラーレスポンス形式（success、error、meta）で応答する
2. When バリデーションエラーが発生した場合、the 問題管理API shall errorオブジェクトにcode、message、detailsを含め、どのフィールドがエラーかを明示する
3. When 成功時のレスポンスを返す場合、the 問題管理API shall successフィールドをtrue、dataオブジェクトに更新結果、metaオブジェクトにtimestampとrequestIdを含める
4. The 問題管理API shall エラーメッセージに機密情報（内部パス、スタックトレース、データベース詳細等）を含めない
5. The 問題管理API shall 適切なHTTPステータスコード（200、400、401、403、404、500）を返す

### Requirement 6: データ整合性とトランザクション管理
**目的:** システム管理者として、データベース操作の整合性を保証したい。そうすることで、部分的な更新や不整合なデータを防止する。

#### Acceptance Criteria
1. When ステータス変更を実行する場合、the 問題管理API shall データベーストランザクションを開始し、すべての更新が成功した場合のみコミットする
2. If ステータス変更処理中にエラーが発生した場合、the 問題管理API shall トランザクションをロールバックし、データベースを変更前の状態に戻す
3. When 問題レコードを更新する際、the 問題管理API shall FOR UPDATE句を使用して行ロックを取得し、同時更新による競合を防止する
4. When ステータス変更が完了した場合、the 問題管理API shall updated_atフィールドを現在時刻に更新する

### Requirement 7: ログ記録と監査証跡
**目的:** システム管理者として、問題ステータス変更の履歴を追跡したい。そうすることで、セキュリティ監査とトラブルシューティングを可能にする。

#### Acceptance Criteria
1. When ステータス変更リクエストを受信した場合、the 問題管理API shall Winston構造化ログにリクエスト情報（issueId、status、userId、organizationId）を記録する
2. When ステータス変更が成功した場合、the 問題管理API shall infoレベルのログに成功の詳細を記録する
3. If エラーが発生した場合、the 問題管理API shall errorレベルのログにエラー詳細とスタックトレースを記録する
4. The 問題管理API shall すべてのログにrequestId、timestamp、userIdを含め、リクエストのトレーサビリティを確保する

### Requirement 8: パフォーマンスとスケーラビリティ
**目的:** 開発者として、APIのレスポンス時間を最適化したい。そうすることで、ユーザーエクスペリエンスを向上させる。

#### Acceptance Criteria
1. When 問題ステータス変更リクエストを処理する場合、the 問題管理API shall 500ミリ秒以内にレスポンスを返す（通常の負荷条件下）
2. The 問題管理API shall データベースクエリでインデックス（issues.id、issues.organization_id）を利用し、検索パフォーマンスを最適化する
3. When 複数のユーザーが同時にステータス変更リクエストを送信した場合、the 問題管理API shall 各リクエストを独立して処理し、適切に並行性を制御する

---

## Non-Functional Requirements

### セキュリティ
- すべてのエンドポイントでJWT認証を必須とする
- Manager以上の権限でのみステータス変更を許可する
- organization_idフィルタを必須とし、マルチテナント分離を保証する
- Parameterized Queriesを使用し、SQLインジェクションを防止する

### パフォーマンス
- レスポンスタイム: 500ミリ秒以内（P95）
- データベースインデックスの最適化
- トランザクション管理の効率化

### 監視とログ
- Winston構造化ログによる監査証跡
- エラー発生時の詳細ログ記録
- リクエストトレーサビリティの確保

---

## 参照ドキュメント
- [問題管理API設計書](../../design/api/api_issue_management.md) - API詳細仕様
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計
