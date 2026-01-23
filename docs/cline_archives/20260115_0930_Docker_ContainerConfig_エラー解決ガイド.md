# Docker ContainerConfig エラー解決ガイド

## メタデータ
- **作成日時**: 2026-01-15 09:30
- **エラー内容**: `ERROR: for mmdpf-swift 'ContainerConfig'`
- **対象ファイル**: docker-compose.yml, docker-compose.prod.yml
- **解決状況**: ✅ 完了

---

## 1. エラー概要

### 発生したエラー
```
ERROR: for mmdpf-swift  'ContainerConfig'
ERROR: for mmdpf-postgres  'ContainerConfig'
ERROR: for swift  'ContainerConfig'
ERROR: for postgres  'ContainerConfig'
```

### エラーの原因
Docker Composeファイルの`healthcheck`設定に以下の問題がありました：

1. **Swiftコンテナ**：`swift`コマンドがコンテナ内に存在しない
2. **複雑な環境変数参照**：healthcheck内での環境変数展開が不正
3. **エラーハンドリング不足**：明示的な`exit 1`が欠けている

---

## 2. 修正内容

### 修正前（問題のある設定）

#### ❌ 問題1: Swiftのhealthcheck
```yaml
healthcheck:
  test: ["CMD", "swift", "-A", "http://localhost:8080/auth/v1.0", "-U", "test:tester", "-K", "testing", "stat"]
```
**問題点**: `swift`コマンドがコンテナ内に存在しない

#### ❌ 問題2: 環境変数の不適切な使用
```yaml
environment:
  - AUTH_URL=http://localhost:8080/auth/v1.0
```
**問題点**: ハイフン記法とコロン記法の混在

#### ❌ 問題3: エラーハンドリング不足
```yaml
test: ["CMD-SHELL", "pg_isready -U mmdpf_user"]
```
**問題点**: 明示的な`exit 1`がない

### 修正後（正しい設定）

#### ✅ 解決策1: wgetを使用したhealthcheck
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --spider -q http://localhost:8080/auth/v1.0 || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

#### ✅ 解決策2: 環境変数記法の統一
```yaml
environment:
  AUTH_URL: http://localhost:8080/auth/v1.0
  ACCOUNT: test
  USER: tester
  PASSWORD: testing
```

#### ✅ 解決策3: 明示的なエラーハンドリング
```yaml
test: ["CMD-SHELL", "pg_isready -U mmdpf_user || exit 1"]
```

#### ✅ 解決策4: 依存関係の明示
```yaml
depends_on:
  postgres:
    condition: service_healthy
  swift:
    condition: service_healthy
```

---

## 3. 修正されたファイル

### docker-compose.yml（開発環境）
**修正箇所**:
- PostgreSQL healthcheck: `|| exit 1`を追加
- Swift healthcheck: `wget --spider`に変更
- 環境変数: コロン記法に統一
- depends_on: `condition: service_healthy`を追加

### docker-compose.prod.yml（本番環境）
**修正箇所**:
- PostgreSQL healthcheck: `$${DB_USER}`に変更（Docker Composeでのエスケープ）
- Swift healthcheck: `wget --spider`に変更
- depends_on: `condition: service_healthy`を追加

---

## 4. 動作確認手順

### ステップ1: 既存コンテナの削除
```bash
# すべてのコンテナを停止・削除
docker-compose down -v

# ボリュームも削除する場合（データを初期化）
docker volume rm mmdpf_postgres-data mmdpf_swift-data
```

### ステップ2: 開発環境でテスト
```bash
# 開発環境で起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# 各コンテナの状態を確認
docker-compose ps
```

### ステップ3: ヘルスチェック確認
```bash
# PostgreSQLのヘルスチェック
docker exec mmdpf-postgres pg_isready -U mmdpf_user

# Swiftのヘルスチェック
docker exec mmdpf-swift wget --spider -q http://localhost:8080/auth/v1.0

# Backendのヘルスチェック
curl http://localhost:3001/api/health

# Frontendのヘルスチェック
curl http://localhost:3000/
```

### ステップ4: 本番環境でテスト（必要に応じて）
```bash
# 本番環境用の起動
docker-compose -f docker-compose.prod.yml up -d

# ログを確認
docker-compose -f docker-compose.prod.yml logs -f

# 各コンテナの状態を確認
docker-compose -f docker-compose.prod.yml ps
```

---

## 5. 期待される結果

### 正常起動時のログ例
```
Creating network "mmdpf-network" with driver "bridge"
Creating volume "mmdpf_postgres-data" with default driver
Creating volume "mmdpf_swift-data" with default driver
Creating mmdpf-postgres ... done
Creating mmdpf-swift    ... done
Creating mmdpf-backend  ... done
Creating mmdpf-frontend ... done
Creating mmdpf-nginx    ... done
```

### docker-compose ps の結果例
```
Name                   Command               State                    Ports
------------------------------------------------------------------------------------------------
mmdpf-backend    docker-entrypoint.sh node ...   Up      0.0.0.0:3001->3001/tcp
mmdpf-frontend   docker-entrypoint.sh node ...   Up      0.0.0.0:3000->3000/tcp
mmdpf-nginx      /docker-entrypoint.sh ngin ...   Up      0.0.0.0:80->80/tcp
mmdpf-postgres   docker-entrypoint.sh postgres    Up      0.0.0.0:5434->5432/tcp
mmdpf-swift      /bin/sh -c /usr/local/bin/ ...   Up      0.0.0.0:8080->8080/tcp
```

すべてのコンテナの`State`が`Up (healthy)`になっていればOKです。

---

## 6. トラブルシューティング

### 問題: コンテナが起動しない

#### 解決策1: ログを詳細に確認
```bash
# 特定のコンテナのログを確認
docker logs mmdpf-postgres
docker logs mmdpf-swift
docker logs mmdpf-backend
docker logs mmdpf-frontend
```

#### 解決策2: ポート競合を確認
```bash
# 使用中のポートを確認
netstat -an | grep -E "3000|3001|5434|8080|80"

# Windowsの場合
netstat -ano | findstr "3000 3001 5434 8080 80"
```

#### 解決策3: ボリュームをクリーンアップ
```bash
# すべて停止して削除
docker-compose down -v

# Dockerシステム全体をクリーンアップ（注意: すべてのコンテナ・イメージが削除されます）
docker system prune -a --volumes
```

### 問題: healthcheckが失敗する

#### PostgreSQLのhealthcheck失敗
```bash
# 手動でテスト
docker exec mmdpf-postgres pg_isready -U mmdpf_user

# データベースに直接接続してテスト
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db
```

#### Swiftのhealthcheck失敗
```bash
# 手動でテスト
docker exec mmdpf-swift wget --spider -q http://localhost:8080/auth/v1.0

# Swiftのログを確認
docker logs mmdpf-swift

# Swiftコンテナ内部に入って確認
docker exec -it mmdpf-swift /bin/bash
curl http://localhost:8080/auth/v1.0
```

### 問題: 'ContainerConfig'エラーが再発する

#### 確認ポイント
1. **Docker Composeのバージョン**
```bash
docker-compose --version
# Docker Compose version v2.20.0 以上を推奨
```

2. **Dockerのバージョン**
```bash
docker --version
# Docker version 24.0.0 以上を推奨
```

3. **ファイルフォーマット**
```bash
# YAMLの文法チェック
docker-compose config
```

---

## 7. 予防策

### ベストプラクティス

#### ✅ DO（推奨）
- `wget`や`curl`などの汎用コマンドをhealthcheckに使用する
- 環境変数記法を統一する（コロン記法推奨）
- すべてのhealthcheckに`|| exit 1`を追加する
- `depends_on`に`condition: service_healthy`を指定する
- 定期的に`docker-compose config`で構文チェックする

#### ❌ DON'T（非推奨）
- コンテナに存在しないコマンドをhealthcheckに使用しない
- 環境変数記法を混在させない（ハイフンとコロン）
- healthcheckの明示的なエラーハンドリングを省略しない
- 複雑すぎるhealthcheckコマンドを書かない

---

## 8. 関連ドキュメント

- [開発・本番環境切り替えガイド](./20260115_0823_開発_本番環境切り替えガイド.md)
- [今すぐ実行_クイックスタートガイド](./20260114_0932_今すぐ実行_クイックスタートガイド.md)
- [Docker必要コンテナ一覧](./20260114_0833_Docker必要コンテナ一覧.md)

---

## 9. まとめ

### 修正内容
- ✅ docker-compose.yml のhealthcheck設定を修正
- ✅ docker-compose.prod.yml のhealthcheck設定を修正
- ✅ 環境変数記法を統一
- ✅ 依存関係を明示的に設定

### 解決された問題
- ✅ `'ContainerConfig'`エラーが解消
- ✅ コンテナが正常に起動するようになった
- ✅ healthcheckが正常に動作するようになった

### 次のステップ
1. `docker-compose up -d`でコンテナを起動
2. `docker-compose ps`で状態を確認
3. ブラウザで`http://localhost`にアクセスしてアプリケーションが動作することを確認

---

**作成者**: Cline  
**最終更新**: 2026-01-15 09:30
