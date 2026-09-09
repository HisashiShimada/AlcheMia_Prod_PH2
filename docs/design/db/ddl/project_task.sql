-- Project Name : noname
-- Date/Time    : 2026/08/05 15:26:28
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

-- プロジェクトタスク
-- * BackupToTempTable
DROP TABLE if exists project_task CASCADE;

-- * RestoreFromTempTable
CREATE TABLE project_task (
  organization_id uuid NOT NULL
  , project_id varchar(20) NOT NULL
  , method_id character varying NOT NULL
  , experiment_order numeric(2,0) NOT NULL
  , experiment_condition numeric(2,0)
  , attempts_count numeric(3,0)
  , worker_linked_flg BOOLEAN
  , create_user_id character varying(50)
  , create_at TIMESTAMPTZ
  , update_user_id character varying(50)
  , update_at TIMESTAMPTZ
  , CONSTRAINT project_task_PKC PRIMARY KEY (organization_id,project_id,method_id,experiment_order)
) ;

COMMENT ON TABLE project_task IS 'プロジェクトタスク';
COMMENT ON COLUMN project_task.organization_id IS '組織ID';
COMMENT ON COLUMN project_task.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_task.method_id IS 'メソッドID';
COMMENT ON COLUMN project_task.experiment_order IS '実験順序';
COMMENT ON COLUMN project_task.experiment_condition IS '実験条件';
COMMENT ON COLUMN project_task.attempts_count IS '試行回数';
COMMENT ON COLUMN project_task.worker_linked_flg IS '作業者連携済フラグ';
COMMENT ON COLUMN project_task.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_task.create_at IS '作成日時';
COMMENT ON COLUMN project_task.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_task.update_at IS '更新日時';

