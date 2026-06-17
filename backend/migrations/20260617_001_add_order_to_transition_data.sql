-- ===================================================================
-- マイグレーション: transition_data にトランジション作業順序カラムを追加
-- 対象テーブル: transition_data
-- 作成日: 2026-06-17
-- 概要:
--   ExperimentPlanDialog（Manager画面）でManagerが設定した
--   トランジションの作業順序を保存するためのカラムを追加する。
--   既存のWorker作業記録（status, progress_rate）は変更なし。
-- ===================================================================

-- 1. work_order カラムを追加（Managerが設定した作業順序）
--    既存データへのデフォルト順序付与後に NOT NULL 制約を追加するため、先に nullable で追加
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS work_order INTEGER;

-- 2. is_order_fixed カラムを追加（固定順序フラグ）
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS is_order_fixed BOOLEAN NOT NULL DEFAULT false;

-- 3. コメント追加
COMMENT ON COLUMN transition_data.work_order
  IS 'トランジションの作業順序（1, 2, 3...）NOT NULL。Manager が ExperimentPlanDialog で設定。task_no=0 の行を正として扱う';

COMMENT ON COLUMN transition_data.is_order_fixed
  IS '固定順序フラグ（true: 順序変更不可、デフォルト: false）NOT NULL';

-- 4. 作業順序ソート用インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_work_order
  ON transition_data (organization_id, project_id, method_id, task_no, work_order);

-- 5. 既存データへのデフォルト順序設定
--    work_order が NULL の既存レコードに、transition_id 昇順でデフォルト順序を付与
WITH ordered_transitions AS (
  SELECT
    organization_id,
    project_id,
    method_id,
    task_no,
    transition_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, project_id, method_id, task_no
      ORDER BY transition_id
    ) AS default_order
  FROM transition_data
  WHERE work_order IS NULL
)
UPDATE transition_data td
SET work_order = ot.default_order
FROM ordered_transitions ot
WHERE td.organization_id = ot.organization_id
  AND td.project_id      = ot.project_id
  AND td.method_id       = ot.method_id
  AND td.task_no         = ot.task_no
  AND td.transition_id   = ot.transition_id;

-- 6. work_order に NOT NULL 制約を追加（既存データへのデフォルト順序付与後）
ALTER TABLE transition_data
  ALTER COLUMN work_order SET NOT NULL,
  ALTER COLUMN work_order SET DEFAULT 0;

-- ===================================================================
-- 設計補足:
--
-- task_no = 0 の行が「全体タブ」の順序設定専用レコード。
--   - status / progress_rate は NULL
--   - work_order / is_order_fixed のみを使用
--
-- task_no = 1〜N の行は Worker の作業記録。
--   - status / progress_rate を使用
--   - work_order / is_order_fixed も同値（task_no=0 と揃える）
--
-- ロールバック方法:
--   ALTER TABLE transition_data DROP COLUMN IF EXISTS work_order;
--   ALTER TABLE transition_data DROP COLUMN IF EXISTS is_order_fixed;
--   DROP INDEX IF EXISTS idx_transition_data_work_order;
-- ===================================================================
