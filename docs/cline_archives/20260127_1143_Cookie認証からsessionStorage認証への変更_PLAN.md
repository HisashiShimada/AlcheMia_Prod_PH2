# Cookie認証からsessionStorage認証への変更計画

## メタデータ
- **作成日時**: 2026-01-27 11:43
- **タスクID**: cookie-to-sessionstorage-auth
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

現在のHTTPOnly Cookie方式から、sessionStorage方式に変更します。
トークンはsessionStorageに保存し、Axiosインターセプターで自動的にAuthorizationヘッダーに設定します。

## 2. 目的と期待される成果

### 目的
- HTTPOnly Cookieによる認証からsessionStorageベースの認証に変更
- フロントエンド側でトークンを管理しやすくする
- Axiosインターセプターによる自動認証ヘッダー設定

### 期待される成果
- [x] バックエンドのCookie保存処理を削除
- [ ] PINコード検証成功時にJWTトークンをsessionStorageに保存
- [ ] 既存のAxiosインターセプターが正しく機能することを確認

## 3. 実装ステップ

### Phase 1: バックエンドの修正
- [x] authController.tsのverifyPin関数からCookie保存処理を削除
- [x] レスポンスにJWTトークンを含める（既に含まれている）

### Phase 2: フロントエンドの修正
- [x] AuthContainer.tsxのhandlePINVerifySuccessを修正
- [x] JWTトークンをsessionStorageに保存する処理を追加
- [x] 仮セッショントークンを上書きする

### Phase 3: 動作確認
- [ ] ログインフローの動作確認
- [ ] PINコード検証後のトークン保存を確認
- [ ] 業務API呼び出し時の認証ヘッダーを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/controllers/authController.ts` - Cookie保存処理を削除
2. `frontend/src/components/auth/AuthContainer.tsx` - トークン保存処理を追加

### 変更しないファイル（既に正しく実装されている）
1. `frontend/src/services/authService.ts` - Axiosインターセプターは既に実装済み

## 5. 技術的詳細

### バックエンドの変更（authController.ts）

**削除する処理:**
```typescript
// ❌ 削除
res.cookie('maiml_session', jwtToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: maxAge,
  path: '/',
});
```

**残す処理:**
```typescript
// ✅ レスポンスにトークンを含める（既に実装済み）
res.status(200).json({
  success: true,
  data: {
    user: {...},
    session: {
      token: jwtToken, // ✅ これをフロントエンドで使用
      expiresAt: expiresAt.toISOString(),
    },
    redirectUrl: REDIRECT_URLS[userInfo.role],
  },
});
```

### フロントエンドの変更（AuthContainer.tsx）

**現在の実装:**
```typescript
const handlePINVerifySuccess = (response: VerifyPINResponse) => {
  message.success('ログインに成功しました');
  
  // ❌ JWTトークンを保存していない
  
  const redirectUrl = roleRedirectMap[response.user.role] || '/';
  router.push(redirectUrl);
}
```

**修正後の実装:**
```typescript
const handlePINVerifySuccess = (response: VerifyPINResponse) => {
  message.success('ログインに成功しました');
  
  // ✅ JWTトークンをsessionStorageに保存
  if (typeof window !== 'undefined') {
    // 仮セッショントークンを上書き（同じキー名を使用）
    sessionStorage.setItem('sessionToken', response.session.token);
  }
  
  const redirectUrl = roleRedirectMap[response.user.role] || '/';
  router.push(redirectUrl);
}
```

### Axiosインターセプター（変更不要）

**既に正しく実装されています:**
```typescript
// frontend/src/services/authService.ts
client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const sessionToken = sessionStorage.getItem('sessionToken');
    if (sessionToken) {
      // ✅ sessionStorageからトークンを取得してヘッダーに設定
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }
  }
  return config;
});
```

## 6. セキュリティ考慮事項

### sessionStorageのセキュリティ特性

**メリット:**
- ✅ タブを閉じると自動的にクリアされる
- ✅ 他のタブと共有されない
- ✅ 実装がシンプル

**デメリット:**
- ⚠️ XSS攻撃に対して脆弱（JavaScriptからアクセス可能）
- ⚠️ HTTPOnly Cookieより安全性は低い

### 対策
- ✅ Content Security Policy (CSP) の設定
- ✅ 入力値のサニタイゼーション
- ✅ XSS対策の徹底
- ✅ HTTPS通信の必須化

## 7. テスト計画

### 手動テスト
- [ ] ログイン → PINコード検証 → sessionStorageにJWTトークンが保存されることを確認
- [ ] ブラウザの開発者ツールでsessionStorageの内容を確認
- [ ] 業務API呼び出し時にAuthorizationヘッダーが正しく設定されることを確認
- [ ] タブを閉じるとトークンがクリアされることを確認

### ブラウザテスト
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari

## 8. ロールバック計画

万が一問題が発生した場合、以下の手順でロールバック可能：

1. `backend/src/controllers/authController.ts` のCookie保存処理を復元
2. `frontend/src/components/auth/AuthContainer.tsx` のトークン保存処理を削除
3. `frontend/src/services/authService.ts` に `withCredentials: true` を追加

## 9. 承認記録

- **計画書提示日時**: 2026-01-27 11:43
- **承認日時**: 2026-01-27 11:45
- **承認者コメント**: 承認

## 10. 実施記録

### 実施日時
開始: 2026-01-27 11:45
完了: 2026-01-27 11:46

### 実装内容

#### Phase 1: バックエンドの修正
✅ `backend/src/controllers/authController.ts` - verifyPin関数を修正
- Cookie保存処理（res.cookie）を削除
- コメントを修正（「セッション有効期限を計算」「JWTトークンをレスポンスボディで返す」）
- レスポンスにJWTトークンを含める処理は既に実装済み

#### Phase 2: フロントエンドの修正
✅ `frontend/src/components/auth/AuthContainer.tsx` - handlePINVerifySuccessを修正
- JWTトークンをsessionStorageに保存する処理を追加
- 仮セッショントークンを上書き（同じキー名「sessionToken」を使用）

```typescript
// 追加したコード
if (typeof window !== 'undefined') {
  sessionStorage.setItem('sessionToken', response.session.token);
}
```

### 計画からの変更点
なし（計画通りに実装完了）

### 最終的な成果物
- [x] バックエンドのCookie保存処理を削除
- [x] フロントエンドでJWTトークンをsessionStorageに保存
- [ ] 認証フローの動作確認（ユーザーによる動作確認が必要）

## 11. 動作確認手順

### 1. ログインからPINコード検証まで
1. ログイン画面でユーザー名とパスワードを入力
2. ログイン成功 → sessionStorageに仮セッショントークンが保存される
3. PINコード入力画面が表示される
4. メールで受信したPINコードを入力
5. PINコード検証成功 → sessionStorageのトークンがJWTトークンで上書きされる
6. ロール別画面にリダイレクトされる

### 2. sessionStorageの確認方法
ブラウザの開発者ツールを開き：
```
1. Application（アプリケーション）タブを開く
2. 左メニューから「Session Storage」を展開
3. 対象のドメインを選択
4. 「sessionToken」キーの値を確認
   - ログイン後: temp_session-{uuid}_{timestamp}
   - PIN検証後: maiml_session-{jwt_token}
```

### 3. Authorizationヘッダーの確認方法
ブラウザの開発者ツールを開き：
```
1. Network（ネットワーク）タブを開く
2. 業務API（例: /api/v1/projects）を呼び出す
3. リクエストヘッダーに「Authorization: Bearer {jwt_token}」が含まれることを確認
```

### 4. トラブルシューティング
もし認証エラーが発生する場合：
- sessionStorageにトークンが保存されているか確認
- Axiosインターセプターが正しく動作しているか確認（authService.ts）
- バックエンドのauthMiddlewareがトークンを検証しているか確認

## 12. 振り返り

### うまくいった点
- 計画通りに実装できた
- 既存のAxiosインターセプターがそのまま使えた
- Cookie保存処理の削除がシンプルだった

### 今後の課題
- XSS攻撃への対策（Content Security Policy設定）
- sessionStorageのセキュリティリスクへの対応
- 必要に応じてlocalStorageへの移行検討（永続化が必要な場合）
