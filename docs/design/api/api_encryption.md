# 暗号化管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ファイル**: `encryptionRoutes.ts` / `encryptionController.ts`
- **カテゴリ**: MAIMLファイル暗号化・復号化・鍵管理

---

## 1. 概要

暗号化管理APIは、MAIMLファイル内の要素を W3C XML Encryption 仕様（`xenc:EncryptedData`）に基づいて暗号化・復号化する機能と、使用する暗号化鍵の管理機能を提供します。

> **⚠️ 現在の実装状態（テストモード）**
>
> 現在の実装は**テストモード**（DBレス）です。  
> - 鍵管理は `backend/test-keys/encryption/` の固定ファイルを参照します。  
> - DBの `encryption_keys` テーブルは使用しません。  
> - 一部のエンドポイントは未実装（`not_implemented`）または TODO です。

### 主要機能
- **MAIMLファイル暗号化**: 指定したXPath要素を `xenc:EncryptedData` に置換
- **MAIMLファイル復号化**: `xenc:EncryptedData` 要素を元のXMLに復元
- **プレビュー機能**: 暗号化・復号化実行前のXML変換結果を確認
- **鍵管理**: 暗号化鍵の一覧取得・生成・インポート・エクスポート・ローテーション

### 対応暗号化アルゴリズム

| フロントエンド側の値 | バックエンド内部値 | Algorithm URI |
|-------------------|-----------------|---------------|
| `aes256-cbc` | `aes-256-cbc` | `http://www.w3.org/2001/04/xmlenc#aes256-cbc` |
| `aes128-cbc` | `aes-128-cbc` | `http://www.w3.org/2001/04/xmlenc#aes128-cbc` |
| `aes256-gcm` | `aes-256-gcm` | `http://www.w3.org/2009/xmlenc11#aes256-gcm` |

> フロントエンドとバックエンドで命名形式が異なります（`aes256-cbc` ↔ `aes-256-cbc`）。  
> コントローラー内の `normalizeFrontAlgorithm()` で変換されます。

### 使用箇所
- **暗号化管理画面**: MAIMLファイルの要素暗号化・復号化の操作UI
- **鍵管理画面**: 暗号化鍵の登録・確認・エクスポート

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/encryption
```

### 2.2. 認証

現在のルート定義では `authMiddleware` / `tenantIsolation` は**ルートレベルでは未適用**です。  
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
  "error": { "code": "E5012", "message": "組織IDが取得できません" },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

### 2.4. 共通エラーコード

| コード | ステータス | 説明 |
|--------|----------|------|
| `E5012` | 400 | 組織IDが取得できない |
| `E1003` | 400 | 必須パラメータ未指定 |
| `E1002` | 400 | 不正なパラメータ形式 |
| `E6001` | 404 | リソースが見つからない |
| `E7002` | 409 | 操作が競合（テストモードの固定鍵削除不可など） |
| `E4001` | 500 | サーバーエラー |

---

## 3. API一覧

### プロジェクト単位の暗号化操作

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 1 | GET | `/api/v1/encryption/projects/:projectName/structure` | MAIMLツリー構造取得 | ✅ 実装済み |
| 2 | POST | `/api/v1/encryption/projects/:projectName/preview` | 暗号化プレビュー | ✅ 実装済み |
| 3 | POST | `/api/v1/encryption/projects/:projectName/encrypt` | 要素の暗号化実行 | ✅ 実装済み |
| 4 | GET | `/api/v1/encryption/projects/:projectName/encrypted-children` | 暗号化済み子要素一覧 | ✅ 実装済み |
| 5 | POST | `/api/v1/encryption/projects/:projectName/decrypt-preview` | 復号化プレビュー | ✅ 実装済み |
| 6 | POST | `/api/v1/encryption/projects/:projectName/decrypt-execute` | 復号化実行 | ✅ 実装済み |

### 暗号化鍵管理

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 7 | GET | `/api/v1/encryption/keys` | 鍵一覧取得 | ✅ 実装済み（テストモード） |
| 8 | GET | `/api/v1/encryption/keys/:keyId` | 鍵詳細取得 | ✅ 実装済み（テストモード） |
| 9 | POST | `/api/v1/encryption/keys` | 鍵作成 | ✅ 実装済み（テストモード） |
| 10 | DELETE | `/api/v1/encryption/keys/:keyId` | 鍵削除 | ⚠️ テストモードでは409 |
| 11 | POST | `/api/v1/encryption/keys/:keyId/export` | 鍵エクスポート | ✅ 実装済み（テストモード） |
| 12 | POST | `/api/v1/encryption/keys/import` | 鍵インポート | ✅ 実装済み（テストモード） |
| 13 | POST | `/api/v1/encryption/keys/:keyId/rotate` | 鍵ローテーション | 🔲 未実装（not_implemented） |
| 14 | POST | `/api/v1/encryption/keys/generate` | AES鍵ランダム生成 | ✅ 実装済み（テストモード） |
| 15 | POST | `/api/v1/encryption/keys/upload` | 既存鍵ファイルアップロード | ✅ 実装済み（テストモード） |

### 検証系

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 16 | POST | `/api/v1/encryption/upa-check` | UPA制約チェック | ✅ 実装済み |
| 17 | GET | `/api/v1/encryption/check-insertion/:projectName/:nodePath` | insertion存在確認 | ✅ 実装済み |

---

## 4. API詳細仕様

---

### 4.1. GET /projects/:projectName/structure — MAIMLツリー構造取得

**説明**: MAIMLファイルをパースして暗号化対象の要素ツリーを取得する。各ノードの `isEncryptable` / `isEncrypted` 状態を返す。

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
    "structure": [
      {
        "nodeId": "root",
        "tagName": "maiml:MAIML",
        "path": "/maiml:MAIML",
        "isEncryptable": false,
        "isEncrypted": false,
        "children": [
          {
            "nodeId": "node_001",
            "tagName": "maiml:DataTable",
            "path": "/maiml:MAIML/maiml:DataTable",
            "isEncryptable": true,
            "isEncrypted": false,
            "children": []
          }
        ]
      }
    ]
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

---

### 4.2. POST /projects/:projectName/preview — 暗号化プレビュー

**説明**: 暗号化実行前に、変換前後のXML（`beforeXml` / `afterXml`）を確認する。実際の暗号化は行わない。

#### リクエスト

**ボディ**:
```json
{
  "targetPath": "/maiml:MAIML/maiml:DataTable",
  "config": {
    "algorithm": "aes256-cbc",
    "keyName": "test-encryption-key-aes256"
  }
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `targetPath` | string | × | 暗号化対象のXPath |
| `config.algorithm` | string | × | アルゴリズム（`aes256-cbc` / `aes128-cbc` / `aes256-gcm`、デフォルト: `aes256-cbc`） |
| `config.keyName` | string | × | 使用する鍵名 |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "beforeXml": "<maiml:DataTable>...</maiml:DataTable>",
    "afterXml": "<xenc:EncryptedData xmlns:xenc=\"http://www.w3.org/2001/04/xmlenc#\" ...>...</xenc:EncryptedData>",
    "algorithmUri": "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
    "elementTag": "maiml:DataTable"
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

---

### 4.3. POST /projects/:projectName/encrypt — 要素の暗号化実行

**説明**: 指定したXPath要素を暗号化し、MAIMLファイルを更新する。複数要素の一括暗号化に対応。更新前にバックアップを自動作成する。

#### リクエスト

**ボディ**:
```json
{
  "targetPaths": [
    "/maiml:MAIML/maiml:DataTable",
    "/maiml:MAIML/maiml:ProcessLog"
  ],
  "config": {
    "algorithm": "aes256-cbc",
    "loadedKey": { "serverKeyId": "test-encryption-key-aes256" }
  }
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `targetPaths` | string[] | ✅ | 暗号化対象のXPathリスト（1件以上必須） |
| `config.algorithm` | string | × | アルゴリズム（デフォルト: `aes256-cbc`） |
| `config.loadedKey.serverKeyId` | string | × | 使用する鍵ID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "encryptedCount": 2,
    "results": [
      {
        "targetPath": "/maiml:MAIML/maiml:DataTable",
        "success": true,
        "encryptionId": "enc-1723629600000",
        "algorithmUri": "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
        "encryptedAt": "2026-08-14T11:00:00.000Z",
        "hasInsertionRefs": false,
        "insertionRefCount": 0
      }
    ],
    "algorithm": "aes256-cbc",
    "algorithmUri": "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
    "updatedFilePath": "projects/myProject/myProject.maiml",
    "backupFilePath": "projects/myProject/archive/myProject_backup_1723629600000.maiml"
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

**`results` 要素フィールド**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `targetPath` | string | 対象XPath |
| `success` | boolean | 暗号化成功かどうか |
| `encryptionId` | string \| undefined | 生成された暗号化ID |
| `algorithmUri` | string \| undefined | 使用したアルゴリズムURI |
| `encryptedAt` | string \| undefined | 暗号化日時（ISO 8601） |
| `hasInsertionRefs` | boolean | insertion参照を含むかどうか |
| `insertionRefCount` | number | insertion参照数 |
| `error` | string \| undefined | 失敗時のエラーメッセージ |
| `warning` | string \| undefined | 警告メッセージ |

---

### 4.4. GET /projects/:projectName/encrypted-children — 暗号化済み子要素一覧

**説明**: 指定ノード配下の全 `xenc:EncryptedData` 要素一覧を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |

#### レスポンス

**成功時（200 OK）**: 暗号化済み要素の一覧

---

### 4.5. POST /projects/:projectName/decrypt-preview — 復号化プレビュー

**説明**: 復号化実行前に、変換後のXMLプレビューを確認する。

#### リクエスト

**ボディ**:
```json
{
  "targetPaths": ["/maiml:MAIML/xenc:EncryptedData[@Id='enc-001']"],
  "decryptionKey": {
    "method": "load_file",
    "keyName": "test-encryption-key-aes256"
  }
}
```

---

### 4.6. POST /projects/:projectName/decrypt-execute — 復号化実行

**説明**: 暗号化済み要素を復号化し、MAIMLファイルを更新する。

#### リクエスト

**ボディ**:
```json
{
  "targetPaths": ["/maiml:MAIML/xenc:EncryptedData[@Id='enc-001']"],
  "decryptionKey": {
    "method": "load_file",
    "keyName": "test-encryption-key-aes256"
  }
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `targetPaths` | string[] | ✅ | 復号化対象のXPathリスト |
| `decryptionKey.method` | string | × | 鍵取得方式（`load_file` / `password`） |
| `decryptionKey.keyName` | string | × | 使用する鍵名 |
| `decryptionKey.password` | string | × | パスワード（`password` 方式の場合） |

---

### 4.7. GET /keys — 鍵一覧取得

**説明**: 利用可能な暗号化鍵の一覧を取得する。テストモードでは `backend/test-keys/encryption/` の `.key` ファイルをスキャンして仮想鍵情報を返す。

#### リクエスト

パラメータなし

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "keyId": "test-encryption-key-aes256",
        "keyName": "test-encryption-key-aes256",
        "keyIdentifier": "test-encryption-k",
        "algorithm": "aes256-cbc",
        "keySource": "load_file",
        "fileName": "test-encryption-key-aes256.key",
        "isActive": true,
        "createdAt": "2026-08-14T11:00:00.000Z",
        "expiresAt": null,
        "lastUsedAt": null,
        "usageCount": 0,
        "description": "テスト用固定鍵ファイル: backend/test-keys/encryption/test-encryption-key-aes256.key"
      }
    ]
  },
  "meta": { "timestamp": "2026-08-14T11:00:00.000Z" }
}
```

**`EncryptionKeyResponse` フィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `keyId` | string | 鍵ID（ファイル名と一致） |
| `keyName` | string | 鍵名 |
| `keyIdentifier` | string | 短縮識別子（先頭16文字） |
| `algorithm` | string | アルゴリズム（フロント形式: `aes256-cbc` 等） |
| `keySource` | string | 鍵の取得元（`load_file` / `public_key`） |
| `fileName` | string | `.key` ファイル名 |
| `isActive` | boolean | アクティブ状態 |
| `createdAt` | string | 作成日時（ISO 8601） |
| `expiresAt` | string \| null | 有効期限 |
| `lastUsedAt` | string \| null | 最終使用日時 |
| `usageCount` | number | 使用回数 |
| `description` | string \| null | 説明文 |

---

### 4.8. GET /keys/:keyId — 鍵詳細取得

**説明**: 指定した鍵の詳細情報を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `keyId` | string | ✅ | 鍵ID（ファイル名と一致） |

#### レスポンス

**成功時（200 OK）**: `EncryptionKeyResponse` 形式（`4.7` の keys 配列要素と同形式）

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 404 | `E6001` | 指定した鍵が存在しない |

---

### 4.9. POST /keys — 鍵作成

**説明**: 新しい暗号化鍵を作成する。テストモードでは実際には作成せず、対応する固定鍵情報を返す。

#### リクエスト

**ボディ**:
```json
{
  "keyName": "my-key",
  "algorithm": "aes256-cbc"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `keyName` | string | ✅ | 鍵名 |
| `algorithm` | string | ✅ | アルゴリズム（`aes256-cbc` / `aes128-cbc` / `aes256-gcm`） |

#### レスポンス

**成功時（201 Created）**: `EncryptionKeyResponse` 形式

---

### 4.10. DELETE /keys/:keyId — 鍵削除

**説明**: 指定した鍵を削除する。

> **⚠️ テストモードでは削除不可**: 固定ファイル（`test-keys/`）のため 409 を返す。  
> 本実装時は `backend/test-keys/encryption/` の直接操作が必要。

#### レスポンス

| ステータス | 説明 |
|-----------|------|
| 404 | 指定した鍵が存在しない |
| 409 | テストモードのため削除不可（エラーコード: `E7002`） |

---

### 4.11. POST /keys/:keyId/export — 鍵エクスポート

**説明**: 指定した鍵を `.key` 形式でエクスポートする。テストモードではBase64エンコードで返す（パスワード保護はスタブ）。

#### リクエスト

**ボディ**:
```json
{
  "password": "export-password"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `password` | string | ✅ | エクスポート用パスワード |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "fileContent": "base64エンコードされた鍵ファイル内容",
    "fileName": "test-encryption-key-aes256.key"
  },
  "meta": { "timestamp": "..." }
}
```

---

### 4.12. POST /keys/import — 鍵インポート

**説明**: `.key` / `.pem` / `.pfx` 形式の外部鍵ファイルを取り込む。テストモードでは実際には使用せず固定鍵情報を返す。

#### リクエスト

**ボディ**:
```json
{
  "fileName": "my-key.key",
  "fileContent": "base64エンコードされたファイル内容",
  "description": "本番用鍵"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `fileName` | string | ✅ | ファイル名（`.key` / `.pem` / `.pfx` のみ） |
| `fileContent` | string | ✅ | ファイル内容（Base64エンコード） |
| `description` | string | × | 説明文 |

#### レスポンス

**成功時（201 Created）**: `EncryptionKeyResponse` 形式

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `.key`/`.pem`/`.pfx` 以外の拡張子 |

---

### 4.13. POST /keys/:keyId/rotate — 鍵ローテーション

**説明**: 選択した鍵で暗号化された `EncryptedData` を全て新しい鍵で再暗号化する。

> **🔲 現在未実装**: `status: "not_implemented"` を返す。近日中に提供予定。

#### レスポンス

**現在の応答（200 OK）**:
```json
{
  "success": true,
  "data": {
    "jobId": null,
    "targetCount": 0,
    "status": "not_implemented",
    "message": "鍵ローテーション機能は現在実装中です。本機能は近日中に提供予定です。"
  },
  "meta": { "timestamp": "..." }
}
```

---

### 4.14. POST /keys/generate — AES鍵ランダム生成

**説明**: 指定したアルゴリズムでAES鍵をランダム生成する。テストモードでは対応する固定鍵情報を返す。

#### リクエスト

**ボディ**:
```json
{
  "keyName": "generated-key-001",
  "algorithm": "aes256-gcm",
  "description": "実験データ暗号化用",
  "expiresAt": "2027-08-14T00:00:00.000Z"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `keyName` | string | ✅ | 鍵名 |
| `algorithm` | string | ✅ | アルゴリズム |
| `description` | string | × | 説明文 |
| `expiresAt` | string | × | 有効期限（ISO 8601） |

#### レスポンス

**成功時（201 Created）** (`KeyOperationResponse` 形式):
```json
{
  "success": true,
  "data": {
    "keyId": "test-encryption-key-aes256",
    "keyIdentifier": "test-encryption-k",
    "fileName": "test-encryption-key-aes256.key",
    "algorithm": "aes256-cbc",
    "keySource": "load_file",
    "createdAt": "2026-08-14T11:00:00.000Z"
  },
  "meta": { "timestamp": "..." }
}
```

---

### 4.15. POST /keys/upload — 既存鍵ファイルアップロード

**説明**: 既存の鍵ファイルまたは公開鍵をアップロードする。テストモードでは実際には使用しない。

#### リクエスト

**ボディ**:
```json
{
  "keyName": "uploaded-key",
  "algorithm": "aes256-cbc",
  "keySource": "load_file"
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `keyName` | string | ✅ | 鍵名 |
| `algorithm` | string | ✅ | アルゴリズム |
| `keySource` | string | × | `load_file` / `public_key`（デフォルト: `load_file`） |

---

### 4.16. POST /upa-check — UPA制約チェック

**説明**: 指定要素のUPA（Unique Particle Attribution）制約チェックを行う。暗号化対象として有効かどうかを検証する。

---

### 4.17. GET /check-insertion/:projectName/:nodePath — insertion存在確認

**説明**: 指定ノードパスに `insertion` 要素が存在するか確認する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |
| `nodePath` | string | ✅ | 確認するノードパス |

---

## 5. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/encryptionRoutes.ts` |
| コントローラー | `backend/src/controllers/encryptionController.ts` |
| 暗号化サービス | `backend/src/services/maimlEncryptionService.ts` |
| ストレージサービス | `backend/src/services/storageService.ts` |
| XMLヘルパー | `backend/src/utils/maimlEncryptionXmlHelper.ts` |
| テスト鍵ローダー | `backend/src/utils/testKeyLoader.ts` |
| 型定義 | `backend/src/types/encryptionTypes.ts` |
| テスト鍵ファイル | `backend/test-keys/encryption/` |

---

## 6. テストモードの固定鍵ファイル

| ファイル名 | アルゴリズム | 用途 |
|-----------|------------|------|
| `test-encryption-key.key` | aes-256-cbc | 旧互換用 |
| `test-encryption-key-aes256.key` | aes-256-cbc / aes-256-gcm | AES-256系 |
| `test-encryption-key-aes128.key` | aes-128-cbc | AES-128系 |

鍵ファイルの生成（初期セットアップ）:
```bash
npx ts-node backend/scripts/generate-test-keys.ts
```

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 17エンドポイント全件を記載 | |
| | | - テストモード（DBレス）の設計・制約を明記 | |
| | | - アルゴリズム命名変換（フロント↔バックエンド）を記載 | |
| | | - 鍵ローテーションが未実装（not_implemented）である旨を記載 | |
