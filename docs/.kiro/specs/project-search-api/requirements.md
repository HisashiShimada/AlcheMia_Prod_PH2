# Requirements Document

## Project Description (Input)
プロジェクト詳細検索（MAIMLメタデータ検索統合版）API実装

## Introduction

本要件書は、MAIMLファイルのメタデータを検索し、該当するプロジェクトを特定する統合検索API機能の要件を定義します。この機能により、ユーザーはDocument情報、測定データ、ファイル構造、MaiML属性など、複数の検索条件を組み合わせて目的のプロジェクトを効率的に発見できます。

**背景**: 
- 既存のMAIML検索API（`POST /api/v1/maiml/search`）はファイル単位の検索を提供
- プロジェクト管理APIに統合検索機能（`POST /api/v1/projects/search`）が必要
- 2つのAPIを統合し、プロジェクト情報とMAIMLメタデータを同時に返却する仕様

**スコープ**: 
- MAIMLメタデータの複合条件検索（最大5条件）
- 検索結果のプロジェクト情報取得
- マルチテナント分離とセキュリティ確保
- パフォーマンス最適化（レスポンスタイム < 2秒）

---

## Requirements

### Requirement 1: MAIMLメタデータ検索機能

**Objective**: ユーザーとして、MAIMLファイルのメタデータを複数の条件で検索できるようにすることで、目的のプロジェクトを効率的に発見したい

#### Acceptance Criteria

1. When ユーザーが1〜5件の検索条件を指定する、the Project Search API shall MAIMLメタデータを検索し該当するファイルを返却する

2. When ユーザーがDocument情報（uuid、name、description）で検索する、the Project Search API shall 該当するMAIMLファイルを抽出する

3. When ユーザーが測定データ（measurement_value、units）で検索する、the Project Search API shall 該当する測定値を持つMAIMLファイルを抽出する

4. When ユーザーがファイル構造（section_type）で検索する、the Project Search API shall 該当するセクション種別を持つMAIMLファイルを抽出する

5. When ユーザーがMaiML属性（id、ref、key、element、value）で検索する、the Project Search API shall 該当する属性を持つMAIMLファイルを抽出する

6. When 複数の検索条件が指定される、the Project Search API shall AND条件ですべての条件に一致するファイルのみを返却する

7. When 検索条件が6件以上指定される、the Project Search API shall `VALIDATION_TOO_MANY_CRITERIA` エラーを返却する

8. When 検索条件が空配列である、the Project Search API shall `VALIDATION_ERROR` エラーを返却する

9. When 不正な属性名が指定される、the Project Search API shall `VALIDATION_ERROR` エラーとして許可された属性リストを明示する

10. When 検索値が空文字である、the Project Search API shall `VALIDATION_ERROR` エラーを返却する

11. When 検索値が256文字以上である、the Project Search API shall `VALIDATION_ERROR` エラーを返却する

---

### Requirement 2: プロジェクト情報統合

**Objective**: ユーザーとして、検索結果に該当するプロジェクトの完全な情報を取得することで、プロジェクトの概要を素早く把握したい

#### Acceptance Criteria

1. When MAIMLファイルが検索条件に一致する、the Project Search API shall そのファイルが属するプロジェクトを特定する

2. When プロジェクトを特定する、the Project Search API shall S3キー（`projects/{project_name}/{project_name}.maiml`）からプロジェクト名を抽出する

3. When プロジェクト名が抽出される、the Project Search API shall projectテーブルからプロジェクト情報を取得する

4. When プロジェクト情報を取得する、the Project Search API shall プロジェクトID、名称、説明、ステータス、所有者情報を含める

5. When プロジェクトステータスを返却する、the Project Search API shall code_masterから名称を取得して付加する

6. When チェックアウトステータスを返却する、the Project Search API shall code_masterから名称を取得して付加する

7. When 該当するMAIMLファイルを持たないプロジェクトが存在する、the Project Search API shall そのプロジェクトを検索結果に含めない

8. When MAIMLファイルは見つかったがプロジェクトが削除されている、the Project Search API shall その結果を除外する

9. When 検索結果が0件である、the Project Search API shall 空配列と総件数0を返却する

10. When マッチしたファイル情報を返却する、the Project Search API shall ファイル名、S3パス、ファイルサイズ、最終更新日時を含める

---

### Requirement 3: マッチ情報の詳細表示

**Objective**: ユーザーとして、どの属性がどのように一致したかを確認することで、検索結果の妥当性を判断したい

#### Acceptance Criteria

1. When 検索条件に一致するファイルが見つかる、the Project Search API shall 各属性のマッチ件数を集計する

2. When マッチ情報を生成する、the Project Search API shall 属性名、検索条件番号、マッチ件数、マッチした値のリストを含める

3. When マッチした値が6件以上存在する、the Project Search API shall 最初の5件のみを返却する

4. When 複数の検索条件がある、the Project Search API shall 各条件に条件番号（1始まり）を付与する

5. When マッチ情報を集計する、the Project Search API shall 総マッチ件数（すべての属性の合計）を計算する

6. When 検索結果を並べ替える、the Project Search API shall マッチ件数の多い順にソートする

7. When 同じマッチ件数のファイルが複数ある、the Project Search API shall 最終更新日時の新しい順にソートする

---

### Requirement 4: マルチテナント分離とセキュリティ

**Objective**: セキュリティ責任者として、組織間のデータ分離を確保し、不正アクセスを防止したい

#### Acceptance Criteria

1. When APIリクエストを受信する、the Project Search API shall JWTトークンとセッションを検証する

2. When 認証に失敗する、the Project Search API shall `AUTH_TOKEN_EXPIRED` または `AUTH_TOKEN_INVALID` エラーを返却する

3. When 認証が成功する、the Project Search API shall セッション情報から組織IDを取得する

4. When 組織IDを取得する、the Project Search API shall X-Organization-Idヘッダーと照合する

5. When 組織IDが一致しない、the Project Search API shall `PERMISSION_INSUFFICIENT` エラーを返却する

6. When データベースクエリを実行する、the Project Search API shall 必ずorganization_idフィルタを適用する

7. When S3パスを生成する、the Project Search API shall organization_prefix（`org_{organization_id}`）を強制的に含める

8. When 他組織のデータへのアクセスが試みられる、the Project Search API shall アクセスを拒否する（System Adminを除く）

9. When ロールがSystem Adminである、the Project Search API shall 全組織のデータへのアクセスを許可する

10. When ロールがManager以下である、the Project Search API shall 自組織のデータのみアクセスを許可する

11. When データベース操作を実行する、the Project Search API shall Parameterized Queriesを使用する

12. When 検索条件の値を処理する、the Project Search API shall SQLインジェクション対策としてサニタイゼーションを実施する

---

### Requirement 5: S3パス管理とファイルメタデータ

**Objective**: システム管理者として、S3上のファイルパスを正確に管理し、データ整合性を保ちたい

#### Acceptance Criteria

1. When S3パスを生成する、the Project Search API shall `s3://bucket/org_{organization_prefix}/projects/{project_name}/` 形式を使用する

2. When バケット名が不正である、the Project Search API shall デフォルトバケット名で補正する

3. When バケット名が3文字未満である、the Project Search API shall デフォルトバケット名で置換する

4. When S3パスにorganization_prefixが含まれていない、the Project Search API shall organization_prefixを追加する

5. When 相対パスが指定される、the Project Search API shall 絶対パスに変換する

6. When `s3://bucket/key` 形式のパスである、the Project Search API shall keyのみを抽出して正規化する

7. When ファイルメタデータを取得する、the Project Search API shall file_metadataテーブルまたはAthenaから取得する

8. When メタデータを検索する、the Project Search API shall metadata_jsonカラムのJSONB検索を使用する

9. When ファイルタイプをフィルタリングする、the Project Search API shall file_type = 'maiml' のみを対象とする

10. When アーカイブファイルが存在する、the Project Search API shall 現在版（`projects/{project_name}/{project_name}.maiml`）のみを検索対象とする

---

### Requirement 6: パフォーマンスとスケーラビリティ

**Objective**: システム運用者として、高速な検索レスポンスと大量データへの対応を実現したい

#### Acceptance Criteria

1. When 検索条件が1件である、the Project Search API shall 500ミリ秒以内にレスポンスを返却する

2. When 検索条件が2〜3件である、the Project Search API shall 1秒以内にレスポンスを返却する

3. When 検索条件が4〜5件である、the Project Search API shall 2秒以内にレスポンスを返却する

4. When 検索条件が複雑である、the Project Search API shall 最大許容時間5秒を超えない

5. When データベースにGINインデックスが存在する、the Project Search API shall metadata_jsonカラムのインデックスを活用する

6. When 検索結果が100件を超える、the Project Search API shall 最大100件に制限する

7. When 頻繁に検索される条件がある、the Project Search API shall 検索結果を5分間キャッシュする

8. When ファイルがアップロード・更新・削除される、the Project Search API shall キャッシュを無効化する

9. When 検索可能な属性リストが要求される、the Project Search API shall キャッシュされたリスト（TTL: 1時間）を返却する

10. When データベース接続を使用する、the Project Search API shall 接続プール（最大20接続）を活用する

---

### Requirement 7: エラーハンドリングとロギング

**Objective**: 開発者として、明確なエラーメッセージとログにより、問題の診断と解決を迅速に行いたい

#### Acceptance Criteria

1. When バリデーションエラーが発生する、the Project Search API shall HTTPステータス400とエラーコード `VALIDATION_ERROR` を返却する

2. When 認証エラーが発生する、the Project Search API shall HTTPステータス401とエラーコード `AUTH_TOKEN_EXPIRED` または `AUTH_TOKEN_INVALID` を返却する

3. When 権限エラーが発生する、the Project Search API shall HTTPステータス403とエラーコード `PERMISSION_INSUFFICIENT` を返却する

4. When データベースエラーが発生する、the Project Search API shall HTTPステータス500とエラーコード `SYSTEM_DATABASE_ERROR` を返却する

5. When S3アクセスエラーが発生する、the Project Search API shall HTTPステータス500とエラーコード `SYSTEM_S3_ERROR` を返却する

6. When エラーレスポンスを返却する、the Project Search API shall エラーコード、メッセージ、詳細情報、タイムスタンプ、リクエストIDを含める

7. When バリデーションエラーの詳細を提供する、the Project Search API shall フィールド名、エラーメッセージ、エラーコードを含める

8. When エラーが発生する、the Project Search API shall エラーログをWinstonで記録する

9. When ログを記録する、the Project Search API shall ユーザーID、組織ID、リクエストID、スタックトレースを含める

10. When エラーメッセージを生成する、the Project Search API shall ユーザーフレンドリーな日本語メッセージを提供する

11. When エラーメッセージを生成する、the Project Search API shall 機密情報（内部パス、SQLクエリ等）を含めない

---

### Requirement 8: APIレスポンス形式

**Objective**: フロントエンド開発者として、一貫したレスポンス形式により、効率的にデータを処理したい

#### Acceptance Criteria

1. When 検索が成功する、the Project Search API shall HTTPステータス200と統一されたJSON形式を返却する

2. When レスポンスを生成する、the Project Search API shall `success: true`、`data`、`pagination`、`meta` フィールドを含める

3. When データフィールドを生成する、the Project Search API shall プロジェクト情報とMAIMLファイル情報を統合した配列を返却する

4. When ページネーション情報を生成する、the Project Search API shall 総件数、総ページ数、現在ページ、ページサイズを含める

5. When メタ情報を生成する、the Project Search API shall タイムスタンプとリクエストIDを含める

6. When プロジェクト情報を返却する、the Project Search API shall キャメルケース（camelCase）のフィールド名を使用する

7. When 日時を返却する、the Project Search API shall ISO 8601形式（`YYYY-MM-DDTHH:mm:ss.sssZ`）を使用する

8. When UUIDを返却する、the Project Search API shall ハイフン区切りの標準形式を使用する

9. When 数値を返却する、the Project Search API shall 適切な型（number）で返却し、文字列化しない

10. When ブール値を返却する、the Project Search API shall true/false で返却し、0/1を使用しない

---

### Requirement 9: 将来の拡張性

**Objective**: プロダクトオーナーとして、将来的な機能拡張を容易にするための設計を確保したい

#### Acceptance Criteria

1. When 新しい検索属性を追加する、the Project Search API shall 許可された属性リストを設定ファイルで管理する

2. When OR条件検索が必要になる、the Project Search API shall 現在のAND条件ロジックと共存できる構造を保つ

3. When ファジー検索が必要になる、the Project Search API shall 検索オプションパラメータを追加できる余地を残す

4. When 範囲検索（数値、日付）が必要になる、the Project Search API shall 検索条件に比較演算子を追加できる構造を保つ

5. When アーカイブファイルも検索対象にする、the Project Search API shall ファイルタイプフィルタを拡張できる設計とする

6. When 検索履歴を保存する、the Project Search API shall 将来的にユーザー検索履歴テーブルを追加できる構造を保つ

7. When ページネーションを改善する、the Project Search API shall カーソルベースページネーションに移行できる設計とする

8. When Elasticsearchに移行する、the Project Search API shall データアクセス層を抽象化して実装を切り替え可能にする

---

## Non-Functional Requirements

### Performance
- 検索レスポンスタイム: 単一条件 < 500ms、複数条件 < 2秒
- 同時リクエスト処理: 100 req/sec 以上
- データベース接続プール: 最大20接続
- キャッシュTTL: 検索結果5分、属性リスト1時間

### Security
- JWT + Session Hybrid認証
- すべてのクエリでorganization_idフィルタ必須
- Parameterized Queries使用
- 入力値サニタイゼーション
- クロステナントアクセス防止

### Scalability
- 最大検索結果件数: 100件
- metadata_jsonカラムにGINインデックス
- ファイルメタデータはAthenaでスケール可能
- 将来的にElasticsearchへの移行を考慮

### Maintainability
- 一貫したコーディング規約
- 包括的なテストカバレッジ（70%以上）
- OpenAPI/Swagger仕様書
- 詳細なエラーログとトレーシング

### Usability
- 直感的な検索条件指定
- 明確なエラーメッセージ（日本語）
- マッチ情報の詳細表示
- 検索結果のソート（関連度順）

---

## Related Documents

- [MAIMLファイル検索API仕様](../../docs/design/api/api_maiml_search.md) - メタデータ検索の詳細
- [プロジェクト管理API仕様](../../docs/design/api/api_project_management.md) - プロジェクトAPI全体
- [MAIML検索モーダル UI設計](../../docs/design/ui/ui_search_modal.md) - フロントエンド画面仕様
- [S3構造定義](../../.clinerules/references/s3_structure.md) - S3フォルダ構成
- [データベース構造](../../.clinerules/references/db_structure.md) - file_metadataテーブル
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件の詳細

---

## Glossary

| 用語 | 定義 |
|-----|------|
| MAIML | Materials Informatics Markup Language - 材料科学実験データのXML形式 |
| メタデータ | MAIMLファイル内のDocument情報、測定データ、属性等の構造化情報 |
| file_metadata | MAIMLファイルのメタデータを格納するデータベーステーブル |
| JSONB | PostgreSQLのバイナリJSON型、GINインデックスで高速検索可能 |
| organization_prefix | マルチテナント分離用のS3パスプレフィックス（`org_{organization_id}`） |
| 署名付きURL | 一時的なS3アクセス権限を付与するPre-signed URL |
| Parameterized Query | SQLインジェクション対策のためのプレースホルダー付きクエリ |
| EARS | Easy Approach to Requirements Syntax - 要件記述の標準形式 |

---

## Validation Matrix

| 要件ID | 検証方法 | 合格基準 |
|-------|---------|---------|
| Req 1 | ユニットテスト | 全検索条件パターンで該当ファイルが返却される |
| Req 2 | 統合テスト | プロジェクト情報が完全に取得され統合される |
| Req 3 | E2Eテスト | マッチ情報が正確に集計・表示される |
| Req 4 | セキュリティテスト | クロステナントアクセスが100%ブロックされる |
| Req 5 | 統合テスト | S3パス補正が全パターンで正しく動作する |
| Req 6 | パフォーマンステスト | レスポンスタイム目標値を95%以上達成 |
| Req 7 | ユニットテスト | 全エラーパターンで適切なレスポンスが返却される |
| Req 8 | 統合テスト | レスポンス形式が仕様に100%準拠する |
| Req 9 | アーキテクチャレビュー | 拡張性設計が承認される |

---

## Assumptions and Constraints

### Assumptions
- file_metadataテーブルまたはAthenaが利用可能
- metadata_jsonカラムにGINインデックスが作成されている
- S3バケットへのアクセス権限が付与されている
- プロジェクト名はS3キーから一意に抽出可能
- 1プロジェクト = 1現在版MAIMLファイルの関係が維持される

### Constraints
- 検索条件は最大5件まで
- 検索結果は最大100件まで
- レスポンスタイムは最大5秒
- 現在版MAIMLファイルのみが検索対象（アーカイブは対象外）
- PostgreSQL JSONBまたはAWS Athenaの機能に依存

---

## Change History

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成（EARS形式要件定義） | Cline |
