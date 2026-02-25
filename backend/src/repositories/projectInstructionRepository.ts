/**
 * project_instructionテーブル専用Repository
 * 
 * @remarks
 * DB操作規約に準拠:
 * - insertメソッド: テーブル型Objectを受け取り、動的にSQLクエリを構築
 * - updateメソッド: テーブル型Objectを受け取り、動的にSQLクエリを構築
 * 
 * DDL: docs/design/db/ddl/project_instruction.sql
 * 主キー: (organization_id, project_id, experiment_instruction_id)
 * 
 * instruction_statusカラムは 20260224_add_instruction_status.sql マイグレーションで追加
 * 0=未送信、1=送信済
 */

import { getPool } from '../database/db';
import { ProjectInstruction } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * 指示をInsert（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 
 * @param data 指示データ（テーブル型Object）
 * @param projectName プロジェクト名（IDの生成に使用）
 * @returns Insertされた指示
 */
export async function insert(
  data: ProjectInstruction
): Promise<ProjectInstruction> {
  const pool = getPool();
  
  // データからカラム名と値を抽出
  const columns = Object.keys(data).filter(
    key => data[key as keyof ProjectInstruction] !== undefined
  );
  const values = columns.map(col => data[col as keyof ProjectInstruction]);
  
  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  
  // SQLクエリを構築
  const query = `
    INSERT INTO project_instruction (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  console.log(query);
  console.log(values);
  
  const result = await pool.query<ProjectInstruction>(query, values);
  return result.rows[0];
}

/**
 * 指示をUpdate（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 未送信のみ更新可能（instruction_status = 0）
 * 
 * @param data 更新する指示データ（テーブル型Object）
 * @returns 更新された指示
 * @throws Error 指示が見つからない、または送信済の場合
 */
export async function update(data: ProjectInstruction): Promise<ProjectInstruction> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（主キー + 未送信条件）
  const whereColumns = ['organization_id', 'project_id', 'experiment_instruction_id'];
  const whereValues = whereColumns.map(col => data[col as keyof ProjectInstruction]);
  
  // 更新するカラム（主キーを除外）
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && data[key as keyof ProjectInstruction] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col as keyof ProjectInstruction]);
  
  // SET句を構築
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築（未送信のみ更新可能）
  const whereClause = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築
  const query = `
    UPDATE project_instruction
    SET ${setClause}
    WHERE ${whereClause}
      AND instruction_status = 0
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query<ProjectInstruction>(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error('指示が見つからないか、既に送信済です');
  }
  
  return result.rows[0];
}

/**
 * 未送信指示を一括で送信済に更新
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param instructionUserId 指示送信ユーザーID
 * @returns 更新された指示数
 */
export async function bulkUpdateStatus(
  organizationId: string,
  projectId: string,
  instructionUserId: string
): Promise<number> {
  const pool = getPool();
  
  const query = `
    UPDATE project_instruction
    SET
      instruction_status = 1,
      instruction_user_id = $1,
      instruction_date = CURRENT_TIMESTAMP,
      update_at = CURRENT_TIMESTAMP
    WHERE organization_id = $2
      AND project_id = $3
      AND instruction_status = 0
  `;
  
  const result = await pool.query(query, [instructionUserId, organizationId, projectId]);
  return result.rowCount ?? 0;
}

/**
 * プロジェクト内の指示一覧を取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param instructionStatus 指示送信ステータス（0=未送信、1=送信済、省略時は全件）
 * @returns 指示一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string,
  instructionStatus?: number
): Promise<ProjectInstruction[]> {
  const pool = getPool();
  
  let query = `
    SELECT *
    FROM project_instruction
    WHERE organization_id = $1 AND project_id = $2
  `;
  
  const params: any[] = [organizationId, projectId];
  
  if (instructionStatus !== undefined) {
    query += ` AND instruction_status = $3`;
    params.push(instructionStatus);
  }
  
  query += ` ORDER BY create_at ASC`;
  
  const result = await pool.query<ProjectInstruction>(query, params);
  return result.rows;
}

/**
 * 指示を1件取得
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param experimentInstructionId 実験指示ID
 * @returns 指示（見つからない場合null）
 */
export async function findById(
  organizationId: string,
  projectId: string,
  experimentInstructionId: string
): Promise<ProjectInstruction | null> {
  const pool = getPool();
  
  const query = `
    SELECT *
    FROM project_instruction
    WHERE organization_id = $1
      AND project_id = $2
      AND experiment_instruction_id = $3
  `;
  
  const result = await pool.query<ProjectInstruction>(query, [
    organizationId,
    projectId,
    experimentInstructionId
  ]);
  
  return result.rows[0] || null;
}

/**
 * 指示を削除（未送信のみ: status=0）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param experimentInstructionId 実験指示ID
 * @returns 削除された場合true、見つからないまたは送信済の場合false
 */
export async function deleteById(
  organizationId: string,
  projectId: string,
  experimentInstructionId: string
): Promise<boolean> {
  const pool = getPool();
  
  const query = `
    DELETE FROM project_instruction
    WHERE organization_id = $1
      AND project_id = $2
      AND experiment_instruction_id = $3
      AND instruction_status = 0
  `;
  
  const result = await pool.query(query, [organizationId, projectId, experimentInstructionId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * 未送信指示の存在確認（チェックアウト前バリデーション用）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 未送信指示が存在する場合true
 */
export async function hasUnsentInstructions(
  organizationId: string,
  projectId: string
): Promise<boolean> {
  const pool = getPool();
  
  // Parameterized Query使用（SQLインジェクション対策）
  // organization_idフィルタ必須（マルチテナント分離）
  // instruction_status = 0 が未送信
  const query = `
    SELECT COUNT(*) as count
    FROM project_instruction
    WHERE organization_id = $1 AND project_id = $2 AND instruction_status = 0
  `;
  
  const result = await pool.query<{ count: string }>(query, [organizationId, projectId]);
  const count = parseInt(result.rows[0].count, 10);
  return count > 0;
}
