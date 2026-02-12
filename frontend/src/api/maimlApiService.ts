/**
 * MAIML編集API Service
 * 
 * MAIMLファイルの編集、バリデーション、自動補正機能を提供
 * API設計書: docs/design/api/api_maiml_editor.md
 */

import { createApiClient } from '@/utils/authUtils';
import { AnalysisResult } from '@/types/maimlValidation';

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

/**
 * MAIMLパース（モック版）
 */
export const parseMaimlMock = async (
  content: string
): Promise<ApiResponse<PetriNetStructure>> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log('📊 [maimlApiService] MAIMLパース実行（モック）');
  
  // Base64デコード
  let decodedContent: string;
  try {
    decodedContent = decodeURIComponent(escape(atob(content)));
  } catch {
    decodedContent = content;
  }
  
  // test_omori11の場合のみモックデータを返す
  if (decodedContent.includes('test_omori11')) {
    return {
      success: true,
      data: {
        metadata: {
          documentId: 'document_test_omori11_7fbcc8ec',
          documentName: 'test_omori11'
        },
        methods: [
          {
            methodId: 'method_1764899170484',
            methodIndex: 0,
            name: 'test_omori11_method_1764899170484',
            places: [
              { id: 'material-1764899172116', type: 'material', description: 'material 1' },
              { id: 'condition-1764899304242', type: 'condition', description: '条件1' },
              { id: 'material-1764899356810', type: 'material', description: 'マテリアル' },
              { id: 'result-1764899430825', type: 'result', description: '途中結果' },
              { id: 'material-1764899481970', type: 'material', description: 'material 04 hoge' },
              { id: 'material-1764899487787', type: 'material', description: '' },
              { id: 'result-1764899593844', type: 'result', description: '最終結果' }
            ],
            transitions: [
              { id: 'transition-1764899405147', description: '混ぜ合わせる' },
              { id: 'transition-1764899498618', description: 'New transition' }
            ],
            arcs: [
              { id: 'edge-1764899410688', source: 'material-1764899356810', target: 'transition-1764899405147' },
              { id: 'edge-1764899412630', source: 'material-1764899172116', target: 'transition-1764899405147' },
              { id: 'edge-1764899414482', source: 'condition-1764899304242', target: 'transition-1764899405147' },
              { id: 'edge-1764899435475', source: 'transition-1764899405147', target: 'result-1764899430825' },
              { id: 'edge-1764899507077', source: 'result-1764899430825', target: 'transition-1764899498618' },
              { id: 'edge-1764899517278', source: 'material-1764899487787', target: 'transition-1764899498618' },
              { id: 'edge-1764899519948', source: 'material-1764899481970', target: 'transition-1764899498618' },
              { id: 'edge-1764899597452', source: 'transition-1764899498618', target: 'result-1764899593844' }
            ]
          },
          {
            methodId: 'method_1764899692529',
            methodIndex: 1,
            name: 'test_omori11_method_1764899692529',
            places: [
              { id: 'material-1764899770318', type: 'material', description: '素材1' },
              { id: 'condition-1764899772859', type: 'condition', description: '条件2' },
              { id: 'result-1764899779265', type: 'result', description: '最終結果' }
            ],
            transitions: [
              { id: 'transition-1764899776281', description: 'New transition' }
            ],
            arcs: [
              { id: 'edge-1764899783329', source: 'material-1764899770318', target: 'transition-1764899776281' },
              { id: 'edge-1764899785122', source: 'condition-1764899772859', target: 'transition-1764899776281' },
              { id: 'edge-1764899786809', source: 'transition-1764899776281', target: 'result-1764899779265' }
            ]
          }
        ],
        statistics: {
          totalPlaces: 10,
          totalTransitions: 3,
          totalArcs: 11
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`
      }
    };
  }
  
  // その他は空データ
  return {
    success: false,
    error: {
      code: 'MOCK_DATA_ONLY',
      message: '複数メソッド対応はtest_omori11.maimlのみです（モック）',
      details: []
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
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
  context: 'project' | 'format',
  id: string,
  content: string
): Promise<ApiResponse<SaveMaimlResult>> => {
  const client = createApiClient();
  
  try {
    console.log(`💾 [maimlApiService] MAIMLファイル保存 (${context}: ${id})`);
    
    const endpoint = context === 'project' 
      ? `/projects/${id}/maiml`
      : `/formats/${id}/maiml`;
    
    const response = await client.put<ApiResponse<SaveMaimlResult>>(
      endpoint,
      { content }
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
