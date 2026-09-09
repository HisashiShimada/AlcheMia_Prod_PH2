-- ===================================================================
-- テーブル名: experiment_instruction_detail (実験指示詳細)
-- 説明: 実験指示タブの一覧を一括管理するテーブル。
--       MAIMLパース時に基本情報を登録し、管理者による想定値設定・
--       作業者による実績値記録・不確かさ付与を随時更新する。
-- バージョン: 1.0 (2026-06-30)
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS experiment_instruction_detail CASCADE;

CREATE TABLE experiment_instruction_detail (
    -- 主キー（複合キー）
    organization_id     UUID                    NOT NULL,
    project_id          VARCHAR(20)             NOT NULL,
    method_id           CHARACTER VARYING       NOT NULL,
    task_no             NUMERIC(3,0)            NOT NULL,
    transition_id       CHARACTER VARYING       NOT NULL,
    template_id         CHARACTER VARYING       NOT NULL,    -- 主キー6番目: MAIMLの template.id
    prop_key            CHARACTER VARYING       NOT NULL,

    -- トランジション・テンプレート表示情報
    transition_name     CHARACTER VARYING,                   -- MAIMLから取得したトランジション表示名（未設定時はNULL）
    template_name       CHARACTER VARYING,                   -- テンプレート表示ラベル（非主キー、表示用）

    -- MAIMLプロパティ情報
    xsi_type            CHARACTER VARYING(50),      -- FloatValue / IntegerValue / StringValue

    -- 実験値（管理者・作業者が設定）
    expected_value      CHARACTER VARYING,           -- 管理者が設定した指示値（未設定時はNULL）
    actual_value        CHARACTER VARYING,           -- 作業者が記録した値（未記録時はNULL）

    -- 不確かさ付与情報（FK→uncertainty_criteria）
    name_space_id               CHARACTER VARYING(50),  -- FK→uncertainty_criteria（未付与時はNULL）
    uncertainty_key             CHARACTER VARYING(50),  -- FK→uncertainty_criteria（未付与時はNULL）
    uncertainty_assigned_value  CHARACTER VARYING,      -- 定量:±0.02 / 定性:確か 等（未付与時はNULL）
    uncertainty_assigned_by     CHARACTER VARYING(50),  -- FK→organization_user（未付与時はNULL）
    uncertainty_assigned_at     TIMESTAMPTZ,              -- 未付与時はNULL
    uncertainty_comment         TEXT,                   -- 未付与時はNULL

    -- 監査証跡
    create_user_id      VARCHAR(50),
    create_at           TIMESTAMPTZ,
    update_user_id      VARCHAR(50),
    update_at           TIMESTAMPTZ,

    -- 主キー制約
    CONSTRAINT experiment_instruction_detail_PKC PRIMARY KEY (
        organization_id,
        project_id,
        method_id,
        task_no,
        transition_id,
        template_id,
        prop_key
    )
);

-- インデックス作成
-- organization_id検索用（マルチテナント分離）
CREATE INDEX idx_exp_inst_detail_org
    ON experiment_instruction_detail (organization_id);

-- プロジェクト単位検索用
CREATE INDEX idx_exp_inst_detail_project
    ON experiment_instruction_detail (organization_id, project_id);

-- トランジション単位検索用
CREATE INDEX idx_exp_inst_detail_transition
    ON experiment_instruction_detail (organization_id, project_id, method_id, task_no, transition_id);

-- 不確かさ基準検索用
CREATE INDEX idx_exp_inst_detail_uncertainty
    ON experiment_instruction_detail (organization_id, name_space_id, uncertainty_key)
    WHERE name_space_id IS NOT NULL;

-- テーブルコメント
COMMENT ON TABLE experiment_instruction_detail IS '実験指示詳細テーブル - 実験指示タブの一覧を一括管理。MAIMLパース時に基本情報を登録し、管理者による想定値設定・作業者による実績値記録・不確かさ付与を随時更新する。';

-- カラムコメント
COMMENT ON COLUMN experiment_instruction_detail.organization_id IS '組織ID（主キー1）';
COMMENT ON COLUMN experiment_instruction_detail.project_id IS 'プロジェクトID（主キー2）';
COMMENT ON COLUMN experiment_instruction_detail.method_id IS 'メソッドID（主キー3）';
COMMENT ON COLUMN experiment_instruction_detail.task_no IS 'タスク連番（主キー4）';
COMMENT ON COLUMN experiment_instruction_detail.transition_id IS 'トランジションID（主キー5）';
COMMENT ON COLUMN experiment_instruction_detail.template_id IS 'テンプレートID（主キー6）: MAIMLの template.id';
COMMENT ON COLUMN experiment_instruction_detail.prop_key IS 'MAIMLプロパティキー（主キー7）:例: ns1:Temperature';
COMMENT ON COLUMN experiment_instruction_detail.transition_name IS 'トランジション表示名: MAIMLから取得したトランジションのname属性（未設定時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.template_name IS 'テンプレート表示ラベル: MAIMLの template.name/label（非主キー、表示用）';
COMMENT ON COLUMN experiment_instruction_detail.xsi_type IS 'xsi:type:FloatValue / IntegerValue / StringValue';
COMMENT ON COLUMN experiment_instruction_detail.expected_value IS '想定値:管理者が設定した指示値（未設定時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.actual_value IS '実績値:作業者が記録した値（未記録時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.name_space_id IS '名前空間ID:FK→uncertainty_criteria（未付与時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.uncertainty_key IS '不確かさ基準Key:FK→uncertainty_criteria（未付与時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.uncertainty_assigned_value IS '不確かさ付与値:定量:±0.02 / 定性:確か 等（未付与時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.uncertainty_assigned_by IS '不確かさ付与ユーザID:FK→organization_user（未付与時はNULL）';
COMMENT ON COLUMN experiment_instruction_detail.uncertainty_assigned_at IS '不確かさ付与日時:未付与時はNULL';
COMMENT ON COLUMN experiment_instruction_detail.uncertainty_comment IS '不確かさコメント:未付与時はNULL';
COMMENT ON COLUMN experiment_instruction_detail.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN experiment_instruction_detail.create_at IS '作成日時';
COMMENT ON COLUMN experiment_instruction_detail.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN experiment_instruction_detail.update_at IS '更新日時';
