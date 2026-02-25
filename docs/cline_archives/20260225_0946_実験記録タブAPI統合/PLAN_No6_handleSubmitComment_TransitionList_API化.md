# タスク計画書: No.6 handleSubmitComment API化（TransitionList）

## メタデータ
- **作成日時**: 2026-02-25 15:47
- **タスクID**: handleSubmitComment_TransitionList_API化
- **優先度**: 高
- **推定工数**: 1時間
- **対象No**: mock_investigation.md の「4. まとめ：修正が必要な箇所」No.6

---

## 1. タスク概要

`TransitionList.tsx` の `handleSubmitComment` ハンドラが、
現在コンソールログ出力のみで API を呼び出していない。

これを `POST /api/v1/issues/comments`（コメント投稿 API 7.2）を
正しく呼び出す実装に置き換える。

なお、No.5（`ExperimentRecordTab.tsx` の `handleSubmitComment` API化）にて
`issueApiService.ts` への `addComment` 関数追加は実施済みのため、
本タスクは `TransitionList.tsx` の修正のみが主な作業となる。

---

## 2. 目的と期待される成果

### 目的

`IssueManagementModal` のコメント送信ボタン押下時に、
`TransitionList.tsx` の `handleSubmitComment` を経由して
バックエンドの `POST /api/v1/issues/comments` API が呼ばれること。

### 期待される成果

- [ ] コメント投稿がバックエンド DB に永続化される
- [ ] 投稿成功後に問題一覧（コメント含む）が自動的に再取得・表示更新される
- [ ] エラー時に「コメントの投稿に失敗しました」メッセージが表示される

---

## 3. 現状分析

### 3.1 修正対象箇所

**ファイル**: `frontend/src/components/ExperimentWorker/TransitionList.tsx`

```typescript
// 現在: コンソールログのみ（モック）
const handleSubmitComment = (issueId: string, comment: string) => {
  console.log('コメント投稿:', { issueId, comment });
  // TODO: バックエンドAPIへの送信処理を実装
  message.success('コメントを投稿しました');
};
```

### 3.2 呼び出し元

`IssueManagementModal` に `onSubmitComment` プロパティとして渡されている。

```typescript
<IssueManagementModal
  ...
  onSubmitComment={handleSubmitComment}
/>
```

`IssueManagementModal` 内では以下の処理から呼び出される（No.5 の調査と同様）：

| 呼び出し元 | 処理 |
|-----------|------|
| `handleCommentSubmit()` | コメントのみ送信 |
| `handleSetUnresolved()` | コメント送信 ＋ ステータスを「未解決」に変更 |
| `handleSetResolved()` | コメント送信 ＋ ステータスを「解決済」に変更 |

### 3.3 現在のインポート状況

```typescript
// TransitionList.tsx（現在）
import { getIssues, createIssue } from '@/services/issueApiService';
```

No.5 にて `issueApiService.ts` に `addComment` 関数が追加済みのため、
インポートに `addComment` を追加するだけで利用可能。

### 3.4 バックエンドAPI確認

**エンドポイント**: `POST /api/v1/issues/comments`  
**実装ファイル**: `backend/src/controllers/issueController.ts` の `addComment` 関数  
**実装状況**: ✅ 実装済み

**リクエストボディ**:

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |
| `issueId` | string (UUID) | ✅ | 問題ID |
| `comment` | string | ✅ | コメント内容 |

### 3.5 TransitionList.tsx の現在の Props 確認

```typescript
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  methodId?: string;
}
```

**問題点**: `addComment` API は `projectName`（プロジェクト名）を必要とするが、
`TransitionList` の現在の Props に `projectName` が存在しない。

`ExperimentRecordTab.tsx` では `selectedProjectName` state 変数として保持しているが、
`TransitionList.tsx` は子コンポーネントであるため、`projectName` を Props 経由で受け取る必要がある。

### 3.6 ExperimentRecordTab.tsx における TransitionList の呼び出し箇所確認

`ExperimentRecordTab.tsx` が `TransitionList.tsx` を呼び出す箇所で、
`selectedProjectName` が利用可能であるため、Props として追加可能。

---

## 4. 実装ステップ

### Phase 1: TransitionListProps に `projectName` を追加

- [ ] `TransitionListProps` インターフェースに `projectName?: string` を追加する
- [ ] コンポーネント関数の引数分割代入に `projectName` を追加する

### Phase 2: handleSubmitComment を API 呼び出しに変更

- [ ] インポート文に `addComment` を追加する
- [ ] `handleSubmitComment` を `async` 関数に変更する
- [ ] `addComment` API 呼び出しを実装する
  - `projectName`: Props の `projectName`
  - `issueId`: 引数の `issueId`
  - `comment`: 引数の `comment`
- [ ] API 呼び出し成功後に `getIssues` を再呼び出しして `issues` ステートを更新する
- [ ] エラー時に `message.error('コメントの投稿に失敗しました')` を表示する
- [ ] モック用の `message.success('コメントを投稿しました')` を削除する
  - ※ `IssueManagementModal` 内でも `message.success` が呼ばれるため、二重表示防止

### Phase 3: ExperimentRecordTab.tsx の TransitionList 呼び出し箇所を修正

- [ ] `TransitionList` に `projectName={selectedProjectName}` を渡す

---

## 5. 影響範囲

### 変更するファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | `TransitionListProps` に `projectName` 追加、`handleSubmitComment` を API 呼び出しに変更、`addComment` インポート追加 |
| 2 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `TransitionList` に `projectName` prop を追加 |

### 新規作成するファイル

なし

### 影響を受けるコンポーネント

- `IssueManagementModal.tsx` への影響なし（`onSubmitComment` プロパティのシグネチャ変更なし）
- `issueApiService.ts` への影響なし（No.5 で `addComment` 実装済み）

---

## 6. 実装詳細

### 6.1 TransitionList.tsx の変更内容

#### (a) インポート文の変更

```typescript
// 変更前
import { getIssues, createIssue } from '@/services/issueApiService';

// 変更後
import { getIssues, createIssue, addComment } from '@/services/issueApiService';
```

#### (b) TransitionListProps の変更

```typescript
// 変更前
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  methodId?: string;
}

// 変更後
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;
  methodId?: string;
  projectName?: string;  // ← 追加
}
```

#### (c) コンポーネント関数の引数分割代入の変更

```typescript
// 変更前
export default function TransitionList({
  transitions,
  projectStatus,
  selectedTaskId,
  projectId,
  methodId,
}: TransitionListProps) {

// 変更後
export default function TransitionList({
  transitions,
  projectStatus,
  selectedTaskId,
  projectId,
  methodId,
  projectName,
}: TransitionListProps) {
```

#### (d) handleSubmitComment の変更

```typescript
// 変更前
const handleSubmitComment = (issueId: string, comment: string) => {
  console.log('コメント投稿:', { issueId, comment });
  // TODO: バックエンドAPIへの送信処理を実装
  message.success('コメントを投稿しました');
};

// 変更後
const handleSubmitComment = async (issueId: string, comment: string) => {
  if (!projectName) {
    console.warn('[handleSubmitComment] projectName が未設定です');
    message.error('プロジェクトが選択されていません');
    return;
  }

  try {
    await addComment({
      projectName,
      issueId,
      comment,
    });

    // コメント投稿後に問題一覧を再取得して表示に反映
    const parts = (selectedTaskId ?? '').split('-');
    const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

    if (projectId && methodId && !isNaN(taskNo) && selectedTransition) {
      setIssueLoading(true);
      try {
        const fetchedIssues = await getIssues({
          projectId,
          methodId,
          taskNo,
          transitionId: selectedTransition.transitionId,
        });
        setIssues(fetchedIssues);
      } catch (fetchError) {
        console.error('[handleSubmitComment] 問題一覧再取得エラー', fetchError);
        // 再取得失敗はサイレントに処理（コメント投稿自体は成功しているため）
      } finally {
        setIssueLoading(false);
      }
    }
  } catch (error) {
    console.error('[handleSubmitComment] コメント投稿エラー', error);
    message.error('コメントの投稿に失敗しました');
  }
};
```

### 6.2 ExperimentRecordTab.tsx の変更内容

`TransitionList` コンポーネントへの Props 渡し箇所に `projectName` を追加する。

```tsx
// 変更前
<TransitionList
  transitions={currentTransitions}
  methodName={selectedMethod?.methodName}
  selectedTaskId={selectedTaskId ?? undefined}
  projectStatus={projectStatus}
  projectId={projectId ?? undefined}
  methodId={selectedMethodId ?? undefined}
/>

// 変更後
<TransitionList
  transitions={currentTransitions}
  methodName={selectedMethod?.methodName}
  selectedTaskId={selectedTaskId ?? undefined}
  projectStatus={projectStatus}
  projectId={projectId ?? undefined}
  methodId={selectedMethodId ?? undefined}
  projectName={selectedProjectName}   // ← 追加
/>
```

> **注意**: `ExperimentRecordTab.tsx` 内で `TransitionList` が呼び出されている箇所を
> `grep` または目視で確認し、すべての呼び出し箇所に `projectName` を追加すること。

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `IssueManagementModal` 内の `message.success` と二重表示が発生する | 低 | 高 | `handleSubmitComment` 側では `message.success` を呼ばない（モックの `message.success('コメントを投稿しました')` を削除する） |
| `ExperimentRecordTab.tsx` に `TransitionList` の呼び出し箇所が複数ある可能性 | 中 | 中 | 実装前にファイル全体を確認し、すべての呼び出し箇所に `projectName` を追加する |
| `selectedTransition` が null の場合に問題一覧の再取得ができない | 低 | 低 | null チェックにより再取得をスキップ（コメント投稿自体は成功しているため許容） |
| `taskNo` の抽出ロジック（`selectedTaskId` 末尾要素の `parseInt`）が失敗する | 低 | 低 | `isNaN(taskNo)` チェックにより再取得をスキップ（既存の `handleIssueReport`・`handleSubmitIssue` と同じパターンで対応） |

---

## 8. テスト計画

### 手動テスト

- [ ] `TransitionList` のトランジション行にある「報告」ボタンを押し、問題管理モーダルを開く
- [ ] 問題一覧から問題を選択する
- [ ] コメント入力欄にテキストを入力し「コメント送信」ボタンを押す
- [ ] コメント投稿成功メッセージが表示されることを確認（二重表示でないこと）
- [ ] コメントが問題詳細のコメント一覧に反映されることを確認（再取得後の表示更新）
- [ ] コメント入力欄が空になることを確認（`IssueManagementModal` 内の制御）
- [ ] ネットワークエラー時に「コメントの投稿に失敗しました」が表示されることを確認（DevTools でオフライン設定）
- [ ] `projectName` が未設定（`undefined`）の状態で「コメント送信」を押した際に「プロジェクトが選択されていません」が表示されることを確認

---

## 9. 関連ドキュメント

- [mock_investigation.md](./mock_investigation.md) - モックデータ調査結果
- [PLAN_No5_handleSubmitComment_API化.md](./PLAN_No5_handleSubmitComment_API化.md) - No.5 計画書（同じ API を使う類似タスク・実施済み）
- `frontend/src/components/ExperimentWorker/TransitionList.tsx` - 実装対象
- `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - Props 渡し修正対象
- `frontend/src/services/issueApiService.ts` - `addComment` 関数（No.5 で実装済み）
- `backend/src/controllers/issueController.ts` - バックエンドAPI実装（`addComment`）

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 15:47
- **承認日時**: 2026-02-25 15:51
- **承認者コメント**: 承認済み

---

## 11. 実施記録

### 実施日時
開始: 2026-02-25 15:51  
完了: 2026-02-25 15:55  

### 計画からの変更点

なし（計画通りに実施）

### 発生した問題と解決方法

- `ExperimentRecordTab.tsx` の Line 85（`useState<any[]>`）に ESLint エラーが検出されたが、
  本タスクの変更前から存在していた既存の問題であるため、本タスクのスコープ外と判断し対応しなかった。

### 最終的な成果物

- [x] `frontend/src/components/ExperimentWorker/TransitionList.tsx`
  - `TransitionListProps` に `projectName?: string` を追加
  - コンポーネント関数の引数分割代入に `projectName` を追加
  - インポート文に `addComment` を追加（`issueApiService.ts` から）
  - `handleSubmitComment` を `async` 化し、`POST /api/v1/issues/comments` API 呼び出し＋問題一覧再取得に置き換え
  - モックの `message.success('コメントを投稿しました')` を削除（二重表示防止）
- [x] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
  - `<TransitionList>` に `projectName={selectedProjectName}` を追加
