-- MaiML OpenData Pipeline ロールバックSQL
-- 作成日: 2026-03-10
-- スキーマ: maiml_publish（公開DB専用スキーマ）

BEGIN;

DROP TABLE IF EXISTS maiml_publish.maiml_series_raw_chunk_bin CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_series_raw_chunk     CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_series_raw_header    CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_series_preview       CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_material_kv          CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_condition_kv         CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_publish_registry     CASCADE;
DROP TABLE IF EXISTS maiml_publish.maiml_asset                CASCADE;

DROP SCHEMA IF EXISTS maiml_publish;

COMMIT;
