/**
 * Draft管理API Service
 * 
 * Draft（下書き）の保存、取得、削除機能を提供
 */

import { createApiClient } from '@/utils/authUtils';
import { Draft } from '@/types/editor';

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

// ============================================================================
// Draft操作API
// ============================================================================

/**
 * Draft一覧取得
 * GET /maiml/drafts
 * 
 * @returns Draft一覧
 */
export const fetchDrafts = async (): Promise<Draft[]> => {
  const client = createApiClient();
  
  try {
    console.log('📂 [draftService] Draft一覧取得開始');
    
    const response = await client.get<ApiResponse<Draft[]>>('/maiml/drafts');
    
    console.log('🔍 [draftService] レスポンス詳細:', {
      response全体: response,
      responseData: response.data,
      responseData型: typeof response.data,
      responseData配列判定: Array.isArray(response.data)
    });
    
    // 統一レスポンス形式の場合、response.data.dataにアクセス
    const apiResponse = response.data as ApiResponse<Draft[]>;
    const drafts = apiResponse?.data || [];
    
    console.log(`✅ [draftService] Draft取得成功: ${Array.isArray(drafts) ? drafts.length : 0}件`, drafts);
    
    return Array.isArray(drafts) ? drafts : [];
  } catch (error) {
    console.error('❌ [draftService] Draft取得エラー:', error);
    throw error;
  }
};

/**
 * Draft取得（単体）
 * GET /maiml/draft/:draftKey
 * 
 * @param draftKey DraftキーID
 * @returns Draft詳細データ
 */
export const fetchDraftById = async (draftKey: string): Promise<Draft> => {
  const client = createApiClient();
  
  try {
    console.log('📖 [draftService] Draft読み込み:', draftKey);
    
    const response = await client.get<ApiResponse<Draft>>(
      `/maiml/draft/${encodeURIComponent(draftKey)}`
    );
    
    console.log('🔍 [draftService] Draft読み込みレスポンス:', response.data);
    
    // 統一レスポンス形式の場合、response.data.dataにアクセス
    const apiResponse = response.data as ApiResponse<Draft>;
    const draft = apiResponse?.data || response.data;
    
    console.log('✅ [draftService] Draft読み込み成功:', draft);
    
    return draft as Draft;
  } catch (error) {
    console.error('❌ [draftService] Draft読み込みエラー:', error);
    throw error;
  }
};

/**
 * Draft保存
 * POST /maiml/draft
 * 
 * @param draftData Draft保存データ
 * @returns 保存されたDraft
 */
export const saveDraft = async (draftData: Draft): Promise<Draft> => {
  const client = createApiClient();
  
  try {
    console.log('💾 [draftService] Draft保存開始:', draftData.draftName);
    
    const response = await client.post<ApiResponse<Draft>>('/maiml/draft', draftData);
    
    // 統一レスポンス形式の場合、response.data.dataにアクセス
    const apiResponse = response.data as ApiResponse<Draft>;
    const draft = apiResponse?.data || response.data;
    
    console.log('✅ [draftService] Draft保存成功:', (draft as Draft)?.draftKey);
    
    return draft as Draft;
  } catch (error) {
    console.error('❌ [draftService] Draft保存エラー:', error);
    throw error;
  }
};

/**
 * Draft削除
 * DELETE /maiml/draft/:draftKey
 * 
 * @param draftKey DraftキーID
 * @returns 削除結果
 */
export const deleteDraft = async (draftKey: string): Promise<unknown> => {
  const client = createApiClient();
  
  try {
    console.log('🗑️ [draftService] Draft削除開始:', draftKey);
    
    const response = await client.delete<ApiResponse<unknown>>(`/maiml/draft/${encodeURIComponent(draftKey)}`);
    
    // 統一レスポンス形式の場合、response.data.dataにアクセス
    const apiResponse = response.data as ApiResponse<unknown>;
    const result = apiResponse?.data || response.data;
    
    console.log('✅ [draftService] Draft削除成功');
    
    return result;
  } catch (error) {
    console.error('❌ [draftService] Draft削除エラー:', error);
    throw error;
  }
};
