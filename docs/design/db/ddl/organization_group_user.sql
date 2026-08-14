-- ===================================================================
-- テーブル名: organization_group_user (組織階層利用者)
-- 説明: 組織階層グループとユーザーの多対多中間テーブル
-- バージョン: 2.0 (2026-08-14)
-- 変更履歴:
--   1.0: 初版作成
--   2.0 (2026-08-14): FK制約 (fk_org_group_user_group) を明示的に追加
--                     マイグレーション: backend/migrations/20260710_add_organization_group.sql
-- ===================================================================

-- 既存テーブルが存在する場合は削除
-- * BackupToTempTable
DROP TABLE if exists organization_group_user CASCADE;
 
-- * RestoreFromTempTable
CREATE TABLE organization_group_user (
  organization_id uuid NOT NULL
  , organization_group_cd VARCHAR(50) NOT NULL
  , user_id VARCHAR(50) NOT NULL
  , create_user_id VARCHAR(50)
  , create_at TIMESTAMP
  , CONSTRAINT organization_group_user_PKC PRIMARY KEY (organization_id, organization_group_cd, user_id)
  , CONSTRAINT fk_org_group_user_group
      FOREIGN KEY (organization_id, organization_group_cd)
      REFERENCES organization_group (organization_id, organization_group_cd)
      ON DELETE CASCADE
) ;
 
COMMENT ON TABLE organization_group_user IS '組織階層利用者';
COMMENT ON COLUMN organization_group_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_group_user.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_group_user.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_group_user.create_at IS '作成日時';
