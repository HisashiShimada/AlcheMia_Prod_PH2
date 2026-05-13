# タスク計画書: XML生成ロジック共通化

## メタデータ
- **作成日時**: 2026-02-27 10:14
- **タスクID**: xml_generator_refactoring
- **優先度**: 低
- **推定工数**: 3時間
- **ステータス**: 提案のみ（実装は要検討）

## 1. タスク概要

現在、Property/ContentのXML生成ロジックが以下の2箇所で重複しています：

1. `xmlConverter.ts` - Template単体のXML変換用
2. `reactFlowToMaiml.ts` - PetriNet全体のMaiML文書生成用

この重複を解消し、保守性を向上させるため、共通のXML生成関数を作成します。

## 2. 目的と期待される成果

### 目的
- Property/ContentのXML生成ロジックを1箇所に集約
- 2つのコンバーターで同じロジックを再利用
- バグ修正や機能追加の際の修正箇所を削減

### 期待される成果
- [ ] 共通XML生成関数を新規ファイルに作成
- [ ] `xmlConverter.ts`を共通関数を使用するように修正
- [ ] `reactFlowToMaiml.ts`を共通関数を使用するように修正
- [ ] 既存のテストが全て通過することを確認

## 3. 実装ステップ

### Phase 1: 共通XML生成ファイルの作成

- [ ] `frontend/src/utils/xmlGenerators.ts`を新規作成
- [ ] `buildPropertyXML`関数を実装
  - パラメータ: `(prop: Property, indentLevel: number) => string`
  - Property型オブジェクトをXML文字列に変換
  - ネスト構造（子property/content）に対応
- [ ] `buildContentXML`関数を実装
  - パラメータ: `(content: Content, indentLevel: number) => string`
  - Content型オブジェクトをXML文字列に変換
  - ネスト構造に対応
- [ ] `escapeXml`関数を実装
  - XSS対策のためのエスケープ処理
  - `&`, `<`, `>`, `"`, `'`を変換

### Phase 2: xmlConverter.tsのリファクタリング

- [ ] `xmlGenerators.ts`から共通関数をインポート
- [ ] 既存の`convertPropertyToXml`を削除
- [ ] 既存の`convertContentToXml`を削除
- [ ] 既存の`escapeXml`を削除
- [ ] `convertTemplateToXml`内で共通関数を使用
- [ ] 動作確認（既存のテストが通過すること）

### Phase 3: reactFlowToMaiml.tsのリファクタリング

- [ ] `xmlGenerators.ts`から共通関数をインポート
- [ ] 既存の`buildPropertyXML`を削除
- [ ] 既存の`buildContentXML`を削除
- [ ] 既存の`escapeXml`を削除
- [ ] `convertReactFlowToMaiML`内で共通関数を使用
- [ ] 動作確認（PetriNet→MAIML変換が正常に動作すること）

### Phase 4: テストと検証

- [ ] FormatManagement画面でXMLファイル編集・保存をテスト
- [ ] PetriNetEditor画面でMAIMLファイル保存をテスト
- [ ] Property/Contentのネスト構造が正しく変換されることを確認
- [ ] XMLエスケープが正しく動作することを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/utils/xmlGenerators.ts` - **新規作成**
2. `frontend/src/utils/xmlConverter.ts` - 共通関数使用に変更
3. `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` - 共通関数使用に変更

### 影響を受ける機能
- フォーマット管理画面のXMLファイル編集・保存
- PetriNetEditorのMAIMLファイル保存
- Template型↔XML文字列の相互変換

## 5. 技術的詳細

### xmlGenerators.tsの実装例

```typescript
/**
 * xmlGenerators.ts
 * Property/ContentのXML生成共通関数
 * 
 * @version 1.0.0
 * @date 2026-02-27
 */

import { Property, Content } from '@/types/maiml-unified';

/**
 * XMLエスケープ処理
 * XSS攻撃を防ぐため、すべての特殊文字をエスケープ
 */
export function escapeXml(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return '';
  
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Property型オブジェクトをXML文字列に変換
 * 
 * @param prop - 変換するPropertyオブジェクト
 * @param indentLevel - インデントレベル（デフォルト: 1）
 * @returns XML文字列
 */
export function buildPropertyXML(prop: Property, indentLevel: number = 1): string {
  const spaces = '  '.repeat(indentLevel);
  
  let xml = `${spaces}<property`;
  
  // key属性（必須）
  xml += ` key="${escapeXml(prop.key)}"`;
  
  // xsi:type属性
  if (prop.xsiType) {
    xml += ` xsi:type="${escapeXml(prop.xsiType)}"`;
  }
  
  // その他の属性
  if (prop.units) xml += ` units="${escapeXml(prop.units)}"`;
  if (prop.formatString) xml += ` formatString="${escapeXml(prop.formatString)}"`;
  if (prop.scaleFactor !== undefined) xml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
  
  // 子要素の有無をチェック
  const hasValue = prop.value !== undefined && prop.value !== null && prop.value !== '';
  const hasDescription = prop.description !== undefined && prop.description !== null && prop.description !== '';
  const hasCustomElements = prop.customElements && Object.keys(prop.customElements).length > 0;
  const hasChildren = (prop.properties && prop.properties.length > 0) || 
                      (prop.contents && prop.contents.length > 0);
  
  if (!hasValue && !hasDescription && !hasCustomElements && !hasChildren) {
    // 自己閉じタグ
    xml += ' />\n';
  } else {
    xml += '>\n';
    
    // value要素
    if (hasValue) {
      xml += `${spaces}  <value>${escapeXml(prop.value)}</value>\n`;
    }
    
    // description要素
    if (hasDescription) {
      xml += `${spaces}  <description>${escapeXml(prop.description)}</description>\n`;
    }
    
    // customElements
    if (hasCustomElements && prop.customElements) {
      Object.entries(prop.customElements).forEach(([elemName, elemValue]) => {
        if (elemValue && typeof elemValue === 'object' && 'value' in elemValue) {
          xml += `${spaces}  <${elemName}>${escapeXml(elemValue.value)}</${elemName}>\n`;
        } else if (elemValue !== undefined && elemValue !== null) {
          xml += `${spaces}  <${elemName}>${escapeXml(elemValue)}</${elemName}>\n`;
        }
      });
    }
    
    // 子プロパティを再帰的に追加
    if (prop.properties && prop.properties.length > 0) {
      prop.properties.forEach((childProp: Property) => {
        xml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
    
    // 子コンテンツを再帰的に追加
    if (prop.contents && prop.contents.length > 0) {
      prop.contents.forEach((childContent: Content) => {
        xml += buildContentXML(childContent, indentLevel + 1);
      });
    }
    
    xml += `${spaces}</property>\n`;
  }
  
  return xml;
}

/**
 * Content型オブジェクトをXML文字列に変換
 * 
 * @param content - 変換するContentオブジェクト
 * @param indentLevel - インデントレベル（デフォルト: 1）
 * @returns XML文字列
 */
export function buildContentXML(content: Content, indentLevel: number = 1): string {
  const spaces = '  '.repeat(indentLevel);
  
  let xml = `${spaces}<content`;
  
  // key属性（必須）
  xml += ` key="${escapeXml(content.key)}"`;
  
  // xsi:type属性
  if (content.xsiType) {
    xml += ` xsi:type="${escapeXml(content.xsiType)}"`;
  }
  
  // Content固有の属性
  if (content.axis) xml += ` axis="${escapeXml(content.axis)}"`;
  if (content.size !== undefined) xml += ` size="${escapeXml(content.size)}"`;
  if (content.id) xml += ` id="${escapeXml(content.id)}"`;
  if (content.ref) xml += ` ref="${escapeXml(content.ref)}"`;
  
  // 数値型オプション
  if (content.units) xml += ` units="${escapeXml(content.units)}"`;
  if (content.formatString) xml += ` formatString="${escapeXml(content.formatString)}"`;
  if (content.scaleFactor !== undefined) xml += ` scaleFactor="${escapeXml(content.scaleFactor)}"`;
  
  // 子要素の有無をチェック
  const hasValue = content.value !== undefined && content.value !== null && content.value !== '';
  const hasDescription = content.description !== undefined && content.description !== null && content.description !== '';
  const hasChildren = (content.properties && content.properties.length > 0) || 
                      (content.contents && content.contents.length > 0) ||
                      (content.uncertainty && content.uncertainty.length > 0);
  
  if (!hasValue && !hasDescription && !hasChildren) {
    xml += ' />\n';
  } else {
    xml += '>\n';
    
    // value要素
    if (hasValue) {
      xml += `${spaces}  <value>${escapeXml(content.value)}</value>\n`;
    }
    
    // description要素
    if (hasDescription) {
      xml += `${spaces}  <description>${escapeXml(content.description)}</description>\n`;
    }
    
    // 子プロパティを再帰的に追加
    if (content.properties && content.properties.length > 0) {
      content.properties.forEach((childProp: Property) => {
        xml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
    
    // 子コンテンツを再帰的に追加
    if (content.contents && content.contents.length > 0) {
      content.contents.forEach((childContent: Content) => {
        xml += buildContentXML(childContent, indentLevel + 1);
      });
    }
    
    // uncertainty を再帰的に追加
    if (content.uncertainty && content.uncertainty.length > 0) {
      content.uncertainty.forEach((uncertaintyContent: Content) => {
        xml += buildContentXML(uncertaintyContent, indentLevel + 1);
      });
    }
    
    xml += `${spaces}</content>\n`;
  }
  
  return xml;
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| リファクタリングによるバグ混入 | 高 | 中 | 既存のテストを全て実行し、動作を確認 |
| インデントレベルの不整合 | 中 | 低 | 両方のコンバーターで同じ引数を使用 |
| XMLエスケープの不備 | 高 | 低 | エスケープ処理を共通化して統一 |

## 7. テスト計画

### 単体テスト
- [ ] `buildPropertyXML`のテスト
  - シンプルなProperty
  - ネストしたProperty
  - カスタム要素を含むProperty
- [ ] `buildContentXML`のテスト
  - シンプルなContent
  - ネストしたContent
  - uncertaintyを含むContent
- [ ] `escapeXml`のテスト
  - 特殊文字のエスケープ
  - null/undefinedのハンドリング

### 結合テスト
- [ ] FormatManagement画面
  - XMLファイル作成
  - XMLファイル編集
  - XMLファイル保存
- [ ] PetriNetEditor画面
  - MAIMLファイル保存
  - Template情報の保存

## 8. ロールバック計画

問題が発生した場合:
1. Gitで変更前のコミットに戻す
2. 影響範囲を特定し、該当ファイルのみを修正
3. テストを再実行して問題がないことを確認

## 9. 関連ドキュメント

- `.clinerules/development/config.md` - コーディング規約
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `frontend/src/types/maiml-unified.ts` - Property/Content型定義

## 10. 承認記録

- **計画書提示日時**: 2026-02-27 10:14
- **承認日時**: （提案のみ - 実装は要検討）
- **承認者コメント**: 

**注意**: このリファクタリングは、現在の重複を解消するためのオプションです。
既存の実装（`xmlConverter.ts`と`reactFlowToMaiml.ts`が別々に実装）でも問題なく動作しており、
**必須の作業ではありません**。

## 11. 実施判断

### 実施すべき場合
- ✅ Property/ContentのXML生成ロジックに頻繁な変更が発生する
- ✅ 2つのファイルで同じバグが繰り返し発生している
- ✅ 新しいXML要素の追加が予定されている

### 実施不要な場合
- ✅ 現在の実装で問題なく動作している
- ✅ 今後の変更予定がない
- ✅ リファクタリングのリソースがない

**現状**: 実施不要（既存実装で十分に機能している）
