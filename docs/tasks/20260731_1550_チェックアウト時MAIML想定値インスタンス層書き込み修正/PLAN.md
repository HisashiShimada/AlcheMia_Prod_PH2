# タスク計画書: チェックアウト時MAIML想定値インスタンス層書き込み修正

## メタデータ
- **作成日時**: 2026-07-31 15:50
- **タスクID**: checkout-maiml-instance-layer-fix
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

チェックアウト時に `experiment_plan` テーブルの想定値（`mgr-instruction:`）と不確かさ基準を
MAIMLのインスタンス層（`<data>/<results>/<condition>/<property>`）に書き込む処理が
実装されていない。現状はプロトコル層（`<task>/<properties>`）に書き込んでいるため修正が必要。

## 目的と期待される成果

- [ ] チェックアウト時にMAIMLのインスタンス層（data層）に以下が書き込まれること
  - ①想定値: `<property key="mgr-instruction:xxx"><value>...</value></property>`
  - ②不確かさ基準: `<property>` 内の `<uncertainty>` 要素

## 書き込み先 MAIML 構造

```xml
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_{methodId}">
    <uuid>...</uuid>
    <condition id="{conditionId}_results" ref="{conditionId}">
      <uuid>...</uuid>
      <property key="mgr-instruction:{fieldKey}" units="{units}" xsi:type="{type}">
        <value>{plannedValue}</value>
        <uncertainty key="{uncertaintyKey}" xsi:type="{ucType}" units="{ucUnits}">
          <value>{ucValue}</value>
          <description>{ucDescription}</description>
        </uncertainty>
      </property>
    </condition>
  </results>
</data>
```

## 実装ステップ

### Phase 1: experiment_plan.planned_values の構造確認
- [ ] `experiment_plan.planned_values` の JSON 構造を確認
- [ ] 不確かさ基準データ（`uncertainty_criteria`）の取得方法を確認

### Phase 2: `writeExperimentPlanProperties()` の修正
- [ ] `maimlWriterService.ts` の `writeExperimentPlanProperties()` を修正
  - `experiment_plan` データ＋不確かさ基準データを元にインスタンス層XMLを生成
  - MAIMLの既存 `<data>` タグ内の `<results>` を更新（または新規作成）
- [ ] `_injectExperimentPlanProps()` をインスタンス層対応に変更（またはメソッド追加）

### Phase 3: 動作確認
- [ ] チェックアウト後のMAIMLファイルに `<results>` が生成されていることを確認
- [ ] `<property key="mgr-instruction:...">` と `<uncertainty>` が正しく書き込まれていることを確認

## 変更ファイル

1. `backend/src/services/maimlWriterService.ts` - `writeExperimentPlanProperties()` と `_injectExperimentPlanProps()` の修正

## 承認記録
- **計画書提示日時**: 2026-07-31 15:50
