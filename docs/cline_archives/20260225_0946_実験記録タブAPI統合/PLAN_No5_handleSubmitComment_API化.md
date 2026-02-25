# タスク計画書: No.5 handleSubmitComment API化（ExperimentRecordTab）

## メタデータ
- **作成日時**: 2026-02-25 14:11
- **タスクID**: handleSubmitComment_API化
- **優先度**: 高
- **推定工数**: 1時間
- **対象No**: mock_investigation.md の「4. まとめ：修正が必要な箇所」No.5

---

## 1. タスク概要

`ExperimentRecordTab.tsx` の `handleSubmitComment` ハンドラが、
現在コンソールログ出力のみで API を呼び出していない。

これを `POST /api/v1/issues/comments`（コメント投稿 API 7.2）を
正しく呼び出す実装に置き換える。

---

## 2. 目的と期待される成果

### 目的

`IssueManagementModal` のコメント送信ボタン押下時に、
`ExperimentRecordTab.tsx` の `handleSubmitComment` を経由して
バックエンドの `POST /api/v1/issues/comments` API が呼ばれること。

### 期待される成果

- [ ] コメント投稿がバックエンド DB に永続化される
- [ ] 投稿成功後に問題一覧（コメント含む）が自動的に再取得・表示更新される
- [ ] エラー時はメッセージが表示される

---

## 3. 現状分析

### 3.1 修正対象箇所

**ファイル**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

```typescript
// 現在: コンソールログのみ（モック）
const handleSubmitComment = (issueId: string, comment: string) => {
  console.log('コメント投稿:', { issueId, comment });
  // TODO: バックエンドAPIへの送信処理を実装
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

`IssueManagementModal` 内では以下の3箇所から呼び出される：

| 呼び出し元 | 処理 |
|-----------|------|
| `handleCommentSubmit()` | コメントのみ送信 |
| `handleSetUnresolved()` | コメント送信 ＋ ステータスを「未解決」に変更 |
| `handleSetResolved()` | コメント送信 ＋ ステータスを「解決済」に変更 |

### 3.3 バックエンドAPI確認

**エンドポイント**: `POST /api/v1/issues/comments`  
**実装ファイル**: `backend/src/controllers/issueController.ts` の `addComment` 関数  
**実装状況**: ✅ 実装済み

**リクエストボディ** (`issueController.ts` より):
```typescript
const { projectName, issueId, comment } = req.body;
```

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `projectName` | string | ✅ | プロジェクト名 |
| `issueId` | string (UUID) | ✅ | 問題ID |
| `comment` | string | ✅ | コメント内容 |

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "sequenceNo": 1,
    "comment": "コメント内容",
    "authorId": "user-uuid",
    "authorName": "ユーザー名",
    "commentedAt": "2026-02-25T14:00:00Z"
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### 3.4 フロントエンドサービス確認

**ファイル**: `frontend/src/services/issueApiService.ts`

現在 `getIssues`（問題一覧取得）と `createIssue`（問題報告）は実装済みだが、
**`addComment`（コメント投稿）関数は未実装**。

---

## 4. 実装ステップ

### Phase 1: issueApiService.ts に addComment 関数を追加

- [ ] `AddCommentParams` インターフェースを定義する
- [ ] `AddCommentResult` インターフェース（レスポンスデータ型）を定義する
- [ ] `addComment` 関数を実装する
  - エンドポイント: `POST /api/v1/issues/comments`
  - リクエストボディ: `{ projectName, issueId, comment }`
  - ログ出力（既存パターンに準拠）
  - エラーハンドリング（既存パターンに準拠）

### Phase 2: ExperimentRecordTab.tsx の handleSubmitComment を修正

- [ ] `issueApiService` から `addComment` をインポートする
- [ ] `handleSubmitComment` を `async` 関数に変更する
- [ ] `addComment` API 呼び出しを実装する
  - `projectName`: `selectedProjectName`
  - `issueId`: 引数の `issueId`
  - `comment`: 引数の `comment`
- [ ] 投稿成功後に `getIssues` を再呼び出しして `issues` ステートを更新する（画面表示に反映）
- [ ] エラー時に `message.error` を表示する

---

## 5. 影響範囲

### 変更するファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/services/issueApiService.ts` | `AddCommentParams` 型・`addComment` 関数を追加 |
| 2 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `handleSubmitComment` をAPI呼び出しに変更 |

### 新規作成するファイル

なし

### 影響を受けるコンポーネント

- `IssueManagementModal.tsx` への影響なし（`onSubmitComment` プロパティのシグネチャ変更なし）
- `TransitionList.tsx` の `handleSubmitComment` は本タスクのスコープ外（No.6 で対応）

---

## 6. 実装詳細

### 6.1 issueApiService.ts への追加内容

```typescript
/**
 * コメント追加APIのリクエストパラメータ
 * POST /api/v1/issues/comments
 */
export interface AddCommentParams {
  /** プロジェクト名（必須） */
  projectName: string;
  /** 問題ID（UUID、必須） */
  issueId: string;
  /** コメント内容（必須） */
  comment: string;
}

/**
 * コメント追加APIのレスポンスデータ（1件分）
 * バックエンドAPIレスポンスの構造（POST /api/v1/issues/comments）
 */
interface AddCommentApiData {
  sequenceNo: number;
  comment: string;
  authorId: string;
  authorName: string;
  commentedAt: string;
}

/**
 * コメントを追加する
 * POST /api/v1/issues/comments
 *
 * 指定した問題にコメントを追加する。
 *
 * @param params リクエストパラメータ（projectName, issueId, comment は必須）
 * @returns 作成されたコメントデータ
 * @throws Error API呼び出し失敗時
 */
export async function addComment(params: AddCommentParams): Promise<AddCommentApiData> {
  const client = createApiClient();

  try {
    console.log('[DEBUG] addComment - Start', {
      issueId: params.issueId,
      projectName: params.projectName,
    });

    const response = await client.post<{
      success: boolean;
      data: AddCommentApiData;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/issues/comments', params);

    if (!response.data.success) {
      throw new Error('コメントの追加に失敗しました');
    }

    console.log('[DEBUG] addComment - Success', {
      issueId: params.issueId,
      sequenceNo: response.data.data.sequenceNo,
    });

    return response.data.data;
  } catch (error) {
    console.error('[DEBUG] addComment - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
}
```

### 6.2 ExperimentRecordTab.tsx の変更内容

**インポート変更:**
```typescript
// 変更前
import { getIssues, createIssue } from '@/services/issueApiService';

// 変更後
import { getIssues, createIssue, addComment } from '@/services/issueApiService';
```

**handleSubmitComment の変更:**
```typescript
// 変更前
const handleSubmitComment = (issueId: string, comment: string) => {
  console.log('コメント投稿:', { issueId, comment });
  // TODO: バックエンドAPIへの送信処理を実装
};

// 変更後
const handleSubmitComment = async (issueId: string, comment: string) => {
  const parts = selectedTaskId.split('-');
  const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

  try {
    await addComment({
      projectName: selectedProjectName,
      issueId,
      comment,
    });

    // コメント投稿後に問題一覧を再取得して表示に反映
    if (projectId && selectedMethodId && taskNo !== null && !isNaN(taskNo) && selectedTransition) {
      setIssueLoading(true);
      try {
        const fetchedIssues = await getIssues({
          projectId,
          methodId: selectedMethodId,
          taskNo,
          transitionId: selectedTransition.transitionId,
        });
        setIssues(fetchedIssues);
      } catch (fetchError) {
        console.error('[handleSubmitComment] 問題一覧再取得エラー', fetchError);
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

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `IssueManagementModal` 内で `message.success('コメントを送信しました')` が二重表示される | 低 | 高 | `IssueManagementModal` の `handleCommentSubmit` は既に `message.success` を呼んでいるため、`handleSubmitComment` 側では `message.success` を呼ばない |
| 問題一覧の再取得中にモーダルが閉じられる | 低 | 低 | `issueLoading` フラグは既存のロードスピナー表示に使用するため影響範囲は限定的 |
| `selectedTransition` が null の場合に再取得できない | 低 | 低 | null チェックにより再取得をスキップ（コメント投稿自体は成功しているため許容） |

---

## 8. テスト計画

### 手動テスト

- [ ] 問題報告モーダルを開き、問題を選択する
- [ ] コメント入力欄にテキストを入力し「コメント送信」ボタンを押す
- [ ] コメント投稿成功メッセージが表示されることを確認
- [ ] コメントが問題詳細のコメント一覧に反映されることを確認（再取得後の表示更新）
- [ ] コメント入力欄が空になることを確認（`IssueManagementModal` 内の制御）
- [ ] ネットワークエラー時に「コメントの投稿に失敗しました」が表示されることを確認（DevToolsでオフライン設定）

---

## 9. 関連ドキュメント

- [mock_investigation.md](./mock_investigation.md) - モックデータ調査結果
- [PLAN_No4_handleSubmitIssue_TransitionList_API化.md](./PLAN_No4_handleSubmitIssue_TransitionList_API化.md) - No.4 計画書（類似タスク）
- `frontend/src/services/issueApiService.ts` - 問題管理APIサービス
- `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - 実装対象
- `backend/src/controllers/issueController.ts` - バックエンドAPI実装（`addComment`）

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 14:11
- **承認日時**: 2026-02-25 14:39
- **承認者コメント**: 承認済み

---

## 11. 実施記録

### 実施日時
開始: 2026-02-25 14:39  
完了: 2026-02-25 14:47  

### 計画からの変更点

なし（計画通りに実施）

### 発生した問題と解決方法

- `addComment` 関数を `createIssue` 関数の直前に挿入した際、`createIssue` の JSDoc コメントが重複・ずれたため、別途修正した。

### 最終的な成果物

- [x] `frontend/src/services/issueApiService.ts` - `AddCommentParams` 型・`AddCommentApiData` 型・`addComment` 関数を追加
- [x] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - `handleSubmitComment` を `async` 化し、`POST /api/v1/issues/comments` API 呼び出し＋問題一覧再取得に置き換え
