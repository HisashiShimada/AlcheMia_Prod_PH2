/**
 * 問題管理API通信サービス
 *
 * 問題報告・一覧取得・コメント投稿などの問題管理APIを提供する。
 * 対応API: GET /api/v1/issues（問題一覧取得 API 7.3）
 */

import { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';
import type { Issue, IssueComment, User, IssueTargetType, IssueStatus } from '@/types/experimentWorker';
import { InstructionStatus } from '@/constants/codeMaster';

// ============================================================
// APIレスポンス型定義（バックエンドのレスポンス構造に合わせる）
// ============================================================

/**
 * 問題報告APIのリクエストボディ
 * POST /api/v1/issues
 */
export interface CreateIssueParams {
  /** プロジェクトID（UUID、必須） */
  projectId: string;
  /** メソッドID（オプション） */
  methodId?: string;
  /** 問題タイプ（必須）: code_master.code_value（整数） */
  issueType: number;
  /** 対象タイプ（必須） */
  targetType: string;
  /** タスク連番（オプション） */
  taskNo?: number;
  /** トランジションID（オプション） */
  transitionId?: string;
  /** タイトル（必須、最大200文字） */
  title: string;
  /** 内容（必須、最大2000文字） */
  description: string;
}

/**
 * コメント追加APIのリクエストパラメータ
 * POST /api/v1/issues/comments
 */
export interface AddCommentParams {
  /** プロジェクト名（必須） */
  projectName: string;
  /** 問題ID（UUID、必須） */
  issueId: string;
  /** コメント内容（必須） */
  comment: string;
}

/**
 * 問題一覧取得APIのクエリパラメータ
 * GET /api/v1/issues
 */
export interface GetIssuesParams {
  /** プロジェクトID（UUID、必須） */
  projectId: string;
  /** メソッドID（オプション。省略時はプロジェクト全件を返す） */
  methodId?: string;
  /** タスク連番（オプション） */
  taskNo?: number;
  /** トランジションID（オプション） */
  transitionId?: string;
  /** ステータスフィルタ（オプション） */
  status?: 'unresolved' | 'resolved';
  /** 問題タイプフィルタ（オプション）: code_master.code_value（整数） */
  issueType?: number;
}

/**
 * 問題報告APIのレスポンスデータ（1件分）
 * バックエンドAPIレスポンスの構造（POST /api/v1/issues）
 */
interface CreateIssueApiData {
  id: string;
  issueType: number;
  targetType: string;
  projectId: string;
  projectName?: string;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  title: string;
  contents: string;
  status: 'unresolved' | 'resolved';
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  comments: IssueCommentApiData[];
}

/**
 * コメント追加APIのレスポンスデータ（1件分）
 * バックエンドAPIレスポンスの構造（POST /api/v1/issues/comments）
 */
interface AddCommentApiData {
  sequenceNo: number;
  comment: string;
  authorId: string;
  authorName: string;
  commentedAt: string;
}

/**
 * 問題一覧取得APIのコメントデータ（1件分）
 * バックエンドAPIレスポンスの構造
 */
interface IssueCommentApiData {
  sequenceNo: number;
  comment: string;
  authorId: string;
  authorName: string;
  commentedAt: string;
}

/**
 * 問題一覧取得APIの問題データ（1件分）
 * バックエンドAPIレスポンスの構造（GET /api/v1/issues）
 * statusはDBから数値（0=未解決, 1=解決済）で返る場合がある
 */
interface IssueApiData {
  id: string;
  issueType: number;
  targetType: string;
  projectId: string;
  projectName?: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  title: string;
  contents: string;
  status: 'unresolved' | 'resolved' | 0 | 1 | number;
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  completedBy?: string;
  completedByName?: string;
  completedAt?: string;
  comments: IssueCommentApiData[];
}

// ============================================================
// マッピング関数
// ============================================================

/**
 * APIレスポンスのコメントデータをフロントエンドの IssueComment 型にマッピング
 *
 * @param c APIレスポンスのコメントデータ
 * @param issueId 親の問題ID
 * @returns フロントエンド型の IssueComment
 */
function mapToIssueComment(c: IssueCommentApiData, issueId: string): IssueComment {
  const createdBy: User = {
    userId: c.authorId,
    userName: c.authorName,
  };

  return {
    commentId: String(c.sequenceNo),
    issueId,
    content: c.comment,
    createdBy,
    createdAt: c.commentedAt,
  };
}

/**
 * APIレスポンスのstatus値をフロントエンドの IssueStatus 型に変換
 * DBからは数値（0=未解決, 1=解決済）で返る場合がある
 *
 * @param status APIレスポンスのstatus値（数値または文字列）
 * @returns IssueStatus 文字列
 */
function mapToIssueStatus(status: 'unresolved' | 'resolved' | number): IssueStatus {
  if (status === InstructionStatus.UNSENT || status === 'unresolved') return 'unresolved';
  if (status === InstructionStatus.SENT || status === 'resolved') return 'resolved';
  // 想定外の値はデフォルトで未解決とする
  return 'unresolved';
}

/**
 * APIレスポンスの問題データをフロントエンドの Issue 型にマッピング
 *
 * @param data APIレスポンスの問題データ（1件）
 * @returns フロントエンド型の Issue
 */
function mapToIssue(data: IssueApiData): Issue {
  const reportedBy: User = {
    userId: data.reportedBy,
    userName: data.reportedByName,
  };

  const comments: IssueComment[] = (data.comments ?? []).map((c) =>
    mapToIssueComment(c, data.id)
  );

  return {
    issueId: data.id,
    transitionId: data.transitionId,
    // APIレスポンスに transitionName は含まれないため空文字で初期化
    // IssueManagementModal では親コンポーネントから transitionName props を渡すため実害なし
    transitionName: '',
    projectId: data.projectId,
    projectName: data.projectName,
    title: data.title,
    content: data.contents,
    // DBから数値（0/1）で返る場合があるため、文字列IssueStatusに変換する
    status: mapToIssueStatus(data.status as 'unresolved' | 'resolved' | number),
    targetType: data.targetType as IssueTargetType,
    issueType: data.issueType,
    reportedBy,
    reportedAt: data.reportedAt,
    comments,
  };
}

// ============================================================
// API関数
// ============================================================

/**
 * 問題一覧を取得する
 * GET /api/v1/issues
 *
 * 指定したプロジェクト・メソッド・タスク・トランジションに紐づく問題一覧を取得する。
 * レスポンスはフロントエンドの Issue[] 型にマッピングして返す。
 *
 * @param params クエリパラメータ（projectId, methodId, taskNo, transitionId は必須）
 * @returns Issue[] フロントエンド型にマッピングされた問題一覧
 * @throws Error API呼び出し失敗時
 *
 * @example
 * ```typescript
 * const issues = await getIssues({
 *   projectId: '550e8400-e29b-41d4-a716-446655440000',
 *   methodId: 'method_001',
 *   taskNo: 1,
 *   transitionId: 'transition_001',
 * });
 * console.log(`取得件数: ${issues.length}`);
 * ```
 */
export async function getIssues(params: GetIssuesParams): Promise<Issue[]> {
  const client = createApiClient();

  try {
    console.log('[DEBUG] getIssues - Start', {
      projectId: params.projectId,
      methodId: params.methodId,
      taskNo: params.taskNo,
      transitionId: params.transitionId,
    });

    const response = await client.get<{
      success: boolean;
      data: IssueApiData[];
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/issues', { params });

    if (!response.data.success) {
      throw new Error('問題一覧の取得に失敗しました');
    }

    const issues = (response.data.data ?? []).map(mapToIssue);

    console.log('[DEBUG] getIssues - Success', {
      issueCount: issues.length,
    });

    return issues;
  } catch (error) {
    console.error('[DEBUG] getIssues - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
}

/**
 * コメントを追加する
 * POST /api/v1/issues/comments
 *
 * 指定した問題にコメントを追加する。
 *
 * @param params リクエストパラメータ（projectName, issueId, comment は必須）
 * @returns 作成されたコメントデータ
 * @throws Error API呼び出し失敗時
 */
export async function addComment(params: AddCommentParams): Promise<AddCommentApiData> {
  const client = createApiClient();

  try {
    console.log('[DEBUG] addComment - Start', {
      issueId: params.issueId,
      projectName: params.projectName,
    });

    const response = await client.post<{
      success: boolean;
      data: AddCommentApiData;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/issues/comments', params);

    if (!response.data.success) {
      throw new Error('コメントの追加に失敗しました');
    }

    console.log('[DEBUG] addComment - Success', {
      issueId: params.issueId,
      sequenceNo: response.data.data.sequenceNo,
    });

    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] addComment - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
}

/**
 * ステータス更新APIのリクエストパラメータ
 * PATCH /api/v1/issues/status
 */
export interface UpdateIssueStatusParams {
  /** プロジェクト名（必須） */
  projectName: string;
  /** 問題ID（必須） */
  issueId: string;
  /** ステータス（'unresolved' | 'resolved'）: APIリクエスト時に integer（0/1）に変換して送信 */
  status: IssueStatus;
}

/**
 * 問題ステータスを更新する
 * PATCH /api/v1/issues/status
 *
 * フロントエンドの IssueStatus（文字列）を integer に変換してAPIに送信する。
 * - 'unresolved' → 0
 * - 'resolved'   → 1
 *
 * @param params リクエストパラメータ（projectName, issueId, status は必須）
 * @throws Error API呼び出し失敗時
 */
export async function updateIssueStatus(params: UpdateIssueStatusParams): Promise<void> {
  const client = createApiClient();

  // IssueStatus 文字列を API設計書準拠の integer に変換
  const statusInt = params.status === 'resolved' ? InstructionStatus.SENT : InstructionStatus.UNSENT;

  try {
    console.log('[DEBUG] updateIssueStatus - Start', {
      issueId: params.issueId,
      projectName: params.projectName,
      status: params.status,
      statusInt,
    });

    const response = await client.patch<{
      success: boolean;
      data: unknown;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/issues/status', {
      projectName: params.projectName,
      issueId: params.issueId,
      status: statusInt,
    });

    if (!response.data.success) {
      throw new Error('ステータスの更新に失敗しました');
    }

    console.log('[DEBUG] updateIssueStatus - Success', {
      issueId: params.issueId,
      status: params.status,
    });
  } catch (error) {
    console.error('[DEBUG] updateIssueStatus - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
}

export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const client = createApiClient();

  try {
    console.log('[DEBUG] createIssue - Start', {
      projectId: params.projectId,
      methodId: params.methodId,
      issueType: params.issueType,
      targetType: params.targetType,
      taskNo: params.taskNo,
      transitionId: params.transitionId,
    });

    const response = await client.post<{
      success: boolean;
      data: CreateIssueApiData;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/issues', params);

    if (!response.data.success) {
      throw new Error('問題の報告に失敗しました');
    }

    // CreateIssueApiData は IssueApiData と構造が共通のため mapToIssue を再利用
    const issue = mapToIssue(response.data.data as unknown as IssueApiData);

    console.log('[DEBUG] createIssue - Success', {
      issueId: issue.issueId,
    });

    return issue;
  } catch (error) {
    console.error('[DEBUG] createIssue - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
}
