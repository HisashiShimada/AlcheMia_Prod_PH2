FROM nginx:1.27-alpine

# =============================================================================
# Alchemia Staging - Nginx コンテナイメージ（ECR/ECS Fargate 本番用）
# =============================================================================
# 機能:
#   - SSL終端（HTTPS ポート443）
#   - クライアント証明書認証（mTLS / organization_id 抽出）
#   - バックエンドAPI プロキシ（/api/）
#   - フロントエンド プロキシ（/）
#
# SSL証明書について:
#   コンテナ起動後、以下のパスに証明書を配置する必要があります。
#   ECS 環境では entrypoint.sh で AWS Secrets Manager / SSM から取得して配置します。
#     /etc/nginx/ssl/server.crt  - サーバー証明書
#     /etc/nginx/ssl/server.key  - サーバー秘密鍵
#     /etc/nginx/ssl/ca.crt      - クライアント証明書検証用 CA 証明書
# =============================================================================

# 必要なパッケージを追加（wget はヘルスチェックで使用）
RUN apk add --no-cache wget curl openssl

# nginx 設定ファイルをコピー
COPY nginx.prod.conf /etc/nginx/nginx.conf

# SSL証明書用ディレクトリを作成（証明書は起動時に配置）
RUN mkdir -p /etc/nginx/ssl

# ヘルスチェック用のレスポンスファイルを配置
# nginx.prod.conf の HTTP→HTTPS リダイレクト設定に合わせ、
# ヘルスチェックは HTTP（ポート80）で /health を返す専用 location を追加。
# ただし、ECS タスク定義のヘルスチェックは http://localhost:80/health を使用するため、
# entrypoint.sh 起動後に nginx が 80 番ポートで応答できることを確認する。

# entrypoint スクリプトをコピー
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ポート公開
EXPOSE 80 443

# ヘルスチェック（ECS タスク定義にも同様の設定あり）
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
