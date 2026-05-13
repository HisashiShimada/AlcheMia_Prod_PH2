# タスク計画書: ログインレート制限修正

## メタデータ
- **作成日時**: 2026-04-23 09:39
- **タスクID**: login-rate-limit-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

ログイン時のパスワード5回失敗によるレート制限に関して、以下の3つの不具合を修正する。

1. `rateLimitMiddleware.ts` の `keyGenerator` が `req.query.orgId` のみ参照しているが、フロントエンドは `X-Organization-Id` ヘッダーで送信するため `req.query.orgId` が常に `undefined` になる
2. SQLクエリの `organizationId` 取得も同様に `req.query.orgId` のみ参照しており、さらに成功ログインも失敗としてカウントしてしまう（`login_sf = false` フィルタなし）
3. `authApi.ts` のリクエストボディフィールド名が `username` だが、バックエンドは `userId` を期待している

## 目的と期待される成果

- [x] レート制限が正しく組織IDとユーザーIDで識別されるようにする
- [x] 失敗ログインのみカウントし、成功ログインでロックアウトされないようにする
- [x] フロントエンドとバックエンドのフィールド名を統一する
- [x] login_history に書き込む user_id をレート制限クエリと同一値（入力userId）に統一する

## 実装ステップ

### Phase 1: rateLimitMiddleware.ts の修正
- [x] `loginRateLimit` の `keyGenerator` を `x-organization-id` ヘッダーにも対応
- [x] SQLクエリの `organizationId` 取得をヘッダー対応に修正
- [x] SQLクエリに `AND login_sf = false` を追加（失敗のみカウント）
- [x] `userId` の split 方式を廃止し直接取得に変更

### Phase 2: authApi.ts の修正
- [x] リクエストボディのフィールド名を `username` → `userId` に修正

### Phase 3: authService.ts の修正（追加調査で判明）
- [x] アカウント無効チェック時の `recordLogin` 呼び出しを `user.user_id` → `userId`（入力値）に修正
- [x] パスワード不一致時の `recordLogin` 呼び出しを `user.user_id` → `userId`（入力値）に修正

## 変更ファイル

1. `backend/src/middleware/rateLimitMiddleware.ts` - レート制限の orgId・userId 取得修正、失敗のみカウント
2. `frontend/src/utils/authApi.ts` - フィールド名 username → userId
3. `backend/src/services/authService.ts` - recordLogin の user_id 引数を入力値 userId に統一

## リスク

| リスク | 対策 |
|--------|------|
| authApi.ts の `username` → `userId` 変更でバックエンドのバリデーションエラーになる可能性 | バックエンドの `authRoutes.ts` で `body('userId')` を確認済み。フィールド名統一で解決 |
| split 方式廃止で keyGenerator と SQL の整合性が崩れる | keyGenerator と SQL の両方を同じ取得方法に統一 |

## テスト計画

- [ ] 開発環境でログイン成功が正常に動作することを確認
- [ ] パスワード失敗時にエラーメッセージが表示されることを確認
- [ ] 本番環境（NODE_ENV=production）では5回失敗後に429エラーが返ることを確認

## 承認記録

- **計画書提示日時**: 2026-04-23 09:39
- **承認日時**: 2026-04-23 09:39
- **承認者コメント**: 実装を進めてください
