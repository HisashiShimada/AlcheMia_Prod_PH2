-- プロジェクトタスク
DROP TABLE if exists project_task CASCADE;

CREATE TABLE project_task (
  organization_id uuid NOT NULL
  , project_id character varying(20) NOT NULL
  , method_id character varying NOT NULL
  , experiment_order numeric(2,0) NOT NULL
  , experiment_condition numeric(2,0)
  , attempts_count numeric(3,0)
  , worker_linked_flg BOOLEAN
  , create_user_id character varying(50)
  , create_at timestamp
  , update_user_id character varying(50)
  , update_at timestamp
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
