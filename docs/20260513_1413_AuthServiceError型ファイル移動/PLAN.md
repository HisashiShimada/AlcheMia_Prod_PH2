# タスク計画書: AuthServiceError を types/error.ts に移動

## メタデータ
- **作成日時**: 2026-05-13 14:13
- **タスクID**: AuthServiceError型ファイル移動
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`errorUtils.ts` が `authService.ts` から `AuthServiceError` をimportしており、
Utils が Service に依存するという不正な依存方向が生じている。
`AuthServiceError` クラスを `types/error.ts` に移動することで依存を解消する。

## 目的と期待される成果
- [ ] `errorUtils.ts` から `authService.ts` への import を削除
- [ ] `AuthServiceError` を `types/error.ts` に移動
- [ ] `authService.ts` は `types/error.ts` から import（正しい方向）
- [ ] 循環依存の排除

## 実装ステップ
- [ ] `types/error.ts` に `AuthServiceError` クラスを追加
- [ ] `errorUtils.ts` の import を `@/services/authService` → `@/types/error` に変更
- [ ] `authService.ts` の `AuthServiceError` 定義を削除し、`types/error.ts` からimportに変更

## 変更ファイル
1. `frontend/src/types/error.ts` - `AuthServiceError` クラスを追加
2. `frontend/src/utils/errorUtils.ts` - import元を変更
3. `frontend/src/services/authService.ts` - クラス定義を削除しimportに変更
