/**
 * transition_set テストデータ投入スクリプト
 *
 * @description embedding-gemma（port 8000）でEmbeddingを生成し、
 *              transition_set テーブルにテストデータを直接INSERTする
 *
 * @usage
 *   npx ts-node backend/scripts/seed-transition-set.ts [organization_id]
 *
 * @example
 *   npx ts-node backend/scripts/seed-transition-set.ts 2068841e-8014-4fed-8a2a-f83aef26b71e
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import axios from 'axios';
import { Pool } from 'pg';
import { v5 as uuidv5 } from 'uuid';

// ─────────────────────────────────────────
// 設定
// ─────────────────────────────────────────
const EMBEDDING_API = 'http://localhost:8000/embed';
const FILE_ID_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// 組織IDをコマンドライン引数 or デフォルト値
const ORG_ID = process.argv[2] || '2068841e-8014-4fed-8a2a-f83aef26b71e';

const pool = new Pool({
  host:     process.env.DB_HOST     || '10.1.1.219',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'maiml_db',
  user:     process.env.DB_USER     || 'maiml_user',
  password: process.env.DB_PASSWORD || 'maiml_user',
});

// ─────────────────────────────────────────
// テストデータ定義
// ─────────────────────────────────────────
const TEST_RECORDS = [
  {
    project_name:   'raman_silicon_study',
    file_path:      'projects/raman_silicon_study/raman_silicon_study.maiml',
    method_label:   'raman_method_01',
    transition_id:  'tr_raman_acquire',
    technique:      'RAMAN',
    instruction_descs: ['532nmレーザーでラマン散乱スペクトルを取得する'],
    input_text:     'INPUT:\nPLACES: sample_silicon_substrate\nTEMPLATES:\n  - MT: silicon_substrate_template\n  - CT: raman_condition_532nm',
    transition_text:'TRANSITION: RAMAN\nINSTRUCTIONS:\n  - 532nmレーザーでラマン散乱スペクトルを取得する',
    output_text:    'OUTPUT:\nPLACES: raman_spectrum_data\nTEMPLATES:\n  - RT: raman_result_template',
    structure_text: 'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=1, MT=0, CT=1, RT=1',
  },
  {
    project_name:   'raman_silicon_study',
    file_path:      'projects/raman_silicon_study/raman_silicon_study.maiml',
    method_label:   'raman_method_01',
    transition_id:  'tr_raman_analysis',
    technique:      'RAMAN',
    instruction_descs: ['バックグラウンド補正・ピーク検出・CLS解析を実施する'],
    input_text:     'INPUT:\nPLACES: raman_spectrum_data\nTEMPLATES:\n  - MT: spectrum_data_template\n  - CT: analysis_condition_template',
    transition_text:'TRANSITION: RAMAN\nINSTRUCTIONS:\n  - バックグラウンド補正・ピーク検出・CLS解析を実施する',
    output_text:    'OUTPUT:\nPLACES: analyzed_spectrum, tiff_image\nTEMPLATES:\n  - RT: raman_analysis_result_template',
    structure_text: 'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=2, MT=0, CT=1, RT=1',
  },
  {
    project_name:   'xrf_metal_analysis',
    file_path:      'projects/xrf_metal_analysis/xrf_metal_analysis.maiml',
    method_label:   'xrf_method_01',
    transition_id:  'tr_xrf_measure',
    technique:      'XRF',
    instruction_descs: ['X線を照射して蛍光X線スペクトルを測定する'],
    input_text:     'INPUT:\nPLACES: sample_metal_piece\nTEMPLATES:\n  - MT: metal_sample_template\n  - CT: xrf_condition_template',
    transition_text:'TRANSITION: XRF\nINSTRUCTIONS:\n  - X線を照射して蛍光X線スペクトルを測定する',
    output_text:    'OUTPUT:\nPLACES: xrf_spectrum_data\nTEMPLATES:\n  - RT: xrf_result_template',
    structure_text: 'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=1, MT=0, CT=1, RT=1',
  },
  {
    project_name:   'xrf_metal_analysis',
    file_path:      'projects/xrf_metal_analysis/xrf_metal_analysis.maiml',
    method_label:   'xrf_method_01',
    transition_id:  'tr_xrf_element_map',
    technique:      'XRF',
    instruction_descs: ['元素マッピングによる面分析を実施する'],
    input_text:     'INPUT:\nPLACES: xrf_spectrum_data\nTEMPLATES:\n  - MT: spectrum_data_template\n  - CT: mapping_condition_template',
    transition_text:'TRANSITION: XRF\nINSTRUCTIONS:\n  - 元素マッピングによる面分析を実施する',
    output_text:    'OUTPUT:\nPLACES: element_map_image, composition_data\nTEMPLATES:\n  - RT: xrf_mapping_result_template',
    structure_text: 'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=2, MT=0, CT=1, RT=1',
  },
  {
    project_name:   'gcms_volatile_analysis',
    file_path:      'projects/gcms_volatile_analysis/gcms_volatile_analysis.maiml',
    method_label:   'gcms_method_01',
    transition_id:  'tr_gcms_separation',
    technique:      'GC-MS',
    instruction_descs: ['ガスクロマトグラフィーで揮発性成分を分離する'],
    input_text:     'INPUT:\nPLACES: liquid_sample\nTEMPLATES:\n  - MT: liquid_sample_template\n  - CT: gcms_condition_template',
    transition_text:'TRANSITION: GC-MS\nINSTRUCTIONS:\n  - ガスクロマトグラフィーで揮発性成分を分離する',
    output_text:    'OUTPUT:\nPLACES: chromatogram_data, mass_spectrum_data\nTEMPLATES:\n  - RT: gcms_result_template',
    structure_text: 'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=2, MT=0, CT=1, RT=1',
  },
  {
    project_name:   'nmr_organic_analysis',
    file_path:      'projects/nmr_organic_analysis/nmr_organic_analysis.maiml',
    method_label:   'nmr_method_01',
    transition_id:  'tr_nmr_measure',
    technique:      'NMR',
    instruction_descs: ['1H-NMRスペクトルを取得して有機化合物の構造を解析する'],
    input_text:     'INPUT:\nPLACES: organic_compound_solution\nTEMPLATES:\n  - MT: nmr_sample_template\n  - CT: nmr_condition_template',
    transition_text:'TRANSITION: NMR\nINSTRUCTIONS:\n  - 1H-NMRスペクトルを取得して有機化合物の構造を解析する',
    output_text:    'OUTPUT:\nPLACES: nmr_spectrum_data, structure_assignment\nTEMPLATES:\n  - RT: nmr_result_template',
    structure_text: 'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=2, MT=0, CT=1, RT=1',
  },
];

// ─────────────────────────────────────────
// Embedding生成
// ─────────────────────────────────────────
async function embed(text: string): Promise<number[]> {
  const res = await axios.post(EMBEDDING_API, { text }, { timeout: 60000 });
  return res.data.embedding as number[];
}

function toVec(v: number[]): string {
  return `[${v.join(',')}]`;
}

// ─────────────────────────────────────────
// メイン
// ─────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('transition_set テストデータ投入');
  console.log(`organization_id: ${ORG_ID}`);
  console.log(`embedding API  : ${EMBEDDING_API}`);
  console.log('='.repeat(60));

  // ヘルスチェック
  try {
    const h = await axios.get('http://localhost:8000/health', { timeout: 5000 });
    console.log(`\n✅ embedding-gemma: ${h.data.status} (model: ${h.data.model})\n`);
  } catch {
    console.error('❌ embedding-gemma に接続できません (http://localhost:8000)');
    process.exit(1);
  }

  // DB接続確認
  try {
    await pool.query('SELECT 1');
    console.log('✅ DB接続OK\n');
  } catch (e) {
    console.error('❌ DB接続失敗:', e);
    process.exit(1);
  }

  // 既存テストデータ削除（idempotent）
  const filePaths = [...new Set(TEST_RECORDS.map(r => r.file_path))];
  for (const fp of filePaths) {
    await pool.query(
      'DELETE FROM transition_set WHERE organization_id=$1 AND file_path=$2',
      [ORG_ID, fp]
    );
  }
  console.log(`既存テストデータ削除完了 (${filePaths.length}ファイル分)\n`);

  // INSERT
  let inserted = 0;
  for (const rec of TEST_RECORDS) {
    process.stdout.write(`  [${inserted + 1}/${TEST_RECORDS.length}] ${rec.project_name}/${rec.transition_id}... `);
    const start = Date.now();

    const [emb_in, emb_tr, emb_out, emb_st] = await Promise.all([
      embed(rec.input_text),
      embed(rec.transition_text),
      embed(rec.output_text),
      embed(rec.structure_text),
    ]);

    const fileId    = uuidv5(rec.file_path, FILE_ID_NS);
    const methodUuid = uuidv5(`${rec.file_path}::${rec.method_label}`, FILE_ID_NS);

    await pool.query(`
      INSERT INTO transition_set (
        organization_id, project_name, file_id, file_path,
        method_uuid, transition_id,
        instruction_ids, instruction_descs,
        input_place_ids, output_place_ids,
        input_place_count, output_place_count,
        input_text, transition_text, output_text, structure_text,
        input_mt_count, input_ct_count, input_rt_count,
        output_mt_count, output_ct_count, output_rt_count,
        emb_input, emb_transition, emb_output, emb_structure,
        technique, embedding_model_version, norm_template_version
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,
        '{}','{}',0,0,
        $9,$10,$11,$12,
        1,1,0,0,1,1,
        $13::vector,$14::vector,$15::vector,$16::vector,
        $17,'embeddinggemma-768d-v1','v2.5'
      )
    `, [
      ORG_ID, rec.project_name, fileId, rec.file_path,
      methodUuid, rec.transition_id,
      rec.instruction_descs, rec.instruction_descs,
      rec.input_text, rec.transition_text, rec.output_text, rec.structure_text,
      toVec(emb_in), toVec(emb_tr), toVec(emb_out), toVec(emb_st),
      rec.technique,
    ]);

    inserted++;
    console.log(`✅ ${Date.now() - start}ms`);
  }

  // 確認
  const { rows } = await pool.query(
    'SELECT project_name, transition_id, technique FROM transition_set WHERE organization_id=$1 ORDER BY project_name',
    [ORG_ID]
  );
  console.log(`\n投入完了: ${inserted}件`);
  console.log('\n─── DBに保存されたデータ ───');
  rows.forEach(r => console.log(`  ${r.project_name} / ${r.transition_id} [${r.technique}]`));

  console.log('\n✅ テストデータ投入完了');
  console.log('   次のコマンドでAPIテストを実行してください:');
  console.log('   npx ts-node backend/scripts/test-semantic-search-api.ts\n');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
