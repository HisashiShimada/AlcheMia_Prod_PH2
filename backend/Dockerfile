# Backend Dockerfile for MMDPF
FROM node:24-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# ポートを公開
EXPOSE 3001

# 開発環境で起動
CMD ["npm", "run", "dev"]
