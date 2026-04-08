/**
 * セマンティック検索リポジトリ
 *
 * @description transition_set テーブルのCRUD操作を提供
 * @remarks
 * DBテーブル: transition_set
 * DDL: backend/migrations/20260226_create_transition_set_table.sql
 */

import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import {
  TransitionSetUpsertData,
  SearchHit,
  ScoreDetail,
  ProjectStats,
} from '../types/semanticSearch';

/**
 * ベクトル配列をPostgreSQL vector型文字列に変換
 */
function toVectorString(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/**
 * トランジションセットをUPSERT（登録または更新）
 *
 * @param data - 登録データ
 * @returns 登録されたtransition_set_id
 */
export async function upsertTransitionSet(
  data: TransitionSetUpsertData
): Promise<string> {
  const pool = getPool();
  const sql = await loadSqlFile('semanticSearch/upsertTransitionSet.sql');

  const result = await pool.query(sql, [
    data.organization_id,           // $1
    data.project_name,              // $2
    data.file_id,                   // $3
    data.file_path,                 // $4
    data.method_uuid,               // $5
    data.transition_id,             // $6
    data.instruction_ids,           // $7
    data.instruction_descs,         // $8
    data.input_place_ids,           // $9
    data.output_place_ids,          // $10
    data.input_place_count,         // $11
    data.output_place_count,        // $12
    data.input_text,                // $13
    data.transition_text,           // $14
    data.output_text,               // $15
    data.structure_text,            // $16
    data.input_mt_count,            // $17
    data.input_ct_count,            // $18
    data.input_rt_count,            // $19
    data.output_mt_count,           // $20
    data.output_ct_count,           // $21
    data.output_rt_count,           // $22
    toVectorString(data.emb_input),       // $23
    toVectorString(data.emb_transition),  // $24
    toVectorString(data.emb_output),      // $25
    toVectorString(data.emb_structure),   // $26
    data.technique,                 // $27
    data.embedding_model_version,   // $28
    data.norm_template_version,     // $29
  ]);

  return result.rows[0].transition_set_id as string;
}

/**
 * ファイルパスに一致するトランジションセットを全削除
 *
 * @param organizationId - 組織ID
 * @param filePath - ファイルパス（organization_id省略の相対パス）
 * @returns 削除件数
 */
export async function deleteByFilePath(
  organizationId: string,
  filePath: string
): Promise<number> {
  const pool = getPool();
  const sql = await loadSqlFile('semanticSearch/deleteByFilePath.sql');

  const result = await pool.query(sql, [organizationId, filePath]);
  return result.rowCount ?? 0;
}

/**
 * セマンティック検索（4軸加重平均スコアリング）
 *
 * @param organizationId - 組織ID
 * @param embedInput - 入力軸ベクトル（768次元）
 * @param embedTransition - 遷移軸ベクトル（768次元）
 * @param embedOutput - 出力軸ベクトル（768次元）
 * @param embedStructure - 構造軸ベクトル（768次元）
 * @param weightInput - 入力軸の重み
 * @param weightTransition - 遷移軸の重み
 * @param weightOutput - 出力軸の重み
 * @param weightStructure - 構造軸の重み
 * @param topK - 返却件数上限
 * @param technique - メソドロジーフィルタ（null で全件）
 * @param projectName - プロジェクト名フィルタ（null で全件）
 * @param minScore - スコア足切り閾値（デフォルト: 0.3）
 * @returns 検索結果配列
 */
export async function search(
  organizationId: string,
  embedInput: number[],
  embedTransition: number[],
  embedOutput: number[],
  embedStructure: number[],
  weightInput: number,
  weightTransition: number,
  weightOutput: number,
  weightStructure: number,
  topK: number,
  technique: string | null,
  projectName: string | null,
  minScore: number
): Promise<SearchHit[]> {
  const pool = getPool();
  const sql = await loadSqlFile('semanticSearch/search.sql');

  const result = await pool.query(sql, [
    organizationId,                        // $1
    toVectorString(embedInput),            // $2
    toVectorString(embedTransition),       // $3
    toVectorString(embedOutput),           // $4
    toVectorString(embedStructure),        // $5
    weightInput,                           // $6
    weightTransition,                      // $7
    weightOutput,                          // $8
    weightStructure,                       // $9
    topK,                                  // $10
    technique,                             // $11
    projectName,                           // $12
    minScore,                              // $13
  ]);

  return result.rows.map((row) => {
    const scoreDetail: ScoreDetail = {
      input_score: parseFloat(row.input_score),
      transition_score: parseFloat(row.transition_score),
      output_score: parseFloat(row.output_score),
      structure_score: parseFloat(row.structure_score),
    };

    const hit: SearchHit = {
      transition_set_id: row.transition_set_id,
      organization_id: row.organization_id,
      project_name: row.project_name,
      file_id: row.file_id,
      file_path: row.file_path,
      method_uuid: row.method_uuid,
      transition_id: row.transition_id,
      instruction_ids: row.instruction_ids,
      instruction_descs: row.instruction_descs,
      input_text: row.input_text,
      transition_text: row.transition_text,
      output_text: row.output_text,
      structure_text: row.structure_text,
      technique: row.technique,
      score: parseFloat(row.score),
      score_detail: scoreDetail,
    };
    return hit;
  });
}

/**
 * インデックス統計を取得（プロジェクト別集計）
 *
 * @param organizationId - 組織ID
 * @returns プロジェクト別統計配列
 */
export async function getStats(
  organizationId: string
): Promise<ProjectStats[]> {
  const pool = getPool();
  const sql = await loadSqlFile('semanticSearch/getStats.sql');

  const result = await pool.query(sql, [organizationId]);

  return result.rows.map((row) => ({
    project_name: row.project_name,
    transition_set_count: parseInt(row.transition_set_count, 10),
    file_count: parseInt(row.file_count, 10),
  }));
}
