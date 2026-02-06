# Redis動作確認手順

## 前提条件

Redisセッションストアの動作確認を行うための手順書です。

---

## 方法1: Docker Desktopを使用する場合（推奨）

### 1. Docker Desktopの起動確認

Docker Desktopがインストールされている場合:
1. Docker Desktopを起動
2. コマンドプロンプトまたはPowerShellで確認:

```powershell
docker --version
```

### 2. Redisコンテナの起動

```powershell
# プロジェクトルートで実行
docker compose up -d redis

# または
docker-compose up -d redis
```

### 3. Redis起動確認

```powershell
docker ps | findstr redis
```

**期待される出力:**
```
mmdpf-redis   redis:7-alpine   ...   Up   6379/tcp
```

---

## 方法2: WSL2 + Dockerを使用する場合（推奨）⭐

### 概要
WSL2のUbuntu上でDockerを起動してRedisコンテナを動かす方法です。
- ✅ LinuxネイティブなDockerパフォーマンス
- ✅ Docker Desktopのライセンス問題を回避
- ✅ 本番環境に近い環境で開発可能

### 前提条件
- WSL2がインストール済み
- WSL2上にUbuntuがインストール済み
- WSL2内にDockerがインストール済み

### 1. WSL2環境の確認

**Windowsのコマンドプロンプトまたは PowerShell:**
```powershell
# WSL2の状態確認
wsl --list --verbose

# 期待される出力例
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

### 2. WSL2内でDockerの確認/インストール

**WSL2 Ubuntuターミナルで実行:**
```bash
# WSL2に入る（Windowsから）
wsl

# Dockerがインストールされているか確認
docker --version

# インストールされていない場合
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# ユーザーをdockerグループに追加（sudoなしで実行可能に）
sudo usermod -aG docker $USER

# 一度ログアウトして再ログイン
exit
wsl
```

### 3. WSL2内でDocker Composeの確認/インストール

```bash
# Docker Composeがインストールされているか確認
docker compose version

# インストールされていない場合（最新版）
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 4. プロジェクトファイルへのアクセス

WSL2からWindowsのファイルシステムにアクセス:

```bash
# Windowsのドキュメントフォルダに移動
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf

# 現在のディレクトリ確認
pwd
# 出力: /mnt/c/Users/shuto.shimogama/Documents/mmdpf
```

### 5. Redisコンテナの起動（WSL2内）

```bash
# プロジェクトルートで実行
docker compose up -d redis

# 起動確認
docker ps | grep redis
```

**期待される出力:**
```
mmdpf-redis   redis:7-alpine   ...   Up   6379/tcp
```

### 6. Redis接続テスト（WSL2内）

```bash
# Redisコンテナ内でredis-cliを実行
docker exec -it mmdpf-redis redis-cli ping

# 期待される出力: PONG
```

### 7. Windows側からの接続設定

#### Option A: localhost経由で接続（簡単・推奨）

WSL2はデフォルトでlocalhostをフォワードするため、追加設定不要：

**backend/.env（Windows側）:**
```env
SESSION_STORE_TYPE=redis
REDIS_URL=redis://localhost:6379
```

#### Option B: WSL2のIPアドレス経由で接続（明示的）

WSL2のIPアドレスを確認して接続:

**WSL2内で実行:**
```bash
# WSL2のIPアドレスを確認
ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1

# 出力例: 172.20.10.2
```

**backend/.env（Windows側）:**
```env
SESSION_STORE_TYPE=redis
REDIS_URL=redis://172.20.10.2:6379
```

**注意:** WSL2のIPアドレスは再起動時に変わる可能性があるため、Option Aの`localhost`使用を推奨

### 8. バックエンドサーバーの起動（Windows側）

**Windowsのコマンドプロンプトまたは PowerShell:**
```powershell
cd backend
npm run dev
```

### 9. 起動ログの確認

**正常にRedis接続できた場合:**
```
✅ Redis Client Connected
Redis Client Ready
🗄️  Session Store: REDIS (production mode)
✅ Redis connection established
🚀 Server is running on port 3001
📊 Environment: development
```

### 10. Redis内のセッション確認（WSL2内）

**WSL2 Ubuntuターミナルで実行:**
```bash
# Redisコンテナ内に入る
docker exec -it mmdpf-redis redis-cli

# セッション一覧
KEYS mmdpf:sess:*

# セッション数
DBSIZE
```

### トラブルシューティング（WSL2特有）

#### 問題1: WSL2からWindowsのNode.jsアプリに接続できない

**症状:**
- Windows側でNode.jsサーバーを起動
- WSL2からlocalhost:3001にアクセスできない

**解決策:**
Windowsファイアウォール設定を確認:
```powershell
# PowerShell（管理者権限）で実行
New-NetFirewallRule -DisplayName "WSL2" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

#### 問題2: Dockerデーモンが起動していない

**症状:**
```
Cannot connect to the Docker daemon
```

**解決策:**
```bash
# Dockerデーモンを起動
sudo service docker start

# 起動確認
sudo service docker status

# 自動起動設定（Ubuntu）
sudo systemctl enable docker
```

#### 問題3: WSL2のIPアドレスが変わる

**症状:**
- 再起動後、Redis接続エラー

**解決策:**
- `localhost`を使用（推奨）
- または、起動スクリプトでIPを動的に設定:

```bash
# WSL2起動時にIPを確認
wsl_ip=$(ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
echo "WSL2 IP: $wsl_ip"
```

### WSL2 + Docker の推奨ワークフロー

#### 開発開始時
```bash
# 1. WSL2に入る（Windows側）
wsl

# 2. プロジェクトディレクトリに移動
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf

# 3. Dockerデーモン起動確認
sudo service docker status

# 4. Redisコンテナ起動
docker compose up -d redis

# 5. 起動確認
docker ps | grep redis
```

#### 開発終了時
```bash
# Redisコンテナを停止（データは保持）
docker compose stop redis

# または完全に削除（データも削除）
docker compose down redis
```

---

## 方法3: ローカルRedisを使用する場合

### 1. Redisのインストール

Windowsの場合、以下のいずれかの方法でインストール:

#### Option A: Memurai（Windowsネイティブ）
1. https://www.memurai.com/ からダウンロード
2. インストール後、サービスが自動起動

#### Option B: WSL2 + Redis（Dockerを使わない場合）
```bash
# WSL2内で実行
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

### 2. Redis起動確認

```powershell
# Windowsから接続テスト（redis-cliがある場合）
redis-cli ping
```

**期待される出力:**
```
PONG
```

---

## 環境変数の設定

### backend/.env の変更

```env
# セッションストアタイプをredisに変更
SESSION_STORE_TYPE=redis

# Redis接続情報
REDIS_URL=redis://localhost:6379

# その他のセッション設定
SESSION_MAX_AGE=86400000
SESSION_COOKIE_NAME=mmdpf.sid
SESSION_COOKIE_SECURE=false
```

---

## サーバーの起動と動作確認

### 1. バックエンドサーバーの起動

```powershell
cd backend
npm run dev
```

### 2. 起動ログの確認

**正常にRedisに接続できた場合:**
```
✅ Redis Client Connected
Redis Client Ready
🗄️  Session Store: REDIS (production mode)
✅ Redis connection established
🚀 Server is running on port 3001
📊 Environment: development
```

**Redis接続失敗時（自動フォールバック）:**
```
Redis Client Error: ...
🗄️  Session Store: REDIS (production mode)
⚠️  Redis is not available. Falling back to MEMORY store.
⚠️  Sessions will be lost on server restart
🚀 Server is running on port 3001
```

### 3. Redis内のセッション確認

別のターミナルで以下を実行:

```powershell
# Docker使用の場合
docker exec -it mmdpf-redis redis-cli

# ローカルRedis使用の場合
redis-cli
```

**Redisコマンド:**
```redis
# セッションキーの一覧表示
KEYS mmdpf:sess:*

# セッション数の確認
DBSIZE

# 特定セッションの内容確認
GET mmdpf:sess:XXXXXXXXXXXXXXXXXXXXXXXX

# セッションのTTL確認
TTL mmdpf:sess:XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 動作テスト手順

### 1. ログイン操作

1. フロントエンドを起動（別ターミナル）:
   ```powershell
   cd frontend
   npm run dev
   ```

2. ブラウザで http://localhost:3000 にアクセス

3. ログイン実行
   - ユーザー名: `system_admin`
   - パスワード: （設定されたパスワード）

### 2. Redisでセッション確認

```redis
# セッションが作成されたことを確認
KEYS mmdpf:sess:*

# 結果例
1) "mmdpf:sess:maiml_session-d41d8cd98f00b204e9800998ecf8427e_1738563244000"

# セッションの内容確認
GET mmdpf:sess:maiml_session-d41d8cd98f00b204e9800998ecf8427e_1738563244000

# 結果例（JSON形式）
{"cookie":{"originalMaxAge":86400000,...},"departmentCd":"001"}
```

### 3. サーバー再起動テスト

1. バックエンドサーバーを停止（Ctrl+C）
2. サーバーを再起動
   ```powershell
   npm run dev
   ```
3. ブラウザでページをリロード
4. **セッションが維持されていることを確認**（再ログイン不要）

### 4. ログアウト操作

1. ログアウト実行
2. Redisでセッションが削除されたことを確認:
   ```redis
   KEYS mmdpf:sess:*
   # 結果: (empty array)
   ```

---

## トラブルシューティング

### 問題1: Redis接続エラー

**症状:**
```
Redis Client Error: connect ECONNREFUSED 127.0.0.1:6379
```

**原因:**
- Redisが起動していない
- ポート6379が使用中

**解決策:**
1. Redisコンテナの状態確認:
   ```powershell
   docker ps -a | findstr redis
   ```

2. Redisコンテナが停止している場合:
   ```powershell
   docker start mmdpf-redis
   ```

3. ポート確認:
   ```powershell
   netstat -an | findstr 6379
   ```

### 問題2: セッションが保存されない

**症状:**
- ログインしてもすぐにログアウトされる
- `KEYS mmdpf:sess:*` で何も表示されない

**原因:**
- SESSION_STORE_TYPEが`memory`のまま
- Redis接続が失敗してメモリストアにフォールバック

**解決策:**
1. .envファイル確認:
   ```env
   SESSION_STORE_TYPE=redis  # ここが重要
   ```

2. サーバーログ確認:
   ```
   🗄️  Session Store: REDIS (production mode)
   ✅ Redis connection established
   ```

3. Redis接続テスト:
   ```powershell
   docker exec -it mmdpf-redis redis-cli ping
   # 期待される出力: PONG
   ```

### 問題3: セッションが即座に削除される

**症状:**
- セッションは作成されるがすぐに消える

**原因:**
- SESSION_MAX_AGEの設定ミス
- Redis側のmaxmemory-policy設定

**解決策:**
1. SESSION_MAX_AGE確認:
   ```env
   SESSION_MAX_AGE=86400000  # 24時間（ミリ秒）
   ```

2. TTL確認:
   ```redis
   TTL mmdpf:sess:XXXXXXXX
   # 正の数値が表示されればOK
   ```

---

## メモリストアモードに戻す場合

Redisを使用せずにメモリストアに戻す場合:

### 1. 環境変数を変更

```env
SESSION_STORE_TYPE=memory
```

### 2. サーバー再起動

```powershell
# バックエンドサーバーを再起動
cd backend
npm run dev
```

### 3. ログ確認

```
Redis is disabled (SESSION_STORE_TYPE=memory)
🗄️  Session Store: MEMORY (development mode)
⚠️  Sessions will be lost on server restart
```

---

## まとめ

### 推奨される方法の選択

| 方法 | 推奨度 | メリット | デメリット |
|------|--------|----------|-----------|
| **WSL2 + Docker** | ⭐⭐⭐⭐⭐ | Linuxネイティブ性能、本番環境に近い、ライセンス問題なし | WSL2のセットアップが必要 |
| **Docker Desktop** | ⭐⭐⭐⭐ | セットアップが簡単、GUI操作可能 | 商用利用はライセンス必要 |
| **ローカルRedis** | ⭐⭐⭐ | 軽量、単独で動作 | 本番環境と異なる |

### WSL2 + Docker クイックスタート（推奨）

```bash
# 1. WSL2に入る
wsl

# 2. プロジェクトに移動
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf

# 3. Dockerデーモン確認・起動
sudo service docker start

# 4. Redisコンテナ起動
docker compose up -d redis

# 5. 確認
docker ps | grep redis
docker exec -it mmdpf-redis redis-cli ping
# 期待される出力: PONG
```

**Windows側で:**
```powershell
# 1. backend/.env を設定
# SESSION_STORE_TYPE=redis
# REDIS_URL=redis://localhost:6379

# 2. バックエンドサーバー起動
cd backend
npm run dev
```

### Redisモードの確認チェックリスト

- [ ] Redisが起動している（`docker ps` または `redis-cli ping`）
- [ ] SESSION_STORE_TYPE=redis を設定
- [ ] REDIS_URL=redis://localhost:6379 を設定
- [ ] サーバー起動時に「Redis connection established」と表示
- [ ] ログイン後、`KEYS mmdpf:sess:*` でセッションが確認できる
- [ ] サーバー再起動後もセッションが維持される
- [ ] ログアウト後、セッションが削除される

すべてのチェック項目がOKであれば、Redisセッションストアが正常に動作しています！

### よくある質問（FAQ）

#### Q1: WSL2とDocker Desktopどちらを使うべき？

**A:** WSL2 + Docker を推奨します。理由:
- Linuxネイティブのパフォーマンス
- 本番環境（Linux）に近い環境で開発可能
- Docker Desktopの商用ライセンス問題を回避
- 将来的なKubernetes移行も容易

#### Q2: WSL2のRedisにWindows側から接続できる？

**A:** はい、できます。
- WSL2はデフォルトで`localhost`をフォワード
- Windows側から`redis://localhost:6379`で接続可能
- 特別な設定は不要

#### Q3: セッションデータはどこに保存される？

**A:** Redisコンテナ内のボリューム`mmdpf_redis-data`に永続化されます。
- コンテナを停止してもデータは保持
- `docker compose down redis`で削除される
- バックアップが必要な場合は別途対応

#### Q4: 開発終了時にRedisを停止すべき？

**A:** 任意ですが、リソース節約のため停止推奨:
```bash
# データを保持して停止
docker compose stop redis

# 次回起動時
docker compose start redis
```

#### Q5: 本番環境でも同じ設定で動く？

**A:** はい、環境変数のみの変更で動作します:
```env
# 本番環境
SESSION_STORE_TYPE=redis
REDIS_URL=redis://your-production-redis:6379
REDIS_PASSWORD=your-secure-password
SESSION_COOKIE_SECURE=true
```

---

## 参考コマンド一覧

### Docker操作
```powershell
# Redis起動
docker compose up -d redis

# Redis停止
docker compose stop redis

# Redisコンテナ削除
docker compose down redis

# ログ確認
docker logs mmdpf-redis

# Redisコンテナ内に入る
docker exec -it mmdpf-redis sh
```

### Redisコマンド
```redis
# セッション一覧
KEYS mmdpf:sess:*

# すべてのキー
KEYS *

# セッション数
DBSIZE

# セッション取得
GET mmdpf:sess:XXXXXXXX

# セッション削除（テスト用）
DEL mmdpf:sess:XXXXXXXX

# すべて削除（注意！）
FLUSHDB

# Redis情報
INFO
