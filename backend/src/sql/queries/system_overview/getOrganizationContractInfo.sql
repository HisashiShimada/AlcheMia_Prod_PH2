-- 組織の契約情報を取得
-- organizationテーブルの契約ユーザー数・契約容量・契約プロジェクト数
SELECT
  contract_users,
  contract_capacity,
  contract_projects
FROM organization
WHERE organization_id = $1
