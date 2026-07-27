# タスク計画書: FIX-1 XAdES構造バグ修正（UnsignedSignatureProperties）

## メタデータ
- **作成日時**: 2026-07-22 15:30
- **タスクID**: FIX1_XAdES構造バグ修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`buildSignatureXml()` が生成する XAdES-T 形式の `<Signature>` XML において、タイムスタンプ（TST）の格納場所が仕様と異なるバグを修正する。

現在は `<xades:SignatureProperties>` 配下に格納されているが、XAdES-T 仕様（ETSI TS 101 903）では署名後に付与するタイムスタンプは `<xades:UnsignedSignatureProperties>` 配下に格納しなければならない。

## 目的と期待される成果

### 目的
- XAdES-T 仕様への準拠（ETSI TS 101 903）
- `extractSignatureFromXml()` でのTST取得が正しく動作すること

### 期待される成果
- [x] `buildSignatureXml()` が `<xades:UnsignedProperties>` / `<xades:UnsignedSignatureProperties>` 配下に `<xades:SignatureTimeStamp>` を生成する
- [x] `extractSignatureFromXml()` が新しいXAdES構造からTSTを正しく取得できる
- [x] TypeScriptコンパイル成功（EXIT_CODE=0）

## 実装ステップ

### Phase 1: buildSignatureXml() の修正
- [x] `<xades:SignedProperties>` と `<xades:UnsignedProperties>` を分離した正しい構造に変更
- [x] `<xades:SignatureTimeStamp>` を `<xades:UnsignedSignatureProperties>` 配下に移動
- [x] `<xades:EncapsulatedTimeStamp>` の記述位置を修正

### Phase 2: extractSignatureFromXml() の修正
- [x] TSTの抽出XPathを `<xades:UnsignedSignatureProperties>` 配下から取得するよう変更
- [x] フォールバック処理（旧構造・旧フォーマットへの後方互換）を残す

### Phase 3: 動作確認
- [ ] `POST /signature/projects/:name/sign` 実行後、MAIMLに正しい構造の `<Signature>` が埋め込まれることを確認（手動確認待ち）
- [ ] `POST /signature/projects/:name/verify` 実行後、`timestampValid: true` になることを確認（手動確認待ち）

## 変更ファイル

1. `backend/src/services/maimlIntegrityService.ts`
   - `buildSignatureXml()` 関数（862-899行目）— XAdES XML構造の変更
   - `extractSignatureFromXml()` 関数（915-1017行目）— TST抽出のXPath修正

## 修正内容詳細

### 変更前（現在の誤った構造）

```xml
<Signature xmlns="..." Id="{signatureId}">
  <SignedInfo>...</SignedInfo>
  <SignatureValue>...</SignatureValue>
  <Object>
    <xades:QualifyingProperties xmlns:xades="..." Target="#{signatureId}">
      <xades:SignatureProperties>                        ← ❌ 誤り
        <xades:SignatureProperty Id="tst-{signatureId}" Target="#{signatureId}">
          <xades:SignatureTimeStamp>
            <ds:CanonicalizationMethod .../>
            <xades:EncapsulatedTimeStamp>...base64...</xades:EncapsulatedTimeStamp>
          </xades:SignatureTimeStamp>
        </xades:SignatureProperty>
      </xades:SignatureProperties>
    </xades:QualifyingProperties>
  </Object>
</Signature>
```

### 変更後（XAdES-T 仕様準拠の正しい構造）

```xml
<Signature xmlns="..." Id="{signatureId}">
  <SignedInfo>...</SignedInfo>
  <SignatureValue>...</SignatureValue>
  <Object>
    <xades:QualifyingProperties xmlns:xades="..." Target="#{signatureId}">
      <xades:UnsignedProperties>                        ← ✅ 正しい
        <xades:UnsignedSignatureProperties>             ← ✅ 正しい
          <xades:SignatureTimeStamp Id="tst-{signatureId}">
            <ds:CanonicalizationMethod xmlns:ds="..." Algorithm="...exc-c14n#"/>
            <xades:EncapsulatedTimeStamp>...base64...</xades:EncapsulatedTimeStamp>
          </xades:SignatureTimeStamp>
        </xades:UnsignedSignatureProperties>
      </xades:UnsignedProperties>
    </xades:QualifyingProperties>
  </Object>
</Signature>
```

### extractSignatureFromXml() の修正箇所

```typescript
// 変更前: xades:SignatureProperty を参照
const xadesSignatureProps = targetSig.getElementsByTagNameNS(XADES, 'SignatureProperty');

// 変更後: xades:UnsignedSignatureProperties 配下の xades:SignatureTimeStamp を参照
const xadesUnsignedProps = targetSig.getElementsByTagNameNS(XADES, 'UnsignedSignatureProperties');
// → 配下の xades:EncapsulatedTimeStamp を取得
```

フォールバック（旧構造互換）は維持する。

## リスク

| リスク | 対策 |
|--------|------|
| 既存のMAIMLファイルに旧構造の `<Signature>` が埋め込まれている場合、検証できなくなる | `extractSignatureFromXml()` で旧構造（`<xades:SignatureProperties>` 配下）へのフォールバックを維持する |
| 変更後の構造でTST取得が失敗するケース | Phase 3の動作確認で `/sign` → `/verify` 一連フローを実施して確認 |

## テスト計画
- [ ] `buildSignatureXml()` の出力XMLを目視確認（`UnsignedSignatureProperties` 配下にTSTがあること）
- [ ] `POST /sign` → MAIML取得 → XML構造確認
- [ ] `POST /verify` → `timestampValid: true`、`overallValid: true` を確認

## 承認記録
- **計画書提示日時**: 2026-07-22 15:30
- **承認日時**: 2026-07-22 15:35

## 実施記録

### 実施日時
開始: 2026-07-22 15:35
完了: 2026-07-22 15:37

### 変更内容
- `backend/src/services/maimlIntegrityService.ts`
  - `buildSignatureXml()`: `<xades:SignatureProperties>` → `<xades:UnsignedProperties>/<xades:UnsignedSignatureProperties>` 構造に変更（XAdES-T仕様準拠）
  - `extractSignatureFromXml()`: TSTの抽出を新構造（`<xades:UnsignedSignatureProperties>` 配下）に対応。旧構造（`<xades:SignatureProperties>` 配下）と `<TimestampToken>` への2段階フォールバックも維持

### 最終的な成果物
- [x] `buildSignatureXml()` が `<xades:UnsignedProperties>` / `<xades:UnsignedSignatureProperties>` 配下に `<xades:SignatureTimeStamp>` を生成する
- [x] `extractSignatureFromXml()` が新しいXAdES構造からTSTを正しく取得できる
- [x] TypeScriptコンパイル成功（EXIT_CODE=0）
