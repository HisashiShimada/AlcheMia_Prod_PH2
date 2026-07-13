# タスク計画書（Step1）: DB層移行 — organization_groupテーブル作成・DDL整備

## メタデータ

- **作成日時**: 2026-07-10 11:44
- **ステップ**: Step1 / 5
- **前提**: なし（全ステップ中最初に実施）
- **推定工数**: 0.5〜1日

---

## 1. ステップ概要

`organization_group` テーブルおよびユーザーとの多対多関連を管理する **`organization_group_user`** テーブルをDBに追加する。

あわせて、`project.department_cd`・`attribute.department_cd`（単一グループ所属）を `organization_group_cd` に改名するためのDDL・マイグレーションSQLを整備する。

なお `organization_user.department_cd` は **多対多移行（organization_group_userへのデータ移行）後にStep5で削除**するため、このステップではRENAMEせずデータ移行のみ行う。

---

## 2. 目的と期待される成果

- [x] `organization_group` テーブルがDBに存在する（**作成済み**）
- [x] **`organization_group_user`** テーブルがDBに存在する（多対多の中間テーブル）（**作成済み**）
- [x] `project.department_cd` → `organization_group_cd` に改名されている
- [x] `attribute.department_cd` → `organization_group_cd` に改名されている（存在する場合）
- [x] `organization_user.department_cd` の値が `organization_group_user` テーブルに1行ずつ移行されている
- [x] `docs/design/db/ddl/organization_group.sql` のtypoが修正されている（`organization_gourp` → `organization_group`）
- [x] `docs/design/db/ddl/migrations/create_all_tables.sql` が最新状態に更新されている
- [x] `backend/migrations/` にマイグレーションSQLが追加されている

---

## 3. 実装ステップ

### Phase 1: DDLファイルの修正・整備

- [x] `docs/design/db/ddl/organization_group.sql` のtypoを修正
  - テーブル名: `organization_gourp` → `organization_group`
  - カラム名: `organization_gourp_cd` → `organization_group_cd`
  - カラム名: `organization_gourp_name` → `organization_group_name`
  - CONSTRAINT名: `organization_gourp_PKC` → `organization_group_PKC`
  - COMMENTも合わせて修正

### Phase 2: マイグレーションSQLの作成

- [x] `backend/migrations/20260710_add_organization_group.sql` を新規作成
  1. `organization_group` テーブルの `CREATE TABLE IF NOT EXISTS`
  2. `organization_group_user` テーブルの `CREATE TABLE IF NOT EXISTS`（多対多中間テーブル）
  3. `department` テーブルのデータを `organization_group` へINSERT（chief_user_idはorganizationから引用）
  4. `organization_user.department_cd` の既存データを `organization_group_user` に1行ずつINSERT（データ移行）
  5. `project.department_cd` → `organization_group_cd` に RENAME COLUMN
  6. `attribute.department_cd` → `organization_group_cd` に RENAME COLUMN（存在する場合のみ）

> **方針確定事項①**: `department` テーブルのデータを `organization_group` へ移行する（`chief_user_id` は同組織の `organization.chief_user_id` を引用、取得不可時は空文字フォールバック）。

> **方針確定事項②**: `department` テーブル自体の DROP は **Step5（後片付け）** で行う。`organization_user.department_cd` カラムの DROP も **Step5** で行う。このステップでは両方を残したまま進める。

> **方針確定事項③**: S3パス（`formats/{department_cd}/...`）は **既存パスをそのまま維持**（パス変換ロジックの変更で対応）する。S3上のフォルダリネームは行わない。

> **変更事項（A5:SQL対応）**: `DO $$ ... $$` ブロックをA5:SQL Mk-2が解釈できないため、ステップ5・6はシンプルな `ALTER TABLE RENAME COLUMN` に変更。初回実行前提で冪等ガードなし。

### Phase 3: create_all_tables.sql の更新

- [x] `docs/design/db/ddl/migrations/create_all_tables.sql` を更新
  - `department` テーブル定義を `organization_group` テーブル定義に置き換え
  - `organization_group_user` テーブル定義を追加
  - `organization_user.department_cd` → `organization_group_cd` に変更（※移行期間中はカラム自体を残す）
  - `project.department_cd` → `organization_group_cd` に変更

---

## 4. 変更ファイル

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `docs/design/db/ddl/organization_group.sql` | typo修正（`organization_gourp` → `organization_group`） |
| `docs/design/db/ddl/migrations/create_all_tables.sql` | department→organization_group/organization_group_user置き換え、各テーブルのカラム改名 |

### 新規作成

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260710_add_organization_group.sql` | organization_group / organization_group_user テーブル作成 + データ移行 + project/attribute カラム改名 |

---

## 5. マイグレーションSQL（案）

```sql
-- ============================================================
-- 1. organization_group テーブル作成
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_group (
  organization_id       UUID          NOT NULL,
  organization_group_cd VARCHAR(50)   NOT NULL,
  organization_group_name VARCHAR(255) NOT NULL,
  chief_user_id         VARCHAR(50)   NOT NULL,
  parent_group_cd       VARCHAR(50),
  layer                 VARCHAR(20),
  create_user_id        VARCHAR(50),
  create_at             TIMESTAMP,
  update_user_id        VARCHAR(50),
  update_at             TIMESTAMP,
  CONSTRAINT organization_group_PKC PRIMARY KEY (organization_id, organization_group_cd)
);

COMMENT ON TABLE  organization_group IS '組織階層グループ';
COMMENT ON COLUMN organization_group.organization_id        IS '組織ID';
COMMENT ON COLUMN organization_group.organization_group_cd  IS '組織階層グループCD';
COMMENT ON COLUMN organization_group.organization_group_name IS '組織階層グループ名';
COMMENT ON COLUMN organization_group.chief_user_id          IS '代表者ユーザID';
COMMENT ON COLUMN organization_group.parent_group_cd        IS '親階層グループCD';
COMMENT ON COLUMN organization_group.layer                  IS 'レイヤー';
COMMENT ON COLUMN organization_group.create_user_id         IS '作成者ユーザID';
COMMENT ON COLUMN organization_group.create_at              IS '作成日時';
COMMENT ON COLUMN organization_group.update_user_id         IS '更新者ユーザID';
COMMENT ON COLUMN organization_group.update_at              IS '更新日時';

-- ============================================================
-- 2. organization_group_user テーブル作成（多対多中間テーブル）
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_group_user (
  organization_id       UUID        NOT NULL,
  organization_group_cd VARCHAR(50) NOT NULL,
  user_id               VARCHAR(50) NOT NULL,
  create_at             TIMESTAMP,
  CONSTRAINT organization_group_user_PKC
    PRIMARY KEY (organization_id, organization_group_cd, user_id),
  CONSTRAINT fk_org_group_user_group
    FOREIGN KEY (organization_id, organization_group_cd)
    REFERENCES organization_group (organization_id, organization_group_cd)
    ON DELETE CASCADE
);

COMMENT ON TABLE  organization_group_user IS '組織グループユーザー（多対多）';
COMMENT ON COLUMN organization_group_user.organization_id       IS '組織ID';
COMMENT ON COLUMN organization_group_user.organization_group_cd IS '組織階層グループCD';
COMMENT ON COLUMN organization_group_user.user_id               IS 'ユーザID';
COMMENT ON COLUMN organization_group_user.create_at             IS '作成日時';

-- ============================================================
-- 3. organization_user.department_cd → organization_group_user へデータ移行
--    ※ organization_group 本体のレコードが存在する場合のみINSERTする（FK制約のため）
--    ※ 冪等: INSERT ... ON CONFLICT DO NOTHING
-- ============================================================
INSERT INTO organization_group_user (organization_id, organization_group_cd, user_id, create_at)
SELECT
  ou.organization_id,
  ou.department_cd,
  ou.user_id,
  CURRENT_TIMESTAMP
FROM organization_user ou
WHERE ou.department_cd IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM organization_group og
    WHERE og.organization_id = ou.organization_id
      AND og.organization_group_cd = ou.department_cd
  )
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING;

-- ============================================================
-- 4. project の department_cd → organization_group_cd にRENAME
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project' AND column_name = 'department_cd'
  ) THEN
    ALTER TABLE project RENAME COLUMN department_cd TO organization_group_cd;
  END IF;
END$$;

-- ============================================================
-- 5. attribute の department_cd → organization_group_cd にRENAME
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attribute' AND column_name = 'department_cd'
  ) THEN
    ALTER TABLE attribute RENAME COLUMN department_cd TO organization_group_cd;
  END IF;
END$$;

-- ============================================================
-- 注意: 以下は Step5（後片付け）で実施
--   - organization_user.department_cd カラムの DROP
--   - department テーブルの DROP
-- ============================================================
```

---

## 6. テスト計画

- [ ] `organization_group` テーブルが正常に作成されること
- [ ] `organization_group_user` テーブルが正常に作成されること（多対多中間テーブル）
- [ ] `project.organization_group_cd` カラムが存在すること
- [ ] `attribute.organization_group_cd` カラムが存在すること（存在する場合）
- [ ] `organization_user.department_cd IS NOT NULL` のレコードが `organization_group_user` に移行されていること（organization_groupレコードが存在する場合）
- [ ] マイグレーションを再実行しても冪等であること（`CREATE TABLE IF NOT EXISTS` / `DO $$ IF EXISTS` / `ON CONFLICT DO NOTHING`）
- [ ] `organization_user.department_cd` カラムが引き続き存在すること（Step5まで削除しない）

---

## 7. 次ステップへの引き渡し事項

- `organization_group` テーブルが存在すること
- `organization_group_user` テーブルが存在すること（多対多中間テーブル）
- `project.organization_group_cd` カラムが存在すること
- `attribute.organization_group_cd` カラムが存在すること
- `organization_user.department_cd` はStep5まで残置（移行期間中の互換カラム）
- Step2（Backend管理CRUD）・Step3（他機能参照置換）はこのStep1完了後に着手可能

---

## 8. 承認記録

- **計画書提示日時**: 2026-07-10 11:44
- **承認日時**: 2026-07-10 15:07

---

## 9. 実施記録

### 実施日時
開始: 2026-07-10 15:07  
完了: 2026-07-10 15:27

### 実施内容
- `docs/design/db/ddl/organization_group.sql` のtypoを修正（`organization_gourp` → `organization_group`）
- `backend/migrations/20260710_add_organization_group.sql` を新規作成（全6ステップ）
  - department → organization_group データ移行INSERTを追加（A5:SQL Mk-2対応でDO$$→シンプルなALTER TABLE文に変更）
- `docs/design/db/ddl/migrations/create_all_tables.sql` を更新
  - departmentテーブル定義をorganization_group + organization_group_userに置き換え
  - project.department_cd → organization_group_cdに変更
- マイグレーションをユーザーが手動適用（A5:SQL Mk-2使用）

### 計画からの変更点
- PLANでは`department`→`organization_group`のデータ移行は「手動再登録」としていたが、マイグレーションSQL内にINSERT文を追加して自動移行に変更
- `DO $$ ... $$` 構文はA5:SQL Mk-2で解釈エラーになるため、ステップ5・6をシンプルな `ALTER TABLE RENAME COLUMN` に変更（初回実行前提）

### 最終的な成果物
- [x] `organization_group` テーブル作成
- [x] `organization_group_user` テーブル作成（多対多中間テーブル）
- [x] `department` → `organization_group` データ移行
- [x] `organization_user.department_cd` → `organization_group_user` データ移行
- [x] `project.department_cd` → `organization_group_cd` リネーム
- [x] `attribute.department_cd` → `organization_group_cd` リネーム（存在する場合）
- [x] DDLファイル・create_all_tables.sql 更新完了
