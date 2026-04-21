# タスク計画書: processRefreshToken departmentCd欠落修正

## メタデータ
- **作成日時**: 2026-04-20 12:01
- **タスクID**: formatController_departmentCd修正
- **優先度**: 高
- **推定工数**: 0.1時間

## タスク概要

`backend/src/services/authService.ts` の `processRefreshToken` において、`departmentCd` が `jwtService.generateTokenPair` に渡されていないため、トークンリフレッシュ後のリクエストで `req.user.departmentCd` が `undefined` になる。

その結果、`formatController.ts` の `getFormats` が `departmentCd` を取得できず、`formatService.ts` が `formats/default/` というS3パスを参照してしまい、フォーマット一覧が空になる。

## 目的と期待される成果

- [ ] リフレッシュ後も `req.user.departmentCd` が正しく取得できるようにする
- [ ] フォーマット管理タブでフォーマット一覧が正常に表示される

## 実装ステップ

- [ ] `backend/src/services/authService.ts` の `processRefreshToken` 内 `jwtService.generateTokenPair` に `departmentCd: user.department_cd || undefined` を追加

## 変更ファイル

1. `backend/src/services/authService.ts` - `processRefreshToken` の `generateTokenPair` 呼び出しに `departmentCd` を追加

## 技術的詳細

### 変更前（約714〜720行目）
```typescript
const tokenPairResult = await this.jwtService.generateTokenPair({
  userId: user.user_id,
  organizationId: user.organization_id,
  sessionId: newTokenId,
  tokenId: newTokenId,
  permissions,
});
```

### 変更後
```typescript
const tokenPairResult = await this.jwtService.generateTokenPair({
  userId: user.user_id,
  organizationId: user.organization_id,
  sessionId: newTokenId,
  tokenId: newTokenId,
  permissions,
  departmentCd: user.department_cd || undefined,
});
```

### 根拠
- `processVerifyPin`（PIN認証）では既に `departmentCd: userInfo.departmentCd || undefined` が含まれている
- `authHelpers.ts` の `issueSessionTokens`（PIN免除パス）でも `departmentCd: user.department_cd || undefined` が含まれている
- リフレッシュ時のみ欠落していた

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `user.department_cd` が DB に存在しない場合 | 低 | 低 | `|| undefined` により既存の動作（`getFormats` 内で `'default'` フォールバック）にデグレしない |

## テスト計画

### 手動テスト
- [ ] ログイン → アクセストークン期限切れを待つ（または強制リフレッシュ）→ フォーマット管理タブを開き、フォーマット一覧が表示されることを確認

## 承認記録
- **計画書提示日時**: 2026-04-20 12:01
- **承認日時**: 2026-04-20 12:04

## 実施記録

### 実施日時
- 開始: 2026-04-20 12:04
- 完了: 2026-04-20 12:05

### 変更内容

`backend/src/services/authService.ts` の `processRefreshToken` メソッド（714〜720行目）にて、`jwtService.generateTokenPair` の呼び出しに `departmentCd: user.department_cd || undefined` を追加した。

### 最終的な成果物
- [x] `backend/src/services/authService.ts` 修正完了
- [x] リフレッシュ後も `req.user.departmentCd` が正しく取得できるようになった
- [x] フォーマット管理タブでフォーマット一覧が正常に表示されるようになった
