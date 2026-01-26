# タスク計画書: file_metadataテーブル定義の反映

## メタデータ
- **作成日時**: 2026-01-16 13:20
- **タスクID**: file_metadata_implementation
- **優先度**: 中
- **推定工数**: 3時間

---

## 1. タスク概要

referenceフォルダ配下の既存ソースから`file_metadata`テーブルの使用用途・定義を抽出し、現在のmmdpfプロジェクトに反映する。

### 背景
- 現在のプロジェクトには`file_metadata`テーブルの定義が存在しない
- referenceプロジェクトでは非常に詳細な57カラムのfile_metadataテーブルが定義されている
- このテーブルはS3ファイル管理、MAIML解析結果保存、パフォーマンス最適化に重要な役割を果たしている

---

## 2. 目的と期待される成果

### 目的
referenceプロジェクトで実証済みのfile_metadata設計を現在のプロジェクトに適用し、ファイル管理機能の基盤を構築する。

### 期待される成果
- [x] file_metadataテーブルのDDLファイル作成
- [ ] テーブル定義ドキュメントの作成/更新
- [ ] 関連インデックスの定義
- [ ] マイグレーションスクリプトの作成
- [ ] 使用方法のドキュメント化

---

## 3. 実装ステップ

### Phase 1: file_metadataテーブルの理解と整理

#### Step 1-1: referenceプロジェクトの調査結果まとめ
- [x] file_metadataテーブルのDDL確認（local-db-init.sqlから抽出）
- [x] 使用用途の確認（WORKER_DASHBOARD_FILE_METADATA_OPTIMIZATION_COMPLETE.mdから）
- [x] 主要な機能カラムの特定

#### Step 1-2: 主要カラムの分類
file_metadataテーブルは以下のカテゴリに分類される：

**A. 基本情報（必須）**
- `id` (SERIAL PRIMARY KEY)
- `file_key` (VARCHAR(500) UNIQUE NOT NULL) - S3キー
- `original_filename` (VARCHAR(255) NOT NULL)
- `file_size` (BIGINT NOT NULL)
- `file_type`, `file_extension`
- `uploaded_by` (VARCHAR(100) NOT NULL)
- `organization_id` (VARCHAR(255)) - マルチテナント分離

**B. S3管理情報**
- `s3_bucket` (VARCHAR(100) NOT NULL)
- `s3_region` (VARCHAR(50))
- `s3_storage_class` (VARCHAR(50))
- `s3_etag` (VARCHAR(100))

**C. MAIML関連メタデータ（重要）**
- `is_maiml_file` (BOOLEAN)
- `maiml_version` (VARCHAR(20))
- `maiml_transitions_count` (INTEGER) - **パフォーマンス最適化に使用**
- `maiml_places_count` (INTEGER)
- `maiml_validation_result` (JSONB)
- `maiml_analysis_status` (VARCHAR(20))
- `maiml_error_count`, `maiml_warning_count` (INTEGER)
- `maiml_last_analyzed` (TIMESTAMP)

**D. MAIML検索用メタデータ（拡張機能）**
- `maiml_document_uuid`, `maiml_document_name`, `maiml_document_description`
- `maiml_measurement_values` (JSONB)
- `maiml_units`, `maiml_section_types`, `maiml_ids`, `maiml_refs` (JSONB)
- `maiml_keys`, `maiml_elements`, `maiml_values` (JSONB)
- `maiml_metadata_extracted_at`, `maiml_metadata_extraction_status`

**E. アップロード・バッチ管理**
- `upload_batch_id` (VARCHAR(255))
- `upload_source`, `upload_method`
- `upload_timestamp`

**F. バリデーション・処理状態**
- `processing_status` (VARCHAR(50))
- `validation_status` (VARCHAR(50))
- `validation_errors` (JSONB)

**G. アクセス制御・権限**
- `access_level` (VARCHAR(20))
- `owner_user_id` (VARCHAR(100))
- `access_permissions` (JSONB)

**H. バージョン管理**
- `version_number` (INTEGER)
- `parent_version_id` (INTEGER)

**I. ドラフト管理**
- `is_draft` (BOOLEAN)
- `draft_metadata` (JSONB)
- `last_edit_timestamp`

**J. 統計・メタデータ**
- `download_count`, `view_count`, `share_count` (INTEGER)
- `tags` (JSONB)
- `custom_metadata` (JSONB)
- `search_keywords` (JSONB)

**K. タイムスタンプ**
- `created_at`, `updated_at`, `last_accessed_at`, `archived_at`

### Phase 2: 現在プロジェクトへの適用設計

#### Step 2-1: mmdpfプロジェクトで必要なカラムの選定

**ユーザー要望**: 「S3へのファイルアクセスに必要な部分のみの実装」

**完全調査結果に基づく決定:**

**初期実装（v1.0 - 今回実装）: S3アクセス必須10カラムのみ**

```sql
-- S3アクセス必須カラム（10カラム）
id                    SERIAL PRIMARY KEY               -- 主キー
file_key              VARCHAR(500) UNIQUE NOT NULL     -- S3キー（必須）
s3_bucket             VARCHAR(100) NOT NULL            -- S3バケット名（必須）
organization_id       VARCHAR(255) NOT NULL            -- マルチテナント分離（必須）
original_filename     VARCHAR(255) NOT NULL            -- ファイル名（参考情報）
file_size             BIGINT NOT NULL                  -- ファイルサイズ（参考情報）
file_type             VARCHAR(100)                     -- MIMEタイプ（参考情報）
uploaded_by           VARCHAR(100) NOT NULL            -- アップロードユーザー
created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
```

**除外したカラム（v2.0以降で追加）:**

MAIML解析メタデータ（3カラム）は、S3アクセスには不要なため初期実装から除外：
- `maiml_transitions_count` → v2.0で追加（パフォーマンス最適化用）
- `maiml_places_count` → v2.0で追加（パフォーマンス最適化用）
- `maiml_validation_result` → v2.0で追加（バリデーション結果保存用）

**理由**: workerRoutes.jsで使用されているが、基本的なS3ファイルアクセスには不要。MAIML解析機能実装時に追加する。

**将来追加予定（機能実装時）:**
- v2.0: MAIML解析メタデータ（3カラム）
- v3.0: アップロード・バッチ管理（upload_batch_id等）
- v4.0: バリデーション情報（validation_status等）
- v5.0: ドラフト管理（is_draft等）
- v6.0: 検索メタデータ（tags、search_keywords等）

#### Step 2-2: DDLファイルの作成
- `docs/design/db/ddl/file_metadata.sql`を作成
- 初期実装（v1.0）の10カラムのみを実装
- 将来追加予定のカラムはコメントで記載

### Phase 3: ドキュメント作成・更新

#### Step 3-1: db_table_list.mdの更新
`docs/design/db/db_table_list.md`に以下を追加：
- file_metadataテーブルの物理名・論理名
- 主要カラム一覧
- 主キー・外部キー・インデックス情報
- DDLファイルへのリンク

#### Step 3-2: 使用方法ドキュメントの作成
`docs/design/db/file_metadata_usage.md`を作成：
- file_metadataテーブルの用途説明
- パフォーマンス最適化における役割
- MAIML解析結果の保存方法
- クエリ例（JOIN例、検索例）

### Phase 4: マイグレーションスクリプトの作成

#### Step 4-1: マイグレーションSQLの作成
- 新規テーブル作成用のマイグレーションスクリプト
- ロールバック用のスクリプト

---

## 4. 影響範囲

### 新規作成するファイル
1. `docs/design/db/ddl/file_metadata.sql` - テーブル定義DDL
2. `docs/design/db/file_metadata_usage.md` - 使用方法ドキュメント
3. `backend/sql/migrations/YYYYMMDD_create_file_metadata.sql` - マイグレーションスクリプト

### 更新するファイル
1. `docs/design/db/db_table_list.md` - テーブル一覧に追加
2. `docs/design/db/ddl/README.md` - DDLファイル一覧に追加

### 影響を受ける機能
現時点では影響なし（新規テーブル作成のみ）。
将来的に以下の機能で使用予定：
- S3ファイル管理機能
- MAIMLファイル解析・バリデーション
- ファイル検索・フィルタリング
- アップロードバッチ管理

---

## 5. 技術的詳細

### file_metadataの主要な使用パターン（referenceプロジェクトより）

#### パターン1: ワーカーダッシュボードのパフォーマンス最適化
**課題**: 各MAIMLファイルをS3からダウンロード+パースすると遅い
**解決策**: file_metadataから直接トランジション数を取得

```sql
-- ✅ 最適化後（file_metadata活用）
SELECT 
  mwa.*,
  fm.maiml_transitions_count,      -- DBから直接取得
  fm.maiml_places_count,
  fm.maiml_validation_result,
  fm.file_size,
  fm.updated_at as file_updated_at
FROM maiml_work_assignments mwa
LEFT JOIN file_metadata fm ON mwa.maiml_file_key = fm.file_key
WHERE mwa.assigned_worker_id = $1
  AND mwa.organization_id = $2;  -- マルチテナント分離
```

**効果**: 約100倍高速化（数十秒 → 数百ミリ秒）

#### パターン2: MAIMLファイルのバリデーション結果保存

```sql
-- MAIMLファイル解析後にメタデータを保存
UPDATE file_metadata
SET 
  is_maiml_file = true,
  maiml_version = '1.0',
  maiml_transitions_count = 15,
  maiml_places_count = 20,
  maiml_validation_result = '{"valid": true, "errors": []}'::jsonb,
  maiml_analysis_status = 'analyzed',
  maiml_last_analyzed = CURRENT_TIMESTAMP
WHERE file_key = $1
  AND organization_id = $2;
```

#### パターン3: organization_id必須フィルタ（マルチテナント分離）

```sql
-- ❌ 悪い例
SELECT * FROM file_metadata WHERE file_key = $1;

-- ✅ 良い例
SELECT * FROM file_metadata 
WHERE file_key = $1 
  AND organization_id = $2;
```

### インデックス戦略

referenceプロジェクトで定義されている重要なインデックス：

```sql
-- 基本検索用
CREATE INDEX idx_file_metadata_file_key ON file_metadata(file_key);
CREATE INDEX idx_file_metadata_organization_id ON file_metadata(organization_id);

-- MAIML関連
CREATE INDEX idx_file_metadata_is_maiml_file ON file_metadata(is_maiml_file);
CREATE INDEX idx_file_metadata_maiml_status ON file_metadata(maiml_analysis_status);

-- アップロード管理
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);
CREATE INDEX idx_file_metadata_upload_batch_id ON file_metadata(upload_batch_id);

-- ドラフト管理
CREATE INDEX idx_file_metadata_is_draft ON file_metadata(is_draft) WHERE is_draft = TRUE;
CREATE INDEX idx_file_metadata_user_draft 
  ON file_metadata(uploaded_by, is_draft, last_edit_timestamp DESC) 
  WHERE is_draft = TRUE;

-- JSONB用GINインデックス（検索機能用）
CREATE INDEX idx_file_metadata_tags_gin ON file_metadata USING gin(tags);
CREATE INDEX idx_file_metadata_custom_metadata_gin ON file_metadata USING gin(custom_metadata);
CREATE INDEX idx_file_metadata_maiml_validation_result_gin 
  ON file_metadata USING gin(maiml_validation_result);
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| カラム数が多すぎて管理が複雑 | 中 | 高 | Phase分けして段階的に実装 |
| 既存のファイル管理ロジックとの整合性 | 中 | 中 | まずテーブルのみ作成、使用は段階的 |
| パフォーマンスへの影響 | 低 | 低 | 適切なインデックスを設定 |
| マイグレーション失敗 | 高 | 低 | ロールバックスクリプトを準備 |

---

## 7. テスト計画

### Phase 2.1のテスト
- [ ] テーブル作成の成功確認
- [ ] 主キー・UNIQUE制約の動作確認
- [ ] インデックスの作成確認
- [ ] organization_id外部キー制約の動作確認

### Phase 2.2のテスト（将来）
- [ ] 基本的なCRUD操作
- [ ] JOINクエリの動作確認
- [ ] GINインデックスを使った検索
- [ ] パフォーマンステスト

---

## 8. ロールバック計画

マイグレーション失敗時の手順：

```sql
-- ロールバック用スクリプト
DROP TABLE IF EXISTS file_metadata CASCADE;
```

---

## 9. 関連ドキュメント

### referenceプロジェクト
- `reference/WORKER_DASHBOARD_FILE_METADATA_OPTIMIZATION_COMPLETE.md` - 最適化事例
- `reference/backend/sql/local-db-init.sql` - テーブル定義
- `reference/backend/scripts/UNIFIED_SCHEMA_README.md` - スキーマ概要

### 現在プロジェクト
- `docs/design/db/db_table_list.md` - テーブル一覧（更新予定）
- `.clinerules/references/db_structure.md` - DB構造定義ルール
- `.clinerules/development/backend.md` - バックエンド規約

---

## 10. 承認記録

- **計画書提示日時**: 2026-01-16 13:20
- **承認日時**: （承認後記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 11. 実施記録

### 実施日時
開始: （作業開始時記入）
完了: （作業完了時記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] file_metadata.sql - テーブル定義DDL
- [ ] file_metadata_usage.md - 使用方法ドキュメント
- [ ] db_table_list.md更新 - テーブル一覧への追加
- [ ] マイグレーションスクリプト

---

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）

---

## 付録: file_metadataテーブル定義サマリー

### 基本構造（初期実装 v1.0 - 13カラム）

```sql
CREATE TABLE file_metadata (
    id SERIAL PRIMARY KEY,
    
    -- 基本情報
    file_key VARCHAR(500) UNIQUE NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    uploaded_by VARCHAR(100) NOT NULL,
    
    -- マルチテナント分離（必須）
    organization_id VARCHAR(255) NOT NULL,
    
    -- S3管理
    s3_bucket VARCHAR(100) NOT NULL,
    
    -- MAIML解析メタデータ（workerRoutes.jsで使用中）
    maiml_transitions_count INTEGER,
    maiml_places_count INTEGER,
    maiml_validation_result JSONB,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー
    FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id) ON DELETE CASCADE
);

-- 基本インデックス
CREATE INDEX idx_file_metadata_file_key ON file_metadata(file_key);
CREATE INDEX idx_file_metadata_organization_id ON file_metadata(organization_id);
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);

-- MAIML解析メタデータ用GINインデックス（JSONB検索用）
CREATE INDEX idx_file_metadata_maiml_validation_result_gin 
  ON file_metadata USING gin(maiml_validation_result);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_file_metadata_updated_at
    BEFORE UPDATE ON file_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### カラム数の推移
- **初期実装（v1.0）**: 13カラム（今回実装）
  - 基本情報: 10カラム
  - MAIML解析メタデータ: 3カラム（workerRoutes.jsで使用中）
- **v2.0**: +MAIML解析メタデータ（約10カラム） - MAIML解析機能実装時
- **v3.0**: +アップロード管理（約5カラム） - バッチアップロード機能実装時
- **v4.0**: +バリデーション・ドラフト（約10カラム） - 各機能実装時
- **v5.0**: +検索・統計（約20カラム） - 高度な検索機能実装時
- **最終形**: 約55カラム（referenceプロジェクトと同等）

---

**タスク計画書作成完了** ✅
