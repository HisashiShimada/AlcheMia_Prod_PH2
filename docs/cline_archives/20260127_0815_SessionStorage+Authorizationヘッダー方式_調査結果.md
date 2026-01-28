# SessionStorage + Authorizationヘッダー方式 調査結果

## 調査日時
2026-01-27 08:15

## 結論
✅ **SessionStorage + Authorizationヘッダー方式は完全に実現可能です！**

バックエンドは既にAuthorizationヘッダー方式に完全対応しており、フロントエンドにAxiosインターセプターを追加するだけで実現できます。

---

## 📋 調査内容

### 1. バックエンドの認証方式確認

**ファイル:** `backend/src/middleware/authMiddleware.ts`

```typescript
// Authorizationヘッダーからトークンを取得
const authHeader = req.headers.authorization;

// Bearer スキームを除去してトークンを抽出
let token = authHeader.trim();
if (token.toLowerCase().startsWith('bearer ')) {
  token = token.slice(7).trim();
}

// JWTトークンを検証
const result = await jwtService.verify(token);
```

**確認事項:**
- ✅ **Authorizationヘッダーからトークンを取得**している
- ✅ **Bearer スキーム**に対応
- ✅ JWTトークン検証を実施
- ✅ 検証成功時に `req.user` にペイロードを格納

### 2. フロントエンドの現状確認

**ファイル:** `frontend/src/services/authService.ts`

**現状:**
```typescript
// 現在は一部のメソッドで手動設定
headers: {
  Authorization: `Bearer ${sessionToken}`,
}
```

**問題点:**
- 各メソッドで個別にAuthorizationヘッダーを設定している
- コードの重複がある
- 新しいAPIを追加するたびに設定が必要

---

## ✅ 実現方法（再確認）

### SessionStorage + Authorizationヘッダー方式

#### ステップ1: Axiosインターセプター追加（1か所の修正）

```typescript
/**
 * Axiosインスタンスの作成
 */
const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  
  const client = axios.create({
    baseURL: `${baseURL}`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // ← これは残す（将来Cookie併用の可能性のため）
  });

  // 🎯 追加: リクエストインターセプター
  client.interceptors.request.use(
    (config) => {
      // SessionStorageからトークンを自動取得
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('sessionToken');
        if (sessionToken) {
          // Authorizationヘッダーに自動設定
          config.headers.Authorization = `Bearer ${sessionToken}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};
```

#### ステップ2: 既存コードのクリーンアップ

以下のメソッドから手動のheaders設定を削除：
1. `verifyPin`
2. `resendPin`
3. `logout`

---

## 🔄 データフロー

### ログイン前
```
1. フロントエンド: ログインAPIを呼び出し
2. インターセプター: SessionStorageにトークンなし → スキップ
3. バックエンド: Authorizationヘッダーなし → OK（ログインAPIは認証不要）
4. レスポンス: セッショントークンを返却
5. フロントエンド: SessionStorageにトークンを保存
```

### ログイン後（認証必要なAPI）
```
1. フロントエンド: 任意のAPIを呼び出し
2. インターセプター: SessionStorageからトークン取得 → Authorizationヘッダーに自動設定
3. バックエンド: Authorizationヘッダーからトークン抽出 → JWT検証
4. 検証成功: API処理を実行
5. レスポンス: データを返却
```

### ログアウト
```
1. フロントエンド: ログアウトAPIを呼び出し
2. インターセプター: Authorizationヘッダーに自動設定
3. バックエンド: トークン検証 → セッション削除
4. フロントエンド: SessionStorageからトークン削除
```

---

## 🆚 Cookie方式との比較

### SessionStorage + Authorizationヘッダー方式（推奨）

**メリット:**
- ✅ JavaScriptから制御可能（柔軟性が高い）
- ✅ クロスドメイン対応が容易
- ✅ トークンの有無を簡単にチェック可能
- ✅ **バックエンドが既に対応済み**
- ✅ **実装が簡単（1か所の追加のみ）**

**デメリット:**
- ⚠️ XSS攻撃でトークンが盗まれる可能性（ただし、適切なセキュリティ対策で緩和可能）

**セキュリティ対策:**
- Content Security Policy (CSP) の設定
- XSS対策（サニタイゼーション、エスケープ処理）
- HTTPSの使用

### HTTPOnly Cookie方式

**メリット:**
- ✅ XSS攻撃でトークンが盗まれない（JavaScriptからアクセス不可）
- ✅ CSRF対策とセットで使用

**デメリット:**
- ❌ バックエンドの大幅な変更が必要
- ❌ 認証ミドルウェアの書き換え
- ❌ ログイン/ログアウトAPIの変更
- ❌ クロスドメイン設定が複雑
- ❌ 実装コストが高い

---

## 📊 実装難易度と工数の比較

| 方式 | フロントエンド | バックエンド | 工数 | リスク |
|------|--------------|-------------|------|-------|
| SessionStorage + Authorization | 1か所追加 + クリーンアップ | **変更不要** | **30分** | **低** |
| HTTPOnly Cookie | Cookie処理の削除 | 認証ミドルウェア書き換え | **3-4時間** | **中** |

---

## ✅ 結論と推奨事項

### 推奨方式
**SessionStorage + Authorizationヘッダー方式**

### 理由
1. **バックエンドが既に完全対応**している
2. **実装が非常に簡単**（1か所の追加のみ）
3. **工数が最小**（30分程度）
4. **リスクが低い**（既存機能への影響が最小限）
5. **柔軟性が高い**（将来の拡張が容易）

### HTTPOnly Cookie方式が必要なケース
以下の場合のみCookie方式を検討：
- セキュリティ要件が非常に厳しい
- XSS攻撃のリスクが極めて高い
- コンプライアンス上の要求がある

**現時点では不要と判断します。**

---

## 🚀 次のステップ

1. **Axiosインターセプターの追加**（5分）
2. **既存コードのクリーンアップ**（10分）
3. **動作確認**（15分）
   - ログイン → PINコード → メイン画面
   - 各種API呼び出し
   - ログアウト

**合計所要時間: 約30分**

---

## ✅ 実装の承認をお願いします

SessionStorage + Authorizationヘッダー方式で実装してよろしいでしょうか？
