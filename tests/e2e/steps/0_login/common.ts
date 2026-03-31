/**
 * ログイン機能の共通ステップ定義
 *
 * 複数シナリオで共有する背景ステップを一元管理する。
 * playwright-bdd の "Multiple definitions matched" エラーを防ぐため
 * このファイルで一度だけ定義する。
 *
 * 対応 feature: tests/e2e/features/0_login/0_login.feature
 */

import { createBdd } from 'playwright-bdd';

const { Given } = createBdd();

// ---------------------------------------------------------------------------
// 背景（no-op）
// ---------------------------------------------------------------------------

/**
 * 前提: ログイン用テストユーザーがDB（organization_userテーブル）に存在する
 * → テスト用ユーザーは事前にDBに存在することを前提とするため何もしない
 */
Given(
  'ログイン用テストユーザーがDB（organization_userテーブル）に存在する',
  async ({}) => {
    // no-op: テスト用ユーザーは事前準備済みとする
  }
);
