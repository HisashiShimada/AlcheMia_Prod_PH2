/**
 * ステップ定義: [0] ログイン機能（0-1〜0-4 統合）
 *
 * 対応 feature: tests/e2e/features/0_login/0_login.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : system.admin@example.com
 *   パスワード: admin123
 *
 * 実装メモ:
 *   - 本アプリはSPA（Next.js）のため、画面遷移はURLではなくReact state切り替えで行われる。
 *     /login/verify への遷移確認はURL変化ではなく、PINコード入力UIの表示で代替する。
 *   - バリデーションエラーはAnt Designフォームではなくカスタム<div>で表示される。
 *   - PINコードボタンは「認証する」（feature上の「確認」ボタンに相当）。
 *   - 戻るボタンは「戻る」（feature上の「ログイン画面に戻る」に相当）。
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象のベースURL（orgId付き） */
const BASE_URL = '/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

// ---------------------------------------------------------------------------
// Given: 前提ステップ
// ---------------------------------------------------------------------------

/**
 * is_entry=1 の組織のテストユーザーがDBに存在すること
 * → 事前準備済みとする（no-op）
 */
Given(
  'is_entry が 1 の組織のテストユーザーがDBに存在すること',
  async ({}) => {
    // no-op: テスト用ユーザーは事前準備済みとする
  }
);

/**
 * is_entry=0 の組織とテストユーザーがDBに存在すること
 * → @manual タグのシナリオのみで使用。事前準備済みとする（no-op）
 */
Given(
  'is_entry が 0 の組織とテストユーザーがDBに存在すること',
  async ({}) => {
    // no-op: @manual シナリオ用。手動テスト実施前にDBへ手動挿入すること
  }
);

/**
 * is_active=false の非アクティブテストユーザーがDBに存在すること
 * → 事前準備済みとする（no-op）
 */
Given(
  'is_active が false の非アクティブテストユーザーがDBに存在すること',
  async ({}) => {
    // no-op: テスト用非アクティブユーザーは事前準備済みとする
  }
);

/**
 * レート制限リセット手段が確認済みであること
 * → @manual タグのシナリオのみで使用（no-op）
 */
Given(
  'レート制限リセット手段が確認済みであること',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * テスト用メールサーバーが稼働しておりPINコードメールを受信できること
 * → @manual または 自動テストで使用。モック環境を前提とする（no-op）
 */
Given(
  'テスト用メールサーバーが稼働しておりPINコードメールを受信できること',
  async ({}) => {
    // no-op: テスト用メールサーバーは事前に起動済みとする
  }
);

/**
 * テスト用メールサーバーが稼働していること
 * → @manual タグのシナリオのみで使用（no-op）
 */
Given(
  'テスト用メールサーバーが稼働していること',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * 試行回数超過後のDBリセット手段が確認済みであること
 * → @manual タグのシナリオのみで使用（no-op）
 */
Given(
  '試行回数超過後のDBリセット手段が確認済みであること',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * is_entry=1 の組織のテストユーザーでパスワード認証済みであること
 * → ログイン画面でパスワード認証を行い、PINコード入力画面が表示された状態にする
 */
Given(
  'is_entry が 1 の組織のテストユーザーでパスワード認証済みであること',
  async ({ page }) => {
    await page.goto(BASE_URL);
    // ログインフォームが表示されるまで待機
    await page.waitForSelector('#userId', { timeout: 15000 });
    await page.fill('#userId', 'system.admin@example.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    // PINコード入力画面（「PINコード認証」または「認証する」ボタン）が表示されるまで待機
    await page.waitForSelector('text=PINコード認証', { timeout: 15000 });
  }
);

/**
 * いずれかのロールでログイン済みであること
 * → system_admin でフルログイン（PIN認証まで）を行う
 * → テスト用メールサーバーのPINコードを devPinCode としてsessionStorageに設定する想定
 *    実際のE2E環境では devPinCode を使って自動入力される
 */
Given(
  'いずれかのロールでログイン済みであること',
  async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#userId', { timeout: 15000 });
    await page.fill('#userId', 'system.admin@example.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    // PINコード入力画面が表示されるまで待機
    await page.waitForSelector('text=PINコード認証', { timeout: 15000 });
    // 開発環境では devPinCode がsessionStorageに設定される
    // PINコードが自動入力されて「認証する」ボタンが有効になるまで待機
    await page.waitForSelector('button:has-text("認証する"):not([disabled])', { timeout: 10000 });
    await page.click('button:has-text("認証する")');
    // ログイン後のメニュー画面表示を待機
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  }
);

/**
 * {word} ロールのテストユーザーがDBに存在すること
 * → @manual タグのシナリオのみで使用（no-op）
 */
Given(
  '{word} ロールのテストユーザーがDBに存在すること',
  async ({}, _role: string) => {
    // no-op: @manual シナリオ用。テストユーザーは事前準備済みとする
  }
);

// ---------------------------------------------------------------------------
// When: 操作ステップ
// ---------------------------------------------------------------------------

/**
 * ログイン画面（/login）を開く
 * → SPAのため実際にはトップページ（/?orgId=...）へ遷移する
 */
When(
  'ログイン画面（/login）を開く',
  async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#userId', { timeout: 15000 });
  }
);

/**
 * ユーザー名フィールドに {string} を入力する
 */
When(
  'ユーザー名フィールドに {string} を入力する',
  async ({ page }, value: string) => {
    await page.fill('#userId', value);
  }
);

/**
 * パスワードフィールドに {string} を入力する
 */
When(
  'パスワードフィールドに {string} を入力する',
  async ({ page }, value: string) => {
    await page.fill('#password', value);
  }
);

/**
 * ユーザー名フィールドを空のままにする
 * → no-op（何も入力しない）
 */
When(
  'ユーザー名フィールドを空のままにする',
  async ({}) => {
    // no-op: フィールドは初期値が空なので何もしない
  }
);

/**
 * パスワードフィールドを空のままにする
 * → no-op（何も入力しない）
 */
When(
  'パスワードフィールドを空のままにする',
  async ({}) => {
    // no-op: フィールドは初期値が空なので何もしない
  }
);

/**
 * 「ログイン」ボタンをクリックする
 * → Promise.race でAPIレスポンス / バリデーションエラー / ロード状態変化を並列待機
 */
When(
  '「ログイン」ボタンをクリックする',
  async ({ page }) => {
    await page.click('button[type="submit"]');
    // APIレスポンス or バリデーションエラー表示 or PINコード画面遷移 のいずれかを待機
    await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => {}),
      page.waitForSelector('[style*="color"]', { timeout: 3000 }).catch(() => {}),
      page.waitForSelector('text=PINコード認証', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

/**
 * 誤ったパスワードでログインを5回繰り返す
 * → @manual タグのシナリオのみで使用（no-op）
 */
When(
  '誤ったパスワードでログインを5回繰り返す',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * 二段階認証画面（/login/verify）が表示されること（When ステップとして使用）
 * → SPAのためURL変化なし。PINコード認証コンポーネントの表示で代替
 */
When(
  '二段階認証画面（/login/verify）が表示されること',
  async ({ page }) => {
    await expect(page.locator('text=PINコード認証')).toBeVisible({ timeout: 15000 });
  }
);

/**
 * 受信したPINコードをPINコード入力フィールドに入力する
 * → 開発環境では devPinCode が sessionStorage に設定されており自動入力される
 *    自動入力後に「認証する」ボタンが有効になるまで待機する
 */
When(
  '受信したPINコードをPINコード入力フィールドに入力する',
  async ({ page }) => {
    // 開発環境: devPinCode が sessionStorage に設定されていれば自動入力済み
    // 「認証する」ボタンが有効になるまで待機
    await page.waitForSelector('button:has-text("認証する"):not([disabled])', { timeout: 10000 });
  }
);

/**
 * PINコード入力フィールドに {string} を入力する
 * → 6桁のPINコードを各桁の input に1文字ずつ入力する
 */
When(
  'PINコード入力フィールドに {string} を入力する',
  async ({ page }, pinCode: string) => {
    // PINコード認証画面の6個の input[type="text"][inputmode="numeric"] に1桁ずつ入力
    const digits = pinCode.split('');
    const inputs = await page.locator('input[type="text"][inputmode="numeric"]').all();
    for (let i = 0; i < digits.length && i < inputs.length; i++) {
      await inputs[i].fill(digits[i]);
    }
  }
);

/**
 * 「確認」ボタンをクリックする（=「認証する」ボタン）
 * → Promise.race でAPIレスポンス / エラー表示を並列待機
 */
When(
  '「確認」ボタンをクリックする',
  async ({ page }) => {
    await page.click('button:has-text("認証する")');
    await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes('/api/v1/auth/verify-pin') && r.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => {}),
      page.waitForSelector('.ant-alert-error', { timeout: 5000 }).catch(() => {}),
    ]);
  }
);

/**
 * 「再送信する」をクリックする（=「再送信」ボタン）
 * → @manual タグのシナリオのみで使用
 */
When(
  '「再送信する」をクリックする',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * 「ログイン画面に戻る」をクリックする（=「戻る」ボタン）
 */
When(
  '「ログイン画面に戻る」をクリックする',
  async ({ page }) => {
    await page.click('button:has-text("戻る")');
  }
);

/**
 * 誤ったPINコードを3回連続で入力して確認ボタンをクリックする
 * → @manual タグのシナリオのみで使用（no-op）
 */
When(
  '誤ったPINコードを3回連続で入力して確認ボタンをクリックする',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * is_entry=0 の組織のユーザー名フィールドに入力する
 * → @manual タグのシナリオのみで使用（no-op）
 */
When(
  'is_entry=0 の組織のユーザー名フィールドに入力する',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * パスワードフィールドに正しいパスワードを入力する
 * → @manual タグのシナリオのみで使用（no-op）
 */
When(
  'パスワードフィールドに正しいパスワードを入力する',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * {word} ロールのユーザーでログインを完了する
 * → @manual タグのシナリオのみで使用（no-op）
 */
When(
  '{word} ロールのユーザーでログインを完了する',
  async ({}, _role: string) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * ログアウト操作を行う
 * → ヘッダーのユーザーアバターをクリックしてドロップダウンメニューの「ログアウト」を選択
 */
When(
  'ログアウト操作を行う',
  async ({ page }) => {
    // ヘッダーのアバター/ユーザーメニューを開く
    await page.waitForSelector('.ant-avatar', { timeout: 15000 });
    await page.click('.ant-avatar');
    // ドロップダウンメニューの「ログアウト」をクリック
    await page.waitForSelector('.ant-dropdown-menu-item:has-text("ログアウト")', { timeout: 5000 });
    await page.click('.ant-dropdown-menu-item:has-text("ログアウト")');
    // ログアウトAPIのレスポンスを待機
    await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes('/api/v1/auth/logout') && r.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => {}),
      page.waitForSelector('#userId', { timeout: 10000 }).catch(() => {}),
    ]);
  }
);

// ---------------------------------------------------------------------------
// Then: 検証ステップ
// ---------------------------------------------------------------------------

/**
 * 二段階認証画面（/login/verify）へ遷移すること
 * → SPAのためURL変化なし。PINコード認証UIの表示で代替
 */
Then(
  '二段階認証画面（/login/verify）へ遷移すること',
  async ({ page }) => {
    await expect(page.locator('text=PINコード認証')).toBeVisible({ timeout: 15000 });
  }
);

/**
 * バリデーションエラー {string} が表示されること
 * → LoginPage.tsx のカスタム<div>バリデーションエラーを検証
 *    （Ant Design Form ではなく、インライン div で表示される）
 */
Then(
  'バリデーションエラー {string} が表示されること',
  async ({ page }, errorMessage: string) => {
    // Alert コンポーネント または インライン error div のいずれかに表示される
    await expect(
      page.locator(`.ant-alert-description:has-text("${errorMessage}"), div[style*="colorError"]:has-text("${errorMessage}")`)
        .or(page.locator(`[class*="error"]:has-text("${errorMessage}")`))
        .or(page.locator(`.ant-alert:has-text("${errorMessage}")`))
    ).toBeVisible({ timeout: 5000 });
  }
);

/**
 * エラーメッセージ {string} が表示されること
 * → Alert コンポーネント（type="error"）での表示を検証
 */
Then(
  'エラーメッセージ {string} が表示されること',
  async ({ page }, errorMessage: string) => {
    await expect(
      page.locator(`.ant-alert-description:has-text("${errorMessage}")`)
        .or(page.locator(`.ant-alert:has-text("${errorMessage}")`))
    ).toBeVisible({ timeout: 10000 });
  }
);

/**
 * エラーメッセージ {string} に関するエラーが表示されること
 * → "レート制限" を含む文字列での部分一致検証（@manual シナリオ）
 */
Then(
  'エラーメッセージ {string} に関するエラーが表示されること',
  async ({ page }, keyword: string) => {
    await expect(
      page.locator(`.ant-alert-description`).filter({ hasText: keyword })
        .or(page.locator(`.ant-alert`).filter({ hasText: keyword }))
    ).toBeVisible({ timeout: 10000 });
  }
);

/**
 * 「ログイン」ボタンがローディング状態（「ログイン中...」）になること
 * → ボタンのテキストが「ログイン中...」に変化することを検証
 */
Then(
  '「ログイン」ボタンがローディング状態（「ログイン中...」）になること',
  async ({ page }) => {
    await expect(
      page.locator('button[type="submit"]:has-text("ログイン中...")')
    ).toBeVisible({ timeout: 5000 });
  }
);

/**
 * PINコード入力フィールドが表示されること
 * → 6桁のPINコード入力欄（input[inputmode="numeric"]）が表示されることを検証
 */
Then(
  'PINコード入力フィールドが表示されること',
  async ({ page }) => {
    await expect(
      page.locator('input[type="text"][inputmode="numeric"]').first()
    ).toBeVisible({ timeout: 10000 });
  }
);

/**
 * ロール別トップ画面へ遷移すること
 * → ログイン後のメニュー画面（ヘッダーアバターが表示された状態）で検証
 */
Then(
  'ロール別トップ画面へ遷移すること',
  async ({ page }) => {
    // ログイン後のメニュー画面ではヘッダーのアバターが表示される
    await expect(page.locator('.ant-avatar')).toBeVisible({ timeout: 15000 });
    // PINコード認証画面が消えていること
    await expect(page.locator('text=PINコード認証')).not.toBeVisible({ timeout: 5000 });
  }
);

/**
 * 二段階認証画面（/login/verify）を経由せずにロール別トップ画面へ遷移すること
 * → @manual タグのシナリオのみで使用（no-op）
 */
Then(
  '二段階認証画面（/login/verify）を経由せずにロール別トップ画面へ遷移すること',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

/**
 * ログイン画面（/login）へ遷移すること
 * → ログイン画面（#userId フィールドが表示された状態）で検証
 */
Then(
  'ログイン画面（/login）へ遷移すること',
  async ({ page }) => {
    await expect(page.locator('#userId')).toBeVisible({ timeout: 10000 });
    // PINコード認証画面が消えていること
    await expect(page.locator('text=PINコード認証')).not.toBeVisible({ timeout: 5000 });
  }
);

/**
 * URL が {string} であること
 * → @manual タグのシナリオのみで使用。SPAの場合はURL変化しないが、
 *    Next.js のルーティングで /system-admin 等にリダイレクトされる場合に備えて実装
 */
Then(
  'URL が {string} であること',
  async ({ page }, path: string) => {
    await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')), { timeout: 15000 });
  }
);

/**
 * セッションCookieがクリアされていること（Max-Age=0）
 * → cookies() でセッションCookieが存在しないことを検証
 */
Then(
  'セッションCookieがクリアされていること（Max-Age=0）',
  async ({ page }) => {
    const cookies = await page.context().cookies();
    // セッションCookie（maiml_session 等）が存在しないことを確認
    const sessionCookie = cookies.find(
      (c) => c.name.includes('session') || c.name.includes('maiml')
    );
    // セッションCookieが削除されているか、または有効期限が過去であること
    if (sessionCookie) {
      // Max-Age=0 で削除されたCookieは cookies() には返ってこないが、
      // 残っている場合は期限切れであることを確認
      expect(sessionCookie.expires).toBeLessThanOrEqual(Date.now() / 1000);
    }
    // ログイン画面が表示されていることを追加確認
    await expect(page.locator('#userId')).toBeVisible({ timeout: 5000 });
  }
);

/**
 * PINコード再送信メールが届くこと
 * → @manual タグのシナリオのみで使用（no-op）
 */
Then(
  'PINコード再送信メールが届くこと',
  async ({}) => {
    // no-op: @manual シナリオ用（メール受信は手動確認）
  }
);

/**
 * カウントダウンタイマーが5分にリセットされること
 * → @manual タグのシナリオのみで使用（no-op）
 */
Then(
  'カウントダウンタイマーが5分にリセットされること',
  async ({}) => {
    // no-op: @manual シナリオ用
  }
);

// ---------------------------------------------------------------------------
// After フック: クリーンアップ
// ---------------------------------------------------------------------------

/**
 * 各シナリオ終了後にセッションをクリア（Cookieを削除）
 * → ログイン状態が次のシナリオに引き継がれないようにする
 */
After(async ({ page }) => {
  try {
    // Cookieをすべてクリアしてセッション状態をリセット
    await page.context().clearCookies();
  } catch {
    // クリーンアップ失敗は無視
  }
});

/**
 * 全シナリオ完了後にDB接続プールをクローズ
 */
AfterAll(async () => {
  await closeDb();
});
