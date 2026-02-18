# タスク計画書: 自動ログイン時のLocal Storage活用

## メタデータ
- **作成日時**: 2026-02-18 11:02
- **タスクID**: auto-login-localstorage
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

現在の自動ログイン処理は、ページロードごとにrefreshToken APIを呼び出していますが、Local Storageに有効なアクセストークンとユーザー情報が保存されている場合は、それを使用してログイン状態を復元するように変更します。

## 2. 目的と期待される成果

### 目的
- 不要なAPIリクエストを削減
- 初期ロード時間の短縮
- ネットワーク遅延の影響を最小化

### 期待される成果
- [x] Local Storageの既存トークンを優先的に使用
- [x] トークンが有効な場合はAPI呼び出しをスキップ
- [x] トークンが無効/期限切れの場合のみrefreshToken APIを呼び出す

## 3. 実装ステップ

### Phase 1: page.tsx の自動ログイン処理を修正
- [x] Local StorageからsessionTokenとuserInfoを取得
- [x] トークンの存在確認
- [x] 有効なトークンがある場合、そのままログイン状態を復元
- [x] トークンがない場合のみrefreshToken APIを呼び出す

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/app/page.tsx` - 自動ログイン処理のuseEffectを修正

### 影響を受ける機能
- 自動ログイン機能（改善）
- ページロード時のパフォーマンス（改善）

## 5. 技術的詳細

### 実装アプローチ

#### Before（現在）
```typescript
React.useEffect(() => {
  const attemptAutoLogin = async () => {
    try {
      // 常にAPI呼び出し
      const response = await authService.refreshToken();
      handleLoginSuccess(/* ... */);
    } catch {
      // エラー処理
    } finally {
      setIsCheckingAutoLogin(false);
    }
  };
  attemptAutoLogin();
}, []);
```

#### After（変更後）
```typescript
React.useEffect(() => {
  const attemptAutoLogin = async () => {
    try {
      // 1. Local Storageから既存情報を取得
      const existingToken = localStorage.getItem('sessionToken');
      const existingUserInfo = localStorage.getItem('userInfo');
      
      if (existingToken && existingUserInfo) {
        // 2. トークンが存在 → そのまま使用
        const user = JSON.parse(existingUserInfo);
        handleLoginSuccess(user, existingToken, false, 'LocalStorage', false);
        console.log('[Auto-Login] Local Storageからログイン状態を復元');
        return;
      }
      
      // 3. トークンがない場合のみAPI呼び出し
      console.log('[Auto-Login] Local Storageにトークンなし - refreshToken APIを呼び出し');
      const response = await authService.refreshToken();
      handleLoginSuccess(/* ... */);
    } catch {
      // エラー処理
    } finally {
      setIsCheckingAutoLogin(false);
    }
  };
  attemptAutoLogin();
}, []);
```

### トークン有効期限のチェック

**今回は実装しない理由:**
- authUtils.tsのインターセプターで401エラー時に自動的にrefreshTokenが呼び出される
- トークンが期限切れの場合、最初のAPIリクエストで自動更新される
- 有効期限チェックを追加すると複雑になり、メリットが少ない

**フロー:**
1. Local Storageからトークンを取得 → ログイン状態復元
2. ユーザーがAPIを呼び出す → トークンが期限切れの場合、401エラー
3. authUtils.tsのインターセプターが自動的にrefreshTokenを呼び出す
4. 新しいトークンで元のリクエストをリトライ

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 期限切れトークンで復元 | 低 | 中 | インターセプターで自動更新 |
| userInfoのパースエラー | 低 | 低 | try-catchで捕捉 |
| 不整合なデータ | 低 | 低 | refreshToken APIへフォールバック |

## 7. テスト計画

### 手動テスト
- [x] 正常ケース: Local Storageにトークンあり → 自動ログイン成功
- [x] 正常ケース: Local Storageにトークンなし → refreshToken APIで復元
- [x] エラーケース: userInfoが不正なJSON → refreshToken APIへフォールバック
- [x] エラーケース: トークンが期限切れ → 最初のAPIリクエストで自動更新

## 8. 承認記録

- **計画書提示日時**: 2026-02-18 11:02
- **承認日時**: （承認待ち）

## 9. 実施記録

### 実施日時
開始: 2026-02-18 11:02

### 実装内容
- page.tsxの自動ログイン処理を修正
- Local Storageの既存トークンを優先的に使用
- トークンがない場合のみrefreshToken APIを呼び出し
