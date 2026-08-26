-- =============================================================================
-- バックフィル: namespace テーブルに個人URIが未登録のユーザーを補完する
-- （A5SQL 実行用: CTE + INSERT 形式）
-- =============================================================================
-- 背景:
--   ユーザー作成時に namespace テーブルへの個人URI登録が実装されたが、
--   それ以前に登録されたユーザーには namespace レコードが存在しない。
--   本マイグレーションでそれらのユーザーに個人URIを補完する。
--
-- URI形式: https://{organization_cd}.Alchemia.co.jp/{loginName}
--   loginName = メールアドレスの @ より前の部分
--
-- 冪等性: ON CONFLICT DO NOTHING により再実行しても重複しない
--
-- 実行手順:
--   1. 下記の「事前確認 SELECT」で対象件数を確認する
--   2. 「INSERT 本体」を実行する
--   3. 下記の「事後確認 SELECT」で登録結果を確認する
-- =============================================================================


-- =====================================================
-- 【事前確認】バックフィル対象ユーザーを確認する SELECT
-- =====================================================
SELECT
  ou.organization_id,
  o.organization_cd,
  ou.user_id,
  SPLIT_PART(ou.user_id, '@', 1)                          AS login_name,
  'https://' || o.organization_cd || '.Alchemia.co.jp/'
    || SPLIT_PART(ou.user_id, '@', 1)                     AS candidate_uri
FROM organization_user ou
JOIN organization o
  ON o.organization_id = ou.organization_id
WHERE NOT EXISTS (
  SELECT 1
  FROM namespace ns
  WHERE ns.organization_id = ou.organization_id
    AND ns.scope_key       = ou.user_id
)
ORDER BY ou.organization_id, ou.user_id;


-- =====================================================
-- 【INSERT 本体】バックフィル実行
-- =====================================================
-- 処理の流れ:
--   step1: namespace 未登録ユーザーと候補 URI を生成
--   step2: 候補 URI が既存 namespace に存在する場合は連番（1,2,...）を付与して一意化
--          ※ 既存 URI との重複 AND バックフィル対象内での同 URI 重複の両方を考慮
--   step3: 組織内の既存 namespace_id 最大連番 + バックフィル内行番号 で namespace_id を採番
-- =====================================================
WITH step1 AS (
  -- namespace 未登録ユーザーと候補 URI を一覧化
  SELECT
    ou.organization_id,
    ou.user_id,
    o.organization_cd,
    SPLIT_PART(ou.user_id, '@', 1)                        AS login_name,
    'https://' || o.organization_cd || '.Alchemia.co.jp/'
      || SPLIT_PART(ou.user_id, '@', 1)                   AS candidate_uri
  FROM organization_user ou
  JOIN organization o
    ON o.organization_id = ou.organization_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM namespace ns
    WHERE ns.organization_id = ou.organization_id
      AND ns.scope_key       = ou.user_id
  )
),
step2 AS (
  -- URI 重複を解決する
  -- 同一組織内で同じ candidate_uri が複数ある場合、2件目以降に連番を付与
  -- また既存 namespace テーブルに同 URI が存在する場合も連番を付与
  SELECT
    s.organization_id,
    s.user_id,
    s.candidate_uri,
    -- 同一組織・同一 candidate_uri 内での行番号（1 始まり）
    ROW_NUMBER() OVER (
      PARTITION BY s.organization_id, s.candidate_uri
      ORDER BY s.user_id
    ) AS uri_rank,
    -- 既存 namespace テーブルにその candidate_uri が存在するか
    EXISTS (
      SELECT 1
      FROM namespace ex
      WHERE ex.organization_id = s.organization_id
        AND ex.uri             = s.candidate_uri
    ) AS uri_exists_in_ns
  FROM step1 s
),
step3 AS (
  -- 最終 URI を確定する
  -- uri_rank=1 かつ既存衝突なし → そのまま使用
  -- uri_rank=1 かつ既存衝突あり → candidate_uri || '1'
  -- uri_rank=2 以上              → candidate_uri || uri_rank  （1始まりに揃えるため uri_rank-1 を加算）
  SELECT
    organization_id,
    user_id,
    CASE
      WHEN uri_rank = 1 AND NOT uri_exists_in_ns
        THEN candidate_uri
      WHEN uri_rank = 1 AND uri_exists_in_ns
        THEN candidate_uri || '1'
      ELSE
        candidate_uri || CAST(uri_rank AS TEXT)
    END AS final_uri
  FROM step2
),
step4 AS (
  -- namespace_id を採番する（NS0001 形式）
  -- 組織内の既存最大連番 + バックフィル対象内での行番号
  SELECT
    s3.organization_id,
    s3.user_id,
    s3.final_uri,
    'NS' || LPAD(
      CAST(
        COALESCE(
          (
            SELECT MAX(CAST(SUBSTRING(namespace_id FROM 3) AS INTEGER))
            FROM namespace n2
            WHERE n2.organization_id = s3.organization_id
              AND n2.namespace_id ~ '^NS[0-9]+$'
          ),
          0
        )
        + ROW_NUMBER() OVER (
            PARTITION BY s3.organization_id
            ORDER BY s3.user_id
          )
      AS TEXT),
    4, '0') AS namespace_id
  FROM step3 s3
)
INSERT INTO namespace (
  organization_id
  , namespace_id
  , uri
  , scope_key
  , create_user_id
  , create_at
  , update_user_id
  , update_at
)
SELECT
  organization_id
  , namespace_id
  , final_uri
  , user_id          -- scope_key = user_id（個人名前空間）
  , user_id          -- create_user_id
  , CURRENT_TIMESTAMP
  , user_id          -- update_user_id
  , CURRENT_TIMESTAMP
FROM step4
ON CONFLICT DO NOTHING;


-- =====================================================
-- 【事後確認】登録結果を確認する SELECT
-- =====================================================
SELECT
  ns.organization_id,
  o.organization_cd,
  ns.scope_key   AS user_id,
  ns.namespace_id,
  ns.uri,
  ns.create_at
FROM namespace ns
JOIN organization o
  ON o.organization_id = ns.organization_id
WHERE ns.scope_key IS NOT NULL
  AND ns.scope_key LIKE '%@%'   -- ユーザーID（メールアドレス形式）のレコードに絞る
ORDER BY ns.organization_id, ns.scope_key;

