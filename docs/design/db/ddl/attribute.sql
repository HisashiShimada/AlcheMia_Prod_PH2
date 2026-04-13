-- Project Name : noname
-- Date/Time    : 2026/04/08 16:52:09
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

-- 属性
-- * BackupToTempTable
DROP TABLE if exists attribute CASCADE;

-- * RestoreFromTempTable
CREATE TABLE attribute (
  organization_id uuid NOT NULL
  , attribute_name character varying NOT NULL
  , attribute_value character varying NOT NULL
  , attribute_remark character varying
  , department_cd character varying(50)
  , is_active BOOLEAN NOT NULL
  , create_user_id character varying(50)
  , create_at timestamp
  , update_user_id character varying(50)
  , update_at timestamp
  , CONSTRAINT attribute_PKC PRIMARY KEY (organization_id,attribute_name,attribute_value)
) ;

COMMENT ON TABLE attribute IS '属性';
COMMENT ON COLUMN attribute.organization_id IS '組織ID';
COMMENT ON COLUMN attribute.attribute_name IS '属性名';
COMMENT ON COLUMN attribute.attribute_value IS '属性値';
COMMENT ON COLUMN attribute.attribute_remark IS '属性_備考';
COMMENT ON COLUMN attribute.department_cd IS '部署CD';
COMMENT ON COLUMN attribute.is_active IS 'アクティブ判定';
COMMENT ON COLUMN attribute.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN attribute.create_at IS '作成日時';
COMMENT ON COLUMN attribute.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN attribute.update_at IS '更新日時';

