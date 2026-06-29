-- =============================================================
-- マイグレーション: code_master に TaskStatus 05（NG）を追加
-- 作成日: 2026-06-18
-- 目的: 実験計画レビュー機能で使用するNGステータスを追加する
--
-- 背景:
--   実験指示レビュー機能の実装に伴い、Manager がレビューでNGを記録できる
--   ステータスが必要になった。承認時は既存の 03（completed）を使用する。
--
-- 既存の task_status コード体系:
--   00: pending         実行待ち
--   01: inProgress      実行中
--   02: reviewPending   レビュー待ち（承認依頼後）
--   03: completed       完了（承認時もこちらを使用）
--   04: failed          異常終了（強制終了）
--   ↓ 今回追加
--   05: reviewNg        NG（再作業）
--
-- ステータス遷移（レビュー関連）:
--   02（レビュー待ち） → 03（完了 = 承認）
--   02（レビュー待ち） → 05（NG → 01 実行中に戻る）
-- =============================================================

BEGIN;

-- TaskStatus 05: NG（再作業）
INSERT INTO code_master (code_division, code_value, code_name, code_remark, code_description, sort_order, is_active)
VALUES (
  'task_status',
  '05',
  'reviewNg',
  'NG（再作業）',
  'タスクの進捗ステータス',
  5,
  true
)
ON CONFLICT (code_division, code_value) DO UPDATE SET
  code_name        = EXCLUDED.code_name,
  code_remark      = EXCLUDED.code_remark,
  code_description = EXCLUDED.code_description,
  sort_order       = EXCLUDED.sort_order,
  is_active        = EXCLUDED.is_active,
  update_at        = NOW();

COMMIT;

-- =============================================================
-- ロールバック:
--   DELETE FROM code_master
--   WHERE code_division = 'task_status'
--     AND code_value = '05';
-- =============================================================
