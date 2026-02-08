-- プロジェクトタスク
DROP TABLE if exists project_task CASCADE;

CREATE TABLE project_task (
  organization_id uuid NOT NULL
  , project_id uuid NOT NULL
  , method_id character varying NOT NULL
  , task_name character varying
  , experiment_order numeric(2,0)
  , experiment_condition numeric(2,0)
  , attempts_count numeric(3,0)
  , create_user_id VARCHAR(50)
  , create_at timestamp
  , update_user_id VARCHAR(50)
  , update_at timestamp
  , CONSTRAINT project_task_PKC PRIMARY KEY (organization_id,project_id,method_id)
) ;

COMMENT ON TABLE project_task IS 'プロジェクトタスク';
COMMENT ON COLUMN project_task.organization_id IS '組織ID';
COMMENT ON COLUMN project_task.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_task.method_id IS 'メソッドID';
COMMENT ON COLUMN project_task.task_name IS 'タスク名';
COMMENT ON COLUMN project_task.experiment_order IS '実験順序';
COMMENT ON COLUMN project_task.experiment_condition IS '実験条件';
COMMENT ON COLUMN project_task.attempts_count IS '試行回数';
COMMENT ON COLUMN project_task.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_task.create_at IS '作成日時';
COMMENT ON COLUMN project_task.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_task.update_at IS '更新日時';
