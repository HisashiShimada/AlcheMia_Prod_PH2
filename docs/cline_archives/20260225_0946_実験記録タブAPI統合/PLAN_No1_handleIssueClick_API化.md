# タスク計画書: ExperimentRecordTab - handleIssueClick API化（No.1）

## メタデータ
- **作成日時**: 2026-02-25 13:11
- **タスクID**: experiment-record-tab-issue-api-no1
- **優先度**: 高
- **推定工数**: 1.5時間
- **対象ファイル**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

---

## 1. タスク概要

`mock_investigation.md` の「4. まとめ：修正が必要な箇所」No.1 の対応。

`ExperimentRecordTab.tsx` の `handleIssueClick` で使用しているモック関数
`getIssuesByTransitionId`（`@/data/projectsData` 由来）を、
実装済みバックエンドAPI `GET /api/v1/issues` の呼び出しに置き換える。

---

## 2. 目的と期待される成果

### 目的
- モックデータへの依存を解消し、実際のDBから問題一覧を取得する
- 問題報告モーダル（`IssueManagementModal`）にリアルタイムなデータを表示する

### 期待される成果
- [ ] `handleIssueClick` でモック関数 `getIssuesByTransitionId` を使用しなくなる
- [ ] 問題アイコンをクリックすると `GET /api/v1/issues` が呼ばれ、DBの問題一覧が取得される
- [ ] 取得中はローディング表示（`IssueManagementModal` の `loading` 状態）が適切に表示される
- [ ] 取得失敗時はエラーメッセージを表示する
- [ ] `projectsData` からの `getIssuesByTransitionId` import が `ExperimentRecordTab.tsx` から削除される
- [ ] 既存の TypeScript 型定義（`Issue`, `IssueComment`）をそのまま活用できる

---

## 3. 現状の実装

### 現在の `handleIssueClick`（モック版）

```typescript
// frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx

import { getIssuesByTransitionId } from '@/data/projectsData';  // ← モック

const handleIssueClick = (transition: Transition) => {
  setSelectedTransition(transition);
  const transitionIssues = getIssuesByTransitionId(transition.transitionId);  // ← モック呼び出し
  setIssues(transitionIssues);
  setIssueModalOpen(true);
};
```

### 使用する API（実装済み）

**エンドポイント**: `GET /api/v1/issues`

**必須クエリパラメータ**:

| パラメータ | 型 | 説明 | 取得元（コンポーネント内） |
|-----------|----|----|------|
| `projectId` | UUID | プロジェクトID | `projectId` state（`useState<string \| null>(null)`） |
| `methodId` | string | メソッドID | `selectedMethodId` props |
| `taskNo` | integer | タスク連番 | `selectedTaskId` を分解（形式: `{projectId}-{methodId}-{taskNo}`） |
| `transitionId` | string | トランジションID | `transition.transitionId` |

**レスポンス例（成功時 200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-...",
      "issueType": "material_shortage",
      "targetType": "transition",
      "projectId": "550e8400-...",
      "projectName": "Sample Project",
      "methodId": "method_001",
      "taskNo": 1,
      "transitionId": "transition_001",
      "title": "試薬Aの在庫不足",
      "contents": "実験に必要な試薬Aの在庫が不足しています。",
      "status": "unresolved",
      "reportedBy": "880e8400-...",
      "reportedByName": "山田太郎",
      "reportedAt": "2026-01-27T10:30:00Z",
      "comments": [
        {
          "sequenceNo": 1,
          "comment": "明日入荷予定です。",
          "authorId": "...",
          "authorName": "佐藤花子",
          "commentedAt": "2026-01-27T11:00:00Z"
        }
      ]
    }
  ]
}
```

### フロントエンド型定義（既存: 変更不要）

`frontend/src/types/experimentWorker.ts` に以下が既に定義済み：

```typescript
export interface Issue {
  issueId: string;
  transitionId: string;
  transitionName: string;
  projectId?: string;
  projectName?: string;
  title: string;
  content: string;
  status: IssueStatus;
  targetType: IssueTargetType;
  issueType?: IssueType;
  reportedBy: User;
  reportedAt: string;
  comments: IssueComment[];
}

export interface IssueComment {
  commentId: string;
  issueId: string;
  content: string;
  createdBy: User;
  createdAt: string;
}
```

---

## 4. 実装ステップ

### Phase 1: APIサービス関数の作成

- [ ] `frontend/src/services/issueApiService.ts` を新規作成する
  - `getIssues(params)` 関数を実装
    - `createApiClient` を使用して `GET /api/v1/issues` を呼び出す
    - クエリパラメータ: `projectId`, `methodId`, `taskNo`, `transitionId`
    - APIレスポンス（`data[]`）をフロントエンドの `Issue[]` 型にマッピングして返す
  - マッピング仕様:
    - `id` → `issueId`
    - `transitionId` → `transitionId`（そのまま）
    - `title` → `title`（そのまま）
    - `contents` → `content`
    - `status` → `status`（そのまま: `"unresolved"` | `"resolved"`）
    - `targetType` → `targetType`
    - `issueType` → `issueType`
    - `reportedBy` + `reportedByName` → `reportedBy: User`（`{ userId, userName }` に変換）
    - `reportedAt` → `reportedAt`
    - `transitionId` + `""` → `transitionName`（APIにtransitionNameが含まれないため空文字で初期化）
    - `projectId` → `projectId`
    - `projectName` → `projectName`
    - `comments[]` → `comments: IssueComment[]`
      - `sequenceNo.toString()` → `commentId`
      - `id`（issue id）→ `issueId`
      - `comment` → `content`
      - `authorId` + `authorName` → `createdBy: User`
      - `commentedAt` → `createdAt`

### Phase 2: ExperimentRecordTab.tsx の修正

- [ ] `issues` state の loading 状態を管理するため `issueLoading` state を追加する
  ```typescript
  const [issueLoading, setIssueLoading] = useState<boolean>(false);
  ```
- [ ] `handleIssueClick` を非同期関数（`async`）に変更し、APIを呼び出すよう修正する
  - `getIssuesByTransitionId` の呼び出しを削除
  - `getIssues` API呼び出しに置き換え
  - `selectedTaskId` から `taskNo` を抽出するロジックを実装
  - API呼び出し中は `issueLoading` を `true` に設定
  - エラー時は `message.error` を表示
- [ ] `getIssuesByTransitionId` の import を削除する
  ```typescript
  // 削除対象
  import { getIssuesByTransitionId } from '@/data/projectsData';
  ```
- [ ] `IssueManagementModal` に `loading` プロパティがあれば `issueLoading` を渡す
  （`IssueManagementModal` の props に `loading` がなければ省略可）

---

## 5. 変更ファイル

### 新規作成
1. `frontend/src/services/issueApiService.ts`
   - `GET /api/v1/issues` を呼び出す `getIssues()` 関数を定義
   - APIレスポンスをフロントエンド型（`Issue[]`）にマッピング

### 修正
1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
   - `getIssuesByTransitionId` import を削除
   - `issueLoading` state を追加
   - `handleIssueClick` を非同期化し API 呼び出しに変更

### 変更なし（参考）
- `frontend/src/types/experimentWorker.ts` — 型定義はそのまま使用
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` — 変更なし
- `frontend/src/data/projectsData.ts` — No.2（TransitionList.tsx）対応時に合わせて削除検討

---

## 6. 実装詳細

### issueApiService.ts の実装イメージ

```typescript
// frontend/src/services/issueApiService.ts

import { createApiClient } from '@/utils/authUtils';
import { Issue, IssueComment, User } from '@/types/experimentWorker';

/** GET /api/v1/issues のクエリパラメータ */
export interface GetIssuesParams {
  projectId: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  status?: 'unresolved' | 'resolved';
}

/** GET /api/v1/issues のレスポンスデータ（1件分） */
interface IssueApiData {
  id: string;
  issueType: string;
  targetType: string;
  projectId: string;
  projectName?: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  title: string;
  contents: string;
  status: 'unresolved' | 'resolved';
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  comments: {
    sequenceNo: number;
    comment: string;
    authorId: string;
    authorName: string;
    commentedAt: string;
  }[];
}

/**
 * APIレスポンスをフロントエンドの Issue 型にマッピング
 */
function mapToIssue(data: IssueApiData): Issue {
  const reportedBy: User = {
    userId: data.reportedBy,
    userName: data.reportedByName,
  };

  const comments: IssueComment[] = (data.comments ?? []).map((c) => ({
    commentId: String(c.sequenceNo),
    issueId: data.id,
    content: c.comment,
    createdBy: {
      userId: c.authorId,
      userName: c.authorName,
    } as User,
    createdAt: c.commentedAt,
  }));

  return {
    issueId: data.id,
    transitionId: data.transitionId,
    transitionName: '',       // APIレスポンスに含まれないため空文字
    projectId: data.projectId,
    projectName: data.projectName,
    title: data.title,
    content: data.contents,
    status: data.status,
    targetType: data.targetType as Issue['targetType'],
    issueType: data.issueType as Issue['issueType'],
    reportedBy,
    reportedAt: data.reportedAt,
    comments,
  };
}

/**
 * 問題一覧を取得する（GET /api/v1/issues）
 * @param params クエリパラメータ
 * @returns Issue[] フロントエンド型にマッピングされた問題一覧
 * @throws API呼び出し失敗時はエラーをスロー
 */
export async function getIssues(params: GetIssuesParams): Promise<Issue[]> {
  const client = createApiClient();
  const response = await client.get('/issues', { params });

  if (!response.data.success) {
    throw new Error('問題一覧の取得に失敗しました');
  }

  return (response.data.data as IssueApiData[]).map(mapToIssue);
}
```

### ExperimentRecordTab.tsx の修正イメージ

```typescript
// import の変更
// 削除:
// import { getIssuesByTransitionId } from '@/data/projectsData';
// 追加:
import { getIssues } from '@/services/issueApiService';

// state 追加
const [issueLoading, setIssueLoading] = useState<boolean>(false);

// handleIssueClick を非同期化
const handleIssueClick = async (transition: Transition) => {
  setSelectedTransition(transition);
  setIssues([]);
  setIssueModalOpen(true);

  // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
  const parts = selectedTaskId.split('-');
  const taskNo = parts.length > 2 ? parseInt(parts[parts.length - 1], 10) : null;

  if (!projectId || !selectedMethodId || taskNo === null || isNaN(taskNo)) {
    console.warn('[handleIssueClick] 必要なパラメータが不足しています', {
      projectId, selectedMethodId, selectedTaskId, taskNo,
    });
    return;
  }

  setIssueLoading(true);
  try {
    const fetchedIssues = await getIssues({
      projectId,
      methodId: selectedMethodId,
      taskNo,
      transitionId: transition.transitionId,
    });
    setIssues(fetchedIssues);
  } catch (error) {
    console.error('[handleIssueClick] 問題一覧取得エラー', error);
    message.error('問題一覧の取得に失敗しました');
  } finally {
    setIssueLoading(false);
  }
};
```

---

## 7. 影響範囲

### 影響を受けるコンポーネント
- `ExperimentRecordTab.tsx` — 直接修正対象
- `IssueManagementModal.tsx` — `issues` props の渡し方は変わらないため変更不要

### 影響なし
- `TransitionList.tsx` — No.2 として別タスクで対応
- `DataRecordDialog.tsx` — No.8〜10 として別タスクで対応
- `projectsData.ts` — `getIssuesByTransitionId` は TransitionList.tsx でも使用中のため、本タスクでは削除しない

---

## 8. 前提条件・注意事項

### 前提
- バックエンド `GET /api/v1/issues` は実装済み（`docs/design/api/api_issue_management.md` 参照）
- `createApiClient` ユーティリティは `frontend/src/utils/authUtils.ts` に実装済み

### taskNo 抽出ロジックについて
- `selectedTaskId` の形式: `{projectId}-{methodId}-{taskNo}`
  - 例: `550e8400-e29b-41d4-a716-446655440000-method_001-1`
  - `projectId` は UUID（ハイフン含む）のため単純な `split('-')` では分割できない
  - **`parts[parts.length - 1]` で末尾要素を取得する**
- `selectedTaskId` が未選択の場合、`handleIssueClick` は `TransitionFlowDiagram` からのみ呼び出されるため、タスクが選択されていない状態でも呼べる可能性がある → 防御的にガード処理を実装する

### `transitionName` について
- `GET /api/v1/issues` のレスポンスに `transitionName` フィールドは含まれていない
- `Issue.transitionName` は `IssueManagementModal` のタイトル表示に使われるが、
  モーダル表示時に `selectedTransition.transitionName` を直接 `transitionName` props として渡しているため実害なし
- `issueApiService.ts` では空文字 `''` で初期化する

---

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `selectedTaskId` の形式が想定と異なる | 中 | 低 | `parts.length > 2` チェックとガード処理を実装 |
| `projectId` が null（プロジェクト選択前） | 中 | 低 | null チェックを実装し、不足時は早期リターン |
| APIレスポンスのフィールド名が設計書と異なる | 中 | 低 | 実装後に実際の API レスポンスで動作確認を行う |
| `comments` が undefined の場合にクラッシュ | 低 | 低 | `(data.comments ?? [])` でデフォルト値を設定 |

---

## 10. テスト計画

### 手動テスト手順
1. 実験作業者画面にログインする
2. プロジェクトを選択する
3. メソッドとタスクを選択する
4. トランジション一覧（リスト表示）またはフロー図で問題アイコンをクリックする
5. 以下を確認する:
   - [ ] 問題管理モーダルが開く
   - [ ] モーダルに DB から取得した問題一覧が表示される（件数が正しい）
   - [ ] 問題がない場合は空の状態で表示される
   - [ ] コメントが正しく表示される
   - [ ] モーダルを閉じて再度開いても正常に動作する

### エラーケースの確認
- [ ] ネットワークエラー時に `message.error` が表示される
- [ ] `projectId` が null の場合にモーダルは開くが問題一覧は空になる（エラーにならない）

---

## 11. 承認記録

- **計画書提示日時**: 2026-02-25 13:11
- **承認日時**: 2026-02-25 13:15
- **承認者コメント**: 計画書に沿って実装を開始してください

---

## 12. 実施記録

### 実施日時
- 開始: 2026-02-25 13:16
- 完了: 2026-02-25 13:21

### 変更点サマリー
- 新規作成: `frontend/src/services/issueApiService.ts`
  - `GetIssuesParams` インターフェース定義
  - `IssueCommentApiData` / `IssueApiData` APIレスポンス型定義
  - `mapToIssueComment()` / `mapToIssue()` マッピング関数
  - `getIssues()` 関数: GET /api/v1/issues を呼び出し Issue[] を返す
- 修正: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
  - `getIssuesByTransitionId` import 削除 → `getIssues` import に変更
  - `issueLoading` state 追加
  - `handleIssueClick` を async に変更・API呼び出しに置き換え

### 最終的な成果物
- [x] `handleIssueClick` でモック関数 `getIssuesByTransitionId` を使用しなくなった
- [x] 問題アイコンをクリックすると `GET /api/v1/issues` が呼ばれる
- [x] 取得失敗時は `message.error` でエラーメッセージを表示
- [x] `projectsData` からの `getIssuesByTransitionId` import が `ExperimentRecordTab.tsx` から削除された
- [x] 既存の TypeScript 型定義（`Issue`, `IssueComment`）をそのまま活用
- [x] TypeScript ビルドエラーなし（対象ファイルに新規エラーなし）
