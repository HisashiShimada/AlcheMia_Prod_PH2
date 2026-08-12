# タスク計画書: プロジェクト指示画面修正

## メタデータ

- **作成日時**: 2026-08-12 15:00
- **タスクID**: 20260812_1500_プロジェクト指示画面修正
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## タスク概要

プロジェクト管理の指示送信画面に対して以下4点の修正を実施する。

1. **InstructionRegistrationTab テーブルへ instruction_key 変換表示カラム追加**
2. **projectInstructionService.ts の指示種別なし（後方互換）処理を削除**
3. **InstructionEditDialog / TaskRegistrationTab の多言語化漏れ対応**
4. **projectInstructionService インラインオブジェクト生成をローカル変数化**

---

## 目的と期待される成果

- [ ] 指示登録タブのテーブルに「指示種別」カラムが追加され、`instruction_key` が人間可読なラベルで表示される
- [ ] `sendInstructions` の後方互換分岐が削除され、コードが簡潔になる
- [ ] `InstructionEditDialog` / `TaskRegistrationTab` のハードコード日本語文字列がすべて `t()` に置換される
- [ ] `sendInstructions` 内のインラインオブジェクト生成がローカル変数化される

---

## 詳細調査結果

### 修正①: InstructionRegistrationTab — instruction_key 変換カラム追加

**対象ファイル**: `frontend/src/components/project/InstructionRegistrationTab.tsx`

現在のカラム構成: 指示対象 / タスクNo / トランジションID / 指示内容 / 操作

追加するカラム（指示内容の前に挿入）:
- **指示種別** (`instructionKey`) — `INSTRUCTION_KEY_LABELS[record.instructionKey]` で人間可読ラベルに変換して表示
- i18nキー `instructionRegistration.columns.instructionKey` を追加

---

### 修正②: projectInstructionService — 後方互換処理の削除

**対象ファイル**: `backend/src/services/projectInstructionService.ts`

`sendInstructions` 内の `hasInstructionKey` 変数・`if/else` 分岐を削除。`insertProjectInstructionSentLog` を常に呼ぶよう変更。

削除対象 (L338〜L377):
```
const hasInstructionKey = ...
if (hasInstructionKey) {
  // insertProjectInstructionSentLog（この内容は残す）
} else {
  // insertInstructionSentLog（この else ブロック全体を削除）
}
```

前提: マイグレーション `20260807_add_instruction_key_to_project_instruction.sql` にて既存 NULL データを `SupervisorDirectiveContent` に置換済み・NOT NULL 制約設定済み。

---

### 修正③: InstructionEditDialog — 多言語化漏れ対応

**対象ファイル**: `frontend/src/components/project/InstructionEditDialog.tsx`

ハードコード日本語 → `t()` 化する箇所:

| 行 | 現在のハードコード | 翻訳キー |
|----|-------------------|---------|
| L134 | `` `タスク ${n}` `` | `instructionEditDialog.taskOptionLabel`（`{n}` を渡す） |
| L273 | `指示種別` (Form.Itemラベル) | `instructionEditDialog.instructionKeyLabel` |
| L275 | `'指示種別を選択してください'` | `instructionEditDialog.instructionKeyRequired` |
| L278 | `"指示種別を選択"` | `instructionEditDialog.instructionKeyPlaceholder` |
| L290 | `指示対象` | `instructionEditDialog.instructionTargetLabel` |
| L292 | `（未入力の場合は全体指示として扱われます）` | `instructionEditDialog.instructionTargetHint` |
| L298 | `"メソッドを選択"` | `instructionEditDialog.methodPlaceholder` |
| L309 | `"トランジションを選択"` | `instructionEditDialog.transitionPlaceholder` |
| L320 | `"タスクNoを選択"` | `instructionEditDialog.taskNoPlaceholder` |

また、`instructionKeyOptions` の `label` が `INSTRUCTION_KEY_LABELS` の日本語固定値を直接使用している。  
→ `instructionEditDialog.instructionKeyOptions.{enum値}` のi18nキーで翻訳する。

```json
"instructionKeyOptions": {
  "SupervisorDirectiveContent": "通常指示",
  "mgr-instruction:caution": "安全上の注意事項",
  "mgr-instruction:operationNote": "操作手順上の注記",
  "mgr-instruction:checkItem": "実施前後の確認事項",
  "mgr-instruction:prohibitedAction": "禁止事項",
  "mgr-instruction:OtherNotes": "その他注意事項"
}
```

---

### 修正③続: TaskRegistrationTab — 多言語化漏れ確認

**対象ファイル**: `frontend/src/components/project/TaskRegistrationTab.tsx`

調査の結果、TaskRegistrationTab 自体の UI テキストはほぼ i18n 済み。ただし `handleInstructionSave` の `useCallback` の依存配列に `t` が含まれていない（動作影響なしだが修正する）。

---

### 修正④: projectInstructionService — インラインオブジェクトのローカル変数化

修正②（`else` ブロック削除）により、`else` 内のインラインオブジェクト（`insertInstructionSentLog` の引数）も同時に削除される。これで修正④も達成される。

---

## 実装ステップ

- [ ] **Step 1**: `frontend/src/locales/ja.json` に多言語キー追加
- [ ] **Step 2**: `frontend/src/locales/en.json` に同キーの英語訳を追加
- [ ] **Step 3**: `frontend/src/components/project/InstructionRegistrationTab.tsx` に指示種別カラム追加
- [ ] **Step 4**: `frontend/src/components/project/InstructionEditDialog.tsx` のハードコード → `t()` 化
- [ ] **Step 5**: `backend/src/services/projectInstructionService.ts` の後方互換コード削除

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/locales/ja.json` | `instructionRegistration.columns.instructionKey` + `instructionEditDialog` 追加キー |
| `frontend/src/locales/en.json` | 同上（英語訳） |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | 指示種別カラム追加 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | ハードコード → `t()` 化（9箇所 + instructionKeyOptions） |
| `backend/src/services/projectInstructionService.ts` | 後方互換 `else` ブロック削除 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| DB に `instruction_key = NULL` の古いデータが残っている場合、`insertProjectInstructionSentLog` でエラー | 中 | 低 | マイグレーションで NOT NULL 化済み |
| `INSTRUCTION_KEY_LABELS` 翻訳キー化によるラベル表示変化 | 低 | 低 | ja.json に同じ日本語を設定するため変化なし |

---

## テスト計画

- [ ] InstructionRegistrationTab に指示種別カラムが表示されることを確認
- [ ] 英語モードでInstructionEditDialogのラベル・バリデーションが正しく動作することを確認
- [ ] `sendInstructions` 実行後に `maiml_event_log` に正しいログが記録されることを確認
- [ ] TypeScript ビルドが通ることを確認（`cd frontend && npm run build`）

---

## 承認記録

- **計画書提示日時**: 2026-08-12 15:00
- **承認日時**: 2026-08-12 15:30
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時

開始: 2026-08-12 15:30  
完了: 2026-08-12 16:00

### 最終的な成果物

- [x] Step 1: `frontend/src/locales/ja.json` に多言語キー追加（`instructionRegistration.columns.instructionKey` + `instructionEditDialog` 追加キー16件）
- [x] Step 2: `frontend/src/locales/en.json` に英語訳追加（同上）
- [x] Step 3: `frontend/src/components/project/InstructionRegistrationTab.tsx` に「指示種別」カラム追加（`INSTRUCTION_KEY_LABELS` でラベル変換・Tooltip付き）
- [x] Step 4: `frontend/src/components/project/InstructionEditDialog.tsx` のハードコード日本語 9箇所を `t()` に置換、`instructionKeyOptions` も i18n キーで翻訳
- [x] Step 5: `backend/src/services/projectInstructionService.ts` の `sendInstructions` から後方互換 `else` ブロック（`insertInstructionSentLog` 呼び出し）を削除し、`insertProjectInstructionSentLog` を常に呼ぶ形に変更

### ビルド確認

- フロントエンド TypeScript: 今回修正した3コンポーネントにエラーなし（既存の無関係エラーのみ）
- バックエンド TypeScript: エラーなし
