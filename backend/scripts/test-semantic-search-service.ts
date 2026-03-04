/**
 * セマンティック検索 サービス層直接呼び出しテスト
 *
 * @description 画面から検索する場合と同じ内部フローをサービス層から直接実行する
 *              ログイン・HTTP認証不要
 *
 *   【画面のフロー】
 *   ①  ユーザーがクエリを入力して「検索」ボタン押下
 *   ②  フロントエンド → POST /api/v1/semantic-search/decompose
 *         └─ decomposeQuery(query)        ← GPT-OSSで4軸分解（無効時はフォールバック）
 *   ③  フロントエンド → POST /api/v1/semantic-search/search
 *         └─ generate4AxisVectors(...)    ← Ollamaで4軸Embedding生成
 *         └─ semanticSearchRepository.search(...) ← pgvectorでHNSWベクトル検索
 *   ④  結果をUIに表示
 *
 *   【このスクリプト】
 *   ②③の処理をサービス層から直接呼び出し、同じ結果を得る
 *
 * @usage
 *   npx ts-node backend/scripts/test-semantic-search-service.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// サービス・リポジトリを直接import
import { decomposeQuery } from '../src/services/transitionSetQueryDecomposerService';
import { generate4AxisVectors, healthCheck as embeddingHealthCheck, getServiceInfo } from '../src/services/transitionSetEmbeddingService';
import * as semanticSearchRepository from '../src/repositories/semanticSearchRepository';

// ─────────────────────────────────────────
// テスト設定
// ─────────────────────────────────────────
const ORG_ID = process.argv[2] || '2068841e-8014-4fed-8a2a-f83aef26b71e';

const TOP_K = 5;
const WEIGHTS = { input: 0.28, transition: 0.40, output: 0.22, structure: 0.10 };

const TEST_QUERIES = [
  '532nmレーザーでシリコン基板のラマン散乱スペクトルを取得してCLS解析とTIFF出力',
  'X線照射で金属サンプルの元素組成を分析して元素マッピング画像を出力',
  'ガスクロマトグラフィーで液体試料から揮発性有機成分を分離・同定',
  'NMRで有機化合物の構造解析',
];

// ─────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────
function hr(char = '─', len = 60) { return char.repeat(len); }

// ─────────────────────────────────────────
// メイン
// ─────────────────────────────────────────
async function main() {
  console.log(hr('='));
  console.log('セマンティック検索 サービス層直接テスト');
  console.log(`organization_id: ${ORG_ID}`);
  console.log(`GPT_OSS_ENABLED: ${process.env.GPT_OSS_ENABLED}`);
  console.log(`OLLAMA_ENDPOINT : ${process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_HOST || '(default)'}`);
  console.log(hr('='));

  // ─── Step 1: サービス情報 ───
  console.log('\n[Step 1] Embedding サービス情報');
  const info = getServiceInfo();
  console.log(`  モデル    : ${info.model}`);
  console.log(`  API URL   : ${info.apiUrl}`);
  console.log(`  次元数    : ${info.dimension}`);

  // ─── Step 2: ヘルスチェック ───
  console.log('\n[Step 2] Embedding ヘルスチェック');
  process.stdout.write('  接続確認中... ');
  const healthy = await embeddingHealthCheck();
  if (!healthy) {
    console.log('❌ 失敗');
    console.error('  embedding-gemma に接続できません。コンテナが起動しているか確認してください。');
    process.exit(1);
  }
  console.log('✅ 正常');

  // ─── Step 3: DB件数確認 ───
  console.log('\n[Step 3] DBインデックス統計');
  try {
    const statsRows = await semanticSearchRepository.getStats(ORG_ID);
    const totalTransitionSets = statsRows.reduce((s, r) => s + r.transition_set_count, 0);
    const totalFiles = statsRows.reduce((s, r) => s + r.file_count, 0);
    console.log(`  transition_set 件数 : ${totalTransitionSets}`);
    console.log(`  ファイル数          : ${totalFiles}`);
    if (statsRows.length > 0) {
      console.log('  プロジェクト別:');
      statsRows.forEach(r => console.log(`    ${r.project_name}: ${r.transition_set_count}件`));
    }
    if (totalTransitionSets === 0) {
      console.warn('\n  ⚠️  データが0件です。先に seed-transition-set.ts を実行してください:');
      console.warn('     npx ts-node backend/scripts/seed-transition-set.ts');
      process.exit(1);
    }
  } catch (e) {
    console.error('  ❌ DB統計取得失敗:', e);
    process.exit(1);
  }

  // ─── Step 4: 検索テスト ───
  console.log(`\n[Step 4] 検索テスト (${TEST_QUERIES.length}クエリ)`);

  for (let qi = 0; qi < TEST_QUERIES.length; qi++) {
    const query = TEST_QUERIES[qi];
    console.log(`\n${hr()}`);
    console.log(`■ クエリ ${qi + 1}/${TEST_QUERIES.length}: "${query}"`);
    console.log(hr());

    // ── ② decompose（画面フローStep②） ──
    process.stdout.write('\n  [decompose] GPTによるクエリ4軸分解... ');
    const t1 = Date.now();
    const decomposed = await decomposeQuery(query);
    const dt1 = Date.now() - t1;
    console.log(`${dt1}ms`);

    if (decomposed.fallback) {
      console.log(`  → フォールバック動作 (GPT未接続 or GPT_OSS_ENABLED=false)`);
      console.log(`  → 元クエリをそのまま4軸に使用`);
    } else {
      console.log(`  → q_in    : ${(decomposed.q_in    || '').substring(0, 70)}`);
      console.log(`  → q_tr    : ${(decomposed.q_tr    || '').substring(0, 70)}`);
      console.log(`  → q_out   : ${(decomposed.q_out   || '').substring(0, 70)}`);
      console.log(`  → q_struct: ${(decomposed.q_struct || '').substring(0, 70)}`);
      if (decomposed.confidence != null) {
        console.log(`  → confidence: ${decomposed.confidence}`);
      }
    }

    const q_in     = decomposed.q_in     || query;
    const q_tr     = decomposed.q_tr     || query;
    const q_out    = decomposed.q_out    || query;
    const q_struct = decomposed.q_struct || query;

    // ── ③-a generate4AxisVectors（画面フローStep③前半） ──
    process.stdout.write('\n  [embedding] 4軸ベクトル生成... ');
    const t2 = Date.now();
    let vectors: Awaited<ReturnType<typeof generate4AxisVectors>>;
    try {
      vectors = await generate4AxisVectors(q_in, q_tr, q_out, q_struct);
      const dt2 = Date.now() - t2;
      console.log(`${dt2}ms (dim=${vectors.emb_input.length})`);
    } catch (e) {
      console.error('\n  ❌ Embedding生成失敗:', e);
      continue;
    }

    // ── ③-b semanticSearchRepository.search（画面フローStep③後半） ──
    process.stdout.write('\n  [search] pgvector HNSWベクトル検索... ');
    const t3 = Date.now();
    try {
      const hits = await semanticSearchRepository.search(
        ORG_ID,
        vectors.emb_input,
        vectors.emb_transition,
        vectors.emb_output,
        vectors.emb_structure,
        WEIGHTS.input,
        WEIGHTS.transition,
        WEIGHTS.output,
        WEIGHTS.structure,
        TOP_K,
        null,   // technique フィルタなし
        null    // projectName フィルタなし
      );
      const dt3 = Date.now() - t3;
      console.log(`${dt3}ms → ${hits.length}件ヒット`);

      if (hits.length === 0) {
        console.log('  → 結果なし');
      } else {
        console.log('\n  ランキング:');
        hits.forEach((h: any, i: number) => {
          const sd = h.score_detail || {};
          console.log(
            `    ${i + 1}位 [score=${Number(h.score).toFixed(4)}] ` +
            `${h.project_name ?? '?'} / ${h.transition_id} [${h.technique ?? '?'}]`
          );
          console.log(
            `         in=${Number(sd.input_score ?? 0).toFixed(3)} ` +
            `tr=${Number(sd.transition_score ?? 0).toFixed(3)} ` +
            `out=${Number(sd.output_score ?? 0).toFixed(3)} ` +
            `struct=${Number(sd.structure_score ?? 0).toFixed(3)}`
          );
          if (h.instruction_descs?.length > 0) {
            console.log(`         指示: ${h.instruction_descs[0]}`);
          }
        });
      }
    } catch (e) {
      console.error('\n  ❌ ベクトル検索失敗:', e);
    }
  }

  console.log(`\n${hr('=')}`);
  console.log('✅ テスト完了');
  console.log(hr('='));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
