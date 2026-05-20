# タスク計画書: file_metadata テーブル不要カラム削除

## メタデータ
- **作成日時**: 2026-05-18 16:32
- **タスクID**: cleanup-file-metadata-columns
- **優先度**: 低
- **推定工数**: 2〜3時間

## タスク概要

`file_metadata` テーブルに存在するが実際にはコードから一切値が設定されていないカラムを削除する。  
削除対象は計20カラム。型定義・リポジトリ・DDL をあわせて整理する。

## 目的と期待される成果
- [ ] テーブル定義がコードの実態と一致する
- [ ] 型定義（`FileMetadataRow`）から未使用フィールドが除去される
- [ ] リポジトリの `JSONB_COLUMNS` など関連定義が整理される

## 削除対象カラム（20カラム）

| # | カラム名 | 削除理由 |
|---|---------|---------|
| 1 | `maiml_validation_result` | 解析結果は `maiml_analysis_results` テーブルで管理。file_metadataへの書き込みなし |
| 2 | `last_edit_timestamp` | 設定・更新コードなし |
| 3 | `s3_etag` | 設定コードなし |
| 4 | `s3_storage_class` | DEFAULT値 `'STANDARD'` のみで使い分けなし |
| 5 | `description` | 設定コードなし |
| 6 | `custom_metadata` | JSONB_COLUMNSに定義あるが値を渡す呼び出しコードなし |
| 7 | `tags` | 同上 |
| 8 | `search_keywords` | 同上 |
| 9 | `maiml_document_uuid` | `maimlMetadataExtractor.ts` が file_metadata に書き込まない |
| 10 | `maiml_document_name` | 同上 |
| 11 | `maiml_document_description` | 同上 |
| 12 | `maiml_measurement_values` | 同上 |
| 13 | `maiml_units` | 同上 |
| 14 | `maiml_section_types` | 同上 |
| 15 | `maiml_ids` | 同上 |
| 16 | `maiml_refs` | 同上 |
| 17 | `maiml_keys` | 同上 |
| 18 | `maiml_elements` | 同上 |
| 19 | `maiml_values` | 同上 |
| 20 | `maiml_metadata_extracted_at` | 同上 |
| 21 | `maiml_metadata_extraction_status` | 同上 |

> ※ `maiml_document_uuid`〜`maiml_metadata_extraction_status` は21番まで含むと21カラム

## 実装ステップ

### Phase 1: DDL（マイグレーション）作成

- [ ] `backend/migrations/` に新しいマイグレーションファイルを作成  
  ファイル名: `20260518_remove_unused_columns_from_file_metadata.sql`
- [ ] 各カラムの `ALTER TABLE file_metadata DROP COLUMN IF EXISTS` を記述

```sql
ALTER TABLE file_metadata
  DROP COLUMN IF EXISTS maiml_validation_result,
  DROP COLUMN IF EXISTS last_edit_timestamp,
  DROP COLUMN IF EXISTS s3_etag,
  DROP COLUMN IF EXISTS s3_storage_class,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS custom_metadata,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS search_keywords,
  DROP COLUMN IF EXISTS maiml_document_uuid,
  DROP COLUMN IF EXISTS maiml_document_name,
  DROP COLUMN IF EXISTS maiml_document_description,
  DROP COLUMN IF EXISTS maiml_measurement_values,
  DROP COLUMN IF EXISTS maiml_units,
  DROP COLUMN IF EXISTS maiml_section_types,
  DROP COLUMN IF EXISTS maiml_ids,
  DROP COLUMN IF EXISTS maiml_refs,
  DROP COLUMN IF EXISTS maiml_keys,
  DROP COLUMN IF EXISTS maiml_elements,
  DROP COLUMN IF EXISTS maiml_values,
  DROP COLUMN IF EXISTS maiml_metadata_extracted_at,
  DROP COLUMN IF EXISTS maiml_metadata_extraction_status;
```

### Phase 2: バックエンド型定義の修正

- [ ] `backend/src/repositories/fileMetadataRepository.ts` の `FileMetadataRow` 型から削除対象フィールドを除去
- [ ] 同ファイルの `JSONB_COLUMNS` から `custom_metadata`, `tags`, `search_keywords` を除去
- [ ] 同ファイルの `insertFileMetadata()` / `updateFileMetadata()` のパラメータ型から対象フィールドを除去

### Phase 3: 関連型定義の修正

- [ ] `backend/src/types/database.ts` など他の型定義ファイルに削除対象カラムが含まれていないか検索・除去
- [ ] `backend/src/utils/stringValidator.ts` の `FILE_METADATA_MAX_LENGTHS` から対象フィールドを除去（あれば）

### Phase 4: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認（`npm run build`）
- [ ] 既存テストが通ることを確認（`npm test`）

## 変更ファイル
1. `backend/migrations/20260518_remove_unused_columns_from_file_metadata.sql` - 新規作成
2. `backend/src/repositories/fileMetadataRepository.ts` - 型定義・JSONB_COLUMNS から除去
3. `backend/src/types/database.ts`（あれば対象フィールドを除去）

## リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| 将来 `maimlMetadataExtractor.ts` の保存先として使う予定があった場合 | 中 | DDL の `DROP COLUMN` は可逆でないため、事前に将来の実装計画を確認 |
| `custom_metadata` / `tags` / `search_keywords` を将来セマンティック検索で使う予定がある場合 | 中 | 同上。削除前にユーザー確認 |
| テストコードに削除対象カラムが含まれている場合 | 低 | `npm test` でコンパイルエラー・テスト失敗として検出可能 |

## テスト計画
- [ ] `npm run build` でコンパイルエラーがないことを確認
- [ ] `npm test` で既存テストが通ることを確認
- [ ] マイグレーション実行後に `\d file_metadata` でカラムが削除されていることを確認

## 承認記録
- **計画書提示日時**: 2026-05-18 16:32
- **承認日時**: 
- **承認者コメント**: 
