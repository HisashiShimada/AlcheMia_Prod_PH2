# WorkRecordPanel ボタン制御 問題レポート

作成日: 2026-09-09  
対象ファイル: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

---

## 問題① `completed + isRecorded=false` で保存ボタンが表示される

### 現象

終了済み（`status=completed`）かつ未保存（`isRecorded=false`）のトランジションが `displayKey` になった場合に、保存 / 次へ / コメント ボタンが表示されて編集・保存が可能な状態になる。

### 原因

現在の `isReadOnly` 判定式（`WorkRecordPanel.tsx` L3315）：

```ts
const isReadOnly =
  displayKeyRow?.isRecorded === true && (isErrorStatus || !isCorrectionMode);
```

`isRecorded=false` のとき `isReadOnly=false`（編集可）になる。  
記録（`isRecorded`）とステータス遷移（`status`）は独立しているため、**終了操作だけ行って保存をしていない状態は実運用で発生しうる**。

### 発生経路

通常の `activeEntry` は `in_progress / ready / preparing` のみを選ぶため、`completed` なトランジションは自動的に displayKey に選ばれない。ただし以下の経路では発生する。

| 経路 | 発生条件 | 具体的なシナリオ |
|------|----------|-----------------|
| `pendingEndKey` | 終了ボタン押下直後（progressRows 更新前のロック） | 「終了」を押した後、保存せず「次へ」に進んだ場合 |
| `viewingKey` | 全体進捗タブの「詳細確認」から遷移 | 別タブから完了済み・未保存のトランジションを開いた場合 |

### 仕様判断が必要な選択肢

**A) 現状維持（`completed` でも保存・再保存を許容する）**  
- 実装変更なし  
- 「終了後でも記録を補完・修正できる」という運用を許容する設計

**B) `completed` 時は `isRecorded` に関わらず `isReadOnly=true` にする**  
- 変更箇所：`isReadOnly` 判定式に `status=completed` の条件を追加

```ts
// 変更前
const isReadOnly =
  displayKeyRow?.isRecorded === true && (isErrorStatus || !isCorrectionMode);

// 変更後（案）
const isCompleted = currentProgressRow?.status === 'completed';
const isReadOnly =
  (displayKeyRow?.isRecorded === true || isCompleted)
  && (isErrorStatus || !isCorrectionMode);
```

---

## 問題② 状態プルダウン（WorkHeader）が PlanB と未接続（デッドUI）

### 現象

`WorkHeader` コンポーネント内に状態プルダウン（`Select`）が表示されているが、選択操作をしても何も起きない。

### 原因

`WorkHeaderProps` に `onStatusChange?: (transitionId: string, status: TransitionStatus) => void` が定義されているが、`PlanB` コンポーネントから `WorkHeader` への `onStatusChange` 接続が行われていない。

```tsx
// WorkRecordPanel.tsx 内 PlanB → WorkHeader への Props 渡し
<WorkHeader
  ...
  onStatusChange={onStatusChange}  // PlanB 自身は onStatusChange を持つが
  ...
/>

// PlanB の Props（WorkRecordPanelProps から受け取る）
// → WorkRecordPanelProps に onStatusChange は存在しない
// → PlanB の onStatusChange は常に undefined のまま
```

`WorkRecordPanelProps` に `onStatusChange` が存在しないため、`ExperimentWorkerMenu` → `WorkRecordPanel` → `PlanB` → `WorkHeader` のルートが途切れている。

### 対応選択肢

**A) 状態プルダウンを削除する**  
- 「開始」「終了」「異常終了」ボタンで遷移操作を統一  
- `WorkHeader` から `statusSelectOptions` / `onStatusChange` / 関連 Props を除去  
- 実装がシンプルになる

**B) 状態プルダウンを正式に接続する**  
- `WorkRecordPanelProps` → `PlanProps` → `WorkHeaderProps` に `onStatusChange` を追加  
- `ExperimentWorkerMenu` 側でステータス更新 API を呼ぶハンドラーを実装して接続  
- 参照: `CONTROL_ANALYSIS.md §4`

---

## 対応優先度まとめ

| No. | 問題 | 優先度 | 必要なアクション |
|-----|------|--------|-----------------|
| ① | `completed+isRecorded=false` で保存ボタン表示 | 高 | A/B どちらの仕様にするか判断 → 実装 |
| ② | 状態プルダウン デッドUI | 中 | 削除 or 接続 どちらにするか判断 → 実装 |

---

## 参照ファイル

- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`（L3295〜L3315）
- `docs/tasks/20260904_0956_WorkRecordPanel整理/CONTROL_ANALYSIS.md`
- `docs/tasks/20260908_1500_WorkRecordPanelボタン活性調査/WorkRecordPanel_button_matrix.xlsx`
