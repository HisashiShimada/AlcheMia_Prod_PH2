-- ============================================================
-- MaiML 公開ジョブ管理テーブル
--
-- @description
--   bullmq の Queue/Worker による非同期公開処理のジョブ進捗を管理する。
--   bullmq の Redis 上ジョブ情報と補完的に使用し、DB 側でもジョブ状態を追跡できるようにする。
--
-- @reference docs/MaiML_OpenData_Pipeline/spec.md §9 / BasicDesign v1.3 §6.3
-- ============================================================

-- maiml_publish スキーマが存在しない場合は作成
CREATE SCHEMA IF NOT EXISTS maiml_publish;

-- ============================================================
-- maiml_publish_job テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS maiml_publish.maiml_publish_job (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ジョブ種別
  job_type        TEXT          NOT NULL
                                CHECK (job_type IN ('publish', 'unpublish')),

  -- 対象アセット（削除時に SET NULL）
  asset_id        BIGINT        REFERENCES maiml_publish.maiml_asset(asset_id)
                                ON DELETE SET NULL,

  -- 対象レジストリ ID（参照整合性は緩くする）
  registry_id     BIGINT,

  -- ジョブステータス
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'running', 'done', 'error')),

  -- ジョブをトリガーしたユーザー ID（NULL の場合はシステム自動実行）
  triggered_by    TEXT,

  -- トリガー種別
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

-- ステータスでの検索（ポーリング用）
CREATE INDEX IF NOT EXISTS ix_publish_job_status
  ON maiml_publish.maiml_publish_job(status);

-- asset_id での検索
CREATE INDEX IF NOT EXISTS ix_publish_job_asset
  ON maiml_publish.maiml_publish_job(asset_id);

-- job_type + status での複合検索
CREATE INDEX IF NOT EXISTS ix_publish_job_type_status
  ON maiml_publish.maiml_publish_job(job_type, status);

-- ============================================================
-- コメント
-- ============================================================

COMMENT ON TABLE maiml_publish.maiml_publish_job IS
  'bullmq 非同期処理のジョブ進捗管理テーブル。公開・非公開ジョブの状態をポーリング確認するために使用する。';

COMMENT ON COLUMN maiml_publish.maiml_publish_job.job_id        IS 'ジョブ一意識別子（UUID）';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.job_type      IS '処理種別: publish（公開）/ unpublish（非公開）';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.asset_id      IS '対象 maiml_asset.asset_id（アセット削除時 NULL）';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.registry_id   IS '対象 maiml_publish_registry.registry_id';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.status        IS 'ジョブステータス: pending / running / done / error';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.triggered_by  IS 'ジョブをトリガーしたユーザー ID';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.trigger_type  IS 'トリガー種別: manual（手動）/ schedule（スケジュール）';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.error_message IS 'エラー時のメッセージ（status=error の場合に記録）';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.started_at    IS 'Worker が処理を開始した日時';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.finished_at   IS 'Worker が処理を完了（または失敗）した日時';
COMMENT ON COLUMN maiml_publish.maiml_publish_job.created_at    IS 'ジョブ登録日時';
