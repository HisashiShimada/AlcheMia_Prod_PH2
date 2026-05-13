# Cyberduck → WSL OpenStack Swift 接続手順書

**作成日時**: 2026-01-26 09:50  
**対象環境**: Windows + WSL2 + Docker  
**ツール**: Cyberduck (Windows)

---

## 📋 目次

1. [前提条件](#前提条件)
2. [Swift接続情報](#swift接続情報)
3. [WSLのIPアドレス取得](#wslのipアドレス取得)
4. [方法A: Windows版Cyberduck接続設定](#方法a-windows版cyberduck接続設定)
5. [方法B: WSL環境でCyberduck CLI使用](#方法b-wsl環境でcyberduck-cli使用)
6. [接続テスト](#接続テスト)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要な環境

- ✅ Windows 10/11
- ✅ WSL2がインストール済み
- ✅ Docker Desktop for Windowsがインストール済み
- ✅ Cyberduckがインストール済み
- ✅ mmdpfプロジェクトのSwiftコンテナが起動済み

### Swiftコンテナの起動確認

WSL環境で以下のコマンドを実行してSwiftが起動していることを確認：

```bash
cd /home/mi_ito/mmdpf
docker-compose ps swift
```

**期待される出力:**
```
NAME                IMAGE                           COMMAND                  SERVICE   CREATED        STATUS                  PORTS
mmdpf-swift         bouncestorage/swift-aio:latest  "/bin/sh -c /usr/loc…"   swift     XX hours ago   Up XX hours (healthy)   0.0.0.0:8080->8080/tcp
```

`STATUS`が`Up`で`(healthy)`となっていればOKです。

---

## Swift接続情報

mmdpfプロジェクトのSwift設定は以下の通りです：

| 項目 | 値 |
|------|-----|
| **認証URL** | `http://<WSL_IP>:8080/auth/v1.0` |
| **ポート** | `8080` |
| **アカウント** | `test` |
| **ユーザー名** | `tester` |
| **パスワード** | `testing` |
| **フルユーザー名** | `test:tester` |
| **コンテナ名** | `mmdpf-files` (デフォルト) |

> **重要**: `<WSL_IP>`は次のセクションで取得します。

---

## WSLのIPアドレス取得

WindowsからWSL上のサービスにアクセスするには、WSLのIPアドレスが必要です。

### 方法1: WSL内から取得（推奨）

WSLターミナルで以下のコマンドを実行：

```bash
ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
```

または

```bash
hostname -I | awk '{print $1}'
```

**出力例:**
```
172.28.176.123
```

このIPアドレスをメモしてください。

### 方法2: Windowsから取得

Windows PowerShellで以下のコマンドを実行：

```powershell
wsl hostname -I
```

または

```powershell
wsl ip addr show eth0
```

### 方法3: localhostを使用（Docker Desktop使用時）

Docker Desktop for Windowsを使用している場合、`localhost`でアクセス可能な場合があります：

- **認証URL**: `http://localhost:8080/auth/v1.0`

まずは`localhost`で試してみて、接続できない場合は上記の方法でWSLのIPアドレスを取得してください。

---

## 方法A: Windows版Cyberduck接続設定

> **注意**: Windowsから接続できない場合は、[方法B: WSL環境でCyberduck CLI使用](#方法b-wsl環境でcyberduck-cli使用)を参照してください。

### Step 1: Cyberduckを起動

Cyberduckを起動し、「新規接続」をクリックします。

### Step 2: プロトコル選択

接続タイプのドロップダウンから以下のいずれかを選択します：

#### オプション1: Swift (v1 Auth) - 推奨

**「Swift (OpenStack Object Storage)」** または **「Swift (v1 Auth)」** を選択してください。

#### オプション2: OpenStack Swift (Keystone 2.0/3.0)

Keystone 2.0または3.0しか選択肢にない場合は、まず **「OpenStack Swift (Keystone 2.0)」** を選択し、後の手順で認証URLを手動で修正します。

> **重要**: bouncestorage/swift-aioコンテナはSwift v1 Auth（tempauth）を使用しているため、Keystone 2.0/3.0を選択した場合でも、認証URLを `/auth/v1.0` に設定する必要があります。

### Step 3: 接続情報を入力

選択したプロトコルに応じて、以下の情報を入力します：

#### パターンA: Swift (v1 Auth) を選択した場合

| フィールド | 入力値 | 備考 |
|-----------|--------|------|
| **サーバー** | `localhost` または `172.x.x.x` | WSLのIPアドレス |
| **ポート** | `8080` | |
| **Username** | `test:tester` | コロン区切り |
| **Password** | `testing` | |
| **Path** | `/auth/v1.0` | 認証パス |

#### パターンB: OpenStack Swift (Keystone 2.0) を選択した場合

| フィールド | 入力値 | 備考 |
|-----------|--------|------|
| **サーバー** | `localhost` または `172.x.x.x` | WSLのIPアドレス |
| **ポート** | `8080` | |
| **Tenant ID:Username** | `test:tester` | コロン区切り |
| **Password** | `testing` | |
| **認証URL** (詳細設定内) | `http://localhost:8080/auth/v1.0` | フルURLで指定 |

**詳細設定:**

#### サーバーとポート
- **localhost使用時**: `localhost:8080`
- **WSL IP使用時**: `172.28.176.123:8080` (例)

#### 認証情報
- **Username/Tenant ID:Username**: `test:tester`
  - 必ずコロン（`:`）で区切る
  - テナントID = `test`
  - ユーザー名 = `tester`

#### 認証URL/Path
- **v1 Authの場合**: `/auth/v1.0` と入力
- **Keystone 2.0の場合**: `http://localhost:8080/auth/v1.0` と入力（フルURL）
- 先頭のスラッシュ（`/`）またはプロトコル（`http://`）を忘れずに

### Step 4: 詳細設定（必須の場合あり）

「詳細設定」「More Options」または歯車アイコンをクリックし、以下を設定：

#### 必須設定
- **HTTPSを使用**: チェックを外す（開発環境のため）

#### Keystone 2.0/3.0を選択した場合（追加設定）
- **認証URL**: `http://localhost:8080/auth/v1.0` と手動で入力
  - デフォルトで別のURLになっている場合は上書き
  - WSL IPアドレスを使用する場合: `http://172.x.x.x:8080/auth/v1.0`

#### Swift (v1 Auth)を選択した場合
- **Path/Context**: `/auth/v1.0` が設定されていることを確認

### Step 5: 接続

「接続」ボタンをクリックします。

---

## 方法B: WSL環境でCyberduck CLI使用

Windowsから接続できない場合は、WSL環境に直接Cyberduck CLIツールをインストールして使用します。

### Step 1: CLIツールのインストール

WSLターミナルで以下のいずれかの方法を試してください。

#### 方法1: Swift公式CLI（最も簡単・推奨）

```bash
# Python pipのインストール
sudo apt update
sudo apt install -y python3-pip

# python-swiftclientのインストール
pip3 install python-swiftclient

# 確認
swift --version
```

**期待される出力:**
```
python-swiftclient 4.x.x
```

#### 方法2: duck CLI（Cyberduck CLI）

```bash
# 依存パッケージのインストール
sudo apt update
sudo apt install -y wget default-jre

# duck CLI ダウンロード（最新版）
cd /tmp
wget https://dist.duck.sh/duck-8.8.0.41372.deb

# インストール
sudo dpkg -i duck-8.8.0.41372.deb

# 依存関係エラーがある場合
sudo apt --fix-broken install

# 確認
duck --version
```

**期待される出力:**
```
duck 8.8.0 (41372)
```

#### 方法3: curl コマンド（最もシンプル）

CLIツールのインストールが難しい場合、curlコマンドでSwift APIを直接操作できます：

```bash
# 認証トークンの取得
curl -i -H "X-Auth-User: test:tester" -H "X-Auth-Key: testing" \
  http://localhost:8080/auth/v1.0

# レスポンスからX-Auth-TokenとX-Storage-Urlを取得して使用
```

### インストールエラーが発生した場合

#### エラー1: dpkg依存関係エラー

```bash
# エラーメッセージ例
dpkg: dependency problems prevent configuration of duck:
 duck depends on libjna-java; however:
  Package libjna-java is not installed.
```

**対策:**
```bash
# 依存パッケージを手動でインストール
sudo apt update
sudo apt install -y libjna-java default-jre

# 再度duck CLIをインストール
cd /tmp
wget https://dist.duck.sh/duck-8.8.0.41372.deb
sudo dpkg -i duck-8.8.0.41372.deb

# それでも失敗する場合
sudo apt --fix-broken install
```

#### エラー2: wgetダウンロード失敗

```bash
# エラーメッセージ例
ERROR 404: Not Found
```

**対策（代替ダウンロードURL）:**
```bash
# GitHub Releasesから直接ダウンロード
wget https://github.com/iterate-ch/cyberduck/releases/download/8.8.0/duck-8.8.0.41372.deb

# またはバージョンを変えて試す
wget https://dist.duck.sh/duck-latest.deb
```

#### エラー3: Java実行環境が見つからない

```bash
# エラーメッセージ例
Error: JAVA_HOME is not defined correctly.
```

**対策:**
```bash
# Java実行環境を確認
java -version

# インストールされていない場合
sudo apt install -y default-jre default-jdk

# JAVA_HOMEを設定
echo 'export JAVA_HOME=/usr/lib/jvm/default-java' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: 接続プロファイルの作成

接続情報をファイルに保存します。

```bash
cd /home/mi_ito/mmdpf

# 接続プロファイルディレクトリを作成
mkdir -p .cyberduck

# プロファイルファイルを作成
cat > .cyberduck/swift-profile.txt << 'EOF'
swift://test:tester@localhost:8080/auth/v1.0
EOF
```

### Step 3: 環境変数の設定

パスワードを環境変数に設定します：

```bash
# .bashrcまたは.zshrcに追加
echo 'export SWIFT_PASSWORD=testing' >> ~/.bashrc
source ~/.bashrc

# または現在のセッションのみ
export SWIFT_PASSWORD=testing
```

### Step 4: 接続テスト

使用するツールに応じて、以下のいずれかの方法でテストします。

#### 方法A: Swift公式CLI使用（推奨）

##### 環境変数の設定

```bash
# 認証情報を環境変数に設定
export ST_AUTH=http://localhost:8080/auth/v1.0
export ST_USER=test:tester
export ST_KEY=testing

# .bashrcに追加して永続化（オプション）
cat >> ~/.bashrc << 'EOF'
export ST_AUTH=http://localhost:8080/auth/v1.0
export ST_USER=test:tester
export ST_KEY=testing
EOF
source ~/.bashrc
```

##### コンテナ一覧を表示

```bash
swift list
```

**期待される出力:**
```
mmdpf-files
```

##### 特定のコンテナ内を表示

```bash
swift list mmdpf-files
```

##### ファイルのアップロード

```bash
# テストファイルを作成
echo "Hello from Swift CLI!" > /tmp/test-upload.txt

# アップロード
swift upload mmdpf-files /tmp/test-upload.txt --object-name test/test-upload.txt
```

##### ファイルのダウンロード

```bash
# ダウンロード
swift download mmdpf-files test/test-upload.txt -o /tmp/test-download.txt

# 内容確認
cat /tmp/test-download.txt
```

##### ファイルの削除

```bash
swift delete mmdpf-files test/test-upload.txt
```

##### ファイル情報の確認

```bash
# コンテナの統計情報
swift stat mmdpf-files

# ファイルの詳細情報
swift stat mmdpf-files test/test-upload.txt
```

#### 方法B: duck CLI使用

```bash
# コンテナ一覧を表示
duck --username test:tester --password testing \
  --list swift://localhost:8080/auth/v1.0/

# 特定のコンテナ内を表示
duck --username test:tester --password testing \
  --list swift://localhost:8080/auth/v1.0/mmdpf-files/

# ファイルのアップロード
echo "Hello from duck CLI!" > /tmp/test-upload.txt
duck --username test:tester --password testing \
  --upload swift://localhost:8080/auth/v1.0/mmdpf-files/test/ \
  /tmp/test-upload.txt

# ファイルのダウンロード
duck --username test:tester --password testing \
  --download swift://localhost:8080/auth/v1.0/mmdpf-files/test/test-upload.txt \
  /tmp/test-download.txt

# ファイルの削除
duck --username test:tester --password testing \
  --delete swift://localhost:8080/auth/v1.0/mmdpf-files/test/test-upload.txt
```

#### 方法C: curl コマンド使用（最もシンプル）

```bash
# Step 1: 認証トークンを取得
AUTH_RESPONSE=$(curl -i -s -H "X-Auth-User: test:tester" -H "X-Auth-Key: testing" \
  http://localhost:8080/auth/v1.0)

# トークンとストレージURLを抽出
AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -i "X-Auth-Token:" | awk '{print $2}' | tr -d '\r')
STORAGE_URL=$(echo "$AUTH_RESPONSE" | grep -i "X-Storage-Url:" | awk '{print $2}' | tr -d '\r')

echo "Auth Token: $AUTH_TOKEN"
echo "Storage URL: $STORAGE_URL"

# Step 2: コンテナ一覧を取得
curl -H "X-Auth-Token: $AUTH_TOKEN" $STORAGE_URL

# Step 3: ファイルをアップロード
echo "Hello from curl!" > /tmp/test-upload.txt
curl -X PUT -H "X-Auth-Token: $AUTH_TOKEN" \
  -T /tmp/test-upload.txt \
  $STORAGE_URL/mmdpf-files/test/test-upload.txt

# Step 4: ファイルをダウンロード
curl -H "X-Auth-Token: $AUTH_TOKEN" \
  $STORAGE_URL/mmdpf-files/test/test-upload.txt \
  -o /tmp/test-download.txt

# Step 5: ファイル一覧を取得
curl -H "X-Auth-Token: $AUTH_TOKEN" $STORAGE_URL/mmdpf-files

# Step 6: ファイルを削除
curl -X DELETE -H "X-Auth-Token: $AUTH_TOKEN" \
  $STORAGE_URL/mmdpf-files/test/test-upload.txt
```

### Step 5: スクリプト化（便利な使い方）

頻繁に使用する操作はスクリプト化しておくと便利です。

#### Swift CLI用スクリプト（推奨）

```bash
# スクリプトファイルを作成
cat > ~/swift-helper.sh << 'EOF'
#!/bin/bash

# 環境変数が設定されていない場合は設定
if [ -z "$ST_AUTH" ]; then
    export ST_AUTH=http://localhost:8080/auth/v1.0
    export ST_USER=test:tester
    export ST_KEY=testing
fi

CONTAINER="mmdpf-files"

# 引数チェック
if [ $# -lt 1 ]; then
    echo "使用方法:"
    echo "  $0 list [path]              # ファイル一覧"
    echo "  $0 upload <local> <remote>  # アップロード"
    echo "  $0 download <remote> <local> # ダウンロード"
    echo "  $0 delete <remote>          # 削除"
    echo "  $0 stat [object]            # 統計情報"
    exit 1
fi

COMMAND=$1

case $COMMAND in
    list)
        if [ -z "$2" ]; then
            swift list $CONTAINER
        else
            swift list $CONTAINER --prefix "$2"
        fi
        ;;
    upload)
        LOCAL_FILE=$2
        REMOTE_PATH=$3
        if [ -z "$LOCAL_FILE" ] || [ -z "$REMOTE_PATH" ]; then
            echo "エラー: ローカルファイルとリモートパスを指定してください"
            exit 1
        fi
        swift upload $CONTAINER "$LOCAL_FILE" --object-name "$REMOTE_PATH"
        ;;
    download)
        REMOTE_PATH=$2
        LOCAL_FILE=$3
        if [ -z "$REMOTE_PATH" ] || [ -z "$LOCAL_FILE" ]; then
            echo "エラー: リモートパスとローカルファイルを指定してください"
            exit 1
        fi
        swift download $CONTAINER "$REMOTE_PATH" -o "$LOCAL_FILE"
        ;;
    delete)
        REMOTE_PATH=$2
        if [ -z "$REMOTE_PATH" ]; then
            echo "エラー: 削除するファイルのパスを指定してください"
            exit 1
        fi
        swift delete $CONTAINER "$REMOTE_PATH"
        ;;
    stat)
        if [ -z "$2" ]; then
            swift stat $CONTAINER
        else
            swift stat $CONTAINER "$2"
        fi
        ;;
    *)
        echo "エラー: 不明なコマンド '$COMMAND'"
        exit 1
        ;;
esac
EOF

# 実行権限を付与
chmod +x ~/swift-helper.sh

# エイリアスを設定
echo "alias sft='~/swift-helper.sh'" >> ~/.bashrc
source ~/.bashrc
```

**使用例:**

```bash
# ファイル一覧を表示
sft list
sft list org_maiml_lab_001/projects/

# ファイルをアップロード
sft upload /path/to/local/file.txt org_maiml_lab_001/projects/file.txt

# ファイルをダウンロード
sft download org_maiml_lab_001/projects/file.txt /path/to/local/file.txt

# ファイルを削除
sft delete org_maiml_lab_001/projects/file.txt

# 統計情報を表示
sft stat
sft stat org_maiml_lab_001/projects/file.txt
```

#### curl用スクリプト（CLIツールが使えない場合）

```bash
# curlベースのスクリプトを作成
cat > ~/swift-curl.sh << 'EOF'
#!/bin/bash

# 認証情報
AUTH_URL="http://localhost:8080/auth/v1.0"
AUTH_USER="test:tester"
AUTH_KEY="testing"
CONTAINER="mmdpf-files"

# 認証トークンを取得
get_auth_token() {
    AUTH_RESPONSE=$(curl -i -s -H "X-Auth-User: $AUTH_USER" -H "X-Auth-Key: $AUTH_KEY" $AUTH_URL)
    AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -i "X-Auth-Token:" | awk '{print $2}' | tr -d '\r')
    STORAGE_URL=$(echo "$AUTH_RESPONSE" | grep -i "X-Storage-Url:" | awk '{print $2}' | tr -d '\r')
}

# 引数チェック
if [ $# -lt 1 ]; then
    echo "使用方法:"
    echo "  $0 list [prefix]            # ファイル一覧"
    echo "  $0 upload <local> <remote>  # アップロード"
    echo "  $0 download <remote> <local> # ダウンロード"
    echo "  $0 delete <remote>          # 削除"
    exit 1
fi

COMMAND=$1
get_auth_token

case $COMMAND in
    list)
        PREFIX=${2:-""}
        if [ -z "$PREFIX" ]; then
            curl -s -H "X-Auth-Token: $AUTH_TOKEN" $STORAGE_URL/$CONTAINER
        else
            curl -s -H "X-Auth-Token: $AUTH_TOKEN" "$STORAGE_URL/$CONTAINER?prefix=$PREFIX"
        fi
        ;;
    upload)
        LOCAL_FILE=$2
        REMOTE_PATH=$3
        curl -X PUT -H "X-Auth-Token: $AUTH_TOKEN" -T "$LOCAL_FILE" \
            $STORAGE_URL/$CONTAINER/$REMOTE_PATH
        echo "アップロード完了: $REMOTE_PATH"
        ;;
    download)
        REMOTE_PATH=$2
        LOCAL_FILE=$3
        curl -H "X-Auth-Token: $AUTH_TOKEN" \
            $STORAGE_URL/$CONTAINER/$REMOTE_PATH -o "$LOCAL_FILE"
        echo "ダウンロード完了: $LOCAL_FILE"
        ;;
    delete)
        REMOTE_PATH=$2
        curl -X DELETE -H "X-Auth-Token: $AUTH_TOKEN" \
            $STORAGE_URL/$CONTAINER/$REMOTE_PATH
        echo "削除完了: $REMOTE_PATH"
        ;;
    *)
        echo "エラー: 不明なコマンド '$COMMAND'"
        exit 1
        ;;
esac
EOF

# 実行権限を付与
chmod +x ~/swift-curl.sh

# エイリアスを設定
echo "alias sftc='~/swift-curl.sh'" >> ~/.bashrc
source ~/.bashrc
```

**使用例:**

```bash
# ファイル一覧を表示
sftc list
sftc list org_maiml_lab_001/projects/

# ファイルをアップロード
sftc upload /path/to/local/file.txt org_maiml_lab_001/projects/file.txt

# ファイルをダウンロード
sftc download org_maiml_lab_001/projects/file.txt /path/to/local/file.txt

# ファイルを削除
sftc delete org_maiml_lab_001/projects/file.txt
```

### Step 6: インタラクティブモード（Cyberduck CLI）

Cyberduck CLI（duck ではなく cyberduck コマンド）を使用する場合：

```bash
# インタラクティブシェルを起動
cyberduck --username test:tester --password testing \
  swift://localhost:8080/auth/v1.0/

# シェル内でコマンド実行
> ls mmdpf-files/
> cd mmdpf-files/org_maiml_lab_001/
> ls
> put /path/to/local/file.txt
> get remote-file.txt
> exit
```

### WSL環境使用時の注意事項

#### 1. localhostを使用

WSL内からSwiftコンテナにアクセスする場合、`localhost` または `127.0.0.1` を使用します。

```bash
# ✅ 正しい
swift://localhost:8080/auth/v1.0/

# ❌ 間違い（WSL外部のIPアドレス）
swift://172.28.176.123:8080/auth/v1.0/
```

#### 2. Dockerネットワーク経由のアクセス

より確実な接続方法として、Dockerネットワーク経由でアクセスすることもできます：

```bash
# Swiftコンテナのネットワーク内IPアドレスを取得
docker inspect mmdpf-swift | grep IPAddress

# 取得したIPアドレスを使用（例: 172.18.0.3）
duck --username test:tester --password testing \
  --list swift://172.18.0.3:8080/auth/v1.0/
```

#### 3. パフォーマンスの確認

WSL環境からの接続は通常、Windows経由よりも高速です：

```bash
# 接続テストスクリプトを実行
cd /home/mi_ito/mmdpf
npm run test:swift
```

---

## 接続テスト

### 接続成功時の表示

接続に成功すると、以下のようなコンテナ（バケット）が表示されます：

- `mmdpf-files` (デフォルトコンテナ)
- その他、作成済みのコンテナ

### テストファイルのアップロード

1. `mmdpf-files`コンテナをダブルクリックして開く
2. 適当なテキストファイルをドラッグ&ドロップ
3. アップロードが成功すればOK

### フォルダ構造の確認

mmdpfプロジェクトでは、以下のようなフォルダ構造でファイルが管理されています：

```
mmdpf-files/
├── org_maiml_lab_001/         # 組織1のデータ
│   ├── projects/              # プロジェクトファイル
│   ├── formats/               # フォーマット定義
│   └── temp/                  # 一時ファイル
│
└── org_maiml_lab_002/         # 組織2のデータ
    ├── projects/
    └── formats/
```

---

## トラブルシューティング

### WSL環境でのトラブルシューティング

#### 問題W-1: duck コマンドが見つからない

**症状**:
```
bash: duck: command not found
```

**対策**:

```bash
# インストール状態を確認
dpkg -l | grep -i cyberduck

# 再インストール
cd /tmp
wget https://dist.duck.sh/duck-8.8.0.41372.deb
sudo dpkg -i duck-8.8.0.41372.deb

# PATHを確認
which duck
```

#### 問題W-2: Java実行環境エラー

**症状**:
```
Error: Java Runtime Environment not found
```

**対策**:

```bash
# JREをインストール
sudo apt update
sudo apt install -y default-jre

# バージョン確認
java -version
```

#### 問題W-3: 接続タイムアウト

**症状**:
```
Connection timeout
```

**対策**:

```bash
# Swiftコンテナが起動しているか確認
docker-compose ps swift

# localhostで接続できるか確認
curl http://localhost:8080/info

# Dockerネットワーク経由で接続してみる
SWIFT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mmdpf-swift)
curl http://$SWIFT_IP:8080/info
```

#### 問題W-4: 認証エラー（WSL）

**症状**:
```
401 Unauthorized
```

**対策**:

認証情報を再確認：

```bash
# 正しいコマンド
duck --username test:tester --password testing \
  --list swift://localhost:8080/auth/v1.0/

# ユーザー名にコロンが含まれることに注意
# - テナント: test
# - ユーザー: tester
# - 結合: test:tester
```

### Windows環境でのトラブルシューティング

#### 問題1: 「接続できません」エラー

**症状**: 
```
Failed to connect to server
Connection refused
```

**原因と対策:**

#### 1-1. Swiftコンテナが起動していない

WSLで確認：
```bash
cd /home/mi_ito/mmdpf
docker-compose ps swift
```

起動していない場合：
```bash
docker-compose up -d swift
```

#### 1-2. IPアドレスが間違っている

WSLのIPアドレスを再取得：
```bash
hostname -I | awk '{print $1}'
```

#### 1-3. ポートが開いていない

WSLでポート確認：
```bash
docker-compose ps | grep 8080
```

`0.0.0.0:8080->8080/tcp` と表示されていればOK。

#### 1-4. Windowsファイアウォールがブロック

Windows Defenderファイアウォールで、ポート8080の受信を許可する必要がある場合があります。

---

### 問題2: 「認証エラー」

**症状**:
```
Authentication failed
Invalid credentials
401 Unauthorized
```

**原因と対策:**

#### 2-1. ユーザー名の形式が間違っている

- 正しい形式: `test:tester` (コロン区切り)
- 間違った例:
  - `test tester` (スペース区切り)
  - `test/tester` (スラッシュ区切り)
  - `tester` (テナントIDなし)

#### 2-2. パスワードが間違っている

正しいパスワード: `testing`

#### 2-3. 認証URL/Pathが間違っている

- **Swift (v1 Auth)の場合**: `/auth/v1.0`
- **Keystone 2.0の場合**: `http://localhost:8080/auth/v1.0` (フルURL)

先頭のスラッシュ（`/`）またはプロトコル（`http://`）を忘れずに。

#### 2-4. プロトコル選択が間違っている

Keystone 2.0/3.0を選択している場合、詳細設定で認証URLを **必ず** `/auth/v1.0` に変更してください。

---

### 問題3: 「コンテナが表示されない」

**症状**: 接続はできるが、コンテナ（バケット）が表示されない

**対策:**

#### 3-1. コンテナを手動で作成

WSLで以下のコマンドを実行：

```bash
docker exec -it mmdpf-swift swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing post mmdpf-files
```

#### 3-2. 既存コンテナを確認

```bash
docker exec -it mmdpf-swift swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing list
```

出力例:
```
mmdpf-files
```

---

### 問題4: localhostで接続できない

**症状**: `localhost:8080`で接続できない

**対策**: WSLの実IPアドレスを使用

1. WSLのIPアドレスを取得：
   ```bash
   hostname -I | awk '{print $1}'
   ```

2. Cyberduckの接続設定で、サーバーを `localhost` から取得したIPアドレス（例: `172.28.176.123`）に変更

3. 再接続

---

### 問題5: 「SSL証明書エラー」

**症状**:
```
SSL certificate problem
```

**対策**:

Cyberduckの詳細設定で「HTTPSを使用」のチェックを外してください。開発環境ではHTTP接続を使用します。

---

## 接続情報サマリー

接続がうまくいかない場合、以下の情報を再確認してください：

### WSL環境（Swift CLI） - 推奨

```bash
# 環境変数
export ST_AUTH=http://localhost:8080/auth/v1.0
export ST_USER=test:tester
export ST_KEY=testing

# 接続情報チェックリスト
☐ ST_AUTH: http://localhost:8080/auth/v1.0
☐ ST_USER: test:tester (コロン区切り)
☐ ST_KEY: testing
☐ Container: mmdpf-files
```

### WSL環境（duck CLI）

```bash
# コマンド形式
duck --username test:tester --password testing \
  --list swift://localhost:8080/auth/v1.0/mmdpf-files/

# 接続情報チェックリスト
☐ Username: test:tester (コロン区切り)
☐ Password: testing
☐ サーバー: localhost:8080
☐ Auth Path: /auth/v1.0
☐ Container: mmdpf-files
```

### WSL環境（curl）

```bash
# 認証情報
☐ Auth URL: http://localhost:8080/auth/v1.0
☐ X-Auth-User: test:tester
☐ X-Auth-Key: testing
☐ Container: mmdpf-files
```

### Windows環境 - パターンA: Swift (v1 Auth)

```
【接続情報チェックリスト】
☐ プロトコル: Swift (OpenStack Object Storage) / Swift (v1 Auth)
☐ サーバー: localhost または WSLのIPアドレス
☐ ポート: 8080
☐ Username: test:tester (コロン区切り)
☐ Password: testing
☐ Path: /auth/v1.0
☐ HTTPS: 無効
```

### Windows環境 - パターンB: OpenStack Swift (Keystone 2.0)

```
【接続情報チェックリスト】
☐ プロトコル: OpenStack Swift (Keystone 2.0)
☐ サーバー: localhost または WSLのIPアドレス
☐ ポート: 8080
☐ Tenant ID:Username: test:tester (コロン区切り)
☐ Password: testing
☐ 認証URL (詳細設定): http://localhost:8080/auth/v1.0
☐ HTTPS: 無効
```

---

## 推奨環境

### どのツールを使用すべきか？

| ツール | 推奨度 | インストール難易度 | 使いやすさ | 備考 |
|--------|--------|------------------|-----------|------|
| **Swift CLI (python-swiftclient)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ 簡単 | ⭐⭐⭐⭐⭐ | 最も安定・公式ツール |
| **curl コマンド** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ 不要 | ⭐⭐⭐ | インストール不要・万能 |
| **duck CLI** | ⭐⭐⭐ | ⭐⭐ 難しい | ⭐⭐⭐⭐ | インストールが複雑 |
| Windows版Cyberduck | ⭐⭐ | ⭐⭐⭐⭐ 簡単 | ⭐⭐⭐⭐⭐ | 接続が不安定 |

### 使い分けの目安

- **最初に試すべき**: Swift CLI（python-swiftclient）← **最も推奨**
- **インストールが難しい場合**: curl コマンド
- **自動化・バッチ処理**: Swift CLI または curl スクリプト
- **手動ファイル管理**: Windows版Cyberduck（接続できる場合のみ）
- **開発・デバッグ**: Swift CLI
- **一般ユーザー向け**: Swift CLI（スクリプト化して使いやすく）

---

## 補足情報

### WSL環境でのSwift接続テスト

WSL内で接続テストを実行する場合：

```bash
cd /home/mi_ito/mmdpf
npm run test:swift
```

このスクリプトは以下をテストします：
- Swift環境への接続
- コンテナの作成
- ファイルのアップロード/ダウンロード
- ファイル一覧の取得
- マルチテナント分離の確認

### コマンドラインでの操作

Swift CLIツールを使用する場合：

```bash
# Swiftコンテナに入る
docker exec -it mmdpf-swift bash

# コンテナ内で操作
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing stat
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing list
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing list mmdpf-files
```

---

## 関連ドキュメント

- [OpenStack Swift公式ドキュメント](https://docs.openstack.org/swift/latest/)
- [Cyberduck公式ドキュメント](https://docs.cyberduck.io/)
- mmdpfプロジェクト: `docker-compose.yml`
- mmdpfプロジェクト: `backend/scripts/test-swift-connection.ts`

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-26 09:50 | 初版作成 | Cline |
| 2026-01-26 10:05 | WSL環境でのCyberduck CLI使用手順を追加 | Cline |
| 2026-01-26 10:15 | Swift CLI（python-swiftclient）を推奨ツールとして追加、インストールエラー対策を詳細化、curl コマンド使用方法を追加 | Cline |

---

## 問い合わせ

接続に関する問題が解決しない場合は、以下の情報を添えてお問い合わせください：

1. エラーメッセージの全文
2. WSLのIPアドレス（`hostname -I`の出力）
3. Swiftコンテナのステータス（`docker-compose ps swift`の出力）
4. Swiftのログ（`docker-compose logs swift --tail 50`の出力）