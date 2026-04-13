-- ============================================================
-- maiml_publish_job テーブル DDL
--
-- @schema   public（全組織共通）
-- @description
--   BullMQ 非同期処理（公開・非公開ジョブ）の進捗を管理するテーブル。
--   Redis 上の BullMQ ジョブと補完的に使用し、DB 側でもジョブ状態を
--   ポーリング確認できるようにする。
--
--   organization_id + project_id でジョブを特定し、
--   asset_id はクロススキーマ参照のため FK 制約なし。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/spec.md §10
--   backend/migrations/20260311_create_maiml_publish_job.sql（旧設計）
-- ============================================================

CREATE TABLE IF NOT EXISTS maiml_publish_job (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ジョブ種別（publish: 公開 / unpublish: 非公開）
  job_type        TEXT          NOT NULL
                                CHECK (job_type IN ('publish', 'unpublish')),

  -- 対象組織・プロジェクト
  organization_id TEXT          NOT NULL,
  project_id      character varying(20) NOT NULL,

  -- 対象アセット ID（FK なし: 組織スキーマ内 maiml_asset.asset_id を参照するため）
  -- 公開ジョブ: 完了後に Worker が更新
  -- 非公開ジョブ: 登録時に設定
  asset_id        BIGINT,

  -- ジョブステータス
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'running', 'done', 'error')),

  -- ジョブをトリガーしたユーザー ID（スケジュール実行時は NULL）
  triggered_by    TEXT,

  -- トリガー種別（manual: 手動 / schedule: スケジュール）
  trigger_type    TEXT          NOT NULL DEFAULT 'manual'
                                CHECK (trigger_type IN ('manual', 'schedule')),

  -- エラーメッセージ（status='error' 時に記録）
  error_message   TEXT,

  -- 処理開始・終了タイムスタンプ
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,

  -- レコード作成日時
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- インデックス
-- ============================================================

-- organization_id + project_id: 特定プロジェクトのジョブ検索
CREATE INDEX IF NOT EXISTS ix_publish_job_org_project
  ON maiml_publish_job(organization_id, project_id);

-- status: ポーリング・監視用
CREATE INDEX IF NOT EXISTS ix_publish_job_status
  ON maiml_publish_job(status);

-- job_type + status: 種別ごとのジョブ検索
CREATE INDEX IF NOT EXISTS ix_publish_job_type_status
  ON maiml_publish_job(job_type, status);

-- ============================================================
-- コメント
-- ============================================================

COMMENT ON TABLE maiml_publish_job IS
  'BullMQ 非同期ジョブ（公開・非公開）の進捗管理テーブル。'
  'フロントエンドはポーリングで status=done/error になるまで確認する。';

COMMENT ON COLUMN maiml_publish_job.job_id         IS 'ジョブ一意識別子（UUID）。BullMQ ペイロードにも含める';
COMMENT ON COLUMN maiml_publish_job.job_type        IS '処理種別: publish（公開）/ unpublish（非公開）';
COMMENT ON COLUMN maiml_publish_job.organization_id IS 'ジョブ対象の組織 ID';
COMMENT ON COLUMN maiml_publish_job.project_id      IS 'ジョブ対象のプロジェクト ID（project.project_id）';
COMMENT ON COLUMN maiml_publish_job.asset_id        IS
  '対象 maiml_asset.asset_id（FK 制約なし: 組織スキーマとのクロス参照のため）。'
  '公開ジョブは完了後に Worker が更新。非公開ジョブは登録時に設定';
COMMENT ON COLUMN maiml_publish_job.status          IS 'ステータス: pending → running → done / error';
COMMENT ON COLUMN maiml_publish_job.triggered_by    IS 'ジョブをトリガーしたユーザー ID。スケジュール実行時は NULL';
COMMENT ON COLUMN maiml_publish_job.trigger_type    IS 'トリガー種別: manual（手動）/ schedule（スケジュール）';
COMMENT ON COLUMN maiml_publish_job.error_message   IS 'エラー時のメッセージ（status=error 時に記録）';
COMMENT ON COLUMN maiml_publish_job.started_at      IS 'Worker が処理を開始した日時';
COMMENT ON COLUMN maiml_publish_job.finished_at     IS 'Worker が処理を完了（または失敗）した日時';
COMMENT ON COLUMN maiml_publish_job.created_at      IS 'ジョブ登録日時';
