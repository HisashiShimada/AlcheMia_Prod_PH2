# 編集系画面 バックエンド保存API未実行（永続化漏れ）調査レポート

- **調査日時**: 2026-03-25 15:20
- **調査対象**: `frontend/src/components/` 配下の全編集系コンポーネント

---

## 1. 調査サマリ

| # | ファイルパス | 問題の種別 | 重大度 |
|---|---|---|---|
| 1 | `ExperimentWorker/IssueReportModal.tsx` ＋ `ProgressCheckTab.tsx` | コメント送信・ステータス変更がモーダル・親コンポーネントの両方でAPI未実装（TODO状態） | **高** |
| 2 | `ExperimentWorker/DataRecordDialog.tsx` の `handleSubmit` | APIを呼ばないデッドコードが存在する（フッターボタンとは接続されていないため実害なし） | **低** |

---

## 2. 詳細調査結果

---

### 2-1. `ExperimentWorker/IssueReportModal.tsx` ⚠️ **重大度: 高**

#### 問題の概要

問題報告モーダルにある以下の3つのアクションが、いずれもバックエンドAPIを呼び出していない。  
コード内に `// TODO: バックエンドAPIへの送信処理を実装` のコメントが残っており、明示的に未実装状態。

#### 該当箇所

**① コメント送信（`handleCommentSubmit`）**

```tsx
const handleCommentSubmit = () => {
  // ...
  // TODO: バックエンドAPIへの送信処理を実装
  console.log('コメント送信:', {
    taskId: task.taskId,
    comment: comment.trim(),
  });

  if (onCommentSubmit) {
    onCommentSubmit(task.taskId, comment.trim());  // コールバックのみ
  }

  message.success('コメントを送信しました');  // 成功メッセージが出るが保存されていない
  // ...
};
```

**② ステータスを「未解決」に変更（`handleSetUnresolved`）**

```tsx
const handleSetUnresolved = () => {
  // ...
  // TODO: バックエンドAPIへの送信処理を実装
  console.log('ステータス変更（未解決）:', { ... });

  if (onStatusChange) {
    onStatusChange(task.taskId, 'unresolved');  // コールバックのみ
  }

  setCurrentStatus('unresolved');
  message.success('ステータスを「未解決」に変更しました');  // 保存されていない
};
```

**③ ステータスを「解決済」に変更（`handleSetResolved`）**

```tsx
const handleSetResolved = () => {
  // ...
  // TODO: バックエンドAPIへの送信処理を実装
  console.log('ステータス変更（解決済）:', { ... });

  if (onStatusChange) {
    onStatusChange(task.taskId, 'resolved');  // コールバックのみ
  }

  setCurrentStatus('resolved');
  message.success('ステータスを「解決済」に変更しました');  // 保存されていない
};
```

#### 影響

- ユーザーが「コメント送信」「未解決」「解決済」ボタンを押すと **成功メッセージが表示される**が、DBには一切保存されない。
- 画面をリロードすると入力したコメントやステータス変更が全て消える。
- 使用されているサービス: `issueApiService.ts` が存在するが呼ばれていない。

#### 利用可能なAPI（`issueApiService.ts` に定義済み）

`frontend/src/services/issueApiService.ts` が存在し、課題管理APIのサービスが定義済み。  
バックエンドルートも `backend/src/routes/issueRoutes.ts` が存在する。

---

### 2-2. `ExperimentWorker/DataRecordDialog.tsx` の `handleSubmit` ⚠️ **重大度: 低（デッドコード）**

#### 問題の概要

`DataRecordDialog` には2種類の保存ハンドラが存在する。

| ハンドラ | 呼び出し元 | API呼び出し | 状態 |
|---|---|---|---|
| `handleSaveTemplate` | 「保存」ボタン（フッター） | ✅ `saveBatchExperimentData()` を呼ぶ | **正常** |
| `handleSubmit` | コード内で定義のみ | ❌ APIを呼ばない | **問題あり** |

#### `handleSubmit` の実装（API未呼び出し）

```tsx
const handleSubmit = async () => {
  try {
    setLoading(true);
    const values = await form.validateFields();
    
    // テンプレートごとにデータをまとめる
    const recordsData: ExperimentDataValue[] = [];
    transition?.templates?.forEach((template) => {
      // ... データ組み立て処理 ...
      recordsData.push(templateData);
    });
    
    // ステータスとコメントをログ出力（バックエンド実装時に使用）  ← コメントが示すとおり未実装
    console.log('保存データ:', {
      transitionId: transition?.transitionId,
      status: selectedStatus,
      comment: comment,
      experimentData: recordsData,
    });
    
    // ★ APIを呼ばずにonSaveコールバックを直接呼んでいる
    onSave(recordsData);
    message.success(`実験データを保存しました...`);
    onClose();
  } catch (error) { ... }
};
```

#### 現在の保存ボタンの実装（正常）

フッターの「保存」ボタンは `handleSaveTemplate` を呼んでおり、こちらは正常にAPIを呼ぶ。

```tsx
footer={[
  <Button key="cancel" onClick={onClose}>キャンセル</Button>,
  <Button
    key="save"
    onClick={handleSaveTemplate}  // ← 正常な保存ハンドラ
    ...
  >
    保存
  </Button>,
]}
```

#### 影響・評価

- **現状の実害**: `handleSubmit` はフッターボタンに紐付けられていないため、通常の操作では呼ばれない。デッドコード状態。
- **リスク**: 将来的に `handleSubmit` が別のボタンや処理に誤って接続された場合、保存処理が動作しない。
- コード内のコメント「バックエンド実装時に使用」が残っており、将来の実装を示唆している。

---

## 3. 調査対象コンポーネントの正常確認リスト

以下のコンポーネントは、編集・保存処理が正常にバックエンドAPIを呼んでいることを確認。

| コンポーネント | 保存API | 確認内容 |
|---|---|---|
| `SystemManagement/UserManagement.tsx` | `createUser()` / `updateUser()` / `updateUserStatus()` | ✅ 正常 |
| `SystemManagement/DepartmentManagement.tsx` | `createMaster()` / `updateMaster()` / `updateMasterStatus()` | ✅ 正常 |
| `SystemManagement/RoleManagement.tsx` | `createRole()` / `updateRole()` / `updateRolePermissions()` | ✅ 正常 |
| `SystemManagement/FunctionPermissionDialog.tsx` | 親の `handleFunctionDialogOk` 経由で `updateRolePermissions()` | ✅ 正常 |
| `Provider/OrganizationManagement.tsx` | `client.post('/provider/organization', ...)` / `client.put(...)` | ✅ 正常 |
| `Provider/CorporationManagement.tsx` | `client.post('/provider/corporation', ...)` / `client.put(...)` | ✅ 正常 |
| `project/InstructionRegistrationTab.tsx` | `saveInstruction()` / `updateInstruction()` / `deleteInstruction()` | ✅ 正常 |
| `project/TaskRegistrationTab.tsx` の `handleSave` | `saveTaskRegistration()` | ✅ 正常 |
| `project/ProjectManagement.tsx` の `handleCreateProject` | `createProjectApi()` | ✅ 正常 |
| `project/CreateProjectModal.tsx` | 親コンポーネント（`handleCreateProject`）経由で保存 | ✅ 正常 |
| `project/CreateFormatModal.tsx` | 親コンポーネント経由で `createFormatFolder()` | ✅ 正常 |
| `project/CreateFormatFileModal.tsx` | 親コンポーネント経由で `createFormatFile()` | ✅ 正常 |
| `project/FormatManagement.tsx` | `updateFormatFileContent()` / `createFormatFile()` / `createFormatSubfolder()` | ✅ 正常 |
| `ExperimentWorker/DataRecordDialog.tsx` の `handleSaveTemplate` | `saveBatchExperimentData()` | ✅ 正常 |
| `editorv2/PetriNetEditorScreen.tsx` | S3保存（SaveConfirmDialog経由） | ✅ 正常 |
| `editorv2/components/DocumentEditDialog.tsx` | `onSave` コールバック経由（親コンポーネントでAPI呼び出し） | ✅ 正常 |
| `viewer/dialogs/DocumentEditDialog.tsx` | `onSave` コールバック経由（親コンポーネントでAPI呼び出し） | ✅ 正常 |

---

## 4. 問題箇所まとめ（優先度順）

### 🔴 Priority 1: `IssueReportModal.tsx` — 即時対応推奨

| 項目 | 内容 |
|---|---|
| ファイル | `frontend/src/components/ExperimentWorker/IssueReportModal.tsx` |
| 影響機能 | 問題報告のコメント送信・ステータス変更（未解決/解決済） |
| 症状 | 操作成功のUIフィードバックがあるにもかかわらずDBに保存されない |
| 対応 | `issueApiService.ts` を利用してAPI呼び出しを実装する |
| APIルート | `backend/src/routes/issueRoutes.ts` が存在する |

### 🟡 Priority 2: `DataRecordDialog.tsx` の `handleSubmit` — デッドコード整理

| 項目 | 内容 |
|---|---|
| ファイル | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` |
| 影響機能 | 現状は未使用（デッドコード）だが、誤接続されると問題になる |
| 症状 | `handleSubmit` はAPIを呼ばないが、フッターボタンには紐付いていない |
| 対応 | コードを削除するか、`handleSaveTemplate` と統合する |

### 🟢 Priority 3: `TaskRegistrationTab.tsx` の一時保存指示 — UX改善

| 項目 | 内容 |
|---|---|
| ファイル | `frontend/src/components/project/TaskRegistrationTab.tsx` |
| 影響機能 | タスク登録タブで追加した指示 |
| 症状 | 「保存」ボタンを押さずにタブ移動すると、追加した指示が消える可能性がある |
| 対応 | 未保存の指示がある場合にユーザーへ警告する（未保存メッセージの表示） |

---

## 5. `IssueReportModal.tsx` の修正例（参考）

```tsx
import { addIssueComment, updateIssueStatus } from '@/services/issueApiService';

const handleCommentSubmit = async () => {
  if (!task) { message.error('タスク情報が見つかりません'); return; }
  if (!comment.trim()) { message.warning('コメントを入力してください'); return; }

  try {
    // ✅ APIを呼ぶ
    await addIssueComment(task.taskId, { comment: comment.trim() });
    
    if (onCommentSubmit) onCommentSubmit(task.taskId, comment.trim());
    message.success('コメントを送信しました');
    setComment('');
    form.setFieldsValue({ comment: '' });
  } catch (error) {
    message.error('コメントの送信に失敗しました');
  }
};

const handleSetResolved = async () => {
  if (!task) { message.error('タスク情報が見つかりません'); return; }
  if (!comment.trim()) { message.warning('コメントを入力してください'); return; }

  try {
    // ✅ APIを呼ぶ
    await updateIssueStatus(task.taskId, { status: 'resolved', comment: comment.trim() });
    
    if (onStatusChange) onStatusChange(task.taskId, 'resolved');
    setCurrentStatus('resolved');
    message.success('ステータスを「解決済」に変更しました');
    setComment('');
    form.setFieldsValue({ comment: '' });
  } catch (error) {
    message.error('ステータスの変更に失敗しました');
  }
};
```

---

## 6. 調査方針・範囲

### 調査対象
- `frontend/src/components/` 配下のすべての編集系コンポーネント（Modal/Dialog/Tab）
- 「保存」「送信」「作成」「更新」ボタンが存在するもの

### 判定基準
編集系コンポーネントで「保存」に相当する操作が行われる際に、以下のいずれかが実行されているか:
- `frontend/src/services/` 配下のAPIサービスが呼ばれている
- `createApiClient()` / `axios` を直接使用してHTTPリクエストを送信している

### 調査外コンポーネント（閲覧専用・非編集系）
- `viewer/PetriNetViewer.tsx`, `viewer/PropertyViewer.tsx` 等の閲覧専用コンポーネント
- `progress/ProgressMonitoring.tsx` 等の進捗表示専用コンポーネント
- `ExperimentWorker/InstructionCard.tsx` 等の表示専用コンポーネント
