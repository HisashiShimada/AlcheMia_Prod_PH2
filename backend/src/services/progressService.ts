/**
 * ProgressService
 * 
 * @description 進捗データ取得サービス
 * Feature: progress-data-retrieval-api
 * Task: 4.1 getProgressDataメソッドの基本構造実装
 */

import * as projectTaskRepository from '../repositories/projectTaskRepository';
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
  OverallProgress
} from '../types/progress';
import type {
  WorkProgressDetailResponse,
  ProjectInfoDetail,
  FileInfoDetail,
  WorkDetailItem,
  TransitionProgressItem
} from '../types/api';
import * as projectRepository from '../repositories/projectRepository';
import { logger } from '../utils/logger';
import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * ステータス遷移マトリクス（数値型）
 * 
 * @remarks
 * データベース定義に基づく遷移ルール
 */
export const ALLOWED_TRANSITIONS: Record<TransitionStatusNumber, TransitionStatusNumber[]> = {
  [TransitionStatusEnum.INITIAL]: [TransitionStatusEnum.INITIAL, TransitionStatusEnum.PREPARING, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.PREPARING]: [TransitionStatusEnum.PREPARING, TransitionStatusEnum.READY, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.READY]: [TransitionStatusEnum.READY, TransitionStatusEnum.IN_PROGRESS, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.IN_PROGRESS]: [TransitionStatusEnum.IN_PROGRESS, TransitionStatusEnum.PAUSED, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.PAUSED]: [TransitionStatusEnum.PAUSED, TransitionStatusEnum.IN_PROGRESS, TransitionStatusEnum.COMPLETED, TransitionStatusEnum.ERROR],
  [TransitionStatusEnum.COMPLETED]: [TransitionStatusEnum.COMPLETED],
  [TransitionStatusEnum.ERROR]: [TransitionStatusEnum.ERROR]
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
        method.transitions,
        method.places,
        method.arcs,
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
        method_name: task.method_id,  // method_idをメソッド名として使用
        task_no: task.task_no,        // project_task_detail.task_no
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
    return await projectTaskRepository.getTaskByProjectMethodTaskNo(
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
    places: any[],
    arcs: any[],
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
          places,
          arcs,
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
    places: any[],
    arcs: any[],
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number
  ): Promise<TransitionProgress> {
    // トランジションに接続するプレースIDを取得（アーク経由）
    const connectedPlaceIds: string[] = places
      .filter((p: any) => arcs.some((a: any) =>
        (a.source === transition.id && a.target === p.id) ||
        (a.target === transition.id && a.source === p.id)
      ))
      .map((p: any) => p.id);

    // MAIMLから取得した定義数を算出（ステレオタイプ別カウント）
    const materialCount = places.filter((p: any) =>
      connectedPlaceIds.includes(p.id) && p.data?.stereotype === 'materialTemplate'
    ).length;

    const conditionCount = places.filter((p: any) =>
      connectedPlaceIds.includes(p.id) && p.data?.stereotype === 'conditionTemplate'
    ).length;

    const resultCount = places.filter((p: any) =>
      connectedPlaceIds.includes(p.id) && p.data?.stereotype === 'resultTemplate'
    ).length;

    // DBから取得した実績数を算出
    let materialActualCount = 0;
    let conditionActualCount = 0;
    let resultActualCount = 0;

    if (connectedPlaceIds.length > 0) {
      try {
        const pgp = getPgp();
        const countSql = await loadSqlFile('template_data/countActualByPlaceIds.sql');
        const countRows = await pgp.any<{ template_type: string; count: string }>(
          countSql,
          [organizationId, projectId, methodId, taskNo, connectedPlaceIds]
        );

        for (const row of countRows) {
          if (row.template_type === 'material') {
            materialActualCount = Number(row.count);
          } else if (row.template_type === 'condition') {
            conditionActualCount = Number(row.count);
          } else if (row.template_type === 'result') {
            resultActualCount = Number(row.count);
          }
        }
      } catch (dbError) {
        logger.error(`[ProgressService] 実績数取得エラー: ${transition.id}`, { dbError });
        // エラー時は0のまま継続
      }
    }

    try {
      // 最新レコード取得
      const latestRecord = await this.transitionDataRepository.getLatestRecordByTransition(
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
          transition_name: transition.data?.label || transition.id,
          status: TransitionStatusEnum.INITIAL,
          progress: 0,
          last_updated: null,
          material_count: materialCount,
          material_actual_count: materialActualCount,
          condition_count: conditionCount,
          condition_actual_count: conditionActualCount,
          result_count: resultCount,
          result_actual_count: resultActualCount
        };
      }

      // ステータスと進捗率の整合性チェック
      const progress = this.normalizeProgress(latestRecord.status, latestRecord.progress_rate);

      return {
        transition_id: transition.id,
        transition_name: transition.data?.label || transition.id,
        status: latestRecord.status,
        progress,
        last_updated: latestRecord.update_at.toISOString(),
        material_count: materialCount,
        material_actual_count: materialActualCount,
        condition_count: conditionCount,
        condition_actual_count: conditionActualCount,
        result_count: resultCount,
        result_actual_count: resultActualCount
      };

    } catch (error) {
      logger.error(`[ProgressService] トランジション進捗取得エラー: ${transition.id}`, { error });

      // エラー時はINITIAL（未開始）として扱う
      return {
        transition_id: transition.id,
        transition_name: transition.data?.label || transition.id,
        status: TransitionStatusEnum.INITIAL,
        progress: 0,
        last_updated: null,
        material_count: materialCount,
        material_actual_count: materialActualCount,
        condition_count: conditionCount,
        condition_actual_count: conditionActualCount,
        result_count: resultCount,
        result_actual_count: resultActualCount
      };
    }
  }

  /**
   * ステータスと進捗率の正規化
   * 
   * @private
   * @requirements Requirement 9: データ整合性
   */
  private normalizeProgress(status: TransitionStatusNumber, progressRate: number): number {
    // ステータスに応じて進捗率を補正
    if (status === TransitionStatusEnum.COMPLETED) {
      return 100;
    }
    
    if (status === TransitionStatusEnum.INITIAL) {
      return 0;
    }

    // それ以外（PREPARING/READY/IN_PROGRESS/PAUSED/ERROR）は0-100の範囲に制限
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
    const completed = transitions.filter(t => t.status === TransitionStatusEnum.COMPLETED).length;
    const inProgress = transitions.filter(t => [
      TransitionStatusEnum.PREPARING,
      TransitionStatusEnum.READY,
      TransitionStatusEnum.IN_PROGRESS,
      TransitionStatusEnum.PAUSED,
      TransitionStatusEnum.ERROR
    ].includes(t.status as TransitionStatusNumber)).length;
    const notStarted = transitions.filter(t => t.status === TransitionStatusEnum.INITIAL).length;

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
   * WorkProgressDetailDialog 用の作業詳細データを一括取得
   *
   * @param projectName プロジェクト名（URL パスパラメータ）
   * @param organizationId 組織ID（マルチテナント分離）
   * @returns WorkProgressDetailResponse または ProgressServiceError
   * @remarks
   *   projectInfo / fileInfo / workDetails（transitionProgress 含む）を一括返却する。
   *   MAIML ファイルはキャッシュせず毎回ダウンロードするが、
   *   プロジェクト内の全タスクのトランジション進捗取得は Promise.all で並列実行する。
   */
  async getWorkDetails(
    projectName: string,
    organizationId: string
  ): Promise<Result<WorkProgressDetailResponse, ProgressServiceError>> {
    const startTime = Date.now();
    logger.info('[ProgressService.getWorkDetails] 開始', { projectName, organizationId });

    try {
      // ─────────────────────────────────────────────
      // Step 1: プロジェクト基本情報を DB から取得
      // ─────────────────────────────────────────────
      const pgp = getPgp();

      const projectSql = await loadSqlFile('projects/findWithOwnerAndDept.sql');
      const projectRows = await pgp.any<{
        organization_id: string;
        project_id: string;
        project_name: string;
        description: string | null;
        department_cd: string | null;
        department_name: string | null;
        owner_user_id: string | null;
        owner_name: string | null;
        project_status: number;
        checkout_status: number | null;
        create_at: Date;
        update_at: Date;
      }>(projectSql, [projectName, organizationId]);

      if (projectRows.length === 0) {
        logger.warn('[ProgressService.getWorkDetails] プロジェクトが見つかりません', { projectName, organizationId });
        return { success: false, error: { code: 'TASK_NOT_FOUND', message: 'プロジェクトが見つかりません' } };
      }

      const proj = projectRows[0];

      // ─────────────────────────────────────────────
      // Step 2: MAIML ダウンロード & パース
      // ─────────────────────────────────────────────
      const maimlResult = await this.downloadAndParseMAIML(projectName, organizationId);
      if (!maimlResult.success) {
        return { success: false, error: maimlResult.error };
      }

      const methodIds = maimlResult.methods.map((m: ParsedMethod) => m.methodId);

      // ─────────────────────────────────────────────
      // Step 3: プロジェクトステータス → 文字列変換
      // ─────────────────────────────────────────────
      const PROJECT_STATUS_MAP: Record<number, ProjectInfoDetail['status']> = {
        0: 'planning',
        1: 'pending',
        2: 'in_progress',
        3: 'review_waiting',
        4: 'completed',
        5: 'error'
      };
      const statusStr: ProjectInfoDetail['status'] = PROJECT_STATUS_MAP[proj.project_status] ?? 'planning';

      // ─────────────────────────────────────────────
      // Step 4: projectInfo / fileInfo を組み立て
      // ─────────────────────────────────────────────
      const maimlFileKey = `${organizationId}/projects/${projectName}/${projectName}.maiml`;

      const projectInfo: ProjectInfoDetail = {
        projectId: proj.project_id,
        projectName: proj.project_name,
        projectDescription: proj.description ?? undefined,
        owner: proj.owner_name ?? proj.owner_user_id ?? '',
        department: proj.department_name ?? proj.department_cd ?? undefined,
        status: statusStr,
        methods: methodIds,
        createdAt: proj.create_at ? proj.create_at.toISOString() : '',
        updatedAt: proj.update_at ? proj.update_at.toISOString() : ''
      };

      const fileInfo: FileInfoDetail = {
        fileName: `${projectName}.maiml`,
        maimlFileKey,
        organizationId,
        checkoutStatus: {
          isCheckedOut: proj.checkout_status !== null && proj.checkout_status !== 0,
          checkoutBy: null
        }
      };

      // ─────────────────────────────────────────────
      // Step 5: タスク一覧を DB から取得
      // ─────────────────────────────────────────────
      const taskSql = await loadSqlFile('project_tasks/findByProjectId.sql');
      const taskRows = await pgp.any<{
        organization_id: string;
        project_id: string;
        method_id: string;
        experiment_order: number;
        experiment_condition: number | null;
        attempts_count: number | null;
        create_at: Date;
        update_at: Date;
      }>(taskSql, [proj.project_id, organizationId]);

      // ─────────────────────────────────────────────
      // Step 6: タスクごとのトランジション進捗を並列取得
      // ─────────────────────────────────────────────
      const TRANSITION_STATUS_LABELS: Record<number, string> = {
        0: '未開始',
        1: '準備中',
        2: '作業中',
        3: '休止中',
        4: '作業中',
        5: '完了',
        6: '異常中'
      };

      const transitionSql = await loadSqlFile('transition_data/findByTask.sql');
      const taskDetailSql = await loadSqlFile('project_tasks/findTaskDetailsByMethodId.sql');

      const workDetails: WorkDetailItem[] = await Promise.all(
        taskRows.map(async (task) => {
          // workId は "{methodId}_{experimentOrder}" 形式
          const workId = `${task.method_id}_${task.experiment_order}`;

          // タスクに対応する MAIML メソッドのトランジション一覧を取得
          const method = maimlResult.methods.find((m: ParsedMethod) => m.methodId === task.method_id);
          const maimlTransitions: string[] = method
            ? method.transitions.map((t: any) => String(t.id ?? t.transitionId ?? t))
            : [];

          // DB からトランジション進捗を取得
          // project_task_detail から当該メソッドの task_no 一覧を取得し、
          // 各 task_no ごとに transition_data をクエリして全件集約する
          // （transition_data の主キー: organization_id, project_id, method_id, task_no, transition_id）
          const taskDetailRows = await pgp.any<{ task_no: number }>(
            taskDetailSql,
            [organizationId, proj.project_id, task.method_id]
          );

          // task_no 一覧が取得できない場合は空配列を返す
          const taskNos: number[] = taskDetailRows.map(r => Number(r.task_no));

          // 各 task_no の transition_data を並列取得してフラットに集約
          const tdRowsPerTaskNo = await Promise.all(
            taskNos.map(taskNo =>
              pgp.any<{
                transition_id: string;
                status: number;
                progress_rate: number;
                update_user_id: string | null;
                worker_name: string | null;
                create_at: Date;
                update_at: Date;
              }>(transitionSql, [organizationId, proj.project_id, task.method_id, taskNo])
            )
          );
          const tdRows = tdRowsPerTaskNo.flat();

          // DB にないトランジションも「未開始」として含める
          const tdMap = new Map(tdRows.map(r => [r.transition_id, r]));
          const allTransitionIds = maimlTransitions.length > 0
            ? maimlTransitions
            : tdRows.map(r => r.transition_id);

          const transitionProgress: TransitionProgressItem[] = allTransitionIds.map(tid => {
            const row = tdMap.get(tid);
            if (!row) {
              return {
                transitionId: tid,
                progressStatus: '未開始'
              };
            }
            return {
                transitionId: row.transition_id,
                progressStatus: TRANSITION_STATUS_LABELS[row.status] ?? '未開始',
                assignedWorker: row.worker_name ?? undefined,
                startDate: row.create_at ? row.create_at.toISOString() : undefined,
                endDate: row.status === 5 && row.update_at ? row.update_at.toISOString() : undefined
              };
          });

          // 統計情報の算出
          const totalTransitions = transitionProgress.length;
          const completedCount = tdRows.filter(r => r.status === 5).length;
          const workingCount = tdRows.filter(r => r.status >= 1 && r.status <= 4).length;
          const notStarted = totalTransitions - completedCount - workingCount;
          const completionRate = totalTransitions > 0
            ? Math.round((completedCount / totalTransitions) * 100)
            : 0;

          const workDetailItem: WorkDetailItem = {
            workId,
            taskNo: Number(task.experiment_order),
            methodName: task.method_id,
            workStatus: completedCount === totalTransitions && totalTransitions > 0 ? 'completed'
              : workingCount > 0 ? 'in_progress'
              : 'pending',
            progressPercentage: completionRate,
            stats: {
              totalTransitions,
              completed: completedCount,
              working: workingCount,
              notStarted: Math.max(0, notStarted),
              completionRate
            },
            transitionProgress
          };

          return workDetailItem;
        })
      );

      const totalDuration = Date.now() - startTime;
      logger.info('[ProgressService.getWorkDetails] 完了', {
        projectName,
        taskCount: workDetails.length,
        duration: totalDuration
      });

      return {
        success: true,
        data: {
          projectInfo,
          fileInfo,
          workDetails
        }
      };
    } catch (error) {
      const err = error as Error;
      logger.error('[ProgressService.getWorkDetails] エラー', {
        projectName,
        organizationId,
        errorMessage: err.message,
        errorStack: err.stack,
        duration: Date.now() - startTime
      });
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'データベースエラーが発生しました' }
      };
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
   * @param comment イベントログに記録するコメント（省略可）
   * @returns 更新後のトランジションデータ
   */
  async updateTransitionStatus(
    organizationId: string,
    projectId: string,
    methodId: string,
    transitionId: string,
    update: TransitionDataUpdate,
    comment?: string | null
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

      // 5. イベントログを記録（指定のXML構造を模したJSONフォーマット）
      // トランジションステータス数値 → ラベル文字列 のマッピング
      const transitionStatusLabelMap: Record<number, string> = {
        [TransitionStatusEnum.INITIAL]: 'initial',
        [TransitionStatusEnum.PREPARING]: 'preparing',
        [TransitionStatusEnum.READY]: 'ready',
        [TransitionStatusEnum.IN_PROGRESS]: 'running',
        [TransitionStatusEnum.PAUSED]: 'paused',
        [TransitionStatusEnum.COMPLETED]: 'completed',
        [TransitionStatusEnum.ERROR]: 'error',
      };
      const statusLabel = transitionStatusLabelMap[update.status] ?? String(update.status);

      await this.eventLogRepository.insertTransitionProgressLog(
        organizationId,
        projectId,
        transitionId,
        update.updated_by,
        statusLabel,
        finalProgressRate,
        comment ?? null,
        client
      );

      // 6. タスク進捗率を再計算
      // TODO: project_taskテーブルにprogress_rateカラムが存在しないため、現在はスキップ
      // project_taskテーブルのスキーマ: organization_id, project_id, method_id, experiment_order, experiment_condition, attempts_count
      // 進捗率カラム追加後に実装する

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
