# タスク計画書: 実験記録タブ トランジション一覧表示修正

## メタデータ
- **作成日時**: 2026-02-26 19:28
- **タスクID**: 実験記録タブ_トランジション一覧表示修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験記録タブでメソッド・タスクを選択済みの状態でも、トランジション一覧が表示されない不具合を修正する。

APIレスポンスには正しくトランジションデータが返っているにもかかわらず画面に表示されない。

## 目的と期待される成果

### 目的
`ExperimentRecordTab` でAPIから取得したトランジションデータを正しく画面に表示する。

### 期待される成果
- [ ] メソッドとタスクを選択した際に、トランジション一覧が正しく表示される
- [ ] 進捗ステータス（未着手・進行中・完了）が正しく表示される

## 根本原因の分析

### 原因1（主因）: `selectedMethod` が常に `null`

`ExperimentWorkerMenu.tsx` にて:

```typescript
// 選択されたメソッドを取得
// TODO: API化後、メソッド情報を取得するロジックを実装
const selectedMethod = null;  // ← 常にnull
```

この値が `ExperimentRecordTab` の `selectedMethod` prop に渡されるため、
`transitionsWithProgress` の useMemo が先頭で `return []` してしまう。

### 原因2（副因）: `selectedMethod.transitions` が常に空配列

仮に `selectedMethod` が null でなくても、`ExperimentRecordTab` 内のメソッドデータ取得時に:

```typescript
const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
    ...
    transitions: [],  // ← 常に空配列
}));
```

ワーカータスク取得API（`GET /api/v1/worker/tasks/:projectName`）はトランジション情報を返さないため、`transitions` は常に空配列。

### 原因3（結果）: `transitionsWithProgress` が空になる

```typescript
const transitionsWithProgress = useMemo(() => {
    if (!selectedMethod) {
      return [];  // ← selectedMethodがnullのため必ずここを通る
    }
    return selectedMethod.transitions.map(...);  // 仮に到達しても空配列
}, [selectedMethod, progressData]);
```

一方、進捗API（`GET /api/v1/progress/.../transitions`）は正しくトランジションデータを `progressData` に格納しているが、マッピングに使われていない。

### データフロー図

```
progressData（APIから正常取得済み ✅）
  ↓ マージしようとしているが...
selectedMethod.transitions（常に空配列 ❌） → transitionsWithProgress（常に空 ❌）
```

## 実装ステップ

### Step 1: `transitionsWithProgress` の修正

**ファイル**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

`transitionsWithProgress` の useMemo を `selectedMethod.transitions` 起点から **`progressData` 起点**に変更する。

**修正前**:
```typescript
const transitionsWithProgress = useMemo(() => {
    if (!selectedMethod) {
      return [];
    }
    return selectedMethod.transitions.map(transition => {
      const progress = progressData.find(p => p.transition_id === transition.transitionId);
      if (progress) {
        return {
          ...transition,
          status: ((progress.status as string) || 'not_started') as ProgressStatus,
          progressRate: (progress.progress as number) ?? 0,
          inputMaterialsCount: 0,
          inputIngredientsCount: 0,
          inputResultsCount: 0,
        };
      }
      return {
        ...transition,
        status: 'not_started' as const,
        progressRate: 0,
        inputMaterialsCount: 0,
        inputIngredientsCount: 0,
        inputResultsCount: 0
      };
    });
}, [selectedMethod, progressData]);
```

**修正後**:
```typescript
const transitionsWithProgress = useMemo(() => {
    if (!progressData || progressData.length === 0) {
      return [];
    }
    return progressData.map(progress => ({
      transitionId: progress.transition_id as string,
      transitionName: (progress.transition_name as string) ?? '',
      status: ((progress.status as string) || 'not_started') as ProgressStatus,
      progressRate: (progress.progress as number) ?? 0,
      inputMaterialsCount: 0,
      inputIngredientsCount: 0,
      inputResultsCount: 0,
    }));
}, [progressData]);
```

### Step 2: `selectedMethod` 依存の表示制御条件を確認・修正

`ExperimentRecordTab.tsx` の表示切り替えボタンが `selectedMethod` を条件に表示されているため、
`selectedMethodId` が選択されていれば表示されるよう条件を修正する。

**修正対象箇所**:
```typescript
{/* 表示切り替えボタン */}
{selectedProject && selectedMethod && (  // ← selectedMethodがnullなので非表示
```

**修正後**:
```typescript
{selectedProject && selectedMethodId && (
```

### Step 3: `TransitionList` への `transitions` 渡し確認

`TransitionList` に渡している `transitionsWithProgress` が正しく型を満たすか確認する。

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
   - `transitionsWithProgress` useMemo の修正（`progressData` 起点に変更）
   - 表示切り替えボタンの表示条件修正（`selectedMethod` → `selectedMethodId`）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `Transition` 型の必須フィールドが不足する | 中 | 中 | 型定義を確認して全フィールドを補完する |
| フロー図表示でも同様の問題が発生 | 低 | 低 | `transitionsWithProgress` を共通化しているため一括解消 |

## テスト計画

### 手動テスト
- [ ] プロジェクト → メソッド → タスクを選択し、トランジション一覧が表示されることを確認
- [ ] 進捗ステータスが「未着手」で表示されることを確認
- [ ] 表示切り替えボタン（リスト/フロー図）が表示されることを確認

## 承認記録

- **計画書提示日時**: 2026-02-26 19:28
- **承認日時**: 
- **承認者コメント**: 

## 実施記録

### 実施日時
開始: 
完了: 

### 最終的な成果物
- [ ] `ExperimentRecordTab.tsx` の修正完了
- [ ] トランジション一覧が正しく表示されることを確認
