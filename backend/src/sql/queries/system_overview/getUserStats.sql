-- システム概要: ユーザー統計取得
-- organization_userテーブルのorganization_idに紐づく総数・アクティブ数を取得
SELECT
  COUNT(*)::INTEGER AS total,
  COUNT(*) FILTER (WHERE is_active = TRUE)::INTEGER AS active
FROM organization_user
WHERE organization_id = $1
