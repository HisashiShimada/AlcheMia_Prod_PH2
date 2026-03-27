/**
 * プロバイダー機能の共通ステップ定義
 *
 * 複数の feature ファイルで共有するステップを一元管理する。
 * 各ステップファイルに重複定義すると playwright-bdd が
 * "Multiple definitions matched scenario step" エラーを発生させるため、
 * このファイルで一度だけ定義する。
 */

import { createBdd } from 'playwright-bdd';

const { Given } = createBdd();

// ---------------------------------------------------------------------------
// 背景（no-op）
// ---------------------------------------------------------------------------

/**
 * 前提: プロバイダーのユーザIDがDB（organization_userテーブル）に存在する
 * → テスト用ユーザーは事前にDBに存在することを前提とするため何もしない
 *
 * 参照 feature:
 *   - e2e/features/provider/1-1_corporation_create.feature
 *   - e2e/features/provider/1-2_corporation_edit.feature
 */
Given(
  'プロバイダーのユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _userId: string) => {
    // no-op: テスト用ユーザーは事前準備済みとする
  }
);
