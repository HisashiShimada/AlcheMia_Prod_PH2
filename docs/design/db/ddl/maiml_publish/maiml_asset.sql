-- ============================================================
-- maiml_publish.maiml_asset（公開アセット）
-- スキーマ: maiml_publish
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md
-- 作成日: 2026-03-10
-- ============================================================
-- TODO: v1.3以前の設計書確認後、既存スキーマと統合する
--       現在は asset_id / file_uri / doc_name / template_only のみ最低限定義

CREATE TABLE IF NOT EXISTS maiml_publish.maiml_asset (
  asset_id        BIGSERIAL    PRIMARY KEY,
  organization_id TEXT         NOT NULL,
  file_uri        TEXT         NOT NULL,
  doc_name        TEXT,
  template_only   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_maiml_asset_org ON maiml_publish.maiml_asset(organization_id);
CREATE INDEX IF NOT EXISTS ix_maiml_asset_uri ON maiml_publish.maiml_asset(file_uri);

-- カラム説明
-- asset_id        : サロゲートキー（BIGSERIAL）
-- organization_id : 組織ID（マルチテナント分離用）
-- file_uri        : S3/Swift のファイルパス（organizationId 相対パス）
-- doc_name        : /maiml/document/name から抽出したドキュメント名
-- template_only   : テンプレートのみファイルかどうか
-- created_at      : 登録日時
-- updated_at      : 更新日時
