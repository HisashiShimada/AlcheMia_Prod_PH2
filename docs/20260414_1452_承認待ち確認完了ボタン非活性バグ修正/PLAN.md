# タスク計画書: 作業者画面 確認完了ボタン活性制御と追加配置

## メタデータ
- **作成日時**: 2026-04-14 17:38
- **タスクID**: instruction-confirm-button-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

作業者画面（指示確認タブ）において、確認完了ボタンの活性/非活性制御と配置位置を修正する。

## 目的と期待される成果

- [ ] タスク実行中（`executing_task`）のみ確認完了ボタンを活性化する
- [ ] 上記以外のステータス（`waiting_task`, `waiting_approval`, `completed` 等）では確認完了ボタンを非活性にする
- [ ] プロジェクト指示グループヘッダーに加え、タスク指示・トランジション指示グループヘッダーにも確認完了ボタンを追加する

## 現状分析

### 問題1: projectStatus が常に null

`InstructionConfirmationTab.tsx` 92行目にて、プロジェクトステータスがハードコードで `null` になっている。

```typescript
// 現状（問題）
const projectStatus: ProjectStatus | null = null; // 暫定: APIから取得できるまでnull
```

プロジェクト一覧は `ExperimentWorkerMenu.tsx` の `projects` stateで管理されており、選択中プロジェクトの `status` が取得可能。
この値を `InstructionConfirmationTab` に Props として渡す必要がある。

### 問題2: タスク・トランジション指示のグループヘッダーにボタンがない

| グループ | ヘッダー右にボタン | 各サブグループ内にボタン |
|---------|----------------|----------------------|
| プロジェクト指示 | ✅ あり | - |
| タスク指示 | ❌ なし | ✅ あり（タスクごと） |
| トランジション指示 | ❌ なし | ✅ あり（トランジションごと） |

## 実装ステップ

### Phase 1: ExperimentWorkerMenu.tsx の修正

- [ ] `projects` stateから選択中プロジェクトの `status` を取得する変数を追加
- [ ] `InstructionConfirmationTab` の Props に `projectStatus` を追加して渡す

### Phase 2: InstructionConfirmationTab.tsx の修正

- [ ] Props インターフェースに `projectStatus: ProjectStatus | null` を追加
- [ ] ハードコードされた `const projectStatus: ProjectStatus | null = null;` を削除
- [ ] `isTaskExecuting` 変数を導出（`projectStatus === 'executing_task'`）
- [ ] プロジェクト指示グループの確認完了ボタンの `disabled` に `!isTaskExecuting` を追加
- [ ] タスク指示グループヘッダーに確認完了ボタンを追加
- [ ] トランジション指示グループヘッダーに確認完了ボタンを追加

## 変更ファイル

1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - selectedProject の status を取得して Props として渡す
2. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - projectStatus Props 追加、ボタン活性制御、ヘッダーボタン追加

## ボタン活性/非活性ロジック（統一）

```typescript
disabled={
  readOnly ||                                  // 読み取り専用モード
  !isTaskExecuting ||                          // executing_task 以外は非活性
  confirmLoading ||                            // 処理中
  instructions.every((i) => i.isAcknowledged)  // 全て確認済み
}
```

## 各グループヘッダーに追加するボタン仕様

| グループ | ハンドラ | 対象指示 |
|---------|---------|---------|
| プロジェクト指示 | `handleConfirmProjectInstructions()` | `targetType === 'file'` の未確認 |
| タスク指示（新規追加） | `handleConfirmTaskInstructions(全タスク指示)` | `targetType === 'task'` の未確認 |
| トランジション指示（新規追加） | `handleConfirmTransitionInstructions(全トランジション指示)` | `targetType === 'transition'` の未確認 |

## リスク

| リスク | 対策 |
|--------|------|
| ProjectStatus の取得タイミング（API未取得時） | `projectStatus === null` の場合は非活性のまま（安全側に倒す） |
| 全確認済みの場合にボタンを非活性にする既存ロジックとの整合 | `!isTaskExecuting` 条件と `every(isAcknowledged)` 条件を `OR` で組み合わせる |

## テスト計画

### 手動テスト（ブラウザ動作確認）

#### ボタン活性/非活性の確認
- [ ] プロジェクトが `executing_task`（タスク実行中）の状態で作業指示確認タブを開いた際、プロジェクト指示・タスク指示・トランジション指示の各グループヘッダーの確認完了ボタンが **活性** になること
- [ ] プロジェクトが `waiting_task`（タスク実行待ち）の状態では、すべての確認完了ボタンが **非活性** になること
- [ ] プロジェクトが `waiting_approval`（承認待ち）の状態では、すべての確認完了ボタンが **非活性** になること



## 承認記録

- **計画書提示日時**: 2026-04-14 17:38
- **承認日時**:
- **承認者コメント**:
