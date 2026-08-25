# タスク計画書: ProgressOverviewTab 修正（スキップUI削除・問題件数修正・NG理由API連携・開始確認ダイアログ実装）

## メタデータ
- **作成日時**: 2026-07-03 15:26
- **更新日時**: 2026-07-03 16:21（スコープ追加: 開始ボタン確認ダイアログ・スキップUI方針変更）
- **タスクID**: ProgressOverviewTab修正
- **優先度**: 高
- **推定工数**: 6〜8時間

---

## 1. タスク概要

`ProgressOverviewTab.tsx` および呼び出し元 `ExperimentWorkerMenu.tsx` に存在する以下4点の修正を行う。

1. **旧スキップUI削除**: バックエンド永続化のない旧スキップ機能（isSkipped関連UI）を全削除
2. **問題件数集計キー修正**: `transitionId` 単独キーから `${taskNo}-${transitionId}` に変更し、タスク単位で正確な件数を表示
3. **NG理由モーダルのAPI連携**: ハードコードされた固定文言を廃止し、実APIからNGタスク一覧を取得して表示
4. **【新規】開始ボタン押下時の確認ダイアログ＋ステータス切替**: 作業中のトランジションが存在する場合に確認を求め、「作業中→未着手」「開始対象→作業中」のステータス更新APIを呼び出す

---

## 2. 目的と期待される成果

### 目的
- 実用上意味のない旧スキップUI（永続化なし）を除去してUIをシンプルにする
- 問題件数バッジを正確なタスク単位の件数に修正する
- NG理由モーダルを実データを表示できる状態にする
- 「開始」ボタン押下時に適切な確認ダイアログを表示し、ステータスをAPI経由で更新する

### 期待される成果
- [x] 旧スキップ関連UI・コードが完全に除去されている
- [x] 問題件数が `taskNo` 単位で正確に集計されている
- [x] NG理由モーダルに実APIからのNGタスク一覧が表示される
- [x] 「開始」ボタン押下時の確認ダイアログが表示され、ステータスがAPI経由で更新される
- [x] TypeScriptのビルドエラーがない

---

## 3. 実装ステップ

### Phase 1: スキップUI削除

#### Step 1-1: `frontend/src/types/progress.ts` の修正
- [ ] `ProgressRow` インターフェースから `isSkipped?: boolean` フィールドを削除
- [ ] `ProgressOverviewTabProps` から `onTransitionSkipped?: (transitionId: string) => void` を削除（存在する場合）

#### Step 1-2: `ProgressOverviewTab.tsx` の修正
- [ ] フィルタバーの「スキップのみ表示」チェックボックス/セレクトを削除
- [ ] テーブル行のスキップタグ（`isSkipped` 参照）を削除
- [ ] サマリーカードの「スキップ件数」カードを削除
- [ ] `isSkipped` を参照しているすべての箇所を削除

#### Step 1-3: `ExperimentWorkerMenu.tsx` の修正
- [ ] `skippedTransitionIds` state（`useState<string[]>([])` ）を削除
- [ ] `handleTransitionSkipped(transitionId)` 関数を削除
- [ ] `handleTransitionResumed(transitionId)` 関数を削除（またはタブ切替のみに縮小）
- [ ] `ProgressOverviewTab` への `onTransitionSkipped` prop 渡しを削除
- [ ] `ProgressRow` 生成時の `isSkipped` フィールド設定を削除
- [ ] `onGoToWork` / `onStartWork` 内の `handleTransitionResumed` 呼び出しを削除

---

### Phase 2: 問題件数集計キーの修正

#### Step 2-1: `ExperimentWorkerMenu.tsx` の修正
- [ ] issue集計ロジック（L346-351付近）のキーを変更

```typescript
// 変更前
const newIssueCountMap: Record<string, number> = {};
for (const issue of issues) {
  if (issue.transitionId) {
    newIssueCountMap[issue.transitionId] = (newIssueCountMap[issue.transitionId] ?? 0) + 1;
  }
}

// 変更後
const newIssueCountMap: Record<string, number> = {};
for (const issue of issues) {
  if (issue.transitionId) {
    const key = `${issue.taskNo ?? ''}-${issue.transitionId}`;
    newIssueCountMap[key] = (newIssueCountMap[key] ?? 0) + 1;
  }
}
```

- [ ] `ProgressRow.issueCount` へのマージ箇所も対応するキーに変更

```typescript
// 変更前
issueCount: issueCountMap[tr.transitionId] ?? 0,

// 変更後
issueCount: issueCountMap[`${task.task_no}-${tr.transitionId}`] ?? 0,
```

---

### Phase 3: NG理由モーダルのAPI連携

#### Step 3-1: バックエンドAPIの確認・追加

- [ ] 既存エンドポイントでNGタスク一覧が取得可能か確認
  - `GET /api/v1/progress/projects/:projectId/work-details` （実験管理者権限：040000）
  - 実験作業者（050000）権限で使用不可のため、別途エンドポイントが必要

- [ ] 実験作業者向けNGタスク一覧エンドポイントを追加（必要な場合）
  - エンドポイント案: `GET /api/v1/progress/projects/:projectId/ng-tasks`
  - 権限: `050000`（実験作業者メニュー、読取専用）
  - レスポンス: `{ ngTasks: NgTaskItem[] }`

```typescript
// NgTaskItem の型定義案
interface NgTaskItem {
  taskNo: number;
  methodId: string;
  methodName?: string;
  reviewResult: string;    // NG理由
  reviewedAt: string;      // 確認日時
  reviewUserId?: string;   // 確認者ID
}
```

#### Step 3-2: バックエンド実装（エンドポイント追加が必要な場合）

- [ ] `progressRoutes.ts` にルート追加
- [ ] `progressController.ts` にハンドラ追加
- [ ] `progressService.ts` または `projectTaskDetailRepository.ts` にNGタスク取得ロジック追加

```typescript
// SQL: task_status=6（NG）のタスクを取得
SELECT
  ptd.task_no,
  ptd.method_id,
  ptd.review_result,
  ptd.reviewed_at,
  ptd.review_user_id
FROM project_task_detail ptd
WHERE ptd.organization_id = $1
  AND ptd.project_id = $2
  AND ptd.task_status = 6
ORDER BY ptd.task_no ASC, ptd.method_id ASC
```

#### Step 3-3: フロントエンド型定義・APIサービスの追加

- [ ] `frontend/src/types/experimentWorker.ts` または `progress.ts` に `NgTaskItem` 型を追加
- [ ] `frontend/src/services/projectApiService.ts` または適切なサービスファイルに `getNgTasks(projectId)` 関数を追加

#### Step 3-4: `ExperimentWorkerMenu.tsx` の修正

- [ ] `ngModalVisible` state に加え `ngTasks` state（`NgTaskItem[]`）と `ngTasksLoading` state を追加
- [ ] `handleNgModalOpen()` 関数でAPIを呼び出してNGタスク一覧を取得
- [ ] モーダルの `onOk`/`open` を `ngModalVisible` に接続し、`handleNgModalOpen` を呼び出すよう修正

```typescript
const handleNgModalOpen = async () => {
  if (!selectedProjectId) return;
  setNgModalVisible(true);
  setNgTasksLoading(true);
  try {
    const result = await getNgTasks(selectedProjectId);
    setNgTasks(result.ngTasks);
  } catch (e) {
    // エラー時は空リスト
    setNgTasks([]);
  } finally {
    setNgTasksLoading(false);
  }
};
```

#### Step 3-5: NG理由モーダルUIの修正

- [ ] 固定文言（`タスク＃1の定性評価結果が正しくありません。`）を削除
- [ ] `ngTasks` の内容を一覧表示するUIに差し替え

```tsx
// モーダル本文
<Spin spinning={ngTasksLoading}>
  {ngTasks.length === 0 ? (
    <Text type="secondary">NGのタスクはありません。</Text>
  ) : (
    <Table
      size="small"
      dataSource={ngTasks}
      rowKey={(r) => `${r.taskNo}-${r.methodId}`}
      pagination={false}
      columns={[
        { title: 'タスクNo', dataIndex: 'taskNo', width: 80 },
        { title: 'メソッドID', dataIndex: 'methodId', ellipsis: true },
        { title: 'NG理由', dataIndex: 'reviewResult', ellipsis: true },
        { title: '確認日時', dataIndex: 'reviewedAt', width: 140 },
      ]}
    />
  )}
</Spin>
```

### Phase 4: 開始ボタン押下時の確認ダイアログ＋ステータス切替（新規実装）

#### Step 4-1: バックエンド `ALLOWED_TRANSITIONS` の修正

- [ ] `backend/src/services/progressService.ts` の `ALLOWED_TRANSITIONS` に `IN_PROGRESS → INITIAL` を追加

```typescript
// 変更前
[TransitionStatusEnum.IN_PROGRESS]: [
  TransitionStatusEnum.IN_PROGRESS,
  TransitionStatusEnum.PAUSED,
  TransitionStatusEnum.COMPLETED,
  TransitionStatusEnum.ERROR,
],

// 変更後
[TransitionStatusEnum.IN_PROGRESS]: [
  TransitionStatusEnum.IN_PROGRESS,
  TransitionStatusEnum.PAUSED,
  TransitionStatusEnum.COMPLETED,
  TransitionStatusEnum.ERROR,
  TransitionStatusEnum.INITIAL,  // 追加: 作業中→未着手（別トランジション開始時の中断）
],
```

#### Step 4-2: `ExperimentWorkerMenu.tsx` の修正

- [ ] 確認ダイアログ用 state を追加（`startConfirmVisible`, `startConfirmTarget`, `startConfirmCurrent`）
- [ ] `handleStartWork(taskNo, transitionId, methodId)` 関数を実装

```typescript
const handleStartWork = async (taskNo: number, transitionId: string, methodId: string) => {
  // 現在作業中のトランジションを progressRows から探す
  const inProgressRow = progressRows.find(r => r.status === 'in_progress');
  
  if (inProgressRow) {
    // 確認ダイアログを表示
    setStartConfirmCurrent(inProgressRow);
    setStartConfirmTarget({ taskNo, transitionId, methodId });
    setStartConfirmVisible(true);
  } else {
    // 作業中なし → 直接開始
    await doStartTransition(taskNo, transitionId, methodId);
  }
};

const doStartTransition = async (taskNo: number, transitionId: string, methodId: string) => {
  if (!selectedProjectId) return;
  try {
    // 開始対象を作業中（IN_PROGRESS）に更新
    await updateTransitionStatus(selectedProjectId, methodId, transitionId, {
      taskNo,
      status: 'running',
      progressRate: 0,
    });
    // データ再取得
    await reloadProgressData();
    // 作業記録タブへ遷移
    handleTabChange('3');
  } catch (e) {
    // エラー処理
  }
};

const handleStartConfirmOk = async () => {
  if (!selectedProjectId || !startConfirmTarget || !startConfirmCurrent) return;
  try {
    // 1. 現在作業中のトランジションを未着手（INITIAL）に戻す
    await updateTransitionStatus(
      selectedProjectId,
      startConfirmCurrent.methodId,
      startConfirmCurrent.transitionId,
      { taskNo: startConfirmCurrent.taskNo, status: 'initial', progressRate: 0 }
    );
    // 2. 開始対象を作業中に更新
    await doStartTransition(
      startConfirmTarget.taskNo,
      startConfirmTarget.transitionId,
      startConfirmTarget.methodId,
    );
  } finally {
    setStartConfirmVisible(false);
    setStartConfirmTarget(null);
    setStartConfirmCurrent(null);
  }
};
```

#### Step 4-3: `ProgressOverviewTab.tsx` に `onStartWork` props 経由で `methodId` を渡す

- [ ] `ProgressOverviewTabProps.onStartWork` の型を `(taskNo: number, transitionId: string, methodId: string) => void` に拡張する（`methodId` を追加）
- [ ] テーブル行の「開始」ボタンの `onClick` で `r.methodId` を渡すよう修正

#### Step 4-4: 確認ダイアログのUI追加

- [ ] `ExperimentWorkerMenu.tsx` に確認ダイアログを追加

```tsx
<Modal
  title="作業の切り替え確認"
  open={startConfirmVisible}
  onOk={handleStartConfirmOk}
  onCancel={() => setStartConfirmVisible(false)}
  okText="切り替える"
  cancelText="キャンセル"
>
  <p>
    現在、<strong>「{startConfirmCurrent?.transitionName}」</strong>（タスク#{startConfirmCurrent?.taskNo}）が作業中です。
  </p>
  <p>
    この作業を中断して<strong>「{startConfirmTarget?.transitionName}」</strong>（タスク#{startConfirmTarget?.taskNo}）を開始しますか？
  </p>
  <p style={{ color: '#ff4d4f', fontSize: 12 }}>
    ※中断した作業はステータスが「未着手」に戻ります。
  </p>
</Modal>
```

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/progress.ts` - `ProgressRow.isSkipped` 削除
2. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` - スキップUI削除・`onStartWork` の `methodId` 追加
3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - スキップ関連削除・問題件数キー修正・NGモーダルAPI接続・開始確認ダイアログ実装
4. `frontend/src/services/projectApiService.ts`（または該当サービス） - `getNgTasks()` 追加
5. `backend/src/services/progressService.ts` - `ALLOWED_TRANSITIONS` に `IN_PROGRESS → INITIAL` を追加

### 新規作成するファイル（バックエンドAPI追加が必要な場合）
- バックエンドSQLファイル（`backend/src/sql/queries/project_task_detail/findNgByProject.sql` など）

### 修正するファイル（バックエンドAPI追加が必要な場合）
1. `backend/src/routes/progressRoutes.ts` - NGタスク一覧ルート追加
2. `backend/src/controllers/progressController.ts` - ハンドラ追加
3. `backend/src/services/progressService.ts`（またはrepository） - NG取得ロジック追加

### 影響を受ける機能
- 全体進捗タブのUI（スキップ関連UIが消える）
- 問題件数バッジの数値（より正確になる）
- NG理由モーダル（実データ表示になる）
- 「開始」ボタン押下時の動作（確認ダイアログ＋API更新に変更）

---

## 5. 技術的詳細

### task_status の値
```
0: not_started（未着手）
1: in_progress（作業中）
2: review_waiting（レビュー待ち）
3: completed（完了）
4: forced_terminated（異常終了）
5: approved（承認済）
6: ng（NG）
```

NG = `task_status = 6`、`review_result` カラムにNG理由が格納される（マイグレーション `20260618_005` で追加済み）。

### 既存のrepository関数（利用可能）
- `projectTaskDetailRepository.approveTask()` - タスク承認（task_status=5）
- `projectTaskDetailRepository.recordNg()` - NG記録（task_status=6）
- `projectTaskDetailRepository.findByProject()` - プロジェクト全タスク取得（SELECT *）

`findByProject()` はすでにあるため、バックエンドAPIはここからNG（task_status=6）を絞り込むだけでよい。

---

## 6. セキュリティ考慮事項
- [ ] バックエンドAPIに `organization_id` フィルタが含まれているか確認（マルチテナント分離）
- [ ] 権限チェック `checkPermission('050000', 0)` が適用されているか確認

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| スキップUI削除でProgressRow型が変わり他コンポーネントで型エラー | 中 | 中 | TypeScriptビルドで全エラーを確認してから修正 |
| NGタスク専用APIが必要になり工数増加 | 中 | 中 | `findByProject` の結果をフィルタすることでService層のみで対応可能（ルート追加は必要） |
| 問題件数キー変更で既存ロジックに抜け漏れ | 低 | 低 | `issueCountMap` のキー参照箇所をすべて検索して対応 |

---

## 8. テスト計画

### 手動テスト
- [ ] 全体進捗タブにスキップ関連UIが表示されないことを確認
- [ ] フィルタバーにスキップフィルタが表示されないことを確認
- [ ] サマリーカードにスキップ件数が表示されないことを確認
- [ ] 問題件数バッジが各タスク行に正しく表示されること（同一transitionIdで複数タスクがある場合に合算されないこと）
- [ ] NG理由ボタンクリック時にモーダルが開き、NGタスク一覧が表示されること
- [ ] NGタスクがない場合「NGのタスクはありません」と表示されること
- [ ] 「開始」ボタン押下時、作業中のトランジションがある場合に確認ダイアログが表示されること
- [ ] 「開始」ボタン押下時、作業中のトランジションがない場合は確認ダイアログが表示されずに直接開始されること
- [ ] 確認ダイアログで「切り替える」を押すと、作業中のトランジションが未着手に戻り、対象が作業中になること
- [ ] 確認ダイアログで「キャンセル」を押すと状態変化がないこと
- [ ] バックエンド: `IN_PROGRESS → INITIAL` の遷移がAPIエラーにならないこと
- [ ] TypeScriptビルドエラーがないこと (`npm run build`)

---

## 9. 承認記録

- **計画書提示日時**: 2026-07-03 16:21（更新版）
- **承認日時**: 
- **承認者コメント**:

---

## 10. 実施記録

### 実施日時
開始: 2026-07-03 15:00  
完了: 2026-07-03 16:31

### 実施内容

#### Phase 1: スキップUI削除（完了）
- `frontend/src/types/progress.ts` — `ProgressRow.isSkipped` フィールド削除・`onStartWork` 型を3引数（`methodId` 追加）に変更
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — `FastForwardOutlined` import削除、スキップタグ・スキップフィルタ・スキップ件数カード・`rowClassName` 削除、`onStartWork` に `methodId` を渡すよう修正
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `skippedTransitionIds` state・`handleTransitionResumed` 関数・スキップ状態 useEffect をすべて削除

#### Phase 2: 問題件数集計キーの修正（完了）
- `ExperimentWorkerMenu.tsx` — `issueCountMap` のキーを `transitionId` 単独から `${taskNo}-${transitionId}` に変更

#### Phase 3: NG理由モーダルAPI連携（完了）
- `backend/src/routes/progressRoutes.ts` に `GET /projects/:projectId/ng-tasks` ルート追加（権限: 050000/読取専用）
- `backend/src/controllers/progressController.ts` に `getNgTasks` ハンドラ追加（`findByProject` からtask_status=6を絞り込み）
- `frontend/src/services/projectApiService.ts` に `getNgTasks` 関数・`NgTaskItem` 型を追加
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx` のNG理由ボタンをAPI接続に変更（`ngTasks`・`ngTasksLoading` state追加）
- モーダル内容をタスク別カード一覧UIに変更（ハードコード文言を廃止）

#### Phase 4: 開始確認ダイアログ＋ステータスAPI切替実装（完了・完全版）
- `backend/src/services/progressService.ts` の `ALLOWED_TRANSITIONS` に `IN_PROGRESS → INITIAL(0)` を追加（別タスクで実施済み）
- `ExperimentWorkerMenu.tsx` の `handleStartWork` を API呼び出し付き完全版に更新：
  - 作業中なし → `status:3(running)` に更新 → 作業記録タブへ遷移
  - 作業中あり → 確認ダイアログ → 既存を `status:0(initial)` に戻し → 対象を `status:3(running)` に更新
- `reloadProgressRows(projectId)` 関数を追加（API更新後の進捗データ再取得）
- `updateTransitionStatus` を import に追加

#### TS型修正（完了）
- `frontend/src/types/experimentWorker.ts` — `Issue` インターフェースに `taskNo?: number` を追加
- `frontend/src/services/issueApiService.ts` — `mapToIssue` に `taskNo: data.taskNo` マッピングを追加

#### ビルド確認（完了）
- `npx tsc --noEmit` → exit:0（エラーなし）

### 最終的な成果物
- [x] 旧スキップUI削除完了
- [x] 問題件数集計キー修正完了
- [x] NG理由モーダルAPI連携完了（`GET /progress/projects/:projectId/ng-tasks` 新規追加）
- [x] 開始確認ダイアログ＋ステータスAPI切替実装完了（完全版）
- [x] バックエンド `ALLOWED_TRANSITIONS` に `IN_PROGRESS → INITIAL(0)` 追加完了
- [x] TypeScriptビルドエラーなし確認（`npx tsc --noEmit` → EXIT:0）
