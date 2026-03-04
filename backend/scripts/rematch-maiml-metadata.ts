/**
 * MAIMLメタデータ再抽出スクリプト
 *
 * 実行内容:
 * - file_metadataテーブルのMAIMLファイルレコード（file_key が .maiml で終わるもの）を対象に
 * - Swiftストレージからファイルをダウンロードし
 * - maimlMetadataExtractor でメタデータを再抽出して
 * - maiml_* カラムを正しく更新する
 *
 * 実行方法:
 *   npx ts-node backend/scripts/rematch-maiml-metadata.ts
 */

import { Pool } from 'pg';
import { S3Client, GetObjectCommand, GetObjectCommandOutput, S3ClientConfig } from '@aws-sdk/client-s3';
import { parseStringPromise } from 'xml2js';

// ============================================================
// 設定
// ============================================================
const DB_CONFIG = {
  host: process.env.DB_HOST || '10.1.1.219',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maiml_db',
  user: process.env.DB_USER || 'maiml_user',
  password: process.env.DB_PASSWORD || 'maiml_user',
};

const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT || 'http://10.1.1.219:3002',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || 'test:tester',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'testing',
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  bucket: process.env.S3_BUCKET_NAME || 'mmdpf-files',
};

// ============================================================
// 型定義
// ============================================================
interface MetaData {
  document_uuid: string;
  document_name: string;
  document_description: string;
  measurement_values: string[];
  units: string[];
  section_types: string[];
  ids: string[];
  refs: string[];
  keys: string[];
  elements: string[];
  values: string[];
}

interface FileMetadataRow {
  file_key: string;
  organization_id: string;
  maiml_metadata_extraction_status: string | null;
}

// ============================================================
// MAIMLメタデータ抽出（maimlMetadataExtractor.ts と同等）
// ============================================================
function extractFromNode(node: any, metadata: MetaData, parentKey = ''): void {
  if (!node || typeof node !== 'object') {
    if (node && String(node).trim()) {
      metadata.values.push(String(node).trim());
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(item => extractFromNode(item, metadata, parentKey));
    return;
  }
  Object.keys(node).forEach(key => {
    const value = node[key];
    if (!key.startsWith('@_') && !key.startsWith('$')) {
      metadata.elements.push(key);
    }
    // mergeAttrs:true の場合、XML属性は @_ プレフィックスなしで展開される
    // 例: <place id="condition-xxx"/> → { id: "condition-xxx" }
    if (key === 'id' && value && typeof value === 'string') metadata.ids.push(value);
    if (key === 'ref' && value && typeof value === 'string') metadata.refs.push(value);
    if (key === 'source' && value && typeof value === 'string') metadata.refs.push(value);
    if (key === 'target' && value && typeof value === 'string') metadata.refs.push(value);
    if (key === 'key' && value && typeof value === 'string') metadata.keys.push(value);
    if ((key === 'value' || parentKey === 'measurement') && value) {
      const strValue = String(value).trim();
      if (strValue && !isNaN(Number(strValue))) {
        metadata.measurement_values.push(strValue);
      }
    }
    if ((key === 'unit' || key === 'units') && value) {
      metadata.units.push(String(value));
    }
    if ((key === 'section' || key === 'sectionType' || key === 'type') && value) {
      metadata.section_types.push(String(value));
    }
    if (typeof value === 'object') {
      extractFromNode(value, metadata, key);
    }
  });
}

async function extractMetadataFromXML(xmlContent: string): Promise<MetaData> {
  const parsedXML = await parseStringPromise(xmlContent, {
    explicitArray: false,
    mergeAttrs: true,
    ignoreAttrs: false,
  });

  const metadata: MetaData = {
    document_uuid: '',
    document_name: '',
    document_description: '',
    measurement_values: [],
    units: [],
    section_types: [],
    ids: [],
    refs: [],
    keys: [],
    elements: [],
    values: [],
  };

  if (parsedXML.maiml?.document) {
    const doc = parsedXML.maiml.document;
    metadata.document_uuid = doc.uuid || doc['@_uuid'] || '';
    metadata.document_name = doc.name || doc['@_name'] || '';
    metadata.document_description = doc.description || '';
  }

  extractFromNode(parsedXML, metadata);

  metadata.measurement_values = [...new Set(metadata.measurement_values)];
  metadata.units             = [...new Set(metadata.units)];
  metadata.section_types     = [...new Set(metadata.section_types)];
  metadata.ids               = [...new Set(metadata.ids)];
  metadata.refs              = [...new Set(metadata.refs)];
  metadata.keys              = [...new Set(metadata.keys)];
  metadata.elements          = [...new Set(metadata.elements)];
  metadata.values            = [...new Set(metadata.values)];

  return metadata;
}

// ============================================================
// メイン処理
// ============================================================
async function main() {
  console.log('='.repeat(72));
  console.log('MAIMLメタデータ再抽出スクリプト');
  console.log('='.repeat(72));

  // DB接続
  const pool = new Pool(DB_CONFIG);

  // S3/Swiftクライアント（storageService.ts と同じ構成）
  const s3ClientConfig: S3ClientConfig = {
    endpoint: S3_CONFIG.endpoint,
    region: S3_CONFIG.region,
    forcePathStyle: S3_CONFIG.forcePathStyle,
  };
  // credentialsを動的に設定（型の制約を回避）
  (s3ClientConfig as any).credentials = {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  };
  const s3 = new S3Client(s3ClientConfig);

  const client = await pool.connect();

  try {
    // 対象レコードを取得（.maiml ファイルのみ）
    const { rows } = await client.query<FileMetadataRow>(`
      SELECT file_key, organization_id, maiml_metadata_extraction_status
      FROM file_metadata
      WHERE file_key LIKE '%.maiml'
      ORDER BY file_key
    `);

    console.log(`対象レコード数: ${rows.length}件\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const { file_key, organization_id } = row;
      process.stdout.write(`処理中: ${file_key} ... `);

      try {
        // Swiftからファイルをダウンロード
        const command = new GetObjectCommand({
          Bucket: S3_CONFIG.bucket,
          Key: file_key,
        });
        const response = (await s3.send(command)) as GetObjectCommandOutput;

        if (!response.Body) {
          console.log('⚠️  Body なし (スキップ)');
          skipCount++;
          continue;
        }

        // Buffer に変換
        const chunks: Uint8Array[] = [];
        const stream = response.Body as AsyncIterable<Uint8Array>;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const xmlContent = Buffer.concat(chunks).toString('utf-8');

        // メタデータ抽出
        const metadata = await extractMetadataFromXML(xmlContent);

        // DB更新
        await client.query(`
          UPDATE file_metadata
          SET
            is_maiml_file                      = true,
            maiml_document_uuid                = $1,
            maiml_document_name                = $2,
            maiml_document_description         = $3,
            maiml_measurement_values           = $4::jsonb,
            maiml_units                        = $5::jsonb,
            maiml_section_types                = $6::jsonb,
            maiml_ids                          = $7::jsonb,
            maiml_refs                         = $8::jsonb,
            maiml_keys                         = $9::jsonb,
            maiml_elements                     = $10::jsonb,
            maiml_values                       = $11::jsonb,
            maiml_metadata_extraction_status   = 'completed',
            maiml_metadata_extracted_at        = NOW(),
            updated_at                         = NOW()
          WHERE file_key = $12
            AND organization_id = $13
        `, [
          metadata.document_uuid        || null,
          metadata.document_name        || null,
          metadata.document_description || null,
          JSON.stringify(metadata.measurement_values),
          JSON.stringify(metadata.units),
          JSON.stringify(metadata.section_types),
          JSON.stringify(metadata.ids),
          JSON.stringify(metadata.refs),
          JSON.stringify(metadata.keys),
          JSON.stringify(metadata.elements),
          JSON.stringify(metadata.values),
          file_key,
          organization_id,
        ]);

        console.log(`✅ 完了 (name="${metadata.document_name}", ids=${metadata.ids.length}件)`);
        successCount++;

      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('NoSuchKey') || msg.includes('Not Found') || msg.includes('does not exist')) {
          console.log('⚠️  Swiftに存在しない (スキップ)');
          skipCount++;
        } else {
          console.log(`❌ エラー: ${msg}`);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(72));
    console.log(`完了: 成功=${successCount}件 / スキップ=${skipCount}件 / エラー=${errorCount}件`);
    console.log('='.repeat(72));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('予期せぬエラー:', err);
  process.exit(1);
});
