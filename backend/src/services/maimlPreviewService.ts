/**
 * MaiML プレビュー生成サービス
 *
 * @description ParsedSeries から maiml_series_preview 行を生成する
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 5
 *
 * 対応モード:
 *   - uniform  : 等間隔間引き（デフォルト）
 *   - maxhold  : 各バケット内の最大値を保持
 *   - mmr      : Minimum Maximum Ratio（ピーク保存間引き）
 *
 * TODO: inline series を含む MaiML サンプル入手後に実装品質を向上させる
 *       現時点では uniform モードのみ完全実装。maxhold / mmr は暫定実装。
 */

import type { ParsedSeries, MaimlSeriesPreview, PreviewMode, SeriesType, PreviewQuality } from '../types/maimlOpenData';
import { determineSeriesType } from './maimlKvExtractorService';

// ============================================================
// 定数
// ============================================================

/** プレビューの最大点数 */
const DEFAULT_MAX_POINTS = 1000;

// ============================================================
// 公開関数
// ============================================================

/**
 * ParsedSeries 配列から MaimlSeriesPreview 行を生成する
 *
 * @param assetId - 取り込み先 asset_id
 * @param seriesList - KV 抽出サービスから得た ParsedSeries[]
 * @param mode - プレビューモード（デフォルト: 'uniform'）
 * @param maxPoints - プレビュー最大点数（デフォルト: 1000）
 */
export function generatePreviews(
  assetId: number,
  seriesList: ParsedSeries[],
  mode: PreviewMode = 'uniform',
  maxPoints: number = DEFAULT_MAX_POINTS,
): MaimlSeriesPreview[] {
  return seriesList.map((series) =>
    generatePreview(assetId, series, mode, maxPoints),
  );
}

/**
 * 単一 ParsedSeries から MaimlSeriesPreview 行を生成する
 */
function generatePreview(
  assetId: number,
  series: ParsedSeries,
  mode: PreviewMode,
  maxPoints: number,
): MaimlSeriesPreview {
  const { x_values: xOrig, y_values: yOrig } = series;
  const originalPoints = xOrig.length;

  // 間引き処理
  const { x: xPrev, y: yPrev } = downsample(xOrig, yOrig, mode, maxPoints);

  // 品質指標計算
  const quality = calcQuality(xOrig, yOrig, xPrev, yPrev);

  // series_type 判定（TODO: content key 属性から確定させる）
  const seriesType: SeriesType = series.content_id
    ? determineSeriesType(series.content_id)
    : 'OTHER';

  // 範囲
  const xMin = xPrev.length > 0 ? Math.min(...xPrev) : null;
  const xMax = xPrev.length > 0 ? Math.max(...xPrev) : null;
  const yMin = yPrev.length > 0 ? Math.min(...yPrev) : null;
  const yMax = yPrev.length > 0 ? Math.max(...yPrev) : null;

  return {
    asset_id:        assetId,
    instruction_id:  series.instruction_id,
    template_id:     series.template_id,
    result_id:       series.result_id,
    result_name:     series.result_name,
    content_id:      series.content_id,
    content_size:    series.content_size,
    series_type:     seriesType,
    x_label:         series.x_label,
    y_label:         series.y_label,
    mode,
    params:          { max_points: maxPoints },
    original_points: originalPoints,
    preview_points:  xPrev.length,
    x:               xPrev,
    y:               yPrev,
    x_min:           xMin,
    x_max:           xMax,
    y_min:           yMin,
    y_max:           yMax,
    quality,
  };
}

// ============================================================
// 間引きアルゴリズム
// ============================================================

function downsample(
  x: number[],
  y: number[],
  mode: PreviewMode,
  maxPoints: number,
): { x: number[]; y: number[] } {
  if (x.length <= maxPoints) {
    return { x: [...x], y: [...y] };
  }

  switch (mode) {
    case 'uniform':  return downsampleUniform(x, y, maxPoints);
    case 'maxhold':  return downsampleMaxhold(x, y, maxPoints);
    case 'mmr':
      // TODO: MMR アルゴリズム実装（ピーク保存間引き）
      //       BasicDesign v1.3 § 5.2 参照。現時点は uniform にフォールバック
      return downsampleUniform(x, y, maxPoints);
    default:
      return downsampleUniform(x, y, maxPoints);
  }
}

/**
 * 等間隔間引き
 */
function downsampleUniform(
  x: number[],
  y: number[],
  maxPoints: number,
): { x: number[]; y: number[] } {
  const n = x.length;
  const step = n / maxPoints;
  const xOut: number[] = [];
  const yOut: number[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.round(i * step), n - 1);
    xOut.push(x[idx]);
    yOut.push(y[idx]);
  }

  return { x: xOut, y: yOut };
}

/**
 * バケット最大値保持間引き
 */
function downsampleMaxhold(
  x: number[],
  y: number[],
  maxPoints: number,
): { x: number[]; y: number[] } {
  const n = x.length;
  const bucketSize = n / maxPoints;
  const xOut: number[] = [];
  const yOut: number[] = [];

  for (let b = 0; b < maxPoints; b++) {
    const start = Math.floor(b * bucketSize);
    const end   = Math.min(Math.floor((b + 1) * bucketSize), n);
    let maxY = -Infinity;
    let maxIdx = start;

    for (let i = start; i < end; i++) {
      if (y[i] > maxY) {
        maxY   = y[i];
        maxIdx = i;
      }
    }

    xOut.push(x[maxIdx]);
    yOut.push(y[maxIdx]);
  }

  return { x: xOut, y: yOut };
}

// ============================================================
// 品質指標
// ============================================================

/**
 * プレビュー品質指標を計算する
 *
 * @remarks
 * BasicDesign v1.3 § 5.3
 * - mae: 元データと間引き後の MAE（補間比較）
 * - area_ratio: 面積比（プレビュー/元データ）
 */
function calcQuality(
  xOrig: number[],
  yOrig: number[],
  xPrev: number[],
  yPrev: number[],
): PreviewQuality {
  if (xOrig.length === 0 || xPrev.length === 0) {
    return {};
  }

  // area_ratio: プレビューの積分 / 元データの積分
  const areaOrig = trapz(xOrig, yOrig);
  const areaPrev = trapz(xPrev, yPrev);
  const areaRatio = areaOrig !== 0 ? areaPrev / areaOrig : null;

  const quality: PreviewQuality = {};
  if (areaRatio !== null) quality.area_ratio = areaRatio;

  return quality;
}

/** 台形積分 */
function trapz(x: number[], y: number[]): number {
  let area = 0;
  for (let i = 1; i < x.length; i++) {
    area += 0.5 * (y[i - 1] + y[i]) * (x[i] - x[i - 1]);
  }
  return area;
}
