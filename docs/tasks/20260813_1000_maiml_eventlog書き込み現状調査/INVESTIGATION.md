# maiml_event_log 書き込み現状調査

## メタデータ

- **作成日時**: 2026-08-13
- **調査目的**: InstructionEditDialogで指示登録後、指示送信時に maiml_event_log テーブルへ書き出す内容の現状把握
- **調査対象**: 指示登録→指示送信の全フロー

---

## 1. 全体フロー

```
[フロントエンド]
InstructionEditDialog
  └─ 指示入力（指示種別・指示対象・指示内容）
       └─ onSave
            └─ InstructionRegistrationTab.handleSaveInstruction()
                 ├─ 新規: saveInstruction API (POST /api/v1/projects/:projectId/instructions)
                 └─ 更新: updateInstruction API (PUT /api/v1/projects/:projectId/instructions/:instructionId)
                      → project_instruction テーブルに保存（instruction_status = 0: 未送信）

[フロントエンド]
InstructionRegistrationTab の「指示を送信」ボタン
  └─ handleSubmitInstructions()
       └─ sendInstructions API (POST /api/v1/projects/:projectId/instructions/send)

[バックエンド]
projectInstructionController.sendInstructions()
  └─ projectInstructionService.sendInstructions()
       ├─ 1. 未送信指示を取得（findByProject で instruction_status = 0）
       ├─ 2. MAIMLファイルをパース（method_id → program_id マップを構築）
       ├─ 3. 未送信指示を一括「送信済」に更新（bulkUpdateStatus）
       └─ 4. 各指示ごとに maiml_event_log へ書き出し
              └─ EventLogRepository.insertProjectInstructionSentLog()
```

---

## 2. maiml_event_log テーブル定義

**ファイル**: `docs/design/db/ddl/maiml_event_log.sql`

```sql
CREATE TABLE maiml_event_log (
    organization_id UUID          NOT NULL,   -- 組織ID（主キー）
    project_id      VARCHAR(20)   NOT NULL,   -- プロジェクトID（主キー）
    sequence_no     NUMERIC(5,0)  NOT NULL,   -- シーケンス番号（主キー）
    log             JSONB,                    -- ログ本体
    create_user_id  VARCHAR(50),              -- 作成者ユーザID
    update_user_id  VARCHAR(50),              -- 更新者ユーザID
    create_at       TIMESTAMP,                -- 作成日時
    update_at       TIMESTAMP,                -- 更新日時
    CONSTRAINT maiml_event_log_pkey PRIMARY KEY (organization_id, project_id, sequence_no)
);
```

- `sequence_no` は `(organization_id, project_id)` 単位で `MAX + 1` 自動採番
- `log` カラムに JSON 構造を `JSONB` 型で格納

---

## 3. INSERT 処理

**SQL**: `backend/src/sql/queries/event_log/insertEventLog.sql`

```sql
INSERT INTO maiml_event_log (
  organization_id, project_id, sequence_no, log,
  create_user_id, create_at, update_user_id, update_at
) VALUES ($1, $2, $3, $4::jsonb, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP)
```

---

## 4. 書き込みパラメータ（`ProjectInstructionSentLogParams`）

**ファイル**: `backend/src/repositories/eventLogRepository.ts`

| パラメータ名 | 型 | ソース |
|---|---|---|
| `methodId` | `string \| null` | `instruction.method_id ?? null` |
| `transitionId` | `string \| null` | `instruction.transition_id ?? null` |
| `programId` | `string \| null` | MAIMLパース `programIdMap[methodId] ?? null` |
| `taskNo` | `number \| null` | `instruction.task_no ?? null` |
| `experimentInstructionId` | `string` | `instruction.experiment_instruction_id` |
| `userId` | `string` | 送信ユーザーのID |
| `sentAt` | `string` | `new Date().toISOString()` |
| `instructions` | `string \| null` | `instruction.instructions ?? null` |
| `instructionKey` | `string` | `instruction.instruction_key`（例: `Alchemia:SupervisorDirectiveContent`） |

---

## 5. 粒度判定ロジック

`buildProjectInstructionSentLogJson()` 内での分岐条件:

| 優先順位 | 条件 | 粒度 |
|---|---|---|
| 1 | `methodId == null` | **全体指示** |
| 2 | `methodId あり && taskNo != null` | **タスク単位** |
| 3 | `methodId あり && transitionId あり` | **トランジション単位** |
| 4 | `methodId あり`（他なし） | **メソッド単位** |

---

## 6. 共通 property 配列（全粒度共通）

全粒度で以下の 2 要素が `property` 配列として出力される:

```json
[
  {
    "@key": "SupervisorDirectiveTimestamp",
    "@xsi:type": "dateTimeType",
    "#text": "<sentAt（ISO8601文字列）>"
  },
  {
    "@key": "<instructionKey>",
    "@xsi:type": "stringType",
    "#text": "<指示内容テキスト（instructions が null の場合は空文字）>"
  }
]
```

---

## 7. 粒度別 JSON 構造

### パターン①: 全体指示（`methodId = null`）

```json
{
  "eventLog": {
    "@id": "eventLog_<seq>",
    "property": [ ...共通 property... ],
    "ownerRef": { "@ref": "<userId（@ を _ に置換）>" }
  }
}
```

### パターン②: メソッド単位（`methodId あり`、taskNo・transitionId なし）

```json
{
  "eventLog": {
    "@id": "eventLog_<seq>",
    "log": {
      "@id": "log_<seq>",
      "@ref": "<methodId>",
      "property": [ ...共通 property... ],
      "ownerRef": { "@ref": "<userId（@ を _ に置換）>" }
    }
  }
}
```

### パターン③: トランジション単位（`methodId + transitionId あり`）

```json
{
  "eventLog": {
    "@id": "eventLog_<seq>",
    "log": {
      "@id": "log_<seq>",
      "@ref": "<methodId>",
      "trace": {
        "@id": "trace_<seq>",
        "@ref": "<programId（未取得時は trace_<seq>）>",
        "event": {
          "@id": "event_<seq>",
          "@ref": "<experimentInstructionId>",
          "property": [ ...共通 property... ],
          "ownerRef": { "@ref": "<userId（@ を _ に置換）>" }
        }
      }
    }
  }
}
```

### パターン④: タスク単位（`methodId + taskNo あり`）

```json
{
  "eventLog": {
    "@id": "eventLog_<seq>",
    "log": {
      "@id": "log_<seq>",
      "@ref": "<methodId>",
      "trace": {
        "@id": "trace_<seq>",
        "@ref": "<programId（未取得時は trace_<seq>）>",
        "@taskno": "<taskNo（文字列変換）>",
        "event": {
          "@id": "event_<seq>",
          "@ref": "<experimentInstructionId>",
          "resultsRef": { "@ref": "results_<seq>" },
          "property": [ ...共通 property... ],
          "ownerRef": { "@ref": "<userId（@ を _ に置換）>" }
        }
      }
    }
  }
}
```

---

## 8. ID 採番ルール

| 要素 | 採番ルール |
|---|---|
| `eventLog/@id` | `"eventLog_<sequence_no>"` |
| `log/@id` | `"log_<sequence_no>"` |
| `trace/@id` | `"trace_<sequence_no>"` |
| `event/@id` | `"event_<sequence_no>"` |
| `resultsRef/@ref` | `"results_<sequence_no>"` （タスク単位のみ） |
| `ownerRef/@ref` | `userId` の `"@"` を `"_"` に置換した値 |

---

## 9. project_instruction テーブルとの対応

**ファイル**: `backend/src/types/database.ts`（`ProjectInstruction` 型）

| DB カラム | 型 | maiml_event_log への利用 |
|---|---|---|
| `experiment_instruction_id` | string | `experimentInstructionId`（`event/@ref`） |
| `method_id` | string \| null | `methodId`（粒度判定 + `log/@ref`） |
| `task_no` | number \| null | `taskNo`（粒度判定 + `trace/@taskno`） |
| `transition_id` | string \| null | `transitionId`（粒度判定） |
| `instructions` | string \| null | `instructions`（`property[@key=instructionKey]/#text`） |
| `instruction_key` | string | `instructionKey`（`property/@key`） |

`programId` のみ DB カラムではなく、MAIMLファイルをパースして `method_id → program_id` マップで解決。

---

## 10. MAIMLファイルからの programId 取得

**ファイル**: `backend/src/services/projectInstructionService.ts`（`buildProgramIdMap()`）

1. `file_metadata` テーブルから `project_uuid` に紐づく `.maiml` ファイルの `file_key` を取得
2. ストレージからファイルをダウンロード・パース
3. `maiml.protocol.method[]` を走査して `method['@_id'] → method.program['@_id']` マップを構築
4. 取得失敗時は空マップで継続（`programId = null` として処理）

---

## 11. 他の書き込みメソッドとの比較

`EventLogRepository` には複数の書き込みメソッドが存在する:

| メソッド | 呼び出しタイミング | property キー構成 |
|---|---|---|
| `insertProjectInstructionSentLog()` | 指示送信時（**本調査対象**） | `SupervisorDirectiveTimestamp` + `<instructionKey>` の 2 件 |
| `insertInstructionSentLog()` | （旧実装・現在は呼ばれない） | `sent_at` / `experiment_instruction_id` / `instruction_user_id` / `instructions` の 4 件 |
| `insertInstructionConfirmLog()` | ワーカーの指示確認時 | 確認日時等を記録 |
| `insertTransitionProgressLog()` | トランジション進捗更新時 | `timestamp` / `worker_id` / `status` / `progress_percentage` / `report_type` / `comments` |
| `logEvent()` | トランジション状態更新等 | 汎用イベントログ（`event_type` / `method_id` / `task_no` 等） |

---

## 12. 関連ファイル一覧

| ファイルパス | 役割 |
|---|---|
| `frontend/src/components/project/InstructionEditDialog.tsx` | 指示入力ダイアログ UI |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | 指示一覧・保存・送信ボタン |
| `frontend/src/services/projectApiService.ts` | フロントエンド API 呼び出し（`sendInstructions`） |
| `backend/src/controllers/projectInstructionController.ts` | 送信 API エンドポイント |
| `backend/src/services/projectInstructionService.ts` | 送信ビジネスロジック・MAIMLパース |
| `backend/src/repositories/eventLogRepository.ts` | maiml_event_log への書き込み |
| `backend/src/sql/queries/event_log/insertEventLog.sql` | INSERT SQL |
| `backend/src/sql/queries/event_log/getNextSequenceNo.sql` | sequence_no 採番 SQL |
| `backend/src/types/database.ts` | `ProjectInstruction` 型定義 |
| `docs/design/db/ddl/maiml_event_log.sql` | テーブル DDL |

