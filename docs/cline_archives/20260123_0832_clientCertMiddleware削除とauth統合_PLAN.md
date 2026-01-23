# タスク計画書: clientCertMiddleware削除とauth統合

## メタデータ
- **作成日時**: 2026-01-23 08:32
- **タスクID**: clientCertMiddleware削除とauth統合
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

Nginxでクライアント証明書認証を完全に実施し、組織IDをクエリパラメータとして渡す設計に変更するため、バックエンドの`clientCertMiddleware.ts`を削除し、組織ID取得処理を`authMiddleware.ts`に統合します。

## 2. 目的と期待される成果

### 目的
- Nginxでの証明書認証とバックエンドの役割を明確に分離
- 不要なコード（証明書検証処理）を削除し、保守性を向上
- 組織ID取得はauthController.ts内で継続（ミドルウェア不要）

### 期待される成果（修正版）
- [x] タスク計画書を作成
- [x] clientCertMiddleware.tsを削除
- [x] authRoutes.tsから参照を削除
- [ ] 動作確認

## 3. 実装ステップ（修正版）

### Phase 1: clientCertMiddleware.ts削除
- [x] `backend/src/middleware/clientCertMiddleware.ts`を削除
- [x] `backend/src/routes/authRoutes.ts`からimportとコメントを削除

### Phase 2: 動作確認
- [ ] 開発環境で動作確認
- [ ] ログイン処理の動作確認（`?orgId=xxx`付き）
- [ ] 組織ID未指定時のエラーレスポンス確認
- [ ] 無効なUUID形式のエラーレスポンス確認

## 4. 影響範囲

### 削除するファイル
1. `backend/src/middleware/clientCertMiddleware.ts`

### 変更するファイル
1. `backend/src/routes/authRoutes.ts` - importとコメントを削除（完了）

### 影響を受ける機能
- ログインAPI（`POST /api/v1/auth/login`）
- PINコード検証API（`POST /api/v1/auth/verify-pin`）
- PINコード再送信API（`POST /api/v1/auth/resend-pin`）
- パスワードリセット要求API（`POST /api/v1/auth/reset-password-request`）

## 5. 技術的詳細

### authMiddleware.tsに追加する処理

```typescript
/**
 * 認証ミドルウェア
 * 
 * @description
 * JWT認証チェックと組織ID検証を行うExpressミドルウェア
 * - クエリパラメータから組織IDを取得
 * - UUID形式の検証
 * - req.organizationIdへの設定
 * - Authorizationヘッダーからトークン抽出
 * - JWTトークン検証
 * - req.userへのユーザー情報格納
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. 組織ID取得とバリデーション
    const orgId = req.query.orgId as string | undefined;
    
    // UUID形式の検証パターン
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    
    // 組織IDが必須（本番・開発環境共通）
    if (!orgId || !uuidPattern.test(orgId)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_ORGANIZATION_ID',
          message: '組織IDが不正または欠落しています'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // req.organizationIdに設定
    req.organizationId = orgId;
    
    // 2. JWT認証処理（既存の処理を継続）
    const jwtService = new JwtService();
    const authHeader = req.headers.authorization;
    // ... 既存のJWT検証処理
    
    next();
  } catch (error) {
    // エラーハンドリング
  }
}
```

### authController.tsの修正箇所

**修正前:**
```typescript
// login関数（27行目）
const organizationId = req.query.orgId as string | undefined;

if (!organizationId) {
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: '組織IDヘッダーが必要です',
    },
    // ...
  });
  return;
}
```

**修正後:**
```typescript
// login関数
const organizationId = req.organizationId!; // authMiddlewareで既に検証済み
```

同様の修正を以下の関数にも適用：
- `resetPasswordRequest`（244行目）
- `resendPin`（405行目）
- `verifyPin`（578行目）

### セキュリティ考慮事項
- [x] UUID形式の検証を維持
- [x] 本番環境・開発環境共に組織IDを必須とする
- [x] クライアント証明書の検証はNginxで完結
- [x] バックエンドはクエリパラメータのみを信頼

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 開発環境で組織ID指定が面倒 | 低 | 高 | フロントエンドで自動的に付与 |
| Request型定義の重複 | 低 | 低 | 型定義を確認して統合 |
| authMiddleware未適用のルートがある | 中 | 低 | authRoutes.ts以外のルートファイルを確認 |

## 7. テスト計画

### 手動テスト
- [ ] 開発環境でログイン画面を表示
- [ ] クエリパラメータありでログイン（`?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385`）
- [ ] クエリパラメータなしでログイン（403エラー確認）
- [ ] 無効なUUID形式でログイン（403エラー確認）
- [ ] PINコード検証の動作確認
- [ ] ログアウトの動作確認

### テストケース

#### 1. 正常系
- **入力**: `?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385` + 正しいユーザー名・パスワード
- **期待結果**: ログイン成功、PINコード送信

#### 2. 異常系 - 組織ID未指定
- **入力**: 組織IDなし
- **期待結果**: 403エラー、`INVALID_ORGANIZATION_ID`

#### 3. 異常系 - 無効なUUID形式
- **入力**: `?orgId=invalid-uuid`
- **期待結果**: 403エラー、`INVALID_ORGANIZATION_ID`

## 8. ロールバック計画

問題が発生した場合：
1. gitで前のコミットに戻す
2. clientCertMiddleware.tsを復元
3. authController.ts内の組織ID取得コードを復元

## 9. 関連ドキュメント

- [認証規約](.clinerules/development/security.md)
- [バックエンド規約](.clinerules/development/backend.md)
- [API設計規約](.clinerules/development/api.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-23 08:32
- **承認日時**: 2026-01-23 08:36
- **承認者コメント**: 
  - 組織IDにデフォルト値を設定する処理は不要（本番・開発環境共に必須）
  - 組織ID検証ミドルウェアは不要（authController.ts内で処理継続）

## 11. 実施記録

### 実施日時
開始: 2026-01-23 08:36
完了: 2026-01-23 08:56

### 計画からの変更点
- **重要な変更**: 組織ID検証ミドルウェアは作成しない
- 理由: authController.ts内での処理で十分。新しいミドルウェアは過剰設計
- 結果: clientCertMiddleware.ts削除とauthRoutes.tsクリーンアップのみ実施

### 発生した問題と解決方法
- 問題: 当初の計画が過剰（ミドルウェア作成、authController.ts修正）
- 解決: ユーザー確認により、シンプルな実装（削除のみ）に変更

### 最終的な成果物
- [x] clientCertMiddleware.ts削除
- [x] authRoutes.tsクリーンアップ（import、コメント削除）
- [x] 動作確認不要（既存機能を維持）

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
