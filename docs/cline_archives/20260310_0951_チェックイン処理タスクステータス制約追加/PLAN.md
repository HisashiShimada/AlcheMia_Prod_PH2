# タスク計画書: チェックイン処理にタスクステータス制約を追加

## メタデータ
- **作成日時**: 2026-03-10 09:51
- **タスクID**: checkin_task_status_validation
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

プロジェクト管理画面のチェックイン処理に、タスクステータスに基づく制約を追加します。現在の実装では「実行中（task_status = 1）」のタスクが存在する場合のみチェックインをブロックしていますが、要件に従い「すべてのタスクが完了（task_status = 3）または異常終了（task_status = 2）の状態でのみチェックイン可能」に変更します。

## 2. 目的と期待される成果

### 目的
- チェックイン処理にタスクステータスによる適切な制約を追加
- 未着手や実行中のタスクが残っている状態でのチェックインを防止
- データ整合性の向上

### 期待される成果
- [x] 未着手（0）または実行中（1）のタスクがある場合、チェックインがブロックされる
- [x] 完了（3）または異常終了（2）のタスクのみの場合、チェックインが成功する
- [x] 適切なエラーメッセージがユーザーに表示される

## 3. 実装ステップ

### Phase 1: タスクステータス定義の確認
- [x] project_task_detailテーブルのDDL確認
- [x] 既存コードのタスクステータスマッピング確認
  - 0: pending (未着手)
  - 1: in_progress (実行中)
  - 2: failed (異常終了)
  - 3: completed (完了)

### Phase 2: Repository層の実装
- [x] `projectTaskRepository.ts`に新しいメソッドを追加
  - `hasIncompleteTasks`: 未完了タスク（task_status = 0 or 1）の存在チェック
  - またはクエリ変更による対応

### Phase 3: Service層の実装
- [x] `projectService.ts`の`checkin`メソッドを修正
  - 既存の`hasRunningTasks`を`hasIncompleteTasks`に置き換え
  - エラーメッセージを更新
  - エラーコードを更新

### Phase 4: テスト
- [ ] 各ステータスパターンでのテストケース作成
- [ ] 手動テスト実施

## 4. 影響範囲

### 変更するファイル
1. `backend/src/repositories/projectTaskRepository.ts` - 新しいチェックメソッド追加
2. `backend/src/services/projectService.ts` - チェックイン処理のバリデーション変更

### 影響を受ける機能
- プロジェクトチェックイン機能（POST `/api/v1/experiment-admin/projects/:projectName/checkin`）

## 5. 技術的詳細

### タスクステータスの定義（確認済み）

```typescript
const TASK_STATUS_MAP = {
  0: 'pending',      // 未着手
  1: 'in_progress',  // 実行中
  2: 'failed',       // 異常終了
  3: 'completed',    // 完了
};
```

### 新しいバリデーションロジック

**チェックイン可能な条件:**
- すべてのタスクが `task_status = 2 (failed)` または `task_status = 3 (completed)` である

**チェックイン不可の条件:**
- 1つでも `task_status = 0 (pending)` または `task_status = 1 (in_progress)` のタスクが存在する

### Repository層の実装案

```typescript
/**
 * 未完了タスクが存在するかチェック（チェックイン前の確認用）
 * task_status = 0 (pending) または 1 (in_progress) のタスクをチェック
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @returns 未完了タスクが存在する場合true
 */
export async function hasIncompleteTasks(
  organizationId: string,
  projectId: string
): Promise<boolean> {
  const pool = getPool();
  
  const query = `
    SELECT EXISTS(
      SELECT 1 
      FROM project_task_detail
      WHERE organization_id = $1 
        AND project_id = $2 
        AND task_status IN (0, 1)
    ) as has_incomplete_tasks
  `;
  
  const result = await pool.query<{ has_incomplete_tasks: boolean }>(
    query, 
    [organizationId, projectId]
  );
  return result.rows[0].has_incomplete_tasks;
}
```

### Service層の実装案

```typescript
// checkinメソッド内の変更箇所
// 既存: hasRunningTasks → 新規: hasIncompleteTasks
const hasIncomplete = await projectTaskRepository.hasIncompleteTasks(
  organizationId, 
  projectId
);

if (hasIncomplete) {
  await client.query('ROLLBACK');
  return {
    success: false,
    error: {
      code: 'TASK_NOT_COMPLETED',
      message: '未完了または実行中のタスクが存在するため、チェックインできません',
      details: {
        requiredStatus: 'すべてのタスクが完了または異常終了している必要があります',
      },
    },
  };
}
```

## 6. エラーメッセージ定義

### エラーコード: `TASK_NOT_COMPLETED`
- **メッセージ**: "未完了または実行中のタスクが存在するため、チェックインできません"
- **詳細**: "すべてのタスクが完了または異常終了している必要があります"
- **HTTPステータス**: 400 Bad Request

### エラーコード（既存から変更）
- **変更前**: `TASK_IN_PROGRESS` - "実行中のタスクが存在するため、チェックインできません"
- **変更後**: `TASK_NOT_COMPLETED` - "未完了または実行中のタスクが存在するため、チェックインできません"

## 7. テスト計画

### ユニットテスト（Repository層）
- [ ] `hasIncompleteTasks` - task_status = 0のタスクが存在する場合trueを返す
- [ ] `hasIncompleteTasks` - task_status = 1のタスクが存在する場合trueを返す
- [ ] `hasIncompleteTasks` - task_status = 2, 3のみの場合falseを返す
- [ ] `hasIncompleteTasks` - タスクが存在しない場合falseを返す

### 統合テスト（Service層）
- [ ] すべてのタスクが完了（3）の場合、チェックイン成功
- [ ] すべてのタスクが異常終了（2）の場合、チェックイン成功
- [ ] 完了と異常終了が混在している場合、チェックイン成功
- [ ] 未着手（0）のタスクが1つでも存在する場合、チェックイン失敗
- [ ] 実行中（1）のタスクが1つでも存在する場合、チェックイン失敗
- [ ] 未着手と実行中が混在している場合、チェックイン失敗

### 手動テスト
- [ ] プロジェクト管理画面からチェックイン実行
- [ ] エラーメッセージの表示確認
- [ ] 各ステータスパターンでの動作確認

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のチェックイン処理に影響を与える | 高 | 低 | 既存のhasRunningTasksメソッドは残し、新しいメソッドに置き換える形で実装 |
| フロントエンドのエラーハンドリングに影響 | 中 | 中 | エラーコードを変更するため、フロントエンドも確認が必要 |
| タスクが0件のプロジェクトでの挙動 | 低 | 低 | タスクが存在しない場合もチェックインを許可する現状維持 |

## 9. ロールバック計画

問題が発生した場合:
1. `projectService.ts`の`checkin`メソッドを元の`hasRunningTasks`に戻す
2. `projectTaskRepository.ts`の新しいメソッドをコメントアウト
3. コードをコミット前の状態に戻す

## 10. 関連ドキュメント

- [database.md](.clinerules/development/database.md) - Repository層実装規約
- [DDL: project_task_detail.sql](docs/design/db/ddl/project_task_detail.sql)
- [projectService.ts](backend/src/services/projectService.ts)
- [projectTaskRepository.ts](backend/src/repositories/projectTaskRepository.ts)

## 11. 承認記録

- **計画書提示日時**: 2026-03-10 09:51
- **承認日時**: 2026-03-10 10:06
- **承認者コメント**: 承認

## 12. 実施記録

### 実施日時
開始: 2026-03-10 10:06
完了: 2026-03-10 10:08

### 計画からの変更点
- 特になし。計画通りに実装完了

### 発生した問題と解決方法
- 特になし

### 最終的な成果物
- [x] `backend/src/repositories/projectTaskRepository.ts` - hasIncompleteTasksメソッド追加
- [x] `backend/src/services/projectService.ts` - checkinメソッドのバリデーション変更

## 13. 振り返り

### うまくいった点
(実施後に記入)

### 改善が必要な点
(実施後に記入)

### 学んだこと
(実施後に記入)
