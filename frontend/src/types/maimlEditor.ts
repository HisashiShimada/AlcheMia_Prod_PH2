/**
 * MAIML編集画面共通パラメータ型定義
 *
 * プロジェクト管理・フォーマット管理どちらからも使える共通型
 */

/**
 * MAIML編集画面へ渡すパラメータ
 */
export interface MaimlEditorParams {
  /** 編集コンテキスト（プロジェクトかフォーマットか） */
  editMode: 'project' | 'format';
  /** 表示用ファイル名（例: projectName.maiml） */
  editingFileName: string;
  /** Document名の初期値（拡張子なし） */
  originalFileName: string;
  /**
   * S3上のファイルキー（正しいパス）
   * 形式: {organizationId}/projects/{projectName}/{projectName}.maiml
   *   または {organizationId}/formats/{departmentCd}/{folderName}/{fileName}.maiml
   */
  sourceS3Key: string;
  /** ヘッダー表示用タイトル（プロジェクト名 or フォーマット名） */
  displayTitle: string;
  /** ヘッダー表示用サブタイトル（概要等、任意） */
  displaySubtitle?: string;
  /**
   * DocumentData.id の初期値（任意）
   * 新規作成時にプロジェクトIDなどを Document ID として設定したい場合に使用
   * 設定しない場合は `document_${Date.now()}` が自動生成される
   * S3から既存のMAIMLを読み込んだ場合はMAIML内の値が優先される
   */
  documentId?: string;
  /**
   * DocumentData.description の初期値（任意）
   * プロジェクトの概要などを Document の説明として引き継ぐ場合に使用
   * S3から既存のMAIMLを読み込んだ場合はMAIML内の値が優先される
   */
  description?: string;
}
