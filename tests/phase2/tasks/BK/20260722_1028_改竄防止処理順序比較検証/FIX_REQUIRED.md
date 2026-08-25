# 改竄防止フロー：実装修正必要項目一覧

作成日: 2026-07-22  
前提: `test_data/改竄防止-仕様書上の処理順序.txt` を正として、現行実装との乖離を整理

---

## 1. 仕様書ステップ対応表

### 1-1. 署名時（signMaiml）

| ステップ | 仕様書の要求 | 実装関数 | 準拠 |
|---------|-------------|---------|------|
| S-1 | MaiML文書をexcl-C14N正規化しSHA-256でDigestValueを計算 | `computeCanonicalHash()` | ✅ |
| S-2 | 秘密鍵を取得 | `getSigningPrivateKey()` | ✅ |
| S-3 | 秘密鍵でDigestValueを暗号化しSignatureValueを生成 | `signHash()` | ✅ |
| S-4 | **SignatureValueをexcl-C14N正規化**し、そのハッシュをmessageImprintとしてTSQを構築 | `buildTimestampRequest()` | ❌ C14N正規化なし |
| S-5a | TSQをTSAへHTTP POSTし、TSRを受信 | `requestTimestamp()` | ❌ ローカルモック |
| S-5b | **受信したTST内のmessageImprintが送信ハッシュと一致し、nonceが一致することを確認** | （未実装） | ❌ 処理自体が欠落 |
| S-6 | TSRのステータス確認・TSTを取得 | `parseTimestampResponse()` | ✅ |
| S-7 | TSTをEncapsulatedTimeStampとしてBase64エンコードし格納 | `embedTimestampToken()` | ✅ |
| S-8 | XAdES構造の`<Signature>`をMAIMLに追記・保存 | `buildSignatureXml()` / `embedSignatureInXml()` / `saveMaimlContent()` | ⚠️（XAdES構造の誤り、後述） |

### 1-2. 検証時（verifyMaiml）

| ステップ | 仕様書の要求 | 実装関数 | 準拠 |
|---------|-------------|---------|------|
| V-1 | MAIMLからSignature要素（Id属性含む）を取得 | `extractSignatureFromXml()` | ✅ |
| V-2 | QualifyingPropertiesからTSTを取得 | `extractTimestampToken()` | ⚠️（XAdES構造の誤いにより取得パスがずれている可能性） |
| V-3 | TSTの正当性検証（CMS署名・EKU確認・証明書チェーン） | `verifyTimestampToken()` | ❌ 仮実装（検証せず通過） |
| V-4 | TSTInfo.messageImprintが正規化SignatureValueのハッシュと一致確認・nonceの一致確認 | `verifyMessageImprintAndNonce()` | ✅（関数は存在するが、S-5bの署名時検証が欠落しているため整合性に課題） |
| V-5 | SignatureValueを公開鍵で復号し、DigestValueと照合 | `getSigningPublicKey()` / `verifySignature()` | ✅ |
| V-6 | MAIMLを再C14N正規化してSHA-256計算し、DigestValueと比較 | `recomputeAndCompare()` | ✅ |
| V-7 | TSTInfo.genTimeが**MAIML内`<date>`要素の作成日**以降か確認 | `checkTimeConsistency()` | ❌ 比較対象が現在時刻になっている |
| V-8 | 証明書の有効性確認（失効確認含む） | `validateSignerCertificate()` / `validateTsaCertificate()` | ❌ CRL/OCSP未実装・有効期限チェックのみ |
| V-9 | 全検証を総合し、改ざんあり/なし判定 | 総合判定ロジック | ✅ |
| V-10 | 検証結果を監査ログに記録 | `recordVerificationResult()` | ✅ |

---

## 2. 実装修正必要項目一覧

### 🔴 優先度：高（仕様書の必須要件と乖離）

---

#### FIX-1: XAdES構造の誤り（`<UnsignedSignatureProperties>`経由に修正）

**仕様書の要求:**
```xml
<Signature Id="sigId">
  ...
  <Object>
    <QualifyingProperties Target="#sigId">
      <UnsignedProperties>
        <UnsignedSignatureProperties>
          <SignatureTimeStamp Id="tst-...">
            <EncapsulatedTimeStamp>Base64(TST)</EncapsulatedTimeStamp>
          </SignatureTimeStamp>
        </UnsignedSignatureProperties>
      </UnsignedProperties>
    </QualifyingProperties>
  </Object>
</Signature>
```

**現行実装（`buildSignatureXml()`が生成する構造）:**
```xml
<Signature Id="sigId">
  ...
  <Object>
    <xades:QualifyingProperties Target="#sigId">
      <xades:SignatureProperties>              ← 誤り（SignedPropertiesの要素）
        <xades:SignatureProperty Id="tst-...">
          <xades:SignatureTimeStamp>
            <xades:EncapsulatedTimeStamp>...
```

**影響:**
- `SignatureProperties`/`SignatureProperty` はXAdES標準では署名済みプロパティ用の要素であり、タイムスタンプを格納する場所ではない
- 検証時の `extractTimestampToken()` でXPathが誤った場所を参照しているため、TSTの取得に失敗する可能性がある
- RFC 3125 / XAdES-T 仕様への準拠が不完全

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `buildSignatureXml()` 関数
- `backend/src/controllers/signatureController.ts` の `extractTimestampToken()` 関数（XPath修正）

---

#### FIX-2: 署名時のmessageImprint・nonce検証欠落

**仕様書の要求（ステップ5b）:**
> TSR受信後、TSTに含まれる `messageImprint` が送信したSignatureValueハッシュと一致すること、および `nonce` が送信した値と一致することを確認する

**現行実装:**
- `storeSentNonce(signatureId, tsRequest.nonce)` でnonceをインメモリ保存するだけ
- TST受信直後のmessageImprint・nonce照合は行われていない（`verifyMessageImprintAndNonce()`は検証時フローにしか存在しない）

**影響:**
- 不正なTSAから改ざんされたTSTを受け取っても検知できない
- 仕様書の署名フローとして必須の検証が欠落

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `signMaiml()` 内
- `parseTimestampResponse()` 呼び出し後に `verifyMessageImprintAndNonce()` を追加

---

#### FIX-3: SignatureValueのexcl-C14N正規化省略

**仕様書の要求（ステップ4）:**
> SignatureValueをexcl-C14N正規化した上でそのSHA-256ハッシュをmessageImprintとしてTSQを構築する

**現行実装:**
- `buildTimestampRequest()` はSignatureValueのバイト列を直接SHA-256ハッシュ化している
- `<SignatureValue>`要素のexcl-C14N正規化を経由していない

**影響:**
- RFC 3161準拠のTSAと通信する際、messageImprintの内容が仕様に合わず検証が失敗する
- 外部TSAとの互換性が失われる

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `buildTimestampRequest()` 関数
- `backend/src/controllers/signatureController.ts` のSignatureValue取得後のハッシュ計算部分（L206-209付近）

---

#### FIX-4: TSTの正当性検証が未実装（仮実装）

**仕様書の要求（検証ステップ3）:**
> TSTのCMS署名検証、TSA証明書のEKU（id-kp-timeStamping）確認、証明書チェーン検証

**現行実装:**
- `verifyTimestampToken()` が仮実装状態（CMS署名を実際に検証せず通過）

**影響:**
- 攻撃者が偽造したTSTを埋め込んでも検知できない
- 改ざん防止の根幹をなす検証が機能していない

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `verifyTimestampToken()` 関数
- CMS（PKCS#7）解析ライブラリ（`node-forge` / `pkijs` 等）の追加が必要

---

### 🟡 優先度：中（仕様書と乖離があるが本番前に対応推奨）

---

#### FIX-5: genTime比較対象の誤り

**仕様書の要求（検証ステップ7）:**
> TSTInfo.genTimeがMAIML文書内 `<date>` 要素の作成日以降であることを確認

**現行実装:**
- `checkTimeConsistency(tsToken.tstInfo.genTime, new Date().toISOString())` として**現在時刻**と比較している

**影響:**
- 古いMAIMLに対する検証で「genTime > 現在時刻」となり常に不一致になるリスク
- 仕様の意図（署名がMAIML作成後に行われたことの証明）が達成されない

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `verifyMaiml()` 内
- MAIML XML内の `<date>` 要素の値を取得して渡すよう修正

---

#### FIX-6: 証明書失効確認（CRL/OCSP）未実装

**仕様書の要求（検証ステップ8相当）:**
> 証明書の有効性確認（失効確認を含む）

**現行実装:**
- `validateSignerCertificate()` / `validateTsaCertificate()` は有効期限チェックのみ
- CRL（証明書失効リスト）またはOCSPによる失効確認が未実装

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `validateSignerCertificate()` / `validateTsaCertificate()`

---

#### FIX-7: 外部TSAへの実HTTP通信未実装

**仕様書の要求（署名ステップ5a）:**
> TSQをTSAへHTTP POSTし、TSRを受信

**現行実装:**
- `requestTimestamp()` はローカルモック（`tsaProvider: 'local-mock'`）のみ対応
- 実際のTSA（Symantec / DigiCert / セイコーソリューションズ等）への通信が実装されていない

**修正箇所:**
- `backend/src/services/maimlIntegrityService.ts` の `requestTimestamp()` 関数
- `DEFAULT_INTEGRITY_POLICY` の `tsaEndpoint` / `tsaProvider` の設定
- RFC 3161準拠のHTTP POST通信の実装

---

## 3. 変更不要と判断した項目

| 項目 | 理由 |
|------|------|
| MAIMLへの`<Signature>`追記・保存処理（`buildSignatureXml` / `embedSignatureInXml` / `saveMaimlContent`） | 仕様書に明示はないが、仕様の意図（XAdES-T形式での保存）と矛盾しない。メモに記載がなくても実装として正しい |
| `storeSentNonce()`によるnonceのインメモリ保存 | FIX-2の対応（署名時の照合追加）と組み合わせれば問題なし。仮実装中はインメモリで許容 |
| `recordTimestampRequest()` / `recordVerificationResult()` による監査ログ記録 | 仕様書の要求以上の実装（監査強化）であり変更不要 |
| 実装での `recomputeAndCompare` の実行順序（仕様書ステップ6の前に実行） | 処理の意味が変わるわけではなく、仕様書の「確認項目」として準拠している。順序の違いは設計判断 |
| `extractSignatureFromXml` が署名全体を取得（メモは`ExtractTimestampToken`のみ） | 仕様書の検証フローに必要な情報をすべて取得しており問題なし |

---

## 4. 対応優先度サマリ

```
🔴 FIX-1: XAdES構造の誤り（UnsignedSignatureProperties）
🔴 FIX-2: 署名時のmessageImprint/nonce検証欠落
🔴 FIX-3: SignatureValueのexcl-C14N正規化省略
🔴 FIX-4: TSTの正当性検証が未実装
🟡 FIX-5: genTime比較対象の誤り（作成日→現在時刻）
🟡 FIX-6: 証明書失効確認（CRL/OCSP）未実装
🟡 FIX-7: 外部TSAへの実HTTP通信未実装
```

> FIX-1・FIX-2・FIX-3・FIX-4はセキュリティ・仕様準拠の観点から**本番リリース前に必須対応**が推奨されます。  
> FIX-7は運用環境のTSA契約・インフラ整備と合わせて対応が必要です。
