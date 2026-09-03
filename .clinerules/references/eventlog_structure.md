# eventLog 記述規約

## 概要

このドキュメントは、mmdpf システムにおける MAIML `<eventLog>` 層の記述ルールを定める恒久規約です。  
`lifecycle:transition` を含む eventLog を実装する際は**必ずこのドキュメントを参照**してください。

---

## 1. eventLog の種類

| 種類 | メソッド | 対象フェーズ |
|---|---|---|
| トランジション進捗 | `insertTransitionProgressLog` | 作業実施フェーズ |
| 指示確認 | `insertInstructionConfirmLog` | 指示確認フェーズ |
| プロジェクト指示送信 | `insertProjectInstructionSentLog` | 指示送信フェーズ（Preparation） |

---

## 2. lifecycle:transition 系 eventLog 共通ルール

`lifecycle:transition` プロパティを含む eventLog を生成する場合、以下の共通ルールをすべて適用すること。

### 2-1. ID 命名規則

**形式**: `{タグ名}_{projectName}{フェーズ名}_{seq}`

> **注意**: `eventLog @id` は MAIML 上1つしか存在できないため、特定処理に紐づいた ID 名にすることができない。  
> `buildEventLogXML` が既存 MAIML から抽出した値（`eventLogID` 等）で上書き出力するため、DB の JSON に書いた値は無視される。  
> そのため `eventLog @id` は命名規則の対象外とし、既存 MAIML の値を維持する。

| タグ | ID 形式 |
|---|---|
| `eventLog @id` | **既存 MAIML の値を維持**（`eventLogID` 等）。命名規則対象外 |
| `log @id` | `log_{projectName}{フェーズ名}_{seq}` |
| `trace @id` | `trace_{projectName}{フェーズ名}_{seq}` |
| `event @id` | `event_{projectName}{フェーズ名}_{seq}` |
| `ownerRef @id`（issuer）  | `ownerRef_{projectName}{フェーズ名}_{seq}_issuer` |
| `ownerRef @id`（assignee） | `ownerRef_{projectName}{フェーズ名}_{seq}_assignee` |

**フェーズ名一覧**:

| フェーズ | フェーズ名 | 対応メソッド |
|---|---|---|
| 指示送信（Preparation） | `Preparation_schedule` | `insertProjectInstructionSentLog` |
| 品質評価（Quality） | `Quality_evaluation` | `buildQualityEvalLogEntries` |
| トランジション進捗（WorkerTransition） | `WorkerTransition_update` | `insertTransitionProgressLog` |

> 新たなフェーズが追加される場合はこのテーブルに追記すること。  
> ownerRefs が複数の assignee を持つ場合は枝番を付ける（例: `_assignee_1`, `_assignee_2`）。

### 2-2. `name` / `description`

`log` / `trace` / `event` 各タグに以下を付与する。

> **注意**: `eventLog` タグは MAIML 上1つしか存在できないため、特定処理に紐づいた `name` / `description` を設定することができない。`eventLog` タグへの付与は行わない。

| 属性 | 値 |
|---|---|
| `name` | `Alchemia:{フェーズ識別名}` |
| `description` | `{projectName} {フェーズ識別名}({lifecycle:transition値})` |

**フェーズ識別名一覧**:

| フェーズ | フェーズ識別名 | lifecycle:transition 値 |
|---|---|---|
| 指示送信（Preparation） | `PreparationEvent` | `schedule` |
| 品質評価（Quality） | — | —（lifecycle:transition は使用しない） |
| トランジション進捗（WorkerTransition） | `WorkerTransitionEvent` | 遷移パターン依存（下表参照） |

**WorkerTransition フェーズの遷移値一覧**:

| 遷移前ステータス | 遷移後ステータス | lifecycle:transition 値 |
|---|---|---|
| 1: 初期状態（INITIAL）    | 2: 準備状態（PREPARING）   | `schedule`   |
| 2: 準備状態（PREPARING）  | 3: 準備完了状態（READY）   | `assign`     |
| 1: 初期状態（INITIAL）    | 6: 終状態（COMPLETED）     | `autoskip`   |
| 2: 準備状態（PREPARING）  | 6: 終状態（COMPLETED）     | `manualskip` |
| 3: 準備完了状態（READY）  | 3: 準備完了状態（READY）   | `reassign`   |
| 2: 準備状態（PREPARING）  | 7: 異常終了状態（ERROR）   | `withdraw`   |
| 3: 準備完了状態（READY）  | 7: 異常終了状態（ERROR）   | `withdraw`   |
| 3: 準備完了状態（READY）  | 4: 動作状態（IN_PROGRESS） | `start`      |
| 4: 動作状態（IN_PROGRESS）| 5: 休止状態（PAUSED）      | `suspend`    |
| 5: 休止状態（PAUSED）     | 4: 動作状態（IN_PROGRESS） | `resume`     |
| 4: 動作状態（IN_PROGRESS）| 6: 終状態（COMPLETED）     | `complete`   |
| 4: 動作状態（IN_PROGRESS）| 7: 異常終了状態（ERROR）   | `ate_abort`  |
| 5: 休止状態（PAUSED）     | 7: 異常終了状態（ERROR）   | `ate_abort`  |

> マッピングが存在しないパターン（上表に該当しない遷移）は `statusLabel`（遷移後ステータス名）をフォールバックとして使用する。
> 実装: `backend/src/repositories/eventLogRepository.ts` の `LIFECYCLE_TRANSITION_VALUE_MAP` を参照。

### 2-3. タイムスタンプ property

タイムスタンプは XES 標準の `time:timestamp` キーを使用する。

| `@key` | `@xsi:type` | 値 |
|---|---|---|
| `time:timestamp` | `dateTimeType` | ISO8601 形式の日時文字列 |

> `SupervisorDirectiveTimestamp` 等の独自キーは使用しないこと。

### 2-4. `lifecycle:transition` property

**適用条件**: `transitionId` と `taskNo` の**両方が指定された場合**の `event` タグのみ  
（transitionId のみ・taskNo のみ・methodId のみ・全体指示の粒度には付与しない）

| `@key` | `@xsi:type` | 値 |
|---|---|---|
| `lifecycle:transition` | `stringType` | フェーズに対応する遷移値（下表） |

**遷移値一覧**:

| フェーズ | 値 |
|---|---|
| 指示送信（Preparation） | `schedule` |
| トランジション進捗（WorkerTransition） | 遷移パターン依存（セクション2-2の WorkerTransition フェーズの遷移値一覧を参照） |

> 新たなフェーズが追加される場合はこのテーブルに追記すること。

### 2-5. `ownerRef` の構成

`ownerRef` は以下の2件を必ず記載する。

| 役割 | `@id` | `@ref` の値 |
|---|---|---|
| 指示出しユーザー（issuer） | `ownerRef_{projectName}{フェーズ名}_{seq}_issuer` | `userId`（`@` → `_` 置換） |
| 作業予定者（assignee） | `ownerRef_{projectName}{フェーズ名}_{seq}_assignee` | `ExperimentPlanDialog` で指定した `ownerRefs` の値 |

> assignee が 0 件の場合は `ownerRef_assignee` を省略する。

---

## 3. 前提トランジション未設定のトランジションへの `event` タグ生成ルール

`lifecycle:transition` の遷移記録は**指示事項の有無によらず**必ず記録すること。  
前提トランジションID（`transitionId`）の設定がないトランジションに対して `event` タグを強制生成する。

| ケース | `event` タグ | 含まれる property |
|---|---|---|
| 指示あり | 通常生成 | 指示内容 + `time:timestamp` + `lifecycle:transition` |
| 指示なし | **強制生成** | `time:timestamp` + `lifecycle:transition` のみ（最小構成） |

**最小構成の構造**:

```xml
<event id="event_{projectName}Preparation_schedule_{seq}"
       ref="{transitionId}">
  <name>Alchemia:PreparationEvent</name>
  <description>{projectName} PreparationEvent(schedule)</description>
  <property key="time:timestamp" xsi:type="dateTimeType">
    <value>{ISO8601日時}</value>
  </property>
  <property key="lifecycle:transition" xsi:type="stringType">
    <value>schedule</value>
  </property>
</event>
```

---

## 5. 品質評価 eventLog の記載項目

`buildQualityEvalLogEntries()` が生成する評価エントリの property キー名。

| 項目 | キー名 | `xsi:type` | 対象スコープ |
|---|---|---|---|
| 評価日時 | `time:timestamp` | `dateTimeType` | 全スコープ共通（XES 標準） |
| 評価値（デジタル） | `Alchemia:evaluationDigital` | `stringType` | 全スコープ共通 |
| 評価スコア | `Alchemia:evaluationScore` | `doubleType` | 全体評価（MAIML_PROJECT）のみ |
| 評価（アナログ） | `Alchemia:evaluationAnalog` | `stringType` | 全スコープ共通 |
| タスク番号 | `Alchemia:evaluationTaskNo` | `intType` | TASK / TRANSITION_TASK のみ |

### スコープ別階層構造

| `evaluation_scope` | eventLog 内の記載位置 | ownerRef 位置 | resultsRef |
|---|---|---|---|
| MAIML_PROJECT（全体評価） | `eventLog` 直下 property | `eventLog` 直下（XSD 外） | なし |
| METHOD | `log` 直下 property | `log` 直下 ownerRef | なし |
| TASK | `trace` 直下 property（@taskno + taskNo property） | `trace` 直下 ownerRef | なし |
| TRANSITION_METHOD | `event` 直下 property | `event` 直下 ownerRef | あり |
| TRANSITION_TASK | `event` 直下 property（taskNo property 追加） | `event` 直下 ownerRef | あり |

---

## 6. 関連ファイル

| ファイル | 役割 |
|---|---|
| `backend/src/repositories/eventLogRepository.ts` | eventLog の JSON 生成・DB 書き込み |
| `backend/src/utils/maimlDataWriter.ts` | JSON → XML 変換（`buildEventLogXML`） |
| `backend/src/services/maimlWriterService.ts` | MAIML ファイルへの書き出し |
| `frontend/src/types/maiml-unified.ts` | EventLog / Log / Trace / Event の型定義 |

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|---|---|---|
| 2026-09-03 | WorkerTransition フェーズの lifecycle:transition 遷移値一覧を正確な遷移パターン対応表に更新（旧: ステータスラベル一覧 → 新: fromStatus × toStatus 対応表） | Cline |
| 2026-08-18 | 初版作成（lifecycle:transition 系共通ルール定義） | Cline |
