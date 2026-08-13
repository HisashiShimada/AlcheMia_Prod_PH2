# MAIMLスキーマ EncryptedData（秘匿化）関連 調査まとめ

> 調査対象: `docs/design/maiml/` 配下の全XSDファイル（14ファイル）  
> 作成日: 2026-06-16

---

## 1. 概要

MAIMLスキーマには、W3C標準の **XML暗号化仕様（XML Encryption Syntax and Processing）** を利用した秘匿化の仕組みが組み込まれています。  
データのプロパティ・コンテンツ要素を暗号化して格納するための `encryptionGroup` が定義されており、ほぼすべてのデータ型で使用可能です。

---

## 2. 関連ファイル一覧

| ファイル名 | 役割 |
|---|---|
| `xenc-schema.xsd` | W3C XML暗号化スキーマ（メイン）。`EncryptedData`・`EncryptedKey`等を定義 |
| `xenc-schema-11.xsd` | XML Encryption 1.1拡張。鍵導出（PBKDF2等）関連の型を定義 |
| `xmldsig-core-schema.xsd` | W3C XML電子署名スキーマ。`KeyInfo`・`Signature`等を定義（暗号化との連携用） |
| `maiml-property.xsd` | MAIMLの`encryptionGroup`グループを定義。全プロパティ・コンテンツ型で参照 |
| `maiml-core.xsd` | `globalObjectContentGroup`内で`encryptionGroup`を参照 |

---

## 3. encryptionGroup の定義（maiml-property.xsd）

```xml
<xs:group name="encryptionGroup">
  <xs:sequence>
    <xs:element name="childUri"  type="xs:anyURI"      minOccurs="0" maxOccurs="unbounded" />
    <xs:element name="childHash" type="xs:base64Binary" minOccurs="0" maxOccurs="unbounded" />
    <xs:element name="childUuid" type="uuid"            minOccurs="0" maxOccurs="unbounded" />
    <xs:element ref="xenc:EncryptedData" />
  </xs:sequence>
</xs:group>
```

### 構成要素の説明

| 要素名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `childUri` | `xs:anyURI` | 任意（0..∞） | 暗号化対象の子オブジェクトのURI（参照先） |
| `childHash` | `xs:base64Binary` | 任意（0..∞） | 暗号化前の子オブジェクトのハッシュ値（整合性確認用） |
| `childUuid` | `uuid` | 任意（0..∞） | 暗号化対象の子オブジェクトのUUID |
| `xenc:EncryptedData` | `xenc:EncryptedDataType` | **必須（1）** | W3C XML暗号化仕様の暗号化データ本体 |

---

## 4. EncryptedData の定義（xenc-schema.xsd）

```xml
<element name='EncryptedData' type='xenc:EncryptedDataType'/>
<complexType name='EncryptedDataType'>
  <complexContent>
    <extension base='xenc:EncryptedType'/>
  </complexContent>
</complexType>
```

`EncryptedDataType` は抽象型 `EncryptedType` を継承しています。

### EncryptedType（基底抽象型）の構造

```xml
<complexType name='EncryptedType' abstract='true'>
  <sequence>
    <element name='EncryptionMethod' type='xenc:EncryptionMethodType' minOccurs='0'/>
    <element ref='ds:KeyInfo'                                          minOccurs='0'/>
    <element ref='xenc:CipherData'/>
    <element ref='xenc:EncryptionProperties'                           minOccurs='0'/>
  </sequence>
  <attribute name='Id'       type='ID'     use='optional'/>
  <attribute name='Type'     type='anyURI' use='optional'/>
  <attribute name='MimeType' type='string' use='optional'/>
  <attribute name='Encoding' type='anyURI' use='optional'/>
</complexType>
```

#### 子要素の詳細

| 要素名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `EncryptionMethod` | `xenc:EncryptionMethodType` | 任意 | 使用する暗号化アルゴリズムを指定 |
| `ds:KeyInfo` | `ds:KeyInfoType` | 任意 | 復号に必要な鍵情報（xmldsig） |
| `CipherData` | `xenc:CipherDataType` | **必須** | 暗号化された実データ |
| `EncryptionProperties` | `xenc:EncryptionPropertiesType` | 任意 | 付加的な暗号化プロパティ |

#### 属性の詳細

| 属性名 | 型 | 説明 |
|---|---|---|
| `Id` | `ID` | 要素の一意識別子 |
| `Type` | `anyURI` | 暗号化されたコンテンツの型（任意） |
| `MimeType` | `string` | MIMEタイプ（任意） |
| `Encoding` | `anyURI` | エンコーディング方式（任意） |

---

## 5. CipherData の定義（xenc-schema.xsd）

```xml
<element name='CipherData' type='xenc:CipherDataType'/>
<complexType name='CipherDataType'>
  <choice>
    <element name='CipherValue'    type='base64Binary'/>
    <element ref='xenc:CipherReference'/>
  </choice>
</complexType>
```

暗号化データの格納方式は以下の2択：

| 方式 | 要素名 | 説明 |
|---|---|---|
| 直接格納 | `CipherValue` | Base64エンコードされた暗号化データをインライン格納 |
| 参照 | `CipherReference` | 外部URIの暗号化データへの参照 |

### CipherReference の構造

```xml
<element name='CipherReference' type='xenc:CipherReferenceType'/>
<complexType name='CipherReferenceType'>
  <choice>
    <element name='Transforms' type='xenc:TransformsType' minOccurs='0'/>
  </choice>
  <attribute name='URI' type='anyURI' use='required'/>
</complexType>
```

| 要素/属性 | 説明 |
|---|---|
| `URI`（必須属性） | 暗号化データが格納されている外部リソースのURI |
| `Transforms` | 参照先データを取得する前に適用するXML変換のリスト |

---

## 6. EncryptionMethod の定義（xenc-schema.xsd）

```xml
<complexType name='EncryptionMethodType' mixed='true'>
  <sequence>
    <element name='KeySize'    minOccurs='0' type='xenc:KeySizeType'/>
    <element name='OAEPparams' minOccurs='0' type='base64Binary'/>
    <any namespace='##other'  minOccurs='0' maxOccurs='unbounded'/>
  </sequence>
  <attribute name='Algorithm' type='anyURI' use='required'/>
</complexType>
```

| 要素/属性 | 説明 |
|---|---|
| `Algorithm`（必須属性） | 暗号化アルゴリズムのURI（例: AES-256-CBC） |
| `KeySize` | 鍵長（ビット数） |
| `OAEPparams` | RSA-OAEPパラメータ（Base64） |

---

## 7. EncryptedKey の定義（xenc-schema.xsd）

```xml
<element name='EncryptedKey' type='xenc:EncryptedKeyType'/>
<complexType name='EncryptedKeyType'>
  <complexContent>
    <extension base='xenc:EncryptedType'>
      <sequence>
        <element ref='xenc:ReferenceList' minOccurs='0'/>
        <element name='CarriedKeyName'    type='string' minOccurs='0'/>
      </sequence>
      <attribute name='Recipient' type='string' use='optional'/>
    </extension>
  </complexContent>
</complexType>
```

`EncryptedKey` は `EncryptedType` を継承し、暗号化された鍵自体を表します（`ds:KeyInfo` 子要素として使用）。

| 要素/属性 | 説明 |
|---|---|
| `ReferenceList` | この鍵で暗号化されたデータ/鍵への参照リスト |
| `CarriedKeyName` | 搬送される鍵の名前 |
| `Recipient`（属性） | 鍵の受信者を示す文字列 |

---

## 8. KeyInfo の定義（xmldsig-core-schema.xsd）

`ds:KeyInfo` は復号鍵情報を提供します。以下の子要素を含むことができます：

```xml
<element name="KeyInfo" type="ds:KeyInfoType"/>
<complexType name="KeyInfoType" mixed="true">
  <choice maxOccurs="unbounded">
    <element ref="ds:KeyName"/>
    <element ref="ds:KeyValue"/>
    <element ref="ds:RetrievalMethod"/>
    <element ref="ds:X509Data"/>
    <element ref="ds:PGPData"/>
    <element ref="ds:SPKIData"/>
    <element ref="ds:MgmtData"/>
    <any processContents="lax" namespace="##other"/>
  </choice>
  <attribute name="Id" type="ID" use="optional"/>
</complexType>
```

| 子要素 | 説明 |
|---|---|
| `KeyName` | 鍵の名前（文字列） |
| `KeyValue` | 鍵の値（DSA/RSA公開鍵） |
| `RetrievalMethod` | 外部参照による鍵情報取得 |
| `X509Data` | X.509証明書情報（証明書・CRL等） |
| `PGPData` | PGP公開鍵情報 |
| `SPKIData` | SPKI公開鍵情報 |
| `MgmtData` | 管理情報（文字列） |

---

## 9. EncryptionProperties の定義（xenc-schema.xsd）

```xml
<element name='EncryptionProperties' type='xenc:EncryptionPropertiesType'/>
<complexType name='EncryptionPropertiesType'>
  <sequence>
    <element ref='xenc:EncryptionProperty' maxOccurs='unbounded'/>
  </sequence>
  <attribute name='Id' type='ID' use='optional'/>
</complexType>

<element name='EncryptionProperty' type='xenc:EncryptionPropertyType'/>
<complexType name='EncryptionPropertyType' mixed='true'>
  <choice maxOccurs='unbounded'>
    <any namespace='##other' processContents='lax'/>
  </choice>
  <attribute name='Target' type='anyURI' use='optional'/>
  <attribute name='Id'     type='ID'    use='optional'/>
  <anyAttribute namespace="http://www.w3.org/XML/1998/namespace"/>
</complexType>
```

暗号化に関する付加情報（タイムスタンプ等）を任意の名前空間要素で格納できます。

---

## 10. XML Encryption 1.1 拡張（xenc-schema-11.xsd）

`xenc-schema-11.xsd` は XML Encryption 1.1 の追加定義を含みます。主に **鍵導出（Key Derivation）** の仕組みです。

### DerivedKey

```xml
<element name="DerivedKey" type="xenc11:DerivedKeyType"/>
<complexType name="DerivedKeyType">
  <sequence>
    <element ref="xenc11:KeyDerivationMethod" minOccurs="0"/>
    <element ref="xenc:ReferenceList"         minOccurs="0"/>
    <element name="DerivedKeyName"            type="string" minOccurs="0"/>
    <element name="MasterKeyName"             type="string" minOccurs="0"/>
  </sequence>
  <attribute name="Recipient" type="string" use="optional"/>
  <attribute name="Id"        type="ID"     use="optional"/>
  <attribute name="Type"      type="anyURI" use="optional"/>
</complexType>
```

### PBKDF2-params（パスワードベース鍵導出）

```xml
<complexType name="PBKDF2ParameterType">
  <sequence>
    <element name="Salt">
      <complexType>
        <choice>
          <element name="Specified"   type="base64Binary"/>
          <element name="OtherSource" type="xenc11:AlgorithmIdentifierType"/>
        </choice>
      </complexType>
    </element>
    <element name="IterationCount" type="positiveInteger"/>
    <element name="KeyLength"      type="positiveInteger"/>
    <element name="PRF"            type="xenc11:PRFAlgorithmIdentifierType"/>
  </sequence>
</complexType>
```

| 要素 | 説明 |
|---|---|
| `Salt` | ソルト値（指定値 or 外部ソース） |
| `IterationCount` | ハッシュ繰り返し回数 |
| `KeyLength` | 導出する鍵の長さ |
| `PRF` | 擬似乱数関数（HMAC-SHA1等） |

### ConcatKDFParams（連結鍵導出）

```xml
<element name="ConcatKDFParams" type="xenc11:ConcatKDFParamsType"/>
<complexType name="ConcatKDFParamsType">
  <sequence>
    <element ref="ds:DigestMethod"/>
  </sequence>
  <attribute name="AlgorithmID"  type="hexBinary"/>
  <attribute name="PartyUInfo"   type="hexBinary"/>
  <attribute name="PartyVInfo"   type="hexBinary"/>
  <attribute name="SuppPubInfo"  type="hexBinary"/>
  <attribute name="SuppPrivInfo" type="hexBinary"/>
</complexType>
```

---

## 11. encryptionGroup の適用範囲

`encryptionGroup` は以下の2か所で参照されており、MAIMLの **ほぼすべてのデータ要素** を暗号化できます。

### (A) globalObjectContentGroup（maiml-core.xsd）

```xml
<xs:group name="globalObjectContentGroup">
  <xs:sequence>
    <xs:element name="uuid" type="uuid" />
    <xs:choice>
      <xs:group ref="encryptionGroup" />        <!-- ← 暗号化選択肢 -->
      <xs:sequence>
        <xs:element name="insertion"    .../>
        <xs:element name="name"         .../>
        <xs:element name="description"  .../>
        <xs:element name="annotation"   .../>
        <xs:group ref="genericDataContainerGroup" />
      </xs:sequence>
    </xs:choice>
  </xs:sequence>
</xs:group>
```

`globalObjectContentGroup` を持つ型（= MAIMLの主要オブジェクトすべて）で、**通常コンテンツか暗号化コンテンツかを選択**できます。

対象型：`dataType`, `resultsType`, `materialType`, `conditionType`, `resultType`, `documentType`, `creatorType`, `vendorType`, `ownerType`, `instrumentType`, `protocolType`, `methodType`, `programType`, `instructionType`, `materialTemplateType`, `conditionTemplateType`, `resultTemplateType`, `eventLogType`, `logType`, `traceType`, `eventType`, `pnmlType`

### (B) propertyBaseType / contentBaseType の各派生型（maiml-property.xsd）

`propertyBaseType` を継承するすべての `property` 型、および `contentBaseType` を継承するすべての `content` 型において、`<xs:choice>` で **通常データか `encryptionGroup` かを選択**できます。

対象のproperty型（合計28型）:

| カテゴリ | 型名 |
|---|---|
| 単純型 | `stringType`, `tokenType`, `idType`, `idRefType`, `qualifiedNameType`, `dateTimeType`, `decimalType`, `doubleType`, `floatType`, `intType`, `longType`, `shortType`, `byteType`, `unsignedIntType`, `unsignedLongType`, `unsignedShortType`, `unsignedByteType`, `booleanType`, `base64BinaryType`, `hexBinaryType`, `uriType`, `uuidType`, `languageType` |
| リスト型 | `propertyListType`, `stringListType`, `idRefListType`, `qualifiedNameListType`, `dateTimeListType`, `decimalListType`, `doubleListType`, `floatListType`, `intListType`, `longListType`, `shortListType`, `byteListType`, `unsignedIntListType`, `unsignedLongListType`, `unsignedShortListType`, `unsignedByteListType`, `booleanListType`, `base64BinaryListType`, `hexBinaryListType`, `uriListType`, `uuidListType`, `languageListType` |
| 列挙型 | `stringEnumType` |
| contentList型 | `contentStringListType`, `contentIdRefListType`, `contentQualifiedNameListType`, `contentDateTimeListType`, `contentDecimalListType`, `contentDoubleListType`, `contentFloatListType`, `contentIntListType`, `contentLongListType`, `contentShortListType`, `contentByteListType`, `contentUnsignedIntListType`, `contentUnsignedLongListType`, `contentUnsignedShortListType`, `contentUnsignedByteListType`, `contentBooleanListType`, `contentBase64BinaryListType`, `contentHexBinaryListType`, `contentUriListType`, `contentUuidListType`, `contentLanguageListType`, `contentStringEnumType` |

---

## 12. 電子署名との連携（maiml-document.xsd）

`documentType`（MAIMLのdocumentセクション）には `ds:Signature` 要素が含まれます：

```xml
<xs:complexType name="documentType">
  <xs:complexContent>
    <xs:extension base="hasIdAttributeType">
      <xs:sequence>
        <xs:element ref="ds:Signature" minOccurs="0" />   <!-- ← 電子署名 -->
        <xs:group ref="globalObjectContentGroup" />
        ...
      </xs:sequence>
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

これにより、**文書全体への電子署名**（改ざん検知）が可能です。

---

## 13. EncryptedData を使用した暗号化XMLの例

以下は `property` 要素に対して `encryptionGroup` を適用した場合のXMLイメージです：

```xml
<property key="myns:sensitiveData">
  <childUri>urn:uuid:550e8400-e29b-41d4-a716-446655440000</childUri>
  <childHash>base64encodedHashValue==</childHash>
  <childUuid>550e8400-e29b-41d4-a716-446655440000</childUuid>
  <xenc:EncryptedData
    xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
    Type="http://www.w3.org/2001/04/xmlenc#Element">
    <xenc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>
    <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:KeyName>myEncryptionKey</ds:KeyName>
    </ds:KeyInfo>
    <xenc:CipherData>
      <xenc:CipherValue>base64EncodedEncryptedData==</xenc:CipherValue>
    </xenc:CipherData>
  </xenc:EncryptedData>
</property>
```

---

## 14. まとめ

| 項目 | 内容 |
|---|---|
| **標準規格** | W3C XML Encryption Syntax and Processing (XML Enc 1.0 / 1.1) |
| **参照名前空間** | `http://www.w3.org/2001/04/xmlenc#` (xenc), `http://www.w3.org/2009/xmlenc11#` (xenc11) |
| **電子署名連携** | `http://www.w3.org/2000/09/xmldsig#` (ds) |
| **適用単位** | グローバルオブジェクト全体、または個々のproperty/content要素 |
| **暗号化データ格納** | インライン（CipherValue）または外部参照（CipherReference）を選択可能 |
| **鍵管理** | EncryptedKey、PBKDF2、ConcatKDF等の鍵導出もサポート |
| **選択の仕組み** | `<xs:choice>` により通常データと暗号化データを排他選択 |
