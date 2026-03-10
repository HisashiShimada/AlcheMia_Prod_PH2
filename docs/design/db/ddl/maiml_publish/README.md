# maiml_publish スキーマ DDL

## 概要

このフォルダには **MaiML OpenData Pipeline** 専用の PostgreSQL スキーマ `maiml_publish` のテーブル DDL を格納します。

**設計書**: `docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md`

---

## テーブル一覧

| ファイル | テーブル名 | 説明 |
|---------|-----------|------|
| `maiml_asset.sql` | `maiml_publish.maiml_asset` | 公開アセット（MaiML ファイル単位） |
| `maiml_publish_registry.sql` | `maiml_publish.maiml_publish_registry` | 公開レジストリ（公開オプション・ステータス管理） |
| `maiml_condition_kv.sql` | `maiml_publish.maiml_condition_kv` | 実験条件 KV（condition / conditionTemplate 抽出） |
| `maiml_material_kv.sql` | `maiml_publish.maiml_material_kv` | 材料情報 KV（material / materialTemplate 抽出） |
| `maiml_series_preview.sql` | `maiml_publish.maiml_series_preview` | 系列プレビューデータ（uniform / maxhold / mmr） |
| `maiml_series_raw_header.sql` | `maiml_publish.maiml_series_raw_header` | 生データヘッダ |
| `maiml_series_raw_chunk.sql` | `maiml_publish.maiml_series_raw_chunk` / `maiml_series_raw_chunk_bin` | 生データチャンク（Array方式 / Binary方式） |

---

## テーブル依存関係

```
maiml_asset
  ├── maiml_publish_registry  (asset_id FK)
  ├── maiml_condition_kv      (asset_id FK)
  ├── maiml_material_kv       (asset_id FK)
  ├── maiml_series_preview    (asset_id FK)
  └── maiml_series_raw_header (asset_id FK)
        ├── maiml_series_raw_chunk      (raw_id FK)
        └── maiml_series_raw_chunk_bin  (raw_id FK)
```

`maiml_asset` を DELETE すると CASCADE で全子テーブルのデータが削除されます。

---

## マイグレーション

マイグレーションは単一ファイルで管理しています：

```
backend/migrations/20260310_create_maiml_opendata_tables.sql  # CREATE
backend/migrations/20260310_rollback_maiml_opendata_tables.sql # DROP
```

---

## スキーマ分離の方針

| スキーマ | 用途 | DDL 格納場所 |
|---------|------|------------|
| `public` | mmdpf 通常テーブル（project / organization 等） | `docs/design/db/ddl/` 直下 |
| `maiml_publish` | MaiML 公開パイプライン専用テーブル | `docs/design/db/ddl/maiml_publish/` |

この分離により、将来的に公開 DB を別インスタンスや RLS ポリシーで独立管理しやすくなります。
