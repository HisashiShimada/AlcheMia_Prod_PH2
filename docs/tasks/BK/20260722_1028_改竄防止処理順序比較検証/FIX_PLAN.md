# FIX_PLAN.md — 改竄防止処理順序 修正実施計画（最終版）

**作成日時**: 2026-07-22 10:28  
**更新日時**: 2026-07-22 11:27（全実装完了）  
**タスクID**: 20260722_1028_改竄防止処理順序比較検証

---

## 実施スコープ

| 対象 | 内容 |
|------|------|
| Phase1 | FIX-2（nonce/imprint検証）/ FIX-3（C14N正規化）/ FIX-4フェーズ1（外部TSA拒否）/ FIX-5（date要素使用） |
| Phase2 | FIX-1（XAdES構造）/ FIX-4フェーズ2（CMS署名検証）/ FIX-6（CRL/OCSP失効確認ロジック） |
| Phase3（対象外） | 外部TSA実通信 / HSM連携 / DB永続化 |

---

## 確定した決定事項

| 項目 | 決定内容 |
|------|---------|
| A: XAdES移行 | 署名機能は未利用のため、マイグレーション不要。後方互換フォールバックのみ実装 |
| B: CMSライブラリ | pkijs + asn1js は Phase3（外部TSA実通信時）に導入。Phase2では拡張情報確認のみ実装 |
| C: 証明書失効確認 | CRL/OCSP拡張情報を読み取るロジックを実装。拡張情報がない場合（現テスト証明書）は「未確認」として reason に記録し isValid=true |
| D: date要素欠落時 | エラーとする（D-2）|

---

## Phase1 実装結果

### FIX-3: computeCanonicalHashOfFragment 追加
- **ファイル**: `backend/src/services/maimlIntegrityService.ts`
- **内容**: `<SignatureValue>` 要素等のXMLフラグメントをC14N正規化してハッシュ計算する関数を追加
- **状態**: ✅ 完了

### FIX-4フェーズ1: verifyTimestampToken の安全化
- **ファイル**: `backend/src/services/maimlIntegrityService.ts`
- **内容**: `local-mock` トークン以外（外部TSAトークン）は `isValid=false` を返すよう変更。想定外トークンの通過を防止
- **状態**: ✅ 完了

### FIX-3: signMaiml のC14N正規化適用
- **ファイル**: `backend/src/controllers/signatureController.ts`
- **内容**: 署名時のhashedMessage計算を `computeCanonicalHashOfFragment` を使ったC14N正規化に変更
- **状態**: ✅ 完了

### FIX-2: signMaiml に messageImprint/nonce 検証追加
- **ファイル**: `backend/src/controllers/signatureController.ts`
- **内容**: TSAから受信したTSTのmessageImprint/nonceを `verifyMessageImprintAndNonce` で検証。失敗時はエラーをスロー
- **状態**: ✅ 完了

### FIX-3: verifyMaiml の検証時C14N正規化適用
- **ファイル**: `backend/src/controllers/signatureController.ts`
- **内容**: 検証時のhashedMessage再計算も `computeCanonicalHashOfFragment` に統一
- **状態**: ✅ 完了

### FIX-5: MAIML date要素の使用
- **ファイル**: `backend/src/services/maimlIntegrityService.ts`, `backend/src/controllers/signatureController.ts`
- **内容**:
  - `extractMaimlDate()` 関数を追加（MAIML XMLから`<date>`要素を抽出）
  - `verifyMaiml` での `checkTimeConsistency` 呼び出しを MAIML `<date>` 要素の値に変更
  - `<date>` 要素が存在しない場合はエラーをスロー（D-2決定）
- **状態**: ✅ 完了

---

## Phase2 実装結果

### FIX-1: XAdES構造（buildSignatureXml / extractSignatureFromXml）
- **ファイル**: `backend/src/services/maimlIntegrityService.ts`
- **内容**:
  - `buildSignatureXml`: XAdES準拠の `<xades:QualifyingProperties>` / `<xades:EncapsulatedTimeStamp>` 構造でXMLを生成
  - `extractSignatureFromXml`: XAdES構造から優先抽出、旧構造（`<TimestampToken>`）へのフォールバック対応
- **状態**: ✅ 完了（旧構造への後方互換フォールバック含む）

### FIX-4フェーズ2（Phase3へ延期）
- pkijsを用いたCMS署名検証・EKU確認は外部TSA実通信（Phase3）と同時に実装する
- **状態**: ⏸ Phase3延期

### FIX-6: CRL/OCSP失効確認ロジック
- **ファイル**: `backend/src/services/maimlIntegrityService.ts`
- **内容**:
  - `checkCertificateRevocationExtensions()` 関数を追加
  - 証明書の `crlDistributionPoints`（OID: 2.5.29.31）/ `authorityInfoAccess`（OID: 1.3.6.1.5.5.7.1.1）拡張情報を読み取る
  - 拡張情報がない場合（現状のテスト証明書: `generate-ca-certificate.ts` 生成）は「未確認」として `reason` に記録し `isValid=true`
  - 拡張情報がある場合は「未実施」として `reason` に記録（HTTP実通信はPhase3）
  - `validatePemCertificate` から呼び出し
- **状態**: ✅ 完了

---

## ビルド確認

| タイミング | 結果 |
|-----------|------|
| Phase1完了後 | `npx tsc --noEmit` → EXIT:0 ✅ |
| Phase2完了後 | `npx tsc --noEmit` → EXIT:0 ✅ |

---

## Phase3 残タスク（今回対象外）

| 項目 | 内容 |
|------|------|
| FIX-4フェーズ2 | pkijs + asn1js 導入によるCMS署名検証・EKU（id-kp-timeStamping）確認 |
| FIX-6フェーズ2 | CRL/OCSP URLへの実HTTP問い合わせによる失効確認 |
| 外部TSA接続 | `tsaProvider=external-tsa` の実装 |
| HSM連携 | `signatureProvider=hsm` の実装 |
| DB永続化 | `auditTarget=db-log` の本格運用 |
| テスト証明書更新 | `generate-ca-certificate.ts` に `crlDistributionPoints` / `authorityInfoAccess` 拡張を追加 |
