# SessionStorage保存内容 再調査結果

## メタデータ
- **作成日時**: 2026-01-27 09:26
- **調査内容**: sessionStorageに`sessionToken`と`user`の両方が保存される動作の妥当性を再確認
- **結論**: **両方とも現在の実装では正しい動作**

---

## 🔍 再調査の結果

### ユーザーの報告内容（正確）
1. **ユーザー名・パスワード認証時**: `sessionToken`のみ保存
2. **二段階認証（PIN検証）成功時**: `user`も追加で保存

→ **この動作は`frontend/src/app/page.tsx`の実装通りです**

---

## 📊 保存タイミングの詳細

### タイミング1: ログイン成功時（第1段階）

**保存箇所**: `frontend/src/app/page.tsx` の `handleLogin`

```typescript
const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
  // ... 省略
  const response = await authService.login(credentials, orgIdFromUrl);
  
  // 仮セッショントークンと組織IDを保存
  setSessionToken(response.sessionToken);
  
  // SessionStorageに保存（authServiceのインターセプターが参照）
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('sessionToken', response.sessionToken);
  }
  
  // PINコード入力画面へ遷移
  setAuthStep('pin-code');
};
```

**この時点のsessionStorage:**
```json
{
  "sessionToken": "temp_session-abc123_1735185000"
}
```

---

### タイミング2: PIN検証成功時（第2段階）

**保存箇所**: `frontend/src/app/page.tsx` の `handleVerifyPin`

```typescript
const handleVerifyPin = async (pinCode: string): Promise<void> => {
  // ... 省略
  const response = await authService.verifyPin(pinCode, sessionToken, orgIdFromUrl);
  
  // ユーザー情報を設定
  setCurrentUser(response.user);
  setCurrentMenuType(response.user.role as UserRole);
  setAuthStep('authenticated');
  
  // ユーザー情報とセッショントークンをSessionStorageに保存
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('user', JSON.stringify(response.user));
    sessionStorage.setItem('sessionToken', response.session.token); // ← 本トークンで上書き
  }
  
  messageApi.success('ログインに成功しました');
};
```

**この時点のsessionStorage:**
```json
{
  "sessionToken": "maiml_session-abc123_1735185000",
  "user": {
    "id": "4",
    "username": "experiment_admin",
    "email": "exp.admin@example.com",
    "role": "experiment_admin",
    "organizationId": "org_lab_001",
    "organizationName": "AIML研究所",
    "displayName": "実験管理者 三郎"
  }
}
```

---

## ✅ 両方の保存が必要な理由

### 1. sessionToken の役割

#### 保存される値の変化
1. **ログイン成功時**: 仮トークン（`temp_session-abc123_...`）
2. **PIN検証成功時**: 本トークン（`maiml_session-abc123_...`）で上書き

#### 使用箇所
`frontend/src/services/authService.ts` のAxiosインターセプター

```typescript
client.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const sessionToken = sessionStorage.getItem('sessionToken');
      if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
      }
    }
    return config;
  }
);
```

#### 目的
- **第1段階**: 仮トークンでPIN関連API（verify-pin, resend-pin）を呼び出し
- **第2段階以降**: 本トークンで認証済みAPI（メニュー画面の各種API）を呼び出し

**結論**: ✅ **必須かつ正しい実装**

---

### 2. user オブジェクトの役割

#### 使用箇所
`frontend/src/app/page.tsx` のメニュー表示部分

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
    // ... 他のロールも同様
  }
}
```

#### 目的
- メニュー画面でユーザー名・組織名を表示
- ロール別メニューの切り替え
- **ページリロード時の状態復元（予定）**

**結論**: ✅ **現在の実装では必要**

---

## ⚠️ セキュリティ上の考慮事項

### user オブジェクトを sessionStorage に保存する問題点

#### 1. 情報漏洩リスク
- XSS攻撃で情報が盗まれる可能性
- ブラウザのDevToolsで容易に閲覧・改ざん可能

#### 2. データの信頼性
- フロントエンドで保持するユーザー情報は改ざん可能
- バックエンドでの認証・認可が必須（これは実装済み）

#### 3. 同期の問題
- バックエンドでユーザー情報が更新されても、sessionStorageは古い情報のまま

---

## 🎯 結論

### 現在の実装の評価

| 項目 | 評価 | 理由 |
|------|------|------|
| **sessionToken の保存** | ✅ 正しい | APIリクエストのAuthorizationヘッダーに必須 |
| **user の保存** | ⚠️ 機能的には正しいが改善余地あり | メニュー表示に使用されているが、セキュリティリスクあり |

### 正しいsessionStorage保存内容（現在の実装）

```json
{
  "sessionToken": "maiml_session-abc123_1735185000",
  "user": {
    "id": "4",
    "username": "experiment_admin",
    "email": "exp.admin@example.com",
    "role": "experiment_admin",
    "organizationId": "org_lab_001",
    "organizationName": "AIML研究所",
    "displayName": "実験管理者 三郎"
  }
}
```

**この2つのキーが保存されるのは、現在の実装では正しい動作です。**

---

## 📝 推奨される将来的な改善

### 短期的対応（現状維持）
現在の実装は機能的に問題なく動作しているため、そのまま使用可能です。

### 中長期的改善（推奨）

#### 1. React Context APIの導入
```typescript
// contexts/UserContext.tsx
export const UserContext = React.createContext<User | null>(null);

// app/page.tsx
export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  return (
    <UserContext.Provider value={currentUser}>
      {/* メニューコンポーネント */}
    </UserContext.Provider>
  );
}
```

#### 2. `/auth/me` APIの実装
ページリロード時にバックエンドから最新のユーザー情報を取得

```typescript
// ページリロード時
useEffect(() => {
  const token = sessionStorage.getItem('sessionToken');
  if (token) {
    // バックエンドから最新のユーザー情報を取得
    authService.getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        // トークンが無効な場合はログイン画面へ
        setAuthStep('login');
      });
  }
}, []);
```

#### 3. sessionStorageの使用を最小化
```typescript
// PIN検証成功時
const handleVerifyPin = async (pinCode: string): Promise<void> => {
  const response = await authService.verifyPin(pinCode, sessionToken, orgIdFromUrl);
  
  // sessionTokenのみをsessionStorageに保存
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('sessionToken', response.session.token);
    // userは保存しない
  }
  
  // React Stateで管理
  setCurrentUser(response.user);
  setCurrentMenuType(response.user.role as UserRole);
  setAuthStep('authenticated');
};
```

---

## 🤔 質問への回答

> **「sessionTokenも保存されるのは正しい動き？」**

✅ **はい、正しい動きです。**

- ログイン時（第1段階）に仮トークンを保存
- PIN検証成功時（第2段階）に本トークンで上書き
- authServiceのインターセプターが自動的に読み取ってAuthorizationヘッダーに設定

> **「userも保存されるのは？」**

✅ **現在の実装では正しい動作です。**

- PIN検証成功時にメニュー画面に必要なユーザー情報を保存
- メニューコンポーネントでユーザー名・組織名を表示するために使用
- ただし、将来的にはReact ContextやState管理に移行することを推奨

---

## 📚 参考資料

- [JWT Best Practices](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-best-practices)
- [OWASP - HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [React Context API](https://react.dev/reference/react/useContext)
