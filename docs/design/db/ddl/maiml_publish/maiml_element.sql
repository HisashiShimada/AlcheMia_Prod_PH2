-- ============================================================
-- {org_schema}.maiml_element（data 層 汎用データ行）
--
-- @schema   {org_schema}
-- @description
--   maiml_instance 配下の property / content / uncertainty 等をフラット化して格納する。
--   parent_element_id による自己参照で入れ子構造を表現。
--   maiml_template_element と同一のカラム構成。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.3
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_element (
  element_id        BIGSERIAL  PRIMARY KEY,
  instance_id       BIGINT     NOT NULL
                    REFERENCES {org_schema}.maiml_instance(instance_id) ON DELETE CASCADE,
  parent_element_id BIGINT
                    REFERENCES {org_schema}.maiml_element(element_id) ON DELETE CASCADE,
  hierarchy         TEXT       NOT NULL,        -- 連番階層パス（例: "1", "2-1", "2-1-3"）
  element_type      TEXT       NOT NULL,        -- 要素種別（下記 element_type 一覧参照）
  description       TEXT,                       -- /description テキスト
  element_data      TEXT,                       -- uri / hash 値 等（挿入系で使用）
  hash_method       TEXT,                       -- ハッシュアルゴリズム（例: SHA-256）
  xsi_type          TEXT,                       -- @xsi:type 属性（例: intType, stringType）
  key               TEXT,                       -- @key 属性
  format_string     TEXT,                       -- @formatString 属性
  units             TEXT,                       -- @units 属性（単位）
  scale_factor      DOUBLE PRECISION,           -- @scaleFactor 属性
  axis              TEXT,                       -- @axis 属性（content のみ）
  size_value        INT,                        -- @size 属性（content のみ）
  element_id_attr   TEXT,                       -- @id 属性（content のみ）
  element_ref       TEXT,                       -- @ref 属性（content のみ）
  maiml_line_no     INT                         -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_element_instance
  ON {org_schema}.maiml_element(instance_id);
CREATE INDEX IF NOT EXISTS ix_maiml_element_parent
  ON {org_schema}.maiml_element(parent_element_id);
CREATE INDEX IF NOT EXISTS ix_maiml_element_type
  ON {org_schema}.maiml_element(element_type);
CREATE INDEX IF NOT EXISTS ix_maiml_element_key
  ON {org_schema}.maiml_element(key);
CREATE INDEX IF NOT EXISTS ix_maiml_element_hierarchy
  ON {org_schema}.maiml_element(instance_id, hierarchy);

-- element_type の値一覧
-- 'property'      : データプロパティ（汎用コンテナ）
-- 'content'       : データコンテンツ（数値配列が多い）
-- 'uncertainty'   : 不確実性データ
-- 'insertion'     : 外部ファイル参照の親要素
-- 'uri'           : ファイルパス/URI
-- 'hash'          : ハッシュ値
-- 'uuid'          : ファイル UUID
-- 'format'        : MIME タイプ
-- 'childUri'      : 暗号化された子 URI
-- 'childHash'     : 暗号化された子ハッシュ
-- 'childUuid'     : 暗号化された子 UUID
-- 'EncryptedData' : 暗号化データ本体
