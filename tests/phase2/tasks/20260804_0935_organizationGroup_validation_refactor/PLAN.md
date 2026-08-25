# タスク計画書: organizationGroupController バリデーション移行

## メタデータ
- **作成日時**: 2026-08-04 09:36
- **タスクID**: organizationGroup_validation_refactor
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`organizationGroupController.ts` に記述されているリクエストパラメータのバリデーションロジックを、`namespaceValidation.ts` と同じパターンに合わせてミドルウェアへ移行する。
また、ログイン情報（organizationId / userId）を `(req as any).organizationId` / `(req as any).userId` から `req.user.organizationId` / `req.user.userId` に変更する。

## 目的と期待される成果
- [ ] バリデーションロジックをコントローラーからミドルウェアへ移行（規約準拠）
- [ ] `req.user` から organizationId / userId を取得する（型安全性向上）
- [ ] ルーティングにバリデーションミドルウェアを適用

## 実装ステップ

### Phase 1: organizationGroupValidation.ts 新規作成
- [ ] `backend/src/middleware/organizationGroupValidation.ts` を新規作成
- [ ] `express-validator` で各エンドポイントのバリデーションルールを定義

### Phase 2: organizationGroupController.ts 修正
- [ ] コントローラー内のバリデーションロジック（必須チェック等）を削除
- [ ] `(req as any).organizationId` → `req.organizationId`（tenantIsolationが設定済み）
- [ ] `(req as any).userId` → `req.user!.userId`（authMiddlewareが設定済み）

### Phase 3: organizationGroupRoutes.ts 修正
- [ ] 各ルートにバリデーションミドルウェアを追加

## 変更ファイル
1. `backend/src/middleware/organizationGroupValidation.ts` - 新規作成
2. `backend/src/controllers/organizationGroupController.ts` - バリデーション除去・req.user対応
3. `backend/src/routes/organizationGroupRoutes.ts` - バリデーションミドルウェア適用

## 承認記録
- **計画書提示日時**: 2026-08-04 09:36
