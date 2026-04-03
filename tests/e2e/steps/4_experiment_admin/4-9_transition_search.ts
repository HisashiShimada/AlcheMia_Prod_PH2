/**
 * ステップ定義: [4-9] トランジション検索
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-9_transition_search.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: admin123
 *
 * 機能概要:
 *   プロジェクト管理画面ヘッダーの「トランジション検索」ボタンから開く
 *   TransitionSetSearchModal（セマンティック検索モーダル）の E2E テスト。
 *
 * API:
 *   - POST /api/v1/semantic-search/search   : ベクトル類似検索（4軸）
 *   - POST /api/v1/semantic-search/decompose: クエリを4軸に AI 分解
 *   - POST /api/v1/semantic-search/batch    : Embedding 生成バッチ起動
 *
 * data-testid 一覧:
 *   プロジェクト管理画面:
 *   - [transition-search-button]           : トランジション検索ボタン
 *   - [project-management-page]            : プロジェクト管理画面ルート要素
 *
 *   TransitionSetSearchModal:
 *   - [transition-set-search-modal]        : モーダル本体
 *   - [search-query-input]                 : 検索クエリ入力（TextArea）
 *   - [search-execute-button]              : 検索実行ボタン
 *   - [search-reset-button]               : リセットボタン
 *   - [quick-search-button-{name}]         : クイック検索ボタン（構造重視/手順重視/入力重視/出力重視/バランス）
 *
 *   SearchResults:
 *   - [search-results-list]               : 検索結果一覧（Ant Design List）
 *   - [result-transition-id]              : 各結果のトランジションID
 *   - [result-score]                      : 各結果のスコア
 *   - [result-project-tag]               : 各結果のプロジェクト名タグ
 *
 *   バッチ処理タブ:
 *   - [batch-processing-tab]             : バッチ処理タブ
 *   - [batch-start-button]               : バッチ処理開始ボタン
 *   - [batch-accepted-message]           : バッチ受付成功メッセージ
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - transition_set テーブルに embedding 済みのトランジションが存在すること
 *
 * 注意事項:
 *   - 4-9-10（バッチ起動）: @manual タグ付き。Ollamaサービスが必要なため手動テスト対象。
 *   - ベクトル検索は Ollama エンベディングサービスが起動していることが前提。
 *     未起動時は「検索結果が見つかりませんでした」が表示される場合がある。
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// ---------------------------------------------------------------------------
// 前提ステップ
// ---------------------------------------------------------------------------

Given('セマンティック検索対象のトランジションデータがDBに存在する', async () => {
  // DBの transition_set テーブルに embedding 済みデータが存在することを前提とする。
  // E2Eテストでは事前データとして準備済みであることを想定し、ここでは何もしない。
});

Given('Ollamaエンベディングサービスが起動していること', async () => {
  // 手動テスト用の前提条件。自動テストでは何もしない。
});

// ---------------------------------------------------------------------------
// モーダル操作
// ---------------------------------------------------------------------------

When('トランジション検索ボタンをクリックしてモーダルを開く', async ({ page }) => {
  await page.click('[data-testid="transition-search-button"]');
  await page.waitForSelector('[data-testid="transition-set-search-modal"]', { timeout: 10_000 });
});

When('検索クエリ入力に {string} を入力する', async ({ page }, query: string) => {
  const input = page.locator('[data-testid="search-query-input"]');
  await input.fill(query);
});

When('検索実行ボタンをクリックする', async ({ page }) => {
  await page.click('[data-testid="search-execute-button"]');
  // 検索APIレスポンスを待機（最大30秒: Ollamaエンベディング生成が遅い場合を考慮）
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/v1/semantic-search/search') && resp.status() === 200,
    { timeout: 30_000 },
  );
});

When('{string} クイック検索ボタンをクリックする', async ({ page }, buttonName: string) => {
  await page.click(`[data-testid="quick-search-button-${buttonName}"]`);
  // クイック検索は検索も同時実行する
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/v1/semantic-search/search') && resp.status() === 200,
    { timeout: 30_000 },
  );
});

When('検索クエリ入力をクリアして {string} を入力する', async ({ page }, query: string) => {
  const input = page.locator('[data-testid="search-query-input"]');
  await input.clear();
  await input.fill(query);
});

When('リセットボタンをクリックする', async ({ page }) => {
  await page.click('[data-testid="search-reset-button"]');
});

When('検索結果一覧の最初のプロジェクト名タグをクリックする', async ({ page }) => {
  const firstProjectTag = page.locator('[data-testid="result-project-tag"]').first();
  await expect(firstProjectTag).toBeVisible({ timeout: 10_000 });
  await firstProjectTag.click();
});

When('バッチ処理タブをクリックする', async ({ page }) => {
  await page.click('[data-testid="batch-processing-tab"]');
});

When('バッチ処理開始ボタンをクリックする', async ({ page }) => {
  await page.click('[data-testid="batch-start-button"]');
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/v1/semantic-search/batch') && resp.status() === 202,
    { timeout: 15_000 },
  );
});

// ---------------------------------------------------------------------------
// 検証ステップ
// ---------------------------------------------------------------------------

Then('プロジェクト管理画面にトランジション検索ボタンが表示されること', async ({ page }) => {
  await expect(page.locator('[data-testid="transition-search-button"]')).toBeVisible({
    timeout: 10_000,
  });
});

Then('検索結果一覧が表示されること', async ({ page }) => {
  // SearchResults コンポーネントの List が表示されていること
  await expect(page.locator('[data-testid="search-results-list"]')).toBeVisible({
    timeout: 10_000,
  });
});

Then('検索結果一覧にトランジションIDが表示されること', async ({ page }) => {
  const firstTransitionId = page.locator('[data-testid="result-transition-id"]').first();
  await expect(firstTransitionId).toBeVisible({ timeout: 10_000 });
});

Then('検索結果一覧にスコアが表示されること', async ({ page }) => {
  const firstScore = page.locator('[data-testid="result-score"]').first();
  await expect(firstScore).toBeVisible({ timeout: 10_000 });
});

Then('検索結果が0件のメッセージが表示されること', async ({ page }) => {
  // SearchResults の Empty コンポーネント（hits.length === 0 時）
  await expect(page.locator('text=検索結果が見つかりませんでした')).toBeVisible({
    timeout: 10_000,
  });
});

Then('検索クエリ入力がクリアされること', async ({ page }) => {
  const input = page.locator('[data-testid="search-query-input"]');
  await expect(input).toHaveValue('', { timeout: 5_000 });
});

Then('検索前の初期状態メッセージが表示されること', async ({ page }) => {
  // SearchResults の !searched 時の Empty コンポーネント
  await expect(page.locator('text=検索条件を入力して')).toBeVisible({ timeout: 5_000 });
});

Then('トランジション検索モーダルが閉じること', async ({ page }) => {
  await expect(page.locator('[data-testid="transition-set-search-modal"]')).not.toBeVisible({
    timeout: 10_000,
  });
});

Then('バッチジョブが受け付けられること', async ({ page }) => {
  // バッチ受付成功メッセージが表示されること（202 Accepted）
  await expect(page.locator('[data-testid="batch-accepted-message"]')).toBeVisible({
    timeout: 10_000,
  });
});
