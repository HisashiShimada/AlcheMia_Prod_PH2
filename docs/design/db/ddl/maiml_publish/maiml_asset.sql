-- ============================================================
-- {org_schema}.maiml_asset（公開アセット）
--
-- @schema   {org_schema}（組織ごとに作成: organization_id の '-' を '_' に変換）
--           例: 550e8400_e29b_41d4_a716_446655440000
-- @description
--   MaiML ファイル 1 件を代表するメタデータテーブル。
--   1 ファイル = 1 レコード。全インスタンス・テンプレート・イベントの親。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.1
--   backend/src/sql/ddl/org_schema_tables.sql（実装テンプレート）
--   backend/migrations/20260313_create_org_schema_tables.sql（マイグレーション）
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_asset (
  asset_id         BIGSERIAL    PRIMARY KEY,
  file_uri         TEXT         NOT NULL,       -- S3/Swift のファイルパス（organizationId 相対パス）
  doc_name         TEXT,                        -- /maiml/document/name テキスト
  retention_until  TIMESTAMPTZ  NOT NULL,       -- 公開期限（期限到来でスケジュール非公開の対象）
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_maiml_asset_uri
  ON {org_schema}.maiml_asset(file_uri);
CREATE INDEX IF NOT EXISTS ix_maiml_asset_retention_until
  ON {org_schema}.maiml_asset(retention_until);

-- カラム説明
-- asset_id        : サロゲートキー（BIGSERIAL）
-- file_uri        : S3/Swift のファイルパス（organizationId 相対パス）
--                   例: projects/sample/sample.maiml
-- doc_name        : /maiml/document/name テキスト。例: juyoSampleProtocol_1
-- retention_until : 公開期限（NOT NULL）。
--                   Worker が organization.default_retention_days または
--                   環境変数 RETENTION_DAYS_DEFAULT（デフォルト: 365日）から算出。
--                   スケジュール非公開 Worker が retention_until <= now() のレコードを削除。
-- created_at      : 登録日時
-- updated_at      : 更新日時
