# 実装計画書: MAIMLファイル data層・eventLog層 書き出し処理

**作成日時**: 2026-03-16 08:50  
**タスクID**: maiml_data_eventlog_実装  
**優先度**: 高  
**推定工数**: 2〜3日

---

## 1. タスク概要

実験作業者が記録した実験データを、MAIMLファイルの `<data>` 層と `<eventLog>` 層に書き出す処理を実装する。

---

## 2. 実装フロー（確定）

```
① 実験作業者が記録（既存実装）
      ↓ DB保存済み
② template_data テーブル / maiml_event_log テーブルにデータあり（既存）
      ↓
③ 実験管理者がタスク結果を承認（既存: projectService.approvalRequest）
      ↓ ← ここに処理を追加
④ template_data / maiml_event_log → MAIML型定義に変換（新規）
      ↓
⑤ プロジェクトの最新MAIMLファイルをStorageから読み込み（既存: storageService）
      ↓
⑥ <data> 部と <eventLog> 部を追記してStorageに保存（新規）
```

---

## 3. 既存リソース（使用可能）

### バックエンド

| ファイル | 役割 | 使用箇所 |
|---------|-----|---------|
| `backend/src/repositories/templateDataRepository.ts` | template_dataテーブルのCRUD | ④のデータ取得 |
| `backend/src/repositories/eventLogRepository.ts` | maiml_event_logテーブルのCRUD | ④のデータ取得 |
| `backend/src/services/experimentDataService.ts` | template_dataを整形するサービス | ④の変換処理 |
| `backend/src/services/projectService.ts` | 承認依頼処理（`approvalRequest`） | ③のトリガー箇所 |
| `backend/src/services/storageService.ts` | S3/Swiftファイル操作 | ⑤⑥のファイルI/O |
| `backend/src/utils/maimlParserTyped.ts` | MAIMLパース | ⑤のMAIML読み込み |
| `backend/src/utils/maimlTypeConverter.ts` | MAIML型変換ユーティリティ | ④の変換処理 |
| `backend/src/types/maiml-unified.ts` | MAIMLのTypeScript型定義（`Data`, `EventLog`） | ④の型定義 |
| `backend/src/types/database.ts` | DBテーブルの型定義（`TemplateData`, `MaimlEventLog`） | ④の入力型 |

### フロントエンド（参照元）

| ファイル | 役割 |
|---------|-----|
| `frontend/src/reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` | `buildDataXML()` の参照元実装 |
| `frontend/src/utils/converters/reactFlowToMaiml.ts` | 現行TypeScript版（移植先） |

---

## 4. 実装ステップ

### Phase 1: バックエンドサービス実装

#### Step 1-1: `maiml_event_log` からeventLog XMLを生成する関数を実装

**対象ファイル**: `backend/src/utils/maimlTypeConverter.ts`（または新規 `backend/src/utils/maimlDataWriter.ts`）

```typescript
/**
 * maiml_event_logレコードからMAIML <eventLog> XML文字列を生成
 */
export function buildEventLogXML(
  eventLogRecords: MaimlEventLog[],
  eventLogId: string = 'eventLogID'
): string
```

**参考**: `eventLogRepository.ts` に既存のJSONB構造あり。`maiml_event_log.event_log_json` カラムの内容をXML化する。

#### Step 1-2: `template_data` から `<data>` XML を生成する関数を実装

**対象ファイル**: `backend/src/utils/maimlDataWriter.ts`（新規）

```typescript
/**
 * template_dataレコードからMAIML <data> XML文字列を生成
 * reference JS版 buildDataXML() のTypeScript移植
 */
export function buildDataXML(
  records: TemplateDataRecord[],
  dataId: string = 'dataID'
): string
```

**入力**: `TemplateDataRecord[]`（`templateDataRepository` から取得）  
**出力**: `<data id="..."><material .../><condition .../><result .../></data>`

**参考実装**: `frontend/src/reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` の `buildDataXML()`

#### Step 1-3: MAIMLファイルへのdata/eventLog追記サービスを実装

**対象ファイル**: `backend/src/services/maimlWriterService.ts`（新規）

```typescript
export class MaimlWriterService {
  /**
   * プロジェクトのMAIMLファイルにdata層・eventLog層を追記して保存
   */
  async writeDataAndEventLog(
    organizationId: string,
    projectId: string,
    projectName: string,
    taskNo?: number  // タスク番号（指定時はそのタスクのみ）
  ): Promise<void>
}
```

**処理内容**:
1. `storageService.downloadFile()` でMAIMLファイルを取得
2. `templateDataRepository.findByProjectId()` でtemplate_dataを取得
3. `eventLogRepository` でmaiml_event_logを取得
4. `buildDataXML()` / `buildEventLogXML()` でXML生成
5. 既存MAIMLの `<data>` / `<eventLog>` を置き換え（またはDOMパースして更新）
6. `storageService.uploadFile()` で保存

#### Step 1-4: 承認処理へのフック追加

**対象ファイル**: `backend/src/services/projectService.ts`

承認処理（`approvalRequest` または承認完了時のメソッド）に以下を追加:

```typescript
// 承認完了後、MAIMLファイルにdata/eventLogを書き出し
const maimlWriterService = new MaimlWriterService();
await maimlWriterService.writeDataAndEventLog(
  organizationId, projectId, projectName
);
```

---

### Phase 2: フロントエンド（必要な場合）

現行の実装フローはバックエンド側で完結するため、フロントエンドの変更は基本的に不要。  
ただし、以下は将来対応として検討:

- `frontend/src/utils/converters/reactFlowToMaiml.ts` への `buildDataXML()` 移植  
  （エディタ上でプレビュー表示する場合に必要）

---

## 5. 変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---------|-----|
| `backend/src/utils/maimlDataWriter.ts` | `buildDataXML()` / `buildEventLogXML()` |
| `backend/src/services/maimlWriterService.ts` | MAIML書き込みサービス |
| `backend/tests/utils/maimlDataWriter.test.ts` | `buildDataXML` 単体テスト |
| `backend/tests/services/maimlWriterService.test.ts` | サービス統合テスト |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/projectService.ts` | 承認処理に `MaimlWriterService.writeDataAndEventLog()` を追加 |

---

## 6. 調査済み仕様（2026-03-16確認）

### 6-1. 承認完了トリガーは `completeReviewTasks`

**プロジェクトのステータス遷移と各メソッドの対応:**

| メソッド | API | 処理 | ステータス遷移 |
|---------|-----|-----|-------------|
| `requestApproval()` | `PATCH /:projectName/approval-request` | 作業者が承認依頼送信 | `2(タスク実行中)` → `3(レビュー待ち)` |
| **`completeReviewTasks()`** | **`POST /:projectName/tasks/complete-review`** | **管理者がタスクを一括承認** | task_status `3(review_waiting)` → `4(completed)` |
| `checkin()` | `POST /:projectName/checkin` | チェックイン（checkout_statusのみ変更） | checkout_status `1` → `0` |

**→ `projectService.completeReviewTasks()` がMAIML書き出しのトリガー**

`completeReviewTasks()` の処理:
1. projectName → projectId を取得（`projectRepository.findProjectIdByName`）
2. `projectRepository.completeReviewTasks()` でtask_status `3` → `4` に一括更新
3. **ここにMAIML書き出しフックを追加する**

**フック追加箇所**: `projectService.completeReviewTasks()` 内の `updatedCount` 取得後

```typescript
// 修正後のイメージ
async completeReviewTasks(organizationId, projectName) {
  const projectRow = await projectRepository.findProjectIdByName(...);
  const updatedCount = await projectRepository.completeReviewTasks(...);

  // ← ここに追加
  const maimlWriterService = new MaimlWriterService();
  await maimlWriterService.writeDataAndEventLog(
    organizationId, projectRow.project_id, projectName
  );

  return { success: true, data: { updatedCount, ... } };
}
```
### Step 1-4の修正: フック追加先は `completeReviewTasks()`

**対象ファイル**: `backend/src/services/projectService.ts`

```typescript
// completeReviewTasks() メソッド内に追加
const updatedCount = await projectRepository.completeReviewTasks(
  organizationId,
  projectRow.project_id
);

// ← 追加: MAIMLファイルにdata/eventLogを書き出し
const maimlWriterService = new MaimlWriterService();
await maimlWriterService.writeDataAndEventLog(
  organizationId,
  projectRow.project_id,
  projectName
);
```

---

### 6-2. `maiml_event_log` の JSON構造

`maiml_event_log` テーブルの `log` カラム（JSONB）に以下のJSON構造で保存されている:

#### パターンA: `insertTransitionProgressLog()` が生成するJSON（作業進捗）

```json
{
  "eventLog": {
    "@id": "eventLogID",
    "log": {
      "@id": "work_{ts}_{shortName}_log_transition_{transitionId}",
      "@ref": "{transitionId}",
      "trace": {
        "@id": "trace_{transitionId}_work_{ts}_{shortName}",
        "@ref": "{transitionId}",
        "event": {
          "@id": "event_report_{loginId}_{ts}",
          "@ref": "{transitionId}",
          "property": [
            { "@key": "timestamp", "@xsi:type": "xs:dateTime", "#text": "..." },
            { "@key": "worker_id", "@xsi:type": "xs:string", "#text": "..." },
            { "@key": "status", "@xsi:type": "xs:string", "#text": "running" },
            { "@key": "progress_percentage", "@xsi:type": "xs:int", "#text": 50 },
            { "@key": "report_type", "@xsi:type": "xs:string", "#text": "transition_progress" },
            { "@key": "comments", "@xsi:type": "xs:string", "#text": "..." }
          ]
        }
      }
    }
  }
}
```

#### パターンB: `insertInstructionConfirmLog()` が生成するJSON（指示確認）

```json
{
  "eventLog": {
    "log": {
      "@id": "log_{sequenceNo}",
      "@ref": "{methodId}",
      "trace": {
        "@ref": "{programId}",
        "evnet": {
          "@id": "evnet_{sequenceNo}",
          "@ref": "{experimentInstructionId}",
          "property": [
            { "@key": "acknowledged_at", "@xsi:type": "xs:dateTime", "#text": "..." },
            { "@key": "experiment_instruction_id", "@xsi:type": "xs:string", "#text": "..." },
            { "@key": "experiment_user_id", "@xsi:type": "xs:string", "#text": "..." }
          ]
        }
      }
    }
  }
}
```

**注意**: パターンAは `event`、パターンBは `evnet`（MAIMLスキーマ上のスペルミスをそのまま使用）

**`buildEventLogXML()` の方針**: 各レコードの `log` JSONを読み取り、`@`プレフィックスを属性に、`#text` をテキストノードに変換してXML化する。

---

### 6-3. `template_data` の型定義

`templateDataRepository.ts` の型定義:

```typescript
// property_set JSONB内のプロパティ1件
export interface PropertySetProperty {
  key: string;
  // ... その他（type, units, value等）
}

// template_data.property_set カラムのJSONB構造
export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';  // ← data層の要素名として使用
  properties: PropertySetProperty[];
}

// template_dataテーブルの1レコード（アプリ層）
export interface TemplateDataRecord {
  placeId: string;
  propertySet: PropertySet;
  updateUserId: string;
}

// template_dataテーブルの1レコード（DB行）
export interface TemplateDataRow {
  place_id: string;
  property_set: PropertySet | null;
  create_user_id: string | null;
}
```

**→ `buildDataXML()` の入力は `TemplateDataRow[]` または `TemplateDataRecord[]`**  
**→ `PropertySet.templateType` が `'material' | 'condition' | 'result'` なので `<data>` 内の要素名に直接使用可能**

---

### 6-4. `<data>` / `<eventLog>` の上書き vs 追記

**上書き（タグごと丸ごと置き換え）を採用する。**

#### 動作イメージ

**承認前のMAIML（空要素）:**
```xml
<maiml>
  <protocol>...</protocol>
  <data id="dataID">
  </data>
  <eventLog id="eventLogID">
  </eventLog>
</maiml>
```

**承認後のMAIML（DB登録データで置き換え）:**
```xml
<maiml>
  <protocol>...</protocol>
  <data id="dataID">
    <material id="mat_instance_0" ref="MT001">
      <property key="温度" xsi:type="doubleType" units="°C">
        <value>25.5</value>
      </property>
    </material>
    <result id="res_instance_0" ref="RT001">
      ...
    </result>
  </data>
  <eventLog id="eventLogID">
    <log id="work_..." ref="transition001">
      <trace id="trace_..." ref="transition001">
        <event id="event_..." ref="transition001">
          <property key="status" xsi:type="xs:string">completed</property>
        </event>
      </trace>
    </log>
  </eventLog>
</maiml>
```

**`<data>` タグ全体**・**`<eventLog>` タグ全体**が、DBに登録されているデータで丸ごと生成・置き換えられる。

理由:
- `completeReviewTasks()` はプロジェクト全タスクの承認完了処理であり、DBの内容が「最終確定結果」
- 追記方式だと複数回呼び出し時に重複データが発生する可能性がある
- reference JS版（`buildDataXML()`）も「渡されたデータで置き換え」方式

**実装方針**: MAIMLファイルをパースし、既存の `<data>` / `<eventLog>` タグを削除して、DBから取得した全レコードで生成した新しい要素に挿入する

---

## 7. 技術的注意点

### DOMパースによる要素置換

MAIMLファイルの `<data>` と `<eventLog>` を更新する際、文字列操作ではなくDOMパースを推奨:

```typescript
import { DOMParser, XMLSerializer } from 'xmldom';

const doc = new DOMParser().parseFromString(maimlContent, 'text/xml');
// 既存の<data>を削除して新しい要素を挿入
const maimlRoot = doc.documentElement;
const oldData = doc.getElementsByTagName('data')[0];
if (oldData) maimlRoot.removeChild(oldData);
// 新しい<data>を追加
const newDataXml = buildDataXML(records);
// ... XMLSerializer で文字列に戻す
```

### template_data のフォーマット変換

`template_data.property_set` はJSONB型で格納されている。  
`PropertySet` 型（`templateDataRepository.ts` 参照）から `<property>` XML への変換ロジックが必要。

---

## 8. テスト計画

- [ ] `buildDataXML()`: 空データ、materials/conditions/results 各ケース
- [ ] `buildEventLogXML()`: instruction_target 1/2/3 各パターン
- [ ] `MaimlWriterService.writeDataAndEventLog()`: storageServiceモック使用
- [ ] 承認処理統合テスト: 承認後にMAIMLファイルが更新されること

---

## 9. 関連ドキュメント・ファイル

| ドキュメント | 参照目的 |
|------------|---------|
| `docs/task_plan/20260316_0816_maiml_data_eventlog_調査/RESEARCH_ExperimentRecorder.md` | 調査結果（本計画書の前提） |
| `docs/task_plan/20260316_0816_maiml_data_eventlog_調査/RESEARCH.md` | 全体調査結果 |
| `frontend/src/reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` | `buildDataXML()` 参照元 |
| `backend/src/repositories/templateDataRepository.ts` | template_dataスキーマ・型定義 |
| `backend/src/repositories/eventLogRepository.ts` | maiml_event_logスキーマ・JSON構造 |
| `backend/src/types/maiml-unified.ts` | MAIMLのTypeScript型（`Data`, `EventLog`） |
| `docs/design/db/ddl/template_data.sql` | template_dataテーブルDDL |
| `docs/design/db/ddl/maiml_event_log.sql` | maiml_event_logテーブルDDL |
