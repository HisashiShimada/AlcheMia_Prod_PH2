# タスク計画書: フロントエンド DB登録後リフレッシュ規約スキル追加

## メタデータ
- **作成日時**: 2026-09-11 11:00
- **タスクID**: 20260911_1000
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

フロントエンド側でDB登録・更新・削除等のボタン押下後の処理において、
**必ず `refetch()` を呼び出して画面をリフレッシュする**というルールを
`.cline/skills/frontend-develop-skill/docs/frontend.md` に追加する。

あわせて、`useApi` フックの `refetch` 動作を検証する単体テストを追加する。

## 目的と期待される成果

- [ ] `frontend.md` に「DB操作後の画面リフレッシュ規約」セクションを追加
- [ ] イベントハンドラ規約にリフレッシュ必須ルールを追記
- [ ] ベストプラクティスの DO/DON'T にリフレッシュルールを追加
- [ ] `useApi.test.ts` 単体テストを新規作成し、`refetch()` の動作を検証

## 実装ステップ

- [x] Step 0: タスク計画書作成
- [x] Step 1: `frontend.md` に規約セクション追加（DB操作後リフレッシュ）
- [x] Step 2: `frontend.md` のイベントハンドラ規約に追記
- [x] Step 3: `frontend.md` のベストプラクティスに追記
- [x] Step 4: `frontend/src/hooks/__tests__/useApi.test.ts` を新規作成
- [x] Step 5: テスト実行・ビルド確認（17 tests PASS、TSエラーなし）

## 変更ファイル

1. `.cline/skills/frontend-develop-skill/docs/frontend.md` - 規約追加（3箇所）
2. `frontend/src/hooks/__tests__/useApi.test.ts` - 新規作成

## リスク

| リスク | 対策 |
|--------|------|
| 既存コードにリフレッシュ未実装箇所がある | 今回はスキルドキュメント追加のみ。既存コード修正は別タスク |

## テスト計画

- [ ] `useApi.test.ts`: `refetch()` が fetchData を再実行すること
- [ ] `useApi.test.ts`: `useLazyApi` の `execute()` 成功後に `onSuccess` が呼ばれること
- [ ] `npm test` でエラーなし確認

## 承認記録
- **承認日時**: 2026-09-11 11:00
- **承認者コメント**: ユーザーが act モードに切り替え承認済み
