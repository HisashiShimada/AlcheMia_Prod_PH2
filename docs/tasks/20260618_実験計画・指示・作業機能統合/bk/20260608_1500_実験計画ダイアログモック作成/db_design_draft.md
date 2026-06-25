# 実験計画テーブル 仮設計ドキュメント

> ステータス: **検討中（仮設計）** ← まだ決定ではない  
> 作成日: 2026-06-09  
> 目的: 保存先DB設計の具体的な検討材料として作成

---

## 1. 保存対象データの整理

ExperimentPlanDialog（`ExperimentPlanTabData`）で管理するデータ：

| フィールド | 型 | 内容 | 例 |
|-----------|-----|------|-----|
| selectedTransitions | string[] | 選択されたトランジションID一覧 | `["t1", "t3"]` |
| creatorRefs | string[] | 選択されたCreatorRef一覧 | `["田中太郎", "鈴木花子"]` |
| instrumentRefs | string[] | 選択されたInstrumentRef一覧 | `["HPLC-001", "XRD-002"]` |
| ownerRefs | string[] | 選択されたOwnerRef一覧 | `["実験室A"]` |
| notes | NoteItem[] | 注意事項リスト（type・content・propertiesを含む構造体） | 後述 |
| templateValues | Record<string, any> | テンプレート入力値（キー・値のペア） | `{"温度": 25, "圧力": 1.0}` |

### NoteItemの構造（JSON例）

```json
[
  {
    "id": "note-uuid-1",
    "type": "mgr-instruction:caution",
    "content": "高温注意：装置表面が100℃以上になる場合があります",
    "properties": [
      { "key": "severity", "label": "重要度", "value": "high" }
    ]
  },
  {
    "id": "note-uuid-2",
    "type": "mgr-instruction:checkItem",
    "content": "実験前に安全確認シートに署名すること",
    "properties": []
  }
]
```

### templateValuesの構造（JSON例）

```json
{
  "material-template-1.試薬A量": "10",
  "material-template-1.試薬B量": "5",
  "condition-template-1.温度": "25",
  "condition-template-1.圧力": "1.0",
  "result-template-1.収率目標": "80"
}
```

---

## 2. 保存粒度の設計（2-4の決定を反映）

```
1件のレコード = organization_id + project_id + method_id + task_number
```

| task_number | 意味 | 動作 |
|-------------|------|------|
| `0` | 全体タブ | 各タスクNタブのデフォルト値として継承 |
| `1` | タスク1タブ | 全体を継承しつつ上書き可能 |
| `2` | タスク2タブ | 全体を継承しつつ上書き可能 |
| `N` | タスクNタブ | 全体を継承しつつ上書き可能 |

---

## 3. 仮DDL（新規テーブル案）

```sql
-- 実験計画テーブル（仮設計）
-- ※ まだ確定ではありません
CREATE TABLE experiment_plan (
  organization_id    uuid NOT NULL,
  project_id         character varying(20) NOT NULL,
  method_id          character varying NOT NULL,
  task_number        integer NOT NULL DEFAULT 0,
  -- 0: 全体タブ, 1〜N: タスクNタブ

  -- Ref情報（PostgreSQL配列型）
  selected_transitions text[],
  creator_refs         text[],
  instrument_refs      text[],
  owner_refs           text[],

  -- 構造化データ（JSONB型）
  notes              jsonb,           -- NoteItem[]
  template_values    jsonb,           -- Record<templateId.key, value>

  -- 管理カラム
  create_user_id     character varying(50),
  create_at          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_user_id     character varying(50),
  update_at          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT experiment_plan_PKC PRIMARY KEY (organization_id, project_id, method_id, task_number)
);

-- コメント
COMMENT ON TABLE experiment_plan IS '実験計画（作業単位指示の詳細情報）';
COMMENT ON COLUMN experiment_plan.organization_id IS '組織ID';
COMMENT ON COLUMN experiment_plan.project_id IS 'プロジェクトID';
COMMENT ON COLUMN experiment_plan.method_id IS 'メソッドID';
COMMENT ON COLUMN experiment_plan.task_number IS 'タスク番号（全体=0、タスクN=N）';
COMMENT ON COLUMN experiment_plan.selected_transitions IS '選択されたトランジションID一覧';
COMMENT ON COLUMN experiment_plan.creator_refs IS 'CreatorRef一覧（MAIMLのdocument.creatorsから選択）';
COMMENT ON COLUMN experiment_plan.instrument_refs IS 'InstrumentRef一覧（MAIMLのdocument.instrumentsから選択）';
COMMENT ON COLUMN experiment_plan.owner_refs IS 'OwnerRef一覧（MAIMLのdocument.ownersから選択）';
COMMENT ON COLUMN experiment_plan.notes IS '注意事項一覧（JSONB形式: NoteItem[]）';
COMMENT ON COLUMN experiment_plan.template_values IS 'テンプレート入力値（JSONB形式: Record<string, any>）';
COMMENT ON COLUMN experiment_plan.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN experiment_plan.create_at IS '作成日時';
COMMENT ON COLUMN experiment_plan.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN experiment_plan.update_at IS '更新日時';

-- 検索用インデックス
CREATE INDEX idx_experiment_plan_project 
  ON experiment_plan (organization_id, project_id);

CREATE INDEX idx_experiment_plan_method 
  ON experiment_plan (organization_id, project_id, method_id);
```

---

## 4. CRUD操作の使い方

### 4-1. 保存（INSERT or UPDATE）

ダイアログの「保存」ボタン押下時。  
**同一の `(organization_id, project_id, method_id, task_number)` があれば上書き保存**。

```sql
-- UPSERT（既存レコードを上書き）
INSERT INTO experiment_plan (
  organization_id, project_id, method_id, task_number,
  selected_transitions, creator_refs, instrument_refs, owner_refs,
  notes, template_values,
  create_user_id, create_at, update_user_id, update_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, NOW())
ON CONFLICT (organization_id, project_id, method_id, task_number)
DO UPDATE SET
  selected_transitions = EXCLUDED.selected_transitions,
  creator_refs         = EXCLUDED.creator_refs,
  instrument_refs      = EXCLUDED.instrument_refs,
  owner_refs           = EXCLUDED.owner_refs,
  notes                = EXCLUDED.notes,
  template_values      = EXCLUDED.template_values,
  update_user_id       = EXCLUDED.update_user_id,
  update_at            = NOW();
```

### 4-2. 取得（ダイアログオープン時）

ダイアログを開いたとき、保存済みデータを復元するために使用。

```sql
-- 1メソッドの全タブ（全体 + 全タスク）を一括取得
SELECT *
FROM experiment_plan
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
ORDER BY task_number ASC;
```

フロントエンド側での継承ロジック：
```typescript
// task_number=0 が「全体」のデータ
const globalData = rows.find(r => r.task_number === 0);

// 各タスクNのデータ（なければ全体を継承）
const getTaskData = (taskNumber: number) =>
  rows.find(r => r.task_number === taskNumber) ?? globalData;
```

### 4-3. 削除

プロジェクト削除時に関連する実験計画データも削除。

```sql
-- プロジェクト削除時（CASCADE削除でも可）
DELETE FROM experiment_plan
WHERE organization_id = $1
  AND project_id      = $2;

-- 特定メソッドのデータ削除
DELETE FROM experiment_plan
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3;
```

---

## 5. APIエンドポイント設計（仮）

| メソッド | URL | 説明 |
|---------|-----|------|
| `GET` | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 指定メソッドの全タブデータを取得 |
| `PUT` | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNumber` | 1タブ分のデータを保存（UPSERT） |
| `DELETE` | `/api/v1/projects/:projectId/experiment-plans/:methodId` | 指定メソッドの実験計画を全削除 |

### GETレスポンス例

```json
{
  "success": true,
  "data": [
    {
      "methodId": "method-001",
      "taskNumber": 0,
      "selectedTransitions": ["t1", "t3"],
      "creatorRefs": ["田中太郎"],
      "instrumentRefs": ["HPLC-001"],
      "ownerRefs": ["実験室A"],
      "notes": [...],
      "templateValues": { "condition-template-1.温度": "25" }
    },
    {
      "methodId": "method-001",
      "taskNumber": 2,
      "selectedTransitions": ["t1"],
      "creatorRefs": ["田中太郎"],
      "instrumentRefs": ["HPLC-001"],
      "ownerRefs": ["実験室A"],
      "notes": [...],
      "templateValues": { "condition-template-1.温度": "30" }
    }
  ]
}
```

フロントエンドで「タスク2のデータがある → 全体を上書き」、「タスク1のデータがない → 全体を継承」と判断。

---

## 6. 設計方針（確定事項）

### 6-1. notes の保存形式 → JSONB 1カラムで対応（確定）

**方針**: テーブルは1つに絞り、`notes` は `jsonb` 型の1カラムで管理する。  
子テーブルは作成しない。

**理由**: `NoteItem.type` に `NoteType` の定数キー（`mgr-instruction:caution` 等）が含まれるため、JSONBの中でも種別の区別が可能。注意事項の検索・フィルタリングは現時点では不要と判断。

```json
-- notes カラムに格納する形式
[
  { "id": "...", "type": "mgr-instruction:caution",    "content": "高温注意...", "properties": [] },
  { "id": "...", "type": "mgr-instruction:checkItem",  "content": "署名すること", "properties": [] },
  { "id": "...", "type": "mgr-instruction:operationNote", "content": "...", "properties": [] }
]
```

### 6-2. template_values のキー設計

**採用する形式**: `templateId` でネストした構造  

```json
{
  "condition-template-1": {
    "温度": "25",
    "圧力": "1.0"
  },
  "material-template-1": {
    "試薬A量": "10",
    "試薬B量": "5"
  }
}
```

**理由**: フラット形式（`"condition-template-1.温度"`）よりも、テンプレートIDごとに値がグループ化されており、フロントエンドで `templateValues[templateId][fieldKey]` とアクセスしやすい。

### 6-3. 全体タブ変更時の各タスクへの反映 → フロントのstateで管理（確定）

**方針**: 全体タブを基準として各タスクタブに値を反映する。  
全体タブの変更は各タスクタブにリアルタイムで反映するが、タスクタブ側で個別に上書きした項目は保護する。

**フロントエンドのstate設計**:

```typescript
// タブデータの状態管理
interface TaskTabState {
  taskNumber: number;
  data: ExperimentPlanTabData;
  /** 各フィールドが個別上書き済みかを管理するフラグ */
  overrideFlags: {
    selectedTransitions?: boolean;
    creatorRefs?: boolean;
    instrumentRefs?: boolean;
    ownerRefs?: boolean;
    notes?: boolean;
    templateValues?: Record<string, boolean>; // テンプレートフィールドごとに管理
  };
}

// 全体タブ変更時の反映ロジック
const applyGlobalToTasks = (
  globalData: ExperimentPlanTabData,
  taskStates: TaskTabState[]
): TaskTabState[] => {
  return taskStates.map(task => ({
    ...task,
    data: {
      // overrideFlagsがtrueの項目はタスク独自の値を維持
      // falseまたは未設定の項目は全体の値を反映
      selectedTransitions: task.overrideFlags.selectedTransitions
        ? task.data.selectedTransitions
        : globalData.selectedTransitions,
      creatorRefs: task.overrideFlags.creatorRefs
        ? task.data.creatorRefs
        : globalData.creatorRefs,
      instrumentRefs: task.overrideFlags.instrumentRefs
        ? task.data.instrumentRefs
        : globalData.instrumentRefs,
      ownerRefs: task.overrideFlags.ownerRefs
        ? task.data.ownerRefs
        : globalData.ownerRefs,
      notes: task.overrideFlags.notes
        ? task.data.notes
        : globalData.notes,
      templateValues: mergeTemplateValues(
        globalData.templateValues,
        task.data.templateValues,
        task.overrideFlags.templateValues ?? {}
      ),
    }
  }));
};
```

**DBへの保存**:
- 保存ボタン押下時に全体タブ（task_number=0）と、変更があった各タスクタブ（task_number=N）をUPSERT
- overrideFlagsは保存対象外（フロントの一時的なUI状態）
- 取得時は「タスクNのDBデータ + 全体データで未保存フィールドを補完」する

---

## 7. 既存テーブルとの関係

```
project
  └── project_task
        └── project_task_detail（タスク詳細）
        
project_instruction（既存: 作業指示・コメント）
  ※ 実験計画とは別物として独立維持

experiment_plan（新規: 実験計画の詳細設定）★新テーブル
  ├── task_number=0: 全体タブのデータ
  ├── task_number=1: タスク1タブのデータ（個別上書き分）
  └── task_number=N: タスクNタブのデータ（個別上書き分）
```
