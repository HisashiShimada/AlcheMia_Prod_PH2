# タスク計画書: 指示確認API maiml_event_log追加

## メタデータ
- **作成日時**: 2026-03-03 10:44
- **タスクID**: instruction-confirm-event-log
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm` API（指示確認完了）の処理に、
`maiml_event_log` テーブルへのレコード追加処理を実装する。

現状、指示確認時は `instruction_acknowledged_history` にのみ記録しているが、
MaiMLファイルに書き出すためのイベントログを `maiml_event_log` にも保存する必要がある。

## 2. 目的と期待される成果

- [ ] 指示確認時に `maiml_event_log` テーブルにレコードが追加される
- [ ] `sequence_no` はプロジェクト単位で自動採番される
- [ ] `log` カラムに指示対象（トランジション/プロジェクト全体/タスク）に応じたJSON構造が保存される
- [ ] 確認履歴のINSERTとイベントログのINSERTがトランザクションでまとめて処理される

## 3. 調査結果

### 既存ファイル構成

| ファイル | 役割 |
|---------|------|
| `backend/src/controllers/projectController.ts` | `confirmInstruction` コントローラー |
| `backend/src/services/projectService.ts` | `confirmInstruction` サービス |
| `backend/src/repositories/instructionRepository.ts` | 指示確認履歴INSERT等 |
| `backend/src/repositories/eventLogRepository.ts` | maiml_event_logへのINSERT（既存） |
| `backend/src/types/database.ts` | DB型定義 |

### instruction_target の値

DDL（`docs/design/db/ddl/project_instruction.sql`）より：
- `1` = ファイル全体（プロジェクト全体）
- `2` = タスク
- `3` = トランジション

### maiml_event_log テーブル構造

DDL（`docs/design/db/ddl/maiml_event_log.sql`）：
```sql
CREATE TABLE maiml_event_log (
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    sequence_no NUMERIC(5,0) NOT NULL,  -- 自動採番（MAX+1）
    log JSONB,
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    PRIMARY KEY (organization_id, project_id, sequence_no)
);
```

## 4. ID採番ルール

各XML要素のIDはプロジェクト内で一意となるよう以下のルールで採番する：

| 要素 | 属性 | 採番ルール | 例 |
|-----|-----|-----------|-----|
| `<log>` | `id` | `"log_{sequence_no}"` | `log_1`, `log_2` |
| `<evnet>` (トランジション) | `id` | `"evnet_{sequence_no}"` | `evnet_1` |
| `<evnet>` (トランジション) | `ref` | `experiment_instruction_id` をそのまま使用 | `SampleProject_001` |
| `<evnet>` (プロジェクト全体) | `id` | `"evnet_{sequence_no}"` | `evnet_1` |
| `<evnet>` (タスク) | `id` | `"evnet_{sequence_no}"` | `evnet_1` |
| `<evnet>` (タスク) | `ref` | `experiment_instruction_id` をそのまま使用 | `SampleProject_001` |

**理由：**
- `sequence_no` は (organization_id, project_id) 単位のMAX+1採番なのでプロジェクト内一意を保証
- `evnet id` は全ケースで自動発番に統一し、instructionのIDは `@ref` 属性で参照する

## 5. logカラムのJSON構造

### トランジション（instruction_target = 3）

対応するXML:
```xml
<eventLog>
  <log id="log_1" ref="methodのID">
    <trace ref="programのID">
      <evnet id="evnet_1" ref="instructionのID">
        <property key="acknowledged_at" xsi:type="xs:dateTime">2026-03-03T01:07:14.814Z</property>
        <property key="experiment_instruction_id" xsi:type="xs:string">SampleProject_001</property>
        <property key="experiment_user_id" xsi:type="xs:string">user-uuid</property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

JSON表現:
```json
{
  "eventLog": {
    "log": {
      "@id": "log_1",
      "@ref": "method_001",
      "trace": {
        "@ref": "program_001",
        "evnet": {
          "@id": "evnet_1",
          "@ref": "SampleProject_001",
          "property": [
            { "@key": "acknowledged_at", "@xsi:type": "xs:dateTime", "#text": "2026-03-03T01:07:14.814Z" },
            { "@key": "experiment_instruction_id", "@xsi:type": "xs:string", "#text": "SampleProject_001" },
            { "@key": "experiment_user_id", "@xsi:type": "xs:string", "#text": "user-uuid" }
          ]
        }
      }
    }
  }
}
```

> **備考**: `trace @ref` はMAIMLファイルを解析し、`method_id` に対応する `<program>` 要素の `id` 属性を設定する。

### プロジェクト全体（instruction_target = 1）

対応するXML:
```xml
<eventLog>
  <log id="log_1">
    <trace>
    </trace>
  </log>
  <evnet id="evnet_1">
    <property key="acknowledged_at" xsi:type="xs:dateTime">2026-03-03T01:07:14.814Z</property>
    <property key="experiment_instruction_id" xsi:type="xs:string">SampleProject_001</property>
    <property key="experiment_user_id" xsi:type="xs:string">user-uuid</property>
  </evnet>
</eventLog>
```

JSON表現:
```json
{
  "eventLog": {
    "log": {
      "@id": "log_1",
      "trace": {}
    },
    "evnet": {
      "@id": "evnet_1",
      "property": [
        { "@key": "acknowledged_at", "@xsi:type": "xs:dateTime", "#text": "2026-03-03T01:07:14.814Z" },
        { "@key": "experiment_instruction_id", "@xsi:type": "xs:string", "#text": "SampleProject_001" },
        { "@key": "experiment_user_id", "@xsi:type": "xs:string", "#text": "user-uuid" }
      ]
    }
  }
}
```

### タスク（instruction_target = 2）

対応するXML:
```xml
<eventLog>
  <log id="log_1" ref="methodのID">
    <trace ref="programのID" taskno="タスク番号">
      <evnet id="evnet_1" ref="instructionのID">
        <property key="acknowledged_at" xsi:type="xs:dateTime">2026-03-03T01:07:14.814Z</property>
        <property key="experiment_instruction_id" xsi:type="xs:string">SampleProject_001</property>
        <property key="experiment_user_id" xsi:type="xs:string">user-uuid</property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

JSON表現:
```json
{
  "eventLog": {
    "log": {
      "@id": "log_1",
      "@ref": "method_001",
      "trace": {
        "@ref": "program_001",
        "@taskno": "1",
        "evnet": {
          "@id": "evnet_1",
          "@ref": "SampleProject_001",
          "property": [
            { "@key": "acknowledged_at", "@xsi:type": "xs:dateTime", "#text": "2026-03-03T01:07:14.814Z" },
            { "@key": "experiment_instruction_id", "@xsi:type": "xs:string", "#text": "SampleProject_001" },
            { "@key": "experiment_user_id", "@xsi:type": "xs:string", "#text": "user-uuid" }
          ]
        }
      }
    }
  }
}
```

## 6. 実装ステップ

### Phase 1: 型定義追加
- [ ] `backend/src/types/database.ts` に `MaimlEventLog` 型を追加

### Phase 2: Repository層への追加
- [ ] `backend/src/repositories/eventLogRepository.ts` に `insertInstructionConfirmLog` メソッドを追加
  - `instruction_target` に応じてJSON構造を構築する内部ヘルパー関数 `buildEventLogJson` を追加
  - sequence_no は MAX+1 で自動採番（既存の `logEvent` メソッドと同方式）
  - PoolClient を受け取りトランザクション内で動作

### Phase 3: Service層の修正
- [ ] `backend/src/services/projectService.ts` の `confirmInstruction` を修正
  - `getPool().connect()` でPoolClientを取得しトランザクション化
  - `insertAcknowledged` → `insertInstructionConfirmLog` の順に実行
  - エラー時はROLLBACK

## 7. 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/src/types/database.ts` | 修正 | `MaimlEventLog` 型定義を追加 |
| `backend/src/repositories/eventLogRepository.ts` | 修正 | `insertInstructionConfirmLog` メソッドを追加 |
| `backend/src/services/projectService.ts` | 修正 | `confirmInstruction` をトランザクション化し maiml_event_log INSERT を追加 |

## 8. セキュリティ考慮事項
- [ ] organization_id フィルタを全DBクエリに含める
- [ ] Parameterized Query を使用（SQLインジェクション対策）

## 9. 承認記録
- **計画書提示日時**: 2026-03-03 10:44
- **承認日時**: 2026-03-03 10:44
- **承認者コメント**: ID採番ルールの検討を含め承認
