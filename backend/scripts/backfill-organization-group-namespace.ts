/**
 * 既存の organization_group に namespace URI を一括登録するバックフィルスクリプト
 *
 * 本タスク（チーム作成時 namespace 自動生成）導入以前に作成されたチームに対して、
 * namespace テーブルへのレコードを遡及登録する。
 *
 * 特徴:
 * - 冪等: 既に scope_key が登録済みのグループはスキップ
 * - 安全: 各グループを個別のトランザクションで処理（1件失敗しても他には影響しない）
 * - 順序保証: layer 昇順（親→子）で処理するため、祖先チェーン取得が正確に行える
 *
 * 実行方法:
 *   npx ts-node backend/scripts/backfill-organization-group-namespace.ts
 *
 * 環境変数:
 *   DATABASE_URL または DB_* 環境変数（通常の backend/.env を使用）
 */

import 'dotenv/config';
import { getPgp } from '../src/database/db';
import * as organizationGroupRepository from '../src/repositories/organizationGroupRepository';
import * as namespaceTermRepository from '../src/repositories/namespaceTermRepository';
import { ensureGroupNamespace } from '../src/services/organizationGroupService';

// 進捗カウンタ
let totalGroups = 0;
let skipped = 0;
let registered = 0;
let failed = 0;

/**
 * 全組織の organization_group を layer 昇順で取得する
 */
async function getAllGroupsForOrganization(
  organizationId: string
): Promise<Array<{ organization_group_cd: string; parent_group_cd: string | null; organization_cd: string }>> {
  const pgp = getPgp();
  const rows = await pgp.any<{
    organization_group_cd: string;
    parent_group_cd: string | null;
    organization_cd: string;
  }>(
    `
    SELECT
      g.organization_group_cd
      , g.parent_group_cd
      , o.organization_cd
    FROM organization_group g
    INNER JOIN organization o ON o.organization_id = g.organization_id
    WHERE g.organization_id = $1
    ORDER BY
      COALESCE(CAST(g.layer AS INTEGER), 0) ASC
      , g.organization_group_cd ASC
    `,
    [organizationId]
  );
  return rows;
}

/**
 * 全組織 ID の一覧を取得する
 */
async function getAllOrganizationIds(): Promise<string[]> {
  const pgp = getPgp();
  const rows = await pgp.any<{ organization_id: string }>(
    `SELECT organization_id FROM organization ORDER BY organization_id`
  );
  return rows.map((r) => r.organization_id);
}

async function main(): Promise<void> {
  console.log('=== organization_group namespace backfill 開始 ===');
  console.log();

  const pgp = getPgp();
  const organizationIds = await getAllOrganizationIds();
  console.log(`対象組織数: ${organizationIds.length}`);
  console.log();

  for (const organizationId of organizationIds) {
    console.log(`--- 組織 ${organizationId} を処理中 ---`);

    const groups = await getAllGroupsForOrganization(organizationId);
    console.log(`  グループ数: ${groups.length}`);
    totalGroups += groups.length;

    for (const group of groups) {
      const { organization_group_cd: groupCd, parent_group_cd: parentGroupCd, organization_cd: organizationCd } = group;

      try {
        // 既存チェック（冪等確認）
        const alreadyExists = await namespaceTermRepository.existsByScopeKey(organizationId, groupCd);
        if (alreadyExists) {
          console.log(`  [SKIP] ${groupCd}: namespace 登録済み`);
          skipped++;
          continue;
        }

        // 個別トランザクションで namespace を登録
        await pgp.tx(async (t) => {
          await ensureGroupNamespace(t, {
            organizationId,
            organizationCd,
            groupCd,
            parentGroupCd,
            userId: 'backfill-script',
          });
        });

        console.log(`  [OK]   ${groupCd}: namespace 登録完了`);
        registered++;
      } catch (err) {
        console.error(`  [ERR]  ${groupCd}: 登録失敗`, err);
        failed++;
      }
    }
  }

  console.log();
  console.log('=== backfill 完了 ===');
  console.log(`  合計グループ数 : ${totalGroups}`);
  console.log(`  登録済みスキップ: ${skipped}`);
  console.log(`  新規登録       : ${registered}`);
  console.log(`  失敗           : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('backfill スクリプト実行中に予期しないエラーが発生しました:', err);
  process.exit(1);
});
