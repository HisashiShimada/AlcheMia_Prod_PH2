# タスク計画書: WorkRecordPanel Creator/Instrument プルダウン追加

## メタデータ
- **作成日時**: 2026-08-19 15:00
- **タスクID**: 20260819_1500_WorkRecordPanel_Creator_Instrument追加
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`WorkRecordPanel` のレイアウトを修正し、トランジション情報カード（`WorkHeader`）と
テンプレート入力エリア（`Layout`）の間に、**Creator / Instrument の単一選択プルダウン**を追加する。

- **選択肢**: `GET /projects/:projectId/methods/:methodId/plan-dialog-data` から取得（`creatorRefs`, `instrumentRefs`）
- **初期値**: `GET /projects/:projectId/experiment-plans?methodId=xxx` の `__task__.creatorRefs[0]` / `__task__.instrumentRefs[0]`
- **ラベル**: 「Creator」「Instrument」（英語表記そのまま）
- **選択方式**: 単一選択（ExperimentPlanDialog 側の複数選択と異なる）
- `isReadOnly`（完了済み閲覧モード）時は disabled 表示

## 2. 目的と期待される成果

- [ ] WorkHeader の直後・Layout の前に Creator/Instrument プルダウンが表示される
- [ ] `projectId` と `methodId` が揃ったタイミングで選択肢が API から取得される
- [ ] ExperimentPlanDialog で設定済みの CreatorRef/InstrumentRef の先頭値が初期選択される
- [ ] 完了済み閲覧モード（isReadOnly）では disabled 表示になる
- [ ] `displayKey` が null（全トランジション完了後）ではセクション非表示

## 3. 影響範囲

| コンポーネント | 変更内容 |
|---|---|
| `WorkRecordPanel.tsx` | Props 追加・API 接続・UI 追加（メイン変更） |
| `ExperimentWorkerMenu.tsx` | `methodId` prop を渡すよう変更 |
| `ja.json` | `workRecord.creatorPlaceholder` / `workRecord.instrumentPlaceholder` キー追加 |
| `en.json` | 同上（英語版） |

## 4. 実装ステップ

### Step 1: i18n キー追加
- [ ] `frontend/src/locales/ja.json` の `workRecord` セクションに2キー追加
- [ ] `frontend/src/locales/en.json` の `workRecord` セクションに2キー追加

### Step 2: `WorkRecordPanel.tsx` — import 追加
- [ ] `getPlanDialogData` と `getExperimentPlans` を `experimentPlanApiService.ts` からインポート

### Step 3: `WorkRecordPanel.tsx` — `WorkRecordPanelProps` に `methodId` 追加
- [ ] `methodId?: string` を追加
- [ ] エクスポート関数の引数に `methodId` を追加

### Step 4: `WorkRecordPanel.tsx` — `PlanProps` インターフェースに6フィールドを追加
```typescript
creatorRefOptions: string[];
instrumentRefOptions: string[];
selectedCreatorRef: string | null;
selectedInstrumentRef: string | null;
onCreatorRefChange: (value: string | null) => void;
onInstrumentRefChange: (value: string | null) => void;
```

### Step 5: `WorkRecordPanel.tsx` — `WorkRecordPanel` 本体に state・useEffect を追加
- [ ] `creatorRefOptions`, `instrumentRefOptions` state を追加（初期値 `[]`）
- [ ] `selectedCreatorRef`, `selectedInstrumentRef` state を追加（初期値 `null`）
- [ ] `projectId` / `methodId` が変化したら `getPlanDialogData` → 選択肢を更新
- [ ] 同じタイミングで `getExperimentPlans` → `ASSIGNED_TASK_NO` タスクの `__task__` から初期値を設定
- [ ] `planProps` に6フィールドを追加

### Step 6: `WorkRecordPanel.tsx` — `PlanB` コンポーネントの修正
- [ ] 引数分割代入に6フィールドを追加
- [ ] `WorkHeader` と `Layout` の間に Creator/Instrument 選択カードを挿入
  - `displayKey` が存在する場合のみ表示
  - `Card size="small"` + `Flex` レイアウト
  - `Select size="small"` × 2（Creator / Instrument）
  - `allowClear` 有効、`disabled={isReadOnly}`

### Step 7: `ExperimentWorkerMenu.tsx` の変更
- [ ] `<WorkRecordPanel>` に `methodId={selectedMethodId || undefined}` を追加

### Step 8: 型チェック・動作確認
- [ ] `tsc --noEmit` でエラーなし確認

## 5. 変更ファイル一覧

| # | ファイルパス | 変更内容 |
|---|---|---|
| 1 | `frontend/src/locales/ja.json` | `workRecord` に2キー追加 |
| 2 | `frontend/src/locales/en.json` | `workRecord` に2キー追加 |
| 3 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | Props・state・API・UI追加 |
| 4 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `methodId` prop 追加 |

## 6. リスク

| リスク | 対策 |
|---|---|
| `methodId` が未設定の場合 API が呼ばれない | `if (!projectId \|\| !methodId) return;` でガード |
| 選択肢なし時の表示崩れ | 空配列時は空プルダウンを表示（`allowClear` で操作可能） |
| `PlanA` コンポーネントは今回対象外 | `PlanB` のみ修正（`PlanA` は現在未使用） |

## 7. テスト計画
- [ ] `tsc --noEmit` でエラーなし
- [ ] projectId・methodId 未設定時にエラーが出ないこと
- [ ] projectId・methodId 設定時に選択肢が表示されること（ブラウザ動作確認）

## 8. 承認記録
- **計画書提示日時**: 2026-08-19 15:00
- **承認日時**: 2026-08-19 15:00
- **承認者コメント**: 承認します

## 9. 実施記録

### 実施日時
開始: 2026-08-19 15:00
完了: 2026-08-19 15:30

### 最終的な成果物
- [x] Step 1: `ja.json` / `en.json` に `workRecord.creatorPlaceholder` / `workRecord.instrumentPlaceholder` 追加
- [x] Step 2: `WorkRecordPanel.tsx` に `useEffect`・`getPlanDialogData`・`getExperimentPlans` import 追加
- [x] Step 3: `WorkRecordPanelProps` に `methodId?: string` 追加
- [x] Step 4: `PlanProps` に6フィールド追加（creatorRefOptions, instrumentRefOptions, selectedCreatorRef, selectedInstrumentRef, onCreatorRefChange, onInstrumentRefChange）
- [x] Step 5: `WorkRecordPanel` 本体に state 4件・useEffect（API取得）追加
- [x] Step 6: `planProps` に6フィールド追加
- [x] Step 6: `PlanB` 引数分割代入に6フィールド追加・WorkHeader 直後に Creator/Instrument カード挿入
- [x] Step 7: `ExperimentWorkerMenu.tsx` に `methodId={selectedMethodId || undefined}` 追加
- [x] Step 8: `tsc --noEmit` — 対象ファイルに関するエラーなし確認済み
