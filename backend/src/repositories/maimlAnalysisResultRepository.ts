/**
 * MAIML Analysis Result Repository
 * 
 * @description
 * maiml_analysis_resultsテーブルへのデータアクセスを提供
 * database.md規約に従った実装
 * 
 * @remarks
 * DDL: docs/design/db/ddl/maiml_analysis_result.sql
 * 主キー: id (SERIAL)
 * ユニークキー: file_key
 */

import { getPool } from '../database/db';

/**
 * MAIML分析結果の型定義
 * 
 * @remarks
 * maiml_analysis_resultsテーブルのスキーマに対応
 * DDL: docs/design/db/ddl/maiml_analysis_result.sql
 */
export interface MaimlAnalysisResult {
  id?: number;
  file_key: string;
  is_valid: boolean;
  version?: number | null;
  namespace?: string | null;
  errors: string; // JSONB -> string
  warnings: string; // JSONB -> string
  suggestions: string; // JSONB -> string
  statistics: string; // JSONB -> string
  processing_time?: number | null;
  analysis_timestamp: string | Date;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * MAIML分析結果をUPSERT（INSERT or UPDATE）
 * 
 * @param data - MAIML分析結果データ（テーブル型Object）
 * @returns Upsertされた分析結果（idを含む）
 * 
 * @example
 * ```typescript
 * const result = await upsert({
 *   file_key: 'org_xxx/projects/sample/sample.maiml',
 *   is_valid: true,
 *   errors: JSON.stringify([]),
 *   warnings: JSON.stringify([]),
 *   // ...
 * });
 * console.log('Saved with ID:', result.id);
 * ```
 */
export async function upsert(
  data: Omit<MaimlAnalysisResult, 'id' | 'created_at' | 'updated_at'>
): Promise<MaimlAnalysisResult> {
  const pool = getPool();

  // データからカラム名と値を抽出（undefinedを除外）
  const columns = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined);
  const values = columns.map(col => data[col as keyof typeof data]);

  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

  // UPDATE用のSET句を生成（file_keyを除外）
  const updateColumns = columns.filter(col => col !== 'file_key');
  const updateSetClause = updateColumns
    .map(col => `${col} = EXCLUDED.${col}`)
    .join(', ');

  // SQLクエリを構築（INSERT ON CONFLICT DO UPDATE）
  const query = `
    INSERT INTO maiml_analysis_results (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (file_key)
    DO UPDATE SET
      ${updateSetClause},
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  try {
    const result = await pool.query(query, values);
    console.log(`✅ [MaimlAnalysisResultRepository] Upsert成功: ${data.file_key} (ID: ${result.rows[0].id})`);
    return result.rows[0] as MaimlAnalysisResult;
  } catch (error) {
    console.error(`❌ [MaimlAnalysisResultRepository] Upsert失敗: ${data.file_key}`, error);
    throw error;
  }
}

/**
 * file_keyで分析結果を取得
 * 
 * @param fileKey - ファイルキー
 * @returns 分析結果、存在しない場合はnull
 * 
 * @example
 * ```typescript
 * const result = await getByFileKey('org_xxx/projects/sample/sample.maiml');
 * if (result) {
 *   console.log('Is valid:', result.is_valid);
 * }
 * ```
 */
export async function getByFileKey(
  fileKey: string
): Promise<MaimlAnalysisResult | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM maiml_analysis_results
    WHERE file_key = $1
  `;

  try {
    const result = await pool.query(query, [fileKey]);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`❌ [MaimlAnalysisResultRepository] 取得失敗: ${fileKey}`, error);
    throw error;
  }
}

/**
 * 分析結果を削除
 * 
 * @param fileKey - ファイルキー
 * @returns 削除された行数
 */
export async function deleteByFileKey(fileKey: string): Promise<number> {
  const pool = getPool();

  const query = `
    DELETE FROM maiml_analysis_results
    WHERE file_key = $1
  `;

  try {
    const result = await pool.query(query, [fileKey]);
    console.log(`✅ [MaimlAnalysisResultRepository] 削除成功: ${fileKey} (${result.rowCount}行)`);
    return result.rowCount || 0;
  } catch (error) {
    console.error(`❌ [MaimlAnalysisResultRepository] 削除失敗: ${fileKey}`, error);
    throw error;
  }
}
