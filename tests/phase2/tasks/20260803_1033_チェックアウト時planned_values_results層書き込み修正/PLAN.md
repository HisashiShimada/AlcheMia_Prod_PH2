# タスク計画書: チェックアウト時 planned_values → results 層書き込み修正

## メタデータ
- **作成日時**: 2026-08-03 11:14
- **タスクID**: checkout-planned-values-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

チェックアウト時に `experiment_plan.planned_values` の値が MaiML ファイルの `<data><results>` 配下に書き込まれない不具合を修正する。

## 根本原因

`planned_values` の実際の構造（2層フラット）と、`maimlWriterService.ts` が期待する構造（3層ネスト）にミスマッチが存在する。

### 実際の構造（フロントエンドが保存する形式）
```json
{
  "transitionId1": {
    "mgr-instruction:caution": "注意テキスト",
    "fieldKey1": "値A"
  },
  "__meta__": { "transitionOrder": [...] }
}
```
→ `{ [transitionId]: { [fieldKey]: value } }` の **2層フラット**

### コードが期待している構造（誤り）
```typescript
// maimlWriterService.ts L412-431
for (const [transitionId, templateMap] of Object.entries(plannedValues)) {
  for (const [templateId, fieldMap] of Object.entries(templateMap)) {
    if (!fieldMap || typeof fieldMap !== 'object') continue; // ← 全スキップ
    for (const [fieldKey, value] of Object.entries(fieldMap)) { ... }
  }
}
```
→ `{ [transitionId]: { [templateId]: { [fieldKey]: value } } }` の **3層ネスト** を期待

### 結果として起きていること
- `fieldMap` が文字列 `"注意テキスト"` になり `typeof !== 'object'` で全件 `continue`
- `planValuesByTemplate` が常に空 → `updatePropertySetByPlan` が no-op
- `template_data.property_set` が更新されず
- `buildDataXML()` が空の `<data>` を生成

## 修正対象ファイル

| ファイル | 変更内容 |
|---|---|
| `backend/src/services/maimlWriterService.ts` | `planned_values` のパース処理を2層フラット構造に変更。JSDocコメントも修正。 |
| `backend/src/repositories/templateDataRepository.ts` | `updatePropertySetByPlan` の引数型を `Record<string, string>`（フラット）に変更し、templateId によるルックアップを削除。 |

## 実装ステップ
- [ ] `maimlWriterService.ts`: `writeExperimentPlanProperties` の planned_values パース処理を修正
- [ ] `templateDataRepository.ts`: `updatePropertySetByPlan` の引数型とロジックを修正

## 承認記録
- **承認日時**: 2026-08-03 11:14（調査後即実施）
