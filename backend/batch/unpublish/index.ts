/**
 * MaiML 非公開バッチ（期限切れアセットの一括非公開）
 *
 * 実行方法:
 *   npx ts-node -P backend/batch/unpublish/tsconfig.json backend/batch/unpublish/index.ts
 *
 * npm scripts から実行:
 *   cd backend && npm run batch:unpublish
 *
 * cron設定例（毎日0時に実行）:
 *   0 0 * * * cd /path/to/mmdpf/backend && npm run batch:unpublish >> /var/log/mmdpf/unpublish.log 2>&1
 *
 * 環境変数:
 *   UNPUBLISH_MODE  - 'keep_meta'（デフォルト）または 'full_delete'
 *                     keep_meta  : KV / プレビュー / 生データを削除。代表メタ（maiml_asset）は残す
 *                     full_delete: maiml_asset ごと CASCADE 完全削除
 */

import { createPool } from './db';
import { unpublishDueAssets, type UnpublishMode } from './unpublish';

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] unpublish batch start`);

  // 環境変数から非公開モードを取得（デフォルト: keep_meta）
  const rawMode = process.env.UNPUBLISH_MODE ?? 'keep_meta';
  if (rawMode !== 'keep_meta' && rawMode !== 'full_delete') {
    console.error(
      `[${new Date().toISOString()}] 環境変数 UNPUBLISH_MODE の値が不正です: "${rawMode}"`,
    );
    console.error(`  有効な値: keep_meta | full_delete`);
    process.exit(1);
  }
  const mode: UnpublishMode = rawMode;
  console.log(`[${new Date().toISOString()}] mode=${mode}`);

  // DB接続プールを生成
  const pool = createPool();

  try {
    // 期限切れアセットを一括非公開
    const result = await unpublishDueAssets(pool, mode);

    // 結果サマリーをログ出力
    console.log(`[${new Date().toISOString()}] unpublish batch end`);
    console.log(`  total  : ${result.total}`);
    console.log(`  success: ${result.success}`);
    console.log(`  failed : ${result.failed}`);

    if (result.failed > 0) {
      console.error(
        `[${new Date().toISOString()}] ${result.failed} 件の処理に失敗しました。上記ログを確認してください。`,
      );
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] unpublish batch failed:`, err);
  process.exit(1);
});
