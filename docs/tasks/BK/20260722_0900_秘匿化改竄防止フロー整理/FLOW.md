# 秘匿化・改竄防止 フロント〜バックエンド 処理フロー整理

作成日: 2026-07-22  
調査対象コミット: `97770410d29f779769472848cbe3096c000f06c4`

---

## 目次

1. [全体アーキテクチャ](#全体アーキテクチャ)
2. [秘匿化（暗号化）フロー](#秘匿化暗号化フロー)
3. [復号フロー](#復号フロー)
4. [改竄防止（署名）フロー](#改竄防止署名フロー)
5. [改竄防止（検証）フロー](#改竄防止検証フロー)
6. [エンドポイント対応表](#エンドポイント対応表)
7. [現状の仮実装ポイント](#現状の仮実装ポイント)

---

## 全体アーキテクチャ

```
【フロントエンド (Next.js)】

  ProjectManagement.tsx
    ├── EncryptionManagementModal  → EncryptionManagement.tsx   (秘匿化UI)
    └── SignatureManagementModal   → SignatureManagement.tsx    (改竄防止UI)

  UI コンポーネント呼び出し
    ├── encryptionService.ts  ─── axios ──→ /api/v1/encryption/*
    └── signatureService.ts   ─── axios ──→ /api/v1/signature/*

【バックエンド (Express)】

  /api/v1/encryption/*
    encryptionRoutes.ts
      └── encryptionController.ts
            ├── maimlEncryptionService.ts    (暗号化ロジック)
            │     └── testKeyLoader.ts       (test-keys/ 固定鍵 ※仮実装)
            └── maimlEncryptionXmlHelper.ts  (XML操作)

  /api/v1/signature/*
    signatureRoutes.ts
      └── signatureController.ts
            └── maimlIntegrityService.ts     (署名・検証ロジック)
                  ├── [インメモリ署名鍵ストア] (※仮実装)
                  ├── [ローカルモックTSA]      (※仮実装)
                  └── integrityAuditLogRepository.ts → PostgreSQL (integrity_audit_log)

【ストレージ (Swift/S3)】
  storageService.ts を経由してMAIMLファイルを読み書き
  パス形式: {organization_id}/projects/{projectName}/{projectName}.maiml
  バックアップ: {organization_id}/projects/{projectName}/archive/{projectName}_backup_{timestamp}.maiml
```

---

## 秘匿化（暗号化）フロー

### フロントエンド操作の起点

```
ProjectManagement.tsx
  ↓ [鍵のマーク] ボタンをクリック
  encryptionModalOpen = true
  ↓
EncryptionManagementModal (open=true)
  ↓
EncryptionManagement.tsx がマウントされる
  ↓ (useEffect)
  1. encryptionService.getMaimlStructure(projectName)
       → GET /api/v1/encryption/projects/:projectName/structure
       → MAIMLツリー構造を取得して treeData にセット
  2. encryptionService.listKeys()
       → GET /api/v1/encryption/keys
       → 利用可能な鍵一覧を取得して keys にセット
```

### 暗号化実行シーケンス

```
EncryptionManagement.tsx
  ↓ [秘匿化実行] ボタンをクリック
  handleEncrypt() 呼び出し

  encryptionService.encryptElements(projectName, targetPaths, config)
    └─ POST /api/v1/encryption/projects/:projectName/encrypt
         Body: { targetPaths: string[], config: EncryptionConfig }
              config.algorithm: 'aes256-cbc' | 'aes256-gcm' | 'aes128-cbc'
              config.encryptionLevel: 'auto' | 'L1' | 'L2'
              config.loadedKey?: { serverKeyId }
              ↓

  ┌─────────────── encryptionController.encryptElement() ───────────────┐
  │                                                                      │
  │  1. req.organizationId を確認                                         │
  │                                                                      │
  │  2. normalizeFrontAlgorithm(config.algorithm)                        │
  │     'aes256-cbc' → 'aes-256-cbc' (フロント形式→バックエンド形式 変換)  │
  │                                                                      │
  │  3. storageService.downloadFile(organizationId, filePath)            │
  │     → {organization_id}/projects/{name}/{name}.maiml を取得           │
  │       (見つからなければ 404)                                           │
  │                                                                      │
  │  4. maimlEncryptionService.generateKey(policy)                       │
  │     ┌── testKeyLoader.loadEncryptionKeyByAlgorithm(algorithm)        │
  │     │   → backend/test-keys/encryption/                              │
  │     │     test-encryption-key-aes256.key (32bytes) を読み込む         │
  │     │     ※ aes-128-cbc の場合は test-encryption-key-aes128.key       │
  │     └── keyStore(Map) に { keyId, keyBuffer, algorithm } を保存       │
  │         → KeyEntry を返す                                             │
  │         (本番モードでは null → スキップレスポンス)                       │
  │                                                                      │
  │  5. 各 targetPath に対してループ処理:                                   │
  │                                                                      │
  │    5a. maimlEncryptionService.validateEncryptionScope(targetPath)    │
  │        → maimlSchemaHelper.isUpaViolation(targetPath) を呼び出す      │
  │           ① backend/src/schemas/*.xsd (14ファイル) を起動時に解析      │
  │           ② encryptionGroup を xs:choice に持つ complexType をキャッシュ│
  │           ③ targetPath 末尾要素名 → elementTypeMap で型名解決          │
  │           ④ 型が encryptionSupportedTypes 未含有なら isValid:false     │
  │              → その targetPath をスキップ                              │
  │           ⚠️ schemas/ は Dockerfile.prod で dist/schemas へコピー済み  │
  │                                                                      │
  │    5b. maimlEncryptionXmlHelper.getElementXmlByTargetPath(           │
  │          updatedXml, targetPath)                                     │
  │        → targetPath で指定された要素の XML 文字列を抽出               │
  │          (例: <Value>123</Value> など)                                 │
  │           見つからなければエラーとして results に追加してスキップ        │
  │                                                                      │
  │    5c. maimlEncryptionService.extractInsertionRefs(elementXml)       │
  │        → elementXml 内の <insertion> 参照を抽出 (childRefs用)         │
  │                                                                      │
  │    5d. maimlEncryptionService.encryptElement(                        │
  │          keyEntry, elementXml, policy)                               │
  │        → AES-256-CBC または AES-256-GCM でバイト列を暗号化             │
  │           └── crypto.createCipheriv(algorithm, key, iv)             │
  │               IV (16bytes) はランダム生成                             │
  │               暗号文 = IV + ciphertext (Base64)                      │
  │        → CipherResult を返す:                                        │
  │           { encryptionId, algorithmUri, cipherValue(Base64), ... }  │
  │                                                                      │
  │    5e. maimlEncryptionXmlHelper.buildChildRefsXml(insertionRefs)     │
  │        → childUri / childHash / childUuid 参照 XML フラグメントを生成 │
  │                                                                      │
  │    5f. maimlEncryptionXmlHelper.buildEncryptedDataXml(               │
  │          cipherResult, childRefsXml)                                 │
  │        → W3C XML Encryption 形式の <xenc:EncryptedData> XML を生成   │
  │          ┌─────────────────────────────────────────────────────┐    │
  │          │ <xenc:EncryptedData xmlns:xenc="..." Id="..." ...>  │    │
  │          │   <xenc:EncryptionMethod Algorithm="{uri}"/>        │    │
  │          │   <ds:KeyInfo>                                      │    │
  │          │     <ds:KeyName>{keyName}</ds:KeyName>              │    │
  │          │   </ds:KeyInfo>                                     │    │
  │          │   <xenc:CipherData>                                 │    │
  │          │     <xenc:CipherValue>{Base64}</xenc:CipherValue>   │    │
  │          │   </xenc:CipherData>                                │    │
  │          │   <xenc:EncryptionProperties>                       │    │
  │          │     <xenc:EncryptionProperty>                       │    │
  │          │       <maiml:encryptedAt>...</maiml:encryptedAt>    │    │
  │          │     </xenc:EncryptionProperty>                      │    │
  │          │   </xenc:EncryptionProperties>                      │    │
  │          │   {childRefsXml}  ← insertion参照                   │    │
  │          │ </xenc:EncryptedData>                               │    │
  │          └─────────────────────────────────────────────────────┘    │
  │                                                                      │
  │    5g. maimlEncryptionXmlHelper.replaceElementInXml(                 │
  │          updatedXml, targetPath, encryptedDataXml)                  │
  │        → MAIML XML 内の元の要素を <EncryptedData> に置換              │
  │           updatedXml を更新 (複数パスは逐次処理)                       │
  │                                                                      │
  │  6. storageService.downloadFile() でバックアップ取得                   │
  │     → {name}/archive/{name}_backup_{timestamp}.maiml に保存          │
  │     storageService.uploadFile() で暗号化済み MAIML を上書き保存        │
  │                                                                      │
  │  7. maimlEncryptionService.disposeKey(keyEntry.keyId)                │
  │     → keyBuffer.fill(0) でゼロクリア後に keyStore.delete()            │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘

  レスポンス:
  {
    success: true,
    encryptedCount: number,
    results: [
      { targetPath, success, encryptionId, algorithmUri, encryptedAt,
        hasInsertionRefs, insertionRefCount }
    ],
    algorithm: 'aes256-cbc',
    algorithmUri: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
    updatedFilePath, backupFilePath
  }

  ↓ フロントで message.success('暗号化が完了しました') 表示
```

---

## 復号フロー

### 復号プレビュー取得

```
EncryptionManagement.tsx
  ↓ 暗号化済みノードを選択
  getDecryptPreview() 呼び出し

  encryptionService.getDecryptPreview(projectName, { projectName })
    └─ POST /api/v1/encryption/projects/:projectName/decrypt-preview
         Body: { targetPath, keyId, algorithm? }
              ↓

  encryptionController.decryptPreview()
    1. storageService.downloadFile() → MAIML取得
    2. getElementXmlByTargetPath() → <EncryptedData> XML 抽出 → before
    3. maimlEncryptionService.retrieveKeyForDecryption(keyId, policy)
       → testKeyLoader.loadEncryptionKeyByAlgorithm(algorithm) で鍵取得
    4. extractCipherResultFromXml(encDataXml)
       → <CipherValue> / <EncryptionMethod> を正規表現で抽出
    5. maimlEncryptionService.decryptElement(keyEntry, cipherResult)
       → Base64デコード → IV(16bytes)切り出し → AES復号 → 元XML文字列 → after
    6. { beforeXml: <EncryptedData>..., afterXml: <元要素>... } を返す

  ↓ EncryptionPreviewPanel で before/after を表示
```

### 復号実行

```
EncryptionManagement.tsx
  ↓ [復号化] ボタンをクリック
  handleDecrypt() 呼び出し

  encryptionService.executeDecryptElements(projectName, { projectName, targetPaths, ... })
    └─ POST /api/v1/encryption/projects/:projectName/decrypt-execute
         Body: { targetPaths, decryptionKey: { method, keyName, password? } }
              ↓

  encryptionController.executeDecrypt()
    1. storageService.downloadFile() → MAIML取得
    2. maimlEncryptionService.retrieveKeyForDecryption(keyId, policy) → KeyEntry取得
    3. 各 targetPath に対してループ:
       a. getElementXmlByTargetPath() → <EncryptedData> XML 抽出
       b. extractCipherResultFromXml() → CipherResult 抽出
       c. maimlEncryptionService.decryptElement(keyEntry, cipherResult)
          → AES復号 → 元XML文字列
       d. replaceElementInXml() → <EncryptedData> を元の要素に置換
    4. バックアップ保存 → 復号済み MAIML 上書き保存
    5. disposeKey() → 鍵ゼロクリア＋削除

  ↓ フロントで message.success('復号化が完了しました') 表示
```

---

## 改竄防止（署名）フロー

### フロントエンド操作の起点

```
ProjectManagement.tsx
  ↓ [SafetyCertificateOutlined] ボタンをクリック
  signatureModalOpen = true
  ↓
SignatureManagementModal (open=true)
  ↓
SignatureManagement.tsx がマウントされる
  ↓ (useEffect → loadStatus())
  signatureService.getSignatureStatus(projectName)
    └─ GET /api/v1/signature/projects/:projectName/hash
         → computeCanonicalHash() でハッシュ取得
         → MAIML内 <Signature> 要素の有無を確認して status: 'signed' | 'none' を返す
    ↓
  signStatus.status で [署名済み] or [署名なし] タグ表示
```

### 署名実行シーケンス

```
SignatureManagement.tsx
  ↓ [署名を実行] ボタンをクリック
  handleApplySignature() 呼び出し

  signatureService.applySignature(projectName)
    └─ signMaiml(projectName) を呼び出す
       └─ POST /api/v1/signature/projects/:projectName/sign
            Body: { signatureId?: string }  ← 省略時はバックエンドで自動採番
                 ↓

  ┌─────────────── signatureController.signMaiml() ─────────────────────┐
  │                                                                      │
  │  0. storageService.downloadFile() でMAIMLファイル取得                 │
  │     → {organization_id}/projects/{name}/{name}.maiml                 │
  │                                                                      │
  │  signatureId = reqSignatureId ?? `sig-${projectName}-${Date.now()}`  │
  │  policy = DEFAULT_INTEGRITY_POLICY                                   │
  │                                                                      │
  │  1. maimlIntegrityService.computeCanonicalHash(xmlContent, policy)   │
  │     → DOMParser で XML をパース                                       │
  │     → W3C Canonical XML（C14N）正規化                                 │
  │     → crypto.createHash('sha256').update(c14n).digest('base64')     │
  │     → { digestValue: string(Base64),                                │
  │         algorithmUri: 'http://...#sha256',                          │
  │         computedAt: ISO8601 }                                        │
  │                                                                      │
  │  2. maimlIntegrityService.getSigningPrivateKey(policy)               │
  │     → policy.signatureProvider = 'local-file' の場合:               │
  │       signingKeyStore に鍵がなければ                                  │
  │         crypto.generateKeyPairSync('rsa', { modulusLength:2048 })   │
  │         でインメモリ RSA-2048 鍵ペア生成 → signingKeyStore に保存     │
  │       → DummyPrivateKey { pem: string } を返す                       │
  │                                                                      │
  │  3. maimlIntegrityService.signHash(                                  │
  │       privateKey, digestValue, signatureId)                          │
  │     → crypto.createSign('RSA-SHA256')                               │
  │     → sign.update(digestValue) → sign.sign(privateKey.pem, 'base64')│
  │     → { signatureId, signatureValue(Base64),                        │
  │         signatureAlgorithmUri: '...rsa-sha256',                     │
  │         signedAt: ISO8601 }                                          │
  │                                                                      │
  │  4. signatureValueHash 計算（TSAリクエスト用）                         │
  │     → crypto.createHash('sha256')                                   │
  │          .update(signResult.signatureValue, 'utf8')                 │
  │          .digest('base64')                                           │
  │     ※本実装: <SignatureValue>要素全体を exc-c14n 正規化してからハッシュ  │
  │                                                                      │
  │  5. maimlIntegrityService.buildTimestampRequest(                     │
  │       signatureValueHash, policy.hashAlgorithm)                     │
  │     → TimeStampReq オブジェクト生成:                                  │
  │       { version:1, messageImprint: { algorithm, hashedMessage },    │
  │         nonce: string(hex), certReq:true }                          │
  │                                                                      │
  │  6. maimlIntegrityService.requestTimestamp(                          │
  │       tsRequest, tsaEndpoint, policy)                               │
  │     → policy.tsaProvider = 'local-mock' の場合:                      │
  │       外部TSAには接続せず、ローカル時刻でモックTSTを生成                │
  │       → TimeStampResp { status:'granted', timeStampToken:... }      │
  │     ※本実装: RFC 3161 準拠の外部 TSA へ HTTP POST                    │
  │                                                                      │
  │  7. maimlIntegrityService.storeSentNonce(signatureId, nonce)         │
  │     → sentNonceStore(Map) に保存（検証時に使用）                       │
  │                                                                      │
  │  8. maimlIntegrityService.parseTimestampResponse(tsResp)             │
  │     → TSTを解析して Rfc3161TimestampToken に変換                      │
  │       { rawToken(Base64), tstInfo: { genTime, messageImprint } }    │
  │                                                                      │
  │  9. maimlIntegrityService.embedTimestampToken(signatureId, parsedToken)│
  │     → timestampTokenStore(Map) に保存                                │
  │       [signatureId → Rfc3161TimestampToken]                         │
  │                                                                      │
  │  10. maimlIntegrityService.recordTimestampRequest(                   │
  │        digestValue, tsaIdentifier, policy, pool)                    │
  │      → local-log モード: console.log 出力 + auditLog(配列) に push   │
  │      → db-log モード: integrityAuditLogRepository.insertTimestampRequest()│
  │                       → integrity_audit_log テーブルに INSERT         │
  │                                                                      │
  │  11. maimlIntegrityService.buildSignatureXml(                        │
  │        signatureId, digestValue, algorithmUri,                      │
  │        signatureValue, signatureAlgorithmUri, parsedToken.rawToken) │
  │      → XAdES準拠の <Signature> XML フラグメントを組み立て:             │
  │        ┌──────────────────────────────────────────────────────┐     │
  │        │ <Signature xmlns="...xmldsig#" Id="{signatureId}">  │     │
  │        │   <SignedInfo>                                       │     │
  │        │     <CanonicalizationMethod Algorithm="...c14n..."/> │     │
  │        │     <SignatureMethod Algorithm="...rsa-sha256"/>     │     │
  │        │     <Reference URI="">                               │     │
  │        │       <Transforms>                                   │     │
  │        │         <Transform Algorithm="...enveloped-sig"/>    │     │
  │        │       </Transforms>                                  │     │
  │        │       <DigestMethod Algorithm="...sha256"/>          │     │
  │        │       <DigestValue>{digestValue}</DigestValue>       │     │
  │        │     </Reference>                                     │     │
  │        │   </SignedInfo>                                      │     │
  │        │   <SignatureValue>{signatureValue}</SignatureValue>  │     │
  │        │   <Object>                                           │     │
  │        │     <xades:QualifyingProperties ...>                 │     │
  │        │       <xades:SignatureProperties>                    │     │
  │        │         <xades:SignatureProperty Id="tst-{id}">      │     │
  │        │           <xades:SignatureTimeStamp>                 │     │
  │        │             <xades:EncapsulatedTimeStamp>            │     │
  │        │               {timestampToken(Base64)}               │     │
  │        │             </xades:EncapsulatedTimeStamp>           │     │
  │        │           </xades:SignatureTimeStamp>                │     │
  │        │         </xades:SignatureProperty>                   │     │
  │        │       </xades:SignatureProperties>                   │     │
  │        │     </xades:QualifyingProperties>                    │     │
  │        │   </Object>                                          │     │
  │        │ </Signature>                                         │     │
  │        └──────────────────────────────────────────────────────┘     │
  │                                                                      │
  │  12. embedSignatureInXml(xmlContent, signatureXml, signatureId)      │
  │      → MAIMLのルート閉じタグ直前に <Signature> を挿入                 │
  │        (同一IDが既存の場合は上書き削除してから挿入)                     │
  │                                                                      │
  │  13. storageService.downloadFile() でバックアップ取得                  │
  │      → archive/{name}_backup_{timestamp}.maiml に保存                │
  │      storageService.uploadFile() で署名済み MAIML 上書き保存           │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘

  レスポンス:
  {
    signatureId: string,
    digestValue: string(Base64),
    computedAt: ISO8601,
    signatureValue: string(Base64),
    signatureAlgorithmUri: string,
    signedAt: ISO8601,
    timestampToken: string(Base64),
    timestamp: ISO8601,
    updatedFilePath: string,
    backupFilePath: string
  }

  ↓ フロントで
    signStatus = { status: 'signed', signedAt: new Date().toISOString() }
    message.success('署名を実行しました') 表示
```

---

## 改竄防止（検証）フロー

> ※ 現在のフロントUIには「検証」ボタンは未実装。  
> `signatureService.verifyMaiml()` はサービス関数として定義済みだが、UIから直接呼ぶ手段はない。  
> 直接APIを呼び出す場合のフローを示す。

```
signatureService.verifyMaiml(projectName, request)
  └─ POST /api/v1/signature/projects/:projectName/verify
       Body: { signatureId: string, signerCert?: string }
       ※ signatureValue / storedHash は MAIML ファイルから自動取得
            ↓

  ┌─────────────── signatureController.verifyMaiml() ───────────────────┐
  │                                                                      │
  │  0. storageService.downloadFile() でMAIMLファイル取得                 │
  │                                                                      │
  │  1. maimlIntegrityService.extractSignatureFromXml(                   │
  │       xmlContent, signatureId)                                       │
  │     → DOMParser で XML をパース                                       │
  │     → getElementsByTagNameNS(DS, 'Signature') で全 <Signature> 取得  │
  │     → signatureId が一致するものを検索                                 │
  │     → { signatureId, digestValue(storedHash), signatureValue,       │
  │          algorithmUri, signatureAlgorithmUri, timestampToken } 返す  │
  │     ※ 見つからなければ badRequest (E6002)                             │
  │                                                                      │
  │  2. maimlIntegrityService.recomputeAndCompare(                       │
  │       xmlContent, storedHash, policy)                               │
  │     → C14N正規化 → SHA-256 再計算 → storedHash と比較               │
  │     → { isMatch, currentDigest, storedDigest }                      │
  │                                                                      │
  │  3. maimlIntegrityService.getSigningPublicKey(policy)                │
  │     → signingKeyStore から公開鍵を取得 (インメモリ仮実装)              │
  │       ※ サーバー再起動後は鍵ペアが消えるため必ず isValid: false になる │
  │                                                                      │
  │  4. maimlIntegrityService.verifySignature(                           │
  │       publicKey, storedHash, signatureValue)                        │
  │     → crypto.createVerify('RSA-SHA256')                             │
  │     → verify.verify(publicKey.pem, signatureValue, 'base64')        │
  │     → { isValid, reason? }                                           │
  │                                                                      │
  │  5. maimlIntegrityService.extractTimestampToken(                     │
  │       xmlContent, signatureId)                                       │
  │     → まず MAIML XML の <xades:EncapsulatedTimeStamp> から抽出        │
  │     → なければ timestampTokenStore(Map) からフォールバック             │
  │     → Rfc3161TimestampToken | null                                  │
  │                                                                      │
  │  6. (tsToken が存在する場合)                                           │
  │     maimlIntegrityService.verifyTimestampToken(tsToken)              │
  │     → TSTの形式・有効性を確認 → { isValid, timestamp?, reason? }     │
  │                                                                      │
  │  7. maimlIntegrityService.checkTimeConsistency(                      │
  │       tsToken.tstInfo.genTime, signedAt, policy)                    │
  │     → TSA時刻が署名時刻と許容範囲内か確認                               │
  │                                                                      │
  │  8. messageImprintAndNonce 検証                                       │
  │     → signatureValue を SHA-256 でハッシュ                           │
  │     → sentNonceStore から保存済み nonce を取得                        │
  │     → maimlIntegrityService.verifyMessageImprintAndNonce(           │
  │          tsToken, signatureValueHash, sentNonce)                    │
  │       ハッシュ一致 & nonce一致を確認                                   │
  │                                                                      │
  │  9. maimlIntegrityService.validateSignerCertificate(                 │
  │       signerCert ?? 'local-dummy-signing-key')                      │
  │     [仮実装] 'local-dummy-signing-key' → 常に isValid: true         │
  │                                                                      │
  │  10. maimlIntegrityService.validateTsaCertificate(                   │
  │        tsaCert ?? 'local-mock-tsa')                                 │
  │      [仮実装] 'local-mock-tsa' → 常に isValid: true                 │
  │                                                                      │
  │  11. 総合判定:                                                        │
  │      overallValid =                                                  │
  │        hashMatch &&           ← MAIML改竄なし                        │
  │        signatureValid &&      ← 署名が正しい                          │
  │        timestampValid &&      ← TST有効                              │
  │        timeConsistent &&      ← 時刻整合                              │
  │        signerCertValid &&     ← 署名者証明書有効                      │
  │        tsaCertValid           ← TSA証明書有効                         │
  │                                                                      │
  │  12. maimlIntegrityService.recordVerificationResult(                 │
  │        verificationRecord, policy, pool)                            │
  │      → local-log: console.log + auditLog に push                    │
  │      → db-log: integrityAuditLogRepository.insertVerificationResult()│
  │                → integrity_audit_log テーブルに INSERT               │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘

  レスポンス:
  {
    overallValid: boolean,
    hashMatch: boolean,
    signatureValid: boolean,
    signatureReason?: string,
    timestampValid: boolean,
    timeConsistent: boolean,
    messageImprintValid: boolean,
    signerCertValid: boolean,
    tsaCertValid: boolean,
    timestamp?: string,      ← TSTから取得した時刻
    storedDigest: string,
    currentDigest: string
  }
```

---

## エンドポイント対応表

### 秘匿化 `/api/v1/encryption/*`

| エンドポイント | メソッド | 説明 | Controller関数 | Serviceメソッド |
|---|---|---|---|---|
| `/projects/:name/structure` | GET | MAIMLツリー取得 | `getMaimlStructure` | `parseMaimlToEncryptionTree()` |
| `/projects/:name/preview` | POST | 暗号化プレビュー | `previewEncryption` | `getAlgorithmIdentifier()` + XML組立 |
| `/projects/:name/encrypt` | POST | 暗号化実行 | `encryptElement` | `generateKey()` → `validateEncryptionScope()` → `encryptElement()` |
| `/projects/:name/decrypt-preview` | POST | 復号プレビュー | `decryptPreview` | `retrieveKeyForDecryption()` → `decryptElement()` |
| `/projects/:name/decrypt-execute` | POST | 復号実行 | `executeDecrypt` | `retrieveKeyForDecryption()` → `decryptElement()` |
| `/projects/:name/encrypted-children` | GET | 暗号化済み要素一覧 | `getEncryptedChildren` | `findEncryptedDataElements()` |
| `/keys` | GET | 鍵一覧 | `listKeys` | `testKeyLoader.listEncryptionKeyNames()` |
| `/keys/:keyId` | GET | 鍵詳細 | `getKey` | `testKeyLoader.listEncryptionKeyNames()` |
| `/keys` | POST | 鍵作成 | `createKey` | 固定鍵情報を返す (仮実装) |
| `/keys/generate` | POST | 鍵生成 | `generateKey` | `testKeyLoader.loadEncryptionKeyByAlgorithm()` |
| `/keys/upload` | POST | 鍵アップロード | `uploadKeyFile` | 固定鍵情報を返す (仮実装) |
| `/keys/import` | POST | 鍵インポート | `importKey` | 固定鍵情報を返す (仮実装) |
| `/keys/:keyId` | DELETE | 鍵削除 | `deleteKey` | 409固定 (テストモードは削除不可) |
| `/keys/:keyId/export` | POST | 鍵エクスポート | `exportKey` | `testKeyLoader.loadEncryptionKeyByAlgorithm()` |
| `/keys/:keyId/rotate` | POST | 鍵ローテーション | `rotateKey` | not_implemented を返す |
| `/upa-check` | POST | UPA制約チェック | `checkUpaConstraints` | `validateEncryptionScope()` |
| `/check-insertion/:name/:path` | GET | insertion確認 | `checkInsertion` | `extractInsertionRefs()` |

### 改竄防止 `/api/v1/signature/*`

| エンドポイント | メソッド | 説明 | Controller関数 | Serviceメソッド列 |
|---|---|---|---|---|
| `/projects/:name/sign` | POST | 署名実行 | `signMaiml` | `computeCanonicalHash` → `getSigningPrivateKey` → `signHash` → `buildTimestampRequest` → `requestTimestamp` → `parseTimestampResponse` → `embedTimestampToken` → `recordTimestampRequest` → `buildSignatureXml` → storageService保存 |
| `/projects/:name/verify` | POST | 署名検証 | `verifyMaiml` | `extractSignatureFromXml` → `recomputeAndCompare` → `getSigningPublicKey` → `verifySignature` → `extractTimestampToken` → `verifyTimestampToken` → `checkTimeConsistency` → `verifyMessageImprintAndNonce` → `validateSignerCertificate` → `validateTsaCertificate` → `recordVerificationResult` |
| `/projects/:name/hash` | GET | ハッシュのみ取得 | `getMaimlHash` | `computeCanonicalHash` |
| `/certificates/validate` | POST | 証明書検証 | `validateCertificate` | `validateSignerCertificate` / `validateTsaCertificate` |
| `/audit-log` | GET | 監査ログ一覧 | `getAuditLog` | `_getAuditLog()` (local-log) / DB取得 (db-log: TODO) |

---

## 現状の仮実装ポイント

| 機能 | 現状（仮実装） | 本実装で必要なもの |
|---|---|---|
| 暗号化鍵管理 | `backend/test-keys/encryption/` の固定ファイル（DBレス） | `encryption_keys` テーブル + KMS/S3 等の外部ストレージ |
| 暗号化アルゴリズム | AES-256-CBC / AES-256-GCM (`crypto` モジュール) | 変更不要（本番レベルのアルゴリズム） |
| UPA制約チェック | `backend/src/schemas/*.xsd` (14ファイル) を起動時解析し XSD上の `encryptionGroup` 保持型かを判定。本番 `Dockerfile.prod` でも `dist/schemas/` へコピー済み（対応済み）。スキーマ未読込・型不明時はフォールスネガティブ（常に許可）| 変更不要（本番レベルの実装済み）|
| 署名鍵 | インメモリ RSA-2048 (`signingKeyStore`: プロセス再起動でリセット) | HSM (Hardware Security Module) |
| TSA | `local-mock` ローカル時刻のモックTST（非RFC3161準拠） | RFC 3161 準拠の外部 TSA への HTTP POST |
| TST保存場所 | `timestampTokenStore` (インメモリ Map) + MAIML XML の `<EncapsulatedTimeStamp>` に埋め込み（embedTimestampToken後 buildSignatureXmlで組込） | MAIML XML 内への永続埋め込みは一部実装済み |
| nonce保存 | `sentNonceStore` (インメモリ Map): プロセス再起動で消える | DB永続化 または セッション管理 |
| 証明書検証 | `validateSignerCertificate` / `validateTsaCertificate` は常に `isValid: true` | X.509証明書チェーン検証 + OCSP/CRL 失効確認 |
| 監査ログ | `local-log` モード: console.log + auditLog 配列 (プロセス内) | `db-log` モード: `integrity_audit_log` テーブルへ INSERT (Repository実装済み・接続待ち) |
| 署名削除 | バックエンド未実装 (フロントの `removeSignature` は警告ログのみ) | `DELETE /api/v1/signature/projects/:name/signature` 実装が必要 |
| MAIMLツリー構造取得 | `parseMaimlToEncryptionTree()` でXML解析して返す（動的生成済み） | ほぼ本実装済み |
