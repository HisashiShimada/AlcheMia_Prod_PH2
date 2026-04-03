/**
 * file_metadata × Swift 汎用同期スクリプト
 *
 * Swift のファイル一覧を source of truth として DB を自動同期します。
 *
 * 処理内容:
 *   1. [INSERT] Swift にあって DB にないファイルを file_metadata に登録
 *   2. [DELETE] DB にあって Swift にないレコードを削除（除外キーワードあり）
 *   3. [UPDATE] file_size が実態と異なるレコードを修正
 *
 * オプション:
 *   --dry-run          変更を実施せず差分の確認のみ行う
 *   --org-id <uuid>    指定した組織のみ対象（省略時は全組織）
 *   --bucket <name>    バケット/コンテナ名を上書き（省略時は環境変数）
 *   --skip-delete      DBにあってSwiftにないレコードの削除をスキップ
 *
 * 実行例:
 *   npx ts-node backend/scripts/sync-file-metadata-from-swift.ts --dry-run
 *   npx ts-node backend/scripts/sync-file-metadata-from-swift.ts --org-id a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   npx ts-node backend/scripts/sync-file-metadata-from-swift.ts --dry-run --org-id a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 */

import dotenv from 'dotenv';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// .env 読み込み（backend/.env を優先）
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ============================================================
// 設定
// ============================================================

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maiml_db',
  user: process.env.DB_USER || 'maiml_user',
  password: process.env.DB_PASSWORD || 'maiml_user',
};

const SWIFT_CONFIG = {
  endpoint: process.env.S3_ENDPOINT || process.env.SWIFT_AUTH_URL || 'http://localhost:3002',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.SWIFT_USERNAME || 'test:tester',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SWIFT_PASSWORD || 'testing',
  },
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
};

const DEFAULT_BUCKET = process.env.S3_BUCKET_NAME || process.env.SWIFT_CONTAINER || 'mmdpf-files';

/** DB 削除から除外するキーワード（file_key に含まれる場合は削除しない） */
const DELETE_EXCLUDE_KEYWORDS = ['realtime-validation'];

/** ファイルサイズ 0 のファイルをスキップするか（フォルダマーカー除外） */
const SKIP_ZERO_SIZE = true;

// ============================================================
// 型定義
// ============================================================

interface DbRecord {
  file_key: string;
  file_size: number;
  organization_id: string;
  original_filename: string;
  parent_folder_path: string | null;
  created_at: Date;
}

interface SwiftObject {
  key: string;
  size: number;
  lastModified: Date;
}

interface SyncStats {
  swiftTotal: number;
  dbTotal: number;
  toInsert: number;
  toDelete: number;
  toUpdate: number;
  inserted: number;
  deleted: number;
  updated: number;
  skippedDelete: number;
}

// ============================================================
// ユーティリティ
// ============================================================

/** 拡張子からコンテンツタイプを推定 */
function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.maiml': 'application/xml',
    '.xml': 'application/xml',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

/** コマンドライン引数をパース */
function parseArgs(): {
  dryRun: boolean;
  orgId: string | null;
  bucket: string;
  skipDelete: boolean;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDelete = args.includes('--skip-delete');

  let orgId: string | null = null;
  const orgIdIdx = args.indexOf('--org-id');
  if (orgIdIdx !== -1 && args[orgIdIdx + 1]) {
    orgId = args[orgIdIdx + 1];
  }

  let bucket = DEFAULT_BUCKET;
  const bucketIdx = args.indexOf('--bucket');
  if (bucketIdx !== -1 && args[bucketIdx + 1]) {
    bucket = args[bucketIdx + 1];
  }

  return { dryRun, orgId, bucket, skipDelete };
}

// ============================================================
// Swift 操作
// ============================================================

/** Swift から対象プレフィックス配下の全ファイルを取得（ページネーション対応） */
async function listSwiftFiles(
  s3Client: S3Client,
  bucket: string,
  prefix: string
): Promise<SwiftObject[]> {
  const files: SwiftObject[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    for (const obj of response.Contents || []) {
      if (!obj.Key) continue;
      // フォルダマーカー除外
      if (obj.Key.endsWith('/')) continue;
      // サイズ 0 除外（フォルダマーカー代替オブジェクト）
      if (SKIP_ZERO_SIZE && (obj.Size || 0) === 0) continue;

      files.push({
        key: obj.Key,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return files;
}

// ============================================================
// DB 操作
// ============================================================

/** DB から対象組織の file_metadata を全取得 */
async function fetchDbRecords(pool: Pool, orgId: string): Promise<DbRecord[]> {
  const result = await pool.query<DbRecord>(
    `SELECT file_key, file_size, organization_id, original_filename, parent_folder_path, created_at
     FROM file_metadata
     WHERE organization_id = $1
     ORDER BY file_key`,
    [orgId]
  );
  return result.rows;
}

/** DB から全組織 ID を取得 */
async function fetchAllOrgIds(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ organization_id: string }>(
    `SELECT DISTINCT organization_id FROM file_metadata ORDER BY organization_id`
  );
  return result.rows.map(r => r.organization_id);
}

/** INSERT: Swift のみに存在するファイルを DB に登録 */
async function insertRecord(
  client: PoolClient,
  swiftObj: SwiftObject,
  orgId: string,
  bucket: string,
  dryRun: boolean
): Promise<void> {
  const filename = path.basename(swiftObj.key);
  const isMaiml = filename.endsWith('.maiml');
  const fileType = guessContentType(filename);
  const parentPath = swiftObj.key.substring(0, swiftObj.key.lastIndexOf('/'));

  if (dryRun) {
    console.log(`  [DRY-RUN INSERT] ${swiftObj.key} (${swiftObj.size} bytes)`);
    return;
  }

  await client.query(
    `INSERT INTO file_metadata (
      file_key, s3_bucket, organization_id, original_filename,
      file_size, file_type, is_maiml_file,
      uploaded_by, upload_source, upload_method,
      parent_folder_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (file_key) DO NOTHING`,
    [
      swiftObj.key,
      bucket,
      orgId,
      filename,
      swiftObj.size,
      fileType,
      isMaiml,
      'system_sync',
      'api_upload',
      'single',
      parentPath,
    ]
  );
  console.log(`  ✅ INSERT: ${swiftObj.key} (${swiftObj.size} bytes)`);
}

/** DELETE: DB のみに存在するレコードを削除 */
async function deleteRecord(
  client: PoolClient,
  fileKey: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`  [DRY-RUN DELETE] ${fileKey}`);
    return;
  }

  await client.query(`DELETE FROM file_metadata WHERE file_key = $1`, [fileKey]);
  console.log(`  🗑️  DELETE: ${fileKey}`);
}

/** UPDATE: file_size を Swift の実態に合わせて更新 */
async function updateFileSize(
  client: PoolClient,
  fileKey: string,
  newSize: number,
  oldSize: number,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`  [DRY-RUN UPDATE] ${fileKey}  DB:${oldSize} → Swift:${newSize}`);
    return;
  }

  await client.query(
    `UPDATE file_metadata SET file_size = $1, updated_at = NOW() WHERE file_key = $2`,
    [newSize, fileKey]
  );
  console.log(`  📝 UPDATE: ${fileKey}  ${oldSize} → ${newSize} bytes`);
}

// ============================================================
// 1組織分の同期処理
// ============================================================

async function syncOrganization(
  pool: Pool,
  s3Client: S3Client,
  orgId: string,
  bucket: string,
  dryRun: boolean,
  skipDelete: boolean
): Promise<SyncStats> {
  const stats: SyncStats = {
    swiftTotal: 0, dbTotal: 0,
    toInsert: 0, toDelete: 0, toUpdate: 0,
    inserted: 0, deleted: 0, updated: 0,
    skippedDelete: 0,
  };

  // --- 1. 各ソースからデータ取得 ---
  const [swiftFiles, dbRecords] = await Promise.all([
    listSwiftFiles(s3Client, bucket, `${orgId}/`),
    fetchDbRecords(pool, orgId),
  ]);

  stats.swiftTotal = swiftFiles.length;
  stats.dbTotal = dbRecords.length;

  // インデックスを作成
  const swiftMap = new Map<string, SwiftObject>(swiftFiles.map(f => [f.key, f]));
  const dbMap = new Map<string, DbRecord>(dbRecords.map(r => [r.file_key, r]));

  // --- 2. 差分計算 ---
  const toInsert: SwiftObject[] = [];
  const toDelete: DbRecord[] = [];
  const toUpdate: Array<{ fileKey: string; newSize: number; oldSize: number }> = [];

  // Swift にあって DB にないもの → INSERT 候補
  for (const [key, swiftObj] of swiftMap) {
    if (!dbMap.has(key)) {
      toInsert.push(swiftObj);
    } else {
      // 両方にある → サイズ不一致確認（DB は BIGINT → node-postgres が文字列で返すため Number() で統一）
      const dbRec = dbMap.get(key)!;
      if (Number(dbRec.file_size) !== swiftObj.size) {
        toUpdate.push({ fileKey: key, newSize: swiftObj.size, oldSize: Number(dbRec.file_size) });
      }
    }
  }

  // DB にあって Swift にないもの → DELETE 候補（除外キーワードチェック）
  for (const [key, dbRec] of dbMap) {
    if (!swiftMap.has(key)) {
      const shouldExclude = DELETE_EXCLUDE_KEYWORDS.some(kw => key.includes(kw));
      if (shouldExclude) {
        console.log(`  ⏭️  SKIP (除外キーワード): ${key}`);
        stats.skippedDelete++;
        continue;
      }
      toDelete.push(dbRec);
    }
  }

  stats.toInsert = toInsert.length;
  stats.toDelete = toDelete.length;
  stats.toUpdate = toUpdate.length;

  // 差分なし
  if (toInsert.length === 0 && toDelete.length === 0 && toUpdate.length === 0) {
    console.log('  ✅ 差分なし');
    return stats;
  }

  console.log(`  差分: INSERT=${toInsert.length} DELETE=${toDelete.length} UPDATE=${toUpdate.length}`);
  console.log();

  // --- 3. トランザクションで同期実行 ---
  const client = await pool.connect();
  try {
    if (!dryRun) {
      await client.query('BEGIN');
    }

    // INSERT
    if (toInsert.length > 0) {
      console.log(`  --- [INSERT] Swift のみに存在するファイル (${toInsert.length}件) ---`);
      for (const obj of toInsert) {
        try {
          await insertRecord(client, obj, orgId, bucket, dryRun);
          if (!dryRun) stats.inserted++;
        } catch (err) {
          console.warn(`  ⚠️  INSERT 失敗 (スキップ): ${obj.key}`, err);
        }
      }
    }

    // DELETE
    if (toDelete.length > 0 && !skipDelete) {
      console.log(`  --- [DELETE] DB のみに存在するレコード (${toDelete.length}件) ---`);
      for (const rec of toDelete) {
        try {
          await deleteRecord(client, rec.file_key, dryRun);
          if (!dryRun) stats.deleted++;
        } catch (err) {
          console.warn(`  ⚠️  DELETE 失敗 (スキップ): ${rec.file_key}`, err);
        }
      }
    } else if (toDelete.length > 0 && skipDelete) {
      console.log(`  --- [DELETE] スキップ (--skip-delete 指定) (${toDelete.length}件) ---`);
      toDelete.forEach(r => console.log(`    skip: ${r.file_key}`));
    }

    // UPDATE
    if (toUpdate.length > 0) {
      console.log(`  --- [UPDATE] file_size 不一致のレコード (${toUpdate.length}件) ---`);
      for (const rec of toUpdate) {
        try {
          await updateFileSize(client, rec.fileKey, rec.newSize, rec.oldSize, dryRun);
          if (!dryRun) stats.updated++;
        } catch (err) {
          console.warn(`  ⚠️  UPDATE 失敗 (スキップ): ${rec.fileKey}`, err);
        }
      }
    }

    if (!dryRun) {
      await client.query('COMMIT');
    }
  } catch (err) {
    if (!dryRun) {
      await client.query('ROLLBACK');
      console.error('  ❌ トランザクションエラー。ロールバックしました。', err);
    }
    throw err;
  } finally {
    client.release();
  }

  return stats;
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  const { dryRun, orgId, bucket, skipDelete } = parseArgs();

  console.log('='.repeat(80));
  console.log('file_metadata × Swift 汎用同期スクリプト');
  console.log('='.repeat(80));
  console.log(`モード      : ${dryRun ? '🔍 DRY-RUN（変更なし）' : '🔄 実行（DB を更新）'}`);
  console.log(`対象組織    : ${orgId || '全組織'}`);
  console.log(`バケット    : ${bucket}`);
  console.log(`DB          : ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log(`Swift EP    : ${SWIFT_CONFIG.endpoint}`);
  console.log(`DELETE スキップ: ${skipDelete}`);
  console.log('='.repeat(80));
  console.log();

  const pool = new Pool(DB_CONFIG);
  const s3Client = new S3Client(SWIFT_CONFIG);

  try {
    // 対象組織 ID 一覧を決定
    let targetOrgIds: string[];
    if (orgId) {
      targetOrgIds = [orgId];
    } else {
      console.log('全組織の組織 ID を DB から取得中...');
      targetOrgIds = await fetchAllOrgIds(pool);

      // Swift の全プレフィックスからも組織 ID を収集（DB に未登録の組織も含める）
      console.log('Swift 上の組織 ID を収集中...');
      const swiftOrgIds = await collectOrgIdsFromSwift(s3Client, bucket);
      for (const id of swiftOrgIds) {
        if (!targetOrgIds.includes(id)) {
          targetOrgIds.push(id);
        }
      }

      console.log(`対象組織数: ${targetOrgIds.length}`);
      targetOrgIds.forEach(id => console.log(`  - ${id}`));
      console.log();
    }

    // 組織ごとに同期実行
    const totalStats: SyncStats = {
      swiftTotal: 0, dbTotal: 0,
      toInsert: 0, toDelete: 0, toUpdate: 0,
      inserted: 0, deleted: 0, updated: 0,
      skippedDelete: 0,
    };

    for (const id of targetOrgIds) {
      console.log('-'.repeat(60));
      console.log(`組織: ${id}`);
      console.log('-'.repeat(60));

      const stats = await syncOrganization(pool, s3Client, id, bucket, dryRun, skipDelete);

      totalStats.swiftTotal += stats.swiftTotal;
      totalStats.dbTotal += stats.dbTotal;
      totalStats.toInsert += stats.toInsert;
      totalStats.toDelete += stats.toDelete;
      totalStats.toUpdate += stats.toUpdate;
      totalStats.inserted += stats.inserted;
      totalStats.deleted += stats.deleted;
      totalStats.updated += stats.updated;
      totalStats.skippedDelete += stats.skippedDelete;

      console.log(
        `  Swift: ${stats.swiftTotal}件 / DB: ${stats.dbTotal}件` +
        ` / 差分: INSERT=${stats.toInsert} DELETE=${stats.toDelete} UPDATE=${stats.toUpdate}`
      );
      if (!dryRun) {
        console.log(
          `  実行結果: INSERT=${stats.inserted} DELETE=${stats.deleted} UPDATE=${stats.updated}` +
          (stats.skippedDelete > 0 ? ` スキップ(除外)=${stats.skippedDelete}` : '')
        );
      }
      console.log();
    }

    // 最終サマリー
    console.log('='.repeat(80));
    if (dryRun) {
      console.log('📊 DRY-RUN 完了（変更は行われていません）');
    } else {
      console.log('✅ 同期完了');
    }
    console.log(`  Swift 合計 : ${totalStats.swiftTotal} ファイル`);
    console.log(`  DB 合計    : ${totalStats.dbTotal} レコード`);
    console.log(`  INSERT 対象: ${totalStats.toInsert}件${dryRun ? '' : ` → 実施: ${totalStats.inserted}件`}`);
    console.log(`  DELETE 対象: ${totalStats.toDelete}件${dryRun ? '' : ` → 実施: ${totalStats.deleted}件`}` +
      (totalStats.skippedDelete > 0 ? ` (除外スキップ: ${totalStats.skippedDelete}件)` : ''));
    console.log(`  UPDATE 対象: ${totalStats.toUpdate}件${dryRun ? '' : ` → 実施: ${totalStats.updated}件`}`);
    console.log('='.repeat(80));

  } finally {
    await pool.end();
  }
}

/**
 * Swift バケット直下のプレフィックス（UUID形式）を組織 ID として収集
 * DB に登録がない組織でも Swift にファイルがある場合に対応
 */
async function collectOrgIdsFromSwift(s3Client: S3Client, bucket: string): Promise<string[]> {
  const orgIds: string[] = [];
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Delimiter を使ってバケット直下のプレフィックス（ディレクトリ）を取得
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Delimiter: '/',
    MaxKeys: 1000,
  });

  const response = await s3Client.send(command);

  for (const prefix of response.CommonPrefixes || []) {
    if (!prefix.Prefix) continue;
    // "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/" → UUID部分を取り出す
    const orgIdCandidate = prefix.Prefix.replace(/\/$/, '');
    if (UUID_PATTERN.test(orgIdCandidate)) {
      orgIds.push(orgIdCandidate);
    }
  }

  return orgIds;
}

main().catch(err => {
  console.error('❌ スクリプトエラー:', err);
  process.exit(1);
});
