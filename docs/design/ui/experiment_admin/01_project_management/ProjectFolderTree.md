# ProjectFolderTree - プロジェクトフォルダツリー

## 1. 概要

### 1.1 コンポーネントの目的
プロジェクト一覧を左側サイドバーに表示するコンポーネント。プロジェクトの選択、ソート、基本情報の表示を提供します。

### 1.2 使用場面
- プロジェクト管理画面の左側サイドバー
- プロジェクトの選択とナビゲーション

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────┐
│ プロジェクト         [↓]   │ ← ヘッダー
│ 15 プロジェクト             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ ■ プロジェクト名         │ │ ← 選択中（ハイライト）
│ │ [ステータス] 10 ファイル │ │
│ │ 所有者: 田中太郎         │ │
│ │ 研究開発部 | 2024/01/15  │ │
│ └─────────────────────────┘ │
│                             │
│ □ プロジェクト名2           │
│ [ステータス] 5 ファイル     │
│ 所有者: 佐藤花子            │
│ 材料開発部 | 2024/02/20     │
│                             │
│ （以下、プロジェクト繰り返し）│
└─────────────────────────────┘
```

**サイドバー特性:**
- 背景色: コンテナ背景色
- 右ボーダー: 1px セカンダリボーダー色
- スクロール: 縦スクロール自動

### 2.2 主要UI要素

#### 2.2.1 ヘッダー

**左側:**
- タイトル: "プロジェクト"（強調テキスト）
- プロジェクト数: "15 プロジェクト"（セカンダリテキスト）

**右側:**
- ソートボタン（ドロップダウン）

#### 2.2.2 プロジェクトアイテム

各プロジェクトアイテムの構成:
```
┌─────────────────────────┐
│ プロジェクト名           │ ← 強調テキスト（選択時）
│ [ステータスタグ] 件数    │ ← Tag + セカンダリテキスト
│ 所有者: 名前             │ ← セカンダリテキスト
│ 部署 | 作成日            │ ← セカンダリテキスト
└─────────────────────────┘
```

**選択状態の表示:**
- 背景色: プライマリ背景色
- 左ボーダー: 3px プライマリカラー
- テキスト: 強調（strong）

---

## 3. 機能仕様

### 3.1 プロジェクト選択

#### 3.1.1 選択フロー
```typescript
const handleProjectSelect = (projectId: string) => {
  onProjectSelect(projectId);  // 親コンポーネントへ通知
};
```

**動作:**
- プロジェクトアイテムをクリック
- 選択状態が視覚的に表示される
- 親コンポーネントへプロジェクトIDを通知

#### 3.1.2 選択状態の表示
```typescript
<List.Item
  style={{
    backgroundColor: selectedProjectId === project.id 
      ? token.colorPrimaryBg 
      : 'transparent',
    borderLeft: selectedProjectId === project.id 
      ? `3px solid ${token.colorPrimary}` 
      : '3px solid transparent',
  }}
>
```

### 3.2 ソート機能

#### 3.2.1 ソート項目

| ソート項目 | 説明 | キー |
|-----------|------|------|
| 名前順 | プロジェクト名でソート | `name` |
| ステータス順 | ステータスでソート | `status` |
| 作成日順 | 作成日でソート | `createdAt` |

#### 3.2.2 ソート順
- 昇順（asc）: SortAscendingOutlined アイコン
- 降順（desc）: SortDescendingOutlined アイコン

#### 3.2.3 ソート変更
```typescript
const handleSortChange = (sortBy: 'name' | 'status' | 'createdAt') => {
  onSortChange(sortBy);  // 親コンポーネントへ通知
};
```

**動作:**
- ソートメニューから項目を選択
- 親コンポーネントでソート処理を実行
- 同じ項目を再選択すると、昇順/降順が切り替わる

#### 3.2.4 ソートメニューの表示
```typescript
const menuItems: MenuProps['items'] = [
  {
    key: 'name',
    label: (
      <Space>
        <span>{t('projectManagement.folder_tree.sort.name')}</span>
        {sortBy === 'name' && (
          sortOrder === 'asc' 
            ? <SortAscendingOutlined /> 
            : <SortDescendingOutlined />
        )}
      </Space>
    ),
    onClick: () => onSortChange('name'),
  },
  // status, createdAt も同様
];
```

### 3.3 ステータス表示

#### 3.3.1 ステータスタグの色マッピング
```typescript
const getStatusChipColor = (status: string) => {
  const colors = {
    planning: 'default',     // グレー
    pending: 'info',         // 情報色
    in_progress: 'primary',  // プライマリ → cyan
    completed: 'success',    // 成功色
  };
  return colors[status] || 'default';
};
```

**注意:** `primary`は実際には`cyan`に変換されます。

#### 3.3.2 ステータスラベルの変換
```typescript
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'planning': return t('projectManagement.status_planning');
    case 'pending': return t('projectManagement.status_pending');
    case 'in_progress': return t('projectManagement.status_in_progress');
    case 'review_waiting': return t('projectManagement.status_review_waiting');
    case 'completed': return t('projectManagement.status_completed');
    case 'error': return t('projectManagement.status_error');
    default: return status;
  }
};
```

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface ProjectFolderTreeProps {
  projects: Project[];                                // プロジェクト一覧
  selectedProjectId: string | null;                   // 選択中のプロジェクトID
  onProjectSelect: (projectId: string) => void;       // プロジェクト選択ハンドラ
  expandedFolders: Set<string>;                       // 展開済みフォルダ（将来用）
  onToggleFolder: (folderId: string) => void;         // フォルダ展開ハンドラ（将来用）
  sortBy: 'name' | 'status' | 'createdAt';           // ソート項目
  sortOrder: 'asc' | 'desc';                          // ソート順
  onSortChange: (sortBy: 'name' | 'status' | 'createdAt') => void; // ソート変更ハンドラ
}
```

### 4.2 Project型定義

```typescript
interface Project {
  id: string;              // プロジェクトID
  name: string;            // プロジェクト名
  folderName: string;      // フォルダ名
  fileCount: number;       // ファイル数
  status: string;          // ステータス
  department: string;      // 部署ID
  departmentName?: string; // 部署名（オプショナル）
  owner: string;           // 所有者ID
  ownerName?: string;      // 所有者名（オプショナル）
  createdAt: string;       // 作成日（ISO 8601）
}
```

---

## 5. UI/UXポリシー準拠

### 5.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| 一覧表示 | List | dataSource, renderItem |
| リストアイテム | List.Item | onClick, style |
| テキスト | Typography.Text | strong, type="secondary" |
| タグ | Tag | color, style |
| スペース | Space | size="small", wrap |
| ボタン | Button | type="text", size="small", icon |
| ドロップダウン | Dropdown | menu, placement |

### 5.2 デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
backgroundColor: token.colorBgContainer
borderColor: token.colorBorderSecondary
padding: token.margin
fontSize: token.fontSize
```

**主要なトークン:**
- `colorBgContainer` - コンテナ背景色
- `colorBorderSecondary` - セカンダリボーダー色
- `colorPrimaryBg` - プライマリ背景色（選択時）
- `colorPrimary` - プライマリカラー（選択ボーダー）
- `margin` - マージン
- `paddingSM` - 小パディング
- `fontSize` - 標準フォントサイズ
- `fontSizeSM` - 小フォントサイズ

### 5.3 スタイリング

#### 5.3.1 サイドバー全体
```typescript
<div
  style={{
    height: '100%',
    backgroundColor: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
    overflowY: 'auto',
  }}
>
```

#### 5.3.2 ヘッダー
```typescript
<div
  style={{
    padding: token.margin,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  }}
>
```

#### 5.3.3 プロジェクトアイテム
```typescript
<List.Item
  style={{
    padding: `${token.paddingSM}px ${token.margin}px`,
    cursor: 'pointer',
    backgroundColor: selectedProjectId === project.id 
      ? token.colorPrimaryBg 
      : 'transparent',
    borderLeft: selectedProjectId === project.id 
      ? `3px solid ${token.colorPrimary}` 
      : '3px solid transparent',
  }}
>
```

---

## 6. 多言語対応

### 6.1 翻訳キー

```typescript
// タイトル・ラベル
t('projectManagement.folder_tree.title')              // "プロジェクト"
t('projectManagement.folder_tree.projects')           // "プロジェクト"
t('projectManagement.folder_tree.files')              // "ファイル"
t('projectManagement.folder_tree.owner')              // "所有者"

// ソート項目
t('projectManagement.folder_tree.sort.name')          // "名前順"
t('projectManagement.folder_tree.sort.status')        // "ステータス順"
t('projectManagement.folder_tree.sort.created_at')    // "作成日順"

// ステータス
t('projectManagement.status_planning')                // "計画中"
t('projectManagement.status_pending')                 // "実行待ち"
t('projectManagement.status_in_progress')             // "実行中"
t('projectManagement.status_review_waiting')          // "レビュー待ち"
t('projectManagement.status_completed')               // "完了"
t('projectManagement.status_error')                   // "エラー"
```

---

## 7. インタラクション

### 7.1 ホバー効果
- 現在未実装
- 将来的には背景色の変更等を追加予定

### 7.2 クリック操作
- プロジェクトアイテム全体がクリッカブル
- クリック時にプロジェクトを選択

### 7.3 キーボード操作
- 現在未実装
- 将来的には上下キーでナビゲーション可能にする予定

---

## 8. パフォーマンス考慮

### 8.1 仮想スクロール
- 現在未実装
- プロジェクト数が多い場合（100件以上）は仮想スクロールを検討

### 8.2 メモ化
- 現在未実装
- ステータスラベル等の変換処理をメモ化することで最適化可能

---

## 9. 実装ファイル

### 9.1 ファイルパス
```
frontend/src/components/project/ProjectFolderTree.tsx
```

### 9.2 依存コンポーネント
- なし（単独で動作）

### 9.3 依存ライブラリ
- antd: List, Typography, Tag, Dropdown, Space, Button, theme
- @ant-design/icons: SortAscendingOutlined, SortDescendingOutlined
- React: FC型

---

## 10. 既知の課題・TODO

### 10.1 既知の課題
- フォルダ展開機能が未実装（expandedFolders, onToggleFolderは将来用）
- ホバー効果なし
- キーボードナビゲーションなし

### 10.2 将来の改善案
- [ ] フォルダ階層表示機能
- [ ] ホバー時の背景色変更
- [ ] キーボードナビゲーション（上下キー）
- [ ] プロジェクトのドラッグ&ドロップ
- [ ] コンテキストメニュー（右クリック）
- [ ] 検索フィルター機能（サイドバー内検索）
- [ ] 仮想スクロール（大量データ対応）
- [ ] プロジェクトのお気に入り機能
- [ ] 最近使用したプロジェクトのハイライト

---

## 11. テスト観点

### 11.1 単体テスト
- [ ] プロジェクト選択が正しく動作する
- [ ] 選択状態が正しく表示される
- [ ] ステータスタグの色が正しい
- [ ] ステータスラベルが正しく変換される
- [ ] ソートメニューが正しく表示される
- [ ] ソートアイコンが正しく表示される

### 11.2 統合テスト
- [ ] 親コンポーネントへのイベント通知
- [ ] プロジェクトデータの受け取り
- [ ] ソート状態の連動

### 11.3 E2Eテスト
- [ ] プロジェクト選択から詳細表示
- [ ] ソート操作
- [ ] スクロール動作

---

## 12. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-01-21 | 1.0.0 | 初版作成 | Cline |

---

## 13. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [UIポリシー](.clinerules/references/ui_policy.md) - UI設計ルール
- [フロントエンド規約](.clinerules/development/frontend.md) - コンポーネント記述規約
