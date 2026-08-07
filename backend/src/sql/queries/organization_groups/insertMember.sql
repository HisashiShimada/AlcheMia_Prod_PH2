-- organization_group_user メンバー追加クエリ
-- 指定グループにメンバーを1件追加する（重複時はスキップ）
-- DDL: docs/design/db/ddl/organization_group_user.sql
INSERT INTO organization_group_user (organization_id, organization_group_cd, user_id)
VALUES ($1, $2, $3)
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING
