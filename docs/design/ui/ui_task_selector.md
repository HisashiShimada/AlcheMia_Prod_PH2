# タスクセレクタ UI設計書

## メタデータ

| 項目 | 内容 |
|------|------|
| コンポーネントID | TaskSelector |
| 物理ファイル名 | TaskSelector.tsx |
| ファイルパス | frontend/src/components/ExperimentWorker/TaskSelector.tsx |
| カテゴリ | 実験作業者（Experiment Worker） |
| 権限 | experiment_worker |
| 作成日 | 2026-01-19 |
| 最終更新日 | 2026-01-19 |

---

## 1. 概要

### 1.1 目的
選択中のタスク情報をカード形式で表示する表示専用コンポーネントです。モーダル内で現在の選択状態を視覚的に示すために使用されます。

### 1.2 主要機能
- 選択中のタスク名を表示
- タスクタグ（「新規」など）を表示
- 未選択状態・無効状態のメッセージ表示
- 選択状態に応じた背景色・ボーダー色の変更
- 無効状態（disabled）のサポート

### 1.3 使用場所
- ExperimentRecordTab（実験記録タブ）内
- ProgressCheckTab（進捗確認タブ）内
- InstructionConfirmationTab（指示確認タブ）内
- TaskSelectionDialog内での選択状態表示
- MethodTaskSelectionModal内での選択状態表示

---

## 2. コンポーネント構成

### 2.1 レイアウト構造

```
Card (小サイズ, 選択状態で背景色変更, disabled時は透明度60%)
└── Space (vertical)
    ├── Space (horizontal) - ヘッダー
    │   ├── AimOutlined (アイコン)
    │   └── Text "タスク" (太字)
    │
    └── (条件分岐)
        ├── Space (vertical, 左パディング24px) - 選択中
        │   ├── Text (太字, 14px) - タスク名
        │   └── Text (secondary, 12px) - タグ（存在する場合）
        │
        └── Text (secondary, 12px, 左パディング24px) - 未選択/無効
            ├── disabled: "プロジェクトを選択してください"
            └── 通常: "タスクが選択されていません"
```

### 2.2 使用コンポーネント

**Ant Design:**
- Card - カード表示
- Space - 要素の間隔管理
- Typography.Text - テキスト表示
- theme.useToken() - デザイントークン取得

**Ant Design Icons:**
- AimOutlined - ターゲットアイコン

**カスタムコンポーネント:**
- なし

---

## 3. Props定義

### 3.1 Props一覧

```typescript
interface TaskSelectorProps {
  selectedTaskId: string | null;          // 選択中のタスクID
  onSelectTask?: (taskId: string) => void;  // ※現在は未使用
  disabled?: boolean;                     // 無効状態フラグ
}
```

### 3.2 Props詳細

| Prop名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| selectedTaskId | string \| null | ○ | - | 選択中のタスクID |
| onSelectTask | function | × | - | タスク選択時のコールバック（現在は未使用） |
| disabled | boolean | × | false | 無効状態フラグ（trueの場合、メッセージが変わる） |

### 3.3 内部State

```typescript
// TODO: 実際のタスク一覧はAPIから取得する予定
// 現在はコンポーネント内でダミーデータを定義
const tasks = [
  { taskId: 'new', taskName: '新規タスク', tag: '新規' },
  { taskId: 'task001', taskName: 'タスク001' },
  { taskId: 'task002', taskName: 'タスク002' },
  { taskId: 'task003', taskName: 'タスク003' },
];
```

---

## 4. 表示内容

### 4.1 ヘッダー部分

| 要素 | 内容 | スタイル |
|------|------|---------|
| アイコン | AimOutlined | fontSize: 16px, color: colorPrimary |
| ラベル | "タスク" | 太字 |

### 4.2 選択中の情報

| 項目 | データソース | 表示形式 | スタイル |
|------|-------------|---------|---------|
| タスク名 | selectedTask.taskName | そのまま表示 | 太字, 14px |
| タグ | selectedTask.tag | 存在する場合のみ表示 | secondary, 12px |

**タグの表示条件:**
```typescript
{selectedTask.tag && (
  <Text type="secondary" style={{ fontSize: 12 }}>
    {selectedTask.tag}
  </Text>
)}
```

### 4.3 未選択/無効時のメッセージ

| 条件 | メッセージ | スタイル |
|------|-----------|---------|
| disabled === true | "プロジェクトを選択してください" | secondary, 12px, paddingLeft: 24px |
| disabled === false かつ 未選択 | "タスクが選択されていません" | secondary, 12px, paddingLeft: 24px |

---

## 5. スタイリング

### 5.1 カード全体のスタイル

```typescript
{
  backgroundColor: selectedTaskId 
    ? token.colorPrimaryBg      // 選択時: プライマリ背景色
    : token.colorBgContainer,   // 未選択: 通常背景色
  borderColor: selectedTaskId 
    ? token.colorPrimary        // 選択時: プライマリ色
    : token.colorBorder,        // 未選択: 通常ボーダー色
  opacity: disabled ? 0.6 : 1,  // 無効時: 透明度60%
}
```

### 5.2 デザイントークンの使用

| トークン | 使用箇所 | 値の例 |
|---------|---------|--------|
| token.colorPrimaryBg | 選択時の背景色 | 薄いプライマリ色 |
| token.colorBgContainer | 未選択時の背景色 | 白または薄いグレー |
| token.colorPrimary | アイコン色、選択時ボーダー | #1890ff |
| token.colorBorder | 未選択時のボーダー | グレー |

### 5.3 無効状態の視覚表現

- **透明度**: `opacity: 0.6` で視覚的に無効を表現
- **メッセージ変更**: "プロジェクトを選択してください" で前提条件を示す

### 5.4 レスポンシブ対応

- カードは親要素の幅に自動適応
- Space コンポーネントが自動的に幅100%に拡張

---

## 6. データフロー

### 6.1 データ取得

```typescript
// 1. タスクIDを受け取る
const { selectedTaskId, disabled } = props;

// 2. ダミーデータからタスクを検索（TODO: API統合時に変更）
const tasks = [
  { taskId: 'new', taskName: '新規タスク', tag: '新規' },
  { taskId: 'task001', taskName: 'タスク001' },
  { taskId: 'task002', taskName: 'タスク002' },
  { taskId: 'task003', taskName: 'タスク003' },
];

const selectedTask = tasks.find((t) => t.taskId === selectedTaskId);

// 3. 表示に必要な情報を抽出
const taskName = selectedTask?.taskName;
const tag = selectedTask?.tag;
```

### 6.2 データ構造（Task型）

```typescript
type Task = {
  taskId: string;       // タスクID
  taskName: string;     // タスク名
  tag?: string;         // タグ（オプショナル、例: "新規"）
  // ... その他のプロパティ
};
```

---

## 7. 状態管理

### 7.1 状態の種類

| 状態 | 条件 | 表示 | スタイル |
|------|------|------|---------|
| 選択中 | selectedTaskId !== null | タスク情報 + タグ | 背景色: colorPrimaryBg, ボーダー: colorPrimary |
| 未選択（有効） | selectedTaskId === null && !disabled | "タスクが選択されていません" | 背景色: colorBgContainer, ボーダー: colorBorder |
| 無効 | disabled === true | "プロジェクトを選択してください" | opacity: 0.6 |

### 7.2 状態遷移

```
初期状態（無効）
  ↓ プロジェクト選択
有効（未選択）
  ↓ タスク選択
選択中
  ↓ タスク変更
選択中（別のタスク）
```

---

## 8. パフォーマンス考慮事項

### 8.1 最適化

- **find() 操作**: 配列検索だが、タスク数は少数（4個のダミーデータ）
- **再レンダリング**: selectedTaskId, disabled のいずれかが変更された時のみ
- **メモ化不要**: 計算量が少ないため useMemo は不要

### 8.2 レンダリング条件

| 条件 | 再レンダリング | 理由 |
|------|--------------|------|
| selectedTaskId変更 | ○ | 選択状態が変わる |
| disabled変更 | ○ | 無効状態が変わる |
| 親コンポーネントの再レンダリング | ○ | React のデフォルト動作 |

---

## 9. アクセシビリティ

### 9.1 対応項目

- ✅ 適切な視覚的階層（アイコン + ラベル + 詳細情報）
- ✅ テキストコントラスト（secondary テキストでも十分なコントラスト）
- ✅ 色だけに依存しない情報伝達（ラベルとアイコンを併用）
- ✅ 無効状態の視覚化（透明度 + メッセージ変更）

### 9.2 改善検討事項

- ⚠️ aria-label 属性の追加（スクリーンリーダー対応）
- ⚠️ aria-disabled 属性の追加（disabled 時）
- ⚠️ role属性の明示（role="status" など）

---

## 10. バリデーション

### 10.1 入力検証

**該当なし**（表示専用コンポーネント）

### 10.2 エラーハンドリング

```typescript
// 存在しないタスクIDの場合
const selectedTask = tasks.find((t) => t.taskId === selectedTaskId);
if (!selectedTask && selectedTaskId) {
  // 未選択メッセージを表示（find が undefined を返す）
}

// タグの安全な取得
const tag = selectedTask?.tag;  // undefined の場合は表示しない
```

---

## 11. テスト要件

### 11.1 単体テスト

```typescript
describe('TaskSelector', () => {
  test('選択中のタスク情報を表示', () => {
    const { getByText } = render(
      <TaskSelector selectedTaskId="task001" />
    );
    expect(getByText('タスク001')).toBeInTheDocument();
  });

  test('新規タスク選択時にタグを表示', () => {
    const { getByText } = render(
      <TaskSelector selectedTaskId="new" />
    );
    expect(getByText('新規タスク')).toBeInTheDocument();
    expect(getByText('新規')).toBeInTheDocument();
  });

  test('未選択時のメッセージを表示', () => {
    const { getByText } = render(
      <TaskSelector selectedTaskId={null} />
    );
    expect(getByText('タスクが選択されていません')).toBeInTheDocument();
  });

  test('無効時のメッセージを表示', () => {
    const { getByText } = render(
      <TaskSelector 
        selectedTaskId={null}
        disabled={true}
      />
    );
    expect(getByText('プロジェクトを選択してください')).toBeInTheDocument();
  });

  test('無効時に透明度が変わる', () => {
    const { container } = render(
      <TaskSelector 
        selectedTaskId={null}
        disabled={true}
      />
    );
    const card = container.querySelector('.ant-card');
    expect(card).toHaveStyle({ opacity: 0.6 });
  });

  test('タグのないタスクではタグを表示しない', () => {
    const { queryByText } = render(
      <TaskSelector selectedTaskId="task001" />
    );
    expect(queryByText('新規')).not.toBeInTheDocument();
  });
});
```

---

## 12. セキュリティ

### 12.1 セキュリティ考慮事項

- **XSS対策**: Ant Design の Text コンポーネントが自動的にエスケープ処理
- **データ検証**: find() での安全な検索（Optional chaining使用）

---

## 13. 関連ドキュメント

### 13.1 関連コンポーネント

- [ProjectSelector](ui_project_selector.md) - プロジェクト選択コンポーネント（同様の構造）
- [MethodSelector](ui_method_selector.md) - メソッド選択コンポーネント（同様の構造）
- [TaskSelectionDialog](ui_task_selection_dialog.md) - このコンポーネントを使用するダイアログ
- [MethodTaskSelectionModal](ui_method_task_selection_modal.md) - このコンポーネントを使用するモーダル
- [ExperimentRecordTab](ui_experiment_record_tab.md) - 使用元のタブ

### 13.2 関連仕様

- [.clinerules/references/ui_policy.md](../../.clinerules/references/ui_policy.md) - UI設計ポリシー
- [.clinerules/development/frontend.md](../../.clinerules/development/frontend.md) - フロントエンド規約

---

## 14. 備考

### 14.1 設計パターン

このコンポーネントは「**セレクタ表示パターン**」を実装しています：

```
共通パターン:
- Card (小サイズ)
- アイコン + ラベル（ヘッダー）
- 選択中の詳細情報（左パディング24px）
- 未選択/無効メッセージ
- 選択状態での色変更
- 無効状態の透明度変更
```

**他のセレクタとの違い:**
- ✅ **Props が最もシンプル**: selectedTaskId と disabled のみ
- ✅ **データ内蔵**: コンポーネント内でダミーデータを定義（TODO: API統合）
- ✅ **タグ表示**: オプショナルなタグ表示機能
- ⚠️ **タスク数表示なし**: トランジション数のような数値情報なし

### 14.2 将来の拡張

- ✅ **API統合**: 現在のダミーデータをAPI取得に置き換え
  ```typescript
  // 将来の実装例
  interface TaskSelectorProps {
    tasks: Task[];  // Props で渡すように変更
    selectedTaskId: string | null;
    disabled?: boolean;
  }
  ```
- ✅ **onSelectTask の実装**: 現在は未使用だが、クリック選択機能を追加可能
- ⚠️ **ローディング状態**: データ取得中の表示
- ⚠️ **エラー状態**: タスクが見つからない場合の表示
- ⚠️ **タスクステータス表示**: 進行中、完了などのステータス

### 14.3 技術的な注意点

1. **データ依存性**: 現在はコンポーネント内でダミーデータを定義
   - API統合時に Props で tasks 配列を受け取る設計に変更が必要
2. **Props の未使用**: onSelectTask が定義されているが使用されていない
3. **表示専用**: 現在はインタラクティブな操作はできない（表示のみ）
4. **disabled の制御**: 親コンポーネントでプロジェクト選択状態を監視して制御

### 14.4 使用例

```typescript
// ExperimentRecordTab内での使用例
<TaskSelector
  selectedTaskId={selectedTaskId}
  disabled={!selectedProject}  // プロジェクト未選択時は無効
/>
```

### 14.5 API統合時の対応

現在のダミーデータ実装から、以下のように変更する予定：

**現在:**
```typescript
// コンポーネント内でダミーデータを定義
const tasks = [
  { taskId: 'new', taskName: '新規タスク', tag: '新規' },
  // ...
];
```

**API統合後:**
```typescript
// Props で受け取るように変更
interface TaskSelectorProps {
  tasks: Task[];                // ← 追加
  selectedTaskId: string | null;
  onSelectTask?: (taskId: string) => void;
  disabled?: boolean;
}

// 親コンポーネントから渡す
<TaskSelector
  tasks={tasksFromAPI}         // ← API取得データ
  selectedTaskId={selectedTaskId}
  disabled={!selectedProject}
/>
```

---

## 15. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |
