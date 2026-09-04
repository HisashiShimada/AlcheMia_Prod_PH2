# タスク計画書: TransitionStatus 遷移修正

## メタデータ
- **作成日時**: 2026-08-31 00:00
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`transition_data.status` のインサート・アップデートに関して、以下の問題が発見されたため修正する。

1. フロントエンドの `TransitionStatusCode` がバックエンドの `TransitionStatusEnum` と1ずれている（0-6 vs 1-7）
2. チェックアウト時に `transition_data` を「2: 準備状態」に更新する処理が未実装
3. バックエンドのバリデーションが `min:0, max:6` であり、値7が送れない
4. `progressService.ts` のステータスラベルが誤っている（`5: '作業中'` → `5: '休止中'`）
5. `status_transitions.md` のチェックアウト遷移ルールが誤記

## 実装ステップ

- [x] PLAN.md 作成
- [x] TODO-1: `frontend/src/constants/codeMaster.ts` — TransitionStatusCode を 1-7 に修正
- [x] TODO-2: `frontend/src/constants/__tests__/codeMaster.test.ts` — テスト期待値を 1-7 に修正
- [x] TODO-3: `backend/src/routes/progressRoutes.ts` — バリデーション `min:1, max:7` に修正
- [x] TODO-4-a: `backend/src/sql/queries/transition_data/updateStatusForCheckout.sql` — 新規作成
- [x] TODO-4-b: `backend/src/repositories/transitionDataRepository.ts` — `updateStatusForCheckout` メソッド追加
- [x] TODO-4-c: `backend/src/services/projectService.ts` — checkout() に更新処理追加
- [x] TODO-5: `backend/src/services/progressService.ts` — ラベル修正（5: '作業中' → '休止中'）
- [x] TODO-6: `.cline/skills/backend-develop-skill/docs/status_transitions.md` — ドキュメント修正

## 変更ファイル
1. `frontend/src/constants/codeMaster.ts` ✅
2. `frontend/src/constants/__tests__/codeMaster.test.ts` ✅
3. `backend/src/routes/progressRoutes.ts` ✅
4. `backend/src/sql/queries/transition_data/updateStatusForCheckout.sql`（新規）✅
5. `backend/src/repositories/transitionDataRepository.ts` ✅
6. `backend/src/services/projectService.ts` ✅
7. `backend/src/services/progressService.ts` ✅
8. `.cline/skills/backend-develop-skill/docs/status_transitions.md` ✅

## 承認記録
- **承認日時**: 2026-08-31 （ユーザー承認済み）

## 実施記録
- **完了日時**: 2026-08-31
- テスト: TransitionStatusCode 9テスト全パス ✅
- TypeScript: コンパイルエラーなし ✅
