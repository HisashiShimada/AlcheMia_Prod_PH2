-- ============================================================
-- aggregation_rules テーブル カラム整理マイグレーション
--
-- 変更内容:
--   1. status TEXT(ACTIVE/DEPRECATED) → is_active BOOLEAN
--   2. created_by → create_user_id にリネーム + VARCHAR(50)
--   3. created_at → create_at にリネーム
--   4. update_user_id / update_at カラム追加
--   5. organization_id TEXT → UUID
--   6. enum 系カラム TEXT → VARCHAR
--
-- @date 2026-08-20
-- ============================================================

BEGIN;

-- 1. is_active カラム追加（デフォルト false で追加し後でデータ変換）
ALTER TABLE aggregation_rules
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- 2. 旧 status 値に基づいてデータ変換
UPDATE aggregation_rules
  SET is_active = (status = 'ACTIVE');

-- 3. status カラム削除
ALTER TABLE aggregation_rules
  DROP COLUMN IF EXISTS status;

-- 4. created_by → create_user_id リネーム + VARCHAR(50) に変換
ALTER TABLE aggregation_rules
  RENAME COLUMN created_by TO create_user_id;
ALTER TABLE aggregation_rules
  ALTER COLUMN create_user_id TYPE VARCHAR(50);

-- 5. created_at → create_at リネーム
ALTER TABLE aggregation_rules
  RENAME COLUMN created_at TO create_at;

-- 6. update_user_id カラム追加
ALTER TABLE aggregation_rules
  ADD COLUMN IF NOT EXISTS update_user_id VARCHAR(50);

-- 7. update_at カラム追加（既存レコードは create_at と同値で初期化）
ALTER TABLE aggregation_rules
  ADD COLUMN IF NOT EXISTS update_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE aggregation_rules
  SET update_at = create_at;

-- 8. organization_id TEXT → UUID に変換
ALTER TABLE aggregation_rules
  ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;

-- 9. enum 系 TEXT カラムを VARCHAR に変換
ALTER TABLE aggregation_rules
  ALTER COLUMN target_rollup       TYPE VARCHAR(20),
  ALTER COLUMN level_status_rule   TYPE VARCHAR(20),
  ALTER COLUMN level_score_rule    TYPE VARCHAR(20),
  ALTER COLUMN missing_handling    TYPE VARCHAR(30),
  ALTER COLUMN transition_hierarchy TYPE VARCHAR(20);

-- 10. is_active の DEFAULT を true に変更（既存データ変換後）
ALTER TABLE aggregation_rules
  ALTER COLUMN is_active SET DEFAULT true;

COMMIT;
