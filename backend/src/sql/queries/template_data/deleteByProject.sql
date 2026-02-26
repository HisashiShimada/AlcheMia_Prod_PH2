-- テンプレート実績 プロジェクト単位削除
-- タスク登録再保存時に既存レコードを全削除する
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)

DELETE FROM template_data
WHERE organization_id = $1
  AND project_id = $2
