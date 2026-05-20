-- ============================================================
-- 統合マイグレーション: 全テーブル作成
-- 作成日: 2026-03-02
-- 説明: 新規環境構築用。全テーブルを一括作成する。
--       外部キー制約なし。
--       project_task_detail / transition_data / template_data は
--       experiment_order カラムを除いた構成。
-- ============================================================

-- pgvector拡張（transition_setテーブルで使用）
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. corporation (会社)
-- ============================================================
DROP TABLE IF EXISTS corporation CASCADE;

CREATE TABLE corporation (
    corporation_id UUID NOT NULL,
    corporation_name CHARACTER VARYING(50) NOT NULL,
    is_active BOOLEAN NOT NULL,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT corporation_PKC PRIMARY KEY (corporation_id)
);

COMMENT ON TABLE corporation IS '会社';
COMMENT ON COLUMN corporation.corporation_id IS '会社ID';
COMMENT ON COLUMN corporation.corporation_name IS '会社名';
COMMENT ON COLUMN corporation.is_active IS 'アクティブ判定';
COMMENT ON COLUMN corporation.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN corporation.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN corporation.create_at IS '作成日時';
COMMENT ON COLUMN corporation.update_at IS '更新日時';

-- ============================================================
-- 2. organization (組織)
-- ============================================================
DROP TABLE IF EXISTS organization CASCADE;

CREATE TABLE organization (
    organization_id UUID NOT NULL,
    organization_cd CHARACTER VARYING(50),
    organization_display_name CHARACTER VARYING(50),
    organization_email CHARACTER VARYING(50),
    chief_user_id CHARACTER VARYING(50),
    corporation_id UUID,
    is_entry INTEGER,
    is_active BOOLEAN,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT organization_PKC PRIMARY KEY (organization_id)
);

CREATE INDEX idx_organization_organization_cd ON organization(organization_cd);

COMMENT ON TABLE organization IS '組織';
COMMENT ON COLUMN organization.organization_id IS '組織ID';
COMMENT ON COLUMN organization.organization_cd IS '組織CD';
COMMENT ON COLUMN organization.organization_display_name IS '組織表示名';
COMMENT ON COLUMN organization.organization_email IS '組織E-mail';
COMMENT ON COLUMN organization.chief_user_id IS '代表者ユーザID';
COMMENT ON COLUMN organization.corporation_id IS '会社ID';
COMMENT ON COLUMN organization.is_entry IS '二段階認証判定';
COMMENT ON COLUMN organization.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization.create_at IS '作成日時';
COMMENT ON COLUMN organization.update_at IS '更新日時';

-- ============================================================
-- 3. department (部署)
-- ============================================================
DROP TABLE IF EXISTS department CASCADE;

CREATE TABLE department (
    organization_id UUID NOT NULL,
    department_cd VARCHAR(50) NOT NULL,
    department_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT department_pkey PRIMARY KEY (organization_id, department_cd)
);

COMMENT ON TABLE department IS '部署';
COMMENT ON COLUMN department.organization_id IS '組織ID';
COMMENT ON COLUMN department.department_cd IS '部署CD';
COMMENT ON COLUMN department.department_name IS '部署名';
COMMENT ON COLUMN department.is_active IS 'アクティブ判定';
COMMENT ON COLUMN department.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN department.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN department.create_at IS '作成日時';
COMMENT ON COLUMN department.update_at IS '更新日時';

-- ============================================================
-- 4. role (ロール)
-- ============================================================
DROP TABLE IF EXISTS role CASCADE;

CREATE TABLE role (
    organization_id UUID NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    role_name CHARACTER VARYING(50),
    initial_screen_function_cd CHARACTER VARYING(30),
    is_active BOOLEAN NOT NULL,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT role_PKC PRIMARY KEY (organization_id, role_cd)
);

COMMENT ON TABLE role IS 'ロール';
COMMENT ON COLUMN role.organization_id IS '組織ID';
COMMENT ON COLUMN role.role_cd IS 'ロールCD';
COMMENT ON COLUMN role.role_name IS 'ロール名';
COMMENT ON COLUMN role.initial_screen_function_cd IS '初期画面機能CD';
COMMENT ON COLUMN role.is_active IS 'アクティブ判定';
COMMENT ON COLUMN role.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN role.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN role.create_at IS '作成日時';
COMMENT ON COLUMN role.update_at IS '更新日時';

-- ============================================================
-- 5. role_permission (ロール権限)
-- ============================================================
DROP TABLE IF EXISTS role_permission CASCADE;

CREATE TABLE role_permission (
    organization_id UUID NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    function_cd CHARACTER VARYING(30) NOT NULL,
    permission INTEGER NOT NULL,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT role_permission_PKC PRIMARY KEY (organization_id, role_cd, function_cd)
);

COMMENT ON TABLE role_permission IS 'ロール権限';
COMMENT ON COLUMN role_permission.organization_id IS '組織ID';
COMMENT ON COLUMN role_permission.role_cd IS 'ロールCD';
COMMENT ON COLUMN role_permission.function_cd IS '機能CD';
COMMENT ON COLUMN role_permission.permission IS '権限:0:書込可 1:読取専用';
COMMENT ON COLUMN role_permission.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN role_permission.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN role_permission.create_at IS '作成日時';
COMMENT ON COLUMN role_permission.update_at IS '更新日時';

-- ============================================================
-- 6. organization_user (組織利用者)
-- ============================================================
DROP TABLE IF EXISTS organization_user CASCADE;

CREATE TABLE organization_user (
    user_id VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    user_name CHARACTER VARYING(30) NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    mail_address CHARACTER VARYING(50) NOT NULL,
    department_cd CHARACTER VARYING(50),
    is_active BOOLEAN,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT organization_user_PKC PRIMARY KEY (user_id, organization_id)
);

COMMENT ON TABLE organization_user IS '組織利用者';
COMMENT ON COLUMN organization_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_user.user_name IS 'ユーザ名';
COMMENT ON COLUMN organization_user.role_cd IS 'ロールCD';
COMMENT ON COLUMN organization_user.mail_address IS 'メールアドレス';
COMMENT ON COLUMN organization_user.department_cd IS '所属部署CD';
COMMENT ON COLUMN organization_user.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization_user.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_user.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization_user.create_at IS '作成日時';
COMMENT ON COLUMN organization_user.update_at IS '更新日時';

-- ============================================================
-- 7. user_authentication (利用者認証)
-- ============================================================
DROP TABLE IF EXISTS user_authentication CASCADE;

CREATE TABLE user_authentication (
    user_id VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    password CHARACTER VARYING(255) NOT NULL,
    is_temporary_flg BOOLEAN NOT NULL DEFAULT false,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT user_authentication_PKC PRIMARY KEY (user_id, organization_id)
);

COMMENT ON TABLE user_authentication IS '利用者認証';
COMMENT ON COLUMN user_authentication.user_id IS 'ユーザID';
COMMENT ON COLUMN user_authentication.organization_id IS '組織ID';
COMMENT ON COLUMN user_authentication.password IS 'ハッシュパスワード';
COMMENT ON COLUMN user_authentication.is_temporary_flg IS '仮パスワードフラグ';
COMMENT ON COLUMN user_authentication.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN user_authentication.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN user_authentication.create_at IS '作成日時';
COMMENT ON COLUMN user_authentication.update_at IS '更新日時';

-- ============================================================
-- 8. login_history (ログイン履歴)
-- ============================================================
DROP TABLE IF EXISTS login_history CASCADE;

CREATE TABLE login_history (
    id SERIAL NOT NULL,
    user_id CHARACTER VARYING(50) NOT NULL,
    organization_id UUID NOT NULL,
    login_at TIMESTAMP,
    login_sf BOOLEAN,
    failure_reason CHARACTER VARYING(100),
    entry_execute_flg BOOLEAN,
    ip_address CHARACTER VARYING(45),
    user_agent TEXT,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT login_history_PKC PRIMARY KEY (id)
);

CREATE INDEX idx_login_history_rate_limit ON login_history(login_at, login_sf);
CREATE INDEX idx_login_history_query ON login_history(organization_id, user_id, entry_execute_flg);

COMMENT ON TABLE login_history IS 'ログイン履歴';
COMMENT ON COLUMN login_history.id IS 'ID';
COMMENT ON COLUMN login_history.user_id IS 'ユーザID';
COMMENT ON COLUMN login_history.organization_id IS '組織ID';
COMMENT ON COLUMN login_history.login_at IS 'ログイン日時';
COMMENT ON COLUMN login_history.login_sf IS 'ログイン成否';
COMMENT ON COLUMN login_history.failure_reason IS '失敗原因';
COMMENT ON COLUMN login_history.entry_execute_flg IS '二段階認証実行フラグ';
COMMENT ON COLUMN login_history.ip_address IS 'IPアドレス';
COMMENT ON COLUMN login_history.user_agent IS 'User-Agent';
COMMENT ON COLUMN login_history.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN login_history.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN login_history.create_at IS '作成日時';
COMMENT ON COLUMN login_history.update_at IS '更新日時';

-- ============================================================
-- 9. pin_codes (PINコード)
-- ============================================================
DROP TABLE IF EXISTS pin_codes CASCADE;

CREATE TABLE pin_codes (
    organization_id UUID NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    pin_code CHARACTER VARYING(6) NOT NULL,
    session_token CHARACTER VARYING(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts_count INTEGER DEFAULT 0 NOT NULL,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT pin_codes_PKC PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_pin_codes_token ON pin_codes(session_token);

COMMENT ON TABLE pin_codes IS 'PINコード:メールPINコード二段階認証用の一時データ';
COMMENT ON COLUMN pin_codes.organization_id IS '組織ID';
COMMENT ON COLUMN pin_codes.user_id IS 'ユーザID';
COMMENT ON COLUMN pin_codes.pin_code IS 'PINコード:6桁数字';
COMMENT ON COLUMN pin_codes.session_token IS 'セッショントークン';
COMMENT ON COLUMN pin_codes.expires_at IS '有効期限';
COMMENT ON COLUMN pin_codes.attempts_count IS '試行回数';
COMMENT ON COLUMN pin_codes.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN pin_codes.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN pin_codes.create_at IS '作成日時';
COMMENT ON COLUMN pin_codes.update_at IS '更新日時';

-- ============================================================
-- 10. code_master (コードマスタ)
-- ============================================================
DROP TABLE IF EXISTS code_master CASCADE;

CREATE TABLE code_master (
    organization_id UUID NOT NULL,
    code_division CHARACTER VARYING(30) NOT NULL,
    code_value CHARACTER VARYING(30) NOT NULL,
    code_description TEXT,
    code_name CHARACTER VARYING(30) NOT NULL,
    code_remark TEXT,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT code_master_PKC PRIMARY KEY (organization_id, code_division, code_value)
);

COMMENT ON TABLE code_master IS 'コードマスタ';
COMMENT ON COLUMN code_master.organization_id IS '組織ID';
COMMENT ON COLUMN code_master.code_division IS 'コード区分';
COMMENT ON COLUMN code_master.code_value IS 'コード値';
COMMENT ON COLUMN code_master.code_description IS 'コード概要';
COMMENT ON COLUMN code_master.code_name IS 'コード名称';
COMMENT ON COLUMN code_master.code_remark IS '備考';
COMMENT ON COLUMN code_master.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN code_master.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN code_master.create_at IS '作成日時';
COMMENT ON COLUMN code_master.update_at IS '更新日時';

-- ============================================================
-- 11. attribute (属性)
-- ============================================================
DROP TABLE IF EXISTS attribute CASCADE;

CREATE TABLE attribute (
    organization_id UUID NOT NULL,
    attribute_id CHARACTER VARYING NOT NULL,
    attribute_name CHARACTER VARYING NOT NULL,
    attribute_value CHARACTER VARYING,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT attribute_PKC PRIMARY KEY (organization_id, attribute_id)
);

COMMENT ON TABLE attribute IS '属性';
COMMENT ON COLUMN attribute.organization_id IS '組織ID';
COMMENT ON COLUMN attribute.attribute_id IS '属性ID';
COMMENT ON COLUMN attribute.attribute_name IS '属性名';
COMMENT ON COLUMN attribute.attribute_value IS '属性値';
COMMENT ON COLUMN attribute.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN attribute.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN attribute.create_at IS '作成日時';
COMMENT ON COLUMN attribute.update_at IS '更新日時';

-- ============================================================
-- 12. vendor (vendor)
-- ============================================================
DROP TABLE IF EXISTS vendor CASCADE;

CREATE TABLE vendor (
    organization_id UUID NOT NULL,
    vendor_uuid UUID NOT NULL,
    corporation_id UUID,
    vendor_id CHARACTER VARYING NOT NULL,
    vendor_name CHARACTER VARYING NOT NULL,
    vendor_description CHARACTER VARYING,
    vendor_annotation CHARACTER VARYING,
    is_active BOOLEAN,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT vendor_PKC PRIMARY KEY (organization_id, vendor_uuid)
);

COMMENT ON TABLE vendor IS 'vendor';
COMMENT ON COLUMN vendor.organization_id IS '組織ID';
COMMENT ON COLUMN vendor.vendor_uuid IS 'uuid';
COMMENT ON COLUMN vendor.corporation_id IS '会社ID';
COMMENT ON COLUMN vendor.vendor_id IS 'ID';
COMMENT ON COLUMN vendor.vendor_name IS '名称';
COMMENT ON COLUMN vendor.vendor_description IS '説明';
COMMENT ON COLUMN vendor.vendor_annotation IS '注釈';
COMMENT ON COLUMN vendor.is_active IS 'アクティブ判定';
COMMENT ON COLUMN vendor.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN vendor.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN vendor.create_at IS '作成日時';
COMMENT ON COLUMN vendor.update_at IS '更新日時';

-- ============================================================
-- 13. instrument (instrument)
-- ============================================================
DROP TABLE IF EXISTS instrument CASCADE;

CREATE TABLE instrument (
    organization_id UUID NOT NULL,
    instrument_uuid UUID NOT NULL,
    corporation_id UUID,
    instrument_id CHARACTER VARYING NOT NULL,
    instrument_name CHARACTER VARYING NOT NULL,
    instrument_description CHARACTER VARYING,
    instrument_annotation CHARACTER VARYING,
    is_active BOOLEAN,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT instrument_PKC PRIMARY KEY (organization_id, instrument_uuid)
);

COMMENT ON TABLE instrument IS 'instrument';
COMMENT ON COLUMN instrument.organization_id IS '組織ID';
COMMENT ON COLUMN instrument.instrument_uuid IS 'uuid';
COMMENT ON COLUMN instrument.corporation_id IS '会社ID';
COMMENT ON COLUMN instrument.instrument_id IS 'ID';
COMMENT ON COLUMN instrument.instrument_name IS '名称';
COMMENT ON COLUMN instrument.instrument_description IS '説明';
COMMENT ON COLUMN instrument.instrument_annotation IS '注釈';
COMMENT ON COLUMN instrument.is_active IS 'アクティブ判定';
COMMENT ON COLUMN instrument.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN instrument.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN instrument.create_at IS '作成日時';
COMMENT ON COLUMN instrument.update_at IS '更新日時';

-- ============================================================
-- 14. creator (creator)
-- ============================================================
DROP TABLE IF EXISTS creator CASCADE;

CREATE TABLE creator (
    organization_id UUID NOT NULL,
    creator_uuid UUID NOT NULL,
    vendor_uuid UUID,
    instrument_uuid UUID,
    corporation_id UUID,
    creator_id CHARACTER VARYING NOT NULL,
    creator_name CHARACTER VARYING NOT NULL,
    creator_description CHARACTER VARYING,
    creator_annotation CHARACTER VARYING,
    is_active BOOLEAN,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT creator_PKC PRIMARY KEY (organization_id, creator_uuid)
);

COMMENT ON TABLE creator IS 'creator';
COMMENT ON COLUMN creator.organization_id IS '組織ID';
COMMENT ON COLUMN creator.creator_uuid IS 'creator_uuid';
COMMENT ON COLUMN creator.vendor_uuid IS 'vendor_uuid';
COMMENT ON COLUMN creator.instrument_uuid IS 'instrument_uuid';
COMMENT ON COLUMN creator.corporation_id IS '会社ID';
COMMENT ON COLUMN creator.creator_id IS 'ID';
COMMENT ON COLUMN creator.creator_name IS '名称';
COMMENT ON COLUMN creator.creator_description IS '説明';
COMMENT ON COLUMN creator.creator_annotation IS '注釈';
COMMENT ON COLUMN creator.is_active IS 'アクティブ判定';
COMMENT ON COLUMN creator.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN creator.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN creator.create_at IS '作成日時';
COMMENT ON COLUMN creator.update_at IS '更新日時';

-- ============================================================
-- 15. project (プロジェクト)
-- ============================================================
DROP TABLE IF EXISTS project CASCADE;

CREATE TABLE project (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    project_name CHARACTER VARYING,
    description TEXT,
    department_cd CHARACTER VARYING(50),
    owner_user_id VARCHAR(50),
    project_status NUMERIC(2,0),
    project_maiml_flg BOOLEAN,
    checkout_status NUMERIC(2,0),
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT project_PKC PRIMARY KEY (organization_id, project_id)
);

CREATE INDEX idx_project_org_status ON project(organization_id, project_status);
CREATE INDEX idx_project_create_at ON project(create_at DESC);
CREATE INDEX idx_project_org_status_created ON project(organization_id, project_status, create_at DESC);

COMMENT ON TABLE project IS 'プロジェクト';
COMMENT ON COLUMN project.organization_id IS '組織ID';
COMMENT ON COLUMN project.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project.project_name IS 'プロジェクト名';
COMMENT ON COLUMN project.description IS '概要';
COMMENT ON COLUMN project.department_cd IS '部署CD';
COMMENT ON COLUMN project.owner_user_id IS '所有者ユーザID';
COMMENT ON COLUMN project.project_status IS 'プロジェクトステータス';
COMMENT ON COLUMN project.project_maiml_flg IS 'プロジェクトMaiml有無';
COMMENT ON COLUMN project.checkout_status IS 'チェックアウトステータス';
COMMENT ON COLUMN project.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project.create_at IS '作成日時';
COMMENT ON COLUMN project.update_at IS '更新日時';

-- ============================================================
-- 16. project_task (プロジェクトタスク)
-- ============================================================
DROP TABLE IF EXISTS project_task CASCADE;

CREATE TABLE project_task (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    experiment_order NUMERIC(2,0) NOT NULL,
    task_name CHARACTER VARYING,
    experiment_condition NUMERIC(2,0),
    attempts_count NUMERIC(3,0),
    create_user_id CHARACTER VARYING(50),
    update_user_id CHARACTER VARYING(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT project_task_PKC PRIMARY KEY (organization_id, project_id, method_id, experiment_order)
);

COMMENT ON TABLE project_task IS 'プロジェクトタスク';
COMMENT ON COLUMN project_task.organization_id IS '組織ID';
COMMENT ON COLUMN project_task.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_task.method_id IS 'メソッドID';
COMMENT ON COLUMN project_task.experiment_order IS '実験順序';
COMMENT ON COLUMN project_task.task_name IS 'タスク名';
COMMENT ON COLUMN project_task.experiment_condition IS '実験条件';
COMMENT ON COLUMN project_task.attempts_count IS '試行回数';
COMMENT ON COLUMN project_task.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_task.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_task.create_at IS '作成日時';
COMMENT ON COLUMN project_task.update_at IS '更新日時';

-- ============================================================
-- 17. project_task_detail (プロジェクトタスク詳細)
--     ※ experiment_order 除外
-- ============================================================
DROP TABLE IF EXISTS project_task_detail CASCADE;

CREATE TABLE project_task_detail (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    task_status NUMERIC(2,0),
    experiment_start_at TIMESTAMP,
    experiment_end_at TIMESTAMP,
    experiment_user_id CHARACTER VARYING(50),
    reviewed_at TIMESTAMP,
    review_user_id CHARACTER VARYING(50),
    create_user_id CHARACTER VARYING(50),
    update_user_id CHARACTER VARYING(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT project_task_detail_PKC PRIMARY KEY (organization_id, project_id, method_id, task_no)
);

CREATE INDEX idx_project_task_detail_exp_user ON project_task_detail(experiment_user_id);
CREATE INDEX idx_project_task_detail_org_user ON project_task_detail(organization_id, experiment_user_id);

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
COMMENT ON COLUMN project_task_detail.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_task_detail.create_at IS '作成日時';
COMMENT ON COLUMN project_task_detail.update_at IS '更新日時';

-- ============================================================
-- 18. project_instruction (プロジェクト指示)
-- ============================================================
DROP TABLE IF EXISTS project_instruction CASCADE;

CREATE TABLE project_instruction (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    experiment_instruction_id CHARACTER VARYING NOT NULL,
    method_id CHARACTER VARYING,
    instruction_target NUMERIC(2,0),
    priority NUMERIC(2,0),
    type NUMERIC(2,0),
    task_no NUMERIC(3,0),
    transition_id CHARACTER VARYING,
    instruction_status NUMERIC(2,0),
    instructions TEXT,
    instruction_user_id CHARACTER VARYING(50),
    instruction_date TIMESTAMP,
    create_user_id CHARACTER VARYING(50),
    update_user_id CHARACTER VARYING(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT project_instruction_PKC PRIMARY KEY (organization_id, project_id, experiment_instruction_id)
);

CREATE INDEX idx_project_instruction_status ON project_instruction(organization_id, project_id, instruction_status);

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
COMMENT ON COLUMN project_instruction.instruction_status IS '指示送信ステータス:0:未送信、1:送信済み';
COMMENT ON COLUMN project_instruction.instructions IS '指示内容';
COMMENT ON COLUMN project_instruction.instruction_user_id IS '実験指示ユーザID';
COMMENT ON COLUMN project_instruction.instruction_date IS '指示送信日';
COMMENT ON COLUMN project_instruction.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_instruction.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN project_instruction.create_at IS '作成日時';
COMMENT ON COLUMN project_instruction.update_at IS '更新日時';

-- ============================================================
-- 19. instruction_acknowledged_history (指示確認履歴)
-- ============================================================
DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE;

CREATE TABLE instruction_acknowledged_history (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    experiment_instruction_id CHARACTER VARYING NOT NULL,
    experiment_user_id CHARACTER VARYING(50) NOT NULL,
    acknowledged_at TIMESTAMP,
    create_user_id CHARACTER VARYING(50),
    update_user_id CHARACTER VARYING(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT instruction_acknowledged_history_PKC PRIMARY KEY (
        organization_id,
        project_id,
        experiment_instruction_id,
        experiment_user_id
    )
);

CREATE INDEX idx_instruction_ack_history_instruction ON instruction_acknowledged_history(experiment_instruction_id);
CREATE INDEX idx_instruction_ack_history_org ON instruction_acknowledged_history(organization_id);
CREATE INDEX idx_instruction_ack_history_user ON instruction_acknowledged_history(experiment_user_id);
CREATE INDEX idx_instruction_ack_history_project ON instruction_acknowledged_history(project_id);

COMMENT ON TABLE instruction_acknowledged_history IS '指示確認履歴テーブル';
COMMENT ON COLUMN instruction_acknowledged_history.organization_id IS '組織ID';
COMMENT ON COLUMN instruction_acknowledged_history.project_id IS 'プロジェクトID';
COMMENT ON COLUMN instruction_acknowledged_history.experiment_instruction_id IS '実験指示ID';
COMMENT ON COLUMN instruction_acknowledged_history.experiment_user_id IS '実験作業者ID';
COMMENT ON COLUMN instruction_acknowledged_history.acknowledged_at IS '確認日時';
COMMENT ON COLUMN instruction_acknowledged_history.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN instruction_acknowledged_history.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN instruction_acknowledged_history.create_at IS '作成日時';
COMMENT ON COLUMN instruction_acknowledged_history.update_at IS '更新日時';

-- ============================================================
-- 20. transition_data (トランジション実績)
--     ※ experiment_order 除外
-- ============================================================
DROP TABLE IF EXISTS transition_data CASCADE;

CREATE TABLE transition_data (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    transition_id CHARACTER VARYING NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'initial',
    progress_rate INTEGER NOT NULL DEFAULT 0,
    comment TEXT,
    create_user_id VARCHAR(50),
    updated_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transition_data_PKC PRIMARY KEY (organization_id, project_id, method_id, task_no, transition_id),
    CONSTRAINT transition_data_status_check
        CHECK (status IN ('initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error')),
    CONSTRAINT transition_data_progress_rate_check
        CHECK (progress_rate >= 0 AND progress_rate <= 100)
);

CREATE INDEX idx_transition_data_status ON transition_data(organization_id, project_id, status);
CREATE INDEX idx_transition_data_updated_at ON transition_data(organization_id, project_id, updated_at DESC);
CREATE INDEX idx_transition_data_task ON transition_data(organization_id, project_id, method_id, task_no);

COMMENT ON TABLE transition_data IS 'トランジション実績';
COMMENT ON COLUMN transition_data.organization_id IS '組織ID';
COMMENT ON COLUMN transition_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN transition_data.method_id IS 'メソッドID';
COMMENT ON COLUMN transition_data.task_no IS 'タスク連番';
COMMENT ON COLUMN transition_data.transition_id IS 'トランジションID';
COMMENT ON COLUMN transition_data.status IS 'トランジションの実行状態: initial/preparing/ready/running/paused/completed/error';
COMMENT ON COLUMN transition_data.progress_rate IS '進捗率: 0-100の整数値';
COMMENT ON COLUMN transition_data.comment IS 'ステータス更新時のコメント';
COMMENT ON COLUMN transition_data.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN transition_data.updated_by IS '更新者ユーザID';
COMMENT ON COLUMN transition_data.created_at IS '作成日時';
COMMENT ON COLUMN transition_data.updated_at IS '更新日時';

-- ============================================================
-- 21. template_data (テンプレート実績)
--     ※ experiment_order 除外
-- ============================================================
DROP TABLE IF EXISTS template_data CASCADE;

CREATE TABLE template_data (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    place_id CHARACTER VARYING NOT NULL,
    property_set JSONB,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT template_data_PKC PRIMARY KEY (organization_id, project_id, method_id, task_no, place_id)
);

COMMENT ON TABLE template_data IS 'テンプレート実績';
COMMENT ON COLUMN template_data.organization_id IS '組織ID';
COMMENT ON COLUMN template_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN template_data.method_id IS 'メソッドID';
COMMENT ON COLUMN template_data.task_no IS 'タスク連番';
COMMENT ON COLUMN template_data.place_id IS 'プレースID';
COMMENT ON COLUMN template_data.property_set IS 'プロパティセット';
COMMENT ON COLUMN template_data.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN template_data.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN template_data.create_at IS '作成日時';
COMMENT ON COLUMN template_data.update_at IS '更新日時';

-- ============================================================
-- 22. issue (問題)
-- ============================================================
DROP TABLE IF EXISTS issue CASCADE;

CREATE TABLE issue (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    issue_id CHARACTER VARYING NOT NULL,
    method_id CHARACTER VARYING,
    issue_target NUMERIC(2,0),
    task_no NUMERIC(3,0),
    transition_id CHARACTER VARYING,
    issue_title CHARACTER VARYING,
    issue_type NUMERIC(2,0),
    issue_contents TEXT,
    status NUMERIC(2,0),
    issue_reporter_id VARCHAR(50),
    issue_report_at TIMESTAMP,
    issue_completer_id VARCHAR(50),
    issue_complate_at TIMESTAMP,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT issue_pkey PRIMARY KEY (organization_id, project_id, issue_id)
);

CREATE INDEX idx_issue_org_project_status ON issue(organization_id, project_id, status);
CREATE INDEX idx_issue_org_project_created ON issue(organization_id, project_id, create_at DESC);
CREATE INDEX idx_issue_org_method_task ON issue(organization_id, method_id, task_no) WHERE issue_target IS NOT NULL;
CREATE INDEX idx_issue_org_transition ON issue(organization_id, transition_id) WHERE transition_id IS NOT NULL;

COMMENT ON TABLE issue IS '問題';
COMMENT ON COLUMN issue.organization_id IS '組織ID';
COMMENT ON COLUMN issue.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issue.issue_id IS '問題ID';
COMMENT ON COLUMN issue.method_id IS 'メソッドID';
COMMENT ON COLUMN issue.issue_target IS '問題対象';
COMMENT ON COLUMN issue.task_no IS 'タスク連番';
COMMENT ON COLUMN issue.transition_id IS 'トランジションID';
COMMENT ON COLUMN issue.issue_title IS '問題タイトル';
COMMENT ON COLUMN issue.issue_type IS '問題タイプ';
COMMENT ON COLUMN issue.issue_contents IS '問題内容';
COMMENT ON COLUMN issue.status IS 'ステータス';
COMMENT ON COLUMN issue.issue_reporter_id IS '問題報告者ID';
COMMENT ON COLUMN issue.issue_report_at IS '問題報告日時';
COMMENT ON COLUMN issue.issue_completer_id IS '問題完了者ID';
COMMENT ON COLUMN issue.issue_complate_at IS '問題完了日時';
COMMENT ON COLUMN issue.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN issue.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN issue.create_at IS '作成日時';
COMMENT ON COLUMN issue.update_at IS '更新日時';

-- ============================================================
-- 23. issue_comment (問題コメント)
-- ============================================================
DROP TABLE IF EXISTS issue_comment CASCADE;

CREATE TABLE issue_comment (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    issue_id CHARACTER VARYING NOT NULL,
    sequence_no NUMERIC(3,0) NOT NULL,
    comment CHARACTER VARYING,
    author_id VARCHAR(50),
    commented_at TIMESTAMP,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT issue_comment_pkey PRIMARY KEY (organization_id, project_id, issue_id, sequence_no)
);

CREATE INDEX idx_issue_comment_issue_id ON issue_comment(issue_id, sequence_no);
CREATE INDEX idx_issue_comment_org_issue ON issue_comment(organization_id, issue_id);

COMMENT ON TABLE issue_comment IS '問題コメント';
COMMENT ON COLUMN issue_comment.organization_id IS '組織ID';
COMMENT ON COLUMN issue_comment.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issue_comment.issue_id IS '問題ID';
COMMENT ON COLUMN issue_comment.sequence_no IS 'シーケンス番号';
COMMENT ON COLUMN issue_comment.comment IS 'コメント';
COMMENT ON COLUMN issue_comment.author_id IS '記入者ID';
COMMENT ON COLUMN issue_comment.commented_at IS '記入日時';
COMMENT ON COLUMN issue_comment.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN issue_comment.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN issue_comment.create_at IS '作成日時';
COMMENT ON COLUMN issue_comment.update_at IS '更新日時';

-- ============================================================
-- 24. maiml_event_log (MaiMLイベントログ)
-- ============================================================
DROP TABLE IF EXISTS maiml_event_log CASCADE;

CREATE TABLE maiml_event_log (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    sequence_no NUMERIC(5,0) NOT NULL,
    log JSONB,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT maiml_event_log_pkey PRIMARY KEY (organization_id, project_id, sequence_no)
);

COMMENT ON TABLE maiml_event_log IS 'MaiMLイベントログ';
COMMENT ON COLUMN maiml_event_log.organization_id IS '組織ID';
COMMENT ON COLUMN maiml_event_log.project_id IS 'プロジェクトID';
COMMENT ON COLUMN maiml_event_log.sequence_no IS 'シーケンス番号';
COMMENT ON COLUMN maiml_event_log.log IS 'ログ';
COMMENT ON COLUMN maiml_event_log.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN maiml_event_log.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN maiml_event_log.create_at IS '作成日時';
COMMENT ON COLUMN maiml_event_log.update_at IS '更新日時';

-- ============================================================
-- 25. maiml_validation_history (MAIMLバリデーション履歴)
-- ============================================================
DROP TABLE IF EXISTS maiml_validation_history CASCADE;

CREATE TABLE maiml_validation_history (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20),
    file_key VARCHAR(500),
    user_id UUID NOT NULL,
    validation_mode VARCHAR(20) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    total_errors INTEGER NOT NULL DEFAULT 0,
    total_warnings INTEGER NOT NULL DEFAULT 0,
    error_details JSONB,
    warning_details JSONB,
    validation_duration_ms INTEGER,
    elements_validated INTEGER,
    attributes_validated INTEGER,
    nodes_validated INTEGER,
    arcs_validated INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maiml_validation_history_org_id ON maiml_validation_history(organization_id);
CREATE INDEX idx_maiml_validation_history_project_id ON maiml_validation_history(project_id);
CREATE INDEX idx_maiml_validation_history_user_id ON maiml_validation_history(user_id);
CREATE INDEX idx_maiml_validation_history_file_key ON maiml_validation_history(file_key);
CREATE INDEX idx_maiml_validation_history_created_at ON maiml_validation_history(created_at);
CREATE INDEX idx_maiml_validation_history_is_valid ON maiml_validation_history(is_valid);
CREATE INDEX idx_maiml_validation_history_error_details ON maiml_validation_history USING GIN (error_details);
CREATE INDEX idx_maiml_validation_history_warning_details ON maiml_validation_history USING GIN (warning_details);

COMMENT ON TABLE maiml_validation_history IS 'MAIMLバリデーション履歴テーブル';
COMMENT ON COLUMN maiml_validation_history.validation_id IS 'バリデーションID（UUID、主キー）';
COMMENT ON COLUMN maiml_validation_history.organization_id IS '組織ID（マルチテナント分離用）';
COMMENT ON COLUMN maiml_validation_history.project_id IS 'プロジェクトID（任意）';
COMMENT ON COLUMN maiml_validation_history.file_key IS 'S3/Swiftファイルキー（任意）';
COMMENT ON COLUMN maiml_validation_history.user_id IS 'バリデーション実行ユーザーID';
COMMENT ON COLUMN maiml_validation_history.validation_mode IS 'バリデーションモード（basic/full）';
COMMENT ON COLUMN maiml_validation_history.is_valid IS 'バリデーション結果';
COMMENT ON COLUMN maiml_validation_history.total_errors IS 'エラー総数';
COMMENT ON COLUMN maiml_validation_history.total_warnings IS '警告総数';
COMMENT ON COLUMN maiml_validation_history.error_details IS 'エラー詳細（JSONB配列）';
COMMENT ON COLUMN maiml_validation_history.warning_details IS '警告詳細（JSONB配列）';
COMMENT ON COLUMN maiml_validation_history.validation_duration_ms IS 'バリデーション処理時間（ミリ秒）';
COMMENT ON COLUMN maiml_validation_history.elements_validated IS '検証した要素数';
COMMENT ON COLUMN maiml_validation_history.attributes_validated IS '検証した属性数';
COMMENT ON COLUMN maiml_validation_history.nodes_validated IS '検証したPetri Netノード数';
COMMENT ON COLUMN maiml_validation_history.arcs_validated IS '検証したPetri Netアーク数';
COMMENT ON COLUMN maiml_validation_history.created_at IS 'バリデーション実行日時';

-- ============================================================
-- 26. maiml_schema_definitions (MAIMLスキーマ定義)
-- ============================================================
DROP TABLE IF EXISTS maiml_schema_definitions CASCADE;

CREATE TABLE maiml_schema_definitions (
    schema_version VARCHAR(20) PRIMARY KEY,
    schema_content TEXT NOT NULL,
    schema_parsed_metadata JSONB,
    element_definitions JSONB,
    attribute_definitions JSONB,
    datatype_definitions JSONB,
    namespace_definitions JSONB,
    hierarchy_rules JSONB,
    validation_rules JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maiml_schema_version ON maiml_schema_definitions(schema_version);
CREATE INDEX idx_maiml_schema_active ON maiml_schema_definitions(is_active);
CREATE INDEX idx_maiml_schema_element_definitions ON maiml_schema_definitions USING GIN (element_definitions);
CREATE INDEX idx_maiml_schema_hierarchy_rules ON maiml_schema_definitions USING GIN (hierarchy_rules);

CREATE OR REPLACE FUNCTION update_maiml_schema_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_maiml_schema_definitions_updated_at
    BEFORE UPDATE ON maiml_schema_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_maiml_schema_definitions_updated_at();

COMMENT ON TABLE maiml_schema_definitions IS 'MAIMLスキーマ定義テーブル';
COMMENT ON COLUMN maiml_schema_definitions.schema_version IS 'スキーマバージョン（主キー）';
COMMENT ON COLUMN maiml_schema_definitions.schema_content IS 'XSDスキーマの全文';
COMMENT ON COLUMN maiml_schema_definitions.is_active IS 'アクティブフラグ';
COMMENT ON COLUMN maiml_schema_definitions.created_at IS '作成日時';
COMMENT ON COLUMN maiml_schema_definitions.updated_at IS '最終更新日時';

-- ============================================================
-- 27. maiml_analysis_results (MaiML分析結果)
-- ============================================================
DROP TABLE IF EXISTS maiml_analysis_results CASCADE;

CREATE TABLE maiml_analysis_results (
    id SERIAL PRIMARY KEY,
    file_key VARCHAR(500) UNIQUE NOT NULL,
    is_valid BOOLEAN DEFAULT FALSE,
    version VARCHAR(20),
    namespace VARCHAR(255),
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    statistics JSONB DEFAULT '{}',
    processing_time INTEGER,
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maiml_analysis_results_file_key ON maiml_analysis_results(file_key);
CREATE INDEX idx_maiml_analysis_results_is_valid ON maiml_analysis_results(is_valid);
CREATE INDEX idx_maiml_analysis_results_timestamp ON maiml_analysis_results(analysis_timestamp DESC);
CREATE INDEX idx_maiml_analysis_results_errors_gin ON maiml_analysis_results USING GIN (errors);
CREATE INDEX idx_maiml_analysis_results_warnings_gin ON maiml_analysis_results USING GIN (warnings);
CREATE INDEX idx_maiml_analysis_results_statistics_gin ON maiml_analysis_results USING GIN (statistics);

COMMENT ON TABLE maiml_analysis_results IS 'MaiML分析結果テーブル';
COMMENT ON COLUMN maiml_analysis_results.file_key IS 'ファイルキー（S3キー）';
COMMENT ON COLUMN maiml_analysis_results.is_valid IS 'バリデーション結果';

-- ============================================================
-- 28. maiml_drafts (MaiMLドラフト)
-- ============================================================
DROP TABLE IF EXISTS maiml_drafts CASCADE;

CREATE TABLE maiml_drafts (
    id SERIAL PRIMARY KEY,
    draft_key VARCHAR(255) UNIQUE NOT NULL CHECK (draft_key ~ '^draft_[a-zA-Z0-9_-]+$'),
    user_id VARCHAR(100) NOT NULL DEFAULT 'default-user',
    draft_name VARCHAR(255) NOT NULL CHECK (char_length(draft_name) >= 1 AND char_length(draft_name) <= 255),
    original_file_key VARCHAR(500),
    nodes JSONB NOT NULL DEFAULT '[]',
    arcs JSONB NOT NULL DEFAULT '[]',
    templates JSONB NOT NULL DEFAULT '{"resultTemplates": {}, "materialTemplates": {}, "conditionTemplates": {}}',
    document_data JSONB NOT NULL DEFAULT '{"id": "documentID", "date": "", "name": "document", "uuid": ""}',
    node_count INTEGER DEFAULT 0,
    arc_count INTEGER DEFAULT 0,
    template_count INTEGER DEFAULT 0,
    auto_save_enabled BOOLEAN DEFAULT TRUE,
    auto_save_interval INTEGER DEFAULT 300,
    organization_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_auto_saved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_maiml_drafts_user_id ON maiml_drafts(user_id);
CREATE INDEX idx_maiml_drafts_organization_id ON maiml_drafts(organization_id);
CREATE INDEX idx_maiml_drafts_org_user ON maiml_drafts(organization_id, user_id);
CREATE INDEX idx_maiml_drafts_last_saved ON maiml_drafts(user_id, last_saved_at DESC);
CREATE INDEX idx_maiml_drafts_original_file ON maiml_drafts(original_file_key) WHERE original_file_key IS NOT NULL;

COMMENT ON TABLE maiml_drafts IS 'MaiMLドラフトテーブル';
COMMENT ON COLUMN maiml_drafts.draft_key IS 'ドラフトキー（一意）';
COMMENT ON COLUMN maiml_drafts.user_id IS 'ユーザID';
COMMENT ON COLUMN maiml_drafts.organization_id IS '組織ID';

-- ============================================================
-- 29. file_metadata (ファイルメタデータ)
-- ============================================================
DROP TABLE IF EXISTS file_metadata CASCADE;

CREATE TABLE file_metadata (
    file_key VARCHAR(500) PRIMARY KEY,
    s3_bucket VARCHAR(100) NOT NULL,
    organization_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    file_extension VARCHAR(10),
    is_maiml_file BOOLEAN DEFAULT FALSE,
    maiml_analysis_status VARCHAR(20) DEFAULT 'not_analyzed',
    maiml_error_count INTEGER DEFAULT 0,
    maiml_warning_count INTEGER DEFAULT 0,
    maiml_version VARCHAR(20),
    maiml_transitions_count INTEGER,
    maiml_places_count INTEGER,
    maiml_validation_result JSONB DEFAULT '{}'::jsonb,
    maiml_last_analyzed TIMESTAMP WITH TIME ZONE,
    last_edit_timestamp TIMESTAMP WITH TIME ZONE,
    uploaded_by VARCHAR(100) NOT NULL,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Phase 2: 詳細検索機能
    custom_metadata JSONB DEFAULT '{}'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    search_keywords TEXT[],
    description TEXT,
    file_hash VARCHAR(64),
    parent_folder_path VARCHAR(500),
    -- Phase 2.5: MAIML検索用メタデータ
    maiml_document_uuid VARCHAR(255),
    maiml_document_name TEXT,
    maiml_document_description TEXT,
    maiml_measurement_values JSONB DEFAULT '[]'::jsonb,
    maiml_units JSONB DEFAULT '[]'::jsonb,
    maiml_section_types JSONB DEFAULT '[]'::jsonb,
    maiml_ids JSONB DEFAULT '[]'::jsonb,
    maiml_refs JSONB DEFAULT '[]'::jsonb,
    maiml_keys JSONB DEFAULT '[]'::jsonb,
    maiml_elements JSONB DEFAULT '[]'::jsonb,
    maiml_values JSONB DEFAULT '[]'::jsonb,
    maiml_metadata_extracted_at TIMESTAMP WITH TIME ZONE,
    maiml_metadata_extraction_status VARCHAR(50) DEFAULT 'pending',
    -- Phase 3: アップロード管理
    upload_batch_id VARCHAR(255),
    upload_source VARCHAR(50) DEFAULT 'web_upload',
    upload_method VARCHAR(50) DEFAULT 'single'
        CHECK (upload_method IN ('single', 'multipart', 'resumable')),
    s3_storage_class VARCHAR(50) DEFAULT 'STANDARD',
    s3_etag VARCHAR(100)
);

CREATE INDEX idx_file_metadata_organization_id ON file_metadata(organization_id);
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);
CREATE INDEX idx_file_metadata_custom_metadata_gin ON file_metadata USING GIN (custom_metadata);
CREATE INDEX idx_file_metadata_tags_gin ON file_metadata USING GIN (tags);
CREATE INDEX idx_file_metadata_search_keywords_gin ON file_metadata USING GIN (search_keywords);
CREATE INDEX idx_file_metadata_file_hash ON file_metadata(file_hash);
CREATE INDEX idx_file_metadata_parent_folder ON file_metadata(parent_folder_path);
CREATE INDEX idx_file_metadata_maiml_doc_uuid ON file_metadata(maiml_document_uuid) WHERE maiml_document_uuid IS NOT NULL;
CREATE INDEX idx_file_metadata_maiml_doc_name ON file_metadata(maiml_document_name) WHERE maiml_document_name IS NOT NULL;
CREATE INDEX idx_file_metadata_maiml_measurement_values_gin ON file_metadata USING GIN (maiml_measurement_values);
CREATE INDEX idx_file_metadata_maiml_units_gin ON file_metadata USING GIN (maiml_units);
CREATE INDEX idx_file_metadata_maiml_section_types_gin ON file_metadata USING GIN (maiml_section_types);
CREATE INDEX idx_file_metadata_maiml_ids_gin ON file_metadata USING GIN (maiml_ids);
CREATE INDEX idx_file_metadata_maiml_refs_gin ON file_metadata USING GIN (maiml_refs);
CREATE INDEX idx_file_metadata_maiml_keys_gin ON file_metadata USING GIN (maiml_keys);
CREATE INDEX idx_file_metadata_maiml_elements_gin ON file_metadata USING GIN (maiml_elements);
CREATE INDEX idx_file_metadata_maiml_values_gin ON file_metadata USING GIN (maiml_values);
CREATE INDEX idx_file_metadata_maiml_extraction_status ON file_metadata(maiml_metadata_extraction_status);
CREATE INDEX idx_file_metadata_upload_batch ON file_metadata(upload_batch_id);
CREATE INDEX idx_file_metadata_batch_id ON file_metadata(upload_batch_id);

COMMENT ON TABLE file_metadata IS 'S3/Swiftファイルのメタデータ管理テーブル';
COMMENT ON COLUMN file_metadata.file_key IS 'S3キー（主キー）';
COMMENT ON COLUMN file_metadata.s3_bucket IS 'S3バケット名またはSwiftコンテナ名';
COMMENT ON COLUMN file_metadata.organization_id IS '組織ID（マルチテナント分離用）';
COMMENT ON COLUMN file_metadata.original_filename IS '元のファイル名';
COMMENT ON COLUMN file_metadata.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN file_metadata.file_type IS 'MIMEタイプ';
COMMENT ON COLUMN file_metadata.uploaded_by IS 'アップロードユーザーID';
COMMENT ON COLUMN file_metadata.created_at IS '作成日時';
COMMENT ON COLUMN file_metadata.updated_at IS '更新日時';
COMMENT ON COLUMN file_metadata.upload_batch_id IS '一括アップロード時のバッチID';
COMMENT ON COLUMN file_metadata.maiml_metadata_extraction_status IS 'MAIMLメタデータ抽出状態（pending/success/failed）';

-- ============================================================
-- 30. upload_batch (アップロードバッチ)
-- ============================================================
DROP TABLE IF EXISTS upload_batch CASCADE;

CREATE TABLE upload_batch (
    batch_id VARCHAR(100) PRIMARY KEY,
    batch_name VARCHAR(255) NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    upload_by VARCHAR(50) NOT NULL,
    total_files INTEGER NOT NULL,
    completed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    create_at TIMESTAMP NOT NULL DEFAULT NOW(),
    update_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_completed_files CHECK (completed_files >= 0),
    CONSTRAINT check_failed_files CHECK (failed_files >= 0),
    CONSTRAINT check_total_files CHECK (total_files > 0),
    CONSTRAINT check_progress CHECK (completed_files + failed_files <= total_files)
);

CREATE INDEX idx_upload_batch_organization ON upload_batch(organization_id);
CREATE INDEX idx_upload_batch_upload_by ON upload_batch(upload_by);
CREATE INDEX idx_upload_batch_status ON upload_batch(status);
CREATE INDEX idx_upload_batch_create_at ON upload_batch(create_at DESC);

COMMENT ON TABLE upload_batch IS 'アップロードバッチ管理テーブル';
COMMENT ON COLUMN upload_batch.batch_id IS 'バッチ識別子（主キー）';
COMMENT ON COLUMN upload_batch.upload_type IS 'アップロード種別（single/bulk/folder/draft）';
COMMENT ON COLUMN upload_batch.upload_by IS 'アップロード実行者';
COMMENT ON COLUMN upload_batch.status IS 'バッチステータス（in_progress/completed/completed_with_errors/failed）';
COMMENT ON COLUMN upload_batch.create_at IS 'レコード作成日時';
COMMENT ON COLUMN upload_batch.update_at IS 'レコード更新日時';

-- ============================================================
-- 31. transition_set (トランジションセット - セマンティック検索)
-- ============================================================
DROP TABLE IF EXISTS transition_set CASCADE;

CREATE TABLE transition_set (
    transition_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    project_name TEXT NULL,
    file_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    method_uuid UUID NOT NULL,
    transition_id TEXT NOT NULL,
    instruction_ids TEXT[] NULL,
    instruction_descs TEXT[] NULL,
    input_place_ids TEXT[] NOT NULL DEFAULT '{}',
    output_place_ids TEXT[] NOT NULL DEFAULT '{}',
    input_place_count INT NOT NULL DEFAULT 0,
    output_place_count INT NOT NULL DEFAULT 0,
    input_text TEXT NOT NULL DEFAULT '',
    transition_text TEXT NOT NULL DEFAULT '',
    output_text TEXT NOT NULL DEFAULT '',
    structure_text TEXT NOT NULL DEFAULT '',
    input_mt_count INT NULL,
    input_ct_count INT NULL,
    input_rt_count INT NULL,
    output_mt_count INT NULL,
    output_ct_count INT NULL,
    output_rt_count INT NULL,
    emb_input VECTOR(768) NOT NULL,
    emb_transition VECTOR(768) NOT NULL,
    emb_output VECTOR(768) NOT NULL,
    emb_structure VECTOR(768) NOT NULL,
    technique TEXT NULL,
    embedding_model_version TEXT NOT NULL DEFAULT 'embeddinggemma-768d-v1',
    norm_template_version TEXT NOT NULL DEFAULT 'v2.5',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_transition_set_key UNIQUE (organization_id, file_id, method_uuid, transition_id)
);

CREATE INDEX idx_ts_organization_id ON transition_set(organization_id);
CREATE INDEX idx_ts_file_id ON transition_set(file_id);
CREATE INDEX idx_ts_method_uuid ON transition_set(method_uuid);
CREATE INDEX idx_ts_updated_at ON transition_set(updated_at);
CREATE INDEX idx_ts_org_project ON transition_set(organization_id, project_name);
CREATE INDEX idx_ts_technique ON transition_set(technique);

CREATE INDEX ts_emb_input_hnsw ON transition_set USING HNSW (emb_input vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ts_emb_transition_hnsw ON transition_set USING HNSW (emb_transition vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ts_emb_output_hnsw ON transition_set USING HNSW (emb_output vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ts_emb_structure_hnsw ON transition_set USING HNSW (emb_structure vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE transition_set IS 'セマンティック検索（トランジションセット型）のコアテーブル';
COMMENT ON COLUMN transition_set.transition_set_id IS '主キー（UUID）';
COMMENT ON COLUMN transition_set.organization_id IS '組織ID（マルチテナント分離用）';
COMMENT ON COLUMN transition_set.project_name IS 'プロジェクト名（S3パスから抽出、NULL許容）';
COMMENT ON COLUMN transition_set.file_id IS 'MAIMLファイルの識別子';
COMMENT ON COLUMN transition_set.method_uuid IS 'method要素のUUID';
COMMENT ON COLUMN transition_set.transition_id IS 'PNML transition要素のID';
COMMENT ON COLUMN transition_set.emb_input IS '入力ベクトル（768次元）';
COMMENT ON COLUMN transition_set.emb_transition IS '遷移ベクトル（768次元）';
COMMENT ON COLUMN transition_set.emb_output IS '出力ベクトル（768次元）';
COMMENT ON COLUMN transition_set.emb_structure IS '構造ベクトル（768次元）';
COMMENT ON COLUMN transition_set.technique IS '分析手法コード（RAMAN, XRF, GC-MS等）';

-- ============================================================
-- 完了
-- ============================================================
