# タスク計画書: 名前空間テンプレートXMLのパース機能追加

## メタデータ
- **作成日時**: 2026-02-05 16:19
- **タスクID**: namespace_xml_parse_property_extension
- **優先度**: 高
- **推定工数**: 3時間

---

## 1. タスク概要

名前空間テンプレートXML（例: `CTAdvanced.xml`）を読み込み、XSD準拠のProperty型の配列に変換するメソッドを`maimlParserTyped.ts`に追加します。

### 背景
- CTAdvanced.xmlのような名前空間定義ファイルには、`<property>`タグ内に**任意の名前を持つ子要素**（`<wavelength>`, `<power>`等）が含まれる
- 現在のProperty型定義では、このような自由なタグ名の要素を表現できない
- TemplateEditorDialog.tsxには既に`parseNamespacesFromXml`メソッドが実装されているが、独自のPropertyData型を使用している

### 問題の具体例

**CTAdvanced.xmlの構造:**
```xml
<property key="LaserParameters" xsi:type="objectType">
  <wavelength units="nm">532</wavelength>
  <power units="mW">10.5</power>
  <beamDiameter units="μm">1.2</beamDiameter>
  <polarization>linear</polarization>
  <description>レーザーパラメータ</description>
  <calibration>
    <date>2024-11-15</date>
    <certificate>LASER-CAL-2024-089</certificate>
  </calibration>
</property>
```

**問題点:**
- `<wavelength>`, `<power>`等のカスタムタグ名を持つ要素が存在
- これらは`value`や`description`とは異なる、**Property仕様外の自由な子要素**
- 現在のProperty型では表現不可能

---

## 2. 目的と期待される成果

### 目的
1. Property型を拡張し、任意の名前を持つ子要素を表現可能にする
2. maimlParserTyped.tsに名前空間XMLパース機能を追加
3. TemplateEditorDialog.tsxの既存実装を統合・整理

### 期待される成果
- [ ] Property型の拡張完了（カスタム要素対応）
- [ ] maimlParserTyped.tsに`parseNamespaceXml`メソッド追加
- [ ] 既存の`parseNamespacesFromXml`との統合方針決定
- [ ] ユニットテスト追加

---

## 3. 実装ステップ

### Phase 1: Property型の拡張設計（30分）

**調査項目:**
1. ✅ CTAdvanced.xmlの詳細構造分析（完了）
2. ✅ TemplateEditorDialog.tsxのPropertyData型を分析（完了）
3. ⏸️ XSD仕様との整合性確認
4. ⏸️ 拡張方法の決定（互換性維持）

**Property型の拡張案:**

```typescript
/**
 * Property統一型（拡張版）
 * 
 * 🆕 Phase 2拡張:
 * - customElements: 任意のタグ名を持つ子要素を辞書形式で保持
 * - ネスト構造の完全サポート
 */
export interface Property {
  /** プロパティキー（必須） */
  key: string;
  
  /** プロパティ型（必須） */
  xsiType: string;
  
  /** プロパティの説明（オプション） */
  description?: string;
  
  // ============================================================================
  // 標準の値プロパティ
  // ============================================================================
  
  /** 単一値（文字列・数値・真偽値） */
  value?: string | number | boolean;
  
  /** ネスト構造（propertyListType用） */
  properties?: Property[];
  
  /** Content配列 */
  contents?: Content[];
  
  // ============================================================================
  // 🆕 カスタム要素（任意のタグ名を持つ子要素）
  // ============================================================================
  
  /**
   * カスタム要素の辞書
   * 
   * キー: タグ名（例: "wavelength", "power", "calibration"）
   * 値: PropertyCustomElement型
   * 
   * @example
   * ```typescript
   * {
   *   wavelength: {
   *     value: "532",
   *     attributes: { units: "nm" }
   *   },
   *   calibration: {
   *     children: {
   *       date: { value: "2024-11-15" },
   *       certificate: { value: "LASER-CAL-2024-089" }
   *     }
   *   }
   * }
   * ```
   */
  customElements?: Record<string, PropertyCustomElement>;
  
  // ============================================================================
  // 数値型オプション
  // ============================================================================
  
  /** 単位 */
  units?: string;
  
  /** フォーマット文字列 */
  formatString?: string;
  
  /** スケールファクター */
  scaleFactor?: number;
}

/**
 * Property カスタム要素型
 * 
 * 任意のタグ名を持つ子要素を表現
 */
export interface PropertyCustomElement {
  /** 要素の値（テキストノード） */
  value?: string | number | boolean;
  
  /** 要素の属性 */
  attributes?: Record<string, string>;
  
  /** 子要素（ネスト構造） */
  children?: Record<string, PropertyCustomElement>;
}
```

**互換性の考慮:**
- 既存のProperty型のフィールドは変更しない
- `customElements`フィールドを追加（オプショナル）
- 既存コードへの影響を最小化

---

### Phase 2: maimlParserTyped.tsへのメソッド追加（1時間）

**実装メソッド:**

```typescript
/**
 * 名前空間テンプレートXMLをパース
 * 
 * keyDictionary形式のXMLファイルから、Property配列を抽出します。
 * 
 * @param xmlContent - 名前空間XML文字列
 * @returns Property配列
 * @throws {Error} XML解析エラー
 * 
 * @example
 * ```typescript
 * const xmlContent = fs.readFileSync('CTAdvanced.xml', 'utf-8');
 * const properties = parser.parseNamespaceXml(xmlContent);
 * console.log(properties); // Property[]
 * ```
 */
parseNamespaceXml(xmlContent: string): Property[] {
  // 実装内容は Phase 2で詳細化
}

/**
 * PropertyCustomElementを再帰的に解析
 * 
 * @param element - xml-js Element
 * @returns PropertyCustomElement
 * @private
 */
private parseCustomElement(element: XmlJsElement): PropertyCustomElement {
  // 実装内容は Phase 2で詳細化
}
```

**解析ロジック:**

1. **ルート要素の特定**
   - `<keyDictionary>`をルートとして認識
   - 名前空間属性を確認

2. **property要素の抽出**
   - `keyDictionary/property`を全て取得
   - 各propertyを個別に解析

3. **属性の抽出**
   - `key`, `xsi:type`, `units`等の標準属性
   - カスタム属性も保持

4. **子要素の分類**
   - **標準要素**: `<description>`, `<value>` → Property.description, Property.value
   - **カスタム要素**: それ以外 → Property.customElements

5. **ネスト構造の処理**
   - カスタム要素内にさらに子要素がある場合
   - 再帰的に`PropertyCustomElement`として解析

**TemplateEditorDialog.tsxとの統合:**
- 既存の`parseNamespacesFromXml`は`PropertyData`型を使用
- 新しい`parseNamespaceXml`は拡張Property型を使用
- TemplateEditorDialog.tsx側で変換ロジックを追加（Phase 3）

---

### Phase 3: TemplateEditorDialog.tsxの統合（1時間）

**統合方針:**

1. **maimlParserTyped.parseNamespaceXmlを使用**
   ```typescript
   const handleImportNamespace = async () => {
     const xmlContent = await fetchTemplateContent(...);
     
     // 🆕 maimlParserTypedを使用
     const parser = new MaimlParserTyped(dummyMaiml); // 一時的なインスタンス
     const properties = parser.parseNamespaceXml(xmlContent);
     
     // Property[] → PropertyData変換
     const propertyDataMap = convertPropertiesToPropertyData(properties);
     
     setProperties(prev => ({ ...prev, ...propertyDataMap }));
   };
   ```

2. **変換ヘルパー関数を追加**
   ```typescript
   /**
    * Property[] → PropertyData変換
    * 
    * @param properties - Property配列
    * @returns PropertyData辞書
    */
   function convertPropertiesToPropertyData(
     properties: Property[]
   ): Record<string, PropertyData> {
     const result: Record<string, PropertyData> = {};
     
     properties.forEach(prop => {
       result[prop.key] = {
         key: prop.key,
         tagName: 'property',
         attributes: {
           'xsi:type': prop.xsiType,
           ...(prop.units && { units: prop.units }),
           ...(prop.formatString && { formatString: prop.formatString }),
           ...(prop.scaleFactor && { scaleFactor: String(prop.scaleFactor) })
         },
         elements: {
           ...(prop.description && { description: prop.description }),
           ...(prop.value !== undefined && { value: String(prop.value) })
         },
         children: convertCustomElementsToChildren(prop.customElements)
       };
     });
     
     return result;
   }
   ```

3. **既存のparseNamespacesFromXmlを段階的に置き換え**
   - Phase 3では共存
   - Phase 4で完全移行

---

### Phase 4: テストとドキュメント（30分）

**テストケース:**

1. **CTAdvanced.xmlのパース**
   ```typescript
   test('CTAdvanced.xmlを正しくパース', () => {
     const xmlContent = fs.readFileSync('CTAdvanced.xml', 'utf-8');
     const parser = new MaimlParserTyped(dummyMaiml);
     const properties = parser.parseNamespaceXml(xmlContent);
     
     expect(properties).toHaveLength(4);
     expect(properties[0].key).toBe('LaserParameters');
     expect(properties[0].customElements?.wavelength.value).toBe('532');
     expect(properties[0].customElements?.wavelength.attributes?.units).toBe('nm');
   });
   ```

2. **ネスト構造のパース**
   ```typescript
   test('ネスト構造を正しく処理', () => {
     const prop = properties.find(p => p.key === 'LaserParameters');
     expect(prop?.customElements?.calibration.children?.date.value).toBe('2024-11-15');
   });
   ```

3. **エラーハンドリング**
   ```typescript
   test('不正なXMLでエラー', () => {
     expect(() => {
       parser.parseNamespaceXml('<invalid>xml</invalid>');
     }).toThrow();
   });
   ```

**ドキュメント更新:**
- `maimlParserTyped.ts`のJSDocコメント
- `maiml-unified.ts`の型定義コメント
- `docs/`にProperty拡張仕様書を追加

---

## 4. 影響範囲

### 変更するファイル
1. **frontend/src/types/maiml-unified.ts** - Property型の拡張
   - PropertyCustomElement型の追加
   - Property.customElementsフィールド追加

2. **frontend/src/utils/maimlParserTyped.ts** - パースメソッド追加
   - parseNamespaceXml()メソッド
   - parseCustomElement()プライベートメソッド

3. **frontend/src/components/editorv2/components/TemplateEditorDialog.tsx** - 統合
   - convertPropertiesToPropertyData()ヘルパー追加
   - handleImportNamespace()の更新

### 新規作成するファイル
1. **docs/design/property_custom_elements_spec.md** - Property拡張仕様書

### 影響を受ける機能
- TemplateEditorDialog: 名前空間取り込み機能
- maimlParserTyped: 既存メソッドへの影響なし（新規メソッド追加のみ）

---

## 5. 技術的詳細

### xml-js使用方法

```typescript
import { xml2js, Element as XmlJsElement } from 'xml-js';

const result = xml2js(xmlContent, { 
  compact: false,  // ⚠️ compactモードは使用しない
  ignoreComment: true,
  alwaysChildren: true 
}) as XmlJsElement;

// Element構造:
// {
//   type: 'element',
//   name: 'property',
//   attributes: { key: 'LaserParameters', 'xsi:type': 'objectType' },
//   elements: [
//     { type: 'element', name: 'wavelength', attributes: {...}, elements: [...] },
//     { type: 'text', text: '532' }
//   ]
// }
```

### カスタム要素の判定ロジック

```typescript
function isStandardPropertyElement(tagName: string): boolean {
  const standardTags = [
    'description',
    'value',
    'values',
    'property',
    'content',
    'uncertainty'
  ];
  return standardTags.includes(tagName);
}

function parsePropertyElement(element: XmlJsElement): Property {
  const prop: Property = {
    key: element.attributes?.key || '',
    xsiType: element.attributes?.['xsi:type'] || 'stringType',
    customElements: {}
  };
  
  element.elements?.forEach(child => {
    if (child.type !== 'element') return;
    
    const tagName = child.name;
    
    if (isStandardPropertyElement(tagName)) {
      // 標準要素として処理
      if (tagName === 'description') {
        prop.description = extractTextContent(child);
      } else if (tagName === 'value') {
        prop.value = extractTextContent(child);
      }
      // ...
    } else {
      // カスタム要素として処理
      prop.customElements![tagName] = parseCustomElement(child);
    }
  });
  
  return prop;
}
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Property型の互換性破壊 | 高 | 低 | customElementsをオプショナルにし、既存フィールドは変更しない |
| TemplateEditorDialog.tsxでの型不整合 | 中 | 中 | 変換ヘルパー関数を提供し、PropertyData型との相互変換を確保 |
| CTAdvanced.xml以外の形式に対応できない | 中 | 中 | ルート要素の判定ロジックを柔軟にする |
| ネスト構造の深さ制限 | 低 | 低 | 再帰処理に深さ制限を設ける（最大10階層） |

---

## 7. テスト計画

### ユニットテスト

**maimlParserTyped.ts:**
- [ ] parseNamespaceXml() - 正常系
- [ ] parseNamespaceXml() - エラー系（不正なXML）
- [ ] parseCustomElement() - ネスト構造
- [ ] parseCustomElement() - 属性抽出

**型定義テスト:**
- [ ] Property型の拡張が既存コードと互換性がある
- [ ] PropertyCustomElement型が正しく機能する

### 統合テスト
- [ ] TemplateEditorDialog.tsxでの名前空間取り込み
- [ ] Property[] → PropertyData変換の正確性

### 手動テスト
- [ ] CTAdvanced.xmlファイルを実際に取り込み
- [ ] NestedPropertyEditorで正しく表示される
- [ ] 保存後にMAIML XMLとして正しく出力される

---

## 8. ロールバック計画

**Phase 1完了後:**
- 型定義の拡張のみ → 既存コードへの影響なし

**Phase 2完了後:**
- 新規メソッド追加のみ → 既存メソッドは未変更

**Phase 3完了後:**
- TemplateEditorDialog.tsxの変更を差し戻し
- 既存のparseNamespacesFromXmlに戻す

**Phase 4完了後:**
- テスト失敗時は該当Phaseまで戻す

---

## 9. 関連ドキュメント

- [maiml-unified.ts](../frontend/src/types/maiml-unified.ts) - Property型定義
- [maimlParserTyped.ts](../frontend/src/utils/maimlParserTyped.ts) - パーサー実装
- [TemplateEditorDialog.tsx](../frontend/src/components/editorv2/components/TemplateEditorDialog.tsx) - 名前空間取り込みUI
- [CTAdvanced.xml](../reference/specification/CTAdvanced.xml) - サンプルXML

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-05 16:19
- **承認日時**: 2026-02-05 16:30
- **承認者コメント**: 承認、実装開始

---

## 11. 実施記録

### 実施日時
開始: 2026-02-05 16:30  
完了: （実施中）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] Property型の拡張完了
- [ ] maimlParserTyped.parseNamespaceXml()実装完了
- [ ] TemplateEditorDialog.tsx統合完了
- [ ] ユニットテスト完了

---

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）