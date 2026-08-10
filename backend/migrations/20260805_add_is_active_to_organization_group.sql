-- organization_group テーブルへの is_active カラム追加
--
-- 背景: DDL (docs/design/db/ddl/organization_group.sql) に is_active が追加されたため、
--       既存 DB に同カラムを追加する。
--       DEFAULT true により既存レコードは全て有効（アクティブ）として扱われる。

ALTER TABLE organization_group
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN organization_group.is_active IS 'アクティブ判定';
