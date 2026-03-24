# タスク計画書: Ollama embeddinggemma pull失敗修正

## メタデータ
- **作成日時**: 2026-03-24 10:49
- **タスクID**: ollama_embeddinggemma_pull失敗修正
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

トランジション検索モーダルで検索を実行すると HTTP 500 エラーが発生する問題を調査・修正する。
バックエンドログより `model "embeddinggemma:latest" not found` エラーが原因と判明し、
`ollama-init` コンテナの起動待ちスクリプトに含まれる `curl` コマンドが
`ollama/ollama` イメージに存在しないため、モデルの自動 pull が実行されない問題を修正する。

---

## 2. 調査結果

### 2-1. エラーの連鎖

```
1. ユーザーがトランジション検索モーダルで検索実行
   ↓
2. バックエンド semanticSearchController.ts が呼び出される
   ↓
3. transitionSetEmbeddingService.ts が Ollama API へ POST
   URL: http://localhost:11434/api/embeddings
   Body: {"model":"embeddinggemma:latest","prompt":"omori"}
   ↓
4. Ollama サーバーからHTTP 404 が返される
   エラー: model "embeddinggemma:latest" not found, try pulling it first
   ↓
5. バックエンドが HTTP 500 をフロントエンドに返す
```

### 2-2. 根本原因

`docker-compose.ollama.yml` および `docker-compose.prod.yml` の `ollama-init` コンテナの
ヘルスチェックスクリプトで `curl` コマンドを使用しているが、
**`ollama/ollama` イメージには `curl` がインストールされていない**。

そのため、以下の条件判定が常に「失敗」と判定され、無限ループに陥る：

```sh
# この until ループが永遠に終わらない
# （curl が見つからないため、Ollama が起動していても条件が成立しない）
until curl -s http://ollama:11434/api/tags > /dev/null 2>&1; do
  echo '  - Ollama 起動待ち...'
  sleep 3
done
```

結果として `ollama pull embeddinggemma:latest` が実行されず、モデルが存在しない状態のまま運用される。

### 2-3. 調査で確認した事実

| 確認項目 | 結果 |
|---------|------|
| Ollama サーバー (`mmdpf-ollama`) | 正常起動中（IP: 172.22.0.3 / mmdpf-network） |
| `ollama-init` コンテナの状態 | 20分以上 "Ollama 起動待ち..." を繰り返し中（異常） |
| `curl` コマンドの有無 | `ollama/ollama` イメージに存在しない |
| `wget` コマンドの有無 | `ollama/ollama` イメージに存在しない |
| `ollama list`（initコンテナ内） | 実行可能・モデル 0 件 |
| ホストから `/api/tags` | 接続成功・`{"models":[]}` （モデル空） |
| Docker ネットワーク疎通 | 両コンテナとも `mmdpf-network` に接続済み（ネットワーク自体は問題なし） |

### 2-4. 影響範囲

- **開発環境**: `docker-compose.ollama.yml` の `ollama-init` コンテナ
- **本番環境 (onprem profile)**: `docker-compose.prod.yml` の以下2箇所
  - `ollama` サービスの `healthcheck`（`curl` 使用）
  - `ollama-init` サービスの `command`（`curl` 使用）

---

## 3. 修正方針

`curl` の代わりに `ollama/ollama` イメージに標準搭載されている **`ollama list`** コマンドを使用する。
接続先は環境変数 `OLLAMA_HOST` で指定する。

```sh
# 修正前
until curl -s http://ollama:11434/api/tags > /dev/null 2>&1; do

# 修正後
until OLLAMA_HOST=http://ollama:11434 ollama list > /dev/null 2>&1; do
```

---

## 4. 変更ファイル

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| `docker-compose.ollama.yml` | `ollama-init.command` の until 条件 | `curl` → `OLLAMA_HOST=... ollama list` |
| `docker-compose.prod.yml` | `ollama.healthcheck.test` | `curl` → `OLLAMA_HOST=... ollama list` |
| `docker-compose.prod.yml` | `ollama-init.command` の until 条件 | `curl` → `OLLAMA_HOST=... ollama list` |

---

## 5. 実施記録

### 5-1. 修正済み

- [x] `docker-compose.ollama.yml` の `ollama-init.command` を修正
- [x] `docker-compose.prod.yml` の `ollama.healthcheck.test` を修正
- [x] `ollama-init` コンテナを再起動し `embeddinggemma:latest` の pull を実行
- [x] pull 完了後、`http://localhost:11434/api/tags` でモデル存在を確認

### 5-2. 未実施（ユーザー判断待ち）

- [ ] `docker-compose.prod.yml` の `ollama-init.command` の `curl` を修正

### 5-3. pull 結果

```
インストール済みモデル:
  - embeddinggemma:latest
```

---

## 6. 今後の対策

次回以降 `docker compose -f docker-compose.ollama.yml up -d` を実行した際は、
`ollama-init` コンテナが正常に `ollama list` でOllamaの起動を確認し、
`embeddinggemma:latest` を自動 pull するようになる。

モデルが既にキャッシュされている場合（`ollama-data` ボリュームに保存済み）は、
pull をスキップして即座に完了する。
