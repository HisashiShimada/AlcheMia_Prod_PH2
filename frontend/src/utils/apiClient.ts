/**
 * API クライアント
 * 
 * このファイルはAPI呼び出しを行うための関数を提供します。
 * 現在はモックデータを返していますが、将来的には実際のAPIエンドポイントに
 * 接続することを想定しています。
 */

import type { ApiResponse } from '@/types/api';
import type { ProjectListResponse, ProjectDetailResponse, Project } from '@/types/project';
import type { FormatListResponse, FormatDetailResponse, Format } from '@/types/format';
import type { ProjectFile } from '@/types/file';
import type { FormatFile } from '@/types/format';

/**
 * マスタデータアイテムの型定義
 */
export interface MasterDataItem {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  annotation?: string;
}

/**
 * マスタデータレスポンスの型定義
 */
export interface MasterDataResponse {
  success: boolean;
  data: {
    items: MasterDataItem[];
  };
}

/**
 * フォーマットファイル作成リクエストの型定義
 */
export interface CreateFormatFileRequest {
  fileName: string;
  fileType: 'xml' | 'maiml';
  templateType?: 'material' | 'condition' | 'result';
  description?: string;
}

/**
 * フォーマットファイル作成レスポンスの型定義
 */
export interface CreateFormatFileResponse {
  filePath: string;
  fileName: string;
  fileType: string;
  size: number;
  createdAt: string;
}

/**
 * ファイル情報の型定義
 */
export interface FileInfo {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
}

// データソースのインポート（内部実装として一時的にモックJSONを使用）
import projectsData from '@/data/mock/mockProjects.json';
import formatsData from '@/data/mock/mockFormats.json';
import filesData from '@/data/mock/mockFiles.json';
import formatFilesData from '@/data/mock/mockFormatFiles.json';

/**
 * API遅延シミュレーション
 * 実際のAPI呼び出しのような遅延を再現
 */
const simulateApiDelay = (ms: number = 200) => 
  new Promise(resolve => setTimeout(resolve, ms));

// API ベースURL（環境変数から取得）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * プロジェクト一覧を取得
 * GET /api/v1/projects
 */
export async function fetchProjects(): Promise<ApiResponse<ProjectListResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'GET',
      credentials: 'include', // Cookie認証
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 'プロジェクト一覧の取得に失敗しました'
      );
    }

    const data: ApiResponse<ProjectListResponse> = await response.json();
    return data;
  } catch (error) {
    console.error('fetchProjects error:', error);
    throw error;
  }
}

/**
 * プロジェクト詳細を取得
 * GET /api/v1/projects/:projectId
 */
export async function fetchProjectById(projectId: string): Promise<ApiResponse<ProjectDetailResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'GET',
      credentials: 'include', // Cookie認証
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 'プロジェクト詳細の取得に失敗しました'
      );
    }

    const data: ApiResponse<ProjectDetailResponse> = await response.json();
    return data;
  } catch (error) {
    console.error('fetchProjectById error:', error);
    throw error;
  }
}

/**
 * フォーマット詳細を取得
 */
export async function fetchFormatById(formatId: string): Promise<ApiResponse<FormatDetailResponse>> {
  await simulateApiDelay();
  
  const format = (formatsData.folders as unknown as Format[]).find((f) => f.id === formatId);
  
  if (!format) {
    throw new Error(`フォーマットが見つかりません: ${formatId}`);
  }
  
  return {
    success: true,
    data: {
      format,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: 'mock-request-id',
    },
  };
}

/**
 * プロジェクトのファイル一覧を取得
 */
export async function fetchProjectFiles(projectId: string): Promise<ApiResponse<{ files: ProjectFile[]; archiveFiles: ProjectFile[] }>> {
  await simulateApiDelay();
  
  const allFiles = filesData.files as Record<string, { root: ProjectFile[]; archive?: ProjectFile[] }>;
  const projectFiles = allFiles[projectId];
  
  if (!projectFiles) {
    throw new Error(`プロジェクトのファイルが見つかりません: ${projectId}`);
  }
  
  return {
    success: true,
    data: {
      files: projectFiles.root || [],
      archiveFiles: projectFiles.archive || [],
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: 'mock-request-id',
    },
  };
}

/**
 * フォーマット一覧を取得
 * GET /api/v1/formats
 * 
 * @param fileType - ファイルタイプフィルタ（'all' | 'xml' | 'maiml'）
 */
export async function fetchFormats(
  fileType: 'all' | 'xml' | 'maiml' = 'all'
): Promise<ApiResponse<FormatListResponse>> {
  // createApiClient()を使用して認証トークンを自動付与
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const queryParams = fileType !== 'all' ? `?file_type=${fileType}` : '';
    const response = await client.get<ApiResponse<FormatListResponse>>(
      `/formats${queryParams}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'フォーマット一覧の取得に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('fetchFormats error:', error);
    throw error;
  }
}

/**
 * フォーマットファイル一覧を取得
 * GET /api/v1/formats/:folderName/files
 */
export async function fetchFormatFiles(
  folderName: string,
  subPath?: string
): Promise<ApiResponse<{ files: unknown[] }>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const queryParams = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
    const response = await client.get<ApiResponse<{ files: unknown[] }>>(
      `/formats/${folderName}/files${queryParams}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'ファイル一覧の取得に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('fetchFormatFiles error:', error);
    throw error;
  }
}

/**
 * フォーマット内にサブフォルダを作成
 * POST /api/v1/formats/subfolders
 * 
 * @param formatName - フォーマット名（例: chemistry, materials）
 * @param subfolderName - サブフォルダ名（1-255文字、英数字・アンダースコア・ハイフン）
 * @param parentPath - 親フォルダのパス（オプション、空文字列=ルート直下）
 */
export async function createFormatSubfolder(
  formatName: string,
  subfolderName: string,
  parentPath?: string
): Promise<ApiResponse<{
  folder_name: string;
  folder_path: string;
  full_swift_path: string;
  created_at: string;
}>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{
      folder_name: string;
      folder_path: string;
      full_swift_path: string;
      created_at: string;
    }>>(
      '/formats/subfolders',
      {
        formatName,
        subfolderName,
        parentPath: parentPath || '',
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'サブフォルダの作成に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatSubfolder error:', error);
    throw error;
  }
}

/**
 * フォーマットファイルを作成
 * POST /api/v1/formats/:folderName/files
 * 
 * @param folderName - フォーマットフォルダ名（例: chemistry）
 * @param data - ファイル作成データ
 */
export async function createFormatFile(
  folderName: string,
  data: CreateFormatFileRequest
): Promise<ApiResponse<CreateFormatFileResponse>> {
  const { createApiClient } = await import('./authUtils');
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<CreateFormatFileResponse>>(
      `/formats/${folderName}/files`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'ファイルの作成に失敗しました'
      );
    }

    return response.data;
  } catch (error) {
    console.error('createFormatFile error:', error);
    throw error;
  }
}


/**
 * モックAPIを使用するかどうかを判定
 * 開発環境では常にモックAPIを使用
 */
export function shouldUseMockAPI(): boolean {
  return true; // 現在は常にモックAPI使用
}

/**
 * 複数メソッドのペトリネット構造データを取得（モック）
 * POST /api/worker/multiple-methods-structure-from-content 相当
 * 
 * @deprecated この関数は非推奨です。代わりに `maimlApiService.parseMaiml` または `maimlApiService.parseMaimlMock` を使用してください。
 * @see {@link frontend/src/api/maimlApiService.ts#parseMaiml}
 * @see {@link frontend/src/api/maimlApiService.ts#parseMaimlMock}
 */
export async function fetchMultipleMethodsStructureFromContent(maimlContent: string): Promise<unknown> {
  await simulateApiDelay();
  
  // Base64デコードしてからチェック（UTF-8対応）
  let decodedContent: string;
  try {
    // UTF-8対応のBase64デコード
    decodedContent = decodeURIComponent(escape(atob(maimlContent)));
  } catch {
    // デコード失敗の場合はそのまま使用
    decodedContent = maimlContent;
  }
  
  console.log('🔍 [apiClient] デコードされた内容をチェック:', {
    contentLength: decodedContent.length,
    includesTest: decodedContent.includes('test_omori11'),
    firstChars: decodedContent.substring(0, 100)
  });
  
  // test_omori11の場合のみモックデータを返す
  if (decodedContent.includes('test_omori11')) {
    console.log('🎯 [apiClient] test_omori11検出 - 複数メソッドモックデータ返却');
    
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
      timestamp: new Date().toISOString()
    };
  }
  
  // test_omori11以外は空データを返す
  return {
    success: false,
    error: '複数メソッド対応はtest_omori11.maimlのみです'
  };
}

/**
 * ペトリネット構造データを取得（モック）
 */
export async function fetchPetriNetStructure(fileKey: string): Promise<unknown> {
  await simulateApiDelay();
  
  // モックデータをダイナミックインポート
  try {
    const mockData = await import('@/data/mock/mockPetriNetStructure.json');
    const allData = (mockData.default || mockData) as Record<string, unknown>;
    
    // fileKeyからプロジェクトIDを抽出
    const projectIdMatch = fileKey.match(/projects\/([^/]+)/);
    const projectId = projectIdMatch ? projectIdMatch[1] : null;
    
    // プロジェクトIDに対応するデータを取得
    if (projectId && allData[projectId]) {
      return allData[projectId];
    }
    
    // プロジェクトIDが見つからない場合、最初のプロジェクトを返す
    const firstProjectKey = Object.keys(allData)[0];
    if (firstProjectKey) {
      console.warn(`⚠️ Project ${projectId} not found, using first project: ${firstProjectKey}`);
      return allData[firstProjectKey];
    }
    
    // データがない場合
    throw new Error('No mock data available');
  } catch (error) {
    console.warn('⚠️ mockPetriNetStructure.json not found or invalid, returning empty data');
    return {
      success: true,
      data: {
        places: [],
        transitions: [],
        arcs: [],
        isMultiMethod: false,
        methods: [],
      },
    };
  }
}

/**
 * トランジション状態を取得（モック）
 */
export async function fetchTransitionStatus(workerId: string, fileKey: string): Promise<unknown> {
  await simulateApiDelay();
  
  // モックデータをダイナミックインポート
  try {
    const mockData = await import('@/data/mock/mockTransitionStatus.json');
    return {
      success: true,
      data: mockData.default || mockData,
    };
  } catch (error) {
    console.warn('⚠️ mockTransitionStatus.json not found, returning empty data');
    return {
      success: true,
      data: {
        transitionStatus: [],
      },
    };
  }
}

/**
 * 実験記録データを取得（モック）
 */
export async function fetchExperimentRecords(workId: string): Promise<unknown> {
  await simulateApiDelay();
  
  // モックデータをダイナミックインポート
  try {
    const mockData = await import('@/data/mock/mockExperimentRecords.json');
    return {
      success: true,
      data: mockData.default || mockData,
    };
  } catch (error) {
    console.warn('⚠️ mockExperimentRecords.json not found, returning empty data');
    return {
      success: true,
      data: {
        materials: [],
        conditions: [],
        results: [],
      },
    };
  }
}

/**
 * MAIMLコンテンツのバリデーション（モック）
 * POST /api/s3/validate-maiml-content 相当
 * 
 * @deprecated この関数は非推奨です。代わりに `maimlApiService.validateMaiml` または `maimlApiService.validateMaimlMock` を使用してください。
 * @see {@link frontend/src/api/maimlApiService.ts#validateMaiml}
 * @see {@link frontend/src/api/maimlApiService.ts#validateMaimlMock}
 */
export async function validateMaimlContent(
  maimlContent: string,
  organizationId: string
): Promise<{
  success: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  await simulateApiDelay(500);
  
  console.log('🔍 [apiClient] MAIMLバリデーション実行');
  
  // 簡易的なバリデーション
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // XMLパースチェック
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(maimlContent, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    
    if (parseError) {
      errors.push('XML形式が不正です');
    }
  } catch {
    errors.push('XMLのパースに失敗しました');
  }
  
  // ルート要素チェック
  if (!maimlContent.includes('<document')) {
    warnings.push('document要素が見つかりません');
  }
  
  // method要素チェック
  if (!maimlContent.includes('<method')) {
    warnings.push('method要素が見つかりません');
  }
  
  return {
    success: true,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * MAIML自動補正（モック）
 * POST /api/s3/maiml-auto-correct-realtime 相当
 * 
 * @deprecated この関数は非推奨です。代わりに `maimlApiService.correctMaiml` または `maimlApiService.correctMaimlMock` を使用してください。
 * @see {@link frontend/src/api/maimlApiService.ts#correctMaiml}
 * @see {@link frontend/src/api/maimlApiService.ts#correctMaimlMock}
 */
export async function autoCorrectMaiml(
  maimlContent: string,
  organizationId: string,
  selectedErrors?: string[]
): Promise<{
  success: boolean;
  correctedMaiml?: string;
  appliedCorrections?: string[];
  message?: string;
}> {
  await simulateApiDelay(1000);
  
  console.log('🔧 [apiClient] MAIML自動補正実行');
  
  // モックでは元のコンテンツをそのまま返す
  // 実際のAPIでは、エラーを修正したMAIMLを返す
  return {
    success: true,
    correctedMaiml: maimlContent,
    appliedCorrections: [
      '不要な空白を削除しました',
      'インデントを整形しました',
    ],
    message: '自動補正が完了しました（モック）',
  };
}

/**
 * Creator一覧を取得（モック）
 * GET /api/masters/creators 相当
 */
export async function fetchCreators(): Promise<MasterDataResponse> {
  await simulateApiDelay();
  
  console.log('📋 [apiClient] Creator一覧取得');
  
  // モックデータ
  return {
    success: true,
    data: {
      items: [
        { id: 'creator_001', uuid: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', name: '山田太郎', description: '主任研究員', annotation: '材料科学分野の専門家' },
        { id: 'creator_002', uuid: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', name: '佐藤花子', description: '研究員', annotation: 'データ解析担当' },
        { id: 'creator_003', uuid: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', name: '鈴木一郎', description: 'アシスタント', annotation: '実験補助担当' },
      ],
    },
  };
}

/**
 * Vendor一覧を取得（モック）
 * GET /api/masters/vendors 相当
 */
export async function fetchVendors(): Promise<MasterDataResponse> {
  await simulateApiDelay();
  
  console.log('📋 [apiClient] Vendor一覧取得');
  
  // モックデータ
  return {
    success: true,
    data: {
      items: [
        { id: 'vendor_001', uuid: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', name: '株式会社ABC研究所', description: '実験装置メーカー', annotation: '高精度測定装置の専門メーカー' },
        { id: 'vendor_002', uuid: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', name: '株式会社XYZ科学', description: '試薬メーカー', annotation: '高純度試薬の製造・販売' },
        { id: 'vendor_003', uuid: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', name: '株式会社DEF技研', description: '計測機器メーカー', annotation: 'データロガー・センサーの専門メーカー' },
      ],
    },
  };
}

/**
 * Owner一覧を取得（モック）
 * GET /api/masters/owners 相当
 */
export async function fetchOwners(): Promise<MasterDataResponse> {
  await simulateApiDelay();
  
  console.log('📋 [apiClient] Owner一覧取得');
  
  // モックデータ
  return {
    success: true,
    data: {
      items: [
        { id: 'owner_001', uuid: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', name: '山田研究室', description: '材料科学研究室', annotation: '新素材開発プロジェクト' },
        { id: 'owner_002', uuid: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e', name: '佐藤研究室', description: '化学工学研究室', annotation: '触媒反応研究プロジェクト' },
        { id: 'owner_003', uuid: 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f', name: '鈴木研究室', description: '物理学研究室', annotation: '量子材料研究プロジェクト' },
      ],
    },
  };
}

/**
 * Instrument一覧を取得（モック）
 * GET /api/masters/instruments 相当
 */
export async function fetchInstruments(): Promise<MasterDataResponse> {
  await simulateApiDelay();
  
  console.log('📋 [apiClient] Instrument一覧取得');
  
  // モックデータ
  return {
    success: true,
    data: {
      items: [
        { id: 'instrument_001', uuid: 'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a', name: '電子顕微鏡SEM-2000', description: '走査型電子顕微鏡', annotation: '2階実験室、管理番号: ABC-SEM-001' },
        { id: 'instrument_002', uuid: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', name: 'X線回折装置XRD-3000', description: 'X線回折装置', annotation: '3階測定室、管理番号: ABC-XRD-001' },
        { id: 'instrument_003', uuid: 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', name: '熱分析装置TG-DTA', description: '示差熱・熱重量同時測定装置', annotation: '4階分析室、管理番号: ABC-TGA-001' },
        { id: 'instrument_004', uuid: 'a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d', name: '分光光度計UV-VIS', description: '紫外可視分光光度計', annotation: '2階分析室、管理番号: ABC-UV-001' },
      ],
    },
  };
}

/**
 * 名前空間機能用API関数
 */

/**
 * S3ファイル一覧を取得（モック）
 * GET /api/s3/files 相当
 * 
 * public/data/template/ 配下のXMLファイルを読み込む
 */
export async function fetchFileList(): Promise<FileInfo[]> {
  await simulateApiDelay();
  
  console.log('📂 [apiClient] テンプレートファイル一覧取得');
  
  // public/data/template/ 配下のファイルリスト
  const templateFiles = [
    'CTAdvanced.xml',
    'CTLabelling.xml',
    'CTMapping.xml',
    'MTMapping.xml',
    'RTSpectrum.xml',
  ];
  
  // ファイル名のプレフィックスに基づいてフォルダ分類
  const fileList: FileInfo[] = templateFiles.map(fileName => {
    let folderPath = 'template/';
    
    if (fileName.startsWith('CT')) {
      folderPath = 'template/condition/';
    } else if (fileName.startsWith('MT')) {
      folderPath = 'template/material/';
    } else if (fileName.startsWith('RT')) {
      folderPath = 'template/result/';
    }
    
    return {
      key: folderPath + fileName,
      name: fileName,
      size: 1024, // ダミーサイズ
      lastModified: new Date().toISOString().split('T')[0],
    };
  });
  
  console.log('📂 [apiClient] ファイル一覧:', fileList);
  
  return fileList;
}

/**
 * S3ファイルの内容を取得（モック）
 * GET /api/s3/file/:fileKey 相当
 * 
 * public/data/template/ 配下の実際のXMLファイルを読み込む
 */
export async function fetchFileContent(fileKey: string): Promise<string> {
  await simulateApiDelay(300);
  
  console.log('📄 [apiClient] テンプレートファイル内容取得:', fileKey);
  
  // fileKeyからファイル名を抽出
  const fileName = fileKey.split('/').pop();
  
  if (!fileName) {
    throw new Error('ファイル名が不正です');
  }
  
  // public/data/template/ 配下の実際のファイルを読み込み
  const filePath = `/data/template/${fileName}`;
  
  try {
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`ファイルの読み込みに失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const xmlContent = await response.text();
    
    console.log('📄 [apiClient] ファイル読み込み成功:', {
      fileName,
      contentLength: xmlContent.length,
    });
    
    return xmlContent;
  } catch (error) {
    console.error('📄 [apiClient] ファイル読み込みエラー:', error);
    throw new Error(`ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}
