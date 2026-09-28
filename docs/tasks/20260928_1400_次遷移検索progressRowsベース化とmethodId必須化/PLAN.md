# PLAN: 次遷移検索 progressRows ベース化・methodId 必須化

## 日時
2026-09-28

## 問題

### 問題1: findNextAvailableTransition が WorkTask ベースで動作している
`findNextAvailableTransition` は `WorkTask[]` の `transitions` を走査して次のトランジションを探す。
しかし `WorkTask.transitions[].status` はローカル管理であり `progressRows` の実状態を直接反映しない。
また `taskNo` が固定のため、担当タスク以外のタスクに作業可能なトランジションがあっても遷移できない。
**正しくは `progressRows` 全体から作業可能なものを探す必要がある。**
この問題は「次へ」ボタン（handleSaveAndNext）にも同様に存在する。

### 問題2: WorkTransition.methodId が単一 Props.methodId で固定されている
`buildTransitions` の useEffect で `WorkTransition.methodId = methodId`（Props の単一値）を設定している。
複数メソッドが存在するプロジェクトでは各トランジションの正しい methodId が使われない。
`viewingKey` 型に `methodId` がないため、getTemplateData / saveBatchExperimentData 呼び出し時に
正しい methodId が解決できないケースが生じる。

### 問題3: ProgressOverviewTab の記録ボタンからの遷移で methodId が欠落
`onGoToWork(taskNo, transitionId)` のシグネチャに `methodId` がないため、
`ExperimentWorkerMenu → WorkRecordPanel` の `initialTransitionId` に対応する `initialMethodId` がなく
正しい methodId を特定できない。

### 問題4: WorkRecordPanelProps.methodId がオプションになっている
`methodId?: string` となっているが、API 呼び出しに必須であるため `methodId: string` に変更する。
ただし呼び出し元（ExperimentWorkerMenu）が progressRows から動的に解決しているため、
`progressRows[0]?.methodId` が空になりうる。

---

## 修正方針

### Step 1: `ProgressRow` ベースの次遷移検索関数を新設
既存の `findNextAvailableTransition`（WorkTask ベース）を **廃止・置換** し、
`progressRows` を単一の truth source とする `findNextAvailableTransitionFromRows` を実装する。

```typescript
function findNextAvailableTransitionFromRows(
  currentTransitionId: string,
  skippedIds: string[],
  progressRows: ProgressRow[]
): { taskNo: number; transitionId: string; methodId: string } | null
```

ロジック:
1. `progressRows` を `order` 昇順でソート
2. 現在の `currentTransitionId` のインデックスを取得
3. **後方検索**: `not_started / completed / issue` かつ `skippedIds` に含まれるものを除外
4. **循環前方検索**: 見つからない場合は先頭から現在インデックス未満を同条件で検索
5. 戻り値に `methodId` を含める（ProgressRow に `methodId` フィールドがあるため）

### Step 2: `viewingKey` 型に `methodId` を追加（必須フィールド）
```typescript
// 変更前
{ taskNo: number; transitionId: string }
// 変更後
{ taskNo: number; transitionId: string; methodId: string }
```
`pendingEndKey` も同型のため同様に変更。

### Step 3: `WorkRecordPanelProps.methodId` を必須化
```typescript
// 変更前
methodId?: string;
// 変更後
methodId: string;
```
`WorkRecordPanel` の関数シグネチャも対応して変更（デフォルト `= {}` を削除）。

### Step 4: `initialMethodId` Props を `WorkRecordPanelProps` に追加
```typescript
initialMethodId?: string;
```
`viewingKey` 初期化・useEffect で `initialMethodId` を含めてセット。

### Step 5: `activeEntry` に `methodId` を含める
```typescript
return { taskNo: activeRow.taskNo, transitionId: activeRow.transitionId, methodId: activeRow.methodId };
```

### Step 6: `handleSaveAndNext` / `handleSkip` を progressRows ベースに変更
- `findNextAvailableTransitionFromRows` を使用
- `handleSaveAndNext`: 次のトランジションが見つかった場合 `setViewingKey(next)` にセット
- `handleSkip`: 同様に `setViewingKey(next)` にセット（前回修正の延長）
- 戻り値の `methodId` を `viewingKey` にセット

### Step 7: `buildTransitions` で各トランジションの `methodId` を `progressRows` から取得
```typescript
// 変更前
methodId,
// 変更後
methodId: progressRows.find((r) => r.transitionId === transitionId)?.methodId ?? methodId,
```

### Step 8: `ProgressOverviewTabProps.onGoToWork` に `methodId` を追加（必須）
```typescript
// 変更前
onGoToWork: (taskNo: number, transitionId: string) => void;
// 変更後
onGoToWork: (taskNo: number, transitionId: string, methodId: string) => void;
```

### Step 9: `ProgressOverviewTab.tsx` の `onGoToWork` 呼び出し箇所に `r.methodId` / `item.methodId` を追加
- テーブル行の記録ボタン: `onGoToWork(r.taskNo, r.transitionId, r.methodId)`
- フロー図の記録ボタン: `onGoToWork(item.taskNo, t.transitionId, item.methodId)`

### Step 10: `ExperimentWorkerMenu.tsx` の State と Props 接続を更新
- `viewingWorkMethodId: string | null` State を追加
- `onGoToWork` ハンドラで `setViewingWorkMethodId(methodId)` を追加
- プロジェクト変更時に `setViewingWorkMethodId(null)` を追加
- `WorkRecordPanel` に `initialMethodId={viewingWorkMethodId ?? undefined}` を渡す
- `methodId` Props: `progressRows[0]?.methodId || undefined` → `progressRows[0]?.methodId ?? ''` に変更

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/progress.ts` | `ProgressOverviewTabProps.onGoToWork` に `methodId: string` 追加 |
| `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | `onGoToWork` 呼び出し2箇所に `methodId` 追加 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `viewingWorkMethodId` State 追加・`onGoToWork` ハンドラ更新・`WorkRecordPanel` Props 更新 |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 上記 Step 1〜7 すべて |

---

## 実装チェックポイント

- [x] Step 1: `findNextAvailableTransitionFromRows` 実装・旧関数の呼び出し箇所を置換
- [x] Step 2: `viewingKey` / `pendingEndKey` 型変更と影響箇所修正
- [x] Step 3: `WorkRecordPanelProps.methodId` 必須化
- [x] Step 4: `initialMethodId` Props 追加
- [x] Step 5: `activeEntry` に `methodId` 追加
- [x] Step 6: `handleSaveAndNext` / `handleSkip` 修正
- [x] Step 7: `buildTransitions` の `methodId` を progressRows から取得
- [x] Step 8: `ProgressOverviewTabProps.onGoToWork` シグネチャ変更
- [x] Step 9: `ProgressOverviewTab.tsx` 呼び出し箇所修正
- [x] Step 10: `ExperimentWorkerMenu.tsx` 修正
- [x] TypeScript ビルドエラーなし確認（tsc --noEmit exit:0）
