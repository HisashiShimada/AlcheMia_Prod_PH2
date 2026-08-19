# タスク計画書: 評価関連リテラルユニオン型排除

## メタデータ
- **作成日時**: 2026-08-19 11:00
- **タスクID**: 20260819_1100_評価関連リテラルユニオン型排除
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## タスク概要

interface のフィールドにリテラルユニオン型（`'ACTIVE' | 'DEPRECATED'` 等）を使うのをやめ、
フィールド型は `string`（基本型）にする。
有効な値の集合は `as const` オブジェクト定数として専用ファイルに定義し、
コード内での値参照はそこから行う。

---

## 対象の残存リテラルユニオン型

### AggregationRule interface（frontend・backend 両方）
| フィールド | 現在 |
|---|---|
| `status` | `'ACTIVE' \| 'DEPRECATED'` |
| `target_rollup` | `'WORST_CASE' \| 'MAJORITY' \| 'AVERAGE'` |
| `level_status_rule` | `'WORST_CASE' \| 'MAJORITY'` |
| `level_score_rule` | `'MEAN' \| 'MIN'` |
| `missing_handling` | `'SEPARATE_COUNT' \| 'EXCLUDE_DENOMINATOR' \| 'TREAT_AS_GOOD'` |
| `transition_hierarchy` | `'MERGE' \| 'SPLIT'` |

### SubEvaluationScope type alias（frontend・backend 両方）
`'METHOD' | 'TASK' | 'TRANSITION_METHOD' | 'TRANSITION_TASK'`

---

## 実装ステップ

- [x] PLAN.md 作成
- [ ] Step 1: `backend/src/enums/aggregationRule.enum.ts` 新規作成
- [ ] Step 2: `frontend/src/constants/aggregationRule.ts` 新規作成
- [ ] Step 3: `backend/src/types/aggregationRule.ts` フィールド型を `string` に変更・`CreateAggregationRuleInput` も同様
- [ ] Step 4: `frontend/src/types/aggregationRule.ts` 同上
- [ ] Step 5: `backend/src/types/projectOverallEvaluation.ts` `SubEvaluationScope` type alias 削除・参照箇所を `string` に
- [ ] Step 6: `frontend/src/types/projectOverallEvaluation.ts` 同上
- [ ] Step 7: `backend/src/services/aggregationCalculatorService.ts` リテラル比較→定数参照・型参照→`string`
- [ ] Step 8: `backend/src/routes/aggregationRuleRoutes.ts` `.isIn([...])` → `Object.values(定数)`
- [ ] Step 9: `backend/src/repositories/aggregationRuleRepository.ts` デフォルト値リテラル → 定数参照
- [ ] Step 10: `backend/src/routes/projectOverallEvaluationRoutes.ts` `.isIn([...])` → `Object.values(定数)`
- [ ] Step 11: `frontend/src/components/project/EvaluationDialog.tsx` `SubEvaluationScope` 型参照・比較リテラル → 定数参照・`string`
- [ ] Step 12: `frontend/src/components/project/EvaluationRegistrationTab.tsx` 同上
- [ ] Step 13: `.clinerules/development/typescript.md` ルール更新
- [ ] Step 14: ビルドチェック（frontend + backend）

---

## 承認記録
- **承認日時**: 2026-08-19（Act モード切替により承認）
