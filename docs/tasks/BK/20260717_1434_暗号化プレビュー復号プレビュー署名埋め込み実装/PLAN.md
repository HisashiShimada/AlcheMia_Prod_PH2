# タスク計画書: 暗号化プレビュー・復号プレビュー・署名埋め込み実装

## メタデータ
- **作成日時**: 2026-07-17 14:34
- **タスクID**: 20260717_1434_暗号化プレビュー復号プレビュー署名埋め込み実装
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

前タスク（20260717_1032, 20260717_1357）で解消できなかった残存スタブ5件を実装する。

1. **previewEncryption** — 対象要素の実XMLを取得してbefore/afterプレビューを生成（暗号化は実行しない）
2. **decryptPreview** — `<EncryptedData>`を実際に復号してbefore/afterプレビューを返す（MAIMLは更新しない）
3. **checkInsertion** — `nodePath`配下のみを対象にInsertionRefsを抽出するよう修正
4. **signMaiml** — 署名・TSA処理後、`<Signature>`要素をMAIMLに埋め込んで保存
5. **verifyMaiml** — MAIMLファイルから`<Signature>`を自動抽出して検証（リクエストボディ省略対応）

## 実装ステップ

### Phase 1: encryptionController.ts（暗号化側スタブ修正）

- [ ] `previewEncryption`: `getElementXmlByTargetPath()` で対象要素の実XMLを取得 → beforeXml / afterXml（EncryptedDataのスケルトン）を返す
- [ ] `decryptPreview`: `extractCipherResultFromXml()` + `maimlEncryptionService.decryptElement()` で実際に復号 → before(EncryptedData) / after(復号XML) を返す（MAIML保存なし）
- [ ] `checkInsertion`: `nodePath` 配下の部分XMLを `getElementXmlByTargetPath()` で取得してから `extractInsertionRefs()` に渡す

### Phase 2: signatureController.ts + maimlIntegrityService.ts（署名埋め込み・抽出）

- [ ] `maimlIntegrityService.embedTimestampToken`: インメモリ保持に加えて `<Signature>` XML を組み立てる関数を追加
- [ ] `buildSignatureXml()` ヘルパーを maimlIntegrityService に追加 — `<Signature>/<SignedInfo>/<SignatureValue>/<SignatureProperty>` を生成
- [ ] `signMaiml` (Controller): 署名処理後、`buildSignatureXml()` でXMLを構築し、MAIMLのルート直下に追記して `saveMaimlContent()` で保存
- [ ] `extractSignatureFromXml()` ヘルパーを maimlIntegrityService に追加 — MAIMLから `<Signature>` 要素を抽出して signatureValue / storedHash / signatureId / timestampToken を返す
- [ ] `verifyMaiml` (Controller): リクエストボディに `signatureId`/`signatureValue`/`storedHash` が揃っていない場合、MAIMLから自動抽出して補完。ボディ明示値は優先

### Phase 3: 型チェック・確認

- [ ] `tsc --noEmit` でコンパイルエラーなしを確認

## 影響範囲

### 変更するファイル
1. `backend/src/controllers/encryptionController.ts` — previewEncryption, decryptPreview, checkInsertion 修正
2. `backend/src/controllers/signatureController.ts` — signMaiml, verifyMaiml 修正
3. `backend/src/services/maimlIntegrityService.ts` — buildSignatureXml, extractSignatureFromXml 追加

### 変更しないファイル
- `backend/src/utils/maimlEncryptionXmlHelper.ts` — 変更不要（既存関数を利用する）
- `backend/src/services/maimlEncryptionService.ts` — 変更不要
- `backend/src/utils/testKeyLoader.ts` — 変更不要
- `backend/src/routes/*.ts` — 変更不要
- フロントエンド全般 — 変更不要

## 承認記録
- **計画書提示日時**: 2026-07-17 14:34
- **承認日時**: （承認待ち）
