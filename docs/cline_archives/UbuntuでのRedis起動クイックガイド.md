# Ubuntu（WSL2）でのRedis起動クイックガイド

## 前提条件

✅ WSL2 Ubuntu-24.04がインストール済み  
✅ Docker がUbuntu内にインストール済み  

---

## クイックスタート（5ステップ）

### 1. WSL2 Ubuntuを起動

**Windowsのコマンドプロンプトまたは PowerShell:**
```powershell
# Ubuntu-24.04を起動
wsl -d Ubuntu-24.04

# または、デフォルトディストリビューションに設定してから起動
wsl --set-default Ubuntu-24.04
wsl
```

### 2. Dockerデーモンの起動確認

**Ubuntu内で実行:**
```bash
# Dockerデーモンの状態確認
sudo service docker status

# 停止している場合は起動
sudo service docker start

# 自動起動設定（オプション）
sudo systemctl enable docker
```

### 3. プロジェクトディレクトリに移動

```bash
# Windowsのプロジェクトフォルダに移動
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf

# 現在のディレクトリ確認
pwd
# 出力: /mnt/c/Users/shuto.shimogama/Documents/mmdpf
```

### 4. Redisコンテナの起動

```bash
# Redisコンテナを起動（バックグラウンド）
docker compose up -d redis

# 起動確認
docker ps | grep redis
```

**期待される出力:**
```
CONTAINER ID   IMAGE           COMMAND                  STATUS         PORTS                    NAMES
xxxxxxxxxxxx   redis:7-alpine  "docker-entrypoint.s…"   Up 10 seconds  0.0.0.0:6379->6379/tcp   mmdpf-redis
```

### 5. Redis動作確認

```bash
# Redis接続テスト
docker exec -it mmdpf-redis redis-cli ping

# 期待される出力: PONG
```

---

## バックエンドサーバーとの接続設定

### Windows側の環境変数設定

**backend/.env ファイルを編集:**
```env
# Redisセッションストアを有効化
SESSION_STORE_TYPE=redis

# Redis接続URL（localhostでOK）
REDIS_URL=redis://localhost:6379

# セッション設定
SESSION_MAX_AGE=86400000
SESSION_COOKIE_NAME=mmdpf.sid
```

### バックエンドサーバーの起動

**Windowsのコマンドプロンプトまたは PowerShell:**
```powershell
cd backend
npm run dev
```

### 起動ログの確認

**正常にRedis接続できた場合:**
```
✅ Redis Client Connected
Redis Client Ready
🗄️  Session Store: REDIS (production mode)
✅ Redis connection established
🚀 Server is running on port 3001
📊 Environment: development
```

---

## 動作確認コマンド

### Ubuntuターミナル内で実行

```bash
# Redisコンテナに入る
docker exec -it mmdpf-redis redis-cli

# セッション一覧を確認
KEYS mmdpf:sess:*

# データベースサイズ確認
DBSIZE

# 終了
exit
```

---

## コンテナの停止・再起動

### 停止（データは保持）

```bash
# Ubuntu内で実行
docker compose stop redis
```

### 再起動

```bash
# Ubuntu内で実行
docker compose start redis

# または
docker compose up -d redis
```

### 完全削除（データも削除）

```bash
# Ubuntu内で実行
docker compose down redis
```

---

## トラブルシューティング

### 問題1: Dockerデーモンが起動しない

**症状:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**解決策:**
```bash
# Dockerサービスを起動
sudo service docker start

# 状態確認
sudo service docker status
```

### 問題2: ポート6379が使用中

**症状:**
```
Error: bind: address already in use
```

**解決策:**
```bash
# ポート使用状況確認
sudo lsof -i :6379

# または
sudo netstat -tlnp | grep 6379

# 既存のRedisプロセスを停止してから再起動
```

### 問題3: Windows側から接続できない

**症状:**
- バックエンドサーバーで `Redis Client Error: connect ECONNREFUSED`

**解決策:**

1. **Redisコンテナが起動しているか確認（Ubuntu内）:**
   ```bash
   docker ps | grep redis
   ```

2. **localhostフォワーディングの確認:**
   - WSL2は通常、自動的にlocalhostをフォワード
   - 接続できない場合は、WSL2のIPアドレスを直接指定:

   ```bash
   # Ubuntu内で実行: WSL2のIPアドレス取得
   ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1
   ```

   **backend/.env を修正:**
   ```env
   REDIS_URL=redis://172.x.x.x:6379  # 上記で取得したIPに置き換え
   ```

### 問題4: docker composeコマンドが使えない

**症状:**
```
docker: 'compose' is not a docker command
```

**解決策:**
```bash
# Docker Compose Pluginをインストール
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 確認
docker compose version
```

---

## WSL2 + Docker 推奨ワークフロー

### 開発開始時（毎日の作業開始）

```bash
# 1. Windowsから Ubuntu起動
wsl -d Ubuntu-24.04

# 2. プロジェクトに移動
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf

# 3. Dockerデーモン確認
sudo service docker status
# 停止していれば: sudo service docker start

# 4. Redisコンテナ起動
docker compose up -d redis

# 5. 確認
docker ps | grep redis
docker exec -it mmdpf-redis redis-cli ping  # PONG が返ればOK
```

### 開発終了時

```bash
# Ubuntu内で実行

# Redis停止（データは保持される）
docker compose stop redis

# WSL2を終了したい場合（Windowsから）
exit  # Ubuntuターミナルを終了
wsl --shutdown  # PowerShellから実行
```

---

## 便利なエイリアス設定（オプション）

Ubuntu内で以下を設定すると便利です:

```bash
# ~/.bashrc または ~/.zshrc に追加
echo 'alias mmdpf="cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf"' >> ~/.bashrc
echo 'alias redis-start="docker compose up -d redis"' >> ~/.bashrc
echo 'alias redis-stop="docker compose stop redis"' >> ~/.bashrc
echo 'alias redis-cli="docker exec -it mmdpf-redis redis-cli"' >> ~/.bashrc

# 設定を反映
source ~/.bashrc
```

**使用例:**
```bash
# プロジェクトに移動
mmdpf

# Redis起動
redis-start

# Redisコマンド実行
redis-cli ping
```

---

## よくある質問（FAQ）

### Q1: WSL2を再起動するとRedisが停止する？

**A:** はい、WSL2を`wsl --shutdown`で完全シャットダウンすると、すべてのコンテナが停止します。  
再起動後は `docker compose up -d redis` で起動してください。

### Q2: Redisのデータは保持される？

**A:** はい、`docker compose stop redis` で停止した場合、データは保持されます。  
`docker compose down redis` または `docker compose down -v` でボリュームごと削除すると、データも消えます。

### Q3: Windows側でNode.jsを動かし、Ubuntu側でRedisを動かせる？

**A:** はい、可能です。WSL2は自動的に`localhost`をフォワードするため、Windows側から`redis://localhost:6379`で接続できます。

### Q4: Dockerデーモンを自動起動したい

**A:** Ubuntu内で以下を実行:
```bash
sudo systemctl enable docker
```

ただし、WSL2の場合はsystemdが完全には動作しないため、`~/.bashrc`に以下を追加する方法もあります:
```bash
# Dockerデーモンが停止していれば自動起動
if ! sudo service docker status > /dev/null 2>&1; then
    sudo service docker start
fi
```

---

## 参考コマンド一覧

### Docker操作
```bash
# コンテナ一覧
docker ps

# Redis起動（バックグラウンド）
docker compose up -d redis

# Redis停止
docker compose stop redis

# Redisログ確認
docker logs mmdpf-redis

# Redisコンテナに入る
docker exec -it mmdpf-redis sh
```

### Redis操作
```bash
# Redis CLIに接続
docker exec -it mmdpf-redis redis-cli

# セッション確認
docker exec -it mmdpf-redis redis-cli KEYS "mmdpf:sess:*"

# データベースサイズ
docker exec -it mmdpf-redis redis-cli DBSIZE

# 接続テスト
docker exec -it mmdpf-redis redis-cli ping
```

---

## まとめ

✅ **Ubuntu-24.04起動** → `wsl -d Ubuntu-24.04`  
✅ **Dockerデーモン起動** → `sudo service docker start`  
✅ **プロジェクトに移動** → `cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf`  
✅ **Redis起動** → `docker compose up -d redis`  
✅ **動作確認** → `docker exec -it mmdpf-redis redis-cli ping`

この5ステップでRedisが起動し、Windows側のNode.jsアプリから利用可能になります！

---

## より詳細な情報

詳細なトラブルシューティングや設定については、以下を参照してください:

- **[Redis動作確認手順.md](Redis動作確認手順.md)** - 全体的な手順書
- **[docker-compose.yml](../docker-compose.yml)** - Redisコンテナの設定
