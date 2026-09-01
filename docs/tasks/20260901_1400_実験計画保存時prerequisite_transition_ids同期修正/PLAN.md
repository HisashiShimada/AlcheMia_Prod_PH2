# タスク計画書: 実験計画保存時 prerequisite_transition_ids 同期修正

## メタデータ
- **作成日時**: 2026-09-01 14:00
- **優先度**: 高
- **推定工数**: 1.5時間

## タスク概要

依存関係のあるトランジションが「１：初期状態」のはずなのに「２：準備状態」になっている問題を修正する。

## 根本原因

`transition_data.prerequisite_transition_ids` が **空配列 `{}`** のまま登録されているため、
チェックアウト時に `updateStatusForCheckout.sql` が「前提なし」と判定して PREPARING(2) に更新してしまう。

### 原因の連鎖

```
実験計画ダイアログで前提設定を保存
  → experiment_plan.planned_values.__meta__.transitionOrder に保存される

タスク登録（saveTaskRegistration）時
  → __meta__ を読んで transition_data.prerequisite_transition_ids を設定する
  → ただし「タスク登録後に実験計画保存」の順番だと __meta__ がまだない
  → または実験計画を更新しても transition_data は再更新されない
  → 結果: prerequisite_transition_ids = '{}' のまま

チェックアウト時（updateStatusForCheckout.sql）
  → prerequisite_transition_ids = '{}' のもの全てを PREPARING(2) に更新
  → 前提ありのトランジションも PREPARING になってしまう
```

## 修正方針

**実験計画保存時（`PUT /experiment-plans/:methodId/:taskNo`）に、`__meta__.transitionOrder` から `prerequisiteTransitionIds` を読み取り、`transition_data.prerequisite_transition_ids` を同期更新する。**

これにより、実験計画を保存するたびに `transition_data` の前提情報が最新状態に保たれる。

## 実装ステップ

- [x] PLAN.md 作成
- [x] TODO-1: `backend/src/sql/queries/transition_data/updatePrerequisiteIds.sql` 新規作成
  - `prerequisite_transition_ids` を更新するSQL（task_no=1〜Nの実績行のみ対象）
- [x] TODO-2: `backend/src/repositories/transitionDataRepository.ts` に `updatePrerequisiteIds` メソッド追加
- [x] TODO-3: `backend/src/services/experimentPlanService.ts` の `upsertExperimentPlan` に同期処理を追加
  - `plannedValues.__meta__.transitionOrder` から `prerequisiteTransitionIds` を抽出
  - 各トランジションの `transition_data.prerequisite_transition_ids` を更新
- [x] TODO-4: TypeScript コンパイルエラーなし確認

## 変更ファイル

1. `backend/src/sql/queries/transition_data/updatePrerequisiteIds.sql`（新規）
2. `backend/src/repositories/transitionDataRepository.ts`（`updatePrerequisiteIds` メソッド追加）
3. `backend/src/services/experimentPlanService.ts`（`upsertExperimentPlan` に同期処理追加）

## リスク

| リスク | 対策 |
|--------|------|
| task_no=0（順序管理行）も更新してしまう | SQL に `task_no > 0` 条件を追加 |
| transition_data が存在しない場合（タスク未登録）のエラー | UPDATE は対象行なし時は0件更新で正常終了するため問題なし |
| INITIAL(1) 以外のステータスのレコードも更新してしまう | ステータスに関係なく prerequisite のみ更新（ステータス変更なし）|

## テスト計画

- [ ] 実験計画で前提設定後、タスク登録 → チェックアウト → transition3 が INITIAL のまま
- [ ] 既にタスク登録済みの状態で実験計画保存 → transition_data の prerequisite_transition_ids が更新される
- [ ] TypeScript コンパイルエラーなし

## 承認記録
- **承認日時**: 2026-09-01（ユーザー承認済み・Actモード移行確認）
