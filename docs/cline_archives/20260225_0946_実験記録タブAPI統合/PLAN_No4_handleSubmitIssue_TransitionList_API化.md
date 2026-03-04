# タスク計画書: TransitionList - handleSubmitIssue API化（No.4）

## メタデータ
- **作成日時**: 2026-02-25 13:41
- **タスクID**: transition-list-submit-issue-api-no4
- **優先度**: 高
- **推定工数**: 0.5時間
- **対象ファイル**: `frontend/src/components/ExperimentWorker/TransitionList.tsx`

---

## 1. タスク概要

`mock_investigation.md` の「4. まとめ：修正が必要な箇所」No.4 の対応。

`TransitionList.tsx` の `handleSubmitIssue` が現在コンソールログのみ（TODO）の状態を、
実装済みバックエンドAPI `POST /api/v1/issues` の呼び出しに置き換える。

No.3（`ExperimentRecordTab.tsx` の `handleSubmitIssue` API化）と同様の修正であり、
`issueApiService.ts` の `createIssue()` は No.3 の実装で既に追加済みのため、
本タスクは `TransitionList.tsx` の修正のみで完結する。

---

## 2. 目的と期待される成果

### 目的
- `TransitionList` コンポーネントの問題報告フォームの送信処理を実際のAPI呼び出しに置き換える
- 問題報告データをDBに永続化できるようにする

### 期待される成果
- [ ] `handleSubmitIssue` がコンソールログのみでなく `POST /api/v1/issues` を呼び出す
- [ ] 送信成功時に成功メッセージ（`message.success`）を表示する
- [ ] 送信後に問題一覧を再取得して最新状態を反映する
- [ ] 送信失敗時にエラーメッセージ（`message.error`）を表示する

---

## 3. 現状の実装

### 現在の `handleSubmitIssue`（TODO版）

```typescript
// frontend/src/components/ExperimentWorker/TransitionList.tsx

// 新規問題報告送信ハンドラ
const handleSubmitIssue = (issue: IssueReportFormData) => {
  console.log('新規問題報告:', issue);
  // TODO: バックエンドAPIへの送信処理を実装
  message.success('問題を報告しました');
};
```

### `handleSubmitIssue` の呼び出し元

`IssueManagementModal` に `onSubmitIssue` props として渡されている。

```tsx
// frontend/src/components/ExperimentWorker/TransitionList.tsx
{selectedTransition && (
  <IssueManagementModal
    visible={issueModalOpen}
    transitionId={selectedTransition.transitionId}
    transitionName={selectedTransition.transitionName}
    issues={issues}
    onClose={handleIssueModalClose}
    onSubmitIssue={handleSubmitIssue}   // ← ここに渡される
    onSubmitComment={handleSubmitComment}
    projectStatus={projectStatus}
  />
)}
```

### 現在の `import` 文（関連部分）

```typescript
import { getIssues } from '@/services/issueApiService';
```

### `TransitionListProps` の関連フィールド

```typescript
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;   // taskNo 抽出に使用
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;        // API呼び出しに使用
  methodId?: string;         // API呼び出しに使用
}
```

### 既存の `handleIssueReport`（参考）

`handleIssueReport` は No.2 の実装で既に `getIssues` API化が完了しており、
`taskNo` 抽出ロジックや `issueLoading` state の活用パターンが実装済みである。
`handleSubmitIssue` はこれと同様のアプローチで実装する。

```typescript
// handleIssueReport（参考）
const handleIssueReport = async (transition: Transition) => {
  setSelectedTransition(transition);
  setIssues([]);
  setIssueModalOpen(true);

  const parts = (selectedTaskId ?? '').split('-');
  const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

  if (!projectId || !methodId || !selectedTaskId || isNaN(taskNo)) {
    console.warn('[handleIssueReport] 必要なパラメータが不足しています', { ... });
    return;
  }

  setIssueLoading(true);
  try {
    const fetchedIssues = await getIssues({ projectId, methodId, taskNo, transitionId: transition.transitionId });
    setIssues(fetchedIssues);
  } catch (error) {
    message.error('問題一覧の取得に失敗しました');
  } finally {
    setIssueLoading(false);
  }
};
```

---

## 4. 使用するAPI（実装済み）

### `POST /api/v1/issues`（問題報告 API 7.1）

**リクエストボディ（JSON）**:

| フィールド | 型 | 必須 | 説明 | 取得元（コンポーネント内） |
|-----------|-----|------|------|--------------------------|
| `projectId` | UUID | ✅ | プロジェクトID | `projectId` props |
| `methodId` | string | - | メソッドID | `methodId` props |
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
  }
}
```

### `issueApiService.ts` の `createIssue()`（No.3 で実装済み）

```typescript
// frontend/src/services/issueApiService.ts

export interface CreateIssueParams {
  projectId: string;
  methodId?: string;
  issueType: string;
  targetType: string;
  taskNo?: number;
  transitionId?: string;
  title: string;
  description: string;
}

export async function createIssue(params: CreateIssueParams): Promise<Issue> { ... }
```

No.3 の実装で既に追加済みのため、`issueApiService.ts` の変更は不要。

---

## 5. 実装ステップ

### Phase 1: TransitionList.tsx の修正

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
  message.success('問題を報告しました');
};

// 変更後
const handleSubmitIssue = async (issue: IssueReportFormData) => {
  // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
  // projectId は UUID（ハイフン含む）のため split('-') の末尾要素を取得する
  const parts = (selectedTaskId ?? '').split('-');
  const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

  if (!projectId) {
    console.warn('[handleSubmitIssue] projectId が未設定です');
    message.error('プロジェクトが選択されていません');
    return;
  }

  try {
    await createIssue({
      projectId,
      methodId: methodId ?? undefined,
      issueType: issue.issueType,
      targetType: issue.targetType,
      taskNo: !isNaN(taskNo) ? taskNo : undefined,
      transitionId: selectedTransition?.transitionId ?? undefined,
      title: issue.title,
      description: issue.content,
    });

    message.success('問題を報告しました');

    // 問題一覧を再取得して最新状態を反映
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

### 修正（1ファイルのみ）
1. `frontend/src/components/ExperimentWorker/TransitionList.tsx`
   - `import` に `createIssue` を追加
   - `handleSubmitIssue` を非同期化し API 呼び出しに変更

### 変更なし
- `frontend/src/services/issueApiService.ts` — `createIssue()` は No.3 で実装済み
- `frontend/src/types/experimentWorker.ts` — 型定義はそのまま使用
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` — `onSubmitIssue` の型は `(issue: IssueReportFormData) => void` だが、`async` 関数（`Promise<void>` を返す）を渡しても TypeScript 上は互換があるため変更不要

---

## 7. 重要な実装上の注意事項

### `taskNo` 抽出ロジック

`selectedTaskId` の形式は `{projectId}-{methodId}-{taskNo}` だが、`projectId` が UUID（ハイフン含む）のため単純な `split('-')` 後に固定インデックスを参照するのは誤り。

```typescript
// ✅ 正しい実装（末尾要素を取得）
const parts = (selectedTaskId ?? '').split('-');
const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

// ❌ 誤った実装（UUID分割でインデックスがずれる）
const taskNo = parseInt(selectedTaskId.split('-')[2], 10);
```

既存の `handleIssueReport` と同じロジックを使用する。

### `IssueReportFormData.content` → `description` のマッピング

バックエンドAPIは `description` フィールドを要求するが、フロントエンドの `IssueReportFormData` は `content` フィールドを持つ。

```typescript
// ✅ 正しいマッピング
description: issue.content,

// ❌ 誤ったマッピング（フィールド名が存在しない）
description: (issue as any).description,
```

### `methodId` の参照

`ExperimentRecordTab.tsx` では `selectedMethodId` という state 名だったが、
`TransitionList.tsx` では `methodId` という props 名である点に注意。

```typescript
// TransitionList.tsx の場合
methodId: methodId ?? undefined,   // props から直接参照

// ExperimentRecordTab.tsx の場合（参考: No.3）
methodId: selectedMethodId ?? undefined,  // state から参照
```

### 問題報告後の問題一覧再取得

報告後にモーダル内の問題一覧を最新状態にするため、`handleIssueReport` と同様のロジックで再取得する。
ただし再取得失敗は報告自体の成功には影響しないため、サイレントに処理する。

---

## 8. 影響範囲

### 直接修正対象
- `TransitionList.tsx` — `handleSubmitIssue` の修正のみ

### 間接影響
- `IssueManagementModal.tsx` — 変更なし（`onSubmitIssue` コールバックの実装が変わるだけ）

---

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `projectId` が undefined（プロジェクト未選択時） | 中 | 低 | 事前に null/undefined チェックを行い、不足時は早期リターン＋`message.error` |
| `taskNo` 抽出の失敗（形式不一致） | 中 | 低 | `parseInt` 後の `isNaN` チェックを実施し、NaN の場合は `undefined` を渡す |
| バックエンドのバリデーションエラー（400） | 中 | 中 | `message.error('問題の報告に失敗しました')` で統一表示。詳細は `console.error` に出力 |
| 問題一覧再取得の失敗 | 低 | 低 | サイレントエラー処理（報告は成功しているため UI の不整合を最小化） |

---

## 10. テスト計画

### 手動テスト手順

1. 実験作業者画面にログインする
2. プロジェクト・メソッド・タスクを選択する
3. **トランジション一覧タブ** を表示する（`TransitionList` コンポーネントが表示されていることを確認）
4. トランジション行の「報告」ボタンをクリックし、問題管理モーダルを開く
5. 「問題を報告する」フォームに必要事項を入力する
   - タイトル
   - 対象タイプ（トランジション等）
   - 問題タイプ（材料不足等）
   - 内容
6. 「送信」ボタンをクリックする

#### 正常系の確認
- [ ] `POST /api/v1/issues` が呼ばれ、リクエストボディに正しいデータが含まれている（Network タブで確認）
- [ ] 送信成功後に `「問題を報告しました」` の成功メッセージが表示される
- [ ] モーダル内の問題一覧が再取得され、報告した問題が追加されている
- [ ] コンソールに `[DEBUG] createIssue - Success` が出力される

#### 異常系の確認
- [ ] ネットワークエラー時（DevTools でネットワークをオフライン設定）に `「問題の報告に失敗しました」` が表示される
- [ ] バックエンドの 400 エラー時（タイトルを空にするなど）にエラーメッセージが表示される

---

## 11. 承認記録

- **計画書提示日時**: 2026-02-25 13:41
- **承認日時**: 2026-02-25 14:05
- **承認者コメント**: タスク計画書に沿って実装を開始してください。

---

## 12. 実施記録

### 実施日時
- 開始: 2026-02-25 14:05
- 完了: 2026-02-25 14:07

### 変更点サマリー

#### 修正ファイル（1ファイル）

**`frontend/src/components/ExperimentWorker/TransitionList.tsx`**
- `import` 文に `createIssue` を追加（`getIssues, createIssue` に変更）
- `handleSubmitIssue` を同期関数 → `async` 関数に変更
  - `selectedTaskId` 末尾要素から `taskNo` を抽出（既存 `handleIssueReport` と同じロジック）
  - `projectId` の null/undefined チェック（未設定時は早期リターン＋エラーメッセージ）
  - `createIssue()` を呼び出し `POST /api/v1/issues` にリクエスト送信
  - 送信成功後に `message.success('問題を報告しました')` を表示
  - 送信後に `getIssues()` で問題一覧を再取得してモーダル表示を更新
  - 再取得失敗はサイレント処理
  - 送信失敗時に `message.error('問題の報告に失敗しました')` を表示
- `issueApiService.ts` は No.3 で実装済みのため変更なし

### TypeScript ビルド確認
- `TransitionList.tsx` および `issueApiService.ts` に起因するエラーなし
- 既存の他ファイル（demo/、BulkUploadDialog 等）のエラーは本タスク対象外

### 最終的な成果物
- [x] `handleSubmitIssue` が `POST /api/v1/issues` を呼び出すように修正された
- [x] 送信成功時に成功メッセージを表示し、問題一覧を再取得する
- [x] 送信失敗時にエラーメッセージを表示する
- [x] TypeScript ビルドエラーなし（本タスク起因のエラーなし）
