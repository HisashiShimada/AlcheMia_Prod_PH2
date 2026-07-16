-- Project Name : noname
-- Date/Time    : 2026/07/10 10:45:26
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
 
-- 組織階層利用者
-- * BackupToTempTable
DROP TABLE if exists organization_group_user CASCADE;
 
-- * RestoreFromTempTable
CREATE TABLE organization_group_user (
  organization_id uuid NOT NULL
  , organization_group_cd VARCHAR(50) NOT NULL
  , user_id  VARCHAR(50) NOT NULL
  , create_user_id VARCHAR(50)
  , "create_at "  TIMESTAMP
  , CONSTRAINT organization_group_user_PKC PRIMARY KEY (organization_id,organization_group_cd,user_id)
) ;
 
COMMENT ON TABLE organization_group_user IS '組織階層利用者';
COMMENT ON COLUMN organization_group_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_group_user.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_group_user.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_group_user."create_at " IS '作成日時';
 