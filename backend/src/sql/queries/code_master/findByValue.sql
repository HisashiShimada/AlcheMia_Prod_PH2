-- code_master 特定コード値取得クエリ
-- 組織ID・コード区分・コード値でフィルタリングして1件取得
SELECT
  organization_id,
  code_division,
  code_value,
  code_name,
  code_description,
  code_remark,
  create_user_id,
  update_user_id,
  create_at,
  update_at
FROM code_master
WHERE organization_id = $1
  AND code_division = $2
  AND code_value = $3
