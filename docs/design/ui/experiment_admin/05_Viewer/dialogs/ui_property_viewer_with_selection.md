# PropertyViewerWithSelection UI仕様書

## 1. 概要

PropertyViewer + StructuredPropertySelectorを統合したコンポーネント。ノード選択とプロパティ表示を一体化。

---

## 2. ファイルパス

```
frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| selectedNode | Node \| null | ✓ | 選択中のノード |
| structuredProperties | object | ✓ | 構造化プロパティ |
| onClose | () => void | ✓ | 閉じる処理 |
| maimlData | string | | MAIMLデータ |
| templateMap | Record<string, {element}> | | テンプレートマップ |

---

## 4. 主要機能

### 4.1. ノード情報表示

**表示内容:**
- ノード名
- ノードタイプ
- 基本プロパティ

### 4.2. プロパティ選択

**処理:**
- StructuredPropertySelectorで階層表示
- クリックで詳細表示

---

## 5. 使用コンポーネント

- PropertyViewer
- StructuredPropertySelector

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-19 | 初版作成 | Development Team |
| 1.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
