# タスク計画書: 4-10 期限到来の非公開自動実行シナリオ追加

## メタデータ
- **作成日時**: 2026-04-01 11:51
- **タスクID**: 4-10-auto-unpublish-scenarios
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の 4-10「プロジェクト公開」グループに、
「期限到来の非公開自動実行」に関するシナリオ3件を追加する。

スケジューラーによる非公開処理（`trigger_type=schedule`）の完了・進行中・エラーを
DBに直接 INSERT して状態を模倣し、フロントエンドの表示挙動を Playwright 自動テストで確認する。

## 目的と期待される成果
- [ ] スケジュールジョブによる自動非公開後の画面表示が正しいことを検証できる
- [ ] シナリオ一覧ドキュメント（4_experiment_admin.md）にシナリオ3件が追加されている
- [ ] featureファイルにシナリオ3件が追加されている（@pending タグ付き）
- [ ] stepsファイルに Before フック3件・ヘルパー関数変更が追加されている

## 実装ステップ

### Phase 1: タスク計画書の作成
- [x] `docs/20260401_1151_4-10非公開自動実行シナリオ追加/PLAN.md` を作成

### Phase 2: シナリオ一覧ドキュメントの更新
- [ ] `tests/e2e/test-scenarios/4_experiment_admin.md` を更新
  - スコープ内テーブルの 4-10 行のシナリオ数を 8件→11件、合計を 165件→168件に修正
  - 4-10 シナリオ詳細テーブルに 4-10-9, 4-10-10, 4-10-11 の3行を追加
  - 4-10 の「注意事項」に自動非公開シナリオの注記を追加

### Phase 3: featureファイルの更新
- [ ] `tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature` を更新
  - 機能説明の末尾に 4-10-9〜4-10-11 の説明を追加
  - @4-10-9 シナリオを追加（`trigger_type=schedule` / `status=done`）
  - @4-10-10 シナリオを追加（`trigger_type=schedule` / `status=running`）
  - @4-10-11 シナリオを追加（`trigger_type=schedule` / `status=error`）

### Phase 4: stepsファイルの更新
- [ ] `tests/e2e/steps/4_experiment_admin/4-10_maiml_publish.ts` を更新
  - `insertMaimlPublishJob` ヘルパー関数に `triggerType` パラメータ（デフォルト `'manual'`）を追加
  - Before フック `@4-10-9` を追加
  - Before フック `@4-10-10` を追加
  - Before フック `@4-10-11` を追加

## 変更ファイル
1. `docs/20260401_1151_4-10非公開自動実行シナリオ追加/PLAN.md` - 本計画書（新規）
2. `tests/e2e/test-scenarios/4_experiment_admin.md` - シナリオ一覧に3件追加
3. `tests/e2e/features/4_experiment_admin/4-10_maiml_publish.feature` - featureシナリオ3件追加
4. `tests/e2e/steps/4_experiment_admin/4-10_maiml_publish.ts` - Beforeフック3件追加・ヘルパー修正

## 追加シナリオ設計

### 4-10-9: スケジュールジョブ非公開完了 → 「公開する」ボタン表示
- **前提**: `maiml_publish_job` に `job_type=unpublish`, `status=done`, `trigger_type=schedule` を INSERT
- **操作**: ログイン → プロジェクト選択
- **確認**: ボタンが「公開する」（青・活性）になっていること

### 4-10-10: スケジュールジョブ非公開進行中 → ローディング状態
- **前提**: `maiml_publish_job` に `job_type=unpublish`, `status=running`, `trigger_type=schedule` を INSERT
- **操作**: ログイン → プロジェクト選択
- **確認**: ボタンがローディング状態かつクリック不可であること

### 4-10-11: スケジュールジョブ非公開エラー → エラーメッセージ表示
- **前提**: `maiml_publish_job` に `job_type=unpublish`, `status=error`, `trigger_type=schedule` を INSERT
- **操作**: ログイン → プロジェクト選択
- **確認**: エラーメッセージが表示されること、ボタンが「公開する」に戻ること

## リスク
| リスク | 対策 |
|--------|------|
| フロントエンドが `trigger_type` を区別して表示を変える場合、期待通りに動作しない可能性がある | `trigger_type=schedule` でも `status` のみに基づいて表示が決まる設計であることを確認する |
| `insertMaimlPublishJob` のシグネチャ変更が既存テストに影響する可能性 | デフォルト引数 `triggerType = 'manual'` を付与して後方互換性を保つ |

## 承認記録
- **計画書提示日時**: 2026-04-01 11:51
- **承認日時**: 2026-04-01 11:51
- **承認者コメント**: Act Modeに切り替え承認済み
