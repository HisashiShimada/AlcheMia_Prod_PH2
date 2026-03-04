/**
 * Ollama Embedding ローカルテストスクリプト
 *
 * @description ローカルOllamaのembeddinggemmaモデルを使って
 *              セマンティック検索のEmbedding生成・類似度計算を手動テストする
 *
 * @usage
 *   npx ts-node backend/scripts/test-ollama-embedding.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .envを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import axios from 'axios';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'embeddinggemma:latest';

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────

/** コサイン類似度を計算 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Ollama API でテキスト → ベクトル変換 */
async function embed(text: string): Promise<number[]> {
  const res = await axios.post(
    `${OLLAMA_HOST}/api/embeddings`,
    { model: EMBEDDING_MODEL, prompt: text },
    { timeout: 60000 }
  );
  return res.data.embedding as number[];
}

// ─────────────────────────────────────────
// テストデータ（4軸テキストのサンプル）
// ─────────────────────────────────────────

const TEST_CASES = [
  {
    label: 'ラマン測定（シリコン基板）',
    input:      'INPUT:\nPLACES: sample_silicon_substrate\nTEMPLATES:\n  - MT: silicon_substrate_template\n  - CT: raman_condition_532nm',
    transition: 'TRANSITION: RAMAN\nINSTRUCTIONS:\n  - 532nmレーザーでラマン散乱スペクトルを取得',
    output:     'OUTPUT:\nPLACES: raman_spectrum_data\nTEMPLATES:\n  - RT: raman_result_template',
    structure:  'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=1, MT=0, CT=1, RT=1',
  },
  {
    label: 'ラマン測定（ガラス基板）',
    input:      'INPUT:\nPLACES: sample_glass\nTEMPLATES:\n  - MT: glass_sample_template\n  - CT: raman_condition_785nm',
    transition: 'TRANSITION: RAMAN\nINSTRUCTIONS:\n  - 785nmレーザーでラマン散乱スペクトルを取得',
    output:     'OUTPUT:\nPLACES: raman_spectrum_output\nTEMPLATES:\n  - RT: raman_result_template',
    structure:  'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=1, MT=0, CT=1, RT=1',
  },
  {
    label: 'XRF測定',
    input:      'INPUT:\nPLACES: sample_metal\nTEMPLATES:\n  - MT: metal_sample_template\n  - CT: xrf_condition_template',
    transition: 'TRANSITION: XRF\nINSTRUCTIONS:\n  - X線を照射して蛍光X線スペクトルを測定',
    output:     'OUTPUT:\nPLACES: xrf_spectrum_data\nTEMPLATES:\n  - RT: xrf_result_template',
    structure:  'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=1, MT=0, CT=1, RT=1',
  },
  {
    label: 'GC-MS測定',
    input:      'INPUT:\nPLACES: liquid_sample\nTEMPLATES:\n  - MT: liquid_sample_template\n  - CT: gcms_condition_template',
    transition: 'TRANSITION: GC-MS\nINSTRUCTIONS:\n  - ガスクロマトグラフィー質量分析で揮発性成分を分離・同定',
    output:     'OUTPUT:\nPLACES: chromatogram_data, mass_spectrum_data\nTEMPLATES:\n  - RT: gcms_result_template',
    structure:  'STRUCTURE:\nIN: PLACES=1, MT=1, CT=1, RT=0\nOUT: PLACES=2, MT=0, CT=1, RT=1',
  },
];

/** 検索クエリのサンプル */
const SEARCH_QUERIES = [
  {
    label: 'レーザーラマン測定を探す',
    q_in:     'シリコン基板 532nmレーザー 室温',
    q_tr:     'ラマン散乱 バックグラウンド補正 ピーク検出',
    q_out:    'スペクトルデータ TIFFイメージ',
    q_struct: '1入力1出力',
  },
  {
    label: 'XRF元素分析を探す',
    q_in:     '金属サンプル X線照射',
    q_tr:     '蛍光X線スペクトル 元素組成分析',
    q_out:    '蛍光X線スペクトルデータ 元素マッピング',
    q_struct: '1入力1出力',
  },
];

const WEIGHTS = { input: 0.28, transition: 0.40, output: 0.22, structure: 0.10 };

// ─────────────────────────────────────────
// メイン処理
// ─────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('Ollama Embedding ローカルテスト');
  console.log(`HOST  : ${OLLAMA_HOST}`);
  console.log(`MODEL : ${EMBEDDING_MODEL}`);
  console.log('='.repeat(60));

  // ── Step 1: ヘルスチェック ──
  console.log('\n[1] Ollama ヘルスチェック...');
  try {
    const res = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 5000 });
    const models = (res.data?.models ?? []).map((m: { name: string }) => m.name);
    console.log('✅ Ollama 接続OK');
    console.log(`   利用可能モデル: ${models.join(', ') || '（なし）'}`);
    if (!models.includes(EMBEDDING_MODEL)) {
      console.warn(`⚠️  ${EMBEDDING_MODEL} が見つかりません。`);
      console.warn(`   pullコマンド: ollama pull ${EMBEDDING_MODEL}`);
    }
  } catch (err) {
    console.error('❌ Ollama に接続できません:', err instanceof Error ? err.message : err);
    console.error('   Ollama が起動しているか確認してください: ollama serve');
    process.exit(1);
  }

  // ── Step 2: テストデータのEmbedding生成 ──
  console.log('\n[2] テストデータのEmbedding生成...');
  type EmbeddedCase = {
    label: string;
    emb_input: number[];
    emb_transition: number[];
    emb_output: number[];
    emb_structure: number[];
  };
  const embeddedCases: EmbeddedCase[] = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`   ${tc.label}... `);
    const start = Date.now();
    const [emb_input, emb_transition, emb_output, emb_structure] = await Promise.all([
      embed(tc.input),
      embed(tc.transition),
      embed(tc.output),
      embed(tc.structure),
    ]);
    const ms = Date.now() - start;
    console.log(`✅ ${ms}ms (dim=${emb_input.length})`);
    embeddedCases.push({ label: tc.label, emb_input, emb_transition, emb_output, emb_structure });
  }

  // ── Step 3: 検索クエリで類似度計算 ──
  console.log('\n[3] 検索クエリの類似度計算...');

  for (const q of SEARCH_QUERIES) {
    console.log(`\n  🔍 クエリ: "${q.label}"`);
    process.stdout.write('     Embedding生成中... ');
    const start = Date.now();
    const [q_emb_in, q_emb_tr, q_emb_out, q_emb_struct] = await Promise.all([
      embed(q.q_in),
      embed(q.q_tr),
      embed(q.q_out),
      embed(q.q_struct),
    ]);
    console.log(`${Date.now() - start}ms`);

    // 各テストデータとのスコア計算
    const results = embeddedCases.map((ec) => {
      const s_in     = cosineSimilarity(q_emb_in,     ec.emb_input);
      const s_tr     = cosineSimilarity(q_emb_tr,     ec.emb_transition);
      const s_out    = cosineSimilarity(q_emb_out,    ec.emb_output);
      const s_struct = cosineSimilarity(q_emb_struct, ec.emb_structure);
      const score    = WEIGHTS.input * s_in + WEIGHTS.transition * s_tr +
                       WEIGHTS.output * s_out + WEIGHTS.structure * s_struct;
      return { label: ec.label, score, s_in, s_tr, s_out, s_struct };
    });

    results.sort((a, b) => b.score - a.score);

    console.log('  ランキング:');
    results.forEach((r, i) => {
      console.log(
        `    ${i + 1}位 [score=${r.score.toFixed(4)}] ${r.label}` +
        `\n       in=${r.s_in.toFixed(3)} tr=${r.s_tr.toFixed(3)} out=${r.s_out.toFixed(3)} struct=${r.s_struct.toFixed(3)}`
      );
    });
  }

  console.log('\n✅ テスト完了');
}

main().catch((err) => {
  console.error('スクリプトエラー:', err);
  process.exit(1);
});
