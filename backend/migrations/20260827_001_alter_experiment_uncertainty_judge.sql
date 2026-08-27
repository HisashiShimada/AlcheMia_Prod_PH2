-- =============================================================
-- マイグレーション: experiment_uncertainty_judge テーブル変更
-- 作成日: 2026-08-27
-- 目的:
--   1. 主キーを id (BIGSERIAL) から judge_seq (SERIAL) に変更
--   2. update_user_id カラムを追加
--   3. update_at カラムを追加
-- =============================================================

-- 1. 既存の主キー制約を削除
ALTER TABLE experiment_uncertainty_judge
  DROP CONSTRAINT IF EXISTS experiment_uncertainty_judge_PKC;

-- 2. 旧 id カラムを削除
ALTER TABLE experiment_uncertainty_judge
  DROP COLUMN IF EXISTS id;

-- 3. judge_seq (SERIAL) カラムを追加して主キーに設定
ALTER TABLE experiment_uncertainty_judge
  ADD COLUMN judge_seq SERIAL NOT NULL;

ALTER TABLE experiment_uncertainty_judge
  ADD CONSTRAINT experiment_uncertainty_judge_PKC
    PRIMARY KEY (organization_id, project_id, judge_seq);

-- 4. update_user_id カラムを追加
ALTER TABLE experiment_uncertainty_judge
  ADD COLUMN IF NOT EXISTS update_user_id CHARACTER VARYING(50);

-- 5. update_at カラムを追加
ALTER TABLE experiment_uncertainty_judge
  ADD COLUMN IF NOT EXISTS update_at CHARACTER VARYING(50);

-- 6. コメント追加
COMMENT ON COLUMN experiment_uncertainty_judge.judge_seq    IS '判定連番';
COMMENT ON COLUMN experiment_uncertainty_judge.update_user_id IS '更新ユーザID';
COMMENT ON COLUMN experiment_uncertainty_judge.update_at    IS '更新日時';

-- =============================================================
-- ロールバック:
--   ALTER TABLE experiment_uncertainty_judge DROP COLUMN IF EXISTS update_at;
--   ALTER TABLE experiment_uncertainty_judge DROP COLUMN IF EXISTS update_user_id;
--   ALTER TABLE experiment_uncertainty_judge DROP CONSTRAINT IF EXISTS experiment_uncertainty_judge_PKC;
--   ALTER TABLE experiment_uncertainty_judge DROP COLUMN IF EXISTS judge_seq;
--   ALTER TABLE experiment_uncertainty_judge ADD COLUMN id BIGSERIAL NOT NULL;
--   ALTER TABLE experiment_uncertainty_judge ADD CONSTRAINT experiment_uncertainty_judge_PKC PRIMARY KEY (organization_id, project_id, id);
-- =============================================================
