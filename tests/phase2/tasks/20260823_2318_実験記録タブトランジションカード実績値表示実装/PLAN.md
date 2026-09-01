# タスク計画書: 実験記録タブトランジションカード実績値表示実装

## メタデータ
- **作成日時**: 2026-08-23 23:18
- **タスクID**: 20260823_2318_実験記録タブトランジションカード実績値表示実装
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブで、トランジションのデータを取得するAPIは実装済みだが、
`progressRows` の `status` が `not_started` の場合に `activeEntry` が `null` を返してしまうため
カードが一切表示されない問題を修正する。

## 原因分析

`WorkRecordPanel.tsx` の `PlanA` および `PlanB` 内の `activeEntry` 計算ロジックが、
`in_progress` ステータスのトランジションしか候補にしていなかった。

実際のAPIレスポンスで全トランジションが `not_started` の場合（未着手タスク）や、
`in_progress` が0件の場合はカードが表示されなかった。

## 修正内容

### 変更ファイル
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

### 修正箇所: PlanA と PlanB の `activeEntry` useMemo

**修正前（共通）:**
```typescript
const activeRow = progressRows.find(
  (r) => r.taskNo === activeTaskNo && r.status === 'in_progress'
) ?? progressRows.find((r) => r.status === 'in_progress');
if (activeRow) return { ... };
return null;  // ← in_progress が0件なら常にnull
```

**修正後（共通）:**
```typescript
// 1. activeTaskNo の in_progress を優先
const activeRow = progressRows.find(
  (r) => r.taskNo === activeTaskNo && r.status === 'in_progress'
)
  // 2. 全体の in_progress
  ?? progressRows.find((r) => r.status === 'in_progress')
  // 3. activeTaskNo の not_started（未着手でもカードを表示）
  ?? progressRows.find((r) => r.taskNo === activeTaskNo && r.status === 'not_started')
  // 4. 全体の not_started
  ?? progressRows.find((r) => r.status === 'not_started');
if (activeRow) return { ... };
return null;  // ← 全完了済みの場合のみnull
```

優先順位:
1. `activeTaskNo` の `in_progress`
2. 全体の `in_progress`
3. `activeTaskNo` の `not_started`（未着手でもカードを表示）
4. 全体の `not_started`
5. すべて `completed` / `error` → `null`（「全トランジション完了」Alertを表示）

## テスト計画

- [ ] 全トランジション `not_started` のプロジェクトで実験記録タブを開き、カードが表示されること
- [ ] `in_progress` のトランジションがある場合、そのカードが優先表示されること
- [ ] 全トランジション `completed` の場合、「全トランジション完了」Alertが表示されること

## 承認記録
- **承認日時**: 2026-08-23 23:18（実装後報告）

## 実施記録
- **完了日時**: 2026-08-23 23:51
- PlanA（行1338〜）と PlanB（行1438〜）の `activeEntry` useMemo を同一ロジックに統一
