/**
 * MAIML関連の型定義
 * 
 * @description プロジェクトMAIMLファイル取得APIで使用する型定義
 * Task: 4.1 (P) backend/src/types/maiml.tsを作成
 * Requirements: REQ-5
 */

/**
 * MAIMLファイルデータ
 * 
 * @description プロジェクトの最新MAIMLファイル情報を表すインターフェース
 */
export interface MAIMLFileData {
  /**
   * ファイルID（S3キー、org_prefixを含む完全パス）
   * @example "org_maiml_lab_001/projects/sample_project/sample_project.maiml"
   */
  file_id: string;

  /**
   * プロジェクトID（UUID形式）
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  project_id: string;

  /**
   * プロジェクト名
   * @example "sample_project"
   */
  project_name: string;

  /**
   * ファイル名
   * @example "sample_project.maiml"
   */
  file_name: string;

  /**
   * S3相対パス（org_prefixを除く）
   * @example "projects/sample_project/sample_project.maiml"
   */
  file_path: string;

  /**
   * ファイルサイズ（バイト数）
   * @example 1024
   */
  file_size: number;

  /**
   * MAIMLファイル内容（XML文字列、UTF-8エンコーディング）
   */
  content: string;

  /**
   * コンテンツタイプ（固定値: "application/xml"）
   */
  content_type: 'application/xml';

  /**
   * 読み込み日時（ISO8601形式）
   * @example "2026-02-16T14:38:00+09:00"
   */
  loaded_at: string;
}

/**
 * サービス層レスポンス型
 * 
 * @description Service層からController層へのレスポンスを表す汎用型
 * @template T - 成功時のデータ型
 */
export interface ServiceResult<T> {
  /**
   * 処理成功フラグ
   * - true: 処理成功、dataフィールドに結果が格納される
   * - false: 処理失敗、errorフィールドにエラー情報が格納される
   */
  success: boolean;

  /**
   * 成功時のレスポンスデータ
   * successがtrueの場合のみ存在する
   */
  data?: T;

  /**
   * エラー情報
   * successがfalseの場合のみ存在する
   */
  error?: {
    /**
     * エラーコード
     * @example "RESOURCE_NOT_FOUND", "FILE_NOT_FOUND", "SYSTEM_DATABASE_ERROR"
     */
    code: string;

    /**
     * エラーメッセージ（日本語）
     * @example "プロジェクトが見つかりません"
     */
    message: string;

    /**
     * エラー詳細情報（オプション）
     */
    details?: any;

    /**
     * 元のErrorオブジェクト（デバッグ用、オプション）
     */
    originalError?: Error;
  };
}
