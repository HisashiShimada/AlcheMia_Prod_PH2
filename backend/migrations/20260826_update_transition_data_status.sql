-- ===================================================================
-- マイグレーション: transition_data.status を 0始まりから 1始まりに変更
-- 対象テーブル: transition_data
-- 作成日: 2026-08-26
-- 背景:
--   TransitionStatusEnum の数値体系を 0〜6 から 1〜7 に変更するため、
--   既存の status 値を全件 +1 する。
--
--   旧値 → 新値（対応ENUM）
--     0 → 1 (INITIAL)
--     1 → 2 (PREPARING)
--     2 → 3 (READY)
--     3 → 4 (IN_PROGRESS)
--     4 → 5 (PAUSED)
--     5 → 6 (COMPLETED)
--     6 → 7 (ERROR)
-- ===================================================================

-- task_no > 0 の実績行のみ対象（task_no = 0 は順序管理行で status = NULL）
UPDATE transition_data
SET status = status + 1
WHERE task_no > 0
  AND status IS NOT NULL;

-- ===================================================================
-- ロールバック方法:
--   UPDATE transition_data
--   SET status = status - 1
--   WHERE task_no > 0
--     AND status IS NOT NULL;
-- ===================================================================
