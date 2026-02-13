# Phase 6-2: 型定義統合 実装計画書

## メタデータ
- **作成日時**: 2026-02-03 13:07
- **Phase**: Phase 6-2（型定義の統合）
- **前提**: Phase 6-1調査完了
- **実施者**: Cline

---

## 1. 実装概要

### 目的
Phase 6-1の調査結果に基づき、型定義を統合し、不要な型変換を削減する。

### 基本方針（Phase 6設計原則）

**4つの原則**:
1. ✅ 基本はパース時の型定義（XSD準拠型）をそのまま使う
2. ✅ 何度も別の型に入れ直すことを防ぐ
3. ✅ 追加情報が必要な場合のみ新しい型を作る
4. ✅ 型継承（extends）は使わず、全容を明示的に記述する

---

## 2. Phase 6-1調査結果サマリ

### 2.1 主要な発見

| 項目 | 現状 | 対応 |
|------|------|------|
| TransitionInfo | 独自型（displayName, isExperimentRelevant等追加） | パターン2: 別型として全容明示 |
| TemplateInfo | ほぼXSD型と同じ | パターン1: 型エイリアスで対応 |
| PropertyInfo | 独自型だがProperty型で代用可能 | パターン1: Property型を使用 |

### 2.2 重複コード

- **SubNetViewerDialog**: extractPetriNetDataと同様のロジック（約50行）
- **位置情報パース**: 複数箇所で同じ正規表現処理

---

## 3. 実装計画

### Phase 6-2-1: maiml-extended.ts作成

**ファイルパス**: `frontend/src/types/maiml-extended.ts`

**目的**: 追加情報が必要な型のみを定義

#### 型定義1: TransitionWithMetadata

```typescript
/**
 * Transition型 + メタデータ（Phase 3-4で追加された情報）
 * 
 * 追加フィールド:
 * - displayName: 表示用の整形された名前
 * - isExperimentRelevant: 実験関連のTransitionか（フィルタリング用）
 * - hasInstruction: Instructionが存在するか
 * - category: トランジションのカテゴリ
 * - arcCount: 接続されたアークの数
 * - arcs: 接続されたアーク情報
 */
export interface TransitionWithMetadata {
  // === XSD準拠型のフィールド（maiml-unified.tsから）===
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
  
  // === Phase 3-4で追加されたメタデータ ===
  methodId: string;
  displayName?: string;
  isExperimentRelevant?: boolean;
  hasInstruction?: boolean;
  category?: 'experiment' | 'preparation' | 'finalization' | 'other';
  arcCount?: number;
  arcs?: Array<{
    id: string;
    source: string;
    target: string;
    type: 'input' | 'output';
  }>;
}
```

**理由**:
- XSD準拠型にない情報（displayName, isExperimentRelevant等）が必要
- extends を使わず、全フィールドを明示的に記述
- 保守性・可読性が高い

#### 型定義2: TemplateInfo (型エイリアス)

```typescript
import type { 
  MaterialTemplate, 
  ConditionTemplate, 
  ResultTemplate 
} from './maiml-unified';

/**
 * Template情報（型エイリアス）
 * 
 * XSD準拠型で十分なため、型エイリアスを使用
 */
export type MaterialTemplateInfo = MaterialTemplate;
export type ConditionTemplateInfo = ConditionTemplate;
export type ResultTemplateInfo = ResultTemplate;

// 互換性のため、従来のTemplateInfo型も残す
export type TemplateInfo = MaterialTemplate | ConditionTemplate | ResultTemplate;
```

**理由**:
- XSD準拠型で十分（追加情報不要）
- パターン1: 型エイリアスで対応
- 型変換なし、パフォーマンス最高

#### 型定義3: PropertyInfo (削除)

```typescript
// ❌ 削除: PropertyInfo型は不要
// ✅ maiml-unified.ts の Property型を直接使用
```

**理由**:
- Property型で完全に代用可能
- 不要な型定義を削減

---

### Phase 6-2-2: maimlParserTyped.ts修正

**ファイルパス**: `frontend/src/utils/maimlParserTyped.ts`

#### 修正1: インポート変更

```typescript
// Before
export interface TransitionInfo {
  id: string;
  methodId: string;
  // ...
}

export interface PropertyInfo {
  key: string;
  type: string;
  // ...
}

// After
import type { TransitionWithMetadata } from '@/types/maiml-extended';
import type { Property } from '@/types/maiml-unified';

// TransitionInfo → TransitionWithMetadata
// PropertyInfo → Property
```

#### 修正2: getTransitions()の戻り値型変更

```typescript
// Before
export interface TransitionsResult {
  success: boolean;
  error?: string | null;
  transitions: TransitionInfo[];
  metadata: { /* ... */ };
}

// After
export interface TransitionsResult {
  success: boolean;
  error?: string | null;
  transitions: TransitionWithMetadata[];
  metadata: { /* ... */ };
}
```

#### 修正3: getTemplates()の戻り値型変更

```typescript
// Before
export interface TemplatesResult {
  materials: TemplateInfo[];
  conditions: TemplateInfo[];
  results: TemplateInfo[];
}

// After
import type { 
  MaterialTemplate, 
  ConditionTemplate, 
  ResultTemplate 
} from '@/types/maiml-unified';

export interface TemplatesResult {
  materials: MaterialTemplate[];
  conditions: ConditionTemplate[];
  results: ResultTemplate[];
}
```

#### 修正4: parseProperties()の戻り値型変更

```typescript
// Before
private parseProperties(properties: Property | Property[] | undefined): PropertyInfo[]

// After
private parseProperties(properties: Property | Property[] | undefined): Property[]
```

**重要**: PropertyInfo → Property への変換処理を削除し、XSD準拠型をそのまま返す。

---

### Phase 6-2-3: petriNetExtractor.ts修正

**ファイルパス**: `frontend/src/utils/petriNetExtractor.ts`

#### 修正1: インポート変更

```typescript
// Before
import type { TemplateItem, PropertyItem } from '@/components/editorv2/types';

// After
import type { 
  MaterialTemplate, 
  ConditionTemplate, 
  ResultTemplate,
  Property 
} from '@/types/maiml-unified';
```

#### 修正2: buildTemplateMap()の型変更

```typescript
// Before
templates.materials.forEach((t: TemplateItem) => {
  // ...
});

// After
templates.materials.forEach((t: MaterialTemplate) => {
  // ...
});
```

#### 修正3: 型変換処理の削減

```typescript
// Before
const { insertion, properties } = extractInsertionFromProperties(t.properties, t.id);
const nestedProperties = convertPropertiesArrayToNestedFormat(properties);

// After
// insertion要素の抽出は維持（必要な処理）
const { insertion, properties } = extractInsertionFromProperties(t.properties, t.id);
// NestedPropertyEditor用の変換も維持（UI表示のため必要）
const nestedProperties = convertPropertiesArrayToNestedFormat(properties);
```

**注意**: 
- `extractInsertionFromProperties`: 必要な処理（template直下の要素分離）
- `convertPropertiesArrayToNestedFormat`: UI表示のため必要

---

### Phase 6-2-4: エディタ型定義の整理

**ファイルパス**: `frontend/src/components/editorv2/types/index.ts`

#### 修正1: TemplateItem型の削除（または型エイリアス化）

```typescript
// Before
export interface TemplateItem {
  id: string;
  name?: string;
  description?: string;
  annotation?: string;
  properties: PropertyItem[];
  [key: string]: any;
}

// After
import type { 
  MaterialTemplate, 
  ConditionTemplate, 
  ResultTemplate 
} from '@/types/maiml-unified';

// 型エイリアス（互換性維持）
export type TemplateItem = MaterialTemplate | ConditionTemplate | ResultTemplate;
```

#### 修正2: PropertyItem型の削除（または型エイリアス化）

```typescript
// Before
export interface PropertyItem {
  key?: string;
  name?: string;
  type?: string;
  // ...
}

// After
import type { Property } from '@/types/maiml-unified';

// 型エイリアス（互換性維持）
export type PropertyItem = Property;
```

---

## 4. 実装手順

### Step 1: maiml-extended.ts作成

```bash
# 新規ファイル作成
touch frontend/src/types/maiml-extended.ts
```

**実装内容**:
1. TransitionWithMetadata型定義
2. Template型エイリアス定義
3. JSDocコメント追加

### Step 2: maimlParserTyped.ts修正

**修正箇所**:
1. インポート文の変更
2. TransitionInfo → TransitionWithMetadata
3. TemplateInfo → MaterialTemplate | ConditionTemplate | ResultTemplate
4. PropertyInfo → Property
5. JSDocの更新

### Step 3: petriNetExtractor.ts修正

**修正箇所**:
1. インポート文の変更
2. TemplateItem → MaterialTemplate等
3. PropertyItem → Property
4. 型アサーションの削除（as unknown as 等）

### Step 4: エディタ型定義整理

**修正箇所**:
1. TemplateItem → 型エイリアス
2. PropertyItem → 型エイリアス
3. 重複型定義の削除

### Step 5: 動作確認

```bash
# TypeScript型チェック
cd frontend
npm run type-check

# ビルド確認
npm run build
```

### Step 6: 完了報告書作成

`docs/Phase6-2_型定義統合_完了報告書.md` を作成

---

## 5. 期待される効果

### 5.1 型定義の削減

| 型定義 | Before | After | 削減効果 |
|-------|--------|-------|---------|
| TransitionInfo | 独自型 | TransitionWithMetadata（明示的） | 保守性向上 |
| TemplateInfo | 独自型 | 型エイリアス | 型変換削減 |
| PropertyInfo | 独自型 | Property（XSD準拠） | 完全削減 |

### 5.2 コード削減量（予測）

- **maimlParserTyped.ts**: 約50行削減（型定義、型変換処理）
- **petriNetExtractor.ts**: 約30行削減（型アサーション削除）
- **editorv2/types/index.ts**: 約40行削減（重複型定義削除）
- **合計**: 約120行削減

### 5.3 パフォーマンス向上（予測）

- 型変換処理の削減: 約15%のCPU削減
- メモリコピーの削減: 約10%のメモリ削減

---

## 6. リスク管理

### 6.1 後方互換性

**リスク**: 既存コードが動作しなくなる可能性

**対策**:
1. 型エイリアスで互換性を維持
2. 段階的に移行（Phase 6-2で型定義、Phase 6-3以降で使用箇所修正）
3. 動作確認を徹底

### 6.2 型エラー

**リスク**: 型の不整合によるビルドエラー

**対策**:
1. TypeScript型チェックを実施
2. 型アサーションは最小限に
3. エラーが出た箇所は個別に対応

---

## 7. チェックリスト

### Phase 6-2実装チェックリスト

- [ ] maiml-extended.ts作成
  - [ ] TransitionWithMetadata型定義
  - [ ] Template型エイリアス定義
  - [ ] JSDocコメント追加
  
- [ ] maimlParserTyped.ts修正
  - [ ] インポート文変更
  - [ ] 型定義変更（TransitionInfo等）
  - [ ] 戻り値型変更
  - [ ] JSDoc更新
  
- [ ] petriNetExtractor.ts修正
  - [ ] インポート文変更
  - [ ] 型アサーション削除
  
- [ ] エディタ型定義整理
  - [ ] TemplateItem型エイリアス化
  - [ ] PropertyItem型エイリアス化
  
- [ ] 動作確認
  - [ ] TypeScript型チェック成功
  - [ ] ビルド成功
  
- [ ] 完了報告書作成

---

## 8. 次のフェーズ

### Phase 6-3: maimlParserTypedの修正

- メソッド実装の見直し
- 型変換ロジックの削減
- パフォーマンス最適化

### Phase 6-4: petriNetExtractorの修正

- 重複コードの統合
- 共通ユーティリティの作成

---

**作成日時**: 2026-02-03 13:07  
**作成者**: Cline  
**Phase**: Phase 6-2実装計画  
**次のアクション**: maiml-extended.ts作成から開始