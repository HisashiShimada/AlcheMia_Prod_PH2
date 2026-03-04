# タスク計画書: issueRoutes GET /api/v1/issues クエリパラメータ命名修正

## メタデータ
- **作成日時**: 2026-02-27 10:16
- **タスクID**: issueRoutes_query_param_naming
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`backend/src/routes/issueRoutes.ts` の `GET /api/v1/issues` エンドポイントにおいて、クエリパラメータ名が設計書（`docs/design/api/api_issue_management.md` Section 3）と一致していない。設計書は camelCase を採用しているが、実装は snake_case になっているため、設計書の命名規則に合わせて実装を修正する。

## 目的と期待される成果

### 目的
設計書との整合性を保ち、フロントエンドとのI/Fを統一する。

### 期待される成果
- [ ] `GET /api/v1/issues` のクエリパラメータ名が設計書（camelCase）に準拠する
- [ ] 変更対象のバリデーションルール内容（必須/任意・型制約）は変更しない

## 不一致の詳細

| 設計書（camelCase） | 実装（snake_case）| 修正要否 |
|---|---|---|
| `projectId` | `project_id` | ✅ 修正必要 |
| `methodId` | `method_id` | ✅ 修正必要 |
| `taskNo` | `task_no` | ✅ 修正必要 |
| `transitionId` | `transition_id` | ✅ 修正必要 |
| `status` | `status` | - 変更なし |
| `issueType` | `issue_type` | ✅ 修正必要 |

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] タスク計画書を作成しユーザーに提示

### Phase 2: ソースコード修正
- [ ] `query('project_id')` → `query('projectId')` に変更
- [ ] `query('method_id')` → `query('methodId')` に変更
- [ ] `query('task_no')` → `query('taskNo')` に変更
- [ ] `query('transition_id')` → `query('transitionId')` に変更
- [ ] `query('issue_type')` → `query('issueType')` に変更

## 変更ファイル
1. `backend/src/routes/issueRoutes.ts` - `GET /api/v1/issues` のクエリパラメータ名を snake_case → camelCase に変更

## リスク
| リスク | 対策 |
|--------|------|
| コントローラー側で snake_case を参照している場合、動作が変わる | コントローラー（issueController.ts）の `req.query` 参照箇所を確認し、必要に応じて合わせて修正する |

## テスト計画
- [ ] 修正後、バリデーションエラーが正しく発生することを確認
- [ ] テストファイル（`backend/tests/routes/issueRoutes.test.ts`）のパラメータ名も合わせて確認・修正が必要か確認する

## 承認記録
- **承認日時**: 2026-02-27 10:16
- **承認者コメント**: 設計書の命名規則にあわせるようにソースコードの修正を承認
