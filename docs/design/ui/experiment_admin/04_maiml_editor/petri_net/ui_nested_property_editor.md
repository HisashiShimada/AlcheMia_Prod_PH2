# NestedPropertyEditor UI仕様書

## 1. 概要

ネストされた構造化プロパティ（オブジェクト、配列、プリミティブ）を再帰的に編集するコンポーネント。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/NestedPropertyEditor.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| propertyKey | string | ✓ | プロパティキー |
| propertyValue | any | ✓ | プロパティ値 |
| depth | number | ✓ | ネストの深さ |
| onUpdate | (key, value) => void | ✓ | 値更新 |
| onDelete | (key) => void | ✓ | プロパティ削除 |
| readOnly | boolean | | 読み取り専用 |

---

## 4. 主要機能

### 4.1. 型判定と表示

**対応型:**
- プリミティブ（string, number, boolean）
- オブジェクト
- 配列
- null/undefined

### 4.2. 再帰的編集

**処理:**
- オブジェクト/配列は再帰的にネスト表示
- インデント表示で階層を視覚化

### 4.3. 値の編集

**編集方法:**
- string: Input
- number: InputNumber
- boolean: Checkbox
- オブジェクト/配列: 子要素を展開

---

## 5. 使用コンポーネント

- Input, InputNumber, Checkbox
- Collapse, Panel
- Button, Space, Typography

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-16 | 初版作成 | Development Team |
| 1.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
