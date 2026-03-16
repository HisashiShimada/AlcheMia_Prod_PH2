-- マイグレーション: organization テーブルに default_retention_days カラムを追加
-- 実行日: 2026-03-13
-- 目的: MaiML OpenData 公開機能で使用するデフォルト保持日数を組織ごとに管理する
--
-- ロールバック方法:
--   ALTER TABLE organization DROP COLUMN IF EXISTS default_retention_days;

ALTER TABLE organization
  ADD COLUMN IF NOT EXISTS default_retention_days INT NOT NULL DEFAULT 30;

COMMENT ON COLUMN organization.default_retention_days
  IS 'MaiMLデータ公開時のデフォルト保持日数（日）。公開 Worker が retention_until 算出時に参照する。1以上の整数必須。';
