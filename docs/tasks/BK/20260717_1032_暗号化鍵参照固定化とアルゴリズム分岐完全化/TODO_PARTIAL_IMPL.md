# 部分実装箇所の洗い出しと未完了理由

> 作成日: 2026-07-21  
> 対象: 秘匿化（暗号化）機能 / 改竄防止（署名）機能  
> 除外: 鍵管理機能（uploadKey / importKey / exportKey / rotateKey）、TSA外部認証局連携  
> 凡例: ⚠️ 部分実装（APIは動くが処理が不完全）

---

## 1. 暗号化機能

### 1-1. `previewEncryption` — afterXml がプレースホルダー

**エンドポイント**: `POST /api/v1/encryption/projects/:projectName/preview`  
**ファイル**: `backend/src/controllers/encryptionController.ts` L276〜333  
**状態**: ⚠️ beforeXml は実XML取得済み・afterXml は固定プレースホルダー

#### 現在の動作

```
beforeXml = getElementXmlByTargetPath(xmlContent, targetPath)  ← 実XML取得済み ✅
afterXml  = 固定テンプレート文字列（"(暗号化後の Base64 データがここに入ります)"）  ← ❌
```

#### なぜ作れていないか

afterXml を生成するのに必要な処理は **encryptElement の実行**だが、
`previewEncryption` はプレビュー（保存しない）なので「鍵を消費して暗号化する」のが
意図的に避けられていた（設計的に保留）。

実際には必要な関数はすでに揃っており、以下の3行を追加するだけで実装できる：

```typescript
const keyEntry = await maimlEncryptionService.generateKey(policy);   // 既存関数
const cipherResult = maimlEncryptionService.encryptElement(keyEntry, beforeXml, policy); // 既存関数
const afterXml = buildEncryptedDataXml(cipherResult);                // 既存関数
maimlEncryptionService.disposeKey(keyEntry.keyId);                   // 鍵廃棄
```

#### 実装に必要な変更

| ファイル | 変更箇所 | 内容 |
|---------|---------|------|
| `backend/src/controllers/encryptionController.ts` | L313〜327（afterXml 生成部分） | 固定テンプレートを削除し、`generateKey` → `encryptElement` → `buildEncryptedDataXml` の3ステップに置き換える |

**難易度**: 低（既存関数の組み合わせのみ・5〜10行の変更）

---

### 1-2. `decryptElement` — 後方互換エンドポイント（実質 `/decrypt-execute` に委譲）

**エンドポイント**: `POST /api/v1/encryption/projects/:projectName/decrypt`  
**ファイル**: `backend/src/controllers/encryptionController.ts` L497〜  
**状態**: ⚠️ 鍵取得まで動作。実際の復号・XML置換は `/decrypt-execute` で行う

#### 現在の動作

`retrieveKeyForDecryption()` で鍵を取得するところまで動くが、その後の
`extractCipherResultFromXml` → `decryptElement` → `replaceElementInXml` → `saveMaiml`
のフローが実行されず、`202 Accepted` または空レスポンスで終わっている。

#### なぜ作れていないか

このエンドポイントは `/decrypt-execute` への **後方互換ラッパー**として位置付けられており、
`/decrypt-execute` が実装完了したタイミングで「このエンドポイントは `/decrypt-execute` を
内部呼び出しするか、フロントを `/decrypt-execute` に移行してもらう」方針が
整理されないままになっている。

#### 実装に必要な変更

**方針A（推奨）**: フロントエンドが呼ぶ側を `/decrypt-execute` に変更し、このエンドポイントは廃止予告

**方針B**: このエンドポイントに `/decrypt-execute` と同じロジックをコピーする  

| ファイル | 変更箇所 | 内容 |
|---------|---------|------|
| `frontend/src/services/encryptionService.ts` | decryptElement 呼び出し箇所 | エンドポイントを `/decrypt` から `/decrypt-execute` に変更 |

**難易度**: 低（エンドポイントの切り替えまたはフロント修正のみ）

---

## 2. 改竄防止機能

### 2-1. `verifyMaiml` — signatureValue / storedHash をリクエストから手動で渡す必要がある

**エンドポイント**: `POST /api/v1/signature/projects/:projectName/verify`  
**ファイル**: `backend/src/controllers/signatureController.ts` L276〜402  
**状態**: ⚠️ 検証ロジック自体は動作。ただし呼び出し側がMAIMLから値を自動取得できない

#### 現在の動作

```
リクエストボディ必須:
  signatureId    — 署名ID
  signatureValue — Base64署名値（手動で渡す必要あり）
  storedHash     — Base64ダイジェスト値（手動で渡す必要あり）

TST は extractTimestampToken() でMAIMLから自動取得済み ✅
```

フロントエンドが `signMaiml` のレスポンス（`signatureValue`, `digestValue`）を
一時的に保持してそのまま `verifyMaiml` に渡さないと検証できない。

#### なぜ作れていないか

`maimlIntegrityService.extractSignatureFromXml()` という関数がすでに実装されており、
この関数で MAIML から `digestValue`, `signatureValue`, `algorithmUri` を自動取得できる。
しかし `signatureController.verifyMaiml` がこの関数を呼んでいないため、
リクエストボディからの手渡しが必要になっている。

**実装に必要なコードはすべて揃っている**。以下の変更のみで解決できる：

```typescript
// verifyMaiml 内の変更（signatureController.ts L295〜300 付近）

// 変更前: リクエストボディから取得（必須チェックあり）
if (!signatureId || !signatureValue || !storedHash) {
  badRequest(res, 'E1003', 'signatureId, signatureValue, storedHash は必須です');
  return;
}

// 変更後: MAIMLファイルから自動取得し、リクエストがあれば上書き
const extracted = maimlIntegrityService.extractSignatureFromXml(xmlContent, signatureId);
const resolvedSignatureValue = signatureValue ?? extracted?.signatureValue;
const resolvedStoredHash = storedHash ?? extracted?.digestValue;

if (!resolvedSignatureValue || !resolvedStoredHash) {
  badRequest(res, 'E1003', 'MAIML に署名が見つかりません。先に /sign を実行してください');
  return;
}
```

#### 実装に必要な変更

| ファイル | 変更箇所 | 内容 |
|---------|---------|------|
| `backend/src/controllers/signatureController.ts` | L276〜300（リクエスト取得部分） | `signatureValue`/`storedHash` のバリデーションを変更。MAIMLから `extractSignatureFromXml()` で自動取得し、リクエスト値で上書き可能にする |
| `backend/src/controllers/signatureController.ts` | L315〜322（ハッシュ比較・署名検証） | `signatureValue` / `storedHash` → `resolvedSignatureValue` / `resolvedStoredHash` に変数名変更 |

**難易度**: 低（`extractSignatureFromXml` は実装済み・10〜20行の変更）  
**注意**: MAIMLにまだ `<ds:Signature>` が埋め込まれていない場合のエラーハンドリングが必要

---

### 2-2. `getAuditLog` — インメモリ動作（サーバー再起動で消える）

**エンドポイント**: `GET /api/v1/signature/audit-log`  
**ファイル**: `backend/src/controllers/signatureController.ts` L500〜538  
**状態**: ⚠️ `local-log` モード固定のためインメモリバッファから返している

#### 現在の動作

```
DEFAULT_INTEGRITY_POLICY.auditTarget = 'local-log'（固定値）
→ maimlIntegrityService._getAuditLog() でインメモリ配列を返す
→ サーバー再起動でログが消える
```

DB への insert 側（`recordTimestampRequest` / `recordVerificationResult`）は
`db-log` モード時に `integrityAuditLogRepository.insertXxx()` を呼ぶ実装が完了している。
しかし **取得側（SELECT）の Repository 関数が未実装**。

#### なぜ作れていないか

以下の2つが未実装のまま：

1. **`integrityAuditLogRepository.ts` に `findAllByOrganization()` 関数が存在しない**  
   現在は `insertTimestampRequest` / `insertVerificationResult` の2関数のみ。
   SELECT クエリ関数と対応 SQL ファイルが必要。

2. **`DEFAULT_INTEGRITY_POLICY.auditTarget` が `'local-log'` 固定**  
   `backend/src/types/integrityTypes.ts` に定義されており、これを `'db-log'` に
   変更しないと Controller が DB 取得ルートに入らない。

#### 実装に必要な変更

| ファイル | 変更箇所 | 内容 |
|---------|---------|------|
| `backend/src/sql/queries/integrity_audit_log/findAllByOrganization.sql` | 新規作成 | `organization_id` でフィルタして監査ログを取得する SELECT クエリ |
| `backend/src/repositories/integrityAuditLogRepository.ts` | 末尾に追加 | `findAllByOrganization(pool, organizationId)` 関数を追加 |
| `backend/src/types/integrityTypes.ts` | `DEFAULT_INTEGRITY_POLICY` の `auditTarget` | `'local-log'` → `'db-log'` に変更 |
| `backend/src/controllers/signatureController.ts` | L523〜530（db-log ブロック） | `integrityAuditLogRepository.findAllByOrganization(pool, organizationId)` を呼ぶ |

**難易度**: 中（SQL ファイルと Repository 関数の新規作成が必要）

---

## 3. 優先度まとめ

| 優先度 | 対象 | 変更量 | 理由 |
|--------|------|--------|------|
| 🔴 高 | `verifyMaiml` の自動抽出 | 10〜20行 | `signMaiml` で埋め込み保存したのに検証で手動渡しが必要なのは機能として不完全。`extractSignatureFromXml()` は実装済みで接続するだけ |
| 🟡 中 | `previewEncryption` の afterXml 生成 | 5〜10行 | 必要関数は全部揃っている。プレビューとしての価値が増す |
| 🟡 中 | `getAuditLog` の DB 取得実装 | 中規模（SQL + Repository + Policy 変更） | insert 側は完成しているのに get 側がない状態を解消する |
| 🟢 低 | `decryptElement`（後方互換エンドポイント） | フロント修正のみ | `/decrypt-execute` が完成しているためフロント移行で解決できる |

---

## 4. 不要コードの整理（参考）

以下は現在 `encryptionController.ts` から参照されていない孤立ファイルです。
現時点では動作に影響しませんが、混乱を避けるために削除または明示的に廃止コメントを追加することを推奨します。

| ファイル | 状態 | 備考 |
|---------|------|------|
| `backend/src/services/encryptionKeyService.ts` | 孤立（呼び出し元なし） | `encryptionController.ts` のリファクタリングでimportが削除されたが、ファイル自体は残存 |
| `backend/src/repositories/encryptionKeyRepository.ts` | 孤立（呼び出し元なし） | 同上。`encryptionKeyService.ts` からのみ参照されているが、そのサービス自体が孤立している |
