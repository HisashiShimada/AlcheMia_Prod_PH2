-- organization_group_user メンバー一覧取得クエリ
-- 指定グループに所属するメンバー情報を取得（organization_user と JOIN）
-- DDL: docs/design/db/ddl/organization_group_user.sql
SELECT
  ogu.user_id
  , ou.user_name
  , ou.email
FROM organization_group_user ogu
INNER JOIN organization_user ou
  ON ogu.organization_id = ou.organization_id
  AND ogu.user_id = ou.user_id
WHERE ogu.organization_id = $1
  AND ogu.organization_group_cd = $2
ORDER BY ou.user_name ASC
