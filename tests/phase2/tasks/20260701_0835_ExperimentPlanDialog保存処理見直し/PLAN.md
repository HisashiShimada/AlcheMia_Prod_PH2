# タスク計画書: ExperimentPlanDialog保存処理見直し

## メタデータ
- **作成日時**: 2026-07-01 08:35
- **タスクID**: ExperimentPlanDialog保存処理見直し
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

ExperimentPlanDialogのトランジション順序設定がtransition_dataテーブルに保存されない問題を解消する。

### 問題の整理

1. **現状**: ダイアログで保存を押すと`experiment_plan`テーブルのみ保存される
2. **問題**: トランジション順序（`work_order`, `prerequisite_transition_ids`）は`transition_data`テーブルに保存されるべきだが、`transition_data`は**タスク登録保存時**に作成される
3. **実行順序**: 実験計画指示 → タスク登録 の順
4. **根本原因**: `transition_data`の主キーに`task_no`が含まれるため、タスク未登録時には作成不可

### 採用した解決策（別案3）

`experiment_plan.planned_values`（JSONB）の`__meta__`キーに順序情報を埋め込み、タスク登録保存時にそれを読み取って`transition_data`を作成する。

```json
// experiment_plan.planned_values の構造
{
  "__meta__": {
    "transitionOrder": [
      { "id": "trans-001", "order": 1, "prerequisiteTransitionIds": [] },
      { "id": "trans-002", "order": 2, "prerequisiteTransitionIds": ["trans-001"] }
    ]
  },
  "trans-001": { "mgr-instruction:requiredCreatorUUID": ["uuid1"], ... },
  "trans-002": { ... }
}
```

---

## 目的と期待される成果

### 目的
- 実験計画ダイアログで設定したトランジション実行順序をtransition_dataテーブルに正しく保存する
- テーブル構造変更なし（マイグレーション不要）

### 期待される成果
- [ ] 実験計画ダイアログで保存すると`__meta__.transitionOrder`がplanned_valuesに埋め込まれる
- [ ] タスク登録保存時に`experiment_plan.__meta__`を読み取り、`transition_data`の`work_order`/`prerequisite_transition_ids`が正しく設定される
- [ ] 実験計画未保存の場合はwork_order=0, prerequisite_transition_ids='{}'（現状維持）で作成される

---

## 実装ステップ

### Phase 1: フロントエンド修正

#### `frontend/src/services/experimentPlanApiService.ts`

- [ ] `TransitionOrderEntry`型に`prerequisiteTransitionIds: string[]`フィールドを追加
- [ ] `upsertExperimentPlanToApi()`内で`transitionOrder`が存在する場合に`plannedValues.__meta__`を構築して送信

**変更箇所**: `upsertExperimentPlanToApi()`
```typescript
// transitionOrder が指定されている場合は __meta__ に埋め込む
if (transitionOrder && transitionOrder.length > 0) {
  (plannedValues as any).__meta__ = {
    transitionOrder: transitionOrder.map(item => ({
      id: item.id,
      order: item.order,
      prerequisiteTransitionIds: item.prerequisiteTransitionIds || []
    }))
  };
}
```

### Phase 2: フロントエンド修正（ExperimentPlanDialog）

#### `frontend/src/components/project/ExperimentPlanDialog.tsx`

- [ ] `handleSave()`内の`orderEntries`に`prerequisiteTransitionIds`を追加

**変更箇所**: `handleSave()`
```typescript
const orderEntries = transitionOrder.map((item) => ({
  id: item.id,
  order: item.order,
  prerequisiteTransitionIds: item.prerequisiteTransitionIds,  // 追加
}));
```

### Phase 3: バックエンド - transition_data/insert.sql 修正

#### `backend/src/sql/queries/transition_data/insert.sql`

- [ ] `work_order`と`prerequisite_transition_ids`カラムを追加
- [ ] パラメータを再整理（`status`/`progress_rate`を先に固定値にするか検討）

**現在のパラメータ構成**:
```
$1: organization_id, $2: project_id, $3: method_id, $4: task_no, $5: transition_id,
$6: status, $7: progress_rate, $8: create_user_id, $9: update_user_id
```

**変更後**:
```
$1: organization_id, $2: project_id, $3: method_id, $4: task_no, $5: transition_id,
$6: status, $7: progress_rate, $8: work_order, $9: prerequisite_transition_ids,
$10: create_user_id, $11: update_user_id
```

### Phase 4: バックエンド - TransitionDataRepository修正

#### `backend/src/repositories/transitionDataRepository.ts`

- [ ] `insert()`メソッドに`workOrder: number`と`prerequisiteTransitionIds: string[]`引数を追加（デフォルト値付き）

```typescript
async insert(
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  transitionId: string,
  userId: string,
  client: PoolClient,
  workOrder: number = 0,                        // 追加（デフォルト0）
  prerequisiteTransitionIds: string[] = []      // 追加（デフォルト空配列）
): Promise<void>
```

### Phase 5: バックエンド - experimentPlanRepository修正

#### `backend/src/repositories/experimentPlanRepository.ts`

- [ ] `findByMethodForTransaction()`メソッドを追加（トランザクション内で使用可能）

```typescript
/**
 * 指定メソッドの全タスク分の実験計画を取得（トランザクション内用）
 * タスク登録保存時に experiment_plan.__meta__ を読み取るために使用
 */
export async function findByMethodForTransaction(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<ExperimentPlan[]>
```

### Phase 6: バックエンド - taskRegistrationService修正

#### `backend/src/services/taskRegistrationService.ts`

- [ ] `deleteAndInsertTransitionData()`内で各メソッドの`experiment_plan`を取得
- [ ] `planned_values.__meta__.transitionOrder`から順序情報を抽出
- [ ] `transitionDataRepository.insert()`呼び出しに`workOrder`と`prerequisiteTransitionIds`を渡す

**変更箇所**: `deleteAndInsertTransitionData()`
```typescript
// 3. 各メソッドのexperiment_planから順序情報を取得
// methodId → (transitionId → { order, prerequisiteTransitionIds }) のマップ
const methodOrderMap = new Map<string, Map<string, {
  order: number;
  prerequisiteTransitionIds: string[];
}>>();

const processedMethods = new Set<string>();
for (const task of tasks) {
  if (processedMethods.has(task.methodId)) continue;
  processedMethods.add(task.methodId);

  const plans = await experimentPlanRepository.findByMethodForTransaction(
    client, organizationId, projectId, task.methodId
  );

  // 最初に見つかったplanの__meta__を使用（全タスク共通）
  for (const plan of plans) {
    if (!plan.planned_values) continue;
    const meta = (plan.planned_values as any).__meta__;
    if (meta && Array.isArray(meta.transitionOrder)) {
      const orderMap = new Map();
      for (const item of meta.transitionOrder) {
        orderMap.set(item.id, {
          order: item.order || 0,
          prerequisiteTransitionIds: item.prerequisiteTransitionIds || []
        });
      }
      methodOrderMap.set(task.methodId, orderMap);
      break; // 最初の1件で十分
    }
  }
}

// 4. INSERT（workOrder / prerequisiteTransitionIds を付与）
for (const task of tasks) {
  const transitionIds = methodTransitionMap.get(task.methodId) ?? [];
  const orderMap = methodOrderMap.get(task.methodId);

  for (let taskNo = 1; taskNo <= task.trialCount; taskNo++) {
    for (const transitionId of transitionIds) {
      const orderInfo = orderMap?.get(transitionId);
      await transitionDataRepository.insert(
        organizationId, projectId, task.methodId, taskNo, transitionId, userId, client,
        orderInfo?.order ?? 0,
        orderInfo?.prerequisiteTransitionIds ?? []
      );
    }
  }
}
```

### Phase 7: ビルドチェック

- [ ] バックエンド TypeScript コンパイルチェック（`npx tsc --noEmit`）
- [ ] フロントエンド TypeScript コンパイルチェック（`npx tsc --noEmit`）

---

## 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/services/experimentPlanApiService.ts` | 修正 | `TransitionOrderEntry`型に`prerequisiteTransitionIds`追加、`upsertExperimentPlanToApi()`に`__meta__`埋め込み処理追加 |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | 修正 | `handleSave()`の`orderEntries`に`prerequisiteTransitionIds`追加 |
| `backend/src/sql/queries/transition_data/insert.sql` | 修正 | `work_order`/`prerequisite_transition_ids`カラム・パラメータ追加 |
| `backend/src/repositories/transitionDataRepository.ts` | 修正 | `insert()`に`workOrder`/`prerequisiteTransitionIds`引数追加 |
| `backend/src/repositories/experimentPlanRepository.ts` | 修正 | `findByMethodForTransaction()`追加 |
| `backend/src/services/taskRegistrationService.ts` | 修正 | `deleteAndInsertTransitionData()`でexperiment_plan読み込み・順序情報反映 |

---

## 影響範囲

### 変更による影響
- `transitionDataRepository.insert()`: 引数追加（後方互換あり・デフォルト値付き）
- `insert.sql`: パラメータ増加 → **呼び出し箇所が複数ある場合は全て確認が必要**
  - `taskRegistrationService.deleteAndInsertTransitionData()` ← 修正対象
  - 他の呼び出し箇所がないか確認要

### 影響しない範囲
- `experiment_plan`テーブルのスキーマ（変更なし）
- `transition_data`テーブルのスキーマ（変更なし）
- タスク登録以外のtransition_data操作（updateStatus等は変更なし）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| insert.sqlのパラメータ変更による呼び出し箇所の漏れ | 高 | 低 | insert()呼び出し箇所を全件検索して確認 |
| experiment_plan未保存時のwork_order=0 | 低 | 中 | デフォルト値0で対応（現状維持） |
| __meta__キーがトランジションIDと衝突 | 中 | 低 | `__meta__`は通常のトランジションIDとして使用不可な文字を含むため衝突しない |
| タスク登録時のexperiment_plan取得による処理時間増加 | 低 | 低 | メソッド数×1回のクエリ追加のみ |

---

## テスト計画

### 手動テスト
- [ ] 実験計画ダイアログでトランジション順序を設定して保存
  - `experiment_plan.planned_values.__meta__.transitionOrder`に値が保存されること
- [ ] タスク登録保存を実行
  - `transition_data`の`work_order`/`prerequisite_transition_ids`が設定されること
- [ ] 実験計画未保存の状態でタスク登録保存を実行
  - `work_order=0`, `prerequisite_transition_ids='{}'`で作成されること（エラーにならない）

---

## 承認記録
- **計画書提示日時**: 2026-07-01 08:35
- **承認日時**: 2026-07-01 08:37
- **承認者コメント**: 承認済み（実装開始）

## 実施記録

### 実施日時
開始: 2026-07-01 08:37
完了: 2026-07-01 08:43

### 実施結果
- BE/FE ともに `tsc --noEmit` exit:0（型エラーなし）

### 変更内容サマリー
1. `experimentPlanApiService.ts`: `TransitionOrderEntry`に`prerequisiteTransitionIds`追加、`upsertExperimentPlanToApi()`に`__meta__`埋め込み処理追加
2. `ExperimentPlanDialog.tsx`: `handleSave()`の`orderEntries`に`prerequisiteTransitionIds`追加
3. `transition_data/insert.sql`: `work_order`($8)・`prerequisite_transition_ids`($9)パラメータ追加
4. `transitionDataRepository.ts`: `insert()`に`workOrder`/`prerequisiteTransitionIds`引数追加（デフォルト値付き）
5. `experimentPlanRepository.ts`: `findByMethodForTransaction()`追加（PoolClientを受け取りトランザクション内で使用可能）
6. `taskRegistrationService.ts`: `deleteAndInsertTransitionData()`に`experiment_plan.__meta__.transitionOrder`読み取り処理追加
