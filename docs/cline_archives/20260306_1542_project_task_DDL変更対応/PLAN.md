# タスク計画書: project_task テーブルDDL変更対応

## メタデータ
- **作成日時**: 2026-03-06 15:42
- **タスクID**: project_task_ddl_update
- **優先度**: 高
- **推定工数**: 3-4時間

## 1. タスク概要

project_task テーブルのDDL変更（docs/design/db/ddl/project_task.sql）に伴い、既存のバックエンド処理を修正する。

### DDL変更内容
1. **主キーに `experiment_order` を追加**: `(organization_id, project_id, method_id, experiment_order)`
2. **`task_name` カラムを削除**
3. **`worker_linked_flg` カラムを追加**（BOOLEAN）
4. **データ型を明確化**: NUMERIC(2,0)、NUMERIC(3,0)

## 2. 目的と期待される成果

### 目的
DDL変更に合わせて、バックエンドの型定義、Repository層、Service層を修正し、アプリケーションの整合性を保つ。

### 期待される成果
- [x] DDL変更内容の調査完了
- [x] 型定義（database.ts）の修正完了
- [x] Repository層（projectTaskRepository.ts）の修正完了
- [x] SQLファイル（tasks/findByProjectMethodTaskNo.sql）の修正完了
- [x] task_name削除への対応完了（progressService.ts）
- [ ] 全修正箇所のテスト完了（手動テスト推奨）

## 3. 実装ステップ

### Phase 1: 型定義の修正
- [ ] `backend/src/types/database.ts` の `ProjectTask` 型を修正
  - [ ] `worker_linked_flg?: boolean | null;` を追加
  - [ ] JSDocコメントの主キー情報を更新: `(organization_id, project_id, method_id, experiment_order)`

### Phase 2: Repository層の修正
- [ ] `backend/src/repositories/projectTaskRepository.ts` を修正
  - [ ] ファイル冒頭のDDLコメントを更新: `主キー: (organization_id, project_id, method_id, experiment_order)`
  - [ ] `findByPrimaryKey` メソッドのシグネチャを変更
    - パラメータに `experimentOrder: number` を追加
    - WHERE句に `experiment_order = $4` を追加
  - [ ] `update` メソッドの修正
    - `whereColumns` 配列に `'experiment_order'` を追加
  - [ ] 既存の呼び出し箇所を確認・修正（必要に応じて）

### Phase 3: SQLファイルの確認・修正
- [ ] `backend/src/sql/queries/tasks/findByProjectMethodTaskNo.sql` の確認
  - [ ] task_name カラムの使用状況を確認
  - [ ] 必要に応じてJOINまたは別の方法でメソッド名を取得するように修正

### Phase 4: task_name削除への対応
- [ ] `backend/src/types/progress.ts` の `TaskWithProject` 型を確認
  - [ ] task_name フィールドの扱いを決定
  - [ ] メソッド名として使用されている場合、取得元を変更
- [ ] `backend/src/services/progressService.ts` の修正
  - [ ] `task.task_name` の使用箇所を特定
  - [ ] メソッド名の取得方法を変更（MAIMLから取得するか、別テーブルとのJOINで取得）

### Phase 5: 影響範囲の確認
- [ ] taskRegistrationService.ts の動作確認
  - [ ] upsertProjectTasks関数がexperiment_orderを正しく使用しているか確認
  - [ ] worker_linked_flgの初期値設定が必要か確認
- [ ] その他のproject_task使用箇所の確認
  - [ ] findByProject, countByProject, hasRunningTasksなどの動作確認

### Phase 6: テスト実施
- [ ] 単体テストの更新・実行
- [ ] 統合テストの実行
- [ ] タスク登録機能の動作確認
- [ ] 進捗取得機能の動作確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/database.ts` - ProjectTask型定義
2. `backend/src/repositories/projectTaskRepository.ts` - Repository層
3. `backend/src/sql/queries/tasks/findByProjectMethodTaskNo.sql` - SQLファイル（要確認）
4. `backend/src/types/progress.ts` - TaskWithProject型（要確認）
5. `backend/src/services/progressService.ts` - task_name使用箇所の修正

### 影響を受ける機能
- タスク登録機能（TaskRegistrationTab）
- 進捗取得機能（ProgressService）
- タスク一覧表示機能
- タスク検索機能

## 5. 技術的詳細

### 5.1 型定義の修正内容

**backend/src/types/database.ts**
```typescript
/**
 * project_taskテーブルの型定義
 * 
 * @remarks
 * この型は project_task テーブルのスキーマに対応しています。
 * DDL: docs/design/db/ddl/project_task.sql
 * 主キー: (organization_id, project_id, method_id, experiment_order)
 */
export interface ProjectTask {
  /** 組織ID（主キー） */
  organization_id: string;
  
  /** プロジェクトID（主キー） */
  project_id: string;
  
  /** メソッドID（主キー） */
  method_id: string;
  
  /** 実験順序（主キー、NUMERIC(2,0)） */
  experiment_order?: number | null;
  
  /** 実験条件（NUMERIC(2,0)） */
  experiment_condition?: number | null;
  
  /** 試行回数（NUMERIC(3,0)） */
  attempts_count?: number | null;
  
  /** 作業者連携済フラグ */
  worker_linked_flg?: boolean | null;
  
  /** 作成者ユーザID */
  create_user_id?: string;
  
  /** 作成日時 */
  create_at?: Date;
  
  /** 更新者ユーザID */
  update_user_id?: string;
  
  /** 更新日時 */
  update_at?: Date;
}
```

### 5.2 Repository層の修正内容

**backend/src/repositories/projectTaskRepository.ts**

```typescript
/**
 * 特定のタスクを取得（主キーで検索）
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @param experimentOrder 実験順序
 * @returns タスク（存在しない場合はnull）
 */
export async function findByPrimaryKey(
  organizationId: string,
  projectId: string,
  methodId: string,
  experimentOrder: number
): Promise<ProjectTask | null> {
  const pool = getPool();
  
  const query = `
    SELECT *
    FROM project_task
    WHERE organization_id = $1 
      AND project_id = $2 
      AND method_id = $3
      AND experiment_order = $4
  `;
  
  const result = await pool.query<ProjectTask>(
    query, 
    [organizationId, projectId, methodId, experimentOrder]
  );
  return result.rows[0] || null;
}

/**
 * タスクをUpdate（規約準拠: テーブル型Objectから動的にクエリ構築）
 * 
 * @param data 更新するタスクデータ（テーブル型Object）
 * @returns 更新されたタスク
 */
export async function update(data: ProjectTask): Promise<ProjectTask> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（主キー）
  const whereColumns = ['organization_id', 'project_id', 'method_id', 'experiment_order'];
  const whereValues = whereColumns.map(col => data[col as keyof ProjectTask]);
  
  // 更新するカラム（主キーを除外）
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && data[key as keyof ProjectTask] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col as keyof ProjectTask]);
  
  // SET句を構築
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築
  const whereClause = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築
  const query = `
    UPDATE project_task
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query<ProjectTask>(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error(`No rows updated in project_task table`);
  }
  
  return result.rows[0];
}
```

### 5.3 task_name削除への対応方針

#### 問題点
- `project_task.task_name` カラムが削除されたが、progressService.ts で使用されている
- TaskWithProject型で task_name を返すことが期待されている
- task_name はメソッド名として使用されている

#### 解決策（2つのオプション）

**オプション1: MAIMLファイルからメソッド名を取得（推奨）**
- 利点: データベース構造を変更する必要がない
- 欠点: 追加のMAIMLファイル読み込みが必要
- 実装: progressService.ts 内で既にMAIMLをパースしているため、そこからメソッド名を取得

**オプション2: method マスターテーブルを作成**
- 利点: パフォーマンスが良い
- 欠点: 新しいテーブル作成が必要、データ同期の必要性
- 実装: method テーブル (organization_id, method_id, method_name) を作成し、JOINする

#### 採用する解決策: オプション1

progressService.ts では既にMAIMLファイルをパースしてメソッド情報を取得しているため、そこから method_name を取得するように修正する。

**修正内容:**
```typescript
// 修正前
const progressData: ProgressData = {
  method_name: task.task_name,  // ← task_name カラムが存在しない
  task_name: task.task_name,    // ← task_name カラムが存在しない
  // ...
};

// 修正後
const progressData: ProgressData = {
  method_name: method.methodName,  // ← MAIMLから取得したメソッド名を使用
  task_name: method.methodName,    // ← 同様
  // ...
};
```

**TaskWithProject型の修正:**
```typescript
// task_name フィールドを削除するか、オプショナルにする
export interface TaskWithProject {
  // task_name?: string;  // ← オプショナルにする、または削除
  project_id: string;
  project_name: string;
  method_id: string;
  task_no: number;
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| findByPrimaryKey の既存呼び出し箇所でエラー | 高 | 中 | 呼び出し箇所を全て検索し、パラメータを追加 |
| task_name 削除による進捗表示エラー | 高 | 高 | MAIMLからメソッド名を取得するように修正 |
| SQLファイルの修正漏れ | 中 | 中 | SQLファイルを全て確認し、task_name使用箇所を修正 |
| worker_linked_flg の初期値未設定 | 低 | 低 | taskRegistrationService でデフォルト値を設定 |

## 7. テスト計画

### ユニットテスト
- [ ] projectTaskRepository.findByPrimaryKey のテスト更新
- [ ] projectTaskRepository.update のテスト更新
- [ ] ProjectTask型のテスト更新

### 統合テスト
- [ ] タスク登録APIのテスト実行
- [ ] 進捗取得APIのテスト実行
- [ ] タスク一覧取得APIのテスト実行

### 手動テスト
- [ ] タスク登録タブでタスクを登録
- [ ] 進捗画面でメソッド名が正しく表示されることを確認
- [ ] タスク一覧で正しくデータが表示されることを確認

## 8. ロールバック計画

問題が発生した場合の対応手順:

1. データベース: DDLをロールバック
   ```sql
   -- project_task.sql の旧バージョンを再実行
   ```

2. ソースコード: Gitで前のコミットに戻す
   ```bash
   git revert <commit-hash>
   ```

## 9. 関連ドキュメント

- [データベーステーブル一覧](../../design/db/db_table_list.md)
- [project_task DDL](../../design/db/ddl/project_task.sql)
- [タスク二重登録問題調査](../20260306_1011_タスク二重登録問題調査/PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2026-03-06 15:42
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）

### 最終的な成果物
- [ ] database.ts の修正
- [ ] projectTaskRepository.ts の修正
- [ ] SQLファイルの修正
- [ ] progressService.ts の修正
- [ ] テスト実施完了

## 12. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）
