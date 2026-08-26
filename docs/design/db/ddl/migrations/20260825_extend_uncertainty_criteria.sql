-- ===================================================================
-- マイグレーション: 不確かさ機能改修（手入力値・許容値判定方式）
-- 対象バージョン: 2026-08-25 以降
-- 実行順序: このファイルを1回だけ実行する
-- ===================================================================

-- 1. uncertainty_criteria に tolerance カラムを追加
ALTER TABLE uncertainty_criteria
    ADD COLUMN IF NOT EXISTS tolerance_upper NUMERIC(20,10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tolerance_lower NUMERIC(20,10) DEFAULT NULL;

COMMENT ON COLUMN uncertainty_criteria.tolerance_upper IS '許容上限値（手入力値の良好/不良判定用。NULL=判定なし）';
COMMENT ON COLUMN uncertainty_criteria.tolerance_lower IS '許容下限値（手入力値の良好/不良判定用。NULL=判定なし）';

-- 2. experiment_uncertainty_judge テーブルを新規作成
CREATE TABLE IF NOT EXISTS experiment_uncertainty_judge (
    id                      BIGSERIAL               NOT NULL,
    organization_id         UUID                    NOT NULL,
    project_id              CHARACTER VARYING(20)   NOT NULL,
    method_id               CHARACTER VARYING       NOT NULL,
    task_no                 NUMERIC(3,0)            NOT NULL,
    transition_id           CHARACTER VARYING       NOT NULL,
    place_id                CHARACTER VARYING       NOT NULL,
    property_key            CHARACTER VARYING       NOT NULL,
    uncertainty_key         CHARACTER VARYING(50)   NOT NULL,
    uncertainty_version     INTEGER                 NOT NULL,
    tolerance_upper         NUMERIC(20,10),
    tolerance_lower         NUMERIC(20,10),
    recorded_value          NUMERIC(20,10)          NOT NULL,
    judge_result            CHARACTER VARYING(10)   NOT NULL,
    create_user_id          VARCHAR(50),
    create_at               TIMESTAMP,
    CONSTRAINT experiment_uncertainty_judge_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE experiment_uncertainty_judge IS '実験不確かさ判定結果テーブル - WorkRecordPanel での手入力値と tolerance による良好/不良判定結果を管理';

CREATE INDEX IF NOT EXISTS idx_exp_uncertainty_judge_project
    ON experiment_uncertainty_judge (organization_id, project_id, method_id, task_no);

CREATE INDEX IF NOT EXISTS idx_exp_uncertainty_judge_prop
    ON experiment_uncertainty_judge (organization_id, project_id, method_id, task_no, transition_id, place_id, property_key, id DESC);
