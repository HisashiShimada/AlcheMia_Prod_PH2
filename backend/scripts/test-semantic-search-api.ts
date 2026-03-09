/**
 * セマンティック検索 APIフルフローテストスクリプト
 *
 * @description 画面から検索する場合と同じフローをHTTPリクエストで再現する
 *              ログイン → decompose → search
 *
 * @usage
 *   npx ts-node backend/scripts/test-semantic-search-api.ts
 *
 * @prerequisites
 *   - バックエンドサーバーが起動していること (PORT=3001)
 *   - transition_set にテストデータが入っていること
 *     → npx ts-node backend/scripts/seed-transition-set.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────
// 設定
// ─────────────────────────────────────────
const API_BASE  = process.env.API_BASE_URL || 'http://localhost:3001';
const LOGIN_ID  = process.env.TEST_LOGIN_ID  || 'admin';
const LOGIN_PASS = process.env.TEST_LOGIN_PASS || 'admin';

// ─────────────────────────────────────────
// テストクエリ
// ─────────────────────────────────────────
const TEST_QUERIES = [
  {
    label: 'ラマン測定を探す',
    query: '532nmレーザーでシリコン基板のラマン散乱スペクトルを取得してCLS解析とTIFF出力',
  },
  {
    label: 'XRF元素分析を探す',
    query: 'X線照射で金属サンプルの元素組成を分析して元素マッピング画像を出力',
  },
  {
    label: '揮発性成分分析を探す',
    query: 'ガスクロマトグラフィーで液体試料から揮発性有機成分を分離・同定',
  },
];

// ─────────────────────────────────────────
// ステップ実行
// ─────────────────────────────────────────

/** Step1: ログイン（Cookieを取得） */
async function login(): Promise<AxiosInstance> {
  console.log('\n[Step 1] ログイン...');
  const client = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    timeout: 30000,
  });

  // cookieを手動管理
  let cookies = '';

  try {
    const res = await client.post('/api/v1/auth/login', {
      login_id: LOGIN_ID,
      password: LOGIN_PASS,
    });

    // Set-Cookieヘッダーを保存
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      cookies = setCookie.map((c: string) => c.split(';')[0]).join('; ');
    }

    console.log(`  ✅ ログイン成功 (user: ${res.data?.data?.user?.login_id ?? LOGIN_ID})`);
    if (!cookies) {
      console.warn('  ⚠️  Cookie が取得できませんでした。セッションなしで続行します。');
    }

    // cookie付きクライアントを返す
    const authedClient = axios.create({
      baseURL: API_BASE,
      timeout: 60000,
      headers: cookies ? { Cookie: cookies } : {},
    });

    return authedClient;
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response) {
      console.error(`  ❌ ログイン失敗: ${e.response.status} ${JSON.stringify(e.response.data)}`);
      console.error(`  ヒント: TEST_LOGIN_ID / TEST_LOGIN_PASS 環境変数を設定してください`);
    } else {
      console.error('  ❌ バックエンドに接続できません:', e instanceof Error ? e.message : e);
      console.error(`  ヒント: バックエンドが起動しているか確認してください: npm run dev (backend)`);
    }
    process.exit(1);
  }
}

/** Step2: ヘルスチェック */
async function checkHealth(client: AxiosInstance): Promise<void> {
  console.log('\n[Step 2] ヘルスチェック...');
  try {
    const res = await client.get('/api/v1/semantic-search/health');
    const d = res.data.data;
    console.log(`  overall : ${d.status}`);
    console.log(`  ollama  : ${d.ollama}`);
    console.log(`  gpt_oss : ${d.gpt_oss}`);
  } catch (e: unknown) {
    console.warn('  ⚠️  ヘルスチェック失敗:', axios.isAxiosError(e) ? e.response?.data : e);
  }
}

/** Step3: インデックス統計 */
async function getStats(client: AxiosInstance): Promise<void> {
  console.log('\n[Step 3] インデックス統計...');
  try {
    const res = await client.get('/api/v1/semantic-search/stats');
    const d = res.data.data;
    console.log(`  totalTransitionSets: ${d.totalTransitionSets}`);
    console.log(`  totalFiles         : ${d.totalFiles}`);
    if (d.byProject?.length > 0) {
      console.log('  プロジェクト別:');
      d.byProject.forEach((p: { project_name: string; transition_set_count: number; file_count: number }) => {
        console.log(`    ${p.project_name ?? '(null)'}: ${p.transition_set_count}件 / ${p.file_count}ファイル`);
      });
    } else {
      console.warn('  ⚠️  データなし。先に seed-transition-set.ts を実行してください');
    }
  } catch (e: unknown) {
    console.error('  ❌ 統計取得失敗:', axios.isAxiosError(e) ? e.response?.data : e);
  }
}

/** Step4: クエリ分解 (decompose) */
async function decompose(client: AxiosInstance, query: string): Promise<Record<string, string>> {
  const res = await client.post('/api/v1/semantic-search/decompose', { query });
  return res.data.data as Record<string, string>;
}

/** Step5: セマンティック検索 */
async function search(client: AxiosInstance, query: string): Promise<void> {
  console.log(`\n  🔍 クエリ: "${query}"`);

  // decompose
  process.stdout.write('     [decompose] AI分解中... ');
  const start1 = Date.now();
  let decomposed: Record<string, string>;
  try {
    decomposed = await decompose(client, query);
    console.log(`${Date.now() - start1}ms`);
    if ((decomposed as any).fallback) {
      console.log('     → フォールバック動作（GPT未接続）: 元クエリを全軸に使用');
    } else {
      console.log(`     → q_in   : ${decomposed.q_in?.substring(0, 60) ?? '-'}`);
      console.log(`     → q_tr   : ${decomposed.q_tr?.substring(0, 60) ?? '-'}`);
      console.log(`     → q_out  : ${decomposed.q_out?.substring(0, 60) ?? '-'}`);
      console.log(`     → q_struct: ${decomposed.q_struct?.substring(0, 60) ?? '-'}`);
    }
  } catch (e: unknown) {
    console.error(`失敗: ${axios.isAxiosError(e) ? JSON.stringify(e.response?.data) : e}`);
    return;
  }

  // search
  process.stdout.write('     [search] ベクトル検索中... ');
  const start2 = Date.now();
  try {
    const res = await client.post('/api/v1/semantic-search/search', {
      input_query:      decomposed.q_in     || query,
      transition_query: decomposed.q_tr     || query,
      output_query:     decomposed.q_out    || query,
      structure_query:  decomposed.q_struct || query,
      top_k: 5,
      weights: { input: 0.28, transition: 0.40, output: 0.22, structure: 0.10 },
    });
    const elapsed = Date.now() - start2;
    const d = res.data.data;
    console.log(`${elapsed}ms → ${d.total}件ヒット`);

    if (d.hits?.length > 0) {
      console.log('     ランキング:');
      d.hits.slice(0, 5).forEach((h: {
        score: number;
        project_name: string;
        transition_id: string;
        technique: string;
        score_detail: { input_score: number; transition_score: number; output_score: number; structure_score: number };
      }, i: number) => {
        const sd = h.score_detail;
        console.log(
          `       ${i + 1}位 [score=${h.score.toFixed(4)}] ` +
          `${h.project_name ?? '?'} / ${h.transition_id} [${h.technique ?? '?'}]`
        );
        console.log(
          `            in=${sd.input_score.toFixed(3)} ` +
          `tr=${sd.transition_score.toFixed(3)} ` +
          `out=${sd.output_score.toFixed(3)} ` +
          `struct=${sd.structure_score.toFixed(3)}`
        );
      });
    } else {
      console.log('     → 結果なし（DBにデータがない可能性）');
    }
  } catch (e: unknown) {
    console.error(`失敗: ${axios.isAxiosError(e) ? JSON.stringify(e.response?.data) : e}`);
  }
}

// ─────────────────────────────────────────
// メイン
// ─────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('セマンティック検索 APIフルフローテスト');
  console.log(`API_BASE   : ${API_BASE}`);
  console.log(`LOGIN_ID   : ${LOGIN_ID}`);
  console.log('='.repeat(60));

  const client = await login();
  await checkHealth(client);
  await getStats(client);

  console.log('\n[Step 4] 検索テスト（decompose → search）');
  for (const q of TEST_QUERIES) {
    console.log(`\n  ■ ${q.label}`);
    await search(client, q.query);
  }

  console.log('\n✅ テスト完了\n');
}

main().catch(e => { console.error(e); process.exit(1); });
