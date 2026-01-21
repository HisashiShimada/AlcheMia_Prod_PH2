# MethodSelectionModal UI設計書

## メタデータ
- **コンポーネントID**: MethodSelectionModal
- **コンポーネント名**: メソッド選択モーダル
- **ファイルパス**: `frontend/src/components/ExperimentWorker/MethodSelectionModal.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 コンポーネントの目的
選択されたプロジェクトに紐づくメソッド（タスク）を選択するためのモーダルダイアログです。メソッド一覧をテーブル形式で表示し、検索・フィルタリング機能を提供します。

### 1.2 主要機能
- メソッド一覧のテーブル表示
- ラジオボタンによる単一選択
- あいまい検索機能（メソッド名、説明）
- メソッド名フィルター
- 所有者フィルター
- ソート機能（メソッド名、所有者）
- 選択解除機能
- ページネーション

### 1.3 使用場所
- ExperimentRecordTab（実験記録タブ）
- ProgressCheckTab（進捗確認タブ）
- InstructionConfirmationTab（指示確認タブ）

---

## 2. コンポーネント構成

### 2.1 レイアウト構造

```
┌─Modal────────────────────────────────────────────────────────┐
│ Header: [ToolOutlined] メソッド選択                          │
├──────────────────────────────────────────────────────────────┤
│ Body:                                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ フィルタリングエリア                                     │  │
│ │ ┌──────────┬──────────┬──────────┐                     │  │
│ │ │[検索BOX] │[メソッド名]│[所有者]│                     │  │
│ │ │  400px   │  150px   │ 150px  │                     │  │
│ │ └──────────┴──────────┴──────────┘                     │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ Table (高さ: 350px、スクロール可能)                      │  │
│ │ ┌──────┬────────────┬────────────┐                    │  │
│ │ │[○]   │メソッド名  │説明        │所有者│            │  │
│ │ ├──────┼────────────┼────────────┤                    │  │
│ │ │[○]   │Method A    │...         │UserA│            │  │
│ │ │[●]   │Method B    │...         │UserB│（選択中）  │  │
│ │ │[○]   │Method C    │...         │UserC│            │  │
│ │ └──────┴────────────┴────────────┘                    │  │
│ │ Pagination: [1] [2] [3] ... 全X件                      │  │
│ │                                                          │  │
│ │ 空状態: "メソッドがありません"                           │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ Footer:                                                       │
│ [選択解除] ────────────────────── [キャンセル] [決定]       │
│  (danger)                                 (default) (primary) │
└──────────────────────────────────────────────────────────────┘

モーダル幅: 900px
テーブル高さ: 350px（スクロール可能）
```

### 2.2 使用コンポーネント

#### Ant Design コンポーネント
- `Modal` - モーダルダイアログ
- `Table` - メソッド一覧テーブル
- `Input` - あいまい検索入力
- `Select` - メソッド名・所有者フィルター
- `Button` - 選択解除、キャンセル、決定ボタン
- `Space` - 要素間隔制御
- `Row`, `Col` - フィルターエリアのレイアウト
- `Typography.Text` - テキスト表示
- `theme` - デザイントークン取得

#### アイコン
- `ToolOutlined` - メソッドアイコン
- `CheckOutlined` - 決定アイコン
- `CloseOutlined` - 選択解除アイコン
- `SearchOutlined` - 検索アイコン

---

## 3. Props

```typescript
interface MethodSelectionModalProps {
  open: boolean;                            // モーダルの開閉状態
  onClose: () => void;                      // 閉じるイベントハンドラ
  selectedProject: string;                  // 選択中のプロジェクトID
  selectedMethodId: string | null;          // 選択中のメソッドID
  onMethodChange: (methodId: string | null) => void;  // メソッド変更イベント
}
```

**重要な前提条件:**
- `selectedProject`が空の場合、メソッド一覧は空になる
- プロジェクトが選択されていない状態でこのモーダルを開くことは想定していない

---

## 4. State（内部状態）

```typescript
// 一時選択状態（決定ボタン押下時に確定）
const [tempMethodId, setTempMethodId] = useState<string | null>(selectedMethodId);

// フィルター状態
const [searchText, setSearchText] = useState<string>('');
const [selectedMethodName, setSelectedMethodName] = useState<string | undefined>(undefined);
const [selectedOwner, setSelectedOwner] = useState<string | undefined>(undefined);
```

### 4.1 状態のリセットタイミング

モーダルが開かれた時（`open === true`）に以下をリセット：
- `tempMethodId` ← `selectedMethodId`（現在の選択状態を復元）
- `searchText` ← `''`（検索テキストをクリア）
- `selectedMethodName` ← `undefined`（メソッド名フィルターをクリア）
- `selectedOwner` ← `undefined`（所有者フィルターをクリア）

---

## 5. テーブルデータ

### 5.1 データ型定義

```typescript
interface MethodTableData {
  key: string;                   // 行キー（methodId）
  methodId: string;              // メソッドID
  methodName: string;            // メソッド名
  description: string;           // 説明
  owner: string;                 // 所有者
  isCurrentlySelected: boolean;  // 現在選択中フラグ
}
```

### 5.2 データソース

```typescript
const methods = useMemo(() => {
  if (!selectedProject) return [];
  const project = projectsData[selectedProject];
  return project?.methods || [];
}, [selectedProject]);
```

- **ソース**: `projectsData[selectedProject].methods`
- **フィルター条件**: なし（プロジェクトに紐づくすべてのメソッドを表示）
- **所有者**: プロジェクトの`workAssignment.assignedBy.userName`を使用

### 5.3 テーブルカラム定義

| カラム | dataIndex | 幅 | 配置 | ソート | 説明 |
|--------|-----------|-----|------|-------|------|
| メソッド名 | methodName | 200px | left | ○ | ToolOutlinedアイコン付き、太字表示 |
| 説明 | description | auto | left | × | 省略表示（ellipsis）、セカンダリカラー |
| 所有者 | owner | 150px | left | ○ | ユーザー名表示 |

**ソート機能:**
```typescript
{
  title: 'メソッド名',
  sorter: (a, b) => a.methodName.localeCompare(b.methodName),
}
{
  title: '所有者',
  sorter: (a, b) => a.owner.localeCompare(b.owner),
}
```

---

## 6. フィルタリング機能

### 6.1 あいまい検索

**対象フィールド:**
- メソッド名（`methodName`）
- 説明（`description`）

**検索ロジック:**
```typescript
const matchesSearch = !searchText || 
  item.methodName.toLowerCase().includes(searchText.toLowerCase()) ||
  item.description.toLowerCase().includes(searchText.toLowerCase());
```

**注意:** ProjectSelectionModalと異なり、所有者は検索対象に含まれない

### 6.2 メソッド名フィルター

- **種類**: 完全一致フィルター
- **選択肢**: テーブルデータから重複を除いた一意のメソッド名リスト
- **ソート**: アルファベット順

```typescript
const methodNameOptions = useMemo(() => {
  const uniqueNames = Array.from(new Set(allTableData.map(item => item.methodName)));
  return uniqueNames.sort().map(name => ({ label: name, value: name }));
}, [allTableData]);
```

### 6.3 所有者フィルター

- **種類**: 完全一致フィルター
- **選択肢**: テーブルデータから重複を除いた一意の所有者リスト
- **ソート**: アルファベット順

```typescript
const ownerOptions = useMemo(() => {
  const uniqueOwners = Array.from(new Set(allTableData.map(item => item.owner)));
  return uniqueOwners.sort().map(owner => ({ label: owner, value: owner }));
}, [allTableData]);
```

**注意:** 通常、メソッドの所有者はプロジェクトの所有者と同じため、選択肢は1つになることが多い

### 6.4 フィルタリング適用

すべてのフィルター条件はAND条件で適用されます。

```typescript
const filteredData = useMemo(() => {
  return allTableData.filter(item => {
    return matchesSearch && matchesMethodName && matchesOwner;
  });
}, [allTableData, searchText, selectedMethodName, selectedOwner]);
```

---

## 7. イベント

### 7.1 イベント一覧

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleOk | 決定ボタンクリック | tempMethodIdを親に通知してモーダルを閉じる |
| handleCancel | キャンセルボタンクリック | tempMethodIdをリセットしてモーダルを閉じる |
| handleClearSelection | 選択解除ボタンクリック | tempMethodIdをnullに設定 |
| rowSelection.onChange | テーブル行選択 | tempMethodIdを更新 |
| setSearchText | 検索入力変更 | 検索テキストを更新（即座にフィルタリング） |
| setSelectedMethodName | メソッド名選択 | メソッド名フィルターを更新 |
| setSelectedOwner | 所有者選択 | 所有者フィルターを更新 |

### 7.2 イベント詳細

#### handleOk（決定）

```typescript
const handleOk = () => {
  onMethodChange(tempMethodId);  // nullの可能性あり
  onClose();
};
```

#### handleCancel（キャンセル）

```typescript
const handleCancel = () => {
  setTempMethodId(selectedMethodId);  // 元の選択状態に戻す
  onClose();
};
```

#### handleClearSelection（選択解除）

```typescript
const handleClearSelection = () => {
  setTempMethodId(null);  // 選択を解除
};
```

#### 行選択

```typescript
const rowSelection = {
  type: 'radio' as const,  // ラジオボタン（単一選択）
  selectedRowKeys: tempMethodId ? [tempMethodId] : [],
  onChange: (selectedRowKeys: React.Key[]) => {
    setTempMethodId((selectedRowKeys[0] as string) || null);
  },
};
```

---

## 8. スタイリング

### 8.1 モーダルスタイル

```typescript
<Modal
  open={open}
  onCancel={handleCancel}
  width={900}  // モーダル幅
  title={...}
  footer={...}
>
```

### 8.2 ヘッダースタイル

```typescript
<Space>
  <ToolOutlined style={{ color: token.colorPrimary }} />
  <Text strong>メソッド選択</Text>
</Space>
```

### 8.3 フッタースタイル

ProjectSelectionModalと同様の構造：
- 左側: 選択解除ボタン（danger）
- 右側: キャンセル・決定ボタン

### 8.4 テーブルスタイル

```typescript
<Table
  columns={columns}
  dataSource={filteredData}
  rowSelection={rowSelection}
  pagination={{
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `全 ${total} 件`,
    pageSizeOptions: ['10', '20', '50'],
    showQuickJumper: true,
  }}
  scroll={{ y: 350 }}
  size="middle"
  locale={{
    emptyText: 'メソッドがありません',
  }}
/>
```

**注意:** pageSizeOptionsが`['10', '20', '50']`（100がない）

---

## 9. レスポンシブ設計

### 9.1 フィルターエリアのレスポンシブ

```typescript
<Row gutter={16}>
  <Col flex="400px">  {/* 検索ボックス */}
    <Input placeholder="メソッド名、説明で検索" ... />
  </Col>
  <Col flex="150px">  {/* メソッド名フィルター */}
    <Select placeholder="メソッド名" ... />
  </Col>
  <Col flex="150px">  {/* 所有者フィルター */}
    <Select placeholder="所有者" ... />
  </Col>
</Row>
```

**ProjectSelectionModalとの違い:**
- プロジェクト名フィルターが200px → メソッド名フィルターが150px
- 合計750pxで同じ

---

## 10. ページネーション

### 10.1 設定

```typescript
pagination={{
  pageSize: 10,                    // 1ページあたり10件
  showSizeChanger: true,           // ページサイズ変更可能
  showTotal: (total) => `全 ${total} 件`,
  pageSizeOptions: ['10', '20', '50'],  // 100がない
  showQuickJumper: true,           // ページ番号入力可能
}}
```

---

## 11. 空状態処理

### 11.1 空状態メッセージ

```typescript
locale={{
  emptyText: 'メソッドがありません',
}}
```

**表示条件:**
- `selectedProject`が空の場合
- プロジェクトにメソッドが存在しない場合
- フィルタリング後のデータが0件の場合

---

## 12. アクセシビリティ

ProjectSelectionModalと同様：
- Tabキーでフォーカス移動
- Enterキーで決定ボタン実行
- Escapeキーでキャンセル
- テーブル行はクリックまたはラジオボタンで選択

---

## 13. パフォーマンス考慮事項

### 13.1 useMemoの使用

```typescript
// メソッド一覧取得
const methods = useMemo(() => {...}, [selectedProject]);

// プロジェクト情報取得
const projectInfo = useMemo(() => {...}, [selectedProject]);

// テーブルデータ生成
const allTableData = useMemo(() => {...}, [methods, projectInfo, selectedMethodId]);

// メソッド名選択肢
const methodNameOptions = useMemo(() => {...}, [allTableData]);

// 所有者選択肢
const ownerOptions = useMemo(() => {...}, [allTableData]);

// フィルタリング適用
const filteredData = useMemo(() => {...}, [allTableData, searchText, selectedMethodName, selectedOwner]);
```

### 13.2 最適化のポイント

1. **データソースの効率的な取得**: selectedProjectが変更された時のみ再計算
2. **メモ化**: 計算コストの高い処理をuseMemoで最適化
3. **仮想スクロール**: Table内部でAnt Designが提供
4. **ページネーション**: 大量データを分割表示

---

## 14. 備考

### 14.1 特記事項

1. **プロジェクト依存**
   - 必ず`selectedProject`が指定されている前提
   - プロジェクトが選択されていない場合、メソッド一覧は空

2. **一時選択状態**
   - テーブルで選択した内容は`tempMethodId`に保存
   - 決定ボタン押下時のみ親コンポーネントに通知
   - キャンセル時は元の選択状態に戻る

3. **選択解除機能**
   - メソッドの選択を解除できる
   - ボタンは選択中の場合のみ有効（`disabled={!tempMethodId}`）
   - 決定時に`null`が親に渡される

4. **所有者の取得**
   - プロジェクトの`workAssignment.assignedBy.userName`から取得
   - 取得できない場合は「不明」と表示
   - すべてのメソッドで同じ所有者になることが多い

5. **フィルターのクリア**
   - モーダルを開くたびにフィルターがリセットされる
   - ユーザーが前回のフィルター状態に惑わされない

6. **ソート機能**
   - メソッド名と所有者でソート可能
   - ProjectSelectionModalと異なり、ステータスカラムがないため列が少ない

### 14.2 ProjectSelectionModalとの主な違い

| 項目 | ProjectSelectionModal | MethodSelectionModal |
|------|----------------------|---------------------|
| データソース | projectsData全体 | 選択プロジェクトのmethods |
| 状態フィルター | あり（選択可能な状態のみ） | なし |
| テーブルカラム数 | 4列 | 3列 |
| あいまい検索対象 | 名前、説明、所有者 | 名前、説明のみ |
| ソート機能 | なし | メソッド名、所有者 |
| ページサイズ選択肢 | 10, 20, 50, 100 | 10, 20, 50 |
| 空状態メッセージ | カスタム | 'メソッドがありません' |

### 14.3 将来の拡張

1. メソッドステータスの追加と表示
2. メソッドの詳細情報プレビュー
3. タスク数の表示
4. 最終更新日時の表示
5. お気に入り機能
6. 最近選択したメソッドの履歴表示
7. 複数選択モード
8. フィルター状態の永続化
9. レスポンシブ対応の強化

### 14.4 関連ドキュメント

- [ProjectSelectionModal UI設計書](./ui_project_selection_modal.md)
- [TaskSelectionModal UI設計書](./ui_task_selection_modal.md)
- [ExperimentRecordTab UI設計書](./ui_experiment_record_tab.md)
- [ProgressCheckTab UI設計書](./ui_progress_check_tab.md)
- [InstructionConfirmationTab UI設計書](./ui_instruction_confirmation_tab.md)

---

## 15. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |
