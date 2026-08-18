-- ===================================================================
-- テーブル名: namespace (名前空間)
-- 説明: MAIMLで使用する名前空間を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS namespace CASCADE;

CREATE TABLE namespace (
  organization_id   UUID          NOT NULL
  , namespace_id    VARCHAR(20)   NOT NULL
  , scope_key       VARCHAR(100)
  , uri             TEXT          NOT NULL
  , create_at       TIMESTAMP
  , create_user_id  VARCHAR(50)
  , update_at       TIMESTAMP
  , update_user_id  VARCHAR(50)
  , CONSTRAINT namespace_PKC PRIMARY KEY (organization_id, namespace_id)
) ;

COMMENT ON TABLE namespace IS '名前空間';
COMMENT ON COLUMN namespace.organization_id IS '組織ID';
COMMENT ON COLUMN namespace.namespace_id IS '名前空間ID';
COMMENT ON COLUMN namespace.scope_key IS 'スコープキー';
COMMENT ON COLUMN namespace.uri IS '名前空間URI:例: https://www.myco.jp/';
COMMENT ON COLUMN namespace.create_at IS '作成日時';
COMMENT ON COLUMN namespace.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN namespace.update_at IS '更新日時';
COMMENT ON COLUMN namespace.update_user_id IS '更新者ユーザID';