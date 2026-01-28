/**
 * Export Helpers - ペトリネット図のエクスポート機能
 * 
 * PNG/SVG/JSON形式でペトリネット図をエクスポートする機能を提供
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import { toPng, toSvg } from 'html-to-image';
import type { Node, Edge, Viewport } from 'reactflow';

/**
 * エクスポートオプション
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
 * PNG形式でエクスポート
 * 
 * @param elementSelector エクスポート対象要素のCSSセレクタ（デフォルト: '.react-flow'）
 * @param options エクスポートオプション
 * @throws {Error} 対象要素が見つからない場合
 */
export const exportToPng = async (
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

  try {
    const dataUrl = await toPng(element, {
      backgroundColor,
      quality,
      pixelRatio,
      cacheBust: true,
    });

    const link = document.createElement('a');
    link.download = `${filePrefix}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('PNG export failed:', error);
    throw new Error(`PNG export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * SVG形式でエクスポート
 * 
 * @param elementSelector エクスポート対象要素のCSSセレクタ（デフォルト: '.react-flow'）
 * @param options エクスポートオプション
 * @throws {Error} 対象要素が見つからない場合
 */
export const exportToSvg = async (
  elementSelector: string = '.react-flow',
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filePrefix = 'petri-net',
    backgroundColor = '#ffffff'
  } = options;

  const element = document.querySelector(elementSelector) as HTMLElement;
  if (!element) {
    throw new Error(`Export target element not found: ${elementSelector}`);
  }

  try {
    const dataUrl = await toSvg(element, {
      backgroundColor,
      cacheBust: true,
    });

    const link = document.createElement('a');
    link.download = `${filePrefix}_${Date.now()}.svg`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('SVG export failed:', error);
    throw new Error(`SVG export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * JSON形式でエクスポート
 * 
 * @param nodes ReactFlowノード配列
 * @param edges ReactFlowエッジ配列
 * @param viewport ビューポート情報
 * @param options エクスポートオプション
 * @param metadata 追加メタデータ
 */
export const exportToJson = (
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport,
  options: ExportOptions = {},
  metadata?: Partial<ExportMetadata>
): void => {
  const { filePrefix = 'petri-net' } = options;

  const flowData = {
    nodes,
    edges,
    viewport,
    metadata: {
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      version: '1.0.0',
      ...metadata
    }
  };

  try {
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.download = `${filePrefix}_${Date.now()}.json`;
    link.href = url;
    link.click();

    // メモリリークを防ぐため、URLをクリーンアップ
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('JSON export failed:', error);
    throw new Error(`JSON export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * エクスポート形式の型
 */
export type ExportFormat = 'png' | 'svg' | 'json';

/**
 * 統合エクスポート関数
 * 
 * @param format エクスポート形式
 * @param params エクスポートパラメータ
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
      await exportToPng(elementSelector, options);
      break;
    case 'svg':
      await exportToSvg(elementSelector, options);
      break;
    case 'json':
      exportToJson(nodes, edges, viewport, options, metadata);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * エクスポート可能かチェック
 * 
 * @param format エクスポート形式
 * @param elementSelector 要素セレクタ（PNG/SVGの場合）
 * @param hasData データが存在するか（JSONの場合）
 * @returns エクスポート可能かどうか
 */
export const canExport = (
  format: ExportFormat,
  elementSelector: string = '.react-flow',
  hasData: boolean = false
): boolean => {
  if (format === 'json') {
    return hasData;
  }

  const element = document.querySelector(elementSelector);
  return element !== null;
};