# タスク計画書: 定量評価 judgeMap の templateId/placeId 不整合修正

## メタデータ

- **作成日時**: 2026-09-29 10:00
- **タスクID**: 20260929_1000_定量評価judgeMap_templateId_placeId不整合修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. 問題の詳細調査結果

### 1-1. データフロー全体図

MAIMLファイルには2種類のIDが存在する:
- `placeId`: MAIMLの `<place id="PLC_001">` の id
- `templateId`: MAIMLの `<template id="TMpl_01">` の id

DBでの格納状況:
- `template_data.place_id` = placeId（"PLC_001"）
- `template_data.property_set->>'templateId'` = templateId（"TMpl_01"）
- `experiment_uncertainty_judge.template_id` = MAIMLのtemplate.id（"TMpl_01"）が正しい仕様

### 1-2. バグの根本原因

**WorkTemplate.id = placeId で構築されている（L2464）:**
```typescript
return {
  id: String(item.placeId || `tpl-${row.transitionId}-${_tplIdx}`),
  ...
};
```

**PropertyCard → onUncertaintyValuesChange で template.id（=placeId）を渡す（L858）:**
```typescript
onUncertaintyValuesChange={(entries) => {
  onUncertaintyValuesChange?.(template.id, entries); // template.id = placeId
}}
```

**uncertaintyValuesRef のキーが placeId ベースになる（L3701）:**
```typescript
const refKey = `${placeId}__${propKey}`; // "PLC_001__propA"
uncertaintyValuesRef.current.set(refKey, entries);
```

**handleSave でキーの先頭部分を templateId として送信（L3135）:**
```typescript
const templateId = key.split('__')[0]; // "PLC_001"（= placeId）が templateId として送信
```

**結果: experiment_uncertainty_judge.template_id に placeId が INSERT される**

**experimentInstructionService.ts の judgeMap は templateId（MAIMLのtemplate.id）ベースなのでキーが一致せず、定量評価が常に空になる**

---

## 2. 修正方針

`WorkTemplate` に `templateId?` フィールドを追加し、
`onUncertaintyValuesChange` コールバックで `template.templateId ?? template.id` を渡すよう変更する。

- `WorkTemplate.id`（placeId）は変更しない → 他機能への影響なし
- `uncertaintyValuesRef` のキーが `${templateId}__${propKey}` になり正しくなる
- `handleSave` の `key.split('__')[0]` が正しい templateId を返すようになる

---

## 3. 変更ファイルと変更内容

### ファイル: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

#### 変更A: WorkTemplate インターフェースへの templateId フィールド追加（L204-211）

```typescript
interface WorkTemplate {
  id: string;           // placeId（template_data.place_id）
  templateId?: string;  // MAIMLのtemplate.id（新規追加）
  name: string;
  category: 'Conditions' | 'Materials' | 'Results';
  properties: WorkProperty[];
  insertions?: WorkInsertionSlot[];
}
```

#### 変更B: WorkTemplate 構築時の templateId 設定（L2463-2470 付近）

```typescript
return {
  id: String(item.placeId || `tpl-${row.transitionId}-${_tplIdx}`),
  templateId: item.templateId,   // 新規追加
  name: String(item.data.templateName ?? ...),
  category,
  properties,
};
```

#### 変更C: PropertyList の onUncertaintyValuesChange 呼び出し変更（L858-859）

```typescript
// 変更前
onUncertaintyValuesChange?.(template.id, entries);
// 変更後
onUncertaintyValuesChange?.(template.templateId ?? template.id, entries);
```

#### 変更D: DB初期化時の uncertaintyValuesRef キー変更（L2541 付近）

```typescript
// 変更前
const refKey = `${tpl.id}__${wp.key}`;
// 変更後
const refKey = `${tpl.templateId ?? tpl.id}__${wp.key}`;
```

#### 変更E: onGetInitialUncertaintyValues の呼び出しキー変更（L844 付近）

```typescript
// 変更前
const initialUncValues = onGetInitialUncertaintyValues?.(template.id, prop.key) ?? [];
// 変更後
const initialUncValues = onGetInitialUncertaintyValues?.(template.templateId ?? template.id, prop.key) ?? [];
```

### ファイル: `docs/tasks/.../fix_uncertainty_judge_template_id.sql` （新規作成）

既存の誤データ（template_id に placeId が入っているレコード）を修正するSQL:

```sql
UPDATE experiment_uncertainty_judge euj
SET template_id = (
  SELECT (td.property_set->>'templateId')
  FROM template_data td
  WHERE td.organization_id = euj.organization_id
    AND td.project_id       = euj.project_id
    AND td.method_id        = euj.method_id
    AND td.task_no          = euj.task_no
    AND td.place_id         = euj.template_id
    AND (td.property_set->>'templateId') IS NOT NULL
    AND (td.property_set->>'templateId') <> ''
)
WHERE EXISTS (
  SELECT 1 FROM template_data td
  WHERE td.organization_id = euj.organization_id
    AND td.project_id       = euj.project_id
    AND td.method_id        = euj.method_id
    AND td.task_no          = euj.task_no
    AND td.place_id         = euj.template_id
);
```

---

## 4. 実装ステップ（チェックリスト）

- [x] STEP 1: `WorkTemplate` インターフェースに `templateId?: string` を追加
- [x] STEP 2: `templatesMap` 構築時に `templateId: item.templateId` を設定
- [x] STEP 3: `PropertyList` の `onUncertaintyValuesChange` 呼び出しを `template.templateId ?? template.id` に変更
- [x] STEP 4: DB初期化時の `uncertaintyValuesRef` キーを `${tpl.templateId ?? tpl.id}__${wp.key}` に変更
- [x] STEP 5: `onGetInitialUncertaintyValues` 呼び出しのキーを `template.templateId ?? template.id` に変更
- [x] STEP 6: DBデータ修正SQL (`fix_uncertainty_judge_template_id.sql`) を作成
- [x] STEP 7: `npx tsc --noEmit` で TypeScript エラーがないことを確認（WorkRecordPanel.tsx 関連エラー 0件）

---

## 5. 影響範囲分析

| 対象 | 影響 |
|---|---|
| 定量評価の保存（handleSave） | 修正対象: 正しい templateId で送信されるようになる |
| 定量評価の初期値復元（DB → Ref） | 修正対象: 正しいキーで格納・復元できるようになる |
| 定性評価（confidenceValuesRef） | 影響なし（別の Ref・別コールバックで管理） |
| WorkTemplate.id（placeId） | 変更なし |
| バックエンド全ファイル | 変更不要（judgeMap のキーは既に正しい templateId ベース） |

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `item.templateId` が空の場合 | 低 | `template.templateId ?? template.id` のフォールバックで従来動作を維持 |
| 既存の誤DBデータが残る | 中 | migration SQL を適用することで修正可能 |
| TypeScript コンパイルエラー | 低 | `templateId?: string`（オプショナル）で後方互換 |

---

## 7. テスト計画

- [ ] WorkRecordPanel で定量評価値を入力・保存する
- [ ] 実験指示タブで定量評価欄に判定結果が表示されることを確認
- [ ] テンプレート切り替え後も定量評価入力値が保持されることを確認
- [ ] `npx tsc --noEmit` がエラーなしで通ること

---

## 8. 変更ファイル一覧

| No | ファイルパス | 変更内容 |
|----|---|---|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | WorkTemplate にtemplate追加、コールバック呼び出し・キー変更（5箇所） |
| 2 | `docs/tasks/20260929_1000_.../fix_uncertainty_judge_template_id.sql` | 既存DBデータ修正SQL（新規作成） |

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-29 10:00
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）
