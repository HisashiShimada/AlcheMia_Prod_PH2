# Research & Design Decisions

---
**Feature**: project-search-api  
**Discovery Scope**: Extension (Complex Integration)  
**Key Findings**:
- 既存のプロジェクト管理API（api_project_management.md）とMAIMLメタデータ検索の統合
- file_metadataテーブルのJSONB検索機能を活用（GINインデックス必須）
- S3パス構造からプロジェクト名抽出のロジックが必要
- 複雑な検索条件（1〜5件のAND条件）に対するパフォーマンス最適化が重要

---

## Research Log

### PostgreSQL JSONB検索パフォーマンス

**Context**: file_metadataテーブルのmetadata_jsonカラムで複数条件のAND検索を実行する必要がある

**Sources Consulted**:
- PostgreSQL公式ドキュメント - JSONB Indexing
- 既存のfile_metadataテーブルDDL定義
- パフォーマンステスト結果（既存システム）

**Findings**:
- GINインデックスが metadata_json カラムに作成されていることを確認
- `@>` 演算子を使用した包含検索が最も効率的
- 複数条件のAND結合でも、GINインデックスにより500ms以内のレスポンスが可能
- 検索条件が5件の場合でも、適切なインデックス設計により2秒以内を達成可能

**Implications**:
- metadata_jsonカラムのJSONB構造を検索しやすい形式で保持する必要がある
- 検索クエリは `WHERE metadata_json @> '{"key": "value"}'::jsonb` パターンを使用
- 検索条件が増えるほどレスポンスタイムが線形増加するため、最大5件の制限は妥当

### S3パス構造とプロジェクト名抽出

**Context**: MAIMLファイルのS3キーからプロジェクト名を特定し、projectテーブルと結合する必要がある

**Sources Consulted**:
- .clinerules/references/s3_structure.md
- 既存のstorageService実装

**Findings**:
- S3パス形式: `org_{organization_prefix}/projects/{project_name}/{project_name}.maiml`
- プロジェクト名はS3キーから正規表現で抽出可能: `/^projects\/([^\/]+)\/\1\.maiml$/`
- アーカイブファイル（`archive/` 配下）は検索対象外とする設計
- S3パスの補正ロジック（バケット名、organization_prefix）が必要

**Implications**:
- file_metadataテーブルのobject_keyカラムからプロジェクト名を抽出する関数が必要
- アーカイブファイルを除外するフィルタリングロジックが必要
- S3パス補正は既存のs3PathHelperユーティリティを活用可能

### マルチテナント分離とセキュリティ

**Context**: 検索結果が他組織のデータを含まないことを保証する必要がある

**Sources Consulted**:
- .clinerules/development/security.md
- 既存のtenantIsolationミドルウェア実装
- api_project_management.mdのセキュリティパターン

**Findings**:
- すべてのクエリで organization_id フィルタが必須
- file_metadata、project 両テーブルで organization_id による分離が実装済み
- 既存のtenantIsolationミドルウェアを使用可能
- S3署名付きURLは1時間有効期限で生成

**Implications**:
- クエリ構築時に organization_id を必ず含める
- System Admin以外はクロステナントアクセス不可
- Parameterized Queries を使用してSQLインジェクション対策

### 検索条件バリデーションと許可属性

**Context**: ユーザーが指定できる検索属性を制限し、不正なクエリを防ぐ必要がある

**Sources Consulted**:
- 要件書の「許可される attribute 値」セクション
- MAIMLファイル仕様（specification/）

**Findings**:
- 許可される属性は11種類（document.*, measurement_*, section_type, id, ref, key, element, value）
- 各属性の検索値は1〜255文字に制限
- 属性名のホワイトリスト検証が必要
- 検索条件は最大5件まで（パフォーマンス考慮）

**Implications**:
- バリデーション関数で許可属性のホワイトリストチェック
- 不正な属性名に対して明確なエラーメッセージ
- 検索条件数の上限チェック（6件以上で400エラー）

### レスポンスタイム要件と最適化

**Context**: 検索条件の数に応じたレスポンスタイム目標を達成する必要がある

**Sources Consulted**:
- 要件書の「Requirement 6: パフォーマンスとスケーラビリティ」
- 既存システムのパフォーマンステスト結果

**Findings**:
- 単一条件: 500ms以内（目標）
- 2〜3条件: 1秒以内
- 4〜5条件: 2秒以内
- 最大許容時間: 5秒

**Implications**:
- クエリ最適化が重要（JOINの順序、インデックス活用）
- 検索結果キャッシング（TTL: 5分）の実装
- 検索結果の最大件数制限（100件）

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **Layered Architecture** (選択) | Controller → Service → Repository の3層構造 | 既存パターンとの一貫性、責任分離明確 | 複雑な検索ロジックでService層が肥大化 | api_project_management.mdと同じパターン |
| Hexagonal Architecture | Port/Adapter パターンでデータソース抽象化 | 将来のElasticsearch移行が容易 | 実装コスト増、オーバーエンジニアリングのリスク | 現時点では不要、将来の拡張として検討 |
| CQRS | 検索（Query）と更新（Command）を分離 | 検索最適化が容易 | 複雑性増加、小規模機能には過剰 | 将来の拡張として検討 |

**選択理由**: 既存のプロジェクト管理APIと同じLayered Architectureを採用することで、開発者の学習コスト削減と保守性向上を優先。将来的にElasticsearchへの移行が必要になった場合は、Repository層のみを差し替える設計とする。

---

## Design Decisions

### Decision: file_metadata vs Athena検索

**Context**: MAIMLメタデータの検索をPostgreSQLのfile_metadataテーブルで行うか、AWS Athenaで行うか

**Alternatives Considered**:
1. **PostgreSQL file_metadata** - JSONB + GINインデックス
2. **AWS Athena** - S3上のデータを直接クエリ

**Selected Approach**: PostgreSQL file_metadataテーブルを第一選択肢とし、将来的にAthenaへの切り替えオプションを残す

**Rationale**:
- file_metadataテーブルは既に存在し、GINインデックスも設定済み
- PostgreSQLの方がレスポンスタイムが速い（Athenaは数秒かかる可能性）
- トランザクション管理が容易
- Athenaは大量データ分析向け（現時点では不要）

**Trade-offs**:
- 利点: 高速レスポンス、トランザクション対応、既存インフラ活用
- 欠点: データ量増加時のスケーラビリティ懸念（インデックスサイズ）

**Follow-up**: データ量が数百万件を超える場合、Athenaへの移行を検討

### Decision: 検索結果のソート順序

**Context**: 複数のプロジェクトがマッチした場合、どの順序で返却するか

**Alternatives Considered**:
1. **マッチ件数順** - 関連度の高い順
2. **最終更新日時順** - 新しい順
3. **プロジェクト名順** - アルファベット順

**Selected Approach**: マッチ件数の多い順、同じ場合は最終更新日時の新しい順

**Rationale**:
- ユーザーは関連度の高いプロジェクトから確認したい
- マッチ件数が多い = より多くの検索条件に該当 = より関連性が高い
- 同じマッチ件数の場合、新しいプロジェクトを優先

**Trade-offs**:
- 利点: 直感的、ユーザーが求める結果が上位に表示
- 欠点: マッチ件数の計算コスト

**Follow-up**: ユーザーフィードバックに基づいてソート順序の調整を検討

### Decision: S3パス補正の実装場所

**Context**: S3パスが不正な形式の場合、どこで補正するか

**Alternatives Considered**:
1. **Repository層** - データ取得時に補正
2. **Service層** - ビジネスロジックとして補正
3. **Utility層** - 共通関数として補正

**Selected Approach**: Utility層（s3PathHelper）で共通関数として実装し、Service層から呼び出す

**Rationale**:
- S3パス補正は複数の箇所で使用される共通ロジック
- Repository層はデータアクセスに集中すべき
- 既存のs3PathHelperユーティリティが存在

**Trade-offs**:
- 利点: コードの再利用性、テストの容易性
- 欠点: 関数呼び出しのオーバーヘッド（微小）

**Follow-up**: なし

### Decision: キャッシング戦略

**Context**: 検索結果をキャッシュしてパフォーマンスを向上させるか

**Alternatives Considered**:
1. **キャッシュなし** - 常にDBクエリ
2. **検索結果キャッシュ** - 検索条件をキーにキャッシュ
3. **属性リストキャッシュ** - 許可属性リストのみキャッシュ

**Selected Approach**: 検索結果キャッシュ（TTL: 5分）+ 属性リストキャッシュ（TTL: 1時間）

**Rationale**:
- 同じ検索条件での再クエリを削減
- ファイル更新時はキャッシュ無効化
- 頻繁に変更されない属性リストは長めのTTL

**Trade-offs**:
- 利点: レスポンスタイム向上、DBサーバー負荷削減
- 欠点: キャッシュ管理の複雑さ、若干のデータの鮮度低下

**Follow-up**: キャッシュヒット率をモニタリングし、TTLを調整

---

## Risks & Mitigations

**Risk 1: 大量データ時の検索パフォーマンス低下**
- **Mitigation**: 検索結果を最大100件に制限、GINインデックスの適切な設定、将来的にElasticsearchへの移行オプション

**Risk 2: S3パスの形式が不正なファイルが存在する場合の処理**
- **Mitigation**: パス補正ロジックの実装、補正不可能な場合はスキップ、エラーログ記録

**Risk 3: 検索条件の組み合わせが爆発的に増えた場合のキャッシュ管理**
- **Mitigation**: キャッシュキーの最大数制限（LRUアルゴリズム）、TTLを短めに設定

**Risk 4: マッチ情報の集計処理がボトルネックになる可能性**
- **Mitigation**: マッチした値の表示を最大5件に制限、集計処理の最適化

**Risk 5: プロジェクトが削除されたがMAIMLファイルは残っている場合**
- **Mitigation**: 検索結果からプロジェクトが見つからない場合は結果から除外、定期的なクリーンアップジョブの実装を検討

---

## References

- [プロジェクト管理API仕様](../../docs/design/api/api_project_management.md) - 既存のAPI設計パターン
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一規約
- [S3構造定義](../../.clinerules/references/s3_structure.md) - S3フォルダ構成とパス規則
- [データベース構造](../../.clinerules/references/db_structure.md) - file_metadataテーブル定義
- [セキュリティ規約](../../.clinerules/development/security.md) - マルチテナント分離とセキュリティ要件
- [PostgreSQL JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html) - JSONB型とGINインデックス
- [バックエンド規約](../../.clinerules/development/backend.md) - SQL記述ルールとParameterized Queries
