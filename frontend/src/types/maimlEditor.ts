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
   *   または {organizationId}/formats/{organizationGroupCd}/{folderName}/{fileName}.maiml
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
  /**
   * エディタ起動時にDraft管理ダイアログを自動表示するかどうか（任意）
   * true の場合、エディタ起動後に DraftManager が自動的に開く
   * MAIMLファイルが存在せず、バックエンドDraftがある場合に使用
   */
  openDraftManagerOnStart?: boolean;
}

// ---------------------------------------------------------------------------
// maimlApiService から移動した型
// ---------------------------------------------------------------------------

/**
 * MAIML自動補正結果
 * maimlApiService / MAIMLEditorPage で使用
 */
export interface MaimlCorrectionResult {
  corrected: boolean;
  originalContent: string;
  correctedContent: string;
  corrections: Array<{ type: string }>;
  warnings: Array<{ message: string }>;
}

/**
 * DB保存済みの分析結果行
 * maimlApiService / MAIMLEditorPage で使用
 */
export interface MaimlAnalysisResultRow {
  id: number;
  file_key: string;
  is_valid: boolean;
  version?: number | null;
  namespace?: string | null;
  errors: string;
  warnings: string;
  suggestions?: string;
  statistics?: string;
  processing_time?: number | null;
  analysis_timestamp: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * MAIMLファイル保存結果
 * maimlApiService / SaveConfirmDialog で使用
 */
export interface SaveMaimlResult {
  saved: boolean;
  filePath: string;
  backupPath?: string;
  timestamp: string;
}

/**
 * MAIMLファイル情報
 * maimlApiService / MAIMLEditorPage で使用
 */
export interface MaimlFileInfo {
  key: string;
  name: string;
  context: 'project' | 'format';
  size: number;
  lastModified: string;
  isArchive?: boolean;
}
