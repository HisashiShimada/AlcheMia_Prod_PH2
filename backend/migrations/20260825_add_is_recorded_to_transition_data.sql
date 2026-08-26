-- migration: transition_data テーブルに is_recorded カラムを追加
-- 2026-08-25
-- 記録済みフラグ（TRUE=記録済み、FALSE=未記録）

ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS is_recorded BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN transition_data.is_recorded IS '記録済みフラグ（TRUE=記録済み、FALSE=未記録）';
