# タスク計画書: 実験記録タブ終了ボタン自動遷移防止

## メタデータ
- **作成日時**: 2026-08-28
- **タスクID**: 20260828_実験記録タブ終了ボタン自動遷移防止
- **優先度**: 高
- **推定工数**: 2時間

---

## 1. タスク概要

実験記録タブで「終了」または「異常終了」ボタンを押下すると、自動的に次のタスク/トランジションへ
画面が移動してしまう不具合を修正する。

### 正しいフロー

```
① 終了 or 異常終了ボタン押下
    → onEnd()/onForceEnd() → updateTransitionStatus(COMPLETED/ERROR) を実行（既存挙動を維持）
    → 画面は現在のトランジションにロック（自動遷移しない）

② 保存ボタン押下
    → saveBatchExperimentData() で実験データを保存
    → isDirty フラグをリセット

③ 次へボタン押下
    ③-1. プロパティカードが編集中（未保存）の場合 → 未保存警告ダイアログを表示
           「進む」→ 画面遷移、「キャンセル」→ 中断
    ③-2. 未編集または警告確認後 → setPendingEndKey(null) → activeEntry が次のトランジションを指す → 画面遷移
```

### Do Not
- UI（ボタン配置・ラベル）は変更しない
- MaiML ファイルへの保存は実験記録タブ内では行わない

---

## 2. 原因分析

### 問題の根本原因

```
[現状のフロー]
終了ボタン押下
  → onClick={onEnd} が即座に発火
  → ExperimentWorkerMenu の onEnd:
      updateTransitionStatus(COMPLETED) + reloadProgressRows()
  → progressRows 更新
  → PlanB 内の activeEntry が useMemo で再計算
      (in_progress のトランジションがなくなるため次のトランジションを返す)
  → displayKey = viewingKey ?? activeEntry が自動更新
  → 画面が次のトランジションへ自動移動 ❌
```

### 修正方針

`pendingEndKey` state を追加し、終了/異常終了ボタン押下時に現在の `displayKey` をロックする。
`progressRows` が更新されても `displayKey = viewingKey ?? pendingEndKey ?? activeEntry` により
画面は `pendingEndKey` に固定される。「次へ」ボタン押下時に `pendingEndKey` をクリアして初めて遷移する。

---

## 3. 目的と期待される成果

- [x] 終了/異常終了ボタン押下後、画面が自動遷移しなくなる
- [x] 保存ボタン押下で実験データが保存される（既存挙動を維持）
- [x] 次へボタン押下で次のトランジションへ移動する
- [x] プロパティカード編集後・未保存で次へを押すと警告ダイアログが表示される
- [x] TypeScript コンパイルエラーなし

---

## 4. 実装ステップ

### Step 1: `PlanProps` インターフェースに新フィールド追加

```typescript
// WorkRecordPanel.tsx - interface PlanProps に追加
/** End/ForceEnd 押下後のビューロックキー */
pendingEndKey?: { taskNo: number; transitionId: string } | null;
/** pendingEndKey を設定するコールバック */
onSetPendingEndKey?: (key: { taskNo: number; transitionId: string }) => void;
```

### Step 2: `PlanB` コンポーネントの修正

2-1. `PlanProps` から `pendingEndKey`, `onSetPendingEndKey` を受け取る

2-2. `displayKey` 計算を修正
```typescript
// 変更前
const displayKey = viewingKey ?? activeEntry;
// 変更後
const displayKey = viewingKey ?? pendingEndKey ?? activeEntry;
```

2-3. `WorkHeader` の `onEnd` / `onForceEnd` をラップ
```typescript
// 終了/異常終了押下時: まず pendingEndKey をセット、次に既存コールバックを呼ぶ
onEnd={displayKey ? () => { onSetPendingEndKey?.(displayKey); onEnd?.(); } : undefined}
onForceEnd={displayKey ? () => { onSetPendingEndKey?.(displayKey); onForceEnd?.(); } : undefined}
```

2-4. 「次へ」ボタン（`handleSaveAndNextInner`）に `pendingEndKey` リセットを追加
```typescript
const handleSaveAndNextInner = () => {
  const nextTemplateIdx = safeIdx + 1;
  if (nextTemplateIdx < visibleTemplates.length) {
    setSelectedTemplateId(visibleTemplates[nextTemplateIdx]?.id ?? null);
  } else {
    onSaveAndNext(displayKey.taskNo, displayKey.transitionId);
  }
};
// → onSaveAndNext 内で pendingEndKey をリセットする
```

### Step 3: `WorkRecordPanel` 本体に state 追加

```typescript
// pendingEndKey: 終了/異常終了押下後に画面をロックするキー
const [pendingEndKey, setPendingEndKey] =
  useState<{ taskNo: number; transitionId: string } | null>(null);

// isDirty: プロパティカード編集後・保存前 = true
const [isDirty, setIsDirty] = useState(false);
```

### Step 4: `handleActualChange` に `setIsDirty(true)` 追加

### Step 5: `handleSave` に `setIsDirty(false)` 追加

### Step 6: `handleSaveAndNext` の修正
- 先頭に未保存チェック（`isDirty === true` なら `Modal.confirm`）を追加
- 処理完了後に `setPendingEndKey(null)` と `setIsDirty(false)` を追加

### Step 7: `pendingEndKey` / `viewingKey` 変更時に `isDirty` をリセット

```typescript
useEffect(() => {
  setIsDirty(false);
}, [pendingEndKey, viewingKey]);
```

### Step 8: `planProps` に新フィールドを追加

```typescript
pendingEndKey,
onSetPendingEndKey: (key) => setPendingEndKey(key),
```

### Step 9: i18n ファイルへメッセージキー追加

- `ja.json` / `en.json` の `workRecord` セクションに未保存警告用キーを追加

---

## 5. 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | pendingEndKey/isDirty state 追加、自動遷移防止ロジック |
| 2 | `frontend/src/locales/ja.json` | 修正 | 未保存警告メッセージキー追加 |
| 3 | `frontend/src/locales/en.json` | 修正 | 未保存警告メッセージキー追加 |

---

## 6. 影響範囲

- 実験記録タブ（`ExperimentWorkerMenu.tsx` > `WorkRecordPanel.tsx` > `PlanB`）のみ
- `ExperimentWorkerMenu.tsx` の `onEnd`/`onForceEnd` コールバック実装は変更なし
- バックエンドの変更なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `pendingEndKey` が残り続けてロックが解除されない | 中 | 低 | `viewingKey` 変更時・`handleSaveAndNext` 完了時に必ずリセット |
| `PlanA` コンポーネントへの影響 | 低 | 低 | `PlanA` は `planProps` を受け取っておらず、`PlanB` のみ使用中のため影響なし |

---

## 8. テスト計画

### 手動テスト
- [ ] 終了ボタン押下後、画面が現在のトランジションに留まること
- [ ] 異常終了ボタン押下後、画面が現在のトランジションに留まること
- [ ] 保存ボタン押下で保存成功メッセージが出ること
- [ ] 次へボタン押下で次のトランジションへ移動すること
- [ ] プロパティ編集後・未保存で次へを押すと警告ダイアログが出ること
- [ ] 警告ダイアログで「キャンセル」を押すと画面遷移しないこと
- [ ] 警告ダイアログで「進む」を押すと次のトランジションへ移動すること

### TypeScript チェック
- [ ] `tsc --noEmit` でエラーなし

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-28
- **承認日時**: 2026-08-28（Act モード切り替えにより承認）
- **承認者コメント**: 終了ボタン押下時に onEnd() 呼び出し → updateTransitionStatus(COMPLETED) は維持すること
