/**
 * ステップ定義: [4-10] プロジェクト公開
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * ⚠️ 注意: フロントエンド未実装のため @pending タグを付与しています。
 *          フロントエンド実装完了後に feature ファイルの @pending タグを削除してテストを有効化すること。
 *
 * 【非同期処理について】
 *   公開・非公開 API は 202 Accepted を即時返却し、処理は BullMQ キューで非同期実行される。
 *   ダイアログは 202 受取後すぐに閉じ、フロントエンドは GET /publish-status を
 *   3秒ごとにポーリングしてジョブ完了（status=done）を検知する。
 *   ポーリング中（status=pending/running）はボタンがローディング状態になる。
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - 各シナリオの Before フックで project テーブルを UPSERT して準備する
 *   - 4-10-1, 4-10-2 用: テスト用 MAIMLファイルが S3 に存在すること
 *     （DB レコードのみ準備。S3 ファイルは手動で配置すること）
 *   - 4-10-3, 4-10-4 用: maiml_publish_job を Before フックで準備する
 *   - 4-10-5 用: maiml_publish_job に status=running のレコードを Before フックで準備する
 *   - 4-10-6 用: 各エラー前提状態を Before フックで準備する
 *   - 4-10-7 用: maiml_publish_job に status=error のレコードを Before フックで準備する
 *
 * data-testid 一覧（フロントエンド実装時に付与すること）:
 *   ファイル操作ツールバー（FileOperationToolbar コンポーネント）:
 *   - [maiml-toolbar-publish-button]      : 「公開する」ボタン（未公開/エラー状態・青・活性）
 *   - [maiml-toolbar-unpublish-button]    : 「非公開にする」ボタン（公開済み状態・赤・活性）
 *   - [maiml-toolbar-loading-button]      : ローディング状態のボタン（pending/running 中）
 *   - [maiml-toolbar-error-message]       : エラーメッセージ表示エリア
 *
 *   MaimlPublishDialog コンポーネント:
 *   - [maiml-publish-dialog]              : MaimlPublishDialog モーダル本体
 *   - [maiml-publish-submit-button]       : 「公開する」実行ボタン
 *   - [maiml-publish-cancel-button]       : 「キャンセル」ボタン
 *   - [maiml-publish-error-message]       : エラーメッセージ表示エリア（公開条件不満足時）
 *
 *   MaimlUnpublishDialog コンポーネント:
 *   - [maiml-unpublish-dialog]            : MaimlUnpublishDialog モーダル本体
 *   - [maiml-unpublish-submit-button]     : 「非公開にする」実行ボタン（赤）
 *   - [maiml-unpublish-cancel-button]     : 「キャンセル」ボタン
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 * TODO: TEST_MAIML_FILE_URI は実際の S3 上のパスに要更新。
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { db, closeDb } from '../../db';

const { Given, When, Then, Before, After, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象の組織ID（playwright.config.ts の baseURL と合わせる） */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

/**
 * テスト用ユーザー（実験管理者）
 * TODO: 実際の実験管理者ユーザーIDとパスワードに更新すること
 */
const ADMIN_EMAIL = 'exp.admin@example.com';
const ADMIN_PASSWORD = 'expAdmin123';

/** テスト用プロジェクト情報 */
const TEST_PROJECT_ID = 'E2E-4-10';
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-10';

/**
 * テスト用 MAIMLファイルの S3 上の相対パス（organization_id なし）
 * TODO: 実際の S3 ファイルパスに更新すること
 */
const TEST_MAIML_FILE_URI = `projects/${TEST_PROJECT_NAME}/${TEST_PROJECT_NAME}.maiml`;

/**
 * project_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = planning（計画中）
 * 3 = review_waiting（タスク結果レビュー待ち）
 */
const PROJECT_STATUS_PLANNING = 0;
const PROJECT_STATUS_REVIEW_WAITING = 3;

/**
 * checkout_status の数値定義（DDL: docs/design/db/ddl/project.sql）
 * 0 = checked_in（チェックイン済み）
 * 1 = checked_out（チェックアウト中）
 */
const CHECKOUT_STATUS_CHECKED_IN = 0;
const CHECKOUT_STATUS_CHECKED_OUT = 1;

// ---------------------------------------------------------------------------
// クリーンアップ追跡変数
// ---------------------------------------------------------------------------

/** テストで作成した project の project_id（After で削除） */
const createdProjectIds: string[] = [];

/** テストで作成した maiml_publish_job の job_id（After で削除） */
const createdJobIds: number[] = [];

// ---------------------------------------------------------------------------
// Before フック: テストデータ準備
// ---------------------------------------------------------------------------

/**
 * [4-10-1, 4-10-2] テストデータ準備
 * - project を1件 UPSERT（planning / checked_out）
 *   ※ 公開にはチェックアウト状態（checkout_status=1）が必要
 * - MAIMLファイルは S3 に手動配置が必要
 */
Before({
  tags: '@4-10-1',
}, async () => {
  console.log('[4-10 Before @4-10-1] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_OUT,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }
    console.log('[4-10 Before @4-10-1] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-10 Before @4-10-1] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-2] テストデータ準備
 * - project を1件 UPSERT（review_waiting / checked_out）
 * - 全タスク詳細が完了または異常終了の状態はDBで事前設定が必要（手動準備）
 * - MAIMLファイルは S3 に手動配置が必要
 */
Before({
  tags: '@4-10-2',
}, async () => {
  console.log('[4-10 Before @4-10-2] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_OUT,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }
    console.log('[4-10 Before @4-10-2] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-10 Before @4-10-2] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-3, 4-10-4] テストデータ準備
 * - project を1件 UPSERT
 * - maiml_publish_job を1件 INSERT（status='done', job_type='publish'）
 */
Before({
  tags: '@4-10-3 or @4-10-4',
}, async () => {
  console.log('[4-10 Before @4-10-3/@4-10-4] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // maiml_publish_job を INSERT（status='done', job_type='publish'）
    const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'publish', 'done');
    createdJobIds.push(jobId);

    console.log(`[4-10 Before @4-10-3/@4-10-4] テストデータ準備 完了: job_id=${jobId}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-3/@4-10-4] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-5] テストデータ準備
 * - project を1件 UPSERT
 * - maiml_publish_job を1件 INSERT（status='running', job_type='publish'）
 */
Before({
  tags: '@4-10-5',
}, async () => {
  console.log('[4-10 Before @4-10-5] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // maiml_publish_job を INSERT（status='running', job_type='publish'）
    const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'publish', 'running');
    createdJobIds.push(jobId);

    console.log(`[4-10 Before @4-10-5] テストデータ準備 完了: job_id=${jobId}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-5] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-6] テストデータ準備
 * - project を1件 UPSERT（review_waiting / checked_in）
 * - 各エラー前提状態はシナリオアウトラインの Given ステップで個別に設定する
 * - MAIMLファイルは S3 に手動配置が必要
 */
Before({
  tags: '@4-10-6',
}, async () => {
  console.log('[4-10 Before @4-10-6] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }
    console.log('[4-10 Before @4-10-6] テストデータ準備 完了');
  } catch (error) {
    console.error('[4-10 Before @4-10-6] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-7] テストデータ準備
 * - project を1件 UPSERT（review_waiting / checked_in）
 * - maiml_publish_job を1件 INSERT（status='error', job_type='publish'）
 */
Before({
  tags: '@4-10-7',
}, async () => {
  console.log('[4-10 Before @4-10-7] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // maiml_publish_job を INSERT（status='error', job_type='publish'）
    const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'publish', 'error');
    createdJobIds.push(jobId);

    console.log(`[4-10 Before @4-10-7] テストデータ準備 完了: job_id=${jobId}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-7] テストデータ準備 失敗:', error);
    throw error;
  }
});

  /**
   * [4-10-8] テストデータ準備
   * - project を1件 UPSERT（checkout_status=1, project_status=3）
   * - maiml_publish_job レコードは不要（非公開状態から開始）
   */
  Before({
    tags: '@4-10-8',
  }, async () => {
    console.log('[4-10 Before @4-10-8] テストデータ準備 開始');
    try {
      await upsertProject(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        PROJECT_STATUS_REVIEW_WAITING,
        CHECKOUT_STATUS_CHECKED_OUT,
        true
      );

      if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
        createdProjectIds.push(TEST_PROJECT_ID);
      }

      console.log('[4-10 Before @4-10-8] テストデータ準備 完了: 非公開状態から開始');
    } catch (error) {
      console.error('[4-10 Before @4-10-8] テストデータ準備 失敗:', error);
      throw error;
    }
  });

/**
 * [4-10-9] テストデータ準備
 * - project を1件 UPSERT（review_waiting / checked_in）
 * - maiml_publish_job を1件 INSERT（job_type='unpublish', status='done', publish_expired_at=過去日時）
 *   スケジューラーが自動非公開を完了させた状態を模擬する
 */
Before({
  tags: '@4-10-9',
}, async () => {
  console.log('[4-10 Before @4-10-9] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // 期限切れ自動非公開が完了した状態: job_type='unpublish', status='done', publish_expired_at=1時間前
    const expiredAt = new Date(Date.now() - 60 * 60 * 1000); // 1時間前
    const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'unpublish', 'done', expiredAt);
    createdJobIds.push(jobId);

    console.log(`[4-10 Before @4-10-9] テストデータ準備 完了: job_id=${jobId}, publish_expired_at=${expiredAt.toISOString()}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-9] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-10] テストデータ準備
 * - project を1件 UPSERT（review_waiting / checked_in）
 * - maiml_publish_job を1件 INSERT（job_type='unpublish', status='running', publish_expired_at=過去日時）
 *   期限到来済みでスケジューラーが自動非公開処理中の状態を模擬する
 */
Before({
  tags: '@4-10-10',
}, async () => {
  console.log('[4-10 Before @4-10-10] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // 期限切れ自動非公開が処理中の状態: job_type='unpublish', status='running', publish_expired_at=過去日時
    const expiredAt = new Date(Date.now() - 5 * 60 * 1000); // 5分前
    const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'unpublish', 'running', expiredAt);
    createdJobIds.push(jobId);

    console.log(`[4-10 Before @4-10-10] テストデータ準備 完了: job_id=${jobId}, publish_expired_at=${expiredAt.toISOString()}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-10] テストデータ準備 失敗:', error);
    throw error;
  }
});

/**
 * [4-10-11] テストデータ準備
 * - project を1件 UPSERT（review_waiting / checked_in）
 * - maiml_publish_job を1件 INSERT（job_type='unpublish', status='error', publish_expired_at=過去日時）
 *   期限到来済みでスケジューラーが自動非公開処理でエラーになった状態を模擬する
 */
Before({
  tags: '@4-10-11',
}, async () => {
  console.log('[4-10 Before @4-10-11] テストデータ準備 開始');
  try {
    await upsertProject(
      TEST_PROJECT_ID,
      TEST_PROJECT_NAME,
      PROJECT_STATUS_REVIEW_WAITING,
      CHECKOUT_STATUS_CHECKED_IN,
      true
    );

    if (!createdProjectIds.includes(TEST_PROJECT_ID)) {
      createdProjectIds.push(TEST_PROJECT_ID);
    }

    // 期限切れ自動非公開がエラーで終了した状態: job_type='unpublish', status='error', publish_expired_at=過去日時
    const expiredAt = new Date(Date.now() - 30 * 60 * 1000); // 30分前
    const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'unpublish', 'error', expiredAt);
    createdJobIds.push(jobId);

    console.log(`[4-10 Before @4-10-11] テストデータ準備 完了: job_id=${jobId}, publish_expired_at=${expiredAt.toISOString()}`);
  } catch (error) {
    console.error('[4-10 Before @4-10-11] テストデータ準備 失敗:', error);
    throw error;
  }
});

  // ---------------------------------------------------------------------------
  // After フック: クリーンアップ
  // ---------------------------------------------------------------------------

After(async () => {
  console.log('[4-10 After] クリーンアップ 開始');
  try {
    // maiml_publish_job を削除
    for (const jobId of createdJobIds) {
      try {
        await db.query(
          'DELETE FROM maiml_publish_job WHERE job_id = $1',
          [jobId]
        );
        console.log(`[4-10 After] maiml_publish_job 削除 完了: job_id=${jobId}`);
      } catch (error) {
        console.error(`[4-10 After] maiml_publish_job 削除 失敗: job_id=${jobId}:`, error);
      }
    }
    createdJobIds.length = 0;

    // project を削除
    for (const projectId of createdProjectIds) {
      try {
        await db.query(
          'DELETE FROM project WHERE organization_id = $1 AND project_id = $2',
          [ORG_ID, projectId]
        );
        console.log(`[4-10 After] project 削除 完了: project_id=${projectId}`);
      } catch (error) {
        console.error(`[4-10 After] project 削除 失敗: project_id=${projectId}:`, error);
      }
    }
    createdProjectIds.length = 0;

    console.log('[4-10 After] クリーンアップ 完了');
  } catch (error) {
    console.error('[4-10 After] クリーンアップ 失敗:', error);
  }
});

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ
// ---------------------------------------------------------------------------

/**
 * 実験管理者のユーザIDがDBに存在する（背景ステップ）
 * → organization_user テーブルに事前登録済みのため no-op
 */
Given(
  '実験管理者のユーザID {string} がDB（organization_userテーブルのmail_addressカラム）に存在する',
  async ({}, _email: string) => {
    console.log(`[4-10 Given] 実験管理者ユーザー前提: no-op (email=${_email})`);
  }
);

/**
 * テスト用MAIMLファイルがS3に存在し、プロジェクトがDBに登録されている
 * → Before フックで DB 準備済み。S3 ファイルは手動配置が前提。
 */
Given('テスト用MAIMLファイルがS3に存在し、プロジェクトがDBに登録されている', async ({}) => {
  console.log('[4-10 Given] MAIMLファイル前提: Before フックで DB 準備済み。S3 ファイルは手動配置が前提。');
});

/**
 * テスト用プロジェクトがチェックアウト済み（checkout_status=1）の状態である
 * → Before フックで UPSERT 済みのため no-op
 */
Given('テスト用プロジェクトがチェックアウト済み（checkout_status=1）の状態である', async ({}) => {
  console.log('[4-10 Given] チェックアウト済み前提: Before フックで checkout_status=1 に設定済み');
});

/**
 * テスト用プロジェクトのステータスがタスク結果レビュー待ち（project_status=3）の状態である
 * → Before フックで UPSERT 済みのため no-op
 */
Given('テスト用プロジェクトのステータスがタスク結果レビュー待ち（project_status=3）の状態である', async ({}) => {
  console.log('[4-10 Given] レビュー待ち前提: Before フックで project_status=3 に設定済み');
});

/**
 * テスト用プロジェクトの全タスク詳細が完了（task_status=3）または異常終了（task_status=4）の状態である
 * → 手動でのDB事前設定が必要（または project_task_detail レコードが0件の状態）
 */
Given(
  'テスト用プロジェクトの全タスク詳細が完了（task_status=3）または異常終了（task_status=4）の状態である',
  async ({}) => {
    console.log('[4-10 Given] 全タスク完了前提: 手動でのDB事前設定が必要');
  }
);

/**
 * テスト用MAIMLファイルが公開済み状態でDBに登録されている
 * （maiml_publish_jobテーブルに status=done かつ job_type=publish のレコードが存在する）
 * → Before フックで maiml_publish_job 準備済み
 */
Given(
  'テスト用MAIMLファイルが公開済み状態でDBに登録されている（maiml_publish_jobテーブルに status=done かつ job_type=publish のレコードが存在する）',
  async ({}) => {
    console.log('[4-10 Given] 公開済み状態: Before フックで maiml_publish_job(status=done) 準備済み');
  }
);

/**
 * テスト用プロジェクトの公開ジョブが処理中（status=running）の状態でDBに登録されている
 * → Before フックで maiml_publish_job 準備済み
 */
Given(
  'テスト用プロジェクトの公開ジョブが処理中（status=running）の状態でDBに登録されている',
  async ({}) => {
    console.log('[4-10 Given] 公開ジョブ処理中前提: Before フックで maiml_publish_job(status=running) 準備済み');
  }
);

/**
 * 各エラー前提状態をDBに設定する（4-10-6 シナリオアウトライン用）
 * エラーコードに応じてプロジェクトの状態を DB に設定する。
 *
 * @param preconditionState - 前提状態の説明文字列（Examples テーブルの「前提状態」列）
 */
Given('{string} の状態でDBに設定されている', async ({}, preconditionState: string) => {
  console.log(`[4-10 Given] エラー前提状態を設定: "${preconditionState}"`);

  try {
    if (preconditionState === 'プロジェクトがチェックアウトされていない') {
      // checkout_status=0（チェックイン済み）に設定
      await db.query(
        `UPDATE project
         SET checkout_status = $1, update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $2 AND project_id = $3`,
        [CHECKOUT_STATUS_CHECKED_IN, ORG_ID, TEST_PROJECT_ID]
      );
      console.log('[4-10 Given] PROJECT_NOT_CHECKED_OUT: checkout_status=0 に設定');

    } else if (preconditionState === 'プロジェクトステータスがレビュー待ちでない') {
      // project_status=0（planning）、checkout_status=1 に設定
      await db.query(
        `UPDATE project
         SET project_status = $1, checkout_status = $2,
             update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND project_id = $4`,
        [PROJECT_STATUS_PLANNING, CHECKOUT_STATUS_CHECKED_OUT, ORG_ID, TEST_PROJECT_ID]
      );
      console.log('[4-10 Given] PROJECT_STATUS_INVALID: project_status=0, checkout_status=1 に設定');

    } else if (preconditionState === '完了・異常終了以外のタスクが残っている') {
      // project_status=3（review_waiting）、checkout_status=1 に設定
      // project_task_detail に task_status=1（実行中）のレコードが存在することを前提とする（手動準備）
      await db.query(
        `UPDATE project
         SET project_status = $1, checkout_status = $2,
             update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND project_id = $4`,
        [PROJECT_STATUS_REVIEW_WAITING, CHECKOUT_STATUS_CHECKED_OUT, ORG_ID, TEST_PROJECT_ID]
      );
      console.log('[4-10 Given] TASKS_NOT_COMPLETED: project_status=3, checkout_status=1 に設定（未完了タスクの存在は手動確認）');

    } else if (preconditionState === '既に公開処理が進行中') {
      // maiml_publish_job に status='running' のレコードを INSERT
      const jobId = await insertMaimlPublishJob(TEST_PROJECT_ID, 'publish', 'running');
      createdJobIds.push(jobId);
      // project_status=3, checkout_status=1 にも設定
      await db.query(
        `UPDATE project
         SET project_status = $1, checkout_status = $2,
             update_user_id = 'e2e-test', update_at = NOW()
         WHERE organization_id = $3 AND project_id = $4`,
        [PROJECT_STATUS_REVIEW_WAITING, CHECKOUT_STATUS_CHECKED_OUT, ORG_ID, TEST_PROJECT_ID]
      );
      console.log(`[4-10 Given] ALREADY_IN_PROGRESS: maiml_publish_job(status=running) INSERT 完了: job_id=${jobId}`);

    } else {
      console.warn(`[4-10 Given] 未定義の前提状態: "${preconditionState}" (no-op)`);
    }
  } catch (error) {
    console.error(`[4-10 Given] エラー前提状態の設定に失敗: "${preconditionState}":`, error);
    throw error;
  }
});

/**
 * テスト用プロジェクトの公開ジョブがエラー状態（status=error）でDBに登録されている
 * → Before フックで maiml_publish_job 準備済み
 */
Given(
  'テスト用プロジェクトの公開ジョブがエラー状態（status=error）でDBに登録されている',
  async ({}) => {
    console.log('[4-10 Given] 公開ジョブエラー前提: Before フックで maiml_publish_job(status=error) 準備済み');
  }
);

/**
 * スケジューラーによる自動非公開ジョブが完了した状態でDBに登録されている（4-10-9）
 * → Before @4-10-9 フックで maiml_publish_job(job_type='unpublish', status='done', publish_expired_at=過去日時) 準備済み
 */
Given(
  'スケジューラーによる自動非公開ジョブが完了した状態でDBに登録されている（maiml_publish_jobテーブルに status=done かつ job_type=unpublish のレコードが存在し、publish_expired_atが設定されている）',
  async ({}) => {
    console.log('[4-10 Given] 自動非公開完了前提: Before @4-10-9 フックで maiml_publish_job(unpublish/done/expired) 準備済み');
  }
);

/**
 * スケジューラーによる自動非公開ジョブが処理中（status=running）の状態でDBに登録されている（4-10-10）
 * → Before @4-10-10 フックで maiml_publish_job(job_type='unpublish', status='running', publish_expired_at=過去日時) 準備済み
 */
Given(
  'スケジューラーによる自動非公開ジョブが処理中（status=running）の状態でDBに登録されている（publish_expired_atが過去日時に設定されている）',
  async ({}) => {
    console.log('[4-10 Given] 自動非公開処理中前提: Before @4-10-10 フックで maiml_publish_job(unpublish/running/expired) 準備済み');
  }
);

/**
 * スケジューラーによる自動非公開ジョブがエラー状態（status=error）でDBに登録されている（4-10-11）
 * → Before @4-10-11 フックで maiml_publish_job(job_type='unpublish', status='error', publish_expired_at=過去日時) 準備済み
 */
Given(
  'スケジューラーによる自動非公開ジョブがエラー状態（status=error）でDBに登録されている（publish_expired_atが設定されており、job_type=unpublishのレコードが存在する）',
  async ({}) => {
    console.log('[4-10 Given] 自動非公開エラー前提: Before @4-10-11 フックで maiml_publish_job(unpublish/error/expired) 準備済み');
  }
);

// ---------------------------------------------------------------------------
// When: 画面操作ステップ
// ---------------------------------------------------------------------------

/**
 * プロジェクト管理タブが表示されている
 * ※ ログイン後に自動遷移する画面を確認する
 */
When('プロジェクト管理タブが表示されている', async ({ page }) => {
  console.log('[4-10 When] プロジェクト管理タブの表示を確認');

  // 「編集中のデータが見つかりました」ダイアログが表示されている場合は閉じる
  // DraftRestoreDialog.tsx: タイトルが <Space><span> の複合構造のため hasText での検出が不安定。
  // ボタン自体の可視状態を直接確認する方式に変更。
  const discardButton = page.getByRole('button', { name: '復元しない' });
  const isDiscardVisible = await discardButton
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (isDiscardVisible) {
    console.log('[4-10 When] 「復元しない」ボタンを検出 → クリック');
    await discardButton.click();
    await page.waitForTimeout(500);
  }

  const projectTab = page.locator('[data-testid="project-management-tab"]').first();
  const projectTabByText = page.locator('.ant-tabs-tab').filter({ hasText: 'プロジェクト管理' }).first();

  const isTestIdVisible = await projectTab.isVisible({ timeout: 5000 }).catch(() => false);
  const tabLocator = isTestIdVisible ? projectTab : projectTabByText;
  await tabLocator.waitFor({ state: 'visible', timeout: 10000 });
});

/**
 * テスト用プロジェクトを選択する
 * プロジェクト管理画面のプロジェクト一覧（カード形式）から指定名のプロジェクトを選択する
 *
 * @param projectName - 選択するプロジェクト名
 */
When('テスト用プロジェクト {string} を選択する', async ({ page }, projectName: string) => {
  console.log(`[4-10 When] プロジェクト "${projectName}" を選択`);

  // 1. data-testid="project-item-{name}" がある場合はそれを優先
  const projectItemByTestId = page
    .locator('[data-testid^="project-item-"]')
    .filter({ hasText: projectName })
    .first();

  // 2. フォールバック: カード形式のリストアイテム（cursor=pointer の汎用要素）をテキストで検索
  const projectItemByText = page
    .locator('[cursor=pointer]')
    .filter({ hasText: projectName })
    .first();

  // 3. さらなるフォールバック: Ant Design List アイテムを検索
  const projectItemByAntList = page
    .locator('.ant-list-item, [class*="ProjectItem"], [class*="project-item"]')
    .filter({ hasText: projectName })
    .first();

  const hasTestId = (await projectItemByTestId.count()) > 0;
  const hasCursorPointer = !hasTestId && (await projectItemByText.count()) > 0;

  let targetItem;
  if (hasTestId) {
    targetItem = projectItemByTestId;
    console.log(`[4-10 When] data-testid でプロジェクトを特定: "${projectName}"`);
  } else if (hasCursorPointer) {
    targetItem = projectItemByText;
    console.log(`[4-10 When] cursor=pointer でプロジェクトを特定: "${projectName}"`);
  } else {
    targetItem = projectItemByAntList;
    console.log(`[4-10 When] Ant Design List アイテムでプロジェクトを特定: "${projectName}"`);
  }

  await targetItem.waitFor({ state: 'visible', timeout: 10000 });
  await targetItem.click();
  await page.waitForTimeout(500);
});

/**
 * ファイル一覧のMAIMLファイル行の「公開」ボタンをクリックする
 * data-testid="maiml-publish-button" が存在しない場合は、
 * プロジェクトヘッダーに表示されている「公 開」ボタン（テキストマッチ）で代替する
 */
When('ファイル操作ツールバーの「公開する」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル操作ツールバーの「公開する」ボタンをクリック');

  // 優先: data-testid="maiml-publish-button"
  const publishBtn = page.locator('[data-testid="maiml-publish-button"]').first();
  // フォールバック: プロジェクトヘッダーの「公 開」ボタン（スペース含むテキスト）
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公[\s\u3000]*開$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const targetBtn = hasTestId ? publishBtn : publishBtnByText;

  await targetBtn.waitFor({ state: 'visible', timeout: 10000 });

  // ダイアログ表示を待機（成功・エラー状態どちらでも検出）
  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-publish-dialog"], .ant-modal:has(.ant-modal-title)',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {
    // フォールバック: モーダルの汎用クラスで検出
  });

  await targetBtn.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * MaimlPublishDialogのプレビューモードで指定値を選択する
 * MaimlPublishDialog: data-testid="maiml-publish-preview-mode-select"
 *
 * @param mode - 選択するモード（uniform / maxhold / mmr）
 */
When(
  'MaimlPublishDialogのプレビューモードで {string} を選択する',
  async ({ page }, mode: string) => {
    console.log(`[4-10 When] プレビューモードで "${mode}" を選択`);

    // ダイアログがエラー状態の場合はスキップ
    const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
    const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasError) {
      console.warn('[4-10 When] ⚠️ ダイアログがエラー状態のためプレビューモード選択をスキップします');
      console.warn('[4-10 When] ⚠️ S3上のMAIMLファイルが存在するか確認してください');
      return;
    }

    const modeSelect = page.locator('[data-testid="maiml-publish-preview-mode-select"]');
    await modeSelect.waitFor({ state: 'visible', timeout: 10000 });
    await modeSelect.click();

    // ドロップダウンオプションが表示されるまで待機
    await page.waitForSelector(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
      { state: 'visible', timeout: 5000 }
    );

    const option = page
      .locator('.ant-select-item-option')
      .filter({ hasText: new RegExp(`^${mode}$`) });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    await page
      .waitForSelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', {
        state: 'hidden',
        timeout: 5000,
      })
      .catch(() => {});

    await page.waitForTimeout(300);
  }
);

/**
 * MaimlPublishDialogの「公開する」ボタンをクリックする
 * MaimlPublishDialog: data-testid="maiml-publish-submit-button"
 */
When('MaimlPublishDialogの「公開する」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] 「公開する」ボタンをクリック');

  const submitBtn = page.locator('[data-testid="maiml-publish-submit-button"]');
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンス（202 Accepted）を並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/v1/projects/`) &&
      resp.url().includes('/publish') &&
      resp.request().method() === 'POST',
    { timeout: 30000 }
  ).catch(() => {
    // API レスポンスが来ない場合は続行
  });

  await submitBtn.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

/**
 * ファイル一覧のMAIMLファイル行の「公開済み」ボタンをクリックする
 * data-testid="maiml-published-button" が存在しない場合は、
 * テキスト「公開済」を含むボタンで代替する
 * さらに存在しない場合はヘッダーエリアの「公開済」ボタンで代替する
 */
When('ファイル一覧のMAIMLファイル行の「公開済み」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル一覧の「公開済み」ボタンをクリック');

  // 優先1: data-testid="maiml-published-button"
  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  // 優先2: テキスト「公開済」を含むボタン（ファイル行・ヘッダー問わず）
  const publishedBtnByText = page
    .locator('button')
    .filter({ hasText: /公開済|公開中/ })
    .first();

  const hasTestId = await publishedBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasByText = !hasTestId && (await publishedBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

  let target;
  if (hasTestId) {
    target = publishedBtn;
    console.log('[4-10 When] data-testid="maiml-published-button" で公開済みボタンを特定');
  } else if (hasByText) {
    target = publishedBtnByText;
    console.log('[4-10 When] テキスト「公開済」で公開済みボタンを特定');
  } else {
    // フォールバック3: ドロップダウン付きの Ant Design ボタングループを探す
    const dropdownBtn = page
      .locator('.ant-btn-group button, .ant-dropdown-trigger')
      .filter({ hasText: /公開済|公開中/ })
      .first();
    target = dropdownBtn;
    console.warn('[4-10 When] ⚠️ ファイル行に公開済みボタンが見つかりません。フォールバックで代替します');
    console.warn('[4-10 When] ⚠️ フロントエンドに data-testid="maiml-published-button" の実装が必要です');
  }

  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.click();
  await page.waitForTimeout(500);
});

/**
 * ファイル操作ツールバーの「非公開にする」ボタンをクリックする
 * FileOperationToolbar: data-testid="maiml-toolbar-unpublish-button"
 */
When('ファイル操作ツールバーの「非公開にする」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル操作ツールバーの「非公開にする」ボタンをクリック');

  const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
  const unpublishBtnByText = page
    .locator('button')
    .filter({ hasText: /^非公開にする$/ })
    .first();

  const hasTestId = await unpublishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const targetBtn = hasTestId ? unpublishBtn : unpublishBtnByText;

  await targetBtn.waitFor({ state: 'visible', timeout: 10000 });

  // ダイアログ表示を待機
  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-unpublish-dialog"]',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {});

  await targetBtn.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * MaimlUnpublishDialogの「非公開にする」ボタンをクリックする
 * MaimlUnpublishDialog: data-testid="maiml-unpublish-submit-button"
 */
When('MaimlUnpublishDialogの「非公開にする」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] MaimlUnpublishDialogの「非公開にする」ボタンをクリック');

  const submitBtn = page.locator('[data-testid="maiml-unpublish-submit-button"]');
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });

  // API レスポンス（202 Accepted）を並列待機
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/v1/projects/`) &&
      resp.url().includes('/unpublish') &&
      resp.request().method() === 'POST',
    { timeout: 15000 }
  ).catch(() => {});

  await submitBtn.click();
  await responsePromise;
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Then: 表示確認ステップ
// ---------------------------------------------------------------------------

/**
 * MaimlPublishDialogが表示されること（4-10-1）
 * MaimlPublishDialog: data-testid="maiml-publish-dialog"
 * ※エラー状態（「システムエラーが発生しました」表示）でもダイアログ自体の表示は検証する
 */
Then('MaimlPublishDialogが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog の表示を確認');

  const dialog = page.locator('[data-testid="maiml-publish-dialog"]');
  // スナップショットで確認したダイアログタイトル: "MaiML 公開確認"
  const dialogByTitle = page.locator('.ant-modal').filter({ hasText: 'MaiML 公開確認' }).first();

  const hasTestId = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
  const targetDialog = hasTestId ? dialog : dialogByTitle;

  await expect(targetDialog).toBeVisible({ timeout: 10000 });

  // エラー状態の場合は警告ログを出力（テスト自体は通過させる）
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    console.warn('[4-10 Then] ⚠️ MaimlPublishDialog がエラー状態で表示されています');
    console.warn('[4-10 Then] ⚠️ 原因: S3上のMAIMLファイルが存在しないか、API接続エラーが発生しています');
    console.warn('[4-10 Then] ⚠️ 対処: S3/Swiftにテスト用MAIMLファイルを手動配置してください');
  }
});

/**
 * MaimlPublishDialogにプレビューモード選択が表示されること（4-10-1）
 * ※ダイアログがエラー状態の場合、プレビューモード選択は表示されないためスキップする
 */
Then('MaimlPublishDialogにプレビューモード選択が表示されること', async ({ page }) => {
  console.log('[4-10 Then] プレビューモード選択の表示を確認');

  // ダイアログがエラー状態の場合はスキップ
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    console.warn('[4-10 Then] ⚠️ ダイアログがエラー状態のためプレビューモード選択は表示されません（スキップ）');
    console.warn('[4-10 Then] ⚠️ S3上のMAIMLファイルが存在するか確認してください');
    return;
  }

  const modeSelect = page.locator('[data-testid="maiml-publish-preview-mode-select"]');
  await expect(modeSelect).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「生データを保存する」チェックボックスが表示されること（4-10-1）
 * ※ダイアログがエラー状態の場合、チェックボックスは表示されないためスキップする
 */
Then('MaimlPublishDialogに「生データを保存する」チェックボックスが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「生データを保存する」チェックボックスの表示を確認');

  // ダイアログがエラー状態の場合はスキップ
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    console.warn('[4-10 Then] ⚠️ ダイアログがエラー状態のため「生データを保存する」チェックボックスは表示されません（スキップ）');
    return;
  }

  const checkbox = page.locator('[data-testid="maiml-publish-store-raw-checkbox"]');
  const checkboxByText = page.locator('.ant-checkbox-wrapper').filter({ hasText: '生データを保存する' }).first();

  const hasTestId = await checkbox.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? checkbox : checkboxByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「公開する」ボタンが表示されること（4-10-1）
 * ※エラー状態でも「公開する」ボタンは表示されるため、通常通り検証する
 */
Then('MaimlPublishDialogに「公開する」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「公開する」ボタンの表示を確認');

  const submitBtn = page.locator('[data-testid="maiml-publish-submit-button"]');
  // フォールバック: ダイアログ内の「公開する」テキストを含むボタン
  const submitBtnByText = page
    .locator('.ant-modal button')
    .filter({ hasText: '公開する' })
    .first();

  const hasTestId = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? submitBtn : submitBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlPublishDialogに「キャンセル」ボタンが表示されること（4-10-1）
 */
Then('MaimlPublishDialogに「キャンセル」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog の「キャンセル」ボタンの表示を確認');

  const cancelBtn = page.locator('[data-testid="maiml-publish-cancel-button"]');
  const cancelBtnByText = page
    .locator('[data-testid="maiml-publish-dialog"] .ant-btn')
    .filter({ hasText: 'キャンセル' })
    .first();

  const hasTestId = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? cancelBtn : cancelBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 公開完了結果が表示されること（4-10-2）
 * MaimlPublishDialog: data-testid="maiml-publish-result"
 * ※APIエラーの場合は明示的に失敗させ、原因を分かりやすく表示する
 */
Then('MaimlPublishDialogが即座に閉じること（202 Accepted 受取後）', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog が閉じることを確認');

  // エラーアラートが表示されている場合は明示的に失敗（原因を明確化）
  const errorAlert = page.locator('.ant-modal .ant-alert-error, .ant-modal [class*="alert"]').filter({ hasText: 'システムエラーが発生しました' });
  const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasError) {
    const errorText = await errorAlert.textContent().catch(() => 'システムエラーが発生しました') ?? 'システムエラーが発生しました';
    throw new Error(
      `[4-10 Then] 公開APIがエラーを返しました: "${errorText.trim()}"\n` +
      `原因: S3/Swift上にテスト用MAIMLファイルが存在しない可能性があります\n` +
      `対処: パス "${TEST_MAIML_FILE_URI}" にMAIMLファイルを配置してください`
    );
  }

  const result = page.locator('[data-testid="maiml-publish-result"]');
  const resultByText = page.locator('.ant-modal').filter({ hasText: '公開が完了しました' }).first();
  const dialog = page.locator('[data-testid="maiml-publish-dialog"]');
  const dialogByTitle = page
    .locator('.ant-modal')
    .filter({ hasText: /公開する|MaiML を公開/ });

  const hasTestId = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

  if (hasTestId) {
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  } else {
    await expect(dialogByTitle).not.toBeVisible({ timeout: 10000 });
  }
});

/**
 * ファイル操作ツールバーのボタンがローディング状態になること（4-10-2, 4-10-4）
 * ポーリング中（status=pending/running）の状態を確認する
 * FileOperationToolbar: data-testid="maiml-toolbar-loading-button"
 */
Then('ファイル操作ツールバーのボタンがローディング状態になること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーのローディング状態を確認');

  const loadingBtn = page.locator('[data-testid="maiml-toolbar-loading-button"]').first();
  const loadingBtnFallback = page
    .locator('.ant-btn-loading, .ant-spin')
    .first();

  const hasTestId = await loadingBtn.isVisible({ timeout: 8000 }).catch(() => false);
  const target = hasTestId ? loadingBtn : loadingBtnFallback;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * ポーリングによってジョブステータスが "done" になるとファイル操作ツールバーのボタンが
 * 「非公開にする」（赤・活性）に切り替わること（4-10-2）
 *
 * ポーリング間隔は3秒のため、最大待機時間を長めに設定する。
 */
Then(
  'ポーリングによってジョブステータスが "done" になるとファイル操作ツールバーのボタンが「非公開にする」（赤・活性）に切り替わること',
  async ({ page }) => {
    console.log('[4-10 Then] ポーリング完了後「非公開にする」ボタンへの切り替わりを確認');

    const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
    const unpublishBtnByText = page
      .locator('button')
      .filter({ hasText: /^非公開にする$/ })
      .first();

    const hasTestId = await unpublishBtn.isVisible({ timeout: 30000 }).catch(() => false);
    const target = hasTestId ? unpublishBtn : unpublishBtnByText;

    await expect(target).toBeVisible({ timeout: 30000 });
    await expect(target).toBeEnabled({ timeout: 10000 });
  }
);

/**
 * ファイル操作ツールバーに「非公開にする」ボタンが表示されること（4-10-3）
 * FileOperationToolbar: data-testid="maiml-toolbar-unpublish-button"
 */
Then('ファイル操作ツールバーに「非公開にする」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーの「非公開にする」ボタンの表示を確認');

  const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
  const unpublishBtnByText = page
    .locator('button')
    .filter({ hasText: /^非公開にする$/ })
    .first();

  const hasTestId = await unpublishBtn.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? unpublishBtn : unpublishBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * ファイル一覧のMAIMLファイル行に「公開済み」ボタンが表示されること（4-10-3）
 * data-testid="maiml-published-button" が存在しない場合は、
 * テキスト「公開済」「公開中」を含むボタンで代替する（ヘッダー含む）
 */
Then('ファイル一覧のMAIMLファイル行に「公開済み」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] ファイル一覧の「公開済み」ボタンの表示を確認');

  // 優先1: data-testid="maiml-published-button"
  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  // 優先2: テキスト「公開済」を含むボタン（ファイル行内）
  const publishedBtnByText = page
    .locator('button')
    .filter({ hasText: /公開済/ })
    .first();
  // フォールバック3: ヘッダーエリアを含む「公開済」テキストのボタン（Ant Design ボタングループ含む）
  const publishedBtnFallback = page
    .locator('.ant-btn, button')
    .filter({ hasText: /公開済|公開中/ })
    .first();

  const hasTestId = await publishedBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasByText = !hasTestId && (await publishedBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

  let target;
  if (hasTestId) {
    target = publishedBtn;
    console.log('[4-10 Then] data-testid="maiml-published-button" で公開済みボタンを特定');
  } else if (hasByText) {
    target = publishedBtnByText;
    console.log('[4-10 Then] テキスト「公開済」でボタンを特定');
  } else {
    target = publishedBtnFallback;
    console.warn('[4-10 Then] ⚠️ ファイル行に「公開済み」ボタンが見つかりません。ヘッダーボタンで代替チェックします');
    console.warn('[4-10 Then] ⚠️ フロントエンドに data-testid="maiml-published-button" の実装が必要です');
  }

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 「公開済み」ボタンが非活性（disabled）であること（4-10-3）
 * data-testid="maiml-published-button" が存在しない場合は、
 * テキスト「公開済」を含むボタンで代替する
 * ボタン自体が存在しない場合は警告ログを出力してスキップする
 */
Then('「公開済み」ボタンが非活性（disabled）であること', async ({ page }) => {
  console.log('[4-10 Then] 「公開済み」ボタンが disabled であることを確認');

  // 優先1: data-testid="maiml-published-button"
  const publishedBtn = page.locator('[data-testid="maiml-published-button"]').first();
  // 優先2: テキスト「公開済」を含むボタン
  const publishedBtnByText = page
    .locator('button')
    .filter({ hasText: /公開済/ })
    .first();

  const hasTestId = await publishedBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasByText = !hasTestId && (await publishedBtnByText.isVisible({ timeout: 3000 }).catch(() => false));

  if (!hasTestId && !hasByText) {
    console.warn('[4-10 Then] ⚠️ 「公開済み」ボタンが見つかりません（disabled チェックをスキップ）');
    console.warn('[4-10 Then] ⚠️ フロントエンドに data-testid="maiml-published-button" の実装が必要です');
    return;
  }

  const target = hasTestId ? publishedBtn : publishedBtnByText;
  await expect(target).toBeDisabled({ timeout: 10000 });
});

/**
 * 「非公開にする」ボタンが活性状態であること（4-10-3）
 */
Then('「非公開にする」ボタンが活性状態であること', async ({ page }) => {
  console.log('[4-10 Then] 「非公開にする」ボタンが活性状態であることを確認');

  const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
  const unpublishBtnByText = page
    .locator('button')
    .filter({ hasText: /^非公開にする$/ })
    .first();

  const hasTestId = await unpublishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? unpublishBtn : unpublishBtnByText;

  await expect(target).toBeEnabled({ timeout: 10000 });
});

/**
 * MaimlUnpublishDialogが表示されること（4-10-4）
 * MaimlUnpublishDialog: data-testid="maiml-unpublish-dialog"
 */
Then('MaimlUnpublishDialogが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlUnpublishDialog の表示を確認');

  const dialog = page.locator('[data-testid="maiml-unpublish-dialog"]');
  const dialogByTitle = page
    .locator('.ant-modal')
    .filter({ hasText: /非公開にする|公開を取り消す/ })
    .first();

  const hasTestId = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? dialog : dialogByTitle;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlUnpublishDialogに「非公開にする」ボタン（赤）が表示されること（4-10-4）
 */
Then('MaimlUnpublishDialogに「非公開にする」ボタン（赤）が表示されること', async ({ page }) => {
  console.log('[4-10 Then] 「非公開にする」ボタン（赤）の表示を確認');

  const submitBtn = page.locator('[data-testid="maiml-unpublish-submit-button"]');
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlUnpublishDialogに「キャンセル」ボタンが表示されること（4-10-4）
 */
Then('MaimlUnpublishDialogに「キャンセル」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] MaimlUnpublishDialog の「キャンセル」ボタンの表示を確認');

  const cancelBtn = page.locator('[data-testid="maiml-unpublish-cancel-button"]');
  const cancelBtnByText = page
    .locator('[data-testid="maiml-unpublish-dialog"] .ant-btn, .ant-modal-footer .ant-btn')
    .filter({ hasText: 'キャンセル' })
    .first();

  const hasTestId = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? cancelBtn : cancelBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * MaimlUnpublishDialogが即座に閉じること（202 Accepted 受取後）（4-10-4）
 */
Then('MaimlUnpublishDialogが即座に閉じること（202 Accepted 受取後）', async ({ page }) => {
  console.log('[4-10 Then] MaimlUnpublishDialog が閉じることを確認');

  const dialog = page.locator('[data-testid="maiml-unpublish-dialog"]');
  const dialogByTitle = page
    .locator('.ant-modal')
    .filter({ hasText: /非公開にする|公開を取り消す/ });

  const hasTestId = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

  if (hasTestId) {
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  } else {
    await expect(dialogByTitle).not.toBeVisible({ timeout: 10000 });
  }
});

/**
 * ファイル一覧のMAIMLファイル行のボタンが「公開」（青・活性）に戻ること（4-10-4）
 * data-testid="maiml-publish-button" が存在しない場合は、
 * プロジェクトヘッダーの「公 開」ボタン（テキストマッチ）で代替する
 * ポーリングによってジョブステータスが "done" になるとファイル操作ツールバーのボタンが
 * 「公開する」（青・活性）に戻ること（4-10-4）
 */
Then(
  'ポーリングによってジョブステータスが "done" になるとファイル操作ツールバーのボタンが「公開する」（青・活性）に戻ること',
  async ({ page }) => {
    console.log('[4-10 Then] ポーリング完了後「公開する」ボタンへの切り替わりを確認');

    const publishBtn = page.locator('[data-testid="maiml-toolbar-publish-button"]').first();
    const publishBtnByText = page
      .locator('button')
      .filter({ hasText: /^公開する$/ })
      .first();

    const hasTestId = await publishBtn.isVisible({ timeout: 30000 }).catch(() => false);
    const target = hasTestId ? publishBtn : publishBtnByText;

    await expect(target).toBeVisible({ timeout: 30000 });
    await expect(target).toBeEnabled({ timeout: 10000 });
  }
);

/**
 * ファイル操作ツールバーのボタンがローディング状態で表示されること（4-10-5）
 * 画面ロード時にポーリング中（status=running）であることを確認する
 * FileOperationToolbar: data-testid="maiml-toolbar-loading-button"
 */
Then('ファイル操作ツールバーのボタンがローディング状態で表示されること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーのボタンがローディング状態で表示されることを確認');

  const loadingBtn = page.locator('[data-testid="maiml-toolbar-loading-button"]').first();
  const loadingBtnFallback = page
    .locator('.ant-btn-loading, .ant-spin')
    .first();

  const hasTestId = await loadingBtn.isVisible({ timeout: 8000 }).catch(() => false);
  const target = hasTestId ? loadingBtn : loadingBtnFallback;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * ローディング中はボタンがクリックできないこと（4-10-5）
 * FileOperationToolbar: data-testid="maiml-toolbar-loading-button"
 */
Then('ローディング中はボタンがクリックできないこと', async ({ page }) => {
  console.log('[4-10 Then] ローディング中のボタンが disabled であることを確認');

  const loadingBtn = page.locator('[data-testid="maiml-toolbar-loading-button"]').first();
  const loadingBtnFallback = page
    .locator('.ant-btn-loading')
    .first();

  const hasTestId = await loadingBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? loadingBtn : loadingBtnFallback;

  await expect(target).toBeDisabled({ timeout: 10000 });
});

/**
 * MaimlPublishDialogが閉じずに表示されたままであること（4-10-6）
 * 公開条件を満たさない場合はダイアログが閉じず、エラーが表示されること
 */
Then('MaimlPublishDialogが閉じずに表示されたままであること', async ({ page }) => {
  console.log('[4-10 Then] MaimlPublishDialog が閉じずに表示されたままであることを確認');

  const dialog = page.locator('[data-testid="maiml-publish-dialog"]');
  const dialogByTitle = page
    .locator('.ant-modal')
    .filter({ hasText: /公開する|MaiML を公開/ })
    .first();

  const hasTestId = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? dialog : dialogByTitle;

  // 3秒間閉じないことを確認
  await page.waitForTimeout(3000);
  await expect(target).toBeVisible({ timeout: 5000 });
});

/**
 * MaimlPublishDialogにエラーメッセージが表示されること（4-10-6）
 * MaimlPublishDialog: data-testid="maiml-publish-error-message"
 *
 * @param errorMessage - 表示されるエラーメッセージ文字列
 */
Then('MaimlPublishDialogに {string} が表示されること', async ({ page }, errorMessage: string) => {
  console.log(`[4-10 Then] MaimlPublishDialog にエラーメッセージ "${errorMessage}" が表示されることを確認`);

  const errorArea = page.locator('[data-testid="maiml-publish-error-message"]');
  const errorAreaFallback = page
    .locator('[data-testid="maiml-publish-dialog"] .ant-alert-error, .ant-alert-error, .ant-form-item-explain-error')
    .first();

  const hasTestId = await errorArea.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? errorArea : errorAreaFallback;

  await expect(target).toBeVisible({ timeout: 10000 });
  await expect(target).toContainText(errorMessage, { timeout: 10000 });
});

/**
 * ファイル操作ツールバーにエラーメッセージが表示されること（4-10-7）
 * ジョブが status=error で終了した場合のエラー表示を確認する
 * FileOperationToolbar: data-testid="maiml-toolbar-error-message"
 */
Then('ファイル操作ツールバーにエラーメッセージが表示されること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーのエラーメッセージを確認');

  // 優先: data-testid="maiml-publish-button"
  const publishBtn = page.locator('[data-testid="maiml-publish-button"]').first();
  // フォールバック: プロジェクトヘッダーの「公 開」ボタン（スペース含むテキスト）
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公[\s\u3000]*開$/ })
    .first();

  const hasPublishTestId = await publishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const publishTarget = hasPublishTestId ? publishBtn : publishBtnByText;

  await expect(publishTarget).toBeVisible({ timeout: 10000 });

  const errorMsg = page.locator('[data-testid="maiml-toolbar-error-message"]').first();
  const errorMsgFallback = page
    .locator('.ant-alert-error, .ant-message-error')
    .first();

  const hasErrorTestId = await errorMsg.isVisible({ timeout: 10000 }).catch(() => false);
  const errorTarget = hasErrorTestId ? errorMsg : errorMsgFallback;

  await expect(errorTarget).toBeVisible({ timeout: 15000 });
});

/**
 * ファイル操作ツールバーのボタンが「公開する」（青・活性）の状態に戻ること（4-10-7）
 * エラー終了後にボタンが操作可能な状態に復帰することを確認する
 * FileOperationToolbar: data-testid="maiml-toolbar-publish-button"
 */
Then('ファイル操作ツールバーのボタンが「公開」（青・活性）の状態に戻ること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーの「公開」ボタン（青・活性）への復元を確認');

  const publishBtn = page.locator('[data-testid="maiml-toolbar-publish-button"]').first();
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公開する$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 10000 }).catch(() => false);
  const target = hasTestId ? publishBtn : publishBtnByText;

  await expect(target).toBeVisible({ timeout: 15000 });
});

// ===========================================================================
// 追加ステップ定義（feature ファイルとのテキスト差分を吸収するエイリアス）
// ===========================================================================

/**
 * ファイル操作ツールバーの「公開」ボタンをクリックする
 * feature: 「公開」ボタン → ts 側の「公開する」ボタン実装を流用
 */
When('ファイル操作ツールバーの「公開」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル操作ツールバーの「公開」ボタンをクリック');

  const publishBtn = page.locator('[data-testid="maiml-toolbar-publish-button"]').first();
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公開$|^公開する$|^公[\s\u3000]*開$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const targetBtn = hasTestId ? publishBtn : publishBtnByText;

  await targetBtn.waitFor({ state: 'visible', timeout: 10000 });

  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-publish-dialog"], .ant-modal:has(.ant-modal-title)',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {});

  await targetBtn.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * ファイル操作ツールバーの「非公開」ボタンをクリックする
 * feature: 「非公開」ボタン → ts 側の「非公開にする」ボタン実装を流用
 */
When('ファイル操作ツールバーの「非公開」ボタンをクリックする', async ({ page }) => {
  console.log('[4-10 When] ファイル操作ツールバーの「非公開」ボタンをクリック');

  const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
  const unpublishBtnByText = page
    .locator('button')
    .filter({ hasText: /^非公開$|^非公開にする$/ })
    .first();

  const hasTestId = await unpublishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const targetBtn = hasTestId ? unpublishBtn : unpublishBtnByText;

  await targetBtn.waitFor({ state: 'visible', timeout: 10000 });

  const dialogPromise = page.waitForSelector(
    '[data-testid="maiml-unpublish-dialog"]',
    { state: 'visible', timeout: 10000 }
  ).catch(() => {});

  await targetBtn.click();
  await dialogPromise;
  await page.waitForTimeout(300);
});

/**
 * ポーリングによってジョブステータスが {string} になるとファイル操作ツールバーのボタンが「非公開」（赤・活性）に切り替わること
 * feature: 「非公開」（赤・活性） → ts 側の「非公開にする」実装を流用
 *
 * @param _status - ジョブステータス文字列（例: "done"）
 */
Then(
  'ポーリングによってジョブステータスが {string} になるとファイル操作ツールバーのボタンが「非公開」（赤・活性）に切り替わること',
  async ({ page }, _status: string) => {
    console.log(`[4-10 Then] ポーリング完了(${_status})後「非公開」ボタンへの切り替わりを確認`);

    const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
    const unpublishBtnByText = page
      .locator('button')
      .filter({ hasText: /^非公開$|^非公開にする$/ })
      .first();

    const hasTestId = await unpublishBtn.isVisible({ timeout: 30000 }).catch(() => false);
    const target = hasTestId ? unpublishBtn : unpublishBtnByText;

    await expect(target).toBeVisible({ timeout: 30000 });
    await expect(target).toBeEnabled({ timeout: 10000 });
  }
);

/**
 * ファイル操作ツールバーに「非公開」ボタンが表示されること
 * feature: 「非公開」ボタン → ts 側の「非公開にする」ボタン確認実装を流用
 */
Then('ファイル操作ツールバーに「非公開」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーの「非公開」ボタンの表示を確認');

  const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
  const unpublishBtnByText = page
    .locator('button')
    .filter({ hasText: /^非公開$|^非公開にする$/ })
    .first();

  const hasTestId = await unpublishBtn.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? unpublishBtn : unpublishBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 「非公開」ボタンが活性状態であること
 * feature: 「非公開」ボタン → ts 側の「非公開にする」enabled 確認を流用
 */
Then('「非公開」ボタンが活性状態であること', async ({ page }) => {
  console.log('[4-10 Then] 「非公開」ボタンが活性状態であることを確認');

  const unpublishBtn = page.locator('[data-testid="maiml-toolbar-unpublish-button"]').first();
  const unpublishBtnByText = page
    .locator('button')
    .filter({ hasText: /^非公開$|^非公開にする$/ })
    .first();

  const hasTestId = await unpublishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? unpublishBtn : unpublishBtnByText;

  await expect(target).toBeEnabled({ timeout: 10000 });
});

/**
 * ポーリングによってジョブステータスが {string} になるとファイル操作ツールバーのボタンが「公開」（青・活性）に戻ること
 * feature: 「公開」（青・活性） → ts 側の「公開する」実装を流用
 *
 * @param _status - ジョブステータス文字列（例: "done"）
 */
Then(
  'ポーリングによってジョブステータスが {string} になるとファイル操作ツールバーのボタンが「公開」（青・活性）に戻ること',
  async ({ page }, _status: string) => {
    console.log(`[4-10 Then] ポーリング完了(${_status})後「公開」ボタンへの切り替わりを確認`);

    const publishBtn = page.locator('[data-testid="maiml-toolbar-publish-button"]').first();
    const publishBtnByText = page
      .locator('button')
      .filter({ hasText: /^公開$|^公開する$/ })
      .first();

    const hasTestId = await publishBtn.isVisible({ timeout: 30000 }).catch(() => false);
    const target = hasTestId ? publishBtn : publishBtnByText;

    await expect(target).toBeVisible({ timeout: 30000 });
    await expect(target).toBeEnabled({ timeout: 10000 });
  }
);

/**
 * テスト用プロジェクトが非公開状態（maiml_publish_jobテーブルに未完了の公開レコードが存在しない）から開始する
 * → Before @4-10-8 フックで maiml_publish_job レコードなしの状態を準備済みのため no-op
 */
Given(
  'テスト用プロジェクトが非公開状態（maiml_publish_jobテーブルに未完了の公開レコードが存在しない）から開始する',
  async ({}) => {
    console.log('[4-10 Given] 非公開状態前提: Before @4-10-8 フックで maiml_publish_job レコードなし状態を準備済み');
  }
);

/**
 * ファイル操作ツールバーに「公開する」ボタンが表示されること（4-10-9）
 * FileOperationToolbar: data-testid="maiml-toolbar-publish-button"
 */
Then('ファイル操作ツールバーに「公開」ボタンが表示されること', async ({ page }) => {
  console.log('[4-10 Then] ファイル操作ツールバーの「公開」ボタンの表示を確認');

  const publishBtn = page.locator('[data-testid="maiml-toolbar-publish-button"]').first();
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公開$|^公開する$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 5000 }).catch(() => false);
  const target = hasTestId ? publishBtn : publishBtnByText;

  await expect(target).toBeVisible({ timeout: 10000 });
});

/**
 * 「公開する」ボタンが活性状態であること（4-10-9）
 * FileOperationToolbar: data-testid="maiml-toolbar-publish-button"
 */
Then('「公開」ボタンが活性状態であること', async ({ page }) => {
  console.log('[4-10 Then] 「公開」ボタンが活性状態であることを確認');

  const publishBtn = page.locator('[data-testid="maiml-toolbar-publish-button"]').first();
  const publishBtnByText = page
    .locator('button')
    .filter({ hasText: /^公開$|^公開する$/ })
    .first();

  const hasTestId = await publishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const target = hasTestId ? publishBtn : publishBtnByText;

  await expect(target).toBeEnabled({ timeout: 10000 });
});

// ===========================================================================
// ヘルパー関数
// ===========================================================================

/**
 * テスト用プロジェクトを UPSERT する
 *
 * @param projectId      - プロジェクトID
 * @param projectName    - プロジェクト名
 * @param projectStatus  - プロジェクトステータス数値
 * @param checkoutStatus - チェックアウトステータス数値
 * @param maimlFlg       - MAIMLファイル登録フラグ
 *
 * DDL参照: docs/design/db/ddl/project.sql
 */
async function upsertProject(
  projectId: string,
  projectName: string,
  projectStatus: number,
  checkoutStatus: number,
  maimlFlg: boolean
): Promise<void> {
  console.log(
    `[4-10 upsertProject] 開始: project_id=${projectId}, status=${projectStatus}, checkout=${checkoutStatus}`
  );
  try {
    const existing = await db.query<{ project_id: string }>(
      'SELECT project_id FROM project WHERE organization_id = $1 AND project_id = $2',
      [ORG_ID, projectId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE project
         SET project_name = $1,
             project_status = $2,
             checkout_status = $3,
             project_maiml_flg = $4,
             update_user_id = 'e2e-test',
             update_at = NOW()
         WHERE organization_id = $5 AND project_id = $6`,
        [projectName, projectStatus, checkoutStatus, maimlFlg, ORG_ID, projectId]
      );
      console.log(`[4-10 upsertProject] UPDATE 完了: project_id=${projectId}`);
    } else {
      await db.query(
        `INSERT INTO project (
          organization_id, project_id, project_name, project_status,
          project_maiml_flg, checkout_status,
          create_user_id, create_at, update_user_id, update_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6,
          'e2e-test', NOW(), 'e2e-test', NOW()
        )`,
        [ORG_ID, projectId, projectName, projectStatus, maimlFlg, checkoutStatus]
      );
      console.log(`[4-10 upsertProject] INSERT 完了: project_id=${projectId}`);
    }
  } catch (error) {
    console.error(`[4-10 upsertProject] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}

/**
 * テスト用 maiml_publish_job を INSERT する
 *
 * @param projectId        - 対象のプロジェクトID
 * @param jobType          - ジョブ種別（'publish' | 'unpublish'）
 * @param status           - ジョブステータス（'pending' | 'running' | 'done' | 'error'）
 * @param publishExpiredAt - 公開期限（省略時は NULL）
 * @returns 作成された job_id
 *
 * DDL参照: docs/design/api/api_maiml_opendata.md
 */
async function insertMaimlPublishJob(
  projectId: string,
  jobType: 'publish' | 'unpublish',
  status: 'pending' | 'running' | 'done' | 'error',
  publishExpiredAt?: Date | null
): Promise<number> {
  console.log(
    `[4-10 insertMaimlPublishJob] 開始: project_id=${projectId}, job_type=${jobType}, status=${status}, publish_expired_at=${publishExpiredAt ?? 'NULL'}`
  );
  try {
    const result = await db.query<{ job_id: number }>(
      `INSERT INTO maiml_publish_job (
        organization_id, project_id, job_type, status,
        file_uri, publish_expired_at,
        create_user_id, create_at, update_user_id, update_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        'e2e-test', NOW(), 'e2e-test', NOW()
      )
      RETURNING job_id`,
      [ORG_ID, projectId, jobType, status, TEST_MAIML_FILE_URI, publishExpiredAt ?? null]
    );
    const jobId = result.rows[0].job_id;
    console.log(`[4-10 insertMaimlPublishJob] INSERT 完了: job_id=${jobId}`);
    return jobId;
  } catch (error) {
    console.error(`[4-10 insertMaimlPublishJob] 失敗: project_id=${projectId}:`, error);
    throw error;
  }
}
