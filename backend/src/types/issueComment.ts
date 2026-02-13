/**
 * IssueComment（問題コメント）関連の型定義
 * 
 * 問題に対するコメント機能のための型定義です。
 * REQ-001, REQ-002, REQ-005, REQ-006
 */

/**
 * 問題コメントエンティティ（issue_commentテーブル構造に基づく）
 * REQ-001: データモデル定義
 */
export interface IssueComment {
  /** 組織ID（マルチテナント分離用） */
  organizationId: string;

  /** プロジェクトID（UUID） */
  projectId: string;

  /** 問題ID（UUID） */
  issueId: string;

  /** シーケンス番号（1から開始の連番） */
  sequenceNo: number;

  /** コメント内容（1-2000文字） */
  comment: string;

  /** 投稿者のユーザーID（UUID） */
  authorId: string;

  /** コメント投稿日時（ISO 8601形式） */
  commentedAt: string;

  /** 作成者ユーザーID（監査証跡） */
  createUserId: string;

  /** 作成日時（ISO 8601形式、監査証跡） */
  createAt: string;

  /** 更新者ユーザーID（監査証跡） */
  updateUserId: string;

  /** 更新日時（ISO 8601形式、監査証跡） */
  updateAt: string;
}

/**
 * 新規コメント作成リクエスト
 * REQ-001, REQ-002: API入力パラメータ
 */
export interface CreateIssueCommentRequest {
  /** コメント内容（1-2000文字） */
  comment: string;
}

/**
 * コメント投稿レスポンス
 * REQ-001, REQ-006: API出力形式
 */
export interface IssueCommentResponse {
  /** プロジェクトID（UUID） */
  projectId: string;

  /** 問題ID（UUID） */
  issueId: string;

  /** シーケンス番号 */
  sequenceNo: number;

  /** コメント内容 */
  comment: string;

  /** 投稿者のユーザーID（UUID） */
  authorId: string;

  /** 投稿者の表示名 */
  authorName: string;

  /** コメント投稿日時（ISO 8601形式） */
  commentedAt: string;
}

/**
 * コメントバリデーション定数
 * REQ-002: 入力バリデーション
 */
export const COMMENT_VALIDATION = {
  /** コメント最小文字数 */
  MIN_LENGTH: 1,

  /** コメント最大文字数 */
  MAX_LENGTH: 2000,
} as const;

/**
 * CreateIssueCommentRequest の型ガード関数
 * REQ-002: 入力バリデーション
 * 
 * @param obj - 検証対象のオブジェクト
 * @returns CreateIssueCommentRequest型であればtrue
 */
export function isCreateIssueCommentRequest(
  obj: any
): obj is CreateIssueCommentRequest {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.comment === 'string'
  );
}

/**
 * コメント内容のバリデーション
 * REQ-002: 入力バリデーション（1-2000文字）
 * 
 * @param comment - 検証対象のコメント文字列
 * @returns バリデーション結果
 */
export function validateComment(comment: string): {
  valid: boolean;
  error?: string;
} {
  // 空文字列チェック
  if (!comment || comment.trim().length === 0) {
    return {
      valid: false,
      error: 'コメントは空にできません',
    };
  }

  // 文字数チェック
  if (comment.length < COMMENT_VALIDATION.MIN_LENGTH) {
    return {
      valid: false,
      error: `コメントは${COMMENT_VALIDATION.MIN_LENGTH}文字以上である必要があります`,
    };
  }

  if (comment.length > COMMENT_VALIDATION.MAX_LENGTH) {
    return {
      valid: false,
      error: `コメントは${COMMENT_VALIDATION.MAX_LENGTH}文字以内である必要があります`,
    };
  }

  return { valid: true };
}