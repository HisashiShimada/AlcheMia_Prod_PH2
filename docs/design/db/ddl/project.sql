-- Project Name : noname
-- Date/Time    : 2026/07/10 11:24:13
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

-- プロジェクト
-- * BackupToTempTable
DROP TABLE if exists project CASCADE;

-- * RestoreFromTempTable
CREATE TABLE project (
  organization_id uuid NOT NULL
  , project_id varchar(20) NOT NULL
  , project_name character varying
  , description text
  , organization_group_cd character varying(50)
  , owner_user_id character varying(50)
  , project_status numeric(2,0)
  , project_maiml_flg BOOLEAN
  , checkout_status numeric(2,0)
  , project_uuid uuid
  , create_user_id character varying(50)
  , create_at timestamp
  , update_user_id character varying(50)
  , update_at timestamp
  , CONSTRAINT project_PKC PRIMARY KEY (organization_id,project_id)
) ;

ALTER TABLE project ADD CONSTRAINT uk_project_project_name
  UNIQUE (project_name) ;

COMMENT ON TABLE project IS 'プロジェクト';
COMMENT ON COLUMN project.organization_id IS '組織ID';
COMMENT ON COLUMN project.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project.project_name IS 'プロジェクト名:プロジェクト名かつフォルダ名';
COMMENT ON COLUMN project.description IS '概要';
COMMENT ON COLUMN project.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN project.owner_user_id IS '所有者ユーザID';
COMMENT ON COLUMN project.project_status IS 'プロジェクトステータス';
COMMENT ON COLUMN project.project_maiml_flg IS 'プロジェクトMaiml有無:false:ファイルなし、true:ファイルあり';
COMMENT ON COLUMN project.checkout_status IS 'チェックアウトステータス';
COMMENT ON COLUMN project.project_uuid IS 'プロジェクトUUID';
COMMENT ON COLUMN project.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project.create_at IS '作成日時';
COMMENT ON COLUMN project.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project.update_at IS '更新日時';

