# タスク計画書: 実験開始後ボタン非活性バグ修正

## メタデータ
- **作成日時**: 2026-05-14 09:11
- **タスクID**: fix-experiment-start-button-inactive
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者画面において「実験開始」を実行してタスクのステータスが「タスク実行待ち（1）→タスク実行中（2）」に切り替わった際、指示確認タブおよび実験記録タブの「確認完了」「記録」ボタンが非活性のままになるバグを修正する。

## 原因分析

### 問題の根本原因

`ExperimentWorkerMenu.tsx` の `projects` ステートが、実験開始後に更新されないことが原因。

### データフロー

```
ExperimentWorkerMenu
  ├── projects (state) ← getWorkerAccessibleProjects() で初回のみ取得
  ├── selectedProjectStatus = projects.find(p => p.projectId === selectedProject)?.projectStatus ?? null
  │                           ↑ この値は projects が更新されないと変わらない！
  │
  ├── InstructionConfirmationTab
  │     └── projectStatusCode={selectedProjectStatus}
  │           → isTaskExecuting = (projectStatusCode === 2) // タスク実行中=2のみ活性
  │
  ├── ExperimentRecordTab
  │     └── selectedProjectStatus={selectedProjectStatus}
  │           → projectStatus = mapNumericStatusToProjectStatus(selectedProjectStatus)
  │
  └── ProgressCheckTab
        └── handleTaskAction('start')
              ├── updateTaskStatus() → バックエンドでプロジェクトステータス 1→2 に更新
              ├── ProgressCheckTab内部の tasks/methods は再取得される ✅
              └── ❌ ExperimentWorkerMenu の projects は更新されない
```

### 再現ステップ

1. プロジェクト選択 → `selectedProjectStatus = 1`（タスク実行待ち）
2. 「実験開始」ボタンを押す → バックエンドでステータス `1`→`2` に更新
3. `ProgressCheckTab` 内部の tasks は再取得されるが、`ExperimentWorkerMenu` の `projects` は**更新されない**
4. `selectedProjectStatus` が `1` のままのため：
   - `InstructionConfirmationTab`: `isTaskExecuting = (1 === 2)` → `false` → ボタン非活性のまま
   - `ExperimentRecordTab`: `projectStatus = 'waiting_task'` → 記録ボタン非活性のまま
5. 別画面に移動して戻ると `getWorkerAccessibleProjects()` が再実行され、`projects` が更新されて正常になる

## 目的と期待される成果

- [ ] 実験開始後、指示確認タブの「確認完了」ボタンが即座に活性化される
- [ ] 実験開始後、実験記録タブの「記録」ボタンが即座に活性化される
- [ ] 強制終了後も同様に即座にステータスが反映される

## 実装ステップ

### Phase 1: ProgressCheckTab にコールバック追加
- [ ] `ProgressCheckTabProps` に `onTaskStatusChanged?: () => void` を追加
- [ ] `handleTaskAction` の `start` 成功後に `onTaskStatusChanged?.()` を呼び出す
- [ ] `handleTaskAction` の `forceTerminate` 成功後にも `onTaskStatusChanged?.()` を呼び出す（409 Conflict の再取得後も同様）

### Phase 2: ExperimentWorkerMenu にプロジェクト再取得を追加
- [ ] `handleTaskStatusChanged` 関数を追加（`getWorkerAccessibleProjects()` を呼び出して `projects` を再取得）
- [ ] `ProgressCheckTab` に `onTaskStatusChanged={handleTaskStatusChanged}` を渡す

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - Props追加、コールバック呼び出し追加
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - ハンドラ追加、Props渡し追加

## 技術詳細

### 既存パターンとの一致

`handleApprovalRequest` でも承認依頼後に `getWorkerAccessibleProjects()` を再取得する同じパターンを使用済みのため、同一の実装方針で対応する。

```tsx
// 既存の承認依頼後の再取得（ExperimentWorkerMenu.tsx L186-193）
try {
  const projectsResult = await getWorkerAccessibleProjects();
  if (projectsResult.success && projectsResult.data) {
    setProjects(projectsResult.data.projects);
  }
} catch (fetchError) {
  console.error('プロジェクト一覧再取得エラー:', fetchError);
}
```

### 追加する関数（ExperimentWorkerMenu.tsx）

```tsx
// タスクステータス変更後にプロジェクト一覧を再取得
const handleTaskStatusChanged = async () => {
  try {
    const result = await getWorkerAccessibleProjects();
    if (result.success && result.data) {
      setProjects(result.data.projects);
    }
  } catch (error) {
    console.error('プロジェクト一覧再取得エラー:', error);
  }
};
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 再取得による余分なAPIコール | 低 | 中 | タスク開始・強制終了時のみ呼び出し（頻度は低い） |
| 409 Conflict 時の二重再取得 | 低 | 低 | 409 の再取得後に `onTaskStatusChanged` は呼ばない（既にローカル更新済み） |

## テスト計画

- [ ] プロジェクト選択後に実験開始→指示確認タブの「確認完了」ボタンが活性化されることを確認
- [ ] プロジェクト選択後に実験開始→実験記録タブの「記録」ボタンが活性化されることを確認
- [ ] 強制終了後も同様にボタン状態が更新されることを確認

## 承認記録
- **計画書提示日時**: 2026-05-14 09:11
- **承認日時**: （承認後に記入）
