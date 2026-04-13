# タスク計画書: Template内Content出力修正・子Property/Content再帰出力対応

## メタデータ
- **作成日時**: 2026-04-09 15:00
- **タスクID**: template-content-output-fix
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` において、  
**Template に含まれる `contents`（Content配列）が XML 出力されない**、  
および **`buildContentXML` がネストされた子 Property・子 Content を再帰出力しない** という2つの課題を修正する。

## 課題の詳細分析

### 課題1: Template の `contents` が出力されていない

**対象関数**: `convertReactFlowToMaiML` 内の `materialTemplate` / `conditionTemplate` / `resultTemplate` 出力ブロック（行 1107〜1311）

**現状のコード（例: materialTemplate、行 1148〜1153）**:
```typescript
// property要素群
if (template.properties && template.properties.length > 0) {
  template.properties.forEach((prop: Property) => {
    maiml += buildPropertyXML(prop, 5);
  });
}
// ← ここに template.contents の出力がない！
```

**問題**: `Template` 型（`maiml-unified.ts` 行 821）には `contents: Content[]` フィールドが存在するが、  
materialTemplate / conditionTemplate / resultTemplate の各出力ブロックで `template.contents` の出力処理が**完全に欠落**している。

**同様の問題は `buildCommonTemplateXML` 関数（行 588〜664）にも存在**:
```typescript
// property要素群
if (template.properties && template.properties.length > 0) {
  template.properties.forEach((prop: Property) => {
    xml += buildPropertyXML(prop, 3);
  });
}
// ← ここに template.contents の出力がない！
```

---

### 課題2: `buildContentXML` がネストされた子 Property・子 Content を再帰出力しない

**対象関数**: `buildContentXML`（行 552〜578）

**現状のコード（行 570〜577）**:
```typescript
// 値は基本的に空（MaiML仕様ではcontentは空要素）
contentXml += `>\n${indent}</content>\n`;
```

**問題**: `Content` 型（`maiml-unified.ts` 行 110〜187）は以下のネスト構造を持つ:
```typescript
export interface Content {
  // ...
  properties: Property[];   // ← ネストされた子 Property
  contents: Content[];      // ← ネストされた子 Content
  // ...
}
```

しかし `buildContentXML` は開始タグ直後に終了タグを書いて終わっており、  
`content.properties` も `content.contents` も出力していない。

MAIMLの仕様では `<content>` 要素の中に `<property>` や `<content>` をネストできるため、  
この処理漏れがある。

---

### 課題3（付随）: `buildPropertyXML` の content 分岐で `prop.contents` が空配列の場合にエラーになる可能性

**対象箇所**: 行 504〜508
```typescript
else if (propType === 'content' || propType === 'contentDoubleListType' || propType === 'contentListType') {
  prop.contents.forEach((content) => {
    propertyXml += buildContentXML(content, indentLevel + 1);
  })
}
```

`prop.contents` が `undefined` の場合、`forEach` でランタイムエラーになりうる（防御的チェックが必要）。

## 目的と期待される成果

### 目的
- MAIML XML のラウンドトリップ（読み込み → 編集 → 書き出し）において、  
  Template に含まれる Content 定義が失われないようにする。
- Content がネスト構造を持つ場合も正確に XML 出力できるようにする。

### 期待される成果
- [ ] `materialTemplate` / `conditionTemplate` / `resultTemplate` の各出力ブロックで `template.contents` が出力される
- [ ] `buildCommonTemplateXML` でも `template.contents` が出力される
- [ ] `buildContentXML` がネストされた子 Property（`content.properties`）を `buildPropertyXML` で再帰出力する
- [ ] `buildContentXML` がネストされた子 Content（`content.contents`）を `buildContentXML` で再帰出力する
- [ ] `buildPropertyXML` の content 分岐に `prop.contents` の防御的チェックを追加する

## 実装ステップ

### Phase 1: `buildContentXML` の修正（ネスト再帰出力対応）
- [ ] `content.properties` が存在する場合、`buildPropertyXML` を再帰呼び出して出力
- [ ] `content.contents` が存在する場合、`buildContentXML` を再帰呼び出して出力
- [ ] `content.value` が存在する場合、`<value>` タグを出力（現在未実装）
- [ ] `content.description` が存在する場合、`<description>` タグを出力（現在未実装）
- [ ] 終了タグを適切なタイミングに移動（子要素出力後に出力）

### Phase 2: `materialTemplate` 出力ブロックへの `contents` 出力追加（行 1148〜1153付近）
- [ ] `template.properties` 出力の直後に `template.contents` の出力を追加
- [ ] 各 content について `buildContentXML(content, 5)` を呼び出す

### Phase 3: `conditionTemplate` 出力ブロックへの `contents` 出力追加（行 1218〜1222付近）
- [ ] `template.properties` 出力の直後に `template.contents` の出力を追加

### Phase 4: `resultTemplate` 出力ブロックへの `contents` 出力追加（行 1287〜1291付近）
- [ ] `template.properties` 出力の直後に `template.contents` の出力を追加

### Phase 5: `buildCommonTemplateXML` への `contents` 出力追加（行 631〜636付近）
- [ ] `template.properties` 出力の直後に `template.contents` の出力を追加

### Phase 6: `buildPropertyXML` の防御的チェック追加（行 504〜508）
- [ ] `prop.contents` が `undefined` または空配列でないことを確認してから `forEach` を呼ぶ

## 変更ファイル

1. `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` - 上記6か所の修正

## 影響範囲

- **影響を受ける機能**: MAIMLエディタv2のXML保存・書き出し処理
- **影響を受けるユーザー**: MAIMLエディタでTemplate内にContentを持つMAIMLを編集・保存するユーザー
- **データ影響**: Template内にContentが存在するMAIMLが正しくラウンドトリップされるようになる

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ネスト再帰が無限ループになる | 高 | 低 | 実MAIMLデータのネスト深度は有限（通常2〜3段階）であり問題ない |
| 既存の動作への影響 | 中 | 低 | contentsが空配列の場合は何も出力しないため既存挙動に影響なし |
| インデントレベルのずれ | 低 | 中 | 修正前後でインデントレベルを確認して統一する |

## テスト計画

### 手動テスト
- [ ] Template に `contents` を持つ MAIMLファイルを読み込み → 保存 → 再読み込みして一致を確認
- [ ] Content にネストされた `properties` / `contents` を持つ MAIMLを保存して XML 出力を確認
- [ ] Template に `contents` がない（空配列）場合に余計な要素が出力されないことを確認

## 承認記録
- **計画書提示日時**: 2026-04-09 15:00
- **承認日時**: 2026-04-09 15:00
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-04-09 15:00
完了: 2026-04-09 15:27

### 計画からの変更点
- Phase 1〜6 の `reactFlowToMaiml.ts` への修正は既に実装済みであることを確認
- `maimlTypeConverter.ts` 側で `convertContent` 内のインラインimportが残存していた問題を修正:
  - `PropertyCustomElement` を import 文に追加
  - `convertCustomElement` ヘルパー関数を追加（インラインimport不使用の形に修正）

### 最終的な成果物
- [x] `materialTemplate` / `conditionTemplate` / `resultTemplate` の各出力ブロックで `template.contents` が出力される（実装済みを確認）
- [x] `buildCommonTemplateXML` でも `template.contents` が出力される（実装済みを確認）
- [x] `buildContentXML` がネストされた子 Property・子 Content を再帰出力する（実装済みを確認）
- [x] `buildPropertyXML` の content 分岐に防御的チェックが存在する（実装済みを確認）
- [x] `maimlTypeConverter.ts` の `convertCustomElement` インラインimport除去・関数定義追加
