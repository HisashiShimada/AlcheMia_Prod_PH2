-- セッショントークンからユーザー情報を取得するクエリ（PIN再送信用）
-- $1: session_token, $2: organization_id
SELECT
  pc.user_id,
  pc.organization_id,
  ou.user_name,
  ou.mail_address
FROM pin_codes pc
JOIN organization_user ou
  ON pc.user_id = ou.user_id
  AND pc.organization_id = ou.organization_id
WHERE pc.session_token = $1
  AND pc.organization_id = $2
