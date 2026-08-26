# タスク計画書: aggregation_rules / project_overall_evaluations カラム整理

## メタデータ

- **作成日時**: 2026-08-19 10:00
- **タスクID**: 20260819_1000
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`aggregation_rules` および `project_overall_evaluations` テーブルのカラムを下記方針で整理する。

1. **TEXT → VARCHAR / UUID への変換**: 想定される最大値が確定しているカラムは適切な型・サイズに変換する
2. **`status` → `is_active` への変換**: `aggregation_rules.status`（ACTIVE / DEPRECATED の2値）を他テーブルと同様の `is_active BOOLEAN` に変換する
3. **共通カラムの統一**: `create_user_id`・`create_at`・`update_user_id`・`update_at` を必ず持たせる
4. **命名の統一**: `created_by` / `created_at`（aggregation_rules）を他テーブルの慣習（`create_user_id` / `create_at`）に合わせてリネームする。`evaluated_by` → `evaluated_user_id` にリネームする
5. **主キー再設計**: `project_overall_evaluations` の PK を `evaluation_id UUID` から `evaluation_seq SERIAL` + `project_id` 含む複合主キーに変更する

---

## 2. 目的と期待される成果

- [ ] 両テーブルのカラム型・命名がプロジェクト標準（vendor, organization_group 等）と統一される
- [ ] `aggregation_rules.status` が `is_active BOOLEAN` に置き換わり、ロジックがシンプルになる
- [ ] 両テーブルに `update_user_id` / `update_at` が追加され、更新者追跡が可能になる
- [ ] マイグレーションSQLで既存DBに安全に適用できる

---

## 3. 現状と変更後の比較（最終決定版）

### 3-1. `aggregation_rules` テーブル

| カラム名（現状） | 型（現状） | 変更内容 | カラム名（変更後） | 型（変更後） |
|---|---|---|---|---|
| `rule_id` | UUID NOT NULL | 変更なし | `rule_id` | UUID NOT NULL |
| `organization_id` | TEXT NOT NULL | TEXT → UUID | `organization_id` | UUID NOT NULL |
| `version` | INTEGER NOT NULL | 変更なし | `version` | INTEGER NOT NULL |
| `status` | TEXT CHECK('ACTIVE','DEPRECATED') | **削除** → `is_active` に置換 | ~~`status`~~ | — |
| — | — | **新規追加** | `is_active` | BOOLEAN NOT NULL DEFAULT true |
| `score_good` | INTEGER NOT NULL | 変更なし | `score_good` | INTEGER NOT NULL |
| `score_caution` | INTEGER NOT NULL | 変更なし | `score_caution` | INTEGER NOT NULL |
| `score_bad` | INTEGER NOT NULL | 変更なし | `score_bad` | INTEGER NOT NULL |
| `target_rollup` | TEXT NOT NULL CHECK(...) | TEXT → VARCHAR（最長10文字） | `target_rollup` | VARCHAR(20) NOT NULL |
| `level_status_rule` | TEXT NOT NULL CHECK(...) | TEXT → VARCHAR（最長10文字） | `level_status_rule` | VARCHAR(20) NOT NULL |
| `level_score_rule` | TEXT NOT NULL CHECK(...) | TEXT → VARCHAR（最長4文字） | `level_score_rule` | VARCHAR(10) NOT NULL |
| `missing_handling` | TEXT NOT NULL CHECK(...) | TEXT → VARCHAR（最長19文字） | `missing_handling` | VARCHAR(30) NOT NULL |
| `transition_hierarchy` | TEXT NOT NULL CHECK(...) | TEXT → VARCHAR（最長5文字） | `transition_hierarchy` | VARCHAR(10) NOT NULL |
| `created_by` | TEXT | **リネーム** + TEXT → VARCHAR(50) | `create_user_id` | VARCHAR(50) |
| `created_at` | TIMESTAMPTZ NOT NULL | **リネーム** | `create_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| — | — | **新規追加** | `update_user_id` | VARCHAR(50) |
| — | — | **新規追加** | `update_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |

> **主キー**: `(organization_id, rule_id, version)` の複合主キー。変更なし。

### 3-2. `project_overall_evaluations` テーブル

| カラム名（現状） | 型（現状） | 変更内容 | カラム名（変更後） | 型（変更後） |
|---|---|---|---|---|
| `evaluation_id` | UUID NOT NULL | **削除**（serial連番に置換） | ~~`evaluation_id`~~ | — |
| — | — | **新規追加** | `evaluation_seq` | SERIAL NOT NULL |
| `organization_id` | TEXT NOT NULL | TEXT → UUID | `organization_id` | UUID NOT NULL |
| `project_id` | TEXT NOT NULL | TEXT → VARCHAR(20) ※他テーブル準拠 | `project_id` | VARCHAR(20) NOT NULL |
| `evaluation_scope` | TEXT NOT NULL CHECK(...) | TEXT → VARCHAR（最長17文字） | `evaluation_scope` | VARCHAR(20) NOT NULL |
| `method_id` | TEXT | TEXT → VARCHAR | `method_id` | VARCHAR(100) |
| `task_no` | INTEGER | 変更なし | `task_no` | INTEGER |
| `transition_id` | TEXT | TEXT → VARCHAR | `transition_id` | VARCHAR(100) |
| `evaluated_by` | TEXT | **リネーム** + TEXT → VARCHAR(50) | `evaluated_user_id` | VARCHAR(50) |
| `evaluated_at` | TIMESTAMPTZ NOT NULL | DEFAULT NOW() 追加 | `evaluated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `overall_digital` | TEXT CHECK(...) | TEXT → VARCHAR（最長3文字） | `overall_digital` | VARCHAR(10) |
| `overall_score` | INTEGER | 変更なし | `overall_score` | INTEGER |
| `overall_analog` | TEXT | ✅ 自由文章のため TEXT 維持 | `overall_analog` | TEXT |
| `applied_rule_id` | UUID | 変更なし | `applied_rule_id` | UUID |
| `applied_rule_version` | INTEGER | 変更なし | `applied_rule_version` | INTEGER |
| `applied_rule_snapshot` | JSONB | 変更なし | `applied_rule_snapshot` | JSONB |
| `aggregation_snapshot` | JSONB | 変更なし | `aggregation_snapshot` | JSONB |
| `create_user_id` | TEXT | TEXT → VARCHAR(50) | `create_user_id` | VARCHAR(50) |
| `create_at` | TIMESTAMPTZ NOT NULL | DEFAULT NOW() 追加 | `create_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| — | — | **新規追加** | `update_user_id` | VARCHAR(50) |
| — | — | **新規追加** | `update_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |

> **主キー**: `(organization_id, project_id, evaluation_seq)` の複合主キーに変更。

---

## 4. 実装ステップ（チェックリスト）

### Step 1: DDL ファイルの更新（2ファイル）👤 ユーザー担当 ✅ **完了**

A5:SQL ER図を訂正後、生成された DDL を配置済み。

- [x] `backend/src/sql/ddl/aggregation_rules.sql` — ER図から出力した新定義に差し替え済み
- [x] `backend/src/sql/ddl/project_overall_evaluations.sql` — ER図から出力した新定義に差し替え済み

> ※ docs/design/db/ddl/ の内容を backend/src/sql/ddl/ に反映する作業も合わせて実施

### Step 2: マイグレーション SQL の作成（2ファイル）✅ **完了**

既存 DB に安全に適用するための ALTER 文。`BEGIN〜COMMIT` トランザクションで一括実行する。

- [x] `backend/migrations/20260820_alter_aggregation_rules.sql`
- [x] `backend/migrations/20260820_alter_project_overall_evaluations.sql`

### Step 3: TypeScript 型定義の更新（2ファイル）✅ **完了**

- [x] `backend/src/types/aggregationRule.ts`
- [x] `backend/src/types/projectOverallEvaluation.ts`

### Step 4: Enum / 定数ファイルの更新（2ファイル）✅ **完了**

- [x] `backend/src/enums/aggregationRule.enum.ts` — `AggregationRuleStatus` を @deprecated に変更（参照箇所なし確認済み）
- [x] `frontend/src/constants/aggregationRule.ts` — 同上

### Step 5: SQL クエリファイルの更新（9ファイル）✅ **完了**

**aggregation_rules クエリ（4ファイル）**

- [x] `aggregation_rules/insert.sql`
- [x] `aggregation_rules/findActive.sql`
- [x] `aggregation_rules/findAll.sql`
- [x] `aggregation_rules/deprecateOld.sql`

**project_overall_evaluations クエリ（5ファイル）**

- [x] `project_overall_evaluations/insert.sql`
- [x] `project_overall_evaluations/insertSubEvaluation.sql`
- [x] `project_overall_evaluations/updateSubEvaluation.sql`
- [x] `project_overall_evaluations/findByProject.sql`
- [x] `project_overall_evaluations/findSubEvaluationsByProject.sql`

### Step 6: Repository ファイルの更新（2ファイル）✅ **完了**

- [x] `backend/src/repositories/aggregationRuleRepository.ts`
- [x] `backend/src/repositories/projectOverallEvaluationRepository.ts`

### Step 7: 波及箇所の確認・修正 ✅ **完了**

- [x] `aggregationRuleService.ts`: `deprecateOld()` に `userId` 引数追加
- [x] `projectOverallEvaluationService.ts`: `evaluation_id` → `evaluation_seq`、`evaluated_by` → `evaluated_user_id`、`update_user_id` 追加
- [x] TypeScript コンパイル確認: エラー 0 件

---

## 5. 影響範囲

### 直接変更するファイル（19ファイル）

| # | ファイルパス | 変更種別 | 担当 |
|---|---|---|---|
| 1 | `backend/src/sql/ddl/aggregation_rules.sql` | 更新（ER図から差し替え） | 👤 ユーザー |
| 2 | `backend/src/sql/ddl/project_overall_evaluations.sql` | 更新（ER図から差し替え） | 👤 ユーザー |
| 3 | `backend/migrations/20260819_alter_aggregation_rules.sql` | 新規作成 | 🤖 Cline |
| 4 | `backend/migrations/20260819_alter_project_overall_evaluations.sql` | 新規作成 | 🤖 Cline |
| 5 | `backend/src/types/aggregationRule.ts` | 更新 | 🤖 Cline |
| 6 | `backend/src/types/projectOverallEvaluation.ts` | 更新 | 🤖 Cline |
| 7 | `backend/src/enums/aggregationRule.enum.ts` | 更新（`AggregationRuleStatus` 削除） | 🤖 Cline |
| 8 | `frontend/src/constants/aggregationRule.ts` | 更新（`AggregationRuleStatus` 削除） | 🤖 Cline |
| 9 | `backend/src/sql/queries/aggregation_rules/insert.sql` | 更新 | 🤖 Cline |
| 10 | `backend/src/sql/queries/aggregation_rules/findActive.sql` | 更新 | 🤖 Cline |
| 11 | `backend/src/sql/queries/aggregation_rules/findAll.sql` | 更新 | 🤖 Cline |
| 12 | `backend/src/sql/queries/aggregation_rules/deprecateOld.sql` | 更新 | 🤖 Cline |
| 13 | `backend/src/sql/queries/project_overall_evaluations/insert.sql` | 更新 | 🤖 Cline |
| 14 | `backend/src/sql/queries/project_overall_evaluations/insertSubEvaluation.sql` | 更新 | 🤖 Cline |
| 15 | `backend/src/sql/queries/project_overall_evaluations/updateSubEvaluation.sql` | 更新 | 🤖 Cline |
| 16 | `backend/src/sql/queries/project_overall_evaluations/findByProject.sql` | 更新 | 🤖 Cline |
| 17 | `backend/src/sql/queries/project_overall_evaluations/findSubEvaluationsByProject.sql` | 更新 | 🤖 Cline |
| 18 | `backend/src/repositories/aggregationRuleRepository.ts` | 更新 | 🤖 Cline |
| 19 | `backend/src/repositories/projectOverallEvaluationRepository.ts` | 更新 | 🤖 Cline |

### 波及確認が必要なファイル（Step 7 で調査）

| 確認ポイント | 対象 |
|---|---|
| `evaluation_id` の受け渡し | `backend/src/services/` 配下・`backend/src/controllers/` 配下 |
| `evaluated_by` の参照 | 同上 |
| `AggregationRuleStatus` の参照（調査済み: 0件） | 念のため再確認 |
| `applied_rule_snapshot` JSONB から `status` キーを読む箇所 | Service 層 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `applied_rule_snapshot` JSONB 内に旧 `status` キーが存在し、型不整合が発生 | 中 | 中 | 読み取り箇所で `status` キーも許容するよう型を調整するか、正規化処理を追加する |
| `AggregationRuleStatus` 参照箇所の置換漏れによるコンパイルエラー | 高 | 中 | 実装前に `grep -r AggregationRuleStatus` で全参照を洗い出し、すべて置換してから定数削除を実施 |
| マイグレーション中にカラム変換が失敗し中途半端な状態になる | 高 | 低 | `BEGIN〜COMMIT` トランザクションに全変更をまとめ、エラー時は自動ロールバックさせる |
| `deprecateOld()` のシグネチャ変更により呼び出し元のコンパイルが通らなくなる | 中 | 低 | シグネチャ変更後に TypeScript コンパイルエラーで全呼び出し箇所を検出し一括修正する |

---

## 7. 特記事項

### `overall_analog` は TEXT 維持

`project_overall_evaluations.overall_analog` は実験者が自由に記述するコメント欄であるため、長さを制限すると仕様変更となる。TEXT のまま維持する。

### `AggregationRuleStatus` 削除後の置換ルール

| 旧コード | 新コード |
|---|---|
| `status === AggregationRuleStatus.ACTIVE` | `is_active === true` |
| `status === AggregationRuleStatus.DEPRECATED` | `is_active === false` |
| `status: AggregationRuleStatus.ACTIVE` | `is_active: true` |

### マイグレーションのトランザクション設計

```sql
BEGIN;
  -- 1. is_active カラム追加（デフォルト false）
  ALTER TABLE aggregation_rules ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;
  -- 2. 旧 status 値に基づいてデータ変換
  UPDATE aggregation_rules SET is_active = (status = 'ACTIVE');
  -- 3. status カラム削除
  ALTER TABLE aggregation_rules DROP COLUMN status;
  -- 4. カラムリネームと型変換
  ALTER TABLE aggregation_rules RENAME COLUMN created_by TO create_user_id;
  ALTER TABLE aggregation_rules RENAME COLUMN created_at TO create_at;
  ALTER TABLE aggregation_rules ALTER COLUMN create_user_id TYPE VARCHAR(36);
  -- ... その他の変更
COMMIT;
```

---

## 8. テスト計画

- [ ] マイグレーション SQL を開発 DB に適用し、既存データが正しく変換されること（is_active = true/false の対応確認）
- [ ] TypeScript のコンパイルエラーが出ないこと（`cd backend && npx tsc --noEmit`）
- [ ] `AggregationRuleStatus` 削除後に参照箇所がすべて置換されていること
- [ ] `findActive` で `is_active = true` のレコードのみ返ること
- [ ] `deprecateOld` 実行後に `is_active = false` かつ `update_at` が更新されること
- [ ] 全体評価・下位評価の INSERT 後に `update_user_id` / `update_at` が正しくセットされること

---

## 9. ロールバック計画

マイグレーション SQL は `BEGIN〜COMMIT` トランザクション内で実行するため、途中でエラーが発生した場合は自動ロールバックされる。
手動ロールバックが必要な場合は逆方向の ALTER TABLE（`is_active` 削除 → `status` TEXT 再追加・データ変換 / カラムリネームの逆など）を別マイグレーションとして適用する。

---

## 10. 設計決定事項まとめ

ddl_sample.txt（2026-08-19 版）照合・議論を経て確定した全決定事項。

| # | 事項 | 決定内容 |
|---|---|---|
| A | PK構造（project_overall_evaluations） | `evaluation_id UUID` 削除 → `evaluation_seq SERIAL` + PK = `(organization_id, project_id, evaluation_seq)` |
| B | `evaluated_by` カラム名 | `evaluated_user_id` にリネーム（user_id 系命名規則統一） |
| C | aggregation_rules の有効/無効フラグ | `status TEXT` 削除 → `is_active BOOLEAN NOT NULL DEFAULT true` 追加（SQLのみの参照のため影響なし） |
| D | 日時型 | `TIMESTAMPTZ` に統一（他テーブルに合わせる） |
| E | user_id 系カラムサイズ | `VARCHAR(50)` に統一（他テーブルに合わせる） |
| F | 日時カラム名 | `create_at` / `update_at` に統一（aggregation_rules の `created_at` もリネーム） |
| G | enum 系カラム桁数 | 各カラムで明示（VARCHAR(10)〜VARCHAR(100)）※セクション3参照 |
| H | テーブル名 | `aggregation_rules`（複数形）維持 |

---

## 11. 承認記録

- **計画書提示日時**: 2026-08-19 10:00
- **ddl_sample.txt 照合・全決定事項確定**: 2026-08-19
- **承認日時**: 2026-08-20
- **実装完了日時**: 2026-08-20
- **コンパイル確認**: TypeScript エラー 0 件

