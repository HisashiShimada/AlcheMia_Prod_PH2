# タスク計画書: TaskResultsTable 詳細ボタン実装

## メタデータ
- **作成日時**: 2026-03-09 15:48
- **タスクID**: task_results_view_button
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要

`TaskResultsTable.tsx` に「操作」カラムと「詳細ボタン（EyeOutlined）」を追加し、クリック時に `onViewResult(record)` コールバックを呼び出す機能を実装する。  
あわせて、呼び出し元の `ProjectManagement.tsx` に `onViewResult` プロップを渡す対応を行う。

---

## 目的と期待される成果

### 目的
UI仕様書（`ui_task_results_table.md`）に定義されているが未実装の「操作カラム（詳細ボタン）」を実装する。

### 期待される成果
- [ ] `TaskResultsTable` に操作カラム（幅10%）が表示される
- [ ] 各行に「詳細」ボタン（EyeOutlined アイコン付き、size=small, type=default）が表示される
- [ ] ボタンクリック時に `onViewResult(record)` コールバックが呼び出される
- [ ] `ProjectManagement.tsx` で `onViewResult` ハンドラーを渡し、コンポーネントが正常動作する
- [ ] 多言語対応（ja: "結果確認" / en: "View Result"）が機能する

---

## 現状分析

### 現状の問題
`TaskResultsTable.tsx` のカラム定義に操作カラムが存在しない。仕様書では以下が定義されている：

| カラム | 幅 | 配置 | 内容 |
|--------|-----|------|------|
| 操作 | 10% | center | 詳細ボタン（EyeOutlined） |

### 確認済み事項
- i18nキー `projectManagement.task_results.view_result` は **ja/en 両方とも定義済み**（ja: "結果確認", en: "View Result"）
- `EyeOutlined` は Ant Design に存在し、未インポート
- `Button` は Ant Design からすでにインポート可能（現在 Table/Tag/Typography/Empty/theme のみインポート）
- `ProjectManagement.tsx` で `TaskResultsTable` に `onViewResult` プロップを渡していない
- 型定義 `Task`（`@/types/project`）は既存のまま利用可能

---

## 実装ステップ

### Phase 1: TaskResultsTable.tsx の修正

- [ ] **Step 1-1**: `EyeOutlined` アイコンを `@ant-design/icons` からインポートに追加
- [ ] **Step 1-2**: `Button` を `antd` のインポートに追加
- [ ] **Step 1-3**: `TaskResultsTableProps` に `onViewResult: (result: Task) => void` を追加
- [ ] **Step 1-4**: コンポーネント関数の引数に `onViewResult` を追加
- [ ] **Step 1-5**: `columns` 配列の末尾に操作カラムを追加
  - `title`: `t('projectManagement.task_results.actions') || '操作'`
  - `key`: `'actions'`
  - `width`: `'10%'`
  - `align`: `'center'`
  - `render`: `EyeOutlined` アイコン付きの `Button`（type="default", size="small"）
  - クリック時に `e.stopPropagation()` → `onViewResult(record)` を呼び出す

### Phase 2: ProjectManagement.tsx の修正

- [ ] **Step 2-1**: `onViewResult` ハンドラー関数を追加（`handleViewTaskResult`）
  - `console.log` で受け取った `Task` を出力（現時点ではモーダル未実装のためログのみ）
- [ ] **Step 2-2**: `<TaskResultsTable>` に `onViewResult={handleViewTaskResult}` を渡す

---

## 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/project/TaskResultsTable.tsx` | 修正 | 操作カラム・詳細ボタン追加、onViewResult Prop追加 |
| 2 | `frontend/src/components/project/ProjectManagement.tsx` | 修正 | onViewResult ハンドラー追加・Prop受け渡し |

---

## 技術的詳細

### TaskResultsTable.tsx 追加カラム定義（参考）

```typescript
{
  title: t('projectManagement.task_results.actions') || '操作',
  key: 'actions',
  width: '10%',
  align: 'center' as const,
  render: (_: unknown, record: Task) => (
    <Button
      type="default"
      size="small"
      icon={<EyeOutlined />}
      onClick={(e) => {
        e.stopPropagation();
        onViewResult(record);
      }}
    >
      {t('projectManagement.task_results.view_result') || '結果確認'}
    </Button>
  ),
},
```

### ProjectManagement.tsx 追加ハンドラー（参考）

```typescript
const handleViewTaskResult = useCallback((result: Task) => {
  // TODO: 将来的に詳細モーダルを表示する
  console.log('[TaskResults] 詳細表示:', result);
}, []);
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `ProjectManagement.tsx` に TypeScript エラーが発生 | 低 | 低 | Prop 型を正確に合わせる |
| カラム幅の合計が 100% を超える | 低 | 低 | 既存カラム幅の合計: 30+20+15+18+15=98%。10% 追加で 108% になるため既存カラムを調整する |

### カラム幅調整方針

現在の合計: `30 + 20 + 15 + 18 + 15 = 98%`  
操作カラム追加後: `98 + 10 = 108%`（超過）

**調整案**: 幅が大きい「タスク名（30%）」「作業終了日（18%）」「レビュー完了日（15%）」を若干縮小する

| カラム | 変更前 | 変更後 |
|--------|--------|--------|
| タスク名 | 30% | 28% |
| メソッド | 20% | 18% |
| ステータス | 15% | 14% |
| 作業終了日 | 18% | 18% |
| レビュー完了日 | 15% | 12% |
| **操作** | - | **10%** |
| **合計** | **98%** | **100%** |

---

## テスト計画

### 手動テスト
- [ ] タスク結果確認タブを開き、テーブルに「操作」カラムが表示されること
- [ ] 各行に「詳細」ボタン（EyeOutlined アイコン付き）が表示されること
- [ ] ボタンクリック時にコンソールにタスクデータがログ出力されること
- [ ] 言語切替時に「結果確認」→「View Result」と表示が変わること

---

## 承認記録

- **計画書提示日時**: 2026-03-09 15:48
- **承認日時**: 2026-03-09 15:49
- **承認者コメント**: 承認します。実装を進めてください

---

## 実施記録

- **開始**: 2026-03-09 15:49
- **完了**: 2026-03-09 15:53

### 実施内容

#### 変更ファイル1: `frontend/src/components/project/TaskResultsTable.tsx`
- `Button` を antd からインポートに追加
- `EyeOutlined` を `@ant-design/icons` からインポートに追加
- `TaskResultsTableProps` に `onViewResult: (result: Task) => void` を追加
- コンポーネント引数に `onViewResult` を追加
- カラム幅を調整（タスク名: 30%→28%, メソッド: 20%→18%, ステータス: 15%→14%, レビュー完了日: 15%→12%）
- 操作カラム（幅10%）を追加：EyeOutlined アイコン付き「結果確認」ボタン

#### 変更ファイル2: `frontend/src/components/project/ProjectManagement.tsx`
- `handleViewTaskResult` は実装済み（`console.log` のみ）であることを確認
- `<TaskResultsTable>` に `onViewResult={handleViewTaskResult}` プロップを追加

### TypeScript型チェック結果
- `TaskResultsTable.tsx`・`ProjectManagement.tsx` にエラーなし
- 既存の他ファイルのエラーは今回の変更とは無関係
