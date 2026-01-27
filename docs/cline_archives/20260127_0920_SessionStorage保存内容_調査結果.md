# SessionStorage保存内容 調査結果

## メタデータ
- **作成日時**: 2026-01-27 09:20
- **調査内容**: Authorizationヘッダー方式変更後のsessionStorage保存内容の妥当性確認
- **結論**: `sessionToken`のみが正しい。`user`オブジェクトは不要

---

## 🔍 調査結果

### 現在の保存状態（ユーザー報告）
SessionStorageに以下の2つのキーが保存されている：
1. **`sessionToken`**: セッショントークン
2. **`user`**: ユーザー情報オブジェクト

### 正しい動作
✅ **`sessionToken`のみを保存するべき**

---

## 📊 コード調査結果（修正版）

### 保存タイミングの全体像

#### タイミング1: ログイン成功時（第1段階）
**保存箇所**: `frontend/src/app/page.tsx` の `handleLogin`

```typescript
// 仮セッショントークンと組織IDを保存
setSessionToken(response.sessionToken);
setOrganizationId(credentials.organizationId);
setMaskedEmail(response.email);

// SessionStorageに保存（authServiceのインターセプターが参照）
if (typeof window !== 'undefined') {
  sessionStorage.setItem('sessionToken', response.sessionToken);
}
```

**保存内容**: `sessionToken`（仮トークン）のみ
**目的**: PINコード検証・再送信APIのAuthorizationヘッダーに使用

#### タイミング2: PIN検証成功時（第2段階）
**保存箇所**: `frontend/src/app/page.tsx` の `handleVerifyPin`

```typescript
// ユーザー情報とセッショントークンをSessionStorageに保存
if (typeof window !== 'undefined') {
  sessionStorage.setItem('user', JSON.stringify(response.user));
  sessionStorage.setItem('sessionToken', response.session.token); // ← 本トークンで上書き
}
```

**保存内容**: 
- `user`: ユーザー情報オブジェクト
- `sessionToken`: 本セッショントークン（仮トークンから更新）

**目的**: 
- 認証後のAPIリクエストのAuthorizationヘッダーに使用
- メニュー画面でのユーザー情報表示

---

### 1. sessionToken の保存（正しい実装）

#### 使用箇所: `frontend/src/services/authService.ts`
```typescript
// リクエストインターセプター: 全てのAPIリクエストに自動的にAuthorizationヘッダーを付与
client.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const sessionToken = sessionStorage.getItem('sessionToken');
      if (sessionToken) {
        // Authorizationヘッダーに自動設定
        config.headers.Authorization = `Bearer ${sessionToken}`;
      }
    }
    return config;
  },
  // ... 省略
);
```

**保存される値の変化**:
1. ログイン成功時: 仮トークン（例: `temp_session-abc123_1735185000`）
2. PIN検証成功時: 本トークン（例: `maiml_session-abc123_1735185000`）で上書き

**目的**: 
- ログイン〜PIN検証: 仮トークンでPIN関連APIを呼び出し
- PIN検証後: 本トークンで認証済みAPIを呼び出し

**妥当性**: ✅ **必要かつ正しい実装**

---

### 2. user オブジェクトの保存（必要）

#### 保存箇所: `frontend/src/app/page.tsx` の `handleVerifyPin`
```typescript
// ユーザー情報とセッショントークンをSessionStorageに保存
if (typeof window !== 'undefined') {
  sessionStorage.setItem('user', JSON.stringify(response.user));
  sessionStorage.setItem('sessionToken', response.session.token);
}
```

#### 使用箇所: メニュー画面でのユーザー情報表示
```typescript
// ログイン済み - メニュー表示
if (authStep === 'authenticated' && currentUser) {
  let MenuComponent: React.ReactNode;

  switch (currentMenuType) {
    case 'provider':
      MenuComponent = (
        <ProviderMenu
          user={currentUser}  // ← userオブジェクトをpropsで渡す
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          onMenuChange={handleMenuChange}
        />
      );
      break;
    // ... 他のメニューも同様
  }
}
```

**保存内容**:
```json
{
  "id": "4",
  "username": "experiment_admin",
  "email": "exp.admin@example.com",
  "role": "experiment_admin",
  "organizationId": "org_lab_001",
  "organizationName": "AIML研究所",
  "displayName": "実験管理者 三郎"
}
```

**目的**:
- メニュー画面でユーザー名・組織名を表示
- ロール別メニューの切り替え
- ページリロード時の状態復元（予定）

**妥当性**: ⚠️ **現在は必要だが、改善の余地あり**

---

## 🛡️ セキュリティ上の問題点

### user オブジェクトを保存すべきでない理由

#### 1. 情報漏洩リスク
```javascript
// ❌ 悪い例: ユーザー情報をsessionStorageに保存
sessionStorage.setItem('user', JSON.stringify({
  id: 'user123',
  username: 'john.doe',
  email: 'john@example.com',
  role: 'experiment_admin',
  organizationId: 'org_001'
}));
```

**問題点**:
- SessionStorageはJavaScriptから自由にアクセス可能
- XSS攻撃で情報が盗まれる可能性
- ユーザーがブラウザのDevToolsで容易に閲覧・改ざん可能

#### 2. データの信頼性
- フロントエンドで保持するユーザー情報は改ざん可能
- バックエンドでの認証・認可が必須
- フロントエンドのユーザー情報は参考程度にしかならない

#### 3. 同期の問題
- バックエンドでユーザー情報が更新された場合、sessionStorageは古い情報のまま
- リアルタイムでの権限変更に対応できない

---

## ✅ 推奨されるアーキテクチャ

### 正しい実装パターン

```typescript
// ✅ 良い例: sessionTokenのみを保存
sessionStorage.setItem('sessionToken', 'maiml_session-abc123_1735185000');

// ユーザー情報が必要な場合はAPIから取得
const response = await apiClient.get('/auth/me');
const user = response.data.data.user;
```

### データフロー
```
1. ログイン成功
   ↓
2. sessionTokenをsessionStorageに保存
   ↓
3. 認証が必要な画面にアクセス
   ↓
4. authServiceのインターセプターがsessionTokenを読み取り
   ↓
5. Authorizationヘッダーに自動設定
   ↓
6. バックエンドがトークンを検証
   ↓
7. 必要に応じてユーザー情報をAPIレスポンスで返す
```

---

## 🔧 修正提案

### 対応方針
1. **sessionStorageから`user`キーを削除**
2. **ユーザー情報が必要な場合は`/auth/me` APIを呼び出す**
3. **React Context または State Management でユーザー情報を管理**

### 実装例: SessionStorageクリーンアップ

```typescript
// AuthContainer.tsxのhandleLoginSuccess
const handleLoginSuccess = (response: LoginResponse) => {
  // sessionTokenのみを保存
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('sessionToken', response.sessionToken);
    
    // 旧実装の残骸をクリーンアップ
    sessionStorage.removeItem('user');
  }
  
  setSessionToken(response.sessionToken);
  setMaskedEmail(response.email);
  setPinExpiresIn(response.expiresIn);
  setFlowState('pin-input');
  
  message.success(response.message);
};
```

### 実装例: ユーザー情報の取得

```typescript
// 必要な場合のみAPIから取得
const fetchUserInfo = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data.data.user;
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
};
```

---

## 📋 チェックリスト

### 確認事項
- [ ] `sessionStorage.setItem('user', ...)` を使用している箇所を特定
- [ ] 該当コードを削除または修正
- [ ] `sessionStorage.getItem('user')` を使用している箇所を特定
- [ ] ユーザー情報が必要な場合は`/auth/me` APIを呼び出すように変更
- [ ] ログアウト時に`sessionStorage.removeItem('user')`を確認

### テスト項目
- [ ] ログイン後、sessionStorageに`sessionToken`のみが保存されることを確認
- [ ] `user`キーが保存されていないことを確認
- [ ] APIリクエスト時にAuthorizationヘッダーが正しく付与されることを確認
- [ ] ログアウト時にsessionStorageがクリアされることを確認

---

## 🎯 結論

### 正しいsessionStorage保存内容
```json
{
  "sessionToken": "maiml_session-abc123_1735185000"
}
```

### 不要な保存内容（削除推奨）
```json
{
  "user": { ... }  // ❌ 削除すべき
}
```

### 理由
1. **セキュリティ**: ユーザー情報の漏洩・改ざんリスクを軽減
2. **信頼性**: バックエンドから取得した最新情報を使用
3. **シンプル性**: sessionStorageの管理が単純化される
4. **ベストプラクティス**: JWTトークンのみをクライアント側で保持するのが一般的

---

## 📝 次のアクション

1. **即座に対応**: SessionStorageから`user`キーを削除するコードを追加
2. **中期的対応**: `user`オブジェクトを保存している箇所を特定して修正
3. **長期的対応**: `/auth/me` APIを実装してユーザー情報取得を統一化

---

## 📚 参考資料

- [OWASP - HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [JWT Best Practices](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-best-practices)
- [Web Storage API Security](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#security)
