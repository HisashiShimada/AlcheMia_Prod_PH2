# WSL2 Ubuntu - Docker 直接インストールガイド

## 概要

Docker Desktop for Windows を使わず、WSL2のUbuntu内に直接DockerをインストールしてMMDPFプロジェクトを起動する手順です。

## 前提条件

- ✅ WSL2がインストール済み
- ✅ Ubuntu（WSL2）がインストール済み

## 手順

### 1. WSL2 Ubuntu を起動

**Windows PowerShell または コマンドプロンプトで実行:**
```powershell
wsl -d Ubuntu
```

または、Windows Terminalから「Ubuntu」タブを開きます。

---

### 2. 古いDockerパッケージを削除（念のため）

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

---

### 3. 必要なパッケージをインストール

```bash
sudo apt-get update

sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

---

### 4. Docker公式GPGキーを追加

```bash
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

---

### 5. Dockerリポジトリを追加

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

---

### 6. Dockerをインストール

```bash
sudo apt-get update

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

### 7. Dockerサービスを起動

```bash
# Dockerサービスを起動
sudo service docker start

# Dockerサービスの状態確認
sudo service docker status
```

**期待される出力:**
```
Docker is running
```

---

### 8. sudoなしでDockerを実行できるようにする（推奨）

```bash
# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# グループ変更を反映（WSL2を再起動）
exit
```

**Windows PowerShellで実行:**
```powershell
wsl --shutdown
wsl -d Ubuntu
```

**WSL2再起動後、確認:**
```bash
# sudoなしでDockerコマンドを実行
docker --version
docker compose version
```

**期待される出力:**
```
Docker version 24.x.x, build xxxxxx
Docker Compose version v2.x.x
```

---

### 9. プロジェクトディレクトリに移動

**オプション1: Windowsのファイルシステムを使う（簡単だが遅い）**
```bash
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf
```

**オプション2: WSL2のホームディレクトリを使う（推奨・高速）**
```bash
# プロジェクトをWSL2内にコピー
cp -r /mnt/c/Users/shuto.shimogama/Documents/mmdpf ~/mmdpf
cd ~/mmdpf
```

**推奨:** WSL2のホームディレクトリ（`~/`）を使うと、ディスクI/Oが大幅に高速化されます。

---

### 10. Dockerコンテナを起動

```bash
# 既存のコンテナを停止（必要な場合）
docker compose down

# PostgreSQL, Swift, Backend, Frontend を起動
docker compose up -d postgres swift backend frontend

# 起動状態確認
docker compose ps

# ログ確認（エラーがないか確認）
docker compose logs -f backend
```

**期待される出力（docker compose ps）:**
```
NAME                IMAGE                          STATUS
mmdpf-backend       mmdpf-backend                  Up
mmdpf-frontend      mmdpf-frontend                 Up
mmdpf-postgres      postgres:16-alpine             Up (healthy)
mmdpf-swift         bouncestorage/swift-aio:latest Up
```

---

### 11. アクセス確認

**Windowsのブラウザでアクセス:**
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001/api/health

**期待される動作:**
- ✅ http://localhost:3000 でログイン画面が表示される
- ✅ ユーザー名/パスワードでログイン可能
- ✅ PINコードが自動入力される（開発環境モード）

---

## Docker自動起動の設定（オプション）

WSL2起動時に自動的にDockerサービスを起動する設定です。

```bash
# .bashrc または .zshrc に追加
echo '# Docker自動起動' >> ~/.bashrc
echo 'if service docker status 2>&1 | grep -q "is not running"; then' >> ~/.bashrc
echo '    sudo service docker start' >> ~/.bashrc
echo 'fi' >> ~/.bashrc

# 設定を反映
source ~/.bashrc
```

**注意:** sudoパスワードを求められないようにするには、以下を実行：

```bash
# sudoersファイルを編集
sudo visudo

# 以下の行を最後に追加（YOUR_USERNAMEを実際のユーザー名に置き換え）
YOUR_USERNAME ALL=(ALL) NOPASSWD: /usr/sbin/service docker start

# 保存して終了（Ctrl+X → Y → Enter）
```

---

## トラブルシューティング

### エラー: `Cannot connect to the Docker daemon`

**原因:** Dockerサービスが起動していない

**解決策:**
```bash
# Dockerサービスを起動
sudo service docker start

# 状態確認
sudo service docker status
```

### エラー: `permission denied while trying to connect to the Docker daemon socket`

**原因:** dockerグループに追加されていない、またはWSL2を再起動していない

**解決策:**
```bash
# dockerグループに追加
sudo usermod -aG docker $USER

# WSL2を再起動
exit
```

**Windows PowerShellで:**
```powershell
wsl --shutdown
wsl -d Ubuntu
```

### エラー: `port is already allocated`

**原因:** ポート3000, 3001, 5432などが既に使用されている

**解決策:**
```bash
# ポート使用状況確認
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432

# または、既存のコンテナを停止
docker compose down

# Windowsでポート使用状況確認
netstat -ano | findstr :3000
```

### ビルドが遅い

**原因:** `/mnt/c/`（Windowsファイルシステム）を使っている

**解決策:**
```bash
# プロジェクトをWSL2内にコピー（推奨）
cp -r /mnt/c/Users/shuto.shimogama/Documents/mmdpf ~/mmdpf
cd ~/mmdpf

# コンテナをビルド・起動
docker compose up -d --build
```

**パフォーマンス比較:**
- `/mnt/c/`（Windowsファイルシステム）: 遅い（数分〜数十分）
- `~/`（WSL2ファイルシステム）: 速い（数十秒）

### コンテナが起動しない

**原因:** メモリ不足、ディスク容量不足

**解決策:**
```bash
# ディスク使用状況確認
df -h

# メモリ使用状況確認
free -h

# Dockerのディスク使用状況確認
docker system df

# 不要なイメージ・コンテナを削除
docker system prune -a
```

---

## コンテナの操作コマンド

### 起動・停止
```bash
# すべてのサービスを起動
docker compose up -d

# 特定のサービスのみ起動
docker compose up -d backend frontend

# すべてのサービスを停止
docker compose stop

# すべてのサービスを停止・削除
docker compose down
```

### ログ確認
```bash
# すべてのログを表示（リアルタイム）
docker compose logs -f

# 特定のサービスのログを表示
docker compose logs -f backend
docker compose logs -f frontend

# 過去100行のログを表示
docker compose logs --tail=100 backend
```

### コンテナ内に入る
```bash
# バックエンドコンテナ内に入る
docker compose exec backend sh

# PostgreSQLコンテナ内に入る
docker compose exec postgres psql -U mmdpf_user -d mmdpf_db
```

### 再ビルド
```bash
# キャッシュを使わずに再ビルド
docker compose build --no-cache backend frontend

# 再ビルド後に起動
docker compose up -d --build
```

---

## 開発環境モードの確認

現在の設定は**開発環境モード**になっています：

**docker-compose.yml:**
```yaml
backend:
  environment:
    - NODE_ENV=development  # ← 開発環境モード
    
frontend:
  environment:
    - NODE_ENV=development
    - NEXT_PUBLIC_API_URL=http://localhost:3001/api  # ← HTTPで直接アクセス
    
# Nginx は無効化されている（証明書不要）
```

**開発環境モードの利点:**
- ✅ クライアント証明書不要
- ✅ PINコード自動入力機能
- ✅ HTTPで直接アクセス（シンプル）
- ✅ 詳細なログ出力

---

## まとめ

WSL2 Ubuntu内に直接Dockerをインストールする手順：

1. ✅ WSL2 Ubuntu を起動
2. ✅ Dockerをインストール
3. ✅ Dockerサービスを起動
4. ✅ dockerグループに追加してWSL2再起動
5. ✅ プロジェクトディレクトリに移動
6. ✅ `docker compose up -d postgres swift backend frontend`
7. ✅ http://localhost:3000 でアクセス

**推奨:** プロジェクトをWSL2のホームディレクトリ（`~/mmdpf`）にコピーすると、ビルド・起動が高速化されます。

これで開発を開始できます！
