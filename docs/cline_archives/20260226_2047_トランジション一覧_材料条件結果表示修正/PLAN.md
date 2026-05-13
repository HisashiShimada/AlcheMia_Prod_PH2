# タスク計画書: トランジション一覧 材料・条件・結果表示修正

## メタデータ
- **作成日時**: 2026-02-26 20:47
- **タスクID**: トランジション一覧_材料条件結果表示修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

トランジション一覧（`TransitionList.tsx`）の「材料」「条件」「結果」列が「-」と表示される問題を修正する。

バックエンドAPIは `api_progress_monitoring.md` v1.4.2 の新仕様（`material_count` / `material_actual_count` 等6フィールド）に既に対応済みのため、フロントエンドのマッピング処理のみを修正する。

## 目的と期待される成果

### 目的
- `ExperimentRecordTab.tsx` の `transitionsWithProgress` useMemo が APIレスポンスの新フィールドをマッピングせず `total*Count` が `undefined` のままになっているため、`TransitionList.tsx` が `total === 0` と判定して「-」を表示している問題を解消する

### 期待される成果
- [ ] トランジション一覧の「材料」列に `材料実績数/材料定義数`（例: `2/3`）が表示される
- [ ] トランジション一覧の「条件」列に `条件実績数/条件定義数`（例: `1/2`）が表示される
- [ ] トランジション一覧の「結果」列に `結果実績数/結果定義数`（例: `0/1`）が表示される
- [ ] 定義数が0のトランジションは引き続き「-」が表示される（仕様通り）

## 問題の詳細

### 原因

`ExperimentRecordTab.tsx`（約330行目）の `transitionsWithProgress` useMemo:

```typescript
// 修正前（TODO状態）
const transitionsWithProgress = useMemo(() => {
  return progressData.map(progress => ({
    transitionId: progress.transition_id as string,
    transitionName: (progress.transition_name as string) ?? '',
    status: ((progress.status as string) || 'not_started') as ProgressStatus,
    progressRate: (progress.progress as number) ?? 0,
    inputMaterialsCount: 0,    // ← ハードコード0（TODO）
    inputIngredientsCount: 0,  // ← ハードコード0（TODO）
    inputResultsCount: 0,      // ← ハードコード0（TODO）
    // totalMaterialsCount    → 未設定 = undefined → ?? 0 = 0 → 「-」表示
    // totalIngredientsCount  → 未設定 = undefined → ?? 0 = 0 → 「-」表示
    // totalResultsCount      → 未設定 = undefined → ?? 0 = 0 → 「-」表示
  }));
}, [progressData]);
```

### APIレスポンスとフロントエンド型のフィールド対応

| フロントエンド（`Transition`型） | APIレスポンスフィールド | 意味 |
|-------------------------------|----------------------|------|
| `totalMaterialsCount` | `material_count` | MAIMLから取得した材料の定義数 |
| `inputMaterialsCount` | `material_actual_count` | DBから取得した材料の実績数 |
| `totalIngredientsCount` | `condition_count` | MAIMLから取得した条件の定義数 |
| `inputIngredientsCount` | `condition_actual_count` | DBから取得した条件の実績数 |
| `totalResultsCount` | `result_count` | MAIMLから取得した結果の定義数 |
| `inputResultsCount` | `result_actual_count` | DBから取得した結果の実績数 |

## 実装ステップ

- [x] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` の `transitionsWithProgress` useMemo を修正
  - `inputMaterialsCount`: `progress.material_actual_count` からマッピング
  - `totalMaterialsCount`: `progress.material_count` からマッピング
  - `inputIngredientsCount`: `progress.condition_actual_count` からマッピング
  - `totalIngredientsCount`: `progress.condition_count` からマッピング
  - `inputResultsCount`: `progress.result_actual_count` からマッピング
  - `totalResultsCount`: `progress.result_count` からマッピング

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - `transitionsWithProgress` useMemo の修正

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| APIが旧実装のままで `material_count` 等を返さない場合 | 低 | `?? 0` フォールバックを維持するため「-」表示のまま（現状維持） |

## 承認記録
- **計画書提示日時**: 2026-02-26 20:47
- **承認日時**: 2026-02-26 20:47（ユーザー承認済み）

## 実施記録

### 実施日時
開始: 2026-02-26 20:47
完了: 2026-02-26 20:49

### 計画からの変更点
なし

### 最終的な成果物
- [x] `ExperimentRecordTab.tsx` 修正完了
