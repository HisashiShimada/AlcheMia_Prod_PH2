# タスク計画書: ExperimentPlanDialog タスクNo重複修正

## メタデータ

- **作成日時**: 2026-09-29 10:00
- **タスクID**: 20260929_1000_ExperimentPlanDialog_タスクNo重複修正
- **優先度**: 高
- **推定工数**: 1時間

---

## タスク概要

`TaskRegistrationTab.tsx` から `ExperimentPlanDialog` に渡す `taskNumbers` の計算ロジックが誤っており、同一メソッドに対して複数回タスク登録を行った場合にタブが重複・ズレる問題を修正する。

---

## 問題の根本原因

### 現状のコード（`TaskRegistrationTab.tsx` L994–996）

```tsx
taskNumbers={taskDetails
  .filter((t) => t.methodId === selectedMethodIdForPlan)
  .flatMap((t) => Array.from({ length: t.trialCount }, (_, i) => i + 1))}
```

同一 `methodId` の行が複数ある場合、各行に対して常に `1` 始まりの連番を生成するため、task_no が重複する。

### 具体例

| 登録回 | methodId | experimentOrder | trialCount | DB 上の task_no |
|--------|----------|-----------------|------------|----------------|
| 1 回目 | メソッドA | 1 | 5 | 1〜5 |
| 2 回目 | メソッドA | 2 | 3 | 6〜8 |

現状の `taskNumbers` 計算結果：
```
[1,2,3,4,5,  1,2,3]  ← 1〜3 が重複
```

期待する計算結果（2回目ダイアログ）：
```
[6, 7, 8]
```

### 副次的な問題

`handleAddInstructionClick` が `methodId` のみを保持し、どの「作業順序の行」のダイアログを開いているか区別していないため、`taskNumbers` を正しく絞り込めない。

---

## 目的と期待される成果

- [ ] 2回目以降の同一メソッドに対する ExperimentPlanDialog のタブが、正しい task_no（累積連番）で生成される
- [ ] タブの重複が解消される
- [ ] 1回目の既存動作（task-1〜task-N）に影響しない

---

## 実装ステップ

### Step 1: `selectedExperimentOrderForPlan` ステートを追加

`selectedMethodIdForPlan` ステートの直下に以下を追加する。

```ts
const [selectedExperimentOrderForPlan, setSelectedExperimentOrderForPlan] = useState<number>(1);
```

### Step 2: `handleAddInstructionClick` を修正

引数に `experimentOrder: number` を追加し、ステートに保存する。

```ts
// 変更前
const handleAddInstructionClick = useCallback((methodId: string) => {
  setSelectedMethodIdForPlan(methodId);
  setIsExperimentPlanDialogOpen(true);
}, []);

// 変更後
const handleAddInstructionClick = useCallback((methodId: string, experimentOrder: number) => {
  setSelectedMethodIdForPlan(methodId);
  setSelectedExperimentOrderForPlan(experimentOrder);
  setIsExperimentPlanDialogOpen(true);
}, []);
```

### Step 3: ボタン `onClick` を修正

`record.experimentOrder` を渡す。

```tsx
// 変更前
onClick={() => handleAddInstructionClick(record.methodId)}

// 変更後
onClick={() => handleAddInstructionClick(record.methodId, record.experimentOrder ?? 1)}
```

### Step 4: `taskNumbers` の計算ロジックを修正

選択された `experimentOrder` より前の同一 `methodId` 行の `trialCount` を累積してオフセットを計算し、選択行の `trialCount` 分の task_no を生成する。

```tsx
// 変更前
taskNumbers={taskDetails
  .filter((t) => t.methodId === selectedMethodIdForPlan)
  .flatMap((t) => Array.from({ length: t.trialCount }, (_, i) => i + 1))}

// 変更後
taskNumbers={(() => {
  const sameMethods = taskDetails
    .filter((t) => t.methodId === selectedMethodIdForPlan)
    .sort((a, b) => (a.experimentOrder ?? 0) - (b.experimentOrder ?? 0));

  // selectedExperimentOrderForPlan より前の行の trialCount を累積してオフセットを算出
  let offset = 0;
  for (const t of sameMethods) {
    if ((t.experimentOrder ?? 0) >= selectedExperimentOrderForPlan) break;
    offset += t.trialCount;
  }

  // 選択行の trialCount 分だけ連番を生成（1 始まりではなく offset+1 始まり）
  const selectedRow = sameMethods.find(
    (t) => (t.experimentOrder ?? 0) === selectedExperimentOrderForPlan
  );
  if (!selectedRow) return [];

  return Array.from({ length: selectedRow.trialCount }, (_, i) => offset + i + 1);
})()}
```

### Step 5: `onClose` ハンドラに `selectedExperimentOrderForPlan` リセットを追加

```tsx
// 変更前
onClose={() => {
  setIsExperimentPlanDialogOpen(false);
  setSelectedMethodIdForPlan('');
}}

// 変更後
onClose={() => {
  setIsExperimentPlanDialogOpen(false);
  setSelectedMethodIdForPlan('');
  setSelectedExperimentOrderForPlan(1);
}}
```

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|----------|----------|
| 1 | `frontend/src/components/project/TaskRegistrationTab.tsx` | Step 1〜5 の変更（ステート追加・ハンドラ修正・taskNumbers 計算修正） |

バックエンド・`ExperimentPlanDialog.tsx`・`experimentPlanApiService.ts` は変更不要。

---

## 影響範囲の分析

### 変更による影響

| 対象 | 影響 |
|------|------|
| ExperimentPlanDialog のタブ生成 | ✅ 正しい task_no がタブに表示される |
| 1回目の登録（作業順序1）の動作 | ✅ 変更なし（offset=0 のため従来通り 1〜N） |
| getExperimentPlans の結果との整合 | ✅ DB の task_no と一致するようになる |
| 保存処理（upsertExperimentPlanToApi） | ✅ 変更なし（taskNumbers から taskNo を受け取る既存処理が正しく動く） |

### 変更しないもの

- バックエンド API（`getExperimentPlans` は全 task_no を返す設計で正しい）
- `experimentPlansToTabDataMap`（`task-${plan.taskNo}` キー生成は正しい）
- `ExperimentPlanDialog.tsx` 内部ロジック

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `experimentOrder` が `undefined` の場合にオフセット計算が崩れる | 中 | 低 | `?? 0` / `?? 1` でフォールバック済み |
| 1回目の既存動作への影響 | 高 | 低 | offset=0 の場合は従来と同一結果になることを確認済み |
| selectedExperimentOrderForPlan が古い値を参照するタイミング | 低 | 低 | ダイアログを開く直前に setState するため問題なし |

---

## テスト計画

### 手動テスト

- [ ] メソッドA を作業順序1・trialCount=5 で登録 → 実験計画ダイアログを開く → タブがタスク1〜5 の 5 枚になること
- [ ] メソッドA を作業順序2・trialCount=3 で追加登録 → 2行目のボタンから実験計画ダイアログを開く → タブがタスク6〜8 の 3 枚になること
- [ ] 1行目のボタンから実験計画ダイアログを開く → タブがタスク1〜5 の 5 枚のまま変わらないこと
- [ ] 保存処理が正常に動作すること（task_no が DB 上の値と一致すること）

---

## 承認記録

- **計画書提示日時**: 2026-09-29 10:00
- **承認日時**: 2026-09-29 10:00
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-29 10:00
完了: 2026-09-29 10:00

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] Step 1: `selectedExperimentOrderForPlan` ステート追加（L163）
- [x] Step 2: `handleAddInstructionClick` に `experimentOrder` 引数追加（L323）
- [x] Step 3: ボタン onClick に `record.experimentOrder ?? 1` を渡すよう修正（L868）
- [x] Step 4: `taskNumbers` の計算ロジックを累積 offset 方式に変更（L996–L1015）
- [x] Step 5: `onClose` ハンドラに `selectedExperimentOrderForPlan` リセット追加（L1023）
