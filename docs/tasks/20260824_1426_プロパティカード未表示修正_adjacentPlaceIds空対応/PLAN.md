# タスク計画書: プロパティカード未表示修正（adjacentPlaceIds 空対応）

## メタデータ
- **作成日時**: 2026-08-24 14:26
- **タスクID**: プロパティカード未表示修正_adjacentPlaceIds空対応
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験記録タブでプロパティカードが表示されない問題を修正する。

## 原因

`experimentDataService.getTemplateData` の `adjacentPlaceIds` 計算ロジックで、
MAIML の `arcs` に指定の `transitionId` が含まれない場合に `adjacentPlaceIds` が空配列になり、
`buildFallbackTemplates` がプレース一致なしで空を返し、`templates` が空になる。

フロントエンドの `buildTransitions` では
```typescript
.filter((tpl) => tpl.properties.length > 0)
```
でプロパティ空テンプレートを除外するため、結果的に `apiTransitions` が空になり
「作業中のトランジションがありません。」が表示される。

## 根本原因の詳細

`getTemplateData`（experimentDataService.ts 行272〜292）:
```typescript
// arcs から隣接プレースID を特定
for (const arc of pnmlArcs) {
  if (arc.source === transitionId ...) adjacentPlaceIds.push(arc.target)
  else if (arc.target === transitionId ...) adjacentPlaceIds.push(arc.source)
}
// adjacentPlaceIds が空の場合、buildFallbackTemplates も空を返す
const fallbackAll = buildFallbackTemplates(parser, methodId, adjacentPlaceIds, uncertaintyDetailMap);
```

`buildFallbackTemplates`（行528〜583）:
```typescript
for (const placeRef of template.placeRefs) {
  if (!adjacentPlaceIds.includes(placeId)) continue;  // ← 空の場合は全スキップ
  fallbackTemplates.push(...)
}
```

## 修正方針

`adjacentPlaceIds` が空の場合は **全プレース** を対象にする。
つまり `buildFallbackTemplates` 呼び出し時、`adjacentPlaceIds` が空なら
フィルタなし（全 placeRef を対象）でテンプレートを返すよう修正する。

### 修正箇所

#### `backend/src/services/experimentDataService.ts`

`buildFallbackTemplates` 関数の `adjacentPlaceIds` フィルタを修正：

```typescript
// 変更前
if (!adjacentPlaceIds.includes(placeId)) continue;

// 変更後
// adjacentPlaceIds が空の場合はフィルタなし（全プレースを対象）
if (adjacentPlaceIds.length > 0 && !adjacentPlaceIds.includes(placeId)) continue;
```

また `getTemplateData` 関数でも `adjacentPlaceIds` が空の場合に templates マッピングをスキップしないよう修正：

```typescript
// 変更前（行308）
const templates: TemplateDataItem[] = adjacentPlaceIds.map(placeId => { ... })

// 変更後
// adjacentPlaceIds が空の場合は fallbackAll を直接使用する
const templates: TemplateDataItem[] = adjacentPlaceIds.length > 0
  ? adjacentPlaceIds.map(placeId => { ... })
  : fallbackAll;
```

## 変更ファイル
1. `backend/src/services/experimentDataService.ts` - adjacentPlaceIds 空対応の修正

## 実装ステップ
- [x] タスク計画書作成
- [ ] experimentDataService.ts の buildFallbackTemplates を修正
- [ ] experimentDataService.ts の getTemplateData のテンプレートマッピングを修正

## 承認記録
- **承認日時**: 2026-08-24 14:26（自動承認・バグ修正）
