# タスク計画書: ExperimentRecordTab - handleSubmitIssue API化（No.3）

## メタデータ
- **作成日時**: 2026-02-25 13:33
- **タスクID**: experiment-record-tab-submit-issue-api-no3
- **優先度**: 高
- **推定工数**: 1.5時間
- **対象ファイル**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

---

## 1. タスク概要

`mock_investigation.md` の「4. まとめ：修正が必要な箇所」No.3 の対応。

`ExperimentRecordTab.tsx` の `handleSubmitIssue` が現在コンソールログのみ（TODO）の状態を、
実装済みバックエンドAPI `POST /api/v1/issues` の呼び出しに置き換える。

---

## 2. 目的と期待される成果

### 目的
- 問題報告フォームの送信処理を実際のAPI呼び出しに置き換える
- 問題報告データをDBに永続化できるようにする

### 期待される成果
- [ ] `handleSubmitIssue` がコンソールログのみでなく `POST /api/v1/issues` を呼び出す
- [ ] 送信成功時に成功メッセージ（`message.success`）を表示し、モーダルを閉じる
- [ ] 送信後に問題一覧を再取得して最新状態を反映する
- [ ] 送信失敗時にエラーメッセージ（`message.error`）を表示する
- [ ] `issueApiService.ts` に `createIssue()` 関数が追加される

---

## 3. 現状の実装

### 現在の `handleSubmitIssue`（TODO版）

```typescript
// frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx

// 新規問題報告送信ハンドラ
const handleSubmitIssue = (issue: IssueReportFormData) => {
  console.log('新規問題報告:', issue);
  // TODO: バックエンドAPIへの送信処理を実装
};
```

### `handleSubmitIssue` の呼び出し元

`IssueManagementModal` に `onSubmitIssue` props として渡されている。

```tsx
// frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
<IssueManagementModal
  visible={issueModalOpen}
  transitionId={selectedTransition?.transitionId || ''}
  transitionName={selectedTransition?.transitionName || ''}
  issues={issues}
  onClose={handleIssueModalClose}
  onSubmitIssue={handleSubmitIssue}   // ← ここに渡される
  onSubmitComment={handleSubmitComment}
  projectStatus={projectStatus}
/>
```

### `IssueReportFormData` 型定義（変更なし）

```typescript
// frontend/src/types/experimentWorker.ts
export interface IssueReportFormData {
  title: string;           // タイトル
  targetType: IssueTargetType; // 対象（'project' | 'task' | 'transition'）
  issueType: IssueType;    // 問題タイプ
  content: string;         // 内容 → APIの description フィールドに対応
}
```

---

## 4. 使用するAPI（実装済み）

### `POST /api/v1/issues`（問題報告 API 7.1）

**リクエストボディ（JSON）**:

| フィールド | 型 | 必須 | 説明 | 取得元（コンポーネント内） |
|-----------|-----|------|------|--------------------------|
| `projectId` | UUID | ✅ | プロジェクトID | `projectId` state |
| `methodId` | string | - | メソッドID | `selectedMethodId` props |
| `issueType` | string | ✅ | 問題タイプ | `issue.issueType` |
| `targetType` | string | ✅ | 対象タイプ | `issue.targetType` |
| `taskNo` | integer | - | タスク連番 | `selectedTaskId` を分解 |
| `transitionId` | string | - | トランジションID | `selectedTransition?.transitionId` |
| `title` | string | ✅ | タイトル（最大200文字） | `issue.title` |
| `description` | string | ✅ | 内容（最大2000文字） | `issue.content` |

**レスポンス例（成功時 201 Created）**:
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "issueType": "material_shortage",
    "targetType": "transition",
    "projectId": "550e8400-...",
    "methodId": "method_001",
    "taskNo": 1,
    "transitionId": "transition_001",
    "title": "試薬Aの在庫不足",
    "contents": "実験に必要な試薬Aが不足しています。",
    "status": "unresolved",
    "reportedBy": "880e8400-...",
    "reportedByName": "山田太郎",
    "reportedAt": "2026-02-25T10:30:00Z",
    "comments": []
  },
  "meta": {
    "timestamp": "2026-02-25T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

**エラーレスポンス例（400 Bad Request）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_REQUIRED",
    "message": "titleは必須です",
    "details": [...]
  }
}
```

---

## 5. 実装ステップ

### Phase 1: issueApiService.ts に `createIssue()` を追加

- [ ] `frontend/src/services/issueApiService.ts` に以下を追加する

#### 追加する型定義

```typescript
/**
 * 問題報告APIのリクエストボディ
 * POST /api/v1/issues
 */
export interface CreateIssueParams {
  /** プロジェクトID（UUID、必須） */
  projectId: string;
  /** メソッドID（オプション） */
  methodId?: string;
  /** 問題タイプ（必須） */
  issueType: string;
  /** 対象タイプ（必須） */
  targetType: string;
  /** タスク連番（オプション） */
  taskNo?: number;
  /** トランジションID（オプション） */
  transitionId?: string;
  /** タイトル（必須、最大200文字） */
  title: string;
  /** 内容（必須、最大2000文字）*/
  description: string;
}

/**
 * 問題報告APIのレスポンスデータ（1件分）
 * バックエンドAPIレスポンスの構造
 */
interface CreateIssueApiData {
  id: string;
  issueType: string;
  targetType: string;
  projectId: string;
  projectName?: string;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  title: string;
  contents: string;
  status: 'unresolved' | 'resolved';
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  comments: IssueCommentApiData[];
}
```

#### 追加する関数

```typescript
/**
 * 問題を報告する
 * POST /api/v1/issues
 *
 * 問題報告フォームの送信内容をバックエンドに送信し、
 * 作成された問題データをフロントエンドの Issue 型にマッピングして返す。
 *
 * @param params リクエストボディ（projectId, issueType, targetType, title, description は必須）
 * @returns 作成された Issue（フロントエンド型にマッピング済み）
 * @throws Error API呼び出し失敗時
 *
 * @example
 * ```typescript
 * const created = await createIssue({
 *   projectId: '550e8400-e29b-41d4-a716-446655440000',
 *   methodId: 'method_001',
 *   issueType: 'material_shortage',
 *   targetType: 'transition',
 *   taskNo: 1,
 *   transitionId: 'transition_001',
 *   title: '試薬Aの在庫不足',
 *   description: '実験に必要な試薬Aが不足しています。',
 * });
 * ```
 */
export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const client = createApiClient();

  try {
    console.log('[DEBUG] createIssue - Start', {
      projectId: params.projectId,
      methodId: params.methodId,
      issueType: params.issueType,
      targetType: params.targetType,
      taskNo: params.taskNo,
      transitionId: params.transitionId,
    });

    const response = await client.post<{
      success: boolean;
      data: CreateIssueApiData;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>('/issues', params);

    if (!response.data.success) {
      throw new Error('問題の報告に失敗しました');
    }

    const issue = mapToIssue(response.data.data);

    console.log('[DEBUG] createIssue - Success', {
      issueId: issue.issueId,
    });

    return issue;
  } catch (error) {
    console.error('[DEBUG] createIssue - Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorResponse: (error as AxiosError)?.response?.data,
      errorStatus: (error as AxiosError)?.response?.status,
    });
    throw error;
  }
}
```

---

### Phase 2: ExperimentRecordTab.tsx の修正

- [ ] `import` 文に `createIssue` を追加する

```typescript
// 変更前
import { getIssues } from '@/services/issueApiService';

// 変更後
import { getIssues, createIssue } from '@/services/issueApiService';
```

- [ ] `handleSubmitIssue` を非同期関数（`async`）に変更し、APIを呼び出すよう修正する

```typescript
// 変更前
const handleSubmitIssue = (issue: IssueReportFormData) => {
  console.log('新規問題報告:', issue);
  // TODO: バックエンドAPIへの送信処理を実装
};

// 変更後
const handleSubmitIssue = async (issue: IssueReportFormData) => {
  // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
  // projectId は UUID（ハイフン含む）のため末尾要素を取得する
  const parts = selectedTaskId.split('-');
  const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

  if (!projectId) {
    console.warn('[handleSubmitIssue] projectId が未設定です');
    message.error('プロジェクトが選択されていません');
    return;
  }

  try {
    await createIssue({
      projectId,
      methodId: selectedMethodId ?? undefined,
      issueType: issue.issueType,
      targetType: issue.targetType,
      taskNo: (taskNo !== null && !isNaN(taskNo)) ? taskNo : undefined,
      transitionId: selectedTransition?.transitionId ?? undefined,
      title: issue.title,
      description: issue.content,
    });

    message.success('問題を報告しました');

    // 問題一覧を再取得して最新状態を反映
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
        console.error('[handleSubmitIssue] 問題一覧再取得エラー', fetchError);
        // 再取得失敗はサイレントに処理（報告自体は成功しているため）
      } finally {
        setIssueLoading(false);
      }
    }
  } catch (error) {
    console.error('[handleSubmitIssue] 問題報告エラー', error);
    message.error('問題の報告に失敗しました');
  }
};
```

---

## 6. 変更ファイル

### 修正
1. `frontend/src/services/issueApiService.ts`
   - `CreateIssueParams` インターフェースを追加
   - `CreateIssueApiData` インターフェースを追加
   - `createIssue()` 関数を追加

2. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
   - `createIssue` を import に追加
   - `handleSubmitIssue` を非同期化し API 呼び出しに変更

### 変更なし
- `frontend/src/types/experimentWorker.ts` — 型定義はそのまま使用
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` — `onSubmitIssue` の型は `(issue: IssueReportFormData) => void` だが、`async` 関数（`Promise<void>` を返す）を渡しても TypeScript 上は互換があるため変更不要

---

## 7. 重要な実装上の注意事項

### `taskNo` 抽出ロジック

`selectedTaskId` の形式は `{projectId}-{methodId}-{taskNo}` だが、`projectId` が UUID（ハイフン含む）のため単純な `split('-')` 後に `[2]` を取るのは誤り。

```typescript
// ✅ 正しい実装
const parts = selectedTaskId.split('-');
const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

// ❌ 誤った実装（UUID分割でインデックスがずれる）
const taskNo = parseInt(selectedTaskId.split('-')[2], 10);
```

※ No.1（`handleIssueClick`）と同じロジックを使用。

### `IssueReportFormData.content` → `description` のマッピング

バックエンドAPIは `description` フィールドを要求するが、フロントエンドの `IssueReportFormData` は `content` フィールドを持つ。

```typescript
// ✅ 正しいマッピング
description: issue.content,

// ❌ 誤ったマッピング
description: (issue as any).description,  // フィールド名が存在しない
```

### 問題報告後の問題一覧再取得

報告後にモーダル内の問題一覧を最新状態にするため、`handleIssueClick` と同様のロジックで再取得する。
ただし再取得失敗は報告自体の成功には影響しないため、サイレントに処理する。

### `selectedTransition` が null の場合

`targetType` が `'project'` または `'task'` の場合、トランジションに紐付かない問題報告も想定される。
API上 `transitionId` は optional のため、`selectedTransition` が null でも送信可能。

---

## 8. 影響範囲

### 直接修正対象
- `ExperimentRecordTab.tsx` — `handleSubmitIssue` の修正
- `issueApiService.ts` — `createIssue()` 関数の追加

### 間接影響
- `IssueManagementModal.tsx` — 変更なし（`onSubmitIssue` コールバックの実装が変わるだけ）
- `TransitionList.tsx` — No.4 として別タスクで対応予定（同様の修正が必要）

---

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `projectId` が null（プロジェクト未選択時） | 中 | 低 | 事前に null チェックを行い、不足時は早期リターン＋`message.error` |
| `taskNo` 抽出の失敗（形式不一致） | 中 | 低 | `parseInt` 後の `isNaN` チェックを実施し、null/NaN の場合は `undefined` を渡す |
| バックエンドのバリデーションエラー（400） | 中 | 中 | `message.error('問題の報告に失敗しました')` で統一表示。詳細は `console.error` に出力 |
| 問題一覧再取得の失敗 | 低 | 低 | サイレントエラー処理（報告は成功しているため UI の不整合を最小化） |
| `IssueManagementModal` が閉じた後の setState 呼び出し | 低 | 低 | React のメモリリーク警告が出る可能性。現状は許容範囲内 |

---

## 10. テスト計画

### 手動テスト手順

1. 実験作業者画面にログインする
2. プロジェクト・メソッド・タスクを選択する
3. トランジション一覧またはフロー図で問題アイコンをクリックし、問題管理モーダルを開く
4. 「問題を報告する」フォームに必要事項を入力する
   - タイトル
   - 対象タイプ（トランジション等）
   - 問題タイプ（材料不足等）
   - 内容
5. 「送信」ボタンをクリックする

#### 正常系の確認
- [ ] `POST /api/v1/issues` が呼ばれ、リクエストボディに正しいデータが含まれている（Network タブで確認）
- [ ] 送信成功後に `「問題を報告しました」` の成功メッセージが表示される
- [ ] モーダル内の問題一覧が再取得され、報告した問題が追加されている
- [ ] コンソールに `[DEBUG] createIssue - Success` が出力される

#### 異常系の確認
- [ ] ネットワークエラー時（DevTools でネットワークをオフライン設定）に `「問題の報告に失敗しました」` が表示される
- [ ] `projectId` が null の状態（プロジェクト未選択時）に `「プロジェクトが選択されていません」` が表示される
- [ ] バックエンドの 400 エラー時（タイトルを空にするなど）にエラーメッセージが表示される

---

## 11. 承認記録

- **計画書提示日時**: 2026-02-25 13:33
- **承認日時**: 2026-02-25 13:37
- **承認者コメント**: タスク計画書に沿って実装を開始してください。

---

## 12. 実施記録

### 実施日時
- 開始: 2026-02-25 13:37
- 完了: 2026-02-25 13:39

### 変更点サマリー

#### 修正ファイル（2ファイル）

**`frontend/src/services/issueApiService.ts`**
- `CreateIssueParams` インターフェース追加（POST /api/v1/issues リクエストボディ型）
- `CreateIssueApiData` インターフェース追加（POST /api/v1/issues レスポンス型）
- `createIssue()` 関数追加
  - `/issues` に POST リクエストを送信
  - レスポンスを既存の `mapToIssue()` で `Issue` 型にマッピングして返す

**`frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`**
- import に `createIssue` を追加（`getIssues, createIssue` に変更）
- `handleSubmitIssue` を同期関数 → `async` 関数に変更
  - `selectedTaskId` 末尾要素から `taskNo` を抽出
  - `projectId` の null チェック（未設定時は早期リターン＋エラーメッセージ）
  - `createIssue()` を呼び出し POST /api/v1/issues にリクエスト送信
  - 送信成功後に `message.success('問題を報告しました')` を表示
  - 送信後に `getIssues()` で問題一覧を再取得してモーダル表示を更新
  - 再取得失敗はサイレント処理
  - 送信失敗時に `message.error('問題の報告に失敗しました')` を表示

### 最終的な成果物
- [x] `handleSubmitIssue` が `POST /api/v1/issues` を呼び出すように修正された
- [x] 送信成功時に成功メッセージを表示し、問題一覧を再取得する
- [x] 送信失敗時にエラーメッセージを表示する
- [x] `issueApiService.ts` に `createIssue()` 関数が追加された
- [x] TypeScript ビルドエラーなし（既存 any[] 警告は本タスク対象外）
