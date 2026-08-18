-- ===================================================================
-- マイグレーション: transition_data にカラムを追加（統合版）
-- 対象テーブル: transition_data
-- 作成日: 2026-06-17
-- 更新日: 2026-06-26（002 を統合、is_order_fixed を不要として除外）
--
-- 追加カラム:
--   work_order                  … Managerが設定した作業順序（INTEGER NOT NULL）
--   prerequisite_transition_ids … 前提トランジションIDの配列（TEXT[] DEFAULT '{}'）
--
-- ※ このファイルは以下の2ファイルを統合したものです（削除済み）:
--     20260617_001_add_order_to_transition_data.sql
--     20260618_002_add_prerequisite_to_transition_data.sql
-- ===================================================================

-- 1. work_order カラムを追加
--    既存データへのデフォルト順序付与後に NOT NULL 制約を追加するため、先に nullable で追加
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS work_order INTEGER;

-- 2. prerequisite_transition_ids カラムを追加
--    前提となるトランジションIDの配列。空配列 = 依存なし（いつでも開始可能）
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS prerequisite_transition_ids TEXT[] NOT NULL DEFAULT '{}';

-- 3. 既存データへのデフォルト順序設定
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

-- 4. work_order に NOT NULL 制約を追加（既存データへのデフォルト順序付与後）
ALTER TABLE transition_data
  ALTER COLUMN work_order SET NOT NULL,
  ALTER COLUMN work_order SET DEFAULT 0;

-- 5. コメント追加
COMMENT ON COLUMN transition_data.work_order IS
  'トランジションの作業順序（1,2,3...）NOT NULL。Manager が ExperimentPlanDialog で設定。task_no=0 の行を正として扱う';

COMMENT ON COLUMN transition_data.prerequisite_transition_ids IS
  '前提となるトランジションIDの配列。これらが全て completed になるまでこのトランジションは開始不可。空配列の場合は依存なし（いつでも開始可能）。';

-- 6. 作業順序ソート用インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_work_order
  ON transition_data (organization_id, project_id, method_id, task_no, work_order);

-- ===================================================================
-- ロールバック方法:
--   ALTER TABLE transition_data DROP COLUMN IF EXISTS work_order;
--   ALTER TABLE transition_data DROP COLUMN IF EXISTS prerequisite_transition_ids;
--   DROP INDEX IF EXISTS idx_transition_data_work_order;
-- ===================================================================
