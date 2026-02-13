/**
 * Export機能ユーティリティ
 * 
 * Petri Netエディタのエクスポート機能を提供
 * - PNG形式エクスポート
 * - SVG形式エクスポート
 * - JSON形式エクスポート
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
 * エクスポート可能かチェック
 * 
 * @param elementId エクスポート対象の要素ID
 * @returns チェック結果
 */
export function canExport(elementId: string): boolean {
  const element = document.getElementById(elementId);
  return element !== null;
}