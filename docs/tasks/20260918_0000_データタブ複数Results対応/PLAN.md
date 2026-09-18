# タスク計画書: データタブ複数Results対応

## メタデータ
- **作成日時**: 2026-09-18
- **タスクID**: 20260918_0000
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

MAIMLの `<data><results>` はテンプレート1件に対してN件の実績（Results）が存在するが、
現状のデータ取得処理（`maimlDataExtractor.ts`）と表示処理（`PropertyViewer.tsx`）が
1件目のResultsしか扱えない設計になっている。

これを修正し、**テンプレートタブと同じ列構成（キー / xsi:type / 値 / 説明・単位）**で、
**Resultsの件数分（N件）をそれぞれグループ表示**できるようにする。

---

## 目的と期待される成果

- [ ] 1件目のResultsのみ表示される不具合を解消する
- [ ] N件分のResultsを「Results #1 (id: xxx)」「Results #2 (id: yyy)」のようにグループ分けして表示する
- [ ] 各Resultsグループ内のプロパティをテンプレートタブと同等の列（キー / xsi:type / 値 / 説明・単位）で表示する
- [ ] `PropertyViewer.tsx` の変更に合わせて `PropertyViewerWithSelection.tsx` も同様に修正する
- [ ] `PetriNetViewer.tsx` と `SubNetViewer.tsx` のデータ変換ロジックも対応させる

---

## 影響範囲の分析

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `frontend/src/utils/maimlDataExtractor.ts` | 変更 | 複数Results対応の新型・新関数を追加 |
| `frontend/src/types/editor.ts` | 変更 | `DataResultsGroup` / `StructuredProperties.data` 型拡張 |
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | 変更 | データタブ表示をN件グループ対応に修正 |
| `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` | 変更 | 同上（PropertyViewerと同様の修正） |
| `frontend/src/components/viewer/PetriNetViewer.tsx` | 変更 | dataInfo変換ロジックをN件対応に変更 |
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | 変更 | 同上（PetriNetViewerと同様の修正） |

---

## 実装ステップ詳細

### Step 1: 型定義の変更（`editor.ts` + `maimlDataExtractor.ts`）

#### 1-1. `maimlDataExtractor.ts` に新型と新関数を追加

**新しい型定義:**

```typescript
/** 1件のResultsグループ内の1プロパティ */
export interface DataPropertyObject {
  key: string;
  value?: string;
  xsiType?: string;
  units?: string;
  description?: string;
}

/** 1件のResultsグループ */
export interface DataResultsGroup {
  resultsId: string;
  resultsUuid?: string;
  resultsName?: string;
  resultsDescription?: string;
  elementUuid?: string;
  elementDescription?: string;
  properties: DataPropertyObject[];
}
```

**新しい関数 `fetchAllDataInfoFromMaiml()`:**
- 戻り値を `DataResultsGroup[]`（N件配列）に変更
- `for (const results of resultsList)` ループで **全件** を収集して配列で返す
- 既存の `fetchDataInfoFromMaiml()` は後方互換のため残す（内部で新関数を呼ぶように変更）

#### 1-2. `editor.ts` の `StructuredProperties.data` 型を拡張

```typescript
export interface StructuredProperties {
  basic: Record<string, PropertyObject>;
  template: Record<string, PropertyObject>;
  data: Record<string, PropertyObject>;        // 後方互換のため残す（Transitionノード等に使用）
  dataGroups?: DataResultsGroup[];             // 新規: N件Results対応（Placeノードで使用）
}
```

`DataResultsGroup` は `maimlDataExtractor.ts` の型を `editor.ts` にも export するか、または `maimlDataExtractor.ts` の型を `editor.ts` から再 export する。

---

### Step 2: `PetriNetViewer.tsx` / `SubNetViewer.tsx` の変換ロジック変更

現在の処理:
```typescript
const dataInfo = fetchDataInfoFromMaiml(...);  // DataInfo | null（1件）
// → dataProperties: Record<string, PropertyObject> に変換 → data に設定
```

変更後:
```typescript
const dataGroups = fetchAllDataInfoFromMaiml(...);  // DataResultsGroup[]（N件）
// → setStructuredProperties({ ..., data: {}, dataGroups }) に変更
```

---

### Step 3: `PropertyViewer.tsx` データタブの表示変更

現在:
- `structuredProperties.data` を単純なキー/値2列テーブルで表示

変更後:
- `structuredProperties.dataGroups` が存在する場合: N件Resultsをグループ分け表示
  - 各グループのヘッダー: `Results #1 (id: xxx, uuid: yyy)` のようなラベル
  - 各グループ内: テンプレートタブと同等の列（キー / xsi:type / 値 / 説明・単位）の Table
- `dataGroups` が存在しない / 空の場合: 「表示するプロパティがありません」

```tsx
// データタブの描画イメージ
<div>
  {/* Results #1 */}
  <Divider orientation="left">Results #1 <small>(id: r1, uuid: ...)</small></Divider>
  <Table columns={dataColumns} dataSource={group1Data} />
  
  {/* Results #2 */}
  <Divider orientation="left">Results #2 <small>(id: r2, uuid: ...)</small></Divider>
  <Table columns={dataColumns} dataSource={group2Data} />
</div>
```

**データタブ用カラム定義（テンプレートタブと同等）:**

| カラム | 内容 |
|--------|------|
| キー | `DataPropertyObject.key` |
| xsi:type | `DataPropertyObject.xsiType` |
| 値 | `DataPropertyObject.value` |
| 説明/単位 | `DataPropertyObject.description` + `DataPropertyObject.units` |

---

### Step 4: `PropertyViewerWithSelection.tsx` も同様に修正

PropertyViewerWithSelection.tsx のデータタブも PropertyViewer.tsx と同じ修正を適用する。

---

### Step 5: 動作確認

- ブラウザで PropertyViewer のデータタブを開き、Results N件が正しく表示されることを確認
- Results が 0 件の場合に「表示するプロパティがありません」が表示されることを確認
- テンプレートタブの表示に変化がないことを確認

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `StructuredProperties` 型変更による他コンポーネントへの影響 | 中 | 中 | `dataGroups` をオプショナル（`?`）で追加し後方互換を維持 |
| `fetchDataInfoFromMaiml` の廃止による呼び出し元の影響 | 中 | 低 | 既存関数を残し、内部実装のみ変更する |
| PropertyViewerWithSelection.tsx の対応漏れ | 低 | 中 | 修正対象ファイルに明示的に含める |

---

## テスト計画

### 手動テスト
- [ ] MAIMLファイルにResults N件（2件以上）存在する場合のデータタブ表示確認
- [ ] MAIMLファイルにResults 1件のみの場合のデータタブ表示確認
- [ ] MAIMLファイルにDataセクションが存在しない場合の表示確認
- [ ] テンプレートタブの表示が変化していないことを確認
- [ ] SubNetViewer（サブネット）でも同様に表示されることを確認

### ビルド確認
- [ ] TypeScript コンパイルエラーなし

---

## 変更ファイル一覧

1. `frontend/src/utils/maimlDataExtractor.ts` - `DataResultsGroup` 型追加・`fetchAllDataInfoFromMaiml()` 新関数追加
2. `frontend/src/types/editor.ts` - `StructuredProperties.dataGroups?: DataResultsGroup[]` 追加
3. `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` - データタブをN件グループ表示に変更
4. `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` - 同上
5. `frontend/src/components/viewer/PetriNetViewer.tsx` - `fetchAllDataInfoFromMaiml()` 使用に変更
6. `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` - 同上

---

## 承認記録

- **計画書提示日時**: 2026-09-18
- **承認日時**: 2026-09-18
- **承認者コメント**: レイアウトは特に違和感がないので修正を開始してほしい

## 実施記録

### 実施日時
開始: 2026-09-18  
完了: 2026-09-18  

### 最終的な成果物

- [x] `frontend/src/utils/maimlDataExtractor.ts` — `DataResultsGroup` 型・`fetchAllDataInfoFromMaiml()` 追加、旧 `fetchDataInfoFromMaiml` を後方互換ラッパーに変更
- [x] `frontend/src/types/editor.ts` — `StructuredProperties.dataGroups` をオプショナルで追加
- [x] `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` — データタブをN件グループ表示・テンプレートタブ同等4列テーブルに変更
- [x] `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` — 同上
- [x] `frontend/src/components/viewer/PetriNetViewer.tsx` — `fetchAllDataInfoFromMaiml()` 使用・dataGroups に変更
- [x] `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` — 同上
- [x] `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx` — `keyof StructuredProperties` 型依存を `'basic'|'template'|'data'` に変更（dataGroups 追加に伴う型整合性対応）
- [x] TypeScript コンパイルエラー 0件・Next.js ビルド成功確認

---

## 追加修正記録（別件バグ修正）

### 実施日時
開始: 2026-09-18  
完了: 2026-09-18  

### 概要
`PetriNetViewer.tsx` でノードクリック時に `node.data.templateType` を参照していたが、
`reactFlowConverter.ts` は `placeType` にのみカテゴリ（material/condition/result）を設定しており、
`templateType` は常に `undefined` となっていた。
フォールバックの `'material'` が使われることで、condition/result ノードの実績データが取得できなかった。

### 修正内容

**`frontend/src/components/viewer/PetriNetViewer.tsx`（3箇所）**

| 行 | 修正前 | 修正後 |
|----|--------|--------|
| 342行目 | `node.data.templateType \|\| 'material'` | `node.data.placeType \|\| 'material'` |
| 350行目 | `node.data.templateType \|\| 'material'` | `node.data.placeType \|\| 'material'` |
| 364行目 | `node.data.templateType \|\| 'material'` | `node.data.placeType \|\| 'material'` |

### 根本原因
- `reactFlowConverter.ts`（146行目）: `nodeData.placeType = template?.category || 'material'` と設定
- `NodeData` 型（`editor.ts`）に `templateType` プロパティは存在しない（`placeType` のみ存在）
- `SubNetViewer.tsx` は `subnetReactFlowConverter.ts` が `node.data.templateType` を明示的にセットするため問題なし

- [x] TypeScript コンパイルエラー 0件確認
