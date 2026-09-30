/**
 * TransitionDataRepository
 * 
 * transition_dataテーブルへのデータアクセスを担当するリポジトリ
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { TransitionStatus, TransitionStatusEnum } from '../types/transitionData';
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
  status: TransitionStatus; // 数値型（1-7）
  /** 記録済みフラグ（TRUE=記録済み、FALSE=未記録） */
  is_recorded: boolean;
  update_user_id: string;
  update_at: Date;
  create_at: Date;
}

/**
 * トランジションステータス更新用データ
 */
export interface TransitionDataUpdate {
  status: TransitionStatus; // 数値型（1-7）
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
   * @param updateData - 更新データ（status, comment, updated_by）
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
        TransitionStatusEnum.INITIAL,   // status: 初期値（1 = INITIAL）
        workOrder,                      // work_order: 実行順序
        prerequisiteTransitionIds,      // prerequisite_transition_ids: 前提トランジションID配列
        userId,                         // create_user_id
        userId,                         // update_user_id
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
   * 記録済みフラグを更新
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param taskNo - タスク番号
   * @param transitionId - トランジションID
   * @param isRecorded - 記録済みフラグ値
   * @param updatedBy - 更新者ユーザーID
   * @param client - トランザクション用PoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async updateIsRecorded(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    transitionId: string,
    isRecorded: boolean,
    updatedBy: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/updateIsRecorded.sql');
      const params = [
        isRecorded,
        updatedBy,
        organizationId,
        projectId,
        methodId,
        taskNo,
        transitionId,
      ];
      await client.query(query, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while updating is_recorded flag',
        error as Error
      );
    }
  }

  /**
   * チェックアウト後にPREPARING状態になったトランジション一覧を取得
   *
   * updateStatusForCheckout 呼び出し直後に実行し、
   * イベントログ記録対象のトランジション情報を返す。
   *
   * @param client PoolClient（トランザクション内で呼び出すこと）
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @returns チェックアウト対象トランジション（method_id / task_no / transition_id）の配列
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findPreparedForCheckout(
    client: PoolClient,
    organizationId: string,
    projectId: string
  ): Promise<Array<{ method_id: string; task_no: number; transition_id: string }>> {
    try {
      const query = await loadSqlFile('transition_data/findPreparedByCheckout.sql');
      const result = await client.query(query, [organizationId, projectId]);
      return result.rows;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding prepared transitions for checkout',
        error as Error
      );
    }
  }

  /**
   * プロジェクト配下のトランジション総数を取得（task_no > 0 の実績行のみ対象）
   *
   * チェックアウト時のバリデーションで使用。
   * task_no=0 は順序管理行（status=NULL）のため除外する。
   *
   * @param client PoolClient（トランザクション内で呼び出すこと）
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @returns トランジション総数（0件 = トランジション未登録）
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async countByProject(
    client: PoolClient,
    organizationId: string,
    projectId: string
  ): Promise<number> {
    try {
      const query = await loadSqlFile('transition_data/countByProject.sql');
      const result = await client.query(query, [organizationId, projectId]);
      return parseInt(result.rows[0]?.count ?? '0', 10);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while counting transitions by project',
        error as Error
      );
    }
  }

  /**
   * チェックアウト時のトランジションステータス一括更新
   *
   * prerequisite_transition_ids が空配列（前提なし）のトランジションを
   * 「1: 初期状態」→「2: 準備状態」に一括更新する。
   * prerequisite_transition_ids が設定されているトランジションは「1: 初期状態」のまま据え置く。
   *
   * @param client PoolClient（トランザクション内で呼び出すこと）
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param userId 更新者ユーザーID
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async updateStatusForCheckout(
    client: PoolClient,
    organizationId: string,
    projectId: string,
    userId: string
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/updateStatusForCheckout.sql');
      await client.query(query, [organizationId, projectId, userId]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while updating transition status for checkout',
        error as Error
      );
    }
  }

  /**
   * 前提トランジション完了時の連鎖更新対象取得
   *
   * 指定した完了トランジションIDを prerequisite_transition_ids に含む、
   * 同プロジェクト内の INITIAL(1) なトランジションを返す。
   *
   * @param client PoolClient（トランザクション内で呼び出すこと）
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param completedTransitionId 完了したトランジションID
   * @returns 連鎖更新対象のトランジション情報の配列
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findDependentTransitions(
    client: PoolClient,
    organizationId: string,
    projectId: string,
    completedTransitionId: string
  ): Promise<Array<{ method_id: string; task_no: number; transition_id: string; prerequisite_transition_ids: string[] }>> {
    try {
      const query = await loadSqlFile('transition_data/findDependentTransitions.sql');
      const result = await client.query(query, [organizationId, projectId, completedTransitionId]);
      return result.rows;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding dependent transitions',
        error as Error
      );
    }
  }


  /**
   * トランジションの前提ID配列を更新（実験計画保存時の同期用）
   *
   * 実験計画ダイアログで前提設定が変更された際に、
   * transition_data.prerequisite_transition_ids を最新状態に同期する。
   * task_no=0（順序管理行）は対象外（task_no > 0 の実績行のみ更新）。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param methodId - メソッドID
   * @param transitionId - トランジションID
   * @param prerequisiteTransitionIds - 新しい前提トランジションID配列
   * @param userId - 更新者ユーザーID
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async updatePrerequisiteIds(
    organizationId: string,
    projectId: string,
    methodId: string,
    transitionId: string,
    prerequisiteTransitionIds: string[],
    userId: string
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/updatePrerequisiteIds.sql');
      await getPgp().none(query, [
        organizationId,
        projectId,
        methodId,
        transitionId,
        prerequisiteTransitionIds,
        userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while updating prerequisite transition ids',
        error as Error
      );
    }
  }

  /**
   * プロジェクト内の未着手タスクのトランジション実績のみ削除（タスク登録再保存時）
   *
   * project_task_detail.task_status=0（未着手）の (method_id, task_no) に紐づく
   * transition_data のみを削除する。実行中・完了済みタスクの実績は保護される。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param client - トランザクション用PoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async deleteByProjectAndPendingTasks(
    organizationId: string,
    projectId: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const query = await loadSqlFile('transition_data/deleteByProjectAndPendingTasks.sql');
      await client.query(query, [organizationId, projectId]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while deleting pending transition data by project',
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

  /**
   * プロジェクト配下の未完了トランジション一覧を取得
   *
   * 強制終了時の EventLog 記録に必要な情報（method_id / task_no / transition_id）を返す。
   * 対象: status が INITIAL(0)/PREPARING(1)/READY(2)/IN_PROGRESS(3)/PAUSED(4) のレコード。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param client - トランザクション用 PoolClient
   * @returns 未完了トランジション行の配列
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findActiveByProject(
    organizationId: string,
    projectId: string,
    client: PoolClient
  ): Promise<Array<{ method_id: string; task_no: number; transition_id: string; status: number }>> {
    try {
      const query = await loadSqlFile('transition_data/findActiveByProject.sql');
      const result = await client.query(query, [organizationId, projectId]);
      return result.rows;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while finding active transitions by project',
        error as Error
      );
    }
  }

  /**
   * プロジェクト配下の未完了トランジションを一括 ERROR に更新
   *
   * 強制終了処理のトランジション一括更新に使用する。
   * 対象: status が INITIAL(0)/PREPARING(1)/READY(2)/IN_PROGRESS(3)/PAUSED(4) のレコード。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param errorStatus - 変更先ステータス（TransitionStatusEnum.ERROR = 6）
   * @param updatedBy - 更新者ユーザーID
   * @param client - トランザクション用 PoolClient
   * @returns 更新件数
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async bulkUpdateStatusByProject(
    organizationId: string,
    projectId: string,
    errorStatus: TransitionStatus,
    updatedBy: string,
    client: PoolClient
  ): Promise<number> {
    try {
      const query = await loadSqlFile('transition_data/bulkUpdateStatusByProject.sql');
      const result = await client.query(query, [errorStatus, updatedBy, organizationId, projectId]);
      return result.rowCount ?? 0;
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while bulk updating transition status by project',
        error as Error
      );
    }
  }
}
