# データフロー詳細

> 作成日: 2026-06-15
> ステータス: **設計確定**

---

## 1. 全体データフロー概要

```
【Manager】                    【DB/Storage】                   【Worker】

実験計画入力
ExperimentPlanDialog
  │ PUT experiment-plans
  ▼
experiment_plan テーブル
  │
  │ ←── チェックアウト時
  │
  ▼
MAIMLファイル（S3/Swift）
  │ mgr-instruction: プロパティ追記
  │
  │                              ────────── チェックアウト ────────────────▶
  │                                          WorkRecordPanel
  │                                          想定値（mgr-instruction:）を参照
  │                                          実績値を入力・保存
  │                                                │ POST experiment/save
  │                                                ▼
  │                              template_data テーブル
  │                              project_task_detail（レビュー待ちに更新）
  │
実験指示レビュー
ExperimentInstructionTab
  │ GET experiment-instructions
  │   ← experiment_plan（想定値）
  │   ← template_data（実績値）
  │   ← project_task_detail（ステータス）
  │
  ├── 承認 → PUT .../approve
  │         project_task_detail.task_status = '05'
  │
  └── NG  → PUT .../ng
            project_task_detail.task_status = '06'
            project_task_detail.review_result = NG理由
```

---

## 2. Manager 作業フロー（実験計画入力〜チェックアウト）

### 2-1. 実験計画入力シーケンス

```
Manager                   Frontend               Backend               DB/Storage
  │                          │                      │                     │
  │ ① ダイアログを開く        │                      │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ GET plan-dialog-data  │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ SELECT experiment_plan
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │ MAIMLからMethod/Template情報取得
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │                          │                       │                     │
  │ ② 全体タブに入力・保存    │                       │                     │
  │──────────────────────▶  │                       │                     │
  │                          │ PUT experiment-plans  │                     │
  │                          │  /:methodId/0         │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ UPSERT experiment_plan
  │                          │                       │ (task_number=0)     │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │                          │                       │                     │
  │ ③ タスク1タブに入力・保存 │                       │                     │
  │──────────────────────▶  │                       │                     │
  │                          │ PUT experiment-plans  │                     │
  │                          │  /:methodId/1         │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ UPSERT experiment_plan
  │                          │                       │ (task_number=1)     │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
```

### 2-2. チェックアウトシーケンス（experiment_plan → MAIML書き込み）

```
Manager                   Frontend               Backend               DB/Storage
  │                          │                      │                     │
  │ チェックアウト実行        │                      │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ POST .../checkout     │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │                     │
  │                          │              [既存チェックアウト処理]        │
  │                          │                       │ プロジェクト状態確認 │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │              [追加: experiment_plan書き込み]│
  │                          │                       │ SELECT experiment_plan
  │                          │                       │ WHERE project_id=... │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │                       │ MAIMLファイル取得    │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀── MAIML XML ────────│
  │                          │                       │                     │
  │                          │                       │ [experimentPlanMaimlWriter]
  │                          │                       │ mgr-instruction: プロパティ追記
  │                          │                       │                     │
  │                          │                       │ 更新MAIMLを保存      │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │              [以降は既存チェックアウト処理]  │
  │                          │                       │ project_status更新   │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
```

---

## 3. Worker 作業フロー（実験実施・実績値記録）

```
Worker                    Frontend               Backend               DB/Storage
  │                          │                      │                     │
  │ 作業画面を開く            │                      │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ GET progress/...      │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ MAIMLファイル取得    │
  │                          │                       │（mgr-instruction:   │
  │                          │                       │  プロパティ含む）    │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │ 想定値を確認              │                       │                     │
  │ (mgr-instruction:XX 表示)│                       │                     │
  │                          │                       │                     │
  │ 実績値を入力・保存        │                       │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ POST experiment/save  │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ UPSERT template_data│
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │                          │                       │                     │
  │ タスク完了操作            │                       │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ PATCH .../status      │                     │
  │                          │ (task_status → '03')  │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ UPDATE project_task_detail
  │                          │                       │ task_status='03'    │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
```

---

## 4. Manager レビューフロー（承認 / NG判定）

### 4-1. 実験指示一覧表示

```
Manager                   Frontend               Backend               DB/Storage
  │                          │                      │                     │
  │ 実験指示タブを開く        │                      │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ GET experiment-instructions               │
  │                          │──────────────────────▶│                     │
  │                          │                       │                     │
  │                          │                       │ 【想定値取得】       │
  │                          │                       │ SELECT experiment_plan
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │                       │ 【実績値取得】       │
  │                          │                       │ SELECT template_data│
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │                       │ 【タスクステータス取得】
  │                          │                       │ SELECT project_task_detail
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │                       │ 【差分計算】         │
  │                          │                       │ plannedValue vs actualValue
  │                          │                       │ diff / hasDiff 算出 │
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │ 想定値・実績値・差分を確認 │                       │                     │
```

### 4-2. 承認フロー

```
Manager                   Frontend               Backend               DB/Storage
  │                          │                      │                     │
  │ 承認ボタン押下            │                      │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ PUT .../approve       │                     │
  │                          │──────────────────────▶│                     │
  │                          │                       │ SELECT project_task_detail
  │                          │                       │ (ステータス確認)     │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │                       │ UPDATE project_task_detail
  │                          │                       │ task_status='05'    │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │ タスク「完了」表示        │                       │                     │
```

### 4-3. NGフロー

```
Manager                   Frontend               Backend               DB/Storage
  │                          │                      │                     │
  │ NGボタン押下              │                      │                     │
  │──────────────────────▶  │                      │                     │
  │ NG理由入力モーダル表示    │                       │                     │
  │ NG理由を入力              │                       │                     │
  │──────────────────────▶  │                      │                     │
  │                          │ PUT .../ng            │                     │
  │                          │ { reviewResult: "..." }                    │
  │                          │──────────────────────▶│                     │
  │                          │                       │ SELECT project_task_detail
  │                          │                       │ (ステータス確認)     │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │                       │                     │
  │                          │                       │ UPDATE project_task_detail
  │                          │                       │ task_status='06'    │
  │                          │                       │ review_result='...' │
  │                          │                       │──────────────────────▶│
  │                          │                       │◀──────────────────────│
  │                          │◀─────────────────────│                     │
  │◀─────────────────────── │                       │                     │
  │ タスク「NG」表示          │                       │                     │
  │ NG理由も表示              │                       │                     │
```

---

## 5. データ変換ロジック詳細

### 5-1. experiment_plan → MAIML プロパティ変換

`template_values` は **TransitionID をトップレベルキー** とする構造です。

```
experiment_plan.template_values（JSONB） ※ TransitionID がトップレベルキー
{
  "transition-uuid-1": {
    "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
    "mgr-instruction:caution":               "保護具を着用すること",
    "mgr-instruction:operationNote":         "反応温度は25℃で保持すること",
    "condition-template-1": {
      "temperature": "25",
      "pressure": "1.0"
    }
  },
  "transition-uuid-2": {
    "mgr-instruction:prohibitedAction": "加熱中の蓋開け禁止",
    "result-template-1": {
      "expected_yield": "85"
    }
  }
}
                │
                │ experimentPlanMaimlWriter.writeToMaiml()
                │ （TransitionIDで対応するMAIMLノードを特定して書き込み）
                ▼
MAIML XML内 Transition "transition-uuid-1" の Condition

<property key="mgr-instruction:requiredCreatorUUID">
  <content xsi:type="stringType">["user-uuid-001"]</content>
</property>
<property key="mgr-instruction:caution">
  <content xsi:type="stringType">保護具を着用すること</content>
</property>
<property key="mgr-instruction:operationNote">
  <content xsi:type="stringType">反応温度は25℃で保持すること</content>
</property>
<property key="temperature">
  <content xsi:type="floatType" units="°C">25</content>
</property>
<property key="pressure">
  <content xsi:type="floatType" units="MPa">1.0</content>
</property>
```

### 5-2. 全体タブ（task_number=0）→ タスクNタブへの適用

```
task_number=0 の template_values
  └── 全タスクのMAIMLノードに一括適用

task_number=1 の template_values（タスク1専用）
  └── タスク1のMAIMLノードのみに適用
  └── 全体タブと同じキーがある場合は タスクNタブが優先（上書き）

適用優先度: タスクNタブ > 全体タブ
```

### 5-3. 実験指示一覧の差分計算ロジック

```typescript
// Service内での差分計算

for (const field of template.fields) {
  const plannedValue = plannedValues[templateId]?.[field.key] ?? null;
  const actualValue  = actualValues?.[field.key] ?? null;

  let diff: string | null = null;
  let hasDiff = false;

  if (plannedValue !== null && actualValue !== null) {
    const plannedNum = parseFloat(plannedValue);
    const actualNum  = parseFloat(actualValue);

    if (!isNaN(plannedNum) && !isNaN(actualNum)) {
      // 数値フィールド: 差分を計算
      const diffNum = actualNum - plannedNum;
      diff    = diffNum.toFixed(2);
      hasDiff = Math.abs(diffNum) > 0.001;  // 許容誤差
    } else {
      // 文字列フィールド: 一致チェック
      hasDiff = plannedValue !== actualValue;
      diff    = hasDiff ? actualValue : '一致';
    }
  } else if (plannedValue !== null && actualValue === null) {
    // 想定値あり・実績値なし
    hasDiff = true;
    diff    = '未記録';
  }

  result.push({
    key:          field.key,
    label:        field.label,
    unit:         field.unit,
    plannedValue,
    actualValue,
    diff,
    hasDiff,
  });
}
```

---

## 6. ステータス遷移図

### 6-1. タスクステータス遷移

```
[00: 未割当]
     │ Worker割当
     ▼
[01: 割当済]
     │ Worker作業開始
     ▼
[02: 作業中]
     │ Worker完了操作
     ▼
[03: レビュー待ち] ◀──────────────────── [06: NG]
     │ Managerレビュー開始                        ▲
     ▼                                          │ NG操作
[04: レビュー中]                                │
     │ Manager承認                              │
     ├───────────────────────────────────────────┘
     │ Manager承認
     ▼
[05: 完了]

※ [06: NG] → [05: 完了] への再承認も可能
```

### 6-2. プロジェクト状態と experiment_plan の操作可否

```
プロジェクト状態              experiment_plan 操作
─────────────────────────────────────────────────
[チェックアウト前]    →  ✅ 読み取り・書き込み可能
[チェックアウト中]    →  ❌ 書き込み・削除不可（読み取りのみ）
[チェックイン済み]    →  ❌ 書き込み・削除不可（読み取りのみ）
[完了]               →  ❌ 書き込み・削除不可（読み取りのみ）
```

---

## 7. 関連テーブルのデータ例（連携イメージ）

### 7-1. experiment_plan（想定値） ※ TransitionID がトップレベルキー

```
org_id | project_id | method_id        | task_num | template_values
───────┼────────────┼──────────────────┼──────────┼──────────────────────────────────────────────────
org-1  | proj_alpha | method-uuid-001  | 0        | {
       |            |                  |          |   "tr-uuid-1": {
       |            |                  |          |     "mgr-instruction:requiredCreatorUUID": ["u-001"],
       |            |                  |          |     "mgr-instruction:caution": "保護具着用",
       |            |                  |          |     "cond-1": { "temp": "25", "pres": "1.0" }
       |            |                  |          |   },
       |            |                  |          |   "tr-uuid-2": {
       |            |                  |          |     "mgr-instruction:prohibitedAction": "加熱中蓋開禁止",
       |            |                  |          |     "cond-1": { "temp": "30", "pres": "1.5" }
       |            |                  |          |   }
       |            |                  |          | }
───────┼────────────┼──────────────────┼──────────┼──────────────────────────────────────────────────
org-1  | proj_alpha | method-uuid-001  | 1        | {
       |            |                  |          |   "tr-uuid-1": {
       |            |                  |          |     "mgr-instruction:caution": "タスク1専用注意",
       |            |                  |          |     "cond-1": { "temp": "26" }
       |            |                  |          |   }
       |            |                  |          | }
───────┼────────────┼──────────────────┼──────────┼──────────────────────────────────────────────────
org-1  | proj_alpha | method-uuid-001  | 2        | {
       |            |                  |          |   "tr-uuid-2": {
       |            |                  |          |     "cond-1": { "temp": "31" }
       |            |                  |          |   }
       |            |                  |          | }

※ task_number=1,2 には上書き分のみ格納。
  フロントエンドは「全体タブ(task=0) + タスクN上書き(task=N)」をマージして表示する。
```

### 7-2. template_data（実績値）

```
org_id | project_id | method_id        | task_number | template_id | property_set
───────┼────────────┼──────────────────┼─────────────┼─────────────┼─────────────────────────
org-1  | proj_alpha | method-uuid-001  | 1           | cond-1      | {"temp": "26.5", "pres": "1.0"}
org-1  | proj_alpha | method-uuid-001  | 2           | cond-1      | {"temp": "30.1", "pres": "1.6"}
```

### 7-3. 実験指示一覧レスポンス（結合後）

```
タスク1:
  temperature: 想定値=25  実績値=26.5  差分=+1.5  ⚠️差分あり
  pressure:    想定値=1.0 実績値=1.0   差分=0     ✅一致

タスク2:
  temperature: 想定値=30  実績値=30.1  差分=+0.1  ✅許容範囲内
  pressure:    想定値=1.5 実績値=1.6   差分=+0.1  ⚠️差分あり
```

---

## 8. エラーハンドリングフロー

### 8-1. MAIML書き込み失敗（チェックアウト時）

```
checkoutProject()
  │
  ├── experiment_plan 取得 ─── 失敗 → E4002（DB Error）でチェックアウト中断
  │
  ├── MAIML取得 ──────────── 失敗 → E4006（Storage Error）でチェックアウト中断
  │
  ├── MAIML書き込み ──────── 失敗 → E4006（Storage Error）でチェックアウト中断
  │
  └── 更新MAIML保存 ──────── 失敗 → E4006（Storage Error）でチェックアウト中断
                                      ※ DBトランザクションはロールバック
```

### 8-2. 想定値保存後のチェックアウト済み変更試行

```
PUT /experiment-plans/:methodId/:taskNumber
  │
  ├── project.status を確認
  │     │
  │     └── チェックアウト済み → E7005 を返す（変更不可）
  │
  └── チェックアウト前 → UPSERT 実行
```
