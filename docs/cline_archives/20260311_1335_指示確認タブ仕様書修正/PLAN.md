# タスク計画書: 指示確認タブ仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 13:35
- **タスクID**: 指示確認タブ仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_instruction_confirmation_tab.md` の仕様書とソースコード（`frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`）を照合し、乖離している箇所を修正する。

仕様書は初版（モック実装）の状態のまま更新されておらず、ソースコードの実装と大きく乖離している。

---

## 目的と期待される成果

### 目的
仕様書とソースコードの内容を一致させ、最新の実装状態を正確に反映した仕様書にする。

### 期待される成果
- [ ] Props インターフェース定義を最新化（3項目追加）
- [ ] State 定義を最新化（6項目追加）
- [ ] 算出データ（useMemo）の記述を最新化
- [ ] イベントハンドラ一覧を最新化（3ハンドラ追加）
- [ ] 確認完了処理の実装詳細を最新化（window.confirm → Modal.confirm + API実装済み）
- [ ] ボタン一覧を最新化（タスク指示・トランジション指示の確認完了ボタン追加）
- [ ] データソース・使用API の記述を最新化（モック廃止、API実装済み）
- [ ] 空状態の判定ロジックを最新化（selectedProject → selectedProjectName）

---

## 実装ステップ

### Step 1: Props インターフェース定義の修正（Section 5.1）
- [ ] `selectedProjectName: string` を追加
- [ ] `onInstructionsUpdated: () => Promise<void>` を追加
- [ ] `readOnly?: boolean` を追加

### Step 2: State 定義の修正（Section 5.2）
- [ ] `loading`, `confirmLoading` を追加
- [ ] `methods`, `tasks`, `projectId` を追加
- [ ] `flowDiagramLoading` を追加

### Step 3: 算出データの修正（Section 5.3）
- [ ] `projectInfo`, `methodInfo` の記述を削除
- [ ] `tasks` → `filteredTasks` に変更（ロジック変更）
- [ ] `projectStatus` の説明を修正（常に null）

### Step 4: イベントハンドラ一覧の修正（Section 4.2）
- [ ] `confirmInstructions`（共通処理）を追加
- [ ] `handleConfirmProjectInstructions` を追加
- [ ] `handleConfirmTaskInstructions` を追加
- [ ] `handleConfirmTransitionInstructions` を追加

### Step 5: ボタン一覧の修正（Section 3.2）
- [ ] タスク指示グループの確認完了ボタンを追加
- [ ] トランジション指示グループの確認完了ボタンを追加
- [ ] 全ての指示の確認完了ボタンに `readOnly` 無効化条件を追加

### Step 6: 確認完了処理の実装詳細の修正（Section 6.2）
- [ ] `window.alert` / `window.confirm` → `Modal.confirm` に修正
- [ ] API呼び出し実装済みに修正（TODO解消）

### Step 7: 使用API・データソースの修正（Section 5.4 / 5.5）
- [ ] `getWorkerTasks()` API を追加（タスク一覧取得）
- [ ] `confirmInstruction()` を実装済みに変更（TODO → 実装済み）
- [ ] `getProjectMaiml()` を実装済みに変更（TODO → 実装済み）
- [ ] データソースの `projectsData`（モック）の記述を削除

### Step 8: 空状態判定ロジック・その他細部の修正
- [ ] 空状態判定を `!selectedProject` → `!selectedProjectName` に修正

---

## 変更ファイル
1. `docs/design/ui/experiment_worker/ui_instruction_confirmation_tab.md` - 全体修正

---

## リスク

| リスク | 対策 |
|--------|------|
| 修正量が多く抜け漏れが発生 | Stepを細かく分割し、各Stepごとに確認 |

## 承認記録
- **計画書提示日時**: 2026-03-11 13:35
- **承認日時**: 
