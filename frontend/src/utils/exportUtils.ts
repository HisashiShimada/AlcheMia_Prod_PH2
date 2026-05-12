/**
 * Export機能ユーティリティ
 * 
 * Petri Netエディタのエクスポート機能を提供
 * - PNG形式エクスポート
 * - SVG形式エクスポート
 * - JSON形式エクスポート
 *
 * exportHelpers.ts（ReactFlow対応版）も統合済み。
 */

import { toPng, toSvg } from 'html-to-image';

/**
 * エクスポート結果の型定義
 */
export interface ExportResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * PNG形式でエクスポート
 * 
 * @param elementId エクスポート対象の要素ID
 * @param fileName ファイル名（拡張子なし）
 * @returns エクスポート結果
 */
export async function exportToPng(
  elementId: string,
  fileName: string = 'petri-net'
): Promise<ExportResult> {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      return {
        success: false,
        error: `要素が見つかりません: ${elementId}`
      };
    }
    
    console.log('🖼️ [exportUtils] PNG エクスポート開始:', fileName);
    
    // PNG生成
    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2, // 高解像度
    });
    
    // ダウンロード
    downloadFile(dataUrl, `${fileName}.png`);
    
    console.log('✅ [exportUtils] PNG エクスポート完了');
    
    return {
      success: true,
      message: 'PNGファイルのエクスポートに成功しました'
    };
  } catch (error) {
    console.error('❌ [exportUtils] PNG エクスポートエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
    };
  }
}

/**
 * SVG形式でエクスポート
 * 
 * @param elementId エクスポート対象の要素ID
 * @param fileName ファイル名（拡張子なし）
 * @returns エクスポート結果
 */
export async function exportToSvg(
  elementId: string,
  fileName: string = 'petri-net'
): Promise<ExportResult> {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      return {
        success: false,
        error: `要素が見つかりません: ${elementId}`
      };
    }
    
    console.log('🖼️ [exportUtils] SVG エクスポート開始:', fileName);
    
    // SVG生成
    const dataUrl = await toSvg(element, {
      cacheBust: true,
      backgroundColor: '#ffffff',
    });
    
    // ダウンロード
    downloadFile(dataUrl, `${fileName}.svg`);
    
    console.log('✅ [exportUtils] SVG エクスポート完了');
    
    return {
      success: true,
      message: 'SVGファイルのエクスポートに成功しました'
    };
  } catch (error) {
    console.error('❌ [exportUtils] SVG エクスポートエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
    };
  }
}

/**
 * JSON形式でエクスポート
 * 
 * @param data エクスポートするデータ
 * @param fileName ファイル名（拡張子なし）
 * @returns エクスポート結果
 */
export function exportToJson(
  data: unknown,
  fileName: string = 'petri-net'
): ExportResult {
  try {
    console.log('📄 [exportUtils] JSON エクスポート開始:', fileName);
    
    // JSON文字列化（インデント付き）
    const jsonString = JSON.stringify(data, null, 2);
    
    // Blob作成
    const blob = new Blob([jsonString], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(blob);
    
    // ダウンロード
    downloadFile(dataUrl, `${fileName}.json`);
    
    // URL解放
    URL.revokeObjectURL(dataUrl);
    
    console.log('✅ [exportUtils] JSON エクスポート完了');
    
    return {
      success: true,
      message: 'JSONファイルのエクスポートに成功しました'
    };
  } catch (error) {
    console.error('❌ [exportUtils] JSON エクスポートエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
    };
  }
}

/**
 * ファイルダウンロード処理
 * 
 * @param dataUrl データURL
 * @param fileName ファイル名
 */
function downloadFile(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  
  // ダウンロード実行
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * エクスポート可能かチェック（要素IDベース）
 * 
 * @param elementId エクスポート対象の要素ID
 * @returns チェック結果
 */
export function canExport(elementId: string): boolean {
  const element = document.getElementById(elementId);
  return element !== null;
}

// ---------------------------------------------------------------------------
// 以下は exportHelpers.ts より統合（ReactFlow対応版）
// ---------------------------------------------------------------------------

import type { Node, Edge, Viewport } from 'reactflow';

/**
 * エクスポートオプション（ReactFlow版）
 */
export interface ExportOptions {
  /** ファイル名のプレフィックス（デフォルト: 'petri-net'） */
  filePrefix?: string;
  /** 背景色（デフォルト: '#ffffff'） */
  backgroundColor?: string;
  /** PNG品質（0.0-1.0、デフォルト: 1.0） */
  quality?: number;
  /** ピクセル比率（デフォルト: 2） */
  pixelRatio?: number;
}

/**
 * JSONエクスポートメタデータ
 */
export interface ExportMetadata {
  exportedAt: string;
  nodeCount: number;
  edgeCount: number;
  version: string;
  projectName?: string;
  methodName?: string;
}

/**
 * エクスポート形式の型
 */
export type ExportFormat = 'png' | 'svg' | 'json';

/**
 * PNG形式でエクスポート（CSSセレクタ版）
 */
export const exportToPngBySelector = async (
  elementSelector: string = '.react-flow',
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filePrefix = 'petri-net',
    backgroundColor = '#ffffff',
    quality = 1.0,
    pixelRatio = 2
  } = options;

  const element = document.querySelector(elementSelector) as HTMLElement;
  if (!element) {
    throw new Error(`Export target element not found: ${elementSelector}`);
  }

  const dataUrl = await toPng(element, { backgroundColor, quality, pixelRatio, cacheBust: true });
  const link = document.createElement('a');
  link.download = `${filePrefix}_${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};

/**
 * SVG形式でエクスポート（CSSセレクタ版）
 */
export const exportToSvgBySelector = async (
  elementSelector: string = '.react-flow',
  options: ExportOptions = {}
): Promise<void> => {
  const { filePrefix = 'petri-net', backgroundColor = '#ffffff' } = options;

  const element = document.querySelector(elementSelector) as HTMLElement;
  if (!element) {
    throw new Error(`Export target element not found: ${elementSelector}`);
  }

  const dataUrl = await toSvg(element, { backgroundColor, cacheBust: true });
  const link = document.createElement('a');
  link.download = `${filePrefix}_${Date.now()}.svg`;
  link.href = dataUrl;
  link.click();
};

/**
 * JSON形式でエクスポート（ReactFlow版）
 */
export const exportFlowToJson = (
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport,
  options: ExportOptions = {},
  metadata?: Partial<ExportMetadata>
): void => {
  const { filePrefix = 'petri-net' } = options;
  const flowData = {
    nodes, edges, viewport,
    metadata: {
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      version: '1.0.0',
      ...metadata
    }
  };
  const dataStr = JSON.stringify(flowData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.download = `${filePrefix}_${Date.now()}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * 統合エクスポート関数（ReactFlow版）
 */
export const exportPetriNet = async (
  format: ExportFormat,
  params: {
    elementSelector?: string;
    nodes?: Node[];
    edges?: Edge[];
    viewport?: Viewport;
    options?: ExportOptions;
    metadata?: Partial<ExportMetadata>;
  }
): Promise<void> => {
  const {
    elementSelector = '.react-flow',
    nodes = [],
    edges = [],
    viewport = { x: 0, y: 0, zoom: 1 },
    options = {},
    metadata
  } = params;

  switch (format) {
    case 'png':
      await exportToPngBySelector(elementSelector, options);
      break;
    case 'svg':
      await exportToSvgBySelector(elementSelector, options);
      break;
    case 'json':
      exportFlowToJson(nodes, edges, viewport, options, metadata);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * エクスポート可能かチェック（ReactFlow版）
 */
export const canExportFlow = (
  format: ExportFormat,
  elementSelector: string = '.react-flow',
  hasData: boolean = false
): boolean => {
  if (format === 'json') return hasData;
  return document.querySelector(elementSelector) !== null;
};
