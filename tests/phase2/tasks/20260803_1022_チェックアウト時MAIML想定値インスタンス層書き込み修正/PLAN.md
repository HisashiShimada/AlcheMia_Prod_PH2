# タスク計画書: チェックアウト時MAIML想定値インスタンス層書き込み修正

## メタデータ
- **作成日時**: 2026-08-03 10:22
- **タスクID**: checkout-maiml-instance-layer-write-fix
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

チェックアウトボタン押下時に `experiment_plan.planned_values` の値をMAIMLファイルの
**インスタンス層（`<data>/<results>/<condition|result>/<property>`）** に書き込む必要があるが、
現状は **プロトコル層（`<task>/<properties>`）** に書き込んでいるため修正する。

## 差異サマリ

| 項目 | 現状 | 仕様 |
|------|------|------|
| 書き込み先 | `<task taskNo="001"><properties>` | `<data><results><condition>` |
| 属性形式 | `<property key="..." value="..."/>` | `<property key="..."><value>...</value></property>` |
| units / xsi:type | なし | あり |
| 不確かさ基準 | なし | `<uncertainty>` 子要素として含める |

## 目的と期待される成果

- [x] 調査・分析完了（仕様との差異を特定）
- [ ] チェックアウト時に `experiment_plan.planned_values` の値がMAIMLのインスタンス層（`<data>/<results>/<condition>` 配下）に書き込まれること
- [ ] `<property>` の形式が子要素型（`<value>...</value>`）になること
- [ ] `units` / `xsi:type` 属性が付与されること（`planned_values` に存在する場合）
- [ ] 不確かさ基準が `<uncertainty>` 子要素として書き込まれること（`planned_values` に存在する場合）

## 書き込み先 MAIML 構造（仕様）

```xml
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_{methodId}_{taskNo}">
    <uuid>...</uuid>
    <condition id="{placeId}" ref="{templateId}">
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

## `planned_values` の JSON 構造

`experiment_plan.planned_values` は以下の構造を持つ：

```json
{
  "__meta__": {
    "transitionOrder": [ { "id": "...", "order": 1, "prerequisiteTransitionIds": [] } ]
  },
  "{templateId}_{fieldKey}": {
    "value": "実験値",
    "units": "mm",
    "xsiType": "doubleType",
    "uncertainties": [
      {
        "key": "uncertainty_key",
        "xsiType": "doubleType",
        "units": "mm",
        "value": "0.1",
        "description": "不確かさの説明"
      }
    ]
  }
}
```

## 実装ステップ

### Phase 1: `planned_values` 構造の確認（確認済み）
- [x] `experiment_plan.planned_values` の JSON 構造を確認
- [x] `template_data.property_set` の構造を確認

### Phase 2: `maimlWriterService.ts` の修正
- [ ] `writeExperimentPlanProperties()` を修正
  - `planned_values` を `template_data` の `property_set.properties[].value` に反映するロジックを追加
  - `buildDataXML()` を呼び出してインスタンス層 XML を生成
  - `replaceDataAndEventLogInMaiml()` の data 部分のみを更新（または専用関数を追加）
- [ ] `_injectExperimentPlanProps()` の処理をインスタンス層対応に変更（またはメソッド削除）

### Phase 3: `maimlDataWriter.ts` の修正（必要に応じて）
- [ ] `buildDataXML()` に `planned_values` の値を注入する仕組みを追加
  - `property_set.properties[].value` を上書きする形で対応
  - 不確かさ基準（`uncertainties`）を `<uncertainty>` タグとして出力

### Phase 4: 動作確認
- [ ] チェックアウト後の MAIML ファイルに `<data>/<results>/<condition>/<property key="mgr-instruction:...">` が生成されていること
- [ ] `<value>` 子要素として値が書き込まれていること
- [ ] 不確かさ基準が `<uncertainty>` 子要素として書き込まれていること

## 変更ファイル

1. `backend/src/services/maimlWriterService.ts` - `writeExperimentPlanProperties()` の修正（メイン変更）
2. `backend/src/utils/maimlDataWriter.ts` - 必要に応じて `buildDataXML()` を拡張

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `planned_values` のフィールドキーと `template_data.property_set` のキーが一致しない | 高 | 中 | キーのマッピング方式を確認・統一する |
| チェックアウト時点で `template_data` が空の場合に `buildDataXML()` が空 `<data>` を出力する | 中 | 中 | `template_data` にデータがあることを確認してから呼び出す |
| 既存の `<data>` を丸ごと置き換えることで他データが消えるリスク | 高 | 低 | チェックアウト時は template_data を書き込み後に `buildDataXML()` を呼び出すため問題なし |

## 承認記録
- **計画書提示日時**: 2026-08-03 10:22
