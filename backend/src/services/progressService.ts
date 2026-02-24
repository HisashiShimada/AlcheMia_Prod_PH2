/**
 * ProgressService
 * 
 * @description 進捗データ取得サービス
 * Feature: progress-data-retrieval-api
 * Task: 4.1 getProgressDataメソッドの基本構造実装
 */

import { TaskRepository } from '../repositories/taskRepository';
import { TransitionDataRepository, TransitionDataRow } from '../repositories/transitionDataRepository';
import { EventLogRepository } from '../repositories/eventLogRepository';
import { getStorageService } from './storageService';
import { parsePetriNetStructure } from './maimlService';
import { Result } from '../types/service';
import { 
  TransitionStatusEnum, 
  TransitionStatus as TransitionStatusNumber, 
  TransitionData, 
  TransitionDataUpdate,
  getTransitionStatusLabel 
} from '../types/transitionData';
import {
  ProgressData,
  ProgressServiceError,
  TaskWithProject,
  ParsedMethod,
  TransitionProgress,
  OverallProgress,
  TransitionStatus as TransitionStatusString
} from '../types/progress';
import { logger } from '../utils/logger';
import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * ステータス遷移マトリクス（数値型）
 * 
 * @remarks
 * データベース定義に基づく遷移ルール
 */
export const ALLOWED_TRANSITIONS: Record<TransitionStatusNumber, TransitionStatusNumber[]> = {
  [TransitionStatusEnum.INITIAL]: [TransitionStatusEnum.PREPARING, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.PREPARING]: [TransitionStatusEnum.READY, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.READY]: [TransitionStatusEnum.READY, TransitionStatusEnum.IN_PROGRESS, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.IN_PROGRESS]: [TransitionStatusEnum.PAUSED, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.PAUSED]: [TransitionStatusEnum.IN_PROGRESS, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.COMPLETED]: [],
  [TransitionStatusEnum.ERROR]: []
};

/**
 * ステータス遷移エラー
 */
export class InvalidStatusTransitionError extends Error {
  constructor(fromStatus: TransitionStatusNumber, toStatus: TransitionStatusNumber) {
    const fromLabel = getTransitionStatusLabel(fromStatus);
    const toLabel = getTransitionStatusLabel(toStatus);
    
    if (fromStatus === TransitionStatusEnum.COMPLETED || fromStatus === TransitionStatusEnum.ERROR) {
      super(`Cannot change status from terminal state '${fromLabel}' (${fromStatus}). Terminal states (completed, error) cannot be changed.`);
    } else {
      const allowedLabels = ALLOWED_TRANSITIONS[fromStatus]
        .map(s => `${getTransitionStatusLabel(s)} (${s})`)
        .join(', ');
      super(`Invalid status transition from '${fromLabel}' (${fromStatus}) to '${toLabel}' (${toStatus}). Allowed transitions: ${allowedLabels}`);
    }
    this.name = 'InvalidStatusTransitionError';
  }
}

/**
 * ProgressServiceクラス
 * 
 * @description 進捗データ取得のビジネスロジックを統合
 * @requirements Requirement 1, 4, 5, 8, 9
 */
export class ProgressService {
  private eventLogRepository: EventLogRepository;

  constructor(
    private taskRepository: TaskRepository,
    private transitionDataRepository: TransitionDataRepository,
    eventLogRepository?: EventLogRepository
  ) {
    this.eventLogRepository = eventLogRepository || new EventLogRepository();
  }

  /**
   * 進捗データ取得
   * 
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param taskNo タスク連番
   * @param organizationId 組織ID（マルチテナント分離）
   * @returns 進捗データまたはエラー
   * @requirements Requirement 1: 進捗データ取得機能
   */
  async getProgressData(
    projectId: string,
    methodId: string,
    taskNo: number,
    organizationId: string
  ): Promise<Result<ProgressData, ProgressServiceError>> {
    const startTime = Date.now();
    
    // APIリクエスト受信時のログ記録
    logger.info('[ProgressService] 進捗データ取得開始', {
      projectId,
      methodId,
      taskNo,
      organizationId,
      timestamp: new Date().toISOString()
    });

    try {
      // Step 1: タスク基本情報取得
      const queryStartTime = Date.now();
      const task = await this.getTaskBasicInfo(
        projectId,
        methodId,
        taskNo,
        organizationId
      );
      const queryDuration = Date.now() - queryStartTime;

      // データベースクエリ実行時間のログ記録
      logger.debug('[ProgressService] データベースクエリ実行', {
        operation: 'getTaskBasicInfo',
        duration: queryDuration
      });

      // クエリ実行時間が閾値を超える場合は警告
      if (queryDuration > 100) {
        logger.warn('[ProgressService] クエリ実行時間が閾値を超過', {
          operation: 'getTaskBasicInfo',
          duration: queryDuration,
          threshold: 100
        });
      }

      if (!task) {
        const duration = Date.now() - startTime;
        
        logger.warn('[ProgressService] タスクが見つかりません', {
          projectId,
          methodId,
          taskNo,
          organizationId,
          success: false,
          errorCode: 'TASK_NOT_FOUND',
          duration
        });
        
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'タスクが見つかりません'
          }
        };
      }

      // Step 2: MAIMLファイルのダウンロードとパース
      const maimlResult = await this.downloadAndParseMAIML(
        task.project_name,
        organizationId
      );

      if (!maimlResult.success) {
        const duration = Date.now() - startTime;
        
        logger.warn('[ProgressService] MAIMLファイル処理失敗', {
          projectName: task.project_name,
          organizationId,
          errorCode: maimlResult.error.code,
          success: false,
          duration
        });
        
        return {
          success: false,
          error: maimlResult.error
        };
      }

      // Step 3: メソッド検索
      const method = this.findMethodById(maimlResult.methods, methodId);

      if (!method) {
        const duration = Date.now() - startTime;
        const availableMethods = maimlResult.methods.map(m => m.methodId);
        
        logger.warn('[ProgressService] メソッドが見つかりません', {
          methodId,
          availableMethods,
          success: false,
          errorCode: 'METHOD_NOT_FOUND',
          duration
        });
        
        return {
          success: false,
          error: {
            code: 'METHOD_NOT_FOUND',
            message: `メソッドが見つかりません: ${methodId}`
          }
        };
      }

      // Step 4: トランジション進捗データの取得（並列処理）
      const transitionStartTime = Date.now();
      const transitions = await this.getTransitionsProgress(
        method.petriNet.transitions,
        organizationId,
        projectId,
        methodId,
        taskNo
      );
      const transitionDuration = Date.now() - transitionStartTime;

      // 並列処理の実行時間をデバッグログに記録
      logger.debug('[ProgressService] トランジション進捗取得完了', {
        transitionCount: transitions.length,
        duration: transitionDuration
      });

      // Step 5: 全体進捗の計算
      const overallProgress = this.calculateOverallProgress(transitions);

      // Step 6: レスポンスデータの構築
      const progressData: ProgressData = {
        project_id: task.project_id,
        project_name: task.project_name,
        method_id: task.method_id,
        method_name: method.methodName,
        task_no: task.task_no,
        task_name: task.task_name,
        transitions,
        overall_progress: overallProgress
      };

      const totalDuration = Date.now() - startTime;

      // 成功時のレスポンス情報と処理時間をログ記録
      logger.info('[ProgressService] 進捗データ取得完了', {
        success: true,
        transitionCount: transitions.length,
        duration: totalDuration
      });

      // 処理時間が閾値を超える場合は警告
      if (totalDuration > 1000) {
        logger.warn('[ProgressService] 処理時間が閾値を超過', {
          duration: totalDuration,
          threshold: 1000
        });
      }

      return {
        success: true,
        data: progressData
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      // エラー発生時にエラー詳細とスタックトレースをログ記録
      logger.error('[ProgressService] エラー', {
        projectId,
        methodId,
        taskNo,
        organizationId,
        error: err,
        errorMessage: err.message,
        errorStack: err.stack,
        duration
      });
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'データベースエラーが発生しました'
        }
      };
    }
  }

  /**
   * タスク基本情報取得
   * 
   * @private
   * @requirements Requirement 1, 3: 進捗データ取得、マルチテナント分離
   */
  private async getTaskBasicInfo(
    projectId: string,
    methodId: string,
    taskNo: number,
    organizationId: string
  ): Promise<TaskWithProject | null> {
    return await this.taskRepository.getTaskByProjectMethodTaskNo(
      projectId,
      methodId,
      taskNo,
      organizationId
    );
  }

  /**
   * MAIMLファイルのダウンロードとパース
   * 
   * @private
   * @requirements Requirement 4: MAIMLファイルとの連携
   */
  private async downloadAndParseMAIML(
    projectName: string,
    organizationId: string
  ): Promise<{ success: true; methods: ParsedMethod[] } | { success: false; error: ProgressServiceError }> {
    try {
      // MAIMLファイルパスを構築
      const filePath = `projects/${projectName}/${projectName}.maiml`;
      
      // ストレージサービスでダウンロード
      const storageService = getStorageService();
      const buffer = await storageService.downloadFile(organizationId, filePath);

      // MAIMLファイルダウンロード成功時のログ記録
      logger.info('[ProgressService] MAIMLファイルダウンロード成功', {
        filePath,
        fileSize: buffer.length,
        organizationId
      });
      
      // Buffer を文字列に変換
      const xmlContent = buffer.toString('utf-8');
      
      // MAIMLパーサーで構造を抽出
      const parseResult = await parsePetriNetStructure(xmlContent);
      
      if (!parseResult.success || !parseResult.methods) {
        return {
          success: false,
          error: {
            code: 'MAIML_PARSE_FAILED',
            message: 'MAIMLファイルの解析に失敗しました'
          }
        };
      }

      return {
        success: true,
        methods: parseResult.methods
      };

    } catch (error) {
      const err = error as Error;
      
      // MAIMLファイルダウンロード失敗時のエラーログ記録
      logger.error('[ProgressService] MAIMLダウンロードエラー', {
        error: err,
        projectName,
        organizationId,
        errorMessage: err.message
      });
      
      return {
        success: false,
        error: {
          code: 'MAIML_DOWNLOAD_FAILED',
          message: 'MAIMLファイルのダウンロードに失敗しました'
        }
      };
    }
  }

  /**
   * メソッドID検索
   * 
   * @private
   * @requirements Requirement 4: MAIMLファイルとの連携
   */
  private findMethodById(
    methods: ParsedMethod[],
    methodId: string
  ): ParsedMethod | undefined {
    return methods.find(m => m.methodId === methodId);
  }

  /**
   * トランジション進捗データ取得（並列処理）
   * 
   * @private
   * @requirements Requirement 1, 5, 8: 進捗データ取得、並列処理
   */
  private async getTransitionsProgress(
    transitions: any[],
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number
  ): Promise<TransitionProgress[]> {
    // Promise.allで並列処理
    return await Promise.all(
      transitions.map(async (transition) => {
        return await this.getSingleTransitionProgress(
          transition,
          organizationId,
          projectId,
          methodId,
          taskNo
        );
      })
    );
  }

  /**
   * 単一トランジションの進捗データ取得
   * 
   * @private
   * @requirements Requirement 1: 進捗データ取得機能
   */
  private async getSingleTransitionProgress(
    transition: any,
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number
  ): Promise<TransitionProgress> {
    try {
      // 最新レコード取得
      const latestRecord = await this.transitionDataRepository.getLatestRecordByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transition.id
      );

      // データ件数取得
      const dataCount = await this.transitionDataRepository.countRecordsByTransition(
        organizationId,
        projectId,
        methodId,
        taskNo,
        transition.id
      );

      // レコードが存在しない場合
      if (!latestRecord) {
        return {
          transition_id: transition.id,
          transition_name: transition.name || transition.id,
          status: 'not_started',
          progress: 0,
          last_updated: null,
          has_data: false,
          data_count: 0
        };
      }

      // Status型をTransitionStatus型に変換
      const transitionStatus = this.convertStatusToTransitionStatus(latestRecord.status);
      
      // ステータスと進捗率の整合性チェック
      const progress = this.normalizeProgress(transitionStatus, latestRecord.progress_rate);

      return {
        transition_id: transition.id,
        transition_name: transition.name || transition.id,
        status: transitionStatus,
        progress,
        last_updated: latestRecord.updated_at.toISOString(),
        has_data: dataCount > 0,
        data_count: dataCount
      };

    } catch (error) {
      console.error(`[ProgressService] トランジション進捗取得エラー: ${transition.id}`, error);
      
      // エラー時はnot_startedとして扱う
      return {
        transition_id: transition.id,
        transition_name: transition.name || transition.id,
        status: 'not_started',
        progress: 0,
        last_updated: null,
        has_data: false,
        data_count: 0
      };
    }
  }

  /**
   * TransitionStatus型（数値）をTransitionStatus型（表示用文字列）に変換
   * 
   * @private
   * @requirements Requirement 9: データ整合性
   */
  private convertStatusToTransitionStatus(status: TransitionStatusNumber): TransitionStatusString {
    // TransitionStatus（数値）からTransitionStatus（表示用文字列）へのマッピング
    switch (status) {
      case TransitionStatusEnum.COMPLETED:
        return 'completed';
      
      case TransitionStatusEnum.INITIAL:
        return 'not_started';
      
      case TransitionStatusEnum.PREPARING:
      case TransitionStatusEnum.READY:
      case TransitionStatusEnum.IN_PROGRESS:
      case TransitionStatusEnum.PAUSED:
        return 'in_progress';
      
      case TransitionStatusEnum.ERROR:
        // エラーの場合は進行中として扱う（エラー後も作業継続可能）
        return 'in_progress';
      
      default:
        return 'not_started';
    }
  }

  /**
   * ステータスと進捗率の正規化
   * 
   * @private
   * @requirements Requirement 9: データ整合性
   */
  private normalizeProgress(status: TransitionStatusString, progressRate: number): number {
    // ステータスに応じて進捗率を補正
    if (status === 'completed') {
      return 100;
    }
    
    if (status === 'not_started') {
      return 0;
    }

    // in_progressの場合は0-100の範囲に制限
    return Math.max(0, Math.min(100, progressRate));
  }

  /**
   * 全体進捗計算
   * 
   * @private
   * @requirements Requirement 1, 9: 進捗データ取得、データ整合性
   */
  private calculateOverallProgress(
    transitions: TransitionProgress[]
  ): OverallProgress {
    const totalTransitions = transitions.length;

    // トランジション数が0の場合
    if (totalTransitions === 0) {
      return {
        total_transitions: 0,
        completed: 0,
        in_progress: 0,
        not_started: 0,
        overall_percentage: 0
      };
    }

    // ステータスごとのカウント
    const completed = transitions.filter(t => t.status === 'completed').length;
    const inProgress = transitions.filter(t => t.status === 'in_progress').length;
    const notStarted = transitions.filter(t => t.status === 'not_started').length;

    // 全体進捗率の計算（全トランジションの進捗率の平均値）
    const totalProgress = transitions.reduce((sum, t) => sum + t.progress, 0);
    const overallPercentage = parseFloat((totalProgress / totalTransitions).toFixed(1));

    return {
      total_transitions: totalTransitions,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      overall_percentage: overallPercentage
    };
  }

  /**
   * ステータス遷移の妥当性を検証
   * 
   * @param fromStatus 現在のステータス（数値）
   * @param toStatus 新しいステータス（数値）
   * @throws InvalidStatusTransitionError 不正な遷移の場合
   */
  validateStatusTransition(fromStatus: TransitionStatusNumber, toStatus: TransitionStatusNumber): void {
    if (fromStatus === undefined || fromStatus === null || toStatus === undefined || toStatus === null) {
      throw new Error('Source and target status are required');
    }

    if (!(fromStatus in ALLOWED_TRANSITIONS)) {
      throw new Error(`Unknown status: ${fromStatus} (${getTransitionStatusLabel(fromStatus)})`);
    }
    if (!(toStatus in ALLOWED_TRANSITIONS)) {
      throw new Error(`Unknown status: ${toStatus} (${getTransitionStatusLabel(toStatus)})`);
    }

    const allowedTransitions = ALLOWED_TRANSITIONS[fromStatus];

    if (!allowedTransitions.includes(toStatus)) {
      throw new InvalidStatusTransitionError(fromStatus, toStatus);
    }
  }

  /**
   * トランジションステータスを更新
   * 
   * @param organizationId 組織ID
   * @param projectId プロジェクトID
   * @param methodId メソッドID
   * @param transitionId トランジションID
   * @param update 更新内容
   * @returns 更新後のトランジションデータ
   */
  async updateTransitionStatus(
    organizationId: string,
    projectId: string,
    methodId: string,
    transitionId: string,
    update: TransitionDataUpdate
  ): Promise<TransitionData> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. トランジションIDからmethod_idとtask_noを取得
      const findSql = await loadSqlFile('transition_data/findByTransitionId.sql');
      const findResult = await client.query(
        findSql,
        [organizationId, projectId, methodId, transitionId]
      );

      if (findResult.rows.length === 0) {
        const error: any = new Error('Transition not found');
        error.name = 'TransitionNotFoundError';
        throw error;
      }

      const { method_id, task_no, status: currentStatus } = findResult.rows[0];

      // 2. ステータス遷移ルールの検証
      this.validateStatusTransition(currentStatus, update.status);

      // 3. completedステータス時は進捗率を100%に自動設定
      const finalProgressRate = update.status === TransitionStatusEnum.COMPLETED 
        ? 100 
        : (update.progress_rate ?? 0);

      const finalUpdate = {
        status: update.status,
        progress_rate: finalProgressRate,
        updated_by: update.updated_by
      };

      // 4. トランジションステータスを更新
      const updatedTransition: TransitionDataRow = await this.transitionDataRepository.updateStatus(
        organizationId,
        projectId,
        method_id,
        task_no,
        transitionId,
        finalUpdate
      );

      // 5. イベントログを記録
      await this.eventLogRepository.logEvent(
        organizationId,
        projectId,
        {
          event_type: 'transition_status_update',
          method_id: method_id,
          task_no: task_no,
          transition_id: transitionId,
          status: update.status,
          progress_rate: finalProgressRate,
          comment: updatedTransition.comment || undefined,
          updated_by: update.updated_by,
          timestamp: new Date()
        },
        client
      );

      // 6. タスク進捗率を再計算
      const countSql = await loadSqlFile('transition_data/countByTask.sql');
      const countResult = await client.query(
        countSql,
        [organizationId, projectId, method_id, task_no]
      );
      const transitionCount = parseInt(countResult.rows[0].count, 10);

      const sumSql = await loadSqlFile('transition_data/sumProgressRateByTask.sql');
      const sumResult = await client.query(
        sumSql,
        [organizationId, projectId, method_id, task_no]
      );
      const progressSum = parseInt(sumResult.rows[0].sum, 10);

      const taskProgressRate = transitionCount > 0 ? Math.round(progressSum / transitionCount) : 0;

      const updateProgressSql = await loadSqlFile('project_tasks/updateProgressRate.sql');
      await client.query(
        updateProgressSql,
        [taskProgressRate, organizationId, projectId, method_id, task_no]
      );

      await client.query('COMMIT');

      return updatedTransition as unknown as TransitionData;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
