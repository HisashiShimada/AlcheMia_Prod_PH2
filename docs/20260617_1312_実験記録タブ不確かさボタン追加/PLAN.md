# タスク計画書: 実験記録タブ 不確かさ選択ボタン追加

## メタデータ
- **作成日時**: 2026-06-17 13:12
- **タスクID**: 実験記録タブ不確かさボタン追加
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

実験作業者メニュー内の実験記録タブ内の各 property / content カードに不確かさ選択ボタンを追加する。
ボタン押下すると、既存の `UncertaintyCriteriaSelectorModal` が開くようにする。

## 目的と期待される成果

- [ ] WorkRecordPanel の PropertyCard に「📐 不確かさ」ボタンが表示される
- [ ] ボタン押下で UncertaintyCriteriaSelectorModal が開く
- [ ] モーダル内の TargetProperty に該当 property の情報（型・値・単位・セクション等）が正しく設定される

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN.md 作成

### Phase 2: WorkRecordPanel.tsx 修正
- [ ] `UncertaintyCriteriaSelectorModal` を import 追加
- [ ] `PropertyCard` の props に `section` / `onUncertaintyClick` を追加
- [ ] `PropertyCard` の実績値エリア下部に「📐 不確かさ」ボタンを追加
- [ ] `PropertyList` にモーダル状態管理ステートを追加
- [ ] `PropertyList` にボタンクリックハンドラ（`TargetProperty` 構築）を追加
- [ ] `PropertyList` に `UncertaintyCriteriaSelectorModal` をレンダリング追加
- [ ] `PropertyList` の呼び出し元（`PlanA` / `PlanB`）に `section` 情報を渡す

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - 主要変更

## 技術的詳細

### TargetProperty 構築ロジック

```typescript
{
  name: `${prop.label} (${prop.key})`,
  xpath: `//transition[@id="${transitionId}"]//property[@key="${prop.key}"]`,
  tag: 'property',
  type: XSI_TO_TYPE[prop.xsiType],  // FloatValue → "Float" 等
  value: String(actual ?? ''),
  unit: prop.unit || '—',
  section: CATEGORY_TO_SECTION[template.category],  // Conditions → "condition" 等
}
```

### XSI_TO_TYPE マッピング

```typescript
const XSI_TO_TYPE: Record<string, string> = {
  FloatValue:   'Float',
  IntegerValue: 'Integer',
  StringValue:  'String',
};
```

### CATEGORY_TO_SECTION マッピング（既存と同一）

```typescript
const CATEGORY_TO_SECTION: Record<string, 'material' | 'condition' | 'result'> = {
  Materials:  'material',
  Conditions: 'condition',
  Results:    'result',
};
```

## 承認記録
- **承認日時**: 2026-06-17 13:12
