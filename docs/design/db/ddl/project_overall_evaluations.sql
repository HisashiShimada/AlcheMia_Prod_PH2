-- プロジェクト評価
-- * BackupToTempTable
DROP TABLE if exists project_overall_evaluations CASCADE;

-- * RestoreFromTempTable
CREATE TABLE project_overall_evaluations (
  organization_id uuid NOT NULL
  , project_id character varying(20) NOT NULL
  , evaluation_seq serial NOT NULL
  , evaluation_scope character varying(20) DEFAULT 'MAIML_PROJECT' NOT NULL
  , method_id character varying(100)
  , task_no integer
  , transition_id character varying(100)
  , evaluated_user_id character varying(50)
  , evaluated_at timestamp with time zone NOT NULL
  , overall_digital character varying(10)
  , overall_score integer
  , overall_analog text
  , applied_rule_id uuid
  , applied_rule_version integer
  , applied_rule_snapshot jsonb
  , aggregation_snapshot jsonb
  , create_user_id character varying(50)
  , create_at timestamp with time zone
  , update_user_id character varying(50)
  , update_at timestamp with time zone
  , CONSTRAINT project_overall_evaluations_PKC PRIMARY KEY (organization_id,project_id,evaluation_seq)
) ;

COMMENT ON TABLE project_overall_evaluations IS 'プロジェクト評価';
COMMENT ON COLUMN project_overall_evaluations.organization_id IS '組織ID';
COMMENT ON COLUMN project_overall_evaluations.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_overall_evaluations.evaluation_seq IS '評価シークエンス';
COMMENT ON COLUMN project_overall_evaluations.evaluation_scope IS '評価スコープ';
COMMENT ON COLUMN project_overall_evaluations.method_id IS 'メソッドID';
COMMENT ON COLUMN project_overall_evaluations.task_no IS 'タスクNo';
COMMENT ON COLUMN project_overall_evaluations.transition_id IS 'トランジションID';
COMMENT ON COLUMN project_overall_evaluations.evaluated_user_id IS '評価ユーザID';
COMMENT ON COLUMN project_overall_evaluations.evaluated_at IS '評価日時';
COMMENT ON COLUMN project_overall_evaluations.overall_digital IS '評価値';
COMMENT ON COLUMN project_overall_evaluations.overall_score IS '評価スコア';
COMMENT ON COLUMN project_overall_evaluations.overall_analog IS '評価コメント';
COMMENT ON COLUMN project_overall_evaluations.applied_rule_id IS '適用ルールID';
COMMENT ON COLUMN project_overall_evaluations.applied_rule_version IS '適用ルールバージョン';
COMMENT ON COLUMN project_overall_evaluations.applied_rule_snapshot IS '適用ルール断面';
COMMENT ON COLUMN project_overall_evaluations.aggregation_snapshot IS '集約断面';
COMMENT ON COLUMN project_overall_evaluations.create_user_id IS '作成ユーザID';
COMMENT ON COLUMN project_overall_evaluations.create_at IS '作成日時';
COMMENT ON COLUMN project_overall_evaluations.update_user_id IS '更新ユーザID';
COMMENT ON COLUMN project_overall_evaluations.update_at IS '更新日時';
