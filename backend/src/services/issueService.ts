/**
 * IssueService
 * 
 * @description 問題報告機能のビジネスロジック
 */

import { IssueRepository } from '../repositories/issueRepository';
import {
  Issue,
  NewIssue,
  IssueStatus,
  IssueWithComments,
  IssueListFilters,
  ISSUE_STATUS_VALUES,
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
        issueTarget: data.issueTarget,
        taskNo: data.taskNo,
        transitionId: data.transitionId,
        issueTitle: data.issueTitle,
        issueType: data.issueType,
        issueContents: data.issueContents,
        issueReporterId: userId,
      };

      // バリデーション
      this.validateIssueData(newIssue);

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
   */
  async updateStatus(
    organizationId: string,
    issueId: string,
    userId: string,
    status: IssueStatus
  ): Promise<ServiceResult<Issue>> {
    try {
      const existingIssue = await this.issueRepository.findById(
        issueId,
        organizationId
      );

      if (!existingIssue) {
        throw new NotFoundError('問題報告が見つかりません');
      }

      // ステータスバリデーション
      this.validateStatus(status);

      // ステータスを数値変換
      const statusNumber = this.convertStatusToNumber(status);

      const updatedIssue = await this.issueRepository.updateStatus(
        issueId,
        organizationId,
        userId,
        statusNumber
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
   */
  private validateIssueData(data: Partial<NewIssue>): void {
    if (!data.issueTitle || data.issueTitle.trim() === '') {
      throw new ValidationError('タイトルは必須です');
    }

    if (!data.issueContents || data.issueContents.trim() === '') {
      throw new ValidationError('説明は必須です');
    }

    if (!data.issueType && data.issueType !== 0) {
      throw new ValidationError('問題タイプは必須です');
    }

    if (data.issueTitle.length > 200) {
      throw new ValidationError('タイトルは200文字以内で入力してください');
    }

    const validIssueTypeNumbers = [1, 2, 3, 4, 5];
    if (!validIssueTypeNumbers.includes(data.issueType as number)) {
      throw new ValidationError(
        '無効な問題タイプです。1-5のいずれかを指定してください'
      );
    }
  }

  /**
   * ステータスのバリデーション
   */
  private validateStatus(status: IssueStatus): void {
    if (!ISSUE_STATUS_VALUES.includes(status)) {
      throw new ValidationError(
        `無効なステータスです。許可された値: ${ISSUE_STATUS_VALUES.join(', ')}`
      );
    }
  }

  /**
   * ステータスを文字列から数値に変換
   */
  private convertStatusToNumber(status: IssueStatus): number{
      switch(status){
        case ISSUE_STATUS_VALUES[0]:
          return 0;
        case ISSUE_STATUS_VALUES[1]:
          return 1;
        default:
          throw new ValidationError(
            `無効なステータスです。許可された値: ${ISSUE_STATUS_VALUES.join(', ')}`
          );
      }

  }
}