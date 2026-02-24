# タスク計画書: file_metadataテーブルのカラム不足解消

## メタデータ
- **作成日時**: 2026-02-20 15:28
- **タスクID**: file_metadata_missing_columns
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

Maimlファイル保存処理において、file_metadataテーブルを更新する際に「カラムが存在しない」というエラーが発生している。
backend/reference配下のスクリプトとSQLファイルを調査し、現在のfile_metadataテーブル定義に不足しているカラムを追加する。

## 2. 調査結果

### 2.1 現在のfile_metadata.sqlに定義されているカラム（抜粋）

**基本カラム:**
- file_key, s3_bucket, organization_id, original_filename, file_size, file_type
- file_extension, is_maiml_file, uploaded_by, create_user_id, update_user_id
- created_at, updated_at

**MAIML分析カラム（既存）:**
- maiml_analysis_status
- maiml_error_count
- maiml_warning_count
- maiml_version
- maiml_transitions_count
- maiml_places_count
- maiml_validation_result
- maiml_last_analyzed
- last_edit_timestamp

**Phase 2検索機能カラム:**
- custom_metadata, tags, search_keywords, description, file_hash, parent_folder_path

**Phase 3アップロード管理カラム:**
- upload_batch_id, upload_source, upload_method, s3_storage_class, s3_etag

### 2.2 backend/referenceで使用されているが不足しているカラム

#### backend/reference/services/maimlMetadataExtractor.js で更新されるカラム:
- ✅ organization_id (既存)
- ❌ **maiml_document_uuid** (不足)
- ❌ **maiml_document_name** (不足)
- ❌ **maiml_document_description** (不足)
- ❌ **maiml_measurement_values** (不足)
- ❌ **maiml_units** (不足)
- ❌ **maiml_section_types** (不足)
- ❌ **maiml_ids** (不足)
- ❌ **maiml_refs** (不足)
- ❌ **maiml_keys** (不足)
- ❌ **maiml_elements** (不足)
- ❌ **maiml_values** (不足)
- ❌ **maiml_metadata_extracted_at** (不足)
- ❌ **maiml_metadata_extraction_status** (不足)

#### backend/reference/services/maimlParser.js で更新されるカラム:
- ✅ maiml_analysis_status (既存)
- ✅ maiml_error_count (既存)
- ✅ maiml_warning_count (既存)
- ✅ maiml_transitions_count (既存)
- ✅ maiml_places_count (既存)
- ✅ maiml_version (既存)
- ✅ maiml_last_analyzed (既存)
- ✅ uploaded_by (既存)
- ✅ upload_source (既存)
- ✅ s3_bucket (既存)

### 2.3 不足カラムリスト（13カラム）

1. **maiml_document_uuid** (VARCHAR(255)) - MAIML Document UUID
2. **maiml_document_name** (TEXT) - MAIML Document名
3. **maiml_document_description** (TEXT) - MAIML Document説明
4. **maiml_measurement_values** (JSONB) - MAIML測定値配列
5. **maiml_units** (JSONB) - MAIML単位配列
6. **maiml_section_types** (JSONB) - MAIMLセクション種別配列
7. **maiml_ids** (JSONB) - MAIML ID属性配列
8. **maiml_refs** (JSONB) - MAIML Ref属性配列
9. **maiml_keys** (JSONB) - MAIML Key属性配列
10. **maiml_elements** (JSONB) - MAIML Element名配列
11. **maiml_values** (JSONB) - MAIML汎用Value配列
12. **maiml_metadata_extracted_at** (TIMESTAMP WITH TIME ZONE) - メタデータ抽出日時
13. **maiml_metadata_extraction_status** (VARCHAR(50)) - メタデータ抽出状態

### 2.4 参照元SQL

`backend/reference/sql/add-maiml-search-metadata-columns.sql` に、これらのカラムを追加するマイグレーションSQLが存在します。

## 3. 実装ステップ

### Phase 1: 不足カラムの追加
- [x] 調査完了: 不足カラムを特定（13カラム）
- [ ] `docs/design/db/ddl/file_metadata.sql` に不足カラムを追加
- [ ] カラム定義を適切な位置に配置（MAIML分析カラムセクション）
- [ ] 必要なインデックスを追加

### Phase 2: マイグレーションファイルの作成
- [ ] `backend/migrations/20260220_add_maiml_search_metadata_columns.sql` を作成
- [ ] ALTER TABLE文を記述
- [ ] インデックス作成文を記述
- [ ] コメント追加

### Phase 3: 動作確認
- [ ] DDLファイルの構文チェック
- [ ] マイグレーションファイルの構文チェック
- [ ] 変更内容の最終確認

## 4. 変更ファイル

### 更新するファイル
1. `docs/design/db/ddl/file_metadata.sql` - カラム定義追加

### 新規作成するファイル
1. `backend/migrations/20260220_add_maiml_search_metadata_columns.sql` - マイグレーションSQL

## 5. カラム配置方針

現在のfile_metadata.sqlには以下のセクションがあります：
- Phase 0: 基本カラム
- Phase 2: 詳細検索機能カラム
- Phase 3: アップロード管理カラム

不足しているMAIML検索用メタデータカラムは、**Phase 2の詳細検索機能カラムの後に、新しいサブセクション「MAIML検索用メタデータ」として追加**します。

配置位置:
```
-- Phase 2: 詳細検索機能（既存カラム）
custom_metadata, tags, search_keywords, description, file_hash, parent_folder_path

-- Phase 2.5: MAIML検索用メタデータ（新規追加）
maiml_document_uuid, maiml_document_name, maiml_document_description,
maiml_measurement_values, maiml_units, maiml_section_types,
maiml_ids, maiml_refs, maiml_keys, maiml_elements, maiml_values,
maiml_metadata_extracted_at, maiml_metadata_extraction_status

-- Phase 3: アップロード管理（既存カラム）
upload_batch_id, upload_source, upload_method, s3_storage_class, s3_etag
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存データへの影響 | 中 | 低 | ADD COLUMN IF NOT EXISTS を使用、DEFAULT値設定 |
| インデックス作成の負荷 | 低 | 低 | CREATE INDEX IF NOT EXISTS を使用 |
| カラム名の重複 | 高 | 低 | 既存カラム名を事前確認済み |

## 7. 承認記録

- **計画書提示日時**: 2026-02-20 15:28
- **承認日時**: (承認待ち)
- **承認者コメント**: (承認待ち)

## 8. 補足情報

### idカラムについて
タスク依頼に「idカラムは意図的に削除している」とありますが、現在のfile_metadata.sqlでは主キーとして`file_key`を使用しており、`id`カラムは定義されていません。これは正しい設計です。

### 今回追加するカラムの用途
これらのカラムは、MAIMLファイルの内容を解析して抽出されたメタデータを保存し、高度な検索機能を提供するためのものです。`maimlMetadataExtractor.js`によって自動的に抽出・更新されます。
