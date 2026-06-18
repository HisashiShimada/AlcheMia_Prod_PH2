-- =============================================================
-- マイグレーション: transition_data に prerequisite_transition_ids を追加
-- 作成日: 2026-06-18
-- 目的: トランジションの依存関係（前提条件）を表現するためのカラム追加
--
-- 背景:
--   従来の is_order_fixed（固定順序フラグ）は「自分より前の order を持つ
--   全トランジションが完了しないと開始不可」という単純な直列のみ表現できた。
--   並列分岐→合流（例: TR_1/TR_2 並列 + TR_3/TR_4 並列 → TR_5 に合流）は
--   is_order_fixed + order だけでは表現できないため、明示的な依存関係 ID 配列
--   (prerequisite_transition_ids) を追加する。
--
-- 新しい設計:
--   - order: 表示順序・推奨実行順序（画面上の並び順）
--   - prerequisite_transition_ids: 前提となるトランジションIDの配列
--       空配列 = 依存なし（いつでも開始可能）
--       非空配列 = 配列内の全トランジションが completed になるまで開始不可
-- =============================================================

ALTER TABLE transition_data
ADD COLUMN IF NOT EXISTS prerequisite_transition_ids TEXT[] DEFAULT '{}' NOT NULL;

COMMENT ON COLUMN transition_data.prerequisite_transition_ids IS
'前提となるトランジションIDの配列。これらが全て completed になるまでこのトランジションは開始不可。空配列の場合は依存なし（いつでも開始可能）。';
