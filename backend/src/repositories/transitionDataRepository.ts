/**
 * TransitionDataRepository
 * 
 * transition_dataテーブルへのデータアクセスを担当するリポジトリ
 */

import { getPool } from '../database/db';
import { Status } from '../types/transitionData';

/**
 * トランジションデータのデータベース行型
 */
export interface TransitionDataRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status: Status;
  progress_rate: number;
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}

/**
 * トランジションステータス更新用データ
 */
export interface TransitionDataUpdate {
  status: Status;
  progress_rate: number;
  updated_by: string;
}

/**
 * トランジションが見つからない場合のエラー
 */
export class TransitionNotFoundError extends Error {
  constructor(message: string = 'Transition not found') {
    super(message);
    this.name = 'TransitionNotFoundError';
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends Error {
  originalError?: Error;

  constructor(message: string = 'Database error', originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * TransitionDataRepository
 * 
 * transition_dataテーブルへのCRUD操作を提供します。
 * すべての操作でorganization_idによるマルチテナント分離を保証します。
 */
export class TransitionDataRepository {
  /**
   * トランジションIDでレコードを検索
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @returns トランジションデータ、見つからない場合はnull
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findByTransitionId(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string
  ): Promise<TransitionDataRow | null> {
    try {
      const pool = getPool();
      
      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを必須とし、マルチテナント分離を保証
      const query = `
        SELECT
          organization_id,
          project_id,
          method_id,
          task_no,
          transition_id,
          status,
          progress_rate,
          comment,
          updated_by,
          updated_at,
          created_at
        FROM transition_data
        WHERE organization_id = $1
          AND project_id = $2
          AND method_id = $3
          AND task_no = $4
          AND transition_id = $5
      `;

      const params = [organizationId, projectId, methodId, taskNo, transitionId];
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as TransitionDataRow;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding transition',
        error as Error
      );
    }
  }

  /**
   * トランジションの最新実験記録を取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @returns 最新のトランジションデータ、見つからない場合はnull
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async getLatestRecordByTransition(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string
  ): Promise<TransitionDataRow | null> {
    try {
      const pool = getPool();
      
      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを必須とし、マルチテナント分離を保証
      // ORDER BY updated_at DESC LIMIT 1で最新レコードのみを取得
      const query = `
        SELECT
          organization_id,
          project_id,
          method_id,
          task_no,
          transition_id,
          status,
          progress_rate,
          comment,
          updated_by,
          updated_at,
          created_at
        FROM transition_data
        WHERE organization_id = $1
          AND project_id = $2
          AND method_id = $3
          AND task_no = $4
          AND transition_id = $5
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const params = [organizationId, projectId, methodId, taskNo, transitionId];
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as TransitionDataRow;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while getting latest transition record',
        error as Error
      );
    }
  }

  /**
   * トランジションのステータスを更新
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @param updateData - 更新データ（status, progress_rate, comment, updated_by）
   * @returns 更新後のトランジションデータ
   * @throws {TransitionNotFoundError} トランジションが見つからない場合
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async updateStatus(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string,
    updateData: TransitionDataUpdate
  ): Promise<TransitionDataRow> {
    try {
      const pool = getPool();

      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを必須とし、マルチテナント分離を保証
      const query = `
        UPDATE transition_data
        SET
          status = $1,
          progress_rate = $2,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE organization_id = $4
          AND project_id = $5
          AND method_id = $6
          AND task_no = $7
          AND transition_id = $8
        RETURNING
          organization_id,
          project_id,
          method_id,
          task_no,
          transition_id,
          status,
          progress_rate,
          comment,
          updated_by,
          updated_at,
          created_at
      `;

      const params = [
        updateData.status,
        updateData.progress_rate,
        updateData.updated_by,
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      ];

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        throw new TransitionNotFoundError(
          `Transition not found: organizationId=${organizationId}, projectId=${projectId}, methodId=${methodId}, taskNo=${taskNo}, transitionId=${transitionId}`
        );
      }

      return result.rows[0] as TransitionDataRow;
    } catch (error) {
      // TransitionNotFoundErrorはそのままスロー
      if (error instanceof TransitionNotFoundError) {
        throw error;
      }

      // その他のエラーはDatabaseErrorでラップ
      throw new DatabaseError(
        'Database error occurred while updating transition status',
        error as Error
      );
    }
  }
}