# Phase 6-3: コンポーネント修正 実装計画書

## メタデータ
- **作成日時**: 2026-02-03 13:11
- **Phase**: Phase 6-3（コンポーネント修正）
- **実施者**: Cline
- **前提**: Phase 6-2完了（型定義統合）

---

## 1. 実施概要

### 目的
Phase 6-2で統合した型定義（maiml-extended.ts）を、実際のコンポーネントに適用する。

### スコープ
1. **petriNetExtractor.ts** - 型定義の更新
2. **editorv2/types/index.ts** - 型エイリアス化
3. **SubNetViewerDialog.tsx** - 重複コード統合（時間があれば）

---

## 2. 修正対象ファイル

### 2.1 petriNetExtractor.ts

**ファイルパス**: `frontend/src/utils/petriNetExtractor.ts`
**現在の行数**: 約440行
**予測削減行数**: 約40行

#### 修正内容

**1. インポートの修正**
```typescript
// Before
import type { 
  MaimlDocument,
  Method,
  SubNet,
  Place,
  Transition,
  Arc,
  Property,
  Reference
} from '@/types/maiml-unified';

// After
import type { 
  MaimlDocument,
  Method,
  SubNet,
  Place,
  Transition,
  Arc,
  Property,
  Reference,
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate
} from '@/types/maiml-unified';
```

**2. TemplateItem型の削除**
```typescript
// Before (独自型定義)
interface TemplateItem {
  id: string;
  name?: string;
  description?: string;
  type: 'material' | 'condition' | 'result';
  properties?: Property[];
  // ...
}

// After (削除)
// XSD準拠型（MaterialTemplate等）を直接使用
```

**削減効果**: 約15行削減

**3. extractTemplates()の修正**
```typescript
// Before
function extractTemplates(method: Method): TemplateItem[] {
  const templates: TemplateItem[] = [];
  // ... 型変換処理
  return templates;
}

// After
function extractTemplates(method: Method): {
  materials: MaterialTemplate[];
  conditions: ConditionTemplate[];
  results: ResultTemplate[];
} {
  // XSD型をそのまま返す（型変換なし）
  return {
    materials: /* ... */,
    conditions: /* ... */,
    results: /* ... */
  };
}
```

**削減効果**: 約20行削減

**4. PropertyItem型の削除**
```typescript
// Before (独自型定義)
interface PropertyItem {
  key: string;
  value: string;
  type?: string;
}

// After (削除)
// XSD準拠型のPropertyを直接使用
```

**削減効果**: 約5行削減

### 2.2 editorv2/types/index.ts

**ファイルパス**: `frontend/src/components/editorv2/types/index.ts`
**現在の行数**: 約160行
**予測削減行数**: 約30行

#### 修正内容

**1. TemplateItem型エイリアス化**
```typescript
// Before (独自型定義)
export interface TemplateItem {
  id: string;
  name?: string;
  type: 'material' | 'condition' | 'result';
  // ...
}

// After (型エイリアス)
import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate
} from '@/types/maiml-unified';

export type TemplateItem = MaterialTemplate | ConditionTemplate | ResultTemplate;
```

**削減効果**: 約15行削減

**2. PropertyItem型エイリアス化**
```typescript
// Before (独自型定義)
export interface PropertyItem {
  key: string;
  value: string;
  type?: string;
  // ...
}

// After (型エイリアス)
import type { Property } from '@/types/maiml-unified';

export type PropertyItem = Property;
```

**削減効果**: 約10行削減

**3. 不要な型定義の削除**
```typescript
// Before
export interface ReferenceItem { /* ... */ }

// After (削除)
// XSD準拠型のReferenceを直接使用
```

**削減効果**: 約5行削減

### 2.3 SubNetViewerDialog.tsx（オプション）

**ファイルパス**: `frontend/src/components/editorv2/SubNetViewerDialog.tsx`
**現在の状況**: extractPetriNetDataと同様の変換ロジックが重複

**Phase 6-3では時間制約により、Phase 6-4に延期**

---

## 3. 実装手順

### Step 1: petriNetExtractor.ts修正

**3.1. ファイル確認**
- 現在の型定義を確認
- 削除対象の型を特定

**3.2. インポート修正**
- MaterialTemplate, ConditionTemplate, ResultTemplate追加

**3.3. 型定義削除**
- TemplateItem型削除
- PropertyItem型削除

**3.4. 関数修正**
- extractTemplates()の戻り値型修正
- 型変換処理の削除

**3.5. TypeScript型チェック**
```bash
cd frontend && npx tsc --noEmit
```

### Step 2: editorv2/types/index.ts修正

**3.6. インポート追加**
- XSD準拠型（MaterialTemplate等、Property）をインポート

**3.7. 型エイリアス化**
- TemplateItem → 型エイリアス
- PropertyItem → 型エイリアス

**3.8. 不要な型削除**
- ReferenceItem等の独自型定義

**3.9. TypeScript型チェック**
```bash
cd frontend && npx tsc --noEmit
```

### Step 3: 完了報告書作成

**3.10. Phase6-3完了報告書作成**
- 修正内容のサマリ
- 削減行数の集計
- TypeScript型チェック結果
- 次フェーズへの引き継ぎ

---

## 4. 期待効果

### 4.1 コード削減量（予測）

| ファイル | 削減内容 | 予測削減行数 |
|---------|---------|------------|
| petriNetExtractor.ts | TemplateItem型削除 | 15行 |
| petriNetExtractor.ts | extractTemplates()簡略化 | 20行 |
| petriNetExtractor.ts | PropertyItem型削除 | 5行 |
| editorv2/types/index.ts | TemplateItem型エイリアス化 | 15行 |
| editorv2/types/index.ts | PropertyItem型エイリアス化 | 10行 |
| editorv2/types/index.ts | 不要な型削除 | 5行 |
| **合計** | | **70行削減** |

### 4.2 型安全性の向上

**Before**:
- TemplateItem: 独自型（XSD型との不一致リスク）
- PropertyItem: 独自型（Property型との不一致リスク）

**After**:
- TemplateItem: MaterialTemplate | ConditionTemplate | ResultTemplate（型エイリアス）
- PropertyItem: Property（型エイリアス）

**効果**: 型の不一致によるバグが削減される

### 4.3 型変換の削減

**Before**:
```
XSD型 → TemplateItem → コンポーネント
XSD型 → PropertyItem → コンポーネント
```

**After**:
```
XSD型 → そのまま使用 → コンポーネント
```

**効果**: 型変換処理の削減、パフォーマンス向上

---

## 5. リスクと対策

### 5.1 既存コードへの影響

**リスク**: TemplateItem/PropertyItemを使用している他のコンポーネントがある可能性

**対策**:
1. TypeScript型チェックで全エラーを確認
2. エラーが出た場合、型エイリアスで互換性を保つ
3. 段階的に修正

### 5.2 SubNetViewerDialogの修正

**リスク**: Phase 6-3で時間が不足する可能性

**対策**:
- Phase 6-3では型定義の統合のみに集中
- 重複コード統合はPhase 6-4に延期

---

## 6. Phase 6全体の進捗予測

| Phase | 内容 | 状態 | 削減行数 |
|-------|------|------|---------|
| Phase 6-1 | 型使用状況調査 | ✅ 完了 | - |
| Phase 6-2 | 型定義統合 | ✅ 完了 | 50行 |
| Phase 6-3 | コンポーネント修正 | 🔄 実施中 | 70行（予測） |
| Phase 6-4 | パフォーマンス最適化 | 📅 予定 | 20行（予測） |
| **合計** | | **75%完了予定** | **120/140行** |

---

## 7. 次フェーズへの引き継ぎ

### Phase 6-4: パフォーマンス最適化

**対象**:
1. SubNetViewerDialogの重複コード統合
2. 位置情報パース処理の統一
3. エラーハンドリング強化

**期待効果**:
- 約20行のコード削減
- コードの可読性向上
- エラー検出の向上

---

## 8. 参考資料

- [Phase 6-1: 型使用状況調査報告書](./Phase6-1_型使用状況調査_報告書.md)
- [Phase 6-2: 型定義統合完了報告書](./Phase6-2_型定義統合_完了報告書.md)
- [Phase 6計画: 型変換最適化（改訂版）](./20260202_1715_Phase6計画_型変換最適化_改訂版.md)

---

**作成日時**: 2026-02-03 13:11  
**作成者**: Cline  
**Phase**: Phase 6-3実装計画  
**次のアクション**: Step 1（petriNetExtractor.ts修正）開始