import { Pool } from 'pg';

const pool = new Pool({
  host: '10.1.1.219',
  port: 5432,
  database: 'maiml_db',
  user: 'maiml_user',
  password: 'maiml_user',
});

const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

async function main() {
  // 修正後のSQLと同等のクエリ（is_maiml_file条件なし）でテスト
  const r1 = await pool.query(
    `SELECT DISTINCT p.project_id, p.project_name, fm.maiml_document_name
     FROM file_metadata fm
     INNER JOIN project p
       ON p.organization_id = fm.organization_id
       AND fm.file_key LIKE CONCAT(fm.organization_id, '/projects/', p.project_name, '/%')
     WHERE fm.organization_id = $1
       AND fm.maiml_metadata_extraction_status = 'completed'
       AND fm.maiml_document_name ILIKE '%QuantumDot%'
     ORDER BY p.project_name`,
    [ORG_ID]
  );
  console.log('=== document.name ILIKE "%QuantumDot%" ===');
  console.table(r1.rows);

  // id検索
  const r2 = await pool.query(
    `SELECT DISTINCT p.project_id, p.project_name
     FROM file_metadata fm
     INNER JOIN project p
       ON p.organization_id = fm.organization_id
       AND fm.file_key LIKE CONCAT(fm.organization_id, '/projects/', p.project_name, '/%')
     WHERE fm.organization_id = $1
       AND fm.maiml_metadata_extraction_status = 'completed'
       AND fm.maiml_ids @> $2::jsonb
     ORDER BY p.project_name`,
    [ORG_ID, JSON.stringify(['condition-1772157754111'])]
  );
  console.log('\n=== id @> ["condition-1772157754111"] ===');
  console.table(r2.rows);

  // 全プロジェクトヒット確認
  const r3 = await pool.query(
    `SELECT DISTINCT p.project_name, fm.maiml_metadata_extraction_status
     FROM file_metadata fm
     INNER JOIN project p
       ON p.organization_id = fm.organization_id
       AND fm.file_key LIKE CONCAT(fm.organization_id, '/projects/', p.project_name, '/%')
     WHERE fm.organization_id = $1
       AND fm.maiml_metadata_extraction_status = 'completed'
     ORDER BY p.project_name`,
    [ORG_ID]
  );
  console.log('\n=== JOINにヒットする全プロジェクト（is_maiml_fileフィルタなし） ===');
  console.table(r3.rows);

  await pool.end();
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
