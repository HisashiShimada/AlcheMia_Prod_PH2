-- project_task_detailテーブルからプロジェクト単位で削除
-- タスク登録保存時に既存レコードをクリアする際に使用
DELETE FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
