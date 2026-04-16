# タスク計画書: 承認依頼時のプロジェクトステータス更新バグ修正

## メタデータ
- **作成日時**: 2026-04-15 11:26
- **タスクID**: fix-approval-project-status-update
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者画面で「承認依頼」ボタンを押下してもプロジェクト選択コンボボックスのステータス表示が「タスク実行中」のままになる不具合を修正する。

バックエンドの `projectService.requestApproval()` が `project_task` テーブルのタスクステータスは更新しているが、`project` テーブルの `project_status` を `3`（タスク結果レビュー待ち＝承認待ち）に更新していないことが原因。

## 目的と期待される成果

### 目的
承認依頼送信後に `project.project_status` を `3` に更新し、コンボボックスに「承認待ち」が正しく表示されるようにする。

### 期待される成果
- [ ] 承認依頼ボタン押下後、コンボボックスのプロジェクト表示が `"プロジェクト名 - タスク結果レビュー待ち"` に変わる
- [ ] バックエンドDBの `project.project_status` が `2 → 3` に更新される
- [ ] 既存の `project_task.task_status` の更新（IN_PROGRESS → REVIEW_WAITING）は引き続き正常に動作する

## 原因詳細

### 呼び出しフロー

```
承認依頼ボタン押下
  ↓
PATCH /api/v1/projects/:id/approval-request
  ↓
projectController.requestApproval()
  ↓
projectService.requestApproval(projectId, comment, organizationId, userId)
  ├─ project_status === 2 のみ許可（検証は正常）
  ├─ project_task.task_status を IN_PROGRESS → REVIEW_WAITING に更新 ✅
  └─ ❌ project.project_status = 3 への UPDATE が存在しない（←バグ箇所）

  ↓（フロントエンドへ成功レスポンスを返す）

GET /api/v1/projects/worker-accessible（再取得）
  ↓
project.project_status は 2 のまま → コンボボックスに「タスク実行中」が表示される
```

### ステータス定義
| 値 | 名称 |
|----|------|
| 0 | プロジェクト計画中 |
| 1 | タスク実行待ち |
| 2 | タスク実行中 |
| **3** | **タスク結果レビュー待ち（承認待ち）** |
| 4 | 完了 |
| 5 | 異常終了 |

## 実装ステップ

- [ ] `backend/src/services/projectService.ts` の `requestApproval()` に `project.project_status = 3` への UPDATE を追加

## 変更ファイル

1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - `handleApprovalRequest()` の `finally` ブロックでプロジェクト一覧を必ず再取得するように修正

## 技術的詳細

### DB操作規約について

`.clinerules/development/database.md` の規約に従い、以下のルールを遵守する：

1. **DB操作はRepository層に集約** — Service層でSQLを直接書かない
2. **Updateは既存レコード取得後に実行** — `getById()` で取得 → 更新パラメータを反映 → `update()` を呼ぶ
3. `projectRepository.update(data: Project)` が既に実装済みのため、これを使用する

### 修正箇所

**ファイル:** `backend/src/services/projectService.ts`

`requestApproval()` メソッド内、`project_task.task_status` の一括更新処理の後に、以下の手順でRepository層経由で更新する。

```typescript
// 1. 既存のプロジェクトレコードを取得
const existingProject = await projectRepository.getById(projectId, organizationId);
if (!existingProject) {
  // エラーハンドリング（既に存在確認済みなので通常は発生しない）
  throw new Error('Project not found');
}

// 2. 更新パラメータを既存Objectに反映
const updatedProject = {
  ...existingProject,
  project_status: 3,  // タスク結果レビュー待ち（承認待ち）
};

// 3. Repository層のupdateメソッドを呼ぶ（内部でCURRENT_TIMESTAMPが自動設定）
await projectRepository.update(updatedProject);
```

`projectRepository.update()` はすでに以下を実装済み：
- `Object.keys(data)` で動的にSET句を構築
- `organization_id` フィルタ必須（マルチテナント分離）
- `update_at = CURRENT_TIMESTAMP` を自動付与
- Parameterized Queryでインジェクション対策済み

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のチェックイン処理との整合性 | 中 | 低 | checkin時に project_status が 2 に戻ることを確認 |
| 同一プロジェクトへの同時操作 | 低 | 低 | SELECT FOR UPDATE による排他ロックが既に実装済み |

## テスト計画

- [ ] 承認依頼ボタン押下後、コンボボックスが「タスク結果レビュー待ち」に変わることを目視確認
- [ ] DBの `project.project_status` が `3` になっていることを確認
- [ ] ステータス 1・2 のプロジェクトで承認依頼後も他プロジェクトのステータス表示に影響がないことを確認

## 承認記録

- **計画書提示日時**: 2026-04-15 11:26
- **承認日時**: 
- **承認者コメント**: 
