-- ============================================================
-- {org_schema}.maiml_event（eventLog 層 イベント）
--
-- @schema   {org_schema}
-- @description
--   MaiML の eventLog/log/trace/event 階層のうち、event 要素のみを格納する。
--   eventLog / log / trace はテーブルとして持たない。
--   maiml_asset の子。maiml_event_element の親。
--   data 層（maiml_instance）との結合は results_ref ↔ results_id（論理結合・FK なし）。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §7.2
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_event (
  event_id         BIGSERIAL    PRIMARY KEY,
  asset_id         BIGINT       NOT NULL
                   REFERENCES {org_schema}.maiml_asset(asset_id) ON DELETE CASCADE,
  event_key        TEXT,            -- event/@id 属性
  results_ref      TEXT,            -- event/resultsRef/@ref（data層 results_id と結合するキー）
  instruction_ref  TEXT,            -- event/@ref 属性（instruction の @id を参照）
  event_uuid       TEXT,            -- event/uuid テキスト
  event_name       TEXT,            -- event/name テキスト
  description      TEXT,            -- event/description テキスト
  annotation       TEXT,            -- event/annotation テキスト
  maiml_line_no    INT              -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_event_asset
  ON {org_schema}.maiml_event(asset_id);
CREATE INDEX IF NOT EXISTS ix_maiml_event_results_ref
  ON {org_schema}.maiml_event(asset_id, results_ref);
CREATE INDEX IF NOT EXISTS ix_maiml_event_instruction
  ON {org_schema}.maiml_event(instruction_ref);

-- data 層との結合クエリ例
-- SELECT *
-- FROM {org_schema}.maiml_instance mi
-- JOIN {org_schema}.maiml_event ev
--   ON ev.results_ref = mi.results_id
--  AND ev.asset_id    = mi.asset_id
-- WHERE mi.asset_id = :asset_id;
