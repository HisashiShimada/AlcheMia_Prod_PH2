# Redis環境変数設定ガイド

## 概要

リフレッシュトークン機能（30分アイドルタイムアウト）を使用するために必要な環境変数の設定ガイドです。

## 環境変数

### Redis接続設定

```bash
# Redis接続設定
REDIS_HOST=localhost        # Redisホスト（デフォルト: localhost）
REDIS_PORT=6379            # Redisポート（デフォルト: 6379）

# JWT設定（既存の環境変数）
JWT_SECRET=your-secret-key-here                    # JWTシークレットキー
JWT_ACCESS_TOKEN_EXPIRES_IN=15m                    # アクセストークン有効期限（Redis起動時）
JWT_ACCESS_TOKEN_EXPIRES_IN_NO_REDIS=8h            # アクセストークン有効期限（Redis未起動時・開発環境のみ）
JWT_REFRESH_TOKEN_EXPIRES_IN=30m                   # リフレッシュトークン有効期限（30分アイドルタイムアウト）
```

### 設定例

#### 開発環境（`.env`）

```bash
# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT設定
JWT_SECRET=development-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_ACCESS_TOKEN_EXPIRES_IN_NO_REDIS=8h
JWT_REFRESH_TOKEN_EXPIRES_IN=30m

# その他の設定
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

#### 本番環境

```bash
# Redis設定（本番環境では必須）
REDIS_HOST=your-redis-host.example.com
REDIS_PORT=6379

# JWT設定
JWT_SECRET=your-strong-production-secret-key-here
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=30m

# その他の設定
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-production-domain.com
```

## Redisの起動方法

### Dockerを使用する場合

```bash
# Redisコンテナを起動
docker run -d \
  --name mmdpf-redis \
  -p 6379:6379 \
  redis:7-alpine

# 起動確認
docker ps | grep redis

# 動作確認
docker exec -it mmdpf-redis redis-cli ping
# 出力: PONG
```

### システムサービスとして起動する場合（Ubuntu）

```bash
# Redisインストール
sudo apt update
sudo apt install redis-server

# Redisサービス起動
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 起動確認
sudo systemctl status redis-server

# 動作確認
redis-cli ping
# 出力: PONG
```

### docker-composeを使用する場合

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: mmdpf-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

```bash
# Redis起動
docker-compose up -d redis

# 確認
docker-compose ps
```

## フォールバック動作（開発環境のみ）

### Redis未起動時の動作

開発環境では、Redisが起動していない状態でもバックエンドサーバーを起動できます。

**制限事項:**
- リフレッシュトークンの管理が無効化
- 30分アイドルタイムアウトが機能しない
- トークンの即座の無効化ができない
- JWT検証のみで認証（有効期限: 8時間）

**警告メッセージ:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Redis未起動: フォールバック動作で起動
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下の機能が無効化されています:
  - リフレッシュトークンの管理
  - 30分アイドルタイムアウト
  - トークンの即座の無効化

JWT検証のみで認証されます。
トークン有効期限: 8時間（開発環境用の長い有効期限）

完全な機能をテストするにはRedisを起動してください:
  docker run -d -p 6379:6379 redis:7-alpine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 本番環境の動作

本番環境では、Redis未起動時にサーバー起動が失敗します。

```
❌ Redis接続失敗: 本番環境ではRedis必須
Error: Redis connection required in production environment
```

## トラブルシューティング

### Redis接続エラー

**症状:**
```
⚠️  Redis接続エラー（開発環境）: connect ECONNREFUSED 127.0.0.1:6379
```

**原因:**
- Redisが起動していない
- ポート番号が間違っている
- ホスト名が間違っている

**解決方法:**
1. Redisを起動する
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. 環境変数を確認
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. Redis接続を確認
   ```bash
   redis-cli ping
   # 出力: PONG
   ```

### タイムアウトエラー

**症状:**
```
Error: Connection timeout
```

**原因:**
- Redisサーバーがダウンしている
- ネットワーク問題
- ファイアウォールでブロックされている

**解決方法:**
1. Redisサービスの状態確認
   ```bash
   docker ps | grep redis
   # または
   sudo systemctl status redis-server
   ```

2. ネットワーク接続確認
   ```bash
   telnet localhost 6379
   ```

3. ファイアウォール設定確認
   ```bash
   sudo ufw status
   ```

## Redis動作確認コマンド

### 基本コマンド

```bash
# Redisに接続
redis-cli

# 接続確認
127.0.0.1:6379> PING
PONG

# リフレッシュトークンの確認
127.0.0.1:6379> KEYS mmdpf:refresh_token:*

# 特定のトークンの詳細確認
127.0.0.1:6379> GET mmdpf:refresh_token:{token_id}

# ユーザーのトークン一覧
127.0.0.1:6379> SMEMBERS mmdpf:refresh_token:user:{user_id}

# TTL（残り有効期限）確認
127.0.0.1:6379> TTL mmdpf:refresh_token:{token_id}

# 全キーの確認
127.0.0.1:6379> KEYS *

# 終了
127.0.0.1:6379> EXIT
```

### デバッグ用コマンド

```bash
# すべてのリフレッシュトークンを削除（テスト用）
redis-cli KEYS "mmdpf:refresh_token:*" | xargs redis-cli DEL

# Redisの情報確認
redis-cli INFO

# メモリ使用状況
redis-cli INFO memory

# 接続クライアント数
redis-cli CLIENT LIST
```

## セキュリティ推奨事項

### 本番環境

1. **Redis接続の保護**
   - Redis用のパスワードを設定
   - プライベートネットワーク内でのみアクセス可能にする
   - TLS/SSLを使用した暗号化通信

2. **環境変数の管理**
   - AWS Secrets Managerなどのシークレット管理サービスを使用
   - `.env`ファイルはGitにコミットしない
   - 定期的にJWT_SECRETをローテーション

3. **監視とログ**
   - Redis接続エラーをアラート通知
   - 異常なトークン無効化パターンを検出
   - CloudWatch Logsでログを集約

## 参考資料

- [Redis公式ドキュメント](https://redis.io/documentation)
- [Node Redis クライアント](https://github.com/redis/node-redis)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [docs/Redis動作確認手順.md](./Redis動作確認手順.md)
- [docs/UbuntuでのRedis起動クイックガイド.md](./UbuntuでのRedis起動クイックガイド.md)
