-- ===================================================================
-- マイグレーション: transition_dataテーブルのステータス管理機能追加
-- 作成日: 2026-02-03
-- 説明: トランジション状態更新機能のためのスキーマ変更とインデックス追加
-- ===================================================================

-- Step 1: カラムの型変更と追加
-- ===================================================================

-- 1.1. status カラムを NUMERIC から VARCHAR に変更
ALTER TABLE transition_data 
    ALTER COLUMN status TYPE VARCHAR(20) USING 
        CASE 
            WHEN status = 0 THEN 'initial'
            WHEN status = 1 THEN 'preparing'
            WHEN status = 2 THEN 'ready'
            WHEN status = 3 THEN 'running'
            WHEN status = 4 THEN 'paused'
            WHEN status = 5 THEN 'completed'
            WHEN status = 6 THEN 'error'
            ELSE 'initial'
        END;

-- 1.2. status にデフォルト値とNOT NULL制約を追加
ALTER TABLE transition_data 
    ALTER COLUMN status SET DEFAULT 'initial',
    ALTER COLUMN status SET NOT NULL;

-- 1.3. status に CHECK 制約を追加
ALTER TABLE transition_data 
    ADD CONSTRAINT transition_data_status_check 
    CHECK (status IN ('initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'));

-- 1.4. progress_rate カラムを INTEGER に変更
ALTER TABLE transition_data 
    ALTER COLUMN progress_rate TYPE INTEGER USING progress_rate::INTEGER;

-- 1.5. progress_rate にデフォルト値とNOT NULL制約、CHECK制約を追加
ALTER TABLE transition_data 
    ALTER COLUMN progress_rate SET DEFAULT 0,
    ALTER COLUMN progress_rate SET NOT NULL,
    ADD CONSTRAINT transition_data_progress_rate_check 
    CHECK (progress_rate >= 0 AND progress_rate <= 100);

-- 1.6. comment カラムを追加
ALTER TABLE transition_data 
    ADD COLUMN IF NOT EXISTS comment TEXT;

-- 1.7. update_user_id を updated_by にリネーム
ALTER TABLE transition_data 
    RENAME COLUMN update_user_id TO updated_by;

-- 1.8. updated_by に NOT NULL 制約を追加
ALTER TABLE transition_data 
    ALTER COLUMN updated_by SET NOT NULL;

-- 1.9. create_at を created_at にリネーム
ALTER TABLE transition_data 
    RENAME COLUMN create_at TO created_at;

-- 1.10. update_at を updated_at にリネーム
ALTER TABLE transition_data 
    RENAME COLUMN update_at TO updated_at;

-- 1.11. created_at と updated_at にデフォルト値とNOT NULL制約を追加
ALTER TABLE transition_data 
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL;

-- Step 2: 外部キー制約の追加
-- ===================================================================

-- 2.1. project への外部キー制約
ALTER TABLE transition_data 
    DROP CONSTRAINT IF EXISTS transition_data_project_fkey;

ALTER TABLE transition_data 
    ADD CONSTRAINT transition_data_project_fkey 
    FOREIGN KEY (organization_id, project_id) 
    REFERENCES project(organization_id, project_id) 
    ON DELETE CASCADE;

-- 2.2. organization_user への外部キー制約
ALTER TABLE transition_data 
    DROP CONSTRAINT IF EXISTS transition_data_updated_by_fkey;

ALTER TABLE transition_data 
    ADD CONSTRAINT transition_data_updated_by_fkey 
    FOREIGN KEY (organization_id, updated_by) 
    REFERENCES organization_user(organization_id, user_id) 
    ON DELETE RESTRICT;

-- Step 3: パフォーマンス向上のためのインデックス追加
-- ===================================================================

-- 3.1. ステータスフィルタリング用インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_status 
    ON transition_data(organization_id, project_id, status);

-- 3.2. 更新日時ソート用インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_updated_at 
    ON transition_data(organization_id, project_id, updated_at DESC);

-- 3.3. タスク単位での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_task 
    ON transition_data(organization_id, project_id, method_id, task_no);

-- Step 4: コメントの更新
-- ===================================================================

COMMENT ON COLUMN transition_data.status IS 
'トランジションの実行状態: initial(初期状態), preparing(準備状態), ready(準備完了状態), running(動作状態), paused(休止状態), completed(終状態), error(異常終了状態)';

COMMENT ON COLUMN transition_data.progress_rate IS 
'進捗率: 0-100の整数値。completedの場合は自動的に100に設定される';

COMMENT ON COLUMN transition_data.comment IS 
'ステータス更新時のコメント: 最大2000文字';

COMMENT ON COLUMN transition_data.updated_by IS 
'更新者ユーザID';

COMMENT ON COLUMN transition_data.created_at IS 
'作成日時';

COMMENT ON COLUMN transition_data.updated_at IS 
'更新日時';

-- Step 5: 既存データの確認（参考情報）
-- ===================================================================
-- 既存データがある場合、以下のクエリで確認できます:
-- SELECT organization_id, project_id, method_id, task_no, transition_id, status, progress_rate 
-- FROM transition_data 
-- LIMIT 10;

-- ===================================================================
-- マイグレーション完了
-- ===================================================================