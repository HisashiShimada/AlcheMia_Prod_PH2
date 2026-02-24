# TaskListTable 差分分析レポート

## メタデータ
- **分析日時**: 2026-02-20 15:10
- **対象ファイル**: `frontend/src/components/ExperimentWorker/TaskListTable.tsx`
- **設計書**: `docs/design/ui/ui_task_list_table.md`

---

## 1. 分析結果サマリー

### 差分の有無
**差分あり** - 1箇所の重要な差分を検出

### 総合評価
実装は設計書の仕様をほぼ正確に実装していますが、**第1カラムの定義**において重要な差分が存在します。

---

## 2. 差分の詳細

### 2.1 第1カラムの定義（重要な差分）

#### 設計書の仕様
```typescript
{
  title: 'タスクNo',
  dataIndex: 'taskNo',
  key: 'taskNo',
  width: 95,
  ellipsis: true,
  sorter: (a, b) => a.taskNo.localeCompare(b.taskNo),
  render: (text: string) => (
    <Text style={{ fontSize: '14px' }}>{text}</Text>
  )
}
```

**ポイント:**
- タイトル: 'タスクNo'
- dataIndex: 'taskNo'
- 幅: 95px

#### 実装の状態
```typescript
{
  title: 'タスクの名称',
  dataIndex: 'taskName',
  key: 'taskName',
  width: 200,
  ellipsis: true,
  sorter: (a, b) => a.taskName.localeCompare(b.taskName),
  render: (text: string) => (
    <Text style={{ fontSize: '14px' }}>{text}</Text>
  )
}
```

**ポイント:**
- タイトル: 'タスクの名称'
- dataIndex: 'taskName'
- 幅: 200px

#### 影響範囲
この差分により以下の影響があります：

1. **表示内容の違い**
   - 設計書: タスクNoを表示（例: "T001", "T002"）
   - 実装: タスク名称を表示（例: "サンプル調合", "加熱処理"）

2. **カラム幅の違い**
   - 設計書: 95px
   - 実装: 200px

3. **テーブル全体の幅**
   - 設計書: 750px（scroll={{ x: 750 }}）
   - 実装: 855px（scroll={{ x: 855 }}）

4. **検索対象の違い**
   - 設計書: task.taskNoで検索
   - 実装: task.taskNameで検索

#### 修正の必要性
**必要** - 設計書の仕様に合わせて修正すべきです。

**理由:**
- UI設計書で明確に「タスクNo」と定義されている
- カラム幅も95pxと明記されている
- 設計書の「7.2.1 タスクNo」セクションで詳細に仕様が記載されている

---

### 2.2 検索ロジックの差分（第1カラム関連）

#### 設計書の仕様
```typescript
const matchesSearch = searchText === '' || 
  task.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
  getStatusLabel(task.status).includes(searchText) ||
  task.progressRate.toString().includes(searchText);
```

#### 実装の状態
```typescript
const matchesSearch = searchText === '' || 
  task.taskName.toLowerCase().includes(searchText.toLowerCase()) ||
  getStatusLabel(task.status).includes(searchText) ||
  task.progressRate.toString().includes(searchText);
```

#### 差分
- 設計書: `task.taskNo`で検索
- 実装: `task.taskName`で検索

#### 修正の必要性
**必要** - 第1カラムの修正に合わせて、検索対象も`task.taskNo`に変更すべきです。

---

## 3. 一致している項目（検証済み）

以下の項目は設計書と実装が一致していることを確認しました：

### 3.1 Props定義
✅ 完全一致
```typescript
interface TaskListTableProps {
  tasks: Task[];
  selectedMethodId: string | null;
  projectStatus: ProjectStatus | null;
  onTaskAction: (taskId: string, action: string) => void;
  onProgressRateClick: (task: Task) => void;
}
```

### 3.2 State定義
✅ 完全一致
```typescript
const [searchText, setSearchText] = useState<string>('');
const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined);
```

### 3.3 ステータス表示
✅ 完全一致

| TaskStatus | 表示ラベル | 色 |
|------------|-----------|-----|
| not_started | 開始前 | default |
| started | 開始 | blue |
| in_progress | 作業中 | orange |
| completed | 完了 | green |
| forced_terminated | 強制終了 | red |
| suspended | 中断 | default |

### 3.4 第2カラム（ステータス）
✅ 完全一致
- タイトル: 'ステータス'
- 幅: 95px
- align: 'center'
- sorter: あり
- レンダリング: Tag with color

### 3.5 第3カラム（進捗率）
✅ 完全一致
- タイトル: '進捗率'
- 幅: 75px
- align: 'center'
- sorter: 数値ソート
- レンダリング: クリック可能、下線付き、#0093CF色

### 3.6 アクションボタンカラム（5個）
✅ 完全一致

1. **指示確認**
   - title: '指示確認'
   - width: 85px
   - type: "default"
   - label: "指示"
   - 常に有効

2. **開始**
   - title: '開始'
   - width: 65px
   - type: "primary"
   - label: "開始"
   - 有効条件: `status === 'not_started' && isEditableStatus(projectStatus)`

3. **問題確認**
   - title: t('experimentWork.progressCheck.issueCheck')（多言語対応）
   - width: 65px
   - type: "default"
   - label: t('experimentWork.progressCheck.checkButton')
   - 常に有効

4. **実験記録**
   - title: '実験記録'
   - width: 85px
   - type: "default"
   - label: "記録"
   - 常に有効

5. **強制終了**
   - title: '強制終了'
   - width: 85px
   - danger: true
   - label: "終了"
   - 有効条件: `status !== 'completed' && status !== 'forced_terminated' && isEditableStatus(projectStatus)`

### 3.7 ページネーション設定
✅ 完全一致
```typescript
pagination={{
  pageSize: 20,
  showSizeChanger: true,
  showQuickJumper: false,
  showTotal: (total) => `全${total}件`,
  pageSizeOptions: ['10', '20', '50', '100'],
  position: ['bottomRight'],
  locale: {
    items_per_page: '件/ページ',
    jump_to: 'ページ',
    page: ''
  }
}}
```

### 3.8 アクセシビリティ
✅ 適切に実装
- すべてのインタラクティブ要素にaria-label付与
- 検索フィールド: "タスク一覧検索"
- ステータス選択: "タスクステータスで絞り込み"
- 進捗率: "進捗率 XX% - クリックしてフロー図を表示"
- 各ボタン: 適切なaria-label

### 3.9 パフォーマンス最適化
✅ 適切に実装
- `filteredTasks`: useMemoでメモ化
- `columns`: useMemoでメモ化

### 3.10 その他の仕様
✅ 完全一致
- rowKey: "taskId"
- size: "middle"
- bordered: true
- locale.emptyText: "タスクがありません"
- 絞り込みUI: Row/Colレイアウト

---

## 4. 修正方針

### 4.1 修正が必要な項目

#### 修正1: 第1カラムの定義
**優先度**: 高

**修正内容:**
1. タイトルを「タスクNo」に変更
2. dataIndexを「taskNo」に変更
3. keyを「taskNo」に変更
4. widthを95pxに変更
5. sorterを`a.taskNo.localeCompare(b.taskNo)`に変更

**修正前:**
```typescript
{
  title: 'タスクの名称',
  dataIndex: 'taskName',
  key: 'taskName',
  width: 200,
  // ...
}
```

**修正後:**
```typescript
{
  title: 'タスクNo',
  dataIndex: 'taskNo',
  key: 'taskNo',
  width: 95,
  // ...
}
```

#### 修正2: scroll幅の調整
**優先度**: 高

**修正内容:**
- scroll={{ x: 855 }} → scroll={{ x: 750 }}

**理由:**
- 第1カラムが200px → 95pxになるため、合計幅が105px減少
- 新しい合計幅: 95 + 95 + 75 + 85 + 65 + 65 + 85 + 85 = 750px

#### 修正3: 検索ロジックの修正
**優先度**: 高

**修正内容:**
- `task.taskName` → `task.taskNo`

**修正前:**
```typescript
task.taskName.toLowerCase().includes(searchText.toLowerCase())
```

**修正後:**
```typescript
task.taskNo.toLowerCase().includes(searchText.toLowerCase())
```

### 4.2 修正が不要な項目
以下は設計書と一致しているため、修正不要です：
- Props定義
- State定義
- 第2カラム以降のカラム定義
- ステータス表示
- ボタンの有効/無効ロジック
- ページネーション
- アクセシビリティ
- パフォーマンス最適化

---

## 5. 実装計画

### Phase 3-1: 第1カラムの修正
- [ ] カラム定義を修正（title, dataIndex, key, width, sorter）

### Phase 3-2: scroll幅の修正
- [ ] scroll={{ x: 750 }}に変更

### Phase 3-3: 検索ロジックの修正
- [ ] taskName → taskNoに変更

### Phase 3-4: 動作確認
- [ ] TypeScriptコンパイルエラーチェック
- [ ] Task型にtaskNoフィールドが存在することを確認

---

## 6. リスク分析

### 6.1 Task型の確認が必要
**リスク**: Task型にtaskNoフィールドが存在しない可能性

**対策**: 
- Task型定義を確認
- taskNoフィールドが存在しない場合は型定義も修正が必要

### 6.2 親コンポーネントへの影響
**リスク**: 親コンポーネント（ProgressCheckTable）でtaskNoを使用しているか不明

**対策**:
- 親コンポーネントを確認
- モックデータにtaskNoが含まれているか確認

---

## 7. 次のアクション

1. ✅ Task型定義を確認（taskNoフィールドの存在確認）
2. ⬜ 第1カラムの修正実施
3. ⬜ scroll幅の修正実施
4. ⬜ 検索ロジックの修正実施
5. ⬜ TypeScriptコンパイルエラーチェック
6. ⬜ 動作確認

---

## 8. 結論

**差分サマリー:**
- 重要な差分: 1箇所（第1カラム: taskName → taskNo）
- 軽微な差分: 2箇所（scroll幅、検索ロジック）※第1カラムの変更に伴う調整
- 修正不要: その他すべての項目は設計書と一致

**総合評価:**
実装品質は高く、設計書の仕様をほぼ正確に実装しています。第1カラムのdataIndexの違いは、おそらく実装時の判断または設計変更前の実装である可能性があります。設計書の仕様に合わせて修正することで、完全に一致させることができます。

**推奨アクション:**
Task型定義を確認後、3箇所の修正を実施することを推奨します。修正は単純で、リスクも低いと判断されます。

---

**作成者**: Cline
**作成日時**: 2026-02-20 15:10
