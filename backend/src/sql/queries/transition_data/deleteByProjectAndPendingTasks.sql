-- transition_data: 未着手タスク（project_task_detail.task_status=0）のみ削除
-- タスク登録再保存時に実行済み・完了済みタスクのトランジション実績を保護する
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)

DELETE FROM transition_data td
WHERE td.organization_id = $1
  AND td.project_id = $2
  AND EXISTS (
    SELECT 1 FROM project_task_detail ptd
    WHERE ptd.organization_id = td.organization_id
      AND ptd.project_id      = td.project_id
      AND ptd.method_id       = td.method_id
      AND ptd.task_no         = td.task_no
      AND ptd.task_status     = 0
  );
