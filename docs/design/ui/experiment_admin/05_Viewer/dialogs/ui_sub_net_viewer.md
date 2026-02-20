# SubNetViewer UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

トランジションノードのサブネット（接続されたPlace群とアーク）をReact Flowで表示するビューアー。左ペインでサブネット図、右ペインでプロパティ詳細を表示します。

---

## 2. ファイルパス

```
frontend/src/components/viewer/dialogs/SubNetViewer.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| open | boolean | ✓ | 表示状態 |
| nodeName | string | ✓ | トランジション名 |
| maimlData | string | ✓ | MAIMLデータ |
| templateMap | Record<string, {element}> | ✓ | テンプレートマップ |
| petriNetData | object | ✓ | ペトリネットデータ（places, arcs） |
| onClose | () => void | ✓ | 閉じる処理 |
| arcsData | Array | | 複数methodモード用アークデータ |
| placesData | Array | | 複数methodモード用プレースデータ |
| multiMethodMode | boolean | | 複数methodモードフラグ |

---

## 4. レイアウト

```
┌─────────────────────────────────────────────────────┐
│ [🔄] [ℹ️]                                    (右上) │
├───────────────────────┬─────────────────────────────┤
│ React Flow            │ PropertyViewer             │
│ サブネット図          │ (ノード選択時表示)         │
│                       │                             │
│ ┌─────┐    ┌─────┐  │ 基本情報                    │
│ │Material│──│Trans││  - ID: xxx                  │
│ └─────┘    └─────┘  │  - Type: Material           │
│      ↓               │                             │
│ ┌─────┐             │ テンプレート                │
│ │Result │             │ - name: ...                 │
│ └─────┘             │ - value: ...                │
│                       │                             │
│ [MiniMap]            │ [閉じる]                    │
│ [Controls]           │                             │
└───────────────────────┴─────────────────────────────┘
```

---

## 5. 主要機能

### 5.1. サブネット抽出

**処理フロー:**
1. トランジション名でアークをフィルタリング
2. 接続されたPlace IDを収集
3. Place情報とテンプレート情報を結合
4. convertSubnetToReactFlow()でReact Flow形式に変換

### 5.2. ノードクリック

**処理フロー:**
1. ノードクリック → selectedNodeに設定
2. テンプレート情報を抽出（extractTemplateProperties）
3. 構造化プロパティを作成
4. 右ペインを開いてPropertyViewerに表示

**抽出されるプロパティ:**
- basic: id, type, name
- template: テンプレート固有のプロパティ
- data: 座標等

### 5.3. ビューリセット

**機能:**
- 右ペインを閉じる
- 選択ノードをクリア
- ビューポートをリセット

---

## 6. State管理

| State | 型 | 説明 |
|------|---|------|
| nodes | Node[] | React Flowノード配列 |
| edges | Edge[] | React Flowエッジ配列 |
| loading | boolean | 読み込み中フラグ |
| error | string \| null | エラーメッセージ |
| subnetData | SubnetData \| null | サブネット情報 |
| rightPanelOpen | boolean | 右ペイン表示フラグ |
| selectedNode | Node \| null | 選択中のノード |
| selectedNodeId | string \| null | 選択中のノードID |
| structuredProperties | object | 構造化プロパティ |

---

## 7. 使用コンポーネント

### 7.1. React Flow

- ReactFlow（メイン）
- MiniMap（ミニマップ）
- Controls（ズーム・パン操作）
- Background（背景グリッド）
- ReactFlowProvider（コンテキスト提供）

### 7.2. カスタムノード

- MaterialTemplateNode
- ConditionTemplateNode
- ResultTemplateNode
- TransitionNode

### 7.3. 内部コンポーネント

- PropertyViewer（右ペイン）

### 7.4. Ant Design

- Button, Space, Flex, Spin, Alert, Typography, Tooltip

---

## 8. ユーティリティ

### 8.1. convertSubnetToReactFlow()

サブネットデータをReact Flow形式に変換。

**入力:** SubnetData
**出力:** { nodes, edges }

### 8.2. extractTemplateProperties()

テンプレート要素からプロパティを抽出。

**処理:**
- 属性をプロパティに変換
- 子要素を解析
- 数値・Boolean変換
- 配列化（同名タグが複数ある場合）

---

## 9. 複数methodモード

**props:**
- `multiMethodMode`: true
- `arcsData`: 特定メソッドのアーク配列
- `placesData`: 特定メソッドのプレース配列

**動作:**
- multiMethodMode=trueの場合、arcsDataとplacesDataを優先使用
- petriNetDataの代わりに指定されたデータでサブネット構築

---

## 10. スタイル

**左ペイン:**
- flex: 60%（右ペイン開）
- flex: 100%（右ペイン閉）
- transition: 0.3s ease

**右ペイン:**
- flex: 40%
- borderLeft: 1px solid

**ツールバー:**
- position: absolute
- top: 10px, right: 10px
- z-index: 10
- 半透明背景

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-01-29 | 非Modal版、複数methodモード対応 | Development Team |
| 1.0.0 | 2026-02-19 | UI仕様書作成 | Cline |
