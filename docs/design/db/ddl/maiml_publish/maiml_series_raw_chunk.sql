-- ============================================================
-- maiml_publish.maiml_series_raw_chunk（生データチャンク: Array方式）
-- maiml_publish.maiml_series_raw_chunk_bin（生データチャンク: Binary方式）
-- スキーマ: maiml_publish
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 6.2, 6.3
-- 作成日: 2026-03-10
-- ============================================================

-- --------------------------------------------------------
-- Array方式（storage_format = 'array'）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_raw_chunk (
  raw_id        BIGINT             NOT NULL REFERENCES maiml_publish.maiml_series_raw_header(raw_id) ON DELETE CASCADE,
  chunk_index   INT                NOT NULL,
  point_offset  BIGINT             NOT NULL,
  point_count   INT                NOT NULL,
  x_chunk       DOUBLE PRECISION[] NOT NULL,
  y_chunk       DOUBLE PRECISION[] NOT NULL,
  PRIMARY KEY (raw_id, chunk_index)
);

-- カラム説明（maiml_series_raw_chunk）
-- raw_id       : 生データヘッダID（FK）
-- chunk_index  : チャンク連番（0始まり）
-- point_offset : このチャンクの先頭点のオフセット
-- point_count  : このチャンクのデータ点数
-- x_chunk      : X値配列
-- y_chunk      : Y値配列

-- --------------------------------------------------------
-- Binary方式（storage_format = 'binary'）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_raw_chunk_bin (
  raw_id        BIGINT  NOT NULL REFERENCES maiml_publish.maiml_series_raw_header(raw_id) ON DELETE CASCADE,
  chunk_index   INT     NOT NULL,
  point_offset  BIGINT  NOT NULL,
  point_count   INT     NOT NULL,
  codec         TEXT    NOT NULL,
  payload       BYTEA   NOT NULL,
  PRIMARY KEY (raw_id, chunk_index)
);

-- カラム説明（maiml_series_raw_chunk_bin）
-- raw_id       : 生データヘッダID（FK）
-- chunk_index  : チャンク連番（0始まり）
-- point_offset : このチャンクの先頭点のオフセット
-- point_count  : このチャンクのデータ点数
-- codec        : 圧縮コーデック（zstd-f64le / gzip-f64le 等）
-- payload      : 圧縮済みバイナリデータ
