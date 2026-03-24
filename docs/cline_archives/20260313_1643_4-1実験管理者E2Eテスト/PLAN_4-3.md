# タスク計画書: [4-3] チェックアウト / チェックイン E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 17:25
- **タスクID**: e2e-4-3-checkout-checkin
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-3: チェックアウト / チェックイン」に記載された9件のシナリオについて、Playwright + playwright-bdd（Gherkin）形式のE2Eテストファイルを作成する。

- **featureファイル**: `tests/e2e/features/4_experiment_admin/4-3_checkout_checkin.feature`
- **stepsファイル**: `tests/e2e/steps/4_experiment_admin/4-3_checkout_checkin.ts`
- **フロントエンド修正**: `frontend/src/components/project/ProjectManagement.tsx`（data-testid 追加）

## 目的と期待される成果

- [ ] チェックアウト/チェックインのE2E自動テストが実行可能になること
- [ ] 全9シナリオのfeatureファイルが作成されること
- [ ] 自動化対象（全9件）のstepsファイルが作成されること
- [ ] テスト対象UI要素に data-testid が付与されること

## 実装ステップ

### Phase 1: DDL・ソース調査
- [x] `docs/design/db/ddl/project.sql` の確認
- [x] `docs/design/db/ddl/project_task.sql` の確認
- [x] `frontend/src/components/project/ProjectManagement.tsx` の確認（チェックアウト/チェックイン実装）
- [x] 既存参照実装（4-1 feature/steps）の確認

### Phase 2: フロントエンド修正（data-testid 追加）
- [ ] `ProjectManagement.tsx` のチェックアウト/チェックインボタンに `data-testid="checkout-checkin-button"` を追加
- [ ] `ProjectManagement.tsx` のチェックアウト中Tagに `data-testid="checkout-status-tag"` を追加

### Phase 3: featureファイル作成
- [ ] `tests/e2e/features/4_experiment_admin/4-3_checkout_checkin.feature` 作成（全9シナリオ）

### Phase 4: stepsファイル作成
- [ ] `tests/e2e/steps/4_experiment_admin/4-3_checkout_checkin.ts` 作成

## 変更ファイル

### 新規作成
1. `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN_4-3.md` - このファイル
2. `tests/e2e/features/4_experiment_admin/4-3_checkout_checkin.feature` - Gherkin featureファイル
3. `tests/e2e/steps/4_experiment_admin/4-3_checkout_checkin.ts` - Playwright stepsファイル

### 修正
1. `frontend/src/components/project/ProjectManagement.tsx` - data-testid 追加

## テスト対象シナリオ一覧

| シナリオID | 内容 | 種別 | 対応API |
|---|---|---|---|
| 4-3-1 | `checked_in` プロジェクトをチェックアウトできること | 正常系 | POST `/api/v1/projects/:projectName/checkout` |
| 4-3-2 | チェックアウト中プロジェクトをチェックインできること | 正常系 | POST `/api/v1/projects/:projectName/checkin` |
| 4-3-3 | チェックアウト中は「チェックアウト中」タグが表示されること | 表示確認 | GET `/api/v1/projects` |
| 4-3-4 | `in_progress` ステータスのプロジェクトはチェックアウト不可 | 異常系 | POST `.../checkout` |
| 4-3-5 | `checked_out` 状態のプロジェクトはチェックアウト不可 | 異常系 | POST `.../checkout` |
| 4-3-6 | `completed` ステータスのプロジェクトはチェックアウト不可 | 異常系 | POST `.../checkout` |
| 4-3-7 | 実行中タスクがある場合はチェックイン不可 | 異常系 | POST `.../checkin` |
| 4-3-9 | MAIMLファイル未登録プロジェクトはチェックアウト不可 | 異常系 | POST `.../checkout` |
| 4-3-10 | タスク未登録プロジェクトはチェックアウト不可 | 異常系 | POST `.../checkout` |

※ シナリオ 4-3-8 はテスト対象外（スキップ番号）

## 技術設計

### テストデータ準備方針

各シナリオ用に Before フックで project テーブルへ UPSERT し、シナリオ終了後 After フックで削除する。

**プロジェクトID体系:**

| シナリオ | project_id | project_name | project_status | checkout_status | project_maiml_flg | タスク |
|---|---|---|---|---|---|---|
| 4-3-1 | `E2E-4-3-1` | `E2Eテスト用プロジェクト_4-3-1` | 0(planning) | 0(checked_in) | true | 1件以上 |
| 4-3-2 | `E2E-4-3-2` | `E2Eテスト用プロジェクト_4-3-2` | 0(planning) | 1(checked_out) | true | 0件（4-3-7とは別） |
| 4-3-3 | `E2E-4-3-3` | `E2Eテスト用プロジェクト_4-3-3` | 0(planning) | 1(checked_out) | true | - |
| 4-3-4 | `E2E-4-3-4` | `E2Eテスト用プロジェクト_4-3-4` | 2(in_progress) | 0(checked_in) | true | 1件以上 |
| 4-3-5 | `E2E-4-3-5` | `E2Eテスト用プロジェクト_4-3-5` | 0(planning) | 1(checked_out) | true | 1件以上 |
| 4-3-6 | `E2E-4-3-6` | `E2Eテスト用プロジェクト_4-3-6` | 4(completed) | 0(checked_in) | true | 1件以上 |
| 4-3-7 | `E2E-4-3-7` | `E2Eテスト用プロジェクト_4-3-7` | 0(planning) | 1(checked_out) | true | 実行中タスクあり |
| 4-3-9 | `E2E-4-3-9` | `E2Eテスト用プロジェクト_4-3-9` | 0(planning) | 0(checked_in) | false | 1件以上 |
| 4-3-10 | `E2E-4-3-10` | `E2Eテスト用プロジェクト_4-3-10` | 0(planning) | 0(checked_in) | true | 0件 |

**DDL 参照カラム:**
- `project` テーブル: `organization_id`, `project_id`, `project_name`, `project_status`, `checkout_status`, `project_maiml_flg`, `create_user_id`, `create_at`, `update_user_id`, `update_at`
- `project_task` テーブル: `organization_id`, `project_id`, `method_id`, `experiment_order`, `experiment_condition`, `attempts_count`, `worker_linked_flg`, `create_user_id`, `create_at`, `update_user_id`, `update_at`

**project_status の値:**
- 0: planning（プロジェクト計画中）
- 1: pending（タスク実行待ち）
- 2: in_progress（タスク実行中）
- 3: review_waiting（承認待ち）
- 4: completed（プロジェクト完了）
- 5: error（タスク異常終了）

**checkout_status の値:**
- 0: checked_in（チェックイン済み）
- 1: checked_out（チェックアウト中）

### data-testid 一覧

| 要素 | data-testid | 場所 |
|---|---|---|
| チェックアウト/チェックインボタン | `checkout-checkin-button` | ProjectManagement.tsx ファイル操作ツールバー |
| チェックアウト中タグ | `checkout-status-tag` | ProjectManagement.tsx プロジェクト情報ヘッダー |
| プロジェクト管理タブ | `project-management-tab` | 既存（common.ts で使用中） |
| プロジェクト一覧テーブル | `project-list-table` | 既存（4-1で使用中） |

### エラーコード対応

ProjectManagement.tsx の `handleToggleCheckout` にて以下のエラーコードが処理される:

| エラーコード | 表示メッセージ（概要） |
|---|---|
| `TASK_IN_PROGRESS` | 実行中のタスクが存在するためチェックインできません |
| `CHECKOUT_NO_MAIML_FILE` | MAIMLファイルが存在しません |
| `CHECKOUT_INVALID_STATUS` | プロジェクトステータスがタスク実行待ちではありません |
| `CHECKOUT_NO_TASKS` | タスクが登録されていません |
| `CHECKOUT_UNSENT_INSTRUCTIONS` | 未送信の指示が存在します |
| `PROJECT_ALREADY_CHECKED_OUT` | このプロジェクトは既にチェックアウトされています |

### ステップ実装パターン

```typescript
// チェックアウト/チェックインボタンクリック後の待機（Promise.race パターン）
await Promise.race([
  page.waitForResponse(
    (resp) => resp.url().includes('/checkout') || resp.url().includes('/checkin'),
    { timeout: 15000 }
  ).catch(() => {}),
  page.waitForSelector('.ant-message-notice-wrapper', { timeout: 10000 }).catch(() => {}),
]);
```

## リスク

| リスク | 対策 |
|---|---|
| project_task テーブルの「実行中」状態判定がAPI側のロジックに依存 | worker_linked_flg=true のタスクを挿入してチェックイン不可を再現する |
| チェックアウト不可の条件がバックエンドのビジネスルール依存 | エラーメッセージの部分一致で検証（完全一致は避ける） |

## テスト計画

### 実行コマンド（参考）
```bash
cd tests
npx bddgen --config e2e/playwright.config.ts && npx playwright test --config e2e/playwright.config.ts --headed --grep "@4-3"
```

### 単一シナリオ実行
```bash
npx playwright test --config e2e/playwright.config.ts --headed --grep "@4-3-1"
```

## 承認記録
- **計画書提示日時**: 2026-03-13 17:25
- **承認日時**: 2026-03-13 17:25
- **承認者コメント**: Act モードに切り替えて実装開始
