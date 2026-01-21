# TaskSelectionDialog UI設計書

## メタデータ
- **コンポーネントID**: TaskSelectionDialog
- **コンポーネント名**: タスク選択ダイアログ
- **ファイルパス**: `frontend/src/components/ExperimentWorker/TaskSelectionDialog.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 コンポーネントの目的
選択されたプロジェクトとメソッドに紐づくタスクを選択するためのダイアログです。タスク一覧をリスト形式で表示し、クリックで選択します。

### 1.2 主要機能
- タスク一覧のリスト表示
- クリックによる単一選択
- ステータスタグ表示（未着手、着手、進行中、完了、中断、強制終了）
- ホバーエフェクト
- 選択状態の視覚的フィードバック
- 空状態処理（プロジェクト未選択、メソッド未選択、タスクなし）
- スクロール可能なリスト

### 1.3 使用場所
- ExperimentRecordTab（実験記録タブ）
- ProgressCheckTab（進捗確認タブ）
- InstructionConfirmationTab（指示確認タブ）

### 1.4 ProjectSelectionModal / MethodSelectionModalとの違い

| 項目 | Project/Method | Task |
|------|---------------|------|
| 表示形式 | Table | List |
| 選択UI | ラジオボタン | クリック選択（背景色変化） |
| フィルタリング | 検索・フィルター機能あり | なし |
| ページネーション | あり | なし（スクロール） |
| ステータス表示 | 列として表示 | タグとして表示 |

---

## 2. コンポーネント構成

### 2.1 レイアウト構造

```
┌─Modal────────────────────────────────────────────────┐
│ Header: [AimOutlined] タスクを選択                    │
│         プロジェクト: XXX / メソッド: YYY             │
├──────────────────────────────────────────────────────┤
│ Body: (maxHeight: 500px、スクロール可能)              │
│ ┌────────────────────────────────────────────────┐  │
│ │ List Item 1                                     │  │
│ │ ┌──────────────────────────────────────────┐  │  │
│ │ │[Icon] タスク名A [未着手] [現在選択中]    │  │  │
│ │ │      タスクID: task_001                  │  │  │
│ │ │      サンプル番号: S001                  │  │  │
│ │ │      備考: ...                           │  │  │
│ │ └──────────────────────────────────────────┘  │  │
│ │ List Item 2（選択中・背景色変更）           │  │
│ │ ┌──────────────────────────────────────────┐  │  │
│ │ │[Icon] タスク名B [進行中] [選択中]        │  │  │
│ │ │      タスクID: task_002                  │  │  │
│ │ └──────────────────────────────────────────┘  │  │
│ │ List Item 3                                     │  │
│ │ ┌──────────────────────────────────────────┐  │  │
│ │ │[Icon] タスク名C [完了]                   │  │  │
│ │ │      タスクID: task_003                  │  │  │
│ │ └──────────────────────────────────────────┘  │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ 空状態（プロジェクト未選択時）:                      │
│ ┌────────────────────────────────────────────────┐  │
│ │         [Icon]                                  │  │
│ │   プロジェクトを選択してください                │  │
│ └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│ Footer:                                               │
│              [キャンセル]  [決定]                     │
│               (default)   (primary, disabled if !selected) │
└──────────────────────────────────────────────────────┘

モーダル幅: 700px
リスト高さ: 最大500px（スクロール可能）
```

### 2.2 使用コンポーネント

#### Ant Design コンポーネント
- `Modal` - モーダルダイアログ
- `List` - タスク一覧リスト
- `List.Item` - タスクリストアイテム
- `List.Item.Meta` - アイテムメタ情報（アバター、タイトル、説明）
- `Tag` - ステータス・選択状態タグ
- `Button` - キャンセル、決定ボタン（Modalのfooter）
- `Space` - 要素間隔制御
- `Typography.Text` - テキスト表示
- `theme` - デザイントークン取得

#### アイコン
- `AimOutlined` - タスクアイコン
- `CheckOutlined` - 決定アイコン

---

## 3. Props

```typescript
interface TaskSelectionDialogProps {
  open: boolean;                              // ダイアログの開閉状態
  onClose: () => void;                        // 閉じるイベントハンドラ
  selectedProject: string;                    // 選択中のプロジェクトID
  selectedMethodId: string | null;            // 選択中のメソッドID
  selectedTaskId: string | null;              // 選択中のタスクID
  onSelectTask: (taskId: string) => void;     // タスク選択イベント
}
```

**重要な前提条件:**
- `selectedProject`と`selectedMethodId`が両方指定されている前提
- どちらかが未選択の場合、空状態メッセージを表示

---

## 4. State（内部状態）

```typescript
// 一時選択状態（決定ボタン押下時に確定）
const [tempTaskId, setTempTaskId] = useState<string | null>(selectedTaskId);
```

### 4.1 状態のリセットタイミング

ダイアログが開かれた時（`open === true`）に以下をリセット：
- `tempTaskId` ← `selectedTaskId`（現在の選択状態を復元）

---

## 5. データ構造

### 5.1 データ型定義

```typescript
interface Task {
  taskId: string;           // タスクID
  taskName: string;         // タスク名
  status: string;           // ステータス
  sampleNumber?: string;    // サンプル番号（オプション）
  notes?: string;           // 備考（オプション）
}
```

### 5.2 データソース

```typescript
// 選択中のプロジェクト情報を取得
const projectData = selectedProject ? projectsData[selectedProject] : null;

// 選択中のメソッド情報を取得
const methods: Method[] = projectData?.methods || [];
const methodData = selectedMethodId
  ? methods.find((m) => m.methodId === selectedMethodId)
  : null;

// 選択中のメソッドに紐づくタスク一覧を取得
const tasks: Task[] = methodData?.tasks || [];
```

**データ取得の流れ:**
1. `selectedProject` → プロジェクトデータ取得
2. プロジェクトデータ → メソッド一覧取得
3. `selectedMethodId` → 特定のメソッドデータ取得
4. メソッドデータ → タスク一覧取得

### 5.3 ステータス定義

| ステータス値 | 表示テキスト | タグカラー |
|------------|--------------|-----------|
| not_started | 未着手 | デフォルト |
| started | 着手 | blue |
| in_progress | 進行中 | orange |
| completed | 完了 | green |
| suspended | 中断 | red |
| forced_terminated | 強制終了 | red |

```typescript
const getStatusTag = (status: string) => {
  switch (status) {
    case 'not_started':
      return <Tag>未着手</Tag>;
    case 'started':
      return <Tag color="blue">着手</Tag>;
    case 'in_progress':
      return <Tag color="orange">進行中</Tag>;
    case 'completed':
      return <Tag color="green">完了</Tag>;
    case 'suspended':
      return <Tag color="red">中断</Tag>;
    case 'forced_terminated':
      return <Tag color="red">強制終了</Tag>;
    default:
      return null;
  }
};
```

---

## 6. リストアイテム

### 6.1 アイテム構造

```typescript
<List.Item
  onClick={() => setTempTaskId(task.taskId)}
  style={{
    cursor: 'pointer',
    padding: token.paddingMD,
    backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
    borderRadius: token.borderRadius,
    marginBottom: token.marginXS,
    transition: 'all 0.2s',
    border: isCurrentlySelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
  }}
>
  <List.Item.Meta
    avatar={<AimOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
    title={
      <Space>
        <Text strong>{task.taskName}</Text>
        {getStatusTag(task.status)}
        {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
        {isSelected && !isCurrentlySelected && <Tag color="red">選択中</Tag>}
      </Space>
    }
    description={
      <Space direction="vertical" size={0}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          タスクID: {task.taskId}
        </Text>
        {task.sampleNumber && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            サンプル番号: {task.sampleNumber}
          </Text>
        )}
        {task.notes && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            備考: {task.notes}
          </Text>
        )}
      </Space>
    }
  />
</List.Item>
```

### 6.2 選択状態の表示

**3つの状態:**

1. **未選択**: 背景色 = `transparent`、ボーダーなし
2. **一時選択中（tempTaskId）**: 背景色 = `token.colorPrimaryBg`、タグ「選択中」（red）
3. **現在選択中（selectedTaskId）**: ボーダー = `token.colorPrimary`、タグ「現在選択中」（blue）

**状態の組み合わせ:**
- 現在選択中 & 一時選択中: 背景色 + ボーダー + タグ「現在選択中」
- 現在選択中 & 一時未選択: ボーダーのみ + タグ「現在選択中」
- 現在未選択 & 一時選択中: 背景色のみ + タグ「選択中」

### 6.3 ホバーエフェクト

```typescript
onMouseEnter={(e) => {
  if (!isSelected) {
    e.currentTarget.style.backgroundColor = token.colorBgTextHover;
  }
}}
onMouseLeave={(e) => {
  if (!isSelected) {
    e.currentTarget.style.backgroundColor = 'transparent';
  }
}}
```

- 選択中でない場合のみホバー時に背景色を変更
- `token.colorBgTextHover`を使用

---

## 7. イベント

### 7.1 イベント一覧

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleOk | 決定ボタンクリック | tempTaskIdが変更されていれば親に通知してダイアログを閉じる |
| handleCancel | キャンセルボタンクリック | tempTaskIdをリセットしてダイアログを閉じる |
| onClick (List.Item) | リストアイテムクリック | tempTaskIdを更新 |

### 7.2 イベント詳細

#### handleOk（決定）

```typescript
const handleOk = () => {
  if (tempTaskId !== selectedTaskId) {
    onSelectTask(tempTaskId || '');  // 変更があった場合のみ通知
  }
  onClose();
};
```

**特徴:**
- 選択状態が変更された場合のみ`onSelectTask`を呼び出す
- 変更がない場合は単にダイアログを閉じる

#### handleCancel（キャンセル）

```typescript
const handleCancel = () => {
  setTempTaskId(selectedTaskId);  // 元の選択状態に戻す
  onClose();
};
```

#### リストアイテムクリック

```typescript
onClick={() => setTempTaskId(task.taskId)}
```

- クリックで即座に一時選択状態を更新
- 決定ボタン押下で確定

---

## 8. スタイリング

### 8.1 モーダルスタイル

```typescript
<Modal
  open={open}
  onCancel={handleCancel}
  onOk={handleOk}
  width={700}  // モーダル幅
  title={modalTitle}
  okText="決定"
  cancelText="キャンセル"
  okButtonProps={{
    disabled: !tempTaskId,  // タスク未選択時は無効
    icon: <CheckOutlined />,
  }}
>
```

### 8.2 タイトルスタイル

```typescript
<Space direction="vertical" size={0}>
  <Space>
    <AimOutlined style={{ color: token.colorPrimary }} />
    <Text strong>タスクを選択</Text>
  </Space>
  <Text type="secondary" style={{ fontSize: 12 }}>
    プロジェクト: {projectData?.projectName || '未選択'} / メソッド: {methodData?.methodName || '未選択'}
  </Text>
</Space>
```

**特徴:**
- 2行構成（タイトル + コンテキスト情報）
- コンテキスト情報にプロジェクト名・メソッド名を表示
- `size={0}`で行間を詰める

### 8.3 リストコンテナスタイル

```typescript
<div style={{ maxHeight: 500, overflowY: 'auto' }}>
  <List
    dataSource={tasks}
    renderItem={renderTaskItem}
    style={{ padding: `${token.paddingSM}px 0` }}
  />
</div>
```

- 最大高さ: 500px
- 縦スクロール可能
- リストの上下にパディング

---

## 9. 空状態処理

### 9.1 空状態の種類

TaskSelectionDialogには3種類の空状態があります：

#### 1. プロジェクト未選択

```typescript
{!selectedProject ? (
  <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
    <AimOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />
    <Text type="secondary">プロジェクトを選択してください</Text>
  </Space>
) : ...}
```

#### 2. メソッド未選択

```typescript
{!selectedMethodId ? (
  <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
    <AimOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />
    <Text type="secondary">メソッドを選択してください</Text>
  </Space>
) : ...}
```

#### 3. タスクなし

```typescript
{tasks.length === 0 ? (
  <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
    <AimOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />
    <Text type="secondary">選択されたメソッドにタスクがありません</Text>
    <Text type="secondary" style={{ fontSize: 12 }}>
      プロジェクト: {projectData?.projectName || '未選択'}
    </Text>
    <Text type="secondary" style={{ fontSize: 12 }}>
      メソッド: {methodData?.methodName || '未選択'}
    </Text>
  </Space>
) : ...}
```

**空状態デザイン共通要素:**
- 大きなアイコン（48px）
- グレーアウトされた色（`token.colorTextDisabled`）
- 中央揃え
- 上下左右のパディング（`token.marginXL`）

---

## 10. アクセシビリティ

### 10.1 キーボード操作

- Tabキーでリストアイテム間のフォーカス移動（ブラウザデフォルト）
- Enterキーで決定ボタン実行
- Escapeキーでキャンセル
- リストアイテムはクリック操作のみ（キーボード選択は未対応）

### 10.2 スクリーンリーダー対応

- Modal titleでダイアログの目的を明示
- List.Item.Metaでアイテムの情報を構造化
- タグでステータスを明示

---

## 11. パフォーマンス考慮事項

### 11.1 データ取得の最適化

```typescript
// プロジェクトデータの取得（selectedProjectが変更された時のみ）
const projectData = selectedProject ? projectsData[selectedProject] : null;

// メソッドデータの取得（projectDataが変更された時のみ）
const methods: Method[] = projectData?.methods || [];

// タスクデータの取得（methodDataが変更された時のみ）
const tasks: Task[] = methodData?.tasks || [];
```

**注意:**
- useMemoは使用されていない
- データ量が少ない場合は問題ないが、大量データの場合は最適化が必要

### 11.2 レンダリング最適化

- リストアイテムのホバーエフェクトはインラインスタイルで実装
- transition効果（0.2s）でスムーズなアニメーション
- List.Itemの`key`プロパティは自動設定（List内部）

---

## 12. 備考

### 12.1 特記事項

1. **一時選択状態**
   - リストアイテムクリックで`tempTaskId`を更新
   - 決定ボタン押下時のみ親コンポーネントに通知
   - キャンセル時は元の選択状態に戻る

2. **プロジェクト・メソッド依存**
   - 必ず`selectedProject`と`selectedMethodId`が指定されている前提
   - どちらかが未選択の場合、空状態メッセージを表示
   - タスク一覧は選択されたメソッドに紐づくもののみ

3. **選択状態の表示**
   - 「現在選択中」: 親コンポーネントで確定済みのタスク
   - 「選択中」: ダイアログ内で一時的に選択したタスク
   - ボーダーと背景色で視覚的に区別

4. **ステータス表示**
   - 6種類のステータスをタグで表示
   - 色分けで視覚的に識別しやすい
   - 完了（緑）、進行中（オレンジ）、中断・強制終了（赤）

5. **空状態の充実**
   - 3種類の空状態メッセージ
   - ユーザーが次に何をすべきか明確
   - タスクなしの場合、プロジェクト名・メソッド名を表示して状況を明確化

6. **スクロール対応**
   - 最大高さ500pxでスクロール可能
   - ページネーションなし（タスク数は通常少ないため）

7. **Table形式ではない理由**
   - タスク情報が多階層（タスク名、ID、サンプル番号、備考、ステータス）
   - Listの方が情報を見やすく配置できる
   - クリック領域が大きく、操作しやすい

### 12.2 ProjectSelectionModal / MethodSelectionModalとの比較

| 機能 | Project/Method Modal | Task Dialog |
|------|---------------------|-------------|
| 表示形式 | Table（テーブル） | List（リスト） |
| 選択UI | ラジオボタン | クリック選択 |
| 検索機能 | あり（あいまい検索） | なし |
| フィルター | プロジェクト名、所有者など | なし |
| ソート | 一部カラム | なし |
| ページネーション | あり（10, 20, 50, 100） | なし（スクロール） |
| 選択解除ボタン | あり（左下） | なし |
| 空状態種類 | 1種類 | 3種類 |
| ホバーエフェクト | Table行全体 | List.Item背景色 |
| 決定ボタン無効化 | 選択中のみ有効 | タスク選択中のみ有効 |

### 12.3 将来の拡張

1. タスクのソート機能（ステータス、タスク名）
2. タスクの検索・フィルタリング機能
3. タスクの詳細情報プレビュー
4. キーボードによるリストアイテム選択
5. 仮想スクロール（大量タスク対応）
6. タスクのグループ化表示
7. タスクの優先度表示
8. 期限表示
9. 担当者表示
10. useMemoによるデータ取得の最適化

### 12.4 関連ドキュメント

- [ProjectSelectionModal UI設計書](./ui_project_selection_modal.md)
- [MethodSelectionModal UI設計書](./ui_method_selection_modal.md)
- [MethodTaskSelectionModal UI設計書](./ui_method_task_selection_modal.md)
- [ExperimentRecordTab UI設計書](./ui_experiment_record_tab.md)
- [ProgressCheckTab UI設計書](./ui_progress_check_tab.md)
- [InstructionConfirmationTab UI設計書](./ui_instruction_confirmation_tab.md)

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |
