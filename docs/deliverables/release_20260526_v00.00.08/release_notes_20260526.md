# リリースノート

**リリース日**: 2026-05-26  
**対象ブランチ**: main  
**前回リリースコミット**: `ff018f64`  
**今回リリースコミット**: `a1d40779`

---

## バグ修正

### 1. データ管理画面の読取専用権限対応（Jira対応）

- データ管理画面において、読取専用権限を持つユーザーが編集操作を行えてしまう問題を修正
- 権限に応じてUI上の操作ボタンを非活性化・非表示にする対応を実施

### 2. プロジェクト管理タブと進捗管理タブのレイアウト差異修正（Jira対応）

- プロジェクト管理タブと進捗管理タブでレイアウトが異なっていた問題を修正
- 両タブのレイアウトを統一

### 3. 仮パスワードの有効期限廃止（Jira対応）

- 仮パスワードに有効期限が設定されていた仕様を廃止
- 仮パスワードの判断を `is_temporary_flg` のみで行うよう変更
- `user_authentication` テーブルの `password_expires_at` カラムを削除（DBマイグレーション）

### 4. MAIMLアップロード時の `file_type` 固定化・拡張子カラム未登録バグ修正（AISOLMAIML-234）

- チャンクアップロード時に `file_type` が固定値になり、拡張子カラムが正常に登録されない不具合を修正

### 5. MAIMLファイルアップロード時の `file_metadata` レコード増殖対応（AISOLMAIML-233）

- MAIMLファイルをアップロードするたびに `file_metadata` テーブルのレコードが増殖する不具合を修正

### 6. プロジェクト選択時の選択ボタン対応（issue#36）

- プロジェクト選択ダイアログにおいて、選択ボタンの動作が正しく機能しない問題を修正

### 7. トランジション単位でのタスク登録対応（issue#35）

- タスク登録をトランジション単位で行えるよう修正

### 8. issue#34 対応（AISOLMAIML-236）

- issue#34 に関連する不具合を修正

### 9. DocumentIDの再採番とParent指定の修正

- Document ID の再採番処理および Parent タグ指定に関する不具合を修正

### 10. 指示の記録タイミング関連の不具合修正（AISOLMAIML-239 / issue#37）

- `eventLog` の UUID が変化した場合のみ新規払い出しを行うよう修正
- `document` の UUID 更新処理を修正
- `eventLog` の UUID 更新処理を修正
- `priority`・`type`・`instruction_target` の数値→文字列変換を `code_master` 参照方式に変更
- `maiml_event_log` 取得 SQL を外部ファイル化

### 11. UUID連鎖採番（AISOLMAIML-242）

- MAIML 下位タグ変更検知時の UUID 連鎖再生成処理を実装

---

## 改善

### 1. プロジェクト UUID を MaiML と別途採番するよう変更（AISOLMAIML-209）

- プロジェクト UUID を MaiML の UUID とは独立して採番するよう変更

### 2. DocumentUUID の自動再採番（AISOLMAIML-241）

- Document UUID を自動的に再採番する機能を実装

### 3. `file_metadata` テーブルの不要カラム削除（AISOLMAIML-235）

- 本番コードから参照・設定されていない不要カラム（`custom_metadata`・`tags`・`search_keywords`・`description`・`maiml_document_uuid` 等）を削除
- 関連インデックスも合わせて削除（DBマイグレーション）

### 4. アイコン・ロゴのデザイン修正

- ログイン画面のアイコン配置・デザインを修正
- アイコン画像（`icon_alchemia.png`・`logo_alchemia.png`）を更新

### 5. SQL 外部ファイル化対応

- 各リポジトリで SQL をソースコード内にハードコードしていた箇所を外部 SQL ファイル（`backend/src/sql/queries/`）に移行
- 対象: `creators`・`event_log`・`file_metadata`・`maiml_analysis_results`・`maiml_drafts`・`maiml_validation_history`・`organization_users`・`organizations`・`password_reset_tokens`・`project_instructions`・`project_tasks`・`projects`・`role_permissions`・`system_overview`・`upload_batches`・`user_authentication`・`users`・`attributes`・`codeMaster` 等

---

## DB マイグレーション

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260519_remove_unused_columns_from_file_metadata.sql` | `file_metadata` テーブルの不要カラム・インデックス削除（`DROP COLUMN IF EXISTS` / `DROP INDEX IF EXISTS` によるべき等対応） |
| `backend/migrations/20260520_drop_password_expires_at.sql` | `user_authentication` テーブルの `password_expires_at` カラム削除（`DROP COLUMN IF EXISTS` によるべき等対応） |

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/services/projectInstructionService.ts` | 指示の記録タイミング修正（AISOLMAIML-239） |
| `backend/src/repositories/eventLogRepository.ts` | eventLog UUID 管理・SQL 外部ファイル化 |
| `backend/src/repositories/fileMetadataRepository.ts` | file_metadata 不要カラム削除対応・SQL 外部ファイル化 |
| `backend/src/services/maimlService.ts` | MaiML UUID 管理修正 |
| `backend/src/services/maimlWriterService.ts` | MaiML 書き出し処理修正 |
| `backend/src/utils/maimlDataWriter.ts` | MaiML データ書き込みユーティリティ修正 |
| `backend/src/utils/maimlParentInjector.ts` | MaiML Parent タグ注入処理修正 |
| `backend/src/utils/maimlParser.ts` | MaiML パーサー修正 |
| `backend/src/services/authService.ts` | 仮パスワード有効期限廃止対応 |
| `backend/src/controllers/authController.ts` | 認証コントローラー修正 |
| `backend/src/controllers/fileAccessController.ts` | ファイルアクセスコントローラー修正 |
| `backend/migrations/20260519_remove_unused_columns_from_file_metadata.sql` | file_metadata 不要カラム削除マイグレーション |
| `backend/migrations/20260520_drop_password_expires_at.sql` | password_expires_at カラム削除マイグレーション |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/LoginPage.tsx` | ログイン画面アイコン・レイアウト修正 |
| `frontend/src/components/project/ProjectManagement.tsx` | プロジェクト管理画面修正 |
| `frontend/src/components/menus/ExperimentAdminMenu.tsx` | 実験管理者メニュー修正 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | 進捗管理タブレイアウト修正 |
| `frontend/src/components/DataManagement/MasterManagement.tsx` | データ管理読取専用権限対応 |
| `frontend/src/components/SystemManagement/RoleManagement.tsx` | ロール管理修正 |
| `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` | 機能権限ダイアログ修正 |
| `frontend/src/components/editorv2/DocumentEditDialog.tsx` | ドキュメント編集ダイアログ修正 |
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | テンプレートエディタダイアログ修正 |
| `frontend/src/components/ChangePasswordModal.tsx` | パスワード変更モーダル修正 |
| `frontend/src/utils/maimlParentInjector.ts` | MaiML Parent タグ注入ユーティリティ修正 |
| `frontend/src/utils/documentInitializer.ts` | ドキュメント初期化ユーティリティ修正 |
| `frontend/src/utils/documentParser.ts` | ドキュメントパーサー修正 |
| `frontend/src/locales/ja.json` | 翻訳キー追加・整理 |
| `frontend/src/locales/en.json` | 翻訳キー追加・整理 |
| `frontend/public/icons/icon_alchemia.png` | アイコン画像更新 |
| `frontend/public/icons/logo_alchemia.png` | ロゴ画像更新 |
