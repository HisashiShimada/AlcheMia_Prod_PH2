# タスク計画書: planned_values の想定値・mgr-instruction・不確かさを MAIML に書き込む修正

## メタデータ
- **作成日時**: 2026-08-04 08:20
- **タスクID**: planned_values_MAIML書き込み修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

チェックアウト時に `writeExperimentPlanProperties()` が実行されるが、
`experiment_plan.planned_values` に保存されたプロパティ想定値・`mgr-instruction:*` 値・不確かさが
MAIML ファイルの `<data>` 層に正しく書き込まれていない。

## 問題の詳細と根本原因

### 問題1: `<data>` 層の `<property>` に `<value>` タグが出力されない（プロパティ想定値）

**フロントエンド保存時のキー形式**:
- `TemplateInputPanel` で `valueKey = \`${selectedTemplate.id}_${field.key}\``
- 例: `"conditionTemplate_1782799928519_condition1"`

**バックエンドの `updatePropertySetByPlan` のキー照合**:
- `compositeKey = \`${templateId}_${prop.key}\``
- `templateId` は `template_data.property_set.templateId` = MAIML の `template.id`

両者が一致すれば `compositeKey` でマッチするが、一致しない場合は値が更新されず、
`prop['value']` が `null` のまま → `buildPropertyXML` が `<value>` タグを出力しない。

**追加対応**: `planValues` キーのサフィックスマッチング（`_{prop.key}` で終わるキーを検索）で
両形式の不一致を吸収するフォールバックを追加する。

### 問題2: `mgr-instruction:*` 値が MAIML に書き込まれていない

前タスク（20260803_1600）で `_injectExperimentPlanProps()` の呼び出しは追加済みだが、
`plan.method_id` の形式（MAIML のメソッドID）と `_injectExperimentPlanProps` が検索する
`taskNo` ゼロ埋め形式が合っているか確認が必要。

### 問題3: 不確かさが `<uncertainty>` タグとして出力されない

`updatePropertySetByPlanWithUncertainty` のキー照合も問題1と同様の原因で失敗している可能性。

## 修正方針

### 修正1: `updatePropertySetByPlan` にサフィックスマッチングを追加

`planValues` を全キースキャンして `_{prop.key}` で終わるキーを見つけるフォールバックを追加:

```typescript
// 既存: simpleKey / compositeKey の2形式
const newValue =
  planValues[simpleKey] ??
  (compositeKey !== undefined ? planValues[compositeKey] : undefined) ??
  // フォールバック: _{prop.key} サフィックスマッチ
  Object.entries(planValues).find(([k]) => k.endsWith(`_${simpleKey}`))?.[1];
```

### 修正2: `updatePropertySetByPlanWithUncertainty` に同様のサフィックスマッチングを追加

### 修正3: `writeExperimentPlanProperties` にデバッグログを追加

`planFlatValues` の内容と `updatePropertySetByPlan` の更新件数をログ出力して問題を追跡しやすくする。

## 変更ファイル

1. `backend/src/repositories/templateDataRepository.ts`
   - `updatePropertySetByPlan`: サフィックスマッチングのフォールバック追加
   - `updatePropertySetByPlanWithUncertainty`: 同上
2. `backend/src/services/maimlWriterService.ts`
   - `writeExperimentPlanProperties`: デバッグログ追加

## 実装ステップ

- [x] 調査完了
- [x] 根本原因特定: `typeof value === 'string'` が `intType`/`floatType` 等の数値を弾いていた
- [x] `maimlWriterService.ts` 修正: `typeof value === 'number'` も許容するよう変更・`String(value)` で文字列変換
- [x] `maimlWriterService.ts` デバッグログ追加
- [x] TypeScript コンパイル確認（エラーなし）
- [ ] 動作確認（実機テスト）

## 承認記録
- **計画書提示日時**: 2026-08-04 08:20
- **承認**: 「実装をお願いします」により承認済み
