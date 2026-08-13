-- organization_group_user メンバー全削除クエリ
-- 指定グループに所属するメンバーをすべて削除する
-- DDL: docs/design/db/ddl/organization_group_user.sql
DELETE FROM organization_group_user
WHERE organization_id = $1
  AND organization_group_cd = $2
