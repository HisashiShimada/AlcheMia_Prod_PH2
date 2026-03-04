/**
 * file_metadataテーブルとSwiftストレージの同期修正スクリプト
 * 
 * 実行内容:
 * 1. DBにあってSwiftにないレコードを削除（realtime-validationは除外）
 * 2. SwiftにあってDBにないファイルを登録
 * 3. file_sizeが実態と異なるレコードを更新
 * 
 * 対象組織: a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 */

import { Pool } from 'pg';

const DB_CONFIG = {
  host: process.env.DB_HOST || '10.1.1.219',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maiml_db',
  user: process.env.DB_USER || 'maiml_user',
  password: process.env.DB_PASSWORD || 'maiml_user',
};

const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
// 保存前処理用レコードのfilekey（削除除外）
const EXCLUDE_FROM_DELETE = ['realtime-validation'];

// ========================================
// A. 削除対象: DBにあってSwiftにないファイル
// ========================================
const FILES_TO_DELETE = [
  // A-1. 先頭スラッシュ付き誤登録
  '/projects/QuantumDotLED/QuantumDotLED.maiml',
  '/projects/RareEarthMagnet/RareEarthMagnet.maiml',
  '/projects/TestProjectOmori9/TestProjectOmori9.maiml',
  // A-2. formats配下のゴミデータ（サイズ0）
  `${ORG_ID}/formats/DEP004/material/disp.xml`,
  `${ORG_ID}/formats/DEP004/material/material/TEST/disp.xml`,
  `${ORG_ID}/formats/DEP004/material/material/TEST/test.xml`,
  `${ORG_ID}/formats/DEP004/material/TEST/disp.xml`,
  `${ORG_ID}/formats/DEP004/material/testMAIML.maiml`,
  `${ORG_ID}/formats/DEP004/material/TEST/testMAIML.maiml`,
  `${ORG_ID}/formats/DEP004/material/TEST/test.xml`,
  `${ORG_ID}/formats/DEP004/material/uploadtest/disp.xml`,
  `${ORG_ID}/formats/DEP004/material/uploadtest/testMAIML.maiml`,
  `${ORG_ID}/formats/DEP004/material/uploadtest/test.xml`,
  `${ORG_ID}/formats/DEP004/material/アップロードテスト/disp.xml`,
  `${ORG_ID}/formats/DEP004/material/アップロードテスト/testMAIML.maiml`,
  `${ORG_ID}/formats/DEP004/material/アップロードテスト/test.xml`,
  `${ORG_ID}/formats/material/disp.xml`,
  // A-3. プロジェクト補助ファイル（Swiftに存在しない）
  // FuelCellElectrolyte
  `${ORG_ID}/projects/FuelCellElectrolyte/archive/FuelCellElectrolyte_v1.maiml`,
  `${ORG_ID}/projects/FuelCellElectrolyte/archive/FuelCellElectrolyte_v2.maiml`,
  `${ORG_ID}/projects/FuelCellElectrolyte/data.csv`,
  `${ORG_ID}/projects/FuelCellElectrolyte/README.txt`,
  `${ORG_ID}/projects/FuelCellElectrolyte/results.csv`,
  // GrapheneComposite
  `${ORG_ID}/projects/GrapheneComposite/archive/GrapheneComposite_v1.maiml`,
  `${ORG_ID}/projects/GrapheneComposite/archive/GrapheneComposite_v2.maiml`,
  `${ORG_ID}/projects/GrapheneComposite/data.csv`,
  `${ORG_ID}/projects/GrapheneComposite/README.txt`,
  `${ORG_ID}/projects/GrapheneComposite/results.csv`,
  // HighTempSuperconductor
  `${ORG_ID}/projects/HighTempSuperconductor/archive/HighTempSuperconductor_v1.maiml`,
  `${ORG_ID}/projects/HighTempSuperconductor/archive/HighTempSuperconductor_v2.maiml`,
  `${ORG_ID}/projects/HighTempSuperconductor/data.csv`,
  `${ORG_ID}/projects/HighTempSuperconductor/README.txt`,
  `${ORG_ID}/projects/HighTempSuperconductor/results.csv`,
  // LithiumBatteryCathode
  `${ORG_ID}/projects/LithiumBatteryCathode/archive/LithiumBatteryCathode_v1.maiml`,
  `${ORG_ID}/projects/LithiumBatteryCathode/archive/LithiumBatteryCathode_v2.maiml`,
  `${ORG_ID}/projects/LithiumBatteryCathode/data.csv`,
  `${ORG_ID}/projects/LithiumBatteryCathode/README.txt`,
  `${ORG_ID}/projects/LithiumBatteryCathode/results.csv`,
  // NanoparticleCatalyst
  `${ORG_ID}/projects/NanoparticleCatalyst/archive/NanoparticleCatalyst_v1.maiml`,
  `${ORG_ID}/projects/NanoparticleCatalyst/archive/NanoparticleCatalyst_v2.maiml`,
  `${ORG_ID}/projects/NanoparticleCatalyst/data.csv`,
  `${ORG_ID}/projects/NanoparticleCatalyst/README.txt`,
  `${ORG_ID}/projects/NanoparticleCatalyst/results.csv`,
  // OrganicSolarCell
  `${ORG_ID}/projects/OrganicSolarCell/archive/OrganicSolarCell_v1.maiml`,
  `${ORG_ID}/projects/OrganicSolarCell/archive/OrganicSolarCell_v2.maiml`,
  `${ORG_ID}/projects/OrganicSolarCell/data.csv`,
  `${ORG_ID}/projects/OrganicSolarCell/README.txt`,
  `${ORG_ID}/projects/OrganicSolarCell/results.csv`,
  // PerovskiteSolarCell
  `${ORG_ID}/projects/PerovskiteSolarCell/archive/PerovskiteSolarCell_v1.maiml`,
  `${ORG_ID}/projects/PerovskiteSolarCell/archive/PerovskiteSolarCell_v2.maiml`,
  `${ORG_ID}/projects/PerovskiteSolarCell/data.csv`,
  `${ORG_ID}/projects/PerovskiteSolarCell/README.txt`,
  `${ORG_ID}/projects/PerovskiteSolarCell/results.csv`,
  // RareEarthMagnet
  `${ORG_ID}/projects/RareEarthMagnet/archive/RareEarthMagnet_v1.maiml`,
  `${ORG_ID}/projects/RareEarthMagnet/archive/RareEarthMagnet_v2.maiml`,
  `${ORG_ID}/projects/RareEarthMagnet/data.csv`,
  `${ORG_ID}/projects/RareEarthMagnet/README.txt`,
  `${ORG_ID}/projects/RareEarthMagnet/results.csv`,
];

// ========================================
// B. 追加対象: SwiftにあってDBにないファイル
// ========================================
interface InsertRecord {
  file_key: string;
  s3_bucket: string;
  organization_id: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  parent_folder_path: string;
}

const UPLOADED_BY = '0c5d7815-5bc1-477f-9749-230b8156901e';
const S3_BUCKET = 'mmdpf-files';

const FILES_TO_INSERT: InsertRecord[] = [
  // formats/DEP004/condition
  {
    file_key: `${ORG_ID}/formats/DEP004/condition/test2.xml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'test2.xml',
    file_size: 189,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/formats/DEP004/condition`,
  },
  // formats/DEP004/maiml_1
  {
    file_key: `${ORG_ID}/formats/DEP004/maiml_1/TEST.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'TEST.maiml',
    file_size: 791,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/formats/DEP004/maiml_1`,
  },
  // formats/DEP004/material
  {
    file_key: `${ORG_ID}/formats/DEP004/material/test.xml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'test.xml',
    file_size: 464,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/formats/DEP004/material`,
  },
  // formats/DEP004/result
  {
    file_key: `${ORG_ID}/formats/DEP004/result/result.xml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'result.xml',
    file_size: 429,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/formats/DEP004/result`,
  },
  // projects/QuantumDotLED
  {
    file_key: `${ORG_ID}/projects/QuantumDotLED/QuantumDotLED.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'QuantumDotLED.maiml',
    file_size: 4575,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/QuantumDotLED`,
  },
  {
    file_key: `${ORG_ID}/projects/QuantumDotLED/archive/QuantumDotLED_001.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'QuantumDotLED_001.maiml',
    file_size: 5164,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/QuantumDotLED/archive`,
  },
  {
    file_key: `${ORG_ID}/projects/QuantumDotLED/archive/QuantumDotLED_002.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'QuantumDotLED_002.maiml',
    file_size: 2656,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/QuantumDotLED/archive`,
  },
  {
    file_key: `${ORG_ID}/projects/QuantumDotLED/archive/QuantumDotLED_003.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'QuantumDotLED_003.maiml',
    file_size: 2321,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/QuantumDotLED/archive`,
  },
  // projects/RareEarthMagnet/archive
  {
    file_key: `${ORG_ID}/projects/RareEarthMagnet/archive/RareEarthMagnet_001.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'RareEarthMagnet_001.maiml',
    file_size: 1008,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/RareEarthMagnet/archive`,
  },
  {
    file_key: `${ORG_ID}/projects/RareEarthMagnet/archive/RareEarthMagnet_002.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'RareEarthMagnet_002.maiml',
    file_size: 1864,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/RareEarthMagnet/archive`,
  },
  {
    file_key: `${ORG_ID}/projects/RareEarthMagnet/archive/RareEarthMagnet_003.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'RareEarthMagnet_003.maiml',
    file_size: 1864,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/RareEarthMagnet/archive`,
  },
  // projects/TestProjectOmori7〜10
  {
    file_key: `${ORG_ID}/projects/TestProjectOmori7/TestProjectOmori7.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'TestProjectOmori7.maiml',
    file_size: 4210,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/TestProjectOmori7`,
  },
  {
    file_key: `${ORG_ID}/projects/TestProjectOmori8/TestProjectOmori8.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'TestProjectOmori8.maiml',
    file_size: 4438,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/TestProjectOmori8`,
  },
  {
    file_key: `${ORG_ID}/projects/TestProjectOmori9/TestProjectOmori9.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'TestProjectOmori9.maiml',
    file_size: 3989,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/TestProjectOmori9`,
  },
  {
    file_key: `${ORG_ID}/projects/TestProjectOmori10/TestProjectOmori10.maiml`,
    s3_bucket: S3_BUCKET,
    organization_id: ORG_ID,
    original_filename: 'TestProjectOmori10.maiml',
    file_size: 4445,
    file_type: 'application/xml',
    uploaded_by: UPLOADED_BY,
    parent_folder_path: `${ORG_ID}/projects/TestProjectOmori10`,
  },
];

// ========================================
// C. 更新対象: file_sizeが実態と異なるファイル
// ========================================
interface UpdateRecord {
  file_key: string;
  file_size: number;
}

const FILES_TO_UPDATE: UpdateRecord[] = [
  { file_key: `${ORG_ID}/projects/FuelCellElectrolyte/FuelCellElectrolyte.maiml`, file_size: 1021 },
  { file_key: `${ORG_ID}/projects/GrapheneComposite/GrapheneComposite.maiml`, file_size: 1013 },
  { file_key: `${ORG_ID}/projects/HighTempSuperconductor/HighTempSuperconductor.maiml`, file_size: 1034 },
  { file_key: `${ORG_ID}/projects/LithiumBatteryCathode/LithiumBatteryCathode.maiml`, file_size: 1035 },
  { file_key: `${ORG_ID}/projects/NanoparticleCatalyst/NanoparticleCatalyst.maiml`, file_size: 1019 },
  { file_key: `${ORG_ID}/projects/OrganicSolarCell/OrganicSolarCell.maiml`, file_size: 1003 },
  { file_key: `${ORG_ID}/projects/PerovskiteSolarCell/PerovskiteSolarCell.maiml`, file_size: 1039 },
  { file_key: `${ORG_ID}/projects/RareEarthMagnet/RareEarthMagnet.maiml`, file_size: 2433 },
];

// ========================================
// メイン処理
// ========================================
async function main() {
  console.log('='.repeat(80));
  console.log('file_metadata 同期修正スクリプト');
  console.log('='.repeat(80));
  console.log(`対象組織: ${ORG_ID}`);
  console.log(`realtime-validation は除外（保存前処理用）`);
  console.log();

  const pool = new Pool(DB_CONFIG);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ---- A. DELETE ----
    console.log(`A. DBからレコードを削除 (${FILES_TO_DELETE.length}件)...`);
    let deleteCount = 0;
    for (const fileKey of FILES_TO_DELETE) {
      if (EXCLUDE_FROM_DELETE.includes(fileKey)) {
        console.log(`   スキップ(除外): ${fileKey}`);
        continue;
      }
      const result = await client.query(
        `DELETE FROM file_metadata WHERE file_key = $1`,
        [fileKey]
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`   ✅ 削除: ${fileKey}`);
        deleteCount++;
      } else {
        console.log(`   ⚠️  対象なし: ${fileKey}`);
      }
    }
    console.log(`   → 削除完了: ${deleteCount}件`);
    console.log();

    // ---- B. INSERT ----
    console.log(`B. DBにレコードを追加 (${FILES_TO_INSERT.length}件)...`);
    let insertCount = 0;
    for (const rec of FILES_TO_INSERT) {
      // 既存チェック
      const exists = await client.query(
        `SELECT 1 FROM file_metadata WHERE file_key = $1`,
        [rec.file_key]
      );
      if (exists.rowCount && exists.rowCount > 0) {
        console.log(`   ⚠️  既存スキップ: ${rec.file_key}`);
        continue;
      }
      await client.query(
        `INSERT INTO file_metadata (
          file_key, s3_bucket, organization_id, original_filename,
          file_size, file_type, uploaded_by, parent_folder_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          rec.file_key, rec.s3_bucket, rec.organization_id, rec.original_filename,
          rec.file_size, rec.file_type, rec.uploaded_by, rec.parent_folder_path,
        ]
      );
      console.log(`   ✅ 追加: ${rec.file_key} (${rec.file_size} bytes)`);
      insertCount++;
    }
    console.log(`   → 追加完了: ${insertCount}件`);
    console.log();

    // ---- C. UPDATE ----
    console.log(`C. file_sizeを更新 (${FILES_TO_UPDATE.length}件)...`);
    let updateCount = 0;
    for (const rec of FILES_TO_UPDATE) {
      const result = await client.query(
        `UPDATE file_metadata SET file_size = $1, updated_at = NOW() WHERE file_key = $2`,
        [rec.file_size, rec.file_key]
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`   ✅ 更新: ${rec.file_key} → ${rec.file_size} bytes`);
        updateCount++;
      } else {
        console.log(`   ⚠️  対象なし: ${rec.file_key}`);
      }
    }
    console.log(`   → 更新完了: ${updateCount}件`);
    console.log();

    await client.query('COMMIT');
    console.log('='.repeat(80));
    console.log('✅ 全修正完了（コミット済み）');
    console.log(`   削除: ${deleteCount}件 / 追加: ${insertCount}件 / 更新: ${updateCount}件`);
    console.log('='.repeat(80));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ エラー発生。ロールバックしました。');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
