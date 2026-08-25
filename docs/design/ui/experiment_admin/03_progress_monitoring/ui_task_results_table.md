# TaskResultsTable UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

プロジェクト内のタスク結果を一覧表示するテーブルコンポーネント。各タスクのステータス、作業終了日、レビュー完了日を表示し、詳細確認が可能です。

### 1.2. 使用場面

- ProgressMonitoring画面でタスク結果を確認する場合
- ProjectDetailModal内でタスク一覧を表示する場合
- タスクのステータスを一覧で確認する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌───────────────────────────────────────────────────────┐
│ タスク名      │メソッド│ステータス│作業終了日│レビュー│
│──────────────┼────────┼─────────┼─────────┼────────│
│ 材料準備      │Method1 │ [実行中] │2024-01-15│   -    │
│               │        │          │          │ [詳細] │
│──────────────┼────────┼─────────┼─────────┼────────│
│ 材料測定      │Method1 │ [完了]   │2024-01-18│24-01-20│
│               │        │ [green]  │          │ [詳細] │
│──────────────┼────────┼─────────┼─────────┼────────│
│ データ分析    │Method2 │ [待ち]   │   -      │   -    │
│               │        │ [yellow] │          │ [詳細] │
└───────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. テーブル設定

| 項目 | 値 |
|------|-----|
| サイズ | small |
| ページネーション | false（親コンポーネントで制御） |
| rowKey | `record.workId \|\| record.taskId`（workIdが優先、なければtaskId） |

#### 2.2.2. カラム定義

| カラム | 幅 | 配置 | ソート | 説明 |
|--------|-----|------|--------|------|
| メソッド | 28% | left | ○ | methodName（なければ `-`） |
| タスク名 | 18% | left | ○ | taskName（なければtransitionName）、太字表示 |
| ステータス | 14% | center | ○ | ステータスTag（色分け） |
| 作業終了日 | 20% | right | ○ | 日付表示（年/月/日） |
| レビュー完了日 | 20% | right | ○ | 日付表示（年/月/日） |

#### 2.2.3. ステータスの色定義

| ステータス | 色 | 表示名 |
|-----------|-----|--------|
| pending | default（灰色） | 実行待ち |
| in_progress | processing（青） | 実行中 |
| error | error（赤） | 異常終了 |
| review_waiting | warning（黄） | レビュー待ち |
| completed | success（緑） | 完了 |

### 2.3. 画面遷移

- なし（表示専用コンポーネント）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. テーブル表示

**処理フロー:**
1. Props（results）を受け取る
2. TableコンポーネントにdataSourceとして渡す
3. 各カラムのrenderで表示形式を制御
4. ソートは自動で有効化

**ソート機能:**
- タスク名: 文字列の自然順ソート（localeCompare）
- メソッド: 文字列の自然順ソート
- ステータス: 優先度順ソート（pending → in_progress → error → review_waiting → completed）
- 作業終了日: 日付順ソート（nullは最後）
- レビュー完了日: 日付順ソート（nullは最後）

#### 3.1.2. ステータス表示

**ステータスラベル取得:**
```typescript
const getStatusLabel = (status: number) => {
  switch (status) {
    case TaskStatus.PENDING:             return t('projectManagement.task_results.status_pending') || '実行待ち';
    case TaskStatus.IN_PROGRESS:        return t('projectManagement.task_results.status_in_progress') || '実行中';
    case TaskStatus.FORCED_TERMINATED:  return t('projectManagement.task_results.status_error') || '異常終了';
    case TaskStatus.REVIEW_WAITING:     return t('projectManagement.task_results.status_review_waiting') || 'レビュー待ち';
    case TaskStatus.COMPLETED:          return t('projectManagement.task_results.status_completed') || '完了';
    default: return String(status);
  }
};
```

**ステータス色取得:**
```typescript
const getStatusColor = (status: number) => {
  switch (status) {
    case TaskStatus.PENDING:            return 'default';
    case TaskStatus.IN_PROGRESS:        return 'processing';
    case TaskStatus.FORCED_TERMINATED:  return 'error';
    case TaskStatus.REVIEW_WAITING:     return 'warning';
    case TaskStatus.COMPLETED:          return 'success';
    default: return 'default';
  }
};
```

#### 3.1.3. 日付表示

**フォーマット:**
```typescript
new Date(date).toLocaleDateString('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
// 例: 2024/01/15
```

**nullの場合:** `-` を表示

#### 3.1.4. 空データ表示

**Empty表示:**
- image: Empty.PRESENTED_IMAGE_SIMPLE
- description: 多言語対応（「タスクがありません」）

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| カラムヘッダークリック | ソート実行 | Tableが管理 |

### 3.3. バリデーションルール

- なし（表示専用）

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface TaskResultsTableProps {
  results: Task[];   // タスク結果配列（@/types/project の Task 型）
}
```

### 4.2. Task型定義（`@/types/project`）

```typescript
// @/types/project からインポートされる Task 型を使用
// テーブル表示に使用される主要フィールド:
// - workId: string                    rowKey（優先）
// - taskId: string                    rowKey（fallback）
// - methodName: string                メソッド名カラム
// - taskName: string                  タスク名カラム
// - transitionName: string            タスク名カラム（taskNameがない場合のfallback）
// - workStatus: number                ステータスカラム（TaskStatus enumの数値）
// - workCompletedAt: string | null    作業終了日カラム
// - reviewCompletedAt: string | null  レビュー完了日カラム
```

### 4.3. TaskStatus enum定義（`@/constants/codeMaster`）

```typescript
import { TaskStatus } from '@/constants/codeMaster';
// 数値ベースのenum:
// TaskStatus.PENDING            実行待ち
// TaskStatus.IN_PROGRESS        実行中
// TaskStatus.FORCED_TERMINATED  異常終了
// TaskStatus.REVIEW_WAITING     レビュー待ち
// TaskStatus.COMPLETED          完了
```

### 4.4. 入力項目

- results配列（親コンポーネントから渡される）

### 4.5. 出力項目

- なし（コールバック経由で親に通知）

---

## 5. API連携

### 5.1. 使用するAPI一覧

- なし（親コンポーネントがAPIからデータを取得して渡す）

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 |
|------------|------|
| results配列が空 | Empty表示 |
| 日付がnull | `-` 表示 |
| ステータスが未定義 | そのまま表示 |

### 6.2. エラーメッセージ

- なし（表示専用コンポーネント）

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Table | テーブル本体 | dataSource, columns, rowKey, size, pagination, locale |
| Tag | ステータス表示 | color |
| Typography.Text | テキスト表示 | strong, style |
| Empty | 空データ表示 | description, image |

### 7.2. デザイントークン使用

```typescript
import { theme } from 'antd';
const { token } = theme.useToken();

// 使用箇所
fontSize: token.fontSizeSM  // 日付表示のフォントサイズ
```

### 7.3. カラーパレット

**ステータスTag:**
- pending: default（灰色）
- in_progress: processing（青）
- error: error（赤）
- review_waiting: warning（黄）
- completed: success（緑）

### 7.4. 多言語対応

useLanguage()カスタムフックを使用：

```typescript
const { t } = useLanguage();

t('projectManagement.task_results.task_name')
t('projectManagement.task_results.status_pending')
// など
```

### 7.5. レスポンシブ対応

- カラム幅: パーセンテージ指定で自動調整
- テーブルサイズ: small（コンパクト表示）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/TaskResultsTable.tsx
```

> ℹ️ **【配置注記】** この設計書は `03_progress_monitoring/` に配置されていますが、実装ファイルは `frontend/src/components/project/TaskResultsTable.tsx` です。
> `ProgressMonitoring` 画面と `ProjectManagement` 画面の両方から利用される共有コンポーネントのため、`project/` フォルダに実装されています。

### 8.2. 関連コンポーネント

- なし（独立したテーブルコンポーネント）

### 8.3. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useLanguage | @/contexts/LanguageContext | 多言語化 |

### 8.4. 型定義

| 型 | パス | 役割 |
|----|------|------|
| Task | @/types/project | タスクデータ型（Props の results に使用） |
| TaskStatus | @/constants/codeMaster | タスクステータス enum（数値ベース） |

---

## 9. 既知の課題・TODO

### 実装待ち

- なし

### 改善提案

- [ ] 進捗率（progressPercentage）の表示
- [ ] 完了日時（completedAt）の表示
- [ ] 割り当てられた作業者（assignedWorker）の表示
- [ ] フィルタリング機能（ステータス別、メソッド別）
- [ ] 検索機能（タスク名、メソッド名）
- [ ] エクスポート機能（CSV、Excel）
- [ ] 詳細情報のツールチップ表示
- [ ] カラムの表示/非表示切替
- [ ] カラム幅のカスタマイズ
- [ ] 一括選択機能
- [ ] 行クリックで詳細表示

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 1.1.0 | 2026-08-20 | ソース実装と照合し修正: Props型修正（TaskResult[]→Task[], onViewResult削除）・TaskResult型をTask型(@/types/project)に変更・TaskStatus型を文字列ユニオン→enum(@/constants/codeMaster)に変更・getStatusLabel/getStatusColorを数値ベースに修正・操作列・詳細ボタン削除・カラム幅・順序修正・rowKey修正 | Cline |
