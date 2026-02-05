# Redis停止と未起動テスト手順

## 現状確認

**現在のログ:**
```
🔌 Redis接続試行中: localhost:6379
✅ Redis接続成功
🗄️  Session Store: MEMORY (development mode)
⚠️  Sessions will be lost on server restart
🚀 Server is running on port 3001
📊 Environment: development
```

**状態:** Redis起動中 → **30分アイドルタイムアウト有効**

---

## 🛑 Redis停止手順

### 方法1: Dockerで起動している場合

```bash
# Redisコンテナを停止
docker ps | grep redis
# → コンテナIDを確認

docker stop <コンテナID>
# または
docker stop mmdpf-redis

# 確認
docker ps | grep redis
# → 何も表示されなければOK
```

### 方法2: システムサービスの場合（Ubuntu）

```bash
# Redisサービスを停止
sudo systemctl stop redis-server

# 確認
sudo systemctl status redis-server
# → inactive (dead) と表示されればOK
```

### 方法3: 手動で起動した場合

```bash
# redis-serverプロセスを探す
ps aux | grep redis-server

# プロセスを終了
kill <プロセスID>
```

---

## ✅ Redis未起動での動作確認手順

### Step 1: Redisを停止

```bash
# Dockerの場合
docker stop mmdpf-redis

# 停止確認
redis-cli ping
# → Could not connect to Redis at 127.0.0.1:6379: Connection refused
# ↑ このエラーが出ればRedis停止成功
```

### Step 2: バックエンドを再起動

```bash
# 現在のサーバーを停止
Ctrl+C

# 再起動
cd backend
npm run dev
```

### Step 3: 起動ログを確認

**期待されるログ（Redis未起動時）:**
```
⚠️  Redis接続エラー（開発環境）: connect ECONNREFUSED 127.0.0.1:6379
⚠️  Redis未起動: フォールバック動作で起動
⚠️  以下の機能が無効化されています:
  - リフレッシュトークンの管理
  - 30分アイドルタイムアウト
  - トークンの即座の無効化
⚠️  JWT検証のみで認証されます
⚠️  トークン有効期限: 8時間（開発環境用の長い有効期限）
⚠️  完全な機能をテストするにはRedisを起動してください:
  docker run -d -p 6379:6379 redis:7-alpine

🗄️  Session Store: MEMORY (development mode)
⚠️  Sessions will be lost on server restart
🚀 Server is running on port 3001
📊 Environment: development
```

**重要なポイント:**
- `✅ Redis接続成功` → **表示されない**
- `⚠️ Redis未起動: フォールバック動作` → **表示される**
- `トークン有効期限: 8時間` → **表示される**

### Step 4: ログインテスト

```bash
# フロントエンド起動
cd frontend
npm run dev

# ブラウザで http://localhost:3000
```

1. ログイン画面でログイン
2. PINコード入力
3. メニュー画面が表示される → **成功** ✅

### Step 5: トークン有効期限の確認

ブラウザでF12 → Console → 以下を実行:

```javascript
// トークン有効期限の確認
const expiresAt = new Date(sessionStorage.getItem('tokenExpiresAt'));
const now = new Date();
const remainingMinutes = (expiresAt - now) / 1000 / 60;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 トークン情報');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('有効期限:', expiresAt.toLocaleString('ja-JP'));
console.log('残り時間:', remainingMinutes.toFixed(1), '分');
console.log('残り時間:', (remainingMinutes / 60).toFixed(1), '時間');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');

// リフレッシュトークンの確認
console.log('Cookieの確認:');
console.log(document.cookie);
```

**期待される結果（Redis未起動時）:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 トークン情報
━━━━━━━━━━━━━━━━━━━━━━━━━━
有効期限: 2026/2/4 14:52:17
残り時間: 60.0 分
残り時間: 1.0 時間
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 6: 長時間放置テスト

**テスト方法:**
1. ログイン後、何も操作せずに放置
2. 1時間後に画面を操作（例: 別のメニューをクリック）
3. 自動的にトークンが更新される
4. 引き続き操作可能 → **成功** ✅

**期待される動作:**
- 1時間後: アクセストークン更新（自動）
- 2時間後: アクセストークン更新（自動）
- ...
- 8時間後: リフレッシュトークン期限切れ → ログアウト

---

## 🔄 Redis再起動（完全機能テスト）

### 30分タイムアウトをテストする場合

```bash
# Step 1: Redisを起動
docker run -d -p 6379:6379 redis:7-alpine

# Step 2: 起動確認
redis-cli ping
# → PONG

# Step 3: バックエンドを再起動
cd backend
Ctrl+C
npm run dev

# 期待されるログ:
# ✅ Redis接続成功
```

---

## 📊 動作比較表

| 状態 | Redis | ログ | アクセストークン | リフレッシュトークン | 自動ログアウト |
|------|-------|------|----------------|-------------------|--------------|
| **現在** | ✅ 起動 | `✅ Redis接続成功` | 15分 | 30分（rolling） | 30分操作なし |
| **テスト対象** | ❌ 停止 | `⚠️ Redis未起動` | 1時間 | 8時間 | **8時間** |

---

## 🚨 トラブルシューティング

### 問題1: Redis停止後もRedis接続成功と表示される

**原因:** サーバーを再起動していない

**解決方法:**
```bash
# サーバーを完全に停止
Ctrl+C

# 再起動
npm run dev
```

### 問題2: Redis停止したのに30分でログアウトされる

**原因1:** `NODE_ENV=development` が設定されていない

**解決方法:**
```bash
# backend/.env を確認
cat backend/.env | grep NODE_ENV

# なければ追加
echo "NODE_ENV=development" >> backend/.env

# サーバー再起動
cd backend
npm run dev
```

**原因2:** Redisが実は起動している

**解決方法:**
```bash
# Redisの状態確認
redis-cli ping
# → PONGと返ってくる場合は起動中

# 停止
docker stop $(docker ps -q --filter ancestor=redis:7-alpine)
```

### 問題3: ログインできない

**症状:**
```
エラー: サーバーに接続できません
```

**原因:** バックエンドが起動していない

**解決方法:**
```bash
# バックエンドが起動しているか確認
curl http://localhost:3001/api/auth/verify-pin
# → レスポンスがあればOK

# 起動していなければ起動
cd backend
npm run dev
```

---

## ✅ 確認チェックリスト

### Redis停止確認

- [ ] `redis-cli ping` でエラーが出る
- [ ] `docker ps | grep redis` で何も表示されない

### サーバー起動確認

- [ ] バックエンド起動ログに `⚠️ Redis未起動` が表示される
- [ ] `✅ Redis接続成功` が**表示されない**
- [ ] `トークン有効期限: 8時間` が表示される

### ログインテスト

- [ ] ログイン成功
- [ ] メニュー画面表示
- [ ] トークン有効期限が約60分（1時間）

### 長時間テスト

- [ ] 1時間後も操作可能
- [ ] 2時間後も操作可能
- [ ] 8時間後にログアウトされる

---

## 📝 次のステップ

### Redis未起動での確認（今回）

1. ✅ Redisを停止
2. ✅ サーバー再起動
3. ✅ ログイン確認
4. ✅ 8時間ログアウトされない確認

### Redis起動での確認（次回）

1. Redisを起動
2. サーバー再起動
3. ログイン確認
4. 30分放置
5. 自動ログアウト確認

---

## 🎯 まとめ

**現在の状態:**
- Redis: ✅ 起動中
- 動作: 30分アイドルタイムアウト有効

**テストしたい状態:**
- Redis: ❌ 停止
- 動作: 8時間ログアウトなし

**必要な操作:**
1. `docker stop mmdpf-redis`
2. `cd backend && npm run dev`
3. ログを確認（`⚠️ Redis未起動` が表示されることを確認）
4. ログインして動作確認

**期待される結果:**
- ログイン成功 ✅
- トークン有効期限: 1時間（アクセストークン）
- 8時間ログアウトなし ✅
