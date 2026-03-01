-- 会社名で会社を検索（アクティブのみ）
SELECT corporation_id
FROM corporation
WHERE corporation_name = $1
  AND is_active = true
