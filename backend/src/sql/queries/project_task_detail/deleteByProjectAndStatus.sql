-- project_task_detailテーブルから特定ステータスのレコードを削除
-- タスク登録保存時に task_status=0（未着手）のレコードのみを削除する際に使用
--
-- パラメータ:
--   $1: organization_id (UUID)
--   $2: project_id (VARCHAR)
--   $3: task_status (INTEGER) - 削除対象のステータス（通常は0=未着手）
DELETE FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
  AND task_status = $3;
