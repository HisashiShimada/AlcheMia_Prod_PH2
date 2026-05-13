-- プロジェクト情報取得（排他ロック付き）
-- チェックアウト・チェックイン処理のトランザクション内で使用
-- 使用箇所:
--   - projectRepository.ts - findForUpdate()
-- パラメータ: $1=organizationId, $2=projectId

SELECT
  project_id,
  project_name,
  project_status,
  project_maiml_flg,
  checkout_status,
  owner_user_id
FROM project
WHERE organization_id = $1
  AND project_id = $2
FOR UPDATE
