/**
 * eventLog.ts
 *
 * MAiML eventLog 関連の共通型定義
 *
 * @remarks
 * EventLogRow は maiml_event_log テーブルの1行に対応する。
 * maimlWriterService / eventLogRepository など複数ファイルで共有する。
 */

// ─────────────────────────────────────────────────────────────────────────────
// maiml_event_log テーブル行型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * maiml_event_log テーブルの1行
 * （log カラムのみ使用するため最小限の定義）
 *
 * @remarks
 * log カラムの JSON 構造は EventLogJsonRecord（= Record<string, unknown>）と同型。
 * maimlDataWriter.ts の buildEventLogXML() が消費するフォーマットに準拠する。
 */
export interface EventLogRow {
  sequence_no: number;
  log: Record<string, unknown>;
}
