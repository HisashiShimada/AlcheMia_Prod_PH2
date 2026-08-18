# 署名・改竄防止管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ファイル**: `signatureRoutes.ts` / `signatureController.ts`
- **カテゴリ**: MAIMLファイル署名・タイムスタンプ・改竄防止

---

## 1. 概要

署名管理APIは、MAIMLファイルの改竄防止を目的として、XML電子署名（W3C XML Digital Signatures）とRFC 3161タイムスタンプトークン（TST）の管理機能を提供します。署名情報はMAIMLファイル内の `<ds:Signature>` 要素として埋め込まれます。

> **⚠️ 現在の実装状態（仮実装モード）**
>
> 現在の実装は**ローカル仮実装**（`local-dummy` / `local-mock` モード）です。
> - 署名プロバイダー: `local-dummy`（固定テスト鍵を使用）
> - TSAプロバイダー: `local-mock`（モックTSA）
> - 監査ログ: `local-log`（インメモリ。サーバー再起動で消える）
>
> 本実装で必要な範囲（TODO）:
> - `signatureProvider='hsm'` 対応（HSM署名）
> - `tsaProvider='external-tsa'` 対応（RFC 3161外部TSA）
> - `auditTarget='cloudtrail'` 対応

### 主要機能
- **MAIMLファイル署名**: ハッシュ計算→署名→TST取得→MAIMLへの `<ds:Signature>` 埋め込み
- **署名検証**: 署名・TST・証明書・時刻整合性の一括検証
- **ハッシュ確認**: 署名なしでMAIMLの現在のハッシュ値のみ取得
- **証明書検証**: PEM形式の証明書の有効期限・発行者チェーン検証
- **監査ログ**: 署名・検証操作の履歴管理

### 署名フロー概要

```
POST /sign （署名実行）
  ↓
  1. MAIMLファイルを取得（storageService）
  2. C14N正規化 + SHA-256ハッシュ計算
  3. 秘密鍵取得（local-dummy: テスト鍵）
  4. ハッシュに対してRSA署名生成
  5. <SignatureValue> 要素をC14N正規化してハッシュ計算
  6. TSAリクエスト生成（nonce付き）
  7. TST取得・messageImprint/nonce検証（リプレイ攻撃対策）
  8. 監査ログ記録（integrity_audit_log テーブル）
  9. <ds:Signature> XMLをMAIMLファイルのルート閉じタグ直前に埋め込み・保存
```

```
POST /verify （署名検証）
  ↓
  1. MAIMLから <ds:Signature Id="..."> を取得
  2. MAIMLのハッシュを再計算し保存済みdigestValueと比較
  3. 公開鍵で署名検証
  4. MAIMLからTSTを取得・検証
  5. MAIMLの <date> 要素でTSA時刻整合性チェック
  6. messageImprint/nonce検証（署名時のnonceと比較）
  7. 署名者証明書・TSA証明書の有効性検証
  8. 総合判定 + 監査ログ記録
```

### 使用箇所
- **改竄防止管理画面**: MAIMLファイルへの署名・検証操作UI
- **監査ログ画面**: 署名・検証の操作履歴確認

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/signature
```

### 2.2. 認証

`req.organizationId` が取得できない場合は `400 E5012` を返します。

### 2.3. 共通レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": { "code": "E1003", "message": "signatureId は必須です" },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

### 2.4. 共通エラーコード

| コード | ステータス | 説明 |
|--------|----------|------|
| `E5012` | 400 | 組織IDが取得できない |
| `E1003` | 400 | 必須パラメータ未指定 |
| `E1005` | 400 | 不正なパラメータ値 |
| `E6001` | 404 | リソースが見つからない（MAIMLファイル等） |
| `E6002` | 400 | MAIMLに指定の署名IDが見つからない |
| `E4001` | 500 | サーバーエラー |

---

## 3. API一覧

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 1 | POST | `/api/v1/signature/projects/:projectName/sign` | 署名実行 | ✅ 実装済み（仮実装） |
| 2 | POST | `/api/v1/signature/projects/:projectName/verify` | 署名一括検証 | ✅ 実装済み（仮実装） |
| 3 | GET | `/api/v1/signature/projects/:projectName/hash` | ハッシュ値のみ取得 | ✅ 実装済み |
| 4 | POST | `/api/v1/signature/certificates/validate` | 証明書検証 | ✅ 実装済み（仮実装） |
| 5 | GET | `/api/v1/signature/audit-log` | 監査ログ一覧取得 | ✅ 実装済み（local-log） |

---

## 4. API詳細仕様

---

### 4.1. POST /projects/:projectName/sign — 署名実行

**説明**: MAIMLファイルのハッシュ計算→署名→TST取得→監査ログ記録を一括実行し、`<ds:Signature>` をMAIMLファイルに埋め込んで保存する。更新前にバックアップを自動作成する（`archive/` ディレクトリ）。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |

**ボディ**:
```json
{
  "signatureId": "sig-myProject-001"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `signatureId` | string | × | 署名ID（省略時は `sig-{projectName}-{timestamp}` で自動採番） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "signatureId": "sig-myProject-001",
    "digestValue": "base64エンコードされたSHA-256ハッシュ値",
    "algorithmUri": "http://www.w3.org/2001/04/xmlenc#sha256",
    "computedAt": "2026-08-14T11:00:00.000Z",
    "signatureValue": "base64エンコードされたRSA署名値",
    "signatureAlgorithmUri": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    "signedAt": "2026-08-14T11:00:00.000Z",
    "timestampToken": "base64エンコードされたTSTトークン",
    "timestamp": "2026-08-14T11:00:00.000Z",
    "tsaIdentifier": "CN=LocalMockTSA",
    "updatedFilePath": "projects/myProject/myProject.maiml"
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

**レスポンスフィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `signatureId` | string | 署名ID（MAIMLに埋め込まれた `<ds:Signature Id="...">` と一致） |
| `digestValue` | string | Base64エンコードされたハッシュ値（SHA-256） |
| `algorithmUri` | string | ハッシュアルゴリズムURI |
| `computedAt` | string | ハッシュ計算日時（ISO 8601） |
| `signatureValue` | string | Base64エンコードされたRSA署名値 |
| `signatureAlgorithmUri` | string | 署名アルゴリズムURI |
| `signedAt` | string | 署名日時（ISO 8601） |
| `timestampToken` | string | Base64エンコードされたTSTトークン（RFC 3161） |
| `timestamp` | string | TSAが発行した時刻（ISO 8601） |
| `tsaIdentifier` | string | TSAの識別子 |
| `updatedFilePath` | string | 更新されたMAIMLファイルパス |

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `E5012` | 組織IDが取得できない |
| 404 | `E6001` | MAIMLファイルが見つからない |
| 500 | `E4001` | 署名処理中のエラー（TST検証失敗等） |

#### 実装上の注意
- **リプレイ攻撃対策**: TSAリクエスト送信時のnonceをインメモリに保存し、受信したTSTのmessageImprint/nonceを検証
- **MAIMLへの埋め込み**: 同一 `signatureId` の既存 `<Signature>` / `<ds:Signature>` を削除後、ルート閉じタグ直前に挿入

---

### 4.2. POST /projects/:projectName/verify — 署名一括検証

**説明**: MAIMLファイル内の `<ds:Signature>` を取得し、署名・TST・時刻整合性・証明書を一括検証して結果を返す。検証結果は監査ログに記録される。

> **前提**: 事前に `/sign` を実行してMAIMLに署名が埋め込まれている必要があります。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |

**ボディ**:
```json
{
  "signatureId": "sig-myProject-001",
  "signerCert": "-----BEGIN CERTIFICATE-----\n...",
  "tsaCert": "-----BEGIN CERTIFICATE-----\n..."
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `signatureId` | string | ✅ | 検証対象の署名ID |
| `signerCert` | string | × | 署名者証明書（PEM形式または仮識別子。省略時: `local-dummy-signing-key`） |
| `tsaCert` | string | × | TSA証明書（PEM形式または仮識別子。省略時: `local-mock-tsa`） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "overallValid": true,
    "hashMatch": true,
    "recomputedDigest": "現在のMAIMLから再計算したハッシュ（Base64）",
    "storedDigest": "MAIMLに保存されているハッシュ（Base64）",
    "signatureValid": true,
    "signatureReason": null,
    "timestampValid": true,
    "timestampValue": "2026-08-14T11:00:00.000Z",
    "timeConsistent": true,
    "timeConsistencyReason": null,
    "messageImprintValid": true,
    "messageImprintHashMatch": true,
    "messageImprintAlgorithmMatch": true,
    "messageImprintNonceMatch": true,
    "messageImprintReason": null,
    "signerCertValid": true,
    "signerCertReason": null,
    "signerCertExpiresAt": "2027-08-14T00:00:00.000Z",
    "tsaCertValid": true,
    "tsaCertReason": null,
    "tsaCertExpiresAt": "2027-08-14T00:00:00.000Z"
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

**レスポンスフィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `overallValid` | boolean | **総合判定**（全項目がtrueの場合のみtrue） |
| `hashMatch` | boolean | MAIMLの現在のハッシュと保存済みdigestValueが一致するか |
| `recomputedDigest` | string | 現在のMAIMLから再計算したハッシュ |
| `storedDigest` | string | MAIMLの `<ds:DigestValue>` に保存されているハッシュ |
| `signatureValid` | boolean | 署名が有効か（公開鍵で検証） |
| `signatureReason` | string \| null | 署名検証失敗の理由 |
| `timestampValid` | boolean | TSTが有効か（RFC 3161） |
| `timestampValue` | string | TSTに含まれる時刻（ISO 8601） |
| `timeConsistent` | boolean | TST時刻とMAIMLの `<date>` 要素の整合性 |
| `timeConsistencyReason` | string \| null | 時刻不整合の理由 |
| `messageImprintValid` | boolean | messageImprint/nonce検証が成功したか（リプレイ攻撃対策） |
| `messageImprintHashMatch` | boolean | messageImprintのハッシュ一致 |
| `messageImprintAlgorithmMatch` | boolean | messageImprintのアルゴリズム一致 |
| `messageImprintNonceMatch` | boolean | nonceの一致 |
| `messageImprintReason` | string \| null | messageImprint検証失敗の理由 |
| `signerCertValid` | boolean | 署名者証明書が有効か |
| `signerCertReason` | string \| null | 証明書検証失敗の理由 |
| `signerCertExpiresAt` | string \| null | 証明書有効期限 |
| `tsaCertValid` | boolean | TSA証明書が有効か |
| `tsaCertReason` | string \| null | TSA証明書検証失敗の理由 |
| `tsaCertExpiresAt` | string \| null | TSA証明書有効期限 |

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `E1003` | `signatureId` が未指定 |
| 400 | `E6002` | MAIMLに指定の署名IDが見つからない（先に `/sign` を実行） |
| 404 | `E6001` | MAIMLファイルが見つからない |
| 500 | `E4001` | MAIMLに `<date>` 要素がない等のエラー |

#### 実装上の注意
- **`<date>` 要素必須**: 時刻整合性チェックにはMAIML内の `<date>` 要素が必要。存在しない場合は500エラー
- **nonce検証**: 署名時にインメモリ保存したnonceを使用。サーバー再起動後は検証不可

---

### 4.3. GET /projects/:projectName/hash — ハッシュ値のみ取得

**説明**: MAIMLファイルの現在のハッシュ値のみを返す（署名は行わない軽量確認用）。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "digestValue": "base64エンコードされたSHA-256ハッシュ値",
    "algorithmUri": "http://www.w3.org/2001/04/xmlenc#sha256",
    "computedAt": "2026-08-14T11:00:00.000Z",
    "xmlLength": 12345
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `digestValue` | string | Base64エンコードされたハッシュ値（C14N正規化後） |
| `algorithmUri` | string | ハッシュアルゴリズムURI |
| `computedAt` | string | 計算日時（ISO 8601） |
| `xmlLength` | number | MAIMLファイルのバイト長 |

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 404 | `E6001` | MAIMLファイルが見つからない |

---

### 4.4. POST /certificates/validate — 証明書検証

**説明**: PEM形式の証明書の有効期限・発行者チェーンを検証する。署名者証明書（`signer`）とTSA証明書（`tsa`）の2種類に対応。

#### リクエスト

**ボディ**:
```json
{
  "certificate": "-----BEGIN CERTIFICATE-----\nMIIDXTCC...\n-----END CERTIFICATE-----",
  "type": "signer"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `certificate` | string | ✅ | PEM形式の証明書、または仮識別子（`local-dummy-signing-key` 等） |
| `type` | string | ✅ | `"signer"`（署名者証明書）または `"tsa"`（TSA証明書） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "expiresAt": "2027-08-14T00:00:00.000Z",
    "issuer": "CN=LocalTestCA",
    "subject": "CN=LocalTestSigner",
    "reason": null
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `isValid` | boolean | 証明書が有効か |
| `expiresAt` | string \| null | 証明書有効期限（ISO 8601） |
| `issuer` | string \| null | 発行者DN |
| `subject` | string \| null | サブジェクトDN |
| `reason` | string \| null | 無効の場合の理由 |

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `E1003` | `certificate` または `type` が未指定 |
| 400 | `E1005` | `type` が `signer`/`tsa` 以外 |

---

### 4.5. GET /audit-log — 監査ログ一覧取得

**説明**: 改竄防止操作（署名・検証）の監査ログを取得する。現在は `local-log` モード（インメモリ）と `db-log` モード（TODO）の2種類がある。

#### リクエスト

パラメータなし

#### レスポンス

**成功時（200 OK）— `local-log` モード**:
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "operation": "sign",
        "projectName": "myProject",
        "signatureId": "sig-myProject-001",
        "digestValue": "abc123...",
        "timestamp": "2026-08-14T11:00:00.000Z",
        "organizationId": "org-001",
        "userId": "user-001"
      }
    ],
    "total": 1,
    "source": "local-log",
    "_warning": "local-log モードのデータはサーバー再起動で消えます"
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

**`db-log` モード（未実装）**:
```json
{
  "success": true,
  "data": {
    "entries": [],
    "total": 0,
    "source": "db-log",
    "_todo": "DB クエリ実装後に返す"
  },
  "meta": { "timestamp": "..." }
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `entries` | array | 監査ログエントリ一覧 |
| `total` | number | 総件数 |
| `source` | string | ログ取得元（`local-log` / `db-log`） |
| `_warning` | string \| undefined | `local-log` モードの注意書き |
| `_todo` | string \| undefined | `db-log` モードの未実装案内 |

---

## 5. MAIMLファイルへの署名埋め込み仕様

### 埋め込み形式

署名はMAIMLのルート要素閉じタグ直前に以下の形式で挿入されます。

```xml
<maiml:MAIML ...>
  <!-- MAIMLコンテンツ -->

  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="sig-myProject-001">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>base64エンコードされたハッシュ値</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>base64エンコードされたRSA署名値</SignatureValue>
    <Object Id="timestamp">
      <xades:QualifyingProperties>
        <xades:UnsignedProperties>
          <xades:UnsignedSignatureProperties>
            <xades:SignatureTimeStamp>
              <xades:EncapsulatedTimeStamp>base64エンコードされたTSTトークン</xades:EncapsulatedTimeStamp>
            </xades:SignatureTimeStamp>
          </xades:UnsignedSignatureProperties>
        </xades:UnsignedProperties>
      </xades:QualifyingProperties>
    </Object>
  </Signature>

</maiml:MAIML>
```

### 同一IDの署名上書き
- 同一 `signatureId` の既存 `<Signature>` / `<ds:Signature>` は削除された上で新しい署名が挿入されます（上書き動作）

---

## 6. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/signatureRoutes.ts` |
| コントローラー | `backend/src/controllers/signatureController.ts` |
| 整合性サービス | `backend/src/services/maimlIntegrityService.ts` |
| ストレージサービス | `backend/src/services/storageService.ts` |
| 型定義 | `backend/src/types/integrityTypes.ts` |
| DBテーブル | `integrity_audit_log`（監査ログ、`db-log` モード時） |

---

## 7. 関連ドキュメント

- [api_list.md](./api_list.md)
- [api_encryption.md](./api_encryption.md)（MAIMLファイルの暗号化APIと連携）

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 5エンドポイント全件を記載 | |
| | | - 署名フロー・検証フローの9ステップを詳細に記載 | |
| | | - 仮実装モード（local-dummy/local-mock）の制約を明記 | |
| | | - MAIMLへの `<ds:Signature>` 埋め込み形式を記載 | |
| | | - messageImprint/nonceによるリプレイ攻撃対策を記載 | |
