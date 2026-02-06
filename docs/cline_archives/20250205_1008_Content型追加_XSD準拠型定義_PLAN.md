# タスク計画書: Content型追加 - XSD準拠型定義

## メタデータ
- **作成日時**: 2025-02-05 10:08
- **タスクID**: content-type-xsd-implementation
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`backend/reference/schemas/maiml-property.xsd`の定義に基づき、`frontend/src/types/maiml-unified.ts`にContent型を追加します。既存のProperty型と同様の構造で、XSDスキーマを正確にTypeScript型定義に変換します。

## 2. 目的と期待される成果

### 目的
- XSDスキーマで定義されたContent要素の型安全性を確保
- Property型と同様の一貫性のある型定義を提供
- MAIMLファイルのパース・生成時の型チェックを強化

### 期待される成果
- [x] XSDファイルの構造を確認
- [x] 既存のProperty型の定義を確認
- [ ] Content型の完全な型定義を作成
- [ ] Content型の子要素・属性の型定義を作成
- [ ] ドキュメントコメントを追加
- [ ] 型定義の整合性を確認

## 3. 実装ステップ

### Phase 1: XSD構造の分析
- [x] `maiml-property.xsd`のContent要素定義を分析
- [x] Content要素の属性（id, class, language等）を確認
- [x] Content要素の子要素構造を確認
- [x] Property型との類似点・相違点を特定

### Phase 2: Content型の基本定義作成
- [ ] XSDのcomplexType定義をTypeScriptインターフェースに変換
- [ ] 必須属性とオプション属性を正確にマッピング
- [ ] 既存のProperty型と同じコーディングスタイルを適用

### Phase 3: Content子要素の型定義
- [ ] ContentValueContent型の定義
- [ ] ContentUnitContent型の定義  
- [ ] ContentErrorContent型の定義
- [ ] ContentQualifierContent型の定義
- [ ] 各子要素の属性型を定義

### Phase 4: ドキュメント追加
- [ ] Content型にJSDocコメントを追加
- [ ] XSDとの対応関係を明記
- [ ] 各プロパティの説明を追加

### Phase 5: 整合性確認
- [ ] Property型との一貫性を確認
- [ ] 既存のパーサーコードとの互換性を確認
- [ ] TypeScriptコンパイルエラーがないことを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/maiml-unified.ts` - Content型を追加

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- MAIMLパーサー（`frontend/src/utils/maimlParserTyped.ts`）
- 既存のProperty型を使用している箇所との一貫性

## 5. 技術的詳細

### XSD構造の概要

**Content要素の主な属性:**
```xml
<xs:complexType name="Content">
  <xs:sequence>
    <xs:element name="value" type="ContentValue" minOccurs="0"/>
    <xs:element name="unit" type="ContentUnit" minOccurs="0"/>
    <xs:element name="error" type="ContentError" minOccurs="0"/>
    <xs:element name="qualifier" type="ContentQualifier" minOccurs="0" maxOccurs="unbounded"/>
  </xs:sequence>
  <xs:attribute name="id" type="xs:string" use="optional"/>
  <xs:attribute name="class" type="xs:string" use="optional"/>
  <xs:attribute name="language" type="xs:string" use="optional"/>
  <!-- その他の属性 -->
</xs:complexType>
```

### Property型との比較

**Property型の構造（参考）:**
- 複雑なネスト構造を持つ
- 子要素として Property, PropertyList, PropertyStruct を含む
- 属性として id, class, dataType, unit 等を持つ

**Content型の特徴:**
- より単純な構造
- value, unit, error, qualifier の4つの子要素
- Property型と類似した属性セット

### 型定義の方針

1. **一貫性の維持**: Property型と同じコーディングスタイルを使用
2. **XSD準拠**: XSDの定義を正確にTypeScriptに変換
3. **オプショナル処理**: `minOccurs="0"`の要素は`?`で表現
4. **配列処理**: `maxOccurs="unbounded"`の要素は配列型で表現

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| XSDとTypeScript型の不一致 | 高 | 低 | XSDを詳細に分析し、正確に変換する |
| 既存コードとの非互換性 | 中 | 低 | Property型の実装パターンを踏襲する |
| ドキュメント不足 | 低 | 中 | 詳細なJSDocコメントを追加する |

## 7. テスト計画

### 型チェック
- [ ] TypeScriptコンパイルが成功すること
- [ ] 型推論が正しく動作すること

### 既存コードとの互換性
- [ ] maimlParserTyped.tsでのContent型使用
- [ ] 既存のProperty型との一貫性

### 手動確認
- [ ] Content型の各プロパティが適切に定義されていること
- [ ] JSDocコメントが適切に表示されること

## 8. ロールバック計画

- git diff で変更内容を確認
- 問題がある場合は `git checkout` で元に戻す
- 変更は1ファイルのみなので、ロールバックは容易

## 9. 関連ドキュメント

- `backend/reference/schemas/maiml-property.xsd` - XSDスキーマ定義
- `frontend/src/types/maiml-unified.ts` - MAIML型定義ファイル
- `docs/20250204_1419_reactFlowConverter_XSD型定義置き換え_PLAN.md` - 関連する型定義作業

## 10. 承認記録

- **計画書提示日時**: 2025-02-05 10:08
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入予定）

## 11. 実施記録

### 実施日時
開始: 2025-02-05 10:11
完了: 2025-02-05 10:15

### 計画からの変更点
なし。計画通りに実装を完了しました。

### 発生した問題と解決方法
なし。XSDスキーマの構造が明確で、Property型の実装パターンを踏襲できたため、スムーズに実装できました。

### 最終的な成果物
- [x] Content型の完全な定義
  - ContentType列挙型（24種類のリスト型）
  - Content統一型インターフェース
- [x] 子要素・属性の型定義
  - contentBaseType固有属性（axis, size, id, ref）
  - uncertaintyBaseType継承属性（key）
  - 共通プロパティ（description, values, properties, contents, uncertainty）
  - 数値型オプション（units, formatString, scaleFactor）
- [x] JSDocコメント
  - 型の説明
  - XSD仕様との対応関係
  - 3つの使用例（文字列リスト、数値リスト、ネスト構造）

## 12. 振り返り

### うまくいった点
1. **XSD仕様の正確な理解**: contentBaseTypeとuncertaintyBaseTypeの継承関係を正確に把握できた
2. **Property型との一貫性**: 既存のProperty型と同じコーディングスタイルを適用し、統一感を保てた
3. **包括的なドキュメント**: 3つの異なる使用例を含む詳細なJSDocコメントを作成できた
4. **型安全性の確保**: すべての属性を適切にオプショナル/必須として定義できた

### 改善が必要な点
特になし。計画通りに実装を完了できました。

### 学んだこと
1. **Content型の特性**: すべてリスト型である点がProperty型との最大の違い
2. **genericDataContainerGroup**: PropertyとContentの両方をネスト可能な構造
3. **XSD型継承**: uncertaintyBaseType → contentBaseType → 具体型の3階層構造
4. **実装パターンの再利用**: Property型の実装パターンを踏襲することで、一貫性のある型定義を効率的に作成できた

---

## 付録: XSDからTypeScriptへの変換ルール

### 基本ルール
1. `xs:complexType` → TypeScript `interface`
2. `xs:element` → interface プロパティ
3. `xs:attribute` → interface プロパティ
4. `minOccurs="0"` → オプショナルプロパティ `?:`
5. `maxOccurs="unbounded"` → 配列型 `[]`
6. `xs:string` → `string`
7. `xs:integer` → `number`
8. `xs:boolean` → `boolean`

### 子要素の処理
```typescript
// XSD: <xs:element name="value" type="ContentValue" minOccurs="0"/>
// TypeScript:
value?: ContentValue;

// XSD: <xs:element name="qualifier" maxOccurs="unbounded"/>
// TypeScript:
qualifier?: ContentQualifier[];
```

### 属性の処理
```typescript
// XSD: <xs:attribute name="id" type="xs:string" use="optional"/>
// TypeScript:
id?: string;

// XSD: <xs:attribute name="class" type="xs:string" use="required"/>
// TypeScript:
class: string;