# データフロー図

> 作成日: 2026-06-18

---

## 1. 全体ワークフロー

```
Manager                          System                          Worker
  |                                |                                |
  |-- 実験計画入力 --------------->|                                |
  |   ExperimentPlanDialog         |-- experiment_plan テーブル保存 |
  |                                |                                |
  |-- チェックアウト実行 --------->|                                |
  |                                |-- experiment_plan 取得         |
  |                                |-- MAIML に mgr-instruction:    |
  |                                |   プロパティ書き込み            |
  |                                |-- MAIMLをS3に保存              |
  |                                |                                |
  |                                |<--- タスク一覧取得 ------------|
  |                                |                                |
  |                                |--- 想定値付きタスク返却 ------->|
  |                                |                                |
  |                                |<--- 実験実施・実績値記録 -------|
  |                                |                                |
  |                                |--- transition_data 保存 ------->|
  |                                |   (task_status: 02→03)         |
  |                                |                                |
  |<-- 実験指示タブで確認 ---------|                                |
  |   想定値 vs 実績値 対比        |                                |
  |                                |                                |
  |-- 承認/NG操作 ---------------->|                                |
  |                                |-- task_status 更新 (05/06)     |
  |                                |-- review_result 保存           |
```

---

## 2. ExperimentPlanDialog データフロー

```
[ダイアログオープン]
        |
        v
GET /plan-dialog-data
  ├── tasks (プロジェクトのタスク一覧)
  ├── templates (メソッドのテンプレート定義)
  └── existingPlans (保存済み実験計画)
        |
        v
[各タブのstateに復元]
  ├── tabData['all'] ← taskNumber=0 のレコード
  ├── tabData['task-1'] ← taskNumber=1 のレコード
  └── tabData['task-N'] ← taskNumber=N のレコード
        |
        v
[ユーザー編集]
  └── 全体タブ変更 → overrideFlags未設定のタスクNに継承
        |
        v
[保存ボタン押下]
        |
        v
PUT /experiment-plans/:methodId/0  (全体タブ)
PUT /experiment-plans/:methodId/1  (タスク1)
PUT /experiment-plans/:methodId/N  (タスクN)
  └── 全成功後 → ダイアログを閉じる
```

---

## 3. チェックアウト時のMAIML書き込みフロー

```
[チェックアウト実行]
        |
        v
experiment_plan テーブルから
  project の全タスク分データ取得
        |
        v
for each task:
  for each templateId in template_values:
    for each fieldKey in template_values[templateId]:
      MAIMLのData層を検索
        └── property key="${fieldKey}" を持つ要素を検索
              |
              v
      存在する場合:
        └── property key="mgr-instruction:${fieldKey}" を追加
              value = template_values[templateId][fieldKey]
        |
        v
書き込み失敗時:
  └── warnログ記録（チェックアウト処理はブロックしない）
        |
        v
更新済みMAIMLをS3に保存
```

**MAIML変換例**:
```xml
<!-- チェックアウト前 -->
<property key="temperature">
  <content xsi:type="floatType" units="°C"></content>
</property>

<!-- チェックアウト後（mgr-instruction: プロパティが追加される） -->
<property key="temperature">
  <content xsi:type="floatType" units="°C"></content>
</property>
<property key="mgr-instruction:temperature">
  <content xsi:type="floatType" units="°C">25</content>
</property>
```

---

## 4. WorkRecordPanel データフロー（Worker視点）

```
[作業記録タブを開く]
        |
        v
GET /progress/projects/:name/worker-tasks
  └── prerequisite_transition_ids 含む全トランジション取得
        |
        v
[トランジション選択]
        |
        v
transition.properties から
  mgr-instruction:xxx プロパティを抽出
  └── 想定値としてフォームに表示
        |
        v
[Worker が実績値を入力]
  └── 各フィールドに実績値を入力
        |
        v
[保存ボタン押下]
        |
        v
PATCH /progress/.../status
  ├── task_status 更新
  └── 実績値（transition_data）保存
```

---

## 5. 依存関係チェック（スキップ機能）フロー

```
ProgressOverviewTab: タスク一覧表示
        |
        v
各トランジションの prerequisite_transition_ids を確認
        |
        ├── prerequisite_transition_ids が空
        │     └── 通常の「作業へ」ボタン表示
        │
        └── prerequisite_transition_ids に未完了タスクが含まれる
              └── 「スキップ」ボタンを追加表示
                    |
                    v
              [スキップ確認ダイアログ]
              「前提タスクXXXが未完了ですが
                このタスクをスキップしますか？」
                    |
                    v
              PATCH ステータスを「スキップ」に更新
```

---

## 6. テーブル関連図

```
organization
    │
    ├── experiment_plan (organization_id, project_id, method_id, task_number)
    │     └── template_values: {templateId: {fieldKey: value}}  [JSONB]
    │     └── notes: [{id, content, important}]                 [JSONB]
    │
    ├── project
    │     └── project_task_detail
    │           └── task_status: 01〜06
    │           └── review_result: TEXT  [NEW]
    │           └── reviewed_by: UUID    [NEW]
    │
    └── transition_data
          └── prerequisite_transition_ids: UUID[]  [NEW - 適用済み]
```
