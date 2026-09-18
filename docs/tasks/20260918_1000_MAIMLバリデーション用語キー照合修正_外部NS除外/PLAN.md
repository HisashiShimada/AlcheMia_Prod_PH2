# タスク計画書: MAIMLバリデーション用語キー照合修正（外部NS除外）

## メタデータ
- **作成日時**: 2026-09-18
- **タスクID**: 20260918_1000_MAIMLバリデーション用語キー照合修正_外部NS除外
- **優先度**: 高
- **推定工数**: 1〜2時間
- **前提タスク**: 20260908_1000_MAIMLバリデーション用語キー照合機能実装

---

## タスク概要

`maimlParser.ts` の `validatePropertyTermKeys`（Phase 7）における `prefix:localName` 形式のキーチェックを、**MAIMLファイル内の `xmlns` 宣言をもとに外部名前空間かどうかを判定**し、以下の新しい振り分けロジックに変更する。

---

## 背景・課題

### 現状の Phase 7 判定フロー（修正前）

```
key が prefix:localName 形式か？
  → NO  (プレーンキー):  スキップ（前回修正で対応済み）
  → YES (prefix あり):
       グローバルCSV に prefix 登録あり？
         → YES: スキップ
         → NO:  DB（namespace_term）に qname 登録あり？
                  → YES: スキップ
                  → NO:  エラー
```

### 問題点

`prefix` が **外部ネームスペース**（Alchemia が払い出したものでない、第三者の URI を持つ）を参照している場合も、グローバルCSVに未登録 かつ DBに未登録 ならエラーになってしまう。

例：ユーザーが独自の `xmlns:ext="http://example.com/ext"` を宣言し、`ext:Temp` というキーを使った場合 → 外部URIなのにエラーになる。

### 解決方針

MAIMLファイルのルート要素（`<maiml>`）に含まれる `xmlns:xxx` 宣言を参照し、当該 `prefix` のURIが **Alchemia が払い出した URI** かどうかを判定する。

- **Alchemia URI の定義**: `Alchemia.co.jp` をドメインに含む URI（例: `https://ORG001.Alchemia.co.jp`、`https://ORG001.Alchemia.co.jp/RD`）
  - 定数: `backend/src/utils/namespaceUriGenerator.ts` の `DOMAIN_SUFFIX = 'Alchemia.co.jp'`
  - システム定義: `backend/src/constants/systemNamespace.ts` の `SYSTEM_NAMESPACE_URI = 'https://Alchemia.co.jp'`

---

## 新しい判定フロー

```
key が prefix:localName 形式か？
  → NO  (プレーンキー): スキップ（変更なし）
  → YES (prefix あり):
       [Step 1] グローバルCSV に prefix 登録あり？
         → YES: スキップ（グローバル宣言済みprefixのため）

       [Step 2] MAIMLのxmlns宣言を参照してprefixのURIを取得
         → URIが取得できない（xmlnsに宣言なし）？
              → DB確認なしで即エラー
         → URIが取得できた かつ Alchemia URI ではない（外部URI）？
              → スキップ（外部名前空間のため照合不要）
         → URIが取得できた かつ Alchemia URI（Alchemia.co.jp を含む）？
              → DB（namespace_term）に qname 登録あり？
                   → YES: スキップ
                   → NO:  エラー
```

### フロー図（まとめ）

| prefix の状況 | URI種別 | 結果 |
|---|---|---|
| グローバルCSVに登録済み | — | ✅ スキップ |
| xmlns宣言なし（prefixが不明） | 不明 | ❌ 即エラー（DB照合なし） |
| xmlns宣言あり / 外部URI | 非Alchemia | ✅ スキップ |
| xmlns宣言あり / Alchemia URI | Alchemia系 | DB照合 → 未登録ならエラー |

---

## 実装詳細

### 変更ファイル

| # | ファイル | 変更種別 |
|---|---|---|
| 1 | `backend/src/utils/maimlParser.ts` | 修正（`validatePropertyTermKeys` の引数追加・判定ロジック変更） |

### 変更内容

#### (1) `extractXmlnsDeclarations` ヘルパー関数を追加

fast-xml-parser の `parserOptions` は `attributeNamePrefix: '@_'` / `ignoreAttributes: false` のため、
`<maiml ... xmlns:Alchemia="https://Alchemia.co.jp" xmlns:ext="http://example.com/ext">` は
パース後のオブジェクトで `parsedXML.maiml['@_xmlns:Alchemia']`、`parsedXML.maiml['@_xmlns:ext']` としてアクセスできる。

```typescript
/**
 * パース済みXMLオブジェクトから xmlns 宣言を prefix → URI のマップとして抽出する
 * fast-xml-parser は @_xmlns:prefix 形式で属性値を保持する
 */
function extractXmlnsDeclarations(parsedXML: any): Map<string, string> {
  const result = new Map<string, string>();
  const maiml = parsedXML?.maiml;
  if (!maiml || typeof maiml !== 'object') return result;

  for (const attr of Object.keys(maiml)) {
    // @_xmlns:prefix 形式の属性を抽出
    if (attr.startsWith('@_xmlns:')) {
      const prefix = attr.slice('@_xmlns:'.length);
      const uri = String(maiml[attr]);
      if (prefix && uri) {
        result.set(prefix, uri);
      }
    }
  }
  return result;
}
```

#### (2) `isAlchemiaUri` ヘルパー関数を追加

```typescript
/**
 * 指定した URI が Alchemia が払い出した URI かどうかを判定する
 * 判定基準: URI に 'Alchemia.co.jp' が含まれる
 */
function isAlchemiaUri(uri: string): boolean {
  return uri.includes('Alchemia.co.jp');
}
```

#### (3) `validatePropertyTermKeys` の引数に `parsedXML` を渡し、内部で xmlns マップを生成して判定に使用

現在の `validatePropertyTermKeys` シグネチャ：
```typescript
function validatePropertyTermKeys(
  parsedXML: any,
  registeredQNames: Set<string>,
  globalPrefixes: Set<string>,
  mode: ValidationMode
): { errors: ErrorContent[]; warnings: ErrorContent[] }
```
※ 既に `parsedXML` は渡されているため引数変更は不要。

#### (4) `validatePropertyTermKeys` 内の else ブロック（prefix:localName の処理）変更

**変更前（現状）：**
```typescript
if (colonIdx !== -1) {
  const prefix = key.substring(0, colonIdx);
  // ステップ1: グローバルCSVに登録されている prefix か
  if (globalPrefixes.has(prefix)) {
    continue;
  }
  // ステップ2: namespace_term（DB）に登録されているか
  if (registeredQNames.has(key)) {
    continue;
  }
}
// → 未登録キーとしてエラー
```

**変更後：**
```typescript
if (colonIdx !== -1) {
  const prefix = key.substring(0, colonIdx);

  // Step 1: グローバルCSVに登録されている prefix か
  if (globalPrefixes.has(prefix)) {
    continue;
  }

  // Step 2: MAIMLのxmlns宣言でこのprefixのURIを確認
  const prefixUri = xmlnsMap.get(prefix);

  if (prefixUri === undefined) {
    // xmlns宣言なし → DB確認なしで即エラー
    // （MAIMLとして宣言されていないprefixを使うこと自体が不正）
  } else if (!isAlchemiaUri(prefixUri)) {
    // 外部名前空間（Alchemia以外）のprefixはスキップ
    continue;
  } else {
    // AlchemiaのURI → DBで照合
    if (registeredQNames.has(key)) {
      continue;
    }
  }
}
// → 未登録キーとしてエラー
```

---

## テスト計画

### 新しいテストケース（`validatePropertyTermKeys` の単体テスト観点）

| ケース | xmlns宣言 | URI種別 | グローバルCSV | DB登録 | 期待結果 |
|---|---|---|---|---|---|
| A | `xmlns:ext="http://example.com/ext"` あり | 外部URI | なし | なし | ✅ スキップ（外部NS） |
| B | `xmlns:myco="https://myco.Alchemia.co.jp"` あり | Alchemia URI | なし | 登録あり | ✅ スキップ |
| C | `xmlns:myco="https://myco.Alchemia.co.jp"` あり | Alchemia URI | なし | 未登録 | ❌ エラー |
| D | xmlns宣言なし | 不明 | なし | — | ❌ 即エラー（DB照合なし）← 変更点 |
| E | xmlns宣言なし | 不明 | あり | — | ✅ スキップ（変更なし） |
| F | プレーンキー | — | — | — | ✅ スキップ（変更なし） |

> **変更前との差分（ケースD）**: 変更前は xmlns宣言なしでも DB に登録があればスキップしていたが、変更後は DB 確認なしで即エラーとする。

### TypeScript ビルド確認
- `npx tsc --noEmit` → exit:0

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| fast-xml-parserの`@_xmlns:prefix`形式が実際に正しく取得できない | 高 | 低 | `01_valid.maiml` にxmlns宣言を追加してテスト確認 |
| `Alchemia.co.jp` 含有チェックで正規表現ミス | 中 | 低 | シンプルな `includes` を使用し、テストで確認 |
| xmlns宣言のないMAIMLでの既存動作が変わる | 低 | 低 | 既存のStep 2→Step 3フォールバックに変更なし |

---

## 承認記録

- **計画書提示日時**: 2026-09-18
- **承認日時**: 2026-09-18
- **承認者コメント**: xmlns宣言に記載のないprefixはDB確認なしで即エラーとする方針で承認
