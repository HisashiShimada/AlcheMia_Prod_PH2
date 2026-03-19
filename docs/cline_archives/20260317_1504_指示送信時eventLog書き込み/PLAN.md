# タスク計画書: 指示送信時 eventLog 書き込み

## メタデータ
- **作成日時**: 2026-03-17 15:04
- **タスクID**: instruction-send-eventlog
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

プロジェクト管理画面の指示一覧タブで「指示送信」を実行した際（`POST /api/v1/projects/:projectName/instructions/send`）に、`maiml_event_log` テーブルへの書き込みを行う。

参考にするのは**実験作業者画面の指示確認処理**（`projectService.confirmInstruction()`）であり、同処理内で `EventLogRepository.insertInstructionConfirmLog()` を呼び出している実装パターンに倣う。

---

## 2. 現状の調査結果

### 2-1. 指示送信処理の流れ（現状）

```
POST /api/v1/projects/:projectName/instructions/send
  → projectRoutes.ts
  → projectInstructionController.ts#sendInstructions()
  → projectInstructionService.ts#sendInstructions()
      1. 未送信指示を取得 (projectInstructionRepository.findByProject)
      2. 未送信指示を一括で送信済に更新 (projectInstructionRepository.bulkUpdateStatus)
      3. ← ここで maiml_event_log への書き込みが未実装
```

### 2-2. 参考にする処理（confirmInstruction）

`backend/src/services/projectService.ts` の `confirmInstruction()`:

1. MAIMLファイルをパースして `programId` を取得
2. トランザクション内で:
   - `instruction_acknowledged_history` テーブルへ挿入
   - `EventLogRepository.insertInstructionConfirmLog()` を呼び出して `maiml_event_log` へ書き込み

### 2-3. EventLogRepository.insertInstructionConfirmLog の JSON 構造

`instruction_target` の値に応じて以下の 3 パターンの JSON が生成される：

| target | 意味 | JSON 構造 |
|--------|------|-----------|
| 1 | ファイル全体 | `eventLog > log > trace > evnet` （ref なし） |
| 2 | タスク | `eventLog > log > trace(@taskno) > evnet` |
| 3 | トランジション | `eventLog > log > trace > evnet` |

property の内容（確認時）:
- `acknowledged_at`: 確認日時
- `experiment_instruction_id`: 指示ID
- `experiment_user_id`: 確認ユーザID

### 2-4. 指示送信時との差異

指示送信は**送信者（実験管理者）側**の操作であるため、プロパティのキー名を以下のように変える：

| プロパティキー | 確認時 | 送信時 |
|--------------|--------|--------|
| 日時 | `acknowledged_at` | `sent_at` |
| 指示ID | `experiment_instruction_id` | `experiment_instruction_id` |
| ユーザID | `experiment_user_id` | `instruction_user_id` |

---

## 3. 実装方針

### 方針
`EventLogRepository` に新しいメソッド `insertInstructionSentLog()` を追加し、`projectInstructionService.ts` の `sendInstructions()` 内でトランザクション内にて各指示ごとに呼び出す。

**JSON 構造は `insertInstructionConfirmLog` と同じ階層構造**を使用し、property キーのみ送信用に変える。

### 処理フロー（変更後）

```
sendInstructions()
  1. トランザクション開始（既存）
  2. プロジェクト情報取得（既存）
  3. 未送信指示を取得（既存）
  4. 【NEW】MAIMLファイルをパースして programId マップを作成
       - method_id ごとに program/@id を取得（1ファイルのみ）
  5. 未送信指示を一括で送信済に更新（既存）
  6. 【NEW】各指示に対して maiml_event_log に書き込み
       for each instruction:
         EventLogRepository.insertInstructionSentLog(...)
  7. トランザクションコミット（既存）
```

---

## 4. 変更ファイル

### 新規追加メソッド
1. `backend/src/repositories/eventLogRepository.ts`
   - `insertInstructionSentLog()` メソッドを追加
   - `InstructionSentLogParams` インターフェースを追加

### 変更ファイル
2. `backend/src/services/projectInstructionService.ts`
   - `sendInstructions()` に以下を追加:
     - MAIMLファイルのパース処理（programId マップ作成）
     - ループ内での `insertInstructionSentLog()` 呼び出し
   - `EventLogRepository` のインポート追加
   - `getStorageService` のインポート追加
   - `XMLParser` のインポート追加

---

## 5. 実装詳細

### 5-1. eventLogRepository.ts への追加

```typescript
/**
 * 指示送信ログのパラメータ
 */
export interface InstructionSentLogParams {
  /** 指示対象: 1=ファイル全体、2=タスク、3=トランジション */
  instructionTarget: number;
  /** メソッドID */
  methodId: string | null;
  /** トランジションID */
  transitionId: string | null;
  /** programのID（MAIMLファイルから解析） */
  programId: string | null;
  /** タスク連番 */
  taskNo: number | null;
  /** 実験指示ID */
  experimentInstructionId: string;
  /** 送信ユーザID */
  userId: string;
  /** 送信日時（ISO8601文字列） */
  sentAt: string;
}

async insertInstructionSentLog(
  organizationId: string,
  projectId: string,
  params: InstructionSentLogParams,
  client: PoolClient
): Promise<void>
```

生成する JSON 構造（target=3 例）：
```json
{
  "eventLog": {
    "log": {
      "@id": "log_1",
      "@ref": "method_id",
      "trace": {
        "@id": "trace_1",
        "@ref": "program_id",
        "evnet": {
          "@id": "evnet_1",
          "@ref": "experimentInstructionId",
          "property": [
            { "@key": "sent_at", "@xsi:type": "dateTimeType", "#text": "2026-03-17T..." },
            { "@key": "experiment_instruction_id", "@xsi:type": "stringType", "#text": "xxx_001" },
            { "@key": "instruction_user_id", "@xsi:type": "stringType", "#text": "user_id" }
          ]
        }
      }
    }
  }
}
```

### 5-2. projectInstructionService.ts の変更点

#### インポート追加
```typescript
import { EventLogRepository } from '../repositories/eventLogRepository';
import { getStorageService } from './storageService';
import { XMLParser } from 'fast-xml-parser';
import { logError } from '../utils/logger';
```

#### sendInstructions() 内の変更

bulkUpdateStatus の後に以下を追加（トランザクション `client` 使用）：

```typescript
// MAIMLファイルをパースして programId マップを作成
const programIdMap = await buildProgramIdMap(organizationId, projectName);

// 指示送信ログの書き込み
const sentAt = new Date().toISOString();
const eventLogRepo = new EventLogRepository();
for (const instruction of unsentInstructions) {
  const methodId = instruction.method_id ?? null;
  const programId = methodId ? (programIdMap[methodId] ?? null) : null;
  await eventLogRepo.insertInstructionSentLog(
    organizationId,
    projectId,
    {
      instructionTarget: instruction.instruction_target ?? 1,
      methodId,
      transitionId: instruction.transition_id ?? null,
      programId,
      taskNo: instruction.task_no ?? null,
      experimentInstructionId: instruction.experiment_instruction_id!,
      userId,
      sentAt,
    },
    client
  );
}
```

#### ヘルパー関数 buildProgramIdMap の追加（ファイル末尾）

```typescript
// MAIMLファイルから method_id → program_id のマップを構築
async function buildProgramIdMap(...): Promise<Record<string, string>>
```

---

## 6. 影響範囲

- `maiml_event_log` テーブルにレコードが追加される（指示送信1回につき未送信指示件数分）
- トランザクション内での処理のため、失敗時はロールバック（指示送信全体が失敗）
- MAIMLファイルが存在しない場合は programId を null として処理継続（エラーにしない）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLファイルパース失敗 | 低 | 低 | ログのみ記録し programId=null で継続（confirmInstruction と同様） |
| 大量指示送信時のパフォーマンス | 中 | 低 | MAIMLパースは1回のみ、SQLは指示件数分発行 |
| トランザクション失敗 | 高 | 低 | 既存の ROLLBACK 処理内に含まれるため自動対応 |

---

## 8. テスト計画

### 手動テスト
- [ ] 未送信指示が1件の場合: maiml_event_log に1件追加されること
- [ ] 未送信指示が複数件の場合: 件数分 maiml_event_log に追加されること
- [ ] instruction_target=1(ファイル全体)の場合: refなしのJSON構造
- [ ] instruction_target=2(タスク)の場合: @tasknoありのJSON構造
- [ ] instruction_target=3(トランジション)の場合: traceにprogramIdのJSON構造
- [ ] MAIMLファイルが存在しない場合: エラーにならず送信成功

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-17 15:04
- **承認日時**: 2026-03-17 15:10
- **承認者コメント**: propertyのキー名修正（sent_at, instruction_user_id）

## 10. 実施記録

### 実施日時
開始: 2026-03-17 15:10
完了: 2026-03-17 15:14

### 変更ファイル
1. `backend/src/repositories/eventLogRepository.ts` - `InstructionSentLogParams` インターフェースと `insertInstructionSentLog()` メソッドを追加
2. `backend/src/services/projectInstructionService.ts` - `sendInstructions()` に `projectName` 引数追加・eventLog書き込み処理追加・`buildProgramIdMap()` ヘルパー関数追加
3. `backend/src/controllers/projectInstructionController.ts` - `sendInstructions()` に `projectName` を渡すよう修正

### ビルド確認
- `npx tsc --noEmit` → EXIT_CODE: 0（エラーなし）

### 最終的な成果物
- [x] `insertInstructionSentLog()` を `EventLogRepository` に追加
- [x] `sendInstructions()` 内でトランザクション内に eventLog 書き込みを追加
- [x] MAIMLファイルパース（`buildProgramIdMap()`）によって programId を取得
- [x] TypeScript ビルド成功
