/**
 * MAIML編集API Service
 * 
 * MAIMLファイルの編集、バリデーション、自動補正機能を提供
 * API設計書: docs/design/api/api_maiml_editor.md
 */

import { createApiClient } from '@/utils/authUtils';
import { AnalysisResult } from '@/types/maimlValidation';
import type { 
  ListFilesResponse, 
  FileContentResponse, 
  AutoCorrectResponse 
} from '@/types/storage';

/**
 * 統一レスポンス形式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * MAIML自動補正結果の型定義
 */
export interface MaimlCorrectionResult {
  corrected: boolean;
  originalContent: string;
  correctedContent: string;
  corrections: Array<{
    type: string;
    message: string;
    line?: number;
    element?: string;
    attribute?: string;
    value?: string;
  }>;
  warnings: Array<{
    message: string;
    elements?: string[];
  }>;
}

/**
 * MAIMLバリデーション
 * POST /maiml/validate
 * 
 * @param content MAIMLコンテンツ（XML文字列）
 * @param strict 厳密モード（デフォルト: false）
 * @returns バリデーション結果
 */
export const validateMaiml = async (
  content: string,
  strict: boolean = false
): Promise<ApiResponse<AnalysisResult>> => {
  const client = createApiClient();
  
  try {
    console.log('🔍 [maimlApiService] MAIMLバリデーション実行');
    
    const response = await client.post<ApiResponse<AnalysisResult>>(
      '/maiml/validate',
      { content, strict }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] バリデーションエラー:', error);
    throw error;
  }
};

/**
 * MAIML自動補正
 * POST /maiml/correct
 * 
 * @param content MAIMLコンテンツ（XML文字列）
 * @param correctionLevel 補正レベル（safe, moderate, aggressive）
 * @returns 補正結果
 */
export const correctMaiml = async (
  content: string,
  correctionLevel: 'safe' | 'moderate' | 'aggressive' = 'safe'
): Promise<ApiResponse<MaimlCorrectionResult>> => {
  const client = createApiClient();
  
  try {
    console.log('🔧 [maimlApiService] MAIML自動補正実行');
    
    const response = await client.post<ApiResponse<MaimlCorrectionResult>>(
      '/maiml/correct',
      { content, correctionLevel }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] 自動補正エラー:', error);
    throw error;
  }
};

// ============================================================================
// Petri Net構造の型定義
// ============================================================================

/**
 * Place（プレース）の型定義
 */
export interface Place {
  id: string;
  type: 'material' | 'condition' | 'result';
  description: string;
}

/**
 * Transition（トランジション）の型定義
 */
export interface Transition {
  id: string;
  description: string;
}

/**
 * Arc（アーク）の型定義
 */
export interface Arc {
  id: string;
  source: string;
  target: string;
}

/**
 * Method（メソッド）の型定義
 */
export interface Method {
  methodId: string;
  methodIndex: number;
  name: string;
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
}

/**
 * Petri Net構造全体の型定義
 */
export interface PetriNetStructure {
  metadata: {
    documentId: string;
    documentName: string;
  };
  methods: Method[];
  statistics: {
    totalPlaces: number;
    totalTransitions: number;
    totalArcs: number;
  };
}

/**
 * MAIML保存結果の型定義
 */
export interface SaveMaimlResult {
  saved: boolean;
  filePath: string;
  backupPath?: string;
  timestamp: string;
}

/**
 * MAIMLファイル情報の型定義
 */
export interface MaimlFileInfo {
  key: string;
  name: string;
  context: 'project' | 'format';
  size: number;
  lastModified: string;
  isArchive?: boolean;
}

// ============================================================================
// MAIMLパースAPI
// ============================================================================

/**
 * MAIMLパース（複数メソッド対応）
 * POST /maiml/parse
 * 
 * @param content MAIMLコンテンツ（XML文字列またはBase64）
 * @returns Petri Net構造データ
 */
export const parseMaiml = async (
  content: string
): Promise<ApiResponse<PetriNetStructure>> => {
  const client = createApiClient();
  
  try {
    console.log('📊 [maimlApiService] MAIMLパース実行');
    
    const response = await client.post<ApiResponse<PetriNetStructure>>(
      '/maiml/parse',
      { content }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] パースエラー:', error);
    throw error;
  }
};

// ============================================================================
// MAIMLファイル操作API
// ============================================================================

/**
 * MAIMLファイル保存
 * PUT /projects/:projectId/maiml
 * PUT /formats/:formatId/maiml
 * 
 * @param context プロジェクトまたはフォーマット
 * @param id プロジェクトIDまたはフォーマットID
 * @param content MAIMLコンテンツ
 * @returns 保存結果
 */
export const saveMaiml = async (
  fileKey : string,
  content: string,
  archive: boolean = true
): Promise<ApiResponse<SaveMaimlResult>> => {
  const client = createApiClient();
  
  try {
    console.log(`💾 [maimlApiService] MAIMLファイル保存 (${fileKey}, archive: ${archive})`);
    
    const response = await client.post<ApiResponse<SaveMaimlResult>>(
      '/maiml/save',
      { fileKey, content, archive }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] 保存エラー:', error);
    throw error;
  }
};

/**
 * MAIMLファイル取得
 * GET /projects/:projectId/maiml
 * GET /formats/:formatId/maiml
 * 
 * @param context プロジェクトまたはフォーマット
 * @param id プロジェクトIDまたはフォーマットID
 * @returns MAIMLコンテンツ
 */
export const loadMaiml = async (
  context: 'project' | 'format',
  id: string
): Promise<ApiResponse<{ content: string }>> => {
  const client = createApiClient();
  
  try {
    console.log(`📂 [maimlApiService] MAIMLファイル取得 (${context}: ${id})`);
    
    const endpoint = context === 'project' 
      ? `/projects/${id}/maiml`
      : `/formats/${id}/maiml`;
    
    const response = await client.get<ApiResponse<{ content: string }>>(endpoint);
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] 取得エラー:', error);
    throw error;
  }
};

/**
 * MAIMLファイル一覧取得
 * GET /maiml-files
 * 
 * @param context プロジェクトまたはフォーマット（オプション）
 * @param includeArchive アーカイブを含むか（オプション）
 * @returns ファイル一覧
 */
export const listMaimlFiles = async (
  context?: 'project' | 'format',
  includeArchive?: boolean
): Promise<ApiResponse<{ files: MaimlFileInfo[] }>> => {
  const client = createApiClient();
  
  try {
    console.log('📋 [maimlApiService] MAIMLファイル一覧取得');
    
    const params = new URLSearchParams();
    if (context) params.append('context', context);
    if (includeArchive !== undefined) params.append('include_archive', String(includeArchive));
    
    const response = await client.get<ApiResponse<{ files: MaimlFileInfo[] }>>(
      `/maiml-files?${params.toString()}`
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] 一覧取得エラー:', error);
    throw error;
  }
};

// ============================================================================
// S3/Swiftストレージ操作API（新規追加）
// ============================================================================

/**
 * ストレージファイル一覧取得
 * GET /maiml/files
 * 
 * @param organizationId 組織ID
 * @returns ファイル一覧とメタデータ
 */
export const listStorageFiles = async (
  organizationId: string
): Promise<ApiResponse<ListFilesResponse>> => {
  const client = createApiClient();
  
  try {
    console.log('📁 [maimlApiService] ストレージファイル一覧取得');
    
    const response = await client.get<ApiResponse<ListFilesResponse>>(
      `/maiml/files?organizationId=${organizationId}`
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] ストレージファイル一覧取得エラー:', error);
    throw error;
  }
};

/**
 * ストレージファイル内容取得
 * GET /maiml/file-content
 * 
 * @param fileKey ファイルキー
 * @returns ファイル内容
 */
export const getStorageFileContent = async (
  fileKey: string
): Promise<ApiResponse<FileContentResponse>> => {
  const client = createApiClient();
  
  try {
    console.log('📄 [maimlApiService] ストレージファイル内容取得:', fileKey);
    
    const response = await client.get<ApiResponse<FileContentResponse>>(
      `/maiml/file-content?key=${encodeURIComponent(fileKey)}`
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] ストレージファイル内容取得エラー:', error);
    throw error;
  }
};

/**
 * MAIML自動補正（リアルタイム版）
 * POST /maiml/auto-correct
 * 
 * @param maimlContent Base64エンコード済みMAIMLコンテンツ
 * @param selectedErrors 選択されたエラーインデックス配列
 * @param organizationId 組織ID
 * @returns 補正結果
 */
export const autoCorrectMaimlRealtime = async (
  maimlContent: string,
  selectedErrors: number[],
  organizationId: string
): Promise<ApiResponse<AutoCorrectResponse>> => {
  const client = createApiClient();
  
  try {
    console.log('🔧 [maimlApiService] MAIML自動補正（リアルタイム）実行');
    
    const response = await client.post<ApiResponse<AutoCorrectResponse>>(
      '/maiml/auto-correct',
      {
        maimlContent,
        selectedErrors,
        organizationId
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] MAIML自動補正エラー:', error);
    throw error;
  }
};
