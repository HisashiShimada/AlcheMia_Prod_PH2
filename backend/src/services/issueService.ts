import { IssueRepository } from '../repositories/issueRepository';
import {
  Issue,
  NewIssue,
  IssueUpdateData,
  IssueQueryParams,
  IssueType,
  IssueSeverity,
  IssueStatus
} from '../types/issue';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError
} from '../utils/errorClasses';

/**
 * サービスレイヤーの統一レスポンス形式
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    originalError?: Error;
  };
}

export class IssueService {
  private issueRepository: IssueRepository;

  constructor() {
    this.issueRepository = new IssueRepository();
  }

  /**
   * 問題報告を作成する
   */
  async createIssue(data: NewIssue): Promise<Issue> {
    // バリデーション
    this.validateIssueData(data);

    // 問題報告作成
    return await this.issueRepository.create(data);
  }

  /**
   * IDで問題報告を取得
   */
  async getIssueById(
    issueId: string,
    organizationId: string
  ): Promise<Issue> {
    const issue = await this.issueRepository.findById(issueId, organizationId);
    
    if (!issue) {
      throw new NotFoundError('問題報告が見つかりません');
    }

    return issue;
  }

  /**
   * 問題報告一覧を取得
   */
  async listIssues(
    organizationId: string,
    params: IssueQueryParams
  ): Promise<{
    items: Issue[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.issueRepository.findByOrganization(
      organizationId,
      params
    );

    // IssueListResponseをPaginatedIssues形式に変換
    return {
      items: result.issues,
      total: result.pagination.totalItems,
      page: result.pagination.page,
      limit: result.pagination.limit,
      totalPages: result.pagination.totalPages
    };
  }

  /**
   * 問題報告を更新する
   */
  async updateIssue(
    issueId: string,
    organizationId: string,
    userId: string,
    data: IssueUpdateData,
    isAdmin: boolean
  ): Promise<Issue> {
    // 既存の問題報告を取得
    const existingIssue = await this.issueRepository.findById(
      issueId,
      organizationId
    );

    if (!existingIssue) {
      throw new NotFoundError('問題報告が見つかりません');
    }

    // 権限確認（報告者または管理者のみ更新可能）
    if (!isAdmin && existingIssue.issueReporterId !== userId) {
      throw new AuthorizationError('この問題報告を更新する権限がありません');
    }

    // 更新データのバリデーション
    this.validateUpdateData(data);

    // 問題報告を更新
    const updatedIssue = await this.issueRepository.update(issueId, organizationId, data);
    
    if (!updatedIssue) {
      throw new NotFoundError('問題報告の更新に失敗しました');
    }

    return updatedIssue;
  }

  /**
   * 問題報告のステータスを更新する
   */
  async updateIssueStatus(
    issueId: string,
    organizationId: string,
    status: IssueStatus
  ): Promise<Issue> {
    // 既存の問題報告を取得
    const existingIssue = await this.issueRepository.findById(
      issueId,
      organizationId
    );

    if (!existingIssue) {
      throw new NotFoundError('問題報告が見つかりません');
    }

    // ステータスのバリデーション
    this.validateStatus(status);

    // ステータス遷移のバリデーション
    this.validateStatusTransition(existingIssue.status as IssueStatus, status);

    // ステータスを更新
    const updatedIssue = await this.issueRepository.updateStatus(
      issueId,
      organizationId,
      status
    );

    if (!updatedIssue) {
      throw new NotFoundError('ステータスの更新に失敗しました');
    }

    return updatedIssue;
  }

  /**
   * 問題報告に担当者を割り当てる
   */
  async assignIssue(
    issueId: string,
    organizationId: string,
    assigneeId: string | null
  ): Promise<Issue> {
    // 既存の問題報告を取得
    const existingIssue = await this.issueRepository.findById(
      issueId,
      organizationId
    );

    if (!existingIssue) {
      throw new NotFoundError('問題報告が見つかりません');
    }

    // 担当者を更新（nullの場合は割り当て解除）
    const updatedIssue = await this.issueRepository.updateAssignee(
      issueId,
      organizationId,
      assigneeId
    );

    if (!updatedIssue) {
      throw new NotFoundError('担当者の割り当てに失敗しました');
    }

    return updatedIssue;
  }

  /**
   * 問題報告を削除する
   */
  async deleteIssue(
    issueId: string,
    organizationId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<void> {
    // 既存の問題報告を取得
    const existingIssue = await this.issueRepository.findById(
      issueId,
      organizationId
    );

    if (!existingIssue) {
      throw new NotFoundError('問題報告が見つかりません');
    }

    // 権限確認（報告者または管理者のみ削除可能）
    if (!isAdmin && existingIssue.issueReporterId !== userId) {
      throw new AuthorizationError('この問題報告を削除する権限がありません');
    }

    // 問題報告を削除
    await this.issueRepository.delete(issueId, organizationId);
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

      const issue = await this.createIssue(newIssue);
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
   * Controller層用: 問題一覧を取得する（ServiceResult形式）
   */
  async list(
    organizationId: string,
    filters: any,
    pagination: any
  ): Promise<ServiceResult<{ issues: Issue[]; pagination: any }>> {
    try {
      const params: IssueQueryParams = {
        ...filters,
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        sortBy: pagination.sortBy || 'created_at',
        order: pagination.order || 'desc',
      };

      const result = await this.listIssues(organizationId, params);
      
      return {
        success: true,
        data: {
          issues: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            totalItems: result.total,
            totalPages: result.totalPages,
            hasNext: result.page < result.totalPages,
            hasPrev: result.page > 1,
          },
        },
      };
    } catch (error) {
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
      const issue = await this.getIssueById(issueId, organizationId);
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
    status: string
  ): Promise<ServiceResult<Issue>> {
    try {
      const updatedIssue = await this.updateIssueStatus(
        issueId,
        organizationId,
        status as IssueStatus
      );
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
   * タスク 4.1 & 8.2: 入力バリデーション実装
   */
  async addComment(
    organizationId: string,
    issueId: string,
    userId: string,
    comment: string
  ): Promise<ServiceResult<any>> {
    try {
      // タスク 8.2: 空文字・空白のみのバリデーション
      if (!comment || comment.trim() === '') {
        throw new ValidationError('コメントを入力してください');
      }

      // タスク 4.1: 最大文字数チェック (2000文字) - ビジネスルール
      if (comment.length > 2000) {
        throw new ValidationError('コメントは2000文字以内で入力してください');
      }

      // 問題が存在するか確認
      await this.getIssueById(issueId, organizationId);
      
      // リポジトリ層を呼び出してコメントを追加
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
    // 必須項目チェック
    if (!data.issueTitle || data.issueTitle.trim() === '') {
      throw new ValidationError('タイトルは必須です');
    }

    if (!data.issueContents || data.issueContents.trim() === '') {
      throw new ValidationError('説明は必須です');
    }

    if (!data.issueType && data.issueType !== 0) {
      throw new ValidationError('問題タイプは必須です');
    }

    // 文字数制限チェック
    if (data.issueTitle.length > 200) {
      throw new ValidationError('タイトルは200文字以内で入力してください');
    }

    // issueTypeの妥当性チェック（数値型）
    const validIssueTypeNumbers = [1, 2, 3, 4, 5]; // bug, feature_request, question, improvement, other
    if (!validIssueTypeNumbers.includes(data.issueType as number)) {
      throw new ValidationError(
        '無効な問題タイプです。1-5のいずれかを指定してください'
      );
    }
  }

  /**
   * 更新データのバリデーション
   */
  private validateUpdateData(data: IssueUpdateData): void {
    // タイトルの文字数制限チェック
    if (data.title !== undefined) {
      if (data.title.trim() === '') {
        throw new ValidationError('タイトルは空にできません');
      }
      if (data.title.length > 200) {
        throw new ValidationError('タイトルは200文字以内で入力してください');
      }
    }

    // 説明の空チェック
    if (data.description !== undefined && data.description.trim() === '') {
      throw new ValidationError('説明は空にできません');
    }

    // issueTypeの妥当性チェック
    if (data.issueType !== undefined) {
      const validIssueTypes: IssueType[] = [
        'bug',
        'feature_request',
        'question',
        'improvement'
      ];
      if (!validIssueTypes.includes(data.issueType)) {
        throw new ValidationError(
          '無効な問題タイプです。bug, feature_request, question, improvement のいずれかを指定してください'
        );
      }
    }

    // severityの妥当性チェック
    if (data.severity !== undefined) {
      const validSeverities: IssueSeverity[] = [
        'critical',
        'high',
        'medium',
        'low'
      ];
      if (!validSeverities.includes(data.severity)) {
        throw new ValidationError(
          '無効な重要度です。critical, high, medium, low のいずれかを指定してください'
        );
      }
    }
  }

  /**
   * ステータスの妥当性チェック
   */
  private validateStatus(status: string): void {
    const validStatuses: IssueStatus[] = [
      'open',
      'in_progress',
      'resolved',
      'closed'
    ];
    if (!validStatuses.includes(status as IssueStatus)) {
      throw new ValidationError(
        '無効なステータスです。open, in_progress, resolved, closed のいずれかを指定してください'
      );
    }
  }

  /**
   * ステータス遷移のバリデーション
   */
  private validateStatusTransition(currentStatus: IssueStatus, newStatus: IssueStatus): void {
    // ステータス遷移ルール
    const validTransitions: Record<IssueStatus, IssueStatus[]> = {
      open: ['in_progress', 'closed'],
      in_progress: ['resolved', 'open', 'closed'],
      resolved: ['closed', 'open'],
      closed: ['open'],
      rejected: []  // rejectedステータスからの遷移は許可しない
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `ステータス ${currentStatus} から ${newStatus} への遷移は許可されていません`
      );
    }
  }
}
