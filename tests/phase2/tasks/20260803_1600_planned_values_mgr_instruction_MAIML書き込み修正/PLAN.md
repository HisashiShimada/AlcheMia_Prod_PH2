# タスク計画書: planned_values の mgr-instruction・不確かさをMAIMLに書き込む修正

## メタデータ
- **作成日時**: 2026-08-03 16:10
- **タスクID**: planned_values_mgr_instruction_MAIML書き込み修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

チェックアウト時に `writeExperimentPlanProperties()` が呼ばれる際、
`experiment_plan.planned_values` に保存された `mgr-instruction:*` 値と
不確かさ情報が MAIML ファイルに正しく書き込まれていないバグを修正する。

## 問題の詳細

### 問題1: `mgr-instruction:*` 値が MAIML に書き込まれない

`writeExperimentPlanProperties()` 内で以下の処理が**欠落**している：

```typescript
// _injectExperimentPlanProps() は実装済みだが、
// writeExperimentPlanProperties() から一度も呼ばれていない
```

- `planned_values` に含まれる `mgr-instruction:caution` などの文字列値は  
  `planFlatValues` に集約されるが、`updatePropertySetByPlan()` は  
  `template_data.property_set` の property キーと照合するため、  
  `mgr-instruction:*` キーには一致するプロパティが存在せず **何も更新されない**
- `mgr-instruction:requiredCreatorUUID` などの **配列値** は  
  `typeof value === 'string'` の条件でスキップされ、そもそも収集されない
- `_injectExperimentPlanProps()` が呼ばれないため  
  MAIML の `<task><properties>` セクションへの書き込みが行われない

### 問題2: 不確かさの書き込み（既存処理の確認）

- `planFlatUncertainties` の収集と `updatePropertySetByPlanWithUncertainty()` の呼び出しは実装済み
- template_data の property_set の uncertainties フィールドには反映されているはず
- `buildDataXML()` が uncertainties を `<property>` に変換しているかは別途確認済みとする

## 修正方針

`writeExperimentPlanProperties()` に以下を追加する：

1. **`mgr-instruction:*` 値の収集ロジック追加**  
   各トランジションの fieldKey が `mgr-instruction:` で始まる値を  
   文字列・配列問わず `planMgrInstructionValues` に集約する

2. **`_injectExperimentPlanProps()` の呼び出しを追加**  
   `_replaceDataSection()` 実行後に、各 plan の task_no × method_id に対して  
   `_injectExperimentPlanProps()` を呼び出す

3. **配列値の処理**  
   配列値は `JSON.stringify()` で文字列化して property の value 属性に格納する

## 変更ファイル

1. `backend/src/services/maimlWriterService.ts` - `writeExperimentPlanProperties()` の修正

## 実装ステップ

- [x] `writeExperimentPlanProperties()` のループ内で `mgr-instruction:*` 値を収集
- [x] `_replaceDataSection()` 後に各 plan に対して `_injectExperimentPlanProps()` を呼び出す
- [x] `_injectExperimentPlanProps()` の配列値対応（JSON.stringify）

## 承認記録
- **計画書提示日時**: 2026-08-03 16:10

## 実施記録

### 実施日時
開始: 2026-08-03 16:10
完了: 2026-08-03 16:13

### 変更内容サマリー
`backend/src/services/maimlWriterService.ts` の `writeExperimentPlanProperties()` を修正:

1. **`mgr-instruction:*` 値の収集を追加**（L419-443）
   - `planMgrInstructionValues` マップを新設
   - `fieldKey.startsWith('mgr-instruction:')` で判定して収集（文字列・配列問わず）
   - トランザクションブロック内で `mgrInstructionValuesMap` に保持

2. **`_injectExperimentPlanProps()` の呼び出しを追加**（L549-580）
   - `_replaceDataSection()` 直後にループで各 plan を処理
   - 配列値は `JSON.stringify()` で文字列化
   - キーから `mgr-instruction:` プレフィックスを除去して渡す（メソッド内で再付与するため）
