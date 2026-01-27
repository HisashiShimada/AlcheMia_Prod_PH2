# FormatFolderTree UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

フォーマット一覧を表示するツリーコンポーネント。XML/MAIMLフォーマットの選択とソート機能を提供します。

### 1.2. 使用場面

- FormatManagement画面の左側パネル
- フォーマット一覧の表示と選択
- カテゴリ、ファイルタイプ、ファイル数などのメタ情報表示

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須（親コンポーネントで制御）
- **テナント分離**: organization_id によるマルチテナント分離（親コンポーネントで制御）

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────┐
│ ヘッダー                         │
│ ┌─────────────────────────────┐ │
│ │ フォーマット一覧        [≡]  │ │
│ │ {count} フォーマット         │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ フォーマット1                    │
│ ├ XML | プロトコル              │
│ ├ 5 ファイル                    │
│ ├ 部門: 研究開発部              │
│ └ 更新: 2026/01/15             │
├─────────────────────────────────┤
│ フォーマット2 (選択中)           │
│ ├ MAIML | 材料                  │
│ ├ 8 ファイル                    │
│ ├ 部門: 品質管理部              │
│ └ 更新: 2026/01/20             │
├─────────────────────────────────┤
│ ...                             │
└─────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダーエリア

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| タイトル | Text (strong) | 「フォーマット一覧」 |
| カウント表示 | Text (secondary) | 「{count} フォーマット」 |
| ソートボタン | Button + Dropdown | ソートメニューを開く |

#### 2.2.2. フォーマットリストアイテム

各フォーマットアイテムには以下の情報を表示：

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| フォーマット名 | Text (strong) | メイン表示テキスト |
| ファイルタイプタグ | Tag | XML（シアン）、MAIML（パープル） |
| カテゴリタグ | Tag | カテゴリに応じた色分け |
| ファイル数 | Text (secondary) | 「{count} ファイル」 |
| 部門 | Text (secondary) | 「部門: {department}」 |
| 更新日 | Text (secondary) | 「更新: {date}」（日本語形式） |

### 2.3. 画面遷移

- 画面遷移なし（選択状態の変更のみ）
- 親コンポーネント（FormatManagement）のコールバックを呼び出す

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. フォーマット一覧の表示

**処理フロー:**
1. 親コンポーネントからformatsを受け取る
2. List.Itemで各フォーマットをレンダリング
3. カテゴリに応じたタグ色を適用
4. 選択されたフォーマットをハイライト表示

**表示情報:**
- フォーマット名（太字）
- ファイルタイプタグ（XML/MAIML）
- カテゴリタグ（色分け）
- ファイル数
- 部門
- 更新日（日本語形式）

#### 3.1.2. フォーマット選択

**処理フロー:**
1. ユーザーがリストアイテムをクリック
2. onFormatSelect(formatId)コールバックを呼び出し
3. 親コンポーネントでselectedFormatIdが更新される
4. 選択されたアイテムが視覚的にハイライト表示される

**ハイライト表示:**
- 背景色: token.colorPrimaryBg
- 左ボーダー: 3px solid token.colorPrimary
- テキスト: 太字（strong）

#### 3.1.3. ソート機能

**処理フロー:**
1. ヘッダーのソートボタンをクリック
2. Dropdownメニューを表示
3. ソート項目を選択
4. onSortChange(sortBy)コールバックを呼び出し
5. 親コンポーネントでソート処理が実行される

**ソート項目:**
- フォーマット名（name）
- カテゴリ（category）
- 更新日（updatedAt）

**ソート順序:**
- 同じ項目を選択 → 昇順/降順を切り替え
- 異なる項目を選択 → 昇順でソート

**ソートアイコン表示:**
- 昇順: SortAscendingOutlined
- 降順: SortDescendingOutlined
- 現在のソート項目のみアイコン表示

#### 3.1.4. カテゴリタグの色分け

| カテゴリ | 色 | 表示名 |
|---------|---|--------|
| protocol | cyan | プロトコル |
| material | success (green) | 材料 |
| measurement | blue | 測定 |
| analysis | orange | 解析 |
| sample | purple | 試料 |
| device | red | 装置 |
| その他 | default | カテゴリ値をそのまま表示 |

#### 3.1.5. ファイルタイプタグの色分け

| ファイルタイプ | 色 | 表示 |
|--------------|---|------|
| xml | cyan | XML |
| maiml | purple | MAIML |

### 3.2. ボタン・操作の動作

| 操作 | 動作 | コールバック |
|------|------|------------|
| フォーマットアイテムをクリック | フォーマットを選択 | onFormatSelect(formatId) |
| ソートボタンをクリック | ソートメニューを開く | - |
| ソート項目を選択 | ソート条件を変更 | onSortChange(sortBy) |

### 3.3. バリデーションルール

- バリデーションなし（表示のみ）

---

## 4. データ仕様

### 4.1. 入力項目（Props）

```typescript
interface FormatFolderTreeProps {
  formats: Format[];                     // フォーマット一覧
  selectedFormatId: string | null;       // 選択中のフォーマットID
  onFormatSelect: (formatId: string) => void;  // 選択時のコールバック
  sortBy: 'name' | 'category' | 'updatedAt';  // ソート項目
  sortOrder: 'asc' | 'desc';            // ソート順序
  onSortChange: (sortBy: 'name' | 'category' | 'updatedAt') => void;  // ソート変更コールバック
}
```

### 4.2. Format型定義

```typescript
interface Format {
  id: string;               // フォーマットID
  name: string;             // フォーマット名
  folderName: string;       // フォルダ名
  description: string;      // 説明
  fileCount: number;        // ファイル数
  fileType: 'xml' | 'maiml'; // ファイルタイプ
  category: string;         // カテゴリ
  department: string;       // 部門
  createdAt: string;        // 作成日時
  updatedAt: string;        // 更新日時
  tags: string[];           // タグ
}
```

### 4.3. 出力項目

- なし（コールバック経由で親コンポーネントに通知）

---

## 5. API連携

### 5.1. 使用するAPI一覧

- なし（親コンポーネントからデータを受け取る）

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 |
|------------|------|
| formats配列が空 | 空のリストを表示（エラーメッセージなし） |
| 無効なフォーマットデータ | コンソールエラーログ（実装は親コンポーネント） |

### 6.2. エラーメッセージ

- エラーメッセージなし（表示専用コンポーネント）

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| List | フォーマット一覧 | dataSource, renderItem |
| List.Item | 各フォーマットアイテム | onClick, style |
| Typography.Text | テキスト表示 | strong, type="secondary" |
| Tag | ファイルタイプ、カテゴリ | color |
| Button | ソートボタン | type="text", icon, size="small" |
| Dropdown | ソートメニュー | menu, placement="bottomRight" |
| Space | アイテム内の要素配置 | size="small", wrap |

### 7.2. デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
backgroundColor: token.colorBgContainer
borderRight: `1px solid ${token.colorBorderSecondary}`
borderBottom: `1px solid ${token.colorBorderSecondary}`
padding: token.margin
paddingSM: token.paddingSM
marginXS: token.marginXS
fontSize: token.fontSize
fontSizeSM: token.fontSizeSM
colorPrimaryBg: token.colorPrimaryBg  // 選択時の背景色
colorPrimary: token.colorPrimary      // 選択時のボーダー色
```

### 7.3. レスポンシブ対応

- 親コンポーネント（FormatManagement）で幅を制御
- 縦スクロールで全アイテムを表示可能

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/FormatFolderTree.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| FormatManagement | ./FormatManagement.tsx | 親コンポーネント |

### 8.3. カスタムフック

- なし

### 8.4. ユーティリティ

| 関数 | 役割 |
|------|------|
| getCategoryTagColor | カテゴリに応じたタグの色を返す |
| getCategoryLabel | カテゴリの表示名（日本語）を返す |

---

## 9. 既知の課題・TODO

### 改善提案

- [ ] フォーマット数が多い場合の仮想スクロール対応（現在は全て表示）
- [ ] フォーマット検索機能の追加（リスト内フィルタリング）
- [ ] フォルダ階層の表示（現在はフラットなリスト）
- [ ] ドラッグ&ドロップでのソート順変更
- [ ] カテゴリグループ化表示（折りたたみ可能）
- [ ] お気に入り機能の追加

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
