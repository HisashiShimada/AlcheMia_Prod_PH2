# petriNetExtractor.ts メソッド型定義分析 - インデックス

## 📋 概要

- **作成日時**: 2025-02-04 08:30
- **対象ファイル**: `frontend/src/utils/petriNetExtractor.ts`
- **目的**: 各メソッドの型定義を明確化し、XSD準拠型への移行を検討

---

## 📊 メソッド一覧

| No | メソッド名 | ファイル | 公開 | 優先度 | 状態 |
|----|-----------|---------|------|--------|------|
| 1 | extractInsertionFromProperties | [01_extractInsertionFromProperties.md](./01_extractInsertionFromProperties.md) | 非公開 | 🔴 高 | ✅ 分析完了 |
| 2 | convertPropertiesArrayToNestedFormat | [02_convertPropertiesArrayToNestedFormat.md](./02_convertPropertiesArrayToNestedFormat.md) | 非公開 | 🔴 高 | ✅ 分析完了 |
| 3 | convertPropertiesArrayToChildren | [03_convertPropertiesArrayToChildren.md](./03_convertPropertiesArrayToChildren.md) | 非公開 | 🔴 高 | ✅ 分析完了 |
| 4 | extractPetriNetStructure | [04_extractPetriNetStructure.md](./04_extractPetriNetStructure.md) | 公開 | 🟡 中 | ✅ 分析完了 |
| 5 | buildTemplateMap | [05_buildTemplateMap.md](./05_buildTemplateMap.md) | 公開 | 🟡 中 | ✅ 分析完了 |
| 6 | generateSubnetData | [06_generateSubnetData.md](./06_generateSubnetData.md) | 公開 | 🟢 低 | ✅ 分析完了 |

---

## 🎯 全体サマリー

### 分析結果

#### 🔴 優先度: 高（any型排除が必要）
- **メソッド1-3**: 型定義が不明確、any型を多用
- **対応**: ParsedProperty型を新規定義、既存型（NestedPropertyNode）を活用

#### 🟡 優先度: 中（型定義検証）
- **メソッド4-5**: 既存型定義あり、XSD型との整合性確認が必要
- **対応**: 既存型定義の検証のみ

#### 🟢 優先度: 低（対応不要）
- **メソッド6**: 型定義に問題なし
- **対応**: 変更不要

### 型定義戦略

#### 新規追加する型: ParsedProperty

```typescript
/**
 * パース後のProperty型（MaimlParserTypedの出力形式）
 * XSD準拠のProperty型とは異なる中間表現
 */
type ParsedProperty = {
  type?: string;
  xsiType?: string;
  key?: string;
  name?: string;
  tagName?: string;
  elements?: {
    uri?: { defaultValue?: string };
    hash?: { defaultValue?: string };
    format?: { defaultValue?: string };
    value?: { defaultValue?: any };
    description?: { defaultValue?: string };
    [key: string]: any;
  };
  defaultValue?: any;
  description?: string;
  units?: string;
  formatString?: string;
  scaleFactor?: number;
  properties?: ParsedProperty[];
  [key: string]: any;
};
```

**定義理由:**
- ✅ XSD型（Property）は`elements`プロパティを持たない
- ✅ 実装が使用する`prop.elements?.uri`構造に対応
- ✅ MaimlParserTypedの出力形式を正確に表現

#### 既存型を活用: NestedPropertyNode

```typescript
// editorv2/types/index.ts から
export interface NestedPropertyNode {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, any>;
  children: NestedPropertyNode[];
}
```

**活用理由:**
- ✅ 実装の構造と完全一致
- ✅ 既存のエディタ型定義を再利用
- ✅ 型安全性が保証される

---

## 📝 承認待ち事項

以下の型定義提案について承認をお願いします：

### 1. ParsedProperty型の新規定義
- XSD型とは別の中間型として定義
- `elements`プロパティを含む独自構造
- MaimlParserTypedの出力形式に対応

### 2. 既存型（NestedPropertyNode）の活用
- editorv2/typesの型を使用
- メソッド2, 3の戻り値型として使用

### 3. メソッド1-3の型定義変更
- パラメータ: `any[]` → `ParsedProperty[]`
- 戻り値: `any` → 明確な型定義

---

## 🔗 関連ファイル

### 型定義ファイル
- `frontend/src/types/maiml-unified.ts` - XSD準拠型定義
- `frontend/src/components/editorv2/types/index.ts` - エディタ型定義
- `frontend/src/utils/maimlParserTyped.ts` - パーサー実装

### 対象ファイル
- `frontend/src/utils/petriNetExtractor.ts` - 修正対象

---

## 📅 作業履歴

| 日時 | 作業内容 | 状態 |
|------|---------|------|
| 2025-02-04 08:27 | 統合レポート作成 | ✅ 完了 |
| 2025-02-04 08:29 | 型定義ファイル確認 | ✅ 完了 |
| 2025-02-04 08:30 | メソッド単位に分割 | ✅ 完了 |
| 2025-02-04 08:31 | ユーザー承認待ち | ⏳ 待機中 |

---

## 🚀 次のステップ

承認後の作業計画：

1. **Phase 1**: ParsedProperty型定義の実装
2. **Phase 2**: メソッド1-3の型定義修正
3. **Phase 3**: 型エラー解消確認
4. **Phase 4**: 統合テスト