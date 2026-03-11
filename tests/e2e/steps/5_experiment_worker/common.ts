/**
 * 実験作業者機能の共通ステップ定義
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
