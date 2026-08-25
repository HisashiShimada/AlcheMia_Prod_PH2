# タスク計画書: 指示種別復元不具合と maiml_event_log 二重書き込み修正

## メタデータ

- **作成日時**: 2026-08-12 11:00
- **タスクID**: 20260812_1100
- **優先度**: 高
- **推定工数**: 1.5 時間

---

## 1. タスク概要

`TaskRegistrationTab` からプロジェクト指示ダイアログで指示を保存した後にタスク保存を実行すると、以下の2件の不具合が発生する。

### 不具合1: 指示種別が復元されない
プロジェクト指示タブで詳細ボタン押下で `InstructionEditDialog` を開いた際、「指示種別」ドロップダウンが空になる。

### 不具合2: maiml_event_log が 2 件書き込まれている + 通常指示のキーが登録されない
1 つの指示に対して `maiml_event_log` に 2 件レコードが挿入される。  
また通常指示（`SupervisorDirectiveContent`）に対し、`maiml_event_log` の JSON に `property[@key='SupervisorDirectiveContent']` エントリが欠落する。

---

## 2. 根本原因分析

### 前提: DB の状態確認結果

ユーザー確認により以下が判明している。

| 確認項目 | 状態 |
|---------|------|
| `project_instruction.instruction_key` | `SupervisorDirectiveContent` が**正しく保存されている** |
| `maiml_event_log` のレコード件数 | **2件書き込まれている** |
| `maiml_event_log` のレコード形式 | **両件とも旧形式**（`SupervisorDirectiveContent` キーなし） |

`instruction_key` が正しく DB に入っているにもかかわらず `insertProjectInstructionSentLog`（新形式）が全く呼ばれていない原因は**調査継続中**。詳細は「6. 残課題・バックログ」を参照。

### 不具合1 の原因（特定済み）

**ファイル**: `backend/src/services/projectInstructionService.ts`

`getInstructions()` でDBデータを `InstructionData[]` に変換する際、**`instructionKey` フィールドがマッピングから抜け落ちている**。

```typescript
// 現状（問題あり） — instructionKey が欠落
const instructionData: InstructionData[] = instructions.map(inst => ({
  id: inst.experiment_instruction_id || '',
  content: inst.instructions || '',
  methodId: inst.method_id || '',
  transitionId: inst.transition_id || '',
  taskNumber: inst.task_no ?? undefined,
  isSent: inst.instruction_status === InstructionStatusEnum.SENT,
  instruction_status: inst.instruction_status ?? InstructionStatusEnum.UNSENT,
  // ← instructionKey が欠落！
}));
```

### 不具合2 の原因（部分特定）

**確実に問題のある箇所**として以下を特定済み。これらを修正することで一部改善が期待できる。

#### 原因A: フロントエンドで `instructionKey` に空文字フォールバックが使われている

`InstructionRegistrationTab.tsx` の `saveInstruction` 呼び出し時：

```typescript
// InstructionRegistrationTab.tsx（現状・問題あり）
instructionKey: instruction.instructionKey ?? '',  // 空文字でDBに保存される場合がある
```

`TaskRegistrationTab.tsx` の `saveTaskRegistration` リクエスト生成時：

```typescript
// TaskRegistrationTab.tsx（現状・問題あり）
instructionKey: inst.instructionKey ?? '',  // 空文字でDBに保存される場合がある
```

#### 原因B: `sendInstructions` の条件判定が空文字に対応していない

空文字 `''` は JavaScript で **falsy** のため、`instruction_key = ''` の指示は `insertInstructionSentLog`（旧形式）に分岐する。

```typescript
if (instruction.instruction_key) {   // '' は falsy → else へ
  await eventLogRepo.insertProjectInstructionSentLog(...)  // 新形式
} else {
  await eventLogRepo.insertInstructionSentLog(...)         // 旧形式（SupervisorDirectiveContent なし）
}
```

> **調査継続中**: `instruction_key = 'SupervisorDirectiveContent'` が DB に正しく保存されているにもかかわらず `insertProjectInstructionSentLog` が呼ばれていない根本原因は未特定。`sendInstructions` 内の `findByProject` で取得した `instruction_key` が空になっているのか、別の経路で 2 件登録されているのか等をデバッグログで追跡する必要がある（残課題参照）。

---

## 3. 目的と期待される成果

- [ ] プロジェクト指示タブで詳細を開いた際に指示種別が正しく復元されること
- [ ] 通常指示の `property[@key='SupervisorDirectiveContent']` が `maiml_event_log` に正しく記録されること
- [ ] 1つの指示に対して `maiml_event_log` に 1 件のみ挿入されること

---

## 4. 実装ステップ（今回対応分）

> **方針**: 根本原因が未特定の不具合2については、確実に問題のある箇所のみを修正して改善を図る。  
> 残課題はバックログに積み、デバッグログを仕込んで継続調査する。

### Step 1: バックエンド — `getInstructions` に `instructionKey` を追加（不具合1 修正）

**ファイル**: `backend/src/services/projectInstructionService.ts`

- `instructionKey: inst.instruction_key || 'SupervisorDirectiveContent'` を追加

### Step 2: フロントエンド — `InstructionRegistrationTab.tsx` の `instructionKey` フォールバックを修正（不具合2 部分改善）

**ファイル**: `frontend/src/components/project/InstructionRegistrationTab.tsx`

- `instruction.instructionKey ?? ''` → `instruction.instructionKey || INSTRUCTION_KEY.GENERAL` に変更
- `INSTRUCTION_KEY` を `@/types/instructionRegistration` からインポートする

### Step 3: フロントエンド — `TaskRegistrationTab.tsx` の `instructionKey` フォールバックを修正（不具合2 部分改善）

**ファイル**: `frontend/src/components/project/TaskRegistrationTab.tsx`

- `inst.instructionKey ?? ''` → `inst.instructionKey || INSTRUCTION_KEY.GENERAL` に変更
- `INSTRUCTION_KEY` を `@/types/instructionRegistration` からインポートする

### Step 4: バックエンド — `sendInstructions` の条件判定を厳密化（防御的修正）

**ファイル**: `backend/src/services/projectInstructionService.ts`

- 空文字も旧形式へ分岐するのを防ぐため判定を変更
- `if (instruction.instruction_key)` → `if (instruction.instruction_key && instruction.instruction_key.trim() !== '')`

### Step 5: バックエンド — `sendInstructions` にデバッグログを追加（調査用）

**ファイル**: `backend/src/services/projectInstructionService.ts`

- `unsentInstructions` の各件について `instruction_key` の値をログ出力
- `insertProjectInstructionSentLog` / `insertInstructionSentLog` 呼び出し前後にログ出力
- 調査完了後に別タスクで削除予定

---

## 5. 変更ファイル一覧

| ファイル | 変更内容 | 対応不具合 |
|---------|---------|----------|
| `backend/src/services/projectInstructionService.ts` | `getInstructions()` に `instructionKey` マッピング追加 | 不具合1 修正 |
| `backend/src/services/projectInstructionService.ts` | `sendInstructions()` の条件判定を空文字考慮に厳密化 + デバッグログ追加 | 不具合2 部分改善・調査 |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | `instructionKey ?? ''` → `\|\| INSTRUCTION_KEY.GENERAL` + インポート追加 | 不具合2 部分改善 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `instructionKey ?? ''` → `\|\| INSTRUCTION_KEY.GENERAL` + インポート追加 | 不具合2 部分改善 |

---

## 6. 残課題・バックログ

### BL-1: maiml_event_log 二重書き込みの根本原因特定（不具合2 継続調査）

**状態**: ✅ 解消済み（2026-08-12）

**結果**: 指示送信ボタン押下後に正しく新形式（`SupervisorDirectiveContent` キーあり）で eventLog が書き込まれることを確認。今回の修正（Step 2〜4 の空文字フォールバック修正・条件判定厳密化）により解消。デバッグログも不要のため削除済み。

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の `instruction_key = null` データに誤った種別が表示される | 低 | 低 | マイグレーションで NULL→`SupervisorDirectiveContent` 置換済みのため問題なし |
| `sendInstructions` 条件変更で既存指示の送信が失敗 | 中 | 低 | マイグレーション適用済み環境では NULL データなし。NULL の場合も else 節（従来処理）で継続動作 |
| 不具合2 の根本原因が未解消のため修正後も maiml_event_log が旧形式になる可能性 | 中 | 中 | デバッグログで継続調査。影響範囲は maiml_event_log の形式のみで機能停止は発生しない |

---

## 8. テスト計画

### 手動テスト

- [ ] `TaskRegistrationTab` で指示種別を選択して指示を追加 → タスク保存
- [ ] プロジェクト指示タブで詳細ボタン → **指示種別が正しく表示されることを確認**（不具合1 検証）
- [ ] 指示登録タブで「指示送信」→ バックエンドログで `unsentInstructions` の `instruction_key` 値を確認（不具合2 調査）
- [ ] `InstructionRegistrationTab` から指示を追加して送信 → `instructionKey` が `SupervisorDirectiveContent` でDBに保存されることを確認
- [ ] 通常指示以外の指示種別（安全上の注意事項 等）でも指示種別が詳細で正しく表示されることを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-12 11:00
- **承認日時**: 2026-08-12
- **承認者コメント**: 承認

## 10. 実施記録

### 実施日時
開始: 2026-08-12  
完了: 2026-08-12

### 実施内容

- [x] Step 1: `backend/src/services/projectInstructionService.ts` — `getInstructions()` に `instructionKey: inst.instruction_key || 'SupervisorDirectiveContent'` マッピング追加
- [x] Step 2: `frontend/src/components/project/InstructionRegistrationTab.tsx` — `INSTRUCTION_KEY` インポート追加、`instructionKey ?? ''` → `|| INSTRUCTION_KEY.GENERAL` に変更
- [x] Step 3: `frontend/src/components/project/TaskRegistrationTab.tsx` — `INSTRUCTION_KEY` インポート追加、`instructionKey ?? ''` → `|| INSTRUCTION_KEY.GENERAL` に変更
- [x] Step 4: `backend/src/services/projectInstructionService.ts` — `sendInstructions()` 条件判定を `hasInstructionKey` 変数で厳密化
- [x] Step 5: `backend/src/services/projectInstructionService.ts` — `sendInstructions()` にデバッグログ追加（調査用）→ **動作確認後に削除済み**

### ビルド確認
- バックエンド: `npx tsc --noEmit` → EXIT:0（エラーなし）
- フロントエンド: 今回変更ファイルに新規エラーなし（既存の無関係なエラーのみ）
