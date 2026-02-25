# タスク計画書: TransitionList - handleIssueReport API化（No.2）

## メタデータ
- **作成日時**: 2026-02-25 13:24
- **タスクID**: transition-list-issue-api-no2
- **優先度**: 高
- **推定工数**: 0.5時間
- **対象ファイル**: `frontend/src/components/ExperimentWorker/TransitionList.tsx`

---

## 1. タスク概要

`mock_investigation.md` の「4. まとめ：修正が必要な箇所」No.2 の対応。

`TransitionList.tsx` の `handleIssueReport` で使用しているモック関数
`getIssuesByTransitionId`（`@/data/projectsData` 由来）を、
実装済みバックエンドAPI `GET /api/v1/issues` の呼び出しに置き換える。

No.1（`ExperimentRecordTab.tsx` の `handleIssueClick` API化）で作成済みの
`issueApiService.ts`（`getIssues` 関数）をそのまま再利用する。

---

## 2. 目的と期待される成果

### 目的
- `TransitionList.tsx` のモックデータへの依存を解消し、実際のDBから問題一覧を取得する
- `ExperimentRecordTab.tsx`（No.1対応済み）と同じ API 呼び出しロジックに統一する
- `@/data/projectsData` への import を `TransitionList.tsx` から完全に除去する

### 期待される成果
- [ ] `handleIssueReport` でモック関数 `getIssuesByTransitionId` を使用しなくなる
- [ ] 「報告」ボタンをクリックすると `GET /api/v1/issues` が呼ばれ、DBの問題一覧が取得される
- [ ] API呼び出し中はローディング状態（`issueLoading`）が適切に管理される
- [ ] 取得失敗時はエラーメッセージ（`message.error`）を表示する
- [ ] `projectsData` からの `getIssuesByTransitionId` import が `TransitionList.tsx` から削除される
- [ ] TypeScript ビルドエラーが発生しない

---

## 3. 現状の実装

### 現在の `handleIssueReport`（モック版）

```typescript
// frontend/src/components/ExperimentWorker/TransitionList.tsx

import { getIssuesByTransitionId } from '@/data/projectsData';  // ← モック

const handleIssueReport = (transition: Transition) => {
  setSelectedTransition(transition);
  // トランジションIDに関連する問題を取得
  const transitionIssues = getIssuesByTransitionId(transition.transitionId);  // ← モック呼び出し
  setIssues(transitionIssues);
  setIssueModalOpen(true);
};
```

### コンポーネントの props（確認済み）

```typescript
interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;   // taskNo 抽出に使用（No.1 と同じ形式）
  projectStatus: ProjectStatus | null;
  onTaskCreated?: (taskId: string) => void;
  projectId?: string;        // API呼び出しに使用
  methodId?: string;         // API呼び出しに使用
}
```

### 使用する API（実装済み）

**エンドポイント**: `GET /api/v1/issues`

**クエリパラメータ**:

| パラメータ | 型 | 説明 | 取得元（コンポーネント内） |
|-----------|----|----|------|
| `projectId` | UUID | プロジェクトID | `projectId` props |
| `methodId` | string | メソッドID | `methodId` props |
| `taskNo` | integer | タスク連番 | `selectedTaskId` props から末尾要素を抽出 |
| `transitionId` | string | トランジションID | `transition.transitionId` |

### 使用する APIサービス関数（No.1 で作成済み）

`frontend/src/services/issueApiService.ts` の `getIssues()` をそのまま再利用する。
新規ファイルの作成は不要。

```typescript
// 既存の issueApiService.ts（抜粋）
export async function getIssues(params: GetIssuesParams): Promise<Issue[]>
```

---

## 4. 実装ステップ

### Phase 1: TransitionList.tsx の修正

- [ ] `getIssuesByTransitionId` の import を削除する

  ```typescript
  // 削除対象:
  import { getIssuesByTransitionId } from '@/data/projectsData';
  ```

- [ ] `getIssues` の import を追加する（`issueApiService.ts` から）

  ```typescript
  // 追加:
  import { getIssues } from '@/services/issueApiService';
  ```

- [ ] `issueLoading` state を追加する

  ```typescript
  const [issueLoading, setIssueLoading] = useState<boolean>(false);
  ```

- [ ] `handleIssueReport` を非同期関数（`async`）に変更し、API呼び出しに置き換える
  - `getIssuesByTransitionId` の呼び出しを削除
  - `getIssues` API呼び出しに置き換え
  - `selectedTaskId` props から `taskNo` を抽出するロジックを実装
    （形式: `{projectId}-{methodId}-{taskNo}` → 末尾要素が `taskNo`）
  - API呼び出し中は `issueLoading` を `true` に設定
  - エラー時は `message.error` を表示

---

## 5. 変更ファイル

### 新規作成
なし（`issueApiService.ts` は No.1 で作成済み）

### 修正
1. `frontend/src/components/ExperimentWorker/TransitionList.tsx`
   - `getIssuesByTransitionId` import を削除
   - `getIssues` import を追加（`@/services/issueApiService` から）
   - `issueLoading` state を追加
   - `handleIssueReport` を非同期化し API 呼び出しに変更

### 変更なし（参考）
- `frontend/src/services/issueApiService.ts` — No.1 で作成済み。変更不要
- `frontend/src/types/experimentWorker.ts` — 型定義はそのまま使用
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` — 変更不要
- `frontend/src/data/projectsData.ts` — 本タスク完了後も他の箇所で使用中のため削除しない

---

## 6. 実装詳細

### TransitionList.tsx の修正イメージ

```typescript
// import の変更
// 削除:
// import { getIssuesByTransitionId } from '@/data/projectsData';
// 追加:
import { getIssues } from '@/services/issueApiService';

// state 追加（既存の issues state の直下に追記）
const [issueLoading, setIssueLoading] = useState<boolean>(false);

// handleIssueReport を非同期化
const handleIssueReport = async (transition: Transition) => {
  setSelectedTransition(transition);
  setIssues([]);
  setIssueModalOpen(true);

  // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
  // projectId は UUID（ハイフン含む）のため split('-') の末尾要素を取得する
  const parts = (selectedTaskId ?? '').split('-');
  const taskNo = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;

  if (!projectId || !methodId || !selectedTaskId || isNaN(taskNo)) {
    console.warn('[handleIssueReport] 必要なパラメータが不足しています', {
      projectId, methodId, selectedTaskId, taskNo,
    });
    return;
  }

  setIssueLoading(true);
  try {
    const fetchedIssues = await getIssues({
      projectId,
      methodId,
      taskNo,
      transitionId: transition.transitionId,
    });
    setIssues(fetchedIssues);
  } catch (error) {
    console.error('[handleIssueReport] 問題一覧取得エラー', error);
    message.error('問題一覧の取得に失敗しました');
  } finally {
    setIssueLoading(false);
  }
};
```

---

## 7. 影響範囲

### 影響を受けるコンポーネント
- `TransitionList.tsx` — 直接修正対象
- `IssueManagementModal.tsx` — `issues` props の渡し方は変わらないため変更不要

### 影響なし
- `ExperimentRecordTab.tsx` — No.1 対応済み
- `DataRecordDialog.tsx` — No.8〜10 として別タスクで対応
- `projectsData.ts` — `templatesList` が他ファイルで使用中のため本タスクでは削除しない

---

## 8. 前提条件・注意事項

### 前提
- No.1（`ExperimentRecordTab.tsx` の `handleIssueClick` API化）が完了済みであること
  - `frontend/src/services/issueApiService.ts` が作成済みであること
  - `getIssues()` 関数が `issueApiService.ts` に定義済みであること
- バックエンド `GET /api/v1/issues` は実装済み

### No.1 との差異
- `ExperimentRecordTab.tsx` では `selectedMethodId`（state）から `methodId` を取得していたが、
  `TransitionList.tsx` では `methodId` は props として直接渡される
- `ExperimentRecordTab.tsx` では `projectId`（state）から取得していたが、
  `TransitionList.tsx` では `projectId` は props として直接渡される

### `taskNo` 抽出ロジックについて
- `selectedTaskId` props の形式: `{projectId}-{methodId}-{taskNo}`
  - 例: `550e8400-e29b-41d4-a716-446655440000-method_001-1`
  - `projectId` は UUID（ハイフン含む）のため `split('-')` の末尾要素が `taskNo`
- `selectedTaskId` が未指定（`undefined`）の場合は `''` として扱い、`isNaN(taskNo)` でガードする

---

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `selectedTaskId` が `undefined` の場合にクラッシュ | 中 | 低 | `?? ''` でデフォルト値を設定し `isNaN(taskNo)` でガード |
| `projectId` / `methodId` が `undefined`（未選択状態） | 中 | 低 | `!projectId \|\| !methodId` チェックで早期リターン |
| APIレスポンスのフィールド名が設計書と異なる | 低 | 低 | No.1 で同一サービス関数の動作確認済みのため低リスク |

---

## 10. テスト計画

### 手動テスト手順
1. 実験作業者画面にログインする
2. プロジェクトを選択する
3. メソッドとタスクを選択する
4. トランジション一覧（`TransitionList`）の「報告」ボタンをクリックする
5. 以下を確認する:
   - [ ] 問題管理モーダルが開く
   - [ ] モーダルに DB から取得した問題一覧が表示される（件数が正しい）
   - [ ] 問題がない場合は空の状態で表示される
   - [ ] コメントが正しく表示される
   - [ ] モーダルを閉じて再度開いても正常に動作する

### エラーケースの確認
- [ ] ネットワークエラー時に `message.error` が表示される
- [ ] `projectId` が `undefined` の場合にモーダルは開くが問題一覧は空になる（エラーにならない）

---

## 11. 承認記録

- **計画書提示日時**: 2026-02-25 13:24
- **承認日時**: 2026-02-25 13:26
- **承認者コメント**: 計画書に沿って実装を開始してください

---

## 12. 実施記録

### 実施日時
- 開始: 2026-02-25 13:27
- 完了: 2026-02-25 13:30

### 変更点サマリー
- 修正: `frontend/src/components/ExperimentWorker/TransitionList.tsx`
  - `getIssuesByTransitionId` import を削除 → `getIssues` import に変更（`@/services/issueApiService`）
  - モックコメント付きの `issues` state から通常の state へ変更
  - `issueLoading` state を追加
  - props 分割代入に `selectedTaskId` を追加（元々宣言されていたが分割代入から漏れていた）
  - `handleIssueReport` を async に変更・`getIssuesByTransitionId` 呼び出しを `getIssues` API呼び出しに置き換え

### 最終的な成果物
- [x] `handleIssueReport` でモック関数 `getIssuesByTransitionId` を使用しなくなった
- [x] 「報告」ボタンをクリックすると `GET /api/v1/issues` が呼ばれる
- [x] 取得失敗時は `message.error` でエラーメッセージを表示
- [x] `projectsData` からの `getIssuesByTransitionId` import が `TransitionList.tsx` から削除された
- [x] TypeScript ビルドエラーなし（`tsc --noEmit` でエラー出力なし）
