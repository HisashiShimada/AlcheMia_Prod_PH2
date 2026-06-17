/**
 * 暗号化管理コントローラー
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理APIのリクエストハンドラ。
 *
 * @remarks
 * 【現在の状態】開発用スタブ実装
 * インメモリのサンプルデータを返す。実際の暗号化処理は未実装。
 *
 * 【本実装への移行手順】
 * 1. このファイル（encryptionController.ts）のみを差し替える
 * 2. encryptionRoutes.ts / server.ts / フロントエンドは変更不要
 * 3. 実装するサービス: encryptionService.ts（新規作成）
 *    - MAIMLパース・XPath解析
 *    - W3C XML Encryption によるデータ暗号化/復号化
 *    - 鍵管理（DB保存）
 */

import { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// スタブデータ定義
// ---------------------------------------------------------------------------

/** MAIMLツリー構造スタブ */
const STUB_MAIML_STRUCTURE = [
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

/** 鍵の型 */
interface EncryptionKeyRecord {
  keyId: string;
  keyName: string;
  algorithm: string;
  keySize: number;
  createdAt: string;
  expiresAt: string | null;
  createdBy: string;
  usageCount: number;
  lastUsedAt: string | null;
  description: string;
  isActive: boolean;
}

/** 暗号化鍵スタブデータ（サーバー再起動までインメモリ保持） */
let stubKeys: EncryptionKeyRecord[] = [
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
// XMLプレビュー生成ヘルパー（スタブ）
// ---------------------------------------------------------------------------

const KEY_SIZE_MAP: Record<string, number> = {
  'aes256-cbc': 256,
  'aes192-cbc': 192,
  'aes128-cbc': 128,
  'aes256-gcm': 256,
  'aes128-gcm': 128,
  'tripledes-cbc': 168,
  'rsa-oaep-mgf1p': 2048,
};

function buildPreviewXmlWithKey(keyName: string, algorithm: string, recordTimestamp: boolean): string {
  const algorithmUri = `http://www.w3.org/2001/04/xmlenc#${algorithm}`;
  const keySize = KEY_SIZE_MAP[algorithm] ?? 256;
  const timestamp = new Date().toISOString();

  const propertiesBlock = recordTimestamp
    ? `
    <xenc:EncryptionProperties>
      <xenc:EncryptionProperty
        Target="#enc-preview"
        xmlns:maiml="http://www.maiml.org/schemas">
        <maiml:encryptedAt>${timestamp}</maiml:encryptedAt>
      </xenc:EncryptionProperty>
    </xenc:EncryptionProperties>`
    : '';

  return `<property key="targetElement"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <xenc:EncryptedData
    Id="enc-preview"
    Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="${algorithmUri}">
      <xenc:KeySize>${keySize}</xenc:KeySize>
    </xenc:EncryptionMethod>

    <ds:KeyInfo>
      <ds:KeyName>${keyName}</ds:KeyName>
    </ds:KeyInfo>

    <xenc:CipherData>
      <xenc:CipherValue>
        YWVzMjU2Y2JjZW5jcnlwdGVkZGF0YWV4YW1wbGU=
      </xenc:CipherValue>
    </xenc:CipherData>${propertiesBlock}

  </xenc:EncryptedData>

</property>`;
}

function buildPreviewXmlPbkdf2(algorithm: string, iterationCount: number): string {
  const algorithmUri = `http://www.w3.org/2001/04/xmlenc#${algorithm}`;

  return `<property key="targetElement"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
          xmlns:xenc11="http://www.w3.org/2009/xmlenc11#"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <xenc:EncryptedData Type="http://www.w3.org/2001/04/xmlenc#Element">

    <xenc:EncryptionMethod
      Algorithm="${algorithmUri}"/>

    <ds:KeyInfo>
      <xenc11:DerivedKey>
        <xenc11:KeyDerivationMethod
          Algorithm="http://www.w3.org/2009/xmlenc11#pbkdf2">
          <xenc11:PBKDF2-params>
            <xenc11:Salt>
              <xenc11:Specified>c2FsdHZhbHVlZXhhbXBsZQ==</xenc11:Specified>
            </xenc11:Salt>
            <xenc11:IterationCount>${iterationCount}</xenc11:IterationCount>
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

</property>`;
}

// ---------------------------------------------------------------------------
// レスポンスヘルパー
// ---------------------------------------------------------------------------

function ok(res: Response, data: unknown): void {
  res.status(200).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

function notFound(res: Response, message: string): void {
  res.status(404).json({
    success: false,
    error: { code: 'E6001', message },
    meta: { timestamp: new Date().toISOString() },
  });
}

// ---------------------------------------------------------------------------
// エンドポイントハンドラ
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/encryption/projects/:projectName/structure
 * MAIMLファイルの暗号化対象ツリー構造を取得
 */
export const getMaimlStructure = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  console.log(`[encryption] getMaimlStructure: projectName=${projectName}`);

  // TODO: 本実装では projectName からMAIMLファイルを取得してパース処理を行う
  await new Promise((r) => setTimeout(r, 50));

  ok(res, { structure: STUB_MAIML_STRUCTURE });
};

/**
 * POST /api/v1/encryption/projects/:projectName/preview
 * 暗号化プレビューXMLを返す
 */
export const previewEncryption = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { config } = req.body as {
    config: {
      algorithm: string;
      keyMethod: string;
      keyName?: string;
      pbkdf2Config?: { iterationCount: number };
      encryptionProperties?: { recordTimestamp: boolean };
    };
  };

  console.log(`[encryption] previewEncryption: projectName=${projectName}`);

  // TODO: 本実装では指定ノードの実際のXMLを取得してプレビューを生成する
  await new Promise((r) => setTimeout(r, 100));

  const beforeXml = `<property key="targetElement"
          xmlns:xenc="http://www.w3.org/2001/04/xmlenc#">
  <value>機密データ（暗号化対象）</value>
</property>`;

  let afterXml: string;

  if (config?.keyMethod === 'pbkdf2') {
    afterXml = buildPreviewXmlPbkdf2(
      config.algorithm ?? 'aes256-cbc',
      config.pbkdf2Config?.iterationCount ?? 10000,
    );
  } else {
    afterXml = buildPreviewXmlWithKey(
      config?.keyName ?? '(未指定)',
      config?.algorithm ?? 'aes256-cbc',
      config?.encryptionProperties?.recordTimestamp ?? true,
    );
  }

  const algorithmUri = `http://www.w3.org/2001/04/xmlenc#${config?.algorithm ?? 'aes256-cbc'}`;

  ok(res, { beforeXml, afterXml, algorithmUri });
};

/**
 * POST /api/v1/encryption/projects/:projectName/encrypt
 * 指定要素の暗号化を実行
 */
export const encryptElement = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { targetPath, config } = req.body;

  console.log(`[encryption] encryptElement: projectName=${projectName}, targetPath=${targetPath}`);

  // TODO: 本実装では W3C XML Encryption を使用して実際の暗号化を行う
  await new Promise((r) => setTimeout(r, 300));

  // 使用回数をインクリメント（スタブ）
  if (config?.keyName) {
    const key = stubKeys.find((k) => k.keyName === config.keyName);
    if (key) {
      key.usageCount += 1;
      key.lastUsedAt = new Date().toISOString();
    }
  }

  ok(res, {
    success: true,
    updatedFilePath: `projects/${projectName}/${projectName}.maiml`,
    backupFilePath: `projects/${projectName}/archive/${projectName}_backup_${Date.now()}.maiml`,
  });
};

/**
 * POST /api/v1/encryption/projects/:projectName/decrypt
 * 指定要素の復号化を実行
 */
export const decryptElement = async (req: Request, res: Response): Promise<void> => {
  const { projectName } = req.params;
  const { targetPath, decryptionKey } = req.body;

  console.log(`[encryption] decryptElement: projectName=${projectName}, targetPath=${targetPath}`);

  // TODO: 本実装では W3C XML Encryption を使用して実際の復号化を行う
  await new Promise((r) => setTimeout(r, 300));

  // スタブ: "wrongpassword" はエラーとして返す（テスト用）
  if (decryptionKey?.password === 'wrongpassword') {
    res.status(400).json({
      success: false,
      error: { code: 'E4001', message: '復号化に失敗しました。鍵またはパスワードが正しくありません。' },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  ok(res, {
    success: true,
    decryptedXml: `<property key="targetElement">
  <value>復号化されたデータ</value>
</property>`,
  });
};

/**
 * GET /api/v1/encryption/keys
 * 暗号化鍵一覧を取得
 */
export const listKeys = async (_req: Request, res: Response): Promise<void> => {
  // TODO: 本実装では DB から鍵一覧を取得する
  await new Promise((r) => setTimeout(r, 50));
  ok(res, { keys: stubKeys });
};

/**
 * GET /api/v1/encryption/keys/:keyId
 * 暗号化鍵の詳細を取得
 */
export const getKey = async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params;
  // TODO: 本実装では DB から鍵情報を取得する
  await new Promise((r) => setTimeout(r, 50));

  const key = stubKeys.find((k) => k.keyId === keyId);
  if (!key) {
    notFound(res, `鍵が見つかりません: ${keyId}`);
    return;
  }
  ok(res, { key });
};

/**
 * POST /api/v1/encryption/keys
 * 暗号化鍵を新規作成
 */
export const createKey = async (req: Request, res: Response): Promise<void> => {
  const { keyName, algorithm, expiresAt, description } = req.body as {
    keyName: string;
    algorithm: string;
    expiresAt?: string;
    description?: string;
  };

  console.log(`[encryption] createKey: keyName=${keyName}, algorithm=${algorithm}`);

  // TODO: 本実装では暗号ライブラリで鍵を生成し DB に保存する
  await new Promise((r) => setTimeout(r, 200));

  if (stubKeys.some((k) => k.keyName === keyName)) {
    res.status(409).json({
      success: false,
      error: { code: 'E7001', message: `鍵名 "${keyName}" はすでに存在します。` },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const newKey: EncryptionKeyRecord = {
    keyId: `key-${Date.now()}`,
    keyName,
    algorithm,
    keySize: KEY_SIZE_MAP[algorithm] ?? 256,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt ?? null,
    createdBy: 'current-user@example.com',
    usageCount: 0,
    lastUsedAt: null,
    description: description ?? '',
    isActive: true,
  };

  stubKeys.push(newKey);

  res.status(201).json({
    success: true,
    data: { key: newKey },
    meta: { timestamp: new Date().toISOString() },
  });
};

/**
 * DELETE /api/v1/encryption/keys/:keyId
 * 暗号化鍵を削除
 */
export const deleteKey = async (req: Request, res: Response): Promise<void> => {
  const { keyId } = req.params;

  // TODO: 本実装では DB から鍵情報を取得して論理削除または物理削除を行う
  await new Promise((r) => setTimeout(r, 150));

  const idx = stubKeys.findIndex((k) => k.keyId === keyId);
  if (idx === -1) {
    notFound(res, `鍵が見つかりません: ${keyId}`);
    return;
  }

  if (stubKeys[idx].usageCount > 0) {
    res.status(409).json({
      success: false,
      error: { code: 'E7002', message: 'この鍵はMAIMLデータの暗号化に使用されているため削除できません。' },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  stubKeys.splice(idx, 1);
  ok(res, { deleted: true, keyId });
};
