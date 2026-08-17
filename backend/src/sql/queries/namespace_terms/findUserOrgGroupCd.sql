-- ユーザーの所属組織グループCD（scopeKey）を取得
-- 複数所属がある場合は作成日時の最も古い1件を返す
-- 未所属の場合は0件を返す（oneOrNone で null になる）
SELECT organization_group_cd
FROM organization_group_user
WHERE organization_id = $1
  AND user_id = $2
ORDER BY create_at ASC
LIMIT 1
