-- プロジェクトタスク_詳細
DROP TABLE if exists project_task_detail CASCADE;

CREATE TABLE project_task_detail (
  organization_id uuid NOT NULL
  , project_id character varying(20) NOT NULL
  , method_id character varying NOT NULL
  , task_no numeric(3,0) NOT NULL
  , task_status numeric(2,0)
  , experiment_start_at timestamp
  , experiment_end_at timestamp
  , experiment_user_id character varying(50)
  , reviewed_at timestamp
  , review_user_id character varying(50)
  , create_user_id character varying(50)
  , create_at timestamp
  , update_user_id character varying(50)
  , update_at timestamp
  , CONSTRAINT project_task_detail_PKC PRIMARY KEY (organization_id,project_id,method_id,task_no)
) ;

COMMENT ON TABLE project_task_detail IS 'プロジェクトタスク_詳細';
COMMENT ON COLUMN project_task_detail.organization_id IS '組織ID';
COMMENT ON COLUMN project_task_detail.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_task_detail.method_id IS 'メソッドID';
COMMENT ON COLUMN project_task_detail.task_no IS 'タスク連番';
COMMENT ON COLUMN project_task_detail.task_status IS 'タスクステータス';
COMMENT ON COLUMN project_task_detail.experiment_start_at IS '実験開始日';
COMMENT ON COLUMN project_task_detail.experiment_end_at IS '実験終了日';
COMMENT ON COLUMN project_task_detail.experiment_user_id IS '実験作業者ID';
COMMENT ON COLUMN project_task_detail.reviewed_at IS 'レビュー完了日';
COMMENT ON COLUMN project_task_detail.review_user_id IS 'レビュアーID';
COMMENT ON COLUMN project_task_detail.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_task_detail.create_at IS '作成日時';
COMMENT ON COLUMN project_task_detail.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_task_detail.update_at IS '更新日時';
