# Requirements Document

## Project Description (Input)
実験作業者画面の問題コメントの投稿を行うバックエンドの機能を実装する。

仕様の部分については
'docs\design\api\api_issue_management.md' 
の2. コメント投稿APIを確認してください。作業はなるべく細かく分けて、実行してください。

---

## Introduction

本ドキュメントは、問題管理システムにおけるコメント投稿APIの要件を定義します。実験作業者（Worker）以上の権限を持つユーザーが、既存の問題に対してコメントを追加できる機能を提供します。

このAPIは、以下の目的を達成します：
- 問題に関するディスカッションの促進
- 問題解決プロセスの記録・追跡
- チーム間のコミュニケーション支援
- 問題対応の履歴管理

---

## Requirements

### 要件1: コメント投稿機能
**目的:** 実験作業者として、既存の問題に対してコメントを投稿したい。これにより、問題に関する追加情報や対応状況を共有できる。

#### Acceptance Criteria
1. When ユーザーが有効な問題IDとコメント内容を指定してコメント投稿APIを呼び出す, the コメント投稿API shall 新しいコメントをデータベースに登録する
2. When コメントが登録される, the コメント投稿API shall 自動的にシーケンス番号を採番する
3. When コメントが登録される, the コメント投稿API shall 現在のユーザーIDを投稿者として記録する
4. When コメントが登録される, the コメント投稿API shall 投稿日時を現在時刻で記録する
5. When コメント投稿が成功する, the コメント投稿API shall HTTP 201 Createdステータスコードを返す

### 要件2: 入力バリデーション
**目的:** システム管理者として、不正なデータがシステムに登録されないようにしたい。これにより、データ品質と整合性を保証できる。

#### Acceptance Criteria
1. When コメント内容が空文字列である, the コメント投稿API shall HTTP 400 Bad Requestエラーを返す
2. When コメント内容が2000文字を超える, the コメント投稿API shall HTTP 400 Bad Requestエラーを返す
3. If バリデーションエラーが発生する, then the コメント投稿API shall エラー詳細をレスポンスボディに含める
4. The コメント投稿API shall すべての入力パラメータに対してバリデーションを実行する

### 要件3: 認証・認可
**目的:** セキュリティ担当者として、適切な権限を持つユーザーのみがコメントを投稿できるようにしたい。これにより、不正アクセスを防止できる。

#### Acceptance Criteria
1. When 認証されていないユーザーがAPIを呼び出す, the コメント投稿API shall HTTP 401 Unauthorizedエラーを返す
2. When Worker未満の権限を持つユーザーがAPIを呼び出す, the コメント投稿API shall HTTP 403 Forbiddenエラーを返す
3. When 有効なJWTトークンが提供される, the コメント投稿API shall トークンから組織IDとユーザーIDを抽出する
4. The コメント投稿API shall すべてのリクエストでJWT認証を必須とする
5. The コメント投稿API shall Worker、Manager、Adminロールのユーザーのみにアクセスを許可する

### 要件4: マルチテナント分離
**目的:** システム管理者として、異なる組織のデータが分離されることを保証したい。これにより、データの機密性と整合性を維持できる。

#### Acceptance Criteria
1. When ユーザーがコメントを投稿する, the コメント投稿API shall 問題が自組織に属することを検証する
2. When 他組織の問題に対してコメント投稿を試みる, the コメント投稿API shall HTTP 404 Not Foundエラーを返す
3. When データベースクエリを実行する, the コメント投稿API shall 必ずorganization_idフィルタを含める
4. The コメント投稿API shall クロステナントアクセスを許可しない
5. The コメント投稿API shall すべてのテーブルJOINでorganization_idを検証する

### 要件5: データ整合性
**目的:** データ管理者として、コメントデータの整合性と一貫性を保証したい。これにより、信頼性の高いデータ管理を実現できる。

#### Acceptance Criteria
1. When コメントを登録する, the コメント投稿API shall トランザクションを使用してデータ整合性を保証する
2. When 問題が存在しない, the コメント投稿API shall HTTP 404 Not Foundエラーを返す
3. When シーケンス番号を採番する, the コメント投稿API shall 同一問題内で一意な番号を生成する
4. When データベースエラーが発生する, the コメント投稿API shall トランザクションをロールバックする
5. The コメント投稿API shall 外部キー制約を満たすデータのみを登録する

### 要件6: レスポンス形式
**目的:** フロントエンド開発者として、統一されたレスポンス形式でコメント情報を取得したい。これにより、クライアント実装を簡素化できる。

#### Acceptance Criteria
1. When コメント投稿が成功する, the コメント投稿API shall 登録されたコメントの完全な情報を返す
2. When コメント投稿が成功する, the コメント投稿API shall 投稿者のユーザー名を含める
3. When コメント投稿が成功する, the コメント投稿API shall プロジェクトIDとシーケンス番号を含める
4. When コメント投稿が成功する, the コメント投稿API shall タイムスタンプとリクエストIDをメタデータに含める
5. The コメント投稿API shall API設計ポリシーで定義された統一形式でレスポンスを返す

### 要件7: セキュリティ対策
**目的:** セキュリティ担当者として、一般的なWebセキュリティ脅威から保護したい。これにより、システムの安全性を確保できる。

#### Acceptance Criteria
1. When SQLクエリを実行する, the コメント投稿API shall Parameterized Queriesを使用する
2. When ユーザー入力を処理する, the コメント投稿API shall XSS対策のためにサニタイゼーションを実行する
3. When エラーが発生する, the コメント投稿API shall 機密情報をエラーメッセージに含めない
4. The コメント投稿API shall SQLインジェクション攻撃を防止する
5. The コメント投稿API shall 文字列長制限を厳密に強制する

### 要件8: パフォーマンス
**目的:** システム管理者として、コメント投稿が迅速に処理されることを保証したい。これにより、ユーザーエクスペリエンスを向上できる。

#### Acceptance Criteria
1. When 単一のコメント投稿リクエストを処理する, the コメント投稿API shall 500ms以内にレスポンスを返す（通常の負荷条件下）
2. When データベースクエリを実行する, the コメント投稿API shall 適切なインデックスを使用する
3. When ユーザー名を取得する, the コメント投稿API shall 効率的なJOINクエリを使用する
4. The コメント投稿API shall 不要なデータベースアクセスを避ける
5. The コメント投稿API shall トランザクションスコープを最小限に保つ

### 要件9: エラーハンドリング
**目的:** 開発者として、発生したエラーを適切に処理し、ユーザーに分かりやすいメッセージを提供したい。これにより、問題の迅速な解決を支援できる。

#### Acceptance Criteria
1. When バリデーションエラーが発生する, the コメント投稿API shall どのフィールドが問題かを明示する
2. When データベースエラーが発生する, the コメント投稿API shall HTTP 500 Internal Server Errorを返す
3. When エラーが発生する, the コメント投稿API shall 構造化ログに詳細を記録する
4. If リクエスト処理中に例外が発生する, then the コメント投稿API shall 統一されたエラーレスポンス形式で返す
5. The コメント投稿API shall すべてのエラーケースに対して適切なHTTPステータスコードを返す

### 要件10: 監査ログ
**目的:** 監査担当者として、コメント投稿操作の履歴を追跡したい。これにより、セキュリティ監査とトラブルシューティングを支援できる。

#### Acceptance Criteria
1. When コメントが投稿される, the コメント投稿API shall 操作ログをWinstonで記録する
2. When コメントが投稿される, the コメント投稿API shall ユーザーID、組織ID、問題IDをログに含める
3. When エラーが発生する, the コメント投稿API shall エラー詳細とスタックトレースをログに記録する
4. The コメント投稿API shall リクエストIDをログに含めてトレーサビリティを確保する
5. The コメント投稿API shall 構造化ログ形式でログを出力する

---

## Non-Functional Requirements

### パフォーマンス要件
- レスポンスタイム: 通常負荷条件下で500ms以内
- 同時接続数: 最大100リクエスト/秒を処理可能

### セキュリティ要件
- JWT認証必須
- マルチテナント分離必須
- Parameterized Queries使用必須
- XSS対策必須

### 可用性要件
- システム稼働率: 99.9%以上
- トランザクション整合性保証

### 保守性要件
- 統一されたエラーレスポンス形式
- 構造化ログによる監査証跡
- API設計ポリシーへの準拠

---

## Constraints and Dependencies

### 技術的制約
- Node.js 18+ + Express.js + TypeScript
- PostgreSQL 18+
- JWT認証システム
- Winston構造化ログ

### 依存関係
- 問題管理システム（issues テーブル）が実装済みであること
- ユーザー認証システムが稼働していること
- organization_user テーブルにユーザー名が登録されていること
- マルチテナント分離ミドルウェアが実装済みであること

### 前提条件
- APIクライアントは有効なJWTトークンを持っていること
- 問題IDはコメント投稿前に存在すること
- ユーザーはWorker以上の権限を持っていること

---

## Out of Scope

以下は本要件の対象外とします：
- コメントの編集機能
- コメントの削除機能
- コメントへの返信機能（スレッド化）
- コメントへのリアクション機能（いいね等）
- コメントの通知機能
- コメントの添付ファイル機能
- コメントの書式設定（マークダウン等）

---

## Glossary

| 用語 | 定義 |
|------|------|
| 問題 | 実験作業中に発生した課題や障害を記録するエンティティ |
| コメント | 問題に対する追加情報や対応状況を記録するテキスト |
| シーケンス番号 | 同一問題内でのコメントの順序を示す連番 |
| マルチテナント分離 | 組織ごとにデータを分離し、クロステナントアクセスを防止する仕組み |
| Worker | 実験作業者ロール（問題報告とコメント投稿が可能） |
| Manager | 実験管理者ロール（Worker権限 + 問題ステータス変更が可能） |
| Admin | システム管理者ロール（全権限） |
| JWT | JSON Web Token（認証トークン） |
| Parameterized Queries | SQLインジェクション対策のためのプレースホルダーを使用したクエリ |

---

## References

- [API設計書: 問題管理API](../../design/api/api_issue_management.md#2-コメント投稿api)
- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
- [データベース構造定義](../../.clinerules/references/db_structure.md)