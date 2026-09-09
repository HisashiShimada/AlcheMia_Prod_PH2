# IssueManagementModal UI設計書

## メタチE�Eタ
- **コンポ�EネンチED**: IssueManagementModal
- **コンポ�Eネント名**: 問題管琁E��ーダル
- **ファイルパス**: `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`
- **利用権陁E*: 実験作業老E��Experiment_worker�E�E
- **作�E日**: 2026-01-19
- **最終更新日**: 2026-08-27

---

## 1. 概要E

### 1.1 コンポ�Eネント�E目皁E
トランジションに関連する問題�E一覧表示、詳細閲覧、新規問題報告、コメント追加、スチE�Eタス変更機�Eを統合的に提供するモーダルです。問題�E全体像を把握し、効玁E��に管琁E��きます、E

### 1.2 主要機�E
- 問題一覧表示�E�検索・フィルタリング�E�E
- 問題詳細表示�E�タイトル、�E容、スチE�Eタス、コメント履歴�E�E
- 新規問題報告フォーム
- コメント追加
- スチE�Eタス変更�E�未解決/解決済！E
- 参�E専用モード対忁E
- 承認依頼中の編雁E��陁E

### 1.3 使用場所
- ExperimentWorkerMenu�E�実験作業老E��ニューの「問題報告」�Eタン経由�E�E
- ProgressCheckTab�E�進捗確認タブ！E
- InstructionConfirmationTab�E�指示確認タブ！E
- そ�E他、トランジション関連の問題管琁E��忁E��な場所

---

## 2. コンポ�Eネント構�E

### 2.1 画面イメージ
![問題管琁E��ーダルイメージ(新規報呁E](..\images\ui_issue_management_modal_1.jpg)
![問題管琁E��ーダルイメージ](..\images\ui_issue_management_modal_2.jpg)

### 2.2 レイアウト構造

```
┌─Modal�E�幁E1200px�E�───────────────────────────────────────────━E
━EHeader: [ExclamationCircleOutlined] 問題報呁E- {トランジション名} ━E
├──────────────────────────────────────────────────────────────┤
━E[新規問題報告] ボタン�E�EiewMode時�E非表示�E�E                   ━E
├──────────────────────────────────────────────────────────────┤
━EBody: 2カラムレイアウチE(Row/Col)                             ━E
━E┌─左側�E�Eol span=10�E�───────━E┌─右側�E�Eol span=14�E�─────━E━E
━E━ECard: 問題一覧             ━E━ECard: 問題詳細 or 新要E ━E━E
━E━E┌─検索・フィルター──━E    ━E━E                        ━E━E
━E━E━E[検索...]         ━E    ━E━E┌─問題詳細───────━E  ━E━E
━E━E━E[スチE�Eタス▼]     ━E    ━E━E━Eタイトル        ━E  ━E━E
━E━E└──────────────────━E    ━E━E━E状態�E対象      ━E  ━E━E
━E━E                          ━E━E━E報告老E�E時刻    ━E  ━E━E
━E━E┌─Table──────────━E      ━E━E━E冁E��            ━E  ━E━E
━E━E━E◁E問題A         ━E      ━E━E━E                ━E  ━E━E
━E━E━E  [未解決]      ━E      ━E━E━Eコメント一覧    ━E  ━E━E
━E━E━E◁E問題B (選択中) ━E      ━E━E━E                ━E  ━E━E
━E━E━E  [解決渁E      ━E      ━E━E━E[コメント�E力]  ━E  ━E━E
━E━E━E◁E問題C         ━E      ━E━E━E                ━E  ━E━E
━E━E━E  [未解決]      ━E      ━E━E━E[送信] [未解決]  ━E  ━E━E
━E━E━E...             ━E      ━E━E━E[解決]          ━E  ━E━E
━E━E└─────────────────━E      ━E━E└─────────────────━E  ━E━E
━E└───────────────────────────━E└─────────────────────────━E━E
━E高さ: calc(70vh - 100px)                                     ━E
└──────────────────────────────────────────────────────────────━E

モーダル幁E 1200px
モーダルトップ位置: 20px
destroyOnHidden: true
```

### 2.3 使用コンポ�EネンチE

#### Ant Design コンポ�EネンチE
- `Modal` - モーダルダイアログ
- `Row` / `Col` - 2カラムレイアウチE
- `Card` - 問題一覧カード、問題詳細カーチE
- `Table` - 問題一覧チE�Eブル
- `List` - コメント一覧
- `Form` - 新規問題報告フォーム
- `Form.Item` - フォーム頁E��
- `Input` - 検索、タイトル入劁E
- `Input.TextArea` - 冁E��入力、コメント�E劁E
- `Select` - スチE�Eタスフィルター、対象選択、問題タイプ選抁E
- `Button` - 吁E��ボタン
- `Tag` - スチE�Eタスタグ
- `Space` - 要素間隔制御
- `Typography.Text` / `Typography.Title` - チE��スト表示
- `Divider` - 区刁E��緁E
- `message` - ト�Eスト通知
- `Spin` - 問題一覧ローチE��ング表示

#### Reactフック
- `useState` - 吁E��状態管琁E
- `useMemo` - 派生値の計算！EilteredIssues, selectedIssue�E�E
- `useEffect` - モーダルオープン時�E問題一覧取征E
- `useCallback` - fetchIssues関数のメモ匁E

#### アイコン
- `ExclamationCircleOutlined` - 未解決アイコン
- `CheckCircleOutlined` - 解決済アイコン
- `PlusOutlined` - 新規問題報告アイコン

---

## 3. Props

```typescript
interface IssueManagementModalProps {
  open: boolean;                       // モーダルの表示状慁E
  /** タイトルに表示する名前 */
  targetName: string;
  /** 問題一覧取得�E新規報告に忁E��なプロジェクチED */
  projectId: string;
  /** コメント追加・スチE�Eタス変更に忁E��なプロジェクト名 */
  projectName: string;
  /** オプション: 省略時�Eプロジェクト�E件を取征E*/
  methodId?: string;
  /** オプション: タスク単位�E絞り込みに使用 */
  taskNo?: number;
  /** オプション: トランジション単位�E絞り込みに使用 */
  transitionId?: string;
  onClose: () => void;                 // 閉じるイベントハンドラ
  viewMode?: boolean;                  // 参�E専用モード（デフォルチE false�E�E
  filterTaskId?: string;               // フィルタリング用タスクID
  projectStatus?: ProjectStatus | null; // プロジェクトスチE�Eタス�E�編雁E��否の判定用�E�E
}

interface Issue {
  issueId: string;
  title: string;
  content: string;
  status: IssueStatus;
  targetType: IssueTargetType;
  projectName?: string;
  taskName?: string;
  transitionName?: string;
  reportedBy?: { userName: string };
  reportedAt: string;
  comments: IssueComment[];
  taskId?: string;
}

type IssueStatus = 'unresolved' | 'resolved';
type IssueTargetType = 'project' | 'task' | 'transition';
type ProjectStatus = 'draft' | 'waiting_approval' | 'active' | 'suspended' | 'completed';

interface IssueComment {
  content: string;
  createdBy: { userName: string };
  createdAt: string;
}

interface IssueReportFormData {
  title: string;
  targetType: IssueTargetType;
  issueType: string;
  content: string;
}
```

**Props詳細:**
- `open`: モーダルの表示/非表示を制御
- `targetName`: タイトルに表示する名前�E�トランジション名など�E�E
- `projectId`: 問題一覧取得�E新規報告に使用するプロジェクチED
- `projectName`: コメント追加・スチE�Eタス変更APIに使用するプロジェクト名
- `methodId`: 絞り込み用メソチE��ID�E�オプション、省略時�Eプロジェクト�E件を取得！E
- `taskNo`: タスク単位�E絞り込みに使用するタスク番号�E�オプション�E�E
- `transitionId`: トランジション単位�E絞り込みに使用するID�E�オプション�E�E
- `onClose`: モーダルを閉じるハンドラ
- `viewMode`: true の場合、参照専用モード（編雁E�E新規作�E不可�E�E
- `filterTaskId`: 持E��した場合、そのタスクIDの問題�Eみ表示
- `projectStatus`: プロジェクト�EスチE�Eタス�E�Ewaiting_approval'の場合�E編雁E��可�E�E

> **設計変更につぁE��:**
> 旧設計では `issues` Props として親コンポ�Eネントから問題一覧を受け取り、`onSubmitIssue` / `onSubmitComment` / `onUpdateStatus` コールバックを通じて操作してぁE��、E
> 現行設計では、コンポ�Eネント�E部で `issueApiService` を直接呼び出す設計に変更されており、親コンポ�Eネントから�EチE�Eタ受け渡し�E不要になってぁE��、E

---

## 4. State�E��E部状態！E

### 4.1 状態変数

```typescript
const [form] = Form.useForm();                          // 新規問題報告フォーム

// 問題一覧�E��E部state: コンポ�Eネント�E部でAPIから取得！E
const [issues, setIssues] = useState<Issue[]>([]);
const [issuesLoading, setIssuesLoading] = useState(false);

// 選択中の問題IDのみをstateで保持する
// selectedIssue 自体�E issues state から useMemo で導�Eすることで、E
// 再取得�Eた�Eに自動的に最新チE�Eタが反映されめE
const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);  // 選択中の問題ID

const [showNewIssueForm, setShowNewIssueForm] = useState(false);         // 新規報告フォーム表示状慁E
const [newComment, setNewComment] = useState('');                        // 新規コメントテキスチE

// フィルタリング用
const [searchText, setSearchText] = useState('');                        // 検索チE��スチE
const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');  // スチE�Eタスフィルター

// 問題一覧を�E取得する関数
const fetchIssues = useCallback(async () => {
  if (!projectId) return;
  setIssuesLoading(true);
  try {
    const data = await getIssues({ projectId, methodId, taskNo, transitionId });
    setIssues(data);
  } catch (error) {
    console.error('[IssueManagementModal] fetchIssues error:', error);
    message.error(extractErrorMessage(error));  // t() / extractErrorMessage() 経由
  } finally {
    setIssuesLoading(false);
  }
}, [projectId, methodId, taskNo, transitionId]);

// モーダルが開ぁE��時に問題一覧を取得すめE
useEffect(() => {
  if (open) {
    fetchIssues();
  }
}, [open, fetchIssues]);

// 選択中の問題を issues state から導�Eする�E�EseMemo�E�E
// issues が更新�E�コメント送信・スチE�Eタス変更後�E再取得）されると
// selectedIssue も�E動的に最新チE�Eタに追随し、コメント一覧が即時更新されめE
const selectedIssue = useMemo(
  () => issues.find((issue) => issue.issueId === selectedIssueId) ?? null,
  [issues, selectedIssueId]
);
```

**設計�EインチE**
- `issues` はPropsではなく�E部Stateとして保持し、コンポ�Eネント�E部でAPIから取得すめE
- `selectedIssue` はstateではなぁE`useMemo` で導�Eされる派生値
- `issues` stateが変化するた�Eに自動�E計算されるため、コメント送信後�E即時表示が実現されめE
- `fetchIssues` は `useCallback` でメモ化し、`useEffect` の依存�E列に安�Eに渡ぁE
- 吁E��作（問題報告�Eコメント送信・スチE�Eタス変更�E�後に `fetchIssues()` を�E呼び出しして最新状態を反映する

### 4.2 使用APIサービス�E�EssueApiService�E�E

こ�Eコンポ�Eネント�E `@/services/issueApiService` を直接インポ�Eトして使用します、E

```typescript
import {
  getIssues,
  createIssue,
  addComment,
  updateIssueStatus,
} from '@/services/issueApiService';
```

| 関数 | 用送E| 呼び出しタイミング |
|------|------|-----------------|
| `getIssues({ projectId, methodId, taskNo, transitionId })` | 問題一覧取征E| モーダルオープン時�E吁E��作征E|
| `createIssue({ projectId, methodId, issueType, targetType, taskNo, transitionId, title, description })` | 新規問題報呁E| 保存�EタンクリチE��晁E|
| `addComment({ projectName, issueId, comment })` | コメント追加 | コメント送信・スチE�Eタス変更晁E|
| `updateIssueStatus({ projectName, issueId, status })` | スチE�Eタス変更 | 未解決/解決ボタンクリチE��晁E|

**再取得パターン:**

吁E��作完亁E���E忁E�� `fetchIssues()` を呼び出し、最新状態を反映します、E

```
ユーザー操佁E
  ↁE
APIを直接呼び出し！EreateIssue / addComment / updateIssueStatus�E�E
  ↁE
成功メチE��ージ表示
  ↁE
fetchIssues() で一覧を�E取征E
  ↁE
issues state が更新
  ↁE
selectedIssue�E�EseMemo�E�が自動的に最新状態に追隁E
```

### 4.3 編雁E��否の判宁E

```typescript
// プロジェクトが承認依頼中の場合�E編雁E��可
const isApprovalPending = projectStatus === 'waiting_approval';
const isEditDisabled = viewMode || isApprovalPending;
```

**編雁E��可条件:**
- `viewMode === true`�E�参照専用モード！E
- `projectStatus === 'waiting_approval'`�E�承認依頼中�E�E

---

## 5. チE�Eタフィルタリング

### 5.1 フィルタリングロジチE��

```typescript
const filteredIssues = useMemo(() => {
  return issues.filter((issue) => {
    // タスクIDフィルタ�E�参照専用モード用�E�E
    if (filterTaskId && issue.taskId !== filterTaskId) {
      return false;
    }
    
    // あいまぁE��索�E�タイトル、�E容�E�E
    const matchesSearch =
      searchText === '' ||
      issue.title.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.content.toLowerCase().includes(searchText.toLowerCase());

    // スチE�Eタスフィルタ
    const matchesStatus =
      statusFilter === 'all' || issue.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
}, [issues, searchText, statusFilter, filterTaskId]);
```

**フィルター条件:**
1. **タスクIDフィルター**�E�EfilterTaskId`が指定されてぁE��場合！E
   - 持E��されたタスクIDの問題�Eみ表示

2. **あいまぁE��索**�E�EsearchText`�E�E
   - タイトル�E�部刁E��致、大斁E��小文字無視！E
   - 冁E���E�部刁E��致、大斁E��小文字無視！E

3. **スチE�Eタスフィルター**�E�EstatusFilter`�E�E
   - `'all'`: すべて表示
   - `'unresolved'`: 未解決のみ
   - `'resolved'`: 解決済�Eみ

**論理演箁E**
- 全ての条件をAND結合

---

## 6. 問題一覧�E�左側カラム�E�E

### 6.1 検索・フィルターUI

```typescript
<Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 12 }}>
  <Input
    placeholder={t('issueManagement.searchPlaceholder')}
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    allowClear
    style={{ width: '100%' }}
  />
  <Select
    placeholder={t('issueManagement.statusFilterPlaceholder')}
    value={statusFilter}
    onChange={(value) => setStatusFilter(value)}
    style={{ width: '100%' }}
    allowClear
    onClear={() => setStatusFilter('all')}
  >
    <Select.Option value="all">{t('issueManagement.all')}</Select.Option>
    <Select.Option value="unresolved">{t('issueManagement.status.unresolved')}</Select.Option>
    <Select.Option value="resolved">{t('issueManagement.status.resolved')}</Select.Option>
  </Select>
</Space>
```

### 6.2 チE�Eブル列定義�E�E行表示�E�E

```typescript
const columns: ColumnsType<Issue> = [
  {
    title: t('issueManagement.issueInfo'),
    key: 'issueInfo',
    render: (_, record: Issue) => (
      <div style={{ padding: '4px 0' }}>
        {/* 上段: タイトル */}
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: '14px' }}>
            {record.title}
          </Text>
        </div>
        {/* 下段: 状態と対象 */}
        <Space size="middle">
          {getStatusTag(record.status)}
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {getTargetTypeText(record.targetType)}
            {getTargetName(record) && (
              <>: {getTargetName(record)}</>
            )}
          </Text>
        </Space>
      </div>
    ),
  },
];
```

**表示冁E��:**
- **上段**: タイトル�E�太字、E4px�E�E
- **下段**: スチE�Eタスタグ + 対象タイプと対象名（グレー、E2px�E�E

### 6.3 行クリチE��イベンチE

```typescript
onRow={(record) => ({
  onClick: () => handleSelectIssue(record),
  style: {
    cursor: 'pointer',
    backgroundColor:
      selectedIssue?.issueId === record.issueId
        ? '#e6f7ff'
        : undefined,
  },
})}
```

**動佁E**
- 行クリチE��で問題を選抁E
- 選択行�E背景色 `#e6f7ff`�E�水色�E�E
- カーソルはポインター

### 6.4 スチE�Eタスタグの表示

```typescript
const getStatusTag = (status: IssueStatus) => {
  if (status === 'resolved') {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        {t('issueManagement.status.resolved')}
      </Tag>
    );
  }
  return (
    <Tag icon={<ExclamationCircleOutlined />} color="warning">
      {t('issueManagement.status.unresolved')}
    </Tag>
  );
};
```

| スチE�Eタス | アイコン | カラー | 表示チE��スチE|
|-----------|---------|-------|-------------|
| resolved | CheckCircleOutlined | success�E�緑！E| 解決渁E|
| unresolved | ExclamationCircleOutlined | warning�E�オレンジ�E�E| 未解決 |

---

## 7. 問題詳細�E�右側カラム�E�E

### 7.1 表示状態�E刁E��替ぁE

右側カラムには以下�E3つの状態があります！E

1. **問題未選択時**: 「問題を選択してください」テキスチE
2. **新規問題報告時**: 新規問題報告フォーム
3. **問題選択時**: 問題詳細表示

### 7.2 問題詳細の表示冁E��

#### 基本惁E��

```typescript
<Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
  {/* タイトル */}
  <div>
    <Text type="secondary">{t('issueManagement.details.title')}:</Text>
    <Title level={5}>{selectedIssue.title}</Title>
  </div>
  
  {/* 状態と対象 */}
  <Space size="large">
    <div>
      <Text type="secondary">{t('issueManagement.details.status')}: </Text>
      {getStatusTag(selectedIssue.status)}
    </div>
    <div>
      <Text type="secondary">{t('issueManagement.details.targetType')}: </Text>
      <Text>{getTargetTypeText(selectedIssue.targetType)}: {getTargetName(selectedIssue)}</Text>
    </div>
  </Space>
  
  {/* 報告老E��時刻 */}
  <Space size="large">
    <div>
      <Text type="secondary">{t('issueManagement.details.reportedBy')}: </Text>
      <Text>{selectedIssue.reportedBy?.userName || '-'}</Text>
    </div>
    <div>
      <Text type="secondary">{t('issueManagement.details.reportedAt')}: </Text>
      <Text>{new Date(selectedIssue.reportedAt).toLocaleString('ja-JP')}</Text>
    </div>
  </Space>
</Space>
```

#### 冁E��

```typescript
<div style={{ marginBottom: 16 }}>
  <Text type="secondary" strong>{t('issueManagement.details.content')}:</Text>
  <div style={{
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    whiteSpace: 'pre-wrap',
  }}>
    {selectedIssue.content}
  </div>
</div>
```

#### コメント一覧

```typescript
<div style={{ marginBottom: 16 }}>
  <Text type="secondary" strong>
    {t('issueManagement.details.commentsCount')} ({selectedIssue.comments.length})
  </Text>
  <List
    style={{ marginTop: 8, maxHeight: '200px', overflow: 'auto' }}
    dataSource={selectedIssue.comments}
    locale={{ emptyText: t('issueManagement.details.noComments') }}
    renderItem={(comment: IssueComment) => (
      <List.Item style={{ padding: '8px 0' }}>
        <div style={{ width: '100%' }}>
          {/* ユーザー名と時刻 */}
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: '13px' }}>
              {comment.createdBy.userName}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
              {new Date(comment.createdAt).toLocaleString('ja-JP')}
            </Text>
          </div>
          {/* コメント�E容 */}
          <div style={{
            padding: 8,
            backgroundColor: '#f5f5f5',
            borderRadius: 4,
            whiteSpace: 'pre-wrap',
          }}>
            {comment.content}
          </div>
        </div>
      </List.Item>
    )}
  />
</div>
```

**特徴:**
- コメント数を表示
- 最大高さ200px、スクロール可能
- 吁E��メント�E投稿老E��、投稿時刻、�E容を表示
- 投稿時刻は日本語ロケールでフォーマッチE

#### コメント�E力！EiewModeでは非表示�E�E

```typescript
<div style={{ marginBottom: 16 }}>
  <Text type="secondary" strong>コメントを追加</Text>
  <TextArea
    value={newComment}
    onChange={(e) => setNewComment(e.target.value)}
    rows={3}
    placeholder={isApprovalPending ? t('issueManagement.approvalPending.comment') : t('issueManagement.details.commentPlaceholder')}
    maxLength={500}
    showCount
    style={{ marginTop: 8 }}
    disabled={isEditDisabled}
  />
</div>
```

**設宁E**
- 行数: 3衁E
- 最大斁E��数: 500斁E��E
- 斁E��数カウント表示: あり
- 承認依頼中は非活性

#### ボタンエリア�E�EiewModeでは非表示�E�E

```typescript
<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
  <Button
    type="primary"
    onClick={handleCommentSubmit}
    disabled={!newComment.trim() || isEditDisabled}
  >
    {t('issueManagement.buttons.commentSubmit')}
  </Button>
  <Button
    onClick={handleSetUnresolved}
    disabled={!newComment.trim() || selectedIssue.status === 'unresolved' || isEditDisabled}
  >
    {t('issueManagement.buttons.unresolved')}
  </Button>
  <Button
    onClick={handleSetResolved}
    disabled={!newComment.trim() || selectedIssue.status === 'resolved' || isEditDisabled}
    style={{
      backgroundColor: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#52c41a' : undefined,
      borderColor: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#52c41a' : undefined,
      color: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#fff' : undefined,
    }}
  >
    {t('issueManagement.buttons.resolved')}
  </Button>
</div>
```

**ボタンの活性条件:**

| ボタン | 活性条件 |
|--------|---------|
| コメント送信 | コメントが入力されてぁE�� かつ 編雁E��能 |
| 未解決 | コメントが入力されてぁE�� かつ 現在のスチE�Eタスが「解決済、Eかつ 編雁E��能 |
| 解決 | コメントが入力されてぁE�� かつ 現在のスチE�Eタスが「未解決、Eかつ 編雁E��能 |

**ボタンのtooltip�E�承認依頼中�E�E**

承認依頼中�E�EisApprovalPending === true`�E��E場合、各ボタンに以下�E `title` tooltipが表示されます！E

| ボタン | tooltip |
|--------|---------|
| コメント送信 | `t('issueManagement.approvalPending.commentSubmit')` |
| 未解決 | `t('issueManagement.approvalPending.statusChange')` |
| 解決 | `t('issueManagement.approvalPending.statusChange')` |

---

## 8. 新規問題報告フォーム

### 8.1 フォーム頁E��

```typescript
<Form form={form} layout="vertical">
  <Form.Item
    label={t('issueManagement.form.title')}
    name="title"
    rules={[
      { required: true, message: t('issueManagement.form.titleRequired') },
      { max: 100, message: t('issueManagement.form.titleMaxLength') },
    ]}
  >
    <Input placeholder={t('issueManagement.form.titlePlaceholder')} maxLength={100} />
  </Form.Item>

  <Form.Item
    label={t('issueManagement.form.targetType')}
    name="targetType"
    initialValue="transition"
    rules={[{ required: true, message: t('issueManagement.form.targetTypeRequired') }]}
  >
    <Select>
      <Select.Option value="project">{t('issueManagement.targetType.project')}</Select.Option>
      <Select.Option value="task">{t('issueManagement.targetType.task')}</Select.Option>
      <Select.Option value="transition">{t('issueManagement.targetType.transition')}</Select.Option>
    </Select>
  </Form.Item>

  <Form.Item
    label={t('issueManagement.form.issueType')}
    name="issueType"
    rules={[{ required: true, message: t('issueManagement.form.issueTypeRequired') }]}
  >
    <Select
      placeholder={t('issueManagement.form.issueTypePlaceholder')}
      loading={issueTypeLoading}
      options={issueTypeOptions}
    />
  </Form.Item>

  <Form.Item
    label={t('issueManagement.form.content')}
    name="content"
    rules={[
      { required: true, message: t('issueManagement.form.contentRequired') },
      { min: 10, message: t('issueManagement.form.contentMinLength') },
      { max: 1000, message: t('issueManagement.form.contentMaxLength') },
    ]}
  >
    <TextArea
      rows={8}
      placeholder={t('issueManagement.form.contentPlaceholder')}
      showCount
    />
  </Form.Item>

  <Form.Item style={{ marginBottom: 0 }}>
    <Space style={{ float: 'right' }}>
      <Button onClick={() => setShowNewIssueForm(false)}>
        {t('issueManagement.form.cancel')}
      </Button>
      <Button type="primary" onClick={handleSubmitNewIssue}>
        {t('issueManagement.form.save')}
      </Button>
    </Space>
  </Form.Item>
</Form>
```

### 8.2 フォーム頁E��詳細

| 頁E�� | 入力タイチE| バリチE�Eション | 初期値 |
|------|-----------|---------------|--------|
| タイトル | Input | 忁E��、最大100斁E��E| - |
| 対象 | Select | 忁E��E| 'transition' |
| 問題タイチE| Select | 忁E��E| - |
| 冁E�� | TextArea | 忁E��、最封E0斁E��、最大1000斁E��E| - |

### 8.3 問題タイプ�E選択肢

問題タイプ�E選択肢は **コード�EスターAPI** から動的に取得します。ハードコード�EしてぁE��せん、E

**API:** `GET /api/v1/code-master/issue_type/options`

**取得方況E** `useCodeMaster('issue_type')` カスタムフックを使用

```typescript
// コンポ�Eネント�Eで自動取征E
const { options: issueTypeOptions, loading: issueTypeLoading } = useCodeMaster('issue_type');
```

**選択肢の管琁E** `code_master` チE�Eブルの `code_division = 'issue_type'` レコードで管琁E��ます、E
選択肢の追加・変更・削除はDBのみで対応可能です（フロントエンド�E変更不要E��、E

---

## 9. イベンチE

### 9.1 イベント一覧

| イベント名 | トリガー | 処琁E�E容 |
|-----------|---------|---------|
| handleSelectIssue | 問題行クリチE�� | 問題を選択して詳細を表示 |
| handleNewIssueClick | 新規問題報告�EタンクリチE�� | 新規報告フォームを表示 |
| handleSubmitNewIssue | 保存�EタンクリチE�� | 新規問題を報呁E|
| handleCommentSubmit | コメント送信ボタンクリチE�� | コメントを送信 |
| handleSetUnresolved | 未解決ボタンクリチE�� | スチE�Eタスを「未解決」に変更してコメントを送信 |
| handleSetResolved | 解決ボタンクリチE�� | スチE�Eタスを「解決済」に変更してコメントを送信 |
| handleClose | キャンセルボタンクリチE�� | モーダルを閉じて状態をリセチE�� |

### 9.2 イベント詳細

#### handleSubmitNewIssue�E�新規問題報告！E

```typescript
const handleSubmitNewIssue = async () => {
  try {
    const values = await form.validateFields();

    await createIssue({
      projectId,
      methodId,
      issueType: values.issueType,
      targetType: values.targetType,
      taskNo,
      transitionId,
      title: values.title,
      description: values.content,
    });

    message.success(t('issueManagement.messages.issueReported'));
    form.resetFields();
    setShowNewIssueForm(false);
    // 一覧を�E取征E
    await fetchIssues();
  } catch (error) {
    if (error && typeof error === 'object' && 'errorFields' in error) {
      // Form validation error - do nothing
      return;
    }
    console.error('[IssueManagementModal] handleSubmitNewIssue error:', error);
    message.error(extractErrorMessage(error));
  }
};
```

**処琁E��ロー:**
1. フォームのバリチE�Eション
2. `createIssue()` APIを直接呼び出ぁE
3. 成功メチE��ージ表示
4. フォームをリセチE��
5. 新規報告フォームを閉じる
6. `fetchIssues()` で一覧を�E取征E

#### handleCommentSubmit�E�コメント送信�E�E

```typescript
const handleCommentSubmit = async () => {
  if (!selectedIssue) return;

  if (!newComment.trim()) {
    message.warning('コメントを入力してください');
    return;
  }

  try {
    await addComment({
      projectName,
      issueId: selectedIssue.issueId,
      comment: newComment.trim(),
    });

    message.success(t('issueManagement.messages.commentPosted'));
    setNewComment('');
    // 一覧を�E取得（コメントが追加された状態を反映�E�E
    await fetchIssues();
  } catch (error) {
    console.error('[IssueManagementModal] handleCommentSubmit error:', error);
    message.error(extractErrorMessage(error));
  }
};
```

**処琁E��ロー:**
1. 問題選択確誁E
2. コメント�E力確誁E
3. `addComment()` APIを直接呼び出ぁE
4. 成功メチE��ージ表示
5. コメントをクリア
6. `fetchIssues()` で一覧を�E取征E

#### handleSetUnresolved�E�未解決に変更�E�E

```typescript
const handleSetUnresolved = async () => {
  if (!selectedIssue) return;

  if (!newComment.trim()) {
    message.warning('コメントを入力してください');
    return;
  }

  try {
    // コメントを送信してからスチE�Eタスを更新
    await addComment({
      projectName,
      issueId: selectedIssue.issueId,
      comment: newComment.trim(),
    });
    await updateIssueStatus({
      projectName,
      issueId: selectedIssue.issueId,
      status: 'unresolved',
    });

    message.success(t('issueManagement.messages.setUnresolved'));
    setNewComment('');
    // 一覧を�E取征E
    await fetchIssues();
  } catch (error) {
    console.error('[IssueManagementModal] handleSetUnresolved error:', error);
    message.error(extractErrorMessage(error));
  }
};
```

**処琁E��ロー:**
1. 問題選択確誁E
2. コメント�E力確誁E
3. `addComment()` APIを直接呼び出ぁE
4. `updateIssueStatus()` APIを直接呼び出し！E'unresolved'` を渡す！E
5. 成功メチE��ージ表示
6. コメントをクリア
7. `fetchIssues()` で一覧を�E取征E

#### handleSetResolved�E�解決済に変更�E�E

```typescript
const handleSetResolved = async () => {
  if (!selectedIssue) return;

  if (!newComment.trim()) {
    message.warning('コメントを入力してください');
    return;
  }

  try {
    // コメントを送信してからスチE�Eタスを更新
    await addComment({
      projectName,
      issueId: selectedIssue.issueId,
      comment: newComment.trim(),
    });
    await updateIssueStatus({
      projectName,
      issueId: selectedIssue.issueId,
      status: 'resolved',
    });

    message.success(t('issueManagement.messages.setResolved'));
    setNewComment('');
    // 一覧を�E取征E
    await fetchIssues();
  } catch (error) {
    console.error('[IssueManagementModal] handleSetResolved error:', error);
    message.error(extractErrorMessage(error));
  }
};
```

**処琁E��ロー:**
1. 問題選択確誁E
2. コメント�E力確誁E
3. `addComment()` APIを直接呼び出ぁE
4. `updateIssueStatus()` APIを直接呼び出し！E'resolved'` を渡す！E
5. 成功メチE��ージ表示
6. コメントをクリア
7. `fetchIssues()` で一覧を�E取征E

#### handleClose�E�モーダルを閉じる�E�E

```typescript
const handleClose = () => {
  setSelectedIssueId(null);
  setShowNewIssueForm(false);
  form.resetFields();
  setNewComment('');
  setIssues([]);
  onClose();
};
```

**処琁E��ロー:**
1. 選択中の問題IDをクリア
2. 新規報告フォームを非表示
3. フォームをリセチE��
4. コメントをクリア
5. 問題一覧をクリア
6. `onClose`コールバック実衁E

---

## 10. ヘルパ�E関数

### 10.1 対象タイプ�E表示チE��スト取征E

```typescript
const getTargetTypeText = (targetType: IssueTargetType) => {
  const typeMap = {
    project: t('issueManagement.targetType.project'),
    task: t('issueManagement.targetType.task'),
    transition: t('issueManagement.targetType.transition'),
  };
  return typeMap[targetType] || targetType;
};
```

### 10.2 対象名�E取征E

```typescript
const getTargetName = (issue: Issue): string => {
  switch (issue.targetType) {
    case 'project':
      return issue.projectName || '';
    case 'task':
      return issue.taskName || '';
    case 'transition':
      return issue.transitionName || '';
    default:
      return '';
  }
};
```

---

## 11. スタイリング

### 11.1 モーダルスタイル

```typescript
<Modal
  title={
    <Space>
      <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      <span>
        {viewMode ? t('issueManagement.viewTitle') : t('issueManagement.reportTitle')} - {targetName}
      </span>
    </Space>
  }
  open={open}
  onCancel={handleClose}
  footer={null}
  width={1200}
  style={{ top: 20 }}
  destroyOnHidden
>
```

**特徴:**
- モーダル幁E 1200px
- トップ位置: 20px�E�画面上部に近づける�E�E
- カスタムタイトル: 警告アイコン�E�オレンジ色�E�E チE��スチE
  - `viewMode` ぁE`true` の場吁E `問題確誁E- {targetName}`
  - `viewMode` ぁE`false` の場吁E `問題報呁E- {targetName}`
- フッターなし！Efooter={null}`�E�E
- `destroyOnHidden={true}`: モーダルが非表示になる度にコンポ�Eネントを破棁E��EdestroyOnClose` の後継API�E�E

### 11.2 カードスタイル

```typescript
// 左側カード（問題一覧�E�E
<Card
  title="問題一覧"
  size="small"
  style={{ height: 'calc(70vh - 100px)' }}
  styles={{ body: { padding: 12, overflow: 'auto', height: 'calc(100% - 38px)' } }}
>

// 右側カード（問題詳細�E�E
<Card
  title={showNewIssueForm ? '新規問題報呁E : '問題詳細'}
  size="small"
  style={{ height: 'calc(70vh - 100px)' }}
  styles={{ body: { padding: 16, overflow: 'auto', height: 'calc(100% - 38px)' } }}
>
```

**カード�E高さ:**
- 全佁E `calc(70vh - 100px)`�E�ビューポ�Eト高さの70%から100pxを引く�E�E
- ボディ: `calc(100% - 38px)`�E�カード�EチE��ー刁E��除く！E
- オーバ�Eフロー: auto�E�スクロール可能�E�E

### 11.3 選択行�EハイライチE

```typescript
style: {
  cursor: 'pointer',
  backgroundColor:
    selectedIssue?.issueId === record.issueId
      ? '#e6f7ff'
      : undefined,
},
```

**選択衁E**
- 背景色: `#e6f7ff`�E�水色�E�E
- カーソル: pointer

### 11.4 解決ボタンのカスタムスタイル

```typescript
style={{
  backgroundColor: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#52c41a' : undefined,
  borderColor: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#52c41a' : undefined,
  color: newComment.trim() && selectedIssue.status === 'unresolved' && !isEditDisabled ? '#fff' : undefined,
}}
```

**動的スタイル:**
- 活性時（コメント�E力渁Eかつ 未解決 かつ 編雁E��能�E�E 緑色の背景とボ�Eダー、白斁E��E
- 非活性晁E チE��ォルトスタイル

---

## 12. アクセシビリチE��

### 12.1 キーボ�Eド操佁E

- Tabキーでフォーカス移勁E
- Enterキーでボタン実行、問題選抁E
- Escapeキーでモーダルを閉じる

### 12.2 フォーカス管琁E

- モーダル表示時、最初�Eフォーム要素に自動フォーカス
- 問題一覧の行�Eキーボ�Eドで選択可能
- ボタンの活性/非活性状態が視覚的に明確

### 12.3 承認依頼中のヘルプテキスチE

```typescript
title={isApprovalPending ? 'プロジェクトが承認依頼中のため、新規問題報告�Eできません' : undefined}
placeholder={isApprovalPending ? 'プロジェクトが承認依頼中のため、コメントを追加できません' : 'コメントを入劁E..'}
```

- ボタンのtooltipで琁E��を表示
- プレースホルダーで琁E��を表示

---

## 13. パフォーマンス老E�E事頁E

### 13.1 useMemoによるフィルタリング最適匁E

```typescript
const filteredIssues = useMemo(() => {
  return issues.filter((issue) => {
    // フィルタリングロジチE��
  });
}, [issues, searchText, statusFilter, filterTaskId]);
```

**効极E**
- 依存�E列が変更されなぁE��り、�E計算を避ける
- 検索チE��スト�E力時のパフォーマンスを改喁E

### 13.2 destroyOnHiddenの使用

```typescript
<Modal destroyOnHidden>
```

**メリチE��:**
- モーダルが非表示になる度にコンポ�Eネントが破棁E��れ、状態がリセチE��されめE
- メモリリークを防ぁE

**チE��リチE��:**
- モーダルを開く度に再レンダリングが発甁E
- ただし、このモーダルは褁E��だが許容篁E��冁E

> **Note:** `destroyOnClose` は旧APIで非推奨、Ent Design 最新版では `destroyOnHidden` を使用する、E

### 13.3 チE�Eブルのスクロール仮想匁E

```typescript
scroll={{ y: 'calc(70vh - 280px)' }}
```

**効极E**
- 大量�E問題がある場合でも、スクロール可能な固定高さに制陁E
- レンダリング対象を制限してパフォーマンスを維持E

---

## 14. 備老E

### 14.1 特記事頁E

1. **2カラムレイアウト�E採用琁E��**
   - 左側で問題を素早く一覧表示・選抁E
   - 右側で詳細を確認�E操佁E
   - 効玁E��な問題管琁E��ークフローを実現

2. **参�E専用モード！EiewMode�E��E目皁E*
   - 実験管琁E��E��どが問題を閲覧するのみの場合に使用
   - 編雁E�E新規作�Eボタンを非表示にして混乱を防ぁE

3. **承認依頼中の編雁E��陁E*
   - プロジェクトが`waiting_approval`スチE�Eタスの場合、編雁E��可
   - 承認�Eロセス中の変更を防ぁE
   - チE�Eルチップで琁E��を�E確に表示

4. **検索・フィルタリング機�Eの重要性**
   - 問題数が増えても素早く目皁E�E問題を見つけられる
   - タイトルと冁E��の両方で検索可能
   - スチE�Eタスで絞り込み可能

5. **コメント履歴の表示**
   - 過去の議論を確認できる
   - 問題解決のプロセスを追跡できる
   - 最大200pxの高さでスクロール可能

6. **新規問題報告フォームの頁E��**
   - タイトル: 100斁E��以冁E
   - 対象: プロジェクチEタスク/トランジション
   - 問題タイチE 7種類（材料不足、機器敁E��など�E�E
   - 冁E��: 10、E000斁E��E

7. **filterTaskIdの用送E*
   - 特定�Eタスクに関連する問題�Eみを表示
   - 参�E専用モードと絁E��合わせて使用
   - タスク単位での問題確認に便利

### 14.2 封E��の拡張桁E

1. **優先度の設宁E*
   - 髁E中/低�E優先度を設宁E
   - 優先度で並び替ぁE

2. **拁E��老E�E割り当て**
   - 問題�E解決を特定�E人に依頼
   - 拁E��老E��フィルタリング

3. **期限の設宁E*
   - 問題解決の期限を設宁E
   - 期限刁E��を警告表示

4. **添付ファイル機�E**
   - スクリーンショチE��めE��拠ファイルの添仁E
   - 画像�Eプレビュー表示

5. **問題�Eエクスポ�EチE*
   - CSV/PDFでエクスポ�EチE
   - レポ�Eト作�Eに活用

6. **通知機�E**
   - 新しいコメントが追加された時に通知
   - スチE�Eタスが変更された時に通知

7. **問題�E統計表示**
   - 未解決/解決済�E件数
   - 問題タイプ別の件数
   - グラフ表示

### 14.3 関連コンポ�EネンチE

- **ProgressCheckTab**: 問題管琁E�Eタンの呼び出し�E�E�EiewMode=false で問題報告、viewMode=true で問題確認！E
- **InstructionConfirmationTab**: 問題管琁E�Eタンの呼び出し�E
- **Issue垁E*: 問題�EチE�Eタ垁E
- **IssueStatus垁E*: スチE�Eタスの型定義
- **IssueTargetType垁E*: 対象タイプ�E型定義

> **廁E��コンポ�EネンチE**
> `IssueReportModal`�E�Efrontend/src/components/ExperimentWorker/IssueReportModal.tsx`�E��E API 未実裁E�Eまま放置されてぁE��ため、E026-03-25 に削除されました、E
> 問題報告機�Eは本コンポ�Eネント！EIssueManagementModal`�E��E `viewMode=false` で提供します、E

---

## 15. 変更履歴

| バ�Eジョン | 日仁E| 変更冁E�� | 拁E��老E|
|-----------|------|----------|--------|
| 1.5.0 | 2026-08-27 | ソースコードとの照合に基づき以下を修正�E�E026-08-27�E�：①§1.3 使用場所に ExperimentWorkerMenu を追加�E�タスク: 問題報告�Eタン修正�E�。②§3 Props `visible` ↁE`open`�E�Ent Design v5 prop名）。③§4.1 `commentForm` 削除�E�ソースに存在しなぁE��。④§4.1 useEffect の `visible` ↁE`open`、fetchIssues エラーメチE��ージめE`extractErrorMessage()` に変更。⑤§6.1、E.4・§7.2・§8.1・§10.1・§11.1 のハ�Eドコード日本語文字�Eを�Eて `t('issueManagement.*')` キー参�Eに変更�E�多言語化対応に追従）。⑥§9.2 handleCommentSubmit/handleSetUnresolved/handleSetResolved/handleClose から `commentForm.resetFields()` を削除、�E劁EエラーメチE��ージめE`t()` / `extractErrorMessage()` に変更。⑦§9.2 handleSubmitNewIssue の成功/エラーメチE��ージめE`t()` / `extractErrorMessage()` に変更 | Cline |
| 1.4.0 | 2026-03-25 | 関連コンポ�Eネント欁E�E IssueReportModal を削除、廁E��コンポ�Eネント注記を追加�E�永続化漏れ修正対応！E| Cline |
| 1.3.0 | 2026-03-11 | 仕様書をソースコードと同期: Props設計をコールバック方式から�E部API直接呼び出し方式に変更�E�Eissues`/`onSubmitIssue`/`onSubmitComment`/`onUpdateStatus` 削除 ↁE`projectId`/`projectName`/`targetName`/`methodId`/`taskNo` 追加�E�、`fetchIssues`/`issuesLoading` 追記、各イベントハンドラのAPI呼び出し�E琁E��更新、`destroyOnClose` ↁE`destroyOnHidden` 修正、`bodyStyle` ↁE`styles.body` 修正、�Eタンtooltip追訁E| Cline |
| 1.2.0 | 2026-02-27 | コメント送信後�E即時表示対忁E `selectedIssue` めEstate から `useMemo` による派生値に変更し、`issues` props 更新時に自動反映されるよぁE��正 | Cline |
| 1.1.0 | 2026-02-27 | 問題タイプ選択肢をハードコードからコード�EスターAPI取得に変更�E�EseCodeMaster('issue_type')�E�E| Cline |
| 1.0.0 | 2026-01-19 | 初版作�E、UI設計書として斁E��匁E| Cline |
