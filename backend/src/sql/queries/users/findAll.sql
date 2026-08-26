-- ユーザー一覧取得クエリ（ベースクエリ）
-- organization_userテーブルをrole/login_history/namespaceとJOINして取得
-- 動的フィルタはRepository層でWHERE句に追加する
SELECT
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.role_cd,
  r.role_name,
  ou.is_active,
  last_login.last_login_at,
  ou.create_at,
  ou.update_at,
  ARRAY(
    SELECT ogu.organization_group_cd
    FROM organization_group_user ogu
    WHERE ogu.organization_id = ou.organization_id
      AND ogu.user_id = ou.user_id
    ORDER BY ogu.organization_group_cd
  ) AS organization_group_cds,
  ns.uri AS namespace_uri
FROM organization_user ou
LEFT JOIN role r
  ON ou.organization_id = r.organization_id
  AND ou.role_cd = r.role_cd
LEFT JOIN user_authentication ua
  ON ou.user_id = ua.user_id
  AND ou.organization_id = ua.organization_id
LEFT JOIN (
  SELECT
    lh.organization_id,
    lh.user_id,
    MAX(lh.login_at) AS last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true
  GROUP BY lh.organization_id, lh.user_id
) last_login
  ON ou.organization_id = last_login.organization_id
  AND ou.user_id = last_login.user_id
LEFT JOIN namespace ns
  ON ns.organization_id = ou.organization_id
  AND ns.scope_key = ou.user_id
WHERE ou.organization_id = $1
ORDER BY ou.user_id ASC
