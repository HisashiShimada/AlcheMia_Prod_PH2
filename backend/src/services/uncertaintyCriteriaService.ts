/**
 * uncertaintyCriteria Service
 *
 * 不確かさ基準管理に関するビジネスロジック
 *
 * @remarks
 * Controller と Repository の間を仲介するサービス層。
 * 現時点ではロジックをそのまま委譲するが、将来的な処理追加（バリデーション・変換等）は
 * このファイルに実装する。
 *
 * @module uncertaintyCriteriaService
 * @version 1.0.0
 */

import * as uncertaintyCriteriaRepository from '../repositories/uncertaintyCriteriaRepository';
import type {
  UncertaintyCriteriaRow,
  UncertaintyCriteriaDetailRow,
  UncertaintyCriteriaSelectorRow,
  InsertNewVersionRequest,
  InsertNewVersionResponse,
} from '../repositories/uncertaintyCriteriaRepository';

// 呼び出し元がインポートしやすいよう型を再エクスポートする
export type {
  UncertaintyCriteriaRow,
  UncertaintyCriteriaDetailRow,
  UncertaintyCriteriaSelectorRow,
  InsertNewVersionRequest,
  InsertNewVersionResponse,
};

// ─────────────────────────────────────────────────────────────────────────────
// サービス関数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 組織に紐づく不確かさ基準一覧を取得する
 *
 * @param organizationId - 組織ID
 * @returns 不確かさ基準一覧
 */
export async function getList(
  organizationId: string
): Promise<UncertaintyCriteriaRow[]> {
  return uncertaintyCriteriaRepository.findAllByOrganization(organizationId);
}

/**
 * セレクター用の不確かさ基準一覧を取得する（有効なもののみ・定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @returns セレクター用不確かさ基準一覧
 */
export async function getForSelector(
  organizationId: string
): Promise<UncertaintyCriteriaSelectorRow[]> {
  return uncertaintyCriteriaRepository.findForSelector(organizationId);
}

/**
 * 不確かさ基準1件を詳細取得する（定性評価の選択肢も含む）
 *
 * @param organizationId - 組織ID
 * @param uncertaintyKey - 不確かさ基準Key
 * @param version - バージョン番号
 * @returns 不確かさ基準詳細（見つからない場合は null）
 */
export async function getDetail(
  organizationId: string,
  uncertaintyKey: string,
  version: number
): Promise<UncertaintyCriteriaDetailRow | null> {
  return uncertaintyCriteriaRepository.findByKey(organizationId, uncertaintyKey, version);
}

/**
 * 不確かさ基準を新バージョンとして保存する
 *
 * @remarks
 * 同一 (organization_id, name_space_id, uncertainty_key) の MAX(version)+1 で INSERT し、
 * 旧バージョンを一括無効化する。定性評価の場合は intuition_selector にも登録する。
 *
 * @param organizationId - 組織ID
 * @param data - 保存リクエストデータ
 * @returns 新たに採番されたバージョン番号
 */
export async function createNewVersion(
  organizationId: string,
  data: InsertNewVersionRequest
): Promise<InsertNewVersionResponse> {
  return uncertaintyCriteriaRepository.insertNewVersion(organizationId, data);
}
