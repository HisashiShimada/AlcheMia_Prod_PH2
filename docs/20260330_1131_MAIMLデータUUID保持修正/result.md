# 対応結果レポート: MAIMLファイル書き込み時の値保持修正

## 対応日時
2026-03-30 11:31 〜 11:40

---

## 背景・調査内容

MAIMLファイルへの `<data>` / `<eventLog>` タグ書き込み処理（`writeDataAndEventLog()`）において、
既存 MAIMLファイルの内容を一部上書きしてしまう問題を調査・修正した。

---

## 調査で確認した内容

### 1. id 属性の生成元と安定性

書き込み処理（`buildDataXML()` / `buildEventLogXML()`）で出力される各要素の `id` 属性は、
以下の安定した値から生成されるため**書き込みのたびに変わることはない（再採番されない）**。

| 要素 | id の出所 | 安定性 |
|------|----------|--------|
| `<data id>` | 既存 MAIMLから正規表現で抽出 | ✅ 変化なし |
| `<results id>` | DBの `method_id` + `task_no` から生成（`results_{method_id}_{task_no}`） | ✅ DB値が変わらない限り不変 |
| `<material/condition/result id>` | DBの `place_id` カラム値 | ✅ 不変 |
| `<eventLog id>` | 既存 MAIMLから正規表現で抽出 | ✅ 変化なし |
| `<log/trace/event/evnet id>` | `maiml_event_log.log` JSONの `@id` キー（INSERT時に確定した値） | ✅ 不変 |

### 2. uuid 要素の問題（修正対象）

`<uuid>` 要素の値だけが毎回 `randomUUID()` で**新規生成**されており、
書き込みのたびに値が変わっていた（改竄相当）。

```
【問題の流れ】
タスク承認 → writeDataAndEventLog() 呼び出し
  → MAIMLダウンロード（既存 <data> に <uuid>aaa-bbb-...</uuid> が存在）
  → buildDataXML() → randomUUID() で新しい UUID を生成
  → MAIMLファイルに <uuid>xxx-yyy-...</uuid> で上書き保存
  → 書き込みのたびに UUID が変わる ← 改竄相当
```

---

## results タグのグルーピング仕様（buildDataXML）

### 仕様概要

`template_data` テーブルのレコードは **`method_id` × `task_no`** の組み合わせでグループ化し、
グループごとに1つの `<results>` タグを生成する。

```
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_{method_id}_{task_no}">   ← method_id × task_no で1つ
    <uuid>...</uuid>
    <material id="{place_id}" ref="{templateId}"> ← templateType = "material"
      ...
    </material>
    <condition id="{place_id}" ref="{templateId}"> ← templateType = "condition"
      ...
    </condition>
    <result id="{place_id}" ref="{templateId}">    ← templateType = "result"
      ...
    </result>
  </results>
  <results id="results_{method_id2}_{task_no2}">  ← 別グループは別 <results>
    ...
  </results>
</data>
```

### グルーピングの実装

```typescript
// method_id × task_no をキーとして Map でグループ化
const groupMap = new Map<string, TemplateDataRow[]>();
for (const row of validRows) {
  const key = `${row.method_id}\x00${row.task_no}`;
  if (!groupMap.has(key)) groupMap.set(key, []);
  groupMap.get(key)!.push(row);
}

// グループごとに <results id="results_{method_id}_{task_no}"> を1つ出力
for (const [, groupRows] of groupMap) {
  const { method_id, task_no } = groupRows[0];
  const resultsId = `results_${method_id}_${task_no}`;
  // ...
}
```

### 各子要素の出力順・id・ref の決まり方

| 要素 | 出力順 | id の出所 | ref の出所 |
|------|--------|----------|-----------|
| `<material>` | 1番目 | `place_id` カラム | `property_set.templateId` |
| `<condition>` | 2番目 | `place_id` カラム | `property_set.templateId` |
| `<result>` | 3番目 | `place_id` カラム | `property_set.templateId` |

出力順序は `material → condition → result` の固定順（reference JS版と同順）。
同一グループ内で templateType ごとに分類して順次出力する。

### 複数の Results がある場合の id 採番

`<results id>` は `"results_{method_id}_{task_no}"` という形式で生成されるため、
同じ method_id × task_no の組み合わせがある限り id は変化しない。

例:
- `method_id=method01`, `task_no=1` → `results_method01_1`
- `method_id=method01`, `task_no=2` → `results_method01_2`
- `method_id=method02`, `task_no=1` → `results_method02_1`

---

## UUID 修正内容

DBスキーマ変更なしで対応可能な方針として、
**既存 MAIMLファイルから `<uuid>` の値を抽出し、同じ要素には同じ UUID を再利用する**方式を採用。

---

### 新規作成: `backend/src/utils/maimlUuidExtractor.ts`

既存 MAIML XML から各要素の `<uuid>` 値を抽出し、識別キー → UUID 値の `Map` を返すユーティリティ。

**識別キーの設計:**

| 要素 | 識別キー形式 | 例 |
|------|------------|-----|
| `<data>` | `"data"` | `"data"` |
| `<results>` | `"results:{id属性値}"` | `"results:results_method01_1"` |
| `<material>` | `"material:{id属性値}"` | `"material:place_001"` |
| `<condition>` | `"condition:{id属性値}"` | `"condition:place_002"` |
| `<result>` | `"result:{id属性値}"` | `"result:place_003"` |
| `<eventLog>` | `"eventLog"` | `"eventLog"` |
| `<log>` | `"log:{id属性値}"` | `"log:log_1"` |
| `<trace>` | `"trace:{id属性値}"` | `"trace:trace_1"` |
| `<event>` | `"event:{id属性値}"` | `"event:event_report_user_123"` |
| `<evnet>` | `"evnet:{id属性値}"` | `"evnet:evnet_1"` |

**提供関数:**

- `extractUuidsFromMaiml(maimlContent: string): Map<string, string>`  
  正規表現で MAIML XML を走査し、識別キー → UUID 値の Map を返す。

- `resolveUuid(key, existingUuids, randomUUID): string`  
  マップに識別キーが存在すれば既存 UUID を返す（再利用）。  
  存在しない場合のみ `randomUUID()` で新規生成する。

---

### 修正: `backend/src/utils/maimlDataWriter.ts`

`buildDataXML()` / `buildEventLogXML()` に `existingUuids?: Map<string, string>` 引数を追加し、
全ての `randomUUID()` 呼び出しを `resolveUuid()` 経由に変更。

**変更した関数:**
- `buildDataXML(rows, dataId, existingUuids?)` ← 第3引数追加
- `buildEventLogXML(logJsonArray, eventLogId, existingUuids?)` ← 第3引数追加
- 内部ヘルパー `buildLogEntryXML`, `buildTraceXML`, `buildEventXML`, `buildEvnetXML` にも `existingUuids` を伝播

---

### 修正: `backend/src/services/maimlWriterService.ts`

MAIMLダウンロード後に `extractUuidsFromMaiml()` を呼び出して UUID マップを生成し、
`buildDataXML()` / `buildEventLogXML()` に渡すよう変更。

```typescript
// 追加ステップ: 既存 MAIMLから UUID マッピングを抽出
const existingUuids = extractUuidsFromMaiml(maimlContent);

// 変更: existingUuids を渡すことで既存 UUID を再利用する
const dataXml = buildDataXML(templateDataRows, dataId, existingUuids);
const eventLogXml = buildEventLogXML(logJsonArray, eventLogId, existingUuids);
```

---

## 修正後の動作

| ケース | `<uuid>` の動作 | `id` 属性の動作 |
|--------|--------------|---------------|
| 2回目以降の書き込み（既存要素） | 同じ UUID を再利用 | 同じ id を使用（変化なし） |
| 新規要素（place_id が追加） | `randomUUID()` で新規生成 | DBの `place_id` から生成 |
| 初回書き込み（data/eventLog タグなし） | `randomUUID()` で全て新規生成 | DBの値から生成 |

---

## テスト確認

- TypeScriptコンパイルエラーなし（`npx tsc --noEmit` でエラー出力なし）
