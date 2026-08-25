# WorkflowSelectorDialog - ワークフロー選択ダイアログ

## 1. 概要

### 1.1 コンポーネントの目的

WorkflowSelectorDialogは、編集可能かつMAIML登録済みのプロジェクト一覧から任意のプロジェクトを選択し、そのプロジェクトの最新MAIMLをワークフローとして現在のPetri Netに追加するためのモーダルダイアログです。プロジェクトテーブルとフィルタ機能により、目的のプロジェクトを素早く検索・選択できます。

**主要機能:**
- 編集可能かつMAIML登録済みプロジェクトの一覧表示（テーブル形式）
- プロジェクト名テキスト検索
- プロジェクト名セレクトフィルタ
- ステータス・グループ表示
- プロジェクト選択によるMAIML取得とワークフロー追加

### 1.2 使用場面

- EditorToolbarの「ワークフロー」ボタンをクリック後、キャンバスをクリックした時
- 他のプロジェクトのMAIML XMLを現在のPetri Netに統合したい時

### 1.3 アクセス権限

- **必須ロール**: Experiment Admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────────────────────┐
│ 🔗 ワークフロー選択                                   [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [🔍 テキスト検索...]  [プロジェクト名▼]                     │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ プロジェクト名      │ ステータス │ グループ │ 操作   │    │
│ ├─────────────────────────────────────────────────────┤    │
│ │ 📁 ProjectA        │ 進行中     │ GroupX   │ [選択] │    │
│ │ 📁 ProjectB        │ 計画中     │ GroupY   │ [選択] │    │
│ │ ...                │ ...        │ ...      │ ...    │    │
│ └─────────────────────────────────────────────────────┘    │
│ ページネーション                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                    [キャンセル]             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 モーダルヘッダー
- **タイトル**: "🔗 ワークフロー選択"
- **閉じるボタン**: 右上の×ボタン

#### 2.2.2 テキスト検索バー
- **コンポーネント**: `Input`（prefix: SearchOutlined）
- **対象**: プロジェクト名の部分一致

#### 2.2.3 プロジェクト名セレクト
- **コンポーネント**: `Select`（allowClear）
- **選択肢**: 表示中プロジェクトのユニーク名一覧

#### 2.2.4 プロジェクトテーブル
- **コンポーネント**: Ant Design `Table`
- **列構成**:

| 列名 | 内容 |
|------|------|
| プロジェクト名 | FolderOutlined + プロジェクト名（太字） |
| ステータス | code_masterで翻訳したステータス名 |
| グループ | organizationGroupName |
| 操作 | [ワークフローとして追加] ボタン |

- **行選択**: ラジオボタン（`rowSelection.type: 'radio'`）
- **ページネーション**: デフォルト20件/ページ
- **ローディング**: プロジェクト取得中はSpinを表示

#### 2.2.5 フッターボタン
- **キャンセルボタン**: onClose を呼び出す

---

## 3. 機能仕様

### 3.1 Props定義

```typescript
interface WorkflowSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: WorkflowProjectSelection) => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| open | boolean | ✅ | モーダル表示状態 |
| onClose | () => void | ✅ | モーダルを閉じるコールバック |
| onSelect | (selection: WorkflowProjectSelection) => void | ✅ | プロジェクト選択確定コールバック |

`WorkflowProjectSelection` 型は `@/types/project` に定義。

### 3.2 State定義

```typescript
const [projects, setProjects] = useState<Project[]>([]);
const [isLoadingProjects, setIsLoadingProjects] = useState(false);
const [isConfirming, setIsConfirming] = useState(false);
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
const [searchText, setSearchText] = useState('');
const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>(undefined);
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| projects | Project[] | [] | 取得済みプロジェクト一覧 |
| isLoadingProjects | boolean | false | プロジェクト取得中フラグ |
| isConfirming | boolean | false | 追加処理中フラグ |
| selectedProjectId | string \| null | null | 選択中プロジェクトID |
| searchText | string | '' | テキスト検索クエリ |
| selectedProjectName | string \| undefined | undefined | セレクトフィルタ値 |
| currentPage | number | 1 | 現在ページ |
| pageSize | number | 20 | ページサイズ |

### 3.3 データ取得

ダイアログが開かれた時（`open === true`）に `getProjects()` を呼び出し、`isEditable === true && !!maimlFileKey` のプロジェクトのみ表示対象にフィルタする。

### 3.4 ワークフロー追加処理

```typescript
// テーブル行の「ワークフローとして追加」ボタンクリック時
const handleConfirm = async (record: ProjectRowData) => {
  setIsConfirming(true);
  try {
    const maimlResponse = await getProjectMaiml(record.projectId);
    if (maimlResponse.success && maimlResponse.data) {
      onSelect({
        projectId: record.projectId,
        projectName: record.projectName,
        maimlContent: maimlResponse.data.maimlContent,
      });
      onClose();
    }
  } finally {
    setIsConfirming(false);
  }
};
```

---

## 4. API連携

| # | API名 | メソッド | エンドポイント | 説明 |
|---|------|---------|---------------|------|
| 1 | プロジェクト一覧取得 | GET | `/api/v1/projects` | 編集可能・MAIML登録済みプロジェクト取得 |
| 2 | プロジェクトMAIML取得 | GET | `/api/v1/projects/:id/maiml` | 選択プロジェクトの最新MAIML取得 |

---

## 5. 実装ファイル

- **メインファイル**: `frontend/src/components/editorv2/WorkflowSelectorDialog.tsx`
- **型定義**: `frontend/src/types/project.ts`
- **サービス**: `frontend/src/services/projectApiService.ts`
- **コードマスタ**: `frontend/src/hooks/useCodeMaster.ts`

---

## 6. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 初版作成（S3ファイルツリーベース） | Cline |
| 2026-08-21 | v2.0.0実装（プロジェクトテーブルベースに全面刷新）に合わせて設計書を更新 | Cline |
