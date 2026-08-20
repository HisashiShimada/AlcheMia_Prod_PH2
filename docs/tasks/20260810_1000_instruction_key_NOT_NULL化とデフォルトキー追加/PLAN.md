# タスク計画書: instruction_key NOT NULL化とデフォルトキー追加

## メタデータ
- **作成日時**: 2026-08-10 10:00
- **タスクID**: 20260810_1000
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`project_instruction` テーブルの `instruction_key` カラムについて、以下2点を対応する。

1. **NULL許容 → NOT NULL化**: Migration SQLおよびソース側の型定義・ロジックを必須扱いに修正
2. **デフォルトキー追加**: 通常指示扱いのデフォルトキー `SupervisorDirectiveContent` を定数に追加し、フロントエンドのUI（ドロップダウン）に選択肢として追加

## 目的と期待される成果

- [x] `instruction_key` がNULL不可（必須）としてDBに保存されること
- [x] 既存のNULLデータはマイグレーション時に `SupervisorDirectiveContent`（デフォルトキー）に置換されること
- [x] バックエンドの型定義・サービス層でNULL許容が排除されること
- [x] フロントエンドの定数・型定義に `SupervisorDirectiveContent` が追加されること
- [x] フロントエンドのUI（ドロップダウン）に「通常指示」として選択肢が表示されること

---

## 実装ステップ

### Step 1: Migration SQL の修正
- [x] `backend/migrations/20260807_add_instruction_key_to_project_instruction.sql`
  - 既存NULLデータを `SupervisorDirectiveContent` に UPDATE
  - `ALTER COLUMN instruction_key SET NOT NULL` を追加
  - COMMENTを更新

### Step 2: バックエンド型定義の修正
- [x] `backend/src/types/database.ts`
  - `ProjectInstruction.instruction_key?: string | null` → `instruction_key: string` に変更

### Step 3: バックエンド API型定義の修正
- [x] `backend/src/types/api.ts`
  - `UpdateInstructionRequest` に `instructionKey: string` を追加（`SaveInstructionRequest` はすでに必須）

### Step 4: バックエンド Service層の修正
- [x] `backend/src/services/projectInstructionService.ts`
  - `saveInstruction`: `instruction_key: request.instructionKey ?? null` → `instruction_key: request.instructionKey` に変更（null合体演算子を削除）
  - `updateInstruction`: `instructionData` に `instruction_key: request.instructionKey` を追加（未設定だったため）

### Step 5: フロントエンド定数・型定義の修正
- [x] `frontend/src/types/instructionRegistration.ts`
  - `INSTRUCTION_KEY` 定数に `GENERAL: 'SupervisorDirectiveContent'` を追加
  - `INSTRUCTION_KEY_LABELS` に `'SupervisorDirectiveContent': '通常指示'` を追加
  - `InstructionData.instructionKey?: string | null` → `instructionKey: string` に変更

### Step 6: フロントエンド API型定義の修正
- [x] `frontend/src/types/api.ts`
  - `UpdateInstructionRequest` に `instructionKey: string` を追加

### Step 7: フロントエンド コンポーネントの修正（実装中に発覚）
- [x] `frontend/src/components/project/InstructionEditDialog.tsx`
  - `INSTRUCTION_KEY` をインポートに追加
  - `doSave` 内で `selectedInstructionKey` が null の場合 `INSTRUCTION_KEY.GENERAL` にフォールバック
- [x] `frontend/src/components/project/InstructionRegistrationTab.tsx`
  - `updateInstruction` 呼び出しに `instructionKey: instruction.instructionKey` を追加

---

## 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|--------|---------|---------|
| 1 | `backend/migrations/20260807_add_instruction_key_to_project_instruction.sql` | 修正 | NOT NULL化（UPDATE + ALTER） |
| 2 | `backend/src/types/database.ts` | 修正 | `instruction_key` を必須型に変更 |
| 3 | `backend/src/types/api.ts` | 修正 | `UpdateInstructionRequest` に `instructionKey` 追加 |
| 4 | `backend/src/services/projectInstructionService.ts` | 修正 | `?? null` 削除・`updateInstruction` に `instruction_key` 追加 |
| 5 | `frontend/src/types/instructionRegistration.ts` | 修正 | デフォルトキー追加・`InstructionData.instructionKey` 必須化 |
| 6 | `frontend/src/types/api.ts` | 修正 | `UpdateInstructionRequest` に `instructionKey` 追加 |
| 7 | `frontend/src/components/project/InstructionEditDialog.tsx` | 修正 | `INSTRUCTION_KEY` インポート追加・null時フォールバック追加 |
| 8 | `frontend/src/components/project/InstructionRegistrationTab.tsx` | 修正 | `updateInstruction` 呼び出しに `instructionKey` 追加 |

---

## 影響範囲

- **DB**: 既存NULLデータがある場合は `SupervisorDirectiveContent` に一括置換される
- **バックエンド**: 型変更による影響はサービス層・リポジトリ層のみ（既存の必須扱い実装と整合）
- **フロントエンド**: ドロップダウンに「通常指示」選択肢が追加される

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存NULLデータがNOT NULL制約違反になる | 高 | 中 | Migration SQLでUPDATE先にSET NOT NULL |
| `InstructionData.instructionKey` 必須化によるフロントエンドのビルドエラー | 中 | 中 | 影響箇所を事前に確認し修正 |
| `UpdateInstructionRequest` に `instructionKey` 追加による未設定箇所 | 中 | 低 | 既存呼び出し箇所を確認 |

## テスト計画

- [x] TypeScriptビルドエラーがないことを確認（バックエンド・フロントエンド）
- [ ] 手動: 指示新規作成時に `instructionKey` が正しくDBに保存されること
- [ ] 手動: ドロップダウンに「通常指示（SupervisorDirectiveContent）」が表示されること

## 承認記録
- **計画書提示日時**: 2026-08-10 10:00
- **承認日時**: 2026-08-10 10:30
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-08-10 10:30
完了: 2026-08-10 11:00

### 最終的な成果物
- [x] `backend/migrations/20260807_add_instruction_key_to_project_instruction.sql` — UPDATE + SET NOT NULL 追加
- [x] `backend/src/types/database.ts` — `instruction_key: string`（必須）に変更
- [x] `backend/src/types/api.ts` — `UpdateInstructionRequest` に `instructionKey: string` 追加
- [x] `backend/src/services/projectInstructionService.ts` — `?? null` 削除・`updateInstruction` に `instruction_key` 追加
- [x] `frontend/src/types/instructionRegistration.ts` — `GENERAL: 'SupervisorDirectiveContent'` 追加・ラベル「通常指示」追加・`instructionKey: string`（必須）に変更
- [x] `frontend/src/types/api.ts` — `UpdateInstructionRequest` に `instructionKey: string` 追加
- [x] `frontend/src/components/project/InstructionEditDialog.tsx` — `INSTRUCTION_KEY` インポート追加・null時は `INSTRUCTION_KEY.GENERAL` にフォールバック
- [x] `frontend/src/components/project/InstructionRegistrationTab.tsx` — `updateInstruction` 呼び出しに `instructionKey` 追加

### ビルド確認
- [x] バックエンド `npx tsc --noEmit` → エラーなし（exit:0）
- [x] フロントエンド `npx tsc --noEmit` → 本タスク起因のエラーなし（既存の無関係エラーのみ）
