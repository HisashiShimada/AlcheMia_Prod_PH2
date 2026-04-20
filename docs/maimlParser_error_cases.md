# analyzeMaiMLFile — severity: "error" 一覧

> 対象ファイル: `backend/src/utils/maimlParser.ts`
> 関数: `analyzeMaiMLFile()`
> 作成日: 2026-04-20

---

## 概要

`analyzeMaiMLFile` は以下の 6 フェーズでファイルを検査します。
各フェーズで検出されたエラーは `AnalysisResult.errors[]` に積まれ、severity が `"error"` のものが本ドキュメントの対象です。

| フェーズ | 関数 | 説明 |
|---------|------|------|
| Phase 1 | `validateXMLSyntax()` | XML 構文チェック |
| Phase 2 | `parser.parse()` | XML パース |
| Phase 3 | `validateMaiMLStructure()` | MaiML ルート構造チェック |
| Phase 3a | `validateDocumentStructure()` | `<document>` 要素チェック |
| Phase 3b | `validateProtocolStructure()` | `<protocol>` 要素チェック |
| Phase 3c | `validateMethodStructure()` | `<method>` 要素チェック |
| Phase 5 | `validateReferences()` | ID 参照整合性チェック |
| Phase 6 | `validateDuplicateIds()` | 重複 ID チェック |
| 全体 | outer try/catch | 予期しない例外 |

---

## Phase 1: XML 構文チェック（`validateXMLSyntax`）

### E-1-1: XML 構文エラー

| 項目 | 内容 |
|------|------|
| **type** | `syntax_error` |
| **severity** | `error` |
| **発生条件** | `XMLValidator.validate()` が `true` 以外を返した場合（タグの未閉じ、不正文字、不正な属性値など） |
| **message** | `XML syntax error detected` |
| **details** | `validation.err.msg`（fast-xml-parser のエラーメッセージ） |
| **line / column** | `validation.err.line` / `validation.err.col` |
| **suggestion** | `Fix XML syntax errors - check for unclosed tags, invalid characters, or malformed structure` |
| **備考** | このエラーが発生した場合、以降のフェーズはすべてスキップされ即時 return される |

#### 主な XML 構文エラーの種類（fast-xml-parser が検出するもの）

| 具体例 | 説明 |
|--------|------|
| `<maiml>` タグが閉じられていない | 開きタグに対応する閉じタグがない |
| `<place id="p1">` の `>` が欠落 | 属性値の不正なクォート、記号の欠損 |
| `&`, `<`, `>` をエスケープせずに本文に使用 | 予約文字の未エスケープ（`&amp;`, `&lt;`, `&gt;` を使うべき） |
| XML 宣言 `<?xml ... ?>` の記法ミス | `version` 属性が `"` でなく `'` で囲まれているなど |
| 二重ルート要素 | `<maiml>...</maiml><extra/>` のように最上位要素が 2 つある |
| UTF-8 以外のエンコーディングで宣言と実際が不一致 | `encoding="UTF-8"` と宣言しているが実際は Shift_JIS など |

---

## Phase 2: XML パース（`parser.parse()` の例外）

### E-2-1: XML パース失敗

| 項目 | 内容 |
|------|------|
| **type** | `syntax_error` |
| **severity** | `error` |
| **発生条件** | `XMLParser.parse()` が例外をスローした場合（Phase 1 をすり抜けた不正 XML） |
| **message** | `Failed to parse XML content` |
| **details** | `parseError.message`（パーサーが出力した例外メッセージ） |
| **line / column** | `0` / `0`（位置情報は取得不可） |
| **suggestion** | `Ensure XML is well-formed and follows MaiML schema structure` |
| **備考** | このエラーが発生した場合、以降のフェーズはすべてスキップされ即時 return される |

---

## Phase 3: MaiML ルート構造チェック（`validateMaiMLStructure`）

### E-3-1: ルート `<maiml>` 要素の欠落

| 項目 | 内容 |
|------|------|
| **type** | `invalid_structure` |
| **severity** | `error` |
| **発生条件** | パース結果に `parsedXML.maiml` キーが存在しない場合 |
| **message** | `Missing root "maiml" element` |
| **suggestion** | `Add <maiml version="1.0" xmlns="http://www.maiml.org/schemas"> as root element` |
| **備考** | `isValid = false` になる。`<Maiml>` や `<MAIML>` など大文字・小文字の誤りも本ケースに該当 |

---

### E-3-2: `version` 属性の欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `<maiml>` の `@_version` 属性が存在しない場合 |
| **message** | `Missing required "version" attribute on maiml element` |
| **suggestion** | `Add version="1.0" attribute to <maiml> element` |

---

### E-3-3: `<document>` 要素の欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `parsedXML.maiml.document` が存在しない場合 |
| **message** | `Missing required "document" element` |
| **suggestion** | `Add <document id="..."> element with required metadata` |

---

### E-3-4: `<protocol>` 要素の欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `parsedXML.maiml.protocol` が存在しない場合 |
| **message** | `Missing required "protocol" element` |
| **suggestion** | `Add <protocol id="..."> element. Check for typos (e.g. "protcol" instead of "protocol")` |

---

## Phase 3a: `<document>` 要素チェック（`validateDocumentStructure`）

### E-3a-1: `<document>` の `id` 属性欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `document['@_id']` が falsy な場合 |
| **message** | `Document element missing required "id" attribute` |
| **suggestion** | `Add id="unique-document-id" to <document> element` |

---

### E-3a-2: `<document>` 内の必須子要素の欠落

以下の 5 要素それぞれが欠落していると **個別に** エラーが生成されます。

| 要素 | type | severity | message |
|------|------|----------|---------|
| `<uuid>` | `missing_required` | `error` | `Missing required "uuid" element in document` |
| `<creator>` | `missing_required` | `error` | `Missing required "creator" element in document` |
| `<vendor>` | `missing_required` | `error` | `Missing required "vendor" element in document` |
| `<owner>` | `missing_required` | `error` | `Missing required "owner" element in document` |
| `<date>` | `missing_required` | `error` | `Missing required "date" element in document` |

**suggestion（共通）**: `Add <{要素名}> element to document section`

---

### E-3a-3: UUID フォーマット不正

| 項目 | 内容 |
|------|------|
| **type** | `validation_warning`（※ typeは warning だが severity は error） |
| **severity** | `error` |
| **発生条件** | `document.uuid` が存在するが、UUID v3〜v5 の正規表現 `/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[3-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/` にマッチしない場合 |
| **message** | `Invalid UUID format in document` |
| **suggestion** | `Use proper UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)` |
| **備考** | ハイフンの位置ミス、英数字以外の文字混入、ハイフンなし 32 文字などが該当する |

---

## Phase 3b: `<protocol>` 要素チェック（`validateProtocolStructure`）

### E-3b-1: `<protocol>` の `id` 属性欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `protocol['@_id']` が falsy な場合 |
| **message** | `Protocol element missing required "id" attribute` |
| **suggestion** | `Add id="unique-protocol-id" to <protocol> element` |

---

### E-3b-2: `<protocol>` 内の `<uuid>` 欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `protocol.uuid` が存在しない場合 |
| **message** | `Missing required "uuid" element in protocol` |
| **suggestion** | `Add <uuid> element to <protocol> section` |

---

### E-3b-3: `<protocol>` 内の `<method>` 欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `protocol.method` が falsy、または空配列の場合 |
| **message** | `Missing required "method" element in protocol (at least 1 required)` |
| **suggestion** | `Add at least one <method id="..."> element to <protocol>` |
| **備考** | XSD 上 `maxOccurs="unbounded"` かつ 1 件以上必須 |

---

## Phase 3c: `<method>` 要素チェック（`validateMethodStructure`）

各 `<method>` に対してループで検査されます。複数の method がある場合、それぞれに対してエラーが生成されます。  
エラーメッセージ内の `{methodLabel}` は `method[id="xxx"]`（id あり）または `method[N]`（id なし）になります。

### E-3c-1: `<method>` の `id` 属性欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `method['@_id']` が falsy な場合 |
| **message** | `{methodLabel} missing required "id" attribute` |
| **suggestion** | `Add id="unique-method-id" to <method> element` |

---

### E-3c-2: `<method>` 内の `<uuid>` 欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `method.uuid` が存在しない場合 |
| **message** | `Missing required "uuid" element in {methodLabel}` |
| **suggestion** | `Add <uuid> element to <method> section` |

---

### E-3c-3: `<method>` 内の `<pnml>` 欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `method.pnml` が falsy、または空配列の場合 |
| **message** | `Missing required "pnml" element in {methodLabel} (at least 1 required)` |
| **suggestion** | `Add <pnml id="..."> element to <method>` |
| **備考** | XSD 上 `maxOccurs="unbounded"` かつ 1 件以上必須 |

---

### E-3c-4: `<method>` 内の `<program>` 欠落

| 項目 | 内容 |
|------|------|
| **type** | `missing_required` |
| **severity** | `error` |
| **発生条件** | `method.program` が falsy、または空配列の場合 |
| **message** | `Missing required "program" element in {methodLabel} (at least 1 required)` |
| **suggestion** | `Add <program id="..."> element to <method>` |
| **備考** | XSD 上 `maxOccurs="unbounded"` かつ 1 件以上必須 |

---

## Phase 5: ID 参照整合性チェック（`validateReferences`）

### E-5-1: 未定義 ID への参照

| 項目 | 内容 |
|------|------|
| **type** | `reference_error` |
| **severity** | `error` |
| **発生条件** | `@_ref` 属性に設定された値が、ドキュメント全体の `@_id` 集合に存在しない場合 |
| **message** | `Undefined reference "{ref値}"` |
| **path** | 参照が見つかった要素のパス（例: `maiml.protocol.method[0].pnml.net.transition.placeRef[2]`） |
| **ref** | 参照されている ID 文字列 |
| **element** | 参照を持つ要素オブジェクト |
| **suggestion** | `Ensure element with id="{ref値}" exists or remove the reference` |
| **備考** | `<placeRef ref="xxx">` の `xxx` が対応する `<place id="xxx">` を持たない場合などが典型例 |

---

## Phase 6: 重複 ID チェック（`validateDuplicateIds`）

### E-6-1: ID の重複

| 項目 | 内容 |
|------|------|
| **type** | `duplicate_id` |
| **severity** | `error` |
| **発生条件** | 同一の `@_id` 値が 2 つ以上の要素で使用されている場合 |
| **message** | `Duplicate ID "{id}" found in {N} elements` |
| **details** | `ID "{id}" is used {N} times in: {elementTypes}` |
| **duplicateId** | 重複している ID 文字列 |
| **occurrences** | 重複している要素の個数 |
| **elementTypes** | 重複が検出された要素種別の列挙（例: `place, transition`） |
| **paths** | 重複が検出されたパスの配列 |
| **suggestion** | `Ensure each ID is unique. Change duplicate IDs to unique values.` |
| **備考** | 検出対象の要素種別: `place`, `transition`, `arc`, `materialTemplate`, `conditionTemplate`, `resultTemplate`, `placeRef`, `method`, `pnml`, `program`, `document` |

---

## 全体例外（outer try/catch）

### E-0-1: 予期しない内部エラー

| 項目 | 内容 |
|------|------|
| **type** | `syntax_error` |
| **severity** | `error` |
| **発生条件** | 上記いずれのフェーズでも補足されなかった例外が `analyzeMaiMLFile` の最外部 try/catch に到達した場合 |
| **message** | `Critical analysis error` |
| **details** | `error.message`（例外のメッセージ） |
| **suggestion** | `Contact system administrator - internal parser error` |
| **備考** | このケースでは `AnalysisResult` が最小限の状態で返される。`isValid: false`、errors に本エラーのみ格納 |

---

## エラー一覧（早見表）

| ID | フェーズ | type | 発生条件の要約 |
|----|---------|------|--------------|
| E-1-1 | Phase 1 | `syntax_error` | XML 構文エラー（タグ未閉じ・不正文字・予約文字未エスケープなど） |
| E-2-1 | Phase 2 | `syntax_error` | `XMLParser.parse()` 例外 |
| E-3-1 | Phase 3 | `invalid_structure` | ルート `<maiml>` 要素がない |
| E-3-2 | Phase 3 | `missing_required` | `<maiml>` に `version` 属性がない |
| E-3-3 | Phase 3 | `missing_required` | `<document>` 要素がない |
| E-3-4 | Phase 3 | `missing_required` | `<protocol>` 要素がない |
| E-3a-1 | Phase 3a | `missing_required` | `<document>` に `id` 属性がない |
| E-3a-2 | Phase 3a | `missing_required` | `<document>` の子要素（uuid/creator/vendor/owner/date）のいずれかが欠落 |
| E-3a-3 | Phase 3a | `validation_warning` | `<document>` 内 `<uuid>` が UUID フォーマット不正 |
| E-3b-1 | Phase 3b | `missing_required` | `<protocol>` に `id` 属性がない |
| E-3b-2 | Phase 3b | `missing_required` | `<protocol>` に `<uuid>` がない |
| E-3b-3 | Phase 3b | `missing_required` | `<protocol>` に `<method>` が 1 件もない |
| E-3c-1 | Phase 3c | `missing_required` | `<method>` に `id` 属性がない |
| E-3c-2 | Phase 3c | `missing_required` | `<method>` に `<uuid>` がない |
| E-3c-3 | Phase 3c | `missing_required` | `<method>` に `<pnml>` が 1 件もない |
| E-3c-4 | Phase 3c | `missing_required` | `<method>` に `<program>` が 1 件もない |
| E-5-1 | Phase 5 | `reference_error` | `@_ref` が指す ID が文書内に存在しない |
| E-6-1 | Phase 6 | `duplicate_id` | 同一 ID が複数要素で使われている |
| E-0-1 | 全体 | `syntax_error` | 予期しない内部例外 |

---

## エラー発生時の処理フロー

```
analyzeMaiMLFile()
│
├─ Phase 1: validateXMLSyntax()
│   └─ エラー検出 → E-1-1 を errors に push → **即時 return**
│
├─ Phase 2: parser.parse()
│   └─ 例外発生 → E-2-1 を errors に push → **即時 return**
│
├─ Phase 3: validateMaiMLStructure()
│   ├─ E-3-1: <maiml> なし
│   ├─ E-3-2: version 属性なし
│   ├─ E-3-3: <document> なし
│   ├─ E-3-4: <protocol> なし
│   ├─ validateDocumentStructure()
│   │   ├─ E-3a-1: document に id なし
│   │   ├─ E-3a-2: 必須子要素欠落（最大 5 件）
│   │   └─ E-3a-3: UUID フォーマット不正
│   ├─ validateProtocolStructure()
│   │   ├─ E-3b-1: protocol に id なし
│   │   ├─ E-3b-2: protocol に uuid なし
│   │   ├─ E-3b-3: method が 0 件
│   │   └─ validateMethodStructure() × method の数だけループ
│   │       ├─ E-3c-1: method に id なし
│   │       ├─ E-3c-2: method に uuid なし
│   │       ├─ E-3c-3: pnml が 0 件
│   │       └─ E-3c-4: program が 0 件
│
├─ Phase 4: analyzeContent()  ← structureValidation.isValid の場合のみ実行
│   └─ （error なし、warnings/suggestions のみ）
│
├─ Phase 5: validateReferences()
│   └─ E-5-1: 未定義 ID への参照（ref の数だけ生成）
│
└─ Phase 6: validateDuplicateIds()
    └─ E-6-1: 重複 ID（重複 ID の数だけ生成）
```

> **注意**: Phase 1 または Phase 2 でエラーが発生した場合、Phase 3 以降は実行されません。
> Phase 3〜6 は独立して実行され、複数フェーズのエラーが蓄積されます。

---

## 補足: warning と info の扱い

本ドキュメントは `severity: "error"` のみを対象としています。  
`severity: "warning"` と `severity: "info"` は `analysisResult.warnings[]` または `analysisResult.suggestions[]` に格納され、`isValid` の判定に影響しません。

| severity | 格納先 | isValid への影響 |
|---------|--------|----------------|
| `"error"` | `errors[]` | **false** になる |
| `"warning"` | `warnings[]` | 影響なし |
| `"info"` | `suggestions[]` または `warnings[]` | 影響なし |
