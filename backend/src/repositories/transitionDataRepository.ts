/**
 * TransitionDataRepository
 * 
 * transition_dataテーブルへのデータアクセスを担当するリポジトリ
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { TransitionStatus } from '../types/transitionData';
import type { PoolClient } from 'pg';
import type { TransitionProgressRow, TransitionForUpdate } from '../types/database';

/**
 * トランジションデータのデータベース行型
 */
export interface TransitionDataRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  transition_id: string;
  status: TransitionStatus; // 数値型（0-6）
  progress_rate: number;
  update_user_id: string;
  update_at: Date;
  create_at: Date;
}

/**
 * トランジションステータス更新用データ
 */
export interface TransitionDataUpdate {
  status: TransitionStatus; // 数値型（0-6）
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
      const pgp = getPgp();
      
      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('transition_data/findById.sql');
      
      const params = [organizationId, projectId, methodId, taskNo, transitionId];
      
      // pg-promiseのoneOrNoneメソッドを使用（0または1件の結果を期待）
      const result = await pgp.oneOrNone<TransitionDataRow>(query, params);

      return result;
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
      const pgp = getPgp();
      
      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('transition_data/getLatestRecord.sql');

      const params = [organizationId, projectId, methodId, taskNo, transitionId];
      
      // pg-promiseのoneOrNoneメソッドを使用（0または1件の結果を期待）
      const result = await pgp.oneOrNone<TransitionDataRow>(query, params);

      return result;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while getting latest transition record',
        error as Error
      );
    }
  }

  /**
   * トランジションのレコード数を取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @returns データ件数
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async countRecordsByTransition(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string
  ): Promise<number> {
    try {
      const pgp = getPgp();
      
      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('transition_data/countRecordsByTransition.sql');

      const params = [organizationId, projectId, methodId, taskNo, transitionId];
      
      // pg-promiseのoneメソッドを使用（必ず1件の結果を期待）
      const result = await pgp.one<{ count: string }>(query, params);

      // PostgreSQLはCOUNTの結果を文字列で返すため、数値に変換
      const count = parseInt(result.count, 10);
      return count;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while counting transition records',
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
      const pgp = getPgp();

      // 外部SQLファイルを読み込み
      const query = await loadSqlFile('transition_data/updateStatus.sql');

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

      // pg-promiseのoneOrNoneメソッドを使用（0または1件の結果を期待）
      const result = await pgp.oneOrNone<TransitionDataRow>(query, params);

      if (!result) {
        throw new TransitionNotFoundError(
          `Transition not found: organizationId=${organizationId}, projectId=${projectId}, methodId=${methodId}, taskNo=${taskNo}, transitionId=${transitionId}`
        );
      }

      return result;
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

  /**
   * トランジション実績を1件INSERT（タスク登録時の初期レコード作成用）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @param userId - 作成・更新ユーザーID
   * @param client - トランザクション用PoolClient
   * @param workOrder - 実行順序（実験計画の __meta__.transitionOrder.order から設定。デフォルト: 0）
   * @param prerequisiteTransitionIds - 前提トランジションID配列（デフォルト: 空配列）
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async insert(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string,
    userId: string,
    client: PoolClient,
    workOrder: number = 0,
    prerequisiteTransitionIds: string[] = []
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/insert.sql');
      const params = [
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
        0,                          // status: 初期値0
        0,                          // progress_rate: 初期値0
        workOrder,                  // work_order: 実行順序
        prerequisiteTransitionIds,  // prerequisite_transition_ids: 前提トランジションID配列
        userId,                     // create_user_id
        userId,                     // update_user_id
      ];
      await client.query(query, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting transition data',
        error as Error
      );
    }
  }

  /**
   * みなし進捗によるトランジションステータス更新（バリデーションなし）
   * 
   * 実験データ一括保存API から呼び出される。
   * progressService.validateStatusTransition() を経由せず、直接ステータスを更新する。
   * レコードが存在しない場合は何もしない（silent skip）。
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @param status - 新しいステータス（数値型）
   * @param progressRate - 進捗率（0-100）
   * @param updatedBy - 更新者ユーザーID
   * @param client - トランザクション用PoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async updateStatusDeemed(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string,
    status: TransitionStatus,
    progressRate: number,
    updatedBy: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/updateStatus.sql');

      const params = [
        status,
        progressRate,
        updatedBy,
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId
      ];

      // レコードが存在しない場合は何もしない（silent skip）
      await client.query(query, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while updating transition status (deemed progress)',
        error as Error
      );
    }
  }

  /**
   * タスクに紐づくトランジション進捗一覧を取得
   *
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param taskNo タスク番号
   * @returns トランジション進捗行の配列
   */
  async findByTask(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number
  ): Promise<TransitionProgressRow[]> {
    try {
      const pgp = getPgp();
      const query = await loadSqlFile('transition_data/findByTask.sql');
      return await pgp.any<TransitionProgressRow>(query, [organizationId, projectId, methodId, taskNo]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding transitions by task',
        error as Error
      );
    }
  }

  /**
   * トランジションIDでレコードを排他ロック付きで取得（トランザクション内用）
   *
   * @param client PoolClient（トランザクション）
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param transitionId トランジションID
   * @returns トランジション行（見つからない場合はnull）
   */
  async findByTransitionIdForUpdate(
    client: PoolClient,
    organizationId: string,
    projectId: string,
    methodId: string,
    transitionId: string
  ): Promise<TransitionForUpdate | null> {
    try {
      const query = await loadSqlFile('transition_data/findByTransitionId.sql');
      const result = await client.query(query, [organizationId, projectId, methodId, transitionId]);
      return result.rows[0] ?? null;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding transition by id for update',
        error as Error
      );
    }
  }

  /**
   * プロジェクト内のトランジション実績を全件削除（タスク登録再保存時）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param client - トランザクション用PoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async deleteByProject(
    organizationId: string,
    projectId: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/deleteByProject.sql');
      await client.query(query, [organizationId, projectId]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while deleting transition data by project',
        error as Error
      );
    }
  }
}
