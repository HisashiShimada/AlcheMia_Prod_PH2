# eventLog 現状調査サマリー

- **調査日**: 2026-08-18
- **対象**: プロジェクト管理画面の指示ダイアログに関連する eventLog 記録処理

---

## 1. 調査対象ファイル

| ファイル | 役割 |
|---|---|
| `frontend/src/components/project/InstructionEditDialog.tsx` | 指示編集/追加ダイアログ（UI） |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | 指示登録タブ |
| `frontend/src/types/instructionRegistration.ts` | 指示登録の型定義 |
| `frontend/src/types/maiml-unified.ts` | EventLog / Log / Trace / Event の型定義 |
| `backend/src/repositories/eventLogRepository.ts` | `maiml_event_log` テーブルへの書き込みロジック（主役） |
| `backend/src/utils/maimlDataWriter.ts` | eventLog XML 生成ユーティリティ（`buildEventLogXML`） |
| `backend/src/services/maimlWriterService.ts` | MAIML ファイルへの書き出しサービス |
| `docs/design/db/ddl/maiml_event_log.sql` | DB テーブル定義 |

---

## 2. eventLog に記録される処理の種類（3パターン）

| メソッド名 | 呼び出し契機 | 場所 |
|---|---|---|
| `insertTransitionProgressLog` | トランジション進捗更新時（worker操作） | eventLogRepository.ts |
| `insertInstructionConfirmLog` | 指示確認時（worker側） | eventLogRepository.ts |
| `insertProjectInstructionSentLog` | プロジェクト指示送信時（manager側） | eventLogRepository.ts |

---

## 3. 各パターンの JSON 構造

### パターンA: `insertTransitionProgressLog`（トランジション進捗）

```
eventLog {
  "@id": "eventLogID"                            ← 固定文字列
  log {
    "@id": "work_{ts}_{shortName}_log_transition_{transitionId}"
    "@ref": methodId || transitionId             ← フォールバックあり
    trace {
      "@id": "trace_{transitionId}_work_{ts}_{shortName}"
      "@ref": programId || transitionId
      event {
        "@id": "event_report_{loginId}_{ts}"
        "@ref": instructionId || transitionId
        property[timestamp, worker_id, status, progress_percentage, report_type, comments]
        resultsRef[]                             ← optional
      }
    }
  }
}
```

### パターンB: `insertInstructionConfirmLog`（指示確認、worker側）

タグ名は **`evnet`**（event ではなく evnet）を使用。

| 粒度 | 構造 |
|---|---|
| 全体指示（methodId=null） | `eventLog > log > trace > evnet`（すべての @ref を省略） |
| メソッド指示 | `eventLog > log[@ref=methodId] > trace(@refなし) > evnet[@ref=instructionId]` |
| トランジション指示 | `eventLog > log[@ref=methodId] > trace[@ref=programId] > evnet[@ref=instructionId]` |
| タスク指示 | `eventLog > log[@ref=methodId] > trace[@ref=programId, @taskno] > evnet[@ref=instructionId]` |

- **IDs**: `log_{seq}`, `trace_{seq}`, `evnet_{seq}`
- **eventLog @id**: なし（キー自体が存在しない）
- **properties**: `acknowledged_at`, `experiment_instruction_id`, `experiment_user_id`

### パターンC: `insertProjectInstructionSentLog`（プロジェクト指示送信、manager側）

タグ名は **`event`** を使用。

| 粒度 | 構造 |
|---|---|
| 全体指示（methodId=null） | `eventLog[@id=eventLog_{seq}] > property[] + ownerRef`（log/trace なし） |
| メソッド単位 | `eventLog > log[@ref=methodId] > property[] + ownerRef` |
| トランジション単位 | `eventLog > log[@ref=methodId] > trace[@ref=programId] > event[@ref=instructionId] > property[] + ownerRef` |
| タスク単位（transitionId なし） | `eventLog > log > trace[@ref=programId, @taskno] > property[] + ownerRef`（event タグなし） |
| トランジション+タスク（最優先） | `eventLog > log > trace > event > property[] + ownerRef + creatorRef[] + instrumentRef[]` |

- **IDs**: `eventLog_{seq}`, `log_{seq}`, `trace_{seq}`, `event_{seq}`
- **properties**: `SupervisorDirectiveTimestamp`, `{instructionKey}（指示内容）`, `Alchemia:SupervisorDirectiveTaskNo`（タスク時のみ）

---

## 4. 問題点・不整合箇所

### 問題1: `eventLog @id` の命名規則が3種類で不統一

| パターン | `eventLog @id` の値 |
|---|---|
| パターンA（進捗） | `"eventLogID"` （固定文字列） |
| パターンB（確認） | なし（`@id` キー自体が存在しない） |
| パターンC（送信） | `"eventLog_{seq}"` （連番） |

> XML 生成時（`buildEventLogXML`）は既存 MAIML から `@id` を抽出して上書きするため実害は少ないが、DB 上の JSON が不整合な状態。

---

### 問題2: `event` と `evnet` が混在（タイポ疑い）

| パターン | 使用タグ名 |
|---|---|
| パターンA（進捗） | `event` |
| パターンB（確認） | **`evnet`** |
| パターンC（送信） | `event` |

`evnet` は `event` のタイポと思われる。ただし `buildEventLogXML` 側でも `evnet` を考慮した分岐が存在するため現状は維持されている。

---

### 問題3: `property @key` の命名規則が3形式混在

| 形式 | 例 | 使用箇所 |
|---|---|---|
| snake_case | `timestamp`, `worker_id`, `acknowledged_at` | パターンA・B |
| PascalCase（namespace なし） | `SupervisorDirectiveTimestamp` | パターンC |
| `namespace:PascalCase` | `Alchemia:SupervisorDirectiveContent`, `Alchemia:SupervisorDirectiveTaskNo` | パターンC |

---

### 問題4: 同じ意味のフィールドでキー名が異なる

| 意味 | パターンB（確認） | パターンC（送信） |
|---|---|---|
| 日時 | `acknowledged_at` | `SupervisorDirectiveTimestamp` |
| 指示ID | `experiment_instruction_id` | （property ではなく `@ref` で管理） |
| ユーザID | `experiment_user_id` | `ownerRef @ref`（属性で管理） |
| 指示内容 | なし | `{instructionKey}` の value |

---

### 問題5: `@ref` 省略ルールが暗黙的

| refタグ | 参照先 | 省略条件 |
|---|---|---|
| `log @ref` | methodId | 全体指示時は省略（パターンB/C） |
| `trace @ref` | programId | メソッド指示時は省略（パターンB/C）、パターンAはtransitionIdフォールバック |
| `event/@evnet @ref` | experimentInstructionId | 全体指示時は省略、パターンAはtransitionIdフォールバック |
| `ownerRef @ref` | userId（`@` → `_` 置換） | パターンCのみ使用（A・Bには存在しない） |
| `creatorRef @ref` | 実験担当者ID | transitionId+taskNo 粒度のみ（パターンC） |
| `instrumentRef @ref` | 機器ID | transitionId+taskNo 粒度のみ（パターンC） |

省略ルールはコードコメントにのみ記述されており、設計ドキュメントとして未整理。

---

### 問題6: `@xsi:type` の記法が2形式混在

| 記法 | 例 | 使用箇所 |
|---|---|---|
| MAIML ネイティブ型 | `dateTimeType`, `stringType`, `intType` | eventLogRepository.ts（DB の JSON 内） |
| XML Schema 型 | `xs:dateTime`, `xs:string`, `xs:int` | 既存 MAIML サンプルファイル（test_omori11.maiml 等） |

`buildEventLogXML` の `buildPropertiesXML` は MAIML ネイティブ型をそのまま `xsi:type` 属性として出力する。既存の古い MAIML には `xs:string` 形式が残っており、パーサー側での吸収が必要な状態。

---

## 5. 整理項目まとめ

| # | 整理項目 | 現状 | 問題 |
|---|---|---|---|
| 1 | `eventLog @id` 命名規則 | 3種類（固定/なし/動的連番） | 統一されていない |
| 2 | `log @id` 命名規則 | 2種類（意味付きID / `log_{seq}`） | パターンA と B/C で形式が異なる |
| 3 | `trace @id` 命名規則 | 2種類（意味付きID / `trace_{seq}`） | 同上 |
| 4 | `event/@evnet @id` 命名規則 | 3種類 + タイポ | `event` と `evnet` が混在 |
| 5 | `property @key` 命名規則 | snake_case / PascalCase / ns:PascalCase | 3形式が混在 |
| 6 | `@xsi:type` 記法 | MAIMLネイティブ型 / XML Schema型 | 2形式が混在 |
| 7 | `@ref` 省略ルール | コメントのみで記述 | 設計ドキュメントとして未整理 |
| 8 | `ownerRef/creatorRef/instrumentRef` の使用範囲 | パターンCのみ | 他パターンでの使用有無が未定義 |

---

## 6. 型定義との対応（フロントエンド）

`frontend/src/types/maiml-unified.ts` に XSD 準拠の型定義が存在する。

```typescript
EventLog { id, uuid, name?, description?, annotation?, logs: Log[] }
Log      { id, uuid, ref, traces: Trace[], creatorRefs, ownerRefs: Reference[] }
Trace    { id, uuid, ref, events: Event[], creatorRefs, ownerRefs: Reference[] }
Event    { id, uuid, ref, properties: Property[], resultsRefs, creatorRefs, ownerRefs: Reference[] }
```

DB の JSON には `uuid` が存在しない。`buildEventLogXML` が XML 生成時に新規採番する設計になっている。

---

## 7. 今後の整理候補

1. **`evnet` → `event` へのタイポ修正**（DB の既存データへの影響要確認）
2. **`eventLog @id` の統一**（`eventLog_{seq}` または固定値のどちらかに揃える）
3. **`property @key` の命名規則統一**（snake_case か namespace:PascalCase のどちらかに揃える）
4. **`@ref` 省略ルールの設計ドキュメント化**
5. **`@xsi:type` 記法の統一**（MAIML ネイティブ型 `stringType` 形式に統一）
6. **`ownerRef` を全パターンで使用するか判断**（パターンA・B に追加するか否か）

---

## 8. 修正予定項目

### 修正予定項目①：ID 命名規則の統一（`lifecycle:transition` 準拠）

**対象**: パターンC（`insertProjectInstructionSentLog`）の各タグ ID  
**方針**: XES 標準の `lifecycle:transition` の慣習に合わせ、**指示段階（Preparation_schedule）** を表す形式に統一する

| タグ | 現在の形式 | 新形式 |
|---|---|---|
| `eventLog @id` | `eventLog_{seq}` | **既存 MAIML の値を維持**。MAIML 上1つしか存在できないため特定処理の ID に紐づけない（命名規則対象外） |
| `log @id` | `log_{seq}` | `log_{projectName}Preparation_schedule_{seq}` |
| `trace @id` | `trace_{seq}` | `trace_{projectName}Preparation_schedule_{seq}` |
| `event @id` | `event_{seq}` | `event_{projectName}Preparation_schedule_{seq}` |
| `ownerRef @id`（issuer） | なし（`@id` 属性自体が存在しない） | `ownerRef_{projectName}Preparation_schedule_{seq}_issuer` |
| `ownerRef @id`（assignee） | なし | `ownerRef_{projectName}Preparation_schedule_{seq}_assignee` |

> ownerRefs が複数の assignee を持つ場合は枝番を付ける（例: `ownerRef_{projectName}Preparation_schedule_{seq}_assignee_1`）。実装時に要確認。

---

### 修正予定項目②：`ownerRef` の二重化（issuer / assignee 区別）

**対象**: パターンC（`insertProjectInstructionSentLog`）の `ownerRef`  
**方針**: 現在は指示出しユーザーの1件のみ。以下の2件に拡張する

| 役割 | `@id` | `@ref` の値 |
|---|---|---|
| 指示出しユーザー（issuer） | `ownerRef_{projectName}Preparation_schedule_{seq}_issuer` | `userId`（`@` → `_` 置換） |
| 作業予定者（assignee） | `ownerRef_{projectName}Preparation_schedule_{seq}_assignee` | `ExperimentPlanDialog` で指定した `ownerRefs` の値 |

---

### 修正予定項目③：各タグへの `name` / `description` 追記

**対象**: パターンC（`insertProjectInstructionSentLog`）の `log`, `trace`, `event` 各タグ  
**方針**: 各タグに `name` と `description` を統一フォーマットで追記する

> **注意**: `eventLog` タグは MAIML 上1つしか存在できないため、特定処理に紐づいた `name` / `description` を設定することができない。`eventLog` タグへの付与は行わない。

| 属性 | 値 |
|---|---|
| `name` | `Alchemia:PreparationEvent` |
| `description` | `{projectName} PreparationEvent(schedule)` |

**適用対象タグ一覧**:

| タグ | `name` | `description` |
|---|---|---|
| `eventLog` | （付与しない） | （付与しない） |
| `log` | `Alchemia:PreparationEvent` | `{projectName} PreparationEvent(schedule)` |
| `trace` | `Alchemia:PreparationEvent` | `{projectName} PreparationEvent(schedule)` |
| `event` | `Alchemia:PreparationEvent` | `{projectName} PreparationEvent(schedule)` |

---

### 修正予定項目④：タイムスタンプ property キーの変更

**対象**: パターンC（`insertProjectInstructionSentLog`）の `property @key`  
**方針**: 現在 `SupervisorDirectiveTimestamp` で記載しているタイムスタンプを XES 標準の `time:timestamp` キーに変更する

| 現在の `@key` | 新しい `@key` | `@xsi:type` |
|---|---|---|
| `SupervisorDirectiveTimestamp` | `time:timestamp` | `dateTimeType` |

---

### 修正予定項目⑤：`event` タグへの `lifecycle:transition` プロパティ追記

**対象**: パターンC（`insertProjectInstructionSentLog`）のうち、**transitionId と taskNo の両方が指定された場合**の `event` タグ  
**方針**: XES 標準に合わせ、`event` タグ内に `lifecycle:transition` プロパティを追記する

| `@key` | `@xsi:type` | 値 |
|---|---|---|
| `lifecycle:transition` | `stringType` | `schedule` |

> `schedule` はプロジェクト指示送信（Preparation_schedule）段階を表す固定値。  
> transitionId のみ・taskNo のみ・methodId のみ・全体指示の各粒度には追記しない。

---

### 修正予定項目⑥：前提トランジション未設定のトランジションへの `event` タグ強制生成

**背景**: `lifecycle:transition` の遷移記録は指示事項の有無によらず記録する必要がある。  
**対象**: 前提トランジションID（`transitionId`）の設定がないトランジションすべて  
**方針**: 指示内容がない場合でも、該当トランジションに対して `event` タグを必ず生成し `lifecycle:transition` プロパティを記録する

**生成する `event` タグの構造**:

```
eventLog > log[@ref=methodId] > trace[@ref=programId] > event {
  @id   : event_{projectName}Preparation_schedule_{seq}
  @ref  : transitionId（前提トランジション未設定のトランジションID）
  name        : Alchemia:PreparationEvent
  description : {projectName} PreparationEvent(schedule)
  property[@key="time:timestamp"]
  property[@key="lifecycle:transition"] = "schedule"
}
```

> 指示事項がある場合は既存の property（指示内容等）と併せて出力する。  
> 指示事項がない場合は `time:timestamp` と `lifecycle:transition` のみを含む最小構成で出力する。


