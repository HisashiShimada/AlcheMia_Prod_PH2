# タスク計画書: maiml_event_log 指示送信 JSON 構造修正

## メタデータ

- **作成日時**: 2026-08-13
- **タスクID**: 20260813_1030_eventlog_instruction_json修正
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

`InstructionEditDialog` で登録した指示を「指示を送信」した際に `maiml_event_log.log` へ書き出す JSON 構造を以下のとおり修正する。

### 変更点 1: タスクNoのみ指定ケース（`methodId + taskNo`、`transitionId` なし）

**変更前**: `eventLog > log > trace[@taskno] > event > resultsRef + property[] + ownerRef`

**変更後**: `eventLog > log > trace[@ref=programId, @taskno] > property×3 + ownerRef`
- `event` タグを廃止し `trace` 直下に property を配置
- `Alchemia:SupervisorDirectiveTaskNo` プロパティ（intType, value=taskNo）を追加

### 変更点 2: トランジション + タスクNo 両方指定ケース（新パターン）

**現在**: `taskNo != null` が `transitionId` より優先されるため、このケースが存在しない

**変更後**: `methodId + transitionId + taskNo` を最優先パターンとして新規追加
- `event` タグ内に `Alchemia:SupervisorDirectiveTaskNo` プロパティを追加
- `experiment_plan.planned_values.__task__` から取得した `creatorRefs`/`instrumentRefs` を `creatorRef`/`instrumentRef` タグとして追加

---

## 前提調査結果（現状の問題点）

### 問題点 A: creatorRefs/instrumentRefs が planned_values に保存されていない

`frontend/src/services/experimentPlanApiService.ts` の `tabDataToTransitionValues()` で
`creatorRefs` / `instrumentRefs` / `ownerRefs` が **planned_values に保存されていない**。
対応: `planned_values` の `__task__` 予約キーに格納するよう追加する。

### 問題点 B: 粒度判定の優先順位（taskNo が transitionId より優先）

```typescript
// 現状の分岐（transitionId+taskNoの組み合わせが存在しない）
if (!methodId) { /* 全体 */ }
else if (taskNo != null) { /* タスク単位（transitionId 無視） */ }
else if (transitionId) { /* トランジション単位 */ }
else { /* メソッド単位 */ }
```
対応: `methodId + transitionId + taskNo` の組み合わせを最優先パターンとして追加。

---

## 変更後の粒度判定ロジック

| 優先 | 条件 | 粒度 | 変更 |
|---|---|---|---|
| 1 | `methodId == null` | 全体指示 | なし |
| 2 | `methodId + transitionId + taskNo != null` | トランジション+タスク単位 | **新規** |
| 3 | `methodId + taskNo != null`（transitionId なし） | タスク単位 | **構造変更** |
| 4 | `methodId + transitionId`（taskNo なし） | トランジション単位 | なし |
| 5 | `methodId` のみ | メソッド単位 | なし |

---

## 実装ステップ

### Step 1: experiment_plan への creatorRefs/instrumentRefs 保存対応

**対象ファイル**: `frontend/src/services/experimentPlanApiService.ts`

`tabDataToTransitionValues()` に creatorRefs/instrumentRefs/ownerRefs の保存ロジックを追加。
保存先は `planned_values` 内の `__task__` 予約キー（トランジションID以外のタスク共通データ領域）。

```typescript
// 変更後イメージ
function tabDataToTransitionValues(tabData: ExperimentPlanTabData): TransitionPlanValues {
  const values: TransitionPlanValues = {};
  // 既存ロジック（notes / templateValues / __uncertainty__）...

  // __task__ キーにタスク共通データを格納
  const taskMeta: Record<string, unknown> = {};
  if (tabData.creatorRefs?.length) taskMeta.creatorRefs = tabData.creatorRefs;
  if (tabData.instrumentRefs?.length) taskMeta.instrumentRefs = tabData.instrumentRefs;
  if (tabData.ownerRefs?.length) taskMeta.ownerRefs = tabData.ownerRefs;
  if (Object.keys(taskMeta).length > 0) {
    (values as unknown as Record<string, unknown>)['__task__'] = taskMeta;
  }
  return values;
}
```

`transitionValuesToTabData()` の `reservedKeys` に `__task__` を追加し、復元ロジックも追加する。
（creatorRefs はトランジション単位ではなくタスク全体のデータのため、全トランジション共通で設定する）

### Step 2: `ProjectInstructionSentLogParams` に creatorRefs/instrumentRefs 追加

**対象ファイル**: `backend/src/repositories/eventLogRepository.ts`

```typescript
export interface ProjectInstructionSentLogParams {
  // ... 既存フィールド（変更なし）...
  /** トランジション+タスク単位の場合に experiment_plan から取得した Creator 一覧 */
  creatorRefs?: string[] | null;
  /** トランジション+タスク単位の場合に experiment_plan から取得した Instrument 一覧 */
  instrumentRefs?: string[] | null;
}
```

### Step 3: `sendInstructions` で experiment_plan データ取得

**対象ファイル**: `backend/src/services/projectInstructionService.ts`

`sendInstructions()` 内で、`transitionId + taskNo` 両方ある指示のみ
`experimentPlanRepository.findByMethod()` を呼び出して `__task__` から creatorRefs/instrumentRefs を取得する。

```typescript
// 追加ロジックイメージ
for (const instruction of unsentInstructions) {
  let creatorRefs: string[] | null = null;
  let instrumentRefs: string[] | null = null;

  if (instruction.transition_id && instruction.task_no != null && instruction.method_id) {
    const plans = await experimentPlanRepository.findByMethod(organizationId, projectId, instruction.method_id);
    const plan = plans.find(p => p.task_no === instruction.task_no);
    const taskMeta = (plan?.planned_values as any)?.['__task__'];
    creatorRefs = taskMeta?.creatorRefs ?? null;
    instrumentRefs = taskMeta?.instrumentRefs ?? null;
  }

  const params: ProjectInstructionSentLogParams = {
    // ... 既存フィールド ...
    creatorRefs,
    instrumentRefs,
  };
  await eventLogRepo.insertProjectInstructionSentLog(organizationId, projectId, params, client);
}
```


### Step 4: `buildProjectInstructionSentLogJson` の JSON 構造変更

**対象ファイル**: `backend/src/repositories/eventLogRepository.ts`

#### タスク単位（`methodId + taskNo`、transitionId なし）の構造変更

**変更前**: `trace` 直下に `event`（`resultsRef + property + ownerRef`）

**変更後**: `trace` 直下に直接 property + TaskNo プロパティ + ownerRef

```json
{
  "eventLog": { "@id": "eventLog_<seq>",
    "log": { "@id": "log_<seq>", "@ref": "<methodId>",
      "trace": { "@id": "trace_<seq>", "@ref": "<programId>", "@taskno": "<taskNo>",
        "property": [
          { "@key": "SupervisorDirectiveTimestamp", "@xsi:type": "dateTimeType", "#text": "<sentAt>" },
          { "@key": "<instructionKey>", "@xsi:type": "stringType", "#text": "<指示内容>" },
          { "@key": "Alchemia:SupervisorDirectiveTaskNo", "@xsi:type": "intType", "#text": <taskNo数値> }
        ],
        "ownerRef": { "@ref": "<userId（@→_）>" }
      }
    }
  }
}
```

#### 新パターン: トランジション+タスクNo（`methodId + transitionId + taskNo` 全あり）

```json
{
  "eventLog": { "@id": "eventLog_<seq>",
    "log": { "@id": "log_<seq>", "@ref": "<methodId>",
      "trace": { "@id": "trace_<seq>", "@ref": "<programId>",
        "event": { "@id": "event_<seq>", "@ref": "<experimentInstructionId>",
          "property": [
            { "@key": "SupervisorDirectiveTimestamp", "@xsi:type": "dateTimeType", "#text": "<sentAt>" },
            { "@key": "<instructionKey>", "@xsi:type": "stringType", "#text": "<指示内容>" },
            { "@key": "Alchemia:SupervisorDirectiveTaskNo", "@xsi:type": "intType", "#text": <taskNo数値> }
          ],
          "ownerRef": { "@ref": "<userId（@→_）>" },
          "creatorRef": { "@ref": "<値>" },      // 複数なら配列、0件なら省略
          "instrumentRef": { "@ref": "<値>" }    // 複数なら配列、0件なら省略
        }
      }
    }
  }
}
```

### Step 5: 型定義の整合性確認

**対象ファイル**: `backend/src/types/database.ts`

`TransitionPlanValues` の予約キーとして `__task__` のコメントを追記（任意）。

---

## 変更ファイル一覧

| # | ファイルパス | 変更内容 |
|---|---|---|
| 1 | `frontend/src/services/experimentPlanApiService.ts` | `tabDataToTransitionValues` に `__task__` キーで creatorRefs 等の保存を追加・復元対応 |
| 2 | `backend/src/repositories/eventLogRepository.ts` | `ProjectInstructionSentLogParams` に `creatorRefs`/`instrumentRefs` 追加・`buildProjectInstructionSentLogJson` のタスク単位構造変更・新パターン追加 |
| 3 | `backend/src/services/projectInstructionService.ts` | `sendInstructions` で experiment_plan から creatorRefs/instrumentRefs を取得してパラメータに追加 |
| 4 | `backend/src/types/database.ts` | `TransitionPlanValues` に `__task__` 予約キーのコメント追記（任意） |

---

## 影響範囲

- **DB スキーマ変更**: なし（JSONB のため追加フィールドは既存スキーマで保存可能）
- **API インターフェース変更**: なし（内部型の変更のみ）
- **既存データへの影響**: `__task__` キーがない既存 `planned_values` は creatorRef/instrumentRef が省略されるのみ。既存ログ構造は変更なし

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `__task__` キーが偶然トランジションIDと一致 | 高 | `__task__` は予約形式のため衝突は極めてまれ |
| `experiment_plan` 未登録時に creatorRefs が空 | 低 | 空の場合はタグ省略で問題なし |
| `InstructionEditDialog` で transitionId + taskNo の両方が入力できるか | 高 | 現状仕様では両方入力可能（要確認） |

---

## テスト計画

- [ ] タスクNoのみ指定の指示送信後: `trace` 直下に `property`（×3）と `ownerRef` があり、`event` タグが存在しないこと
- [ ] トランジション+タスクNo指定の指示送信後: `event` 内に `Alchemia:SupervisorDirectiveTaskNo` + `creatorRef` + `instrumentRef` があること
- [ ] creatorRefs が空の場合: `creatorRef` タグが省略されること
- [ ] 既存パターン（全体・メソッド・トランジション単位）の JSON 構造が変更されていないこと
- [ ] ExperimentPlanDialog で creatorRefs を設定・保存後、再表示時に復元されること

---

## 承認記録

- **計画書提示日時**: 2026-08-13
- **承認日時**: 2026-08-13
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-08-13  
完了: 2026-08-13

### 最終的な成果物
- [x] Step 1: `frontend/src/services/experimentPlanApiService.ts` — `tabDataToTransitionValues` に `__task__` キー保存追加、`transitionValuesToTabData` で `reservedKeys` 拡張 + 復元ロジック追加
- [x] Step 2: `backend/src/repositories/eventLogRepository.ts` — `ProjectInstructionSentLogParams` に `creatorRefs`/`instrumentRefs` 追加
- [x] Step 3: `backend/src/services/projectInstructionService.ts` — `experimentPlanRepository` インポート追加・`sendInstructions` で experiment_plan キャッシュ取得ロジック追加
- [x] Step 4: `backend/src/repositories/eventLogRepository.ts` — `buildProjectInstructionSentLogJson` の JSON 構造変更（タスク単位: event廃止→trace直下property、トランジション+タスク単位: 新パターン追加）
- [x] Step 5: `backend/src/types/database.ts` — `TransitionPlanValues` の予約キーコメント追記

### ビルド確認
- バックエンド: 今回変更ファイルに起因するエラーなし（既存の organizationService.ts のエラーのみ）
- フロントエンド: 今回変更ファイルに起因するエラーなし（既存の別ファイルのエラーのみ）


