-- ==============================================================
-- テスト用データ投入SQL
-- namespace宣言生成処理の動作確認用
--
-- 対象ユーザー : exp.admin@example.com
-- 組織ID      : a0718dc5-21f3-44e6-87e9-cc2ae83f3385
-- 組織CD      : ORG001-AIML
--
-- 検証ケース:
--   Case1: 個人スコープとグループスコープで同一prefix → 個人優先
--   Case2: 上位グループと下位グループで同一prefix    → 下位グループ（対象グループ）優先
--   Case3: 上位グループのみに存在するprefix          → 宣言に含まれること
--
-- グループ構成（2階層）:
--   TEST_GRP_PARENT（上位）
--     └─ TEST_GRP_CHILD（下位・対象プロジェクトのグループ）
--
-- URI仕様: https://{組織CD}.Alchemia.co.jp/{グループCD}/{グループCD}/...
--   上位グループ: https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT
--   下位グループ: https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT/TEST_GRP_CHILD
--   個人スコープ: https://ORG001-AIML.Alchemia.co.jp/exp.admin
--                 ※ exp.admin@example.com のログイン名部分
-- ==============================================================


-- ① 組織階層グループ登録
-- 上位グループ（ルートグループ）
INSERT INTO organization_group (
  organization_id
  , organization_group_cd
  , organization_group_name
  , chief_user_id
  , parent_group_cd
  , layer
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_GRP_PARENT'
  , 'テスト上位グループ'
  , 'exp.admin@example.com'
  , NULL
  , NULL
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, organization_group_cd) DO NOTHING;

-- 下位グループ（プロジェクトが属するグループ）
INSERT INTO organization_group (
  organization_id
  , organization_group_cd
  , organization_group_name
  , chief_user_id
  , parent_group_cd
  , layer
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_GRP_CHILD'
  , 'テスト下位グループ'
  , 'exp.admin@example.com'
  , 'TEST_GRP_PARENT'
  , NULL
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, organization_group_cd) DO NOTHING;


-- ② namespace登録（scope_key = organization_group_cd）
-- 上位グループのnamespace
INSERT INTO namespace (
  organization_id
  , namespace_id
  , scope_key
  , uri
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_NS_PARENT'
  , 'TEST_GRP_PARENT'
  , 'https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT'
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id) DO NOTHING;

-- 下位グループのnamespace
INSERT INTO namespace (
  organization_id
  , namespace_id
  , scope_key
  , uri
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_NS_CHILD'
  , 'TEST_GRP_CHILD'
  , 'https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT/TEST_GRP_CHILD'
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id) DO NOTHING;

-- ③ prefix登録

-- ---------------------------------------------------------------
-- Case1検証: 個人スコープ・下位グループ両方に「testShared」を登録
--            → 宣言時は個人スコープのURIが優先される
-- ---------------------------------------------------------------

-- 個人スコープの「testShared」
INSERT INTO prefix (
  organization_id, namespace_id, prefix, description
  , is_active, create_user_id, create_at, update_user_id, update_at
)
SELECT
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , namespace_id
  , 'testShared'
  , 'Case1: 個人スコープとグループで重複するprefix（個人スコープ側）URI=https://ORG001-AIML.Alchemia.co.jp/exp.admin'
  , TRUE
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
FROM namespace
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND scope_key = 'exp.admin@example.com'
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING;

-- 下位グループの「testShared」
INSERT INTO prefix (
  organization_id, namespace_id, prefix, description
  , is_active, create_user_id, create_at, update_user_id, update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_NS_CHILD'
  , 'testShared'
  , 'Case1: 個人スコープとグループで重複するprefix（下位グループ側）URI=https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT/TEST_GRP_CHILD'
  , TRUE
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING;

-- ---------------------------------------------------------------
-- Case2検証: 上位・下位グループ両方に「testDup」を登録
--            → 宣言時は下位グループ（対象グループ, depth=0）のURIが優先される
-- ---------------------------------------------------------------

-- 上位グループの「testDup」
INSERT INTO prefix (
  organization_id, namespace_id, prefix, description
  , is_active, create_user_id, create_at, update_user_id, update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_NS_PARENT'
  , 'testDup'
  , 'Case2: 上位・下位グループで重複するprefix（上位グループ側）URI=https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT'
  , TRUE
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING;

-- 下位グループの「testDup」
INSERT INTO prefix (
  organization_id, namespace_id, prefix, description
  , is_active, create_user_id, create_at, update_user_id, update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_NS_CHILD'
  , 'testDup'
  , 'Case2: 上位・下位グループで重複するprefix（下位グループ側）URI=https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT/TEST_GRP_CHILD'
  , TRUE
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING;

-- ---------------------------------------------------------------
-- Case3検証: 上位グループのみに「testParentOnly」を登録
--            → 下位グループが対象でも宣言に含まれること
-- ---------------------------------------------------------------

INSERT INTO prefix (
  organization_id, namespace_id, prefix, description
  , is_active, create_user_id, create_at, update_user_id, update_at
) VALUES (
  'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  , 'TEST_NS_PARENT'
  , 'testParentOnly'
  , 'Case3: 上位グループのみに存在するprefix URI=https://ORG001-AIML.Alchemia.co.jp/TEST_GRP_PARENT'
  , TRUE
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
  , 'exp.admin@example.com'
  , CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING;


-- ④ 登録内容確認クエリ（実行後にデータが正しく登録されているか確認する）

SELECT
  og.organization_group_cd
  , og.organization_group_name
  , og.parent_group_cd
  , n.namespace_id
  , n.uri
  , p.prefix
  , p.description
  , p.is_active
FROM organization_group og
INNER JOIN namespace n
  ON n.organization_id = og.organization_id
  AND n.scope_key = og.organization_group_cd
INNER JOIN prefix p
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
WHERE og.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND og.organization_group_cd IN ('TEST_GRP_PARENT', 'TEST_GRP_CHILD')
ORDER BY og.organization_group_cd, p.prefix;


-- ⑤ organization_group_user登録
-- exp.admin@example.com を上位・下位両グループに所属させる
INSERT INTO organization_group_user (
  organization_id
  , organization_group_cd
  , user_id
  , create_user_id
  , create_at
) VALUES
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'TEST_GRP_PARENT'
    , 'exp.admin@example.com'
    , 'exp.admin@example.com'
    , CURRENT_TIMESTAMP
  )
  , (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'TEST_GRP_CHILD'
    , 'exp.admin@example.com'
    , 'exp.admin@example.com'
    , CURRENT_TIMESTAMP
  )
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING;
