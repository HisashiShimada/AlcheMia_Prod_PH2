# タスク計画書: プロジェクト初期登録漏れ修正

## メタデータ
- **作成日時**: 2026-05-15 08:18
- **タスクID**: project-insert-fix
- **優先度**: 高
- **推定工数**: 1.5時間

## タスク概要

`ProjectRepository.insert()` を呼び出す際に `department_cd` が常に `null` で固定されており、
部署情報が登録されない問題を修正する。
また、プロジェクト初期登録時に設定すべき全カラムの登録漏れを調査・修正する。

## 調査結果

### DDL（`docs/design/db/ddl/project.sql`）のカラム一覧と現状

| カラム | insert時の設定状況 | 問題 |
|--------|-------------------|------|
| `organization_id` | ✅ 設定済み | - |
| `project_id` | ✅ 設定済み | - |
| `project_name` | ✅ 設定済み | - |
| `description` | ✅ 設定済み | - |
| `department_cd` | ❌ 常に `null` | **問題①** |
| `owner_user_id` | ✅ 設定済み | - |
| `project_status` | ✅ `0` で設定済み | - |
| `project_maiml_flg` | ✅ `false` で設定済み | - |
| `checkout_status` | ✅ `0` で設定済み | - |
| `create_user_id` | ✅ 設定済み | - |
| `create_at` | ✅ 設定済み | - |
| `update_user_id` | ✅ 設定済み | - |
| `update_at` | ✅ 設定済み | - |
| `project_uuid` | ❌ 未設定（NULL） | **問題②** |

### 問題① `department_cd` が常に null

**原因箇所**: `backend/src/controllers/projectController.ts` L31
```typescript
const departmentId = null; // req.session?.department_id || null; ToDo プルリク#38待ち
```
→ TODO コメントのまま実装されず、`null` ハードコードが残っている。

**取得元の確認**:
- `department_cd` の取得元は **ログインユーザー情報**（`req.user`）
- `backend/src/types/auth.ts` に `departmentCd?: string` が定義済み
- 他の Controller（`formatController.ts` など）でも `req.user!.departmentCd` として利用済み
- Service 層の `create()` には `departmentId` パラメータが既に存在している

**修正方針**:
1. Controller L31 の `null` ハードコードを `req.user!.departmentCd ?? null` に変更する
2. `CreateProjectRequest` 型の変更は**不要**（リクエストボディ経由ではなくトークン情報から取得するため）

### 問題② `project_uuid` が未設定（NULL のまま）

**DDL の制約**: `UNIQUE (project_uuid)` ← NULL は複数許容されるため DB エラーにはならないが、設計上は空白のはず

**本来の仕様**: `project_uuid` は MAIMLファイルの `<Document uuid>` と同値であり、
MAIMLファイルがアップロードされた時点で設定されるカラム。
**プロジェクト作成時は NULL のままで正しい**（MAIMLは後から登録するため）。

→ **問題②は実際には問題ではなく、意図的な設計**。修正不要。

### 修正が必要なファイル

1. `backend/src/controllers/projectController.ts` — `departmentId` の取得を `req.user` から行うよう修正

## 目的と期待される成果

- [ ] Controller の `departmentId = null` ハードコードを解消し、ログインユーザーの `departmentCd` を使用する
- [ ] `project_uuid` は設計通り NULL のため修正不要であることを確認・記録する

## 実装ステップ

### Phase 1: Controller の修正（1ファイルのみ）
- [ ] `projectController.ts` の `create` 関数を修正
  - L31 の `const departmentId = null; // ... ToDo プルリク#38待ち` を削除
  - `req.user!.departmentCd ?? null` を `departmentId` として取得するよう変更
  - `projectService.create()` の第3引数 `departmentId` はそのまま

## 変更ファイル

1. `backend/src/controllers/projectController.ts` — `create` 関数の `departmentId` 取得部分を修正（1行のみ）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ログインユーザーに `departmentCd` が設定されていない場合は NULL になる | 低 | 中 | `?? null` で NULL フォールバックを維持するため正常動作 |

## テスト計画

- [ ] 部署CDが設定されたユーザーでプロジェクト作成 API を呼び、DBに部署CDが正しく保存されることを確認
- [ ] 部署CDが未設定のユーザーでも正常にプロジェクトが作成できることを確認

## 承認記録

- **計画書提示日時**: 2026-05-15 08:18
- **承認日時**: 2026-05-15 08:30
- **承認者コメント**: 承認。変数名 departmentId → departmentCd に変更も合わせて対応。

## 実施記録

### 実施日時
開始: 2026-05-15 08:18
完了: 2026-05-15 08:30

### 変更内容
`backend/src/controllers/projectController.ts` の `create` 関数 L31 を修正:
- 修正前: `const departmentId = null; // req.session?.department_id || null; ToDo プルリク#38待ち`
- 修正後: `const departmentCd = req.user!.departmentCd ?? null;`
- Service 呼び出し箇所の引数も `departmentId` → `departmentCd` に変数名を統一

### 最終的な成果物
- [x] `department_cd` のハードコード null を解消し、ログインユーザーの `departmentCd` を使用するよう修正
- [x] 変数名を `departmentId` → `departmentCd` に統一
- [x] `project_uuid` は設計通り NULL（修正不要）を確認
