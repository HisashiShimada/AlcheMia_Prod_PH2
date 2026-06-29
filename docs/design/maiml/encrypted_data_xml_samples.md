# MAIMLスキーマ 暗号化XML構造サンプル集

> 参照元仕様: `docs/design/maiml/encrypted_data_summary.md`  
> 作成日: 2026-06-16

---

## はじめに

本資料はMAIMLスキーマの暗号化仕様（`encryptionGroup` / `xenc:EncryptedData`）に基づき、実際のXML文書としてどのような構造になるかをサンプルで示します。

MAIMLにおける暗号化の基本構造は以下の通りです。

```
<対象要素 ...>
  <!-- 以下がencryptionGroupの内容 -->
  <childUri>...</childUri>        ← 暗号化前の子要素のURI（任意・複数可）
  <childHash>...</childHash>      ← 暗号化前の子要素のハッシュ（任意・複数可）
  <childUuid>...</childUuid>      ← 暗号化前の子要素のUUID（任意・複数可）
  <xenc:EncryptedData ...>        ← 暗号化データ本体（必須・1つ）
    <xenc:EncryptionMethod .../>  ← 暗号化アルゴリズム（任意）
    <ds:KeyInfo>...</ds:KeyInfo>  ← 鍵情報（任意）
    <xenc:CipherData>             ← 暗号データ（必須）
      <xenc:CipherValue>...</xenc:CipherValue>
    </xenc:CipherData>
    <xenc:EncryptionProperties>   ← 付加プロパティ（任意）
      ...
    </xenc:EncryptionProperties>
  </xenc:EncryptedData>
</対象要素>
```

---

## 名前空間宣言（共通）

各サンプルで使用する名前空間は以下の通りです。実際のXML文書ではルート要素またはその要素上で宣言します。

```xml
xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
xmlns:xenc11="http://www.w3.org/2009/xmlenc11#"
xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
xmlns="http://www.maiml.org/schemas"
```

---

## サンプル1: property要素の暗号化（最小構成）

`property` 要素の値（`value`）を暗号化した最小構成のサンプルです。  
`CipherValue` にBase64エンコードされた暗号化データをインラインで格納します。

```xml
<property key="myns:secretMaterial"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">

  <xenc:EncryptedData>
    <xenc:CipherData>
      <xenc:CipherValue>
        YWVzMjU2Y2JjZW5jcnlwdGVkZGF0YWV4YW1wbGU=
      </xenc:CipherValue>
    </xenc:CipherData>
  </xenc:EncryptedData>

</property>
```

### 要素・属性の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `property[@key]` | 必須 | プロパティのキー名（`xs:QName`型） |
| `xenc:EncryptedData` | 必須 | 暗号化データのコンテナ要素 |
| `xenc:CipherData` | 必須 | 暗号データの格納要素（`CipherValue` または `CipherReference` の一方） |
| `xenc:CipherValue` | ※二択 | Base64エンコードされた暗号化データ本体 |

---

## サンプル2: property要素の暗号化（アルゴリズム指定あり）

暗号化アルゴリズム（AES-256-CBC）を明示したサンプルです。

```xml
<property key="myns:secretCondition"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">

  <xenc:EncryptedData
    Id="enc-001"
    Type="http://www.w3.org/2001/04/xmlenc#Element"
    MimeType="text/xml">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc">
      <xenc:KeySize>256</xenc:KeySize>
    </xenc:EncryptionMethod>

    <xenc:CipherData>
      <xenc:CipherValue>
        YWVzMjU2Y2JjZW5jcnlwdGVkZGF0YWV4YW1wbGU=
      </xenc:CipherValue>
    </xenc:CipherData>

  </xenc:EncryptedData>

</property>
```

### 要素・属性の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `xenc:EncryptedData[@Id]` | 任意 | この要素の一意ID（XML ID型）。参照に使用 |
| `xenc:EncryptedData[@Type]` | 任意 | 暗号化されたコンテンツの種類を示すURI。`#Element`（XML要素全体）や`#Content`（内容のみ）など |
| `xenc:EncryptedData[@MimeType]` | 任意 | 暗号化前のデータのMIMEタイプ（例: `text/xml`, `application/octet-stream`） |
| `xenc:EncryptedData[@Encoding]` | 任意 | 暗号化前のデータのエンコーディングURI |
| `xenc:EncryptionMethod` | 任意 | 使用する暗号化アルゴリズムを指定するコンテナ |
| `xenc:EncryptionMethod[@Algorithm]` | 必須（要素使用時） | 暗号化アルゴリズムのURI（下表参照） |
| `xenc:KeySize` | 任意 | 鍵長のビット数（例: `128`, `192`, `256`） |

#### 主な Algorithm URI

| URI | アルゴリズム |
|---|---|
| `http://www.w3.org/2001/04/xmlenc#aes128-cbc` | AES-128-CBC |
| `http://www.w3.org/2001/04/xmlenc#aes192-cbc` | AES-192-CBC |
| `http://www.w3.org/2001/04/xmlenc#aes256-cbc` | AES-256-CBC |
| `http://www.w3.org/2001/04/xmlenc#aes128-gcm` | AES-128-GCM |
| `http://www.w3.org/2001/04/xmlenc#aes256-gcm` | AES-256-GCM |
| `http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p` | RSA-OAEP |
| `http://www.w3.org/2001/04/xmlenc#tripledes-cbc` | Triple DES-CBC |

---

## サンプル3: property要素の暗号化（鍵名指定あり）

`ds:KeyInfo` に鍵の名前を指定したサンプルです。復号時にどの鍵を使うか識別できます。

```xml
<property key="myns:secretResult"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <xenc:EncryptedData Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>

    <ds:KeyInfo>
      <ds:KeyName>maiml-experiment-key-2026</ds:KeyName>
    </ds:KeyInfo>

    <xenc:CipherData>
      <xenc:CipherValue>
        c2VjcmV0ZXhwZXJpbWVudGRhdGFlbmNyeXB0ZWQ=
      </xenc:CipherValue>
    </xenc:CipherData>

  </xenc:EncryptedData>

</property>
```

### ds:KeyInfo 子要素の説明

| 要素 | 説明 | 使用例 |
|---|---|---|
| `ds:KeyName` | 鍵の識別名（文字列） | `maiml-experiment-key-2026` |
| `ds:KeyValue` | 公開鍵の値（DSA/RSA） | 証明書なしで公開鍵を直接埋め込む場合 |
| `ds:RetrievalMethod` | 鍵情報の外部参照URI | 鍵情報を別ファイルや別要素から取得する場合 |
| `ds:X509Data` | X.509証明書情報 | PKIベースの鍵管理を使う場合 |
| `ds:PGPData` | PGP公開鍵情報 | PGP鍵管理を使う場合 |

---

## サンプル4: property要素の暗号化（X.509証明書による鍵指定）

X.509証明書を使って復号鍵を示すサンプルです。

```xml
<property key="myns:protectedOwnerData"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <xenc:EncryptedData Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>

    <ds:KeyInfo>
      <xenc:EncryptedKey Recipient="org-550e8400">
        <xenc:EncryptionMethod
          Algorithm="http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p"/>
        <ds:KeyInfo>
          <ds:X509Data>
            <ds:X509Certificate>
              MIICajCCAdOgAwIBAgIBADANBgkqhkiG9w0BAQUFADA...（省略）
            </ds:X509Certificate>
          </ds:X509Data>
        </ds:KeyInfo>
        <xenc:CipherData>
          <xenc:CipherValue>
            ZW5jcnlwdGVkQUVTa2V5dmFsdWVleGFtcGxl
          </xenc:CipherValue>
        </xenc:CipherData>
      </xenc:EncryptedKey>
    </ds:KeyInfo>

    <xenc:CipherData>
      <xenc:CipherValue>
        cHJvdGVjdGVkZXhwZXJpbWVudGRhdGE=
      </xenc:CipherValue>
    </xenc:CipherData>

  </xenc:EncryptedData>

</property>
```

### EncryptedKey の要素・属性の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `xenc:EncryptedKey` | — | AES鍵自体をRSAで暗号化して埋め込むエンベロープ暗号化パターン |
| `xenc:EncryptedKey[@Recipient]` | 任意 | この鍵の受信者識別子（例: 組織IDや担当者名） |
| `xenc:EncryptedKey[@Id]` | 任意 | 要素の一意ID |
| `ds:X509Certificate` | — | Base64エンコードされたDER形式X.509証明書 |
| `ds:X509IssuerSerial` | — | 発行者名＋シリアル番号による証明書指定 |
| `ds:X509SKI` | — | Subject Key Identifierによる証明書指定 |
| `ds:X509CRL` | — | 証明書失効リスト |

---

## サンプル5: property要素の暗号化（外部参照 CipherReference）

暗号化データを外部URIに持ち、参照する方式のサンプルです。

```xml
<property key="myns:largeDataset"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">

  <xenc:EncryptedData
    Type="http://www.w3.org/2001/04/xmlenc#Element"
    MimeType="application/octet-stream">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>

    <xenc:CipherData>
      <xenc:CipherReference URI="https://storage.example.com/encrypted/dataset-001.bin">
        <xenc:Transforms>
          <ds:Transform
            Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"
            xmlns:ds="http://www.w3.org/2000/09/xmldsig#"/>
        </xenc:Transforms>
      </xenc:CipherReference>
    </xenc:CipherData>

  </xenc:EncryptedData>

</property>
```

### CipherReference の要素・属性の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `xenc:CipherReference[@URI]` | 必須 | 暗号化データが格納されている外部リソースのURI |
| `xenc:Transforms` | 任意 | URIから取得したデータに適用する変換リスト（XPath・Base64デコード等） |
| `ds:Transform[@Algorithm]` | 必須（使用時） | 変換アルゴリズムのURI |

---

## サンプル6: globalObjectContentGroup の暗号化（オブジェクト全体の暗号化）

MAIMLの主要オブジェクト（`results`, `material`, `condition` 等）全体を暗号化するサンプルです。  
`childUri`・`childHash`・`childUuid` を使って暗号化前の子オブジェクトへの参照情報を残します。

```xml
<results id="res-001"
         xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <!-- globalObjectContentGroup の uuid は必須 -->
  <uuid>550e8400-e29b-41d4-a716-446655440000</uuid>

  <!-- encryptionGroup: 暗号化前の子オブジェクト参照情報（任意） -->
  <childUri>urn:uuid:6ba7b810-9dad-11d1-80b4-00c04fd430c8</childUri>
  <childUri>urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7</childUri>
  <childHash>SHA-256でのハッシュ値をBase64エンコード==</childHash>
  <childUuid>6ba7b810-9dad-11d1-80b4-00c04fd430c8</childUuid>

  <!-- encryptionGroup: 暗号化データ本体（必須） -->
  <xenc:EncryptedData
    Id="enc-results-001"
    Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>

    <ds:KeyInfo>
      <ds:KeyName>results-encryption-key</ds:KeyName>
    </ds:KeyInfo>

    <xenc:CipherData>
      <xenc:CipherValue>
        ZW5jcnlwdGVkcmVzdWx0c2RhdGE=
      </xenc:CipherValue>
    </xenc:CipherData>

    <xenc:EncryptionProperties>
      <xenc:EncryptionProperty
        Target="#enc-results-001"
        xmlns:maiml="http://www.maiml.org/schemas">
        <maiml:encryptedAt>2026-06-16T09:00:00Z</maiml:encryptedAt>
      </xenc:EncryptionProperty>
    </xenc:EncryptionProperties>

  </xenc:EncryptedData>

</results>
```

### encryptionGroup 専用要素の説明

| 要素 | 型 | 必須 | 説明 |
|---|---|---|---|
| `childUri` | `xs:anyURI` | 任意（0..∞） | 暗号化対象となった子オブジェクトのURI。暗号化後も参照関係を保持するために使用 |
| `childHash` | `xs:base64Binary` | 任意（0..∞） | 暗号化前の子オブジェクトのハッシュ値（整合性検証用） |
| `childUuid` | `uuid` | 任意（0..∞） | 暗号化対象の子オブジェクトのUUID（MAIMLのuuid型 = UUID v3〜v5形式） |

### EncryptionProperties の要素・属性の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `xenc:EncryptionProperties` | 任意 | 複数の `EncryptionProperty` を束ねるコンテナ |
| `xenc:EncryptionProperties[@Id]` | 任意 | 要素の一意ID |
| `xenc:EncryptionProperty` | 必須（使用時） | 任意の付加情報を格納する要素（内容は任意の名前空間要素） |
| `xenc:EncryptionProperty[@Target]` | 任意 | この情報が対応する `EncryptedData` の参照URI（例: `#enc-001`） |
| `xenc:EncryptionProperty[@Id]` | 任意 | 要素の一意ID |

---

## サンプル7: document要素の電子署名

`documentType` は `ds:Signature` 要素をサポートしており、文書全体へ電子署名を付与できます。  
暗号化と組み合わせることで、**改ざん検知 + 秘匿化**の両立が可能です。

```xml
<document id="doc-001"
          xmlns="http://www.maiml.org/schemas"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">

  <!-- ds:Signature: 電子署名（任意） -->
  <ds:Signature Id="sig-001">

    <ds:SignedInfo>
      <ds:CanonicalizationMethod
        Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod
        Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#doc-001">
        <ds:Transforms>
          <ds:Transform
            Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </ds:Transforms>
        <ds:DigestMethod
          Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>
          digestValueBase64EncodedHere==
        </ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>

    <ds:SignatureValue>
      signatureValueBase64EncodedHere==
    </ds:SignatureValue>

    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>
          MIICajCCAdOgAwIBAgIBADANBgkqhkiG9w0BAQUFADA...（省略）
        </ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>

  </ds:Signature>

  <!-- globalObjectContentGroup -->
  <uuid>a987fbc9-4bed-3078-cf07-9141ba07c9f3</uuid>
  <name>maiml:experimentDocument</name>
  <description>実験データ文書（署名付き）</description>

  <creator id="creator-001">
    <uuid>b1b2b3b4-b5b6-4b7b-b8b9-b0b1b2b3b4b5</uuid>
    <name>maiml:lab1</name>
    <vendorRef id="vref-001" ref="vendor-001"/>
  </creator>

  <vendor id="vendor-001">
    <uuid>c1c2c3c4-c5c6-4c7c-c8c9-c0c1c2c3c4c5</uuid>
    <name>maiml:vendorA</name>
  </vendor>

  <owner id="owner-001">
    <uuid>d1d2d3d4-d5d6-4d7d-d8d9-d0d1d2d3d4d5</uuid>
    <name>maiml:orgX</name>
  </owner>

  <date>2026-06-16T09:00:00Z</date>

</document>
```

### ds:Signature の主要要素の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `ds:Signature` | 任意 | 電子署名のコンテナ（`document`直下に0または1つ配置） |
| `ds:SignedInfo` | 必須（Signature使用時） | 署名対象の情報（正規化アルゴリズム・署名アルゴリズム・参照リスト） |
| `ds:CanonicalizationMethod[@Algorithm]` | 必須 | XML正規化アルゴリズムのURI |
| `ds:SignatureMethod[@Algorithm]` | 必須 | 署名アルゴリズムのURI（RSA-SHA256等） |
| `ds:Reference[@URI]` | 必須（1..∞） | 署名対象の参照URI（`#id` 形式でXML要素を指定） |
| `ds:DigestMethod[@Algorithm]` | 必須 | ダイジェストアルゴリズムのURI（SHA-256等） |
| `ds:DigestValue` | 必須 | 参照先のBase64エンコードされたダイジェスト値 |
| `ds:SignatureValue` | 必須 | Base64エンコードされた署名値 |
| `ds:KeyInfo` | 任意 | 検証鍵情報（`ds:X509Data`, `ds:KeyName` 等） |

---

## サンプル8: PBKDF2による鍵導出（XML Encryption 1.1）

パスワードから鍵を導出する `PBKDF2` を使ったサンプルです（`xenc-schema-11.xsd`）。

```xml
<property key="myns:passwordProtected"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
          xmlns:xenc11="http://www.w3.org/2009/xmlenc11#"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <xenc:EncryptedData Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>

    <ds:KeyInfo>
      <xenc11:DerivedKey>
        <xenc11:KeyDerivationMethod
          Algorithm="http://www.w3.org/2009/xmlenc11#pbkdf2">
          <xenc11:PBKDF2-params>
            <xenc11:Salt>
              <xenc11:Specified>c2FsdHZhbHVlZXhhbXBsZQ==</xenc11:Specified>
            </xenc11:Salt>
            <xenc11:IterationCount>10000</xenc11:IterationCount>
            <xenc11:KeyLength>32</xenc11:KeyLength>
            <xenc11:PRF Algorithm="http://www.w3.org/2001/04/xmldsig-more#hmac-sha256"/>
          </xenc11:PBKDF2-params>
        </xenc11:KeyDerivationMethod>
      </xenc11:DerivedKey>
    </ds:KeyInfo>

    <xenc:CipherData>
      <xenc:CipherValue>
        cGJrZGYyZW5jcnlwdGVkZGF0YWV4YW1wbGU=
      </xenc:CipherValue>
    </xenc:CipherData>

  </xenc:EncryptedData>

</property>
```

### PBKDF2-params の要素・属性の説明

| 要素/属性 | 必須 | 説明 |
|---|---|---|
| `xenc11:DerivedKey` | — | 鍵導出の定義コンテナ |
| `xenc11:KeyDerivationMethod[@Algorithm]` | 必須 | 鍵導出アルゴリズムのURI（PBKDF2の場合は `#pbkdf2`） |
| `xenc11:PBKDF2-params` | — | PBKDF2パラメータコンテナ |
| `xenc11:Salt/xenc11:Specified` | 必須（Salt使用時） | ソルト値（Base64エンコード） |
| `xenc11:Salt/xenc11:OtherSource` | 任意（Specified代替） | 外部ソースからソルトを取得する場合のアルゴリズム指定 |
| `xenc11:IterationCount` | 必須 | KDF繰り返し回数（大きいほど安全・低速。推奨: 10000以上） |
| `xenc11:KeyLength` | 必須 | 導出する鍵のバイト数（AES-256の場合は `32`） |
| `xenc11:PRF[@Algorithm]` | 必須 | 擬似乱数関数のURI（例: `hmac-sha256`） |

---

## サンプル全体構造まとめ

```
xenc:EncryptedData
├── [@Id]                    : 要素ID（任意）
├── [@Type]                  : コンテンツ種別URI（任意）
├── [@MimeType]              : MIMEタイプ（任意）
├── [@Encoding]              : エンコーディングURI（任意）
│
├── xenc:EncryptionMethod    : 暗号化アルゴリズム（任意）
│   ├── [@Algorithm]         : アルゴリズムURI（必須）
│   ├── xenc:KeySize         : 鍵長ビット数（任意）
│   └── xenc:OAEPparams      : RSA-OAEPパラメータ（任意）
│
├── ds:KeyInfo               : 鍵情報（任意）
│   ├── ds:KeyName           : 鍵の名前（文字列）
│   ├── ds:KeyValue          : 公開鍵の値（DSA/RSA）
│   ├── ds:RetrievalMethod   : 外部参照による鍵取得
│   ├── ds:X509Data          : X.509証明書情報
│   │   ├── ds:X509Certificate    : DER証明書（Base64）
│   │   ├── ds:X509IssuerSerial   : 発行者+シリアル番号
│   │   ├── ds:X509SKI            : Subject Key ID
│   │   └── ds:X509CRL            : 証明書失効リスト
│   ├── ds:PGPData           : PGP公開鍵情報
│   ├── ds:SPKIData          : SPKI公開鍵情報
│   ├── ds:MgmtData          : 管理情報
│   └── xenc:EncryptedKey    : 暗号化された鍵（エンベロープ方式）
│       ├── [@Recipient]     : 受信者識別子（任意）
│       ├── xenc:EncryptionMethod
│       ├── ds:KeyInfo
│       ├── xenc:CipherData
│       ├── xenc:ReferenceList
│       └── xenc:CarriedKeyName
│
├── xenc:CipherData          : 暗号データ（必須）
│   ├── xenc:CipherValue     : インライン格納（Base64）
│   └── xenc:CipherReference : 外部参照
│       ├── [@URI]           : データ取得先URI（必須）
│       └── xenc:Transforms  : 取得後の変換リスト（任意）
│
└── xenc:EncryptionProperties : 付加情報（任意）
    └── xenc:EncryptionProperty（1..∞）
        ├── [@Target]        : 対象EncryptedDataの参照URI（任意）
        ├── [@Id]            : 要素ID（任意）
        └── （任意の名前空間要素を任意個数）
```

---

## 暗号化パターンの選択指針

| パターン | 使用方法 | 適する場面 |
|---|---|---|
| **CipherValue（インライン）** | 暗号化データをBase64でXML内に埋め込む | データサイズが小さい場合、自己完結したXML文書が必要な場合 |
| **CipherReference（外部参照）** | 暗号化データをURIで外部に置く | データサイズが大きい場合、バイナリデータやファイルを暗号化する場合 |
| **EncryptedKey（エンベロープ）** | AES鍵をRSAで暗号化して埋め込む | 公開鍵暗号基盤（PKI）を利用する場合、複数受信者に異なる鍵で配送する場合 |
| **DerivedKey / PBKDF2** | パスワードから鍵を導出 | パスワードベースの暗号化が必要な場合 |
| **ds:Signature** | 文書全体に電子署名を付与 | 改ざん検知が必要な場合（暗号化と併用可能） |
