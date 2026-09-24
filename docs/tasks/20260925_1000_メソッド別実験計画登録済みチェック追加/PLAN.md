# タスク計画書: メソッド別実験計画登録済みチェック追加

## メタデータ
- **作成日時**: 2026-09-25 10:00
- **タスクID**: 20260925_1000
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

### 背景・問題

`ProjectService.checkout()` のバリデーション5（実験計画存在チェック）と
`TaskRegistrationTab.handleSave()` の実験計画存在チェックには、
**メソッドごとの登録完了確認がない**という問題がある。

現状は「プロジェクト内に1件でも `planned_values != null` のレコードがあればOK」
という判定のため、以下のケースでバグが発生する：

```
【問題シナリオ】
プロジェクトにメソッドA・メソッドBの2つのメソッドが登録されている場合：

- メソッドA の実験計画 → 登録済み（planned_values != null）
- メソッドB の実験計画 → 未登録（planned_values = null / レコードなし）

↓
現状の挙動:
  バリデーション5: some(p => p.planned_values != null)
  → メソッドAの1件がhitするので「登録あり」→ チェックアウト通過（間違い）

  handleSave: break で最初にhitした時点でループ終了
  → メソッドAがチェック済みリスト先頭なら「計画あり」と判定 → 通過（間違い）

正しい挙動:
  → チェック済みの全メソッドが実験計画を登録済みでなければならない
```

### 問題の箇所

| # | ファイル | メソッド | 問題 |
|---|---------|---------|------|
| 1 | `backend/src/services/projectService.ts` | `checkout()` バリデーション5 | `some()` で1件でもOKとする判定 |
| 2 | `frontend/src/components/project/TaskRegistrationTab.tsx` | `handleSave()` | `break` で最初にhitした時点で終了・未登録メソッドをスキップ |

---

## 目的と期待される成果

- [ ] **バックエンド**: `checkout()` で全メソッド（`project_task` に登録済みの全 methodId）について
  実験計画が登録済みであることを確認する。1つでも未登録のメソッドがあればチェックアウトを拒否する。
- [ ] **フロントエンド**: `handleSave()` でチェック済み全メソッドに対して
  実験計画が登録済みであることを確認する。`break` を削除し全件チェックする。

---

## 現状コード詳細

### バックエンド: projectService.ts バリデーション5（L679-700）

```typescript
// 現状（問題あり）
const experimentPlansForValidation = await experimentPlanRepository.findByProject(
  organizationId, projectId
);
const hasValidPlan = experimentPlansForValidation.some(
  (p) => p.planned_values != null  // ← 1件でも存在すればOKという判定
);
if (!hasValidPlan) { /* エラー */ }
```

**問題点**: `some()` による「少なくとも1件」チェックのため、
メソッドBが未登録でも、メソッドAが登録済みならば通過する。

### フロントエンド: TaskRegistrationTab.tsx handleSave（L380-400）

```typescript
// 現状（問題あり）
for (const methodId of checkedMethodIdsForValidation) {
  const planResult = await getExperimentPlans(projectId, methodId);
  if (planResult && planResult.plans.length > 0) {
    hasExperimentPlan = true;
    break;  // ← 最初にhitした時点でループ終了（以降のメソッドは未確認）
  }
}
```

**問題点1（break）**: 最初に実験計画レコードが存在するメソッドを見つけたら即 `break`。
以降のメソッドが未登録でも検出できない。

**問題点2（plans.length > 0）**: レコードが存在するかの確認のみ。
`planned_values` が null のレコード（初期INSERTのみ済みで保存前の状態）でも通過する。

---

## 修正方針

### バックエンド修正方針

**正しい判定ロジック**:
1. `project_task` テーブルからプロジェクト内の全メソッドID一覧を取得
2. 全メソッドIDについて、`experiment_plan` に `planned_values != null` のレコードが
   少なくとも1件存在することを確認
3. 1つでも未登録のメソッドがあれば `CHECKOUT_NO_EXPERIMENT_PLAN` エラーを返す

```typescript
// 修正後のバリデーション5イメージ
const registeredTasks = await projectTaskRepository.findByProject(organizationId, projectId);
const registeredMethodIds = [...new Set(registeredTasks.map(t => t.method_id))];

const experimentPlansForValidation = await experimentPlanRepository.findByProject(
  organizationId, projectId
);
// メソッドIDごとに有効な計画が存在するかをマップ化
const planMapByMethod = new Map<string, boolean>();
for (const p of experimentPlansForValidation) {
  if (p.planned_values != null) planMapByMethod.set(p.method_id, true);
}
// 登録済み全メソッドに実験計画が存在するか
const missingPlanMethodId = registeredMethodIds.find(id => !planMapByMethod.has(id));
if (missingPlanMethodId !== undefined) {
  await client.query('ROLLBACK');
  return { success: false, error: { code: 'CHECKOUT_NO_EXPERIMENT_PLAN', ... } };
}
```

### フロントエンド修正方針

**正しい判定ロジック**:
1. `break` を削除し、チェック済み全メソッドをループする
2. 判定基準を「レコード存在（`plans.length > 0`）」から
   「有効計画存在（`plannedValues` が非nullかつ非空オブジェクト）」に変更
3. 全メソッドが登録済みなら `hasExperimentPlan = true`、1つでも未登録なら `false`

`getExperimentPlans` の戻り値 `ExperimentPlanDto.plannedValues` は
初期INSERTのみ済みの場合に空オブジェクト `{}` を返す可能性があるため、
`Object.keys(plan.plannedValues).length > 0` で有効性を判定する。

```typescript
// 修正後のhandleSaveバリデーション部分イメージ
let hasExperimentPlan = false;
if (!hasUnsent) {
  const checkedMethodIdsForValidation = taskDetails
    .filter(task => checkedTaskIds.has(task.id) && !task.workerLinkedFlg)
    .map(task => task.methodId);

  // 全メソッドについてチェック（break を削除 → 全件確認）
  let allMethodsHavePlan = checkedMethodIdsForValidation.length > 0;
  for (const methodId of checkedMethodIdsForValidation) {
    const planResult = await getExperimentPlans(projectId, methodId);
    // planned_values が存在し、かつ空でないことを確認
    const hasValidPlanForMethod =
      planResult != null &&
      planResult.plans.some(
        plan => plan.plannedValues != null && Object.keys(plan.plannedValues).length > 0
      );
    if (!hasValidPlanForMethod) {
      allMethodsHavePlan = false;
      break; // 1つでも未登録があれば早期脱出
    }
  }
  hasExperimentPlan = allMethodsHavePlan;
}
```

---

## 実装ステップ（詳細チェックリスト）

### STEP 1: バックエンド — `projectService.ts` バリデーション5の修正

**変更ファイル**: `backend/src/services/projectService.ts`

- [ ] バリデーション5の箇所（L679〜700）を修正
  - `findByProject()` による全件取得は継続
  - `some()` による1件チェックを「全メソッドチェック」に置き換える
  - `projectTaskRepository.findByProject()` で登録済みメソッドID一覧を取得
  - メソッドIDをセットにして `planMapByMethod` を構築
  - `missingPlanMethodId` があれば `CHECKOUT_NO_EXPERIMENT_PLAN` エラーを返す
  - エラーメッセージを「全メソッドの実験計画を保存してから」に更新

### STEP 2: フロントエンド — `TaskRegistrationTab.tsx` handleSave の修正

**変更ファイル**: `frontend/src/components/project/TaskRegistrationTab.tsx`

- [ ] `hasExperimentPlan` の判定ロジック（L380〜400）を修正
  - `break` を削除（全件ループ確認）
  - 「全メソッドが登録済み」という変数（`allMethodsHavePlan`）に変更
  - 判定基準を `plans.length > 0` → `plans.some(p => Object.keys(p.plannedValues).length > 0)` に変更
  - 1つでも未登録があれば `allMethodsHavePlan = false` に設定して早期脱出 break
  - `hasExperimentPlan = allMethodsHavePlan` で最終判定

### STEP 3: 動作確認

- [ ] 複数メソッドのうち一部のみ実験計画登録 → タスク保存がエラーで中断されること
- [ ] 複数メソッドのうち一部のみ実験計画登録 → チェックアウトがエラーで拒否されること
- [ ] 全メソッドの実験計画登録済み → 従来通り保存・チェックアウト成功すること

---

## 影響範囲

| カテゴリ | 影響 |
|---------|------|
| バックエンド | `projectService.ts` のみ（checkout バリデーション5） |
| フロントエンド | `TaskRegistrationTab.tsx` のみ（handleSave） |
| DB・API | 変更なし |
| エラーコード | `CHECKOUT_NO_EXPERIMENT_PLAN` は変更なし（既存コードを使用） |

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 全メソッド登録済みの正常系への破壊 | 高 | 低 | STEP 3 の正常系リグレッション確認で対処 |
| `plannedValues` が `{}` の判定漏れ | 中 | 中 | `Object.keys(p.plannedValues).length > 0` で空オブジェクト除外 |
| `projectTaskRepository.findByProject()` が client 外で呼ばれる | 低 | 低 | 既存の taskCount チェックも同様にプール接続を使用しており問題なし |

---

## 変更ファイル一覧

| # | ファイルパス | 変更種別 | 変更概要 |
|---|------------|---------|---------|
| 1 | `backend/src/services/projectService.ts` | 修正 | バリデーション5：`some()` → 全メソッドチェックに変更 |
| 2 | `frontend/src/components/project/TaskRegistrationTab.tsx` | 修正 | handleSave：`break` 削除・判定基準を `plannedValues` 空チェックに変更 |

---

## テスト計画

### 手動テスト

#### テストケース 1: メソッドB未登録でタスク保存（フロントエンド）
- 手順: メソッドA・Bを追加 → メソッドAのみ実験計画を保存 → 両方チェック → 保存ボタンを押す
- 期待値: エラーメッセージが表示され保存中断、保存APIが呼ばれないこと

#### テストケース 2: メソッドB未登録でチェックアウト（バックエンド）
- 手順: メソッドA・Bを登録 → メソッドAのみ実験計画を保存 → チェックアウトAPIを呼び出す
- 期待値: `CHECKOUT_NO_EXPERIMENT_PLAN` エラーが返り、`checkout_status` が変化しないこと

#### テストケース 3: 全メソッド登録済みで正常チェックアウト（リグレッション）
- 手順: 全メソッドの実験計画を保存 → タスク登録保存 → チェックアウト
- 期待値: 従来通り保存・チェックアウト成功

---

## 承認記録

- **計画書提示日時**: 2026-09-25 10:00
- **承認日時**: 2026-09-25
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-09-25 10:00
完了: 2026-09-25 10:30

### 計画からの変更点
なし

### 最終的な成果物
- [x] STEP 1: `backend/src/services/projectService.ts` バリデーション5修正
- [x] STEP 2: `frontend/src/components/project/TaskRegistrationTab.tsx` handleSave修正
- [x] TypeScript型チェック（tsc --noEmit）: バックエンド・フロントエンドともにエラーなし
