/**
 * Issue（問題報告）関連の型定義
 * 
 * 実験作業中に発生する問題を報告・管理するための型定義です。
 */

/**
 * 問題タイプ（issue_typeカラムの値）
 * code_masterテーブルの code_division = 'issue_type' の code_value（数値）を使用
 */
export type IssueType = number;

/**
 * 重要度（severityカラムの値）
 */
export type IssueSeverity =
  | 'critical'  // 致命的
  | 'high'      // 高
  | 'medium'    // 中
  | 'low';      // 低

/**
 * 重要度の有効な値（バリデーション用）
 */
export const ISSUE_SEVERITY_VALUES: readonly IssueSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

/**
 * ステータス（statusカラムの値）
 */
export type IssueStatus =
  | 'unresolved'      // 未解決
  | 'resolved';       // 解決済

/**
 * ステータスの有効な値（バリデーション用）
 */
export const ISSUE_STATUS_VALUES: readonly IssueStatus[] = [
  'unresolved',
  'resolved',
] as const;

/**
 * 問題エンティティ（ER図のissueテーブル構造に基づく）
 */
export interface Issue {
  /** 組織ID（マルチテナント分離用） */
  organizationId: string;

  /** プロジェクトID（UUID） */
  projectId: string;

  /** 問題ID（文字列） */
  issueId: string;

  /** メソッドID（オプショナル） */
  methodId: string | null;

  /** 問題対象（1:プロジェクト全体、2:タスク、3:トランジション） */
  issueTarget: number;

  /** タスク連番（オプショナル） */
  taskNo: number | null;

  /** トランジションID（オプショナル） */
  transitionId: string | null;

  /** 問題タイトル */
  issueTitle: string;

  /** 問題タイプ（数値） */
  issueType: number;

  /** 問題内容 */
  issueContents: string;

  /** ステータス（文字列: 'unresolved' | 'resolved'） */
  status: string;

  /** 問題報告者のユーザーID（UUID） */
  issueReporterId: string;

  /** 問題報告日時 */
  issueReportAt: string;

  /** 問題完了者のユーザーID（UUID、オプショナル） */
  issueCompleterId: string | null;

  /** 問題完了日時（オプショナル） */
  issueComplateAt: string | null;

  /** 作成者ユーザーID */
  createUserId: string;

  /** 作成日時 */
  createAt: string;

  /** 更新者ユーザーID */
  updateUserId: string;

  /** 更新日時 */
  updateAt: string;
}

/**
 * 新規問題作成用の型（ER図とAPI設計書に基づく）
 */
export interface NewIssue {
  /** 組織ID（マルチテナント分離用） */
  organizationId: string;

  /** プロジェクトID（UUID） */
  projectId: string;

  /** 問題ID（文字列） */
  issueId: string;

  /** メソッドID（オプショナル） */
  methodId?: string | null;

  /** 問題対象（1:プロジェクト全体、2:タスク、3:トランジション） */
  issueTarget: number;

  /** タスク連番（オプショナル、targetTypeがtask/transitionの場合必須） */
  taskNo?: number | null;

  /** トランジションID（オプショナル、targetTypeがtransitionの場合必須） */
  transitionId?: string | null;

  /** 問題タイトル（1-100文字） */
  issueTitle: string;

  /** 問題タイプ（数値） */
  issueType: number;

  /** 問題内容（1-1000文字） */
  issueContents: string;

  /** 問題報告者のユーザーID（UUID） */
  issueReporterId: string;
}

/**
 * 問題更新用の型（部分的な更新を許可）
 */
export interface IssueUpdateData {
  /** 問題のタイトル */
  title?: string;

  /** 問題の詳細説明 */
  description?: string;

  /** 問題タイプ */
  issueType?: IssueType;

  /** 重要度 */
  severity?: IssueSeverity;

  /** ステータス */
  status?: IssueStatus;

  /** 担当者のユーザーID（nullで担当者解除） */
  assigneeId?: string | null;
}

/**
 * 問題検索用のクエリパラメータ
 */
export interface IssueQueryParams {
  /** プロジェクトIDでフィルタ */
  projectId?: string;

  /** メソッドIDでフィルタ */
  methodId?: string;

  /** タスク連番でフィルタ */
  taskNo?: number;

  /** トランジションIDでフィルタ */
  transitionId?: string;

  /** 報告者IDでフィルタ（将来の拡張用） */
  reporterId?: string;

  /** 担当者IDでフィルタ（将来の拡張用） */
  assigneeId?: string;

  /** 問題タイプでフィルタ（文字列または定義済みタイプ） */
  issueType?: IssueType | string;

  /** 重要度でフィルタ */
  severity?: IssueSeverity;

  /** ステータスでフィルタ（文字列または定義済みステータス） */
  status?: IssueStatus | string;
}

/**
 * ページネーション情報
 */
export interface IssuePagination {
  /** 現在のページ番号 */
  page: number;

  /** 1ページあたりの件数 */
  limit: number;

  /** 総アイテム数 */
  totalItems: number;

  /** 総ページ数 */
  totalPages: number;

  /** 次のページが存在するか */
  hasNext: boolean;

  /** 前のページが存在するか */
  hasPrev: boolean;
}

/**
 * 問題一覧レスポンス
 */
export interface IssueListResponse {
  /** 問題の配列 */
  issues: Issue[];

  /** ページネーション情報 */
  pagination: IssuePagination;
}

/**
 * ページネーション付き問題一覧（サービス層用）
 */
export interface PaginatedIssues {
  /** 問題の配列 */
  items: Issue[];

  /** 総アイテム数 */
  total: number;

  /** 現在のページ番号 */
  page: number;

  /** 1ページあたりの件数 */
  limit: number;

  /** 総ページ数 */
  totalPages: number;
}

/**
 * 問題コメント（Task 3.1用）
 */
export interface IssueComment {
  /** シーケンス番号 */
  sequenceNo: number;

  /** コメント内容 */
  comment: string;

  /** 投稿者ユーザーID */
  authorId: string;

  /** 投稿者名 */
  authorName: string;

  /** コメント日時 */
  commentedAt: string;
}

/**
 * コメント付き問題（Task 3.1用）
 */
export interface IssueWithComments {
  /** 問題ID */
  id: string;

  /** 問題タイプ（code_masterの code_value 数値） */
  issueType: number;

  /** 対象種別 */
  targetType: 'project' | 'task' | 'transition';

  /** プロジェクトID */
  projectId: string;

  /** プロジェクト名 */
  projectName: string;

  /** メソッドID */
  methodId: string;

  /** タスク番号 */
  taskNo: number | null;

  /** トランジションID */
  transitionId: string | null;

  /** タイトル */
  title: string;

  /** 内容 */
  contents: string;

  /** ステータス */
  status: 'unresolved' | 'resolved';

  /** 報告者ユーザーID */
  reportedBy: string;

  /** 報告者名 */
  reportedByName: string;

  /** 報告日時 */
  reportedAt: string;

  /** 完了者ユーザーID */
  completedBy: string | null;

  /** 完了者名 */
  completedByName: string | null;

  /** 完了日時 */
  completedAt: string | null;

  /** コメント配列 */
  comments: IssueComment[];
}

/**
 * 問題一覧取得フィルタ（Task 3.1用）
 */
export interface IssueListFilters {
  /** プロジェクトID（必須） */
  projectId: string;

  /** メソッドID（オプション。省略時はプロジェクト全件を返す） */
  methodId?: string;

  /** タスク番号（オプション。issue_target=2の問題を絞り込む場合に指定） */
  taskNo?: number;

  /** トランジションID（オプション。issue_target=3の問題を絞り込む場合に指定） */
  transitionId?: string;

  /** ステータスフィルタ（オプション） */
  status?: string;

  /** 問題タイプフィルタ（オプション、code_masterの code_value 数値） */
  issueType?: number;
}
