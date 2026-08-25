# タスク計画書: eventLog 記録処理の整理・修正

## メタデータ
- **作成日時**: 2026-08-18
- **タスクID**: 20260818_eventLog整理
- **優先度**: 中
- **対象調査ドキュメント**: [SURVEY.md](./SURVEY.md)

---

## タスク概要

プロジェクト管理画面の指示ダイアログに関連する `eventLog` 記録処理（主に `insertProjectInstructionSentLog`）について、XES 標準（`lifecycle:transition` / `time:timestamp`）に準拠した構造に整理・修正する。

SURVEY.md の修正予定項目①③④⑤は「lifecycle:transition 系 eventLog の共通ルール」として統合し、②・⑥と合わせた3つの作業グループに分けて実施する。

---

## 修正グループ

### グループA：lifecycle:transition 系 eventLog 共通ルール（①③④⑤を統合）

SURVEY.md 項目①③④⑤は個別の変更ではなく、以下の「共通ルール」として一括定義する。  
**このルールは本タスク固有のものではなく、システム全体の恒久規約として `.clinerules/references/eventlog_structure.md` に定義する。**

#### A-1. ID 命名規則

すべてのタグ ID を以下の形式に統一する。

> **注意**: `eventLog @id` は MAIML 上1つしか存在できないため、特定処理に紐づいた ID 名にすることができない。`buildEventLogXML` が既存 MAIML の値で上書き出力するため、命名規則の対象外とする。

| タグ | 新形式 |
|---|---|
| `eventLog @id` | **既存 MAIML の値を維持**（`eventLogID` 等）。命名規則対象外 |
| `log @id` | `log_{projectName}Preparation_schedule_{seq}` |
| `trace @id` | `trace_{projectName}Preparation_schedule_{seq}` |
| `event @id` | `event_{projectName}Preparation_schedule_{seq}` |
| `ownerRef @id`（issuer） | `ownerRef_{projectName}Preparation_schedule_{seq}_issuer` |
| `ownerRef @id`（assignee） | `ownerRef_{projectName}Preparation_schedule_{seq}_assignee` |

#### A-2. `name` / `description` の統一

`log` / `trace` / `event` 各タグに以下を付与する。

> **注意**: `eventLog` タグは MAIML 上1つしか存在できないため、特定処理に紐づいた `name` / `description` を設定することができない。`eventLog` タグへの付与は行わない。

| 属性 | 値 |
|---|---|
| `name` | `Alchemia:PreparationEvent` |
| `description` | `{projectName} PreparationEvent(schedule)` |

#### A-3. タイムスタンプ property キー

| 現在の `@key` | 新しい `@key` | `@xsi:type` |
|---|---|---|
| `SupervisorDirectiveTimestamp` | `time:timestamp` | `dateTimeType` |

#### A-4. `lifecycle:transition` プロパティ

**適用条件**: `transitionId` と `taskNo` の両方が指定された場合の `event` タグのみ

| `@key` | `@xsi:type` | 値 |
|---|---|---|
| `lifecycle:transition` | `stringType` | `schedule` |

---

### グループB：`ownerRef` の二重化（②）

**対象**: `insertProjectInstructionSentLog` の `ownerRef`  
現在は指示出しユーザーの1件のみ → 以下の2件に拡張する。

| 役割 | `@id` | `@ref` の値 |
|---|---|---|
| 指示出しユーザー（issuer） | `ownerRef_{projectName}Preparation_schedule_{seq}_issuer` | `userId`（`@` → `_` 置換） |
| 作業予定者（assignee） | `ownerRef_{projectName}Preparation_schedule_{seq}_assignee` | `ExperimentPlanDialog` で指定した `ownerRefs` の値 |

> ownerRefs が複数の assignee を持つ場合は枝番を付ける（例: `_assignee_1`, `_assignee_2`）。

---

### グループC：前提トランジション未設定のトランジションへの `event` タグ強制生成（⑥）

**背景**: `lifecycle:transition` の遷移記録は指示事項の有無によらず記録が必要。  
**対象**: 前提トランジションID（`transitionId`）の設定がないトランジションすべて

| ケース | `event` タグ | 含まれる property |
|---|---|---|
| 指示あり | 既存通り生成 | 指示内容 + `time:timestamp` + `lifecycle:transition` |
| 指示なし | **強制生成（新規追加）** | `time:timestamp` + `lifecycle:transition` のみ（最小構成） |

生成する最小構成の構造：

```
eventLog > log[@ref=methodId] > trace[@ref=programId] > event {
  @id         : event_{projectName}Preparation_schedule_{seq}
  @ref        : transitionId
  name        : Alchemia:PreparationEvent
  description : {projectName} PreparationEvent(schedule)
  property[@key="time:timestamp"]        xsi:type="dateTimeType"
  property[@key="lifecycle:transition"]  xsi:type="stringType"  値="schedule"
}
```

---

## 変更対象ファイル

| ファイル | 変更内容 | グループ |
|---|---|---|
| `backend/src/repositories/eventLogRepository.ts` | `buildProjectInstructionSentLogJson` の ID 命名・name/description・time:timestamp・lifecycle:transition・ownerRef 二重化の修正 | A・B |
| `backend/src/services/projectInstructionService.ts` | `insertProjectInstructionSentLog` の呼び出し側で前提トランジション未設定のトランジションを収集し強制生成ロジックを追加 | C |
| `backend/src/utils/maimlDataWriter.ts` | `buildEventLogXML` で `name` / `description` タグの出力に対応 | A |

---

## 実装ステップ

- [x] **Step 1**: グループA 共通ルールの定義確認・コメント整備（`eventLogRepository.ts`）
- [x] **Step 2**: グループA の ID 命名規則を `buildProjectInstructionSentLogJson` に適用
- [x] **Step 3**: グループA の `name` / `description` を各タグ JSON に追加
- [x] **Step 4**: グループA の `time:timestamp` キー変更（`SupervisorDirectiveTimestamp` → `time:timestamp`）
- [x] **Step 5**: グループA の `lifecycle:transition` プロパティ追加（transitionId + taskNo 両方指定時の event タグのみ）
- [x] **Step 6**: グループB の `ownerRef` 二重化（issuer / assignee）
- [x] **Step 7**: グループC の前提トランジション未設定トランジションへの event タグ強制生成ロジック追加
- [x] **Step 8**: `buildEventLogXML` で `name` / `description` タグ出力対応
- [ ] **Step 9**: 動作確認（指示送信 → MAIML ファイル出力内容の確認）

---

## リスク

| リスク | 対策 |
|---|---|
| DB 既存データとの不整合（ID 形式変更） | `buildEventLogXML` は DB の JSON から XML を生成するため既存データには影響なし。新規 INSERT 分から適用 |
| `ownerRefs` が空配列の場合の assignee 欠落 | assignee が 0 件の場合は ownerRef_assignee を省略する条件分岐を追加 |
| 前提トランジション未設定の判定ロジック | MAIML の transition タグ構造を確認し、前提トランジションの有無を正確に判定する実装要調査 |

---

## 承認記録
- **計画書提示日時**: 2026-08-18
- **承認日時**: 2026-08-18
- **承認者コメント**: 承認

## 実施記録
- **開始**: 2026-08-18
- **完了**: 2026-08-18

### 変更ファイル
1. `backend/src/repositories/eventLogRepository.ts`
   - `ProjectInstructionSentLogParams` に `projectName`・`assigneeOwnerRefs` を追加
   - `buildProjectInstructionSentLogJson` を全面改修（グループA・B）
   - `insertLifecycleTransitionEventLog` メソッドを新規追加（グループC）
2. `backend/src/services/projectInstructionService.ts`
   - `sendInstructions` で `assigneeOwnerRefs`・`projectName` を params に追加（グループA・B）
   - `insertLifecycleTransitionEventsForNoPrerequisite` 関数を新規追加して呼び出し（グループC）
3. `backend/src/utils/maimlDataWriter.ts`
   - `buildEventLogXML`・`buildLogEntryXML`・`buildTraceXML`・`buildEventXML` に `name`/`description` タグ出力を追加（グループA Step8）
