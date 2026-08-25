# 改竄防止フロー：仕様書 / メモ / 実装 比較レポート

作成日: 2026-07-22  
調査対象コミット: `97770410d29f779769472848cbe3096c000f06c4`

---

## 1. 比較対象資料

| 資料 | ファイルパス |
|------|-------------|
| 仕様書上の処理順序 | `test_data/改竄防止-仕様書上の処理順序.txt` |
| メソッドの呼び出し順序メモ | `test_data/改竄防止-メソッドの呼び出し順序.txt` |
| コントローラー実装 | `backend/src/controllers/signatureController.ts` |
| サービス実装 | `backend/src/services/maimlIntegrityService.ts` |

---

## 2. 署名時（sign）フロー比較

### 2-1. 対応表

| # | 仕様書 | メモ記載のメソッド | 実装コード（signMaiml内の呼び出し順） | 判定 |
|---|--------|-------------------|--------------------------------------|------|
| 1 | MaiML文書をC14N正規化しSHA-256でハッシュ値を計算 | `ComputeCanonicalHash(xmlDoc)` | `computeCanonicalHash(xmlContent, policy)` | ✅ 一致 |
| 2 | 秘密鍵で原本ハッシュ値を暗号化しSignatureValueを生成 | `GetSigningPrivateKey()` | `getSigningPrivateKey(policy)` | ✅ 一致 |
| 3 | （秘密鍵取得の後、SignHashへ続く） | `SignHash(privateKey, hash, signatureId)` | `signHash(privateKey, hashResult.digestValue, signatureId)` | ✅ 一致 |
| 4 | SignatureValueをC14N正規化しMessageImprintを含むTSQを組み立て | `BuildTimestampRequest(signatureValueHash, hashAlgorithm)` | `buildTimestampRequest(signatureValueHash, policy.hashAlgorithm)` ※C14N省略あり | ⚠️ 仮実装 |
| 5 | TSQをTSAへHTTP POST送信しTSRを受信 | `RequestTimestamp(tsq, tsaEndpoint)` | `requestTimestamp(tsRequest, tsaEndpoint, policy)` | ✅ 一致（本実装はモック） |
| 5a | （送信したnonceを保存） | ー（記載なし） | `storeSentNonce(signatureId, tsRequest.nonce)` | ❌ メモに記載なし |
| 6 | TSRのステータス確認・TSTを取得 | `ParseTimestampResponse(tsr)` | `parseTimestampResponse(tsResp)` | ✅ 一致 |
| 7 | TSTをEncapsulatedTimeStampとしてBase64エンコードして格納 | `VerifyTimestampToken(tst)` | `embedTimestampToken(signatureId, parsedToken)` | ❌ メモのメソッドが誤り（VerifyTimestampTokenは検証時の処理） |
| 8 | ー（仕様書に該当なし） | `VerifyMessageImprintAndNonce(tst, expectedHash, sentNonce)` | ー（署名時には存在しない） | ❌ 誤って署名フローに含めている（検証時の処理） |
| 9 | ー | `EmbedTimestampToken(signatureId, token)` | `recordTimestampRequest(...)` | ❌ メソッド名が実装と不一致（実装でのEmbedTimestampTokenは手順6相当） |
| 10 | ー | `RecordTimestampRequest(...)` | `buildSignatureXml(...)` + `embedSignatureInXml(...)` + `saveMaimlContent(...)` | ❌ メモに記載なし |

### 2-2. 署名時メモの問題まとめ

1. **`VerifyTimestampToken` が誤って含まれている（手順7）**  
   → これは検証（verify）フローのメソッド。署名時には呼ばれない。

2. **`VerifyMessageImprintAndNonce` が誤って含まれている（手順8）**  
   → 同様に検証フローのみ。署名時には呼ばれない。

3. **`storeSentNonce` が記載されていない**  
   → TSAリクエスト後にnonceをインメモリ保存する処理が抜けている。

4. **`buildSignatureXml` / `embedSignatureInXml` / ファイル保存 が記載されていない**  
   → XAdES構造の `<Signature>` XML組み立て・MAIMLへの埋め込み・ストレージ保存という重要な最終処理が抜けている。

5. **`EmbedTimestampToken` の位置が実装と異なる**  
   → 実装では `parseTimestampResponse` の直後（手順7相当）に `embedTimestampToken` が呼ばれる。
   → メモではこれを手順9に記載しており、間に `VerifyTimestampToken` / `VerifyMessageImprintAndNonce` が挟まれているが、これらは検証フローの処理であるため位置が誤り。

---

## 3. 検証時（verify）フロー比較

### 3-1. 対応表

| # | 仕様書 | メモ記載のメソッド | 実装コード（verifyMaiml内の呼び出し順） | 判定 |
|---|--------|-------------------|----------------------------------------|------|
| 前処理 | ー | `ExtractTimestampToken(maimlFile, signatureId)` | `extractSignatureFromXml(xmlContent, signatureId)` ※署名情報全体を抽出 | ⚠️ 部分的に対応（メモのメソッド名と実装が異なる。TSTだけでなく署名全体を取得） |
| 1 | Signature の Id 属性値を取得 | ー（記載なし） | `extractSignatureFromXml` 内で処理 | ✅ 実装は対応（メモに明示なし） |
| 2 | QualifyingPropertiesからTSTを抽出 | ー（記載なし） | `extractTimestampToken(xmlContent, signatureId)` | ✅ 実装は対応（メモの前処理に包含） |
| 3 | TSTの正当性検証（CMS署名・EKU確認・証明書チェーン） | `ValidateSignerCertificate(cert)` `ValidateTsaCertificate(cert)` | `validateSignerCertificate(...)` `validateTsaCertificate(...)` | ❌ 実装での実行順序が異なる（後述）。仕様書は手順3だが実装では最後。また仮実装（常にisValid:true相当） |
| 4 | TSTInfo.messageImprintが正規化SignatureValueのハッシュと一致確認 | ー（記載なし） | `verifyMessageImprintAndNonce(tsToken, signatureValueHashForVerify, sentNonce)` | ❌ メモに完全欠落（仕様書・実装両方に存在するが、メモから漏れている） |
| 5 | SignatureValueを公開鍵で検証 | `GetSigningPublicKey()` `VerifySignature(publicKey, hash, signatureValue)` | `getSigningPublicKey(policy)` `verifySignature(publicKey, storedHash, signatureValue)` | ✅ 一致（ただし実装での実行順序は後述） |
| 6 | 文書全体のハッシュを再計算しDigestValueと比較 | `RecomputeAndCompare(xmlDoc, storedHash)` | `recomputeAndCompare(xmlContent, storedHash, policy)` | ✅ 一致（ただし実装での実行順序は後述） |
| 7 | TSTInfo.genTimeが作成日以降か確認 | `CheckTimeConsistency(tstInfoGenTime, creationDate)` | `checkTimeConsistency(tsToken.tstInfo.genTime, new Date().toISOString())` | ⚠️ 一致（ただし仕様書は `<date>要素の作成日` と比較を要求、実装は現在時刻と比較） |
| 8 | 全て一致で改ざんなし | ー | 総合判定（`overallValid`）ロジック | ✅ 一致 |
| 9 | 不一致で改ざんの疑い | ー | 同上 | ✅ 一致 |
| 10 | ー | `RecordVerificationResult(result)` | `recordVerificationResult(verificationRecord, policy, pool, ...)` | ✅ 一致 |

### 3-2. 実装コードの実際の呼び出し順序

実際の `verifyMaiml()` 内での呼び出し順序（コードの行順）：

```
1. extractSignatureFromXml(xmlContent, signatureId)  ← 署名情報全体取得
2. recomputeAndCompare(xmlContent, storedHash, policy)  ← ハッシュ再計算・比較
3. getSigningPublicKey(policy)
4. verifySignature(publicKey, storedHash, signatureValue)
5. extractTimestampToken(xmlContent, signatureId)
6. verifyTimestampToken(tsToken)
7. checkTimeConsistency(tsToken.tstInfo.genTime, new Date().toISOString())
8. getSentNonce(signatureId) + verifyMessageImprintAndNonce(...)  ← nonceとhash照合
9. validateSignerCertificate(signerCert)  ← 証明書検証（最後）
10. validateTsaCertificate(tsaCert)
11. 総合判定
12. recordVerificationResult(...)
```

### 3-3. 検証時メモの問題まとめ

1. **証明書検証（ValidateSignerCertificate / ValidateTsaCertificate）の位置が逆**  
   → メモでは手順2（TSTの直後）に実施しているが、実装では最後（手順9〜10）。
   → 仕様書では手順3（比較的早い段階）。

2. **`verifyMessageImprintAndNonce` がメモに完全欠落**  
   → 仕様書の手順4・実装の手順8に相当する検証がメモに記載されていない。
   → この検証はリプレイ攻撃対策として重要（TST内のhashedMessage・nonceの照合）。

3. **`recomputeAndCompare`（DigestValueとの比較）の位置が実装と異なる**  
   → メモでは手順5だが、実装では最初（手順2）に実行している。

4. **`ExtractTimestampToken` の粒度が実装と異なる**  
   → 実装では `extractSignatureFromXml` で署名情報全体を一括取得し、その後 `extractTimestampToken` でTSTを取得している（2段階）。
   → メモは1メソッドで完結するように記載されている。

---

## 4. 発見された不一致・問題点一覧

| No | 区分 | 内容 | 該当箇所 | 重要度 |
|----|------|------|----------|--------|
| M1 | メモ誤り（署名時） | `VerifyTimestampToken` が署名フローに含まれている（検証時の処理） | signMaiml() / メモ手順7 | 中 |
| M2 | メモ誤り（署名時） | `VerifyMessageImprintAndNonce` が署名フローに含まれている（検証時の処理） | signMaiml() / メモ手順8 | 中 |
| M3 | メモ欠落（署名時） | `storeSentNonce` が記載されていない | signMaiml() 手順5a | 低 |
| M4 | メモ欠落（署名時） | `buildSignatureXml` / `embedSignatureInXml` / ファイル保存 が記載されていない | signMaiml() 手順9 | 高 |
| M5 | メモ欠落（検証時） | `verifyMessageImprintAndNonce`（messageImprint・nonce照合）が記載されていない | verifyMaiml() 手順8 | 高 |
| M6 | メモ誤り（検証時） | 証明書検証の実行順序が実装と逆（メモ:手順2、実装:手順9〜10） | verifyMaiml() | 低 |
| M7 | メモ誤り（検証時） | `recomputeAndCompare` の位置が異なる（メモ:手順5、実装:手順2） | verifyMaiml() | 低 |
| M8 | メモ誤り（検証時） | `ExtractTimestampToken` 1メソッドで記載しているが実装は2段階（extractSignatureFromXml + extractTimestampToken） | verifyMaiml() | 低 |
| I1 | 実装ギャップ（仮実装） | `<SignatureValue>` のC14N正規化省略（直接SHA-256でハッシュ） | signatureController.ts L206-209 | 高（仕様不一致） |
| I2 | 実装ギャップ（仮実装） | TSTの正当性検証（CMS署名・EKU確認・証明書チェーン）が未実装 | `verifyTimestampToken()` | 高（セキュリティ） |
| I3 | 実装ギャップ（仮実装） | TSAへの実際のHTTP POST通信が未実装（local-mockのみ） | `requestTimestamp()` | 高（本番運用不可） |
| I4 | 実装ギャップ（仮実装） | 証明書失効確認（CRL/OCSP）が未実装（有効期限チェックのみ） | `validateSignerCertificate()` / `validateTsaCertificate()` | 高（セキュリティ） |
| I5 | 実装ギャップ（仕様との差異） | `checkTimeConsistency` の比較対象が現在時刻（仕様書は `<date>` 要素の作成日） | `verifyMaiml()` L368-371 | 中 |
| I6 | 実装ギャップ（仮実装） | nonce・署名鍵・TSTがインメモリ保存のためサーバー再起動で消失 | sentNonceStore / signingKeyStore / timestampTokenStore | 高（永続性なし） |

---

## 5. 修正提案（対応候補）

### 5-1. メモの修正（test_data/改竄防止-メソッドの呼び出し順序.txt）

メモは仕様理解の確認・共有用資料であるため、実装コードに合わせて以下を修正することを推奨します。

**署名時フローの正しい順序**:
```
ComputeCanonicalHash(xmlDoc)
↓
GetSigningPrivateKey()
↓
SignHash(privateKey, hash, signatureId)
↓
BuildTimestampRequest(signatureValueHash, hashAlgorithm)   ※ SignatureValueのC14N正規化は本実装で対応
↓
RequestTimestamp(tsq, tsaEndpoint)
↓
StoreSentNonce(signatureId, nonce)                         ← 追加
↓
ParseTimestampResponse(tsr)
↓
EmbedTimestampToken(signatureId, token)
↓
RecordTimestampRequest(...)
↓
BuildSignatureXml(signatureId, digestValue, ...)            ← 追加
↓
EmbedSignatureInXml(xmlContent, signatureXml, signatureId)  ← 追加
↓
SaveMaimlContent(organizationId, projectName, updatedXml)   ← 追加
```

**検証時フローの正しい順序**:
```
ExtractSignatureFromXml(maimlFile, signatureId)   ← 署名情報全体取得（TSTも含む）
↓
RecomputeAndCompare(xmlDoc, storedHash)           ← 順序修正（現メモでは5番目）
↓
GetSigningPublicKey()
↓
VerifySignature(publicKey, hash, signatureValue)
↓
ExtractTimestampToken(maimlFile, signatureId)
↓
VerifyTimestampToken(tst)
↓
CheckTimeConsistency(tstInfoGenTime, creationDate)
↓
VerifyMessageImprintAndNonce(tst, expectedHash, sentNonce)  ← 追加（現メモに欠落）
↓
ValidateSignerCertificate(cert)                   ← 順序修正（現メモでは2番目）
↓
ValidateTsaCertificate(cert)
↓
RecordVerificationResult(result)
```

### 5-2. 実装の修正（優先度別）

| 優先度 | No | 対応内容 | 影響範囲 |
|--------|----|---------|---------| 
| 🔴 高（本番運用前必須） | I3 | 外部TSAへのHTTP POST実装（RFC 3161準拠） | `requestTimestamp()` / `DEFAULT_INTEGRITY_POLICY` の `tsaProvider` 変更 |
| 🔴 高（セキュリティ） | I2 | TSTのCMS署名検証・EKU確認実装 | `verifyTimestampToken()` |
| 🔴 高（セキュリティ） | I4 | 証明書失効確認（CRL/OCSP）実装 | `validateSignerCertificate()` / `validateTsaCertificate()` |
| 🔴 高（セキュリティ） | I6 | nonce・署名鍵のDB永続化 | `sentNonceStore` / `signingKeyStore` のDB化、HSM移行 |
| 🟡 中（仕様準拠） | I1 | `<SignatureValue>` 要素のexc-C14N正規化後にハッシュを計算 | `signatureController.ts` L206-209 |
| 🟡 中（仕様準拠） | I5 | `checkTimeConsistency` の比較対象をMAIML内 `<date>` 要素の作成日に変更 | `verifyMaiml()` 内の `checkTimeConsistency` 呼び出し |

---

## 6. 備考

- I1〜I6の実装ギャップは `docs/tasks/20260722_0900_秘匿化改竄防止フロー整理/FLOW.md` の「現状の仮実装ポイント」表にも既に記録されている既知事項です。
- M1〜M8のメモの不一致は今回の調査で新たに発見した事項です。
- 実装修正を行う場合は、別途タスクを起票し計画書を作成したうえで着手してください。
