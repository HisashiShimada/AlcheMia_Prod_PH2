# タスク計画書: 4-4 タスク登録 E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 17:52
- **タスクID**: 4-4_task_registration_e2e
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-4: タスク登録」に対応するPlaywright E2Eテストを作成する。
featureファイル（BDD/Gherkin形式）とstepsファイル（TypeScript）を作成し、全7件のシナリオをカバーする。

---

## 目的と期待される成果

### 目的
- タスク登録タブの主要機能（試行回数設定・実験条件変更・ドラッグ&ドロップ・ワーカー連携済みロック・指示追加）の自動テスト化
- 回帰テストによる品質担保

### 期待される成果
- [x] featureファイル作成（全7シナリオ）
- [ ] フロントエンドソースに `data-testid` を追加
- [ ] stepsファイル作成（全7シナリオの自動化）

---

## シナリオ一覧と自動化方針

| シナリオID | シナリオ名 | 自動化 | 備考 |
|-----------|-----------|--------|------|
| 4-4-1 | 試行回数を設定して保存できること | ✅ Playwright自動 | |
| 4-4-2 | 実験条件を変更して保存できること | ✅ Playwright自動 | |
| 4-4-3 | ドラッグ&ドロップで順序変更して保存できること | ✅ Playwright自動 | `page.mouse` API使用 |
| 4-4-4 | ワーカー連携済みタスクは試行回数・実験条件の編集不可 | ✅ Playwright自動 | disabled/readonly確認 |
| 4-4-5 | ワーカー連携済みタスクはドラッグ不可 | ✅ Playwright自動 | cursor: not-allowed確認 |
| 4-4-6 | 指示追加ボタンでInstructionEditDialogが表示されること | ✅ Playwright自動 | |
| 4-4-7 | 追加した指示が指示登録タブに反映されること | ✅ Playwright自動 | タブ切り替え確認 |

**手動テストシナリオ: なし**（4-4は全7件Playwright自動化対象）

---

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN_4-4.md を作成（このファイル）

### Phase 2: featureファイル作成
- [ ] `tests/e2e/features/4_experiment_admin/4-4_task_registration.feature` を作成
  - Background（背景）の定義
  - 全7シナリオのGherkin記述
  - タグ付け（@4-4, @task-registration）

### Phase 3: フロントエンドへのdata-testid追加
- [ ] `frontend/src/components/project/TaskRegistrationTab.tsx` に以下の `data-testid` を追加
  - `task-registration-save-button` - 保存ボタン
  - `task-row-{id}` - 各タスク行
  - `task-trial-count-input-{id}` - 試行回数入力
  - `task-experiment-condition-select-{id}` - 実験条件Select
  - `task-drag-handle-{id}` - ドラッグハンドル
  - `task-add-instruction-button-{id}` - 指示追加ボタン
  - `project-instruction-button` - プロジェクト指示ボタン
  - `instruction-edit-dialog` - 指示編集ダイアログ（InstructionEditDialog.tsx）

### Phase 4: stepsファイル作成
- [ ] `tests/e2e/steps/4_experiment_admin/4-4_task_registration.ts` を作成
  - Before/Afterフック（テストデータDB投入・クリーンアップ）
  - 各シナリオのStep実装
  - ドラッグ&ドロップの実装（`page.mouse` API）

---

## 変更ファイル一覧

### 新規作成
1. `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN_4-4.md` - このファイル
2. `tests/e2e/features/4_experiment_admin/4-4_task_registration.feature` - featureファイル
3. `tests/e2e/steps/4_experiment_admin/4-4_task_registration.ts` - stepsファイル

### 修正
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - data-testid追加
2. `frontend/src/components/project/InstructionEditDialog.tsx` - data-testid追加（確認後）

---

## テスト前提条件（テストデータ）

### 4-4-1〜4-4-3用プロジェクト
```sql
-- MAIMLファイル登録済み・チェックアウトなし・タスク未登録
INSERT INTO project (project_name, organization_id, project_status, checkout_status, maiml_file_path, ...)
VALUES ('test-task-reg-001', :orgId, 0, 0, 'path/to/test.maiml', ...);
```

### 4-4-4〜4-4-5用プロジェクト
```sql
-- workerLinkedFlg=trueのタスクを持つプロジェクト
INSERT INTO project_task (project_name, organization_id, method_id, worker_linked_flg, ...)
VALUES ('test-task-reg-002', :orgId, 'method_001', true, ...);
```

### 4-4-6〜4-4-7用プロジェクト
```sql
-- タスク1件以上登録済み
INSERT INTO project_task (project_name, organization_id, method_id, worker_linked_flg, ...)
VALUES ('test-task-reg-003', :orgId, 'method_001', false, ...);
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ドラッグ&ドロップ操作の自動化が不安定 | 中 | 中 | `page.mouse` APIを使用、タイムアウトを設定 |
| data-testidのフロントエンド追加漏れ | 高 | 低 | 事前に全要素をリストアップして確認 |
| DBテストデータの構造不一致 | 高 | 低 | 既存4-3のDBヘルパーを参考に実装 |

---

## 承認記録
- **計画書提示日時**: 2026-03-13 17:52
- **承認日時**: 2026-03-13 17:52
- **承認者コメント**: Act Modeにて計画書作成指示を受理

---

## 実施記録

### 実施日時
開始: 2026-03-13 17:52  
完了: （作業中）

### 計画からの変更点
（作業中）

### 最終的な成果物
- [ ] featureファイル
- [ ] stepsファイル
