# タスク計画書: TSA仕様変更対応

## メタデータ
- **作成日時**: 2026-07-22 08:26
- **タスクID**: 20260722_0826_TSA仕様変更対応
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

`test_data/用意する機能.txt` の仕様変更（変更あり8メソッド＋新設1メソッド）に基づき、  
`maimlIntegrityService.ts` / `integrityTypes.ts` / `signatureController.ts` を修正する。

主な変更点：
1. `BuildTimestampRequest` のシグネチャ変更（引数: signatureValueHash + hashAlgorithm）
2. `RequestTimestamp` のシグネチャ変更（tsaEndpoint引数追加、戻り値をTimeStampResp型に）
3. `ParseTimestampResponse` の引数型変更（TimeStampResp受取り、granted判定追加）
4. `EmbedTimestampToken`/`buildSignatureXml` のXAdES準拠構造への全面変更
5. `ExtractTimestampToken`/`extractSignatureFromXml` のXAdES構造対応
6. `VerifyMessageImprintAndNonce` の新設
7. 名前空間をprefixなし（デフォルト名前空間）に変更
8. `<Reference>`に`<Transforms><Transform enveloped-signature/></Transforms>`追加
9. JSDoc更新（EKU要件、ESSCertIDv2要件の精査ポイント追記）

## 目的と期待される成果

- [ ] 仕様書（用意する機能.txt）通りのメソッドシグネチャに揃える
- [ ] Signatureタグイメージ（Signatureタグイメージ.txt）通りのXML構造を生成・抽出できる
- [ ] 新設メソッド `VerifyMessageImprintAndNonce` がスタブとして型通りの戻り値を返す
- [ ] TypeScriptコンパイルエラーなし（`tsc --noEmit` 通過）

## 実装ステップ

### Phase 1: `backend/src/types/integrityTypes.ts`

- [ ] `MessageImprintVerifyResult` 型を新規追加
- [ ] `RecordTimestampRequest`の引数型（`messageImprint, nonce, tsaEndpoint, timestamp`）をコメントに反映（JSDoc更新）
- [ ] `validateTsaCertificate` のJSDocにEKU要件（id-kp-timeStampingのみ + critical）・ESSCertIDv2要件を精査ポイントとして追記
- [ ] `verifyTimestampToken` のJSDocにEKU確認の精査ポイントを追記

### Phase 2: `backend/src/services/maimlIntegrityService.ts`

- [ ] **`buildTimestampRequest`** シグネチャ変更
  - 引数: `(signatureValueHash: string, hashAlgorithm: IntegrityPolicy['hashAlgorithm'])` に変更
  - ハッシュ計算は呼び出し元が行うため削除（受け取った`signatureValueHash`をそのまま使用）
  - `certReq: true` に変更
  - hashedMessageの長さバリデーション追加（sha256:32bytes, sha384:48bytes, sha512:64bytes）
- [ ] **`requestTimestamp`** シグネチャ・戻り値変更
  - 引数に `tsaEndpoint: string` を追加
  - 戻り値を `TimeStampResp` 型に変更
  - 仮実装時は `tsaEndpoint` をログ出力に使用するのみ
- [ ] **`parseTimestampResponse`**
  - 引数を `TimeStampResp` に変更
  - `status.status` が `granted(0)` / `grantedWithMods(1)` 以外の場合に `Error` をthrow
  - `timeStampToken` が存在しない場合に `Error` をthrow
  - 戻り値は `Rfc3161TimestampToken` のまま
- [ ] **`verifyTimestampToken`** JSDoc更新（EKU要件の精査ポイントをTODOとして追記）
- [ ] **`buildSignatureXml`** XML構造を全面変更（XAdES準拠）
  - `<Signature xmlns="...">` にprefixなしデフォルト名前空間
  - `<CanonicalizationMethod Algorithm="...#WithComments"/>` に変更
  - `<Reference>`に `<Transforms><Transform Algorithm="enveloped-signature"/></Transforms>` 追加
  - `<SignatureProperties>/<SignatureProperty>` を廃止
  - `<Object><xades:QualifyingProperties Target="#{signatureId}">...<xades:EncapsulatedTimeStamp>` 構造を追加
  - `<xades:SignatureTimeStamp>`内に `<ds:CanonicalizationMethod Algorithm="...xml-exc-c14n#">` を追加
- [ ] **`extractSignatureFromXml`** XAdES構造への対応
  - `<xades:EncapsulatedTimeStamp>` からTimestampTokenを抽出するロジックに変更
  - 旧 `<ds:SignatureProperty>`/`<TimestampToken>` 抽出ロジックは削除
  - 名前空間prefix変更（`ds:` → prefixなし）に対応したgetElementsByTagNameNS呼び出しの見直し
- [ ] **`validateTsaCertificate`** JSDoc更新（EKU要件・ESSCertIDv2要件を精査ポイントとして追記）
- [ ] **`verifyMessageImprintAndNonce`** 新規追加
  - シグネチャ: `(tst: Rfc3161TimestampToken, expectedHash: string, sentNonce: string): MessageImprintVerifyResult`
  - 仮実装（スタブ）として想定型で返す（hashedMessage一致確認・hashAlgorithm OID一致確認・nonce一致確認のロジックを実装、仮実装でも動作するよう記述）
- [ ] **nonceインメモリストア追加** — `signatureId → nonce` のMapを追加（verifyMaimlでsentNonceを取得するため）

### Phase 3: `backend/src/controllers/signatureController.ts`

- [ ] **`signMaiml`** 呼び出し修正
  - `<SignatureValue>`をexc-c14n正規化してSHA-256ハッシュを計算し、`buildTimestampRequest(hash, 'sha256')` に渡す
  - `requestTimestamp(tsq, 'local-mock-tsa', policy)` → `requestTimestamp(tsq, 'http://localhost/tsa-mock', policy)` に変更（tsaEndpoint引数追加）
  - 戻り値を `TimeStampResp` で受け取り、`parseTimestampResponse(tsResp)` を呼び出す流れに変更
  - 送信したnonceをインメモリストアに保存
- [ ] **`verifyMaiml`** 修正
  - `verifyMessageImprintAndNonce(tsToken, storedHash, sentNonce)` を呼び出し追加
  - `overallValid` の判定に組み込む
  - レスポンスに `messageImprintValid` 等の結果を追加

### Phase 4: コンパイル確認

- [ ] `tsc --noEmit` でコンパイルエラーなしを確認

## 変更ファイル

1. `backend/src/types/integrityTypes.ts` — 型追加・JSDoc更新
2. `backend/src/services/maimlIntegrityService.ts` — シグネチャ変更・XAdES対応・新規関数追加
3. `backend/src/controllers/signatureController.ts` — 呼び出し変更・新規呼び出し追加

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `buildSignatureXml`のXML構造変更により既存テストが壊れる | 中 | tsc --noEmit後に確認し、テストが存在する場合は合わせて修正 |
| `extractSignatureFromXml`のXAdES対応で既存MAIML（旧`<TimestampToken>`構造）が抽出できなくなる | 中 | 旧構造へのフォールバックを残すか、インメモリストアフォールバックで対応 |
| nonceのインメモリ保存は再起動で消えるため、sign→verifyがサーバー再起動をまたぐと失敗する | 低 | 仮実装段階の制約として許容（TODO明記） |

## テスト計画

- [ ] `tsc --noEmit` でコンパイルエラーなし

## 承認記録
- **計画書提示日時**: 2026-07-22 08:26
- **承認日時**: 2026-07-22 08:26（ユーザーがAct Modeへ切り替えにより承認）
