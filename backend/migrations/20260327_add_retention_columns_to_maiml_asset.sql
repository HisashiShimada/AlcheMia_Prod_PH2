-- ============================================================
-- maiml_asset テーブル変更
--
-- @description
--   maiml_asset テーブルに対して以下の変更を行う。
--
--   カラム追加:
--     retention_until  TIMESTAMPTZ  NOT NULL DEFAULT now()  -- 公開期限
--
--   カラム削除:
--     organization_id  TEXT   -- org_schema 移行により不要（スキーマが組織を表す）
--     template_only    BOOLEAN -- 廃止
--
--   インデックス削除:
--     ix_maiml_asset_org（organization_id インデックス）
--
--   インデックス追加:
--     ix_maiml_asset_retention_until（retention_until インデックス）
--
--   ※ created_at / updated_at / ix_maiml_asset_uri は旧バージョンから変更なし
--
--   背景:
--     旧 DDL（36fedac）では maiml_publish 固定スキーマで organization_id / template_only
--     カラムを保持していた。
--     新 DDL（6194e62）にて {org_schema} プレースホルダー形式に移行し、
--     スキーマ自体が組織を表すため organization_id が不要になった。
--     また retention_until（公開期限）カラムが追加された。
--
--   実行対象: 全組織スキーマ
--   実行方法:
--     psql -U <user> -d <dbname> \
--       -v schema=<org_schema_name> \
--       -f 20260327_add_retention_columns_to_maiml_asset.sql
--     例:
--       psql -U postgres -d mmdpf \
--         -v schema=a0718dc5_21f3_44e6_87e9_cc2ae83f3385 \
--         -f 20260327_add_retention_columns_to_maiml_asset.sql
--
--   ロールバック方法:
--     DROP INDEX IF EXISTS "<schema>".ix_maiml_asset_retention_until;
--     ALTER TABLE "<schema>".maiml_asset
--       DROP COLUMN IF EXISTS retention_until,
--       ADD COLUMN organization_id TEXT NOT NULL DEFAULT '',
--       ADD COLUMN template_only BOOLEAN NOT NULL DEFAULT FALSE;
--     CREATE INDEX IF NOT EXISTS ix_maiml_asset_org
--       ON "<schema>".maiml_asset(organization_id);
--
-- @reference
--   docs/design/db/ddl/maiml_publish/maiml_asset.sql
--   backend/src/sql/ddl/org_schema_tables.sql
--   docs/MaiML_OpenData_Pipeline/db.md §4.1
-- ============================================================

-- ============================================================
-- 適用スキーマを変数で指定（psql -v schema=xxx で上書き可能）
-- デフォルト: a0718dc5_21f3_44e6_87e9_cc2ae83f3385
-- ============================================================
\set SCHEMA_NAME :schema

-- カラム追加
-- retention_until は NOT NULL のため、既存レコードには DEFAULT now() を適用
ALTER TABLE :"SCHEMA_NAME".maiml_asset
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ NOT NULL DEFAULT now();

-- カラム削除（org_schema 移行により不要）
ALTER TABLE :"SCHEMA_NAME".maiml_asset
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS template_only;

-- インデックス削除（organization_id 削除に伴い不要）
DROP INDEX IF EXISTS :"SCHEMA_NAME".ix_maiml_asset_org;

-- インデックス追加（retention_until による絞り込み用）
CREATE INDEX IF NOT EXISTS ix_maiml_asset_retention_until
  ON :"SCHEMA_NAME".maiml_asset(retention_until);

-- 確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = :'SCHEMA_NAME'
  AND table_name   = 'maiml_asset'
ORDER BY ordinal_position;
