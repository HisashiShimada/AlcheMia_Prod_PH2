# タスク計画書: タスク保存時のworker_linked_flg初期値設定

## メタデータ
- **作成日時**: 2026-03-06 17:26
- **タスクID**: task_save_worker_linked_flg
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

プロジェクト管理画面でタスク情報を保存時に、`project_task.worker_linked_flg`を`false`（未連携）で初期登録するよう修正します。

## 2. 目的と期待される成果

### 目的
タスク登録時に作業者連携フラグを適切な初期値（false）で設定し、後続の作業者割り当てワークフローを正常に機能させる。

### 期待される成果
- [ ] タスク保存時に`worker_linked_flg = false`で登録される
- [ ] 既存レコード更新時も`worker_linked_flg`が保持される（変更しない）

## 3. 実装ステップ

### Phase 1: SQL修正
- [x] `backend/src/sql/queries/project_task/upsert.sql`を修正
  - INSERT句に`worker_linked_flg`カラムを追加
  - 初期値として`false`を設定
  - UPDATE句では`worker_linked_flg`を更新対象から除外（既存値を保持）

### Phase 2: Repository修正
- [x] `backend/src/repositories/projectTaskRepository.ts`の`batchUpsertTasks`関数を修正
  - SQLパラメータに`false`を追加（worker_linked_flg用）

## 4. 影響範囲

### 変更するファイル
1. `backend/src/sql/queries/project_task/upsert.sql` - UPSERTクエリの修正
2. `backend/src/repositories/projectTaskRepository.ts` - パラメータ追加

### 影響を受ける機能
- プロジェクト管理画面のタスク登録機能
  - 影響: タスク保存時に`worker_linked_flg`が必ず`false`で初期化される

## 5. 技術的詳細

### 修正内容

#### 1. upsert.sql
```sql
-- INSERT時
INSERT INTO project_task (
  organization_id,
  project_id,
  method_id,
  experiment_order,
  experiment_condition,
  attempts_count,
  worker_linked_flg,  -- 追加
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, CURRENT_TIMESTAMP)

-- UPDATE時
DO UPDATE SET
  experiment_condition = EXCLUDED.experiment_condition,
  attempts_count = EXCLUDED.attempts_count,
  -- worker_linked_flgは更新しない（既存値を保持）
  update_user_id = EXCLUDED.update_user_id,
  update_at = CURRENT_TIMESTAMP
```

#### 2. projectTaskRepository.ts
```typescript
// パラメータ順序
await t.none(sqlQuery, [
  organizationId,     // $1
  projectId,          // $2
  task.methodId,      // $3
  task.experimentOrder, // $4
  task.experimentCondition, // $5
  task.trialCount,    // $6
  false,              // $7 - worker_linked_flg (追加)
  userId,             // $8 - create_user_id
  userId              // $9 - update_user_id
]);
```

### アーキテクチャ上の考慮事項
- UPSERTの動作により、新規レコードは`false`、既存レコードは現在の値を保持
- 作業者割り当て機能で`worker_linked_flg`を`true`に更新する処理は別途実装されている前提

### セキュリティ考慮事項
- [x] 認証・認可への影響: なし（既存の認証ミドルウェアが適用済み）
- [x] データ保護への影響: なし
- [x] マルチテナント分離への影響: なし（organization_idフィルタは既存実装で適用済み）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存レコードのworker_linked_flgがリセットされる | 高 | 低 | UPDATE句から除外することで既存値を保持 |
| パラメータ順序のミス | 中 | 低 | テストで検証 |

## 7. テスト計画

### ユニットテスト
- [ ] `projectTaskRepository.batchUpsertTasks`のテスト
  - 新規INSERT時に`worker_linked_flg = false`で登録されることを確認
  - 既存レコード更新時に`worker_linked_flg`が保持されることを確認

### 統合テスト
- [ ] タスク登録APIのテスト
  - タスク新規保存時に`worker_linked_flg = false`で登録
  - タスク更新時に`worker_linked_flg`が変更されないことを確認

### 手動テスト
- [ ] プロジェクト管理画面でタスク登録
  - DBを確認し、`worker_linked_flg = false`で登録されていることを確認

## 8. ロールバック計画

修正ファイルをGit管理しているため、問題が発生した場合は以下の手順でロールバック：
1. `git revert <commit-hash>`
2. バックエンドを再起動

## 9. 関連ドキュメント

- [project_task.sql](../../design/db/ddl/project_task.sql) - テーブル定義
- [taskRegistrationService.ts](../../../backend/src/services/taskRegistrationService.ts) - タスク登録ビジネスロジック
- [projectTaskRepository.ts](../../../backend/src/repositories/projectTaskRepository.ts) - Repository実装

## 10. 承認記録

- **計画書提示日時**: 2026-03-06 17:26
- **承認日時**: 2026-03-06 17:28
- **承認者コメント**: 承認（実装開始）

## 11. 実施記録

### 実施日時
開始: 2026-03-06 17:26
完了: 2026-03-06 17:29

### 計画からの変更点
なし。計画通りに実装完了。

### 発生した問題と解決方法
問題なし。

### 最終的な成果物
- [x] `backend/src/sql/queries/project_task/upsert.sql` - 修正完了
- [x] `backend/src/repositories/projectTaskRepository.ts` - 修正完了

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
