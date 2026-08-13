# ProgressOverviewTab 機能調査レポート

> **作成日時**: 2026-07-03 14:41  
> **調査対象**: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` を中心とした機能全体

---

## 1. 調査対象ファイル一覧

| ファイル | 役割 |
|---|---|
| `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | 全体進捗タブ（表示コンポーネント） |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 呼び出し元（データ取得・状態管理） |
| `frontend/src/types/progress.ts` | 型定義（ProgressRow, ProgressOverviewTabProps 等） |
| `frontend/src/services/projectApiService.ts` | API呼び出し関数（getWorkerTasks, fetchTransitionStatus） |
| `frontend/src/services/issueApiService.ts` | 問題一覧取得（getIssues） |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 作業記録タブ（ProgressOverviewTabから遷移先） |
| `backend/src/services/progressService.ts` | バックエンド進捗サービス |

---

## 2. フロントエンド〜バックエンド接続状況

### 2-1. 全体進捗データの取得フロー

```
ExperimentWorkerMenu（プロジェクト選択時 useEffect）
  │
  ├─ getWorkerTasks(projectId)
  │     → GET /api/v1/progress/projects/:projectId/worker-tasks
  │     → バックエンド: progressController / taskService.getTasksGroupedByMethod()
  │     → 戻り値: { methods: WorkerMethod[], tasks: WorkerTask[] }
  │
  └─ Promise.all: 全メソッド×タスク組み合わせで並列取得
        fetchTransitionStatus(projectId, methodId, taskNo)
          → GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
          → バックエンド: progressService.getProgressData()
          → 戻り値: { transitionStatus: TransitionStatusItem[] }
```

**接続状況: ✅ 実APIに接続済み**

### 2-2. 問題件数の取得フロー

```
ExperimentWorkerMenu（getWorkerTasks と同時並列）
  └─ getIssues({ projectId })
        → GET /api/v1/issues?projectId=:projectId
        → transitionId をキーに件数集計 → issueCountMap
        → ProgressRow.issueCount にマージ
```

**接続状況: ✅ 実APIに接続済み**（取得失敗時はログのみ、件数0として継続）

### 2-3. ProgressRow への変換マッピング

| ProgressRow フィールド | 取得元 |
|---|---|
| `rowKey` | `${task.task_no}-${tr.transitionId}` |
| `taskNo` | `task.task_no` |
| `methodId` | `method.method_id` |
| `methodName` | `method.method_name` |
| `transitionId` | `tr.transitionId` |
| `transitionName` | `tr.transitionName` |
| `status` | `toProgressRowStatus(tr.progressStatus)` ※後述 |
| `materialRecorded/Total` | `tr.materialActualCount / tr.materialCount` |
| `conditionRecorded/Total` | `tr.conditionActualCount / tr.conditionCount` |
| `resultRecorded/Total` | `tr.resultActualCount / tr.resultCount` |
| `issueCount` | `issueCountMap[tr.transitionId]` |
| `prerequisiteTransitionIds` | `tr.prerequisiteTransitionIds` |
| `isSkipped` | React state `skippedTransitionIds` で管理 |

### 2-4. ステータス変換関数

```typescript
// ExperimentWorkerMenu.tsx:316-321
const toProgressRowStatus = (progressStatus: string): ProgressRow['status'] => {
  if (progressStatus === '完了') return 'completed';
  if (progressStatus === '実行中' || progressStatus === '準備中' || progressStatus === '準備完了') return 'in_progress';
  if (progressStatus === '一時停止') return 'on_hold';
  if (progressStatus === 'エラー') return 'issue';
  return 'not_started';
};
```

バックエンドから返る `progressStatus` は日本語ラベル文字列。`TransitionStatusItem.progressStatus` を経由。

---

## 3. ProgressOverviewTab コンポーネントの機能一覧

| 機能 | 実装状態 |
|---|---|
| サマリーカード（全体進捗率・タスク完了数・ステータス別件数・スキップ件数・問題報告件数） | ✅ 完成 |
| フィルタバー（タスクNo・ステータス・スキップのみ） | ✅ 完成 |
| テーブル（メソッド名・タスクNo・トランジション名・ステータス・Mat/Cond/Res進捗バー・問題件数・操作列） | ✅ 完成 |
| 前提トランジション（順序ロック）UI制御 | ✅ 完成（`canAccessTransition()` 関数で「開始」ボタンを disabled 制御） |
| スキップ中タグ強調表示 | ✅ 完成 |
| 「作業へ」ボタン（in_progress状態） | ⚠️ タブ切替のみ（taskNo/transitionId未連動） |
| 「再開」ボタン（on_hold状態） | ⚠️ タブ切替のみ（taskNo/transitionId未連動） |
| 「開始」ボタン（not_started状態） | ⚠️ タブ切替のみ（taskNo/transitionId未連動） |
| 「詳細確認」ボタン（completed/issue状態） | ⚠️ タブ切替のみ（taskNo/transitionId未連動） |

---

## 4. 未接続・問題点の詳細

### ⚠️ 問題1（重要）: ボタン押下時に作業記録タブと連動していない

**該当箇所**: `ExperimentWorkerMenu.tsx` L455-471

```typescript
// 現状の実装
onGoToWork={(taskNo, transitionId) => {
  console.info('[ProgressOverviewTab] 作業へ:', taskNo, transitionId);
  handleTransitionResumed(transitionId);
  handleTabChange('3');  // ← タブ切替のみ
}}
onViewDetail={(taskNo, transitionId) => {
  console.info('[ProgressOverviewTab] 詳細確認:', taskNo, transitionId);
  handleTabChange('3');  // ← タブ切替のみ
}}
onStartWork={(taskNo, transitionId) => {
  console.info('[ProgressOverviewTab] 開始:', taskNo, transitionId);
  handleTransitionResumed(transitionId);
  handleTabChange('3');  // ← タブ切替のみ
}}
```

**問題**: `taskNo` と `transitionId` を受け取ってもログ出力するだけで、`WorkRecordPanel` に渡していない。

**WorkRecordPanel の現状**:

```typescript
// ExperimentWorkerMenu.tsx L441-444（タブkey='3'の children）
<WorkRecordPanel />  // ← props なし
```

`WorkRecordPanel.tsx` は props を受け取らず、内部の `INITIAL_TASKS` / `MOCK_TRANSITIONS` というモックデータで完全に固定動作している（実APIには未接続）。

**影響**: 全体進捗タブからどのボタンを押しても、作業記録タブは常に同じモック状態（タスク1〜3 固定）を表示する。

---

### ⚠️ 問題2: スキップ状態がバックエンドに永続化されていない

**該当箇所**: `ExperimentWorkerMenu.tsx` L299-303

```typescript
const [skippedTransitionIds, setSkippedTransitionIds] = useState<string[]>([]);
```

- `isSkipped` フラグは React state のみで管理
- ページリロード・ログアウト・別ブラウザでは消える
- バックエンドに「スキップ中」を保存するAPIや DBカラムは現状なし

---

### ⚠️ 問題3: 問題件数の集計キーがtransitionIdのみ（taskNoが含まれていない）

**該当箇所**: `ExperimentWorkerMenu.tsx` L346-351

```typescript
const newIssueCountMap: Record<string, number> = {};
for (const issue of issues) {
  if (issue.transitionId) {
    newIssueCountMap[issue.transitionId] = (newIssueCountMap[issue.transitionId] ?? 0) + 1;
  }
}
```

**懸念**: 同一プロジェクトで同じ `transitionId` が複数タスクに登録されている場合、全タスクの問題件数が合算されて各行に表示される可能性がある。

---

### ⚠️ 問題4: NG理由モーダルの内容が固定ハードコード

**該当箇所**: `ExperimentWorkerMenu.tsx` L588-592

```typescript
{/* フェーズB: 選択中プロジェクトのNG理由をAPIから取得して表示 */}
タスク＃1の定性評価結果が正しくありません。
```

`TODO` コメントが付いているが未実装のまま固定文字列。

---

## 5. 修正候補と優先度

| # | 問題 | 優先度 | 影響範囲 | 修正難易度 |
|---|---|---|---|---|
| 1 | ボタン押下時のtaskNo/transitionId未連動 | 🔴 高 | 全体進捗タブ → 作業記録タブの連携全体 | 中（WorkRecordPanelのAPI接続も必要） |
| 2 | スキップ状態の永続化なし | 🟡 中 | スキップ機能全体 | 高（バックエンドAPI/DB変更も伴う） |
| 3 | 問題件数集計キーにtaskNoが含まれない | 🟡 中 | 問題バッジ件数の正確性 | 低（フロントのみ修正） |
| 4 | NG理由固定文字列 | 🟡 中 | NG理由モーダル | 中（API設計が必要） |

---

## 6. ProgressOverviewTab 単体としての評価

`ProgressOverviewTab.tsx` 自体（`rows` propsを受け取り表示するコンポーネント）は**完成している**。
修正が必要なのは主に呼び出し元の `ExperimentWorkerMenu.tsx` と `WorkRecordPanel.tsx` 側。

- UIコンポーネント構造: ✅ 問題なし
- 型定義（ProgressRow / ProgressOverviewTabProps）: ✅ 適切
- canAccessTransition ロジック: ✅ 正常動作
- フィルタ・サマリーカード: ✅ 正常動作
- Props の onGoToWork / onViewDetail / onStartWork: ✅ インターフェースとして適切

---

## 7. 次ステップ候補

以下の優先度・スコープで修正タスクを立案することを推奨します。

**優先対応（フェーズB接続）**:
1. `WorkRecordPanel` を props 対応（taskNo / transitionId / readOnly）に拡張し、実APIに接続
2. `onGoToWork` / `onStartWork` / `onViewDetail` で選択情報を `WorkRecordPanel` に渡す

**次フェーズ対応**:
3. 問題件数の集計キーを `${taskNo}-${transitionId}` に変更
4. スキップ状態のバックエンド永続化（DB設計含む）
5. NG理由のAPI連携

---

## 8. 論点確認結果（2026-07-03 確定）

### 論点1: スキップUI・スキップ機能の扱い → **旧スキップUI削除、新方式（確認ダイアログ）に置き換え**

**決定**: 旧来の `isSkipped` 関連UIは削除する。スキップ（＝作業中のトランジションを中断して別のトランジションを開始する）という操作概念自体は、「開始ボタン押下時の確認ダイアログ＋ステータス切替」機能として新規実装する。

削除対象（旧スキップUI）:
- `ProgressOverviewTab.tsx` のスキップタグ・スキップフィルタUI・サマリーカード「スキップ件数」
- `ExperimentWorkerMenu.tsx` の `skippedTransitionIds` state・`handleTransitionSkipped` 関数・`handleTransitionResumed` 関数
- `ProgressRow.isSkipped` フィールド（型定義も削除）

**理由**: スキップ状態はバックエンドに永続化されておらず、React state のみで管理しているため画面リロードで消失する。実用上の意味がない状態のためUIごと削除し、実際の「作業切替」はステータス更新APIを用いた方式で実現する。

---

### 論点2: ボタン押下時のtaskNo/transitionId連動（WorkRecordPanel）→ **今回スコープ外**

**決定**: `WorkRecordPanel` の実API接続は別タスクとする。

**理由**: `WorkRecordPanel` は完全にモックデータ（`INITIAL_TASKS` 固定）で動作しており、Props接続を行うにはコンポーネント全体のAPI接続を伴う大規模改修が必要なため、今回のタスクには含めない。

今回は `onGoToWork` / `onStartWork` / `onViewDetail` のコールバックが `taskNo` / `transitionId` を受け取れる構造（インターフェース）はそのまま維持しておく。

---

### 論点3: 問題件数集計キーの変更 → **今回修正**

**決定**: 集計キーを `transitionId` 単独から `${taskNo}-${transitionId}` に変更する。

**修正箇所**: `ExperimentWorkerMenu.tsx` のissue集計ロジック（L346-351付近）

```typescript
// 変更前（全タスク合算になる問題あり）
newIssueCountMap[issue.transitionId] = (newIssueCountMap[issue.transitionId] ?? 0) + 1;

// 変更後（taskNo単位で正確に集計）
const key = `${issue.taskNo ?? ''}-${issue.transitionId}`;
newIssueCountMap[key] = (newIssueCountMap[key] ?? 0) + 1;
```

また、`ProgressRow.issueCount` へのマージ箇所も対応するキーに合わせる。

---

### 論点4: NG理由モーダルの扱い → **今回修正（API連携）**

**決定**: ハードコードされた固定文言を廃止し、実APIから複数NGタスクの一覧を取得して表示する。

**表示仕様**: 同一プロジェクト内でNGになっている全タスク・トランジションの理由を一覧表示する（タスク番号・メソッド名も併記）。

**必要な変更**:
- `ExperimentWorkerMenu.tsx`: NG理由モーダル開時に `project_task_detail` からNG情報（`task_status=6`）を取得するAPI呼び出しを追加
- バックエンド: NGタスク一覧を返すエンドポイントの確認・必要に応じて追加
  - `projectTaskDetailRepository.recordNg()` / `approveTask()` は実装済み
  - 既存の `GET /api/v1/progress/projects/:projectId/work-details` の活用を検討（または専用エンドポイント追加）
- モーダルのUI: リスト形式で `タスクNo / メソッドID / NG理由` を表示

---

### 論点5: 開始ボタン押下時の確認ダイアログ＋ステータス切替 → **今回新規実装**

**決定**: `onStartWork` で以下の動作を実装する。

**動作仕様**:
1. 同一プロジェクト内に `in_progress`（作業中）の別トランジションが存在する場合 → 確認ダイアログを表示
   - ダイアログ内容例：「現在作業中の『XXX』を中断し、『YYY』を開始しますか？」
2. 確認 OK の場合：
   - 作業中のトランジション → `INITIAL`（未着手）に PATCH APIで更新
   - 開始対象のトランジション → `IN_PROGRESS`（作業中）に PATCH APIで更新
   - 両方成功後、作業記録タブに遷移
3. 作業中のトランジションが存在しない場合 → 確認ダイアログなしで直接 PATCH API を呼び出して `IN_PROGRESS` に更新し、タブ遷移

**バックエンド変更**:
- `backend/src/services/progressService.ts` の `ALLOWED_TRANSITIONS` に `IN_PROGRESS → INITIAL` を追加する必要がある
  ```typescript
  [TransitionStatusEnum.IN_PROGRESS]: [
    TransitionStatusEnum.IN_PROGRESS,
    TransitionStatusEnum.PAUSED,
    TransitionStatusEnum.COMPLETED,
    TransitionStatusEnum.ERROR,
    TransitionStatusEnum.INITIAL,  // 追加（作業中断→未着手に戻す）
  ],
  ```

---

### スコープ外として別タスクに先送り

| 項目 | 理由 |
|---|---|
| WorkRecordPanel の実API接続 | 大規模改修（モック全廃が必要）のため別タスク |
| スキップ状態のバックエンド永続化 | 新方式（確認ダイアログ）に置き換えるため不要 |
