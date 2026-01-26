/**
 * ProjectRepository
 * 
 * プロジェクトテーブルへのデータアクセス層
 */

import { getPool } from '../database/db';
import { Project } from '../types/instruction';
import { PoolClient } from 'pg';

/**
 * ProjectRepositoryクラス
 */
export class ProjectRepository {
  /**
   * プロジェクトIDでプロジェクトを取得
   * 
   * @param projectId - プロジェクトID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @returns プロジェクト情報、存在しない場合はnull
   */
  async findById(
    projectId: string,
    organizationId: string
  ): Promise<Project | null> {
    const pool = getPool();

    // Parameterized Query使用（SQLインジェクション対策）
    // organization_idフィルタ必須（マルチテナント分離）
    const query = `
      SELECT 
        organization_id,
        project_id,
        project_name,
        project_status,
        project_overview,
        created_at,
        updated_at
      FROM project
      WHERE organization_id = $1
        AND project_id = $2
    `;

    const result = await pool.query(query, [organizationId, projectId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Project;
  }

  /**
   * プロジェクトステータスを更新
   * 
   * @param projectId - プロジェクトID
   * @param newStatus - 新しいステータス値
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param client - トランザクション用のクライアント（オプション）
   */
  async updateStatus(
    projectId: string,
    newStatus: number,
    organizationId: string,
    client?: PoolClient
  ): Promise<void> {
    // トランザクション引数がある場合はそれを使用、なければプールを使用
    const executor = client || getPool();

    // Parameterized Query使用（SQLインジェクション対策）
    // organization_idフィルタ必須（マルチテナント分離）
    const query = `
      UPDATE project
      SET 
        project_status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $2
        AND project_id = $3
    `;

    await executor.query(query, [newStatus, organizationId, projectId]);
  }
}
