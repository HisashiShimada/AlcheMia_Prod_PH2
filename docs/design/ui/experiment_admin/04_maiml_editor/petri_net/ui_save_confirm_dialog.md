# SaveConfirmDialog UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIML保存前の確認ダイアログ。S3またはローカルダウンロードの選択、バリデーション結果表示、自動補正/強制保存の選択機能を提供します。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/SaveConfirmDialog.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| open | boolean | ✓ | Modal表示状態 |
| onClose | () => void | ✓ | Modalを閉じる |
| validationResult | ValidationResult \| null | | バリデーション結果 |
| onSave | (action, destination, folder?) => void | ✓ | 保存処理 |
| sourceFolder | string | | 元フォルダパス |

**action値:**
- 'save': 通常保存
- 'auto-correct': 自動補正して保存
- 'force-save': エラーを無視して強制保存
- 'cancel': キャンセル

**destination値:**
- 's3': S3に保存
- 'download': ローカルダウンロード

---

## 4. レイアウト

```
┌───────────────────────────────────────────┐
│ ⚠️ バリデーションエラー検出        [×]   │
├───────────────────────────────────────────┤
│ ❌ エラー: 2件                            │
│ ⚠️ 警告: 3件                              │
│ 🔧 自動補正可能: 1件                      │
├───────────────────────────────────────────┤
│ ▼ エラー詳細 (上位3件)                    │
│   [エラー内容]                            │
├───────────────────────────────────────────┤
│ 📁 保存先を選択                           │
│ ○ S3に保存  ○ ローカルダウンロード       │
│                                           │
│ 📁 保存先フォルダ:                        │
│ [フォルダツリー表示]                      │
│ ➕ 新規フォルダパスを入力                 │
├───────────────────────────────────────────┤
│ [🔧 自動補正して保存 (推奨)]             │
│ [⚠️ エラーを無視して強制保存]            │
│ [キャンセル]                              │
└───────────────────────────────────────────┘
```

---

## 5. 主要機能

### 5.1. バリデーション結果表示

**エラーあり:**
- Alert type="error"
- エラー/警告/補正可能件数を表示
- Collapseでエラー詳細（上位3件）を表示

**エラーなし:**
- 通常の保存ダイアログ

### 5.2. 保存先選択

**Radio Group:**
- S3に保存
- ローカルダウンロード

### 5.3. S3フォルダ選択

**処理フロー:**
1. API `/api/s3/folders` でフォルダ一覧取得
2. Tree構造で表示
3. フォルダをクリックして選択
4. selectedFolderステートに保存

**デフォルト値:**
- sourceFolderが存在する場合は初期値として設定

**新規フォルダ入力:**
- 「➕ 新規フォルダパスを入力」ボタン
- Inputフィールドで手動入力
- 例: `DEV/MyProject/Data`

### 5.4. 保存アクション

**エラーあり + 自動補正可能:**
- 🔧 自動補正して保存（推奨、type="primary", 緑色）
- ⚠️ エラーを無視して強制保存（danger）
- キャンセル

**エラーなし:**
- 💾 保存（type="primary"）
- キャンセル

**各ボタンにTag表示:**
- `→ S3` または `→ ダウンロード`

---

## 6. 使用しているコンポーネント

### 6.1. Ant Design

| コンポーネント | 使用箇所 |
|--------------|---------|
| Modal | ダイアログコンテナ |
| Alert | バリデーション結果、エラー詳細 |
| Radio.Group | 保存先選択 |
| Tree | S3フォルダ選択 |
| Input | 新規フォルダ入力 |
| Button | アクションボタン |
| Collapse | エラー詳細 |
| Tag | 保存先表示 |
| Space | レイアウト |
| Spin | ローディング |

### 6.2. アイコン

- CloudUploadOutlined: S3保存
- DownloadOutlined: ダウンロード
- WarningOutlined: エラー
- ToolOutlined: 自動補正
- CloseCircleOutlined: キャンセル
- FolderOutlined: フォルダ
- FolderOpenOutlined: 選択フォルダ

---

## 7. State管理

| State変数 | 型 | 説明 |
|----------|---|------|
| saveDestination | 's3' \| 'download' | 保存先 |
| folders | S3Folder[] | フォルダ一覧 |
| selectedFolder | string | 選択中のフォルダパス |
| customFolder | string | 手動入力フォルダ |
| loadingFolders | boolean | フォルダ読み込み中 |
| showCustomFolderInput | boolean | 手動入力表示フラグ |
| treeData | DataNode[] | Treeデータ |
| expandedKeys | React.Key[] | 展開中のTreeキー |

---

## 8. API連携

### 8.1. S3フォルダ一覧取得

**エンドポイント:**
```
GET /api/s3/folders?organizationId={organizationId}
```

**レスポンス:**
```typescript
{
  success: boolean;
  folders: Array<{
    fullPath: string;
    fileCount?: number;
  }>;
}
```

---

## 9. スタイル

**Modal:**
```typescript
{
  width: 700,
}
```

**保存先選択エリア:**
```typescript
{
  padding: 16,
  backgroundColor: '#e6f4ff',
  borderRadius: 8,
  border: '2px solid #1677ff',
}
```

**自動補正ボタン:**
```typescript
{
  backgroundColor: '#52c41a',  // 緑色
}
```

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2026-01-29 | 初版作成（V2） | Development Team |
| 2.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
