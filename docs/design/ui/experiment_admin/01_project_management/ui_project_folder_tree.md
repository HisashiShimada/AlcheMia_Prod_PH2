# プロジェクトフォルダツリー UI仕様書

## 1. 概要

### 1.1 コンポーネントの目的
プロジェクトフォルダツリーは、プロジェクト管理画面の左側サイドバーに表示され、プロジェクト一覧をリスト形式で表示するコンポーネントです。ソート機能、プロジェクト選択、ステータス表示などの機能を提供します。

### 1.2 使用場面
- プロジェクト管理画面の左側パネル（幅35%）
- プロジェクト一覧の閲覧・選択
- ソート順序の変更

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: JWT + Session Hybrid認証
- **組織分離**: マルチテナント（organizationId）

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────┐
│ ヘッダー                            │
│ [プロジェクト一覧] [件数] [ソート] │
├─────────────────────────────────────┤
│ プロジェクトA                       │
│ ├ [ステータスタグ] [ファイル数]    │
│ ├ 所有者: user-01                   │
│ └ 研究開発部 | 2026/03/01          │
├─────────────────────────────────────┤
│ プロジェクトB (選択中)              │
│ ├ [ステータスタグ] [ファイル数]    │
│ ├ 所有者: user-02                   │
│ └ 製造部 | 2026/02/28               │
├─────────────────────────────────────┤
│ プロジェクトC                       │
│ ├ [ステータスタグ] [ファイル数]    │
│ ├ 所有者: user-03                   │
│ └ 品質管理部 | 2026/03/05           │
└─────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 ヘッダー
- **タイトル**（Text strong）: "プロジェクト一覧"（多言語対応）
- **件数表示**（Text secondary）: "{件数} プロジェクト"
- **ソートボタン**（Button + Dropdown）: ソートメニューを開く

#### 2.2.2 ソートドロップダウンメニュー
- **名前でソート**: 昇順/降順アイコン表示
- **ステータスでソート**: 昇順/降順アイコン表示
- **作成日時でソート**: 昇順/降順アイコン表示

#### 2.2.3 プロジェクトアイテム
各プロジェクトは以下の情報を表示：
- **プロジェクト名**（Text, 選択時はstrong）
- **ステータスタグ**（Tag）: 色分けされたステータス表示
- **ファイル数**（Text secondary）: "{件数} ファイル"
- **所有者**（Text secondary）: "所有者: {所有者名}"
- **部門・作成日時**（Text secondary）: "{部門名} | {作成日}"

### 2.3 UI状態

#### 2.3.1 通常状態
- 背景色: `token.colorBgContainer`
- 左ボーダー: 3px透明

#### 2.3.2 選択状態
- 背景色: `token.colorPrimaryBg`（プライマリ背景色）
- 左ボーダー: 3px `token.colorPrimary`（プライマリカラー）
- プロジェクト名が太字表示

#### 2.3.3 ホバー状態
- カーソル: pointer

---

## 3. 機能仕様

### 3.1 プロジェクト一覧表示

#### 3.1.1 表示内容
```typescript
{projects.map((project) => (
  <div key={project.id} onClick={() => onProjectSelect(project.id)}>
    <Text strong={selectedProjectId === project.id}>
      {project.name}
    </Text>
    <Space size="small" wrap>
      <Tag color={getStatusChipColor(project.status)}>
        {project.statusName}
      </Tag>
      <Text type="secondary">
        {project.fileCount} ファイル
      </Text>
    </Space>
    <Text type="secondary">
      所有者: {project.ownerName || project.owner}
    </Text>
    <Text type="secondary">
      {project.departmentName || project.department} | {new Date(project.createdAt).toLocaleDateString('ja-JP')}
    </Text>
  </div>
))}
```

#### 3.1.2 ステータスタグの色分け
```typescript
const getStatusChipColor = (status: number): string => {
  switch (status) {
    case 0: return 'default';  // プロジェクト計画中
    case 1: return 'info';     // タスク実行待ち
    case 2: return 'primary';  // タスク実行中（cyan表示）
    case 3: return 'warning';  // 承認待ち
    case 4: return 'success';  // プロジェクト完了
    case 5: return 'error';    // タスク異常終了
    default: return 'default';
  }
};
```

**ステータス対応表:**
| status | statusName | Tag色 | 説明 |
|--------|-----------|-------|------|
| 0 | プロジェクト計画中 | default（灰色） | 初期状態 |
| 1 | タスク実行待ち | info（青色） | チェックアウト可能 |
| 2 | タスク実行中 | cyan（シアン） | チェックアウト中 |
| 3 | 承認待ち | warning（オレンジ） | レビュー待ち |
| 4 | プロジェクト完了 | success（緑色） | 全タスク完了 |
| 5 | タスク異常終了 | error（赤色） | エラー発生 |

### 3.2 プロジェクト選択

#### 3.2.1 処理フロー
```typescript
onClick={() => onProjectSelect(project.id)}
```

#### 3.2.2 UI動作
- プロジェクトアイテムをクリック
- 親コンポーネント（ProjectManagement）の`handleProjectSelect`を呼び出し
- 選択されたプロジェクトの背景色と左ボーダーが変化
- プロジェクト名が太字になる

### 3.3 ソート機能

#### 3.3.1 ソートメニュー
```typescript
const menuItems: MenuProps['items'] = [
  {
    key: 'name',
    label: (
      <Space>
        <span>名前でソート</span>
        {sortBy === 'name' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
      </Space>
    ),
    onClick: () => onSortChange('name'),
  },
  {
    key: 'status',
    label: (
      <Space>
        <span>ステータスでソート</span>
        {sortBy === 'status' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
      </Space>
    ),
    onClick: () => onSortChange('status'),
  },
  {
    key: 'createdAt',
    label: (
      <Space>
        <span>作成日時でソート</span>
        {sortBy === 'createdAt' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
      </Space>
    ),
    onClick: () => onSortChange('createdAt'),
  },
];
```

#### 3.3.2 ソート処理
- ソートメニュー項目をクリック
- 親コンポーネント（ProjectManagement）の`handleSortChange`を呼び出し
- 同じ項目をクリックした場合は昇順/降順を反転
- 異なる項目をクリックした場合は降順でソート
- メニューに現在のソート順序のアイコンを表示

#### 3.3.3 ソート項目
| ソート項目 | ソート対象 | 説明 |
|-----------|-----------|------|
| name | プロジェクト名 | アルファベット順/逆順 |
| status | ステータス番号 | 数値順/逆順（0-5） |
| createdAt | 作成日時 | 日時順/逆順 |

### 3.4 多言語対応

#### 3.4.1 翻訳キー
```typescript
const { t } = useLanguage();

// ヘッダー
t('projectManagement.folder_tree.title')          // "プロジェクト一覧"
t('projectManagement.folder_tree.projects')       // "プロジェクト"
t('projectManagement.folder_tree.files')          // "ファイル"
t('projectManagement.folder_tree.owner')          // "所有者"

// ソート
t('projectManagement.folder_tree.sort.name')      // "名前でソート"
t('projectManagement.folder_tree.sort.status')    // "ステータスでソート"
t('projectManagement.folder_tree.sort.created_at') // "作成日時でソート"
```

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface ProjectFolderTreeProps {
  /** 表示するプロジェクト一覧 */
  projects: Project[];
  /** 選択中のプロジェクトID */
  selectedProjectId: string | null;
  /** プロジェクト選択時のコールバック */
  onProjectSelect: (projectId: string) => void;
  /** 展開中のフォルダIDのセット（現在未使用） */
  expandedFolders: Set<string>;
  /** フォルダの展開/折りたたみコールバック（現在未使用） */
  onToggleFolder: (folderId: string) => void;
  /** ソート項目 */
  sortBy: 'name' | 'status' | 'createdAt';
  /** ソート順序 */
  sortOrder: 'asc' | 'desc';
  /** ソート変更時のコールバック */
  onSortChange: (sortBy: 'name' | 'status' | 'createdAt') => void;
}
```

**Props説明:**
| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| projects | `Project[]` | ✅ | 表示するプロジェクト一覧（フィルタ済み・ソート済み） |
| selectedProjectId | `string \| null` | ✅ | 選択中のプロジェクトID。nullの場合は未選択 |
| onProjectSelect | `(projectId: string) => void` | ✅ | プロジェクト選択時のコールバック |
| expandedFolders | `Set<string>` | ✅ | 展開中のフォルダIDのセット（現在未使用、将来の拡張用） |
| onToggleFolder | `(folderId: string) => void` | ✅ | フォルダの展開/折りたたみコールバック（現在未使用） |
| sortBy | `'name' \| 'status' \| 'createdAt'` | ✅ | 現在のソート項目 |
| sortOrder | `'asc' \| 'desc'` | ✅ | 現在のソート順序 |
| onSortChange | `(sortBy: 'name' \| 'status' \| 'createdAt') => void` | ✅ | ソート変更時のコールバック |

### 4.2 Project型定義

```typescript
interface Project {
  id: string;                    // プロジェクトID（UUID）
  name: string;                  // プロジェクト名
  folderName: string;            // フォルダ名
  description: string;           // 説明
  owner: string;                 // 所有者ID
  ownerName?: string;            // 所有者名（表示用）
  department: string;            // 部門コード
  departmentName?: string;       // 部門名（表示用）
  status: number;                // ステータス番号（0-5）
  statusName?: string;           // ステータス名（表示用）
  isCheckedOut: boolean;         // チェックアウト中かどうか
  fileCount: number;             // ファイル数
  tags: string[];                // タグ
  createdAt: string;             // 作成日時（ISO8601形式）
  updatedAt: string;             // 更新日時（ISO8601形式）
}
```

### 4.3 Context連携

```typescript
// LanguageContext
const { t } = useLanguage();

// Ant Design Theme
const { token } = theme.useToken();
```

---

## 5. API連携

### 5.1 使用するAPI

このコンポーネントは直接APIを呼び出しません。親コンポーネント（ProjectManagement）から渡されたプロジェクト一覧を表示します。

**データソース:**
- `ProjectManagement`コンポーネントが`getProjects()` APIで取得したデータ
- フィルタリング・ソート済みのデータを受け取る

---

## 6. エラーハンドリング

### 6.1 エラーケース一覧

このコンポーネントは表示専用のため、特別なエラーハンドリングは実装されていません。

**考慮事項:**
- プロジェクト一覧が空の場合: 空のリストを表示（"0 プロジェクト"と表示される）
- 選択プロジェクトが見つからない場合: 選択状態なしで表示

---

## 7. 実装ファイル

### 7.1 メインファイル
- **パス**: `frontend/src/components/project/ProjectFolderTree.tsx`
- **行数**: 約170行
- **エクスポート**: `ProjectFolderTree`（default export）

### 7.2 関連ファイル

#### 7.2.1 型定義
- `frontend/src/types/project.ts` - Project型

#### 7.2.2 Context
- `frontend/src/contexts/LanguageContext.tsx` - 多言語対応

### 7.3 依存ライブラリ
- React 18.2.0
- Ant Design v6 (Typography, Tag, Dropdown, Space, Button, theme)
- @ant-design/icons (SortAscendingOutlined, SortDescendingOutlined, SortAscendingOutlined as SortIcon)

---

## 8. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 実装ベースで仕様書を再作成 | Cline |

---

## 9. 補足事項

### 9.1 スタイリング

#### 9.1.1 コンテナ
```typescript
style={{
  height: '100%',
  backgroundColor: token.colorBgContainer,
  borderRight: `1px solid ${token.colorBorderSecondary}`,
  overflowY: 'auto',
}}
```

#### 9.1.2 ヘッダー
```typescript
style={{
  padding: token.margin,
  borderBottom: `1px solid ${token.colorBorderSecondary}`,
}}
```

#### 9.1.3 プロジェクトアイテム（通常）
```typescript
style={{
  padding: `${token.paddingSM}px ${token.margin}px`,
  cursor: 'pointer',
  backgroundColor: 'transparent',
  borderLeft: '3px solid transparent',
}}
```

#### 9.1.4 プロジェクトアイテム（選択時）
```typescript
style={{
  padding: `${token.paddingSM}px ${token.margin}px`,
  cursor: 'pointer',
  backgroundColor: token.colorPrimaryBg,
  borderLeft: `3px solid ${token.colorPrimary}`,
}}
```

### 9.2 日付フォーマット

```typescript
new Date(project.createdAt).toLocaleDateString('ja-JP')
```

**出力例:**
- `2026/03/01`
- `2026/03/11`

### 9.3 所有者・部門名の表示優先順位

```typescript
project.ownerName || project.owner          // 所有者名があれば使用、なければID
project.departmentName || project.department // 部門名があれば使用、なければコード
```

### 9.4 未使用のProps

**expandedFolders, onToggleFolder:**
- 現在のリスト表示では使用されていない
- 将来的にツリー表示（階層構造）に拡張する際に使用予定
- 親コンポーネントから渡されているが、現時点では機能していない

### 9.5 レスポンシブ対応

- `overflowY: 'auto'`: 縦スクロールを有効化
- `height: '100%'`: 親コンテナの高さに合わせる
- プロジェクト数が多い場合はスクロール可能

### 9.6 アクセシビリティ

- クリック可能要素に`cursor: 'pointer'`を設定
- 選択状態を視覚的に明確に表示（背景色・左ボーダー・太字）
- ソートアイコンで現在のソート状態を表示

### 9.7 パフォーマンス考慮事項

- プロジェクト一覧のフィルタリング・ソートは親コンポーネントで実施
- このコンポーネントは表示専用（純粋なプレゼンテーションコンポーネント）
- 再レンダリング時にもパフォーマンス問題なし（軽量な表示処理のみ）
