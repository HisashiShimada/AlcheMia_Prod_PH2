-- ===================================================================
-- マイグレーション: experiment_instruction_detail テーブル新規作成
-- 対象バージョン: 2026-08-26 以降
-- 実行順序: このファイルを1回だけ実行する（IF NOT EXISTS で冪等性確保）
-- ===================================================================

-- experiment_instruction_detail テーブルを作成
-- DDL: docs/design/db/ddl/experiment_instruction_detail.sql
CREATE TABLE IF NOT EXISTS experiment_instruction_detail (
    -- 主キー（複合キー）
    organization_id     UUID                    NOT NULL,
    project_id          VARCHAR(20)             NOT NULL,
    method_id           CHARACTER VARYING       NOT NULL,
    task_no             NUMERIC(3,0)            NOT NULL,
    transition_id       CHARACTER VARYING       NOT NULL,
    template_name       CHARACTER VARYING       NOT NULL,
    prop_key            CHARACTER VARYING       NOT NULL,

    -- MAIMLプロパティ情報
    xsi_type            CHARACTER VARYING(50),

    -- 実験値（管理者・作業者が設定）
    expected_value      CHARACTER VARYING,
    actual_value        CHARACTER VARYING,

    -- 不確かさ付与情報（FK→uncertainty_criteria）
    name_space_id               CHARACTER VARYING(50),
    uncertainty_key             CHARACTER VARYING(50),
    uncertainty_assigned_value  CHARACTER VARYING,
    uncertainty_assigned_by     CHARACTER VARYING(50),
    uncertainty_assigned_at     TIMESTAMP,
    uncertainty_comment         TEXT,

    -- 監査証跡
    create_user_id      VARCHAR(50),
    create_at           TIMESTAMP,
    update_user_id      VARCHAR(50),
    update_at           TIMESTAMP,

    -- 主キー制約
    CONSTRAINT experiment_instruction_detail_PKC PRIMARY KEY (
        organization_id,
        project_id,
        method_id,
        task_no,
        transition_id,
        template_name,
        prop_key
    )
);

-- インデックス作成（IF NOT EXISTS で冪等性確保）
CREATE INDEX IF NOT EXISTS idx_exp_inst_detail_org
    ON experiment_instruction_detail (organization_id);

CREATE INDEX IF NOT EXISTS idx_exp_inst_detail_project
    ON experiment_instruction_detail (organization_id, project_id);

CREATE INDEX IF NOT EXISTS idx_exp_inst_detail_transition
    ON experiment_instruction_detail (organization_id, project_id, method_id, task_no, transition_id);

CREATE INDEX IF NOT EXISTS idx_exp_inst_detail_uncertainty
    ON experiment_instruction_detail (organization_id, name_space_id, uncertainty_key)
    WHERE name_space_id IS NOT NULL;
