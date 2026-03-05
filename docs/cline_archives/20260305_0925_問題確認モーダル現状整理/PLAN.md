# タスク計画書: 問題確認モーダル リファクタリング

## メタデータ
- **作成日時**: 2026-03-05 09:41
- **タスクID**: issue-modal-refactor
- **優先度**: 中
- **推定工数**: 4時間

## タスク概要

`IssueManagementModal` の API 処理を親コンポーネントから切り離し、モーダル自身が問題一覧の取得・新規報告・コメント送信・ステータス変更を内部で行うよう変更する。

あわせてバックエンドの問題一覧取得 API（`GET /api/v1/issues`）の `methodId`・`taskNo`・`transitionId` をオプション化し、プロジェクト全体の問題一覧を取得できるようにする。

---

## 目的と期待される成果

- [ ] `IssueManagementModal` に渡すだけで、呼び出し元がAPIを知らなくてよい設計に変更する
- [ ] `ProjectManagement` の「問題確認」でプロジェクト全体の問題が表示される
- [ ] `ProgressCheckTab` の「問題報告」「問題確認」が実際のAPIと接続される
- [ ] `ExperimentRecordTab` の「解決/未解決」ボタンが機能するようになる
- [ ] コールバックを await しないことによる誤った成功メッセージ表示を修正する

---

## 実装ステップ

### Phase 1: バックエンド — 問題一覧取得 API のパラメータ緩和

- [ ] **`backend/src/types/issue.ts`**: `IssueListFilters` の `methodId`・`taskNo`・`transitionId` をオプションに変更
  ```ts
  // 変更前
  methodId: string;
  taskNo: number;
  transitionId: string;

  // 変更後
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  ```

- [ ] **`backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql`**: SQL の WHERE 句を動的フィルタ方式に変更
  ```sql
  -- 変更前（methodId/taskNo/transitionId が常にプレースホルダ）
  AND i.method_id = $3
  AND (
    (i.issue_target = 1) OR
    (i.issue_target = 2 AND i.task_no = $4) OR
    (i.issue_target = 3 AND i.transition_id = $5)
  )

  -- 変更後（methodId がある場合のみ AND 条件追加）
  -- TypeScript 側の動的クエリ構築で WHERE 句に追記する方式に変更
  ```

- [ ] **`backend/src/repositories/issueRepository.ts`**: `listIssuesWithComments` で動的クエリ構築に変更
  - `filters.methodId` がある場合のみ `AND i.method_id = $N` を追加
  - `filters.taskNo` または `filters.transitionId` がある場合のみ対象タイプの条件を追加
  - いずれも省略時はプロジェクト全件を返す

- [ ] **`backend/src/controllers/issueController.ts`**: `GET /api/v1/issues` のバリデーションで `methodId`・`taskNo`・`transitionId` を任意に変更

### Phase 2: フロントエンド — `issueApiService.ts` のパラメータ緩和

- [ ] **`frontend/src/services/issueApiService.ts`**: `GetIssuesParams` の `methodId`・`taskNo`・`transitionId` をオプションに変更
  ```ts
  // 変更前
  methodId: string;
  taskNo: number;
  transitionId: string;

  // 変更後
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  ```

### Phase 3: フロントエンド — `IssueManagementModal` のリファクタリング

- [ ] **Props 変更**: APIコールに必要なパラメータを Props として受け取り、`issues` / `onSubmitIssue` / `onSubmitComment` / `onUpdateStatus` を削除
  ```ts
  // 変更後のProps
  interface IssueManagementModalProps {
    visible: boolean;
    targetName: string;       // タイトルに表示する名前（旧 transitionName）
    projectId: string;        // getIssues / createIssue に必要
    projectName: string;      // addComment / updateIssueStatus に必要
    methodId?: string;        // オプション（省略時はプロジェクト全件）
    taskNo?: number;          // オプション
    transitionId?: string;    // オプション
    viewMode?: boolean;       // 参照専用モード
    projectStatus?: ProjectStatus | null;
    onClose: () => void;
  }
  ```

- [ ] **内部実装変更**:
  - マウント時（`visible` が `true` になった時）に `getIssues()` を呼び出して `issues` を内部 state に保持
  - `handleSubmitNewIssue`: `createIssue()` を await で呼び出し → 成功後に `getIssues()` で再取得
  - `handleCommentSubmit`: `addComment()` を await で呼び出し → 成功後に `getIssues()` で再取得
  - `handleSetResolved` / `handleSetUnresolved`: `addComment()` + `updateIssueStatus()` を await → 成功後に再取得
  - エラー時は `message.error()` を表示（現状は成功のみ表示）

- [ ] **タイトル表示を `viewMode` に応じて変更**
  ```tsx
  // viewMode=true の場合は「問題確認」、false は「問題報告」
  title={viewMode ? `問題確認 - ${targetName}` : `問題報告 - ${targetName}`}
  ```

### Phase 4: フロントエンド — 各呼び出し元の修正

- [ ] **`ProjectManagement.tsx`**:
  - `mockIssues` / `onSubmitIssue` 等のコールバック定義を削除
  - `viewMode={true}` 固定 → プロジェクト完了時（`status === 4`）のみ `true` に変更
  - Props を新しい形式に変更
  ```tsx
  <IssueManagementModal
    visible={issueManagementModalOpen}
    targetName={selectedProject.name}
    projectId={selectedProject.id}
    projectName={selectedProject.name}
    // methodId / taskNo / transitionId は省略（全件取得）
    viewMode={selectedProject.status === 4}  // 完了時のみ閲覧専用
    onClose={handleCloseIssueManagement}
  />
  ```

- [ ] **`ProgressCheckTab.tsx`**:
  - `IssueReportModal` を削除（`IssueManagementModal` に統一）
  - `mockIssues` / コールバック定義を削除
  - 問題報告（`action: 'issue'`）: `viewMode=false` で開く
  - 問題確認（`action: 'issueCheck'`）: `viewMode=true` で開く
  - `taskNo` は `task.taskNo` から取得（`parseInt` 変換）
  ```tsx
  <IssueManagementModal
    visible={issueModalVisible}
    targetName={selectedTask.taskName}
    projectId={selectedTask.projectId}
    projectName={selectedProjectName}
    methodId={selectedTask.methodId}
    taskNo={parseInt(selectedTask.taskNo, 10)}
    // transitionId は省略（タスク単位）
    viewMode={isCheckMode}
    onClose={handleCloseIssueModal}
  />
  ```

- [ ] **`ExperimentRecordTab.tsx`**:
  - `issues` state / `issueLoading` state / `handleIssueClick` の getIssues 呼び出しを削除
  - `handleSubmitIssue` / `handleSubmitComment` のコールバック定義を削除
  - `onUpdateStatus` を追加（`handleUpdateStatus` を新規定義）
  - Props を新しい形式に変更
  ```tsx
  <IssueManagementModal
    visible={issueModalOpen}
    targetName={selectedTransition.transitionName}
    projectId={selectedProject}
    projectName={selectedProjectName}
    methodId={selectedMethodId}
    taskNo={taskNo}
    transitionId={selectedTransition.transitionId}
    projectStatus={projectStatus}
    onClose={handleIssueModalClose}
  />
  ```

- [ ] **`TransitionList.tsx`**:
  - `issues` state / `issueLoading` state / `handleIssueReport` の getIssues 呼び出しを削除
  - `handleSubmitIssue` / `handleSubmitComment` / `handleUpdateStatus` のコールバック定義を削除
  - Props を新しい形式に変更
  ```tsx
  <IssueManagementModal
    visible={issueModalOpen}
    targetName={selectedTransition.transitionName}
    projectId={projectId}
    projectName={projectName}
    methodId={methodId}
    taskNo={taskNo}
    transitionId={selectedTransition.transitionId}
    projectStatus={projectStatus}
    onClose={handleIssueModalClose}
  />
  ```

---

## 変更ファイル

### バックエンド
1. `backend/src/types/issue.ts` — `IssueListFilters` のオプション化
2. `backend/src/sql/queries/issues/listIssuesWithCommentsIssues.sql` — WHERE 句を動的構築に対応
3. `backend/src/repositories/issueRepository.ts` — 動的クエリ構築ロジック変更
4. `backend/src/controllers/issueController.ts` — バリデーション変更

### フロントエンド
5. `frontend/src/services/issueApiService.ts` — `GetIssuesParams` のオプション化
6. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` — 大幅変更（API内包）
7. `frontend/src/components/project/ProjectManagement.tsx` — Props 変更
8. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` — Props 変更・IssueReportModal 廃止
9. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` — Props 変更
10. `frontend/src/components/ExperimentWorker/TransitionList.tsx` — Props 変更

---

## リスク

| リスク | 対策 |
|--------|------|
| SQL変更により既存の問題一覧取得が壊れる | `methodId` がある場合の動作は既存と同一になるよう動的クエリを設計 |
| `IssueManagementModal` の大幅変更による既存動作への影響 | 変更後の Props を4箇所すべてで確認しビルドエラーがないことを確認する |
| `taskNo` の型変換（string → number）でエラーが出る | `parseInt` の結果が `NaN` の場合は undefined を渡すよう防御実装 |

## テスト計画

- [ ] `ProjectManagement` の「問題確認」ボタン押下 → 問題一覧が表示される
- [ ] `ProgressCheckTab` の「issue」アクション → 問題報告フォームが表示され報告できる
- [ ] `ProgressCheckTab` の「issueCheck」アクション → 問題一覧が参照専用で表示される
- [ ] `ExperimentRecordTab` のフロー図「問題」ボタン → 問題一覧・報告・コメント・解決が動作する
- [ ] `TransitionList` の「報告」ボタン → 問題一覧・報告・コメント・解決が動作する
- [ ] API失敗時に `message.error` が表示される

## 承認記録
- **計画書提示日時**: 2026-03-05 09:41
- **承認日時**: （承認時に記入）
