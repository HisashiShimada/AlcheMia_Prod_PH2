# タスク計画書: 実験計画指示必須化とplanned_values空チェック修正

## メタデータ
- **作成日時**: 2026-09-25 11:00
- **タスクID**: 20260925_1100
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

前タスク（20260925_1000）の修正で明らかになった、さらに根本的な2つの問題を修正する。

### 問題1: `handleSave` の「実験指示 OR 実験計画」ロジックが誤り

**現状の誤ったロジック（フロントエンド）**:
```
実験指示（hasUnsent）OR 実験計画（hasExperimentPlan）があれば保存OK
```

**正しい仕様**:
- **実験計画指示（ExperimentPlan）**: 必須 — 全チェック済みメソッドに登録されていること
- **実験指示（instruction / hasUnsent）**: 任意 — なくても保存可

現状は `if (!hasUnsent && !hasExperimentPlan)` でORチェックしており、
実験計画が未登録でも実験指示さえあれば保存が通ってしまう。

### 問題2: `checkout()` の `planned_values != null` チェックが機能しない

**根本原因**:  
`initInsert.sql` がタスク登録保存時に `planned_values = '{}'::jsonb`（空JSONオブジェクト）で初期挿入する。
そのため、実験計画ダイアログで未保存であっても `planned_values` は `NULL` ではなく `{}` となる。

```sql
-- initInsert.sql
INSERT INTO experiment_plan (..., planned_values, ...)
VALUES ($1, $2, $3, $4, '{}'::jsonb, $5, ...)  ← 初期値は空JSON
ON CONFLICT DO NOTHING
```

**現状の誤ったチェック（バックエンド）**:
```typescript
const planMapByMethod = new Map<string, boolean>();
for (const p of experimentPlansForValidation) {
  if (p.planned_values != null) {  // ← {} は null ではないので常に true
    planMapByMethod.set(p.method_id, true);
  }
}
```

`{}` は `null` ではないため、**実験計画ダイアログで何も入力していなくても**
`planMapByMethod` に登録されてしまい、バリデーションが通過してしまう。

---

## 修正方針

### バックエンド修正: `projectService.ts` バリデーション5

`planned_values != null` の判定を、
**「`planned_values` が空でないオブジェクトかどうか」** に変更する。

具体的には `Object.keys(p.planned_values).length > 0` を使って空 `{}` を弾く。
ただし `ExperimentPlanValues` 型 (`Record<string, TransitionPlanValues>`) に対して
`Object.keys()` を使うのは型安全なので問題ない。

```typescript
// 修正後
const planMapByMethod = new Map<string, boolean>();
for (const p of experimentPlansForValidation) {
  // planned_values が null でなく、かつ空でない（{} ではない）こと
  if (p.planned_values != null && Object.keys(p.planned_values).length > 0) {
    planMapByMethod.set(p.method_id, true);
  }
}
```

### フロントエンド修正: `TaskRegistrationTab.tsx` handleSave

「実験指示 OR 実験計画」から **「実験計画は必須」** に変更する。

- `hasUnsent`（実験指示）を条件から外す
- 実験計画の全メソッドチェックを**常に実行**（`!hasUnsent` 分岐を除去）
- 実験計画が全メソッドに揃っていない場合はエラーで中断

```typescript
// 修正後
// 実験計画指示はチェック済み全メソッドで必須
const checkedMethodIdsForValidation = taskDetails
  .filter(task => checkedTaskIds.has(task.id) && !task.workerLinkedFlg)
  .map(task => task.methodId);

let allMethodsHavePlan = checkedMethodIdsForValidation.length > 0;
for (const methodId of checkedMethodIdsForValidation) {
  const planResult = await getExperimentPlans(projectId, methodId);
  const hasValidPlanForMethod =
    planResult != null &&
    planResult.plans.some(
      plan => plan.plannedValues != null && Object.keys(plan.plannedValues).length > 0
    );
  if (!hasValidPlanForMethod) {
    allMethodsHavePlan = false;
    break;
  }
}

if (!allMethodsHavePlan) {
  message.error(t('taskRegistration.messages.requireInstruction'));
  return;
}
```

---

## 実装ステップ（詳細チェックリスト）

### STEP 1: バックエンド — `projectService.ts` バリデーション5の空チェック修正

- [ ] `planMapByMethod` への登録条件を `!= null` → `!= null && Object.keys(p.planned_values).length > 0` に変更

### STEP 2: フロントエンド — `TaskRegistrationTab.tsx` handleSave の必須化

- [ ] `hasUnsent` の定義・使用を削除（実験指示チェック自体を廃止）
- [ ] `if (!hasUnsent)` の分岐を除去し、実験計画チェックを**常に実行**するよう変更
- [ ] `if (!hasUnsent && !hasExperimentPlan)` を `if (!allMethodsHavePlan)` に変更
- [ ] `hasExperimentPlan` 変数を `allMethodsHavePlan` に統合して簡潔化

---

## 影響範囲

| カテゴリ | 影響 |
|---------|------|
| バックエンド | `projectService.ts` のみ（1行修正） |
| フロントエンド | `TaskRegistrationTab.tsx` のみ（handleSave の分岐整理） |
| DB・API・エラーコード | 変更なし |

---

## 変更ファイル一覧

| # | ファイルパス | 変更種別 | 変更概要 |
|---|------------|---------|---------|
| 1 | `backend/src/services/projectService.ts` | 修正 | バリデーション5：`!= null` → `!= null && 空でない` に変更 |
| 2 | `frontend/src/components/project/TaskRegistrationTab.tsx` | 修正 | handleSave：実験計画を必須化・hasUnsent条件の除去 |

---

## 承認記録

- **計画書提示日時**: 2026-09-25 11:00
- **承認日時**: 2026-09-25
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-09-25 11:00
完了: 2026-09-25 11:30

### 計画からの変更点
- フロントエンドで `unsentInstructions` / `hasUnsent` が不要な未使用変数として残るため追加削除した

### 最終的な成果物
- [x] STEP 1: `backend/src/services/projectService.ts` — `planned_values` 空チェック修正
- [x] STEP 2: `frontend/src/components/project/TaskRegistrationTab.tsx` — 実験計画必須化・hasUnsent変数削除
- [x] TypeScript型チェック（tsc --noEmit）: バックエンド・フロントエンドともにエラーなし
