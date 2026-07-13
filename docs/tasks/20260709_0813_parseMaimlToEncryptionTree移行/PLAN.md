# タスク計画書: parseMaimlToEncryptionTree の MaimlParserTyped 移行

## メタデータ
- **作成日時**: 2026-07-09 08:13
- **タスクID**: parseMaimlToEncryptionTree_migration
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

`frontend/src/utils/parseMaimlToEncryptionTree.ts` は現在 `DOMParser` を使用してXMLを直接パースしている。  
システム全体のパース方式は `MaimlParserTyped`（`xml-js` + `maimlTypeConverter.ts`）に統一されており、  
パース方式の乱立を避けるため `MaimlParserTyped` 経由での実装に移行する。

## 目的と期待される成果

### 目的
- DOMパース方式を廃止し、`MaimlParserTyped` + `MaimlRoot` 型に統一する
- 暗号化済み要素（`xenc:EncryptedData`）の検出・`isEncrypted`フラグへの反映を実データから行う
- 型安全性を向上し、今後の仕様変更への追随コストを下げる

### 期待される成果
- [ ] `parseMaimlToEncryptionTree.ts` が `DOMParser` を使用しない
- [ ] `MaimlParserTyped` から得た `MaimlRoot` を辿って `MaimlTreeNode[]` を生成する
- [ ] `isEncrypted` が実データ（`xenc:EncryptedData`の有無）を反映する
- [ ] 既存の呼び出し元コード（`EncryptionManagement.tsx`, `encryptionService.ts`）に変更なし
- [ ] `maiml-unified.ts` に `EncryptedData` / `EncryptionContainer` 型が追加される
- [ ] `maimlTypeConverter.ts` が暗号化済み要素を変換できる

## 技術調査結果

### 現状の問題

1. **DOMParser によるパース**（`parseMaimlToEncryptionTree.ts`）
   - ブラウザ専用（SSR不可）
   - `MaimlParserTyped` と全く別の変換ロジックを持つ

2. **`maiml-unified.ts` に暗号化型が未定義**
   - `globalObjectContentGroup` を持つ全要素（Document, Method, Material 等）はXSD上 `choice` で「平文コンテンツ」または「`encryptionGroup`」を持つが、現在の型定義には `encryptionGroup` 部分が存在しない
   - `Property` / `Content` の各派生型も同様に `encryptionGroup` が未対応

3. **`maimlTypeConverter.ts` に暗号化変換ロジックなし**
   - `EncryptedData` / `CipherData` / `CipherValue` の変換が未実装

4. **`isEncrypted` が常に `false`**
   - 現在は `isEncrypted: false` をハードコードしており、実際に暗号化済みのMAIMLを読み込んでも正しく表示されない

### XSD仕様（docs/design/maiml/maiml-property.xsd）

```xml
<!-- encryptionGroup: globalObjectContentGroup/genericDataContainerGroup の代替ブランチ -->
<xs:group name="encryptionGroup">
  <xs:sequence>
    <xs:element name="childUri"  type="xs:anyURI"      minOccurs="0" maxOccurs="unbounded" />
    <xs:element name="childHash" type="xs:base64Binary" minOccurs="0" maxOccurs="unbounded" />
    <xs:element name="childUuid" type="uuid"            minOccurs="0" maxOccurs="unbounded" />
    <xs:element ref="xenc:EncryptedData" />
  </xs:sequence>
</xs:group>
```

各globalObjectContentGroup要素（property, content を含む全要素）は:
```xml
<xs:choice>
  <xs:sequence>  <!-- 平文 -->
    <xs:element name="property" ... />
    <xs:element name="content"  ... />
    <!-- 各要素固有の子要素 -->
  </xs:sequence>
  <xs:group ref="encryptionGroup" />  <!-- 暗号化済み -->
</xs:choice>
```

## 実装ステップ

### Phase 1: maiml-unified.ts に暗号化型を追加

- [ ] `EncryptedData`, `EncryptionMethod`, `CipherData`, `EncryptionProperty`, `EncryptionContainer` 型を新規追加
- [ ] globalObjectContentGroup 系インターフェース（Document, DocumentTagData, Protocol, Method, PNML, Program, Template, Instruction, Material, Condition, Result, Results, Data, EventLog, Log, Trace, Event）に `encryption?: EncryptionContainer` を追加
- [ ] `Property`, `Content` に `encryption?: EncryptionContainer` を追加

### Phase 2: maimlTypeConverter.ts に暗号化変換ロジックを追加

- [ ] `extractEncryptionContainer(xmlElement)` ヘルパー関数を追加
  - 子要素に `EncryptedData`（名前空間 `http://www.w3.org/2001/04/xmlenc#`）があれば `EncryptionContainer` を生成
  - `childUri`, `childHash`, `childUuid` も収集
- [ ] 既存の各変換関数（`convertDocument`, `convertProtocol`, `convertMethod`, `convertPnml`, `convertProgram`, `convertTemplate`, `convertInstruction`, `convertMaterial`, `convertCondition`, `convertResult`, `convertResults`, `convertData`, `convertEventLog`, `convertLog`, `convertTrace`, `convertEvent`, `convertProperty`, `convertContent`）に対して、変換結果に `encryption` フィールドを設定する処理を追加

### Phase 3: parseMaimlToEncryptionTree.ts の全面書き換え

- [ ] `DOMParser` の依存を削除
- [ ] `MaimlParserTyped` をインポートし XML文字列 → `MaimlRoot` を取得
- [ ] `MaimlRoot` から `MaimlTreeNode[]` を生成する変換関数群を再実装
  - `isEncrypted: !!obj.encryption` に変更
  - `encryptionInfo` を `obj.encryption?.encryptedData` から設定（algorithm URI, keyName 等）
- [ ] `isEncryptableElement()` と `ENCRYPTABLE_TAGS` は引き続き維持（暗号化可否はMAIML仕様から変わらない）
- [ ] `fetchAndParseMockMaiml()` は関数シグネチャをそのまま維持（呼び出し元への影響なし）

## 変更ファイル

### 修正
1. `frontend/src/types/maiml-unified.ts` - EncryptedData関連型の追加
2. `frontend/src/utils/maimlTypeConverter.ts` - 暗号化変換ロジックの追加
3. `frontend/src/utils/parseMaimlToEncryptionTree.ts` - DOMParser廃止・MaimlParserTyped移行

### 新規作成
- なし

### 削除
- なし

### 変更なし（影響を受けるが修正不要）
- `frontend/src/services/encryptionService.ts` - 呼び出しシグネチャ不変
- `frontend/src/components/encryption/EncryptionManagement.tsx` - 呼び出しシグネチャ不変
- `frontend/src/components/encryption/EncryptionTargetTree.tsx` - `MaimlTreeNode` 型不変

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `maimlTypeConverter.ts` の既存変換ロジックが暗号化済みXMLを受け取ると例外を発生させる | 高 | 中 | `extractEncryptionContainer` は try/catch で安全に実装し、失敗時は `encryption` を undefined のままにする |
| `maiml-unified.ts` の型変更によるコンパイルエラー | 中 | 低 | 全フィールドをオプショナル（`?:`）にするため既存コードは無変更 |
| `xml-js` がXML名前空間付き要素名（`xenc:EncryptedData`）をどのように表現するか | 中 | 中 | compact mode では `xenc:EncryptedData` はキー名そのままで扱われる。事前確認後に実装 |

## テスト計画

- [ ] 平文MAIMLファイル（`/mocks/Raman.maiml`）でツリーが正常生成されること（`isEncrypted: false`）
- [ ] TypeScriptのコンパイルエラーが発生しないこと（`npx tsc --noEmit`）

## 承認記録

- **計画書提示日時**: 2026-07-09 08:13
- **承認日時**: 
- **承認者コメント**: 

## 実施記録

### 実施日時
開始: 
完了: 

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）
