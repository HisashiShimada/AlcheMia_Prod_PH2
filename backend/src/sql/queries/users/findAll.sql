-- ユーザー一覧取得クエリ（ベースクエリ）
-- organization_userテーブルをdepartment/role/login_historyとJOINして取得
-- 動的フィルタはRepository層でWHERE句に追加する
SELECT
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.department_cd,
  d.department_name,
  ou.role_cd,
  r.role_name,
  ou.is_active,
  last_login.last_login_at,
  ou.create_at,
  ou.update_at
FROM organization_user ou
LEFT JOIN department d
  ON ou.organization_id = d.organization_id
  AND ou.department_cd = d.department_cd
LEFT JOIN role r
  ON ou.organization_id = r.organization_id
  AND ou.role_cd = r.role_cd
LEFT JOIN user_authentication ua
  ON ou.user_id = ua.user_id
  AND ou.organization_id = ua.organization_id
LEFT JOIN (
  SELECT
    lh.organization_id,
    lh.user_name,
    MAX(lh.login_at) AS last_login_at
  FROM login_history lh
  WHERE lh.login_sf = true
  GROUP BY lh.organization_id, lh.user_name
) last_login
  ON ou.organization_id = last_login.organization_id
  AND ou.user_name = last_login.user_name
WHERE ou.organization_id = $1
ORDER BY ou.user_id ASC
