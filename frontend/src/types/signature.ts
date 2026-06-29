/**
 * 電子署名（XMLDSig）関連の型定義
 *
 * @description
 * MAIMLファイルのDocument要素に対するXML電子署名の
 * ステータス管理・APIレスポンス型を定義する。
 *
 * @see PLAN.md: docs/tasks/20260625_0851_Signature機能配置検討/PLAN.md
 */

/**
 * 署名ステータス値
 * - 'none': 署名なし
 * - 'signed': 署名済み
 */
export type SignatureStatusValue = 'none' | 'signed';

/**
 * 署名ステータス情報
 */
export interface SignatureStatus {
  /** 署名ステータス */
  status: SignatureStatusValue;
  /** 最終署名日時（ISO 8601形式, 例: "2026-06-25T15:00:00.000Z"）署名済みの場合のみ設定 */
  signedAt?: string;
}

/**
 * 署名実行リクエスト
 */
export interface ApplySignatureRequest {
  /** 対象プロジェクト名 */
  projectName: string;
}

/**
 * 署名操作レスポンス
 */
export interface SignatureOperationResponse {
  success: boolean;
  signatureStatus: SignatureStatusValue;
  message?: string;
}
