# Place Nodes UI仕様書

## 1. 概要

ペトリネットのPlaceノード（Material、Condition、Result）を表示するReact Flowカスタムノードコンポーネント群。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/nodes/MaterialPlaceNode.tsx
frontend/src/components/editorv2/components/nodes/ConditionPlaceNode.tsx
frontend/src/components/editorv2/components/nodes/ResultPlaceNode.tsx
```

---

## 3. 共通Props

| プロパティ名 | 型 | 説明 |
|------------|---|------|
| data | object | ノードデータ |
| data.label | string | ノード名 |
| data.templateId | string | テンプレートID |
| data.tokens | number | トークン数 |
| selected | boolean | 選択状態 |
| isConnectable | boolean | 接続可能フラグ |

---

## 4. ノード種別と表示スタイル

### 4.1. MaterialPlaceNode

**カラー:**
- 背景: `#e3f2fd`（薄い青）
- ボーダー: `#2196f3`（青）

**アイコン:** 🧪

### 4.2. ConditionPlaceNode

**カラー:**
- 背景: `#fff3e0`（薄いオレンジ）
- ボーダー: `#ff9800`（オレンジ）

**アイコン:** ⚙️

### 4.3. ResultPlaceNode

**カラー:**
- 背景: `#e8f5e9`（薄い緑）
- ボーダー: `#4caf50`（緑）

**アイコン:** 📊

---

## 5. 共通機能

### 5.1. ハンドル（接続点）

**Target Handle:**
- position: 'top'
- 入力接続用

**Source Handle:**
- position: 'bottom'
- 出力接続用

### 5.2. 選択状態

**選択時:**
- boxShadow強調
- borderWidth: 3px

---

## 6. レイアウト

```
┌─────────────────────┐
│ 🧪 [Material]       │
│ material_001        │
│ トークン: 1         │
└─────────────────────┘
```

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-23 | editorv2版作成 | Development Team |
| 1.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
