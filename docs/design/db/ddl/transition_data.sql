-- ===================================================================
-- テーブル名: transition_data (トランジション実績・順序)
-- 説明: トランジションの実績データおよびManagerが設定した実行順序を管理するテーブル
-- バージョン: 3.0 (2026-06-17)
-- 変更履歴:
--   2.0 (2026-02-03): 初版作成
--   3.0 (2026-06-17): work_order / is_order_fixed カラム追加（トランジション作業順序管理）
--                     マイグレーション: backend/migrations/20260617_001_add_order_to_transition_data.sql
--
-- task_no の用途:
--   task_no = 0  → 順序管理行（Manager が ExperimentPlanDialog で設定）
--                   status / progress_rate は NULL
--                   work_order / is_order_fixed のみ使用
--   task_no = 1〜N → Worker 作業実績行
--                   status / progress_rate を使用
--                   work_order / is_order_fixed は task_no=0 と同値に保つ
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS transition_data CASCADE;

CREATE TABLE transition_data (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    transition_id CHARACTER VARYING NOT NULL,
    
    -- トランジション実績情報（Worker作業記録: task_no=1〜N で使用）
    status NUMERIC(2,0),
    progress_rate NUMERIC(3,0),

    -- トランジション順序情報（Manager設定: task_no=0 が正）
    work_order INTEGER NOT NULL DEFAULT 0,
    is_order_fixed BOOLEAN NOT NULL DEFAULT false,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
  , CONSTRAINT transition_data_PKC PRIMARY KEY (organization_id,project_id,method_id,task_no,transition_id)
);

-- コメント
COMMENT ON TABLE transition_data IS 'トランジション実績・順序';
COMMENT ON COLUMN transition_data.organization_id IS '組織ID';
COMMENT ON COLUMN transition_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN transition_data.method_id IS 'メソッドID';
COMMENT ON COLUMN transition_data.task_no IS 'タスク連番（0=全体タブの順序管理行、1〜N=Worker作業実績行）';
COMMENT ON COLUMN transition_data.transition_id IS 'トランジションID';
COMMENT ON COLUMN transition_data.status IS 'ステータス（Worker作業実績、task_no=0はNULL）';
COMMENT ON COLUMN transition_data.progress_rate IS '進捗率（Worker作業実績、task_no=0はNULL）';
COMMENT ON COLUMN transition_data.work_order IS 'トランジションの作業順序（1,2,3...）NOT NULL。Manager が ExperimentPlanDialog で設定。task_no=0 の行を正として扱う';
COMMENT ON COLUMN transition_data.is_order_fixed IS '固定順序フラグ（true: 順序変更不可、デフォルト: false）NOT NULL';
COMMENT ON COLUMN transition_data.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN transition_data.create_at IS '作成日時';
COMMENT ON COLUMN transition_data.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN transition_data.update_at IS '更新日時';

-- インデックス
CREATE INDEX idx_transition_data_work_order
  ON transition_data (organization_id, project_id, method_id, task_no, work_order);
