# タスク計画書: maiml_line_no / hierarchy 採番実装

## メタデータ
- **作成日時**: 2026-03-18 08:13
- **タスクID**: maiml_line_no_hierarchy実装
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

MaiML 公開処理（`maimlPublishWorker.ts` → `maimlIngestParserService.ts`）において、
DB 登録時に `maiml_line_no`（XML 元行番号）および `hierarchy`（`1`, `2-1`, `2-1-1` 形式）が
常に `null` / 未設定になっている問題を修正する。

`sax` パーサー（既存の transitive dependency）を使用した **2パス方式** で実装し、
既存の `MaimlParserTyped` 実装には変更を加えない。

---

## 目的と期待される成果

- [ ] `maiml_element.maiml_line_no` に XML の元行番号が格納される
- [ ] `maiml_element.hierarchy` に `1`, `2-1`, `2-1-1` 形式の階層番号が格納される
- [ ] `maiml_template_element` でも同様に `maiml_line_no` / `hierarchy` が格納される
- [ ] `maiml_instance.instance_line_no` に行番号が格納される
- [ ] `maiml_template.template_line_no` に行番号が格納される
- [ ] `maiml_insertion.maiml_line_no` に行番号が格納される
- [ ] `maiml_event.maiml_line_no` に行番号が格納される

---

## 実装ステップ

### Phase 1: maimlLineNoExtractor.ts の新規作成

- [ ] `backend/src/utils/maimlLineNoExtractor.ts` を新規作成
- [ ] `sax` パーサーで XML を走査し、以下の情報を収集する関数を実装
  - インスタンス（result/material/condition）の `id` → 行番号
  - テンプレート（*Template）の `id` → 行番号
  - insertion の 親インスタンス/テンプレートID + 出現順インデックス → 行番号
  - event の `id` → 行番号
  - property/content（要素）の `インスタンスID + hierarchy` → 行番号
- [ ] 戻り値の型定義 `MaimlLineNoMap` を作成

### Phase 2: maimlIngestParserService.ts の修正

- [ ] `parseForIngest()` の先頭で `buildMaimlLineNoMap(xmlString)` を呼び出す
- [ ] `processInstance()` 関数の `instance_line_no` に行番号を設定する
- [ ] `flattenProperty()` 関数の `maiml_line_no` / `hierarchy` を実際の値に設定する
- [ ] `flattenContent()` 関数の `maiml_line_no` / `hierarchy` を実際の値に設定する
- [ ] `toInsertionInput()` 関数の `maiml_line_no` に行番号を設定する
- [ ] `processTemplate()` 関数の `template_line_no` に行番号を設定する
- [ ] `flattenTemplateProperty()` / `flattenTemplateContent()` の `maiml_line_no` / `hierarchy` を設定する
- [ ] eventLog 処理部の `maiml_line_no` に行番号を設定する

---

## 変更ファイル

### 新規作成
1. `backend/src/utils/maimlLineNoExtractor.ts` - sax による行番号・hierarchy マップ構築ユーティリティ

### 修正
1. `backend/src/services/maimlIngestParserService.ts` - `parseForIngest()` に行番号・hierarchy の補完ロジックを追加

---

## 技術詳細

### MaimlLineNoMap の構造

```typescript
export interface MaimlLineNoRecord {
  lineNo: number;
  hierarchy: string;  // 要素の場合のみ使用（例: "1", "2-1"）
}

export interface MaimlLineNoMap {
  // インスタンス（result/material/condition）: instanceKey → lineNo
  instances: Map<string, number>;
  // テンプレート: templateKey → lineNo
  templates: Map<string, number>;
  // 要素（property/content）: `${instanceKey}::${hierarchy}` → lineNo
  elements: Map<string, number>;
  // テンプレート要素: `${templateKey}::${hierarchy}` → lineNo
  templateElements: Map<string, number>;
  // insertion: `${instanceKey}::${index}` → lineNo
  insertions: Map<string, number>;
  // テンプレートinsertion: `${templateKey}::${index}` → lineNo
  templateInsertions: Map<string, number>;
  // event: eventKey(id) → lineNo（id がない場合は出現順インデックス）
  events: Map<string, number>;
}
```

### buildMaimlLineNoMap の実装ロジック

```
sax.parser(true) で strict モードパース
  onopentag で:
    1. INSTANCE_TAGS (result/material/condition):
       → instanceKey = id 属性
       → instances.set(instanceKey, line)
       → elemStack に積む（childCount=0）
    
    2. TARGET_TAGS (property/content/uncertainty) かつ inInstance:
       → 親の childCount++ して hierarchy 計算
       → elements.set(`${instanceKey}::${hierarchy}`, line)
       → elemStack に積む
    
    3. TEMPLATE_TAGS (*Template) かつ inProtocol:
       → templateKey = id 属性
       → templates.set(templateKey, line)
       → 同様に template 用スタックで管理
    
    4. insertion:
       → 現在の instanceKey または templateKey に紐づく出現インデックスで管理
    
    5. event:
       → eventKey = id 属性 または出現順インデックス

  onclosetag で:
    → スタックから pop してコンテキストをリセット
```

### maimlIngestParserService.ts での使用例

```typescript
// parseForIngest() の先頭
const lineNoMap = buildMaimlLineNoMap(xmlString);

// processInstance() 内
instances.push({
  instance_type:     instType,
  instance_key:      instanceKey,
  instance_line_no:  lineNoMap.instances.get(instanceKey) ?? null,  // ← 追加
  ...
});

// flattenProperty() 内（hierarchy は既存ロジックで計算済み）
elements.push({
  ...
  hierarchy,
  maiml_line_no: lineNoMap.elements.get(`${instanceKey}::${hierarchy}`) ?? null,  // ← 追加
});
```

---

## 現在の hierarchy の問題点と修正方針

### 現状の問題

`maimlIngestParserService.ts` の `flattenProperty()` / `flattenContent()` では
`hierarchy` を以下のように文字列リテラルで構築している：

```typescript
// 現状
`/${instType}/property[${prop.key}]`
`/${instType}/content[${cont.key}]`
```

この形式は maiml2Excel の `1`, `1-1`, `1-2-3` 形式と**異なる**。

### 修正方針

`hierarchy` の算出は `sax` の2パスで生成した `MaimlLineNoMap` の連番方式に統一する。

ただし、`hierarchy` 文字列はパーサー側（`flattenProperty`/`flattenContent`）でも別途構築されるため、
**`sax` パス側で `hierarchy → lineNo` のマップを作成し**、
サービス側で `hierarchy` 文字列を `maiml2Excel` 形式（`1`, `1-1` 形式）に変更する。

具体的には `flattenProperty` の `hierarchy` パラメータを
`1`, `1-1` 形式のカウンターベースに変更する。

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 同一インスタンス内で同じ key の property が複数ある場合のマップ重複 | 中 | 低 | `instanceKey::hierarchy` の複合キーで一意性を保証（hierarchy は番号なので重複しない） |
| sax の strict モードで既存 MAIML の名前空間が問題になる | 低 | 中 | 名前空間プレフィックスを strip する前処理を追加（maiml2Excel と同様） |
| 既存の `hierarchy` 文字列フォーマット変更による他機能への影響 | 中 | 低 | `hierarchy` を参照している他のコードを事前調査する |

---

## テスト計画

- [ ] `maiml2Excel/DATA/INPUT/test.maiml` を使用して公開処理を実行
- [ ] DB に格納された `maiml_element.maiml_line_no` と `maiml_element.hierarchy` が期待値と一致することを確認
- [ ] Python の `maimlinstancetoxl.py` の出力と比較して行番号・hierarchy が一致することを確認

---

## 承認記録
- **計画書提示日時**: 2026-03-18 08:13
- **承認日時**: 
- **承認者コメント**: 
