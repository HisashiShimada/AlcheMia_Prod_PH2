/**
 * uncertaintyCriteriaApiService.ts
 * 不確かさ基準管理 API サービス
 *
 * @remarks
 * バックエンドの uncertaintyCriteriaController.ts に接続する。
 * エンドポイント:
 *   GET  /api/v1/uncertainty-criteria   ← 不確かさ基準一覧取得
 *
 */

import { createApiClient } from '@/utils/authUtils';
import type { UncertaintyTemplate } from '@/components/uncertainty/UncertaintyListTable';

// ─────────────────────────────────────────────────────────────
// Enum 変換関数
// ─────────────────────────────────────────────────────────────

/**
 * evaluation_method（数値）を評価方式文字列に変換
 *
 * @param value - 1: 定量 / 2: 定性
 * @returns 'quantitative' | 'qualitative'
 */
function toEvalMethod(value: number): 'quantitative' | 'qualitative' {
  return value === 1 ? 'quantitative' : 'qualitative';
}

/**
 * is_Invalid（boolean）を状態文字列に変換
 *
 * @param isInvalid - true: 無効 / false: 有効
 * @returns 'active' | 'deprecated'
 */
function toStatus(isInvalid: boolean): 'active' | 'deprecated' {
  return isInvalid ? 'deprecated' : 'active';
}

/**
 * version（整数）をバージョン文字列に変換（先頭に "V" を付ける）
 *
 * @param version - バージョン番号（整数）
 * @returns 例: 1 → "V1"
 */
function toVersionString(version: number): string {
  return `V${version}`;
}

// ─────────────────────────────────────────────────────────────
// APIレスポンス型（バックエンドの UncertaintyCriteriaRow に対応）
// ─────────────────────────────────────────────────────────────

interface UncertaintyCriteriaApiRow {
  uncertaintyKey: string;
  uncertaintyName: string;
  nameSpaceId: string;
  version: number;
  evaluationMethod: number;
  isInvalid: boolean;
  inheritanceUncertaintyKey: string | null;
  xsiType: string | null;
  units: string | null;
  scaleFactor: string | null;
  formatString: string | null;
  description: string | null;
  /** namespace_term の表示名（uncertainty_key に紐づく） */
  termDisplayName: string | null;
  /** namespace_term の説明（uncertainty_key に紐づく） */
  termDescription: string | null;
}

/** 定性評価選択肢の API レスポンス型（intuition_selector に対応） */
export interface QualitativeOptionApiRow {
  displayOrder: number;
  selectorValue: string;
  displayColor: string;
  isDefault: boolean;
}

/** 詳細取得 API レスポンス型（UncertaintyCriteriaDetailRow に対応） */
export interface UncertaintyCriteriaDetailApiRow extends UncertaintyCriteriaApiRow {
  qualitativeOptions: QualitativeOptionApiRow[];
}

// ─────────────────────────────────────────────────────────────
// API 関数
// ─────────────────────────────────────────────────────────────

/**
 * 不確かさ基準一覧を取得する
 *
 * @returns 不確かさ基準一覧（UncertaintyTemplate[] 型に変換済み）
 */
export async function fetchUncertaintyCriteriaList(): Promise<UncertaintyTemplate[]> {
  const client = createApiClient();

  const response = await client.get<UncertaintyCriteriaApiRow[]>(
    '/uncertainty-criteria'
  );

  // APIレスポンスを UncertaintyTemplate 型に変換
  return response.data.map((row, index): UncertaintyTemplate => ({
    id: index + 1,                                          // 画面用の連番ID
    name: row.uncertaintyName,                              // uncertainty_name カラムから取得
    key: row.uncertaintyKey,
    scope: '',                                              // DBにカラムなし（空白）
    eval: toEvalMethod(row.evaluationMethod),
    type: row.xsiType ?? '',
    desc: row.description ?? '',
    version: toVersionString(row.version),
    status: toStatus(row.isInvalid),
    units: row.units ?? '',
    format: row.formatString ?? '',
    validFrom: '',                                          // DBにカラムなし（空白）
    validTo: '',                                            // DBにカラムなし（空白）
    extends: row.inheritanceUncertaintyKey ?? '',
    termDisplayName: row.termDisplayName ?? null,
    toleranceUpper:  (row as any).toleranceUpper ?? null,
    toleranceLower:  (row as any).toleranceLower ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────
// セレクター用 API レスポンス型
// ─────────────────────────────────────────────────────────────

/** セレクター用 API レスポンス型（バックエンドの UncertaintyCriteriaSelectorRow に対応） */
export interface UncertaintyCriteriaSelectorApiRow {
  uncertaintyKey: string;
  uncertaintyName: string;
  nameSpaceId: string;
  version: number;
  evaluationMethod: number;
  xsiType: string | null;
  units: string | null;
  scaleFactor: string | null;
  formatString: string | null;
  description: string | null;
  qualitativeOptions: QualitativeOptionApiRow[];
}

// ─────────────────────────────────────────────────────────────
// セレクター用モーダルの UncertaintyCriteria 型
// ─────────────────────────────────────────────────────────────

/** UncertaintyCriteriaSelectorModal が使用する UncertaintyCriteria 型 */
export interface UncertaintyCriteriaForSelector {
  /** 画面用連番ID */
  id: number;
  /** 不確かさ基準名（uncertainty_key をそのまま使用） */
  name: string;
  /** 不確かさ基準Key */
  key: string;
  /** 評価方式 */
  evalType: 'quantitative' | 'qualitative';
  /** スコープ種別（DBになし → 'organization' 固定） */
  scopeType: 'personal' | 'group' | 'organization' | 'global';
  /** スコープラベル（nameSpaceId を使用） */
  scopeLabel: string;
  /** スコープ優先順（organization 固定 → 3） */
  scopeOrder: number;
  /** 説明 */
  desc: string;
  /** 単位 */
  unit: string;
  /** xsi:type（例: intType, doubleType） */
  xsiType: string;
  /** 倍率（scale_factor） */
  scaleFactor: string | null;
  /** フォーマット文字列 */
  format: string;
  /** 対象セクション（DBになし → 全セクション固定） */
  targetSections: Array<'material' | 'condition' | 'result'>;
  /** 対象タグ（DBになし → 'property' 固定、定性は 'content'） */
  targetTag: 'property' | 'content';
  /** 型マッチ候補（xsiType から生成） */
  typeMatches: string[];
  /** 単位マッチ候補（units から生成） */
  unitMatches: string[];
  /** 定性評価の選択肢 */
  qualitativeOptions: QualitativeOptionApiRow[];
}

// ─────────────────────────────────────────────────────────────
// セレクター用 API 関数
// ─────────────────────────────────────────────────────────────

/**
 * 不確かさ基準セレクター用一覧を取得する（有効なもののみ、定性評価の選択肢も含む）
 *
 * @returns セレクター用不確かさ基準一覧（UncertaintyCriteriaForSelector[] 型に変換済み）
 */
export async function fetchUncertaintyCriteriaForSelector(): Promise<UncertaintyCriteriaForSelector[]> {
  const client = createApiClient();

  const response = await client.get<UncertaintyCriteriaSelectorApiRow[]>(
    '/uncertainty-criteria/for-selector'
  );

  return response.data.map((row, index): UncertaintyCriteriaForSelector => {
    const isQuantitative = row.evaluationMethod === 1;

    // xsiType から typeMatches を生成（例: "Float" → ["Float"]）
    const typeMatches: string[] = row.xsiType ? [row.xsiType] : [];

    // units から unitMatches を生成（例: "g" → ["g"]）
    const unitMatches: string[] = row.units ? [row.units] : [];

    return {
      id:             index + 1,
      name:           row.uncertaintyName,                  // uncertainty_name カラムから取得
      key:            row.uncertaintyKey,
      evalType:       isQuantitative ? 'quantitative' : 'qualitative',
      scopeType:      'organization',                       // DBにスコープカラムなし → 固定
      scopeLabel:     row.nameSpaceId,                      // nameSpaceId を表示ラベルとして使用
      scopeOrder:     3,                                    // organization 固定
      desc:           row.description ?? '',
      unit:           row.units ?? '',
      xsiType:        row.xsiType ?? '',
      scaleFactor:    row.scaleFactor ?? null,
      format:         row.formatString ?? '',
      targetSections: ['material', 'condition', 'result'],  // DBになし → 全セクション
      targetTag:      isQuantitative ? 'property' : 'content',
      typeMatches,
      unitMatches,
      qualitativeOptions: row.qualitativeOptions,
    };
  });
}

/**
 * 不確かさ基準詳細を取得する（定性評価の選択肢を含む）
 *
 * @param uncertaintyKey - 不確かさ基準Key（uncertainty_key）
 * @param version - バージョン番号（整数）
 * @returns 詳細データ（UncertaintyCriteriaDetailApiRow 型）
 */
export async function fetchUncertaintyCriteriaDetail(
  uncertaintyKey: string,
  version: number
): Promise<UncertaintyCriteriaDetailApiRow> {
  const client = createApiClient();

  const response = await client.get<UncertaintyCriteriaDetailApiRow>(
    `/uncertainty-criteria/${encodeURIComponent(uncertaintyKey)}`,
    { params: { version } }
  );

  return response.data;
}

// ─────────────────────────────────────────────────────────────
// 保存用リクエスト / レスポンス型
// ─────────────────────────────────────────────────────────────

/** 定性評価選択肢の保存用型 */
export interface SaveQualitativeOption {
  displayOrder: number;
  value: string;
  displayColor: string;
  isDefault: boolean;
}

/** 不確かさ基準 新バージョン保存リクエスト型 */
export interface SaveUncertaintyCriteriaRequest {
  nameSpaceId: string;
  uncertaintyKey: string;
  uncertaintyName: string;
  evaluationMethod: number;      // 1: 定量 / 2: 定性
  isInvalid: boolean;
  inheritanceUncertaintyKey: string | null;
  xsiType: string | null;
  units: string | null;
  scaleFactor: string | null;
  formatString: string | null;
  description: string | null;
  qualitativeOptions: SaveQualitativeOption[];
}

/** 不確かさ基準 新バージョン保存レスポンス型 */
export interface SaveUncertaintyCriteriaResponse {
  /** 新たに採番されたバージョン番号 */
  version: number;
}

// ─────────────────────────────────────────────────────────────
// 保存 API 関数
// ─────────────────────────────────────────────────────────────

/**
 * 不確かさ基準を新バージョンとして保存する
 *
 * @remarks
 * POST /api/v1/uncertainty-criteria
 * 同一 uncertaintyKey の MAX(version)+1 で新規レコードをDBにINSERTする。
 * 定性評価の場合は intuition_selector にも選択肢をINSERTする。
 *
 * @param data - 保存リクエストデータ
 * @returns 新たに採番されたバージョン番号
 */
export async function saveUncertaintyCriteriaNewVersion(
  data: SaveUncertaintyCriteriaRequest
): Promise<SaveUncertaintyCriteriaResponse> {
  const client = createApiClient();

  const response = await client.post<SaveUncertaintyCriteriaResponse>(
    '/uncertainty-criteria',
    data
  );

  return response.data;
}
