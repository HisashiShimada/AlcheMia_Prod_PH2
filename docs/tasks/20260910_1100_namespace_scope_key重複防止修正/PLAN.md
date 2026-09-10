# タスク計画書: namespace scope_key 重複防止修正

## メタデータ
- **作成日時**: 2026-09-10 11:00
- **タスクID**: 20260910_1100
- **優先度**: 高

---

## タスク概要

UserManagement でユーザーを新規追加すると一覧に同じユーザーが重複表示されるバグの根本修正。

原因は `namespace` テーブルの `scope_key` に同一組織内の重複を防ぐ仕組みが不完全なこと。
具体的には以下の3点が問題：

1. **既存マイグレーション (`20260821`) が冪等でない**: `ALTER TABLE ... ADD CONSTRAINT` に `IF NOT EXISTS` がないため、制約が既に存在する環境で再実行するとエラーになる
2. **`registerUserNamespace` に事前重複チェックがない**: グループ作成の `ensureGroupNamespace` には `existsByScopeKey` による冪等チェックがあるが、ユーザー作成側にない
3. **`createNamespaceUri.sql` の `ON CONFLICT` が `scope_key` 重複を吸収しない**: `ON CONFLICT (organization_id, namespace_id) DO NOTHING` のみで、`scope_key` 重複は DB 制約エラーとして伝播する

---

## 目的と期待される成果

- [ ] 同一組織内で同じ `scope_key` の `namespace` レコードが複数作られなくなる
- [ ] 既存マイグレーションが冪等に実行できるようになる（`IF NOT EXISTS` 追加）
- [ ] ユーザー作成とグループ作成で scope_key 重複チェックの実装が統一される
- [ ] UserManagement でユーザー追加後の重複表示が解消される

---

## 影響範囲

- **別組織間での同じ scope_key は引き続き許容**: JOINに `organization_id` の条件があるため問題なし
- `createNamespaceUri.sql` を呼ぶ全箇所（ユーザー作成・グループ作成・組織作成）に影響するが、動作変更は「重複時にエラーではなくスキップ」になるのみ

---

## 実装ステップ

- [ ] 1. 既存マイグレーション `20260821` を冪等化（`IF NOT EXISTS` 追加・DELETE文の `namespace_id` 比較修正）
- [ ] 2. `userService.ts` の `registerUserNamespace` に `existsByScopeKey` 事前チェックを追加
- [ ] 3. `createNamespaceUri.sql` の `ON CONFLICT` を `(organization_id, scope_key)` 対応に修正

---

## 変更ファイル

| # | ファイル | 種別 | 変更内容 |
|---|---|---|---|
| 1 | `backend/migrations/20260821_add_unique_scope_key_to_namespace.sql` | 修正 | `ALTER TABLE` に `IF NOT EXISTS` 追加。DELETE文の比較キーを `namespace_id` から `create_at` に変更（古い方を残す）。また `IF NOT EXISTS` で冪等化する `DO $$` ブロックに全体を包む |
| 2 | `backend/src/services/userService.ts` | 修正 | `registerUserNamespace` に `existsByScopeKey` による事前チェックを追加（`ensureGroupNamespace` と同じパターン） |
| 3 | `backend/src/sql/queries/namespace_terms/createNamespaceUri.sql` | 修正 | `ON CONFLICT (organization_id, namespace_id)` → `ON CONFLICT (organization_id, scope_key) WHERE scope_key IS NOT NULL` に変更 |

---

## リスク

| リスク | 対策 |
|---|---|
| 既存DBに scope_key 重複データが残っている | マイグレーション先頭の DELETE で古い方を残して重複排除してから制約追加 |
| `ON CONFLICT ... WHERE` 構文（部分インデックス）の適用条件 | PostgreSQL では `ON CONFLICT` のターゲットに部分インデックスの `WHERE` 句を指定可能。UNIQUE 制約が `(organization_id, scope_key)` なら `WHERE` 不要。NULL は制約の対象外（PostgreSQL 仕様） |

---

## テスト計画

- [ ] マイグレーションファイルを重複した scope_key が存在する環境で実行し、エラーなく完了すること
- [ ] マイグレーションファイルを制約が既に存在する環境で再実行し、エラーなく完了すること（冪等確認）
- [ ] UserManagement でユーザーを新規追加し、一覧に重複表示されないこと
- [ ] グループ作成・組織作成が従来通り動作すること（`createNamespaceUri.sql` の変更影響確認）

---

## 承認記録
- **計画書提示日時**: 2026-09-10 11:00
- **承認日時**: 2026-09-10 11:30
- **承認者コメント**: 承認します

---

## 実施記録

### 実施日時
開始: 2026-09-10 11:30
完了: 2026-09-10 11:35

### 変更内容

#### 1. `backend/migrations/20260821_add_unique_scope_key_to_namespace.sql`
- DELETE 文の比較キーを `namespace_id`（文字列比較で不正確）→ `create_at`（古い方を残す）に変更
- `ALTER TABLE` を `DO $$ IF NOT EXISTS ... END$$` ブロックで囲み冪等化

#### 2. `backend/src/services/userService.ts`
- `registerUserNamespace` に `existsByScopeKey` による事前チェックを追加
- 既に同じ `scope_key` が存在する場合はスキップ（`ensureGroupNamespace` と同じパターンに統一）

#### 3. `backend/src/sql/queries/namespace_terms/createNamespaceUri.sql`
- `ON CONFLICT (organization_id, namespace_id) DO NOTHING` → `ON CONFLICT (organization_id, scope_key) WHERE scope_key IS NOT NULL DO NOTHING` に変更
- `scope_key IS NOT NULL` の部分条件により、scope_key = NULL のレコードは複数存在可能（従来通り）
