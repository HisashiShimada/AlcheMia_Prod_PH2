# No.7a 実装結果: MAIMLエディタ ノード表示切替ドロップダウン

## 概要

MAIMLエディタ（PetriNetEditorInner）のツールバーに、ペトリネット上の各ノードに表示する属性を切り替えるドロップダウンリストを追加した。

---

## 実装日

2026-03-19

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `frontend/src/contexts/AttributeDisplayContext.tsx` | **新規作成** | 表示属性の Context / Provider / カスタムフック |
| `frontend/src/components/nodes/MaterialTemplateNode.tsx` | 修正 | `useAttributeDisplay` 導入・動的ラベル表示対応 |
| `frontend/src/components/nodes/ConditionTemplateNode.tsx` | 修正 | 同上 |
| `frontend/src/components/nodes/ResultTemplateNode.tsx` | 修正 | 同上 |
| `frontend/src/components/nodes/TransitionNode.tsx` | 修正 | 同上 |
| `frontend/src/components/editorv2/components/EditorToolbar.tsx` | 修正 | ドロップダウンUI追加（ペトリネット/テンプレートトグル直右） |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 修正 | `AttributeDisplayProvider` を `TemplateProvider` 外側にラップ |
| `frontend/src/components/editorv2/components/nodes/` | **フォルダ削除** | 未参照の重複ノードフォルダを削除 |

---

## 実装内容詳細

### 1. AttributeDisplayContext（新規作成）

**ファイル**: `frontend/src/contexts/AttributeDisplayContext.tsx`

- 選択中の表示属性を管理する React Context
- `localStorage` に永続化（ページ再読み込み後も選択状態を維持）
- 選択肢の定数 `ATTRIBUTE_OPTIONS` と表示ラベル `ATTRIBUTE_LABELS` を定義

**選択肢一覧**:

| 値 | 表示ラベル | ノードに表示される内容 |
|---|---|---|
| `node_name`（デフォルト） | ノード名 | `place/transition` の `<name>` テキスト |
| `node_id` | ノードID | `place/transition` の `@id` 属性値 |
| `node_description` | ノードDesc | `place/transition` の `<description>` テキスト |
| `template_id` | テンプレートID | `template` 要素の `@id` 属性値 |
| `template_name` | テンプレート名 | `template` の `<name>` テキスト |
| `template_description` | テンプレートDesc | `template` の `<description>` テキスト |

### 2. ノードコンポーネント修正

**対象ファイル**: `frontend/src/components/nodes/` 配下の4ファイル

各ノードコンポーネントに以下を追加：
- `useAttributeDisplay()` フックで選択状態を取得
- `displayLabel` 変数でスイッチ分岐し表示する値を決定
- ラベル表示部分を `{data.name || data.label || data.id}` から `{displayLabel}` に変更

> **注意**: `PetriNetEditorInner.tsx` が実際に使用しているノードコンポーネントは `src/components/nodes/` 配下（`*TemplateNode.tsx`）であり、`src/components/editorv2/components/nodes/` 配下（`*PlaceNode.tsx`）ではない点に注意。

### 3. EditorToolbar修正

**ファイル**: `frontend/src/components/editorv2/components/EditorToolbar.tsx`

- `useAttributeDisplay()` フックを import
- ペトリネット/テンプレート切替トグル（`Segmented`）の**直右**にドロップダウン（`Select`）を配置
- ペトリネットモード時のみ表示（`viewMode === 'petriNet'` 条件）
- ドロップダウン幅: `160px`（選択肢テキストが見切れない幅）

### 4. PetriNetEditorInner修正

**ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

- `AttributeDisplayProvider` を import
- `TemplateProvider` の外側にラップ（Provider の包含関係）

```tsx
<AttributeDisplayProvider>
  <TemplateProvider ...>
    <PetriNetEditorInnerUI ... />
  </TemplateProvider>
</AttributeDisplayProvider>
```

### 5. 重複フォルダの削除

`frontend/src/components/editorv2/components/nodes/` フォルダを削除。

**削除理由**:
- `PetriNetEditorInner.tsx` は `../nodes/MaterialTemplateNode` 等を import しており、このフォルダは**どこからも参照されていない**（未使用）
- ファイル名も `MaterialPlaceNode.tsx` 等と異なり別物であった
- ノードコンポーネントは `src/components/nodes/` に一本化

---

## ドロップダウン配置位置

```
[ペトリネット | テンプレート] [ノード名 ▼] | Material | Condition | Result | ...
```

ペトリネット/テンプレート切替トグルの直右に配置。テンプレートモードに切り替えた場合はドロップダウンは非表示になる。

---

## 技術的な補足

### Context の伝播経路

```
AttributeDisplayProvider（PetriNetEditorInner最外層）
  └─ TemplateProvider
       └─ PetriNetEditorInnerUI
            ├─ EditorToolbar（ドロップダウンUI）
            └─ ReactFlow
                 ├─ MaterialTemplateNode（ラベル表示）
                 ├─ ConditionTemplateNode（ラベル表示）
                 ├─ ResultTemplateNode（ラベル表示）
                 └─ TransitionNode（ラベル表示）
```

ドロップダウンで選択した値は Context 経由で各ノードコンポーネントにリアルタイムで伝わり、ノードのラベルが即座に切り替わる。

### localStorage キー

```
maiml_editor_attribute_display
```

---

## 対応前後の比較

### 対応前
- ノードには常に `name` フィールドの値のみ表示
- 他の属性（ID、説明、テンプレート情報）を確認するにはノードをクリックしてPropertyPanelを開く必要があった

### 対応後
- ツールバーのドロップダウンで6種類の属性を切り替えて表示可能
- 選択状態はページ再読み込み後も維持される
