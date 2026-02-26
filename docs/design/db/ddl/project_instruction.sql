-- Project Name : noname
-- Date/Time    : 2026/02/24 17:57:16
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

-- プロジェクト指示
-- * BackupToTempTable
DROP TABLE if exists project_instruction CASCADE;

-- * RestoreFromTempTable
CREATE TABLE project_instruction (
  organization_id uuid NOT NULL
  , project_id uuid NOT NULL
  , experiment_instruction_id character varying NOT NULL
  , method_id character varying
  , instruction_target numeric(2,0)
  , priority numeric(2,0)
  , type numeric(2,0)
  , task_no numeric(3,0)
  , transition_id character varying
  , instruction_status numeric(2,0)
  , instructions text
  , instruction_user_id character varying(50)
  , instruction_date timestamp
  , create_user_id character varying(50)
  , create_at timestamp
  , update_user_id character varying(50)
  , update_at timestamp
  , CONSTRAINT project_instruction_PKC PRIMARY KEY (organization_id,project_id,experiment_instruction_id)
) ;

COMMENT ON TABLE project_instruction IS 'プロジェクト指示';
COMMENT ON COLUMN project_instruction.organization_id IS '組織ID';
COMMENT ON COLUMN project_instruction.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_instruction.experiment_instruction_id IS '実験指示ID';
COMMENT ON COLUMN project_instruction.method_id IS 'メソッドID';
COMMENT ON COLUMN project_instruction.instruction_target IS '指示対象:1:ファイル全体、2:タスク、3:トランジション';
COMMENT ON COLUMN project_instruction.priority IS '優先度';
COMMENT ON COLUMN project_instruction.type IS 'タイプ';
COMMENT ON COLUMN project_instruction.task_no IS 'タスク連番';
COMMENT ON COLUMN project_instruction.transition_id IS 'トランジションID';
COMMENT ON COLUMN project_instruction.instruction_status IS '指示送信ステータス:0:未送信、1:送信済み';
COMMENT ON COLUMN project_instruction.instructions IS '指示内容';
COMMENT ON COLUMN project_instruction.instruction_user_id IS '実験指示ユーザID';
COMMENT ON COLUMN project_instruction.instruction_date IS '指示送信日';
COMMENT ON COLUMN project_instruction.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_instruction.create_at IS '作成日時';
COMMENT ON COLUMN project_instruction.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_instruction.update_at IS '更新日時';

