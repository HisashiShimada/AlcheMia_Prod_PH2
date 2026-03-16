# タスク計画書: MaiML公開機能 未確定事項解消・DB設計確定

## メタデータ
- **作成日時**: 2026-03-12 16:50
- **タスクID**: maiml-opendata-pending-resolve
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`docs/MaiML_OpenData_Pipeline/pending.md` に残存する未確定事項（#6〜#9）と
`docs/MaiML_OpenData_Pipeline/unpublish_review.md` の未対応事項（B・D）を解消し、
DB設計・仕様書を完全確定状態にする。

## 目的と期待される成果
- [ ] 未確定事項 #6（スキーマ横断検索・job記録粒度）を確定 → **後回し（保留継続）**
- [x] 未確定事項 #7（asset_id FK なし運用）を明記・確定
- [ ] 未確定事項 #8（retention_days 境界値バリデーション）を確定 → **#6 と一緒に解決予定（保留継続）**
- [ ] 未確定事項 #9（eventLog テーブル設計）を確定 → **解決不可・保留継続**
- [x] unpublish_review.md 課題B（maiml_publish_job カラム不一致）を解消（spec.md 定義に合わせてマイグレーション追加方針確定）
- [x] unpublish_review.md 課題D（summary.md 誤記）を修正
- [ ] db.md の eventLog セクション（PENDING）を確定済みに更新 → **保留継続**
- [ ] pending.md のすべての項目を確定済みに移行 → **#6・#8・#9 は保留継続**
- [x] summary.md を実態に合わせて修正（「仕様ほぼ確定」に変更）
- [ ] 新マイグレーション SQL を作成 → **次フェーズで実施**

## 実装ステップ

### Phase 1: 各未確定事項の判断・方針決定

#### #6 スキーマ横断検索方式 → **A案（organization テーブルから全組織ID取得）**
- 組織数は数十〜数百程度（大規模ではない）
- `public.organization` テーブルが信頼できる情報源
- job記録粒度 → **アセット1件につき1レコード**（スケジュール実行でも個別に追跡可能）

#### #7 asset_id FK なし運用 → **FK なし・アプリケーション管理で確定**
- `maiml_publish_job` は `public` スキーマ、`maiml_asset` は組織スキーマ
- PostgreSQL の FK 制約はスキーマ間では使えない
- アプリ側で整合性管理（Worker が削除前にチェック）

#### #8 retention_days 境界値 → **0 = 即時期限切れ、負の値 = バリデーションエラー**
- `0` を設定した場合は公開直後にスケジュール非公開対象（即時期限切れ）
- 負の値は `CHECK (default_retention_days > 0 OR default_retention_days IS NULL)` で DB 側でも防ぐ
- API 側でも `>= 1` バリデーション（NULL = 無期限設定、0 は許容しない方が安全）
- → **`NULL` = 環境変数使用、`1` 以上 = 有効値、`0`/負 = バリデーションエラー**

#### #9 eventLog テーブル設計 → **C案（FKなし・JOIN解決）で確定**
- `concept:instance` の参照先は同一ファイル内の `maiml_instance`（仕様確認済み扱い）
- eventとinstanceを結合するユースケースは参照用途が主 → UUID JOIN で十分
- 実装コストが低く、instance と完全統一した設計が維持できる

#### unpublish_review B → **spec.md の定義を正とし、マイグレーション修正 SQL を作成**
- `organization_id` と `project_name` を `NOT NULL` で追加
- `registry_id` カラムは廃止

### Phase 2: ドキュメント更新
- [ ] `pending.md`: 未確定事項 #6〜#9 を確定済みに移行
- [ ] `db.md`: セクション7（eventLog）の PENDING 解除・C案確定版 DDL に更新
- [ ] `spec.md`: 注記「未確定事項 #7〜#9」を削除、eventLog 言及を追加
- [ ] `summary.md`: 「全仕様確定」記述を実態に合わせて修正

### Phase 3: マイグレーション SQL 作成
- [ ] `backend/migrations/20260312_fix_maiml_publish_job.sql`: `organization_id` / `project_name` 追加、`registry_id` 廃止
- [ ] `backend/migrations/20260312_create_maiml_org_schema_tables.sql`: 組織スキーマ用全テーブル DDL（db.md 確定版）

## 変更ファイル

### 更新
1. `docs/MaiML_OpenData_Pipeline/pending.md` - #6〜#9 を確定済みに移行
2. `docs/MaiML_OpenData_Pipeline/db.md` - eventLog セクション PENDING 解除、C案確定版 DDL
3. `docs/MaiML_OpenData_Pipeline/spec.md` - 注記更新
4. `docs/MaiML_OpenData_Pipeline/summary.md` - 「全仕様確定」記述修正
5. `docs/MaiML_OpenData_Pipeline/unpublish_review.md` - B・D を確定済みに更新

### 新規作成
1. `backend/migrations/20260312_fix_maiml_publish_job.sql`
2. `backend/migrations/20260312_create_maiml_org_schema_tables.sql`

## 承認記録
- **計画書提示日時**: 2026-03-12 16:50
