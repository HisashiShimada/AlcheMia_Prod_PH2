# タスク計画書: 評価 eventLog の完了時自動書き出し ＆ exportToMaiml 削除

## メタデータ
- **作成日時**: 2026-09-29 10:00
- **タスクID**: 20260929_1000
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

### 現状の問題

プロジェクト完了処理（`completeProject`）は以下の順序で動作する。

```
① DB: project_status を COMPLETED(4) に更新
② COMMIT
③ MaimlWriterService.writeEventLogOnly() で maiml_event_log テーブルの内容を MAiML に書き出し
```

`writeEventLogOnly()` は `maiml_event_log` テーブルにある既存ログのみを書き出すため、
**`project_overall_evaluations` テーブルに登録された品質評価データは書き出されない**。

---

## 2. 目的と期待される成果

`completeProject()` の MAiML 書き出しステップを以下のように変更する。

**変更後の処理順序:**

```
③ buildQualityEvalLogEntries() で品質評価データを EventLogJsonRecord[] に変換
   → maiml_event_log テーブルに INSERT（品質評価ログ）
④ MaimlWriterService.writeEventLogOnly() で（品質評価ログ込みの）maiml_event_log を MAiML に書き出し
```

### 削除対象（不要になるため）

- `exportToMaiml` 関数（Controller/Routes/Frontend）
- フロントエンドの `exportOverallEvaluationToMaiml()` 呼び出し

---

## 3. 実装ステップ

### Step 1: `EventLogRepository` に品質評価 INSERT メソッドを追加

**ファイル**: `backend/src/repositories/eventLogRepository.ts`

`EventLogJsonRecord[]` を受け取って `maiml_event_log` テーブルに INSERT するメソッドを追加する。
既存の `insertRecordCorrectionLog` の INSERT パターンを踏襲する。

**メソッド名**: `insertQualityEvalLogEntries`

```typescript
async insertQualityEvalLogEntries(
  organizationId: string,
  projectId: string,
  entries: EventLogJsonRecord[]
): Promise<void>
```

- `entries` が空配列の場合は何もしない（早期 return）
- 各 `entry` を1件ずつ INSERT（sequence_no は既存の採番クエリで取得）
- `updated_by` には `'system'` を設定（品質評価はシステムによる書き込みのため）
- pool（トランザクションなし）で実行 ※ COMMIT 後に呼ばれるため

### Step 2: `projectService.ts` の `completeProject()` 修正

**ファイル**: `backend/src/services/projectService.ts`

#### 追加 import

```typescript
import {
  buildQualityEvalLogEntries,
  resolveTransitionToInstructionMap,
  resolveTransitionToProgramMap,
  removeUncertaintiesWrapper,
} from '../utils/maimlQualityWriter';
import * as projectOverallEvaluationRepository from '../repositories/projectOverallEvaluationRepository';
import { getStorageService } from './storageService';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
```

#### 処理追加（COMMIT 直後）

```
③ 品質評価 eventLog を maiml_event_log テーブルに INSERT（try/catch で警告扱い）
  a. MAiML ファイルをダウンロード（存在しない場合はスキップ）
  b. transition → instruction/program マッピングを解決
  c. 品質評価データを DB から取得
  d. buildQualityEvalLogEntries() で EventLogJsonRecord[] を生成
  e. insertQualityEvalLogEntries() で INSERT
④ MaimlWriterService.writeEventLogOnly() で MAiML に書き出し（既存処理）
```

### Step 3: `exportToMaiml` の削除

#### 3-1. `projectOverallEvaluationController.ts` — `exportToMaiml` 関数を削除

#### 3-2. `projectOverallEvaluationRoutes.ts` — `POST /:projectId/export-to-maiml` ルートを削除

#### 3-3. `projectOverallEvaluationApiService.ts` — `exportToMaiml()` 関数を削除

#### 3-4. `ProjectCompletionDialog.tsx`

- `import { exportToMaiml as exportOverallEvaluationToMaiml }` を削除
- `handleComplete` 内の `exportOverallEvaluationToMaiml()` 呼び出しブロック（try/catch ごと）を削除

---

## 4. 影響範囲

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/src/services/projectService.ts` | **修正** | `completeProject()` に品質評価 eventLog INSERT 処理を追加 |
| `backend/src/repositories/eventLogRepository.ts` | **修正** | `insertQualityEvalLogEntries()` メソッドを追加 |
| `backend/src/controllers/projectOverallEvaluationController.ts` | **修正** | `exportToMaiml` 関数を削除 |
| `backend/src/routes/projectOverallEvaluationRoutes.ts` | **修正** | `POST /:projectId/export-to-maiml` ルートを削除 |
| `frontend/src/services/projectOverallEvaluationApiService.ts` | **修正** | `exportToMaiml()` 関数を削除 |
| `frontend/src/components/project/ProjectCompletionDialog.tsx` | **修正** | `exportOverallEvaluationToMaiml()` 呼び出しを削除 |

### 非影響範囲

- `backend/src/utils/maimlQualityWriter.ts` — 変更なし（`buildQualityEvalLogEntries` をそのまま使用）
- `backend/src/services/qualityEvaluationMaimlService.ts` — 変更なし（今回はデッドコード化するが削除しない）
- `backend/src/services/maimlWriterService.ts` — 変更なし

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 品質評価データが0件の場合 | 低 | 低 | `entries.length === 0` の場合はスキップ |
| MAiML ファイルが存在しない場合 | 低 | 低 | ファイル存在確認してスキップ（警告ログのみ） |
| 品質評価 INSERT 後の writeEventLogOnly() が全件上書きするため正しく動作するか | 中 | 低 | writeEventLogOnly は maiml_event_log を全件取得して上書きするため INSERT 済みの品質評価ログも含まれる（正常動作） |

---

## 6. テスト計画

### コンパイル確認
- [ ] `cd backend && npx tsc --noEmit` がエラーなく通ること
- [ ] `cd frontend && npx tsc --noEmit` がエラーなく通ること

### 手動テスト
- [ ] 品質評価登録済みの状態でプロジェクト完了 → MAiML の `<eventLog>` に品質評価データが出力されること
- [ ] 品質評価データが未登録の状態でプロジェクト完了しても正常完了すること
- [ ] MAiML ファイルが存在しない状態でプロジェクト完了しても正常完了すること

---

## 7. 承認記録

- **計画書提示日時**: 2026-09-29 10:00
- **承認日時**: 2026-09-29 10:00
- **承認者コメント**: 承認済み

## 8. 実施記録

### 実施日時
開始: 2026-09-29 10:00
完了: 2026-09-29 10:30

### 最終的な成果物
- [x] `backend/src/repositories/eventLogRepository.ts` — `getPool` import 追加、`EventLogJsonRecord` import 追加、`insertQualityEvalLogEntries()` メソッド追加
- [x] `backend/src/services/projectService.ts` — `buildQualityEvalLogEntries`, `resolveTransitionToInstructionMap`, `resolveTransitionToProgramMap`, `removeUncertaintiesWrapper`, `projectOverallEvaluationRepository` import 追加、`completeProject()` に品質評価 eventLog INSERT 処理（③）追加
- [x] `backend/src/controllers/projectOverallEvaluationController.ts` — `exportToMaiml` 関数・`qualityEvaluationMaimlService` import を削除
- [x] `backend/src/routes/projectOverallEvaluationRoutes.ts` — `POST /:projectId/export-to-maiml` ルートを削除
- [x] `frontend/src/services/projectOverallEvaluationApiService.ts` — `exportToMaiml()` 関数・`ExportToMaimlResult` import を削除
- [x] `frontend/src/components/project/ProjectCompletionDialog.tsx` — `exportOverallEvaluationToMaiml` import・呼び出しブロックを削除

### コンパイル確認
- [x] `backend`: `npx tsc --noEmit` — EXIT_CODE:0 (エラーなし)
- [x] `frontend`: `npx tsc --noEmit` — 今回変更ファイルに起因するエラーなし（`.next/types/validator.ts` の既存エラー1件のみ）
