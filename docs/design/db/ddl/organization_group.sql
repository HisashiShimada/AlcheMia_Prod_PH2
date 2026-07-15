-- 組織階層グループ
DROP TABLE IF EXISTS organization_group CASCADE;

CREATE TABLE organization_group (
  organization_id           UUID          NOT NULL
  , organization_group_cd   VARCHAR(50)   NOT NULL
  , organization_group_name VARCHAR(255)  NOT NULL
  , chief_user_id           VARCHAR(50)   NOT NULL
  , parent_id               VARCHAR(50)
  , layer                   VARCHAR(20)
  , create_user_id          VARCHAR(50)
  , create_at               TIMESTAMP
  , update_user_id          VARCHAR(50)
  , update_at               TIMESTAMP
  , CONSTRAINT organization_group_PKC PRIMARY KEY (organization_id, organization_group_cd)
) ;

-- 自己参照FK（親階層）
ALTER TABLE organization_group ADD CONSTRAINT fk_organization_group_parent
  FOREIGN KEY (organization_id, parent_id)
  REFERENCES organization_group(organization_id, organization_group_cd) ;

-- 組織テーブルへのFK
ALTER TABLE organization_group ADD CONSTRAINT fk_organization_group_organization
  FOREIGN KEY (organization_id)
  REFERENCES organization(organization_id) ;

COMMENT ON TABLE organization_group IS '組織階層グループ';
COMMENT ON COLUMN organization_group.organization_id IS '組織ID';
COMMENT ON COLUMN organization_group.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group.organization_group_name IS '組織階層グループ名';
COMMENT ON COLUMN organization_group.chief_user_id IS '代表者ユーザID';
COMMENT ON COLUMN organization_group.parent_id IS '親階層ID（同テーブルのorganization_group_cdを参照）';
COMMENT ON COLUMN organization_group.layer IS 'レイヤー（例: company / department / team）';
COMMENT ON COLUMN organization_group.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_group.create_at IS '作成日時';
COMMENT ON COLUMN organization_group.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization_group.update_at IS '更新日時';
