# タスク計画書: タスク保存処理を削除→INSERT方式に変更

## メタデータ
- **作成日時**: 2026-03-09 10:28
- **タスクID**: task_save_delete_insert
- **優先度**: 高
- **推定工数**: 1.5時間

## 1. タスク概要

プロジェクト管理画面のタスク情報保存処理を、UPSERT方式から「削除→INSERT」方式に変更します。
現在はUPSERTを利用しているため、主キーの一部である`experiment_order`の変更ができません。
保存時に`worker_linked_flg=false`のタスクを全削除してから、画面選択中のタスクを新規INSERTすることで、順序変更を可能にします。

## 2. 目的と期待される成果

### 目的
- タスクの順序（experiment_order）変更を可能にする
- `worker_linked_flg=true`（作業者に連携済み）のタスクは保護する
- データ整合性を維持したまま、柔軟なタスク編集を実現する

### 期待される成果
- [ ] worker_linked_flg=falseのタスクの順序変更が可能になる
- [ ] worker_linked_flg=trueのタスクは削除されず保護される
- [ ] トランザクション内で削除→INSERTが実行され、データ整合性が保たれる

## 3. 実装ステップ

### Phase 1: Repository層の実装
- [ ] `projectTaskRepository.ts`に型定義を追加
  - `TaskInsertData`インターフェース追加（TaskUpsertData + workerLinkedFlg）
- [ ] `projectTaskRepository.ts`に削除メソッドを追加
  - `deleteByProjectAndWorkerLinkedFlg(t, organizationId, projectId, workerLinkedFlg)`
  - worker_linked_flgで絞り込んでDELETEを実行
- [ ] `projectTaskRepository.ts`にバッチINSERTメソッドを追加
  - `batchInsertTasks(t, organizationId, projectId, userId, tasks)`
  - TaskInsertDataをProjectTask型に変換してINSERT
  - タイムスタンプ・ユーザーIDを自動設定
- [ ] `projectTaskRepository.ts`から不要なメソッドを削除
  - `batchUpsertTasks` メソッド削除（使用箇所なし）
- [ ] 不要なSQLファイルを削除
  - `backend/src/sql/queries/project_task/upsert.sql` 削除（使用箇所なし）

### Phase 2: Service層の修正
- [ ] `taskRegistrationService.ts`の`saveTaskRegistration`メソッドを修正
  - `batchUpsertTasks`呼び出しを削除→INSERT方式に置き換え
  - `deleteByProjectAndWorkerLinkedFlg`で削除処理を追加
  - `batchInsertTasks`で新規INSERT処理を追加
  - トランザクション順序を調整（削除→INSERT→detail→transition→template）

### Phase 3: テスト
- [ ] worker_linked_flg=falseのタスク削除確認
- [ ] worker_linked_flg=trueのタスク保護確認
- [ ] 順序変更が正しく反映されることを確認
- [ ] エラーハンドリングの確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/repositories/projectTaskRepository.ts`
   - 削除メソッド追加: `deleteByProjectAndWorkerLinkedFlg`
   - バッチINSERTメソッド追加: `batchInsertTasks`
   - 不要なメソッド削除: `batchUpsertTasks`（使用箇所なし）

2. `backend/src/services/taskRegistrationService.ts`
   - `saveTaskRegistration`メソッドの処理フロー変更
   - UPSERTから削除→INSERT方式に変更

### 新規作成するファイル
なし

### 削除するファイル
1. `backend/src/sql/queries/project_task/upsert.sql`
   - `batchUpsertTasks`メソッド専用のSQLファイル（メソッド削除により不要）

### 影響を受ける機能
- プロジェクト管理画面 > タスク登録タブ > 保存処理
- タスクの順序変更機能（新たに可能になる）

## 5. 技術的詳細

### 型定義の追加
```typescript
/**
 * タスクデータの型定義（バッチINSERT用）
 * TaskUpsertDataを拡張してworkerLinkedFlgを追加
 */
export interface TaskInsertData {
  methodId: string;
  experimentOrder: number;
  experimentCondition: number;
  trialCount: number;
  workerLinkedFlg: boolean;
}
```

### データベースカラムマッピング
| TaskInsertDataフィールド | project_taskカラム | 値の設定方法 |
|-------------------------|-------------------|-------------|
| methodId | method_id | リクエストから |
| experimentOrder | experiment_order | リクエストから |
| experimentCondition | experiment_condition | リクエストから |
| trialCount | attempts_count | リクエストから |
| workerLinkedFlg | worker_linked_flg | リクエストから（デフォルト: false） |
| - | organization_id | 引数から |
| - | project_id | 引数から |
| - | create_user_id | 引数（userId）から |
| - | create_at | new Date()で自動設定 |
| - | update_user_id | 引数（userId）から |
| - | update_at | new Date()で自動設定 |

### 削除処理の実装
```typescript
```typescript
/**
 * worker_linked_flgの値で絞り込んでタスクを削除
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param workerLinkedFlg 削除対象のworker_linked_flg値
 */
export async function deleteByProjectAndWorkerLinkedFlg(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  workerLinkedFlg: boolean
): Promise<void> {
  const query = `
    DELETE FROM project_task
    WHERE organization_id = $1 
      AND project_id = $2 
      AND worker_linked_flg = $3
  `;
  
  await t.none(query, [organizationId, projectId, workerLinkedFlg]);
}
```
```

### バッチINSERT処理の実装
```typescript
```typescript
/**
 * タスクの一括INSERT（トランザクション内）
 * 
 * @param t pg-promiseトランザクションオブジェクト
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param userId ユーザーID
 * @param tasks タスクデータ配列
 */
export async function batchInsertTasks(
  t: ITask<unknown>,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: TaskInsertData[]
): Promise<void> {
  const now = new Date();
  
  for (const task of tasks) {
    // TaskInsertDataをProjectTask型に変換
    const projectTask: ProjectTask = {
      organization_id: organizationId,
      project_id: projectId,
      method_id: task.methodId,
      experiment_order: task.experimentOrder,
      experiment_condition: task.experimentCondition,
      attempts_count: task.trialCount,
      worker_linked_flg: task.workerLinkedFlg,
      create_user_id: userId,
      create_at: now,
      update_user_id: userId,
      update_at: now
    };
    
    // 動的にINSERTクエリを構築（DB操作規約に準拠）
    const columns = Object.keys(projectTask);
    const values = columns.map(col => projectTask[col as keyof ProjectTask]);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    
    const query = `
      INSERT INTO project_task (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    
    await t.none(query, values);
  }
}
```
```

### Service層の処理フロー変更
```typescript
// 変更前: UPSERT
await projectTaskRepository.batchUpsertTasks(t, organizationId, project.project_id, userId, requestData.tasks);

// 変更後: 削除→INSERT
// 1. worker_linked_flg=falseのタスクを削除
await projectTaskRepository.deleteByProjectAndWorkerLinkedFlg(
  t,
  organizationId,
  project.project_id,
  false
);

// 2. リクエストのタスクを新規INSERT（worker_linked_flg=falseで登録）
await projectTaskRepository.batchInsertTasks(
  t,
  organizationId,
  project.project_id,
  userId,
  requestData.tasks.map(task => ({
    methodId: task.methodId,
    experimentOrder: task.experimentOrder,
    experimentCondition: task.experimentCondition,
    trialCount: task.trialCount,
    workerLinkedFlg: task.workerLinkedFlg || false
  }))
);
```

### アーキテクチャ上の考慮事項
- トランザクション内で削除→INSERTを実行するため、整合性が保たれる
- worker_linked_flg=trueのタスクは削除対象外のため、作業者に連携済みのタスクは保護される
- 主キー制約: (organization_id, project_id, method_id, experiment_order)のため、新規INSERTで順序を自由に設定可能

### セキュリティ考慮事項
- [ ] organization_idでのテナント分離を維持
- [ ] トランザクション内で実行し、ロールバックを可能にする
- [ ] worker_linked_flg=trueのタスクは保護（削除しない）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランザクション失敗時のデータ不整合 | 高 | 低 | pg-promiseのトランザクション機能を使用し、エラー時は自動ロールバック |
| worker_linked_flg=trueのタスクも誤って削除 | 高 | 低 | WHERE句でworker_linked_flg=falseを明示的に指定 |
| 削除とINSERTの間に他の処理が割り込む | 中 | 低 | トランザクション内で実行し、排他制御を確保 |
| 主キー重複エラー | 中 | 低 | 削除後のINSERTなので基本的に発生しないが、エラーハンドリングで対応 |

## 7. テスト計画

### 単体テスト
- [ ] deleteByProjectAndWorkerLinkedFlgメソッドのテスト
  - worker_linked_flg=falseのタスクのみ削除されること
  - worker_linked_flg=trueのタスクは削除されないこと
- [ ] batchInsertTasksメソッドのテスト
  - 複数タスクが正しくINSERTされること
  - トランザクション内で実行されること

### 統合テスト
- [ ] saveTaskRegistrationメソッドのテスト
  - 削除→INSERT→detail→transition→template の順序で実行されること
  - トランザクションが正しくコミットされること
  - エラー時にロールバックされること

### 手動テスト
- [ ] タスクの順序変更が正しく保存されること
- [ ] worker_linked_flg=trueのタスクは削除されないこと
- [ ] 新規タスクを追加できること
- [ ] 既存タスクの削除ができること

## 8. ロールバック計画

問題が発生した場合は、以下の手順でロールバックします：

1. `taskRegistrationService.ts`を元のUPSERT方式に戻す
2. `projectTaskRepository.ts`の新規メソッドは残したままでも影響なし（未使用となるだけ）
3. 必要に応じてデータベースのバックアップから復元

## 9. 関連ドキュメント

- [project_task DDL](../../design/db/ddl/project_task.sql)
- [データベース操作規約](../../.clinerules/development/database.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

## 10. 承認記録

- **計画書提示日時**: 2026-03-09 10:28
- **承認日時**: 2026-03-09 10:50
- **承認者コメント**: 実装を開始して

## 11. 実施記録

### 実施日時
開始: 2026-03-09 10:50
完了: 2026-03-09 10:54

### 計画からの変更点
なし（計画通りに実装完了）

### 発生した問題と解決方法
1. **型定義エラー**: SaveTaskRegistrationRequest型にworkerLinkedFlgフィールドが不足
   - 解決: backend/src/types/taskRegistration.tsに`workerLinkedFlg?: boolean`を追加

### 最終的な成果物
- [x] Repository層の削除・INSERTメソッド実装
  - TaskInsertData型定義追加
  - deleteByProjectAndWorkerLinkedFlg()メソッド追加
  - batchInsertTasks()メソッド追加
  - batchUpsertTasks()メソッド削除
  - upsert.sqlファイル削除
- [x] Service層の処理フロー変更
  - saveTaskRegistration()をUPSERTから削除→INSERT方式に変更
- [x] 型定義の更新
  - SaveTaskRegistrationRequest型にworkerLinkedFlgを追加

## 12. 振り返り

### うまくいった点
（未記入）

### 改善が必要な点
（未記入）

### 学んだこと
（未記入）
