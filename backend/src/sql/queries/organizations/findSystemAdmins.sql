-- 組織のシステム管理者一覧取得クエリ
-- 指定組織のROLE002（システム管理者）かつアクティブなユーザーを取得
SELECT
  user_id,
  user_name
FROM organization_user
WHERE organization_id = $1
  AND role_cd = 'ROLE002'
  AND is_active = true
ORDER BY user_name ASC
