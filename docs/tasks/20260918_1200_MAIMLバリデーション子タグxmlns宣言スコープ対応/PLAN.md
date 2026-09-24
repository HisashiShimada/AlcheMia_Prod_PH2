# タスク計画書: MAIMLバリデーション子タグxmlns宣言スコープ対応

## メタデータ

- **作成日時**: 2026-09-18
- **タスクID**: 20260918_1200_MAIMLバリデーション子タグxmlns宣言スコープ対応
- **優先度**: 高
- **推定工数**: 2〜3時間
- **前提タスク**: 20260918_1000_MAIMLバリデーション用語キー照合修正_外部NS除外

---

## タスク概要

前タスク（20260918_1000）では `<maiml>` ルート要素の `xmlns` 宣言のみを参照して Prefix の外部NS判定を行うように修正した。  
しかし `scripts/result/Raman.maiml` を確認すると、`xmlns` 宣言は **`<maiml>` ルートタグだけでなく任意の子タグにも記述可能**であることが判明した。

```xml
<!-- ルートタグの宣言 → ファイル全体に適用 -->
<maiml xmlns:concept="http://www.xes-standard.org/..." ...>

<!-- 子タグの宣言 → そのタグの内部スコープにのみ適用 -->
<result xmlns:tiff="https://www.iso.org/standard/29377.html" ...>
  <property key="tiff:ImageWidth" .../>
</result>

<result xmlns:BMFH="https://learn.microsoft.com/..." xmlns:BMIH="https://learn.microsoft.com/..." ...>
  <property key="BMFH:bfType" .../>
  <property key="BMIH:biSize" .../>
</result>
```

現在の `extractXmlnsDeclarations` は `parsedXML.maiml` の属性しか見ていないため、子タグで宣言された `xmlns:tiff`・`xmlns:BMFH`・`xmlns:BMIH` 等を拾えず、それらの prefix を持つキーが **「xmlns宣言なし → 即エラー」** に誤判定されてしまう。

---

## 背景・課題

### XMLのxmlns宣言スコープ仕様

XML名前空間仕様（XML Namespaces 1.0）では：
- `xmlns:prefix="URI"` 宣言は **そのタグおよびすべての子孫タグ** に適用される
- `<maiml>` ルートでの宣言はファイル全体に適用される
- `<result>` などの途中のタグでの宣言はそのタグの内部ツリーにのみ適用される
- 同名 prefix の再宣言（URI の上書き）も可能

### 現在の実装の問題

```typescript
// 現状: maiml ルートの属性だけ見ている
function extractXmlnsDeclarations(parsedXML: any): Map<string, string> {
  const maiml = parsedXML?.maiml;
  // maiml タグの @_xmlns:xxx しか拾わない ← 問題
}
const xmlnsMap = extractXmlnsDeclarations(parsedXML);
// → 子タグで宣言された tiff: BMFH: BMIH: が xmlnsMap に入らない
// → これらのキーが「xmlns宣言なし → 即エラー」に誤判定される
```

### Raman.maiml で影響を受けるケース

| 子タグ | 宣言 | 使用キー |
|---|---|---|
| `<result id="OpticalImaging">` | `xmlns:tiff="https://www.iso.org/..."` | `tiff:ImageWidth`, `tiff:Compression` 等 |
| `<result id="RamanImaging">` | `xmlns:BMFH="https://..."`, `xmlns:BMIH="https://..."` | `BMFH:bfType`, `BMIH:biSize` 等 |

---

## 解決方針

### 採用方針：スコープを引き継ぐ再帰収集

`collectPropertyAndUncertaintyKeys` を拡張し、**各 property/uncertainty キーを収集する際に「そのスコープで有効な xmlns マップ」を同時に記録**する。

- 再帰走査時に「親から引き継いだ xmlns マップ」を持ち歩く
- 各ノードに `@_xmlns:*` 属性があれば、引き継ぎマップを **コピーして上書き**（元のマップは変更しない＝イミュータブル）
- `property`/`uncertainty` のキーを収集するとき、そのノードのスコープ xmlns マップを一緒に格納する

---

## 実装詳細

### 変更ファイル

| # | ファイル | 変更種別 |
|---|---|---|
| 1 | `backend/src/utils/maimlParser.ts` | 修正（`collectPropertyAndUncertaintyKeys` 拡張・`validatePropertyTermKeys` 対応） |
| 2 | `backend/tests/utils/maiml_validation/13_child_xmlns.maiml` | 新規作成（子タグxmlns宣言テストデータ） |
| 3 | `backend/tests/utils/maimlParser.validation.test.ts` | 修正（ケース13追加） |

---

### (1) `collectPropertyAndUncertaintyKeys` をスコープ付きに拡張

**現状のシグネチャ:**
```typescript
function collectPropertyAndUncertaintyKeys(obj: any, keys: Set<string>): void
```

**変更後のシグネチャ:**
```typescript
function collectPropertyAndUncertaintyKeys(
  obj: any,
  entries: Array<{ key: string; xmlnsMap: Map<string, string> }>,
  inheritedXmlns: Map<string, string>
): void
```

**変更後の処理骨格:**
```typescript
function collectPropertyAndUncertaintyKeys(obj, entries, inheritedXmlns) {
  if (typeof obj !== 'object' || obj === null) return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectPropertyAndUncertaintyKeys(item, entries, inheritedXmlns);
    return;
  }

  // このノードで宣言された xmlns を親スコープに追加（コピーして上書き・イミュータブル）
  let currentXmlns = inheritedXmlns;
  for (const attr of Object.keys(obj)) {
    if (attr.startsWith('@_xmlns:')) {
      if (currentXmlns === inheritedXmlns) currentXmlns = new Map(inheritedXmlns); // 初回だけコピー
      const prefix = attr.slice('@_xmlns:'.length);
      const uri = String(obj[attr]);
      if (prefix && uri) currentXmlns.set(prefix, uri);
    }
  }

  for (const tagName of Object.keys(obj)) {
    if (tagName === 'property' || tagName === 'uncertainty') {
      const elements = Array.isArray(obj[tagName]) ? obj[tagName] : [obj[tagName]];
      for (const el of elements) {
        if (el && typeof el === 'object' && el['@_key']) {
          entries.push({ key: String(el['@_key']), xmlnsMap: currentXmlns });
        }
        collectPropertyAndUncertaintyKeys(el, entries, currentXmlns); // ネスト再帰
      }
    } else if (!tagName.startsWith('@_')) {
      collectPropertyAndUncertaintyKeys(obj[tagName], entries, currentXmlns);
    }
  }
}
```

---

### (2) `validatePropertyTermKeys` の内部ロジックを entries 形式に対応

**変更前（抜粋）:**
```typescript
const xmlnsMap = extractXmlnsDeclarations(parsedXML);  // ルートのみ
const collectedKeys = new Set<string>();
collectPropertyAndUncertaintyKeys(parsedXML, collectedKeys);

for (const key of collectedKeys) {
  ...
  const prefixUri = xmlnsMap.get(prefix); // ルートのみのマップ参照
}
```

**変更後（抜粋）:**
```typescript
const rootXmlnsMap = extractXmlnsDeclarations(parsedXML); // ルートを初期スコープとして使用
const keyEntries: Array<{ key: string; xmlnsMap: Map<string, string> }> = [];
collectPropertyAndUncertaintyKeys(parsedXML, keyEntries, rootXmlnsMap);

const reportedErrorKeys = new Set<string>(); // 重複エラー防止
for (const { key, xmlnsMap } of keyEntries) {
  if (reportedErrorKeys.has(key)) continue; // 同一keyのエラーは1件まで
  ...
  const prefixUri = xmlnsMap.get(prefix); // そのスコープのマップを参照 ← 変更点
  ...
  // エラー確定時
  reportedErrorKeys.add(key);
  errors.push(errorEntry);
}
```

> `extractXmlnsDeclarations` 関数は初期スコープ生成のために引き続き利用する（削除しない）。  
> ログ出力の `collectedKeys.size` → `keyEntries.length` に変更する。

---

### (3) 重複エラー防止の仕組み

以前の `Set<string>` による重複キー排除がなくなるため（同一キーが複数スコープで登場し得る）、  
`reportedErrorKeys` という Set を用意して **同一キーのエラーは1件のみ** 報告する。  
（同一キーが外部NS スコープでも Alchemia NS スコープでもヒットする極端なケースは実用上ないが念のため対応。）

---

## 新しい判定フロー（完全版）

```
key が prefix:localName 形式か？
  → NO (プレーンキー): スキップ（変更なし）
  → YES (prefix あり):

     [Step 1] グローバルCSV に prefix 登録あり？
       → YES: スキップ

     [Step 2] そのキーのスコープ xmlns マップで prefix の URI を確認
              ※ スコープ = maiml ルートの xmlns ＋ 祖先タグの xmlns を引き継いだマップ
       → URI 取得不可（宣言なし）: 即エラー（DB照合なし）
       → 外部URI（非Alchemia）: スキップ
       → Alchemia URI（Alchemia.co.jp 含む）:
           DB（namespace_term）に qname 登録あり？
             → YES: スキップ
             → NO:  エラー
```

---

## テスト計画

### テストデータ: `13_child_xmlns.maiml`

子タグでの `xmlns` 宣言を持つシンプルなMAIML。以下のケースをカバーする：

| ケース | タグ | xmlns宣言 | property key | 期待 |
|---|---|---|---|---|
| G | `<result xmlns:tiff="https://www.iso.org/...">` 内 | 子タグ外部URI | `tiff:ImageWidth` | ✅ スキップ（子タグ外部NS） |
| H | `<result xmlns:myco="https://myco.Alchemia.co.jp">` 内 | 子タグAlchemia URI | `myco:Key`（DB未登録） | ❌ エラー |
| I | ケースGの `<result>` の **外** | 宣言なし | `tiff:Key`（スコープ外） | ❌ 即エラー |

### 既存テストへの影響

- ケース01〜12: `property` がないか、あってもプレーンキーのみ → 影響なし
- `collectPropertyAndUncertaintyKeys` の引数変更は `validatePropertyTermKeys` 内部の1箇所のみ → コンパイルエラーは局所的

### TypeScript ビルド確認

```bash
npx tsc --noEmit   # exit:0
```

### テスト実行

```bash
npx jest backend/tests/utils/maimlParser.validation.test.ts --no-coverage
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| fast-xml-parser が子タグの `@_xmlns:*` を格納しないケースがある | 高 | 低 | テストデータで実際に確認。必要ならパース結果をログ出力してデバッグ |
| `collectPropertyAndUncertaintyKeys` 引数変更によるコンパイルエラー | 中 | 低 | 呼び出し箇所は `validatePropertyTermKeys` 内の1箇所のみ |
| Map コピーのパフォーマンス | 低 | 低 | xmlns 宣言があるノードのみコピー発生。通常のMAIMLでは少ない |
| 既存テスト（ケース01〜12）破壊 | 中 | 低 | 判定ロジックは等価なため影響なし。テスト実行で確認 |

---

## 承認記録

- **計画書提示日時**: 2026-09-18
- **承認日時**: 2026-09-18
- **承認者コメント**: 承認

---

## 実施記録

### 実施日時
開始: 2026-09-18  
完了: 2026-09-18

### 変更ファイル（実施結果）

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `backend/src/utils/maimlParser.ts` | `collectPropertyAndUncertaintyKeys` をスコープ引き継ぎ型に拡張。`validatePropertyTermKeys` を keyEntries 形式・重複エラー防止対応に変更 |
| 2 | `backend/tests/utils/maiml_validation/13_child_xmlns.maiml` | 子タグxmlns宣言テストデータ新規作成（ケースG/H/I） |
| 3 | `backend/tests/utils/maimlParser.validation.test.ts` | ケース13のテストを追記（モック非対応のため補助的に追記） |
| 4 | `backend/tests/utils/maimlParser.childXmlns.test.ts` | DB・S3モック付きのケース13専用テストファイルを新規作成 |

### テスト結果

```
PASS tests/utils/maimlParser.childXmlns.test.ts
  ケース13: 子タグxmlns宣言スコープ対応
    strict モード
      ✓ ケースG: 子タグ外部NS（tiff:ImageWidth）はエラーにならない
      ✓ ケースH: 子タグAlchemia NS未登録（myco:UnknownKey）はエラーになる
      ✓ ケースI: スコープ外のprefix（tiff:OutOfScope）は即エラーになる
      ✓ 合計エラー数はG除く2件（H + I）
    lenient モード
      ✓ ケースG: 子タグ外部NS（tiff:ImageWidth）はエラーにならない
      ✓ ケースH・I: エラー2件、canBeIgnoredOnUpload=true

Tests: 6 passed, 6 total
```

TypeScript ビルド: EXIT:0

