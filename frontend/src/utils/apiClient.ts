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

/**
 * プロジェクト一覧を取得
 */
export async function fetchProjects(): Promise<ApiResponse<ProjectListResponse>> {
  await simulateApiDelay();
  
  return {
    success: true,
    data: {
      projects: projectsData.projects as unknown as Project[],
    },
    message: 'プロジェクト一覧の取得に成功しました',
  };
}

/**
 * プロジェクト詳細を取得
 */
export async function fetchProjectById(projectId: string): Promise<ApiResponse<ProjectDetailResponse>> {
  await simulateApiDelay();
  
  const project = (projectsData.projects as unknown as Project[]).find((p) => p.id === projectId);
  
  if (!project) {
    throw new Error(`プロジェクトが見つかりません: ${projectId}`);
  }
  
  return {
    success: true,
    data: {
      project,
    },
    message: 'プロジェクト詳細の取得に成功しました',
  };
}

/**
 * プロジェクトのファイル一覧を取得
 */
export async function fetchProjectFiles(projectId: string): Promise<ApiResponse<{ files: ProjectFile[] }>> {
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
    },
    message: 'ファイル一覧の取得に成功しました',
  };
}

/**
 * フォーマット一覧を取得
 */
export async function fetchFormats(): Promise<ApiResponse<FormatListResponse>> {
  await simulateApiDelay();
  
  return {
    success: true,
    data: {
      folders: formatsData.folders as unknown as Format[],
    },
    message: 'フォーマット一覧の取得に成功しました',
  };
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
    message: 'フォーマット詳細の取得に成功しました',
  };
}

/**
 * フォーマットのファイル一覧を取得
 */
export async function fetchFormatFiles(formatId: string): Promise<ApiResponse<{ files: FormatFile[] }>> {
  await simulateApiDelay();
  
  const allFormatFiles = formatFilesData.files as Record<string, { root: FormatFile[]; subfolders?: Record<string, { name: string; files: FormatFile[] }> }>;
  const formatFiles = allFormatFiles[formatId];
  
  if (!formatFiles) {
    throw new Error(`フォーマットのファイルが見つかりません: ${formatId}`);
  }
  
  return {
    success: true,
    data: {
      files: formatFiles.root || [],
    },
    message: 'ファイル一覧の取得に成功しました',
  };
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
