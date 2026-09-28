# タスク計画書: buildTransitions の getTemplateData 呼び出し時メソッドID修正

## メタデータ

- **作成日時**: 2026-09-28 10:00
- **タスクID**: 20260928_1000_buildTransitionsメソッドID修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

`WorkRecordPanel.tsx` の `buildTransitions`（2416行目付近）において、
`getTemplateData` を呼び出す際に使用している `methodId` が、
`ExperimentWorkerMenu.tsx`（590行目）から props として渡された
`progressRows[0].methodId`（先頭行のメソッドID固定値）になっている。

`progressRows` 内に複数のメソッドIDが含まれる場合、
各 `row.transitionId` に対応すべき `methodId` が先頭行のものに固定されてしまうため、
`getTemplateData` の引数（`projectId`, `methodId`, `taskNo`, `transitionId`）の組み合わせがずれ、
正常にテンプレートデータを取得できない。

---

## 問題の詳細分析

### 現状の問題箇所

#### ExperimentWorkerMenu.tsx（590行目）
```tsx
methodId={progressRows[0]?.methodId ?? ''}
```
`WorkRecordPanel` の `methodId` prop は常に先頭行のメソッドIDが渡される。

#### WorkRecordPanel.tsx（2432〜2436行目）
```tsx
const templateDataRes = await getTemplateData(
  projectId,
  methodId,       // ← props から受け取った先頭行固定のメソッドID
  row.taskNo,
  row.transitionId
);
```
`progressRows` をループして各行の `transitionId` / `taskNo` を使うが、
`methodId` は各行ではなく props の固定値を使っている。

### 正しい動作

各 `progressRow` は `row.methodId` を持っているため、
`getTemplateData` 呼び出し時の `methodId` は **`row.methodId`** を使用すべき。

### 影響範囲の調査

`WorkRecordPanel.tsx` 内で props の `methodId` を使用している箇所を確認し、
同様に `progressRow.methodId` や `viewingKey.methodId` に置き換えるべき箇所を特定する。

| 行番号 | 使用箇所 | 修正要否 |
|--------|----------|----------|
| 2410 | `useEffect` の条件ガード `!methodId` | **要修正**：`progressRows` が空でないかのガードは残すが、`methodId` prop に依存しない形に変更 |
| 2432〜2436 | `getTemplateData` 呼び出し | **要修正**：`methodId` → `row.methodId` |
| 2601 | `useEffect` の依存配列 `[projectId, methodId, progressRows]` | **要修正**：`methodId` prop への依存を削除 |
| 2992 | `handleSave` 内の早期リターン条件 `!methodId` | **保留**：`progressRows` からメソッドIDを取得する方式のため、直接の `methodId` チェックは不要になるが、後続の `saveMethodId` 解決ロジックで既に対応済みのため現状維持も可 |
| 3505〜3516 | `handleSaveComment` での `saveTransitionComment` 呼び出し | **確認要**：現状の `methodId` は固定。`viewingKey.methodId` が利用可能であれば置き換え |

---

## 目的と期待される成果

- [ ] `progressRows` 内の各行が持つ `row.methodId` を `getTemplateData` 呼び出し時に正しく使用する
- [ ] 複数メソッドIDを持つプロジェクトでも各トランジションのテンプレートデータが正常に取得できる
- [ ] `viewingKey` に設定されたメソッドIDが同プロパティを使用している他の処理でも正しく利用される

---

## 実装ステップ

### Step 1: `buildTransitions` の `getTemplateData` 呼び出し修正

**対象**: `WorkRecordPanel.tsx` 2432〜2437行目

```tsx
// 修正前
const templateDataRes = await getTemplateData(
  projectId,
  methodId,        // props の固定メソッドID（問題箇所）
  row.taskNo,
  row.transitionId
);

// 修正後
const templateDataRes = await getTemplateData(
  projectId,
  row.methodId,    // progressRow ごとの正しいメソッドID
  row.taskNo,
  row.transitionId
);
```

### Step 2: `useEffect` の条件ガードと依存配列修正

**対象**: `WorkRecordPanel.tsx` 2409〜2413行目 と 2601行目

```tsx
// 修正前（2410行目）
if (!projectId || !methodId || !progressRows || progressRows.length === 0) {

// 修正後
// methodId prop は使わず、progressRows の内容から判断する
if (!projectId || !progressRows || progressRows.length === 0) {
```

```tsx
// 修正前（2601行目）の依存配列
}, [projectId, methodId, progressRows]);

// 修正後
}, [projectId, progressRows]);
```

※ `methodId` を依存配列から除去することで、`progressRows` が更新されたときのみ再実行される。

### Step 3: `handleSaveComment` のメソッドID修正

**対象**: `WorkRecordPanel.tsx` 3505〜3516行目

`saveTransitionComment` に渡す `methodId` を、
現在表示中の `viewingKey?.methodId` または `displayKey?.methodId` から取得する。

```tsx
// 修正前
if (!projectId || !methodId) {
  console.warn('[WorkRecordPanel] コメント保存: projectId / methodId が未設定');
  return;
}
// ...
await saveTransitionComment(
  projectId,
  methodId,          // props の固定メソッドID（問題）
  transitionId,
  commentRequest
);

// 修正後
// 引数で受け取ったコメント対象の transitionId に対応するメソッドIDを progressRows から解決
const commentMethodId =
  progressRows?.find((r) => r.taskNo === taskNo && r.transitionId === transitionId)?.methodId ??
  methodId;
if (!projectId || !commentMethodId) {
  console.warn('[WorkRecordPanel] コメント保存: projectId / methodId が未設定');
  return;
}
// ...
await saveTransitionComment(
  projectId,
  commentMethodId,   // progressRow から解決した正しいメソッドID
  transitionId,
  commentRequest
);
```

また `useCallback` の依存配列に `progressRows` を追加する。

---

## 影響範囲

### 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - 2410行目: `useEffect` 条件ガードから `!methodId` を削除
   - 2432〜2436行目: `getTemplateData` の第2引数を `methodId` → `row.methodId` に変更
   - 2601行目: `useEffect` 依存配列から `methodId` を削除
   - 3505〜3516行目: `handleSaveComment` の `methodId` を `progressRows` から解決するよう変更
   - 3524行目: `useCallback` 依存配列に `progressRows` を追加

### 非変更ファイル

- `ExperimentWorkerMenu.tsx`: `methodId={progressRows[0]?.methodId ?? ''}` は変更不要
  （`WorkRecordPanel` 内部で `progressRows` から正しく解決するため）
- `progress.ts` / 型定義ファイル: 変更不要

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `progressRows` が空の場合に `methodId` が取れなくなる | 低 | 低 | 既存の `progressRows.length === 0` ガードで保護済み。`handleSaveComment` では `?? methodId` フォールバックを残す |
| `methodId` prop に依存している他のロジックへの影響 | 中 | 低 | `handleSave`（3157〜3158行目）は既に `progressRows` から `saveMethodId` を解決しているため影響なし。`handleSaveCorrection`（2822〜2824行目）は `viewingKey.methodId ?? methodId` で解決済みのため影響なし |
| `useEffect` 依存配列の変更による副作用 | 低 | 低 | `methodId` は `progressRows[0].methodId` と同値のため、除外しても動作は変わらない |

---

## テスト計画

### 手動テスト

- [ ] 1メソッドのみのプロジェクトで、従来通りテンプレートデータが表示されること
- [ ] 複数メソッドが含まれるプロジェクトで、各トランジションに対応したテンプレートデータが正しく表示されること
- [ ] 「保存」ボタン押下後、正常に実験データが保存されること
- [ ] コメント保存が正常に動作すること（特に複数メソッドのプロジェクト）
- [ ] `ProgressOverviewTab` の「記録」ボタン押下後、対象トランジションのテンプレートが正しく表示されること

---

## 承認記録

- **計画書提示日時**: 2026-09-28 10:00
- **承認日時**: 2026-09-28 10:05
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-09-28 10:05
完了: 2026-09-28 10:10

### 変更内容

#### 1. `useEffect` 条件ガード修正（2410行目）
```diff
- if (!projectId || !methodId || !progressRows || progressRows.length === 0) {
+ if (!projectId || !progressRows || progressRows.length === 0) {
```
`progressRows` が揃っていれば各行の `row.methodId` から取得できるため、`!methodId` ガードを削除。

#### 2. `getTemplateData` 呼び出しのメソッドID修正（2434行目）
```diff
- methodId,
+ row.methodId,
```
各 `progressRow` が持つ正しい `methodId` を直接使用するよう修正。

#### 3. `useEffect` 依存配列修正（2601行目）
```diff
- }, [projectId, methodId, progressRows]);
+ }, [projectId, progressRows]);
```
`methodId` prop への依存を除去。`progressRows` から直接解決するため不要。

#### 4. `handleSaveComment` のメソッドID修正（3505〜3528行目）
```diff
+ const commentMethodId =
+   progressRows?.find((r) => r.taskNo === taskNo && r.transitionId === transitionId)?.methodId ??
+   methodId;
- if (!projectId || !methodId) {
+ if (!projectId || !commentMethodId) {
  ...
- await saveTransitionComment(projectId, methodId, transitionId, commentRequest);
+ await saveTransitionComment(projectId, commentMethodId, transitionId, commentRequest);
  ...
- }, [projectId, methodId, t]);
+ }, [projectId, methodId, progressRows, t]);
```
コメント保存時も `progressRows` から対象行の `methodId` を解決（フォールバックとして props の `methodId` を維持）。

### 最終的な成果物
- [x] Step 1: `getTemplateData` 第2引数を `row.methodId` に修正 - 完了
- [x] Step 2: `useEffect` 条件ガード・依存配列から `methodId` prop 依存を削除 - 完了
- [x] Step 3: `handleSaveComment` のメソッドID解決を `progressRows` ベースに変更 - 完了
- [x] TypeScript ビルドチェック（`tsc --noEmit`）: エラーなし
