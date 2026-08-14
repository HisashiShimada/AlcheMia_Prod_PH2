-- ===================================================================
-- テーブル名: integrity_audit_log (改竄防止監査ログ)
-- 説明: 改竄防止機能（署名・タイムスタンプ）の監査ログを管理するテーブル
-- バージョン: 1.0 (2026-07-16)
-- 変更履歴:
--   1.0 (2026-07-16): 新規作成（仮設計）
--                     マイグレーション: backend/migrations/20260716_create_integrity_audit_log_table.sql
--
-- ⚠️ 注意: このテーブルは仮設計です。今後調整される可能性があります。
--
-- record_type による使い分け:
--   'timestamp_request'   : TSAへのタイムスタンプ要求記録。hash, tsa_endpoint を使用。
--   'verification_result' : タイムスタンプ検証結果記録。success, has_revocation, error_message を使用。
-- ===================================================================

CREATE TABLE IF NOT EXISTS integrity_audit_log (
  log_id          UUID         NOT NULL DEFAULT uuid_generate_v4(),
  organization_id UUID         NOT NULL,
  record_type     VARCHAR(30)  NOT NULL,

  -- record_type='timestamp_request' の場合に使用
  hash            TEXT,
  tsa_endpoint    VARCHAR(255),

  -- record_type='verification_result' の場合に使用
  success         BOOLEAN,
  has_revocation  BOOLEAN,
  error_message   TEXT,

  -- 共通
  event_timestamp TIMESTAMP,
  recorded_at     TIMESTAMP    NOT NULL,
  created_by      UUID,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_integrity_audit_log PRIMARY KEY (log_id),
  CONSTRAINT fk_integrity_audit_log_organization
    FOREIGN KEY (organization_id)
    REFERENCES organization(organization_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_integrity_audit_log_created_by
    FOREIGN KEY (created_by)
    REFERENCES users(user_id)
    ON DELETE SET NULL,
  CONSTRAINT chk_integrity_audit_log_record_type
    CHECK (record_type IN ('timestamp_request', 'verification_result'))
);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_log_organization
  ON integrity_audit_log(organization_id);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_log_record_type
  ON integrity_audit_log(organization_id, record_type);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_log_recorded_at
  ON integrity_audit_log(recorded_at);

COMMENT ON TABLE integrity_audit_log IS '改竄防止機能（署名・タイムスタンプ）の監査ログ（仮設計）。TSA要求記録と検証結果記録を record_type で区別して格納。';
COMMENT ON COLUMN integrity_audit_log.log_id IS 'ログID（UUID）';
COMMENT ON COLUMN integrity_audit_log.organization_id IS '組織ID';
COMMENT ON COLUMN integrity_audit_log.record_type IS 'timestamp_request=TSA要求記録, verification_result=検証結果記録';
COMMENT ON COLUMN integrity_audit_log.hash IS 'record_type=timestamp_request の場合: 送信したハッシュ値';
COMMENT ON COLUMN integrity_audit_log.tsa_endpoint IS 'record_type=timestamp_request の場合: TSAエンドポイント';
COMMENT ON COLUMN integrity_audit_log.success IS 'record_type=verification_result の場合: 検証成功したか';
COMMENT ON COLUMN integrity_audit_log.has_revocation IS 'record_type=verification_result の場合: 失効の有無';
COMMENT ON COLUMN integrity_audit_log.error_message IS 'record_type=verification_result の場合: エラーメッセージ（失敗時のみ）';
COMMENT ON COLUMN integrity_audit_log.event_timestamp IS '取得したタイムスタンプまたは検証時刻';
COMMENT ON COLUMN integrity_audit_log.recorded_at IS 'Service層が記録した日時';
COMMENT ON COLUMN integrity_audit_log.created_by IS '作成者ユーザID';
COMMENT ON COLUMN integrity_audit_log.created_at IS '作成日時';
