# TaskResultsTable - タスク結果一覧テーブル

## 1. 概要

### 1.1 コンポーネントの目的
タスクの実行結果を一覧表示するテーブルコンポーネント。ステータス、日付、詳細閲覧機能を提供します。

### 1.2 使用場面
- プロジェクト管理画面のタスク結果セクション
- 完了したタスクの確認
- レビュー待ちタスクの確認

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌────────────────────────────────────────────────────────┐
│ タスク名    │ メソッド │ ステータス │ 作業終了日 │    │
├────────────────────────────────────────────────────────┤
│ サンプル準備│ method_1 │[実行中]    │ -          │[詳細]│
│ 測定実行    │ method_2 │[レビュー待ち]│ 2026-02-18│[詳細]│
│ データ分析  │ method_3 │[完了]      │ 2026-02-17 │[詳細]│
└────────────────────────────────────────────────────────┘
```

---

## 3. 機能仕様

### 3.1 Props定義

```typescript
interface TaskResultsTableProps {
  results: Task[];                      // タスク結果一覧
  onViewResult: (result: Task) => void; // 詳細閲覧ハンドラ
}
```

### 3.2 カラム定義

| カラム | 幅 | 整列 | ソート可能 |
|--------|-----|------|-----------|
| タスク名 | 30% | left | ✅ |
| メソッド | 20% | left | ✅ |
| ステータス | 15% | center | ✅ |
| 作業終了日 | 18% | right | ✅ |
| レビュー完了日 | 15% | right | ✅ |
| 操作 | 10% | center | ❌ |

### 3.3 ステータス表示

**ステータス値とカラー:**

| ステータス | ラベル | カラー | Tag color |
|-----------|--------|-------|-----------|
| pending | 実行待ち | グレー | default |
| in_progress | 実行中 | ブルー | processing |
| error | 異常終了 | レッド | error |
| review_waiting | レビュー待ち | オレンジ | warning |
| completed | 完了 | グリーン | success |

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'default';
    case 'in_progress': return 'processing';
    case 'error': return 'error';
    case 'review_waiting': return 'warning';
    case 'completed': return 'success';
    default: return 'default';
  }
};
```

### 3.4 ソート機能

**タスク名:**
- アルファベット順
- taskName || transitionName で比較

**メソッド名:**
- アルファベット順
- 空文字列を末尾に配置

**ステータス:**
- 定義済み順序: pending → in_progress → error → review_waiting → completed

**日付:**
- 古い順 → 新しい順
- null値は末尾に配置

### 3.5 日付フォーマット

```typescript
const formatDate = (date: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};
// 例: "2026-02-18" → "2026/02/18"
```

### 3.6 詳細閲覧

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
  詳細
</Button>
```

---

## 4. データ型定義

### 4.1 Task型

```typescript
interface Task {
  workId?: string;                // 作業ID（rowKey用）
  taskId: string;                 // タスクID
  taskName?: string;              // タスク名
  transitionName: string;         // トランジション名
  methodName?: string;            // メソッド名
  workStatus: string;             // 作業ステータス
  workCompletedAt: string | null; // 作業終了日時
  reviewCompletedAt: string | null; // レビュー完了日時
}
```

---

## 5. UI/UXポリシー準拠

### 5.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| テーブル | Table | dataSource, columns, size="small" |
| ボタン | Button | type, size="small", icon |
| タグ | Tag | color |
| テキスト | Typography.Text | strong, fontSize |
| 空状態 | Empty | description, image |

### 5.2 カラーパレット

| 要素 | 色 | 用途 |
|------|-----|------|
| ステータスタグ | 状態別 | 視覚的な識別 |
| 日付テキスト | fontSizeSM | 小さめのフォント |

---

## 6. 多言語対応

### 6.1 翻訳キー

```typescript
t('projectManagement.task_results.task_name')          // タスク名
t('projectManagement.task_results.method_name')        // メソッド
t('projectManagement.task_results.status')             // ステータス
t('projectManagement.task_results.work_completed_at')  // 作業終了日
t('projectManagement.task_results.review_completed_at') // レビュー完了日
t('projectManagement.task_results.actions')            // 操作
t('projectManagement.task_results.view_result')        // 詳細
t('projectManagement.task_results.no_tasks')           // タスクがありません

// ステータスラベル
t('projectManagement.task_results.status_pending')         // 実行待ち
t('projectManagement.task_results.status_in_progress')     // 実行中
t('projectManagement.task_results.status_error')           // 異常終了
t('projectManagement.task_results.status_review_waiting')  // レビュー待ち
t('projectManagement.task_results.status_completed')       // 完了
```

---

## 7. 実装ファイル

### 7.1 ファイルパス
```
frontend/src/components/project/TaskResultsTable.tsx
```

### 7.2 依存コンポーネント
- なし（単独で動作）

### 7.3 依存ライブラリ
- antd: Table, Button, Tag, Typography, Empty
- @ant-design/icons: EyeOutlined
- @/contexts/LanguageContext: useLanguage

---

## 8. 既知の課題・TODO

### 8.1 将来の改善案
- [ ] ページネーション機能
- [ ] フィルタリング機能（ステータス別）
- [ ] エクスポート機能（CSV/Excel）
- [ ] 一括操作機能
- [ ] 詳細なソート条件

---

## 9. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-02-19 | 1.0.0 | 初版作成 | Cline |

---

## 10. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
