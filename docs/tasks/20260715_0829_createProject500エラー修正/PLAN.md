# タスク計画書: createProject 500エラー修正

## メタデータ
- **作成日時**: 2026-07-15 08:29
- **タスクID**: createProject-500-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`projectApiService.createProject()` を実行すると 500 エラーが返る問題を修正する。
バックエンドのログに何も出ない理由も含めて修正する。

## 根本原因

1. `backend/migrations/20260710_add_organization_group.sql` で `project` テーブルの `department_cd` カラムが `organization_group_cd` にリネームされた。
2. `backend/src/types/database.ts` の `Project` インターフェースが `department_cd?: string` のまま未更新。
3. `ProjectService.create()` が古いフィールド名 `department_cd` を含むオブジェクトを `projectRepository.insert()` に渡す。
4. `projectRepository.insert()` は `Object.keys(data)` でカラム名を動的生成するため、存在しないカラム `department_cd` を含むINSERT文が生成 → PostgreSQLエラー。
5. `ProjectService.create()` の catch ブロックにログ出力がないため、エラーがログに残らずフロントには汎用500だけが返る。

## 実装ステップ

- [ ] `backend/src/types/database.ts`: `Project.department_cd` → `organization_group_cd` に修正
- [ ] `backend/src/services/projectService.ts`:
  - `create()` 内の `department_cd:` → `organization_group_cd:` に修正
  - `(insertResult as any).organization_group_cd` の `as any` キャストを除去（型安全化）
  - catch ブロックに `logError()` を追加（再発防止）
- [ ] 動作確認

## 変更ファイル

1. `backend/src/types/database.ts` - `Project.department_cd` → `organization_group_cd` に修正
2. `backend/src/services/projectService.ts` - カラム名修正 + ログ追加

## リスク
| リスク | 対策 |
|--------|------|
| `department_cd` を参照している他箇所への影響 | grep 済み。`types/database.ts` と `projectService.ts` のみ。他箇所は既に `organization_group_cd` に更新済み |
| `ProjectWithOwnerAndDept.department_cd` も別の型で残っている | これは SQL 戻り値型のため別の問題。今回のスコープ外とし、変更しない |

## 承認記録
- **承認日時**: 2026-07-15 08:29（調査結果を提示しAct切り替えにより承認）
