# タスク計画書: approveTask における Data タグ書き込み処理追加

## メタデータ

- **作成日時**: 2026-09-24 10:00
- **更新日時**: 2026-09-24 10:30（methodId/taskNo フィルタリング対応方針を追加）
- **タスクID**: 20260924_1000
- **優先度**: 高
- **推定工数**: 2時間

---

## 1. タスク概要

`ExperimentInstructionTab` の `handleBulkExecute`（承認処理ダイアログの実行ボタン）は、最終的にバックエンドの `experimentInstructionService.approveTask` を呼び出す。

現在 `approveTask` は COMMIT 後の MAIML ファイル書き込みで `maimlWriterService.writeEventLogOnly` を呼んでおり、**`<data>` タグへの書き込みが行われていない**。

ただし、**単純に `writeDataAndEventLog` に差し替えるだけでは問題がある**。  
承認はメソッド・タスク単位で行われるため、未承認のタスクのデータまで `<data>` タグに書き込んでしまう。

**正しい動作**: 承認されたメソッドID・タスク番号の `template_data` のみを `<data>` タグへ書き込む。

---

## 2. 現状と問題点

### 現状の処理フロー（`approveTask`）

```
1. BEGIN
2. projectTaskDetailRepo.approveTask() — task_status を 3（完了）に更新
3. eventLogRepo.insertTaskReviewLog() — DB に eventLog 記録
4. COMMIT
5. maimlWriterService.writeEventLogOnly()  ← ⚠️ <data> 書き込みなし
```

### `writeDataAndEventLog` を単純に呼ぶと起こる問題

`writeDataAndEventLog` はプロジェクト全件の `template_data` を取得して `<data>` タグに書き込む。  
Phase2 以降、承認はタスク単位で行われるため、**未承認タスクのデータまで書き込んでしまう**。

---

## 3. 解決方針

### 方針: `writeDataAndEventLog` に `methodId` / `taskNo` フィルタを追加

`MaimlWriterService.writeDataAndEventLog` に省略可能な引数 `targetFilter?: { methodId: string; taskNo: number }` を追加する。

- `targetFilter` が指定された場合 → 指定 methodId + taskNo の `template_data` のみを `<data>` タグに書き込む
- `targetFilter` が未指定の場合 → 従来通りプロジェクト全件を書き込む（既存の呼び出し箇所は互換維持）

### 処理フロー（修正後の `approveTask`）

```
1. BEGIN
2. projectTaskDetailRepo.approveTask()
3. eventLogRepo.insertTaskReviewLog()
4. COMMIT
5. maimlWriterService.writeDataAndEventLog(
     organizationId, projectId, projectName,
     { methodId, taskNo }   ← 承認タスクのみ書き込み
   )
```

---

## 4. 影響範囲分析

### 変更対象ファイル

| # | ファイル | 変更内容 |
|---|----------|----------|
| 1 | `backend/src/services/maimlWriterService.ts` | `writeDataAndEventLog` に省略可能な第4引数 `targetFilter?` を追加し、フィルタリングロジックを実装 |
| 2 | `backend/src/services/experimentInstructionService.ts` | `approveTask` 内の `writeEventLogOnly` → `writeDataAndEventLog` に変更し `{ methodId, taskNo }` を渡す |

### `writeDataAndEventLog` の既存呼び出し箇所（互換確認・変更不要）

| 呼び出し元 | 変更要否 |
|-----------|---------|
| `experimentInstructionService.correctRecord` | 不要（全件書き込みで正しい） |
| `projectService.ts`（2箇所） | 不要（全件書き込みで正しい） |

---

## 5. 実装ステップ詳細

### Step 1: `maimlWriterService.ts` の `writeDataAndEventLog` に `targetFilter` 引数を追加

**シグネチャ変更**:

```typescript
async writeDataAndEventLog(
  organizationId: string,
  projectId: string,
  projectName: string,
  targetFilter?: { methodId: string; taskNo: number }  // ← 追加
): Promise<void>
```

**template_data 取得後（Step 3 直後）にフィルタリング追加**:

```typescript
const filteredTemplateDataRows = targetFilter
  ? templateDataRows.filter(
      (row) => row.method_id === targetFilter.methodId
            && row.task_no   === targetFilter.taskNo
    )
  : templateDataRows;
```

以降の `buildDataXML` ・ uncertainty_judge 注入処理は `filteredTemplateDataRows` を使用する。

**uncertainty_judge フィルタリング**:

```typescript
const methodIds = targetFilter
  ? [targetFilter.methodId]
  : [...new Set(filteredTemplateDataRows.map((r) => r.method_id))];

// for ループ内（findAllByProject 後にメモリフィルタ）
const allJudgeRows = await judgeRepo.findAllByProject(organizationId, projectId, methodId);
const judgeRows = targetFilter
  ? allJudgeRows.filter((jr) => jr.taskNo === targetFilter.taskNo)
  : allJudgeRows;
```

### Step 2: `experimentInstructionService.ts` の `approveTask` を修正

```typescript
// 変更前
await maimlWriterService.writeEventLogOnly(organizationId, projectId, projectName);

// 変更後
const targetFilter = { methodId, taskNo };
await maimlWriterService.writeDataAndEventLog(organizationId, projectId, projectName, targetFilter);
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 省略可能引数追加による既存呼び出しへの影響 | 高 | 低 | `?` で省略可能のため既存挙動は変わらない。TypeScript コンパイルで確認可 |
| 承認対象タスクの `template_data` が空の場合 | 低 | 低 | `buildDataXML` は空行 → 空 `<results>` を出力する仕様で問題なし |
| uncertainty_judge のメモリフィルタによるパフォーマンス | 低 | 低 | データ量は限定的（タスク単位）のため問題なし |

---

## 7. テスト計画

### 手動確認

- [ ] 承認処理後に MAIML の `<data>` タグに**承認タスクの**実績値が書き込まれること
- [ ] 承認処理後に MAIML の `<eventLog>` タグが更新されること
- [ ] **未承認タスクのデータが `<data>` タグに含まれないこと**
- [ ] `template_data` が空でも承認処理が正常完了すること
- [ ] 既存の `correctRecord` が全件書き込みで正常動作すること

### 既存テスト確認

- [ ] `backend/tests/phase2/controllers/experimentInstructionController.phase2.test.ts` が PASS すること

---

## 8. 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `backend/src/services/maimlWriterService.ts` | 修正 | `writeDataAndEventLog` に省略可能第4引数 `targetFilter?` を追加 |
| 2 | `backend/src/services/experimentInstructionService.ts` | 修正 | `approveTask` で `writeDataAndEventLog` を `{ methodId, taskNo }` フィルタ付きで呼び出す |

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-24 10:30
- **承認日時**: 2026-09-24 10:30
- **承認者コメント**: 承認します。
