/**
 * IssueService
 * 
 * @description 問題報告機能のビジネスロジック
 */

import { IssueRepository } from '../repositories/issueRepository';
import * as codeMasterRepository from '../repositories/codeMasterRepository';
import {
  Issue,
  NewIssue,
  IssueWithComments,
  IssueListFilters,
} from '../types/issue';
import {
  NotFoundError,
  ValidationError,
} from '../utils/errorClasses';
import { logError } from '../utils/logger';

/**
 * ServiceResult型定義
 */
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    originalError?: Error;
  };
}

/**
 * IssueServiceクラス
 */
export class IssueService {
  private issueRepository: IssueRepository;

  constructor() {
    this.issueRepository = new IssueRepository();
  }

  /**
   * Controller層用: 問題報告を作成する（ServiceResult形式）
   */
  async create(
    organizationId: string,
    userId: string,
    data: any
  ): Promise<ServiceResult<Issue>> {
    try {
      const newIssue: NewIssue = {
        organizationId,
        projectId: data.projectId,
        issueId: data.issueId || `issue_${Date.now()}`,
        methodId: data.methodId,
        issueTarget: this.convertTargetTypeToNumber(data.targetType),
        taskNo: data.taskNo,
        transitionId: data.transitionId,
        issueTitle: data.title,
        issueType: data.issueType,
        issueContents: data.description,
        issueReporterId: userId,
      };

      // バリデーション（code_master参照のため async）
      await this.validateIssueData(organizationId, newIssue);

      const issue = await this.issueRepository.create(newIssue);
      return { success: true, data: issue };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            originalError: error,
          },
        };
      }
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: error.message,
            originalError: error,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * Controller層用: 問題一覧を取得する（コメント付き）
   * 
   * API設計書「3. 問題一覧取得API」に準拠:
   * - ページネーションなし（全件取得）
   * - 固定ソート（created_at DESC）
   * - フィルタリング: projectId, methodId, taskNo, transitionId, status, issueType
   */
  async list(
    organizationId: string,
    filters: IssueListFilters
  ): Promise<ServiceResult<IssueWithComments[]>> {
    try {
      const issues = await this.issueRepository.listIssuesWithComments(
        organizationId,
        filters
      );

      return {
        success: true,
        data: issues,
      };
    } catch (error) {
      logError('Issue list error', error as Error, {
        action: 'issue_list',
        organizationId,
        filters,
      });

      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * Controller層用: 問題詳細を取得する（ServiceResult形式）
   */
  async getById(
    organizationId: string,
    issueId: string
  ): Promise<ServiceResult<Issue>> {
    try {
      const issue = await this.issueRepository.findById(issueId, organizationId);
      
      if (!issue) {
        throw new NotFoundError('問題報告が見つかりません');
      }

      return { success: true, data: issue };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: error.message,
            originalError: error,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * Controller層用: ステータスを更新する（ServiceResult形式）
   * @param status 0=未解決, 1=解決済（API設計書準拠のinteger）
   */
  async updateStatus(
    organizationId: string,
    projectName: string,
    issueId: string,
    userId: string,
    status: number
  ): Promise<ServiceResult<Issue>> {
    try {
      // プロジェクト名からプロジェクトID取得
      const projectId = await this.issueRepository.getProjectIdByName(organizationId, projectName);
      if (!projectId) {
        throw new NotFoundError('プロジェクトが見つかりません');
      }

      const existingIssue = await this.issueRepository.findById(
        issueId,
        organizationId
      );

      if (!existingIssue) {
        throw new NotFoundError('問題報告が見つかりません');
      }

      // ステータスバリデーション（0 or 1）
      this.validateStatus(status);

      const updatedIssue = await this.issueRepository.updateStatus(
        issueId,
        organizationId,
        userId,
        status
      );

      if (!updatedIssue) {
        throw new NotFoundError('ステータスの更新に失敗しました');
      }

      return { success: true, data: updatedIssue };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: error.message,
            originalError: error,
          },
        };
      }
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            originalError: error,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * Controller層用: コメントを追加する（ServiceResult形式）
   */
  async addComment(
    organizationId: string,
    projectName: string,
    issueId: string,
    userId: string,
    comment: string
  ): Promise<ServiceResult<any>> {
    try {
      if (!comment || comment.trim() === '') {
        throw new ValidationError('コメントを入力してください');
      }

      if (comment.length > 2000) {
        throw new ValidationError('コメントは2000文字以内で入力してください');
      }

      // プロジェクト名からプロジェクトID取得
      const projectId = await this.issueRepository.getProjectIdByName(organizationId, projectName);
      if (!projectId) {
        throw new NotFoundError('プロジェクトが見つかりません');
      }

      // 問題存在確認
      const issue = await this.issueRepository.findById(issueId, organizationId);
      if (!issue) {
        throw new NotFoundError('問題報告が見つかりません');
      }
      
      const commentResponse = await this.issueRepository.addComment(
        organizationId,
        issueId,
        userId,
        comment
      );
      
      return { success: true, data: commentResponse };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            originalError: error,
          },
        };
      }
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: error.message,
            originalError: error,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 問題報告データのバリデーション
   * issueType は code_master テーブル（code_division='issue_type'）の code_value を参照して検証
   */
  private async validateIssueData(organizationId: string, data: Partial<NewIssue>): Promise<void> {
    if (!data.issueTitle || data.issueTitle.trim() === '') {
      throw new ValidationError('タイトルは必須です');
    }

    if (!data.issueContents || data.issueContents.trim() === '') {
      throw new ValidationError('説明は必須です');
    }

    if (data.issueTitle.length > 200) {
      throw new ValidationError('タイトルは200文字以内で入力してください');
    }

    // issueType の必須チェック
    if (data.issueType === undefined || data.issueType === null) {
      throw new ValidationError('問題タイプは必須です');
    }

    // issueType が正の整数であることを確認
    if (!Number.isInteger(data.issueType) || data.issueType < 0) {
      throw new ValidationError('問題タイプは0、もしくは正の整数である必要があります');
    }

    // code_master テーブルを参照して有効な issueType か検証
    const validCodes = await codeMasterRepository.findByDivision(organizationId, 'issue_type');
    const validValues = validCodes.map(cm => Number(cm.code_value));
    if (!validValues.includes(data.issueType)) {
      throw new ValidationError('無効な問題タイプです');
    }
  }

  /**
   * ステータスのバリデーション（integer: 0=未解決, 1=解決済）
   */
  private validateStatus(status: number): void {
    if (status !== 0 && status !== 1) {
      throw new ValidationError(
        '無効なステータスです。許可された値: 0（未解決）, 1（解決済）'
      );
    }
  }

  /**
   * targetType（文字列）を issue_target（数値）に変換
   * ER図定義: 1=プロジェクト全体、2=タスク、3=トランジション
   */
  private convertTargetTypeToNumber(targetType: string | number): number {
    if (typeof targetType === 'number') return targetType;
    switch (targetType) {
      case 'project':    return 1;
      case 'task':       return 2;
      case 'transition': return 3;
      default:
        throw new ValidationError(`無効な問題対象です: ${targetType}`);
    }
  }
}
