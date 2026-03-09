# タスク計画書: taskRegistrationService.ts リファクタリング

## メタデータ
- **作成日時**: 2026-03-06 16:23
- **タスクID**: taskRegistrationService_refactoring
- **優先度**: 中
- **推定工数**: 3-4時間

## 1. タスク概要

`backend/src/services/taskRegistrationService.ts`を以下の方針でリファクタリングする：
1. 直接的なSQLクエリをRepositoryパターンに移行
2. 従来のpgクライアントからpg-promiseに移行
3. 複雑なSQLはSQLファイルとして外部化

## 2. 目的と期待される成果

### 目的
- コードの保守性向上（SQLをRepository層に集約）
- 規約準拠（`.clinerules/development/database.md`に従う）
- pg-promiseの一貫した使用

### 期待される成果
- [x] プライベート関数内のSQL直接実行をRepository経由に変更
- [x] pg-promiseのトランザクション方式に移行
- [x] 複雑なSQLをSQLファイルとして外部化
- [x] 既存のテストが引き続き成功する

## 3. 実装ステップ

### Phase 1: 現状分析と設計
- [x] taskRegistrationService.tsの構造を分析
- [x] 以下のプライベート関数を特定：
  - `upsertProjectTasks()` - project_taskテーブルへのUPSERT
  - `deleteAndInsertTaskDetails()` - project_task_detailテーブルへの削除+INSERT
  - `deleteAndInsertTransitionData()` - transition_dataテーブルへの削除+INSERT（既にRepository使用）
  - `deleteAndInsertTemplateData()` - template_dataテーブルへの削除+INSERT（既にRepository使用）
- [x] 必要なRepositoryメソッドを設計

### Phase 2: projectTaskRepositoryの拡張
- [ ] `projectTaskRepository.ts`に以下のメソッドを追加：
  - `upsertTask(client, data)` - 単一タスクのUPSERT
  - `batchUpsertTasks(client, organizationId, projectId, userId, tasks)` - 複数タスクのUPSERT
- [ ] SQLファイルを作成：
  - `backend/src/sql/queries/project_task/upsert.sql`

### Phase 3: projectTaskDetailRepositoryの作成
- [ ] `projectTaskDetailRepository.ts`を新規作成
- [ ] 以下のメソッドを実装：
  - `deleteByProject(client, organizationId, projectId)` - プロジェクト単位での削除
  - `batchInsert(client, organizationId, projectId, userId, tasks)` - 複数レコードのINSERT
- [ ] SQLファイルを作成：
  - `backend/src/sql/queries/project_task_detail/deleteByProject.sql`
  - `backend/src/sql/queries/project_task_detail/insert.sql`

### Phase 4: taskRegistrationServiceの修正
- [ ] インポートを更新
  - `getPgp()`を追加
  - 新規Repositoryメソッドをimport
- [ ] `saveTaskRegistration()`のトランザクション処理を修正
  - `pool.connect()` → `pgp.tx()`
  - `client.query('BEGIN/COMMIT')` → pgp-promiseの自動管理
- [ ] プライベート関数を修正
  - `upsertProjectTasks()` → `projectTaskRepository.batchUpsertTasks()`を呼び出し
  - `deleteAndInsertTaskDetails()` → `projectTaskDetailRepository`のメソッドを呼び出し

### Phase 5: テストと動作確認
- [ ] 既存のテストが成功することを確認
- [ ] 手動テスト：タスク登録APIの動作確認
- [ ] トランザクションのロールバック動作を確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/taskRegistrationService.ts` - メイン修正対象
2. `backend/src/repositories/projectTaskRepository.ts` - メソッド追加
3. `backend/src/repositories/projectTaskDetailRepository.ts` - 新規作成
4. `backend/src/sql/queries/project_task/upsert.sql` - 新規作成
5. `backend/src/sql/queries/project_task_detail/deleteByProject.sql` - 新規作成
6. `backend/src/sql/queries/project_task_detail/insert.sql` - 新規作成

### 新規作成するファイル
1. `backend/src/repositories/projectTaskDetailRepository.ts` - project_task_detailテーブル用Repository
2. `backend/src/sql/queries/project_task_detail/deleteByProject.sql`
3. `backend/src/sql/queries/project_task_detail/insert.sql`
4. `backend/src/sql/queries/project_task/upsert.sql`

### 影響を受ける機能
- タスク登録保存API（`POST /api/v1/experiment_admin/project/:projectName/task-registration`）
- トランザクション処理の仕組み（pgからpg-promiseへ）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- pg-promise: トランザクション管理とSQLクエリ実行
- loadSqlFile: SQLファイルの読み込み（既存ユーティリティ）

### アーキテクチャ上の考慮事項

#### 1. pg-promiseのトランザクション方式
```typescript
// 従来方式（pg）
const pool = getPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // 処理
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
} finally {
  client.release();
}

// 新方式（pg-promise）
const pgp = getPgp();
await pgp.tx(async (t) => {
  // 処理（自動BEGIN/COMMIT/ROLLBACK）
  // Repository層では引数として t（ITask）を受け取る
});
```

#### 2. Repository層でのクライアント引数
```typescript
// Repositoryメソッドのシグネチャ
export async function batchUpsertTasks(
  t: ITask<unknown>, // pg-promiseのトランザクションオブジェクト
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: TaskData[]
): Promise<void> {
  // t.any(), t.none()などを使用
}
```

#### 3. SQL外部化の基準
- 複雑なUPSERT文 → SQLファイル化
- シンプルなINSERT/DELETE → SQLファイル化（統一性のため）

### セキュリティ考慮事項
- [x] organization_idフィルタは維持
- [x] Parameterized Queriesを使用
- [x] トランザクション分離レベルは既定値（READ COMMITTED）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| pg-promiseのトランザクション動作が異なる | 高 | 低 | トランザクションのテストを実施、ロールバック動作を確認 |
| Repository層のメソッド設計ミス | 中 | 中 | 既存のinstructionRepositoryを参考に、同様のパターンで実装 |
| SQLファイルのパス解決エラー | 低 | 低 | loadSqlFile()は既存実装済み、同パターンを踏襲 |
| 既存テストの失敗 | 中 | 中 | Phase 5で必ずテスト実行、問題があれば修正 |

## 7. テスト計画

### ユニットテスト
- [ ] `projectTaskRepository.batchUpsertTasks()` のテスト
- [ ] `projectTaskDetailRepository.deleteByProject()` のテスト
- [ ] `projectTaskDetailRepository.batchInsert()` のテスト

### 統合テスト
- [ ] `saveTaskRegistration()` の正常系テスト
- [ ] トランザクションロールバックのテスト
- [ ] エラーハンドリングのテスト

### 手動テスト
- [ ] タスク登録画面からの保存動作
- [ ] project_task, project_task_detailテーブルのデータ確認
- [ ] エラー時のロールバック確認

## 8. ロールバック計画

問題が発生した場合は、Gitで以下をrevertする：
1. `taskRegistrationService.ts` の変更
2. 新規作成したRepositoryファイル
3. 新規作成したSQLファイル

元の実装（pgクライアント直接使用）に戻す。

## 9. 関連ドキュメント

- [データベース操作規約](../../.clinerules/development/database.md)
- [instructionRepository.ts](../../backend/src/repositories/instructionRepository.ts) - 参考実装
- [departmentRepository.ts](../../backend/src/repositories/departmentRepository.ts) - pg-promise使用例

## 10. 承認記録

- **計画書提示日時**: 2026-03-06 16:23
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
（実施後に記録）

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
