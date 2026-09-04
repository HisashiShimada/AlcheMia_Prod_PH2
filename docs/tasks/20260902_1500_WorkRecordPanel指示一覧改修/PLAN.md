# タスク計画書: WorkRecordPanel 指示一覧改修

## メタデータ

- **作成日時**: 2026-09-02 15:00
- **タスクID**: 20260902_1500_WorkRecordPanel指示一覧改修
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`WorkRecordPanel` 内の `InstructionCollapse`（プロジェクト指示折りたたみ部品）について、以下2点を改修する。

1. **フィルタリング改修**: 現在のトランジション/タスク/メソッドに応じた指示のみを表示する（全体指示 + 現在のメソッド指示 + 現在のタスク指示 + 現在のトランジション指示）
2. **種別表示追加**: `instruction_key` に対応する表示名を `{表示名}：{内容}` 形式で表示する

---

## 2. 現状と問題点

### 現状のデータフロー

```
ExperimentWorkerMenu
  useInstructions() → Instruction[] 全件取得
  .filter(!methodId && !transitionId)  ← 全体指示のみ
  .map(i => i.content)                 ← string[] に変換（型情報を捨てる）
  WorkRecordPanel props: projectInstructions?: string[]
  InstructionCollapse: string[] を li で羅列するだけ
```

### 問題①：フィルタリング不足

- 現在は「全体指示（methodId・transitionId が両方 NULL）」のみを表示
- メソッド指示・タスク指示・トランジション指示が InstructionCollapse に表示されない

### 問題②：種別ラベル未表示

- `project_instruction.instruction_key` に種別が格納されているが取得・表示していない
- `findWorkerInstructions.sql` が `instruction_key` を SELECT していない
- `WorkerInstruction` 型に `instruction_key` フィールドがない

---

## 3. 目的と期待される成果

- [x] 現在のトランジションに対応する4カテゴリ（全体・メソッド・タスク・トランジション）の指示が `InstructionCollapse` に表示される
- [x] 各指示が `{表示名}：{内容}` 形式（例：「安全上の注意事項：サンプル取り扱いに注意してください」）で表示される
- [x] 表示名は `ja.json` の `instructionKeyOptions` に既存のキーを使用する
- [x] `instruction_key` が未設定（NULL）の場合は「通常指示」相当のラベルをフォールバック表示する
- [x] 既存の `InstructionConfirmationModal`（作業指示ボタン押下時のモーダル）の動作は変更しない

---

## 4. 実装ステップ

### フェーズ1：バックエンド対応

- [x] **Step 1-1**: `backend/src/sql/queries/instructions/findWorkerInstructions.sql`
  - `pi.instruction_key` を SELECT 列に追加

- [x] **Step 1-2**: `backend/src/services/projectService.ts`（`getWorkerInstructions` メソッド）
  - `instruction_key: row.instruction_key || null` をレスポンスマッピングに追加

### フェーズ2：型定義の更新

- [x] **Step 2-1**: `frontend/src/types/project.ts`（`WorkerInstruction` インターフェース）
  - `instruction_key?: string` フィールドを追加

- [x] **Step 2-2**: `frontend/src/types/experimentWorker.ts`（`Instruction` インターフェース）
  - `instructionKey?: string` フィールドを追加

### フェーズ3：変換ロジックの更新

- [x] **Step 3-1**: `frontend/src/hooks/useInstructions.ts`（`convertWorkerInstruction` 関数）
  - `instructionKey: apiData.instruction_key || undefined` を追加

- [x] **Step 3-2**: `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx`（`convertWorkerInstruction` 関数）
  - `instructionKey: apiData.instruction_key || undefined` を追加

### フェーズ4：WorkRecordPanel 改修（メイン）

- [x] **Step 4-1**: `WorkRecordPanelProps` の型変更
  - `projectInstructions?: string[]` → `allWorkerInstructions?: Instruction[]`（全件を渡す）

- [x] **Step 4-2**: `PlanProps`（内部型）の変更
  - `instructions: string[]` → `instructions: Instruction[]`

- [x] **Step 4-3**: `InstructionCollapseProps` の変更
  - `instructions: string[]` → `instructions: Instruction[]`

- [x] **Step 4-4**: `InstructionCollapse` コンポーネントの改修
  - `<li>` の内容を `{表示名}：{内容}` 形式に変更
  - `INSTRUCTION_KEY_LABELS`（`instructionRegistration.ts` 既存）を使って表示名を解決
  - `instruction_key` が未設定の場合は `'Alchemia:SupervisorDirectiveContent'`（通常指示）でフォールバック

- [x] **Step 4-5**: `planProps` 組み立て部分（2848行付近）のフィルタリングロジック追加
  - `viewingKey`・`progressRows`・`ASSIGNED_TASK_NO` を参照して現在のアクティブトランジションを特定
  - フィルタリング対象（4カテゴリ）：
    - **全体指示**: `!methodId && !transitionId`
    - **メソッド指示**: `methodId === 現在のmethodId && !transitionId && !taskId`
    - **タスク指示**: `methodId === 現在のmethodId && !!taskId`（現在の taskNo に対応）
    - **トランジション指示**: `transitionId === 現在のtransitionId`

### フェーズ5：ExperimentWorkerMenu 改修

- [x] **Step 5-1**: `projectInstructionTexts`（string[] への変換）を廃止
- [x] **Step 5-2**: `projectInstructions` props を `allWorkerInstructions` に変更し、`instructions`（Instruction[] 全件）を渡す
- [x] **Step 5-3**: `handleConfirmInstruction` のフィルタリングロジックは変更しない（全体指示のみが確認対象のまま）

---

## 5. 変更ファイル一覧

| # | ファイル | 変更内容 | 種別 |
|---|---|---|---|
| 1 | `backend/src/sql/queries/instructions/findWorkerInstructions.sql` | `instruction_key` を SELECT に追加 | SQL |
| 2 | `backend/src/services/projectService.ts` | `instruction_key` をレスポンスマッピングに追加 | Backend |
| 3 | `frontend/src/types/project.ts` | `WorkerInstruction` に `instruction_key?` 追加 | 型定義 |
| 4 | `frontend/src/types/experimentWorker.ts` | `Instruction` に `instructionKey?` 追加 | 型定義 |
| 5 | `frontend/src/hooks/useInstructions.ts` | `convertWorkerInstruction` に `instructionKey` 追加 | Hook |
| 6 | `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` | `convertWorkerInstruction` に `instructionKey` 追加 | Component |
| 7 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `InstructionCollapse` 改修・props 変更・フィルタリングロジック追加 | Component |
| 8 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | props の型・渡し方変更 | Component |

---

## 6. 影響範囲の分析

### 直接影響

- `WorkRecordPanel` の `InstructionCollapse` 表示（改修対象）
- `ExperimentWorkerMenu` の props 渡し方

### 間接影響（変更なし）

- `InstructionConfirmationModal`: `convertWorkerInstruction` に `instructionKey` フィールドを追加するのみ、表示ロジックは変更しない
- `InstructionCard`: `Instruction` 型に `instructionKey?` を追加するが `InstructionCard` は参照しないため影響なし
- `InstructionGroup`: 同上
- `useInstructions` フック: `instructionKey` を追加するのみで既存ロジック変更なし
- `handleConfirmInstruction`（全体指示確認完了ハンドラ）: ロジック変更なし

### セキュリティ

- `instruction_key` は既存 DB カラムの参照追加のみ。マルチテナント分離（`organization_id` フィルタ）は変更なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `instruction_key` が NULL のレコードが存在しラベル解決に失敗する | 低 | 中 | `INSTRUCTION_KEY_LABELS` にキーが存在しない場合は「通常指示」へフォールバック |
| `allWorkerInstructions` props 名変更で型チェックエラーが発生 | 中 | 低 | TypeScript コンパイルエラーで事前検出可能。変更箇所は2ファイルのみ |
| フィルタリングロジックでアクティブなトランジション特定が誤る | 中 | 低 | `InstructionConfirmationModal` の既存ロジックに合わせて実装 |

---

## 8. テスト計画

### 手動テスト

- [ ] トランジション指示がある状態で作業画面を開き、`InstructionCollapse` に対象指示が表示されること
- [ ] 全体・メソッド・タスク・トランジション指示がそれぞれ `{表示名}：{内容}` 形式で表示されること
- [ ] 別のトランジションに切り替えた際にフィルタリング結果が更新されること
- [ ] `instruction_key` が NULL の指示が「通常指示：{内容}」として表示されること
- [ ] 作業指示ボタン押下時のモーダル（`InstructionConfirmationModal`）の動作が変わらないこと
- [ ] 指示確認ボタン（`handleConfirmInstruction`）が全体指示のみを対象としていること

> ⚠️ 上記手動テストは実装完了後に動作確認環境で実施すること

---

## 9. 関連ドキュメント

- `frontend/src/types/instructionRegistration.ts` — `INSTRUCTION_KEY`, `INSTRUCTION_KEY_LABELS` 定義
- `frontend/src/locales/ja.json` — `instructionKeyOptions` セクション（翻訳ラベル）
- `backend/src/sql/queries/instructions/findWorkerInstructions.sql` — 現状のクエリ
- `docs/design/db/ddl/project_instruction.sql` — `project_instruction` テーブル定義

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-02 15:00
- **承認日時**: 2026-09-02 15:10
- **承認者コメント**: 承認

---

## 11. 実施記録

### 実施日時
開始: 2026-09-02 15:10
完了: 2026-09-02 15:30

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] バックエンド SQL・Service 変更
- [x] 型定義更新（project.ts, experimentWorker.ts）
- [x] 変換ロジック更新（useInstructions.ts, InstructionConfirmationModal.tsx）
- [x] WorkRecordPanel 改修（InstructionCollapse・フィルタリング）
- [x] ExperimentWorkerMenu props 変更

