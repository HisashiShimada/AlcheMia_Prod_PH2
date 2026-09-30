# タスク計画書: WorkRecordPanel 同名トランジション複合キー修正

## メタデータ
- **作成日時**: 2026-09-30 15:00
- **タスクID**: WorkRecordPanel同名トランジション複合キー修正
- **優先度**: 高
- **推定工数**: 1.5時間

---

## タスク概要

`WorkRecordPanel.tsx` に2件の不具合がある。

### 不具合1: `findNextAvailableTransitionFromRows` の `isAvailable` が `transitionId` のみで現在行を除外

**再現条件**: 複数タスクで同一 `transitionId` を持つ `ProgressRow` が存在する場合  
**症状**: 「保存して次へ」ボタンが押せない（`hasNextTransition` が `false` になる）  
**原因**:

```typescript
// 現状コード（L1545, L1549）
const currentIdx = sorted.findIndex((r) => r.transitionId === currentTransitionId);

const isAvailable = (r: ProgressRow): boolean => {
  if (r.transitionId === currentTransitionId) return false; // ← taskNo を見ていない
  ...
};
```

`transitionId` のみで「現在のトランジション」を判定するため、異なる `taskNo` の同名トランジションも除外対象になってしまう。

### 不具合2: `ProgressOverviewTab` 記録ボタン遷移時に前回の入力値が残る

**再現条件**: タスクNoが異なる同一 `transitionId` のトランジションを記録ボタンで順に開く  
**症状**: 前のタスクNoで入力した `actuals`（実績値）がそのまま表示される  
**原因**:

`buildTransitions` の `useEffect` は `[projectId, progressRows]` を依存配列としており、`initialTaskNo/initialTransitionId` の変化では再実行されない。  
`tasks` state の `actuals` は `mapKey = ${taskNo}__${transitionId}` で一意管理されているが、`viewingKey` を更新する `useEffect` で `tasks` の `actuals` をリセットしていない。

---

## 目的と期待される成果

- [ ] タスクNoが異なる同一 `transitionId` でも「次へ」ボタンが正しく活性化される
- [ ] タスクNoが異なる同一 `transitionId` に遷移したとき、前のタスクの入力値が表示されない
- [ ] `skippedTransitionIds` も複合キー（`${taskNo}__${transitionId}`）で管理し、スキップ対象が正確になる

---

## 実装ステップ

### Step 1: `findNextAvailableTransitionFromRows` を複合キー対応に変更

**変更対象**: L1536〜1570

- 関数シグネチャを `currentTransitionId: string` → `current: { taskNo: number; transitionId: string }` に変更
- `currentIdx` の `findIndex` を `r.taskNo === current.taskNo && r.transitionId === current.transitionId` に変更
- `isAvailable` の除外条件を同様に複合比較に変更
- `skippedIds` の型も `string[]`（`transitionId` 単体）から `string[]`（`${taskNo}__${transitionId}` 複合キー）に変更し、`skippedIds.includes(r.transitionId)` → `skippedIds.includes(`${r.taskNo}__${r.transitionId}`)` に変更

### Step 2: 呼び出し元を新シグネチャに対応

以下の呼び出し箇所（4箇所）を修正する。

| 行番号 | 場所 | 変更内容 |
|--------|------|---------|
| L1927 | `hasNextTransition`（ボタン活性判定） | `displayKey.transitionId` → `displayKey`（オブジェクト）を渡す |
| L2156 | `canSkip`（スキップ活性判定） | 同上 |
| L3241 | `handleSaveAndNext` 内 | `transitionId` → `{ taskNo, transitionId }` を渡す |
| L3259 | `handleSkip` 内 | `transitionId` → `{ taskNo, transitionId }` を渡す |

### Step 3: `skippedTransitionIds` を複合キー管理に変更

**変更対象**: `skippedTransitionIds` state・`handleSkip`・`handleSaveAndNext`

- `skippedTransitionIds: string[]` は引き続き `string[]` だが、格納値を `${taskNo}__${transitionId}` 形式の複合キーに変更
- `handleSkip` 内でリストへ追加する値を `transitionId` → `` `${taskNo}__${transitionId}` `` に変更
- `handleSaveAndNext` 内で `findNextAvailableTransitionFromRows` に渡す `skippedIds` も複合キー形式を引き続き使用（Step 1 と整合）
- `canSkip` の `findNextAvailableTransitionFromRows` 呼び出しも複合キー渡しに対応済み（Step 2 で対応）

### Step 4: `viewingKey` 更新時に対象トランジションの `actuals` をリセット

**変更対象**: L2622〜2626（`initialTaskNo/initialTransitionId` 監視の `useEffect`）

`viewingKey` をセットするタイミングで、`tasks` state から対象 `taskNo + transitionId` の `actuals` を **API取得済みの実績値** でリセットする。

具体的には以下の処理を追加：

```typescript
// initialTaskNo/initialTransitionId の useEffect 内に追加
if (initialTaskNo !== undefined && initialTransitionId !== undefined) {
  const mapKey = `${initialTaskNo}__${initialTransitionId}`;
  const freshActuals = rawTemplateItemsRef からAPIの実績値を再構築;
  setTasks((prev) =>
    prev.map((task) => {
      if (task.taskNo !== initialTaskNo) return task;
      return {
        ...task,
        transitions: task.transitions.map((tt) => {
          if (tt.transitionId !== initialTransitionId) return tt;
          return { ...tt, actuals: freshActuals };
        }),
      };
    })
  );
  setViewingKey({ taskNo: initialTaskNo, transitionId: initialTransitionId, methodId: initialMethodId ?? methodId });
}
```

`rawTemplateItemsRef` から `mapKey` で取得した `TemplateDataItem[]` を用いて `actuals` を再構築する処理は、`buildTransitions` 内の既存ロジックを参考に切り出したヘルパー関数として実装する。

---

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `findNextAvailableTransitionFromRows`: シグネチャ変更・複合キー対応（Step 1）
   - 呼び出し4箇所: 新シグネチャ対応（Step 2）
   - `skippedTransitionIds`: 複合キー格納に変更（Step 3）
   - `initialTaskNo/initialTransitionId` の `useEffect`: actuals リセット追加（Step 4）

---

## 影響範囲

- `WorkRecordPanel.tsx` 内のみ（外部 Props のシグネチャ変更なし）
- TypeScript 型変更なし（`skippedTransitionIds: string[]` の型自体は変わらない）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `rawTemplateItemsRef` に対象 `mapKey` のデータがない場合 | 中 | 低 | `?? {}` フォールバックで空 actuals をセット |
| `handleSkip` のスキップリストが複合キーになることで既存ロジックに影響 | 低 | 低 | `findNextAvailableTransitionFromRows` の `skippedIds` チェックも同時修正するため整合性あり |
| TypeScript ビルドエラー | 中 | 中 | 修正後に `tsc --noEmit` で確認 |

---

## テスト計画

- [ ] タスクNo違い・同一 `transitionId` のトランジションが複数ある状態で「次へ」ボタンが活性化されること
- [ ] ProgressOverviewTab の記録ボタンで別タスクNoの同一 `transitionId` に遷移したとき、前の入力値が表示されないこと
- [ ] 片方のタスクをスキップしても、別タスクの同名トランジションはスキップ対象にならないこと
- [ ] `tsc --noEmit` でビルドエラーなし

---

## 承認記録

- **計画書提示日時**: 2026-09-30 15:00
- **承認日時**: 2026-09-30（ユーザー指示「ファイルに起こしてから修正を実行してください」により承認済みとみなす）
- **承認者コメント**: 計画内容を確認のうえ実行を指示

---

## 追加不具合（動作確認で発覚）

### 追加不具合1: 記録ボタン押下時に初期値（想定値）が消える

**原因**: Step 4 で追加した `freshActuals` 再構築ロジックが `item.recordedBy !== null`（DB実績あり）のケースしか処理していない。  
DB未記録（`recordedBy === null`）の場合、`expected`（想定値）を補完する処理が抜けていた。  
`rawTemplateItemsRef` には `TemplateDataItem[]`（生データ）しかなく、`expected`（`plannedValue` → `convertRawProperty` 経由で解決済み）は `WorkProperty` にしか存在しないため、`rawItems` だけでは補完できない。

**修正方針**: DB未記録の場合は `item.data.properties` 配列から各プロパティの `plannedValue` を直接読み取って `freshActuals` に追加する。これは `convertRawProperty` が行う変換（`expected: p.plannedValue`）と等価。

### 追加不具合2: 確信度が引き継がれる

**原因**: `confidenceValuesRef` / `uncertaintyValuesRef` はコンポーネント全体で保持される Ref であり、`initialTaskNo/initialTransitionId` が変化しても**クリアされていない**。  
テンプレートIDがタスクNo違いで同一の場合、`onGetInitialConfidence` が前タスクの確信度を返してしまう。

**修正方針**: `initialTaskNo/initialTransitionId` の `useEffect`（Step 4 修正箇所）内で、対象 `taskNo + transitionId` に対応するテンプレートID群のエントリを `confidenceValuesRef` / `uncertaintyValuesRef` から削除する。  
`rawTemplateItemsRef` から対象 `mapKey` の `TemplateDataItem[]` を取得し、各 `item.templateId` / `item.placeId` に対応するキーを削除する。

---

## 実施記録

### 実施日時
開始: 2026-09-30 15:00
完了: 進行中（追加不具合対応中）

### 計画からの変更点
- `makeSkipKey` ヘルパー関数を `findNextAvailableTransitionFromRows` の直前に追加（計画書では言及なかったが、可読性のため関数として切り出した）
- Step 4 の `freshActuals` 再構築ロジックに DB未記録時の `plannedValue` 補完を追加（追加不具合1対応）
- Step 4 に `confidenceValuesRef` / `uncertaintyValuesRef` の対象エントリクリアを追加（追加不具合2対応）

### 発生した問題と解決方法
- 動作確認で追加不具合2件を発見 → 追加修正実施

### 最終的な成果物
- [x] Step 1: `findNextAvailableTransitionFromRows` 複合キー対応（L1544〜1581）
- [x] Step 2: 呼び出し4箇所を新シグネチャ対応（L1939, L2168, L3284, L3305）
- [x] Step 3: `skippedTransitionIds` 複合キー格納対応（L3296〜3305）
- [x] Step 4: `viewingKey` 更新時の `actuals` リセット（L2636〜2715）
- [x] Step 4 追加: DB未記録時の `plannedValue` 補完追加（追加不具合1対応）
- [x] Step 4 追加: `confidenceValuesRef` / `uncertaintyValuesRef` クリア追加（追加不具合2対応）
- [x] `tsc --noEmit` ビルドエラーなし確認（EXIT_CODE=0）
