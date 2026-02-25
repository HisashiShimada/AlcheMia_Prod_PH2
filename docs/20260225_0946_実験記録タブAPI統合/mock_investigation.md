# モックデータ使用箇所 調査結果

## メタデータ
- **調査日時**: 2026-02-25 12:00
- **調査対象**: 実験記録タブ および関連モーダル・ダイアログ
- **調査者**: Cline

---

## 1. 調査概要

実験記録タブ（`ExperimentRecordTab`）および関連コンポーネントにおいて、
モックデータを使用している箇所を洗い出した。

### 調査対象ファイル

| ファイルパス | 役割 |
|------------|------|
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | 実験記録タブ本体 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | データ記録ダイアログ |
| `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | 問題管理モーダル |
| `frontend/src/components/ExperimentWorker/TransitionList.tsx` | トランジション一覧 |
| `frontend/src/components/ExperimentWorker/TransitionFlowDiagram.tsx` | トランジションフロー図 |
| `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx` | メソッド・タスク選択モーダル |
| `frontend/src/data/projectsData.ts` | モックデータソース |

---

## 2. モックデータ使用箇所一覧

### 2.1 ExperimentRecordTab.tsx

#### (1) `getIssuesByTransitionId` モック関数の使用

```typescript
// ファイル: frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
// 行: import文
import { getIssuesByTransitionId } from '@/data/projectsData';

// 行: handleIssueClick 内
const handleIssueClick = (transition: Transition) => {
  setSelectedTransition(transition);
  const transitionIssues = getIssuesByTransitionId(transition.transitionId);  // ← モック
  setIssues(transitionIssues);
  setIssueModalOpen(true);
};
```

**問題**: `getIssuesByTransitionId` は `projectsData.ts` 内のハードコードされたモックデータ（`issuesData`）を参照している。  
**置き換え先API**: `GET /api/v1/issues`（問題一覧取得 API 7.3）  
**クエリパラメータ**: `transition_id`, `project_id`, `method_id` でフィルタリング  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (2) `projectStatus` の null 固定

```typescript
// ファイル: frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
// プロジェクトの状態を取得（暫定: APIから取得できるまでnull）
const projectStatus: ProjectStatus | null = null;
```

**問題**: プロジェクトステータスが常に `null` のため、`isProjectRecordable` が常に `true` になる。  
**置き換え先API**: `GET /api/v1/projects/worker-accessible`（実験作業者用プロジェクト一覧 API 2.16）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (3) `handleDataSave` - API呼び出し未実装（TODO）

```typescript
// ファイル: frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
const handleDataSave = (data: unknown) => {
  console.log('保存されたデータ:', data);
  // TODO: バックエンドAPIへの保存処理を実装  ← モック（ログ出力のみ）
  setDataRecordModalOpen(false);
  setSelectedTransition(null);
};
```

**問題**: データ保存処理がコンソールログのみで、APIを呼び出していない。  
**置き換え先API**: `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`（実験データ一括保存 API 8.1）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (4) `handleSubmitIssue` - API呼び出し未実装（TODO）

```typescript
// ファイル: frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
const handleSubmitIssue = (issue: IssueReportFormData) => {
  console.log('新規問題報告:', issue);
  // TODO: バックエンドAPIへの送信処理を実装  ← モック（ログ出力のみ）
};
```

**問題**: 問題報告の送信処理がコンソールログのみ。  
**置き換え先API**: `POST /api/v1/issues`（問題報告 API 7.1）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (5) `handleSubmitComment` - API呼び出し未実装（TODO）

```typescript
// ファイル: frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
const handleSubmitComment = (issueId: string, comment: string) => {
  console.log('コメント投稿:', { issueId, comment });
  // TODO: バックエンドAPIへの送信処理を実装  ← モック（ログ出力のみ）
};
```

**問題**: コメント投稿処理がコンソールログのみ。  
**置き換え先API**: `POST /api/v1/issues/comments`（コメント投稿 API 7.2）  
**実装状況**: ✅ バックエンドAPI実装済み

---

### 2.2 DataRecordDialog.tsx

#### (6) `templatesList` モックデータの使用

```typescript
// ファイル: frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
// 行: import文
import { templatesList } from '@/data/projectsData';

// 行: filteredTemplates の useMemo 内
const filteredTemplates = useMemo(() => {
  let filtered = templatesList;  // ← モックデータ（projectsData.ts内のハードコードデータ）
  // ...フィルタリング処理
}, [templateSearchText, selectedTemplateCategory]);
```

**問題**: テンプレート一覧が `projectsData.ts` にハードコードされたモックデータ（`templatesList`）から取得されている。  
テンプレートは S3上のXMLファイルをもとに構築されるべきデータ。  
**置き換え先API**: 現時点でテンプレート一覧取得API (`GET /api/v1/templates`) は未実装。  
**実装状況**: ⏳ バックエンドAPI未実装（`template_data` テーブル関連）  
**参考**: `frontend/src/services/templateApi.ts` にフォーマットテンプレート取得用のサービスが存在するが、  
　　　　それはフォーマット管理（S3上の XML ファイル）用であり、実験データ記録用テンプレートとは異なる。

---

#### (7) `handleSaveTemplate` - 実験データ保存のAPI呼び出し未実装

```typescript
// ファイル: frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
// handleSaveTemplate 内
console.log('保存データ:', {
  transitionId: transition?.transitionId,
  templateId: template.templateId,
  status: selectedStatus,
  comment: comment,
  experimentData: templateData,
});

onSave([templateData]);
message.success(`「${template.name}」を保存しました（ステータス: ...）`);
// ← APIへの実際の保存処理なし
```

**問題**: 保存ボタン押下時にコンソールログのみで、APIへのデータ送信を行っていない。  
**置き換え先API**: `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`（API 8.1）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (8) `handleSubmit` - 全テンプレート一括保存のAPI呼び出し未実装

```typescript
// ファイル: frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
// handleSubmit 内
console.log('保存データ:', {
  transitionId: transition?.transitionId,
  status: selectedStatus,
  comment: comment,
  experimentData: recordsData,
});

onSave(recordsData);
// ← APIへの実際の保存処理なし（現UIではこのパスは使用されていないが、残存している）
```

**問題**: handleSubmitも同様にコンソールログのみ。  
**置き換え先API**: `POST /api/v1/experiments/...` （API 8.1）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (9) ステータス更新ボタン - ステータス更新のAPI呼び出し未実装

```typescript
// ファイル: frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
// ステータス更新セクションの「保存」ボタン onClick 内
console.log('ステータス更新保存:', {
  transitionId: transition?.transitionId,
  status: selectedStatus,
  progress: progress,
  comment: comment,
});
message.success(`ステータスを更新しました（...）`);
// ← APIへの実際の更新処理なし
```

**問題**: ステータス更新ボタンがコンソールログのみで、APIへのステータス更新を行っていない。  
**置き換え先API**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status`（API 6.6）  
**実装状況**: ✅ バックエンドAPI実装済み

---

### 2.3 TransitionList.tsx

#### (10) `getIssuesByTransitionId` モック関数の使用

```typescript
// ファイル: frontend/src/components/ExperimentWorker/TransitionList.tsx
// 行: import文
import { getIssuesByTransitionId } from '@/data/projectsData';

// 行: handleIssueReport 内
const handleIssueReport = (transition: Transition) => {
  setSelectedTransition(transition);
  // トランジションIDに関連する問題を取得
  const transitionIssues = getIssuesByTransitionId(transition.transitionId);  // ← モック
  setIssues(transitionIssues);
  setIssueModalOpen(true);
};
```

**問題**: ExperimentRecordTab.tsx と同様に `getIssuesByTransitionId` モック関数を使用。  
**置き換え先API**: `GET /api/v1/issues`（問題一覧取得 API 7.3）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (11) `issues` state のモックコメント

```typescript
// ファイル: frontend/src/components/ExperimentWorker/TransitionList.tsx
// TODO: モックデータ - 実際はpropsまたはAPIから取得
const [issues, setIssues] = useState<Issue[]>([]);
```

**問題**: `issues` state の初期化にモックコメントが残っている。  
　　　　上記 (10) の `handleIssueReport` で `getIssuesByTransitionId`（モック）によって設定される。  
**対応**: (10) の API 置き換えと合わせて対応。

---

#### (12) `handleDataSave` - API呼び出し未実装（TODO）

```typescript
// ファイル: frontend/src/components/ExperimentWorker/TransitionList.tsx
const handleDataSave = (data: ExperimentDataValue[]) => {
  console.log('保存されたデータ:', data);
  // TODO: バックエンドAPIへの保存処理を実装  ← モック（ログ出力のみ）
  message.success('実験データを保存しました');
  setDataRecordModalOpen(false);
  setSelectedTransition(null);
};
```

**問題**: データ保存処理がコンソールログのみ。  
**置き換え先API**: `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`（API 8.1）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (13) `handleSubmitIssue` - API呼び出し未実装（TODO）

```typescript
// ファイル: frontend/src/components/ExperimentWorker/TransitionList.tsx
const handleSubmitIssue = (issue: IssueReportFormData) => {
  console.log('新規問題報告:', issue);
  // TODO: バックエンドAPIへの送信処理を実装  ← モック（ログ出力のみ）
  message.success('問題を報告しました');
};
```

**問題**: 問題報告の送信処理がコンソールログのみ。  
**置き換え先API**: `POST /api/v1/issues`（問題報告 API 7.1）  
**実装状況**: ✅ バックエンドAPI実装済み

---

#### (14) `handleSubmitComment` - API呼び出し未実装（TODO）

```typescript
// ファイル: frontend/src/components/ExperimentWorker/TransitionList.tsx
const handleSubmitComment = (issueId: string, comment: string) => {
  console.log('コメント投稿:', { issueId, comment });
  // TODO: バックエンドAPIへの送信処理を実装  ← モック（ログ出力のみ）
  message.success('コメントを投稿しました');
};
```

**問題**: コメント投稿処理がコンソールログのみ。  
**置き換え先API**: `POST /api/v1/issues/comments`（コメント投稿 API 7.2）  
**実装状況**: ✅ バックエンドAPI実装済み

---

### 2.4 IssueManagementModal.tsx

モック使用箇所なし。  
`issues` プロパティを親コンポーネントから受け取る設計になっており、  
コンポーネント自体はモックデータを参照していない。  
（親コンポーネント側のモック置き換えで対応可能）

---

### 2.5 TransitionFlowDiagram.tsx

モック使用箇所なし。  
`transitions` プロパティを親コンポーネントから受け取る設計。  
（`onRecordClick`, `onIssueClick` は親コンポーネントのハンドラを使用）

---

### 2.6 MethodTaskSelectionModal.tsx

モック使用箇所なし。  
`methods` プロパティを親コンポーネント（`ExperimentRecordTab`）から受け取る設計。  
既に API から取得したデータを使用している。

---

## 3. モックデータソース (projectsData.ts) の内容整理

`frontend/src/data/projectsData.ts` が提供しているモックデータ・関数の中で、
実験記録タブ関連で使用されているもの：

| エクスポート名 | 種別 | 使用箇所 | 置き換え先 |
|-------------|------|---------|-----------|
| `templatesList` | 定数（Template[]） | DataRecordDialog.tsx | テンプレート一覧取得API（未実装） |
| `getIssuesByTransitionId()` | 関数 | ExperimentRecordTab.tsx, TransitionList.tsx | `GET /api/v1/issues`（実装済み） |
| `projectsData` | 定数（Record） | ※直接使用なし（Phase 1で削除済み） | - |
| `issuesData` | 定数（Record） | `getIssuesByTransitionId()` の内部で使用 | 上記APIで代替 |

---

## 4. まとめ：修正が必要な箇所

### フロントエンド修正（API接続）

| No | ファイル | 修正内容 | 依存API | APIの実装状況 | 優先度 |
|----|---------|---------|---------|-------------|--------|
| 1 | ExperimentRecordTab.tsx | `handleIssueClick` の `getIssuesByTransitionId` → API呼び出し | `GET /api/v1/issues` | ✅ 実装済み | 高 |
| 2 | TransitionList.tsx | `handleIssueReport` の `getIssuesByTransitionId` → API呼び出し | `GET /api/v1/issues` | ✅ 実装済み | 高 |
| 3 | ExperimentRecordTab.tsx | `handleSubmitIssue` → API呼び出し | `POST /api/v1/issues` | ✅ 実装済み | 高 |
| 4 | TransitionList.tsx | `handleSubmitIssue` → API呼び出し | `POST /api/v1/issues` | ✅ 実装済み | 高 |
| 5 | ExperimentRecordTab.tsx | `handleSubmitComment` → API呼び出し | `POST /api/v1/issues/comments` | ✅ 実装済み | 高 |
| 6 | TransitionList.tsx | `handleSubmitComment` → API呼び出し | `POST /api/v1/issues/comments` | ✅ 実装済み | 高 |
| 7 | ExperimentRecordTab.tsx | `projectStatus` の null 固定 → APIから取得 | `GET /api/v1/projects/:projectId` | ✅ 実装済み | 中 |
| 8 | DataRecordDialog.tsx | `templatesList` モック → APIから取得 | テンプレート一覧取得API | ⏳ 未実装 | 中 |
| 9 | DataRecordDialog.tsx | `handleSaveTemplate` → 実験データ保存API呼び出し | `POST /api/v1/experiments/...` |  ✅ 実装済み | 中 |
| 10 | DataRecordDialog.tsx | ステータス更新ボタン → ステータス更新API呼び出し | `PATCH /api/v1/progress/.../transitions/:id/status` | ⏳ 未実装 | 中 |
| 11 | ExperimentRecordTab.tsx | `handleDataSave` → 実験データ保存API呼び出し | `POST /api/v1/experiments/...` |  ✅ 実装済み | 中 |
| 12 | TransitionList.tsx | `handleDataSave` → 実験データ保存API呼び出し | `POST /api/v1/experiments/...` |  ✅ 実装済み | 中 |

### バックエンド新規実装が必要なAPI

| API | エンドポイント | 用途 | 優先度 |
|----|------------|------|--------|
| テンプレート一覧取得 | `GET /api/v1/experiments/templates`（仮） | DataRecordDialog でのテンプレート一覧表示 | 中 |

---

## 5. 修正の優先順位（推奨実装順序）

### Phase A: バックエンドAPI実装なしで即時対応可能（実装済みAPIへの置き換え）

以下は **バックエンドAPIが既に実装済み** のため、フロントエンドの修正のみで対応可能：

1. **No.1, 2**: `getIssuesByTransitionId` を `GET /api/v1/issues` API呼び出しに置き換え
   - `ExperimentRecordTab.tsx` の `handleIssueClick`
   - `TransitionList.tsx` の `handleIssueReport`
   - フィルタ: `transition_id`, `project_id`, `method_id`

2. **No.3, 4**: `handleSubmitIssue` を `POST /api/v1/issues` API呼び出しに置き換え
   - `ExperimentRecordTab.tsx`
   - `TransitionList.tsx`

3. **No.5, 6**: `handleSubmitComment` を `POST /api/v1/issues/comments` API呼び出しに置き換え
   - `ExperimentRecordTab.tsx`
   - `TransitionList.tsx`

4. **No.7**: `projectStatus` を `GET /api/v1/projects/:projectId` から取得
   - `ExperimentRecordTab.tsx`

### Phase B: バックエンドAPI新規実装が必要な対応

1. **No.8**: テンプレート一覧取得API（新規設計・実装が必要）
   - DataRecordDialog のテンプレート一覧を `template_data` テーブルまたは S3 フォーマットから取得

---

## 6. 関連ファイルの依存関係

```
ExperimentRecordTab.tsx
  ├── import: getIssuesByTransitionId (@/data/projectsData)  ← 要置き換え
  ├── uses: TransitionList.tsx
  │       └── import: getIssuesByTransitionId (@/data/projectsData)  ← 要置き換え
  │           └── uses: DataRecordDialog.tsx
  │                   └── import: templatesList (@/data/projectsData)  ← 要置き換え
  ├── uses: TransitionFlowDiagram.tsx  ← モックなし
  ├── uses: DataRecordDialog.tsx
  │       └── import: templatesList (@/data/projectsData)  ← 要置き換え
  ├── uses: IssueManagementModal.tsx  ← モックなし
  └── uses: MethodTaskSelectionModal.tsx  ← モックなし（API接続済み）
```

---

## 7. 注意事項

### `IssueManagementModal` の `issues` プロパティについて

`IssueManagementModal` は `issues: Issue[]` を props として受け取る設計。  
現在、親コンポーネント（`ExperimentRecordTab`, `TransitionList`）が  
`getIssuesByTransitionId`（モック）で取得した値を渡している。  
`IssueManagementModal` 自体の修正は不要で、親コンポーネントの API 置き換えで対応可能。  
ただし、問題詳細（コメント一覧含む）は `GET /api/v1/issues/:issueId`（API 7.4）から  
取得する設計となっているため、モーダル内でのコメント表示はAPIレスポンス内の  
`comments` 配列をそのまま利用できる。

### `IssueManagementModal` での問題ステータス更新について

`onUpdateStatus` プロパティが `IssueManagementModal` に渡されていないため、  
現状ステータス変更（解決/未解決）が機能していない。  
`PATCH /api/v1/issues/status`（API 7.5）を呼び出す実装が必要。

---

**調査完了**: 2026-02-25
