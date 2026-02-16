# データベース構造定義

## 概要

このドキュメントは、データベース構造を理解するための参照ルールです。
詳細なテーブル定義は別ファイルで管理されています。

## 📚 参照ドキュメント

### テーブル一覧の詳細
**ファイル**: `docs/design/db/db_table_list.md`

このファイルには以下の情報が含まれています：
- 全24テーブルの物理名・論理名
- 主キー、外部キー、インデックス情報
- DDLファイルとの対応表
- テーブル間のリレーションシップ
- マルチテナント分離の設計原則

**重要**: DDLファイル（`docs/design/db/ddl/*.sql`）を変更した際は、必ず `docs/design/db/db_table_list.md` も更新してください。

### ER図
**ファイル**: `docs/design/db/er_diagram.a5er`

A5:SQL Mk-2形式のER図ファイルです。
ER図の仕様については `.clinerules/references/a5er_specification.md` を参照してください。

### DDLファイル
**ディレクトリ**: `docs/design/db/ddl/`

各テーブルのCREATE文が格納されています。

---

## 🎯 使用ガイドライン

### バックエンド実装時

1. **テーブル構造確認**
   - `docs/design/db/db_table_list.md` でテーブル名・カラム名を確認
   - 物理名と論理名の対応を把握

2. **SQL作成時**
   - 必ず `organization_id` フィルタを含める（マルチテナント分離）
   - Parameterized Queries を使用（SQLインジェクション対策）
   - 外部キー関係を確認してJOINを正しく記述

3. **DDL参照**
   - DDLファイルで詳細な型定義やインデックスを確認
   - `docs/design/db/ddl/README.md` で実行順序を確認

### データベース変更時

1. **ER図の更新**
   - A5:SQL Mk-2でER図を更新

2. **DDLファイルの生成・更新**
   - `docs/design/db/ddl/` 内の該当SQLファイルを更新

3. **テーブル一覧の更新（必須）**
   - `docs/design/db/db_table_list.md` を更新
   - 物理名、論理名、主要カラム、外部キーを最新化

---

## 📊 テーブルカテゴリ

### 1. 認証関連（8テーブル）
- corporation, organization, organization_user, user_authentication
- pin_codes, login_history, function, role_permission

### 2. プロジェクト管理関連（7テーブル）
- project, project_task, project_task_detail, project_instruction
- format, format_subfolder, experiment_record

### 3. 共通マスタ（6テーブル）
- code_master, creator, owner, instrument, vendor, attribute

### 4. 通知関連（2テーブル）
- system_notification, user_notification

### 5. ファイル管理関連（1テーブル）
- file_metadata

---

## ⚠️ 重要な設計原則

### マルチテナント分離（必須）
```sql
-- ❌ 悪い例
SELECT * FROM projects WHERE project_id = $1;

-- ✅ 良い例
SELECT * FROM projects 
WHERE organization_id = $1 AND project_id = $2;
```

### UUID使用
- 主要な識別子（organization_id, user_id, project_id等）にUUIDを使用
- セキュリティと一意性を確保

### インデックス設計
- 外部キーカラムに必ずインデックスを作成
- 検索頻度の高いカラムにインデックスを作成
- JSONB型カラムにはGINインデックスを使用

---

## 🔗 関連ドキュメント

- [テーブル一覧詳細](../../docs/design/db/db_table_list.md) - 全テーブルの詳細情報
- [ER図](../../docs/design/db/er_diagram.a5er) - データベース設計図
- [DDLディレクトリ](../../docs/design/db/ddl/) - CREATE文一覧
- [A5:ER仕様](./a5er_specification.md) - ER図ファイル形式の詳細
- [バックエンド規約](../development/backend.md) - SQL記述ルール
- [セキュリティ規約](../development/security.md) - マルチテナント分離の詳細

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-09 | 参照用ルールに変更、詳細はdb_table_list.mdに分離 | Cline |
| 2026-01-09 | 初版作成 | Cline |
