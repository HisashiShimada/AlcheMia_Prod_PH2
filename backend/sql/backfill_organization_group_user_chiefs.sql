-- =============================================================================
-- バックフィルSQL: organization_group_user への代表者レコード登録
-- =============================================================================
-- 目的:
--   organization_group テーブルに登録済みのグループのうち、
--   代表者（chief_user_id）の organization_group_user レコードが
--   存在しないものを一括 INSERT する。
--
-- ON CONFLICT DO NOTHING のため重複実行しても安全（冪等）。
-- A5:SQL Mk-2 にそのまま貼り付けて実行可能。
-- =============================================================================

-- ① 実行前確認: 未登録の代表者レコード件数
SELECT
  COUNT(*) AS "未登録件数"
FROM organization_group og
WHERE og.chief_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM organization_group_user ogu
    WHERE ogu.organization_id       = og.organization_id
      AND ogu.organization_group_cd = og.organization_group_cd
      AND ogu.user_id               = og.chief_user_id
  );

-- ② INSERT: 代表者が未登録のグループにのみ挿入
INSERT INTO organization_group_user (
  organization_id
  , organization_group_cd
  , user_id
  , create_at
)
SELECT
  og.organization_id
  , og.organization_group_cd
  , og.chief_user_id
  , CURRENT_TIMESTAMP
FROM organization_group og
WHERE og.chief_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM organization_group_user ogu
    WHERE ogu.organization_id       = og.organization_id
      AND ogu.organization_group_cd = og.organization_group_cd
      AND ogu.user_id               = og.chief_user_id
  )
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING;

-- ③ 実行後確認: 挿入結果一覧
SELECT
  og.organization_id         AS "組織ID"
  , og.organization_group_cd   AS "グループCD"
  , og.organization_group_name AS "グループ名"
  , og.chief_user_id           AS "代表者ユーザID"
  , ogu.create_at              AS "登録日時"
FROM organization_group og
INNER JOIN organization_group_user ogu
  ON  ogu.organization_id       = og.organization_id
  AND ogu.organization_group_cd = og.organization_group_cd
  AND ogu.user_id               = og.chief_user_id
ORDER BY og.organization_id, og.organization_group_cd;
