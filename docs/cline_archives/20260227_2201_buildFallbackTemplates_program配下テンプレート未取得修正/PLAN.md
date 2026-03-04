# タスク計画書: buildFallbackTemplates program配下テンプレート未取得修正

## メタデータ
- **作成日時**: 2026-02-27 22:01
- **タスクID**: buildFallbackTemplates_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`experimentDataService.ts` の `buildFallbackTemplates` 関数が、MAIMLファイルのテンプレート定義を正しく取得できていないバグを修正する。

---

## 調査結果

### 根本原因

**`buildFallbackTemplates` が `method` 直下のテンプレートしか参照していないが、MAIMLファイルのテンプレートは `program` 直下に存在する。**

### MAIMLファイルの実際の構造（TestProjectOmori7.maiml）

```xml
<method id="method_TestProjectOmori7_adbe40ff">
  <pnml>...</pnml>
  <program id="program_TestProjectOmori7_adbe40ff">
    <!-- ← テンプレートは program 直下にある -->
    <instruction>...</instruction>
    <materialTemplate id="materialTemplate_1772064773709">...</materialTemplate>
    <conditionTemplate id="conditionTemplate_1772064842228">...</conditionTemplate>
    <resultTemplate id="resultTemplate_1772064886071">...</resultTemplate>
  </program>
</method>
```

### `convertMethod` の変換処理（maimlTypeConverter.ts）

`convertMethod` は `xmlMethod.materialTemplate`（`method` 直下）を参照するため、
テンプレートが `program` 直下にある場合は `method.materialTemplates` が空配列 `[]` になる。

```typescript
function convertMethod(xmlMethod: any): Method {
  return {
    ...
    // method直下の materialTemplate を参照
    // → TestProjectOmori7.maiml ではここに定義がないため空配列になる
    materialTemplates: xmlMethod.materialTemplate ? convertArray(...) : [],
    conditionTemplates: xmlMethod.conditionTemplate ? convertArray(...) : [],
    resultTemplates: xmlMethod.resultTemplate ? convertArray(...) : []
  };
}
```

### `buildFallbackTemplates` の参照先（experimentDataService.ts）

```typescript
const templateCategories = [
  { templates: method.materialTemplates, ... },  // ← 空配列 []
  { templates: method.conditionTemplates, ... }, // ← 空配列 []
  { templates: method.resultTemplates, ... },    // ← 空配列 []
];
```

`method.materialTemplates` / `conditionTemplates` / `resultTemplates` がすべて空配列のため、
ループが何も処理せず空配列を返す。

### 実際のテンプレートの在処

テンプレートは `method.program[N].materialTemplates` 等に格納されている：

```typescript
method.program[0].materialTemplates  // ← materialTemplate が格納されている
method.program[0].conditionTemplates // ← conditionTemplate が格納されている
method.program[0].resultTemplates    // ← resultTemplate が格納されている
```

### なぜ `getTemplates()` は正しく動くのか

`MaimlParserTyped.getTemplates()` は `method.program` 内のテンプレートを追加スキャンするコードが含まれているため正しく取得できている。`buildFallbackTemplates` にはこのロジックが含まれていない。

---

## 目的と期待される成果

- [ ] `buildFallbackTemplates` が `method.program` 配下のテンプレートも収集するよう修正する
- [ ] 0件フォールバック時に各テンプレート（material/condition/result）のデータが正しく返される
- [ ] 既存の動作（method直下にテンプレートがある場合）は引き続き正常に動作する

---

## 実装ステップ

### Step 1: タスク計画書作成（本ファイル）
- [x] 調査結果を含むタスク計画書を作成

### Step 2: experimentDataService.ts の `buildFallbackTemplates` 修正
- [ ] `method.materialTemplates` / `conditionTemplates` / `resultTemplates` に加え、
  `method.program` 配下のテンプレートも収集するよう修正する

---

## 変更ファイル

| ファイル | 変更内容 |
|--------|----------|
| `backend/src/services/experimentDataService.ts` | `buildFallbackTemplates` 関数内のテンプレート収集ロジックを修正 |

---

## 修正内容詳細

### 修正前コード

```typescript
const templateCategories: Array<{
  templates: typeof method.materialTemplates;
  templateType: 'material' | 'condition' | 'result';
}> = [
  { templates: method.materialTemplates, templateType: 'material' },
  { templates: method.conditionTemplates, templateType: 'condition' },
  { templates: method.resultTemplates,    templateType: 'result' },
];
```

### 修正後コード

```typescript
// method直下 + program配下のテンプレートを統合
const allMaterialTemplates = [
  ...method.materialTemplates,
  ...method.program.flatMap(p => p.materialTemplates),
];
const allConditionTemplates = [
  ...method.conditionTemplates,
  ...method.program.flatMap(p => p.conditionTemplates),
];
const allResultTemplates = [
  ...method.resultTemplates,
  ...method.program.flatMap(p => p.resultTemplates),
];

const templateCategories: Array<{
  templates: typeof method.materialTemplates;
  templateType: 'material' | 'condition' | 'result';
}> = [
  { templates: allMaterialTemplates, templateType: 'material' },
  { templates: allConditionTemplates, templateType: 'condition' },
  { templates: allResultTemplates,    templateType: 'result' },
];
```

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| method.program が空の場合 | 低 | `flatMap` は空配列に対して安全に動作するため問題なし |
| method直下とprogram配下に同一テンプレートが重複定義されている場合 | 低 | 現実のMAIMLファイルでは発生しないが、重複エントリーが返る可能性がある |

---

## テスト方針

### 手動テスト
- [ ] `TestProjectOmori7.maiml` を使用して、0件フォールバック時にテンプレートが返されることを確認
- [ ] テンプレートの `properties` に正しいプロパティ定義が含まれていることを確認

---

## 承認記録
- **計画書提示日時**: 2026-02-27 22:01
- **承認日時**: 2026-02-27 22:01（ユーザー承認済み）


