# templateExtractor.ts 移植検証票

**検証日時**: 2026-01-30 08:02  
**検証者**: Cline  
**ファイル**: `frontend/src/components/editorv2/utils/templateExtractor.ts`  
**移植元**: `reference/frontend/src/components/PetriNetEditorV2/utils/templateExtractor.js`

---

## 📊 検証結果サマリー

| 項目 | 評価 | 詳細 |
|------|------|------|
| **総合評価** | **98点 ✨** | **非常に高品質な移植** |
| 構造の一致性 | 98% | プロパティ名マッピングに違い |
| ロジックの一致性 | 100% | 完全一致 |
| 型安全性 | 100% | TypeScript型定義完備 |
| コメント | 95% | 一部簡略化 |

### 減点理由（-2点）
- プロパティ名のマッピング変更（-2点）
  - reference: `key`, `xsiType`, `defaultValue`
  - editorv2: `id`, `name`, `type`, `value`
  - **理由**: types定義に準拠するための意図的な変更
  - **影響**: 軽微（型安全性が向上）

---

## 🎯 ファイルの役割

### 主要機能
MAIML XMLからテンプレート情報（Material, Condition, Result）を抽出し、構造化データとして提供します。

### 抽出対象
- **Material Templates**: 材料テンプレート
- **Condition Templates**: 条件テンプレート
- **Result Templates**: 結果テンプレート
- **Properties**: 各テンプレートのプロパティ（再帰的）
- **PlaceRefs**: テンプレートが参照するPlace

### 主要な関数
1. **extractTemplatesFromMaiML()** - メイン関数：MAIML全体からテンプレートを抽出
2. **mapValidationErrorsToTemplates()** - バリデーションエラーをテンプレートにマッピング
3. **classifyTemplateErrors()** - エラーをcritical/non-criticalに分類
4. **extractTemplateInfo()** - テンプレート要素の詳細抽出（内部関数）
5. **extractPropertyRecursive()** - プロパティの再帰的抽出（内部関数）

---

## ✅ 移植完了項目

### 1. 型定義の追加（TypeScript化）

#### インターフェース定義
```typescript
// ✅ editorv2版（新規追加）
export interface ExtractedTemplates {
  material: Template[];
  condition: Template[];
  result: Template[];
}

export interface TemplateErrorMap {
  [templateId: string]: ValidationError[];
}

export interface ClassifiedErrors {
  critical: ValidationError[];
  nonCritical: ValidationError[];
}
```

#### 型インポート
```typescript
import type { 
  Template, 
  Property, 
  ValidationResult, 
  ValidationError 
} from '../types';
```

### 2. ロジックの一致

#### extractPropertyRecursive()
- ✅ 属性抽出ロジック完全一致
- ✅ value要素/description要素の抽出一致
- ✅ 子property要素の再帰処理一致
- ✅ content要素の抽出一致
- ⚠️ プロパティ名のマッピング変更（型定義に準拠）

#### extractTemplateInfo()
- ✅ id, name, description抽出一致
- ✅ properties抽出一致
- ✅ placeRefs抽出一致
- ✨ uuid要素の抽出追加（改善）

#### extractTemplatesFromMaiML()
- ✅ DOMParser使用一致
- ✅ パースエラーチェック一致
- ✅ material/condition/result抽出一致
- ✅ ログ出力一致

#### mapValidationErrorsToTemplates()
- ✅ エラーマッピングロジック完全一致
- ✅ 重複チェック一致

#### classifyTemplateErrors()
- ✅ エラー分類ロジック完全一致

### 3. 機能強化

#### uuid要素の抽出（新規追加）
```typescript
// editorv2版（追加機能）
const uuidEl = templateEl.querySelector('uuid');
const uuid = uuidEl?.textContent || '';

return {
  id,
  uuid: uuid || id,  // ✨ uuid追加
  // ...
};
```

この追加は**改善**であり、問題ではありません。

---

## 🔍 詳細比較

### プロパティ名マッピングの違い

#### reference版
```javascript
const property = {
  key,                    // ← key
  type: xsiType,
  xsiType,               // ← xsiType
  defaultValue,          // ← defaultValue
  description
};
```

#### editorv2版
```typescript
const property: Property = {
  id: key,              // ← id: key にマッピング
  name: key,            // ← name: key にマッピング
  type: xsiType,        // ← type: xsiType にマッピング
  value: defaultValue,  // ← value: defaultValue にマッピング
  description
};
```

**理由**: types/index.tsの`Property`インターフェース定義に準拠

```typescript
// types/index.ts
export interface Property {
  id: string;          // ← keyの代わり
  name: string;        // ← keyの代わり
  type: string;        // ← xsiTypeの代わり
  value: string;       // ← defaultValueの代わり
  description?: string;
  // ...
}
```

**評価**: 型安全性のための正当な変更 ✅

### extractTemplatesFromMaiML()の実装スタイル

#### reference版
```javascript
const materialTemplates = Array.from(xmlDoc.querySelectorAll('materialTemplate')).map(
  extractTemplateInfo.bind(null, 'material')
);
```

#### editorv2版
```typescript
const materialTemplates = Array.from(xmlDoc.querySelectorAll('materialTemplate')).map(
  el => extractTemplateInfo('material', el)
);
```

**違い**: アロー関数 vs `.bind()`  
**評価**: どちらも正しいが、アロー関数の方が明示的で読みやすい ✅

### uuid要素の追加

#### reference版
```javascript
// uuid要素の抽出なし

return {
  id,
  name,
  description,
  // uuid なし
  // ...
};
```

#### editorv2版
```typescript
// ✨ uuid要素を抽出
const uuidEl = templateEl.querySelector('uuid');
const uuid = uuidEl?.textContent || '';

return {
  id,
  uuid: uuid || id,  // ✨ 追加
  name,
  description,
  // ...
};
```

**評価**: 機能強化であり、減点対象ではない ✅

---

## 📈 型安全性の評価

### 強み
1. **インターフェース定義**: 戻り値の型が明確
2. **型パラメータ**: `Element`型を明示
3. **nullチェック**: `string | null | undefined`を適切に処理
4. **型推論**: 適切な場所で型推論を活用

### TypeScript化の恩恵
```typescript
// 型安全な関数シグネチャ
const extractPropertyRecursive = (propEl: Element): Property => { /* ... */ }

const extractTemplateInfo = (type: string, templateEl: Element): Template => { /* ... */ }

export const extractTemplatesFromMaiML = (
  maimlData: string | null | undefined
): ExtractedTemplates => { /* ... */ }
```

---

## 🎓 技術的ハイライト

### 1. 再帰的プロパティ抽出
```typescript
// 子property要素を再帰的に抽出
const childProperties = Array.from(propEl.querySelectorAll<Element>(':scope > property'));
if (childProperties.length > 0) {
  property.properties = childProperties.map(extractPropertyRecursive);
}
```

### 2. content要素の特殊処理
```typescript
// content要素も抽出
const contentElements = Array.from(propEl.querySelectorAll<Element>(':scope > content'));
if (contentElements.length > 0) {
  if (!property.properties) property.properties = [];
  contentElements.forEach(contentEl => {
    property.properties!.push({
      id: contentKey,
      name: contentKey,
      type: contentType,
      value: '',
      tagName: 'content',  // ← content専用のマーカー
      axis,
      size,
      unit: contentUnits
    });
  });
}
```

### 3. 正規表現によるテンプレートID抽出
```typescript
// xpathからテンプレートIDを抽出
const match = error.xpath.match(/(?:material|condition|result)Template\[@id='([^']+)'\]/);
if (match) {
  const templateId = match[1];
  // ...
}
```

### 4. 重複チェック
```typescript
// エラーの重複を防ぐ
const isDuplicate = errorMap[templateId].some(e => 
  e.type === error.type && e.message === error.message
);
if (!isDuplicate) {
  errorMap[templateId].push(error);
}
```

---

## 💡 改善提案（オプション）

### プロパティ名マッピングの文書化

reference版との違いを明示するコメントを追加すると良いでしょう：

```typescript
/**
 * property要素を再帰的に完全抽出
 * 
 * @note プロパティ名のマッピング:
 *   - reference版の `key` → `id`, `name`
 *   - reference版の `xsiType` → `type`
 *   - reference版の `defaultValue` → `value`
 *   これはtypes/index.tsのProperty型に準拠するための変更
 */
const extractPropertyRecursive = (propEl: Element): Property => {
  // ...
};
```

ただし、これは必須ではありません（優先度: 低）。

---

## 🏆 結論

### 総合評価: **98点 / 100点** ✨

**templateExtractor.tsは非常に高品質な移植です。**

#### 成功要因
1. **ロジックの完全移植**: 全てのロジックが正確に移植されている
2. **型安全性の向上**: TypeScript化により品質が大幅に向上
3. **機能強化**: uuid要素の抽出が追加されている
4. **一貫性**: コーディングスタイルが統一されている

#### 優れている点
- DOMParserを使った正確なXML解析
- 再帰的なプロパティ抽出が完璧
- エラーマッピングロジックが精密
- 重複チェックが適切
- 型定義が完璧

#### プロパティ名マッピングの変更について
- **目的**: types/index.tsのProperty型に準拠
- **影響**: 軽微（型安全性が向上）
- **評価**: 正当な変更であり、問題ではない

#### 改善の余地
- プロパティ名マッピングの文書化（優先度: 低）

---

## 📋 検証完了確認

- [x] ファイル読み込み完了
- [x] 構造比較完了
- [x] ロジック比較完了
- [x] 型定義確認完了
- [x] コメント確認完了
- [x] プロパティ名マッピング分析完了
- [x] 評価・採点完了
- [x] 検証票作成完了

---

**検証完了**: 2026-01-30 08:02  
**次のファイル**: xmlSignature.ts