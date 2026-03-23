# タスク計画書: 公開機能関連ドキュメント最新化

## メタデータ
- **作成日時**: 2026-03-18 11:15
- **タスクID**: 公開機能ドキュメント最新化
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

公開機能（MaiML OpenData Pipeline）に関連するドキュメントを調査し、
実装（ソースコード・マイグレーション）との差分を解消して最新化する。

## 発見した差分一覧

### ① worker_maiml_publish.md ― eventLog層（Step 6c）未記載
- **実装**: `maimlPublishWorker.ts` の Step 6c として `maiml_event` / `maiml_event_element` / `maiml_event_element_value` への INSERT処理が実装済み
- **ドキュメント**: 処理フロー・各ステップ詳細・格納先テーブル一覧すべてにeventLog層の記載なし

### ② api_maiml_opendata.md ― DBテーブル定義にカラム欠落
- **実装**: `20260313_create_maiml_opendata_new_schema.sql` では `organization_id`, `project_name` カラムが存在
- **ドキュメント**: §7 の `public.maiml_publish_job` テーブル定義にこれら2カラムが未記載

### ③ spec.md ― 実装ファイル構成名が古い
- **実装**: `maimlPublishQueue.ts`, `maimlPublishWorker.ts`, `maimlPublishService.ts` など `Publish` 系の命名
- **ドキュメント**: §9 の実装ファイル構成に `maimlIngestQueue.ts`, `maimlIngestWorker.ts`, `maimlIngestService.ts` という古い名前が記載されたまま

### ④ spec.md ― 再公開の仕様説明が実装と乖離
- **実装**: `enqueuePublish()` 内で旧アセットがあれば CASCADE DELETE して再公開を許可（`PROJECT_STATUS_COMPLETED = 4` も `ALLOWED_PUBLISH_STATUSES` に含める）
- **ドキュメント**: §3.3 「二重公開の禁止」として「再公開したい場合は非公開後に再度公開」と記載

### ⑤ spec.md ― プロジェクトステータス更新の副作用が未記載
- **実装**: `enqueuePublish()` ステップ9で `projectRepo.updateStatus()` を呼び、`project_status` を `PROJECT_STATUS_COMPLETED（4）` に更新
- **ドキュメント**: §7.2 公開APIの副作用としてこの挙動が未記載

### ⑥ db.md ― `default_retention_days` のNULL制約・デフォルト値が実装と異なる
- **実装**: `NOT NULL DEFAULT 30`（`20260313_create_maiml_opendata_new_schema.sql`）
- **ドキュメント**: §8.1 で `INT`（NULL許容）と記載、デフォルト値の記載なし

### ⑦ ui_maiml_publish.md ― 実装状況が「未実装」のまま
- **実装**: `MaimlPublishDialog.tsx`, `MaimlUnpublishDialog.tsx` が実装済み
- **ドキュメント**: 冒頭の `実装状況: バックエンド実装済み、フロントエンド未実装` のまま

### ⑧ ui_maiml_publish.md ― API連携のエンドポイントが古い（旧設計）
- **実装**: `POST /api/v1/projects/:projectName/publish` / `POST /api/v1/projects/:projectName/unpublish`
- **ドキュメント**: `POST /api/v1/maiml-opendata/publish` / `DELETE /api/v1/maiml-opendata/unpublish/:assetId` という古いパスが記載

### ⑨ worker_maiml_publish.md ― maiml_instance の `results_id` カラムが未記載
- **実装（db.md）**: `maiml_instance.results_id`（`data/results/@id`）が確定。eventLog層との結合キー
- **ドキュメント**: Step 6a の instance INSERT詳細に `results_id` への言及なし（型定義 `MaimlInstanceInput` にも不在）

### ⑩ spec.md ― タスク詳細の完了ステータス値が実装と異なる
- **実装**: `TASK_STATUS_COMPLETED = 3`, `TASK_STATUS_ABORTED = 4`
- **ドキュメント（api_maiml_opendata.md §3.4）**: 「完了（4）または異常終了（5）」と記載

### ⑪ db_table_list.md ― 公開機能テーブルが完全未記載
- **実装**: `maiml_publish_job`（publicスキーマ）、`maiml_asset` / `maiml_instance` / `maiml_element` 等（組織スキーマ）が存在
- **ドキュメント**: テーブル一覧に一切記載なし（テーブル数サマリーも25のまま）

### ⑫ docs/design/db/ddl/maiml_publish/README.md ― 旧設計（KV方式）の記述のまま
- **実装**: 新設計（組織スキーマ + `maiml_publish_job`）。旧KV方式テーブル（`maiml_condition_kv` 等）は廃止済み
- **ドキュメント**: 旧設計のテーブル一覧・依存関係・マイグレーションファイルパスが記載されたまま

### ⑬ docs/design/db/ddl/ ― 新設計のDDLファイルが存在しない
- **実装**: `backend/migrations/20260313_create_maiml_opendata_new_schema.sql` に `maiml_publish_job` DDLあり
- **ドキュメント**: `docs/design/db/ddl/` 直下に `maiml_publish_job.sql` が作成されていない

---

## 実装ステップ

### Phase 1: worker_maiml_publish.md 更新（差分①・⑨）
- [ ] 処理フロー図に Step 6c（eventLog層）を追加
- [ ] §3 各ステップ詳細に Step 6c の説明を追加
- [ ] §7 格納先DBテーブル一覧にeventLog層テーブルを追加
- [ ] Step 6a の instance INSERT詳細に `results_id` フィールドの注記を追加

### Phase 2: api_maiml_opendata.md 更新（差分②・⑩）
- [ ] §7 の `maiml_publish_job` テーブル定義に `organization_id`, `project_name` カラムを追加
- [ ] §3.4 プリコンディションチェックのタスクステータス値を修正（完了=3、異常終了=4）
- [ ] §3.6 副作用にプロジェクトステータス更新を追記

### Phase 3: spec.md 更新（差分③・④・⑤）
- [ ] §9 実装ファイル構成を実際のファイル名（`maimlPublish*`）に修正
- [ ] §3.3 再公開の仕様を実装に合わせて更新（旧アセット削除→再公開を許可）
- [ ] §7.2 公開API副作用にプロジェクトステータス更新を追記

### Phase 4: db.md 更新（差分⑥）
- [ ] §8.1 `default_retention_days` を `INT NOT NULL DEFAULT 30` に修正
- [ ] 期限決定ロジックを実装に合わせて更新（NULLケースの削除）

### Phase 5: ui_maiml_publish.md 更新（差分⑦・⑧）
- [ ] 冒頭の実装状況を「フロントエンド・バックエンドともに実装済み」に更新
- [ ] API連携のエンドポイントを実際のパスに修正
- [ ] 実装ファイルリストを実際のパス（`components/project/`配下）に修正
- [ ] 権限制御（system_adminの記述）を実装に合わせて修正（experiment_adminのみ）

### Phase 6: db_table_list.md 更新（差分⑪）
- [ ] §7（公開機能関連）として `maiml_publish_job`（publicスキーマ）を追記
- [ ] §8（組織スキーマ公開データ）として組織スキーマテーブル群（`maiml_asset` / `maiml_instance` / `maiml_element` / `maiml_element_value` / `maiml_insertion` / `maiml_template` / `maiml_template_element` / `maiml_template_element_value` / `maiml_template_insertion` / `maiml_event` / `maiml_event_element` / `maiml_event_element_value`）を追記
- [ ] テーブル数サマリーを更新（25 → 26 + 組織スキーマ12の注釈）
- [ ] 更新履歴を追記

### Phase 7: docs/design/db/ddl/ DDLファイル作成（差分⑬）
- [ ] `docs/design/db/ddl/maiml_publish_job.sql` を新規作成（実装のDDLを元に正規化）

### Phase 8: docs/design/db/ddl/maiml_publish/README.md 更新（差分⑫）
- [ ] 旧設計（KV方式）の記述を新設計（組織スキーマ＋`maiml_publish_job`）に全面刷新

### Phase 9: api_list.md 更新（差分⑭）
- [ ] API 2.12（`POST /publish`）の実装状態を「⏳ 未実装」→「✅ 実装済み」に更新
- [ ] API 2.13（`POST /unpublish`）を一覧に追加（✅ 実装済み）
- [ ] API 2.14（`GET /publish-status`）を一覧に追加（✅ 実装済み）
- [ ] 実装状況サマリーの「プロジェクト管理API」の総数・実装済み数・実装率を更新
- [ ] 全体合計・実装率を更新
- [ ] バージョン・変更履歴を追記

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `docs/design/worker/worker_maiml_publish.md` | eventLog層処理追加、results_id注記追加 |
| `docs/design/api/api_maiml_opendata.md` | テーブルカラム追加、ステータス値修正、副作用追記 |
| `docs/MaiML_OpenData_Pipeline/spec.md` | ファイル名修正、再公開仕様更新、副作用追記 |
| `docs/MaiML_OpenData_Pipeline/db.md` | default_retention_days NULL制約修正 |
| `docs/design/ui/experiment_admin/ui_maiml_publish.md` | 実装状況更新、API連携修正 |
| `docs/design/db/db_table_list.md` | 公開機能テーブル追加（maiml_publish_job・組織スキーマ群） |
| `docs/design/db/ddl/maiml_publish_job.sql`（新規） | maiml_publish_job DDLファイル作成 |
| `docs/design/db/ddl/maiml_publish/README.md` | 旧設計から新設計への全面刷新 |

---

## 承認記録
- **計画書提示日時**: 2026-03-18 11:15
- **承認日時**: 2026-03-18 11:15
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-03-18 11:15
完了: 2026-03-18 11:34

### 最終的な成果物
- [x] Phase 1: worker_maiml_publish.md 更新（eventLog層追加、results_id注記追加）
- [x] Phase 2: api_maiml_opendata.md 更新（カラム追加、ステータス値修正、副作用追記）
- [x] Phase 3: spec.md 更新（ファイル名修正、再公開仕様更新、副作用追記）
- [x] Phase 4: db.md 更新（default_retention_days NULL制約修正）
- [x] Phase 5: ui_maiml_publish.md 確認（既に最新状態のため変更不要）
- [x] Phase 6: db_table_list.md 更新（§7・§8として公開機能テーブル群を追加）
- [x] Phase 7: docs/design/db/ddl/maiml_publish_job.sql 新規作成
- [x] Phase 8: docs/design/db/ddl/maiml_publish/README.md 更新（廃止済みに変更・現在の設計リンク追記）
- [x] Phase 9: api_list.md 更新（publish/unpublish/publish-status を実装済みに更新）
