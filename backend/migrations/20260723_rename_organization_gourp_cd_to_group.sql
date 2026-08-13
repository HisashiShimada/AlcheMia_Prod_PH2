-- projectテーブルのカラム名タイポ修正
-- organization_gourp_cd → organization_group_cd
-- 
-- 背景: DDL作成時に "group" を "gourp" と誤記していた。
--       コード側 (backend/src/types/database.ts, projectService.ts 等) は
--       正しい "organization_group_cd" を使用していたため、
--       INSERT/SELECT 時に PostgreSQL エラー 42703 (undefined_column) が発生していた。

ALTER TABLE project
  RENAME COLUMN organization_gourp_cd TO organization_group_cd;
