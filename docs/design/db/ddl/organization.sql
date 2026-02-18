-- Project Name : noname
-- Date/Time    : 2026/01/23 16:15:16
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

-- 組織
-- * BackupToTempTable
DROP TABLE if exists organization CASCADE;

-- * RestoreFromTempTable
CREATE TABLE organization (
  organization_id uuid NOT NULL
  , organization_cd character varying(50)
  , organization_display_name character varying(50)
  , organization_email character varying(50)
  , chief_user_id character varying(50)
  , corporation_id uuid
  , is_entry INTEGER
  , is_active BOOLEAN
  , create_user_id VARCHAR(50)
  , create_at timestamp
  , update_user_id VARCHAR(50)
  , update_at timestamp
  , CONSTRAINT organization_PKC PRIMARY KEY (organization_id)
) ;

-- インデックス作成
CREATE INDEX idx_organization_organization_cd ON organization(organization_cd);

-- テーブルコメント
COMMENT ON TABLE organization IS '組織';

-- カラムコメント
COMMENT ON COLUMN organization.organization_id IS '組織ID:9eea5300-db8b-4b2d-8e9e-ec306c476b12';
COMMENT ON COLUMN organization.organization_cd IS '組織CD';
COMMENT ON COLUMN organization.organization_display_name IS '組織表示名';
COMMENT ON COLUMN organization.organization_email IS '組織E-mail';
COMMENT ON COLUMN organization.chief_user_id IS '代表者ユーザID';
COMMENT ON COLUMN organization.corporation_id IS '会社ID';
COMMENT ON COLUMN organization.is_entry IS '二段階認証判定';
COMMENT ON COLUMN organization.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization.create_at IS '作成日時';
COMMENT ON COLUMN organization.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization.update_at IS '更新日時';
