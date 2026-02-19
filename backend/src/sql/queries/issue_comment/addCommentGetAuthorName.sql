-- コメント追加：投稿者名の取得
-- POST /api/v1/issues/comments で使用（トランザクション内）
SELECT user_name
FROM organization_user
WHERE organization_id = $1 AND user_id = $2
