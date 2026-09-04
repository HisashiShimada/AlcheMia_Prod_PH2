-- intuition_selector.is_default カラム削除マイグレーション
--
-- 背景: 定性評価においてデフォルト選択肢という概念は不要であることが判明したため、
--       is_default カラムおよびその関連インデックスを削除する。
--
-- 実行日: 2026-09-02
-- タスク: 20260902_1000_定性評価デフォルト削除と訂正バリデーション

-- デフォルト選択肢検索用インデックスを削除
DROP INDEX IF EXISTS idx_intuition_selector_default;

-- is_default カラムを削除
ALTER TABLE intuition_selector DROP COLUMN IF EXISTS is_default;
