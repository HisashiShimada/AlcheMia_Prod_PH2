# No.28 対応結果レポート

## 概要

ReactFlow上の placeノード・transitionノードのテンプレート情報表示における不具合を調査・修正した。

---

## 発覚した問題点と修正内容

### Fix1: `PetriNetViewer.tsx` — placesForSubNet に uuid/description を追加

**問題**: SubNetViewer に渡す `placesForSubNet` に `uuid` / `description` が含まれていなかった。  
**修正**: `buildTemplateMap()` の結果から `uuid` / `description` を取り出して `place.data` に追加。

---

### Fix2: `SubNetViewer.tsx` / `SubNetViewer/index.js` — `templateMap` 参照キーをplaceId優先に変更

**問題**: `buildTemplateMap()` が生成する `templateMap` のキーは **placeId** であるにもかかわらず、SubNetViewer（TypeScript版・reference版 JS版ともに）が **templateId** を優先してアクセスしていた。`placeId ≠ templateId` のケースで `templateMap` がヒットせず、`templateInfo` が `null` のままになる。

```
buildTemplateMap()
  → キーは placeId（placeRef.ref の値）

SubNetViewer（修正前）
  → templateId（place.data.template.id 等）でアクセス → ミスマッチ
  → templateMap[templateId] が undefined → templateInfo = null
  → ノードクリック時に「テンプレート詳細情報が取得できませんでした」が表示される
```

**修正内容**:
- ① `templateMap[place.id]`（placeId）で優先検索
- ② ヒットしない場合は `templateMap[templateId]`（templateId）でフォールバック
- reference版（index.js）では `templateType` の判定もタグ名から行うため、両ルートでタグ名判定ロジックを維持

**修正ファイル**: `SubNetViewer.tsx`（TypeScript版）、`SubNetViewer/index.js`（reference版）

---

### Fix3: `SubNetViewer.tsx` — テンプレート情報取得ロジックを全面修正

**問題**: `extractTemplateInfo()` が存在しておらず、テンプレートプロパティを正しく取得できていなかった。  
**修正**:
- `currentPlaces` を使用するよう修正（複数method対応）
- `extractTemplateInfo()` を新規実装（reference版 `fetchTemplateInfo()` 相当）
  - `uuid` / `description` / `annotation` / `insertion` → 基本情報タブへ
  - `placeRef` → 基本情報タブから除外（内部参照のため非表示）
  - `property` 要素 → `key` + `value` + `xsi:type` + `units` + `description` + `content` で構造化 → テンプレートタブへ

---

### Fix4: `PropertyViewer.tsx` — テンプレートタブの表示形式を改善

**問題**: テンプレートプロパティが `Object` 表示になっており、xsi:type や units が見えなかった。  
**修正**:
- テンプレートタブ専用カラム（キー / xsi:type / 値 / 説明・単位）を追加
- `property_` プレフィックスを除去して表示キーを簡潔化
- `formatKey()` でも `property_*` プレフィックスを除去

---

### Fix5: `PropertyViewerWithSelection.tsx` — Object型の値をフラット展開表示

**問題**: テンプレートプロパティが `[object Object]` として表示されていた。  
**修正**: Object型の値をキー・値ペアに展開して表示。

---

### Fix6: `PetriNetViewer.tsx` — Placeノードクリックでテンプレート要素から直接プロパティ取得

**問題**: `node.data.properties` 参照ではテンプレート詳細情報が取れていなかった。  
**修正**:
- `extractTemplateInfoForNode()` を新規実装（SubNetViewer の `extractTemplateInfo` と同じロジック）
- `templateMap[node.id].element` からXML要素を直接解析してプロパティを取得

---

### Fix7: `PropertyViewerWithSelection.tsx` — テンプレートタブを専用カラム対応

**問題**: PetriNetViewer 側のプロパティ表示コンポーネントが Fix4 と同様の問題を持っていた。  
**修正**: `PropertyViewer.tsx` と同様のテンプレートタブ専用カラムを追加。

---

### Fix8: データタブに MAIML `<data><results>` の実験結果値を表示

**問題**: データタブに座標しか表示されておらず、実験結果値が見られなかった。  
**修正**:

#### Fix8a: `maimlDataExtractor.ts` 新規作成

- `MaimlParserTyped` を使って型安全に解析（DOM直接操作は廃止）
- `MaimlRoot.data.results[].materials/conditions/results` を走査
- `el.ref === templateId` でマッチ（**placeId ではなくテンプレートIDでマッチ**）
- `property` 要素を `DataPropertyObject { key, value, xsiType, units, description }` に変換
- 複数 `<results>` がある場合は最初にマッチした `<results>` のデータのみ返す（reference版と同仕様）

```typescript
export function fetchDataInfoFromMaiml(
  maimlData: string,
  templateId: string,           // ← placeId ではなく templateId
  templateType: 'material' | 'condition' | 'result'
): DataInfo | null
```

#### Fix8b: `SubNetViewer.tsx` のデータタブ設定

- `node.data.template.element.getAttribute('id')` でテンプレートIDを取得
- `fetchDataInfoFromMaiml(maimlData, templateId, type)` を呼び出し

#### Fix8c: `PetriNetViewer.tsx` のデータタブ設定

- `tmplEntry.element.getAttribute('id')` でテンプレートIDを取得
- フォールバック: `node.data.templateId` → `node.data.template?.id` → `node.id`

#### Fix8d: property_* の個別展開表示

- **変更前**: `value: 25.0 | type: realType | units: ℃` を1行結合
- **変更後**: 各フィールドを個別エントリに展開

```
temperature (value)       → 25.0
temperature (type)        → realType
temperature (units)       → ℃
temperature (description) → 温度の説明
```

---

## 修正ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/components/viewer/PetriNetViewer.tsx` | Fix1, Fix6, Fix8c: placesForSubNet追加, テンプレート取得修正, データタブ設定 |
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | Fix2, Fix3, Fix8b: templateMapキー不一致修正（placeId優先）, extractTemplateInfo新実装, データタブ設定 |
| `frontend/src/reference/components/SubNetViewer/index.js` | Fix2: templateMapキー不一致修正（placeId優先, タグ名判定維持） |
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | Fix4: テンプレートタブ専用カラム, property_プレフィックス除去 |
| `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` | Fix5, Fix7: Object展開表示, テンプレートタブ専用カラム |
| `frontend/src/utils/maimlDataExtractor.ts` | Fix8a: 新規作成（MaimlParserTypedベース, templateIdマッチ） |

---

## 技術的補足

### data.results.*.ref はテンプレートIDを指す

MAIMLの `<data>` セクション構造：

```xml
<data id="data_001">
  <results id="results_001">
    <material ref="mat_template_001">   ← ref はテンプレートID（placeID ではない）
      <property key="temperature">
        <value>25.0</value>
      </property>
    </material>
  </results>
</data>
```

- `ref` 属性は `<materialTemplate id="mat_template_001">` の `id` を指す
- placeID（例: `place_001`）ではないため、`templateMap[placeId].element.getAttribute('id')` でテンプレートIDを取得してからマッチする必要がある

---

## 動作確認ポイント

1. **テンプレートタブ**: property要素がキー / xsi:type / 値 / 説明・単位 の列で表示される
2. **基本情報タブ**: placeRef が表示されない（内部参照のため非表示）
3. **データタブ**: `<data><results>` の実験結果値が個別フィールドに展開されて表示される
4. **Transitionノード**: 入力テンプレートの表示が正しく行われる（Fix3の修正による）

---

**対応日**: 2026-03-27  
**対応者**: Cline
