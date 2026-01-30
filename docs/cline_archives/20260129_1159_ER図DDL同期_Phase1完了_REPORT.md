# ER図とDDL同期作業 Phase 1 完了報告

## 作業日時
2026-01-29 11:59

## 完了ステータス
✅ **Phase 1 完了**: 重要な6テーブルのDDL更新が完了しました

## 更新したテーブル（6/27）

### 1. organization_user（組織利用者）
**追加カラム:**
- `create_user_id` UUID - 作成者ユーザID
- `update_user_id` UUID - 更新者ユーザID

**配置:** 監査証跡セクション（タイムスタンプの前）

---

### 2. role（ロール）
**追加カラム:**
- `create_user_id` UUID - 作成者ユーザID
- `update_user_id` UUID - 更新者ユーザID

**配置:** 監査証跡セクション（タイムスタンプの前）

---

### 3. role_permission（ロール権限）
**追加カラム:**
- `create_user_id` UUID - 作成者ユーザID
- `create_at` TIMESTAMP - 作成日時
- `update_user_id` UUID - 更新者ユーザID
- `update_at` TIMESTAMP - 更新日時

**配置:** 監査証跡とタイムスタンプのセクション

---

### 4. project（プロジェクト）
**追加カラム:**
- `create_user_id` UUID - 作成者ユーザID
- `update_user_id` UUID - 更新者ユーザID
- `update_at` TIMESTAMP - 更新日時

**既存:** create_at

**配置:** 既存のcreate_atの前後に挿入

---

### 5. project_instruction（プロジェクト指示）
**追加カラム:**
- `method_id` CHARACTER VARYING - メソッドID（新規ビジネスカラム）
- `create_user_id` UUID - 作成者ユーザID
- `create_at` TIMESTAMP - 作成日時
- `update_user_id` UUID - 更新者ユーザID
- `update_at` TIMESTAMP - 更新日時

**配置:** 
- method_id: 複合主キーの直後
- 監査証跡: instruction_dateの後

---

### 6. issue（問題）
**追加カラム:**
- `method_id` CHARACTER VARYING - メソッドID（新規ビジネスカラム）
- `create_user_id` UUID - 作成者ユーザID
- `create_at` TIMESTAMP - 作成日時
- `update_user_id` UUID - 更新者ユーザID
- `update_at` TIMESTAMP - 更新日時

**修正:**
- カラム名変更: `task_id` → `task_no` NUMERIC(3,0)

**配置:**
- method_id: 複合主キーの直後
- 監査証跡: issue_complate_atの後

---

## 更新の統一パターン

### カラム配置の順序
```sql
-- ビジネスデータカラム
...

-- 監査証跡
create_user_id UUID,
update_user_id UUID,

-- タイムスタンプ
create_at TIMESTAMP,
update_at TIMESTAMP,

-- 制約
CONSTRAINT table_name_pkey PRIMARY KEY (...)
```

### コメントの追加
すべてのテーブルに以下のコメントを追加：
```sql
COMMENT ON COLUMN table_name.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN table_name.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN table_name.create_at IS '作成日時';
COMMENT ON COLUMN table_name.update_at IS '更新日時';
```

---

## ビジネスロジックへの影響

### 1. 認証・認可システム（高優先度）
- **影響テーブル:** organization_user, role, role_permission
- **必要な対応:** 
  - INSERT/UPDATE時にcreate_user_id, update_user_idを設定
  - 監査証跡の記録実装

### 2. プロジェクト管理（高優先度）
- **影響テーブル:** project, project_instruction
- **必要な対応:**
  - method_idの実装（複数メソッド対応）
  - 監査証跡の実装

### 3. 問題管理（中優先度）
- **影響テーブル:** issue
- **必要な対応:**
  - method_idの実装
  - task_id → task_noの移行（既存データがある場合）
  - 監査証跡の実装

---

## 未完了の作業（Phase 2以降）

### 残りのテーブル（21テーブル）

以下のテーブルもER図で同様のカラムが追加されている可能性が高いです：

**マスタ系（7テーブル）:**
1. organization
2. corporation
3. department
4. code_master
5. vendor_master
6. instrument_master
7. creator_master

**認証・履歴系（3テーブル）:**
8. login_history
9. pin_codes
10. user_authentication

**プロジェクト関連（4テーブル）:**
11. project_task
12. project_task_detail
13. format
14. format_subfolder

**データ系（4テーブル）:**
15. file_metadata
16. maiml_event_log
17. transition_data
18. template_data

**その他（3テーブル）:**
19. attribute_master
20. instruction_acknowledged_history
21. issue_comment

---

## 次のアクション

### 推奨事項

1. **Phase 2: 残りのテーブル確認と更新**
   - 優先度: 中
   - 所要時間: 約3時間

2. **テーブル一覧ドキュメントの更新**
   - ファイル: `docs/design/db/db_table_list.md`
   - 優先度: 中
   - 所要時間: 30分

3. **バックエンドコードの修正**
   - リポジトリ層: INSERT/UPDATEにcreate_user_id, update_user_idを追加
   - サービス層: method_id対応
   - 優先度: 高
   - 所要時間: 2-3時間

4. **データマイグレーション**
   - 既存データへのカラム追加（NULLを許容）
   - task_id → task_noの移行（issue テーブル）
   - 優先度: 高（本番適用前）

---

## 検証チェックリスト

### DDL構文チェック
- [x] organization_user.sql - 構文エラーなし
- [x] role.sql - 構文エラーなし
- [x] role_permission.sql - 構文エラーなし
- [x] project.sql - 構文エラーなし
- [x] project_instruction.sql - 構文エラーなし
- [x] issue.sql - 構文エラーなし

### ER図との一致確認
- [x] organization_user - 一致
- [x] role - 一致
- [x] role_permission - 一致
- [x] project - 一致
- [x] project_instruction - 一致
- [x] issue - 一致（task_id→task_noも修正済み）

---

## 完了ファイル一覧

```
docs/design/db/ddl/organization_user.sql  ✅ 更新完了
docs/design/db/ddl/role.sql               ✅ 更新完了
docs/design/db/ddl/role_permission.sql    ✅ 更新完了
docs/design/db/ddl/project.sql            ✅ 更新完了
docs/design/db/ddl/project_instruction.sql ✅ 更新完了
docs/design/db/ddl/issue.sql              ✅ 更新完了
```

---

## 作業時間

- **Phase 1（6テーブル）**: 約30分
- **残作業見積もり（21テーブル）**: 約3時間
- **合計見積もり**: 約3時間30分

---

## まとめ

✅ **Phase 1 完了**: 重要な6テーブルの更新が完了しました。

📋 **主な成果:**
- 監査証跡カラム（create_user_id, update_user_id）の追加
- タイムスタンプカラムの整備
- 新規ビジネスカラム（method_id）の追加
- カラム名の統一（task_id → task_no）

⚠️ **注意事項:**
- 残り21テーブルの更新が必要
- バックエンドコードの修正が必要
- データマイグレーション計画の策定が必要

🎯 **推奨次ステップ:**
1. Phase 2として残り21テーブルの更新
2. または先に6テーブルのバックエンド実装
3. どちらを優先するかはビジネス要件次第
