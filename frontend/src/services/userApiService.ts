/**
 * ユーザー管理API通信サービス
 * 
 * ユーザー管理のCRUD操作、CSV操作などの共通API処理を提供します。
 */

import { createApiClient } from '@/utils/authUtils';
import { AxiosError } from 'axios';

/**
 * APIレスポンスの型定義
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * ユーザーデータの型（4テーブルJOIN）
 * バックエンドからcamelCaseで返却されるため、フロントエンド側もcamelCaseで定義
 */
export interface UserRecord {
  userId: string; // メールアドレス（主キー）
  userName: string;
  mailAddress: string;
  departmentCd?: string;
  departmentName?: string; // JOINで取得
  roleCd: string;
  roleName?: string; // JOINで取得
  isActive: boolean;
  createUserId?: string;
  updateUserId?: string;
  createAt?: Date;
  updateAt?: Date;
  
  // 動的プロパティアクセス用のインデックスシグネチャ
  [key: string]: unknown;
}

/**
 * ユーザー作成リクエストの型（パスワード含む）
 */
export interface CreateUserRequest {
  userId: string; // メールアドレス
  userName: string;
  mailAddress: string;
  departmentCd?: string;
  roleCd: string;
  isActive?: boolean;
  password?: string; // パスワード（オプション）
}

/**
 * ユーザー更新リクエストの型（パスワード不要）
 */
export interface UpdateUserRequest {
  userName?: string;
  departmentCd?: string;
  roleCd?: string;
  isActive?: boolean;
}

/**
 * ユーザー一覧検索フィルターの型
 */
export interface UserFilters {
  search?: string;
  is_active?: boolean;
  department_cd?: string;
  role_cd?: string;
  sort_by?: 'user_id' | 'user_name' | 'update_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * APIエンドポイント
 */
const API_ENDPOINT = '/systemManagement/user';

/**
 * ユーザー一覧を取得
 */
export async function fetchUsers(
  filters?: UserFilters
): Promise<UserRecord[]> {
  const client = createApiClient();
  
  console.log('=== Fetching Users ===');
  console.log('Endpoint:', API_ENDPOINT);
  console.log('Filters:', filters);
  
  try {
    const response = await client.get<ApiResponse<UserRecord[]>>(API_ENDPOINT, {
      params: filters,
    });
    
    console.log('Response status:', response.status);
    console.log('API Response:', response.data);
    
    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<UserRecord[]>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * ユーザー詳細を取得
 */
export async function getUserById(
  userId: string
): Promise<UserRecord> {
  const client = createApiClient();
  const endpoint = `${API_ENDPOINT}/${encodeURIComponent(userId)}`;
  
  console.log('=== Fetching User Details ===');
  console.log('Endpoint:', endpoint);
  
  try {
    const response = await client.get<ApiResponse<UserRecord>>(endpoint);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<UserRecord>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * ユーザーを新規作成（パスワード必須）
 */
export async function createUser(
  data: CreateUserRequest
): Promise<UserRecord> {
  const client = createApiClient();
  
  console.log('=== Creating User ===');
  console.log('Endpoint:', API_ENDPOINT);
  console.log('Data:', { ...data, password: '***' }); // パスワードはログに出力しない
  
  try {
    const response = await client.post<ApiResponse<UserRecord>>(API_ENDPOINT, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<UserRecord>>;
    if (axiosError.response?.status === 409) {
      throw new Error('入力されたユーザーID（メールアドレス）は既に存在しています');
    }
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * ユーザーを更新（パスワード不要）
 */
export async function updateUser(
  userId: string,
  data: UpdateUserRequest
): Promise<UserRecord> {
  const client = createApiClient();
  const endpoint = `${API_ENDPOINT}/${encodeURIComponent(userId)}`;
  
  console.log('=== Updating User ===');
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  
  try {
    const response = await client.put<ApiResponse<UserRecord>>(endpoint, data);
    
    console.log('Response status:', response.status);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<UserRecord>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * ユーザーのアクティブ状態を更新
 */
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const client = createApiClient();
  const endpoint = `${API_ENDPOINT}/${encodeURIComponent(userId)}/status`;

  console.log('=== Updating User Status ===');
  console.log('Endpoint:', endpoint);
  console.log('isActive:', isActive);
  
  try {
    const response = await client.patch(endpoint, { isActive });
    console.log('Response status:', response.status);
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<void>>;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`API Error: ${axiosError.response?.status || 'Unknown'} - ${axiosError.response?.data?.error?.message || axiosError.message}`);
  }
}

/**
 * ユーザーを一括でアクティブ状態更新
 */
export async function batchUpdateUserStatus(
  userIds: string[],
  isActive: boolean
): Promise<void> {
  console.log('=== Batch Updating User Status ===');
  console.log('User IDs:', userIds);
  console.log('isActive:', isActive);
  
  // 各ユーザーIDに対して順次ステータス更新
  for (const userId of userIds) {
    await updateUserStatus(userId, isActive);
  }
}

/**
 * CSVアップロード結果の型定義
 */
interface CsvUploadResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

/**
 * CSVファイルをアップロード
 */
export async function uploadCsv(
  file: File
): Promise<void> {
  const client = createApiClient();
  const endpoint = `${API_ENDPOINT}/upload-csv`;
  
  console.log('=== Uploading CSV to Users ===');
  console.log('Endpoint:', endpoint);
  console.log('File:', file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await client.post<ApiResponse<CsvUploadResult>>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Upload result:', response.data);
    
    // バリデーションエラーのチェック（HTTPステータス200でもエラーの場合がある）
    if (response.data.success && response.data.data) {
      const result = response.data.data;
      
      if (result.failureCount > 0 && result.errors.length > 0) {
        // エラーがある場合はメッセージを表示
        const errorMessage = result.errors[0].message;
        console.error('CSV validation error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // 成功時はログ出力のみ
      console.log(`CSV upload successful: ${result.successCount} records created`);
    }
  } catch (error) {
    // すでにErrorオブジェクトの場合はそのまま再スロー（バリデーションエラー）
    if (error instanceof Error && !('isAxiosError' in error)) {
      throw error;
    }
    
    // HTTPエラーの場合
    const axiosError = error as AxiosError<ApiResponse<CsvUploadResult>>;
    const errorMessage = axiosError.response?.data?.error?.message || 'CSVアップロードに失敗しました';
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(errorMessage);
  }
}

/**
 * CSVファイルをダウンロード
 */
export async function downloadCsv(
  filters?: UserFilters
): Promise<void> {
  const client = createApiClient();
  
  // クエリパラメータを構築
  const params: Record<string, string> = {};
  if (filters?.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters?.is_active !== undefined) {
    params.is_active = String(filters.is_active);
  }
  if (filters?.department_cd) {
    params.department_cd = filters.department_cd;
  }
  if (filters?.role_cd) {
    params.role_cd = filters.role_cd;
  }
  
  const endpoint = `${API_ENDPOINT}/download-csv`;
  
  console.log('=== Downloading CSV from Users ===');
  console.log('Endpoint:', endpoint);
  console.log('Filters:', filters);
  
  try {
    const response = await client.get(endpoint, {
      params,
      responseType: 'blob',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    // レスポンスをBlobとして取得
    const blob = new Blob([response.data], { type: 'text/csv' });
    
    // Content-Dispositionヘッダーからファイル名を取得（大文字小文字を考慮）
    const contentDisposition = 
      response.headers['content-disposition'] || 
      response.headers['Content-Disposition'];
    
    console.log('Content-Disposition header:', contentDisposition);
    
    let filename = 'users.csv'; // デフォルト値
    
    if (contentDisposition) {
      // filename="..." または filename=... の両方に対応
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        // クォートを除去
        filename = filenameMatch[1].replace(/['"]/g, '');
        console.log('Extracted filename from Content-Disposition:', filename);
      } else {
        console.warn('Content-Disposition header exists but filename not found');
      }
    } else {
      // Content-Dispositionヘッダーがない場合は、フロントエンド側でタイムスタンプを生成
      console.warn('Content-Disposition header not found, generating timestamp on frontend');
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '')
        .slice(0, 14);
      filename = `users_${timestamp}.csv`;
      console.log('Generated filename:', filename);
    }
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('API Error:', axiosError.response?.data || axiosError.message);
    throw new Error(`CSVダウンロードに失敗しました: ${axiosError.response?.status || 'Unknown'} - ${axiosError.message}`);
  }
}
