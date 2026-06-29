# Signature要素 実装仕様書

**作成日**: 2026-06-25  
**対象**: MAIMLファイルのDocument要素に対するXML電子署名（XMLDSig）  
**参照元**: [PLAN.md](./PLAN.md), [PLAN_frontend_mock.md](./PLAN_frontend_mock.md)

---

## 1. Signature要素の構造

### 1.1 MAIMLファイル内の配置

`<Signature>` は `<Document>` タグの**最後の子要素**として挿入する。

```xml
<MAIML>
  <Document uuid="550e8400-e29b-41d4-a716-446655440000">
    <name>サンプルプロジェクト</name>
    <protocol>
      <method id="method_001">
        <!-- ... -->
      </method>
    </protocol>
    <data>
      <!-- 実験データ -->
    </data>
    <eventLog>
      <!-- イベントログ -->
    </eventLog>

    <!-- ↓ 署名は Document の最後の子要素として追加 -->
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <Reference URI="">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <DigestValue>BASE64_ENCODED_HASH</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>BASE64_ENCODED_SIGNATURE</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>BASE64_ENCODED_DER_CERTIFICATE</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>
  </Document>
</MAIML>
```

### 1.2 各要素の説明

| 要素 | 説明 |
|------|------|
| `<Signature xmlns="...">` | W3C XMLDSig名前空間。Document直下の最後の子要素に配置 |
| `<CanonicalizationMethod>` | 正規化アルゴリズム。`C14N`（Canonical XML 1.0）を使用 |
| `<SignatureMethod>` | 署名アルゴリズム。`RSA-SHA256`を使用 |
| `<Reference URI="">` | `URI=""`はDocument全体を対象とすることを示す |
| `<Transform Algorithm="enveloped-signature">` | Signature要素自身を署名対象から除外する変換 |
| `<DigestMethod>` | ハッシュアルゴリズム。`SHA-256`を使用 |
| `<DigestValue>` | ハッシュ値（Base64エンコード済み） |
| `<SignatureValue>` | RSA秘密鍵による署名値（Base64エンコード済み） |
| `<X509Certificate>` | 署名に使用した証明書（DER形式をBase64エンコード） |

---

## 2. 署名生成処理フロー

### 2.1 フロー概要

```
[APIリクエスト: POST /api/v1/projects/:name/signature/apply]
      ↓
1. S3からMAIMLファイルをダウンロード
      ↓
2. 既存の<Signature>要素を除去（再署名の場合）
      ↓
3. Document要素全体をCanonical XML（C14N）に正規化
      ↓
4. 正規化したバイト列のSHA-256ハッシュを計算 → DigestValue
      ↓
5. <SignedInfo>をC14N正規化し、RSA秘密鍵でSHA-256署名 → SignatureValue
      ↓
6. <Signature>要素を組み立て、Documentの最後の子要素として挿入
      ↓
7. 現在のMAIMLをアーカイブ（archive/xxx_vN.maiml）
      ↓
8. 署名済みMAIMLをS3に保存
      ↓
9. DBに署名ステータス・日時を記録（任意）
```

### 2.2 バックエンド実装例（Node.js / `xml-crypto`使用）

```typescript
// backend/src/services/signatureService.ts

import * as xmlCrypto from 'xml-crypto';
import * as fs from 'fs';
import { getStorageService } from './storageService';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { archiveMaimlFile } from './maimlArchiveService'; // 既存アーカイブ処理を再利用

/**
 * MAIMLファイルのDocument全体に電子署名を実行する
 *
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param projectName プロジェクト名
 */
export async function applySignature(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<void> {
  const storageService = getStorageService();

  // 1. MAIMLファイルを取得
  const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
  const fileBuffer = await storageService.downloadFile(organizationId, filePath);
  const xmlString = fileBuffer.toString('utf-8');

  // 2. 既存のSignature要素を除去（再署名の場合）
  const cleanedXml = removeExistingSignature(xmlString);

  // 3. 署名に使用する鍵・証明書を取得
  //    - 開発環境: backend/certs/ca/ca.key, backend/certs/ca/ca.crt
  //    - 本番環境: 環境変数またはAWS KMSから取得
  const privateKey = loadPrivateKey();
  const certificate = loadCertificate();

  // 4. xml-cryptoを使用して署名を生成
  //    - signingKey: RSA秘密鍵（PEM形式）
  //    - enveloped-signatureで自己参照を除外
  const signer = new xmlCrypto.SignedXml({
    privateKey,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  });

  // 署名対象: Document要素全体（URI=""はルート要素を対象とする）
  signer.addReference({
    xpath: '//*[local-name(.)="Document"]',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  // KeyInfo（証明書情報）を付与
  signer.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certificate}</X509Certificate></X509Data>`,
  };

  // 署名を計算
  signer.computeSignature(cleanedXml);
  const signedXml = signer.getSignedXml();

  // 5. アーカイブを作成してから保存
  await archiveMaimlFile(organizationId, projectId, projectName);

  // 6. 署名済みMAIMLを保存
  await storageService.uploadFile(
    organizationId,
    filePath,
    Buffer.from(signedXml, 'utf-8'),
    { contentType: 'application/xml' }
  );
}

/**
 * 既存の<Signature>要素をXMLから除去する（再署名前処理）
 */
function removeExistingSignature(xmlString: string): string {
  // <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">...</Signature> を除去
  return xmlString.replace(
    /<Signature\s+xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"[\s\S]*?<\/Signature>/,
    ''
  );
}
```

---

## 3. 署名検証処理フロー

### 3.1 フロー概要

```
[APIリクエスト: GET /api/v1/projects/:name/signature/status]
      ↓
1. S3からMAIMLファイルをダウンロード
      ↓
2. <Signature>要素の存在確認
      ↓（存在しない場合）→ { status: 'none' } を返す
      ↓（存在する場合）
3. <X509Certificate>から公開鍵を抽出
      ↓
4. <DigestValue>の再計算（Document本体のSHA-256ハッシュ）
      ↓
5. 元の<DigestValue>と比較（改ざん検知）
      ↓
6. <SignatureValue>をRSA公開鍵で検証
      ↓
7. 検証結果を返す
      { status: 'signed', signedAt: '...', isValid: true/false }
```

### 3.2 バックエンド実装例

```typescript
/**
 * MAIMLファイルの署名ステータスを取得・検証する
 */
export async function getSignatureStatus(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<SignatureStatusResult> {
  const storageService = getStorageService();

  const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
  const fileBuffer = await storageService.downloadFile(organizationId, filePath);
  const xmlString = fileBuffer.toString('utf-8');

  // Signature要素の存在確認
  const hasSignature = xmlString.includes(
    '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"'
  );

  if (!hasSignature) {
    return { status: 'none' };
  }

  // xml-cryptoで署名検証
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const signature = xmlCrypto.xpath(
    doc,
    "/*/*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']"
  )[0];

  const verifier = new xmlCrypto.SignedXml();
  verifier.keyInfoProvider = new X509KeyInfoProvider(); // 証明書から公開鍵を取得
  verifier.loadSignature(signature);

  const isValid = verifier.checkSignature(xmlString);

  // <SignatureValue>のBase64を生成日時として使う（または別途タイムスタンプを管理）
  return {
    status: 'signed',
    isValid,
    signedAt: extractSignedAt(xmlString), // KeyInfo内のタイムスタンプ等から抽出
  };
}
```

---

## 4. 署名削除処理フロー

```typescript
/**
 * MAIMLファイルからSignature要素を削除する
 */
export async function removeSignature(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<void> {
  const storageService = getStorageService();

  const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
  const fileBuffer = await storageService.downloadFile(organizationId, filePath);
  const xmlString = fileBuffer.toString('utf-8');

  // Signature要素を除去
  const cleanedXml = removeExistingSignature(xmlString);

  // アーカイブを作成してから保存
  await archiveMaimlFile(organizationId, projectId, projectName);

  await storageService.uploadFile(
    organizationId,
    filePath,
    Buffer.from(cleanedXml, 'utf-8'),
    { contentType: 'application/xml' }
  );
}
```

---

## 5. 暗号化との関係（重要）

### 5.1 正しい操作順序

```
正しい順序:
  1. MAIMLコンテンツを編集
  2. 必要な要素を暗号化（<EncryptedData>として格納）
  3. 署名を実行（暗号化済み状態のDocument全体に対して）
  ✅ 署名が有効な状態で保存される

誤った順序:
  1. MAIMLコンテンツを編集
  2. 署名を実行
  3. 暗号化を実行（Documentの内容が変わるため署名が無効化）
  ❌ 署名値と実際のコンテンツが一致しなくなる
```

### 5.2 UIでの制御方針

- 暗号化操作後は署名ステータスを自動的に `none` にリセットする
  - または検証時に `isValid: false` として無効を明示
- 「暗号化管理」モーダルの操作完了時に、署名ステータスを警告表示する
- `SignatureManagement.tsx` の注意書きに「暗号化後は再署名が必要」と明記済み

### 5.3 Parserでの考慮

`maimlService.ts` の `MaimlParserTyped` では、`<Signature>` 要素は**無視**するか**読み飛ばす**設計にする。署名要素はMaimlの業務ロジックとは無関係なメタデータであるため、Petri Net描画・タスク生成・バリデーション等の処理に影響させない。

---

## 6. バックエンドAPI設計

### 6.1 エンドポイント一覧

| メソッド | URL | 説明 |
|----------|-----|------|
| `GET` | `/api/v1/projects/:name/signature/status` | 署名ステータスを取得 |
| `POST` | `/api/v1/projects/:name/signature/apply` | 署名を実行 |
| `POST` | `/api/v1/projects/:name/signature/remove` | 署名を削除 |

### 6.2 レスポンス形式

**GET /signature/status**
```json
{
  "success": true,
  "data": {
    "status": "signed",
    "signedAt": "2026-06-25T15:00:00.000Z",
    "isValid": true
  }
}
```

**POST /signature/apply**
```json
{
  "success": true,
  "data": {
    "signedAt": "2026-06-25T15:00:00.000Z"
  }
}
```

**エラーレスポンス例**
```json
{
  "success": false,
  "error": {
    "code": "E4006",
    "message": "ストレージエラーが発生しました"
  }
}
```

### 6.3 権限制御

| ロール | status取得 | apply | remove |
|--------|-----------|-------|--------|
| experiment_admin | ✅ | ✅ | ✅ |
| experiment_worker | ✅ | ❌ | ❌ |
| data_admin | ✅ | ✅ | ✅ |

---

## 7. 鍵管理方針

### 7.1 使用する鍵・証明書

既存の `certificateService.ts` が管理するクライアント証明書（組織ごとのCA署名入り証明書）を流用することが望ましい。

```
backend/certs/ca/
├── ca.crt    ← CA証明書（公開鍵）
└── ca.key    ← CA秘密鍵（署名生成に使用）
```

### 7.2 環境変数での管理

```env
# 署名用秘密鍵（PEM形式をBase64エンコード）
SIGNATURE_PRIVATE_KEY_BASE64=...

# 署名用証明書（PEM形式をBase64エンコード）
SIGNATURE_CERTIFICATE_BASE64=...
```

### 7.3 将来的な拡張（AWS KMS）

本番環境では AWS KMS を使用し、秘密鍵をHSM管理にすることで鍵の漏洩リスクを排除できる。

---

## 8. 必要なnpmパッケージ

```bash
# xml-crypto: Node.js用XMLDSig実装
npm install xml-crypto
npm install --save-dev @types/xml-crypto
```

**`xml-crypto` の特徴:**
- W3C XMLDSig仕様に準拠
- RSA-SHA256, RSA-SHA512をサポート
- C14N（Canonical XML）正規化を内包
- enveloped-signatureに対応（Signature要素自身を対象外にできる）

---

## 9. maimlDataWriter.ts への追記指針

既存の `backend/src/utils/maimlDataWriter.ts` には `replaceDataAndEventLogInMaiml()` 等のMAIML書き込みユーティリティがある。  
署名処理も同様に以下の関数を追加する：

```typescript
// backend/src/utils/maimlDataWriter.ts に追記

/**
 * MAIMLのDocument要素からSignature要素を除去して返す
 * 署名前の前処理として使用する
 */
export function removeSignatureFromMaiml(xmlString: string): string {
  return xmlString.replace(
    /<Signature\s+xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"[\s\S]*?<\/Signature>\s*/,
    ''
  );
}

/**
 * MAIMLにSignature要素が存在するか確認する
 */
export function hasSignatureElement(xmlString: string): boolean {
  return xmlString.includes('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"');
}
```

---

## 10. 実装時のファイル配置計画

```
backend/src/
├── controllers/
│   └── signatureController.ts       ← 新規作成
├── services/
│   └── signatureService.ts          ← 新規作成
├── routes/
│   └── projectRoutes.ts             ← /signature/* エンドポイントを追記
└── utils/
    └── maimlDataWriter.ts           ← removeSignatureFromMaiml() を追記

frontend/src/
├── types/
│   └── signature.ts                 ← 作成済み
├── services/
│   └── signatureService.ts          ← スタブ作成済み（TODOコメントで実API接続箇所を明示）
└── components/signature/
    ├── SignatureManagement.tsx       ← 作成済み
    └── SignatureManagementModal.tsx  ← 作成済み
```

---

## 参考資料

- [W3C XML Signature Syntax and Processing](https://www.w3.org/TR/xmldsig-core/)
- [xml-crypto npm package](https://www.npmjs.com/package/xml-crypto)
- [Canonical XML 1.0 (C14N)](https://www.w3.org/TR/2001/REC-xml-c14n-20010315)
- 既存暗号化実装: `backend/src/services/encryptionKeyService.ts`
- 既存証明書管理: `backend/src/services/certificateService.ts`
- 既存MAIMLライター: `backend/src/utils/maimlDataWriter.ts`
