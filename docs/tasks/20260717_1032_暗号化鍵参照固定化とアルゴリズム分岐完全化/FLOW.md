# フロントエンド〜バックエンド 接続状況

> 作成日: 2026-07-17  
> 最終更新: 2026-07-21（decrypt-preview実装完了・checkInsertion修正完了・signMaiml埋め込み保存完了・getAuditLog動作実態修正・verifyMaiml自動抽出完了・previewEncryption afterXml実装完了・/decrypt廃止・upa-check本実装完了）  
> 対象: 秘匿化（暗号化）機能 / 改竄防止（署名）機能  
> 凡例: ✅ 接続済み（API呼び出しが通る）/ ⚠️ 部分実装（APIは動くが処理がスタブ）/ ❌ 未接続

---

## 1. 暗号化機能（`/api/v1/encryption`）

### 1-1. フロントエンドサービス

| ファイル | ベースURL |
|---------|-----------|
| `frontend/src/services/encryptionService.ts` | `/api/v1/encryption` |

### 1-2. バックエンド構成

| レイヤー | ファイル | 備考 |
|---------|---------|------|
| ルート | `backend/src/routes/encryptionRoutes.ts` | 変更なし |
| コントローラー | `backend/src/controllers/encryptionController.ts` | **今回全面書き換え** |
| Serviceコア | `backend/src/services/maimlEncryptionService.ts` | 変更なし（アルゴリズム分岐は正しく実装済み） |
| 鍵ローダー | `backend/src/utils/testKeyLoader.ts` | 変更なし（固定ファイルスキャン・読み込み） |
| ~~DB Repository~~ | ~~`backend/src/repositories/encryptionKeyRepository.ts`~~ | **廃止（import削除）** |
| 型定義（BE） | `backend/src/types/encryptionTypes.ts` | 変更なし |
| 型定義（FE） | `frontend/src/types/encryption.ts` | 変更なし |

### 1-3. エンドポイント別 接続状況

#### MAIMLツリー構造

| # | メソッド | エンドポイント | FEサービス関数 | 状態 | 備考 |
|---|---------|--------------|--------------|------|------|
| 1 | GET | `/projects/:name/structure` | `getMaimlStructure()` | ✅ | `parseMaimlToEncryptionTree()` でMAIMLをパースして暗号化対象ツリーを動的生成（`maimlEncryptionXmlHelper.ts` 実装済み） |

#### 暗号化操作

| # | メソッド | エンドポイント | FEサービス関数 | 状態 | 備考 |
|---|---------|--------------|--------------|------|------|
| 2 | POST | `/projects/:name/preview` | `previewEncryption()` | ✅ | algorithmUri は `normalizeFrontAlgorithm()` で正しく変換。`targetPath` 指定時は `getElementXmlByTargetPath()` で beforeXml を実XML取得。afterXml は `<xenc:EncryptedData>` 構造プレビュー（elementTag コメント付き・CipherValueはプレースホルダー）を返す。実際の暗号化は行わない |
| 3 | POST | `/projects/:name/encrypt` | `encryptElement()` / `encryptElements()` | ✅ | `getElementXmlByTargetPath()` で実XMLを取得→`encryptElement(elementXml)`→`buildEncryptedDataXml()`→`replaceElementInXml()`→`saveMaiml()`。`encryptedCount` をレスポンスに含む。 |
| 4 | ~~POST~~ | ~~`/projects/:name/decrypt`~~ | ~~`decryptElement()`~~ | ❌ **廃止** | バックエンドルート削除・フロントサービス関数削除（2026-07-21）。復号化は `/decrypt-execute` に統一 |
| 5 | POST | `/projects/:name/decrypt-preview` | `getDecryptPreview()` | ✅ | `algorithm` → `normalizeFrontAlgorithm()` → `retrieveKeyForDecryption()` → `getElementXmlByTargetPath()` で beforeXml 取得 → `extractCipherResultFromXml()` → `decryptElement()` で afterXml 生成。ファイル保存なし（プレビューのみ） |
| 6 | POST | `/projects/:name/decrypt-execute` | `executeDecrypt()` / `executeDecryptElements()` | ✅ | `extractCipherResultFromXml()`→`maimlEncryptionService.decryptElement()`→`replaceElementInXml()`→`saveMaiml()`。`finally`ブロックで`disposeKey()`保証。`decryptedCount` をレスポンスに含む。 |
| 7 | GET | `/projects/:name/encrypted-children` | `getEncryptedChildren()` | ✅ | `findEncryptedDataElements()` で全 `<EncryptedData>` 要素を収集して返す（`maimlEncryptionXmlHelper.ts` 実装済み） |

#### 暗号化鍵管理

| # | メソッド | エンドポイント | FEサービス関数 | 状態 | 変更前 | 変更後 |
|---|---------|--------------|--------------|------|-------|-------|
| 8 | GET | `/keys` | `listKeys()` | ✅ | DBから一覧取得 | **`test-keys/encryption/*.key` をスキャンして仮想鍵情報を返す（DB不使用）** |
| 9 | GET | `/keys/:keyId` | `getKey()` | ✅ | DBから1件取得 | **固定鍵一覧から keyId で検索（DB不使用）** |
| 10 | POST | `/keys` | `createKey()` | ✅ | DB登録 | **DB書き込みなし。リクエストのアルゴリズムに対応する固定鍵情報を返す** |
| 11 | DELETE | `/keys/:keyId` | `deleteKey()` | ✅ | DB論理削除 | **409「テストモードでは固定鍵ファイルのため削除できません」を返す** |
| 12 | POST | `/keys/generate` | `generateNewKey()` | ✅ | ランダム生成→DB登録 | **DB書き込みなし。固定鍵ファイルの存在確認→固定鍵情報を返す** |
| 13 | POST | `/keys/upload` | `uploadKeyFile()` | ⚠️ | DB登録のみ（ファイル保存未実装） | **DB書き込みなし。固定鍵情報を返す（アップロードファイルは使用しない）** |
| 14 | POST | `/keys/import` | `importKey()` | ⚠️ | DB登録のみ | **DB書き込みなし。固定鍵情報を返す（インポートファイルは使用しない）** |
| 15 | POST | `/keys/:keyId/export` | `exportKey()` | ⚠️ | DBメタデータ取得→鍵素材はスタブ | **`testKeyLoader.loadEncryptionKeyByAlgorithm()` で実際の鍵バイト列をBase64返却（パスワード保護はスタブ）** |
| 16 | POST | `/keys/:keyId/rotate` | `rotateKey()` | ❌ | `not_implemented` スタブ | `not_implemented` スタブ（変更なし） |

#### 検証系

| # | メソッド | エンドポイント | FEサービス関数 | 状態 | 備考 |
|---|---------|--------------|--------------|------|------|
| 17 | POST | `/upa-check` | `checkUpaConstraints()` | ✅ | `validateEncryptionScope()` が MAIML XSD を解析して UPA 制約（`xs:choice` + `encryptionGroup` の存在確認）を実際に判定（`maimlSchemaHelper.ts` 実装済み・XSD解析結果はキャッシュ） |
| 18 | GET | `/check-insertion/:project/:path` | `checkInsertion()` | ✅ | nodePath 指定時は `getElementXmlByTargetPath()` で部分XMLを取得してから `extractInsertionRefs()` を呼ぶ。nodePath が空の場合のみMAIML全体を対象とする |

---

## 2. 改竄防止機能（`/api/v1/signature`）

### 2-1. フロントエンドサービス

| ファイル | ベースURL |
|---------|-----------|
| `frontend/src/services/signatureService.ts` | `/api/v1/signature` |

### 2-2. バックエンド構成

| レイヤー | ファイル |
|---------|---------|
| ルート | `backend/src/routes/signatureRoutes.ts` |
| コントローラー | `backend/src/controllers/signatureController.ts` |
| Serviceコア | `backend/src/services/maimlIntegrityService.ts` |
| 監査ログRepository | `backend/src/repositories/integrityAuditLogRepository.ts` |
| 型定義（BE） | `backend/src/types/integrityTypes.ts` |
| 型定義（FE） | `frontend/src/types/signature.ts` |

### 2-3. エンドポイント別 接続状況

| # | メソッド | エンドポイント | FEサービス関数 | 状態 | 備考 |
|---|---------|--------------|--------------|------|------|
| 1 | POST | `/projects/:name/sign` | `signMaiml()` / `applySignature()` | ✅ | MAIMLファイル取得→SHA-256ハッシュ計算→RSA署名（テスト鍵使用）→タイムスタンプ（local-mock）→`buildSignatureXml()` で `<ds:Signature>` XML構築→`embedSignatureInXml()` でMAIML末尾に埋め込み→`saveMaimlContent()` で保存→監査ログ記録まで完了 |
| 2 | POST | `/projects/:name/verify` | `verifyMaiml()` | ✅ | MAIMLファイルから `extractSignatureFromXml(xmlContent, signatureId)` で `digestValue`（storedHash）と `signatureValue` を自動取得。リクエストボディは `signatureId` のみ必須（`signatureValue`/`storedHash` は廃止）。ハッシュ比較・署名検証・TST検証・証明書検証・監査ログ記録まで完了 |
| 3 | GET | `/projects/:name/hash` | `getMaimlHash()` / `getSignatureStatus()` | ✅ | MAIMLファイルのSHA-256ハッシュ値を正しく返す |
| 4 | POST | `/certificates/validate` | `validateCertificate()` | ⚠️ | PEM形式の証明書の有効期限・発行者を返す。チェーン検証は簡易実装 |
| 5 | GET | `/audit-log` | `getAuditLog()` | ⚠️ | `DEFAULT_INTEGRITY_POLICY.auditTarget` が `'local-log'` 固定のため、実際はインメモリバッファ（`auditLog` 配列）から返している。`db-log` モードの DB 取得処理は未実装（insert 側のみ実装済み）。**TODO: auditTarget を `db-log` に切り替え、DB から取得する実装を追加** |

---

## 3. テスト用鍵ファイル（ローカル固定参照）

> テストモード（`NODE_ENV !== 'production'`）では以下の固定ファイルを使用。  
> **鍵管理APIはDB不使用。test-keys/ 配下の固定ファイルのみを参照する。**

| ファイルパス | 用途 | サイズ |
|------------|------|--------|
| `backend/test-keys/encryption/test-encryption-key-aes256.key` | AES-256-CBC / AES-256-GCM 暗号化 | 32 bytes |
| `backend/test-keys/encryption/test-encryption-key-aes128.key` | AES-128-CBC 暗号化 | 16 bytes |
| `backend/test-keys/encryption/test-encryption-key.key` | 旧互換（フォールバック用） | 32 bytes |
| `backend/test-keys/signing/test-signing-key.pem` | RSA-2048 秘密鍵（署名） | 1.7 KB |
| `backend/test-keys/signing/test-signing-key.pub.pem` | RSA-2048 公開鍵（署名検証） | 451 bytes |

鍵ファイル再生成コマンド:
```bash
npx ts-node backend/scripts/generate-test-keys.ts
```

---

## 4. server.ts へのルート登録状況

`backend/src/server.ts` にて以下のルートが登録済み:

```
/api/v1/encryption  → encryptionRoutes
/api/v1/signature   → signatureRoutes
```

---

## 5. アルゴリズム変換の対応表

> フロントエンドとバックエンドで algorithm 値の形式が異なる。  
> `normalizeFrontAlgorithm()` / `toFrontAlgorithm()` で変換する。

| FE値（EncryptionAlgorithmType） | Policy値（EncryptionPolicy） | XMLenc Algorithm URI |
|-------------------------------|---------------------------|---------------------|
| `aes256-cbc` | `aes-256-cbc` | `http://www.w3.org/2001/04/xmlenc#aes256-cbc` |
| `aes128-cbc` | `aes-128-cbc` | `http://www.w3.org/2001/04/xmlenc#aes128-cbc` |
| `aes256-gcm` | `aes-256-gcm` | `http://www.w3.org/2009/xmlenc11#aes256-gcm` |

---

## 6. 今後の本実装で必要な対応（優先度順）

### 6-1. 暗号化機能

| 優先度 | 内容 | 対象ファイル・関数 | 状態 |
|--------|------|-----------------|------|
| ~~🔴 高~~ | ~~**MAIMLファイル内の対象要素を `<EncryptedData>` に置換して保存（暗号化実行）**~~ | ~~`encryptController.encryptElement` + XMLパーサー実装~~ | ✅ **完了**（2026-07-17） |
| ~~🔴 高~~ | ~~**MAIMLファイル内の `<EncryptedData>` を復号して元の要素に戻す（復号実行）**~~ | ~~`encryptController.executeDecrypt` + `maimlEncryptionService.decryptElement()`~~ | ✅ **完了**（2026-07-17） |
| ~~🔴 高~~ | ~~**`getMaimlStructure`: XMLパースして暗号化対象ツリーを動的生成**~~ | ~~`encryptController.getMaimlStructure` + MAIMLパーサー連携~~ | ✅ **完了**（2026-07-17） |
| ~~🟡 中~~ | ~~`getEncryptedChildren`: XMLパースして全 `<EncryptedData>` を収集~~ | ~~`encryptController.getEncryptedChildren`~~ | ✅ **完了**（2026-07-17） |
| ~~🟡 中~~ | ~~`previewEncryption`: afterXml の生成（beforeXml は実XML取得済み）~~ | ~~`encryptController.previewEncryption`~~ | ✅ **完了**（2026-07-21）`<xenc:EncryptedData>` 構造プレビューを返す（要素名コメント・algorithmUri・keyId 含む） |
| ~~🟡 中~~ | ~~`checkInsertion`: nodePath 配下のみ対象に絞る~~ | ~~`encryptController.checkInsertion`~~ | ✅ **完了**（2026-07-21） |
| 🟡 中 | `exportKey`: パスワードによる鍵素材の暗号化 | `encryptController.exportKey` | ⚠️ スタブ |
| 🟢 低 | `rotateKey`: バックグラウンドジョブで再暗号化 | `encryptController.rotateKey` | ❌ 未実装 |
| ~~🟢 低~~ | ~~`validateEncryptionScope`（UPA制約）の実際のチェック実装~~ | ~~`maimlEncryptionService.validateEncryptionScope`~~ | ✅ **完了**（2026-07-21）`maimlSchemaHelper.ts` が MAIML XSD を解析して `encryptionGroup` を `xs:choice` に持たない型を違反と判定。遅延初期化キャッシュ対応 |

### 6-2. 改竄防止機能

| 優先度 | 内容 | 対象ファイル・関数 |
|--------|------|-----------------|
| ~~🔴 高~~ | ~~**`signMaiml`: MAIMLファイルに `<Signature>` 要素を埋め込み保存**~~ | ~~`signatureController.signMaiml` + XMLパーサー実装~~ | ✅ **完了**（2026-07-21） |
| ~~🔴 高~~ | ~~**`verifyMaiml`: MAIMLから `<Signature>` / `storedHash` / `signatureValue` を自動取得して検証**~~ | ~~`signatureController.verifyMaiml` + `extractSignatureFromXml()` 連携~~ | ✅ **完了**（2026-07-21） |
| 🟡 中 | **`getAuditLog`: `auditTarget` を `db-log` に切り替えて `integrity_audit_log` テーブルから取得** | `maimlIntegrityService.ts` + `signatureController.getAuditLog` |
| 🟡 中 | タイムスタンプ: local-mock（ランダムhex）→ 外部TSAサービスへの切り替え | `maimlIntegrityService.ts` |
| 🟢 低 | 証明書チェーン検証の完全実装 | `signatureController.validateCertificate` |

---

## 7. アルゴリズム分岐の検証結果（2026-07-17 ソース精査）

### 7-1. Service層（`maimlEncryptionService.ts`）の状態

Service層のアルゴリズム分岐は**3種とも正しく実装済み**。

| アルゴリズム | `encryptElement()` 実装 | `decryptElement()` 実装 | 鍵長 | IV長 |
|-------------|------------------------|------------------------|------|------|
| `aes-256-cbc` | ✅ `createCipheriv('aes-256-cbc', ...)` | ✅ `createDecipheriv('aes-256-cbc', ...)` | 32 bytes | 16 bytes |
| `aes-128-cbc` | ✅ `createCipheriv('aes-128-cbc', ...)` | ✅ `createDecipheriv('aes-128-cbc', ...)` | 16 bytes | 16 bytes |
| `aes-256-gcm` | ✅ `createCipheriv('aes-256-gcm', ...)`＋`getAuthTag()` | ✅ `createDecipheriv('aes-256-gcm', ...)`＋`setAuthTag()` | 32 bytes | 12 bytes (GCM推奨) |

- 暗号化形式: `IV + 暗号文` （CBC）/ `IV(12) + AuthTag(16) + 暗号文` （GCM）
- 復号時はアルゴリズムを `cipherResult.algorithmUri` から判定（W3C xmlenc URI準拠）
- 鍵ファイルは `testKeyLoader.loadEncryptionKeyByAlgorithm()` がアルゴリズム別に自動選択

### 7-2. Controller層（`encryptionController.ts`）の接続状態（2026-07-17 実装完了後）

**全フローが接続済み。`maimlEncryptionXmlHelper.ts` 追加により XML 操作が完結した。**

| 処理フロー | 状態 | 詳細 |
|-----------|------|------|
| `normalizeFrontAlgorithm()` でフロント値→Policy値変換 | ✅ 動作 | `aes256-gcm` → `aes-256-gcm` 等、全3種正しく変換 |
| `testKeyLoader.loadEncryptionKeyByAlgorithm()` でアルゴリズム別鍵ファイル読み込み | ✅ 動作 | `aes-256-gcm`/`aes-256-cbc` → `test-encryption-key-aes256.key`、`aes-128-cbc` → `test-encryption-key-aes128.key` |
| `maimlEncryptionService.generateKey(policy)` → `encryptElement(keyEntry, elementXml, policy)` | ✅ 動作 | `getElementXmlByTargetPath()` で実XMLを取得し `CipherResult` を生成 |
| 暗号文を `<EncryptedData>` XMLに変換してMAIMLに埋め込む | ✅ **実装完了** | `buildEncryptedDataXml()` → `replaceElementInXml()` → `saveMaimlContent(updatedXml)` |
| `maimlEncryptionService.retrieveKeyForDecryption(keyId, policy)` | ✅ 動作 | 鍵の取得まで正しく行われる |
| `maimlEncryptionService.decryptElement(keyEntry, cipherResult)` の呼び出し | ✅ **実装完了** | `extractCipherResultFromXml()` で CipherResult を抽出後に呼び出し |
| 復号結果をMAIMLに反映して保存 | ✅ **実装完了** | `replaceElementInXml()` → `saveMaimlContent(updatedXml)`。`finally`で`disposeKey()`保証 |

### 7-3. 結論（2026-07-17 更新）

- **アルゴリズム分岐ロジック自体はService層で正しく実装されており、バグはない**（変更なし）
- ~~**欠落しているのは「XMLパース＋要素の置換」という接続部分**~~ → **`maimlEncryptionXmlHelper.ts` を新規作成してすべて解消**
  - `getElementXmlByTargetPath()` — targetPath から実XML取得
  - `buildEncryptedDataXml()` / `buildChildRefsXml()` — W3C XML Encryption Core 1.1 準拠の `<EncryptedData>` 生成
  - `extractCipherResultFromXml()` — `<EncryptedData>` から CipherResult 抽出
  - `replaceElementInXml()` — XML内の対象要素を置換
  - `findEncryptedDataElements()` / `parseMaimlToEncryptionTree()` — パース系
- **2026-07-21 更新①**: `decryptPreview`（decrypt-preview）実装完了。`checkInsertion` の nodePath 絞り込み完了。`signMaiml` の `<ds:Signature>` 埋め込み保存完了。
- **2026-07-21 更新②**: `verifyMaiml` — `extractSignatureFromXml()` による storedHash / signatureValue の自動抽出を実装。リクエストボディから `signatureValue`/`storedHash` の受け渡しを廃止。
- **2026-07-21 更新③**: `previewEncryption` — afterXml を `<xenc:EncryptedData>` 構造プレビュー（要素名コメント・algorithmUri・keyId 含む）として返すよう実装。
- **2026-07-21 更新④**: POST `/projects/:name/decrypt`（`decryptElement`）をバックエンド・フロントエンドともに廃止。復号化は `/decrypt-execute` に統一。
- 残存スタブ: `exportKey`（パスワード暗号化部分）, `rotateKey`, `getAuditLog`（db-log モード切り替え）
