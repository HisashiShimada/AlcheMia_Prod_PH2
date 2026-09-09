-- Project Name : noname
-- Date/Time    : 2026/08/27 15:04:29
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

-- 実験不確かさ判定結果
-- * BackupToTempTable
DROP TABLE if exists experiment_uncertainty_judge CASCADE;

-- * RestoreFromTempTable
CREATE TABLE experiment_uncertainty_judge (
  organization_id uuid NOT NULL
  , project_id character varying(20) NOT NULL
  , judge_seq serial NOT NULL
  , method_id character varying
  , task_no numeric(3,0)
  , transition_id character varying
  , place_id character varying
  , property_key character varying
  , uncertainty_key character varying
  , uncertainty_version integer
  , tolerance_upper numeric(20,10)
  , tolerance_lower numeric(20,10)
  , recorded_value numeric(20,10)
  , judge_result character varying(10)
  , create_user_id character varying(50)
  , create_at TIMESTAMPTZ
  , update_user_id character varying(50)
  , update_at character varying(50)
  , CONSTRAINT experiment_uncertainty_judge_PKC PRIMARY KEY (organization_id,project_id,judge_seq)
) ;

COMMENT ON TABLE experiment_uncertainty_judge IS '実験不確かさ判定結果';
COMMENT ON COLUMN experiment_uncertainty_judge.organization_id IS '組織ID';
COMMENT ON COLUMN experiment_uncertainty_judge.project_id IS 'プロジェクトID';
COMMENT ON COLUMN experiment_uncertainty_judge.judge_seq IS '判定連番';
COMMENT ON COLUMN experiment_uncertainty_judge.method_id IS 'メソッドID';
COMMENT ON COLUMN experiment_uncertainty_judge.task_no IS 'タスクNo';
COMMENT ON COLUMN experiment_uncertainty_judge.transition_id IS 'トランジションID';
COMMENT ON COLUMN experiment_uncertainty_judge.place_id IS 'プレースID';
COMMENT ON COLUMN experiment_uncertainty_judge.property_key IS 'プロパティキー';
COMMENT ON COLUMN experiment_uncertainty_judge.uncertainty_key IS '不確かさ基準キー';
COMMENT ON COLUMN experiment_uncertainty_judge.uncertainty_version IS '不確かさバージョン';
COMMENT ON COLUMN experiment_uncertainty_judge.tolerance_upper IS '許容値上限';
COMMENT ON COLUMN experiment_uncertainty_judge.tolerance_lower IS '許容値下限';
COMMENT ON COLUMN experiment_uncertainty_judge.recorded_value IS '記録値';
COMMENT ON COLUMN experiment_uncertainty_judge.judge_result IS '判定結果';
COMMENT ON COLUMN experiment_uncertainty_judge.create_user_id IS '作成ユーザID';
COMMENT ON COLUMN experiment_uncertainty_judge.create_at IS '作成日時';
COMMENT ON COLUMN experiment_uncertainty_judge.update_user_id IS '更新ユーザID';
COMMENT ON COLUMN experiment_uncertainty_judge.update_at IS '更新日時';

