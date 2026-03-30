# 実施結果: MAIMLエディタ XMLビュー機能追加

## メタデータ
- **実施日時**: 2026-03-30
- **タスクID**: maiml-editor-xml-view
- **ステータス**: 完了

---

## 実施内容サマリー

PLAN.md に従い、MAIMLエディタへの XMLビュー機能追加を全フェーズ実施した。

---

## 成果物一覧

### (A) エディタ全体のXMLビュー

| ファイル | 種別 | 内容 |
|---|---|---|
| `frontend/src/components/editorv2/components/XMLViewer.tsx` | 新規作成 | XMLビューアコンポーネント（JS→TS移植、シンタックスハイライト付き） |
| `frontend/src/components/editorv2/components/XMLViewer.css` | 新規作成 | XMLビューアスタイル（reference版からコピー） |
| `frontend/src/components/editorv2/components/XMLViewerWrapper.tsx` | 新規作成 | 非同期XML生成ラッパー（JSX→TSX移植、@mui/material → Ant Design `Spin` に置き換え） |
| `frontend/src/components/editorv2/components/EditorToolbar.tsx` | 修正 | `viewMode` 型を `'petriNet' \| 'templates' \| 'xml'` に変更、Segmented に「XMLビュー」ボタン追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 修正 | `viewMode` State/UI に `'xml'` を追加、`viewMode === 'xml'` 時に `XMLViewerWrapper` を表示 |
| `frontend/src/components/editorv2/components/index.ts` | 修正 | `XMLViewer` / `XMLViewerWrapper` のエクスポートを追加 |

### (B) TemplateEditorDialog のXMLビュー

| ファイル | 種別 | 内容 |
|---|---|---|
| `frontend/src/components/editorv2/utils/converters/templateToXML.ts` | 新規作成 | テンプレートXML変換ユーティリティ（JS→TS移植、型定義追加） |
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | 修正 | 「UI編集」「XMLビュー」Tabsを追加、双方向同期・バリデーション・保存対応を実装 |
| `frontend/src/components/editorv2/utils/converters/index.ts` | 修正 | `templateToXML` のエクスポートを追加 |

---

## 型定義の整理（追加対応）

実装後のレビューで独自型定義を既存型で置き換えた。

| 変更前（独自型） | 変更後（既存型） |
|---|---|
| `interface HashData { method?; value? }` | 削除 → `Hash`（`@/types/maiml-unified`）を使用 |
| `interface InsertionData { uri?; hash?; format? }` | 削除 → `Insertion`（`@/types/maiml-unified`）を使用 |
| `interface NestedPropertyData { ... }` | `type NestedPropertyData = PropertyData`（`NestedPropertyEditor.tsx`）に変更 |
| `interface NestedContentData { ... }` | `type NestedContentData = PropertyData`（`NestedPropertyEditor.tsx`）に変更 |

### `TemplateEditorData` の `Template` 型への置き換え可否

`TemplateEditorData` は `Template`（maiml-unified）への単純置き換えは**不可**と判断し現状維持とした。

理由は以下の通り：

| フィールド | Template | TemplateEditorData | 理由 |
|---|---|---|---|
| `properties` | `Property[]`（MaiML配列） | `Record<string, PropertyData>`（UI辞書） | 構造が根本的に異なる |
| `contents` | `Content[]`（MaiML配列） | `Record<string, PropertyData>`（UI辞書） | 同上 |
| `placeRefs` | `PlaceRef[]`（オブジェクト配列） | `string[]`（文字列配列） | 型が異なる |
| `templateRef` | `Reference`（オブジェクト） | `href: string`（`#id`文字列） | 表現形式が異なる |
| 必須/任意 | id/uuid/category が必須 | すべてオプショナル | 編集中の未入力状態を許容するため |

`TemplateEditorData` は UI 編集中の中間状態を表す型であり、`Template` は MaiML の確定済みデータ構造のため、設計上同一型にすることはできない。

---

## 実装のポイント

### XMLViewerWrapper の変換処理
- `convertReactFlowToMaiML` / `convertMultipleMethodsToMaiML` を `editorv2/utils/converters/` からインポート
- `useEffect` 内で非同期変換を実施し、変換中は Ant Design の `Spin` でローディング表示

### TemplateEditorDialog のタブ切り替え同期
- **UI → XML**: タブ切り替え時に `convertTemplateToXML` で現在のUI Stateを XML 文字列に変換
- **XML → UI**: XMLタブからUIタブへ戻る際、変更がある場合は `parseXMLToTemplate` でパースして UI State を更新
- **保存**: XMLビューから保存時は `validateTemplateXML` でバリデーション後に `parseXMLToTemplate` で State を同期してから保存処理を実行

### insertion.hash のオブジェクト対応
- `insertion.hash` は `{ method?: string; value?: string }` のオブジェクト形式（`Hash` 型）に対応
- XML出力時は `method` 属性付き `<hash method="sha256">...</hash>` 形式で出力

---

## ビルド確認

```
✓ Compiled successfully in 11.3s
Running TypeScript ...
✓ Generating static pages (4/4) in 744.0ms
```

TypeScript エラーなし、ビルド成功。
