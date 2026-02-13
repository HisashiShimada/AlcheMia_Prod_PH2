# タスク計画書: petriNetExtractor.ts 型アーキテクチャ再設計

## メタデータ
- **作成日時**: 2026-02-03 14:00
- **タスクID**: petriNetExtractor-type-architecture-redesign
- **優先度**: 高
- **推定工数**: 2.7時間

## 1. タスク概要

`frontend/src/utils/petriNetExtractor.ts` の型定義を、統一されたアーキテクチャに基づいて再設計します。

**重要**: このタスクは `petriNetExtractor.ts` に限定した対応ですが、ここで確立する設計原則は**プロジェクト全体のMAIML型定義に適用される標準**となります。

## 2. 目的と期待される成果

### 目的
- **petriNetExtractor.tsの型定義を整理**（今回の対象）
- 型定義の明確な階層構造を確立
- maiml-unified（共通MAIML型定義）を基盤とする
- エディター固有の拡張型を適切に分離
- 型変換を1箇所に集約し、保守性を向上
- **プロジェクト全体で適用する設計原則を確立**（将来的な展開）

### 期待される成果
- [ ] 新しい型定義ファイル `frontend/src/types/petriNet.ts` を作成
- [ ] maiml-unifiedの型を基盤として使用
- [ ] editorv2/typesへの依存を完全に削除
- [ ] 型変換ロジックを1度のみ実行
- [ ] 既存機能が正常に動作する

## 3. 型定義アーキテクチャの設計原則

### 3-1. 基本方針

```
[XML] 
  ↓ xml2js
[xml-js形式]
  ↓ maimlParserTyped (変換は1度のみ)
[maiml-unified型] ← 共通MAIML型定義（XSD準拠）
  ↓ 必要に応じて拡張
[types/petriNet.ts] ← エディター固有の拡張型
  ↓
[petriNetExtractor.ts] ← ユーティリティ関数
```

### 3-2. 型定義の役割分担

| 型定義ファイル | 役割 | 依存関係 |
|--------------|------|---------|
| **maiml-unified.ts** | XSD準拠の純粋なMAIML構造型 | なし（基盤） |
| **types/petriNet.ts** (**新規作成**) | Petri Net処理用の拡張型 | maiml-unified のみ依存 |
| **editorv2/types** | エディターUI固有の型 | 削除予定（petriNetExtractorからの参照を削除） |
| **petriNetExtractor.ts** | ユーティリティ関数 | types/petriNet.ts のみ依存 |

### 3-3. 型変換の原則

**重要**: 型変換は基本的に1度のみ実行

```typescript
// ✅ 正しい: 1度のみ変換
const maimlData = maimlParserTyped.parse(xmlString);  // xml → maiml-unified
const petriNet = extractPetriNetStructure(maimlData);  // maiml-unified → PetriNet拡張型

// ❌ 間違い: 複数回変換
const xmlData = xml2js(xmlString);
const editorData = convertToEditor(xmlData);  // 1回目
const maimlData = convertToMaiml(editorData);  // 2回目（不要）
```

## 4. 新しいファイル構成

### 4-1. 新規作成: `frontend/src/types/petriNet.ts`

**目的**: Petri Net処理に特化した型定義を集約

**内容**:
```typescript
/**
 * Petri Net 型定義
 * 
 * maiml-unified（XSD準拠型）を基盤とし、
 * Petri Net処理に必要な拡張型を定義
 * 
 * 依存関係: maiml-unified のみ
 */

import type {
  Property,
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Place as MaimlPlace,
  Transition as MaimlTransition,
  Arc as MaimlArc
} from '@/types/maiml-unified';

// ============================================
// 基本型（maiml-unifiedを再エクスポート）
// ============================================

export type { Property } from '@/types/maiml-unified';

// ============================================
// Petri Net 抽出結果型
// ============================================

/**
 * Petri Net構造の抽出結果
 */
export interface PetriNetExtractResult {
  places: MaimlPlace[];
  transitions: MaimlTransition[];
  arcs: MaimlArc[];
}

// ============================================
// テンプレートマップ型
// ============================================

/**
 * ネストされたプロパティノード
 */
export interface NestedPropertyNode {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, any>;
  children: NestedPropertyNode[];
}

/**
 * ファイル挿入情報
 */
export interface InsertionData {
  uri: string;
  hash: string;
  format: string;
}

/**
 * Place参照オブジェクト
 */
export interface PlaceRefObject {
  id: string;
  ref: string;
  uuid: string;
}

/**
 * Template参照オブジェクト
 */
export interface TemplateRefObject {
  id: string;
  href: string;
}

/**
 * テンプレートマップのエントリ
 * 
 * maiml-unifiedのテンプレート型を拡張し、
 * Petri Net処理に必要な追加情報を含む
 */
export interface TemplateMapEntry {
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
  properties: Property[];
  propertiesNested: Record<string, NestedPropertyNode>;
  insertion?: InsertionData;
  templateId: string;
  type: 'material' | 'condition' | 'result';
  stereotype: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate';
  element?: Element | null;
  placeRefs: PlaceRefObject[];
  templateRefs: TemplateRefObject[];
}

// ============================================
// サブネット生成用型
// ============================================

/**
 * トランジションノード（サブネット生成用）
 */
export interface TransitionNode {
  data?: {
    pnmlId?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

// ============================================
// 型変換ヘルパー
// ============================================

/**
 * maiml-unifiedのテンプレート型をTemplateMapEntryに変換
 */
export function convertToTemplateMapEntry(
  template: MaterialTemplate | ConditionTemplate | ResultTemplate,
  type: 'material' | 'condition' | 'result'
): TemplateMapEntry {
  // 実装は petriNetExtractor.ts に移動
  throw new Error('Not implemented - use petriNetExtractor functions');
}
```

### 4-2. 修正: `frontend/src/utils/petriNetExtractor.ts`

**変更内容**:
```typescript
// ✅ 新しいインポート（types/petriNet.ts のみ）
import type {
  Property,
  PetriNetExtractResult,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/types/petriNet';

// ✅ MAIML型定義（必要な場合のみ直接インポート）
import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate
} from '@/types/maiml-unified';

// ❌ 削除: editorv2/types への依存を完全に削除
// import type { ... } from '@/components/editorv2/types';
```

## 5. 実装ステップ

### Phase 1: 型定義の全体分析 (25分)

- [ ] editorv2/types で定義されている全型を確認
- [ ] maimlParserTyped.ts の TransitionsResult と TemplatesResult を確認
- [ ] petriNetExtractor.ts で使用されている型を特定
- [ ] 各型とmaiml-unifiedの対応関係を確認
- [ ] 型の妥当性を評価（必要/不要/修正必要）

**作業内容:**
1. editorv2/types の全型定義をリスト化
2. maimlParserTyped.ts の TransitionsResult, TemplatesResult を分析
3. petriNetExtractor.ts での使用箇所を特定
4. maiml-unified との型の比較表を作成
5. 妥当性評価レポートを作成

**追加分析対象:**
- `TransitionsResult` (from maimlParserTyped.ts)
  - petriNetExtractor.ts での使用状況を確認
  - maiml-unified の型との対応関係を確認
- `TemplatesResult` (from maimlParserTyped.ts)
  - petriNetExtractor.ts での使用状況を確認
  - maiml-unified の型との対応関係を確認

**評価基準:**
- ✅ **そのまま使用可能**: maiml-unifiedの型と完全一致
- 🔄 **調整が必要**: maiml-unifiedの型を拡張する必要あり
- ⚠️ **要検討**: 型定義が不明確、または不要な可能性
- ❌ **削除対象**: petriNetExtractorで未使用

### Phase 2: 新しい型定義ファイルの作成 (35分)

- [ ] `frontend/src/types/petriNet.ts` を作成
- [ ] maiml-unifiedの型を基盤として使用
- [ ] Phase 1の評価結果に基づき型定義を整理
- [ ] 型の依存関係を整理（maiml-unified のみに依存）

**作業内容:**
1. ファイル作成
2. maiml-unifiedからのインポート
3. Petri Net固有の型定義（評価で✅または🔄のもの）
4. 各型にJSDocコメント + 妥当性評価結果を記載

### Phase 3: petriNetExtractor.ts のインポート修正 (20分)

- [ ] editorv2/types からのインポートを削除
- [ ] types/petriNet.ts からのインポートに置き換え
- [ ] maiml-unified からの直接インポート（必要な場合のみ）

**変更箇所:**
```typescript
// 変更前
import type { Property as XsdProperty, ... } from '@/types/maiml-unified';
import type { Place, Transition, ... } from '@/components/editorv2/types';

// 変更後
import type {
  Property,
  PetriNetExtractResult,
  TemplateMapEntry,
  ...
} from '@/types/petriNet';
import type { MaterialTemplate, ... } from '@/types/maiml-unified';
```

### Phase 4: 型アノテーションの修正 (30分)

- [ ] `Property` 型の使用箇所を確認
- [ ] `XsdProperty` を `Property` に置き換え
- [ ] 他の型アノテーションを `types/petriNet` の型に修正
- [ ] 型エラーがあれば修正

### Phase 5: 型チェックとコンパイル (20分)

- [ ] TypeScriptコンパイルエラーを確認・修正
- [ ] VSCodeでの型エラーを確認・修正
- [ ] 必要に応じて型アサーションを追加

### Phase 6: ESLintチェック (10分)

- [ ] ESLintエラーを確認
- [ ] 未使用インポートの削除
- [ ] import順序の調整

### Phase 7: 動作確認とテスト (10分)

- [ ] ファイルが正常にインポートされることを確認
- [ ] 他のファイルからpetriNetExtractorをインポートできることを確認
- [ ] 関数の戻り値型が正しいことを確認

## 6. 影響範囲

### 変更するファイル

1. **新規作成**
   - `frontend/src/types/petriNet.ts` - Petri Net型定義（新規）

2. **修正**
   - `frontend/src/utils/petriNetExtractor.ts` - インポートと型アノテーション

### 影響を受けるファイル（確認が必要）

- `frontend/src/utils/maimlParserTyped.ts` - petriNetExtractorを使用している可能性
  - **注意**: TransitionsResult と TemplatesResult 型も分析対象に含める
- `frontend/src/components/experiment_admin/editorv2/` 配下のコンポーネント
  - PetriNetEditorV2.tsx
  - PetriNetEditorInner.tsx
  - 等

**重要**: これらのファイルは、今回の変更では修正しません。types/petriNet.ts を経由することで、既存のコードへの影響を最小限に抑えます。

## 7. 技術的詳細

### 7-1. 型定義の依存関係グラフ

```
[maiml-unified.ts] ← XSD準拠の基盤型
       ↓ (依存)
[types/petriNet.ts] ← Petri Net拡張型
       ↓ (依存)
[petriNetExtractor.ts] ← ユーティリティ
       ↓ (使用)
[maimlParserTyped.ts, エディターコンポーネント等]
```

### 7-2. 型変換のフロー

```typescript
// Step 1: XML → MAIML型（maimlParserTyped内で実施）
const maimlData: MaimlDocument = maimlParserTyped.parse(xmlString);

// Step 2: MAIML型 → Petri Net型（petriNetExtractor内で実施）
const petriNet: PetriNetExtractResult = extractPetriNetStructure(maimlData);

// Step 3: Petri Net型 → エディター表示用（エディターコンポーネント内で実施）
const nodes = convertToReactFlowNodes(petriNet);
```

**重要**: 各ステップは1度のみ実行され、型変換は明確に分離されています。

### 7-3. Property型の統一

```typescript
// ✅ 正しい: maiml-unified の Property型を使用
import type { Property } from '@/types/maiml-unified';

// または
import type { Property } from '@/types/petriNet';  // 再エクスポート

// ❌ 間違い: 複数のProperty型を混在させない
import type { Property as XsdProperty } from '@/types/maiml-unified';
import type { Property } from '@/components/editorv2/types';
```

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存コードの破壊 | 高 | 低 | types/petriNet.ts を経由することで影響を局所化 |
| 型の不一致 | 中 | 中 | Phase 4で徹底的に型チェック |
| インポートサイクル | 中 | 低 | 依存関係を一方向に保つ（maiml-unified → petriNet → petriNetExtractor） |
| パフォーマンス低下 | 低 | 極低 | 型定義のみの変更のため影響なし |

## 9. テスト計画

### 9-1. TypeScript型チェック
```bash
cd frontend
npm run type-check
```
- [ ] エラー0件であることを確認

### 9-2. ESLintチェック
```bash
cd frontend
npm run lint
```
- [ ] エラー0件であることを確認

### 9-3. ビルドチェック
```bash
cd frontend
npm run build
```
- [ ] ビルドが成功することを確認

### 9-4. 手動テスト
- [ ] petriNetExtractor.ts のインポートが正常
- [ ] maimlParserTyped.ts からのインポートが正常
- [ ] エディターコンポーネントでのインポートが正常

## 10. ロールバック計画

問題が発生した場合:

```bash
# ファイルを元に戻す
git checkout frontend/src/utils/petriNetExtractor.ts

# 新規作成ファイルを削除
rm frontend/src/types/petriNet.ts
```

## 11. 関連ドキュメント

- [docs/20260202_1544_maiml-unified整理_完了報告.md](./20260202_1544_maiml-unified整理_完了報告.md)
- [docs/20260202_1700_Phase5完全完了_報告書.md](./20260202_1700_Phase5完全完了_報告書.md)
- [docs/20260203_1300_Phase6実装_引継ぎ資料.md](./20260203_1300_Phase6実装_引継ぎ資料.md)

## 12. 承認記録

- **計画書提示日時**: 2026-02-03 14:00
- **修正方針反映**: ユーザーフィードバックに基づき全面改訂
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
- [ ] `frontend/src/types/petriNet.ts` を作成
- [ ] `petriNetExtractor.ts` が types/petriNet.ts のみを参照
- [ ] editorv2/types への依存を完全に削除
- [ ] maiml-unified の Property型に統一
- [ ] TypeScript型チェックが通る
- [ ] ESLintエラーがない
- [ ] ビルドが成功する
- [ ] 既存機能が正常に動作する

## 14. 振り返り

### うまくいった点
(作業完了後に記入)

### 改善が必要な点
(作業完了後に記入)

### 学んだこと
(作業完了後に記入)

---

## 付録A: 型定義アーキテクチャ図

```
┌─────────────────────────────────────┐
│   XSD Schema (MAIML仕様)             │
└──────────────┬──────────────────────┘
               ↓ 生成
┌─────────────────────────────────────┐
│   maiml-unified.ts                   │
│   - Property                         │
│   - MaterialTemplate                 │
│   - ConditionTemplate                │
│   - ResultTemplate                   │
│   - Place, Transition, Arc           │
│   （XSD準拠の純粋なMAIML型）          │
└──────────────┬──────────────────────┘
               ↓ 依存・拡張
┌─────────────────────────────────────┐
│   types/petriNet.ts (新規作成)       │
│   - PetriNetExtractResult            │
│   - TemplateMapEntry                 │
│   - NestedPropertyNode               │
│   - InsertionData                    │
│   （Petri Net処理用の拡張型）        │
└──────────────┬──────────────────────┘
               ↓ 使用
┌─────────────────────────────────────┐
│   petriNetExtractor.ts               │
│   - extractPetriNetStructure()       │
│   - buildTemplateMap()               │
│   （Petri Net処理ユーティリティ）    │
└──────────────┬──────────────────────┘
               ↓ 使用
┌─────────────────────────────────────┐
│   maimlParserTyped.ts                │
│   エディターコンポーネント            │
│   （アプリケーション層）              │
└─────────────────────────────────────┘
```

## 付録B: プロジェクト全体への展開（将来計画）

### 今回の対応範囲

**Phase 1 (今回)**: `petriNetExtractor.ts` の型定義整理
- types/petriNet.ts の作成
- petriNetExtractor.ts のリファクタリング
- 設計原則の確立

### 将来的な展開計画

この設計原則を、プロジェクト全体のMAIML型定義に段階的に適用していきます。

#### Phase 2 (次回以降): maimlParserTyped.ts
- types/maimlParser.ts の作成
- maiml-unified を基盤とした型定義
- パース処理固有の拡張型を定義

#### Phase 3 (次回以降): エディターコンポーネント
- types/editor.ts の作成
- ReactFlow固有の型定義
- UI表示用の拡張型を定義

#### Phase 4 (次回以降): その他のユーティリティ
- 各ユーティリティごとに専用の型定義ファイルを作成
- すべて maiml-unified を基盤として構築

### 統一された型定義アーキテクチャ（最終形）

```
[maiml-unified.ts] ← XSD準拠の基盤型（共通）
       ↓
   ┌───┴───┬───────┬─────────┐
   ↓       ↓       ↓         ↓
[petriNet] [parser] [editor] [その他]
   ↓       ↓       ↓         ↓
[各ユーティリティ・コンポーネント]
```

**原則**:
1. ✅ すべての型定義は maiml-unified を基盤とする
2. ✅ 機能ごとに専用の型定義ファイルを作成
3. ✅ 型変換は各層で1度のみ実行
4. ✅ editorv2/types のような汎用型ファイルは段階的に廃止

## 付録C: 型定義妥当性評価テンプレート

### 評価フォーマット

各型定義について以下の観点で評価します：

```markdown
#### [型名]

**使用箇所**: petriNetExtractor.ts 内での使用頻度・場所
**maiml-unified対応**: 
  - [ ] 完全一致
  - [ ] 部分一致（拡張が必要）
  - [ ] 不一致（独自型）
**妥当性評価**:
  - ✅ そのまま使用可能
  - 🔄 調整が必要
  - ⚠️ 要検討
  - ❌ 削除対象
**判断理由**: [評価理由を記載]
**対応方針**: [types/petriNet.ts での扱い方を記載]
```

### 評価結果サマリー（Phase 1で作成）

この部分は Phase 1 の分析後に記入します。

## 付録D: 変更前後の比較

### 変更前（現状）

```typescript
// petriNetExtractor.ts
import type { Property as XsdProperty } from '@/types/maiml-unified';
import type {
  Place,
  Transition,
  Property,
  TemplateMapEntry,
  ...
} from '@/components/editorv2/types';

// 問題点:
// 1. Property型が2つ混在（XsdProperty と Property）
// 2. editorv2/types への依存
// 3. 型の役割が不明確
```

### 変更後（目標）

```typescript
// types/petriNet.ts (新規)
export type { Property } from '@/types/maiml-unified';
export interface PetriNetExtractResult { ... }
export interface TemplateMapEntry { ... }

// petriNetExtractor.ts
import type {
  Property,
  PetriNetExtractResult,
  TemplateMapEntry,
  ...
} from '@/types/petriNet';

// 改善点:
// 1. Property型が統一（maiml-unifiedのみ）
// 2. editorv2/types への依存を完全に削除
// 3. 型の役割が明確（petriNet.ts = Petri Net処理専用）