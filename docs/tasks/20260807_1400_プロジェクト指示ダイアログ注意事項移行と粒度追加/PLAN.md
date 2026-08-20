# タスク計画書: プロジェクト指示ダイアログ再設計（指示キー選択・粒度指定・二重登録）

## メタデータ

- **作成日時**: 2026-08-07 14:00
- **最終更新**: 2026-08-07（要件再整理・全面改訂）
- **タスクID**: 20260807_1400
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

タスク登録タブの「プロジェクト指示」ダイアログ（`InstructionEditDialog`）を再設計する。

**操作フロー（新UI）**:
```
① 指示キーをプルダウンで選択（MAIMLのpropertyタグに書くキー、任意）
② 粒度を選択（全体 / メソッド / トランジション / タスク）
   └─ 粒度に応じて対象選択ドロップダウンを動的表示
③ 指示内容を記載（TextArea）
④ 保存 → 指示テーブル（作業者画面確認用）＋ eventLogテーブル（MAIML記述用）に登録
```

合わせて、`ExperimentPlanDialog` 基本情報タブの「注意事項」UIを**完全に廃止**する。

---

## 2. 目的と期待される成果

- [ ] `InstructionEditDialog` に「指示種別」ドロップダウンが追加される（**必須**）
- [ ] 指示の対象（指示対象）を選択できる（任意 — 未選択時は全体指示）
  - **全体**（デフォルト）: `method_id=null`, `transition_id=null`, `task_no=null`
  - **メソッド**: `method_id=選択値`, `transition_id=null`, `task_no=null`
  - **トランジション**: `method_id=選択値`, `transition_id=選択値`, `task_no=null`
  - **タスク**: `method_id=選択値`, `transition_id=null`, `task_no=選択値`
- [ ] 保存時に `project_instruction` テーブルへ登録される（作業者画面確認用）
- [ ] **指示送信時**に `maiml_event_log` テーブルへ `property[@key=指示キー]` として記録される（MAIML記述用）
- [ ] `ExperimentPlanDialog` 基本情報タブの「注意事項」UIを**完全に廃止**する

---

## 3. 現状分析

### 3-1. 現在の「注意事項」の位置づけと廃止対象

**ファイル**: `frontend/src/components/project/ExperimentPlanDialog.tsx`
- `renderBasicInfoPanel()` 内の注意事項セクション（L733〜L788）
- `NoteType` 定数（`experimentPlan.ts`）は以下5種類のMAIML propertyキーを定義済み

| 定数名 | キー文字列 | 表示ラベル |
|--------|-----------|-----------|
| `NoteType.CAUTION` | `mgr-instruction:caution` | 安全上の注意事項 |
| `NoteType.OPERATION_NOTE` | `mgr-instruction:operationNote` | 操作手順上の注記 |
| `NoteType.CHECK_ITEM` | `mgr-instruction:checkItem` | 実施前後の確認事項 |
| `NoteType.PROHIBITED_ACTION` | `mgr-instruction:prohibitedAction` | 禁止事項 |
| `NoteType.OTHER_NOTES` | `mgr-instruction:OtherNotes` | その他注意事項 |

→ このキー選択をプロジェクト指示ダイアログに移植（「注意事項」という名称は廃止）

### 3-2. プロジェクト指示ダイアログの現状

**ファイル**: `frontend/src/components/project/InstructionEditDialog.tsx`
- 「対象（methodId 表示のみ）」カードと「指示内容（TextArea）」のみ
- `InstructionData` 型を生成して `onSave` へ渡す

### 3-3. 指示粒度の現状

- `TARGET_TYPES` 定数（`instructionRegistration.ts`）: `FILE=0`, `TASK=1`, `TRANSITION=2`
- 現状のプロジェクト指示ダイアログは `TARGET_TYPES.FILE`（全体）固定
- メソッド単位: `method_id` あり + `transition_id`/`task_no` なし で表現可能

### 3-4. `project_instruction` テーブルの現状

現在のカラム: `organization_id`, `project_id`, `experiment_instruction_id`, `method_id`, `priority`, `type`, `task_no`, `transition_id`, `instructions`, `instruction_user_id`, `instruction_date`, `instruction_status`, `create_user_id`, `create_at`, `update_user_id`, `update_at`

**`instruction_key` カラムが存在しない** → マイグレーションで追加が必要

### 3-5. eventLog送信の現状

**ファイル**: `backend/src/repositories/eventLogRepository.ts`
- `insertInstructionSentLog()` が **指示送信時**（`POST /instructions/send`）に呼ばれる
- `buildInstructionSentLogJson()` の `properties` 配列: `sent_at`, `experiment_instruction_id`, `instruction_user_id`, `instructions`, `priority`, `type` を記録済み
- **今回**: `instruction_key` が設定されている指示の送信時に `{ '@key': instruction_key, '#text': instructions }` を `properties` へ追記する

---

## 4. 設計方針

### 4-1. カラム名・フィールド名

- DBカラム: `instruction_key` （旧称 `note_type` は廃止）
- フロントエンド型フィールド: `instructionKey`
- 「注意事項」という名称は廃止。「指示キー」と呼称する

### 4-2. 新UIの画面構成

```
┌──────────────────────────────────────────┐
│ プロジェクト指示                    [×] │
├──────────────────────────────────────────┤
│ 指示種別 *                              │
│ [安全上の注意事項 ▼]                     │
│                                          │
│ 指示対象（未選択時は全体指示）           │
│ [トランジション ▼]                       │
│  メソッド: [method-001 ▼]               │
│  トランジション: [transition-002 ▼]     │
│                                          │
│ 指示内容 *                              │
│ ┌────────────────────────────────────┐  │
│ │ 薬品Xは引火性があるため火気厳禁... │  │
│ └────────────────────────────────────┘  │
│                       [キャンセル][追加] │
└──────────────────────────────────────────┘
```

### 4-3. データの流れ

```
操作（指示種別選択→指示対象選択→内容入力→追加）
    ↓ タスク保存時（project_instruction テーブル）
  instruction_key = 'mgr-instruction:caution'
  instructions    = '薬品Xは引火性...'
  method_id       = 'method-001'
  transition_id   = 'transition-002'
    ↓ 指示送信時（maiml_event_log）
  property[@key='mgr-instruction:caution'] = '薬品Xは引火性...'
```

---

## 5. 実装詳細

### Phase 1: DB — `instruction_key` カラム追加

**新規作成**: `backend/migrations/20260807_add_instruction_key_to_project_instruction.sql`

```sql
ALTER TABLE project_instruction
  ADD COLUMN IF NOT EXISTS instruction_key VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN project_instruction.instruction_key IS
  'MAIMLのpropertyタグキー（mgr-instruction:caution 等）。NULLはキー指定なし。';
```

**`backend/src/types/database.ts`** — `ProjectInstruction` に追加:
```typescript
/** MAIMLのpropertyタグキー（mgr-instruction:caution 等。NULLはキー指定なし） */
instruction_key?: string | null;
```

**`backend/src/sql/queries/instructions/batchInsert.sql`** — `instruction_key` を14番目のパラメータとして追加:
```sql
INSERT INTO project_instruction (
  ...,  -- 既存13カラム
  instruction_key
) VALUES (
  ...,  -- 既存$1〜$13
  $14   -- instruction_key
)
```

---

### Phase 2: バックエンド — API型・コントローラー・サービス修正

**`backend/src/types/api.ts`** — `SaveInstructionRequest` / `InstructionSaveItem` に追加:
```typescript
/** MAIMLのpropertyタグキー */
instructionKey?: string | null;
```

**`backend/src/controllers/projectInstructionController.ts`** — リクエストから `instructionKey` を受け取りServiceへ渡す

**`backend/src/services/projectInstructionService.ts`** — 指示保存処理で `instruction_key` をDBへ格納

---

### Phase 3: バックエンド — eventLog送信時のJSON構造を新設計に刷新

#### 3-1. 新しいeventLog構造の設計

MAIMLスキーマ（`maiml-eventLog.xsd`）に準拠した構造に刷新する。
既存の `insertInstructionSentLog()` / `buildInstructionSentLogJson()` を**このタスク用の新メソッドに置き換える**（既存メソッドは他指示種別で使われているため既存は保持）。

**共通プロパティ（全粒度共通）**:
- `property[@key='SupervisorDirectiveTimestamp']` — 送信日時
- `property[@key=instructionKey]` — プルダウンで選択した指示キー（設定時のみ。値は指示内容テキスト）
- `ownerRef[@ref=userId の @ を _ に置き換えた値]` — 指示を出したユーザーID

**粒度別のJSON構造**:

```
【全体指示】
eventLog {
  property[@key='SupervisorDirectiveTimestamp']  ← 時刻
  property[@key=instructionKey]                  ← 指示内容（instructionKey設定時のみ）
  ownerRef[@ref=userId(@→_)]                    ← 指示出しユーザーID（@を_に置換）
}

【メソッド単位】
eventLog {
  log[@ref=methodId] {
    property[@key='SupervisorDirectiveTimestamp']
    property[@key=instructionKey]
    ownerRef[@ref=userId(@→_)]
  }
}

【トランジション単位】  ※ methodId指定が前提
eventLog {
  log[@ref=methodId] {
    trace[@ref=programId] {         ← refには対象メソッド内のprogramタグのIDを記載
      event[@ref=experimentInstructionId] {
        property[@key='SupervisorDirectiveTimestamp']
        property[@key=instructionKey]
        ownerRef[@ref=userId(@→_)]
      }
    }
  }
}

【タスク単位】  ※ methodId指定が前提
eventLog {
  log[@ref=methodId] {
    trace[@ref=programId, @taskno=taskNo] {  ← refには対象メソッド内のprogramタグのIDを記載
      event[@ref=experimentInstructionId] {
        resultsRef[@ref=results_{sequenceNo}]  ← 枠のみ（現時点では発番のみ）
        property[@key='SupervisorDirectiveTimestamp']
        property[@key=instructionKey]
        ownerRef[@ref=userId(@→_)]
      }
    }
  }
}
```

> ⚠️ **`programId` の取得について**:  
> `programId` はMAIMLファイルの `<program id="...">` 属性値。  
> トランジション単位・タスク単位では `methodId` が必須であり、そのメソッドに含まれる `program` タグのIDを `programId` として取得・設定する必要がある。  
> 取得ロジックは既存の `insertInstructionSentLog()` と同様に呼び出し元（`projectInstructionService.ts`）で解決して渡す。

#### 3-2. `InstructionSentLogParams` の変更

```typescript
export interface InstructionSentLogParams {
  methodId: string | null;
  transitionId: string | null;
  programId: string | null;
  taskNo: number | null;
  experimentInstructionId: string;
  userId: string;
  sentAt: string;
  instructions: string | null;
  priority: number | null;
  type: number | null;
  /** MAIMLのpropertyタグキー（NULLはキー指定なし） ← 追加 */
  instructionKey?: string | null;
}
```

#### 3-3. `buildInstructionSentLogJson()` の刷新

既存の `properties` 配列（`sent_at`, `experiment_instruction_id`, `instruction_user_id`, `instructions`, `priority`, `type`）は**廃止**し、新構造に置き換える。

新しい `properties` 配列:
```typescript
const properties: Record<string, unknown>[] = [
  {
    '@key': 'SupervisorDirectiveTimestamp',
    '@xsi:type': 'dateTimeType',
    '#text': sentAt,
  },
];
// instructionKey が設定されている場合のみ追加
if (instructionKey) {
  properties.push({
    '@key': instructionKey,           // 例: 'mgr-instruction:caution'
    '@xsi:type': 'stringType',
    '#text': instructions ?? '',      // 指示内容
  });
}
```

`ownerRef` オブジェクト（`userId` の `@` を `_` に置換）:
```typescript
const ownerRefObj = { '@ref': userId.replace('@', '_') };
```

粒度別のJSON生成:
```typescript
if (!methodId) {
  // 全体指示: eventLog 直下に property + ownerRef
  return {
    eventLog: {
      '@id': `eventLog_${sequenceNo}`,
      property: properties,
      ownerRef: ownerRefObj,
    },
  };
} else if (methodId && taskNo != null) {
  // タスク単位: log > trace[@ref=programId, @taskno] > event > resultsRef + property + ownerRef
  const resultsId = `results_${sequenceNo}`;
  return {
    eventLog: {
      '@id': `eventLog_${sequenceNo}`,
      log: {
        '@id': `log_${sequenceNo}`,
        '@ref': methodId,
        trace: {
          '@id': `trace_${sequenceNo}`,
          '@ref': programId,            // 対象メソッド内のprogramタグID（必須）
          '@taskno': String(taskNo),
          event: {
            '@id': `event_${sequenceNo}`,
            '@ref': experimentInstructionId,
            resultsRef: { '@ref': resultsId },
            property: properties,
            ownerRef: ownerRefObj,
          },
        },
      },
    },
  };
} else if (methodId && transitionId) {
  // トランジション単位: log > trace[@ref=programId] > event[@ref=instructionId] > property + ownerRef
  return {
    eventLog: {
      '@id': `eventLog_${sequenceNo}`,
      log: {
        '@id': `log_${sequenceNo}`,
        '@ref': methodId,
        trace: {
          '@id': `trace_${sequenceNo}`,
          '@ref': programId,            // 対象メソッド内のprogramタグID（必須）
          event: {
            '@id': `event_${sequenceNo}`,
            '@ref': experimentInstructionId,
            property: properties,
            ownerRef: ownerRefObj,
          },
        },
      },
    },
  };
} else {
  // メソッド単位: log[@ref=methodId] > property + ownerRef
  return {
    eventLog: {
      '@id': `eventLog_${sequenceNo}`,
      log: {
        '@id': `log_${sequenceNo}`,
        '@ref': methodId,
        property: properties,
        ownerRef: ownerRefObj,
      },
    },
  };
}
```

> ⚠️ **既存メソッドとの整合性**: `insertInstructionSentLog()` は他指示種別（既存のプロジェクト指示・タスク指示）でも使われているため、**既存メソッドを直接書き換えず**、プロジェクト指示専用の新メソッド `insertProjectInstructionSentLog()` として追加する方針とする。

**`backend/src/services/projectInstructionService.ts`**
- `sendInstructions()` 内で、指示の種別を判定して既存 `insertInstructionSentLog()` から `insertProjectInstructionSentLog()` に切り替える（または、`instruction_key` の有無で分岐）

---

### Phase 4: フロントエンド — 型定義の整備

**`frontend/src/types/instructionRegistration.ts`** に追加:
```typescript
// 指示対象（未選択時は全体指示として扱う）
export const INSTRUCTION_GRANULARITY = {
  OVERALL: 'overall', METHOD: 'method',
  TRANSITION: 'transition', TASK: 'task',
} as const;
export type InstructionGranularityValue =
  typeof INSTRUCTION_GRANULARITY[keyof typeof INSTRUCTION_GRANULARITY];
export const INSTRUCTION_GRANULARITY_LABELS: Record<InstructionGranularityValue, string> = {
  overall: '全体', method: 'メソッド', transition: 'トランジション', task: 'タスク',
};

// 指示種別（MAIMLのpropertyキー。必須選択）
export const INSTRUCTION_KEY = {
  CAUTION:           'mgr-instruction:caution',
  OPERATION_NOTE:    'mgr-instruction:operationNote',
  CHECK_ITEM:        'mgr-instruction:checkItem',
  PROHIBITED_ACTION: 'mgr-instruction:prohibitedAction',
  OTHER_NOTES:       'mgr-instruction:OtherNotes',
} as const;
export type InstructionKeyValue = typeof INSTRUCTION_KEY[keyof typeof INSTRUCTION_KEY];
export const INSTRUCTION_KEY_LABELS: Record<InstructionKeyValue, string> = {
  'mgr-instruction:caution':          '安全上の注意事項',
  'mgr-instruction:operationNote':    '操作手順上の注記',
  'mgr-instruction:checkItem':        '実施前後の確認事項',
  'mgr-instruction:prohibitedAction': '禁止事項',
  'mgr-instruction:OtherNotes':       'その他注意事項',
};
```

**`InstructionData`** に optional フィールド追加（後方互換性維持）:
```typescript
instructionKey?: string | null;             // MAIMLのpropertyキー（指示種別）
granularity?: InstructionGranularityValue;  // 指示対象（UI制御用）
```

---

### Phase 5: フロントエンド — InstructionEditDialogの再設計

**`frontend/src/components/project/InstructionEditDialog.tsx`** の変更点:

**追加するUI（操作順序に合わせて上から配置）**:

1. **指示種別ドロップダウン** (`Select`, **必須**)
   - `INSTRUCTION_KEY_LABELS` の5種類をオプション表示
   - 未選択での保存は不可（バリデーションエラー）
   - 選択値を `instructionKey` として state 管理

2. **指示対象ドロップダウン** (`Select`, 任意 — **未選択時は全体指示として扱う**)
   - 選択肢: メソッド / トランジション / タスク（「全体」は選択なし＝デフォルト）
   - 選択に応じて追加ドロップダウンを動的表示:
     - メソッド選択時 → メソッド選択（`availableMethods` props）
     - トランジション選択時 → メソッド選択 + トランジション選択（`availableTransitions` props）
     - タスク選択時 → メソッド選択 + タスクNo選択（`tasks` props から抽出）
   - クリア操作で全体指示に戻る

3. **指示内容** (`TextArea`, 必須) — 既存の入力欄をそのまま維持

**削除するUI**:
- 現在の「対象（methodId 表示のみ）」カード表示 → 指示対象ドロップダウンに置き換え

**`frontend/src/components/project/TaskRegistrationTab.tsx`** — プロジェクト指示用ダイアログへ props 追加:
- `availableMethods`: 既存 `availableMethods` state
- `availableTransitions`: MAIMLから生成したトランジション一覧（`useMemo` で生成）

---

### Phase 6: フロントエンド — ExperimentPlanDialogの注意事項完全廃止

**`frontend/src/components/project/ExperimentPlanDialog.tsx`**

- `renderBasicInfoPanel()` から注意事項セクション（L733〜L788）を完全削除
- 削除: `pendingNoteType` state, `handleAddNote`, `handleRemoveNote`, `handleNoteContentChange`
- 削除: `NoteType`, `NOTE_TYPE_LABELS` のインポート
- ⚠️ **`ExperimentPlanTabData.notes` フィールドと保存処理はそのまま維持**（既存DBデータ保護・UIのみ削除）

---

## 6. 変更ファイル一覧

### バックエンド

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/migrations/20260807_add_instruction_key_to_project_instruction.sql` | 新規作成 | `instruction_key` カラム追加マイグレーション |
| `backend/src/types/database.ts` | 修正 | `ProjectInstruction.instruction_key` 追加 |
| `backend/src/sql/queries/instructions/batchInsert.sql` | 修正 | `instruction_key` を $14 として追加 |
| `backend/src/types/api.ts` | 修正 | `SaveInstructionRequest.instructionKey` 追加 |
| `backend/src/controllers/projectInstructionController.ts` | 修正 | `instructionKey` の受け取り処理追加 |
| `backend/src/services/projectInstructionService.ts` | 修正 | `instruction_key` のDB格納・送信時の受け渡し |
| `backend/src/repositories/eventLogRepository.ts` | 修正 | `InstructionSentLogParams.instructionKey` 追加・`insertProjectInstructionSentLog()` 新メソッド追加・粒度別JSON構造を新設計に刷新 |

### フロントエンド

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/types/instructionRegistration.ts` | 修正 | `INSTRUCTION_GRANULARITY`・`INSTRUCTION_KEY` 定数と型追加、`InstructionData` 拡張 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | 修正 | 指示キー選択UI・粒度選択UIを追加、既存の「対象表示カード」を粒度ドロップダウンに置き換え |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | 修正 | プロジェクト指示ダイアログへの props 追加 |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | 修正 | 基本情報タブから注意事項セクション完全廃止 |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| マイグレーション適用漏れ | 高 | 低 | batchInsert.sql 修正前にマイグレーション適用確認 |
| 既存`ExperimentPlanTabData.notes`のDBデータが消える | 高 | 低 | 保存処理は変更しない（UIのみ削除） |
| `InstructionData`型変更による既存指示表示の破損 | 中 | 低 | `instructionKey`・`granularity` はoptional追加で後方互換性を維持 |
| `INSTRUCTION_KEY` と `NoteType` の二重定義 | 低 | 高 | `NoteType` は将来的に削除候補として `experimentPlan.ts` に注記を残す |

---

## 8. テスト計画

### 手動テスト

- [ ] プロジェクト指示ダイアログに「指示種別」ドロップダウンが表示される（必須・未選択時は保存不可）
- [ ] 「指示対象」ドロップダウンは任意で、未選択のまま保存すると全体指示として登録される
- [ ] 各指示対象（メソッド/トランジション/タスク）に応じた追加選択肢が動的に表示される
- [ ] 保存すると `project_instruction.instruction_key` カラムに指示種別のキーが登録される
- [ ] 指示対象を指定せず保存した場合、`method_id`/`transition_id`/`task_no` がすべて NULL で登録される
- [ ] 指示送信後、`maiml_event_log` の `property` に `@key=instructionKey` のエントリが記録される
- [ ] 指示対象なし（全体指示）で送信した場合、eventLog が `eventLog` 直下の構造で記録される
- [ ] `ExperimentPlanDialog` の基本情報タブに注意事項が表示されないことを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-07 14:00
- **承認日時**: 2026-08-07 （承認済み）
- **承認者コメント**: 承認します。

---

## 10. 実施記録

### 実施日時
開始: 2026-08-07  
完了: 2026-08-07

### 実装ファイル一覧（実施済み）

#### バックエンド
- [x] `backend/migrations/20260807_add_instruction_key_to_project_instruction.sql` — 新規作成
- [x] `backend/src/types/database.ts` — `ProjectInstruction.instruction_key` 追加
- [x] `backend/src/sql/queries/instructions/batchInsert.sql` — `instruction_key` を $14 として追加
- [x] `backend/src/types/api.ts` — `SaveInstructionRequest.instructionKey` 追加・`methodId` をoptionalに変更
- [x] `backend/src/types/taskRegistration.ts` — `SaveTaskRegistrationRequest.instructions.instructionKey` 追加
- [x] `backend/src/services/projectInstructionService.ts` — `instruction_key` のDB格納・送信時分岐追加
- [x] `backend/src/repositories/eventLogRepository.ts` — `ProjectInstructionSentLogParams` 型・`insertProjectInstructionSentLog()` 新メソッド追加
- [x] `backend/src/repositories/instructionRepository.ts` — `InstructionInsertData.instructionKey` 追加・batchInsert SQL実行に $14 追加

#### フロントエンド
- [x] `frontend/src/types/instructionRegistration.ts` — `INSTRUCTION_GRANULARITY`・`INSTRUCTION_KEY` 定数と型追加、`InstructionData` 拡張
- [x] `frontend/src/types/taskRegistration.ts` — `InstructionSaveItem.instructionKey` 追加
- [x] `frontend/src/types/api.ts` — `SaveInstructionRequest.instructionKey` 追加・`methodId` をoptionalに変更
- [x] `frontend/src/components/project/InstructionEditDialog.tsx` — 全面再設計（指示種別UI・指示対象UI追加）
- [x] `frontend/src/components/project/TaskRegistrationTab.tsx` — プロジェクト指示ダイアログへ props 追加（`availableMethods`）
- [x] `frontend/src/components/project/InstructionRegistrationTab.tsx` — `instructionKey` をAPI呼び出しに追加
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx` — 注意事項セクション・関連state・ハンドラ・インポート削除

### ビルドチェック結果
- バックエンド TypeScript: ✅ エラーなし（exit: 0）
- フロントエンド TypeScript: ✅ 今回実装に関連するエラーなし（残存エラーは既存の無関係なもの）
