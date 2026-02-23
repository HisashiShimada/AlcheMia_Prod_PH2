# ProjectDetailModal - プロジェクト詳細モーダル

## 1. 概要

### 1.1 コンポーネントの目的
選択したプロジェクトの詳細情報を表示するモーダルダイアログ。プロジェクトのメタデータ、統計情報、ファイル一覧を一目で確認できます。

### 1.2 使用場面
- プロジェクト管理画面で「詳細」ボタンをクリックした際に表示（現在は未実装）
- プロジェクトの概要を素早く確認したい場合

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ [プロジェクト名]  [ステータスタグ]    [×]          │ ← ヘッダー
│ 📁 [フォルダ名]                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ■ プロジェクト情報                                  │
│                                                     │
│ [プロジェクト概要テキスト]                          │
│                                                     │
│ ┌──────────────┬──────────────┐                   │
│ │ 所有者       │ メンバー     │                   │
│ │ 👥 田中太郎  │ 田中, 佐藤   │                   │
│ ├──────────────┼──────────────┤                   │
│ │ ファイル数   │ ストレージ   │                   │
│ │ 📄 15 ファイル│ 💾 10.5 MB  │                   │
│ ├──────────────┼──────────────┤                   │
│ │ 作成日       │ 最終更新日   │                   │
│ │ 📅 2日前     │ 📅 1時間前   │                   │
│ └──────────────┴──────────────┘                   │
│                                                     │
│ タグ                                                │
│ [実験] [分析] [材料]                                │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│                                                     │
│ ■ ファイル一覧 (15)                                │
│                                                     │
│ [FileListTable コンポーネント]                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                     [閉じる] [プロジェクトを開く]   │ ← フッター
└─────────────────────────────────────────────────────┘
```

**モーダルサイズ:**
- 幅: 1000px
- 高さ: 最大90vh - 200px（スクロール可能）
- 位置: top: 40px

### 2.2 主要UI要素

#### 2.2.1 ヘッダー
**左側:**
- プロジェクト名（Title level 4）
- ステータスタグ（Tag - 色はステータスにより変動）
- フォルダ名（Text secondary + アイコン）

**右側:**
- 閉じるボタン（×）

#### 2.2.2 プロジェクト情報セクション

**A. プロジェクト概要**
- プロジェクトの説明文（Text secondary）

**B. 詳細情報グリッド（2列 × 3行）**
| 左列 | 右列 |
|------|------|
| 所有者 | メンバー |
| ファイル数 | ストレージ使用量 |
| 作成日 | 最終更新日 |

各項目:
- ラベル（Text secondary, fontSize: 12）
- 値（Text + アイコン）

**C. タグ**
- タグ一覧（Tag コンポーネント、wrap表示）

#### 2.2.3 ファイル一覧セクション
- タイトル: "ファイル一覧 (件数)"
- `<FileListTable />` コンポーネント

#### 2.2.4 フッターボタン
- 閉じるボタン（デフォルト）
- プロジェクトを開くボタン（プライマリ）

---

## 3. 機能仕様

### 3.1 初期表示

#### 3.1.1 表示データ
モーダル表示時、以下のデータを整形して表示:
- プロジェクト基本情報（名前、ステータス、フォルダ名、概要）
- 統計情報（ファイル数、ストレージ使用量）
- メタデータ（所有者、メンバー、作成日、更新日、タグ）
- ファイル一覧

### 3.2 ステータス表示

#### 3.2.1 ステータスタグの色マッピング
```typescript
const getStatusTagColor = (status: string): string => {
  const colors: Record<string, string> = {
    planning: 'default',      // グレー
    pending: 'blue',          // 青
    in_progress: 'cyan',      // シアン
    completed: 'success',     // 緑
  };
  return colors[status] || 'default';
};
```

#### 3.2.2 ステータステキストの変換
```typescript
const statusText = formatProjectStatus(project.status);
```

**formatProjectStatus関数:**
- `planning` → "計画中"
- `pending` → "実行待ち"
- `in_progress` → "実行中"
- `review_waiting` → "レビュー待ち"
- `completed` → "完了"
- `error` → "エラー"

### 3.3 日時表示

#### 3.3.1 相対時刻フォーマット
```typescript
formatRelativeTime(project.createdAt)
```

**表示例:**
- 1分以内 → "たった今"
- 1時間以内 → "30分前"
- 1日以内 → "5時間前"
- 1週間以内 → "3日前"
- それ以降 → "2週間前"

### 3.4 ファイルサイズ表示

#### 3.4.1 ファイルサイズフォーマット
```typescript
formatFileSize(project.totalSize)
```

**表示例:**
- 1024 bytes → "1 KB"
- 1048576 bytes → "1 MB"
- 1073741824 bytes → "1 GB"

### 3.5 ボタン操作

#### 3.5.1 閉じるボタン
```typescript
<Button key="close" onClick={onClose}>
  閉じる
</Button>
```

**動作:**
- モーダルを閉じる
- 親コンポーネントの`onClose`ハンドラを呼び出し

#### 3.5.2 プロジェクトを開くボタン
```typescript
<Button key="open" type="primary" onClick={() => console.log('Open project')}>
  プロジェクトを開く
</Button>
```

**動作:**
- 現在は未実装（console.log出力のみ）
- 将来的にはMAIML編集画面へ遷移

### 3.6 ファイル一覧表示

#### 3.6.1 FileListTable統合
```typescript
<FileListTable
  files={files}
  onFileClick={(file) => console.log('File clicked:', file.name)}
/>
```

**表示内容:**
- ファイル名、サイズ、最終更新日、チェックアウト状態等
- 詳細は`FileListTable.md`を参照

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface ProjectDetailModalProps {
  open: boolean;                // モーダル表示状態
  onClose: () => void;          // 閉じるハンドラ
  project: Project | null;      // プロジェクト情報
  files: FileData[];            // ファイル一覧
}
```

### 4.2 Project型定義

```typescript
interface Project {
  id: string;              // プロジェクトID
  name: string;            // プロジェクト名
  folderName: string;      // フォルダ名
  description: string;     // 概要
  status: string;          // ステータス
  fileCount: number;       // ファイル数
  totalSize: number;       // 合計サイズ（バイト）
  createdAt: string;       // 作成日時（ISO 8601）
  updatedAt: string;       // 更新日時（ISO 8601）
  owner: string;           // 所有者
  members: string[];       // メンバーリスト
  tags: string[];          // タグリスト
}
```

### 4.3 FileData型定義

```typescript
interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isCheckedOut: boolean;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
}
```

---

## 5. API連携

### 5.1 使用するAPI
このコンポーネント自体はAPIを直接呼び出しません。

### 5.2 親コンポーネントからのデータ供給
- プロジェクト情報: `ProjectManagement`から渡される
- ファイル一覧: `ProjectManagement`の`projectFiles`から渡される

---

## 6. ユーティリティ関数

### 6.1 使用するフォーマッター

```typescript
import {
  formatFileSize,
  formatRelativeTime,
  formatProjectStatus,
  getStatusColor
} from '@/utils/formatters';
```

#### 6.1.1 formatFileSize
```typescript
formatFileSize(bytes: number): string
```
バイト数を人間が読みやすい形式に変換（KB, MB, GB）

#### 6.1.2 formatRelativeTime
```typescript
formatRelativeTime(dateString: string): string
```
ISO 8601日時文字列を相対時刻に変換（"2日前"等）

#### 6.1.3 formatProjectStatus
```typescript
formatProjectStatus(status: string): string
```
ステータスコードを日本語表示名に変換

#### 6.1.4 getStatusColor
```typescript
getStatusColor(status: string): string
```
ステータスに対応する色を返す

---

## 7. UI/UXポリシー準拠

### 7.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| モーダル | Modal | width=1000, style.top=40 |
| タイトル | Typography.Title | level=4, level=5 |
| テキスト | Typography.Text | type="secondary" |
| タグ | Tag | color（動的） |
| アイコン | Icon | style.color |
| グリッド | Row, Col | gutter=[16, 16] |
| スペース | Space | size="small", "middle" |
| 区切り線 | Divider | margin="24px 0" |

### 7.2 レスポンシブグリッド

```typescript
<Row gutter={[16, 16]}>
  <Col span={12}>  {/* 左列 */}
    ...
  </Col>
  <Col span={12}>  {/* 右列 */}
    ...
  </Col>
</Row>
```

**デザイン:**
- 2列グリッド（各span=12）
- gutter: 16px（横・縦）
- モバイル対応（必要に応じてspan調整）

### 7.3 アイコンの使用

| 用途 | アイコン | 色 |
|------|---------|-----|
| フォルダ | FolderOutlined | #757575 |
| チーム | TeamOutlined | #757575 |
| ファイル | FileTextOutlined | #757575 |
| ストレージ | HddOutlined | #757575 |
| カレンダー | CalendarOutlined | #757575 |
| 閉じる | CloseOutlined | デフォルト |

---

## 8. 実装ファイル

### 8.1 ファイルパス
```
frontend/src/components/project/ProjectDetailModal.tsx
```

### 8.2 依存コンポーネント
- `FileListTable` - ファイル一覧テーブル

### 8.3 依存ライブラリ
- antd: Modal, Typography, Tag, Divider, Space, Row, Col, Button
- @ant-design/icons: 各種アイコン
- React: FC型

### 8.4 依存ユーティリティ
- `@/utils/formatters` - フォーマッター関数群

---

## 9. スタイリング

### 9.1 モーダルスタイル

```typescript
<Modal
  width={1000}
  style={{ top: 40 }}
  bodyStyle={{
    maxHeight: 'calc(90vh - 200px)',
    overflowY: 'auto'
  }}
>
```

**特徴:**
- 固定幅: 1000px
- 上部余白: 40px
- ボディ最大高さ: 90vh - 200px
- 縦スクロール: 自動

### 9.2 情報グリッドスタイル

```typescript
<Text
  type="secondary"
  style={{
    display: 'block',
    marginBottom: 4,
    fontSize: 12
  }}
>
```

**ラベルスタイル:**
- タイプ: secondary
- 表示: block
- 下余白: 4px
- フォントサイズ: 12px

---

## 10. エラーハンドリング

### 10.1 Nullチェック

```typescript
if (!project) return null;
```

**動作:**
- `project`がnullの場合、何も表示しない
- モーダルがopenでもprojectがnullなら非表示

### 10.2 デフォルト値

```typescript
const colors: Record<string, string> = {
  planning: 'default',
  pending: 'blue',
  in_progress: 'cyan',
  completed: 'success',
};
return colors[status] || 'default';  // 未定義の場合はdefault
```

---

## 11. 既知の課題・TODO

### 11.1 既知の課題
- 「プロジェクトを開く」ボタンが未実装（console.log出力のみ）
- ファイルクリック時の動作が未実装（console.log出力のみ）

### 11.2 将来の改善案
- [ ] 「プロジェクトを開く」ボタンの実装（MAIML編集画面へ遷移）
- [ ] ファイルクリック時の詳細表示
- [ ] プロジェクト情報の編集機能
- [ ] メンバー管理機能
- [ ] タグの追加・削除機能
- [ ] プロジェクト統計のグラフ表示
- [ ] エクスポート機能
- [ ] モバイルレスポンシブ対応の強化

---

## 12. テスト観点

### 12.1 単体テスト
- [ ] モーダル表示/非表示が正しく動作する
- [ ] projectがnullの場合、nullを返す
- [ ] ステータスタグの色が正しく設定される
- [ ] 日時が正しくフォーマットされる
- [ ] ファイルサイズが正しくフォーマットされる
- [ ] タグが正しく表示される

### 12.2 統合テスト
- [ ] 親コンポーネントからのデータ受け取り
- [ ] FileListTableへのデータ渡し
- [ ] ボタンクリックのハンドラ呼び出し

### 12.3 E2Eテスト
- [ ] モーダル表示から閉じるまでの操作
- [ ] ファイル一覧のスクロール
- [ ] ボタン操作

---

## 13. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-01-21 | 1.0.0 | 初版作成 | Cline |

---

## 14. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [FileListTable仕様](./FileListTable.md) - 子コンポーネント
- [UIポリシー](.clinerules/references/ui_policy.md) - UI設計ルール
