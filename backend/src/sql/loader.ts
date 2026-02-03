/**
 * SQL Loader
 * 
 * 外部SQLファイルを読み込むユーティリティ
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 外部SQLファイルを読み込む
 * 
 * @param filename クエリファイル名（queries/からの相対パス）
 * @returns SQL文字列
 * @throws ファイルが存在しない場合やアクセスできない場合
 * 
 * @example
 * const sql = await loadSqlFile('tasks/listMethodsAndTasksByProject.sql');
 */
export async function loadSqlFile(filename: string): Promise<string> {
  const filePath = path.join(__dirname, 'queries', filename);
  
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load SQL file: ${filename}. Error: ${error}`);
  }
}