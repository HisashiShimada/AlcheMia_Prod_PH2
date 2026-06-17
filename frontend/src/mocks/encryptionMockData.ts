/**
 * 暗号化管理UIのモックデータ
 *
 * @remarks
 * バックエンド未実装のため、フロントエンドモック用データを定義。
 * 実際のMAIML構造に基づいたサンプルデータ。
 * 参照: docs/design/maiml/encrypted_data_xml_samples.md
 */

import type { MaimlTreeNode, EncryptionKey } from '@/types/encryption';

// ---------------------------------------------------------------------------
// MAIMLツリー構造のモックデータ
// ---------------------------------------------------------------------------

/**
 * サンプルMAIMLファイルのツリー構造
 * （実際の解析はバックエンドで行うが、モックとして定義）
 */
export const MOCK_MAIML_STRUCTURE: MaimlTreeNode[] = [
  {
    path: '/maiml/document',
    tagName: 'document',
    id: 'doc-001',
    label: 'document',
    isEncrypted: false,
    children: [
      {
        path: '/maiml/pnml',
        tagName: 'pnml',
        id: 'pnml-001',
        label: 'pnml',
        isEncrypted: false,
        children: [
          {
            path: "/maiml/pnml/method[@id='method-001']",
            tagName: 'method',
            id: 'method-001',
            label: '実験手順A',
            isEncrypted: false,
            children: [
              {
                path: "/maiml/pnml/method[@id='method-001']/place[@id='place-mat-001']",
                tagName: 'place',
                id: 'place-mat-001',
                placeType: 'Material',
                label: '試料A（硫酸銅水溶液）',
                isEncrypted: false,
                children: [
                  {
                    path: "/maiml/pnml/method[@id='method-001']/place[@id='place-mat-001']/property[@key='maiml:concentration']",
                    tagName: 'property',
                    key: 'maiml:concentration',
                    label: '濃度',
                    isEncrypted: false,
                  },
                  {
                    path: "/maiml/pnml/method[@id='method-001']/place[@id='place-mat-001']/property[@key='myns:secretFormula']",
                    tagName: 'property',
                    key: 'myns:secretFormula',
                    label: '秘密の製造方法',
                    isEncrypted: true,
                    encryptionInfo: {
                      algorithmUri: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
                      keyName: 'maiml-experiment-key-2026',
                      encryptionId: 'enc-001',
                      encryptedAt: '2026-06-10T10:00:00Z',
                    },
                  },
                ],
              },
              {
                path: "/maiml/pnml/method[@id='method-001']/transition[@id='trans-001']",
                tagName: 'transition',
                id: 'trans-001',
                label: '混合・反応',
                isEncrypted: false,
              },
              {
                path: "/maiml/pnml/method[@id='method-001']/place[@id='place-cond-001']",
                tagName: 'place',
                id: 'place-cond-001',
                placeType: 'Condition',
                label: '温度・時間条件',
                isEncrypted: false,
                children: [
                  {
                    path: "/maiml/pnml/method[@id='method-001']/place[@id='place-cond-001']/property[@key='maiml:temperature']",
                    tagName: 'property',
                    key: 'maiml:temperature',
                    label: '反応温度 (℃)',
                    isEncrypted: false,
                  },
                  {
                    path: "/maiml/pnml/method[@id='method-001']/place[@id='place-cond-001']/property[@key='maiml:reactionTime']",
                    tagName: 'property',
                    key: 'maiml:reactionTime',
                    label: '反応時間 (min)',
                    isEncrypted: false,
                  },
                ],
              },
              {
                path: "/maiml/pnml/method[@id='method-001']/place[@id='place-res-001']",
                tagName: 'place',
                id: 'place-res-001',
                placeType: 'Result',
                label: '生成物',
                isEncrypted: false,
                children: [
                  {
                    path: "/maiml/pnml/method[@id='method-001']/place[@id='place-res-001']/property[@key='maiml:yield']",
                    tagName: 'property',
                    key: 'maiml:yield',
                    label: '収率 (%)',
                    isEncrypted: false,
                  },
                  {
                    path: "/maiml/pnml/method[@id='method-001']/place[@id='place-res-001']/property[@key='myns:secretResult']",
                    tagName: 'property',
                    key: 'myns:secretResult',
                    label: '機密実験結果',
                    isEncrypted: true,
                    encryptionInfo: {
                      algorithmUri: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
                      keyName: 'results-encryption-key',
                      encryptionId: 'enc-results-001',
                      encryptedAt: '2026-06-16T09:00:00Z',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// 暗号化鍵のモックデータ
// ---------------------------------------------------------------------------

/** サンプル暗号化鍵一覧 */
export const MOCK_ENCRYPTION_KEYS: EncryptionKey[] = [
  {
    keyId: 'key-001',
    keyName: 'maiml-experiment-key-2026',
    algorithm: 'aes256-cbc',
    keySize: 256,
    createdAt: '2026-01-15T10:30:00Z',
    expiresAt: '2027-01-15T10:30:00Z',
    createdBy: 'admin@example.com',
    usageCount: 127,
    lastUsedAt: '2026-06-10T10:00:00Z',
    description: '実験データ汎用暗号化鍵（2026年版）',
    isActive: true,
  },
  {
    keyId: 'key-002',
    keyName: 'results-encryption-key',
    algorithm: 'aes256-cbc',
    keySize: 256,
    createdAt: '2026-02-01T09:00:00Z',
    expiresAt: '2027-02-01T09:00:00Z',
    createdBy: 'manager@example.com',
    usageCount: 45,
    lastUsedAt: '2026-06-16T09:00:00Z',
    description: '実験結果データ専用鍵',
    isActive: true,
  },
  {
    keyId: 'key-003',
    keyName: 'material-key-dept01',
    algorithm: 'aes128-cbc',
    keySize: 128,
    createdAt: '2026-03-10T14:00:00Z',
    expiresAt: '2026-09-10T14:00:00Z',
    createdBy: 'admin@example.com',
    usageCount: 12,
    lastUsedAt: '2026-05-20T11:30:00Z',
    description: '部門01の材料データ専用鍵（短期）',
    isActive: true,
  },
  {
    keyId: 'key-004',
    keyName: 'legacy-key-2025',
    algorithm: 'aes128-cbc',
    keySize: 128,
    createdAt: '2025-06-01T08:00:00Z',
    expiresAt: '2026-06-01T08:00:00Z',
    createdBy: 'admin@example.com',
    usageCount: 203,
    lastUsedAt: '2026-05-31T23:59:00Z',
    description: '旧年度データ用（有効期限切れ）',
    isActive: false,
  },
];

// ---------------------------------------------------------------------------
// XMLサンプル（プレビュー用）
// ---------------------------------------------------------------------------

/** 暗号化前XMLサンプル（propertyの最小構成） */
export const MOCK_BEFORE_XML_SIMPLE = `<property key="myns:secretFormula"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">
  <value>機密の製造方法: CuSO4 + H2O → [秘密の合成プロセス]</value>
</property>`;

/** 暗号化後XMLサンプル（アルゴリズム指定あり + 鍵名） */
export const MOCK_AFTER_XML_WITH_KEY = `<property key="myns:secretFormula"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <xenc:EncryptedData
    Id="enc-001"
    Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc">
      <xenc:KeySize>256</xenc:KeySize>
    </xenc:EncryptionMethod>

    <ds:KeyInfo>
      <ds:KeyName>maiml-experiment-key-2026</ds:KeyName>
    </ds:KeyInfo>

    <xenc:CipherData>
      <xenc:CipherValue>
        YWVzMjU2Y2JjZW5jcnlwdGVkZGF0YWV4YW1wbGVmb3Jt
        dWxhc2VjcmV0ZGF0YWFiY2RlZmdoaWprbG1ub3BxcnN0
      </xenc:CipherValue>
    </xenc:CipherData>

    <xenc:EncryptionProperties>
      <xenc:EncryptionProperty
        Target="#enc-001"
        xmlns:maiml="http://www.maiml.org/schemas">
        <maiml:encryptedAt>2026-06-17T14:25:00Z</maiml:encryptedAt>
      </xenc:EncryptionProperty>
    </xenc:EncryptionProperties>

  </xenc:EncryptedData>

</property>`;

/** 暗号化後XMLサンプル（PBKDF2鍵導出） */
export const MOCK_AFTER_XML_PBKDF2 = `<property key="myns:secretFormula"
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
        cGJrZGYyZW5jcnlwdGVkZGF0YWV4YW1wbGVmb3JtdWxh
      </xenc:CipherValue>
    </xenc:CipherData>

  </xenc:EncryptedData>

</property>`;

/** 大規模オブジェクト（results）の暗号化サンプル */
export const MOCK_BEFORE_XML_RESULTS = `<results id="res-001"
         xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <uuid>550e8400-e29b-41d4-a716-446655440000</uuid>
  <name>maiml:experimentResults</name>
  <description>機密実験結果データ</description>
  <property key="maiml:yield">
    <value>87.3</value>
  </property>
  <property key="myns:secretResult">
    <value>機密の実験結果データ（詳細な収率・純度データ）</value>
  </property>
</results>`;

export const MOCK_AFTER_XML_RESULTS = `<results id="res-001"
         xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <uuid>550e8400-e29b-41d4-a716-446655440000</uuid>

  <!-- encryptionGroup: 暗号化前の子オブジェクト参照情報 -->
  <childUri>urn:uuid:6ba7b810-9dad-11d1-80b4-00c04fd430c8</childUri>
  <childHash>SHA256hashValueBase64Encoded==</childHash>
  <childUuid>6ba7b810-9dad-11d1-80b4-00c04fd430c8</childUuid>

  <!-- encryptionGroup: 暗号化データ本体 -->
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
        ZW5jcnlwdGVkcmVzdWx0c2RhdGFleGFtcGxl
      </xenc:CipherValue>
    </xenc:CipherData>

    <xenc:EncryptionProperties>
      <xenc:EncryptionProperty
        Target="#enc-results-001"
        xmlns:maiml="http://www.maiml.org/schemas">
        <maiml:encryptedAt>2026-06-17T14:25:00Z</maiml:encryptedAt>
      </xenc:EncryptionProperty>
    </xenc:EncryptionProperties>

  </xenc:EncryptedData>

</results>`;
