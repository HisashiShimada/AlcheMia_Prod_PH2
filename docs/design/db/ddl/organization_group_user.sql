-- 組織階層グループユーザー
DROP TABLE IF EXISTS organization_group_user CASCADE;

CREATE TABLE organization_group_user (
  organization_id         UUID          NOT NULL
  , organization_group_cd VARCHAR(50)   NOT NULL
  , user_id               VARCHAR(50)   NOT NULL
  , create_user_id        VARCHAR(50)
  , create_at             TIMESTAMP
  , CONSTRAINT organization_group_user_PKC PRIMARY KEY (organization_id, organization_group_cd, user_id)
) ;

-- 組織階層グループテーブルへのFK
ALTER TABLE organization_group_user ADD CONSTRAINT fk_organization_group_user_group
  FOREIGN KEY (organization_id, organization_group_cd)
  REFERENCES organization_group(organization_id, organization_group_cd) ;

COMMENT ON TABLE organization_group_user IS '組織階層グループユーザー';
COMMENT ON COLUMN organization_group_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_group_user.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_group_user.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_group_user.create_at IS '作成日時';
