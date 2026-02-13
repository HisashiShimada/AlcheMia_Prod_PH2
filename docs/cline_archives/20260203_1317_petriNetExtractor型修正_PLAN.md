# petriNetExtractor.ts 型修正計画書

## メタデータ
- **作成日時**: 2026-02-03 13:17
- **タスクID**: petriNetExtractor型修正
- **優先度**: 高
- **推定工数**: 10分

---

## 1. 問題の特定

### 1.1 現状の問題

petriNetExtractor.tsは、`@/components/editorv2/types`から型をインポートしていますが、これらの型はエディタ専用の型であり、XSD準拠型とは異なります。

**現在のインポート**:
```typescript
import type {
  PetriNetExtractResult,
  Place,
  Transition,
  Arc,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  Property,
  TemplateItem,
  PropertyItem,
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/components/editorv2/types';
```

### 1.2 問題点の詳細

**問題1**: `Place`, `Transition`, `Arc`型
- エディタ型を使用しているが、XSD準拠型を使用すべき
- エディタ型は`data`プロパティを持つReactFlow用の構造

**問題2**: `TemplateItem`, `PropertyItem`型
- editorv2/types/index.tsで定義されているが、これらはXSD準拠型のエイリアスまたは拡張型
- 直接XSD準拠型（MaterialTemplate、ConditionTemplate、ResultTemplate、Property）を使用すべき

**問題3**: 型の混在
- XSD準拠型とエディタ型が混在し、型変換が不明確
- Phase 6の設計原則「基本はXSD準拠型をそのまま使う」に反している

---

## 2. 修正方針

### 2.1 基本方針

**Phase 6設計原則に従う**:
1. 基本はXSD準拠型（maiml-unified.ts）を使用
2. エディタ固有の追加情報が必要な場合のみ、エディタ型を使用
3. 型変換を最小限に抑える

### 2.2 型の使い分け

**XSD準拠型を使用**:
- MaterialTemplate, ConditionTemplate, ResultTemplate
- Property
- Method
- Maiml Document構造全般

**エディタ型を使用**:
- ReactFlow用のノード/エッジ（PlaceNode, TransitionNode, Edge）
- エディタ専用の型（PetriNetExtractResult等）

**混在を避ける**:
- TemplateItem → MaterialTemplate | ConditionTemplate | ResultTemplate
- PropertyItem → Property
- Place (エディタ型) → XSD型は使わない（エディタ型のみ使用）

---

## 3. 修正内容

### 3.1 インポートの修正

**Before**:
```typescript
import type {
  PetriNetExtractResult,
  Place,
  Transition,
  Arc,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  Property,
  TemplateItem,
  PropertyItem,
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/components/editorv2/types';
```

**After**:
```typescript
// XSD準拠型（maiml-unified.ts）
import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Property
} from '@/types/maiml-unified';

// エディタ型（editorv2/types）
import type {
  PetriNetExtractResult,
  Place,
  Transition,
  Arc,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/components/editorv2/types';
```

**変更点**:
- `Property`をXSD準拠型からインポート（エディタ型と同じなので、どちらでも可）
- `TemplateItem`を削除 → `MaterialTemplate | ConditionTemplate | ResultTemplate`を使用
- `PropertyItem`を削除 → `Property`を使用

### 3.2 型使用箇所の修正

#### 修正1: buildTemplateMap関数

**Before**:
```typescript
templates.materials.forEach((t: TemplateItem) => {
  // ...
});
```

**After**:
```typescript
templates.materials.forEach((t: MaterialTemplate) => {
  // ...
});
```

同様に、`conditions`と`results`も修正。

#### 修正2: 変数型アノテーション

**Before**:
```typescript
const templates = parser.getTemplates();
// templatesの型が不明確
```

**After**:
```typescript
const templates: {
  materials: MaterialTemplate[];
  conditions: ConditionTemplate[];
  results: ResultTemplate[];
} = parser.getTemplates();
```

---

## 4. 実装手順

### Step 1: インポートの修正

1. XSD準拠型（MaterialTemplate等）をmaiml-unified.tsからインポート
2. TemplateItem、PropertyItemの削除

### Step 2: 型アノテーションの修正

1. `TemplateItem` → `MaterialTemplate | ConditionTemplate | ResultTemplate`
2. `PropertyItem` → `Property`（既にXSD準拠型と同じ）

### Step 3: TypeScript型チェック

```bash
cd frontend && npx tsc --noEmit
```

### Step 4: 完了報告書作成

---

## 5. 期待効果

### 5.1 型の一貫性

**Before**:
- エディタ型とXSD準拠型が混在
- 型変換が不明確

**After**:
- XSD準拠型を基本として使用
- 型変換が明確

### 5.2 保守性の向上

- XSD準拠型を直接使用することで、XSD更新時の影響が明確
- エディタ型とXSD準拠型の責任分離が明確

### 5.3 コードの削減

- TemplateItem型の削除（エイリアスとして使用）
- PropertyItem型の削除（Property使用）

---

## 6. リスクと対策

### 6.1 既存コードへの影響

**リスク**: 他のファイルでTemplateItemを使用している可能性

**対策**:
- TypeScript型チェックで全エラーを確認
- エラーが出た場合、型定義を修正

### 6.2 実行時エラー

**リスク**: 型構造の違いによる実行時エラー

**対策**:
- MaterialTemplate等は既にTemplateItemとほぼ同じ構造
- PropertyはXSD準拠型とeditorv2/typesで同じ定義

---

## 7. 参考資料

- [Phase 6: 型変換最適化総括報告書](./Phase6_型変換最適化_総括報告書.md)
- [Phase 6-1: 型使用状況調査報告書](./Phase6-1_型使用状況調査_報告書.md)
- [maiml-unified.ts](../frontend/src/types/maiml-unified.ts) - XSD準拠型定義
- [editorv2/types/index.ts](../frontend/src/components/editorv2/types/index.ts) - エディタ型定義

---

**作成日時**: 2026-02-03 13:17  
**作成者**: Cline  
**次のアクション**: Step 1（インポートの修正）開始