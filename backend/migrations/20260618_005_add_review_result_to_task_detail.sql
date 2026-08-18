-- =============================================================
-- マイグレーション: project_task_detail に review_result を追加
-- 作成日: 2026-06-18
-- 目的: NG記録時のNG理由・指摘内容を保存するカラムを追加
--
-- 背景:
--   承認/NGのステータス（task_status）は既存カラムで管理しているが、
--   NG時の具体的な理由・指摘内容を保存するカラムがなかった。
--   Managerが「NG理由」を記録し、Workerが再実施時に参照できるようにする。
-- =============================================================

ALTER TABLE project_task_detail
ADD COLUMN IF NOT EXISTS review_result TEXT DEFAULT NULL;

COMMENT ON COLUMN project_task_detail.review_result IS
'NG時のレビュー結果（NG理由・指摘内容）。承認時はNULL。';
