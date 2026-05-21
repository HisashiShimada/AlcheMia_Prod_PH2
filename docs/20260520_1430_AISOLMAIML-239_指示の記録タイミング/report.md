# 調査報告: MAIMLファイルを書き出す・データを追加するAPI

**調査日時**: 2026-05-20 11:04  
**調査者**: Cline  
**調査対象**: `docs/design/api/` 配下の全API設計書 + バックエンドソースコード

---

## 1. MAIMLファイルを書き出す（保存・出力）API

### 1.1 POST `/api/v1/maiml/save` ✅ 実装済み

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_maiml_editor.md` API #3 |
| 実装ファイル | `backend/src/controllers/maimlController.ts` (`save`) |
| 認証 | 必須（experiment_admin, system_admin） |
| 概要 | MAIMLファイルのXMLコンテンツをS3/Swiftに保存。バックアップ（archive）も作成可能 |

**リクエストボディ**:
```json
{
  "content": "<?xml version=\"1.0\"?>...",
  "fileName": "sample_project.maiml",
  "createBackup": true
}
```

**S3保存パス**:
- 現在版: `{organizationId}/projects/{project_name}/{project_name}.maiml`
- アーカイブ: `{organizationId}/projects/{project_name}/archive/{project_name}_vN.maiml`

---

### 1.2 PUT `/api/v1/projects/:projectId/maiml` ✅ 実装済み

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_maiml_editor.md` API #2 |
| 実装ファイル | `backend/src/controllers/maimlController.ts` |
| 認証 | 必須（experiment_admin, system_admin） |
| 概要 | プロジェクト配下のMAIMLファイルを上書き保存（冪等性あり、PUTメソッド） |

---

### 1.3 PUT `/api/v1/formats/:formatId/maiml` ✅ 実装済み

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_maiml_editor.md` API #2 |
| 認証 | 必須（experiment_admin, system_admin） |
| 概要 | フォーマット配下のMAIMLファイルを上書き保存 |

---

### 1.4 POST `/api/v1/projects/:projectName/publish` ✅ 実装済み（非同期）

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_maiml_opendata.md` |
| 実装ファイル | `backend/src/workers/maimlPublishWorker.ts` |
| 認証 | 必須（experiment_admin） |
| 概要 | MAIMLファイルをOpenDataとして公開する非同期バッチ処理。BullMQキュー経由でWorkerが実行 |

---

### 1.5 POST `/api/v1/projects/:projectName/checkin` ✅ 実装済み（MAIMLへのデータ書き込み含む）

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_project_management.md` API #4 |
| 実装ファイル | `backend/src/controllers/projectController.ts` (`checkin`) |
| 認証 | 必須（experiment_admin, system_admin） |
| 概要 | プロジェクトをチェックインし、排他編集を終了。**チェックイン時にMAIMLファイルへ実験データを書き込む** |

**チェックイン時のMAIML書き込み処理（MaimlWriterService）**:
- `backend/src/services/maimlWriterService.ts` の `writeDataAndEventLog()` を呼び出す
- DBの `template_data` テーブルから実験データを取得し、MAIMLの対応するプレースのプロパティ値を更新
- DBの `maiml_event_log` テーブルからイベントログを取得し、MAIMLのイベントログセクションに追記
- 更新したMAIMLをS3/Swiftに保存

---

## 2. MAIMLファイルにデータを追加するAPI

### 2.1 POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` ✅ 実装済み

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_experiment_data.md` API #1 |
| 実装ファイル | `backend/src/controllers/experimentController.ts` (`saveBatchData`) |
| 認証 | 必須（experiment_worker のみ書込可） |
| 概要 | 実験データ（テンプレート実績）を複数プレース分一括保存（UPSERT）。**DBの `template_data` テーブルへ保存。MAIMLファイル本体には直接書き込まない** |

**リクエストボディ（バッチ保存）**:
```json
{
  "records": [
    {
      "placeId": "place_001",
      "data": {
        "templateId": "mat_001",
        "templateType": "material",
        "properties": [
          { "key": "temperature", "xsiType": "floatType", "value": 25.5, "units": "°C" }
        ]
      },
      "comment": "記録完了"
    }
  ]
}
```

**重要な特徴**:
- All or Nothing トランザクション保証
- `project_status = 2`（タスク実行中）のみ保存可能
- `use_deemed_progress = true` の組織では、保存時に `transition_data` のステータスを自動更新（みなし進捗）
- **MAIMLファイル本体は更新しない。チェックイン時（1.5）にまとめてMAIMLへ反映される**

---

### 2.2 POST `/api/v1/projects/:projectName/task-registration` ✅ 実装済み

| 項目 | 内容 |
|------|------|
| ドキュメント | `docs/design/api/api_project_management.md` API #18 |
| 実装ファイル | `backend/src/controllers/taskRegistrationController.ts` (`saveTaskRegistration`) |
| 認証 | 必須（experiment_admin, system_admin） |
| 概要 | タスク登録情報を保存（MAIMLのmethod情報をもとにDB登録）。`project_task` / `project_task_detail` テーブルへ保存 |

---

## 3. MaimlWriterService の詳細

### 3.1 呼び出し元

| 処理 | 呼び出し箇所 |
|------|-------------|
| **チェックイン** | `projectController.ts` → `projectService.checkin()` → `maimlWriterService.writeDataAndEventLog()` |

### 3.2 writeDataAndEventLog() の処理内容

1. DBから `template_data` テーブルの実験データを取得（対象プロジェクト・organization_id）
2. DBから `maiml_event_log` テーブルのイベントログを取得
3. MAIMLファイルをS3/Swiftからダウンロード
4. MAIMLの各プレースのプロパティ値を `template_data` の値で更新
5. MAIMLのイベントログセクションを `maiml_event_log` の内容で更新
6. 更新済みMAIMLをS3/Swiftに保存（上書き）

### 3.3 MAIMLに出力されるデータ

| データ | MAIMLへの出力 | 備考 |
|--------|--------------|------|
| `template_data`（実験データ） | ✅ 出力される | プレースのプロパティ値として書き込まれる |
| `maiml_event_log`（イベントログ） | ✅ 出力される | MAIMLのイベントログセクションに追記 |
| `project_instruction`（指示情報） | ❌ **出力されない** | DBにのみ保存。MAIMLには書き込まれない |

---

## 4. まとめ

### APIと処理の流れ

```
実験データ記録（API 2.1）
  └→ template_data テーブルにUPSERT（MAIMLは変更しない）

トランジションステータス更新（PATCH /progress/.../transitions/:id/status）
  └→ transition_data テーブルを更新
  └→ maiml_event_log テーブルに追記

チェックイン（API 1.5: POST /checkin）
  └→ MaimlWriterService.writeDataAndEventLog() 呼び出し
      └→ template_data + maiml_event_log の内容をMAIMLに反映
      └→ S3/SwiftのMAIMLファイルを上書き保存

MAIMLファイル直接保存（API 1.1: POST /maiml/save）
  └→ エディタでの編集内容をS3/Swiftに保存
  └→ バックアップ（archive）も作成可能
```

### project_instruction がMAIMLに出力されない理由

`project_instruction` テーブルは作業指示をワーカーに通知するためのDBテーブルであり、  
MAIMLフォーマットのデータ構造（プレース・トランジション・実験データ）とは別概念のため、  
`MaimlWriterService` の処理対象外となっている。

指示情報はMAIMLには含まれず、DBのみで管理される設計である。

---

## 5. project_instruction と maiml_event_log の関係

### 5.1 指示「追加」時点では maiml_event_log に書き込まれない

指示の保存（`saveInstruction()`）は `project_instruction` テーブルへのINSERTのみを行う。  
この時点では `maiml_event_log` への書き込みは行われない。

```
saveInstruction()
  └→ projectInstructionRepository.insert()  ← project_instruction テーブルのみ
     （maiml_event_log への処理なし）
```

### 5.2 指示「送信」操作のタイミングで maiml_event_log に書き込まれる

未送信指示を一括送信する `sendInstructions()` が呼ばれた際に、トランザクション内で以下が実行される。

```
sendInstructions()
  └→ BEGIN トランザクション
       1. project_instruction の instruction_status を 0（未送信）→ 1（送信済）に UPDATE
       2. maiml_event_log に送信ログをINSERT（各指示ごとに insertInstructionSentLog() を呼び出し）
     COMMIT
```

### 5.3 project_instruction カラムの書き出し可否

`maiml_event_log` に書き出されるのは以下の限られた項目のみ。

| `project_instruction` カラム | maiml_event_log への書き出し | 書き出される場所 |
|------------------------------|---------------------------|----------------|
| `experiment_instruction_id` | ✅ 書き出される | `evnet/@ref`、`property: experiment_instruction_id` |
| `method_id` | ✅ 書き出される | `log/@ref` |
| `task_no` | ✅ 書き出される（タスク指示のみ） | `trace/@taskno` |
| `instruction_user_id` | ✅ 書き出される | `property: instruction_user_id` |
| `instructions`（指示内容テキスト） | ❌ 書き出されない | — |
| `priority`（優先度） | ❌ 書き出されない | — |
| `type`（指示タイプ） | ❌ 書き出されない | — |
| `transition_id` | ❌ 書き出されない | — |
| `instruction_target` | ❌ 書き出されない（分岐制御にのみ使用） | — |
| `instruction_status` | ❌ 書き出されない | — |
| `create_at` / `update_at` | ❌ 書き出されない | — |

> **補足**: `trace/@ref` に設定される `program_id` は `project_instruction` テーブルに存在しない。  
> 送信時にMAIMLファイルをS3/Swiftからダウンロード・パースして `<method>` 配下の `<program id="...">` を動的取得する。  
> パース失敗時は `trace/{seq}` 自身のIDが代入される。

---

## 6. 指示送信時の `<eventLog>` XML構造

`instruction_target`（指示対象）の値によって4パターンのXML構造となる。  
実装: `backend/src/repositories/eventLogRepository.ts` `buildInstructionSentLogJson()`  
XML生成: `backend/src/utils/maimlDataWriter.ts` `buildEventLogXML()`

### パターン1: ファイル全体（`instruction_target = 0`）

```xml
<eventLog id="eventLogID">
  <uuid>...</uuid>
  <log id="log_{sequence_no}" ref="">
    <uuid>...</uuid>
    <trace id="trace_{sequence_no}" ref="trace_{sequence_no}">
      <uuid>...</uuid>
      <evnet id="evnet_{sequence_no}">
        <uuid>...</uuid>
        <property key="sent_at" xsi:type="dateTimeType">
          <value>2026-05-20T02:24:00.000Z</value>
        </property>
        <property key="experiment_instruction_id" xsi:type="stringType">
          <value>sample_project_001</value>
        </property>
        <property key="instruction_user_id" xsi:type="stringType">
          <value>user-uuid-xxxx</value>
        </property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

`log/@ref`・`trace/@ref`・`evnet/@ref` はすべて省略（空）。

---

### パターン2: メソッド指示（`instruction_target = 1`）

```xml
<eventLog id="eventLogID">
  <uuid>...</uuid>
  <log id="log_{sequence_no}" ref="{method_id}">
    <uuid>...</uuid>
    <trace id="trace_{sequence_no}" ref="trace_{sequence_no}">
      <uuid>...</uuid>
      <!-- trace/@ref は省略 -->
      <evnet id="evnet_{sequence_no}" ref="{experiment_instruction_id}">
        <uuid>...</uuid>
        <property key="sent_at" xsi:type="dateTimeType">
          <value>2026-05-20T02:24:00.000Z</value>
        </property>
        <property key="experiment_instruction_id" xsi:type="stringType">
          <value>sample_project_001</value>
        </property>
        <property key="instruction_user_id" xsi:type="stringType">
          <value>user-uuid-xxxx</value>
        </property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

---

### パターン3: タスク指示（`instruction_target = 2`）

```xml
<eventLog id="eventLogID">
  <uuid>...</uuid>
  <log id="log_{sequence_no}" ref="{method_id}">
    <uuid>...</uuid>
    <trace id="trace_{sequence_no}"
           ref="{program_id}"
           taskno="{task_no}">
      <uuid>...</uuid>
      <evnet id="evnet_{sequence_no}" ref="{experiment_instruction_id}">
        <uuid>...</uuid>
        <property key="sent_at" xsi:type="dateTimeType">
          <value>2026-05-20T02:24:00.000Z</value>
        </property>
        <property key="experiment_instruction_id" xsi:type="stringType">
          <value>sample_project_001</value>
        </property>
        <property key="instruction_user_id" xsi:type="stringType">
          <value>user-uuid-xxxx</value>
        </property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

---

### パターン4: トランジション指示（`instruction_target = 3`）

```xml
<eventLog id="eventLogID">
  <uuid>...</uuid>
  <log id="log_{sequence_no}" ref="{method_id}">
    <uuid>...</uuid>
    <trace id="trace_{sequence_no}"
           ref="{program_id}">
      <!-- taskno は付かない（パターン3との唯一の違い） -->
      <uuid>...</uuid>
      <evnet id="evnet_{sequence_no}" ref="{experiment_instruction_id}">
        <uuid>...</uuid>
        <property key="sent_at" xsi:type="dateTimeType">
          <value>2026-05-20T02:24:00.000Z</value>
        </property>
        <property key="experiment_instruction_id" xsi:type="stringType">
          <value>sample_project_001</value>
        </property>
        <property key="instruction_user_id" xsi:type="stringType">
          <value>user-uuid-xxxx</value>
        </property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

---

### 6.1 各パターンの属性まとめ

| 属性 | target=0（ファイル全体） | target=1（メソッド） | target=2（タスク） | target=3（トランジション） |
|------|------------------------|--------------------|--------------------|--------------------------|
| `log/@ref` | 空 | `method_id` | `method_id` | `method_id` |
| `trace/@ref` | `trace_{seq}`（自身） | 省略 | `program_id` | `program_id` |
| `trace/@taskno` | なし | なし | `task_no` | なし |
| `evnet/@ref` | 省略 | `experiment_instruction_id` | `experiment_instruction_id` | `experiment_instruction_id` |
| `property: sent_at` | ✅ | ✅ | ✅ | ✅ |
| `property: experiment_instruction_id` | ✅ | ✅ | ✅ | ✅ |
| `property: instruction_user_id` | ✅ | ✅ | ✅ | ✅ |

---

## 7. MAIMLファイル書き出し時のUUID保持の仕組み（追調査 2026-05-21）

### 7.1 問題の概要

MAIMLファイルを書き出すたびに、`<eventLog>` セクション内の `<uuid>` 要素に
同じ値が出力され続ける。

### 7.2 UUID保持の仕組み

UUID の再利用は以下のフローで実現されている。

```
maimlWriterService.ts
  writeEventLogOnly() / writeDataAndEventLog()
    ↓
  extractUuidsFromMaiml(maimlContent)
    ← 既存MAIMLから <uuid> 値をすべて抽出し Map<識別キー, UUID文字列> に保存
    ↓  existingUuids: Map<string, string>
  buildEventLogXML(logJsonArray, eventLogId, existingUuids)
    ← existingUuids を渡す
    ↓
  resolveUuid('eventLog', existingUuids, randomUUID)
    ← Map にキーがあれば既存 UUID を返す（再利用）
    ← Map にキーがなければ randomUUID() で新規生成
```

**UUID識別キーの設計**（`maimlUuidExtractor.ts`）:

| 要素         | 識別キー形式      | 例                             |
|--------------|------------------|-------------------------------|
| `<eventLog>` | `"eventLog"`     | `"eventLog"`                  |
| `<log>`      | `"log:{id}"`     | `"log:log_1"`                 |
| `<trace>`    | `"trace:{id}"`   | `"trace:trace_1"`             |
| `<event>`    | `"event:{id}"`   | `"event:event_report_xxx_ts"` |
| `<evnet>`    | `"evnet:{id}"`   | `"evnet:evnet_1"`             |

チェックアウト・チェックイン等で同じ MAIMLファイルに何度書き出しても、
`<eventLog>` / `<log>` / `<trace>` / `<evnet>` の `<uuid>` は最初に書かれた値が
ずっと保持され続ける。

### 7.3 影響範囲

| セクション   | UUID再利用     | 書き出しの意味                                                   |
|-------------|---------------|----------------------------------------------------------------|
| `<data>`    | ✅ 再利用      | 同じ実験データが繰り返し書き出されるため意図的な挙動              |
| `<eventLog>`| ✅ 再利用（問題）| 追記のたびに新規UUIDが払い出されるべきだが既存値が再利用されている |

### 7.4 修正方針

`maimlWriterService.ts` で `buildEventLogXML()` を呼び出す際に
`existingUuids` を渡さない（`undefined` にする）。

対象箇所は2か所。

| メソッド | 現在 | 修正後 |
|---------|------|-------|
| `writeEventLogOnly()`（273行目付近） | `buildEventLogXML(logJsonArray, eventLogId, existingUuids)` | `buildEventLogXML(logJsonArray, eventLogId)` |
| `writeDataAndEventLog()`（136行目付近） | `buildEventLogXML(logJsonArray, eventLogId, existingUuids)` | `buildEventLogXML(logJsonArray, eventLogId)` |

> **`buildDataXML()` への `existingUuids` 渡しは変更しない。**  
> `<data>` セクションは同じ実験データが繰り返し書き出される設計であり、UUID の継続性が意図された挙動のため。
