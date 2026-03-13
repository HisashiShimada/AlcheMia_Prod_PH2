-- ============================================================
-- MaiML OpenData Pipeline: public スキーマ側テーブル
--
-- @description
--   1. public.maiml_publish_job テーブル（全組織共通）
--   2. organization テーブルへ default_retention_days カラム追加
--
-- @reference docs/MaiML_OpenData_Pipeline/spec.md §10
-- @reference docs/MaiML_OpenData_Pipeline/db.md §8.1
-- ============================================================

-- ============================================================
-- maiml_publish_job テーブル（public スキーマ）
-- ============================================================

CREATE TABLE IF NOT EXISTS maiml_publish_job (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT          NOT NULL CHECK (job_type IN ('publish', 'unpublish')),
  organization_id TEXT          NOT NULL,
  project_name    TEXT          NOT NULL,
  asset_id        BIGINT,
                  -- ⚠️ FK なし: maiml_asset は組織スキーマに存在するため
                  --    PostgreSQL のクロススキーマ FK 制約は使用不可。
                  --    参照整合性はアプリケーション側（Worker）で管理する。
  status          TEXT          NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'done', 'error')),
  triggered_by    TEXT,
  trigger_type    TEXT          NOT NULL DEFAULT 'manual'
                  CHECK (trigger_type IN ('manual', 'schedule')),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_publish_job_org_project
  ON maiml_publish_job(organization_id, project_name);

CREATE INDEX IF NOT EXISTS ix_publish_job_status
  ON maiml_publish_job(status);

CREATE INDEX IF NOT EXISTS ix_publish_job_type_status
  ON maiml_publish_job(job_type, status);

COMMENT ON TABLE maiml_publish_job IS
  'bullmq 非同期処理のジョブ進捗管理テーブル。公開・非公開ジョブの状態をポーリング確認するために使用する。';

COMMENT ON COLUMN maiml_publish_job.job_id        IS 'ジョブ一意識別子（UUID）';
COMMENT ON COLUMN maiml_publish_job.job_type      IS '処理種別: publish（公開）/ unpublish（非公開）';
COMMENT ON COLUMN maiml_publish_job.organization_id IS '対象組織 ID';
COMMENT ON COLUMN maiml_publish_job.project_name  IS '対象プロジェクト名';
COMMENT ON COLUMN maiml_publish_job.asset_id      IS '対象 maiml_asset.asset_id（FK なし: 組織スキーマのため）。公開完了後に更新。非公開ジョブは登録時に設定';
COMMENT ON COLUMN maiml_publish_job.status        IS 'ジョブステータス: pending / running / done / error';
COMMENT ON COLUMN maiml_publish_job.triggered_by  IS 'ジョブをトリガーしたユーザー ID（スケジュール実行時は NULL）';
COMMENT ON COLUMN maiml_publish_job.trigger_type  IS 'トリガー種別: manual（手動）/ schedule（スケジュール）';
COMMENT ON COLUMN maiml_publish_job.error_message IS 'エラー時のメッセージ（status=error の場合に記録）';
COMMENT ON COLUMN maiml_publish_job.started_at    IS 'Worker が処理を開始した日時';
COMMENT ON COLUMN maiml_publish_job.finished_at   IS 'Worker が処理を完了（または失敗）した日時';
COMMENT ON COLUMN maiml_publish_job.created_at    IS 'ジョブ登録日時';

-- ============================================================
-- organization テーブルへ default_retention_days カラム追加
-- ============================================================

ALTER TABLE organization
  ADD COLUMN IF NOT EXISTS default_retention_days INT NOT NULL DEFAULT 30;

COMMENT ON COLUMN organization.default_retention_days IS
  '公開時のデフォルト保持日数（日数）。正の整数のみ許可。環境変数 RETENTION_DAYS_DEFAULT の初期値で設定';
