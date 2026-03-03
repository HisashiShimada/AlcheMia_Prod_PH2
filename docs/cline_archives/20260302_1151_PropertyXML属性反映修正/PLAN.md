# タスク計画書: Property属性のXML反映修正

## メタデータ
- **作成日時**: 2026-03-02 11:51
- **タスクID**: PropertyXML属性反映修正
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

現在、XML編集でPropertyに対してid、ref、カスタム属性に値を設定しても、XMLに値が反映されない問題を修正します。

## 2. 問題の詳細

### 現状の問題
1. `Property`型に`id`、`ref`、カスタム属性を格納するフィールドが未定義
2. `buildPropertyXML`関数が固定された3つの属性（units, formatString, scaleFactor）しか出力していない
3. JavaScript版では`prop.attributes`オブジェクトから動的に属性を出力しているが、TypeScript版は未対応

### 根本原因
差異分析レポートより:
- **JavaScript版**: `prop.attributes`オブジェクトから全属性を動的に出力
- **TypeScript版**: 特定の3属性のみを固定的に出力、カスタム属性未対応

## 3. 実装ステップ

### Phase 1: 型定義の修正
- [x] `frontend/src/types/maiml-unified.ts`を確認
- [ ] `Property`型に以下のフィールドを追加:
  - `attributes?: Record<string, string>` - id、ref、カスタム属性を管理
- [ ] 既存フィールドは変更なし（units, formatString, scaleFactor）

### Phase 2: XML変換処理の修正
- [x] `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`を確認
- [ ] `buildPropertyXML`関数を修正:
  1. `id`属性の出力を追加
  2. `ref`属性の出力を追加
  3. `prop.attributes`オブジェクトから動的に属性を出力
  4. JavaScript版と同じロジックに統一

### Phase 3: テスト・動作確認
- [ ] NestedPropertyEditorで属性を設定
- [ ] XML出力で属性が反映されることを確認
- [ ] 既存の機能（units, formatString, scaleFactor）が正常に動作することを確認

## 4. 変更ファイル

### 新規作成
1. `docs/20260302_1151_PropertyXML属性反映修正/PLAN.md` - タスク計画書

### 修正
1. `frontend/src/types/maiml-unified.ts` - Property型定義の修正
2. `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` - buildPropertyXML関数の修正

## 5. 技術的詳細

### Property型の修正
```typescript
export interface Property {
  /** プロパティキー（必須） */
  key: string;
  
  /** プロパティ型（必須） */
  xsiType: string;
  
  // ============================================================================
  // 🆕 XML属性（id、ref、カスタム属性用）
  // ============================================================================
  
  /**
   * XML属性の辞書（id、ref、カスタム属性用）
   * 
   * id、ref、カスタム属性を格納
   * units、formatString、scaleFactorは既存フィールドを継続使用
   * 
   * @example
   * {
   *   id: "prop1",
   *   ref: "template1",
   *   myCustomAttr: "customValue"
   * }
   */
  attributes?: Record<string, string>;
  
  // 既存のフィールド（変更なし）
  /** 単位（例: "s", "mm", "°C", "keV"） */
  units?: string;
  
  /** フォーマット文字列（例: "0", "0.00"） */
  formatString?: string;
  
  /** スケールファクター */
  scaleFactor?: number;
}
```

**設計思想**:
- `attributes`は**id、ref、カスタム属性のみ**を管理
- `units`, `formatString`, `scaleFactor`は**既存のまま**維持
- 既存処理を壊さず、新機能（id、ref、カスタム属性）のみを追加

### buildPropertyXML関数の修正
```typescript
export function buildPropertyXML(prop: Property, indentLevel = 5): string {
  const indent = '  '.repeat(indentLevel);
  const propName = prop.key || '';
  const propType = prop.xsiType || 'stringType';
  
  let propertyXml = `${indent}<property key="${escapeXml(propName)}"`;
  
  // ✅ 既存処理をそのまま維持（units、formatString、scaleFactor）
  if (prop.units) {
    propertyXml += ` units="${escapeXml(prop.units)}"`;
  }
  if (prop.formatString) {
    propertyXml += ` formatString="${escapeXml(prop.formatString)}"`;
  }
  if (prop.scaleFactor) {
    propertyXml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
  }
  
  // ✅ 新規: prop.attributesから動的に属性を出力（id、ref、カスタム属性）
  if (prop.attributes) {
    Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
      if (attrName !== 'xsi:type' && attrValue) {
        propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    });
  }
  
  propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
  
  // 既存の処理...
}
```

**重要ポイント**:
- 既存処理（units、formatString、scaleFactor）を先に出力
- その後、`prop.attributes`から**id、ref、カスタム属性**を動的に出力
- `xsi:type`は除外（別途出力されるため）
- 既存コードを壊さず、新機能のみを追加

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存コードへの影響 | 中 | 低 | 後方互換性を維持（attributes未定義時は固定属性を使用） |
| 型定義の不整合 | 低 | 低 | XSD仕様に準拠した定義 |

## 7. テスト計画

### 手動テスト
- [ ] attributes.id設定 → XML出力確認
- [ ] attributes.ref設定 → XML出力確認
- [ ] カスタム属性（例: attributes.myCustomAttr="value"）設定 → XML出力確認
- [ ] 既存属性（units, formatString, scaleFactor）が引き続き正常に動作することを確認
- [ ] attributesと既存属性の併用動作確認

## 8. 承認記録

- **計画書提示日時**: 2026-03-02 11:51
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 9. 関連ドキュメント

- [差異分析レポート](../20260302_0922_buildPropertyXML差異分析/差異分析レポート.md)
- [maiml-unified.ts](../../frontend/src/types/maiml-unified.ts)
- [reactFlowToMaiml.ts](../../frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts)
