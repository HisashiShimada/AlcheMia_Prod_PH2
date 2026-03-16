/**
 * 実験作業者機能の共通ステップ定義
 *
 * 複数の feature ファイルで共有するステップを一元管理する。
 * 各ステップファイルに重複定義すると playwright-bdd が
 * "Multiple definitions matched scenario step" エラーを発生させるため、
 * このファイルで一度だけ定義する。
 */

import { createBdd } from 'playwright-bdd';

const { Given, When } = createBdd();

/** テスト対象の組織ID */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

// ---------------------------------------------------------------------------
// 背景（no-op）
// ---------------------------------------------------------------------------

/**
 * 前提: 実験作業者のユーザIDがDB（organization_userテーブル）に存在する
 * → テスト用ユーザーは事前にDBに存在することを前提とするため何もしない
 *
 * TODO: 実際のユーザーIDに要更新（worker_user@example.com は仮値）
 *
 * 参照 feature:
 *   - features/5_experiment_worker/5-1_project_selection.feature
 */
Given(
  '実験作業者のユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _userId: string) => {
    // no-op: テスト用ユーザーは事前準備済みとする
  }
);

// ---------------------------------------------------------------------------
// 共通 When: ログイン・画面遷移（5-3, 5-5 で共有）
// ---------------------------------------------------------------------------

/**
 * 実験作業者ユーザーでログインする
 * 5-3_issue_management.feature / 5-5_progress_check.feature で共通利用
 */
When('実験作業者ユーザー {string} でログインする', async ({ page }, _userId: string) => {
  await page.goto(`/?orgId=${ORG_ID}`);
  await page.waitForSelector('#userId', { timeout: 15000 });
  await page.fill('#userId', 'worker@example.com');
  await page.fill('#password', 'worker123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
});

/**
 * 実験作業者メイン画面が表示されていること（プロジェクト選択コンボボックスが表示）
 * 5-3_issue_management.feature / 5-5_progress_check.feature で共通利用
 *
 * NOTE: ログイン後のリダイレクト・初期レンダリングに時間がかかる場合があるため、
 *       タイムアウトを 30000ms に延長し、networkidle 後に再待機する。
 */
When('実験作業者メイン画面が表示されている', async ({ page }) => {
  // networkidle まで待機してから要素を確認（ログイン直後のリダイレクト完了を保証）
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
    // networkidle がタイムアウトしても続行（一部環境では永続ポーリングがある場合）
  });
  await page.waitForSelector('[data-testid="project-select"]', {
    timeout: 30000,
  });
});

/**
 * プロジェクト選択コンボボックスで指定プロジェクトを選択する
 * 5-3_issue_management.feature / 5-5_progress_check.feature で共通利用
 */
When(
  'プロジェクト選択コンボボックスでプロジェクト {string} を選択する',
  async ({ page }, projectName: string) => {
    const projectSelect = page.locator('[data-testid="project-select"]');
    await projectSelect.waitFor({ state: 'visible', timeout: 10000 });
    await projectSelect.click();
    await page.waitForFunction(
      () => {
        /* eslint-disable no-undef */
        const dropdowns = (document as Document).querySelectorAll('.ant-select-dropdown');
        return Array.from(dropdowns).some((d) => {
          const el = d as HTMLElement;
          return (
            !el.classList.contains('ant-select-dropdown-hidden') &&
            (window as Window & typeof globalThis).getComputedStyle(el).display !== 'none'
          );
          /* eslint-enable no-undef */
        });
      },
      { timeout: 10000 }
    );
    const visibleDropdown = page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
      .first();
    await visibleDropdown
      .locator(`.ant-select-item-option[title^="${projectName} "]`)
      .click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  }
);

/**
 * 実験記録タブを開く
 * 5-3_issue_management.feature / 5-5_progress_check.feature で共通利用
 */
When('実験記録タブを開く', async ({ page }) => {
  // Ant Design Tabs コンポーネントは .ant-tabs-tab セレクターを使用すること
  const recordTab = page.locator('.ant-tabs-tab').filter({ hasText: /実験記録/ }).first();
  await recordTab.waitFor({ state: 'visible', timeout: 10000 });
  await recordTab.click();
  await page.waitForTimeout(500);
});
