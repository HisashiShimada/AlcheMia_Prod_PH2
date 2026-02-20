# MethodTabPanel UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイル内の複数Methodを切り替えるタブパネル。Method追加、MethodID編集、Method削除の機能を提供します。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/MethodTabPanel.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| methods | MethodData[] | ✓ | Method配列 |
| activeMethodIndex | number | ✓ | アクティブなMethodのindex |
| onChange | (index: number) => void | ✓ | タブ切り替え |
| onAddMethod | () => void | ✓ | Method追加 |
| onEditMethodId | (index, newId) => void | ✓ | MethodID編集 |
| onDeleteMethod | (index) => void | ✓ | Method削除 |

---

## 4. レイアウト

```
┌──────────────────────────────────────────────────┐
│ [Method_A (5) ✎ ✕] [Method_B (3) ✎ ✕] [+]      │
└──────────────────────────────────────────────────┘
```

**各タブの構成:**
- MethodID（クリックで切り替え）
- ノード数バッジ（nodes.length）
- 編集ボタン（EditOutlined）
- 削除ボタン（CloseOutlined）

---

## 5. 主要機能

### 5.1. タブ切り替え

**処理フロー:**
1. タブをクリック
2. onChange(index)を実行

### 5.2. Method追加

**処理フロー:**
1. +ボタンをクリック
2. onAddMethod()を実行
3. 新Method追加（デフォルトID: `Method_${count+1}`）

### 5.3. MethodID編集

**処理フロー:**
1. 編集ボタン（Edit）をクリック
2. stopPropagation()でタブ切り替えを防止
3. MethodID編集ダイアログ表示
4. バリデーション（空白チェック、重複チェック）
5. onEditMethodId(index, newMethodId)実行

**バリデーション:**
- 必須: 空白不可
- ユニーク: 重複不可

### 5.4. Method削除

**処理フロー:**
1. 削除ボタン（X）をクリック
2. stopPropagation()でタブ切り替えを防止
3. 確認ダイアログ表示
4. onDeleteMethod(index)実行

**制約:**
- 最後の1つは削除不可

---

## 6. 使用しているコンポーネント

### 6.1. Ant Design

| コンポーネント | 使用箇所 |
|--------------|---------|
| Tabs | タブコンテナ |
| Badge | ノード数表示 |
| Button | 編集・削除・追加ボタン |
| Modal | 編集・削除確認ダイアログ |
| Input | MethodID入力 |
| Space | ボタン配置 |

### 6.2. アイコン

- EditOutlined: 編集ボタン
- CloseOutlined: 削除ボタン
- PlusOutlined: 追加ボタン

---

## 7. スタイル

**コンテナ:**
```typescript
{
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: '#fff',
  padding: '0 16px',
}
```

**タブアイテム:**
```typescript
{
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 2.1.0 | 2026-02-19 | 最新ソース（editorv2）に基づいて更新 | Cline |
