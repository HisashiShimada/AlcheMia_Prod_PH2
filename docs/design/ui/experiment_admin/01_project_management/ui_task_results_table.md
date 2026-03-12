# タスク結果一覧テーブル UI仕様書

## 概要

### 目的
プロジェクトのタスク実行結果を一覧表示するテーブルコンポーネント。タスク名・メソッド・ステータス・作業終了日・レビュー完了日を表示し、結果確認ボタンから詳細を閲覧できる。

### 使用場面
- プロジェクト管理画面の「タスク結果」タブ（廃止予定、進捗確認タブに統合）
- 進捗確認タブ内のタスク結果一覧表示

### アクセス権限
- **Experiment Admin（実験管理者）**: タスク結果の閲覧
- **その他のロール**: アクセス不可

---

## 画面構成

### レイアウト構造

```
┌──────────────────────────────────────────────────────────────────┐
│ タスク名      │メソッド│ステータス│作業終了日│レビュー│  操作  │
├──────────────────────────────────────────────────────────────────┤
│ Task_001     │Method1 │[完了]   │2026/03/10│2026/03/11│[結果確認]│
│ Task_002     │Method2 │[実行中] │    -     │    -     │[結果確認]│
│ Task_003     │Method1 │[異常]   │2026/03/09│    -     │[結果確認]│
└──────────────────────────────────────────────────────────────────┘
```

### UI要素

#### テーブルカラム

| カラム | 幅 | 表示内容 | ソート | 備考 |
|--------|-----|---------|--------|------|
| タスク名 | 28% | タスク名またはTransition名（太字） | ✓ | 文字列ソート |
| メソッド | 18% | メソッド名 | ✓ | 文字列ソート、未設定は「-」 |
| ステータス | 14% | ステータスタグ（色付き） | ✓ | カスタム順序ソート |
| 作業終了日 | 18% | YYYY/MM/DD形式 | ✓ | 日付ソート、未設定は「-」 |
| レビュー完了日 | 12% | YYYY/MM/DD形式 | ✓ | 日付ソート、未設定は「-」 |
| 操作 | 10% | 結果確認ボタン | - | - |

#### ステータスタグの色分け

| ステータス | 色 | 表示ラベル |
|-----------|-----|-----------|
| pending | default（グレー） | 実行待ち |
| in_progress | processing（青） | 実行中 |
| error | error（赤） | 異常終了 |
| review_waiting | warning（オレンジ） | レビュー待ち |
| completed | success（緑） | 完了 |

---

## 機能仕様

### Props定義

```typescript
interface TaskResultsTableProps {
  results: Task[];                     // タスク結果一覧
  onViewResult: (result: Task) => void; // 結果確認時のコールバック
}
```

### Context連携

```typescript
const { t } = useLanguage();           // 多言語対応
const { token } = theme.useToken();    // Ant Design テーマトークン
```

### 主要機能

#### 1. ステータスラベルの取得

```typescript
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return t('projectManagement.task_results.status_pending') || '実行待ち';
    case 'in_progress':
      return t('projectManagement.task_results.status_in_progress') || '実行中';
    case 'error':
      return t('projectManagement.task_results.status_error') || '異常終了';
    case 'review_waiting':
      return t('projectManagement.task_results.status_review_waiting') || 'レビュー待ち';
    case 'completed':
      return t('projectManagement.task_results.status_completed') || '完了';
    default:
      return status;
  }
};
```

#### 2. ステータスの色取得

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'default';
    case 'in_progress':
      return 'processing';
    case 'error':
      return 'error';
    case 'review_waiting':
      return 'warning';
    case 'completed':
      return 'success';
    default:
      return 'default';
  }
};
```

#### 3. ソート機能

**タスク名ソート**:
```typescript
sorter: (a, b) => (a.taskName || a.transitionName).localeCompare(b.taskName || b.transitionName)
```

**メソッドソート**:
```typescript
sorter: (a, b) => (a.methodName || '').localeCompare(b.methodName || '')
```

**ステータスソート**（優先順位: pending → in_progress → error → review_waiting → completed）:
```typescript
sorter: (a, b) => {
  const statusOrder = { 
    pending: 0, 
    in_progress: 1, 
    error: 2, 
    review_waiting: 3, 
    completed: 4 
  };
  return (statusOrder[a.workStatus as keyof typeof statusOrder] || 0) 
       - (statusOrder[b.workStatus as keyof typeof statusOrder] || 0);
}
```

**日付ソート**（未設定は最後）:
```typescript
sorter: (a, b) => {
  if (!a.workCompletedAt && !b.workCompletedAt) return 0;
  if (!a.workCompletedAt) return 1;
  if (!b.workCompletedAt) return -1;
  return new Date(a.workCompletedAt).getTime() - new Date(b.workCompletedAt).getTime();
}
```

#### 4. 日付表示

**フォーマット**: YYYY/MM/DD（日本語ロケール）

```typescript
render: (date: string | null) => (
  <Text style={{ fontSize: token.fontSizeSM }}>
    {date ? new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }) : '-'}
  </Text>
)
```

**表示例**:
- `2026-03-11T10:30:00Z` → `2026/03/11`
- `null` → `-`

#### 5. 結果確認ボタン

```typescript
<Button
  type="default"
  size="small"
  icon={<EyeOutlined />}
  onClick={(e) => {
    e.stopPropagation();
    onViewResult(record);
  }}
>
  結果確認
</Button>
```

**動作**:
- クリック時に`onViewResult(record)`コールバックを実行
- イベント伝播を停止（`e.stopPropagation()`）

---

## データ型定義

### Task

```typescript
interface Task {
  workId?: string;                     // 作業ID
  taskId: string;                      // タスクID
  taskName?: string;                   // タスク名
  transitionName: string;              // Transition名
  methodName?: string;                 // メソッド名
  workStatus: string;                  // 作業ステータス
  workCompletedAt: string | null;      // 作業終了日時
  reviewCompletedAt: string | null;    // レビュー完了日時
}
```

---

## 特記事項

### タスク名の表示優先順位

```typescript
record.taskName || record.transitionName
```

- `taskName`が存在する場合: `taskName`を表示
- `taskName`が未設定の場合: `transitionName`を表示

### rowKeyの設定

```typescript
rowKey={(record) => record.workId || record.taskId}
```

- `workId`が存在する場合: `workId`を使用
- `workId`が未設定の場合: `taskId`を使用

### 空状態

**タスクが0件の場合**:
```typescript
<Empty
  description={t('projectManagement.task_results.no_tasks') || 'タスクがありません'}
  image={Empty.PRESENTED_IMAGE_SIMPLE}
/>
```

### フォントサイズ

**日付カラム**: `token.fontSizeSM`（小さいフォントサイズ）

---

## 多言語対応

### 翻訳キー

| キー | デフォルト値 |
|------|-------------|
| `projectManagement.task_results.task_name` | タスク名 |
| `projectManagement.task_results.method_name` | メソッド |
| `projectManagement.task_results.status` | ステータス |
| `projectManagement.task_results.work_completed_at` | 作業終了日 |
| `projectManagement.task_results.review_completed_at` | レビュー完了日 |
| `projectManagement.task_results.actions` | 操作 |
| `projectManagement.task_results.view_result` | 結果確認 |
| `projectManagement.task_results.no_tasks` | タスクがありません |
| `projectManagement.task_results.status_pending` | 実行待ち |
| `projectManagement.task_results.status_in_progress` | 実行中 |
| `projectManagement.task_results.status_error` | 異常終了 |
| `projectManagement.task_results.status_review_waiting` | レビュー待ち |
| `projectManagement.task_results.status_completed` | 完了 |

---

## 実装ファイル情報

### パス
```
frontend/src/components/project/TaskResultsTable.tsx
```

### 主要な依存パッケージ
- `antd`: UI コンポーネント（Table, Tag, Typography, Empty, theme, Button）
- `@ant-design/icons`: アイコン（EyeOutlined）
- `react`: React本体

### Context
- `LanguageContext`: 多言語対応

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0 | 2026-03-11 | 実装ベースで仕様書を新規作成（実装ファイル: TaskResultsTable.tsx） | Cline |

---

## 関連ドキュメント

- [プロジェクト管理画面](ui_project_management.md)
- [進捗確認画面](../03_progress_monitoring/ui_progress_monitoring.md)
