/**
 * project_uuid バックフィルスクリプト
 *
 * 実行内容:
 * - project テーブルから project_maiml_flg = true かつ project_uuid IS NULL のプロジェクトを取得
 * - S3/Swift からMAIMLファイルをダウンロードし <Document uuid="..."> を抽出
 * - project.project_uuid を UPDATE
 * - 続いて対象プロジェクトに属する file_metadata.project_uuid を一括 UPDATE
 *
 * 実行方法:
 *   npx ts-node backend/scripts/backfill-project-uuid.ts
 *
 * オプション:
 *   --dry-run          変更を行わず差分のみ表示
 *   --org-id <uuid>    特定組織のみ対象（省略時は全組織）
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
interface ProjectRow {
  organization_id: string;
  project_id: string;
  project_name: string;
  project_uuid: string | null;
}

// ============================================================
// コマンドライン引数の解析
// ============================================================
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const orgIdIndex = args.indexOf('--org-id');
const FILTER_ORG_ID = orgIdIndex !== -1 ? args[orgIdIndex + 1] : null;

// ============================================================
// <Document uuid> 抽出（XMLパース）
// ============================================================
async function extractDocumentUuid(xmlContent: string): Promise<string | null> {
  const parsedXML = await parseStringPromise(xmlContent, {
    explicitArray: false,
    mergeAttrs: true,
    ignoreAttrs: false,
  });

  const doc = parsedXML?.maiml?.document;
  if (!doc) return null;

  const uuid = doc.uuid || doc['@_uuid'] || null;
  return uuid ? String(uuid) : null;
}

// ============================================================
// S3からMAIMLファイルをダウンロード
// ============================================================
async function downloadFromS3(s3: S3Client, fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: fileKey,
  });
  const response = (await s3.send(command)) as GetObjectCommandOutput;

  if (!response.Body) {
    throw new Error('S3レスポンスのBodyが空です');
  }

  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ============================================================
// MAIMLファイルのS3キーを特定
//   優先順位:
//   1. file_metadata テーブルの is_maiml_file = true かつ対象プロジェクトパスのレコード
//      （updated_at 降順で最新1件）
//   2. フォールバック: {organization_id}/projects/{project_name}/{project_name}.maiml
// ============================================================
async function resolveMaimlFileKey(
  client: any,
  organizationId: string,
  projectName: string,
): Promise<string> {
  const pathPrefix = `${organizationId}/projects/${projectName}/`;
  const { rows } = await client.query(
    `SELECT file_key
     FROM file_metadata
     WHERE organization_id = $1
       AND file_key LIKE $2
       AND is_maiml_file = true
     ORDER BY updated_at DESC
     LIMIT 1`,
    [organizationId, `${pathPrefix}%.maiml`],
  );

  if (rows.length > 0) {
    return rows[0].file_key;
  }

  // フォールバック
  return `${pathPrefix}${projectName}.maiml`;
}

// ============================================================
// メイン処理
// ============================================================
async function main() {
  console.log('='.repeat(72));
  console.log('project_uuid バックフィルスクリプト');
  console.log('='.repeat(72));
  console.log(`モード      : ${DRY_RUN ? '🔍 ドライラン（DBを更新しない）' : '🔄 実行（DBを更新）'}`);
  console.log(`対象組織    : ${FILTER_ORG_ID ? FILTER_ORG_ID : '全組織'}`);
  console.log('='.repeat(72));
  console.log();

  const pool = new Pool(DB_CONFIG);

  const s3ClientConfig: S3ClientConfig = {
    endpoint: S3_CONFIG.endpoint,
    region: S3_CONFIG.region,
    forcePathStyle: S3_CONFIG.forcePathStyle,
  };
  (s3ClientConfig as any).credentials = {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  };
  const s3 = new S3Client(s3ClientConfig);

  const client = await pool.connect();

  try {
    // --------------------------------------------------------
    // Phase 1: project.project_uuid の設定
    // --------------------------------------------------------
    console.log('--- Phase 1: project.project_uuid の設定 ---');

    const projectQuery = FILTER_ORG_ID
      ? `SELECT organization_id, project_id, project_name, project_uuid
         FROM project
         WHERE project_maiml_flg = true
           AND project_uuid IS NULL
           AND organization_id = $1
         ORDER BY organization_id, project_id`
      : `SELECT organization_id, project_id, project_name, project_uuid
         FROM project
         WHERE project_maiml_flg = true
           AND project_uuid IS NULL
         ORDER BY organization_id, project_id`;

    const projectQueryParams = FILTER_ORG_ID ? [FILTER_ORG_ID] : [];
    const { rows: projects } = await client.query<ProjectRow>(projectQuery, projectQueryParams);

    console.log(`対象プロジェクト数: ${projects.length}件\n`);

    let phase1Success = 0;
    let phase1Skip = 0;
    let phase1Error = 0;

    // Phase 1 で設定できた project_uuid を Phase 2 に引き継ぐ
    const resolvedProjects: Array<{ organization_id: string; project_name: string; project_uuid: string }> = [];

    for (const project of projects) {
      const { organization_id, project_id, project_name } = project;
      console.log(`処理中: ${project_name} (org: ${organization_id}, id: ${project_id})`);

      try {
        // MAIMLファイルのS3キーを特定
        const fileKey = await resolveMaimlFileKey(client, organization_id, project_name);
        console.log(`  MAIMLファイル特定: ${fileKey}`);

        // S3からダウンロード
        let xmlContent: string;
        try {
          xmlContent = await downloadFromS3(s3, fileKey);
        } catch (s3Err: any) {
          const msg = s3Err?.message || String(s3Err);
          if (
            msg.includes('NoSuchKey') ||
            msg.includes('Not Found') ||
            msg.includes('does not exist')
          ) {
            console.log('  ⚠️  S3にMAIMLファイルが存在しない (スキップ)\n');
            phase1Skip++;
            continue;
          }
          throw s3Err;
        }

        // <Document uuid> を抽出
        const documentUuid = await extractDocumentUuid(xmlContent);
        if (!documentUuid) {
          console.log('  ⚠️  <Document uuid> が見つからない (スキップ)\n');
          phase1Skip++;
          continue;
        }

        console.log(`  Document UUID: ${documentUuid}`);

        if (!DRY_RUN) {
          await client.query(
            `UPDATE project
             SET project_uuid = $1,
                 update_at    = NOW()
             WHERE organization_id = $2
               AND project_id      = $3
               AND project_uuid IS NULL`,
            [documentUuid, organization_id, project_id],
          );
        }

        console.log(`  ✅ project.project_uuid を${DRY_RUN ? '設定予定' : '設定'}\n`);
        resolvedProjects.push({ organization_id, project_name, project_uuid: documentUuid });
        phase1Success++;

      } catch (err: any) {
        console.log(`  ❌ エラー: ${err?.message || String(err)}\n`);
        phase1Error++;
      }
    }

    console.log(`Phase 1 完了: 成功=${phase1Success}件 / スキップ=${phase1Skip}件 / エラー=${phase1Error}件\n`);

    if (resolvedProjects.length === 0) {
      console.log('Phase 2 対象なし（Phase 1 で設定できたプロジェクトがゼロ）');
      return;
    }

    // --------------------------------------------------------
    // Phase 2: file_metadata.project_uuid の設定
    // --------------------------------------------------------
    console.log('--- Phase 2: file_metadata.project_uuid の設定 ---\n');

    let phase2Success = 0;
    let phase2Error = 0;

    for (const { organization_id, project_name, project_uuid } of resolvedProjects) {
      console.log(`処理中: ${project_name} (project_uuid: ${project_uuid})`);

      try {
        const pathPrefix = `${organization_id}/projects/${project_name}/`;

        if (!DRY_RUN) {
          const result = await client.query(
            `UPDATE file_metadata
             SET project_uuid = $1,
                 updated_at   = NOW()
             WHERE organization_id = $2
               AND file_key LIKE $3
               AND project_uuid IS NULL`,
            [project_uuid, organization_id, `${pathPrefix}%`],
          );
          console.log(`  ✅ file_metadata.project_uuid を設定 (${result.rowCount}件)\n`);
        } else {
          const { rows: dryRows } = await client.query(
            `SELECT COUNT(*) AS cnt
             FROM file_metadata
             WHERE organization_id = $1
               AND file_key LIKE $2
               AND project_uuid IS NULL`,
            [organization_id, `${pathPrefix}%`],
          );
          console.log(`  🔍 設定予定: ${dryRows[0].cnt}件\n`);
        }

        phase2Success++;

      } catch (err: any) {
        console.log(`  ❌ エラー: ${err?.message || String(err)}\n`);
        phase2Error++;
      }
    }

    console.log(`Phase 2 完了: 成功=${phase2Success}件 / エラー=${phase2Error}件\n`);

  } finally {
    client.release();
    await pool.end();
  }

  console.log('='.repeat(72));
  console.log('全処理完了');
  console.log('='.repeat(72));
}

main().catch(err => {
  console.error('予期せぬエラー:', err);
  process.exit(1);
});
