-- プロジェクト指示
DROP TABLE if exists project_instruction CASCADE;

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
  , instructions text
  , instruction_user_id uuid
  , instruction_date timestamp
  , create_user_id uuid
  , create_at timestamp
  , update_user_id uuid
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
COMMENT ON COLUMN project_instruction.instructions IS '指示内容';
COMMENT ON COLUMN project_instruction.instruction_user_id IS '実験指示ユーザID';
COMMENT ON COLUMN project_instruction.instruction_date IS '指示送信日';
COMMENT ON COLUMN project_instruction.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_instruction.create_at IS '作成日時';
COMMENT ON COLUMN project_instruction.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_instruction.update_at IS '更新日時';
