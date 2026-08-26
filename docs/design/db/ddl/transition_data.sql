-- ===================================================================
-- テーブル名: transition_data (トランジション実績・順序)
-- 説明: トランジションの実績データおよびManagerが設定した実行順序を管理するテーブル
-- バージョン: 5.0 (2026-08-25)
-- 変更履歴:
--   2.0 (2026-02-03): 初版作成
--   3.0 (2026-06-17): work_order カラム追加（トランジション作業順序管理）
--                     マイグレーション: backend/migrations/20260617_update_transition_data.sql
--   4.0 (2026-06-26): prerequisite_transition_ids カラム追加（前提条件管理）
--                     is_order_fixed を不要として除外（統合マイグレーションファイルに反映）
--                     マイグレーション: backend/migrations/20260617_update_transition_data.sql
--   5.0 (2026-08-25): is_recorded カラム追加（記録済みフラグ）
--                     マイグレーション: backend/migrations/20260825_add_is_recorded_to_transition_data.sql
--
-- task_no の用途:
--   task_no = 0  → 順序管理行（Manager が ExperimentPlanDialog で設定）
--                   status / progress_rate は NULL
--                   work_order / prerequisite_transition_ids のみ使用
--   task_no = 1〜N → Worker 作業実績行
--                   status / progress_rate を使用
--                   work_order は task_no=0 と同値に保つ
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

    -- 前提条件（このトランジションを開始するために完了が必要なトランジションIDの配列）
    prerequisite_transition_ids TEXT[] NOT NULL DEFAULT '{}',

    -- 記録済みフラグ
    is_recorded BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
   CONSTRAINT transition_data_PKC PRIMARY KEY (organization_id,project_id,method_id,task_no,transition_id)
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
COMMENT ON COLUMN transition_data.prerequisite_transition_ids IS '前提となるトランジションIDの配列。これらが全て completed になるまでこのトランジションは開始不可。空配列の場合は依存なし（いつでも開始可能）。';
COMMENT ON COLUMN transition_data.is_recorded IS '記録済みフラグ（TRUE=記録済み、FALSE=未記録）';
COMMENT ON COLUMN transition_data.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN transition_data.create_at IS '作成日時';
COMMENT ON COLUMN transition_data.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN transition_data.update_at IS '更新日時';

-- インデックス
CREATE INDEX idx_transition_data_work_order
  ON transition_data (organization_id, project_id, method_id, task_no, work_order);
