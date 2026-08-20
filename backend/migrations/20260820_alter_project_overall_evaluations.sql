-- ============================================================
-- project_overall_evaluations テーブル カラム整理マイグレーション
--
-- 変更内容:
--   1. evaluation_id UUID → evaluation_seq SERIAL に変更（PK再構築）
--   2. organization_id TEXT → UUID
--   3. project_id TEXT → VARCHAR(20)
--   4. evaluated_by → evaluated_user_id にリネーム + VARCHAR(50)
--   5. evaluation_scope / method_id / transition_id / overall_digital
--      / create_user_id TEXT → VARCHAR
--   6. update_user_id / update_at カラム追加
--
-- @date 2026-08-20
-- ============================================================

BEGIN;

-- 1. 既存 PK 制約を削除
ALTER TABLE project_overall_evaluations
  DROP CONSTRAINT IF EXISTS project_overall_evaluations_pkey;

-- 2. evaluation_id カラム削除
ALTER TABLE project_overall_evaluations
  DROP COLUMN IF EXISTS evaluation_id;

-- 3. evaluation_seq SERIAL カラム追加
ALTER TABLE project_overall_evaluations
  ADD COLUMN IF NOT EXISTS evaluation_seq SERIAL NOT NULL;

-- 4. 新 PK 制約を追加
ALTER TABLE project_overall_evaluations
  ADD CONSTRAINT project_overall_evaluations_pkey
    PRIMARY KEY (organization_id, project_id, evaluation_seq);

-- 5. organization_id TEXT → UUID に変換
ALTER TABLE project_overall_evaluations
  ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;

-- 6. project_id TEXT → VARCHAR(20) に変換
ALTER TABLE project_overall_evaluations
  ALTER COLUMN project_id TYPE VARCHAR(20);

-- 7. evaluated_by → evaluated_user_id リネーム + VARCHAR(50) に変換
ALTER TABLE project_overall_evaluations
  RENAME COLUMN evaluated_by TO evaluated_user_id;
ALTER TABLE project_overall_evaluations
  ALTER COLUMN evaluated_user_id TYPE VARCHAR(50);

-- 8. enum / ID 系 TEXT カラムを VARCHAR に変換
ALTER TABLE project_overall_evaluations
  ALTER COLUMN evaluation_scope TYPE VARCHAR(20),
  ALTER COLUMN method_id        TYPE VARCHAR(100),
  ALTER COLUMN transition_id    TYPE VARCHAR(100),
  ALTER COLUMN overall_digital  TYPE VARCHAR(10),
  ALTER COLUMN create_user_id   TYPE VARCHAR(50);

-- 9. update_user_id カラム追加
ALTER TABLE project_overall_evaluations
  ADD COLUMN IF NOT EXISTS update_user_id VARCHAR(50);

-- 10. update_at カラム追加（既存レコードは create_at と同値で初期化）
ALTER TABLE project_overall_evaluations
  ADD COLUMN IF NOT EXISTS update_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE project_overall_evaluations
  SET update_at = create_at;

COMMIT;
