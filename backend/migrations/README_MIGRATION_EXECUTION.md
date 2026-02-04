# マイグレーション実行手順

## 概要

このドキュメントは、issuesテーブルを作成するためのマイグレーション実行手順を説明します。

## 前提条件

- PostgreSQLデータベースが起動していること
- データベース接続情報が `.env` ファイルに設定されていること
- 必要なテーブル（organization, project, project_task_detail, organization_user）が既に存在すること

## マイグレーション実行方法

### 方法1: psqlコマンドを使用（推奨）

```bash
# PostgreSQLに接続
psql -h localhost -U postgres -d maiml_db

# マイグレーションファイルを実行
\i backend/migrations/20260204_create_issues_table.sql

# テーブルが作成されたことを確認
\dt issues

# テーブル構造を確認
\d issues

# PostgreSQLから切断
\q
```

### 方法2: ファイルを直接実行

```bash
psql -h localhost -U postgres -d maiml_db -f backend/migrations/20260204_create_issues_table.sql
```

### 方法3: Node.jsスクリプトを使用（将来実装予定）

```bash
npm run migrate:up 20260204_create_issues_table
```

## マイグレーション実行後の確認

### 1. テーブル存在確認

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'issues';
```

### 2. カラム確認

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'issues'
ORDER BY ordinal_position;
```

### 3. インデックス確認

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'issues';
```

### 4. 外部キー制約確認

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'issues';
```

### 5. CHECK制約確認

```sql
SELECT
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name LIKE '%issues%';
```

## テスト実行

マイグレーション実行後、以下のコマンドでテストを実行します：

```bash
cd backend
npm run test:migrations
```

または特定のテストファイルのみ実行：

```bash
npm test -- tests/database/migrations/20260204_create_issues_table.test.ts
```

## ロールバック方法

問題が発生した場合、以下のSQLでロールバックできます：

```sql
BEGIN;
DROP TABLE IF EXISTS issues CASCADE;
COMMIT;
```

## トラブルシューティング

### エラー: 外部キー制約違反

**症状**: 
```
ERROR: relation "organization" does not exist
```

**解決方法**: 
参照先テーブルが存在することを確認してください：

```sql
-- 必要なテーブルの確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organization', 'project', 'project_task_detail', 'organization_user');
```

### エラー: トランザクションエラー

**症状**: 
```
ERROR: current transaction is aborted
```

**解決方法**: 
トランザクションをロールバックして再実行：

```sql
ROLLBACK;
-- マイグレーションファイルを再実行
```

## 注意事項

1. **本番環境での実行**: 
   - 必ずバックアップを取得してから実行してください
   - メンテナンスウィンドウ中に実行することを推奨します
   - ロールバック手順を事前に確認してください

2. **データ損失の警告**: 
   - マイグレーションは `DROP TABLE IF EXISTS` を含むため、既存のissuesテーブルとデータが削除されます
   - 初回実行時は問題ありませんが、再実行時は注意が必要です

3. **権限要件**: 
   - テーブル作成権限が必要です
   - 外部キー制約を設定するため、参照先テーブルへの参照権限が必要です

## 実行ログ

マイグレーション実行時は、以下の情報を記録してください：

- 実行日時
- 実行者
- 実行結果（成功/失敗）
- エラーメッセージ（該当する場合）
- ロールバックの有無

## 次のステップ

マイグレーション実行後、以下のタスクに進んでください：

1. タスク2: IssueRepositoryインターフェース定義
2. タスク3: IssueRepository実装
3. タスク4: IssueService実装

---

**作成日**: 2026-02-04  
**対象マイグレーション**: 20260204_create_issues_table.sql  
**バージョン**: 1.0.0