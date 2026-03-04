/**
 * file_metadataテーブルとSwiftストレージの同期確認スクリプト
 * 
 * DBのfile_metadataとSwift実際のファイルを比較し、ずれを特定します
 * organization_id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385 (org_maiml_lab_001)
 */

import { Pool } from 'pg';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// DB設定 (backend/.envと同じ値)
const DB_CONFIG = {
  host: process.env.DB_HOST || '10.1.1.219',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maiml_db',
  user: process.env.DB_USER || 'maiml_user',
  password: process.env.DB_PASSWORD || 'maiml_user',
};

// Swift設定
const SWIFT_CONFIG = {
  endpoint: process.env.SWIFT_ENDPOINT || 'http://10.1.1.219:3002',
  credentials: {
    accessKeyId: process.env.SWIFT_ACCESS_KEY || 'test:tester',
    secretAccessKey: process.env.SWIFT_SECRET_KEY || 'testing',
  },
  region: 'us-east-1',
  forcePathStyle: true,
};

const CONTAINER_NAME = process.env.SWIFT_CONTAINER || 'mmdpf-files';
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

async function main() {
  console.log('='.repeat(80));
  console.log('file_metadata <-> Swift 同期確認');
  console.log('='.repeat(80));
  console.log(`組織ID: ${ORG_ID}`);
  console.log(`DB: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log(`Swift: ${SWIFT_CONFIG.endpoint}/${CONTAINER_NAME}`);
  console.log();

  const pool = new Pool(DB_CONFIG);

  try {
    // 1. DBのfile_metadataを取得
    console.log('1. DBのfile_metadata取得中...');
    const dbResult = await pool.query(
      `SELECT file_key, file_size, original_filename, parent_folder_path, created_at
       FROM file_metadata 
       WHERE organization_id = $1 
       ORDER BY file_key`,
      [ORG_ID]
    );
    const dbFiles = dbResult.rows;
    console.log(`   DBレコード数: ${dbFiles.length}`);
    console.log();

    // 2. Swiftのファイル一覧を取得
    console.log('2. Swiftファイル一覧取得中...');
    const swiftClient = new S3Client(SWIFT_CONFIG);
    const listCommand = new ListObjectsV2Command({
      Bucket: CONTAINER_NAME,
      Prefix: `${ORG_ID}/`,
      MaxKeys: 1000,
    });
    const swiftResponse = await swiftClient.send(listCommand);
    // 実際のファイルのみ（サイズ>0 かつ末尾が/でない）
    const swiftFiles = (swiftResponse.Contents || []).filter(
      obj => obj.Key && !obj.Key.endsWith('/') && (obj.Size || 0) > 0
    );
    console.log(`   Swiftファイル数(実ファイルのみ): ${swiftFiles.length}`);
    console.log();

    // 3. 比較
    console.log('3. 比較結果:');
    console.log('='.repeat(80));

    // DBのfile_keyセット (org_maiml_lab_001/ → org_id/ に変換して比較)
    const dbFileKeySet = new Set(dbFiles.map(f => f.file_key));
    // Swiftのキーセット (ORG_ID/ プレフィックス付き)
    const swiftKeySet = new Set(swiftFiles.map(obj => obj.Key!));

    // DBにあってSwiftにないファイル（DBが余分）
    const dbOnly = dbFiles.filter(f => {
      // file_keyのプレフィックスをチェック
      // DBのfile_keyが "org_maiml_lab_001/..." 形式の場合はそのままでは一致しない
      // DBのfile_keyが UUID形式の場合はそのまま比較
      return !swiftKeySet.has(f.file_key);
    });

    // SwiftにあってDBにないファイル（DBが不足）
    const swiftOnly = swiftFiles.filter(obj => !dbFileKeySet.has(obj.Key!));

    // DBとSwiftの両方にあるがfile_sizeが異なるファイル
    const sizeMismatch = dbFiles.filter(f => {
      const swiftFile = swiftFiles.find(s => s.Key === f.file_key);
      return swiftFile && swiftFile.Size !== f.file_size;
    });

    console.log();
    console.log(`【DBにあってSwiftにないファイル (${dbOnly.length}件)】`);
    if (dbOnly.length > 0) {
      dbOnly.forEach(f => {
        console.log(`  DB file_key: ${f.file_key}`);
        console.log(`    size: ${f.file_size}, created: ${f.created_at}`);
      });
    } else {
      console.log('  なし');
    }
    console.log();

    console.log(`【Swiftにあって DBにないファイル (${swiftOnly.length}件)】`);
    if (swiftOnly.length > 0) {
      swiftOnly.forEach(obj => {
        console.log(`  Swift key: ${obj.Key}`);
        console.log(`    size: ${obj.Size}, lastModified: ${obj.LastModified}`);
      });
    } else {
      console.log('  なし');
    }
    console.log();

    console.log(`【file_sizeが異なるファイル (${sizeMismatch.length}件)】`);
    if (sizeMismatch.length > 0) {
      sizeMismatch.forEach(f => {
        const swiftFile = swiftFiles.find(s => s.Key === f.file_key);
        console.log(`  file_key: ${f.file_key}`);
        console.log(`    DB size: ${f.file_size}, Swift size: ${swiftFile?.Size}`);
      });
    } else {
      console.log('  なし');
    }
    console.log();

    // 4. 現在のDBレコード全件表示
    console.log('='.repeat(80));
    console.log('【現在のDBレコード全件】');
    console.log('='.repeat(80));
    dbFiles.forEach(f => {
      const inSwift = swiftKeySet.has(f.file_key);
      const marker = inSwift ? '✅' : '❌(Swiftになし)';
      console.log(`${marker} ${f.file_key} (${f.file_size} bytes)`);
    });
    console.log();

    // 5. 現在のSwiftファイル全件表示
    console.log('='.repeat(80));
    console.log('【現在のSwiftファイル全件 (ORG_ID配下の実ファイル)】');
    console.log('='.repeat(80));
    swiftFiles.forEach(obj => {
      const inDB = dbFileKeySet.has(obj.Key!);
      const marker = inDB ? '✅' : '❌(DBになし)';
      console.log(`${marker} ${obj.Key} (${obj.Size} bytes)`);
    });
    console.log();

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
