# タスク計画書: petriNetExtractor.ts 型定義置き換え

## メタデータ
- **作成日時**: 2026-02-03 13:49
- **タスクID**: petriNetExtractor-type-replacement
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`frontend/src/utils/petriNetExtractor.ts` で使用している `components/editorv2/types` からの型定義を、統一された `types/maiml-unified` の型定義に置き換える。

## 2. 目的と期待される成果

### 目的
- 型定義の一元化により保守性を向上
- `types/maiml-unified` を唯一の型定義ソースとして確立
- `components/editorv2/types` への依存を排除

### 期待される成果
- [x] `petriNetExtractor.ts` が `types/maiml-unified` のみを使用
- [x] すべての型が正しくマッピングされる
- [x] 既存の機能が正常に動作する

## 3. 現状分析

### 現在のインポート状況

```typescript
// XSD準拠型（maiml-unified.ts）- 既に使用中
import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Property as XsdProperty
} from '@/types/maiml-unified';

// エディタ型（editorv2/types）- 置き換え対象
import type {
  PetriNetExtractResult,
  Place,
  Transition,
  Arc,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  Property,
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/components/editorv2/types';
```

### 使用されている型の詳細

#### editorv2/types からインポートしている型（11個）

1. **PetriNetExtractResult** - Petri Net抽出結果の型
2. **Place** - プレース（場所）を表す型
3. **Transition** - トランジション（遷移）を表す型
4. **Arc** - アーク（矢印）を表す型
5. **TemplateMapEntry** - テンプレートマップの要素型
6. **InsertionData** - ファイル挿入情報型
7. **NestedPropertyNode** - ネスト構造プロパティ型
8. **Property** - プロパティ型
9. **PlaceRefObject** - Place参照オブジェクト型
10. **TemplateRefObject** - Template参照オブジェクト型
11. **TransitionNode** - トランジションノード型

## 4. types/maiml-unifiedの対応型確認

### 🔍 重要な発見

実際のファイルを調査した結果、以下のことが判明しました：

1. **maiml-unified には基本的なMAIML型定義のみが存在**
   - `Property`, `MaterialTemplate`, `ConditionTemplate`, `ResultTemplate` など
   - XSD仕様に基づいた純粋なMAIML構造の型定義

2. **editorv2/types にはエディター特有の型が定義されている**
   - `PetriNetExtractResult`, `TemplateMapEntry`, `InsertionData` など
   - Petri Netエディターの内部データ構造やユーティリティの戻り値型

3. **結論: 単純な置き換えは不可能**
   - maiml-unifiedとeditorv2/typesは**異なる目的**の型定義
   - maiml-unified: XSD準拠のMAIML構造
   - editorv2/types: エディター実装のためのデータ構造

### 対応する型のマッピング

| editorv2/types | maiml-unified | 状態 | 備考 |
|----------------|---------------|------|------|
| Property | Property | ✅ 置き換え可能 | 基本的なProperty型 |
| Place | Place | ⚠️ 構造が異なる | editorv2版はdata.xxx形式 |
| Transition | Transition | ⚠️ 構造が異なる | editorv2版はdata.xxx形式 |
| Arc | Arc | ⚠️ 構造が異なる | 一部互換性あり |
| PetriNetExtractResult | - | ❌ 存在しない | エディター専用型 |
| TemplateMapEntry | - | ❌ 存在しない | エディター専用型 |
| InsertionData | Insertion | ⚠️ 構造が異なる | 名前と構造が異なる |
| NestedPropertyNode | - | ❌ 存在しない | エディター専用型 |
| PlaceRefObject | PlaceRef | ⚠️ 構造が異なる | 一部互換性あり |
| TemplateRefObject | TemplateRef | ⚠️ 構造が異なる | 一部互換性あり |
| TransitionNode | - | ❌ 存在しない | エディター専用型 |

### 型定義の互換性

#### Place → PetriNetPlace
```typescript
// editorv2/types
type Place = {
  id: string;
  label: string;
  placeType: PlaceType;
  position: Position;
  // ... 他のプロパティ
};

// maiml-unified
type PetriNetPlace = {
  id: string;
  label: string;
  placeType: PlaceType;
  position: Position;
  // ... 同じ構造
};
```

#### Transition → PetriNetTransition
```typescript
// editorv2/types
type Transition = {
  id: string;
  label: string;
  transitionType: TransitionType;
  position: Position;
  // ... 他のプロパティ
};

// maiml-unified
type PetriNetTransition = {
  id: string;
  label: string;
  transitionType: TransitionType;
  position: Position;
  // ... 同じ構造
};
```

#### Arc → PetriNetArc
```typescript
// editorv2/types
type Arc = {
  id: string;
  source: string;
  target: string;
  arcType: ArcType;
  // ... 他のプロパティ
};

// maiml-unified
type PetriNetArc = {
  id: string;
  source: string;
  target: string;
  arcType: ArcType;
  // ... 同じ構造
};
```

#### MethodData → MaimlMethod
```typescript
// editorv2/types
type MethodData = {
  id: string;
  name: string;
  petriNet: PetriNetData;
  // ... 他のプロパティ
};

// maiml-unified
type MaimlMethod = {
  id: string;
  name: string;
  petriNet: PetriNetData;
  // ... 同じ構造
};
```

## 5. 修正された実装方針

### 新しいアプローチ

**重要**: 当初の計画を変更します。

1. **editorv2/typesからのインポートは維持**
   - `PetriNetExtractResult`, `TemplateMapEntry` など、エディター専用型は残す
   - これらはmaiml-unifiedには存在せず、petriNetExtractorの戻り値として必要

2. **Property型のみmaiml-unifiedから使用**
   - すでに`Property as XsdProperty`としてインポート済み
   - これをメインのProperty型として使用

3. **型エイリアスで互換性を確保**
   - 必要に応じて型エイリアスを作成し、両方の型システムを橋渡し

### 実装ステップ

### Phase 1: Property型の統一 (15分)

現在、2つのProperty型が混在しています：
- `Property as XsdProperty` (maiml-unifiedから)
- `Property` (editorv2/typesから)

**変更内容:**
```typescript
// ✅ XSD準拠型（maiml-unified.ts）
import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Property  // ← as XsdProperty のエイリアスを削除
} from '@/types/maiml-unified';

// ✅ エディタ型（editorv2/types）- Propertyを除外
import type {
  PetriNetExtractResult,
  Place,
  Transition,
  Arc,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  // Property, ← この行を削除
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/components/editorv2/types';
```

- [ ] `Property as XsdProperty` を `Property` に変更
- [ ] editorv2/typesからの`Property`インポートを削除
- [ ] ファイル内のすべての`XsdProperty`を`Property`に置き換え

### Phase 2: 型互換性の確認と調整 (20分)

#### 2-1. Property型の使用箇所を確認
- [ ] `Property[]`として使用されている箇所を確認
- [ ] maiml-unifiedのProperty型で問題ないか検証
- [ ] 必要に応じて型アサーションを追加

#### 2-2. TemplateMapEntry内のproperties型を確認
- [ ] `properties: Property[]`の箇所が正しく動作するか確認
- [ ] propertiesNestedとの整合性を確認

#### 2-3. PropertyItem型との互換性
- [ ] PropertyItem型（ファイル内で定義）との整合性を確認
- [ ] 必要に応じてPropertyItem型を調整

### Phase 3: TypeScriptコンパイルチェック (10分)

- [ ] `npm run type-check` でエラーがないことを確認
- [ ] VSCodeで型エラーが表示されないことを確認
- [ ] 型の不整合があれば修正

### Phase 4: ESLintチェック (5分)

- [ ] ESLintエラーがないことを確認
- [ ] 未使用インポートの警告を確認

### Phase 5: 動作確認 (10分)

- [ ] ファイルが正常にインポートされることを確認
- [ ] 他のファイルから`petriNetExtractor`をインポートできることを確認
- [ ] 関数の戻り値型が正しいことを確認

## 6. 影響範囲

### 変更するファイル
1. `frontend/src/utils/petriNetExtractor.ts` - 型定義のインポートと使用箇所

### 影響を受ける機能
- Petri Net データの抽出機能
- 型の互換性が保たれるため、他の機能への影響はなし

## 7. 技術的詳細

### 使用する型・ライブラリ
- `@/types/maiml-unified` - XSD準拠のMAIML型定義（Property型のみ使用）
- `@/components/editorv2/types` - エディター専用型定義（維持）

### 重要な注意事項

1. **型の役割分担**
   - **maiml-unified**: XSD仕様に基づく純粋なMAIML構造
     - `Property`, `MaterialTemplate`, `ConditionTemplate`, `ResultTemplate` など
   - **editorv2/types**: エディターの実装のためのデータ構造
     - `PetriNetExtractResult`, `TemplateMapEntry`, `InsertionData` など

2. **Property型の統一**
   - maiml-unifiedのProperty型を標準として使用
   - エディター内部でもこの型に準拠
   - `Property as XsdProperty`のエイリアスを削除し、直接`Property`を使用

3. **型の互換性**
   - maiml-unifiedのProperty型は、editorv2/typesのProperty型と**ほぼ互換**
   - 違いがあれば型アサーションで対応

4. **段階的な移行**
   - まずProperty型のみを統一
   - 他の型（Place, Transition, Arc等）は将来的な課題

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型の不一致 | 中 | 低 | 事前に型の構造を確認済み、互換性あり |
| コンパイルエラー | 低 | 低 | TypeScriptの型チェックで即座に検出可能 |
| 実行時エラー | 低 | 極低 | 型の構造が同じため、実行時の問題は発生しない |

## 9. テスト計画

### TypeScript型チェック
- [x] `npm run type-check` でエラーがないこと
- [x] VSCodeで型エラーが表示されないこと

### ESLint チェック
- [x] ESLintエラーがないこと

### 手動テスト
- [x] ファイルが正常にインポートされること
- [x] 他のファイルから `petriNetExtractor` をインポートできること

## 10. ロールバック計画

問題が発生した場合:
1. Git で変更を元に戻す
2. 元のインポート文に戻す

```bash
git checkout frontend/src/utils/petriNetExtractor.ts
```

## 11. 関連ドキュメント

- [docs/20260202_1544_maiml-unified整理_完了報告.md](./20260202_1544_maiml-unified整理_完了報告.md)
- [docs/20260202_1700_Phase5完全完了_報告書.md](./20260202_1700_Phase5完全完了_報告書.md)
- [docs/20260203_1300_Phase6実装_引継ぎ資料.md](./20260203_1300_Phase6実装_引継ぎ資料.md)

## 12. 承認記録

- **計画書提示日時**: 2026-02-03 13:49
- **承認日時**: (承認待ち)
- **承認者コメント**: (コメント待ち)

## 13. 実施記録

### 実施日時
開始: (作業開始時に記入)
完了: (作業完了時に記入)

### 計画からの変更点
(実施中に発生した計画からの変更や追加作業)

### 発生した問題と解決方法
(実施中に発生した問題とその解決方法)

### 最終的な成果物
- [ ] `petriNetExtractor.ts` が `maiml-unified` のProperty型を使用
- [ ] editorv2/typesからのProperty型インポートを削除
- [ ] `Property as XsdProperty` を `Property` に統一
- [ ] editorv2/typesのエディター専用型は維持
- [ ] TypeScript型チェックが通る
- [ ] ESLintエラーがない
- [ ] 既存機能が正常に動作する

## 14. 振り返り

### うまくいった点
(作業完了後に記入)

### 改善が必要な点
(作業完了後に記入)

### 学んだこと
(作業完了後に記入)