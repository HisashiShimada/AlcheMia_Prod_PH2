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
 * @version 2.0.0
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type { AggregationRule, CreateAggregationRuleInput } from '../types/aggregationRule';
import {
  TargetRollup,
  LevelStatusRule,
  LevelScoreRule,
  MissingHandling,
  TransitionHierarchy,
} from '../enums/aggregationRule.enum';

// ─────────────────────────────────────────────────────────────────────────────
// Repository メソッド
// ─────────────────────────────────────────────────────────────────────────────

/**
 * テナントの有効ルール（is_active = true）を取得する
 *
 * @param organizationId - 組織ID
 * @returns 有効ルール（存在しない場合は null）
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
 * 既存の有効ルールを無効化する（is_active = false に遷移）
 *
 * @param organizationId - 組織ID
 * @param updatedBy      - 更新者ユーザーID
 */
export async function deprecateOld(
  organizationId: string,
  updatedBy: string | null
): Promise<void> {
  const pgp = getPgp();
  const sql = await loadSqlFile('aggregation_rules/deprecateOld.sql');
  await pgp.none(sql, [organizationId, updatedBy]);
}

/**
 * 新版の集約ルールを有効として挿入する
 *
 * @param organizationId - 組織ID
 * @param version        - 新しい版番号
 * @param input          - ルールパラメータ
 * @param createUserId   - 作成者ユーザーID
 * @returns 作成されたルールレコード
 */
export async function insert(
  organizationId: string,
  version: number,
  input: CreateAggregationRuleInput,
  createUserId: string | null
): Promise<AggregationRule> {
  const pgp = getPgp();
  const sql = await loadSqlFile('aggregation_rules/insert.sql');
  return pgp.one<AggregationRule>(sql, [
    organizationId,                                    // $1
    version,                                           // $2
    input.score_good          ?? 100,                  // $3
    input.score_caution       ?? 50,                   // $4
    input.score_bad           ?? 0,                    // $5
    input.target_rollup       ?? TargetRollup.WORST_CASE,        // $6
    input.level_status_rule   ?? LevelStatusRule.WORST_CASE,     // $7
    input.level_score_rule    ?? LevelScoreRule.MEAN,            // $8
    input.missing_handling    ?? MissingHandling.SEPARATE_COUNT,  // $9
    input.transition_hierarchy ?? TransitionHierarchy.MERGE,     // $10
    createUserId,                                      // $11
  ]);
}

