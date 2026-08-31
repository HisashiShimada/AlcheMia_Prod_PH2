# ステータス遷移ルール規約

## 概要

このドキュメントは、mmdpfシステムにおける**プロジェクトステータス**・**タスクステータス**・**トランジションステータス**の遷移ルールを定義します。  
ステータスを更新する実装を行う際は**必ずこのドキュメントを参照**し、遷移可否チェックを実装してください。

---

## 1. プロジェクトステータス

### 1-1. コード定義

| コード | 文字列キー | 名称 |
|--------|-----------|------|
| 0 | `planning` | プロジェクト計画中（初期状態） |
| 1 | `pending` | タスク実行待ち |
| 2 | `in_progress` | タスク実行中 |
| 3 | `review_waiting` | タスク結果レビュー待ち |
| 4 | `completed` | プロジェクト完了 |
| 5 | `error` | タスク異常終了 |
| 6 | `rejected` | プロジェクト差戻 |

> **参照**: `backend/src/types/project.ts` の `PROJECT_STATUS_STRING_MAP`  
> **ENUM**: `backend/src/enums/projectStatus.enum.ts` の `ProjectStatusEnum`

### 1-2. 遷移ルール一覧

| 遷移前 | 遷移後 | トリガー（変わるタイミング） |
|--------|--------|---------------------------|
| `0: planning` | `1: pending` | **チェックアウト実行時** |
| `1: pending` | `2: in_progress` | **トランジションの指示確認が発生した時**（WorkerがUIからトランジションの指示確認操作を行ったとき） |
| `2: in_progress` | `3: review_waiting` | **承認依頼（approval-request）実行時** |
| `3: review_waiting` | `4: completed` | **全体評価完了時**（評価ダイアログでOK評価が確定された時） |
| `3: review_waiting` | `6: rejected` | **レビュー結果NGかつタスクを再実行しない選択をした時** |
| 任意 | `5: error` | **強制終了操作時**（force terminate API呼び出し時） |

### 1-3. 遷移図

```
0: planning
    ↓ チェックアウト実行時
1: pending
    ↓ トランジションの指示確認発生時
2: in_progress
    ↓ 承認依頼実行時
3: review_waiting
    ↓ 全体評価OK時          ↓ レビューNGかつ再実行なし時
4: completed            6: rejected

任意 → 5: error（強制終了操作時）
```

### 1-4. 禁止パターン

以下の遷移は**絶対に許可しない**こと。`INVALID_STATUS_TRANSITION` エラー（HTTP 400）を返すこと。

- `0 → 2`, `0 → 3`, `0 → 4`, `0 → 6`
- `1 → 3`, `1 → 4`, `1 → 6`
- `2 → 1`, `2 → 0`, `2 → 6`（承認依頼なしでの差戻）
- `4 → 任意`（完了からの遷移は不可）
- `5 → 任意`（異常終了からの遷移は不可）

### 1-5. 実装例

```typescript
import { ProjectStatusEnum } from '../enums/projectStatus.enum';

// ✅ 正しい実装: 遷移可否チェック関数を定義する
const VALID_PROJECT_STATUS_TRANSITIONS: Record<number, number[]> = {
  [ProjectStatusEnum.PLANNING]:        [ProjectStatusEnum.PENDING, ProjectStatusEnum.ERROR],
  [ProjectStatusEnum.PENDING]:         [ProjectStatusEnum.IN_PROGRESS, ProjectStatusEnum.ERROR],
  [ProjectStatusEnum.IN_PROGRESS]:     [ProjectStatusEnum.REVIEW_WAITING, ProjectStatusEnum.ERROR],
  [ProjectStatusEnum.REVIEW_WAITING]:  [ProjectStatusEnum.COMPLETED, ProjectStatusEnum.REJECTED, ProjectStatusEnum.ERROR],
  [ProjectStatusEnum.COMPLETED]:       [],
  [ProjectStatusEnum.ERROR]:           [],
  [ProjectStatusEnum.REJECTED]:        [],
};

export function isValidProjectStatusTransition(from: number, to: number): boolean {
  return VALID_PROJECT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// Service層での使用例
export async function updateProjectStatus(
  organizationId: string,
  projectName: string,
  toStatus: number,
  lang: string = 'ja'
): Promise<void> {
  const project = await projectRepository.findByName(organizationId, projectName);
  if (!project) {
    const error: any = new Error(getMessage(lang, 'project.notFound'));
    error.statusCode = 404;
    throw error;
  }

  if (!isValidProjectStatusTransition(project.project_status, toStatus)) {
    const error: any = new Error(
      getMessage(lang, 'project.invalidStatusTransition', {
        from: String(project.project_status),
        to: String(toStatus),
      })
    );
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  await projectRepository.updateStatus(organizationId, projectName, toStatus);
}
```

---

## 2. タスクステータス

### 2-1. コード定義

| コード | 文字列キー | 名称 |
|--------|-----------|------|
| 0 | `pending` | 実行待ち（初期状態） |
| 1 | `in_progress` | 実行中 |
| 2 | `review_waiting` | レビュー待ち |
| 3 | `completed` | 完了 |
| 4 | `forced_terminated` | 異常終了 |
| 5 | `ng` | NG |

> **参照**: `backend/src/types/project.ts` の `TASK_STATUS_MAP`  
> **ENUM**: `backend/src/enums/projectStatus.enum.ts` の `TaskStatusEnum`（または `TaskStatus` 型）

### 2-2. 遷移ルール一覧

| 遷移前 | 遷移後 | トリガー（変わるタイミング）と条件 |
|--------|--------|----------------------------------|
| `0: pending` | `1: in_progress` | **①チェックアウト時**: プロジェクト内で作業順序（task_no）が最も若いタスクを実行中にする |
| `0: pending` | `1: in_progress` | **②ひとつ前の作業順序のトランジションがスキップされた時**: スキップ操作の連鎖でこのタスクが次の実行対象になった場合 |
| `0: pending` | `1: in_progress` | **③進捗確認画面でスキップしたトランジションの再開ボタン押下時**: 選択したトランジションを実行中にする |
| `1: in_progress` | `0: pending` | **③再開ボタン押下時（逆遷移）**: 現在実行中のトランジションを実行待ちに戻す（スキップ操作の取り消し） |
| `1: in_progress` | `2: review_waiting` | **記録完了時**: WorkerがデータをサブミットしてレビューAPIを呼び出した時 |
| `2: review_waiting` | `3: completed` | **タスクレビューでOKだった場合**: レビュアーがOK評価を確定した時 |
| `2: review_waiting` | `5: ng` | **タスクレビューでNGだった場合**: レビュアーがNG評価を確定した時 |
| 任意 | `4: forced_terminated` | **強制終了操作時** |

### 2-3. 遷移図

```
0: pending
    ↓ ①チェックアウト時（作業順序最小）
    ↓ ②前のトランジションがスキップされた時
    ↓ ③再開ボタン押下時
1: in_progress
    ↓ 記録完了時           ↑ ③再開ボタンで逆遷移も可
2: review_waiting
    ↓ レビューOK時    ↓ レビューNG時
3: completed       5: ng

任意 → 4: forced_terminated（強制終了操作時）
```

### 2-4. ⚠️ 重要な注意事項

**`2: review_waiting` のタスクの内容を訂正する場合はステータス変更をしない。**  
ステータスは `2: review_waiting` のまま維持し、記録データのみを更新すること。

```typescript
// ❌ 禁止: レビュー待ち中に訂正のためステータスを変更する
await taskRepository.updateStatus(taskId, TaskStatusEnum.IN_PROGRESS); // NG

// ✅ 正しい: ステータスはそのままにデータのみ更新する
await taskDataRepository.updateContent(taskId, correctedData);
```

### 2-5. チェックアウト時の一括更新ルール

チェックアウト処理では、**1つのトランザクション内**で以下を同時に実行すること：

1. プロジェクトステータス: `0: planning → 1: pending`
2. 作業順序（task_no）が**最も若いタスク**のステータス: `0: pending → 1: in_progress`
3. 前提トランジションなしのトランジション: `1: initial → 2: ready`（一括更新）

```typescript
// ✅ トランザクション内で一括更新
await db.transaction().execute(async (trx) => {
  // 1. プロジェクトステータス更新
  await updateProjectStatusTrx(trx, organizationId, projectName, ProjectStatusEnum.PENDING);

  // 2. 最小作業順序のタスクを実行中に
  await updateMinTaskStatusTrx(trx, organizationId, projectName, TaskStatusEnum.IN_PROGRESS);

  // 3. 前提トランジションなしのトランジションを準備状態に（1: initial → 3: ready）
  await updatePrerequisiteFreeTransitionsTrx(trx, organizationId, projectName, TransitionStatusEnum.READY);
});
```

### 2-6. 禁止パターン

- `3: completed → 任意`（完了からの遷移は不可）
- `4: forced_terminated → 任意`（異常終了からの遷移は不可）
- `2: review_waiting` 中のステータス変更（訂正目的での変更）

---

## 3. トランジションステータス

### 3-1. コード定義

| コード | ENUMキー | 名称 |
|--------|----------|------|
| 1 | `INITIAL` | 初期状態（initial）|
| 2 | `PREPARING` | 準備中（preparing）|
| 3 | `READY` | 準備完了（ready）|
| 4 | `IN_PROGRESS` | 実行中（running）|
| 5 | `PAUSED` | 一時停止（paused）|
| 6 | `COMPLETED` | 完了（completed）|
| 7 | `ERROR` | 異常終了（error）|

> **ENUM**: `backend/src/types/transitionData.ts` の `TransitionStatusEnum`

### 3-2. 遷移ルール一覧

| 遷移前 | 遷移後 | トリガー（変わるタイミング）と条件 |
|--------|--------|----------------------------------|
| `1: initial` | `2: preparing` | **①チェックアウト時**: 前提トランジションID（prerequisite_transition_ids）が空配列（`{}`）のトランジションを**一括で**準備状態にする |
| `1: initial` | `3: ready` | **②前提トランジションが完了した時**: 完了したトランジションを前提とする他のトランジションについて、すべての前提が `6: completed` になっている場合に準備完了状態にする |
| `2: preparing` | `3: ready` | **指示確認時**: WorkerがUIから指示確認操作を行った時 |
| `3: ready` | `4: in_progress` | **開始時**: WorkerがUIから開始操作を行った時 |
| `4: in_progress` | `5: paused` | **一時停止時**: Workerが作業を一時停止した時 |
| `5: paused` | `4: in_progress` | **再開時**: Workerが作業を再開した時 |
| `4: in_progress` | `6: completed` | **終了時**: Workerが終了操作を行った時 |
| 任意 | `7: error` | **異常終了操作時**: 強制終了またはシステムエラー発生時 |

### 3-3. 遷移図

```
1: initial
    ↓ ①チェックアウト時（prerequisite_transition_ids が空配列）
2: preparing
    ↓ 指示確認時
3: ready
    ↓ 開始時
4: in_progress ⇄ 5: paused（一時停止/再開）
    ↓ 終了時
6: completed → 前提に持つ他トランジションの 1→3 遷移を連鎖させる

任意 → 7: error（異常終了操作時）
```

### 3-4. 前提トランジション完了時の連鎖更新

トランジションが `6: completed` になった後、**連鎖して**以下の処理を行うこと：

```typescript
// ✅ 前提トランジション完了後の連鎖更新
export async function onTransitionCompleted(
  organizationId: string,
  completedTransitionId: string
): Promise<void> {
  // このトランジションを前提に持つ他のトランジションを取得
  const dependentTransitions = await transitionRepository.findByPrerequisite(
    organizationId,
    completedTransitionId
  );

  for (const transition of dependentTransitions) {
    // そのトランジションの全前提が完了しているか確認
    const allPrerequisitesCompleted = await transitionRepository.checkAllPrerequisitesCompleted(
      organizationId,
      transition.transition_id
    );

    if (allPrerequisitesCompleted) {
      // 全前提が完了 → 準備完了状態に遷移（1: initial → 3: ready）
      await transitionRepository.updateStatus(
        organizationId,
        transition.transition_id,
        TransitionStatusEnum.READY
      );
    }
  }
}
```

### 3-5. 禁止パターン

- `6: completed → 任意`（終状態からの遷移は不可）
- `7: error → 任意`（異常終了状態からの遷移は不可）
- 準備完了状態（3）をスキップして `1: initial → 4: in_progress` などへ直接遷移

---

## 4. 実装時の必須チェックリスト

ステータス更新処理を実装する際は、以下を必ず確認すること。

### ✅ 必須事項

- [ ] **ENUMを使用してマジックナンバーを排除する**  
  `ProjectStatusEnum`, `TaskStatusEnum`, `TransitionStatusEnum` を使用すること（`code: 2` 等の直書き禁止）

- [ ] **遷移可否チェック関数を実装・呼び出す**  
  `isValidProjectStatusTransition(from, to)` 等を定義し、ステータス更新前に必ず呼び出すこと

- [ ] **不正な遷移は `INVALID_STATUS_TRANSITION` エラーを返す**  
  HTTP 400 で返却し、エラーコードに `'INVALID_STATUS_TRANSITION'` を設定すること

- [ ] **チェックアウト時の3種同時更新はトランザクション内で行う**  
  プロジェクト / タスク / トランジション の3つを必ず同一トランザクションで更新すること  
  トランジション更新: `prerequisite_transition_ids = '{}'` のものを `1: initial → 2: preparing` に一括更新

- [ ] **前提トランジション完了時の連鎖更新を実装する**  
  トランジション完了後、依存する他トランジションへの `1→3` 連鎖更新を忘れないこと

- [ ] **`2: review_waiting` タスクの訂正時はステータスを変更しない**  
  レビュー待ち中のデータ訂正ではステータス更新のAPIを呼ばないこと

### ❌ 禁止事項

```typescript
// ❌ マジックナンバー使用禁止
await projectRepository.updateStatus(organizationId, projectName, 2);

// ✅ ENUMを使用すること
await projectRepository.updateStatus(organizationId, projectName, ProjectStatusEnum.IN_PROGRESS);

// ❌ 遷移チェックなしに直接更新する
await projectRepository.updateStatus(organizationId, projectName, toStatus);

// ✅ 遷移チェックを必ず行う
if (!isValidProjectStatusTransition(currentStatus, toStatus)) {
  const error: any = new Error(getMessage(lang, 'project.invalidStatusTransition'));
  error.statusCode = 400;
  error.code = 'INVALID_STATUS_TRANSITION';
  throw error;
}
await projectRepository.updateStatus(organizationId, projectName, toStatus);

// ❌ チェックアウト処理で複数テーブルをトランザクションなしに更新
await projectRepository.updateStatus(...);  // 別々のDB呼び出し
await taskRepository.updateStatus(...);     // トランザクションなし → 整合性崩壊リスク

// ✅ 必ずトランザクションで一括更新
await db.transaction().execute(async (trx) => {
  await updateProjectStatusTrx(trx, ...);
  await updateTaskStatusTrx(trx, ...);
  await updateTransitionStatusesTrx(trx, ...);
});
```

---

## 5. 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/types/project.ts` | `PROJECT_STATUS_STRING_MAP`, `TASK_STATUS_MAP`, `TaskStatus` 型 |
| `backend/src/enums/projectStatus.enum.ts` | `ProjectStatusEnum`, `CheckoutStatusEnum` |
| `backend/src/types/transitionData.ts` | `TransitionStatusEnum` |
| `backend/src/services/projectService.ts` | チェックアウト・強制終了等のプロジェクト操作 |
| `backend/src/services/progressService.ts` | 進捗管理・トランジション操作 |
| `backend/src/repositories/progressRepository.ts` | トランジションステータス更新 |

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-08-20 | 初版作成（プロジェクト・タスク・トランジションのステータス遷移ルール定義） | Cline |
