# タスク計画書: 秘匿化・改竄防止 Service層実装

## メタデータ
- **作成日時**: 2026-07-16 15:03
- **タスクID**: maiml-crypto-service-layer
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

`test_data/用意する機能.txt` にまとめられた「秘匿化機能」「改竄防止機能」のメソッド一覧を、バックエンドの Service 層に仮実装として用意する。

- **秘匿化機能**: 鍵生成・取得・廃棄、暗号化・復号、Insertion 連携（9 メソッド）
- **改竄防止機能**: ハッシュ生成、署名鍵取得、署名生成・検証、タイムスタンプ取得・検証、証明書管理、記録・監査（16 メソッド）

仮実装は「仮実装時の挙動」列の記述を優先し、`EncryptionPolicy` / `IntegrityPolicy` による将来のプロバイダ差し替えを見越した設計とする。

## 目的と期待される成果
- [ ] `backend/src/services/maimlEncryptionService.ts` が作成され、9 メソッドが呼び出せる
- [ ] `backend/src/services/maimlIntegrityService.ts` が作成され、16 メソッドが呼び出せる
- [ ] 秘匿化フローが一連で繋がって動作する（generateKey → encryptElement → retrieveKeyForDecryption → decryptElement → disposeKey）
- [ ] 改竄防止フローが一連で繋がって動作する（computeCanonicalHash → signHash → verifySignature → requestTimestamp → embedTimestampToken → extractTimestampToken → verifyTimestampToken）
- [ ] `EncryptionPolicy` / `IntegrityPolicy` の型定義が追加され、将来の本実装差し替え箇所が明確になっている
- [ ] TypeScript 型チェックが通る

## 実装ステップ

### Phase 1 (今回実施)
- [ ] タスク専用フォルダ・PLAN.md 作成
- [ ] 型定義ファイル追記/作成（`encryptionTypes.ts`, `integrityTypes.ts`）
- [ ] `maimlEncryptionService.ts` 実装（9 メソッド）
- [ ] `maimlIntegrityService.ts` 実装（16 メソッド）
- [ ] 型チェック確認 (`tsc --noEmit`)

## 変更ファイル

### 追記
1. `backend/src/types/encryptionTypes.ts` — `EncryptionPolicy`, `DEFAULT_ENCRYPTION_POLICY`, `CipherResult`, `InsertionRefs` を追加

### 新規作成
1. `backend/src/services/maimlEncryptionService.ts` — 秘匿化機能 Service
2. `backend/src/services/maimlIntegrityService.ts` — 改竄防止機能 Service
3. `backend/src/types/integrityTypes.ts` — 改竄防止機能の型定義

## 設計詳細

### EncryptionPolicy
```typescript
export interface EncryptionPolicy {
  keyProvider: 'local-dummy' | 'aws-kms' | 'ecdh';
  algorithm: 'aes-256-cbc' | 'aes-256-gcm';
  keyInfoSchema: 'w3c-xmlenc-core1';
  auditTarget: 'local-log' | 'cloudtrail';
}
```
- `local-dummy` のみ仮実装。他は `throw new Error('未実装: ...')` として将来の実装差し替え箇所を明示。

### IntegrityPolicy
```typescript
export interface IntegrityPolicy {
  signatureProvider: 'local-dummy' | 'hsm';
  tsaProvider: 'local-mock' | 'external-tsa';
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  auditTarget: 'local-log' | 'cloudtrail';
}
```

### 簡易鍵ストア（maimlEncryptionService 内）
- モジュール内 `Map<string, Buffer>` で鍵を保持（プロセス再起動でリセット）
- `generateKey` で発行した `keyId` で `retrieveKeyForDecryption` が取得できる

### タイムスタンプトークンストア（maimlIntegrityService 内）
- モジュール内 `Map<string, TimestampToken>` でトークンを保持
- `embedTimestampToken` で格納、`extractTimestampToken` で取得できる

## Phase 2: 本実装レベルへの作り込み（今回実施）

### 方針
「鍵の格納・取得方式」「外部TSA連携」は方式未確定のためダミーを維持する。
それ以外のメソッドは、鍵・TSAトークンが正しい形で渡される前提で本実装レベルまで作り込む。

### ダミーとして維持するメソッド（変更しない）
- `maimlEncryptionService.ts`: `generateKey` / `retrieveKeyForDecryption` / `disposeKey`
- `maimlIntegrityService.ts`: `getSigningPrivateKey` / `getSigningPublicKey` / `requestTimestamp` / `parseTimestampResponse`

### 本実装まで作り込むメソッド

#### maimlEncryptionService.ts
- [ ] `validateEncryptionScope` — UPA制約の実チェック（`@xmldom/xmldom`でXPath該当要素を検証）
- [ ] `extractInsertionRefs` — DOMParserで`<insertion>`要素を正確に解析（正規表現から置き換え）
- [ ] `writeChildRefs` — DOM操作で`<EncryptedData>`直前に実際に挿入する関数へ変更

#### maimlIntegrityService.ts
- [ ] `computeCanonicalHash` — C14N正規化を実装してからハッシュ計算
- [ ] `validateSignerCertificate` — `node-forge`で証明書の有効期限・発行者チェーンを実検証
- [ ] `validateTsaCertificate` — 同上（TSA証明書用）
- [ ] `embedTimestampToken` / `extractTimestampToken` — インメモリMapからXML DOM操作（`<SignatureProperty Target="#{signatureId}">`）へ変更
- [ ] `verifyTimestampToken` — ハッシュ比較・証明書検証を組み合わせた実ロジックに変更
- [ ] `recordTimestampRequest` / `recordVerificationResult` — DB永続化（`integrity_audit_log`テーブル、Repository層経由）

### 実装順序（進捗）
1. [x] C14N正規化（`computeCanonicalHash`）
2. [ ] UPA制約チェック（`validateEncryptionScope`）※次フェーズ
3. [ ] XML DOM操作への置き換え（`extractInsertionRefs` / `writeChildRefs` / `embedTimestampToken` / `extractTimestampToken`）※次フェーズ
4. [x] 証明書検証の実装（`validateSignerCertificate` / `validateTsaCertificate`）
5. [ ] タイムスタンプ検証ロジック（`verifyTimestampToken`）※次フェーズ
6. [x] 監査ログのDB永続化（`recordTimestampRequest` / `recordVerificationResult`）
7. [x] 型チェック確認（`tsc --noEmit` → エラーなし）

### 新規作成ファイル（Phase 2）
- `backend/migrations/20260716_create_integrity_audit_log_table.sql` — 監査ログテーブル（仮DDL、調整予定）
- `backend/src/repositories/integrityAuditLogRepository.ts` — 監査ログRepository

### 変更ファイル（Phase 2）
- `backend/src/services/maimlEncryptionService.ts`
- `backend/src/services/maimlIntegrityService.ts`
- `backend/src/types/integrityTypes.ts`（DB操作用型追記）

### リスク（Phase 2）
| リスク | 影響度 | 対策 |
|--------|--------|------|
| C14N正規化を自前実装する場合、仕様の網羅性に限界がある | 中 | 属性順序・空白改行の主要ケースをカバーする範囲で実装し、TODOコメントで限界を明記 |
| `integrity_audit_log`テーブルは仮設計のため後日調整が入る | 中 | Repository層をシンプルに保ち、テーブル変更時の影響を局所化する |
| 既存のインメモリMap依存コード（テスト等）に影響 | 低 | `_clearStores`等のテストヘルパーは維持しつつ、DOM操作用の新シグネチャに揃える |

### 承認記録（Phase 2）
- **承認日時**: 2026-07-16 15:27
- **承認者コメント**: Phase 2 実施確認済み

---

## 今後のステップ（Phase 3 / Phase 4）

### Phase 2: Controller / Routes 接続
- `backend/src/controllers/signatureController.ts`（新規）を作成し、`maimlIntegrityService` と接続
- `backend/src/routes/signatureRoutes.ts`（新規）を作成し `server.ts` に登録
- 既存 `encryptionController.ts` のスタブ実装を `maimlEncryptionService` 呼び出しに差し替え

### Phase 3: フロントエンド接続
- `frontend/src/services/signatureService.ts` のスタブを実際の `axios` 呼び出しに置き換え
- `encryptionService.ts` 側は API が繋がれば自動接続（既に実装済み）

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 鍵管理方式未確定（`aws-kms`/`ecdh`） | 中 | Policy 分岐を用意し、`local-dummy` のみ動作させる |
| TSA（タイムスタンプ局）未確定 | 中 | `local-mock` でローカル時刻モックトークンを返す実装にする |
| 将来の型変更でController側の修正が必要になる | 低 | 型定義を `integrityTypes.ts` に集約しておく |

## 承認記録
- **承認日時**: 2026-07-16 15:03
- **承認者コメント**: Phase 1（Service層のみ）で実施確認済み

---

## 実施記録

### Phase 1 実施結果（2026-07-16）

| 成果物 | 状態 |
|---|---|
| `backend/src/types/encryptionTypes.ts` | ✅ 完了 |
| `backend/src/types/integrityTypes.ts` | ✅ 完了 |
| `backend/src/services/maimlEncryptionService.ts` | ✅ 完了（9メソッド仮実装） |
| `backend/src/services/maimlIntegrityService.ts` | ✅ 完了（16メソッド仮実装） |
| `tsc --noEmit` エラーなし | ✅ 確認済み |

### Phase 2 実施結果（2026-07-16）

| # | 項目 | 状態 | 備考 |
|---|---|---|---|
| ① | `computeCanonicalHash` C14N正規化 | ✅ 完了 | `@xmldom/xmldom` で属性アルファベット順ソート＋正規エスケープ。XPath部分正規化・Exclusive C14N は次フェーズ |
| ② | `validateEncryptionScope` UPA制約 | ⏭ 次フェーズ | 仕様確定待ち |
| ③ | DOM操作化（`extractInsertionRefs` 等） | ⏭ 次フェーズ | XML書き込み仕様確定待ち |
| ④ | `validateSignerCertificate` / `validateTsaCertificate` | ✅ 完了 | `node-forge` でPEM証明書の有効期限・発行者を実検証。CRL/OCSP は次フェーズ |
| ⑤ | `verifyTimestampToken` | ⏭ 次フェーズ | 外部TSA仕様確定待ち |
| ⑥ | 監査ログDB永続化（`recordTimestampRequest` / `recordVerificationResult`） | ✅ 完了 | `db-log` モードで `integrity_audit_log` テーブルへ永続化 |
| — | `integrityAuditLogRepository.ts` + SQLファイル | ✅ 完了 | `insertTimestampRequest.sql` / `insertVerificationResult.sql` 作成 |
| — | `backend/migrations/20260716_create_integrity_audit_log_table.sql` | ✅ 完了 | 仮DDL（カラム構成は後日調整予定） |
| — | `integrityTypes.ts` に `'db-log'` 追加 | ✅ 完了 | `auditTarget` ユニオン型を拡張 |
| — | `tsc --noEmit` エラーなし | ✅ 確認済み | |

### 次フェーズへの申し送り事項

各項目の詳細な確認事項は **[QUESTIONS.md](./QUESTIONS.md)** を参照。

| # | 対象 | ブロック要因 |
|---|---|---|
| Q1 | `validateEncryptionScope`（UPA制約） | 暗号化許可XPathパターン仕様の確定 |
| Q2 | `embedTimestampToken` / `extractTimestampToken` DOM化 | MAIML XSDへのSignatureProperty格納位置の確定 |
| Q3 | `verifyTimestampToken` | 外部TSAサービスの選定・契約 |
| Q4 | CRL / OCSP による証明書失効確認 | 証明書運用方式（自己CA継続 or 外部CA移行）の確定 |
| Q5 | `integrity_audit_log` テーブル本番設計 | 保持期間・検索軸・完全性保証要否の確定 |
