# タスク計画書: 実験指示タブ ExperimentPlanDialog タスクタブ未表示修正

## メタデータ
- **作成日時**: 2026-09-08 10:00
- **タスクID**: 20260908_1000
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験管理者が「実験指示タブ」の「実験指示を編集」ボタンから `ExperimentPlanDialog`（実験計画詳細指示ダイアログ）を開いた際に、タスク登録タブで登録したタスク（タスク1・タスク2・タスク3 等）のタブが表示されず、「一括」タブのみが表示される不具合を修正する。

## 目的と期待される成果

- [ ] 実験指示タブから `ExperimentPlanDialog` を開いた際に、タスク登録タブで登録済みのタスク番号に対応するタブ（タスク1・タスク2・タスク3 等）が正しく表示される
- [ ] タスク登録タブからの呼び出し（既存動作）に影響を与えない

## 原因分析

### 根本原因

`ExperimentInstructionTab.tsx`（1398〜1402行目）の `ExperimentPlanDialog` に渡す `taskNumbers` の生成ロジックが誤っている。

```tsx
// ❌ 修正前: getExperimentInstructions レスポンス（template_data ベース）から取得
taskNumbers={
  uniq(
    (instructions.find((m) => m.methodId === planDialogMethodId)?.tasks ?? [])
      .map((t) => t.taskNo)
  ).sort((a, b) => a - b)
}
```

`getExperimentInstructions` API は `template_data` テーブルに**実績値が存在するタスクのみ**を返す。  
タスク登録は完了しているが、実験作業者がまだ実績値を入力していないタスクは `template_data` にデータがないため、`instructions` に含まれず `taskNumbers=[]` となる。  
その結果、`ExperimentPlanDialog` のタブが「一括」タブのみとなる。

### 正しい取得元

`getTaskRegistration` API は `project_task` テーブルのデータを返し、登録済みの全タスクと `trialCount`（試行回数）を含む。  
`TaskRegistrationTab.tsx` は既にこの方法で正確に `taskNumbers` を算出しており、動作が正常である。

```tsx
// ✅ 正常動作する TaskRegistrationTab.tsx の taskNumbers 算出方法
taskNumbers={taskDetails
  .filter((t) => t.methodId === selectedMethodIdForPlan)
  .flatMap((t) => Array.from({ length: t.trialCount }, (_, i) => i + 1))}
```

## 実装ステップ

- [ ] Step 1: タスク計画書作成（本ファイル）
- [ ] Step 2: `ExperimentInstructionTab.tsx` 修正
  - [ ] `getTaskRegistration` を `projectApiService` から import 追加
  - [ ] `TaskRegistrationItem` 型を `taskRegistration` から import 追加
  - [ ] `taskRegistrations` state を追加（`TaskRegistrationItem[]`）
  - [ ] `fetchData` 内で `getTaskRegistration(projectId)` を並行取得し `taskRegistrations` にセット
  - [ ] `ExperimentPlanDialog` の `taskNumbers` 生成ロジックを修正
- [ ] Step 3: `ui_experiment_instruction_tab.md` 設計書を更新
  - [ ] State 定義に `taskRegistrations` を追加
  - [ ] API 連携セクションにタスク登録情報取得を追加
- [ ] Step 4: 変更内容の確認

## 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | 修正 | `taskRegistrations` state 追加・`fetchData` 修正・`taskNumbers` 生成ロジック修正 |
| 2 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` | 修正 | State 定義・API 連携セクション更新 |

## リスク

| リスク | 対策 |
|--------|------|
| `getTaskRegistration` が失敗した場合に `taskNumbers=[]` になりタブが表示されない | catch 節で `taskRegistrations` を空配列のままとし、エラーログを出力（既存の `fetchData` エラーハンドリングに倣う） |
| タスク登録未完了プロジェクトで `taskRegistrations=[]` になる | 元々 `instructions` ベースでも `[]` だったため、動作変化なし |

## テスト計画

- [ ] タスク登録済み・実績値未入力のプロジェクトで「実験指示を編集」ボタンを押し、タスクNoタブが表示されることを確認
- [ ] タスク登録済み・実績値入力済みのプロジェクトで「実験指示を編集」ボタンを押し、引き続き正常に動作することを確認
- [ ] タスク登録タブからの `ExperimentPlanDialog` 呼び出しに影響がないことを確認

## 承認記録

- **計画書提示日時**: 2026-09-08 10:00
- **承認日時**: 2026-09-08 10:00
- **承認者コメント**: 調査結果に基づき実装を承認

## 実施記録

### 実施日時
開始: 2026-09-08 10:00
完了: 2026-09-08 10:10

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] Step 1: タスク計画書作成 — 完了
- [x] Step 2: `ExperimentInstructionTab.tsx` 修正 — 完了
  - [x] `getTaskRegistration` を `projectApiService` から import 追加（53行目）
  - [x] `TaskRegistrationItem` 型を `taskRegistration` から import 追加（59行目）
  - [x] `taskRegistrations` state を追加（429行目）
  - [x] `fetchData` 内で `getTaskRegistration(projectId)` を並行取得し `taskRegistrations` にセット
  - [x] `ExperimentPlanDialog` の `taskNumbers` 生成ロジックを修正（1398〜1403行目）
- [x] Step 3: `ui_experiment_instruction_tab.md` 設計書を更新 — 完了
  - [x] State 定義に `taskRegistrations` を追加
  - [x] API 連携セクションにタスク登録情報取得を追加・データ取得フローを更新
  - [x] 変更履歴を追加
- [x] Step 4: TypeScript コンパイルエラーがないことを確認 — 完了
