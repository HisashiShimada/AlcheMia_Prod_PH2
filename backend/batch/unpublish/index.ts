/**
 * MaiML 非公開バッチ（期限切れアセットの一括非公開）
 *
 * 実行方法:
 *   npx ts-node -P backend/batch/unpublish/tsconfig.json backend/batch/unpublish/index.ts [--mode <mode>]
 *
 * npm scripts から実行:
 *   cd backend && npm run batch:unpublish
 *   cd backend && npm run batch:unpublish -- --mode full_delete
 *
 * cron設定例（毎日0時に実行）:
 *   0 0 * * * cd /path/to/mmdpf/backend && npm run batch:unpublish >> /var/log/mmdpf/unpublish.log 2>&1
 *
 * モード指定（優先順位: コマンドライン引数 > 環境変数 > デフォルト）:
 *   --mode <mode>   - コマンドライン引数でモードを指定
 *   UNPUBLISH_MODE  - 環境変数でモードを指定
 *   デフォルト: 'keep_meta'
 *
 *   keep_meta  : KV / プレビュー / 生データを削除。代表メタ（maiml_asset）は残す
 *   full_delete: maiml_asset ごと CASCADE 完全削除
 */

import { createPool } from './db';
import { unpublishDueAssets, type UnpublishMode } from './unpublish';

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] unpublish batch start`);

  // コマンドライン引数から --mode を取得（優先順位: 引数 > 環境変数 > デフォルト）
  const args = process.argv.slice(2);
  const modeArgIndex = args.indexOf('--mode');
  const modeFromArg = modeArgIndex !== -1 ? args[modeArgIndex + 1] : undefined;
  const rawMode = modeFromArg ?? process.env.UNPUBLISH_MODE ?? 'keep_meta';

  if (rawMode !== 'keep_meta' && rawMode !== 'full_delete') {
    console.error(
      `[${new Date().toISOString()}] モードの値が不正です: "${rawMode}"`,
    );
    console.error(`  有効な値: keep_meta | full_delete`);
    console.error(`  指定方法: --mode <mode> または環境変数 UNPUBLISH_MODE`);
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
