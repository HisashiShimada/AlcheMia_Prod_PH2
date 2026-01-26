-- プロジェクト
DROP TABLE if exists project CASCADE;

CREATE TABLE project (
  organization_id uuid NOT NULL
  , project_id uuid NOT NULL
  , project_name character varying
  , description text
  , department_cd character varying(50)
  , owner_user_id uuid
  , project_status numeric(2,0)
  , project_maiml_flg BOOLEAN
  , checkout_status numeric(2,0)
  , create_at timestamp
  , CONSTRAINT project_PKC PRIMARY KEY (organization_id,project_id)
) ;

COMMENT ON TABLE project IS 'プロジェクト';
COMMENT ON COLUMN project.organization_id IS '組織ID';
COMMENT ON COLUMN project.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project.project_name IS 'プロジェクト名:プロジェクト名かつフォルダ名';
COMMENT ON COLUMN project.description IS '概要';
COMMENT ON COLUMN project.department_cd IS '部署CD';
COMMENT ON COLUMN project.owner_user_id IS '所有者ユーザID';
COMMENT ON COLUMN project.project_status IS 'プロジェクトステータス';
COMMENT ON COLUMN project.project_maiml_flg IS 'プロジェクトMaiml有無:false:ファイルなし、true:ファイルあり';
COMMENT ON COLUMN project.checkout_status IS 'チェックアウトステータス';
COMMENT ON COLUMN project.create_at IS '作成日';
