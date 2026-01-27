/**
 * MAIML編集API Service
 * 
 * MAIMLファイルの編集、バリデーション、自動補正機能を提供
 * API設計書: docs/design/api/api_maiml_editor.md
 */

import axios, { AxiosError } from 'axios';

// API Base URL（環境変数から取得、デフォルトは相対パス）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
 * Axiosインスタンスの作成
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
  });

  client.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      if (error.response?.data) {
        const errorMessage = error.response.data.error?.message || 'APIエラーが発生しました';
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error('サーバーに接続できませんでした');
      } else {
        throw new Error('リクエストの送信に失敗しました');
      }
    }
  );

  return client;
};

/**
 * MAIMLバリデーション結果の型定義
 */
export interface MaimlValidationResult {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    line?: number;
    column?: number;
    element?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    line?: number;
    element?: string;
    attribute?: string;
  }>;
  info?: {
    methodCount?: number;
    placeCount?: number;
    transitionCount?: number;
    arcCount?: number;
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
 * POST /api/v1/maiml/validate
 * 
 * @param content MAIMLコンテンツ（XML文字列）
 * @param strict 厳密モード（デフォルト: false）
 * @returns バリデーション結果
 */
export const validateMaiml = async (
  content: string,
  strict: boolean = false
): Promise<ApiResponse<MaimlValidationResult>> => {
  const client = createApiClient();
  
  try {
    console.log('🔍 [maimlApiService] MAIMLバリデーション実行');
    
    const response = await client.post<ApiResponse<MaimlValidationResult>>(
      '/api/v1/maiml/validate',
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
 * POST /api/v1/maiml/correct
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
      '/api/v1/maiml/correct',
      { content, correctionLevel }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [maimlApiService] 自動補正エラー:', error);
    throw error;
  }
};

/**
 * MAIMLバリデーション（モック版）
 * 実際のAPIが未実装の場合に使用
 */
export const validateMaimlMock = async (
  content: string,
  strict: boolean = false
): Promise<ApiResponse<MaimlValidationResult>> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('🔍 [maimlApiService] MAIMLバリデーション実行（モック）');
  
  // 簡易的なバリデーション
  const errors: MaimlValidationResult['errors'] = [];
  const warnings: MaimlValidationResult['warnings'] = [];
  
  // XMLパースチェック
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    
    if (parseError) {
      errors.push({
        code: 'INVALID_XML_STRUCTURE',
        message: 'XML形式が不正です'
      });
    }
  } catch {
    errors.push({
      code: 'INVALID_XML_STRUCTURE',
      message: 'XMLのパースに失敗しました'
    });
  }
  
  // ルート要素チェック
  if (!content.includes('<document') && !content.includes('<maiml')) {
    warnings.push({
      code: 'MISSING_ROOT_ELEMENT',
      message: 'document要素またはmaiml要素が見つかりません'
    });
  }
  
  // method要素チェック
  if (!content.includes('<method')) {
    warnings.push({
      code: 'MISSING_METHOD_ELEMENT',
      message: 'method要素が見つかりません'
    });
  }
  
  return {
    success: true,
    data: {
      valid: errors.length === 0,
      errors,
      warnings,
      info: {
        methodCount: (content.match(/<method/g) || []).length,
        placeCount: (content.match(/<place/g) || []).length,
        transitionCount: (content.match(/<transition/g) || []).length,
        arcCount: (content.match(/<arc/g) || []).length
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
};

/**
 * MAIML自動補正（モック版）
 * 実際のAPIが未実装の場合に使用
 */
export const correctMaimlMock = async (
  content: string,
  correctionLevel: 'safe' | 'moderate' | 'aggressive' = 'safe'
): Promise<ApiResponse<MaimlCorrectionResult>> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🔧 [maimlApiService] MAIML自動補正実行（モック）');
  
  // モックでは元のコンテンツをそのまま返す
  // 実際のAPIでは、エラーを修正したMAIMLを返す
  return {
    success: true,
    data: {
      corrected: false, // モックでは補正なし
      originalContent: content,
      correctedContent: content,
      corrections: [],
      warnings: []
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
};