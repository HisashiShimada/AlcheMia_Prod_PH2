# タスク計画書: experiment_uncertainty_judge スキーマ変更対応

## メタデータ
- **作成日時**: 2026-08-27 16:00
- **タスクID**: 20260827_1600
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`docs/design/db/ddl/experiment_uncertainty_judge.sql` のDDL変更に伴い、関連ソースコードを修正する。

### 主な変更内容
| 変更前 | 変更後 |
|--------|--------|
| PK: `id BIGSERIAL` | PK: `judge_seq SERIAL` |
| `update_user_id` なし | `update_user_id CHARACTER VARYING(50)` 追加 |
| `update_at` なし | `update_at CHARACTER VARYING(50)` 追加 |

## 目的と期待される成果
- [ ] ソースコードが新DDLと整合する状態にする
- [ ] `id` → `judge_seq` の参照箇所をすべて修正
- [ ] `update_user_id` / `update_at` の型定義追加

## 実装ステップ

### Backend

- [ ] `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`
  - `ExperimentUncertaintyJudgeRow.id` → `judgeSeq`
  - `update_user_id / update_at` フィールドを追加
  - `insert()` の戻り値を `id` → `judgeSeq` に変更
  - コメント更新（主キー: judge_seq (SERIAL)）

- [ ] `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql`
  - `RETURNING id` → `RETURNING judge_seq`

- [ ] `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql`
  - SELECT: `id` → `judge_seq AS "judgeSeq"`
  - ORDER BY: `id DESC` → `judge_seq DESC`

- [ ] `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql`
  - SELECT: `id` → `judge_seq AS "judgeSeq"`
  - ORDER BY: `id DESC` → `judge_seq DESC`

- [ ] マイグレーションファイル `backend/migrations/20260827_xxx_alter_experiment_uncertainty_judge.sql` 新規作成

## 変更ファイル
1. `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`
2. `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql`
3. `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql`
4. `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql`
5. `backend/migrations/20260827_001_alter_experiment_uncertainty_judge.sql`（新規）

## リスク
| リスク | 対策 |
|--------|------|
| `id` を参照している箇所の見落とし | grep で全検索後に対応 |

## テスト計画
- [ ] TypeScriptコンパイルエラーがないことを確認

## 承認記録
- **承認日時**: 実装開始前に承認済み（ユーザー指示によりタスク実行）
