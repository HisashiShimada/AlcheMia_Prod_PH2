# Redis接続成功の原因調査

## 状況

**問題:**
- Dockerでredisコンテナを起動していない
- しかしバックエンドのログで「✅ Redis接続成功」と表示される

**ログ:**
```
🔌 Redis接続試行中: localhost:6379
✅ Redis接続成功
```

**推測される原因:**
1. Ubuntuシステム上でredis-serverサービスが起動している
2. WSL2環境でWindowsのRedisサービスが動作している
3. 別のRedisプロセスが6379ポートで起動している

---

## 🔍 原因調査コマンド

### Step 1: Redis接続確認

```bash
# Redis CLI で接続確認
redis-cli ping

# 期待される結果1: Redisが起動中
# → PONG

# 期待される結果2: Redisが停止中
# → Could not connect to Redis at 127.0.0.1:6379: Connection refused
```

**PONGが返ってきた場合 → Redisは起動しています**

---

### Step 2: Dockerコンテナの確認

```bash
# すべてのDockerコンテナを確認（停止中含む）
docker ps -a | grep redis

# 期待される結果1: コンテナが存在する
# CONTAINER ID   IMAGE          STATUS
# abc123...      redis:7-alpine Exited (0) 2 hours ago

# 期待される結果2: コンテナが存在しない
# （何も表示されない）
```

---

### Step 3: Ubuntuシステムサービスの確認

```bash
# redis-serverサービスの状態確認
sudo systemctl status redis-server

# 期待される結果1: サービスが起動中
# ● redis-server.service - Advanced key-value store
#    Loaded: loaded (/lib/systemd/system/redis-server.service; enabled; vendor preset: enabled)
#    Active: active (running) since ...

# 期待される結果2: サービスが存在しない
# Unit redis-server.service could not be found.

# 期待される結果3: サービスが停止中
# ● redis-server.service - Advanced key-value store
#    Active: inactive (dead)
```

---

### Step 4: プロセスの確認

```bash
# Redisプロセスを探す
ps aux | grep redis-server

# 期待される結果1: プロセスが起動中
# redis     1234  0.1  0.3  51384  7892 ?  Ssl  10:00  0:01 /usr/bin/redis-server 127.0.0.1:6379

# 期待される結果2: プロセスなし
# user      5678  0.0  0.0  12345   890 pts/0    S+   10:00   0:00 grep redis-server
# （grepコマンド自体のみ表示される）
```

---

### Step 5: ポート使用状況の確認

```bash
# 6379ポートを使用しているプロセスを確認
sudo lsof -i :6379

# または
sudo netstat -tulpn | grep 6379

# 期待される結果1: Redisが6379ポートを使用中
# COMMAND     PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# redis-ser  1234  redis   6u  IPv4  12345      0t0  TCP localhost:6379 (LISTEN)

# 期待される結果2: 何も使用していない
# （何も表示されない）
```

---

## 📊 原因別の対処方法

### ケース1: Ubuntuシステムサービスとして起動している

**確認:**
```bash
sudo systemctl status redis-server
# → active (running) と表示される
```

**これが原因の場合:**
- Ubuntuにredis-serverがインストールされている
- システム起動時に自動起動している

**対処方法（2つの選択肢）:**

#### 選択肢A: システムサービスを停止する

```bash
# Redis停止
sudo systemctl stop redis-server

# 自動起動を無効化
sudo systemctl disable redis-server

# 確認
sudo systemctl status redis-server
# → inactive (dead) と表示されればOK

# バックエンド再起動
cd backend
npm run dev
# → ⚠️ Redis未起動 というログが出る
```

#### 選択肢B: システムサービスのRedisを使用する

```bash
# 現在のままRedisを使用
# → 30分アイドルタイムアウトが有効
# → テストや本番運用に適している

# Redis接続確認
redis-cli ping
# → PONG

# Redis内のデータ確認
redis-cli
127.0.0.1:6379> KEYS *
127.0.0.1:6379> EXIT
```

---

### ケース2: Dockerコンテナが起動している

**確認:**
```bash
docker ps | grep redis
# → コンテナが表示される
```

**対処方法:**
```bash
# コンテナを停止
docker stop <コンテナID>

# または全てのRedisコンテナを停止
docker stop $(docker ps -q --filter ancestor=redis:7-alpine)

# 確認
docker ps | grep redis
# → 何も表示されないことを確認
```

---

### ケース3: 手動で起動したredis-server

**確認:**
```bash
ps aux | grep redis-server
# → /usr/bin/redis-server のようなプロセスが表示される
```

**対処方法:**
```bash
# プロセスIDを確認
ps aux | grep redis-server
# 例: redis  1234  ... /usr/bin/redis-server

# プロセスを終了
sudo kill 1234

# 確認
ps aux | grep redis-server
# → grepコマンド自体のみ表示されることを確認
```

---

## ✅ 調査フローチャート

```
1. redis-cli ping を実行
   ├─ PONG → Redis起動中
   │   └─ 次へ: Step 2-5で起動元を特定
   └─ Connection refused → Redis停止中
       └─ 完了: 期待通りの状態

2. docker ps | grep redis
   ├─ コンテナ表示 → Dockerコンテナが起動中
   │   └─ docker stop で停止
   └─ 表示なし → 次へ

3. sudo systemctl status redis-server
   ├─ active (running) → システムサービスが起動中
   │   └─ systemctl stop で停止 or そのまま使用
   └─ not found / inactive → 次へ

4. ps aux | grep redis-server
   ├─ プロセス表示 → 手動起動中
   │   └─ kill で終了
   └─ 表示なし → 原因不明（要追加調査）
```

---

## 🎯 推奨される対応

### 開発環境での8時間ログアウトなしをテストしたい場合

**目標:** Redis未起動でバックエンド起動

**手順:**
```bash
# 1. Redisを完全に停止
sudo systemctl stop redis-server        # システムサービスの場合
docker stop $(docker ps -q --filter ancestor=redis)  # Dockerの場合
sudo pkill redis-server                 # 手動起動の場合

# 2. 停止確認
redis-cli ping
# → Connection refused が出ることを確認

# 3. バックエンド再起動
cd backend
npm run dev
# → ⚠️ Redis未起動 が表示されることを確認

# 4. ログインテスト
cd frontend
npm run dev
# → http://localhost:3000 でログイン
# → トークン有効期限が60分になることを確認
```

---

### 30分アイドルタイムアウトをテストしたい場合

**目標:** Redis起動してバックエンド起動

**手順:**
```bash
# Redisが既に起動している場合（システムサービス）
sudo systemctl start redis-server

# または Dockerで起動
docker run -d -p 6379:6379 redis:7-alpine

# 確認
redis-cli ping
# → PONG

# バックエンド起動
cd backend
npm run dev
# → ✅ Redis接続成功 が表示されることを確認
```

---

## 📝 調査結果テンプレート

以下のコマンドを実行して結果を確認してください：

```bash
echo "=== Redis接続確認 ==="
redis-cli ping

echo ""
echo "=== Dockerコンテナ確認 ==="
docker ps -a | grep redis

echo ""
echo "=== システムサービス確認 ==="
sudo systemctl status redis-server 2>&1 | head -5

echo ""
echo "=== プロセス確認 ==="
ps aux | grep redis-server | grep -v grep

echo ""
echo "=== ポート確認 ==="
sudo lsof -i :6379
```

**この結果をもとに、次のアクションを決定できます。**

---

## 🔧 よくあるケース

### ケース1: Ubuntu 20.04/22.04にredis-serverをインストールした

**インストール履歴:**
```bash
sudo apt update
sudo apt install redis-server
```

**結果:**
- redis-serverがシステムサービスとして登録
- システム起動時に自動起動
- localhost:6379 で待ち受け

**確認方法:**
```bash
systemctl list-units --type=service | grep redis
# → redis-server.service が loaded, active と表示される
```

---

### ケース2: Docker Composeでredisを起動した

**docker-compose.yml:**
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**起動:**
```bash
docker-compose up -d redis
```

**確認:**
```bash
docker-compose ps
# → redis が Up と表示される
```

**停止:**
```bash
docker-compose stop redis
```

---

## 💡 まとめ

**現在の状況:**
- Dockerコンテナは起動していない（ユーザー確認済み）
- しかしRedis接続成功（バックエンドログ）

**最も可能性が高い原因:**
1. **Ubuntuシステムサービスとしてredis-serverが起動している**
   - `sudo systemctl status redis-server` で確認

2. **docker-compose.ymlで定義されたredisが起動している**
   - `docker-compose ps` で確認

**次のステップ:**
1. 上記の調査コマンドを実行
2. 起動元を特定
3. Redis未起動でのテストをするか、起動したままにするか決定

**判断基準:**
- **Redis未起動でテスト** → 8時間ログアウトなし（開発向け）
- **Redis起動したまま** → 30分アイドルタイムアウト（本番同等）
