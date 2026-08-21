/**
 * aggregationRuleRepository.ts
 *
 * aggregation_rules テーブルへのデータアクセスを提供
 *
 * @remarks
 * DDL: backend/src/sql/ddl/aggregation_rules.sql
 * 主キー: (organization_id, rule_id, version)
 *
 * @module aggregationRuleRepository
 * @version 1.0.0
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type { AggregationRule, CreateAggregationRuleInput } from '../types/aggregationRule';

// ─────────────────────────────────────────────────────────────────────────────
// Repository メソッド
// ─────────────────────────────────────────────────────────────────────────────

/**
 * テナントの ACTIVE ルールを取得する
 *
 * @param organizationId - 組織ID
 * @returns ACTIVE ルール（存在しない場合は null）
 */
export async function findActive(
  organizationId: string
): Promise<AggregationRule | null> {
  const pgp = getPgp();
  const sql = await loadSqlFile('aggregation_rules/findActive.sql');
  return pgp.oneOrNone<AggregationRule>(sql, [organizationId]);
}

/**
 * テナントのルール履歴一覧を取得する（版降順）
 *
 * @param organizationId - 組織ID
 * @returns ルール一覧
 */
export async function findAll(
  organizationId: string
): Promise<AggregationRule[]> {
  const pgp = getPgp();
  const sql = await loadSqlFile('aggregation_rules/findAll.sql');
  return pgp.any<AggregationRule>(sql, [organizationId]);
}

/**
 * 既存の ACTIVE ルールを DEPRECATED に遷移させる
 *
 * @param organizationId - 組織ID
 */
export async function deprecateOld(
  organizationId: string
): Promise<void> {
  const pgp = getPgp();
  const sql = await loadSqlFile('aggregation_rules/deprecateOld.sql');
  await pgp.none(sql, [organizationId]);
}

/**
 * 新版の集約ルールを ACTIVE として挿入する
 *
 * @param organizationId - 組織ID
 * @param version        - 新しい版番号
 * @param input          - ルールパラメータ
 * @param createdBy      - 作成者ユーザーID
 * @returns 作成されたルールレコード
 */
export async function insert(
  organizationId: string,
  version: number,
  input: CreateAggregationRuleInput,
  createdBy: string | null
): Promise<AggregationRule> {
  const pgp = getPgp();
  const sql = await loadSqlFile('aggregation_rules/insert.sql');
  return pgp.one<AggregationRule>(sql, [
    organizationId,                                   // $1
    version,                                          // $2
    input.score_good          ?? 100,                 // $3
    input.score_caution       ?? 50,                  // $4
    input.score_bad           ?? 0,                   // $5
    input.target_rollup       ?? 'WORST_CASE',        // $6
    input.level_status_rule   ?? 'WORST_CASE',        // $7
    input.level_score_rule    ?? 'MEAN',              // $8
    input.missing_handling    ?? 'SEPARATE_COUNT',    // $9
    input.transition_hierarchy ?? 'MERGE',            // $10
    createdBy,                                        // $11
  ]);
}
