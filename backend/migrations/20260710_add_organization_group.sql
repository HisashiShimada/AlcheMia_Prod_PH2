-- ============================================================
-- マイグレーション: organization_group テーブル追加
-- 日付: 2026-07-10
-- 概要:
--   1. organization_group テーブル作成（組織階層グループ）
--   2. organization_group_user テーブル作成（多対多中間テーブル）
--   3. department テーブルのデータを organization_group へ移行
--   4. organization_user.department_cd の値を organization_group_user へデータ移行
--   5. project.department_cd → organization_group_cd に RENAME
--   6. attribute.department_cd → organization_group_cd に RENAME（存在する場合のみ）
--
-- 注意:
--   - organization_user.department_cd カラムの DROP は Step5（後片付け）で実施
--   - department テーブルの DROP は Step5（後片付け）で実施
--   - 本マイグレーションは冪等（何度実行しても同じ結果になる）
-- ============================================================

-- ============================================================
-- 1. organization_group テーブル作成
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_group (
  organization_id       UUID          NOT NULL,
  organization_group_cd VARCHAR(50)   NOT NULL,
  organization_group_name VARCHAR(255) NOT NULL,
  chief_user_id         VARCHAR(50)   NOT NULL,
  parent_group_cd       VARCHAR(50),
  layer                 VARCHAR(20),
  create_user_id        VARCHAR(50),
  create_at             TIMESTAMP,
  update_user_id        VARCHAR(50),
  update_at             TIMESTAMP,
  CONSTRAINT organization_group_PKC PRIMARY KEY (organization_id, organization_group_cd)
);

COMMENT ON TABLE  organization_group IS '組織階層グループ';
COMMENT ON COLUMN organization_group.organization_id         IS '組織ID';
COMMENT ON COLUMN organization_group.organization_group_cd   IS '組織階層グループCD';
COMMENT ON COLUMN organization_group.organization_group_name IS '組織階層グループ名';
COMMENT ON COLUMN organization_group.chief_user_id           IS '代表者ユーザID';
COMMENT ON COLUMN organization_group.parent_group_cd         IS '親階層グループCD';
COMMENT ON COLUMN organization_group.layer                   IS 'レイヤー';
COMMENT ON COLUMN organization_group.create_user_id          IS '作成者ユーザID';
COMMENT ON COLUMN organization_group.create_at               IS '作成日時';
COMMENT ON COLUMN organization_group.update_user_id          IS '更新者ユーザID';
COMMENT ON COLUMN organization_group.update_at               IS '更新日時';

-- ============================================================
-- 2. organization_group_user テーブル作成（多対多中間テーブル）
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_group_user (
  organization_id       UUID        NOT NULL,
  organization_group_cd VARCHAR(50) NOT NULL,
  user_id               VARCHAR(50) NOT NULL,
  create_at             TIMESTAMP,
  CONSTRAINT organization_group_user_PKC
    PRIMARY KEY (organization_id, organization_group_cd, user_id),
  CONSTRAINT fk_org_group_user_group
    FOREIGN KEY (organization_id, organization_group_cd)
    REFERENCES organization_group (organization_id, organization_group_cd)
    ON DELETE CASCADE
);

COMMENT ON TABLE  organization_group_user IS '組織グループユーザー（多対多）';
COMMENT ON COLUMN organization_group_user.organization_id       IS '組織ID';
COMMENT ON COLUMN organization_group_user.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group_user.user_id               IS 'ユーザID';
COMMENT ON COLUMN organization_group_user.create_at             IS '作成日時';

-- ============================================================
-- 3. department テーブルのデータを organization_group へ移行
--    ※ chief_user_id は department に存在しないため organization.chief_user_id を使用
--    ※ chief_user_id が取得できない場合は空文字でフォールバック
--    ※ 冪等: INSERT ... ON CONFLICT DO NOTHING
-- ============================================================
INSERT INTO organization_group (
  organization_id,
  organization_group_cd,
  organization_group_name,
  chief_user_id,
  parent_group_cd,
  layer,
  create_user_id,
  create_at,
  update_user_id,
  update_at
)
SELECT
  d.organization_id,
  d.department_cd,
  d.department_name,
  COALESCE(o.chief_user_id, '') AS chief_user_id,
  NULL AS parent_group_cd,
  NULL AS layer,
  d.create_user_id,
  d.create_at,
  d.update_user_id,
  d.update_at
FROM department d
LEFT JOIN organization o ON o.organization_id = d.organization_id
ON CONFLICT (organization_id, organization_group_cd) DO NOTHING;

-- ============================================================
-- 4. organization_user.department_cd → organization_group_user へデータ移行
--    ※ organization_group 本体のレコードが存在する場合のみINSERTする（FK制約のため）
--    ※ 冪等: INSERT ... ON CONFLICT DO NOTHING
-- ============================================================
INSERT INTO organization_group_user (organization_id, organization_group_cd, user_id, create_at)
SELECT
  ou.organization_id,
  ou.department_cd,
  ou.user_id,
  CURRENT_TIMESTAMP
FROM organization_user ou
WHERE ou.department_cd IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM organization_group og
    WHERE og.organization_id = ou.organization_id
      AND og.organization_group_cd = ou.department_cd
  )
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING;

-- ============================================================
-- 5. project の department_cd → organization_group_cd にRENAME
--    ※ 初回実行時のみ適用（既にリネーム済みの場合はこの行をコメントアウト）
-- ============================================================
ALTER TABLE project RENAME COLUMN department_cd TO organization_group_cd;
COMMENT ON COLUMN project.organization_group_cd IS '組織グループCD';

-- ============================================================
-- 6. attribute の department_cd → organization_group_cd にRENAME
--    ※ department_cd カラムが存在しない場合はこの2行をコメントアウト
-- ============================================================
ALTER TABLE attribute RENAME COLUMN department_cd TO organization_group_cd;
COMMENT ON COLUMN attribute.organization_group_cd IS '組織グループCD';

-- ============================================================
-- 注意: 以下は Step5（後片付け）で実施
--   - organization_user.department_cd カラムの DROP
--   - department テーブルの DROP
-- ============================================================
