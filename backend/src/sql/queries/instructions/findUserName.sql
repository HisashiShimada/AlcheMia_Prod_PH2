-- ユーザー名の取得（user_authenticationテーブル使用）
-- 使用箇所: instructionRepository.ts - findUserNameFromAuth()
-- パラメータ: $1=userId, $2=organizationId

SELECT user_name
FROM user_authentication
WHERE user_id = $1 
  AND organization_id = $2
