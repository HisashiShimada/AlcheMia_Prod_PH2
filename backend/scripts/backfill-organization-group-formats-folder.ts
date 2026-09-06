/**
 * 既存 organization_group の formats フォルダをバックフィルするスクリプト
 *
 * 対象グループレコードは scripts/result/organization_group.txt（TSV形式）から読み込む。
 * ファイルサーバ（S3/Swift）上に formats/{group_cd}/ フォルダが存在しない場合のみ作成する。
 *
 * 特徴:
 * - 冪等: 既に formats/{group_cd}/ が存在するグループはスキップ
 * - 安全: 1件失敗しても他グループの処理を継続
 * - DB 不要: グループ一覧は TSV ファイルから取得
 *
 * 実行方法:
 *   cd backend
 *   npx ts-node scripts/backfill-organization-group-formats-folder.ts
 *
 * 環境変数:
 *   SWIFT_* または AWS_* 系（通常の backend/.env を使用）
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getStorageService } from '../src/services/storageService';

// ─── 設定 ───────────────────────────────────────────────────────────────────

/** グループレコードを記載した TSV ファイルのパス */
const TSV_FILE_PATH = path.join(__dirname, '../../scripts/result/organization_group.txt');

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface GroupRecord {
  organizationId: string;
  organizationGroupCd: string;
}

// ─── TSV パーサー ─────────────────────────────────────────────────────────────

/**
 * TSV ファイルを読み込んでグループレコードの配列を返す
 *
 * - ヘッダー行はスキップ
 * - organization_id の {} を除去
 * - 空行はスキップ
 */
function parseTsv(filePath: string): GroupRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  // 1行目はヘッダー
  const headers = lines[0].split('\t');
  const orgIdIdx = headers.indexOf('organization_id');
  const groupCdIdx = headers.indexOf('organization_group_cd');

  if (orgIdIdx === -1 || groupCdIdx === -1) {
    throw new Error(
      `TSVヘッダーに organization_id または organization_group_cd が見つかりません: ${headers.join(', ')}`
    );
  }

  const records: GroupRecord[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split('\t');
    const rawOrgId = cols[orgIdIdx]?.trim() ?? '';
    const groupCd = cols[groupCdIdx]?.trim() ?? '';

    if (!rawOrgId || !groupCd) continue;

    // {UUID} → UUID に正規化
    const organizationId = rawOrgId.replace(/^\{|\}$/g, '');

    records.push({ organizationId, organizationGroupCd: groupCd });
  }

  return records;
}

// ─── メイン処理 ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== organization_group formats フォルダ backfill 開始 ===');
  console.log();

  // TSV ファイル読み込み
  console.log(`TSVファイル読み込み: ${TSV_FILE_PATH}`);
  const records = parseTsv(TSV_FILE_PATH);
  console.log(`対象グループ数: ${records.length}`);
  console.log();

  const storageService = getStorageService();

  let totalGroups = 0;
  let skipped = 0;
  let created = 0;
  let failed = 0;

  for (const record of records) {
    totalGroups++;
    const { organizationId, organizationGroupCd: groupCd } = record;

    try {
      // 既存チェック: formats/{group_cd}/ フォルダマーカーの有無で判断（冪等）
      const folderMarkerPath = `formats/${groupCd}/`;
      const exists = await storageService.fileExists(organizationId, folderMarkerPath);

      if (exists) {
        console.log(`  [SKIP] ${groupCd} (org: ${organizationId}): フォルダ作成済み`);
        skipped++;
        continue;
      }

      // フォルダ作成（グループルート + material / condition / result）
      const groupFolders = [
        `formats/${groupCd}/`,
        `formats/${groupCd}/material/`,
        `formats/${groupCd}/condition/`,
        `formats/${groupCd}/result/`,
      ];
      await storageService.createFolders(organizationId, groupFolders);

      console.log(`  [OK]   ${groupCd} (org: ${organizationId}): フォルダ作成完了`);
      created++;
    } catch (err) {
      console.error(`  [ERR]  ${groupCd} (org: ${organizationId}): フォルダ作成失敗`, err);
      failed++;
    }
  }

  console.log();
  console.log('=== backfill 完了 ===');
  console.log(`  合計グループ数   : ${totalGroups}`);
  console.log(`  作成済みスキップ : ${skipped}`);
  console.log(`  新規作成         : ${created}`);
  console.log(`  失敗             : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('backfill スクリプト実行中に予期しないエラーが発生しました:', err);
  process.exit(1);
});
