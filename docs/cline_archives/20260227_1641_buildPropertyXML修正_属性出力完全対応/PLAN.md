# タスク計画書: buildPropertyXML関数修正 - 属性出力完全対応

## メタデータ
- **作成日時**: 2026-02-27 16:41
- **タスクID**: buildPropertyXML_attribute_fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

フォーマット管理画面でXMLファイルを編集・保存する際、PropertyDataの属性（`key`, `scaleFactor`, `id`, `ref`など）が正しくXMLに反映されない問題を修正します。

## 2. 目的と期待される成果

### 目的
`buildPropertyXML`関数において、PropertyDataの`attributes`オブジェクトに設定されたすべての属性を正しくXML出力できるようにする。

### 期待される成果
- [x] 問題の根本原因を特定（完了）
- [ ] `buildPropertyXML`関数を修正
- [ ] `buildContentXML`関数も同様に修正（必要に応じて）
- [ ] 修正後の動作確認

## 3. 問題の詳細

### 発生している問題

ユーザーがNestedPropertyEditorで以下の属性を設定：
```
attributes:
  key: "keyTEST"
  units: "tanniTEST"
  scaleFactor: "1.0"
  id: "id123"
  ref: "ref456"
  xsi:type: "stringType"
```

しかし、生成されるXMLは：
```xml
<property key="propertyTEST2" xsi:type="stringType">
  <!-- scaleFactor, id, refが欠落 -->
</property>
```

### 根本原因

#### 原因1: key属性のマッピングエラー

```typescript
const propName = prop.key || '';  // ❌ 内部管理用のkeyを使用
```

- `prop.key`（PropertyDataのキー = `propertyTEST2`）を使用
- `prop.attributes['key']`（ユーザー設定値 = `keyTEST`）は無視される

#### 原因2: 属性の出力漏れ（より深刻）

```typescript
// ❌ 現在の実装: units, formatString, scaleFactorのみ個別チェック
if (prop.units || prop.units) {
  propertyXml += ` units="${escapeXml(prop.units || prop.units)}"`;
}
if (prop.formatString) {
  propertyXml += ` formatString="${escapeXml(prop.formatString)}"`;
}
if (prop.scaleFactor) {
  propertyXml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
}
```

この実装の問題点：
- `id`, `ref`, カスタム属性などが**完全に無視**される
- 新しい属性を追加するたびにif文を追加する必要がある（保守性が悪い）
- `prop.attributes`オブジェクトを活用していない

## 4. 実装ステップ

### Phase 1: buildPropertyXML関数の修正

- [ ] key属性のマッピングを修正（`prop.attributes['key']`を優先）
- [ ] 属性出力をループ処理に変更（すべての属性を動的に出力）
- [ ] xsi:type属性を最後に出力するように調整
- [ ] propertyListTypeの場合の処理を確認

### Phase 2: buildContentXML関数の確認

- [ ] 同様の問題がないか確認
- [ ] 必要に応じて修正

### Phase 3: テスト

- [ ] フォーマット管理画面で動作確認
- [ ] 各種属性（key, scaleFactor, id, ref, units, formatString）が正しく出力されることを確認
- [ ] propertyListTypeの子要素も正しく処理されることを確認

## 5. 変更するファイル

### 修正対象
1. `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`
   - `buildPropertyXML`関数を修正（約30行）
   - 必要に応じて`buildContentXML`関数も修正

### 影響範囲
- `frontend/src/components/project/FormatManagement.tsx` - 呼び出し元（変更不要）
- `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` - 属性編集UI（変更不要）

## 6. 技術的詳細

### 修正前（現在の実装）

```typescript
export function buildPropertyXML(prop: Property, indentLevel = 5): string {
  const indent = '  '.repeat(indentLevel);
  const propName = prop.key || '';  // ❌ 内部キーを使用
  
  const propType = prop.xsiType || 'stringType';
  
  let propertyXml = `${indent}<property key="${escapeXml(propName)}"`;
  
  // ❌ 個別属性のみチェック
  if (prop.units || prop.units) {
    propertyXml += ` units="${escapeXml(prop.units || prop.units)}"`;
  }
  if (prop.formatString) {
    propertyXml += ` formatString="${escapeXml(prop.formatString)}"`;
  }
  if (prop.scaleFactor) {
    propertyXml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
  }
  
  propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
  
  // ... 残りのロジック
}
```

### 修正後（提案）

```typescript
export function buildPropertyXML(prop: Property, indentLevel = 5): string {
  const indent = '  '.repeat(indentLevel);
  
  // ✅ 修正1: attributes['key']を優先使用
  const propName = prop.attributes?.['key'] || prop.key || '';
  
  let propertyXml = `${indent}<property key="${escapeXml(propName)}"`;
  
  // ✅ 修正2: attributesの全属性をループ処理で出力
  if (prop.attributes) {
    Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
      // key（既に出力済み）とxsi:type（後で出力）は除外
      if (attrName !== 'key' && attrName !== 'xsi:type' && attrValue) {
        propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  }
  
  // ✅ xsi:typeは最後に出力（XML規約に従う）
  const propType = prop.attributes?.['xsi:type'] || prop.xsiType || 'stringType';
  propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
  
  // ✅ propertyListTypeの場合
  if (propType === 'propertyListType') {
    // 子property要素を再帰的に出力
    if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      prop.properties.forEach(childProp => {
        propertyXml += buildPropertyXML(childProp, indentLevel + 1);
      });
    }
  }
  // ✅ content要素の処理
  else if (propType === 'content' || propType === 'contentDoubleListType' || propType === 'contentListType') {
    if (prop.contents && Array.isArray(prop.contents)) {
      prop.contents.forEach((content) => {
        propertyXml += buildContentXML(content, indentLevel + 1);
      });
    }
  }
  // ✅ 通常のpropertyの場合
  else {
    // description
    if (prop.description !== undefined && prop.description !== '') {
      propertyXml += `${indent}  <description>${escapeXml(prop.description)}</description>\n`;
    }
    // value
    const value = prop.value || '';
    if (value !== '') {
      propertyXml += `${indent}  <value>${escapeXml(String(value))}</value>\n`;
    }
  }
  
  propertyXml += `${indent}</property>\n`;
  
  return propertyXml;
}
```

### 修正のポイント

1. **key属性の取得**
   ```typescript
   // 優先順位: attributes['key'] > prop.key > ''
   const propName = prop.attributes?.['key'] || prop.key || '';
   ```

2. **全属性の動的出力**
   ```typescript
   // keyとxsi:type以外のすべての属性をループで出力
   Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
     if (attrName !== 'key' && attrName !== 'xsi:type' && attrValue) {
       propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
     }
   });
   ```

3. **xsi:typeの取得と出力**
   ```typescript
   // 優先順位: attributes['xsi:type'] > prop.xsiType > 'stringType'
   const propType = prop.attributes?.['xsi:type'] || prop.xsiType || 'stringType';
   propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
   ```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のXML生成に副作用 | 中 | 低 | ローカルで既存ファイルのXML生成をテスト |
| attributesが未定義の場合のエラー | 低 | 低 | オプショナルチェーン（`?.`）を使用 |
| 属性の出力順序の変更 | 低 | 高 | XML仕様上、属性順序は無関係 |

## 8. テスト計画

### ユニットテスト（手動）

1. **基本的な属性出力**
   - [ ] `key`属性が正しく出力される（attributes['key']の値）
   - [ ] `units`属性が正しく出力される
   - [ ] `scaleFactor`属性が正しく出力される
   - [ ] `id`属性が正しく出力される
   - [ ] `ref`属性が正しく出力される
   - [ ] `xsi:type`属性が最後に出力される

2. **propertyListType（子要素あり）**
   - [ ] 親要素の属性が正しく出力される
   - [ ] 子要素が再帰的に正しく出力される
   - [ ] 子要素の属性も正しく出力される

3. **カスタム属性**
   - [ ] ユーザーが追加したカスタム属性が出力される

### 統合テスト（実際の画面で確認）

- [ ] フォーマット管理画面でXMLファイルを開く
- [ ] NestedPropertyEditorで属性を編集（key, scaleFactor, id, refなど）
- [ ] 保存してXMLを確認
- [ ] 期待通りのXMLが生成されることを確認

## 9. 承認記録

- **計画書提示日時**: 2026-02-27 16:41
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 10. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] buildPropertyXML関数修正完了
- [ ] buildContentXML関数確認完了
- [ ] テスト完了
- [ ] ドキュメント更新

## 11. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
