/**
 * InstructionRepository
 * 
 * project_instructionテーブルへのデータアクセス層
 */

import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { InstructionInput } from '../types/instruction';

/**
 * InstructionRepositoryクラス
 */
export class InstructionRepository {
  /**
   * 複数の指示を一括作成
   * 
   * @param instructions - 指示入力データの配列
   * @param projectId - プロジェクトID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param userId - 指示作成者のユーザーID
   * @param client - トランザクション用のPoolClient（必須）
   */
  async createInstructions(
    instructions: InstructionInput[],
    projectId: string,
    organizationId: string,
    userId: string,
    client: PoolClient
  ): Promise<void> {
    // 空配列の場合は何もしない
    if (instructions.length === 0) {
      return;
    }

    // 一括INSERT用のVALUES句を構築
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    for (const instruction of instructions) {
      // UUID v4生成（Node.js 18+のcrypto.randomUUID使用）
      const instructionId = randomUUID();
      
      // 現在日時
      const now = new Date();

      // パラメータを追加
      values.push(
        organizationId,           // $1, $11, $21...
        projectId,                // $2, $12, $22...
        instructionId,            // $3, $13, $23...
        instruction.targetType,   // $4, $14, $24... (instruction_target)
        instruction.priority,     // $5, $15, $25...
        instruction.type,         // $6, $16, $26...
        instruction.taskNumber,   // $7, $17, $27... (task_no)
        instruction.transitionId, // $8, $18, $28... (transition_id)
        instruction.content,      // $9, $19, $29... (instructions)
        userId,                   // $10, $20, $30... (instruction_user_id)
        now                       // $11, $21, $31... (instruction_date)
      );

      // プレースホルダーを作成 ($1, $2, $3, ...)
      const placeholders = [];
      for (let i = 0; i < 11; i++) {
        placeholders.push(`$${paramIndex++}`);
      }
      valuePlaceholders.push(`(${placeholders.join(', ')})`);
    }

    // Parameterized Query（SQLインジェクション対策）
    // organization_idフィルタ必須（マルチテナント分離）
    const query = `
      INSERT INTO project_instruction (
        organization_id,
        project_id,
        experiment_instruction_id,
        instruction_target,
        priority,
        type,
        task_no,
        transition_id,
        instructions,
        instruction_user_id,
        instruction_date
      )
      VALUES ${valuePlaceholders.join(', ')}
    `;

    await client.query(query, values);
  }
}
