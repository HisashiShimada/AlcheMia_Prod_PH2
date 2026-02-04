/**
 * Issue（問題報告）関連の型定義
 * 
 * 実験作業中に発生する問題を報告・管理するための型定義です。
 */

/**
 * 問題タイプ（issue_typeカラムの値）
 */
export type IssueType =
  | 'bug'              // バグ
  | 'feature_request'  // 機能要望
  | 'question'         // 質問
  | 'improvement'      // 改善提案
  | 'other';           // その他

/**
 * 問題タイプの有効な値（バリデーション用）
 */
export const ISSUE_TYPE_VALUES: readonly IssueType[] = [
  'bug',
  'feature_request',
  'question',
  'improvement',
  'other',
] as const;

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
  | 'open'        // 未対応
  | 'in_progress' // 対応中
  | 'resolved'    // 解決済み
  | 'closed'      // 終了
  | 'rejected';   // 却下

/**
 * ステータスの有効な値（バリデーション用）
 */
export const ISSUE_STATUS_VALUES: readonly IssueStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
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

  /** 問題タイトル（1-200文字） */
  issueTitle: string;

  /** 問題タイプ（数値） */
  issueType: number;

  /** 問題内容（1-2000文字） */
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

  /** タスク詳細IDでフィルタ */
  taskDetailId?: string;

  /** 報告者IDでフィルタ */
  reporterId?: string;

  /** 担当者IDでフィルタ */
  assigneeId?: string;

  /** 問題タイプでフィルタ */
  issueType?: IssueType;

  /** 重要度でフィルタ */
  severity?: IssueSeverity;

  /** ステータスでフィルタ */
  status?: IssueStatus;

  /** ページ番号（デフォルト: 1） */
  page?: number;

  /** 1ページあたりの件数（デフォルト: 20、最大: 100） */
  limit?: number;

  /** ソート対象のフィールド */
  sortBy?: 'createdAt' | 'updatedAt' | 'severity' | 'status';

  /** ソート順序（デフォルト: desc） */
  order?: 'asc' | 'desc';
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
