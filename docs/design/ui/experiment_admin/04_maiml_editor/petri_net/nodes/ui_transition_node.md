# TransitionNode UI仕様書

## 1. 概要

ペトリネットのTransitionノード（遷移）を表示するReact Flowカスタムノードコンポーネント。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/nodes/TransitionNode.tsx
```

---

## 3. Props

| プロパティ名 | 型 | 説明 |
|------------|---|------|
| data | object | ノードデータ |
| data.label | string | ノード名 |
| data.type | string | 遷移タイプ |
| selected | boolean | 選択状態 |
| isConnectable | boolean | 接続可能フラグ |

---

## 4. 表示スタイル

**形状:** 長方形（横向き）

**カラー:**
- 背景: `#fff`（白）
- ボーダー: `#333`（黒）

**アイコン:** ⚡

---

## 5. ハンドル

**Target Handle:**
- position: 'left'
- 入力接続用（Placeから）

**Source Handle:**
- position: 'right'
- 出力接続用（Placeへ）

---

## 6. レイアウト

```
┌──────────────┐
│ ⚡ transition │
│   _001       │
└──────────────┘
```

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-23 | editorv2版作成 | Development Team |
| 1.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
