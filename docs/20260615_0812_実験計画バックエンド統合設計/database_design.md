# データベース設計詳細

> 作成日: 2026-06-15
> ステータス: **設計確定**

---

## 1. 変更サマリー

| # | 変更種別 | 対象 | 内容 |
|---|---------|------|------|
| 1 | **新規作成** | `experiment_plan` | 実験計画（想定値・注意事項・Ref情報） |
| 2 | **カラム追加** | `project_task_detail` | `review_result TEXT` |
| 3 | **マスター追加** | `code_master` | `task_status` の `06`（NG） |

---

## 2. 新規テーブル: `experiment_plan`

### 2-1. テーブル定義

```sql
CREATE TABLE IF NOT EXISTS experiment_plan (
  -- 主キー
  organization_id   uuid           NOT NULL,
  project_id        varchar(20)    NOT NULL,
  method_id         varchar        NOT NULL,
  task_number       integer        NOT NULL DEFAULT 0,
  -- ※ task_number = 0 は「全体タブ」、1〜N は「タスクNタブ」

  -- 全データを Transition 単位にまとめた単一 JSONB カラム
  -- 構造: { [transitionId]: { [key]: value } }
  planned_values  jsonb  DEFAULT '{}'::jsonb,

  -- 管理カラム
  create_user_id   varchar(50),
  create_at        timestamp  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_user_id   varchar(50),
  update_at        timestamp  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT experiment_plan_PKC
    PRIMARY KEY (organization_id, project_id, method_id, task_number),

  CONSTRAINT fk_experiment_plan_org_project
    FOREIGN KEY (organization_id, project_id)
    REFERENCES project (organization_id, project_id)
    ON DELETE CASCADE
);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_experiment_plan_update_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.update_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_experiment_plan_update_at
  BEFORE UPDATE ON experiment_plan
  FOR EACH ROW
  EXECUTE FUNCTION update_experiment_plan_update_at();

-- インデックス
CREATE INDEX idx_experiment_plan_project
  ON experiment_plan (organization_id, project_id);

CREATE INDEX idx_experiment_plan_method
  ON experiment_plan (organization_id, project_id, method_id);
```

### 2-2. カラム説明

| カラム名 | 型 | 必須 | 説明 |
|---------|---|------|------|
| `organization_id` | uuid | ✅ | 組織ID（マルチテナント分離） |
| `project_id` | varchar(20) | ✅ | プロジェクトID（プロジェクト名） |
| `method_id` | varchar | ✅ | MAIMLのMethodID |
| `task_number` | integer | ✅ | 0=全体タブ、1〜N=タスクNタブ |
| `planned_values` | jsonb | | Transition単位の全設定データ（後述） |
| `create_user_id` | varchar(50) | | 作成者ユーザーID |
| `create_at` | timestamp | ✅ | 作成日時 |
| `update_user_id` | varchar(50) | | 最終更新者ユーザーID |
| `update_at` | timestamp | ✅ | 更新日時 |

### 2-3. task_number の意味

```
task_number = 0  → 「全体タブ」
  - このMethodで対象とする全Transitionの共通設定を格納
  - planned_values の各 transitionId キー配下に設定を持つ

task_number = 1  → 「タスク1タブ」（Transition 1 に対応）
task_number = 2  → 「タスク2タブ」（Transition 2 に対応）
task_number = N  → 「タスクNタブ」（Transition N に対応）
  - 各タスク固有の上書き設定を格納
  - 全体タブと同じ transitionId キーを持ち、個別に上書きする値のみ記録
  - フロントエンドは「全体タブ値 + タスクN上書き値」をマージして表示
```

### 2-4. planned_values JSONB 構造（**Transition単位**）

`planned_values` は **TransitionID をトップレベルキー** とし、その配下に Ref情報・注意事項・テンプレート想定値をまとめて格納します。

```typescript
interface TransitionPlanValues {
  // --- Ref情報（MAIMLのConditionに mgr-instruction:xxx キーで書き込む） ---
  "mgr-instruction:requiredCreatorUUID"?:    string[];  // CreatorRef UUIDの配列
  "mgr-instruction:requiredInstrumentUUID"?: string[];  // InstrumentRef UUIDの配列
  "mgr-instruction:requiredOwnerUUID"?:      string[];  // OwnerRef UUIDの配列

  // --- 注意事項（MAIMLのConditionに mgr-instruction:xxx キーで書き込む） ---
  "mgr-instruction:caution"?:          string;  // 安全上の注意事項
  "mgr-instruction:operationNote"?:    string;  // 操作手順上の注記
  "mgr-instruction:checkItem"?:        string;  // 実施前後の確認事項
  "mgr-instruction:prohibitedAction"?: string;  // 禁止事項
  "mgr-instruction:OtherNotes"?:       string;  // その他注意事項

  // --- テンプレート想定値（既存テンプレートIDをキーに、フィールドKey→想定値） ---
  [templateId: string]: {
    [fieldKey: string]: string;  // 数値も文字列として保存
  } | string[] | string | undefined;
}

// template_values の全体型
interface ExperimentPlanTemplateValues {
  [transitionId: string]: TransitionPlanValues;
}
```

#### DB保存例（全体タブ: task_number=0）

```json
{
  "transition-uuid-1": {
    "mgr-instruction:requiredCreatorUUID":     ["user-uuid-001", "user-uuid-002"],
    "mgr-instruction:requiredInstrumentUUID":  ["inst-uuid-001"],
    "mgr-instruction:requiredOwnerUUID":       ["user-uuid-003"],
    "mgr-instruction:caution":                "試薬Aは取り扱い注意。保護具を着用すること",
    "mgr-instruction:operationNote":          "反応温度は25℃で保持すること",
    "mgr-instruction:checkItem":              "実験前に装置の動作確認を行うこと",
    "condition-template-1": {
      "temperature": "25",
      "pressure": "1.0"
    },
    "material-template-1": {
      "reagentA_amount": "10",
      "reagentB_amount": "5"
    }
  },
  "transition-uuid-2": {
    "mgr-instruction:requiredCreatorUUID":     ["user-uuid-001"],
    "mgr-instruction:prohibitedAction":       "加熱中の蓋開け禁止",
    "condition-template-2": {
      "reactionTime": "60",
      "stirringSpeed": "200"
    },
    "result-template-1": {
      "expected_yield": "85"
    }
  }
}
```

#### DB保存例（タスク1タブ: task_number=1、Transition 1 対応）

```json
{
  "transition-uuid-1": {
    "mgr-instruction:caution": "タスク1専用: 追加の保護具が必要",
    "condition-template-1": {
      "temperature": "26"
    }
  }
}
```

> **注意**: タスクNタブには上書きしたい値のみを格納する。未記載のキーは全体タブの値を使用。

### 2-5. MAIMLへの書き込み対応

チェックアウト時に `planned_values` から MAIML の各Transitionノードへ書き込む。

| JSONBキー | MAIML書き込み先 | 格納形式 |
|-----------|----------------|---------|
| `mgr-instruction:requiredCreatorUUID` | **Condition** property | JSON文字列化した配列 |
| `mgr-instruction:requiredInstrumentUUID` | **Condition** property | JSON文字列化した配列 |
| `mgr-instruction:requiredOwnerUUID` | **Condition** property | JSON文字列化した配列 |
| `mgr-instruction:caution` | **Condition** property | 文字列そのまま |
| `mgr-instruction:operationNote` | **Condition** property | 文字列そのまま |
| `mgr-instruction:checkItem` | **Condition** property | 文字列そのまま |
| `mgr-instruction:prohibitedAction` | **Condition** property | 文字列そのまま |
| `mgr-instruction:OtherNotes` | **Condition** property | 文字列そのまま |
| `{templateId}.{fieldKey}` | **Data** property | 数値型/文字列型 |

#### MAIML書き込み例（Transition 1 の Condition）

```xml
<Transition uuid="transition-uuid-1">
  <Condition>
    <property key="mgr-instruction:requiredCreatorUUID">
      <content xsi:type="stringType">["user-uuid-001","user-uuid-002"]</content>
    </property>
    <property key="mgr-instruction:requiredInstrumentUUID">
      <content xsi:type="stringType">["inst-uuid-001"]</content>
    </property>
    <property key="mgr-instruction:caution">
      <content xsi:type="stringType">タスク1専用: 追加の保護具が必要</content>
    </property>
    <property key="mgr-instruction:operationNote">
      <content xsi:type="stringType">反応温度は25℃で保持すること</content>
    </property>
    <property key="temperature">
      <content xsi:type="floatType" units="°C">26</content>
    </property>
    <property key="pressure">
      <content xsi:type="floatType" units="MPa">1.0</content>
    </property>
  </Condition>
</Transition>
```

### 2-6. データ例（1Method・3Transition の場合）

```
-- レコード1: 全体タブ
organization_id = 'org-uuid-001'
project_id      = 'project_alpha'
method_id       = 'method-uuid-001'
task_number     = 0
planned_values = {
  "transition-uuid-1": { "mgr-instruction:requiredCreatorUUID": [...], "condition-template-1": { ... } },
  "transition-uuid-2": { "mgr-instruction:caution": "...", "condition-template-2": { ... } },
  "transition-uuid-3": { "mgr-instruction:requiredInstrumentUUID": [...], "result-template-1": { ... } }
}

-- レコード2: タスク1タブ（Transition 1 の上書き設定）
organization_id = 'org-uuid-001'
project_id      = 'project_alpha'
method_id       = 'method-uuid-001'
task_number     = 1
planned_values = {
  "transition-uuid-1": { "mgr-instruction:caution": "タスク1専用の追記", "condition-template-1": { "temperature": "26" } }
}

-- レコード3: タスク2タブ（Transition 2 の上書き設定）
organization_id = 'org-uuid-001'
project_id      = 'project_alpha'
method_id       = 'method-uuid-001'
task_number     = 2
planned_values = {
  "transition-uuid-2": { "condition-template-2": { "reactionTime": "65" } }
}
```

---

## 3. 既存テーブル拡張: `project_task_detail`

### 3-1. マイグレーション SQL

```sql
-- NG理由記録カラムの追加
ALTER TABLE project_task_detail
  ADD COLUMN IF NOT EXISTS review_result TEXT;

COMMENT ON COLUMN project_task_detail.review_result
  IS 'タスクレビューNG時の理由・コメント（NULLの場合は承認済みまたは未レビュー）';
```

### 3-2. 利用方法

| タスクステータス | `review_result` | 説明 |
|---------------|----------------|------|
| 承認（05） | NULL | 承認処理ではNULLのまま（または空文字） |
| NG（06） | 理由テキスト | NG時にManagerが入力したコメント |
| その他 | NULL | 未レビュー |

---

## 4. `code_master` への追加

### 4-1. TaskStatus NG（06）追加

```sql
-- 全組織共通のcode_masterを持つ場合の例
-- ※ 実際のcode_masterのorg管理方式に合わせて調整すること
INSERT INTO code_master (
  organization_id,
  code_division,
  code_value,
  code_name,
  sort_order
)
SELECT
  o.organization_id,
  'task_status',
  '06',
  'NG',
  60
FROM organization o
WHERE NOT EXISTS (
  SELECT 1 FROM code_master
  WHERE organization_id = o.organization_id
    AND code_division   = 'task_status'
    AND code_value      = '06'
);
```

### 4-2. task_status 全体の値一覧（更新後）

| code_value | code_name | 説明 |
|-----------|-----------|------|
| `00` | 未割当 | タスク未割当 |
| `01` | 割当済 | Worker割当完了 |
| `02` | 作業中 | Worker作業中 |
| `03` | レビュー待ち | Worker完了・Managerレビュー待ち |
| `04` | レビュー中 | Managerレビュー中 |
| `05` | 完了 | Manager承認済み |
| `06` | **NG** | **Manager NG判定（新規追加）** |

---

---

## 5. 既存テーブル拡張: `transition_data`（トランジション順序）

### 5-1. 概要

`transition_data` テーブルは、Workerのトランジション実績（`status`, `progress_rate`）を管理する既存テーブルです。  
Managerが `ExperimentPlanDialog` で設定したトランジションの**作業順序**（`work_order`）と**固定順序フラグ**（`is_order_fixed`）を追加します。

### 5-2. マイグレーション SQL

```sql
-- ===================================================================
-- ファイル名: 20260617_001_add_order_to_transition_data.sql
-- 概要: transition_data にトランジション実行順序を追加
-- ===================================================================

-- 1. work_order カラムを追加（Managerが設定した作業順序）
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS work_order INTEGER;

-- 2. is_order_fixed カラムを追加（固定順序フラグ）
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS is_order_fixed BOOLEAN NOT NULL DEFAULT false;

-- 3. コメント追加
COMMENT ON COLUMN transition_data.work_order
  IS 'トランジションの作業順序（1, 2, 3...）Manager が ExperimentPlanDialog で設定。task_no=0 の行を正として扱う';

COMMENT ON COLUMN transition_data.is_order_fixed
  IS '固定順序フラグ（true: 順序変更不可、デフォルト: false）';

-- 4. 作業順序ソート用インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_work_order
  ON transition_data (organization_id, project_id, method_id, task_no, work_order);

-- 5. 既存データへのデフォルト順序設定（transition_id 昇順）
WITH ordered_transitions AS (
  SELECT
    organization_id,
    project_id,
    method_id,
    task_no,
    transition_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, project_id, method_id, task_no
      ORDER BY transition_id
    ) AS default_order
  FROM transition_data
  WHERE work_order IS NULL
)
UPDATE transition_data td
SET work_order = ot.default_order
FROM ordered_transitions ot
WHERE td.organization_id = ot.organization_id
  AND td.project_id      = ot.project_id
  AND td.method_id       = ot.method_id
  AND td.task_no         = ot.task_no
  AND td.transition_id   = ot.transition_id;
```

### 5-3. 拡張後のカラム一覧

| カラム名 | 型 | 必須 | 説明 |
|---------|---|------|------|
| `organization_id` | uuid | ✅ | 組織ID（主キー） |
| `project_id` | varchar(20) | ✅ | プロジェクトID（主キー） |
| `method_id` | varchar | ✅ | MAIMLのMethodID（主キー） |
| `task_no` | numeric(3,0) | ✅ | タスク連番（主キー）0=全体タブ |
| `transition_id` | varchar | ✅ | トランジションID（主キー） |
| `status` | numeric(2,0) | | ステータス（Worker実績） |
| `progress_rate` | numeric(3,0) | | 進捗率（Worker実績） |
| `work_order` | integer | ✅ | **[NEW]** 作業順序（1〜N）Managerが設定 |
| `is_order_fixed` | boolean | ✅ | **[NEW]** 固定順序フラグ（デフォルト: false） |
| `create_user_id` | varchar(50) | | 作成者ユーザID |
| `create_at` | timestamp | | 作成日時 |
| `update_user_id` | varchar(50) | | 更新者ユーザID |
| `update_at` | timestamp | | 更新日時 |

### 5-4. task_no の意味

```
task_no = 0  → 「全体タブ」の順序設定
  - ExperimentPlanDialog の保存時、全体タブで設定した順序を task_no=0 に保存
  - チェックアウト時や Worker 画面では task_no=0 の順序を各タスクに適用

task_no = 1〜N  → 「タスクNタブ」の進捗管理
  - Worker 作業時の実績（status, progress_rate）を記録
  - 順序は task_no=0 の値を参照（タスクごとに異なる順序は持たない）
```

> **設計方針**: 順序は `task_no=0` にのみ保存し、各タスクは同じ順序を共有する。  
> 将来的にタスクごとに異なる順序が必要になった場合は、`task_no=N` でも `work_order` を設定できる。

### 5-5. データ例

```
org_id | project_id  | method_id        | task_no | transition_id     | status | progress_rate | work_order | order_fixed
───────┼─────────────┼──────────────────┼─────────┼───────────────────┼────────┼───────────────┼────────────┼────────────
org-1  | proj_alpha  | method-uuid-001  |    0    | transition-uuid-1 | NULL   | NULL          |     1      | false
org-1  | proj_alpha  | method-uuid-001  |    0    | transition-uuid-2 | NULL   | NULL          |     2      | false
org-1  | proj_alpha  | method-uuid-001  |    0    | transition-uuid-3 | NULL   | NULL          |     3      | true   ← 固定
org-1  | proj_alpha  | method-uuid-001  |    1    | transition-uuid-1 |   0    |    0          |     1      | false
org-1  | proj_alpha  | method-uuid-001  |    1    | transition-uuid-2 |   1    |   50          |     2      | false
org-1  | proj_alpha  | method-uuid-001  |    1    | transition-uuid-3 |   0    |    0          |     3      | true
```

> **注意**: `task_no=0` の行は順序管理専用（status/progress_rate は NULL）。  
> `task_no=1〜N` は Worker の作業記録（work_order/order_fixed は task_no=0 と同値に保つ）。

---

## 7. 継承ロジックの仕様（重要）

全体タブ（task_number=0）→ 各タスクタブ（task_number=N）の継承は、**フロントエンドのstateで管理**し、バックエンドはシンプルな UPSERT のみを行う。

### 継承ルール
1. タスクNタブを開く際、全体タブのデータをデフォルト値として読み込む
2. ユーザーが個別に変更した項目は `overrideFlags` フラグで追跡する
3. 保存時は「継承 + 上書き分」を合算して `experiment_plan` に保存する
4. DB上は継承元への参照は持たない（各行が独立したデータを持つ）

### フロントエンドの `overrideFlags` 型定義（参考）

```typescript
interface ExperimentPlanOverrideFlags {
  creatorRefs:     boolean;  // trueなら独自設定、falseなら全体タブ継承
  instrumentRefs:  boolean;
  ownerRefs:       boolean;
  notes:           boolean;
}
```

---

## 8. DDL参照先

既存テーブルの詳細DDLは以下を参照:

| テーブル | DDLファイル |
|---------|-----------|
| `project` | `docs/design/db/ddl/project.sql` |
| `project_task_detail` | `docs/design/db/ddl/project_task_detail.sql` |
| `template_data` | `docs/design/db/ddl/template_data.sql` |
| `code_master` | `docs/design/db/ddl/code_master.sql` |
