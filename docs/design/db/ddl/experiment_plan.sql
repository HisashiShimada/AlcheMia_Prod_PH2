-- ===================================================================
-- テーブル名: experiment_plan (実験計画)
-- 説明: Manager が各タスクに対して実験計画（想定値・担当情報・注意事項）を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS experiment_plan CASCADE;

CREATE TABLE experiment_plan (
  organization_id   UUID                      NOT NULL
  , project_id      CHARACTER VARYING(20)     NOT NULL
  , method_id       CHARACTER VARYING         NOT NULL
  , task_no         NUMERIC(3,0)              NOT NULL
  , planned_values  JSONB                     DEFAULT '{}'::jsonb
  , create_user_id  CHARACTER VARYING(50)
  , create_at       TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP
  , update_user_id  CHARACTER VARYING(50)
  , update_at       TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP
  , CONSTRAINT experiment_plan_PKC PRIMARY KEY (organization_id, project_id, method_id, task_no)
) ;

CREATE INDEX idx_experiment_plan_project ON experiment_plan (organization_id, project_id);
CREATE INDEX idx_experiment_plan_method  ON experiment_plan (organization_id, project_id, method_id);

COMMENT ON TABLE experiment_plan IS '実験計画（Manager指示）テーブル';
COMMENT ON COLUMN experiment_plan.organization_id IS '組織ID';
COMMENT ON COLUMN experiment_plan.project_id IS 'プロジェクトID';
COMMENT ON COLUMN experiment_plan.method_id IS 'メソッドID';
COMMENT ON COLUMN experiment_plan.task_no IS 'タスク連番（1〜N）。project_task_detail.task_no と対応';
COMMENT ON COLUMN experiment_plan.planned_values IS '実験計画データ（Transition単位）JSON形式: { [transitionId]: { "mgr-instruction:xxx": value, [templateId]: { [fieldKey]: value } } }';
COMMENT ON COLUMN experiment_plan.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN experiment_plan.create_at IS '作成日時';
COMMENT ON COLUMN experiment_plan.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN experiment_plan.update_at IS '更新日時';
