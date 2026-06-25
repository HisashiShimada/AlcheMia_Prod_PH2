# データベース設計

> 作成日: 2026-06-18

---

## 1. experiment_plan テーブル（新規作成）✅ DB確定

### テーブル定義

```sql
-- backend/migrations/20260618_004_add_experiment_plan.sql

CREATE TABLE IF NOT EXISTS experiment_plan (
  organization_id   UUID                      NOT NULL,
  project_id        CHARACTER VARYING(20)     NOT NULL,
  method_id         CHARACTER VARYING         NOT NULL,
  task_no           NUMERIC(3,0)              NOT NULL,
  planned_values    JSONB                     DEFAULT '{}'::jsonb,
  create_user_id    CHARACTER VARYING(50),
  create_at         TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_user_id    CHARACTER VARYING(50),
  update_at         TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT experiment_plan_PKC
    PRIMARY KEY (organization_id, project_id, method_id, task_no)
);

-- FK制約・トリガーは設定しない（アプリ側で管理）

CREATE INDEX IF NOT EXISTS idx_experiment_plan_project
  ON experiment_plan (organization_id, project_id);

CREATE INDEX IF NOT EXISTS idx_experiment_plan_method
  ON experiment_plan (organization_id, project_id, method_id);

COMMENT ON TABLE experiment_plan IS '実験計画（Manager指示）テーブル';
COMMENT ON COLUMN experiment_plan.organization_id IS '組織ID';
COMMENT ON COLUMN experiment_plan.project_id IS 'プロジェクトID';
COMMENT ON COLUMN experiment_plan.method_id IS 'メソッドID';
COMMENT ON COLUMN experiment_plan.task_no IS 'タスク連番（1〜N）。project_task_detail.task_no と対応';
COMMENT ON COLUMN experiment_plan.planned_values IS '実験計画データ（Transition単位）JSON形式: { [transitionId]: { "mgr-instruction:xxx": value, [templateId]: { [fieldKey]: value } } }';
COMMENT ON COLUMN experiment_plan.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN experiment_plan.create_at IS '作成日時';
COMMENT ON COLUMN experiment_plan.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN experiment_plan.update_at IS '更新日時';
```

### planned_values JSONB 構造（Transition単位）✅ 確定

`planned_values` は **TransitionID をトップレベルキー** とし、その配下に Ref情報・注意事項・テンプレート想定値をまとめて格納します。

```json
{
  "transition-uuid-1": {
    "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001", "user-uuid-002"],
    "mgr-instruction:requiredInstrumentUUID": ["inst-uuid-001"],
    "mgr-instruction:requiredOwnerUUID":      ["user-uuid-003"],
    "mgr-instruction:caution":                "試薬Aは保護具を着用すること",
    "mgr-instruction:operationNote":          "反応温度は25℃で保持すること",
    "mgr-instruction:checkItem":              "実験前に装置の動作確認を行うこと",
    "mgr-instruction:prohibitedAction":       "加熱中の蓋開け禁止",
    "mgr-instruction:OtherNotes":             "その他注意事項",
    "condition-template-1": {
      "temperature": "25",
      "pressure": "1.0"
    },
    "material-template-1": {
      "reagentA_amount": "10"
    }
  },
  "transition-uuid-2": {
    "mgr-instruction:requiredCreatorUUID": ["user-uuid-001"],
    "condition-template-2": {
      "reactionTime": "60",
      "stirringSpeed": "200"
    }
  }
}
```

### DB設計上の決定事項

| 項目 | 決定内容 |
|------|---------|
| FK制約 | なし（アプリ側で管理） |
| update_at トリガー | なし（Repository層でセット） |
| カラム名 | `task_no`（既存テーブルに統一） |
| `create_user_id` / `update_user_id` | nullable（NOT NULL なし） |
| インデックス | project + method の2本 |

---

## 2. project_task_detail テーブル拡張（review_result カラム追加）

既存テーブルには `reviewed_at`、`review_user_id` カラムが既に存在するため、追加するのは **review_result のみ**。

```sql
-- backend/migrations/20260618_005_add_review_result_to_task_detail.sql

ALTER TABLE project_task_detail
  ADD COLUMN IF NOT EXISTS review_result TEXT;

COMMENT ON COLUMN project_task_detail.review_result IS 'NG理由・レビューコメント';
```

**既存カラム（追加不要）**:
- `reviewed_at` — レビュー完了日（既存）
- `review_user_id` — レビュアーID（既存）

---

## 3. code_master TaskStatus 06（NG）追加

```sql
-- backend/migrations/20260618_006_add_task_status_ng.sql

-- TaskStatus 06: NG（レビュー否認）
INSERT INTO code_master (code_division, code, i18n_key, sort_order, is_active)
VALUES ('task_status', '06', 'task_status.ng', 6, true)
ON CONFLICT (code_division, code) DO NOTHING;
```

**コード仕様**

| code | 意味 | 遷移可能先 |
|------|------|-----------|
| 01 | 未着手 | 02 |
| 02 | 作業中 | 03 |
| 03 | 作業完了 | 04, 05 |
| 04 | レビュー中 | 05, 06 |
| 05 | 承認済み | — |
| 06 | NG（再作業） | 02 |

---

## 4. transition_data テーブル拡張（未適用）

`work_order` と `prerequisite_transition_ids` の2カラムを1つのマイグレーションで追加する。

```sql
-- backend/migrations/20260618_003_add_order_and_prerequisite_to_transition_data.sql
-- ❌ 未適用

-- work_order カラム追加（Manager が設定する作業順序）
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS work_order INTEGER;

-- prerequisite_transition_ids カラム追加（前提トランジションID配列）
ALTER TABLE transition_data
  ADD COLUMN IF NOT EXISTS prerequisite_transition_ids TEXT[] DEFAULT '{}' NOT NULL;

-- コメント
COMMENT ON COLUMN transition_data.work_order
  IS 'トランジションの作業順序（1,2,3...）Manager が ExperimentPlanDialog で設定。task_no=0 の行を正として扱う';

COMMENT ON COLUMN transition_data.prerequisite_transition_ids
  IS '前提となるトランジションID配列。これらが全て completed になるまでこのトランジションは開始不可。空配列の場合は依存なし';

-- 既存データへのデフォルト順序設定
WITH ordered_transitions AS (
  SELECT
    organization_id, project_id, method_id, task_no, transition_id,
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

-- NOT NULL 制約追加（既存データへのデフォルト順序付与後）
ALTER TABLE transition_data
  ALTER COLUMN work_order SET NOT NULL,
  ALTER COLUMN work_order SET DEFAULT 0;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_transition_data_work_order
  ON transition_data (organization_id, project_id, method_id, task_no, work_order);
```

**カラム仕様**:

| カラム名 | 型 | 用途 |
|---------|---|------|
| `work_order` | INTEGER NOT NULL DEFAULT 0 | 表示順序・推奨実行順序 |
| `prerequisite_transition_ids` | TEXT[] DEFAULT '{}' | 前提トランジションID配列（空=依存なし） |

---

## 5. マイグレーション適用順序

```
1. 20260618_003_add_order_and_prerequisite_to_transition_data.sql  ← 未適用
2. 20260618_004_add_experiment_plan.sql                            ← 未適用
3. 20260618_005_add_review_result_to_task_detail.sql               ← 未適用
4. 20260618_006_add_task_status_ng.sql                             ← 未適用
```

---

## 6. experiment_plan 削除連動

プロジェクト削除時: `organization` の CASCADE により自動削除  
プロジェクト単体削除: `projectRepository.deleteProject()` でフック追加が必要

```sql
-- プロジェクト削除時の手動クリーンアップ（Service層で実行）
DELETE FROM experiment_plan
WHERE organization_id = $1 AND project_id = $2;
```
