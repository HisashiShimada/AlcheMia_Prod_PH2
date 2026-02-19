# MultiObjectEditor UI仕様書

## 1. 概要

Creator、Vendor、Owner、Instrumentなどの複数オブジェクトを編集するコンポーネント。追加/削除/並び替え、UUID自動生成、参照プロパティ対応。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/MultiObjectEditor.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| objectKey | 'creators' \| 'vendors' \| 'owners' \| 'instruments' | ✓ | オブジェクト種別 |
| title | string | ✓ | タイトル |
| icon | ReactNode | ✓ | アイコン |
| includeReferences | boolean | | 参照プロパティ表示 |
| initialData | DocumentTagData[] | ✓ | 初期データ |
| onDataChange | (key, data) => void | ✓ | データ変更 |
| minItems | number | | 最小件数（デフォルト:1） |
| isExpanded | boolean | ✓ | 展開状態 |
| onToggleExpanded | (key) => void | ✓ | 展開切替 |
| vendorIds | string[] | | Vendor ID一覧 |
| instrumentIds | string[] | | Instrument ID一覧 |
| masterData | DocumentTagData[] | ✓ | マスタデータ |

---

## 4. 主要機能

### 4.1. マスタデータから追加

**処理:**
- Selectでマスタアイテム選択
- 「追加」ボタンで配列に追加
- fromMaster=trueをマーク（編集不可）

### 4.2. 空のオブジェクト追加

**処理:**
- 「空の〇〇を追加」ボタン
- デフォルト値で新規オブジェクト作成

### 4.3. UUID自動生成

**処理:**
- [🔄]ボタンでUUID v4生成

### 4.4. 参照プロパティ

**対応:**
- vendorRef (CreatorでVendor参照)
- instrumentRef (CreatorでInstrument参照)

### 4.5. 並び替え

**処理:**
- [↑][↓]ボタンで順序変更

---

## 5. 使用コンポーネント

- Collapse, Panel
- Input, TextArea, Select
- Button, Space, Tag, Alert
- Typography

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2026-02-02 | TypeScript + Ant Design版 | Development Team |
| 2.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
