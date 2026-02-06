# Redis未起動時の開発環境設定ガイド

## 概要

開発環境でRedisを起動せずに開発する場合の設定ガイドです。この設定により、**8時間自動ログアウトされずに開発作業**ができます。

---

## 📋 必要な環境変数

### backend/.env に以下を追加

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 開発環境設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE_ENV=development

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JWT設定（Redis起動時）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JWT_ACCESS_TOKEN_EXPIRES_IN=900    # 15分（秒）
JWT_REFRESH_TOKEN_EXPIRES_IN=1800  # 30分（秒）

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JWT設定（Redis未起動時・開発環境のみ）
# ⚠️ この設定により8時間ログアウトされません
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JWT_ACCESS_TOKEN_EXPIRES_IN_DEV=3600   # 1時間（秒）
JWT_REFRESH_TOKEN_EXPIRES_IN_DEV=28800 # 8時間（秒）

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Redis設定（オプション）
# ⚠️ Redis未起動でも問題なく動作します
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## ✅ 設定手順

### Step 1: backend/.env ファイルを編集

```bash
cd backend

# .envファイルを開く
code .env
# または
notepad .env
```

### Step 2: 以下の3つの環境変数を追加・確認

```bash
NODE_ENV=development
JWT_ACCESS_TOKEN_EXPIRES_IN_DEV=3600
JWT_REFRESH_TOKEN_EXPIRES_IN_DEV=28800
```

**重要:**
- `NODE_ENV=development` が設定されていないと、開発環境用の長い有効期限が使用されません
- `JWT_ACCESS_TOKEN_EXPIRES_IN_DEV` と `JWT_REFRESH_TOKEN_EXPIRES_IN_DEV` がないと、デフォルト値（15分・30分）が使用されます

### Step 3: バックエンドを再起動

```bash
# すでに起動している場合は停止
Ctrl+C

# 再起動
npm run dev
```

### Step 4: 起動メッセージを確認

**Redis未起動の場合（正常）:**

```
⚠️  Redis接続エラー（開発環境）: connect ECONNREFUSED 127.0.0.1:6379
⚠️  Redis未起動: フォールバック動作で起動
⚠️  完全な機能をテストするにはRedisを起動してください

✅ Server running on port 3001 (development mode)
```

**Redis起動済みの場合:**

```
✅ Redis connection established
✅ Server running on port 3001 (development mode)
```

---

## 🔍 動作確認方法

### 1. ログインテスト

```bash
# フロントエンド起動
cd frontend
npm run dev

# ブラウザでアクセス
# http://localhost:3000
```

1. ログイン画面でログイン
2. PINコード入力
3. メニュー画面が表示される

### 2. トークン有効期限の確認

**開発者ツールを開く:**
1. ブラウザでF12キー
2. Consoleタブを開く
3. 以下のコマンドを実行:

```javascript
// sessionStorageの内容確認
console.log('sessionToken:', sessionStorage.getItem('sessionToken'));
console.log('tokenExpiresAt:', sessionStorage.getItem('tokenExpiresAt'));

// トークン有効期限までの残り時間（分）
const expiresAt = new Date(sessionStorage.getItem('tokenExpiresAt'));
const now = new Date();
const remainingMinutes = (expiresAt - now) / 1000 / 60;
console.log('残り時間（分）:', remainingMinutes);
```

**期待される結果（Redis未起動時）:**
```
残り時間（分）: 約60分（1時間）
```

**期待される結果（Redis起動時）:**
```
残り時間（分）: 約15分
```

### 3. 自動ログアウトされないことの確認

**Redis未起動の場合:**
- 1時間後にアクセストークンが期限切れ
- 自動的にリフレッシュトークンで更新
- リフレッシュトークンは8時間有効
- **結果: 8時間ログアウトされない** ✅

**Redis起動の場合:**
- 15分後にアクセストークンが期限切れ
- 自動的にリフレッシュトークンで更新（30分に延長）
- 30分操作なしでログアウト
- **結果: 30分操作なしでログアウト** ✅

---

## 🚨 トラブルシューティング

### 問題1: 30分でログアウトされてしまう

**症状:**
```
Redis未起動なのに30分でログアウトされる
```

**原因:**
1. `NODE_ENV=development` が設定されていない
2. `JWT_REFRESH_TOKEN_EXPIRES_IN_DEV` が設定されていない
3. 環境変数の読み込みに失敗している

**解決方法:**

```bash
# backend/.env を確認
cat backend/.env | grep NODE_ENV
cat backend/.env | grep JWT_REFRESH_TOKEN_EXPIRES_IN_DEV

# 出力例（正しい設定）:
# NODE_ENV=development
# JWT_REFRESH_TOKEN_EXPIRES_IN_DEV=28800
```

設定されていない場合:

```bash
# backend/.env に追加
echo "NODE_ENV=development" >> backend/.env
echo "JWT_REFRESH_TOKEN_EXPIRES_IN_DEV=28800" >> backend/.env

# サーバー再起動
cd backend
npm run dev
```

### 問題2: サーバーが起動しない

**症状:**
```
Error: Redis connection required in production environment
```

**原因:**
`NODE_ENV=production` になっている

**解決方法:**

```bash
# backend/.env を編集
NODE_ENV=development  # productionから変更
```

### 問題3: 環境変数が反映されない

**原因:**
サーバーを再起動していない

**解決方法:**

```bash
# サーバーを完全に停止
Ctrl+C

# 再起動
cd backend
npm run dev
```

---

## 📊 設定別の動作比較

| 設定 | Redis | NODE_ENV | アクセストークン | リフレッシュトークン | 自動ログアウト |
|------|-------|----------|----------------|-------------------|--------------|
| 本番環境 | ✅ 起動 | production | 15分 | 30分（rolling） | 30分操作なし |
| 開発環境（完全機能） | ✅ 起動 | development | 15分 | 30分（rolling） | 30分操作なし |
| 開発環境（簡易） | ❌ 未起動 | development | 1時間 | 8時間 | 8時間 |
| 誤った設定 | ❌ 未起動 | production | ❌ 起動失敗 | ❌ 起動失敗 | ❌ 起動失敗 |

---

## 🎯 推奨される開発ワークフロー

### UI開発・ロジック開発（Redis不要）

```bash
# 1. Redis未起動で開発
cd backend
npm run dev
# → ⚠️ Redis未起動: フォールバック動作

cd frontend
npm run dev

# 2. 8時間ログアウトされずに開発可能
```

**メリット:**
- 素早く開発開始
- 頻繁なログインなし
- Redis不要

**デメリット:**
- 30分タイムアウトのテストができない
- トークン無効化のテストができない

### 認証機能テスト（Redis必要）

```bash
# 1. Redisを起動
docker run -d -p 6379:6379 redis:7-alpine

# 2. バックエンド起動
cd backend
npm run dev
# → ✅ Redis connection established

# 3. 完全な機能をテスト
# - 30分タイムアウト
# - トークンローテーション
# - ログアウト時のトークン無効化
```

---

## 🔐 セキュリティ上の注意

### 開発環境専用の設定

**以下の設定は開発環境でのみ使用:**
- `JWT_ACCESS_TOKEN_EXPIRES_IN_DEV=3600`
- `JWT_REFRESH_TOKEN_EXPIRES_IN_DEV=28800`

**本番環境では絶対に使用しないこと:**
- 本番では `NODE_ENV=production` を設定
- 本番ではRedis必須
- 長い有効期限はセキュリティリスク

### .envファイルの管理

```bash
# ❌ Gitにコミットしない
git add .env  # 絶対に実行しない

# ✅ .gitignoreに含める
echo ".env" >> .gitignore
```

---

## 📚 関連ドキュメント

- [Redis環境変数設定ガイド](./Redis環境変数設定ガイド.md)
- [Redis動作確認手順](./Redis動作確認手順.md)
- [タスク計画書](./20260204_0851_リフレッシュトークン実装_30分アイドルタイムアウト_PLAN.md)

---

## ✅ クイックチェックリスト

開発環境でRedis未起動で開発する場合:

- [ ] `backend/.env` に `NODE_ENV=development` を設定
- [ ] `backend/.env` に `JWT_ACCESS_TOKEN_EXPIRES_IN_DEV=3600` を設定
- [ ] `backend/.env` に `JWT_REFRESH_TOKEN_EXPIRES_IN_DEV=28800` を設定
- [ ] サーバーを再起動
- [ ] 起動メッセージで「Redis未起動: フォールバック動作」を確認
- [ ] ログインできることを確認
- [ ] 1時間後もログアウトされないことを確認

---

**重要:** 本番環境では必ずRedisを起動し、`NODE_ENV=production` を設定してください。
