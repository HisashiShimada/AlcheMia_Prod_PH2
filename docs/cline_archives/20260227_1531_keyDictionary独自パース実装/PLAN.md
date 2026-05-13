# タスク計画書: keyDictionary独自パース実装

## メタデータ
- **作成日時**: 2026-02-27 15:31
- **タスクID**: keydictionary-custom-parser
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

フォーマット管理画面でXMLファイルを編集後、再度編集しようとすると「不明なテンプレートタイプ: keyDictionary」というエラーが発生する問題を、`xmlConverter.ts`を使用せずに独自パース処理を実装することで解決します。

## 2. 目的と期待される成果

### 目的
- `xmlConverter.ts`に依存しない独自のkeyDictionaryパース処理を実装
- keyDictionary形式のXMLを維持
- 将来的に`xmlConverter.ts`を削除しやすくする

### 期待される成果
- [ ] FormatEditorDialog内にkeyDictionary専用パース関数を実装
- [ ] FormatManagement.tsxの再編集処理を修正
- [ ] 編集→保存→再編集のフローが正常に動作する
- [ ] xmlConverter.tsへの依存を削除

## 3. 問題の詳細

### 現在の状況

**保存形式（keyDictionary）:**
```xml
<keyDictionary xmlns="http://abc.com/schema/keyDictionary/{s3_path}" xmlns:xsi="...">
  <property key="prop1" xsi:type="stringType">
    <value>値1</value>
  </property>
  <property key="prop2" xsi:type="propertyListType">
    <property key="child1" xsi:type="stringType">
      <value>子要素</value>
    </property>
  </property>
  <content key="content1" xsi:type="stringType">
    <value>コンテンツ</value>
  </content>
</keyDictionary>
```

**問題点:**
- 再編集時に`convertXmlToTemplate()`を呼び出している
- `convertXmlToTemplate()`がkeyDictionaryを認識できない
- `xmlConverter.ts`に依存している

**要件:**
- ✅ keyDictionary形式を維持する必要がある
- ✅ `xmlConverter.ts`は将来的に削除したい

## 4. 実装ステップ

### Phase 1: keyDictionaryパース関数の実装
- [ ] `frontend/src/components/editorv2/utils/keyDictionaryParser.ts`を新規作成
- [ ] `parseKeyDictionaryXml()`関数を実装
- [ ] property要素を再帰的にパース
- [ ] content要素を再帰的にパース
- [ ] PropertyData形式に変換

### Phase 2: FormatManagement.tsxの修正
- [ ] 再編集時の処理から`convertXmlToTemplate()`の呼び出しを削除
- [ ] 代わりに`parseKeyDictionaryXml()`を呼び出し
- [ ] パース結果をFormatEditorDialogに直接渡す

### Phase 3: テスト・検証
- [ ] 新規XMLファイル作成 → 保存 → 再編集の動作確認
- [ ] ネストしたproperty要素の正常なパース確認
- [ ] content要素の正常なパース確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/utils/keyDictionaryParser.ts` - 新規作成
2. `frontend/src/components/project/FormatManagement.tsx` - 再編集処理を修正

### 影響を受ける機能
- フォーマット管理画面のXML再編集処理のみ
- 保存処理は変更なし

## 6. 技術的詳細

### 新規ファイル: keyDictionaryParser.ts

```typescript
// frontend/src/components/editorv2/utils/keyDictionaryParser.ts

import { PropertyData } from '../components/NestedPropertyEditor';

/**
 * keyDictionary形式のXMLをPropertyData形式にパース
 * 
 * @param xmlContent - keyDictionary形式のXML文字列
 * @returns パース結果（properties, contents）
 */
export function parseKeyDictionaryXml(xmlContent: string): {
  properties: Record<string, PropertyData>;
  contents: Record<string, PropertyData>;
} {
  // DOMParserでXMLをパース
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
  
  // パースエラーをチェック
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('XMLパースエラー: ' + (parserError.textContent || '不明なエラー'));
  }
  
  // ルート要素を取得
  const rootElement = xmlDoc.documentElement;
  
  if (rootElement.tagName !== 'keyDictionary') {
    throw new Error(`期待しないルート要素: ${rootElement.tagName}`);
  }
  
  // properties を解析
  const properties: Record<string, PropertyData> = {};
  const propertyElements = rootElement.querySelectorAll(':scope > property');
  propertyElements.forEach(propElement => {
    const propertyData = parsePropertyElement(propElement as Element);
    if (propertyData) {
      properties[propertyData.key] = propertyData;
    }
  });
  
  // contents を解析
  const contents: Record<string, PropertyData> = {};
  const contentElements = rootElement.querySelectorAll(':scope > content');
  contentElements.forEach(contentElement => {
    const contentData = parsePropertyElement(contentElement as Element);
    if (contentData) {
      contents[contentData.key] = contentData;
    }
  });
  
  return { properties, contents };
}

/**
 * property要素またはcontent要素をPropertyData形式にパース（再帰的）
 * 
 * @param element - property要素またはcontent要素（DOM Element）
 * @returns PropertyData
 */
function parsePropertyElement(element: Element): PropertyData | null {
  // key属性を取得
  const key = element.getAttribute('key');
  if (!key) {
    console.warn('key属性がない要素をスキップ:', element);
    return null;
  }
  
  // tagName を取得
  const tagName = element.tagName;
  
  // 属性を取得
  const attributes: Record<string, string> = {};
  Array.from(element.attributes).forEach(attr => {
    if (attr.name !== 'key') {
      attributes[attr.name] = attr.value;
    }
  });
  
  // 要素を取得（value, description など）
  const elements: Record<string, string> = {};
  const elementChildren = Array.from(element.children).filter(
    child => child.tagName !== 'property' && child.tagName !== 'content'
  );
  elementChildren.forEach(child => {
    elements[child.tagName] = child.textContent || '';
  });
  
  // 子property/content要素を再帰的に解析
  const children: PropertyData[] = [];
  const childPropertyElements = Array.from(element.children).filter(
    child => child.tagName === 'property' || child.tagName === 'content'
  );
  childPropertyElements.forEach(childElement => {
    const childData = parsePropertyElement(childElement as Element);
    if (childData) {
      children.push(childData);
    }
  });
  
  return {
    key,
    tagName,
    attributes,
    elements,
    children
  };
}
```

### FormatManagement.tsxの修正

**修正前:**
```typescript
// ❌ 現在: convertXmlToTemplateを使用
try {
  const { convertXmlToTemplate } = await import('@/utils/xmlConverter');
  parsedTemplate = convertXmlToTemplate(xmlContent);
  console.log('✅ [FormatManagement] XMLパース成功:', {
    id: parsedTemplate.id,
    name: parsedTemplate.name,
    propertiesCount: parsedTemplate.properties?.length || 0
  });
} catch (parseError) {
  console.error('❌ [FormatManagement] XMLパースエラー:', parseError);
  message.error('XMLファイルの解析に失敗しました: ' + (parseError as Error).message);
  return;
}
```

**修正後:**
```typescript
// ✅ 修正後: 独自パース処理を使用
try {
  const { parseKeyDictionaryXml } = await import('@/components/editorv2/utils/keyDictionaryParser');
  const parsed = parseKeyDictionaryXml(xmlContent);
  
  console.log('✅ [FormatManagement] keyDictionary XMLパース成功:', {
    propertiesCount: Object.keys(parsed.properties).length,
    contentsCount: Object.keys(parsed.contents).length
  });
  
  // パース結果を直接editingXmlFileに設定
  setEditingXmlFile({
    ...file,
    content: xmlContent,
    parsedProperties: parsed.properties,
    parsedContents: parsed.contents,
    isNewFile: false
  });
  setShowTemplateEditor(true);
  
} catch (parseError) {
  console.error('❌ [FormatManagement] XMLパースエラー:', parseError);
  message.error('XMLファイルの解析に失敗しました: ' + (parseError as Error).message);
  return;
}
```

### FormatEditorDialogの初期化処理修正

**修正箇所:**
```typescript
// FormatEditorDialog.tsx の useEffect内

// ✅ 修正: parsedPropertiesとparsedContentsを直接使用
if (editingXmlFile?.parsedProperties) {
  setProperties(editingXmlFile.parsedProperties);
}
if (editingXmlFile?.parsedContents) {
  setContents(editingXmlFile.parsedContents);
}
```

## 7. 型定義の追加

### FormatFileDetailData型の拡張

```typescript
// frontend/src/components/project/FormatFileDetailModal.tsx

export interface FormatFileDetailData {
  // ... 既存のフィールド ...
  content?: string;
  parsedTemplate?: Template;
  
  // ✅ 新規追加
  parsedProperties?: Record<string, PropertyData>;
  parsedContents?: Record<string, PropertyData>;
  
  isNewFile?: boolean;
}
```

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| パース処理の不具合 | 中 | 中 | 十分なテストケースで検証 |
| ネストした構造のパース失敗 | 中 | 低 | 再帰処理を慎重に実装 |
| 属性の欠落 | 低 | 低 | xsi:type等の重要な属性を確実に取得 |

## 9. テスト計画

### 単体テスト
- [ ] シンプルなproperty要素のパース
- [ ] ネストしたproperty要素のパース
- [ ] content要素のパース
- [ ] 属性（xsi:type等）の正常な取得
- [ ] 要素（value, description等）の正常な取得

### 統合テスト
- [ ] フォーマット管理画面で新規XMLファイル作成
- [ ] プロパティを追加して保存
- [ ] 再度編集ボタンをクリック
- [ ] エラーが発生せず、FormatEditorDialogが開く
- [ ] プロパティが正しく表示される
- [ ] ネストした構造が正しく表示される
- [ ] 再度編集・保存が可能

### エッジケース
- [ ] 空のkeyDictionary（propertyもcontentもない）
- [ ] key属性がない要素（スキップされる）
- [ ] 深くネストした構造（5階層以上）
- [ ] 特殊文字を含むvalue要素

## 10. 実装順序

1. **keyDictionaryParser.ts作成** (30分)
   - parseKeyDictionaryXml関数実装
   - parsePropertyElement関数実装（再帰）
   - 簡易的な単体テスト

2. **FormatManagement.tsx修正** (15分)
   - convertXmlToTemplate呼び出しを削除
   - parseKeyDictionaryXml呼び出しに変更
   - パース結果の設定処理修正

3. **FormatEditorDialog.tsx修正** (15分)
   - useEffect内の初期化処理を修正
   - parsedProperties/parsedContentsを使用

4. **テスト・検証** (30分)
   - 各種パターンでの動作確認
   - エッジケースの確認

## 11. 承認記録

- **計画書提示日時**: 2026-02-27 15:31
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

## 12. 実施記録

### 実施日時
開始: （作業開始時記入）
完了: （作業完了時記入）

### 計画からの変更点
（作業中に記入）

### 発生した問題と解決方法
（作業中に記入）

### 最終的な成果物
- [ ] `frontend/src/components/editorv2/utils/keyDictionaryParser.ts` - 新規作成
- [ ] `frontend/src/components/project/FormatManagement.tsx` - 修正完了
- [ ] 動作確認完了

## 13. 振り返り

### うまくいった点
（完了後記入）

### 改善が必要な点
（完了後記入）

### 学んだこと
（完了後記入）
