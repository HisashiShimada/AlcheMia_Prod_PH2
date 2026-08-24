import 'dotenv/config';
import { getPgp } from '../src/database/db';

/**
 * バックフィルで誤登録された scope_key = 'backfill-script' を
 * URI の末尾セグメント（= organization_group_cd）に UPDATE する修正スクリプト
 */
async function main() {
  const pgp = getPgp();

  // 対象レコード取得
  const rows = await pgp.any<{ namespace_id: string; scope_key: string; uri: string }>(
    "SELECT namespace_id, scope_key, uri FROM namespace WHERE scope_key = 'backfill-script' ORDER BY namespace_id"
  );

  console.log(`対象レコード数: ${rows.length}`);

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    // URI の末尾セグメントを organization_group_cd として使用
    const correctScopeKey = row.uri.split('/').pop()!;

    try {
      await pgp.none(
        'UPDATE namespace SET scope_key = $1 WHERE namespace_id = $2',
        [correctScopeKey, row.namespace_id]
      );
      console.log(`[OK] ${row.namespace_id}: scope_key = '${correctScopeKey}' (uri: ${row.uri})`);
      updated++;
    } catch (e: unknown) {
      console.error(`[ERR] ${row.namespace_id}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log();
  console.log('=== 修正完了 ===');
  console.log(`  更新成功: ${updated}`);
  console.log(`  失敗    : ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e: unknown) => { console.error((e as Error).message); process.exit(1); });
