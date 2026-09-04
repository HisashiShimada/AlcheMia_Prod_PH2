# タスク計画書: 作業者画面 NG・レビュー差戻対応（UI修正）

## メタデータ

- **作成日時**: 2026-09-01
- **タスクID**: 20260901_0001_worker_ui
- **親タスク**: 20260901_0001（承認処理・NG・記録値訂正機能強化）
- **優先度**: 高
- **推定工数**: 1〜2日
- **対象コンポーネント**: ExperimentWorkerMenu, ProgressOverviewTab, WorkRecordPanel（作業者側）

---

## 1. タスク概要

前タスク（20260901_0001）でバックエンドとmanager側UIの実装が完了した。
本タスクでは、NG・レビュー差戻後の**作業者側画面**を整備する。

### 対象ユーザー
- `experiment_worker`（実験作業者）
- `experiment_admin`（実験管理者） ※作業者メニューを使用する場合

### 背景

チェックアウト処理でプロジェクトが `project_status = 6`（`REVIEW_REJECTED`：レビュー差戻）に遷移する実装はバックエンドで完了済み。しかしフロントエンドでは以下の問題が残っている：

1. **`REVIEW_REJECTED: 6` がフロントエンドの定数に未追加** → ステータス `6` を参照するコードが書けない・表示が壊れる
2. **`ProgressOverviewTab` でレビュー差戻時の訂正操作がない** → 作業者がトランジションを選んで記録を確認・訂正する手段がない
3. **タスク実行待ち（`TASK_PENDING`）時、NGタスクの扱いがUIで未整備** → NGタスク行に「開始」ボタンが表示されてしまう可能性がある

---

## 2. 目的と期待される成果

- [x] `REVIEW_REJECTED: 6` がフロントエンドの定数・型・ヘルパー関数に追加される
- [x] `ProgressOverviewTab` で **`isRecorded === true`（記録済み）のトランジション行すべて**に「記録確認」ボタンが表示される（プロジェクトステータスによらず）
- [x] 「記録確認」ボタン押下で `WorkRecordPanel`（タブ3）に**読み取り専用**で遷移し、記録内容を確認できる
- [x] 読み取り専用表示中に `WorkHeader` の「訂正」ボタンを押すと、**その表示中のトランジションのまま編集可能モードへ切り替わり**、値を更新・保存できる（`correctRecord` API を使用）
- [x] 「訂正」ボタンの表示条件: **以下の両方を満たす場合のみ**
  - 条件①: `project_status` が訂正可能ステータス
    - `TASK_PENDING(1)` / `TASK_IN_PROGRESS(2)` / `REVIEW_REJECTED(6)` のいずれか
    - **`REVIEW_WAITING(3)` は訂正不可**（審査中のため）
    - **`COMPLETED(4)` / `ERROR(5)` は訂正不可**
  - 条件②: `taskStatus`（タスクステータス）が訂正可能ステータス
    - `PENDING(0)` / `IN_PROGRESS(1)` / `REVIEW_NG(5)` のいずれか
    - **`REVIEW_WAITING(2)` は訂正不可**（レビュー依頼中のため）
    - **`COMPLETED(3)` は訂正不可**（完了確定データはMAIML書き込み済みのため改変不可）
    - **`FORCED_TERMINATED(4)` は訂正不可**（NGでやり直し対象のタスクの過去データを改変しない）
- [x] 訂正保存完了後は再び読み取り専用表示に戻る（`viewingKey` を維持）
- [x] `project_status = 1`（タスク実行待ち）の場合、NGタスクのトランジション行には「開始」ボタンが表示されず「NG済み」タグが表示される。新規Pendingタスクを先頭から開始できる

---

## 3. 現状の詳細調査結果

### 3-1. フロントエンド `REVIEW_REJECTED` 未追加の影響箇所

| ファイル | 問題 |
|---------|------|
| `frontend/src/constants/codeMaster.ts` | `ProjectStatus` に `REVIEW_REJECTED` なし（値 `6` を定数参照できない） |
| `frontend/src/types/experimentWorker.ts` `isEditableStatus()` | `TASK_PENDING(1)` / `TASK_IN_PROGRESS(2)` のみ → `REVIEW_REJECTED(6)` でも訂正操作を許可すべき |
| `frontend/src/types/experimentWorker.ts` `isSelectableStatus()` | 1,2,3 のみ → `REVIEW_REJECTED(6)` でもプロジェクト選択可能にすべき |
| `frontend/src/types/progress.ts` | コメント文に `6=レビュー差戻` の記載がない |
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | ステータス表示 switch 文に `case 6` がなく表示が壊れる |

### 3-2. WorkRecordPanel の `isReadOnly` / 詳細確認フローの仕組み

**既存の仕組み**:
- `viewingKey !== null` → `isReadOnly = true`（閲覧専用）
- 閲覧専用時: `WorkHeader` に Alert が表示され「作業に戻る」ボタン（`onClearViewing`）で `viewingKey = null` に戻る
- `WorkRecordPanel` には現在 `correctRecord` API 呼び出しが**一切存在しない**

**採用する設計**（既存の `viewingKey` 仕組みを活用した最小変更）:

```
ProgressOverviewTab「記録確認」ボタン（isRecorded === true の行すべて）
  ↓ onViewDetail(taskNo, transitionId) を呼ぶ
ExperimentWorkerMenu で viewingWorkTaskNo / viewingWorkTransitionId を State に保存
  → WorkRecordPanel の initialTaskNo / initialTransitionId に渡す
  → viewingKey = { taskNo, transitionId } で初期化（isReadOnly = true）
  ↓ タブ3に遷移
WorkRecordPanel（読み取り専用で表示）
  WorkHeader に Alert（閲覧専用を示す）
    訂正可能ステータス(1/2/6)なら「訂正」ボタン表示
    訂正不可ステータス(3/4/5)なら「作業に戻る」のみ
  「訂正」ボタン押下
    → isCorrectionMode = true にする
    → isReadOnly = viewingKey !== null && !isCorrectionMode → false（編集可能）
  編集して「訂正保存」ボタン押下
    → correctRecord API を呼ぶ（PATCH .../correct）
    → 完了後 isCorrectionMode = false に戻す（viewingKey はそのまま維持 → 再び閲覧専用）
  「キャンセル」ボタン押下
    → isCorrectionMode = false（変更破棄・閲覧専用に戻る）
```

**`isReadOnly` の変更**:
- 既存: `const isReadOnly = viewingKey !== null;`
- 変更後: `const isReadOnly = viewingKey !== null && !isCorrectionMode;`

### 3-3. `onGoToWork` ハンドラーの現状

`ExperimentWorkerMenu.tsx` の `onGoToWork` は現在 `handleTabChange('3')` のみ実行し、`taskNo`/`transitionId` が `WorkRecordPanel` に渡されていない（`console.info` のみ）。
`WorkRecordPanel` の `initialTaskNo` / `initialTransitionId` Props は存在するが、未接続の状態。

### 3-4. NGタスクの `ProgressOverviewTab` での挙動

`status === 'issue'`（NGタスク）のトランジションは `canAccessTransition` の前提チェックを通過してしまう場合がある。明示的に `status === 'issue'` の行には「開始」ボタンを非表示にする処理が必要。

---

## 4. 実装ステップ（チェックリスト）

### Phase A: フロントエンド `REVIEW_REJECTED` 定数追加

- [x] **A-1** `frontend/src/constants/codeMaster.ts`
  - `ProjectStatus` に `/** レビュー差戻 */ REVIEW_REJECTED: 6` を追加

- [x] **A-2** `frontend/src/types/progress.ts`
  - コメント `0=計画中, ..., 5=異常終了` を `6=レビュー差戻` まで更新
  - `ProgressOverviewTabProps` に `projectStatus?: number` を追加（Phase B 準備）
  - **`ProgressRow` に `taskStatus?: number` フィールドを追加**（訂正可否判定に使用）

- [x] **A-3** `frontend/src/types/experimentWorker.ts`
  - コメント更新（`6=レビュー差戻` 追記）
  - `isEditableStatus()` に `|| status === ProjectStatusConst.REVIEW_REJECTED` を追加
  - `isSelectableStatus()` に `|| status === ProjectStatusConst.REVIEW_REJECTED` を追加
  - JSDoc コメントも更新

- [x] **A-4** `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
  - ステータス色判定に `ProjectStatus.REVIEW_REJECTED` の case 追加（`'orange'` 系）
  - switch 文に `case ProjectStatus.REVIEW_REJECTED: return t('progress.filter.reviewRejected')` を追加

- [x] **A-5** `frontend/src/locales/ja.json` / **A-6** `frontend/src/locales/en.json`
  - `progress.filter.reviewRejected` キー追加

---

### Phase B: ProgressOverviewTab → WorkRecordPanel「閲覧 → 訂正」フロー実装

#### B-1: ProgressOverviewTab に「記録確認」ボタン追加

`frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`

- [x] `projectStatus?: number` Props を受け取る（A-2 で追加済み型）
- [x] 操作列の「記録確認」ボタン表示条件を `isRecorded === true` ベースに統一:
  - **`isRecorded === true`** の行: ボタンラベルを `t('progressOverview.checkRecordButton')` に変更（オレンジ系スタイル）→ `onViewDetail(r.taskNo, r.transitionId)` を呼ぶ
  - `isRecorded === false` / `undefined` の行: 既存の「作業へ」ボタン等ステータスベースの動作を維持
  - ※ `status === 'completed'` または `status === 'issue'` で `isRecorded === false` の行は既存の「詳細確認」ボタンのまま
- [x] `TASK_PENDING` かつ `status === 'issue'` の行: 「開始」非表示 → `Tag` で `t('progressOverview.ngDoneTag')` 表示

#### B-2: ExperimentWorkerMenu で initialTaskNo / initialTransitionId を WorkRecordPanel に接続

`frontend/src/components/menus/ExperimentWorkerMenu.tsx`

- [x] `viewingWorkTaskNo: number | null` / `viewingWorkTransitionId: string | null` State を追加
- [x] `ProgressOverviewTab` に `projectStatus={selectedProjectStatus ?? undefined}` を渡す
- [x] `onGoToWork` / `onViewDetail` ハンドラー修正: `taskNo`/`transitionId` を State に保存 → `handleTabChange('3')`
- [x] `WorkRecordPanel` に `initialTaskNo={viewingWorkTaskNo ?? undefined}` / `initialTransitionId={viewingWorkTransitionId ?? undefined}` / `projectStatus={selectedProjectStatus ?? undefined}` を渡す
- [x] プロジェクト変更時（`handleProjectChange`）に両 State を `null` にリセット
- [x] **`ProgressRow` への `taskStatus` マッピングを追加**: `ProgressRow` 生成ループ内で `task.task_status` を数値に変換して `taskStatus` フィールドに格納
  - `WorkerTask.task_status`（文字列）→ `TaskStatus` 数値への変換マップを定義（`toTaskStatusNumber` 関数）
  - `fetchProgressRows` / `reloadProgressRows` 両方に適用

#### B-3: WorkRecordPanel に `isCorrectionMode` と「訂正」フロー実装

`frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

- [x] `isCorrectionMode: boolean` State を追加（初期値 `false`）
- [x] `correctionLoading: boolean` State を追加（初期値 `false`）
- [x] `isReadOnly` 変更: `viewingKey !== null` → `viewingKey !== null && !isCorrectionMode`
- [x] `WorkHeaderProps` / `PlanProps` に `projectStatus?` / `taskStatus?` / `isCorrectionMode?` / `onEnterCorrectionMode?` / `onCancelCorrectionMode?` / `correctionLoading?` / `onSaveCorrection?` を追加
- [x] `WorkHeader` の Alert（`isReadOnly` 時）を3パターンに分岐:
  - 訂正可能条件: `isProjectCorrectable && isTaskCorrectable`（`ProjectStatus` / `TaskStatus` 定数使用）
  - `isCorrectionMode === true`: 「訂正保存」ボタン（loading付き）と「キャンセル」ボタン
  - `isCorrectable && !isCorrectionMode`: 「訂正」ボタンと「作業に戻る」ボタン
  - `!isCorrectable`: 「作業に戻る」ボタンのみ（既存動作）
- [x] `WorkRecordPanel` 本体で `handleSaveCorrection` を実装:
  - `viewingKey` の `taskNo`/`transitionId` と `rawTemplateItemsRef` から `placeId`/`data` を取得
  - `correctRecord` API（`PATCH .../correct`）を呼ぶ
  - 完了後 `isCorrectionMode = false`（`viewingKey` は維持 → 再び閲覧専用）
- [x] `viewingKey` が変化した時に `isCorrectionMode = false` にリセットする `useEffect` を追加
- [x] `ProjectStatus as ProjectStatusConst` / `TaskStatus as TaskStatusConst` / `correctRecord` をインポート
- [x] `planProps` オブジェクトに訂正関連 Props を追加

---

### Phase C: タスク実行待ち時 NGトランジションのUI整備

- [x] **C-1** B-1 と同ファイル（`ProgressOverviewTab.tsx`）: Phase B-1 で対応済み
- [x] **C-2** B-2 と同ファイル（`ExperimentWorkerMenu.tsx`）: `onStartWork` ハンドラーで `status === 'issue'` の行を明示除外

---

## 5. 変更ファイル一覧

| No | ファイルパス | 変更種別 | 変更内容 |
|----|------------|---------|---------|
| 1 | `frontend/src/constants/codeMaster.ts` | 更新 | `REVIEW_REJECTED: 6` 追加 |
| 2 | `frontend/src/types/progress.ts` | 更新 | コメント更新・`ProgressOverviewTabProps` に `projectStatus` 追加・`ProgressRow` に `taskStatus` 追加 |
| 3 | `frontend/src/types/experimentWorker.ts` | 更新 | `isEditableStatus` / `isSelectableStatus` に `REVIEW_REJECTED` 追加 |
| 4 | `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | 更新 | `REVIEW_REJECTED` ステータス表示追加 |
| 5 | `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | 更新 | `projectStatus` Props受取・「記録確認」ボタン・NG済みタグ |
| 6 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 更新 | State追加・`onGoToWork`修正・Props接続 |
| 7 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 更新 | `isCorrectionMode`・`isReadOnly`変更・訂正ボタン・`correctRecord`呼び出し |
| 8 | `frontend/src/locales/ja.json` | 更新 | i18nキー追加 |
| 9 | `frontend/src/locales/en.json` | 更新 | i18nキー追加（英語） |

---

## 6. i18n キー追加一覧

| キー | 日本語 | 英語 |
|------|--------|------|
| `progress.filter.reviewRejected` | `レビュー差戻` | `Review Rejected` |
| `progressOverview.checkRecordButton` | `記録確認` | `Check Record` |
| `progressOverview.ngDoneTag` | `NG済み` | `NG Done` |
| `workRecord.correctionModeAlert` | `差し戻し済みのトランジションです。内容を確認し、必要に応じて訂正してください。` | `This transition has been rejected. Please review and correct if needed.` |
| `workRecord.startCorrectionButton` | `訂正` | `Correct` |
| `workRecord.saveCorrectionButton` | `訂正保存` | `Save Correction` |
| `workRecord.cancelCorrectionButton` | `キャンセル` | `Cancel` |
| `workRecord.correctionSaved` | `訂正を保存しました` | `Correction saved` |
| `workRecord.correctionError` | `訂正の保存に失敗しました` | `Failed to save correction` |

---

## 7. 影響範囲

- `isEditableStatus()` に `REVIEW_REJECTED` 追加: 進捗確認タブ（`ProgressCheckTab`）は `projectStatus = null` 固定なので影響なし。差し戻し後は操作許可が意図した動作
- `isSelectableStatus()` 追加: 差し戻し状態ではプロジェクト選択可能であるべきため適切
- `isReadOnly` の変更: `isCorrectionMode` は `REVIEW_REJECTED` 時の「訂正」ボタン押下でのみ `true` になるため通常の「詳細確認」フローには影響なし

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `correctRecord` API に必要な `placeId` が `WorkRecordPanel` から取得できない | 高 | `rawTemplateItemsRef`（`getTemplateData` API レスポンス保持 Ref）に `placeId` が含まれているか事前確認。含まれていれば流用可 |
| `isCorrectionMode = true` 中に他のトランジションに切り替えた場合の挙動 | 中 | `viewingKey` 変化時に `isCorrectionMode = false` にリセットする `useEffect` で対処 |
| `isEditableStatus` 拡張で他画面が意図せず編集可能になる | 中 | 進捗確認タブは `projectStatus = null` 固定なので影響なし |

---

## 9. テスト計画

### 手動テスト（Phase A）
- [ ] `project_status = 6` のプロジェクトがドロップダウンに「レビュー差戻」ラベルで表示されること
- [ ] `WorkProgressDetailDialog` でステータス `6` が「レビュー差戻」と表示されること

### 手動テスト（Phase B）
- [ ] `isRecorded === true` の行には `project_status` によらず「記録確認」ボタンが表示されること
- [ ] 「記録確認」押下でタブ3に遷移し、指定トランジションが**読み取り専用**で表示されること
- [ ] `project_status = 1 or 2 or 6` かつ `task_status = 0 or 1 or 5` 時: 「訂正」ボタンが表示されること
- [ ] `project_status = 3`（レビュー依頼済）時: 「訂正」ボタンが表示**されない**こと（審査中は訂正不可）
- [ ] `project_status = 4 or 5` 時: 「訂正」ボタンが表示**されない**こと
- [ ] `task_status = 3`（完了）時: `project_status` に関わらず「訂正」ボタンが表示**されない**こと（完了確定データ改変不可）
- [ ] `task_status = 4`（強制終了）時: `project_status` に関わらず「訂正」ボタンが表示**されない**こと（NGやり直し対象タスクの過去データ改変不可）
- [ ] 「訂正」ボタン押下でその場で編集可能になること（入力フィールドが有効化）
- [ ] 値を変更して「訂正保存」を押すと `correctRecord` API が呼ばれ更新されること
- [ ] 保存完了後、再び読み取り専用に戻ること
- [ ] 「キャンセル」押下で値変更が破棄され読み取り専用に戻ること

### 手動テスト（Phase C）
- [ ] `project_status = 1` の場合、`status === 'issue'` 行には「開始」ボタンが表示されず「NG済み」タグが表示されること
- [ ] 新規Pendingタスク（`status === 'not_started'`）の行には「開始」ボタンが表示されること

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-01
- **承認日時**: 2026-09-01
- **承認者コメント**: 承認済み。実装完了。

---

## 11. 実施記録

### 実施日時
開始: 2026-09-01
完了: 2026-09-02

### 計画からの変更点

- `WorkHeaderProps` に加えて `PlanProps`（PlanB コンポーネントの Props 型）への追加が必要だった（`WorkRecordPanel` のアーキテクチャ上、`WorkHeader` は `PlanB` 内部に存在するため）
- `handleSaveCorrection` は `rawTemplateItemsRef` のデータ構造（`TemplateDataItem.data` が `Record<string, unknown>` 形式）に合わせて実装
- `planProps` オブジェクトへ訂正関連 Props を追加することで `WorkRecordPanel` 本体 → `PlanB` → `WorkHeader` への Props バケツリレーを実現

### 発生した問題と解決方法

- `isCorrectionMode` を `PlanB` 内の `WorkHeader` に渡す際、`WorkRecordPanel`（メインコンポーネント）の State を直接参照できないため、`PlanProps` を経由するバケツリレー構造に変更
- tsc のキャッシュ問題で古いエラーが表示されたが、ファイルの内容確認で実際には正しく実装されていることを確認

### 最終的な成果物

- [x] A-1: `constants/codeMaster.ts` — `REVIEW_REJECTED: 6` 追加
- [x] A-2: `types/progress.ts` — コメント更新・`ProgressRow.taskStatus` 追加・`ProgressOverviewTabProps.projectStatus` 追加
- [x] A-3: `types/experimentWorker.ts` — `isEditableStatus` / `isSelectableStatus` 拡張
- [x] A-4: `WorkProgressDetailDialog.tsx` — `REVIEW_REJECTED` 表示追加
- [x] A-5/A-6: `ja.json` / `en.json` — i18n キー追加（`progress.filter.reviewRejected`・`workRecord.*correction*`・`progressOverview.*`）
- [x] B-1: `ProgressOverviewTab.tsx` — `isRecorded` ベースの「記録確認」ボタン・NG済みタグ
- [x] B-2: `ExperimentWorkerMenu.tsx` — `viewingWorkTaskNo`/`TransitionId` State・`toTaskStatusNumber`・`taskStatus` マッピング・Props 接続
- [x] B-3/C: `WorkRecordPanel.tsx` — `isCorrectionMode` State・`isReadOnly` 変更・Alert 3パターン分岐・`handleSaveCorrection`・`viewingKey` useEffect

