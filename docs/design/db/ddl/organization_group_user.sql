-- Project Name : noname
-- Date/Time    : 2026/07/10 10:44:04 (typo修正: 2026/07/10)
-- Author       : mi_ito
-- RDBMS Type   : PostgreSQL
-- Application  : A5:SQL Mk-2
 
/*
  << 注意！！ >>
  BackupToTempTable, RestoreFromTempTable疑似命令が付加されています。
  これにより、drop table, create table 後もデータが残ります。
  この機能は一時的に $$TableName のような一時テーブルを作成します。
  この機能は A5:SQL Mk-2でのみ有効であることに注意してください。
*/
 
-- 組織階層グループ
-- * BackupToTempTable
DROP TABLE if exists organization_group CASCADE;
 
-- * RestoreFromTempTable
CREATE TABLE organization_group (
  organization_id UUID NOT NULL
  , organization_group_cd VARCHAR(50) NOT NULL
  , organization_group_name VARCHAR(255) NOT NULL
  , chief_user_id character varying(50) NOT NULL
  , parent_group_cd VARCHAR(50)
  , layer VARCHAR(20)
  , create_user_id VARCHAR(50)
  , create_at TIMESTAMP
  , update_user_id VARCHAR(50)
  , update_at TIMESTAMP
  , CONSTRAINT organization_group_PKC PRIMARY KEY (organization_id, organization_group_cd)
) ;
 
COMMENT ON TABLE organization_group IS '組織階層グループ';
COMMENT ON COLUMN organization_group.organization_id IS '組織ID';
COMMENT ON COLUMN organization_group.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group.organization_group_name IS '組織階層グループ名';
COMMENT ON COLUMN organization_group.chief_user_id IS '代表者ユーザID';
COMMENT ON COLUMN organization_group.parent_group_cd IS '親階層グループCD';
COMMENT ON COLUMN organization_group.layer IS 'レイヤー';
COMMENT ON COLUMN organization_group.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_group.create_at IS '作成日時';
COMMENT ON COLUMN organization_group.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization_group.update_at IS '更新日時';