# タスク計画書: twoFactorAuth削除 バックエンド修正

## メタデータ
- **作成日時**: 2026-02-25 13:25
- **タスクID**: twoFactorAuth削除_バックエンド修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
`user_authentication.entry_flg`（二段階認証アプリ連携フラグ）カラムがDDLで削除される予定のため、
バックエンドの全参照箇所を削除する。

## 変更ファイル
1. `backend/src/repositories/userRepository.ts`
2. `backend/src/services/userService.ts`
3. `backend/src/controllers/userController.ts`
4. `backend/src/types/database.ts`
5. `backend/src/routes/userRoutes.ts`

## 実装ステップ
- [x] タスク計画書を作成
- [ ] `userRepository.ts` から `entry_flg` / `twoFactorAuth` を削除
- [ ] `userService.ts` から `twoFactorAuth` 関連処理・CSV列を削除
- [ ] `userController.ts` のレスポンスから `twoFactorAuth` を削除
- [ ] `database.ts` の型定義から `two_factor_auth` を削除
- [ ] `userRoutes.ts` のバリデーションから `twoFactorAuth` を削除

## 承認記録
- **承認日時**: 2026-02-25 13:25
