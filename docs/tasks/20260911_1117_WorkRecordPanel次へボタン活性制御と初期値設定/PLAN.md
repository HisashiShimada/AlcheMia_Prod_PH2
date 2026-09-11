# タスク計画書: WorkRecordPanel「次へ」ボタン活性制御と実績値初期値設定

## メタデータ

- **作成日時**: 2026-09-11 11:17
- **タスクID**: 20260911_1117
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## 1. タスク概要

WorkRecordPanel の「次へ」ボタンに関して、2つの問題を修正する。

### 問題A：「次へ」ボタンが次のトランジションなし・完了前でも活性（違和感）

現在「次へ」ボタンには `disabled` 制御が一切なく、以下の状態でも押せてしまう。

- 現在のトランジションが `completed`（終状態）になっていない
- `is_recorded` が `false`（まだ記録保存されていない）
- 次に移動可能なトランジションが存在しない

「次へ」ボタンの責務は **「次のトランジションをロードする」** ことであり、
上記条件を満たさない状態で押せるのは仕様上の不整合。

### 問題B：実績値欄が空で表示される（バグ）

仕様では **実績値の初期値 = 想定値（MAIML の `p.value`）** を設定することになっているが、
初回表示時（DB未記録状態）は `actuals = {}` のまま空欄表示になっている。

この未実装バグにより、全プロパティが空欄でも「保存」が押せて
1件でも records があれば `is_recorded = TRUE` になるため、問題Aの活性条件が崩れる。

### 解決の連鎖

```
①【バグ修正】実績値の初期値として想定値（p.value）を設定する
 ↓
②【連鎖】保存時に全プロパティに想定値 or ユーザー上書き値が入った状態で records が送られる
 ↓
③【整理】is_recorded = TRUE の意味が「全テンプレート分のレコードが保存済み」として機能する
 ↓
④【本来の修正】「次へ」ボタンの活性条件を正しく設定できる
```

---

## 2. 目的と期待される成果

- [ ] 実績値の初期値として想定値（MAIML の `p.value`）が表示される
- [ ] 「次へ」ボタンが `status === 'completed' && isRecorded === true && hasNextTransition` の場合のみ活性になる
- [ ] 非活性時に Tooltip で理由が表示される
- [ ] 設計書が正しい仕様を反映している

---

## 3. 実装ステップ

### STEP 1: バグ修正 — 実績値の初期値に想定値を設定

**対象**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`  
**変更箇所**: `buildTransitions` の `actualsFromApi` 取得ロジック（L2379〜2390付近）

```typescript
// 変更前
for (const item of templateDataRes.data.templates) {
  if (item.recordedBy !== null) {
    for (const [key, val] of Object.entries(item.data)) {
      if (key === 'templateId' || key === 'templateType' || key === 'properties') continue;
      actualsFromApi[key] = val as ActualValue;
    }
  }
  // DB未記録の場合は何もしない → 空欄表示（バグ）
}

// 変更後
for (const item of templateDataRes.data.templates) {
  if (item.recordedBy !== null) {
    // DB実績あり: DB の値を実績として取り込む（既存）
    for (const [key, val] of Object.entries(item.data)) {
      if (key === 'templateId' || key === 'templateType' || key === 'properties') continue;
      actualsFromApi[key] = val as ActualValue;
    }
  } else {
    // DB未記録: MAIML の想定値（p.value）を実績値の初期値として設定
    const properties = item.data.properties;
    if (Array.isArray(properties)) {
      for (const prop of properties as Array<Record<string, unknown>>) {
        const propKey = prop.key as string | undefined;
        const propValue = prop.value;
        if (propKey && propValue != null) {
          actualsFromApi[propKey] = propValue as ActualValue;
        }
      }
    }
  }
}
```

### STEP 2: 「次へ」ボタンの活性制御追加（PlanB コンポーネント）

**対象**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`  
**変更箇所**: PlanB の「次へ」ボタン周辺（L1848〜1908付近）

既存の `hasNextTransition` / `currentProgressRow` に加えて以下を追加する。

```typescript
const isCompleted = currentProgressRow?.status === 'completed';
const isRecordedFlag = currentProgressRow?.isRecorded === true;
const canGoNext = !isReadOnly && hasNextTransition && isCompleted && isRecordedFlag;
```

「次へ」ボタンを Tooltip でラップし `disabled={!canGoNext}` を追加。

### STEP 3: 「次へ」ボタンの活性制御追加（PropertyList コンポーネント）

**対象**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`  
**変更箇所**: PropertyList の「次へ」ボタン（L767〜781付近）

`PropertyList` に `canGoNext?: boolean` Props を追加する（optional、デフォルト false）。  
最後のテンプレート（`isLastTemplate`）のときのみ `disabled={!canGoNext}` を適用する。  
テンプレート間移動（次テンプレートへの移動）は常時活性のまま。  
呼び出し元（PlanB 内 `<PropertyList>`）から `canGoNext={canGoNext}` を渡す。

### STEP 4: handleSaveAndNext の責務整理

**対象**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`  
**変更箇所**: `handleSaveAndNext` callback（L2889〜3057付近）

- `saveBatchExperimentData` の呼び出しを削除（保存済みが活性条件の前提になるため不要）
- ローカルstateの `status: 'completed'` 更新を削除（DB変更は「終了」ボタンが担う）
- 完了後モーダル（「タスク完了」「すべて完了しました！」）を削除（DB変更なしで完了表示は誤解を招く）
- 残す処理: `setViewingKey(null)` / `setPendingEndKey(null)` / `setIsDirty(false)`

### STEP 5: i18n キー追加

**対象**: `frontend/src/locales/ja.json` / `frontend/src/locales/en.json`

`workRecord` セクションに以下を追加。

| キー | ja | en |
|------|----|----|
| `nextTooltipNotCompleted` | 「終了」ボタンでトランジションを完了させてください | Please complete the transition using the "End" button |
| `nextTooltipNotRecorded` | 先に「保存」ボタンで記録を保存してください | Please save the record using the "Save" button first |
| `nextTooltipNoNext` | 次のトランジションはありません | No next transition available |

### STEP 6: 設計書更新

**対象**: `docs/design/ui/button_control/05_experiment_worker.md`

「次へ」の活性条件を更新。

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 活性条件 | 常に活性 | `status === 'completed'` かつ `isRecorded === true` かつ次のトランジションが存在する |
| 非活性条件 | — | 終状態でない / 記録未保存 / 次のトランジションなし |
| 備考 | — | 非活性時に Tooltip で理由を表示 |

---

## 4. 変更ファイル一覧

| # | ファイル | 種別 | 変更内容 |
|---|---------|------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 更新 | STEP1〜4 |
| 2 | `frontend/src/locales/ja.json` | 更新 | STEP5: i18n キー追加 |
| 3 | `frontend/src/locales/en.json` | 更新 | STEP5: i18n キー追加 |
| 4 | `docs/design/ui/button_control/05_experiment_worker.md` | 更新 | STEP6: 設計書更新 |

---

## 5. 影響範囲の分析

### 直接影響

- **実験作業者の操作フロー変更**: 「終了」→「次へ」の順序が必須になる
- **初回表示の UX 変化**: 実績値欄に想定値がプリセットされて表示される

### 間接影響

- **`isReadOnly` 制御との整合**: `isRecorded === true` の場合 `isReadOnly = true` になる場合があり、
  その際ボタン群は非表示になるため活性条件チェックと矛盾しない
- **スキップ機能との整合**: スキップ後のトランジションが `completed + isRecorded` でなければ
  「次へ」は非活性のまま（正しい挙動）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| STEP1 の初期値設定で既存テストが壊れる | 中 | 中 | `tsc` + 手動確認を実施 |
| handleSaveAndNext 変更後に移動処理が抜ける | 高 | 低 | `setViewingKey(null)` 等の移動処理が残っていることを確認 |
| PropertyList の `canGoNext` Props 追加で呼び出し箇所の漏れ | 低 | 低 | `canGoNext?: boolean` (optional, default false) にする |
| `p.value` の型が想定外（object 等）の場合 | 低 | 低 | `propValue != null` チェックで対応 |

---

## 7. テスト計画

### 手動テスト

- [ ] 初回表示（DB未記録）: 実績値欄に想定値が表示されること
- [ ] DB記録済み: 実績値欄に DB 保存値が表示されること（既存動作が壊れていないこと）
- [ ] 「次へ」非活性: トランジションが完了していない場合、非活性 + Tooltip 表示
- [ ] 「次へ」非活性: `isRecorded = false` の場合、非活性 + Tooltip 表示
- [ ] 「次へ」非活性: 最後のトランジションの場合、非活性 + Tooltip 表示
- [ ] 「次へ」活性: `status=completed && isRecorded=true && 次あり` の場合のみ活性
- [ ] 「次へ」押下: 次のトランジションに切り替わること
- [ ] テンプレート間移動（複数テンプレートある場合）は活性条件に関係なく動作すること

### ビルド確認

- [ ] `tsc` エラーがないこと
- [ ] フロントエンドのビルドが通ること

---

## 8. ロールバック計画

Git 管理のため `git revert` で元に戻せる。

---

## 9. 関連ドキュメント

- [`docs/design/ui/button_control/05_experiment_worker.md`](../../design/ui/button_control/05_experiment_worker.md)
- [`docs/design/ui/experiment_worker/ui_work_record_panel.md`](../../design/ui/experiment_worker/ui_work_record_panel.md)
- [`docs/tasks/20260908_1500_WorkRecordPanelボタン活性調査/`](../20260908_1500_WorkRecordPanelボタン活性調査/)

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-11 11:17
- **承認日時**: 2026-09-11 11:17
- **承認者コメント**: 承認

## 11. 実施記録

### 実施日時
開始: 2026-09-11 11:17
完了: 2026-09-11 11:40

### 最終的な成果物
- [x] STEP1: `WorkRecordPanel.tsx` — DB未記録時に MAIML 想定値（p.value）を実績値の初期値として設定
- [x] STEP2: `WorkRecordPanel.tsx` — PlanB「次へ」ボタンに `canGoNext` 活性条件 + Tooltip 追加
- [x] STEP3: `WorkRecordPanel.tsx` — `PropertyListProps` に `canGoNext?: boolean` Props 追加
- [x] STEP4: `WorkRecordPanel.tsx` — `handleSaveAndNext` を次トランジション移動のみに整理（保存処理・モーダル削除）
- [x] STEP5: `ja.json` / `en.json` — `nextTooltipNotCompleted` / `nextTooltipNotRecorded` / `nextTooltipNoNext` 追加
- [x] STEP6: `05_experiment_worker.md` — 「次へ」活性条件を更新

