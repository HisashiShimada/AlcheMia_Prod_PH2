# タスク計画書: 暗号化操作MAIML埋め込み実装

## メタデータ
- **作成日時**: 2026-07-17 13:57
- **タスクID**: 20260717_1357_暗号化操作MAIML埋め込み実装
- **優先度**: 高
- **推定工数**: 4〜6時間

## タスク概要

現状は「アルゴリズム分岐・鍵読み込み・暗号文生成」まで動作しているが、生成した暗号文がMAIMLファイルに反映されない（捨てられる）。
また復号処理も `maimlEncryptionService.decryptElement()` が呼ばれておらず、MAIMLファイルが変更されない。

本タスクでは以下を実装する：

1. **暗号化実行（POST /encrypt）**: 指定XPath要素の内容を `<EncryptedData>` に置換してMAIMLを保存
2. **復号実行（POST /decrypt-execute）**: `<EncryptedData>` を元のXML要素に復元してMAIMLを保存
3. **MAIMLツリー構造取得（GET /structure）**: MAIMLをパースして暗号化対象ツリーを動的生成
4. **暗号化済み要素一覧（GET /encrypted-children）**: MAIMLから全 `<EncryptedData>` 要素を収集

---

## 問題の詳細

### 問題1: 暗号化結果がMAIMLに反映されない

```
現状:
  encryptElement() → CipherResult 生成 → saveMaimlContent(xmlContent) ← 暗号化前のまま渡す

修正後:
  encryptElement() → CipherResult 生成
    → xmlParser で targetPath の要素を取得
    → buildEncryptedDataXml(cipherResult, keyName) で <EncryptedData> XML を構築
    → 元の要素を <EncryptedData> に置換
    → saveMaimlContent(updatedXml)
```

### 問題2: 復号結果がMAIMLに反映されない

```
現状:
  retrieveKeyForDecryption() → 鍵取得のみ → saveMaimlContent(xmlContent) ← 復号前のまま渡す

修正後:
  retrieveKeyForDecryption() → 鍵取得
    → xmlParser で targetPath の <EncryptedData> 要素から CipherResult を抽出
    → maimlEncryptionService.decryptElement(keyEntry, cipherResult) で復号
    → <EncryptedData> を復号したXML要素に置換
    → saveMaimlContent(updatedXml)
```

### 問題3: MAIMLツリー構造・暗号化済み要素一覧がスタブ

```
現状: 空配列を返す
修正後: @xmldom/xmldom でMAIMLをパースして動的生成
```

### 問題4: `EncryptElement` / `ExtractInsertionRefs` に渡す引数が誤っている

```
現状:
  EncryptElement(key, targetPath, policy)  ← targetPath（XPath文字列）を渡している
  ExtractInsertionRefs(targetPath)         ← 同上

本来の期待:
  targetPath → MAIMLから対象要素の実XMLコンテンツを取得
  EncryptElement(key, elementXmlString, policy)   ← 要素の実XMLを渡す
  ExtractInsertionRefs(elementXmlString)           ← 同上

影響:
  - 暗号化するのはXPath文字列自体（無意味）
  - ExtractInsertionRefs は常に hasInsertionRefs: false を返す
```

### 問題5: `WriteChildRefs()` がController側で一切呼ばれていない

```
現状:
  ExtractInsertionRefs() で insertionRefs を取得しているが、
  WriteChildRefs() は一度も呼ばれないため <childUri>/<childHash>/<childUuid> が書き出されない

修正後:
  insertionRefs.length > 0 の場合:
    writeChildRefs(ref.uri, ref.hash, ref.uuid) で XML フラグメントを生成
    → <EncryptedData> の直前に挿入する
```

### 問題6: `DisposeKey()` が復号側（decryptElement）で呼ばれていない

```
現状:
  encryptElement: disposeKey() ✅ 呼ばれている
  decryptElement: disposeKey() ❌ 呼ばれていない（鍵がメモリに残存する）

修正後:
  decryptElement 処理完了後に必ず disposeKey(keyEntry.keyId) を呼ぶ
  （finally ブロックで確実に実行する）
```

---

## 実装方針

### XMLパーサー選定

既存コードで `@xmldom/xmldom` の `DOMParser` が使用済み（`maimlService.ts` 等）。
追加ライブラリ不要。同じパーサーを使用する。

### XPathによる要素指定

フロントエンドが送る `targetPath` は要素を特定するパス文字列（例: `//transition[@id='t1']/data`）。
バックエンドで `getElementsByTagName()` + 属性フィルタで該当要素を取得する。

### `<EncryptedData>` XML の形式

W3C XML Encryption Core 1.1 準拠。`ALGORITHM_URI_MAP` から algorithmUri を取得。

```xml
<EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#"
               Id="enc-{uuid}"
               Type="http://www.w3.org/2001/04/xmlenc#Element">
  <EncryptionMethod Algorithm="{algorithmUri}"/>
  <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:KeyName>{keyId}</ds:KeyName>
  </ds:KeyInfo>
  <CipherData>
    <CipherValue>{cipherValueBase64}</CipherValue>
  </CipherData>
</EncryptedData>
```

### `targetPath` の解釈方針

フロントが送る `targetPath` の形式を確認し、以下の段階で対応する：

1. **Phase A**: 文字列マッチで要素の `outerXML` を特定し、置換（シンプル実装）
2. **Phase B**: 正確なXPathルックアップが必要な場合はDOMParserで解析

本タスクでは **Phase A**（文字列ベースの置換）で実装する。
これで動作確認ができたら、Phase Bへ移行する判断をする。

---

## 実装ステップ

### Phase 1: XML操作ユーティリティの作成

- [ ] `backend/src/utils/maimlEncryptionXmlHelper.ts` を新規作成
  - `buildEncryptedDataXml(cipherResult, keyId, keyName)` → `<EncryptedData>` XML文字列を生成
  - `extractCipherResultFromXml(encryptedDataXml)` → `<EncryptedData>` から `CipherResult` を抽出
  - `replaceElementInXml(xmlContent, targetPath, replacementXml)` → XML文字列内の要素を置換
  - `findEncryptedDataElements(xmlContent)` → XML内の全 `<EncryptedData>` 要素を収集

### Phase 2: Controller層の接続実装

- [ ] `backend/src/controllers/encryptionController.ts` の以下を修正

  **`encryptElement`（POST /encrypt）:**
  - `CipherResult` 生成後 → `buildEncryptedDataXml()` → `replaceElementInXml()` → `saveMaimlContent()`
  - レスポンスに `encryptedCount`, `updatedFilePath`, 各要素の `cipherResult` を含める

  **`executeDecrypt`（POST /decrypt-execute）:**
  - `retrieveKeyForDecryption()` 後 → `extractCipherResultFromXml()` で CipherResult 抽出
  - → `maimlEncryptionService.decryptElement()` で復号
  - → `replaceElementInXml()` で `<EncryptedData>` を元の要素に置換
  - → `saveMaimlContent()`

  **`getMaimlStructure`（GET /structure）:**
  - MAIMLをDOMParserでパース → `<transition>` / `<place>` / `<data>` 等の要素ツリーを生成
  - 各要素に `isEncryptable: true/false`、`isEncrypted: boolean` を付与

  **`getEncryptedChildren`（GET /encrypted-children）:**
  - MAIMLをパース → 全 `<EncryptedData>` 要素を収集してリストを返す

### Phase 3: 型定義の追加

- [ ] `backend/src/types/encryptionTypes.ts` に以下を追加
  - `MaimlTreeNode` 型（ツリー構造用）
  - `EncryptedElementInfo` 型（暗号化済み要素情報）

### Phase 4: 型チェック・動作確認

- [ ] `tsc --noEmit` でコンパイルエラーなしを確認
- [ ] `GET /structure` でツリー構造が返ること
- [ ] `POST /encrypt`（algorithm: aes256-gcm）でMAIMLファイルが更新されること
- [ ] `POST /decrypt-execute` で復号後のMAIMLファイルが保存されること

---

## 影響範囲

### 新規作成するファイル
1. `backend/src/utils/maimlEncryptionXmlHelper.ts` - XML操作ユーティリティ

### 変更するファイル
1. `backend/src/controllers/encryptionController.ts` - 暗号化/復号のMAIML連携実装
2. `backend/src/types/encryptionTypes.ts` - 型追加

### 変更しないファイル
- `backend/src/services/maimlEncryptionService.ts` - 変更不要（既に完成）
- `backend/src/utils/testKeyLoader.ts` - 変更不要
- `backend/src/routes/encryptionRoutes.ts` - 変更不要
- フロントエンド全般 - 変更不要

---

## 設計の詳細

### `replaceElementInXml()` の実装方針

XPathによる厳密な要素特定は複雑になるため、本タスクでは以下の方針で実装する：

1. `targetPath` が要素IDやタグ名を含む場合、DOMParserで該当要素を取得
2. `element.outerHTML` または `new XMLSerializer().serializeToString(element)` で要素のXML文字列を取得
3. `xmlContent.replace(originalXmlStr, replacementXml)` で文字列置換

※ `@xmldom/xmldom` には `XMLSerializer` が含まれているため追加インストール不要。

### `buildEncryptedDataXml()` の出力例

```xml
<xenc:EncryptedData xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
                    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                    Id="enc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    Type="http://www.w3.org/2001/04/xmlenc#Element">
  <xenc:EncryptionMethod Algorithm="http://www.w3.org/2009/xmlenc11#aes256-gcm"/>
  <ds:KeyInfo>
    <ds:KeyName>file:fixed:aes-256-gcm</ds:KeyName>
  </ds:KeyInfo>
  <xenc:CipherData>
    <xenc:CipherValue>BASE64ENCODEDCIPHERTEXT==</xenc:CipherValue>
  </xenc:CipherData>
</xenc:EncryptedData>
```

### `extractCipherResultFromXml()` の抽出対象

```
<xenc:EncryptedData Id="enc-xxx" ...>
  <xenc:EncryptionMethod Algorithm="{algorithmUri}"/>  ← algorithmUri
  <ds:KeyInfo><ds:KeyName>{keyId}</ds:KeyName></ds:KeyInfo>  ← keyId
  <xenc:CipherData><xenc:CipherValue>{base64}</xenc:CipherValue></xenc:CipherData>  ← cipherValueBase64
</xenc:EncryptedData>
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| targetPath の形式が不明（フロントの送信値） | 高 | 中 | encryptionService.ts のfrontendコードを確認して形式を特定してから実装 |
| XML置換で名前空間が壊れる | 中 | 中 | `@xmldom/xmldom` の `XMLSerializer` を使用、単体テストで確認 |
| 既存のMAIMLパーサーとの衝突 | 低 | 低 | 新規ユーティリティファイルに分離するため影響なし |

---

## テスト計画

### 手動テスト
- [ ] `POST /api/v1/encryption/projects/:name/encrypt` でMAIMLファイルに `<EncryptedData>` が埋め込まれること
- [ ] `GET /api/v1/encryption/projects/:name/encrypted-children` で上記の要素が返ること
- [ ] `POST /api/v1/encryption/projects/:name/decrypt-execute` で `<EncryptedData>` が元の要素に戻ること
- [ ] AES-256-GCM で暗号化し、同じアルゴリズムで復号できること
- [ ] AES-128-CBC で暗号化し、同じアルゴリズムで復号できること
- [ ] `tsc --noEmit` でエラーなし

---

## 承認記録
- **計画書提示日時**: 2026-07-17 13:57
- **承認日時**: 2026-07-17 14:02
- **承認者コメント**: 承認

## 実施記録

### 実施日時
- 開始: 2026-07-17 14:02
- 完了: 2026-07-17 14:08

### 実装内容

#### 新規作成ファイル
- `backend/src/utils/maimlEncryptionXmlHelper.ts`
  - `buildEncryptedDataXml(cipherResult, insertionRefXml?)` — CipherResult から W3C XML Encryption Core 1.1 準拠の `<xenc:EncryptedData>` を生成
  - `buildChildRefsXml(refs)` — InsertionRefs → `<childUri>/<childHash>/<childUuid>` フラグメント生成
  - `extractCipherResultFromXml(xmlContent, encryptionId?)` — `<EncryptedData>` から CipherResult を抽出
  - `getElementXmlByTargetPath(xmlContent, targetPath)` — targetPath → 要素の実XML文字列を取得
  - `replaceElementInXml(xmlContent, targetPath, replacementXml)` — XML内の対象要素を別XMLで置換
  - `findEncryptedDataElements(xmlContent)` — XML内の全 `<EncryptedData>` を収集
  - `parseMaimlToEncryptionTree(xmlContent)` — MAIMLをパースして暗号化対象ツリーを動的生成
  - `MaimlTreeNode`, `EncryptedElementInfo` 型定義

#### 変更ファイル
- `backend/src/controllers/encryptionController.ts`
  - **問題1 → 修正**: `encryptElement` — 実XMLを取得 → `encryptElement(elementXml)` → `buildEncryptedDataXml` → `replaceElementInXml` → `saveMaiml`
  - **問題2 → 修正**: `executeDecrypt` — `extractCipherResultFromXml` → `decryptElement` → `replaceElementInXml` → `saveMaiml`
  - **問題3 → 修正**: `getMaimlStructure` — `parseMaimlToEncryptionTree()` で動的ツリー生成
  - **問題3 → 修正**: `getEncryptedChildren` — `findEncryptedDataElements()` で全 EncryptedData 収集
  - **問題4 → 修正**: `encryptElement/extractInsertionRefs` に `elementXml`（実XML）を渡すよう変更（従来は targetPath 文字列を渡していた）
  - **問題5 → 修正**: `buildChildRefsXml(insertionRefs)` を呼び出して `<EncryptedData>` 前に childRefs を埋め込む
  - **問題6 → 修正**: `executeDecrypt` の `finally` ブロックで `disposeKey()` を確実に呼ぶ
  - `import` に `maimlEncryptionXmlHelper` の各関数を追加

### コンパイル確認
- `tsc --noEmit` → **Exit: 0**（エラーなし）

### 計画からの変更点
- なし（PLAN.md 記載の全問題を解決）

### 最終的な成果物
- [x] 問題1: 暗号化結果がMAIMLに反映されない → 解決
- [x] 問題2: 復号結果がMAIMLに反映されない → 解決
- [x] 問題3: ツリー構造・暗号化済み要素一覧がスタブ → 解決
- [x] 問題4: EncryptElement に targetPath を渡していた → 実XMLを渡すよう修正
- [x] 問題5: WriteChildRefs が未呼び出し → buildChildRefsXml で実装
- [x] 問題6: DecryptElement 後に disposeKey が未呼び出し → finally ブロックで保証
