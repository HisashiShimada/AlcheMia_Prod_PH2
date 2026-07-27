# 秘匿化・改竄防止 処理フロー解説

作成日: 2026-07-17  
対象タスク: `20260717_0810_秘匿化改竄防止API接続実装`

---

## 目次

1. [全体アーキテクチャ](#全体アーキテクチャ)
2. [秘匿化（暗号化・復号）フロー](#秘匿化暗号化復号フロー)
3. [改竄防止（署名・検証）フロー](#改竄防止署名検証フロー)
4. [仮実装と本実装の違い](#仮実装と本実装の違い)

---

## 全体アーキテクチャ

```
フロントエンド (Next.js)
  │
  ├── encryptionService.ts     ← 秘匿化API呼び出し
  └── signatureService.ts      ← 改竄防止API呼び出し
          │
          │ HTTP (axios)
          ▼
バックエンド (Express)
  │
  ├── /api/v1/encryption/*  ← encryptionRoutes.ts
  │       └── encryptionController.ts
  │               └── maimlEncryptionService.ts  ← 秘匿化ビジネスロジック
  │                       └── [インメモリ鍵ストア / KMS(本実装)]
  │
  └── /api/v1/signature/*   ← signatureRoutes.ts
          └── signatureController.ts
                  └── maimlIntegrityService.ts   ← 改竄防止ビジネスロジック
                          ├── [インメモリ鍵ストア / HSM(本実装)]
                          ├── [ローカルモックTSA / 外部RFC3161 TSA(本実装)]
                          └── integrityAuditLogRepository.ts → PostgreSQL
```

---

## 秘匿化（暗号化・復号）フロー

### A. 暗号化フロー

```
フロント                     encryptionController        maimlEncryptionService
  │                                │                            │
  │ POST /encryption/keys          │                            │
  │ { keyName, algorithm }         │                            │
  │──────────────────────────────>│                            │
  │                                │ generateKey(policy)        │
  │                                │───────────────────────────>│
  │                                │          [仮実装]           │
  │                                │  crypto.randomBytes(32)    │
  │                                │  → AES-256 鍵を生成        │
  │                                │  → keyStore(Map)に保存     │
  │                                │<───────────────────────────│
  │                                │    { keyId, algorithm, ... }│
  │<──────────────────────────────│                            │
  │ { keyId }                      │                            │
  │                                │                            │
  │                                │                            │
  │ POST /encryption/projects      │                            │
  │  /:name/encrypt                │                            │
  │ { targetPaths, keyId }         │                            │
  │──────────────────────────────>│                            │
  │                                │ 1. storageService          │
  │                                │    .downloadFile()         │
  │                                │    → MAIML XML 取得        │
  │                                │                            │
  │                                │ 2. validateEncryptionScope │
  │                                │───────────────────────────>│
  │                                │       targetPath が        │
  │                                │       UPA制約を満たすか検証 │
  │                                │       [仮実装: 常に OK]    │
  │                                │<───────────────────────────│
  │                                │                            │
  │                                │ 3. encryptElement(         │
  │                                │      keyId, xmlElement,    │
  │                                │      policy)               │
  │                                │───────────────────────────>│
  │                                │   [仮実装]                  │
  │                                │   keyStore から keyId で   │
  │                                │   KeyEntry 取得            │
  │                                │   AES-256-GCM で暗号化     │
  │                                │   → <EncryptedData>XML を  │
  │                                │     生成して返す           │
  │                                │<───────────────────────────│
  │                                │                            │
  │                                │ 4. storageService          │
  │                                │    .uploadFile()           │
  │                                │    → 暗号化済み MAIML を保存│
  │                                │                            │
  │<──────────────────────────────│                            │
  │ { success, encryptedPath }     │                            │
```

### B. 復号フロー

```
フロント                     encryptionController        maimlEncryptionService
  │                                │                            │
  │ POST /encryption/projects      │                            │
  │  /:name/decrypt                │                            │
  │ { targetPaths, keyId }         │                            │
  │──────────────────────────────>│                            │
  │                                │ 1. storageService          │
  │                                │    .downloadFile()         │
  │                                │    → 暗号化済み MAIML 取得  │
  │                                │                            │
  │                                │ 2. retrieveKeyForDecryption│
  │                                │      (keyId, policy)       │
  │                                │───────────────────────────>│
  │                                │   [仮実装]                  │
  │                                │   keyStore.get(keyId)      │
  │                                │   → KeyEntry 返す          │
  │                                │<───────────────────────────│
  │                                │                            │
  │                                │ 3. decryptElement(         │
  │                                │      keyEntry,             │
  │                                │      encryptedXml)         │
  │                                │───────────────────────────>│
  │                                │   [仮実装]                  │
  │                                │   <EncryptedData> を       │
  │                                │   AES-256-GCM で復号       │
  │                                │   → 平文 XML 文字列を返す  │
  │                                │<───────────────────────────│
  │                                │                            │
  │                                │ 4. storageService          │
  │                                │    .uploadFile()           │
  │                                │    → 復号済み MAIML を保存  │
  │                                │                            │
  │<──────────────────────────────│                            │
  │ { success, decryptedPath }     │                            │
```

### C. 鍵廃棄フロー

```
フロント                     encryptionController        maimlEncryptionService
  │                                │                            │
  │ DELETE /encryption/keys/:keyId │                            │
  │──────────────────────────────>│                            │
  │                                │ disposeKey(keyId)          │
  │                                │───────────────────────────>│
  │                                │   [仮実装]                  │
  │                                │   keyStore.get(keyId)      │
  │                                │   keyBuffer.fill(0)        │
  │                                │   → バッファをゼロクリア   │
  │                                │   keyStore.delete(keyId)   │
  │                                │<───────────────────────────│
  │<──────────────────────────────│                            │
  │ { success }                    │                            │
```

---

## 改竄防止（署名・検証）フロー

### A. 署名実行フロー（sign）

```
フロント                  signatureController         maimlIntegrityService     DB (audit_log)
  │                              │                           │                      │
  │ POST /signature/             │                           │                      │
  │  projects/:name/sign         │                           │                      │
  │ { signatureId? }             │                           │                      │
  │────────────────────────────>│                           │                      │
  │                              │ storageService            │                      │
  │                              │  .downloadFile()          │                      │
  │                              │ → MAIML XML 取得          │                      │
  │                              │                           │                      │
  │                              │ 1. computeCanonicalHash   │                      │
  │                              │      (xmlContent, policy) │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    DOMParser で XML解析   │                      │
  │                              │    C14N 正規化             │                      │
  │                              │    → SHA-256 ハッシュ計算 │                      │
  │                              │    → Base64 エンコード     │                      │
  │                              │<──────────────────────────│                      │
  │                              │ { digestValue,            │                      │
  │                              │   algorithmUri,           │                      │
  │                              │   computedAt }            │                      │
  │                              │                           │                      │
  │                              │ 2. getSigningPrivateKey   │                      │
  │                              │      (policy)             │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    signingKeyStore に      │                      │
  │                              │    RSA-2048 鍵ペアを生成  │                      │
  │                              │    (または既存を返す)      │                      │
  │                              │<──────────────────────────│                      │
  │                              │ DummyPrivateKey           │                      │
  │                              │                           │                      │
  │                              │ 3. signHash(              │                      │
  │                              │      privateKey,          │                      │
  │                              │      digestValue,         │                      │
  │                              │      signatureId)         │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    node-forge で RSA-SHA256│                      │
  │                              │    署名生成                │                      │
  │                              │    → Base64 署名値         │                      │
  │                              │<──────────────────────────│                      │
  │                              │ { signatureValue,         │                      │
  │                              │   signatureAlgorithmUri,  │                      │
  │                              │   signedAt }              │                      │
  │                              │                           │                      │
  │                              │ 4. buildTimestampRequest  │                      │
  │                              │      (signatureValue)     │                      │
  │                              │──────────────────────────>│                      │
  │                              │    署名値から TSA リクエスト│                      │
  │                              │    オブジェクトを生成      │                      │
  │                              │<──────────────────────────│                      │
  │                              │ TimestampRequest          │                      │
  │                              │                           │                      │
  │                              │ 5. requestTimestamp(      │                      │
  │                              │      tsRequest,           │                      │
  │                              │      signatureId, policy) │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装 local-mock]     │                      │
  │                              │    ローカル時刻で           │                      │
  │                              │    モックTST を生成する    │                      │
  │                              │    [本実装 external-tsa]   │                      │
  │                              │    RFC 3161 準拠の         │                      │
  │                              │    外部TSAへ HTTP リクエスト│                      │
  │                              │<──────────────────────────│                      │
  │                              │ TimestampToken            │                      │
  │                              │                           │                      │
  │                              │ 6. parseTimestampResponse │                      │
  │                              │      (tsToken)            │                      │
  │                              │──────────────────────────>│                      │
  │                              │    TST レスポンスを解析    │                      │
  │                              │<──────────────────────────│                      │
  │                              │ parsedToken               │                      │
  │                              │                           │                      │
  │                              │ 7. embedTimestampToken    │                      │
  │                              │      (signatureId,        │                      │
  │                              │       parsedToken)        │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    tokenStore(Map) に保存  │                      │
  │                              │    ※本実装: MAIML XML に   │                      │
  │                              │    <SignatureProperty>    │                      │
  │                              │    として埋め込む          │                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 8. recordTimestampRequest │                      │
  │                              │      (digestValue,        │────────────────────>│
  │                              │       tsaIdentifier, ...) │  INSERT INTO        │
  │                              │──────────────────────────>│  integrity_audit_log│
  │                              │    [local-log モード]      │  (timestamp_request)│
  │                              │    → console.log 出力     │                      │
  │                              │    [db-log モード]         │                      │
  │                              │    → DB に INSERT         │<────────────────────│
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │<────────────────────────────│                           │                      │
  │ { signatureId,               │                           │                      │
  │   digestValue,               │                           │                      │
  │   signatureValue,            │                           │                      │
  │   timestampToken,            │                           │                      │
  │   timestamp, ... }           │                           │                      │
```

### B. 署名検証フロー（verify）

```
フロント                  signatureController         maimlIntegrityService     DB (audit_log)
  │                              │                           │                      │
  │ POST /signature/             │                           │                      │
  │  projects/:name/verify       │                           │                      │
  │ { signatureId,               │                           │                      │
  │   signatureValue,            │                           │                      │
  │   storedHash,                │                           │                      │
  │   signerCert?, tsaCert? }    │                           │                      │
  │────────────────────────────>│                           │                      │
  │                              │ storageService            │                      │
  │                              │  .downloadFile()          │                      │
  │                              │ → MAIML XML 取得          │                      │
  │                              │                           │                      │
  │                              │ 1. recomputeAndCompare(   │                      │
  │                              │      xmlContent,          │                      │
  │                              │      storedHash, policy)  │                      │
  │                              │──────────────────────────>│                      │
  │                              │    現在の XML を再ハッシュ │                      │
  │                              │    storedHash と比較       │                      │
  │                              │    → { isMatch, ... }     │                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 2. getSigningPublicKey    │                      │
  │                              │      (policy)             │                      │
  │                              │──────────────────────────>│                      │
  │                              │    signingKeyStore から   │                      │
  │                              │    公開鍵を取得            │                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 3. verifySignature(       │                      │
  │                              │      publicKey,           │                      │
  │                              │      storedHash,          │                      │
  │                              │      signatureValue)      │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    node-forge で           │                      │
  │                              │    RSA-SHA256 署名検証     │                      │
  │                              │    → { isValid, reason }  │                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 4. extractTimestampToken  │                      │
  │                              │      (xmlContent,         │                      │
  │                              │       signatureId)        │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    tokenStore.get(        │                      │
  │                              │      signatureId)         │                      │
  │                              │    ※本実装: MAIML XML の  │                      │
  │                              │    <SignatureProperty>    │                      │
  │                              │    から抽出               │                      │
  │                              │<──────────────────────────│                      │
  │                              │ TimestampToken | null     │                      │
  │                              │                           │                      │
  │                              │ 5. verifyTimestampToken   │                      │
  │                              │      (tsToken)            │                      │
  │                              │──────────────────────────>│                      │
  │                              │    TST の有効性確認        │                      │
  │                              │    → { isValid, timestamp }│                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 6. checkTimeConsistency(  │                      │
  │                              │      tsToken.timestamp,   │                      │
  │                              │      creationDate)        │                      │
  │                              │──────────────────────────>│                      │
  │                              │    TSA 時刻が署名時刻と    │                      │
  │                              │    整合するか確認          │                      │
  │                              │    → { isConsistent, ... }│                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 7. validateSignerCertificate│                    │
  │                              │      (signerCert)         │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    'local-dummy-signing-key'│                     │
  │                              │    → 常に isValid: true   │                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 8. validateTsaCertificate │                      │
  │                              │      (tsaCert)            │                      │
  │                              │──────────────────────────>│                      │
  │                              │    [仮実装]                │                      │
  │                              │    'local-mock-tsa'       │                      │
  │                              │    → 常に isValid: true   │                      │
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │                              │ 9. (全結果を AND で総合判定)│                      │
  │                              │    overallValid =         │                      │
  │                              │      hashMatch &&         │                      │
  │                              │      signatureValid &&    │                      │
  │                              │      timestampValid &&    │                      │
  │                              │      timeConsistent &&    │                      │
  │                              │      signerCertValid &&   │                      │
  │                              │      tsaCertValid         │                      │
  │                              │                           │                      │
  │                              │ 10. recordVerificationResult│                    │
  │                              │      (record, policy, ...)│────────────────────>│
  │                              │──────────────────────────>│  INSERT INTO        │
  │                              │    [local-log モード]      │  integrity_audit_log│
  │                              │    → console.log 出力     │  (verification_result)│
  │                              │    [db-log モード]         │                      │
  │                              │    → DB に INSERT         │<────────────────────│
  │                              │<──────────────────────────│                      │
  │                              │                           │                      │
  │<────────────────────────────│                           │                      │
  │ { overallValid,              │                           │                      │
  │   hashMatch,                 │                           │                      │
  │   signatureValid,            │                           │                      │
  │   timestampValid,            │                           │                      │
  │   timeConsistent,            │                           │                      │
  │   signerCertValid,           │                           │                      │
  │   tsaCertValid, ... }        │                           │                      │
```

---

## インメモリストアの構造

### 秘匿化（maimlEncryptionService）

```
keyStore: Map<string, KeyEntry>
  ┌──────────────────────────────────────────────┐
  │ keyId (UUID) → {                              │
  │   keyId: string,                             │
  │   keyBuffer: Buffer,   ← AES-256 鍵素材      │
  │   algorithm: string,                         │
  │   createdAt: string,                         │
  │ }                                            │
  └──────────────────────────────────────────────┘
  ⚠ プロセス再起動でリセット（本実装: KMS / S3 に置き換え）
```

### 改竄防止（maimlIntegrityService）

```
signingKeyStore: Map<string, { privateKey, publicKey }>
  ┌──────────────────────────────────────────────┐
  │ 'local-dummy-signing-key' → {                 │
  │   privateKey: DummyPrivateKey,               │
  │   publicKey:  DummyPublicKey,                │
  │ }                                            │
  └──────────────────────────────────────────────┘
  ⚠ プロセス再起動でリセット（本実装: HSM に置き換え）

tokenStore: Map<string, TimestampToken>
  ┌──────────────────────────────────────────────┐
  │ signatureId → {                               │
  │   token: string,       ← Base64 TST          │
  │   timestamp: string,   ← TSA が返した時刻    │
  │   tsaIdentifier: string,                     │
  │ }                                            │
  └──────────────────────────────────────────────┘
  ⚠ プロセス再起動でリセット（本実装: MAIMLファイル内に埋め込み）
```

---

## 仮実装と本実装の違い

| 機能 | 仮実装（現状） | 本実装（TODO） |
|------|-------------|--------------|
| 暗号化鍵管理 | `keyStore`（プロセス内 Map） | KMS / S3 等の外部ストレージ |
| 暗号化アルゴリズム | AES-256-GCM（`crypto`モジュール） | 変更不要（アルゴリズム自体は本番レベル） |
| 署名鍵 | `signingKeyStore`（プロセス内 Map の RSA-2048） | HSM（Hardware Security Module） |
| TSA | `local-mock`（ローカル時刻のモックトークン） | RFC 3161 準拠の外部 TSA |
| TST 保存場所 | `tokenStore`（プロセス内 Map） | MAIML XML の `<SignatureProperty>` に埋め込み |
| 証明書検証 | 常に `isValid: true` を返す | X.509 証明書チェーン検証・OCSP/CRL 失効確認 |
| 監査ログ | `local-log`: console.log 出力 | `db-log`: `integrity_audit_log` テーブルへ INSERT |
| UPA制約チェック | 常に OK を返す | XML Schema 解析による厳密なチェック |

---

## エンドポイント対応表

### 秘匿化 `/api/v1/encryption/*`

| エンドポイント | メソッド | 説明 | Serviceメソッド |
|-------------|--------|------|--------------|
| `/encryption/keys` | POST | 鍵生成 | `generateKey()` |
| `/encryption/keys` | GET | 鍵一覧 | `encryptionKeyRepository.findAll()` |
| `/encryption/keys/:keyId` | GET | 鍵詳細 | `encryptionKeyRepository.findById()` |
| `/encryption/keys/:keyId` | DELETE | 鍵廃棄 | `disposeKey()` |
| `/encryption/keys/:keyId/export` | POST | 鍵エクスポート | `generateKey()` → Base64 変換 |
| `/encryption/keys/import` | POST | 鍵インポート | `generateKey()` → DB 登録 |
| `/encryption/keys/:keyId/rotate` | POST | 鍵ローテーション | `generateKey()` + `disposeKey()` |
| `/encryption/projects/:name/structure` | GET | MAIMLツリー取得 | `storageService` + XML パース |
| `/encryption/projects/:name/preview` | POST | 暗号化プレビュー | `validateEncryptionScope()` |
| `/encryption/projects/:name/encrypt` | POST | 暗号化実行 | `encryptElement()` |
| `/encryption/projects/:name/decrypt-preview` | POST | 復号プレビュー | `retrieveKeyForDecryption()` + `decryptElement()` |
| `/encryption/projects/:name/decrypt-execute` | POST | 復号実行 | `retrieveKeyForDecryption()` + `decryptElement()` |
| `/encryption/projects/:name/encrypted-children` | GET | 暗号化済み要素一覧 | XML パース |
| `/encryption/check-insertion/:name/:path` | GET | insertion確認 | `extractInsertionRefs()` |
| `/encryption/upa-check` | POST | UPA制約チェック | `validateEncryptionScope()` |

### 改竄防止 `/api/v1/signature/*`

| エンドポイント | メソッド | 説明 | Serviceメソッド |
|-------------|--------|------|--------------|
| `/signature/projects/:name/sign` | POST | 署名実行 | `computeCanonicalHash()` → `signHash()` → `requestTimestamp()` → `recordTimestampRequest()` |
| `/signature/projects/:name/verify` | POST | 署名検証 | `recomputeAndCompare()` → `verifySignature()` → `verifyTimestampToken()` → `recordVerificationResult()` |
| `/signature/projects/:name/hash` | GET | ハッシュのみ取得 | `computeCanonicalHash()` |
| `/signature/certificates/validate` | POST | 証明書検証 | `validateSignerCertificate()` / `validateTsaCertificate()` |
| `/signature/audit-log` | GET | 監査ログ一覧 | `_getAuditLog()` / DB クエリ（TODO） |
