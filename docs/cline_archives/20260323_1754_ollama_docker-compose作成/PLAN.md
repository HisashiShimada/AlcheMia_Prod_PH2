# タスク計画書: ollama docker-compose.yml 新規作成

## メタデータ
- **作成日時**: 2026-03-23 17:54
- **タスクID**: ollama_docker-compose作成
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

セマンティック検索機能のために、ollamaサーバをDockerコンテナとして開発環境で起動するための
`docker-compose.ollama.yml` を新規作成する。

既存の `docker-compose.yml`（postgres/swift/redis）とは分離し、
既存の `mmdpf-network` に参加する形で構成する。

## 目的と期待される成果

### 目的
- セマンティック検索で使用するEmbeddingモデル（`embeddinggemma:latest`）をDockerで起動できるようにする
- バックエンドから `http://ollama:11434` でアクセス可能にする
- モデルデータを永続化し、毎回ダウンロードを不要にする

### 期待される成果
- [ ] `docker-compose.ollama.yml` が作成される
- [ ] `docker compose -f docker-compose.ollama.yml up -d` で起動できる
- [ ] `embeddinggemma:latest` モデルが自動的にpullされる
- [ ] バックエンドから `http://ollama:11434` でアクセスできる
- [ ] `.env.prod.onprem.example` の `OLLAMA_HOST` コメントが実態に即して更新される

## 実装ステップ

### Phase 1: タスク計画書の作成
- [x] `docs/20260323_1754_ollama_docker-compose作成/PLAN.md` を作成

### Phase 2: docker-compose.ollama.yml の作成
- [x] `docker-compose.ollama.yml` をプロジェクトルートに新規作成
  - `ollama` サービスの定義
    - イメージ: `ollama/ollama:latest`
    - コンテナ名: `mmdpf-ollama`
    - ポート: `11434:11434`
    - ボリューム: `ollama-data:/root/.ollama`
    - 環境変数: `OLLAMA_NUM_PARALLEL=2`, `OLLAMA_MAX_LOADED_MODELS=2`, `OLLAMA_KEEP_ALIVE=5m`
    - ネットワーク: `mmdpf-network`（external: true で既存参照）
  - `ollama-init` サービスの定義（ワンショット）
    - 同じollamaイメージを使用
    - ollamaコンテナ起動後に `ollama pull embeddinggemma:latest` を実行して終了
    - `depends_on: ollama` で順序制御
  - `ollama-data` ボリュームの定義
  - `mmdpf-network` ネットワークの外部参照定義

### Phase 3: 既存ファイルの更新
- [x] `.env.prod.onprem.example` の `OLLAMA_HOST` コメントを更新
  - 「`semantic_search/ollama-server/docker-compose.yml` で管理」→「`docker-compose.ollama.yml` で管理」に修正

### Phase 4: 動作確認・ドキュメント整備
- [x] `README.md` にollama起動手順を追記（セマンティック検索セクション）
- [x] PLAN.md を完了記録で更新

## 変更ファイル

### 新規作成
1. `docs/20260323_1754_ollama_docker-compose作成/PLAN.md` - このタスク計画書
2. `docker-compose.ollama.yml` - ollamaサービスのdocker-compose設定

### 修正
1. `.env.prod.onprem.example` - OLLAMAセクションのコメント修正
2. `README.md` - ollama起動手順の追記

## 技術的詳細

### ネットワーク設計
```
mmdpf-network（既存ネットワーク）
  ├── mmdpf-postgres（既存）
  ├── mmdpf-swift（既存）
  ├── mmdpf-redis（既存）
  └── mmdpf-ollama（新規追加）← バックエンドから http://ollama:11434 でアクセス
```

### モデル自動pull方式
参考ドキュメント（temp/ollama-server）の方式を参考に、`ollama-init` コンテナを使用：
```
ollama（serve起動）
  ↓ healthcheck または sleep で待機
ollama-init（embeddinggemma:latest を pull → 終了）
```

### 環境変数
バックエンドの `transitionSetEmbeddingService.ts` が参照する環境変数：
- `OLLAMA_HOST`: `http://ollama:11434`（docker-compose使用時のデフォルト）
- `OLLAMA_EMBEDDING_MODEL`: `embeddinggemma:latest`（デフォルト）

### 起動順序
```bash
# 1. 基本インフラを起動（mmdpf-networkが作成される）
docker compose up -d

# 2. ollamaサービスを起動（embeddinggemmaモデルも自動pull）
docker compose -f docker-compose.ollama.yml up -d

# 3. 接続確認
curl http://localhost:11434/api/tags
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `embeddinggemma:latest` のpullが長時間かかる（モデルサイズが大きい） | 中 | 高 | ollama-initのrestartポリシーをno、タイムアウトを長めに設定 |
| mmdpf-network未作成時にollama単体起動しようとする | 低 | 中 | コメントで起動順序を明記 |

## テスト計画

### 手動テスト
- [ ] `docker compose -f docker-compose.ollama.yml up -d` で起動確認
- [ ] `curl http://localhost:11434/api/tags` でAPIレスポンス確認
- [ ] `npx ts-node backend/scripts/test-ollama-embedding.ts` でEmbedding動作確認

## 承認記録
- **計画書提示日時**: 2026-03-23 17:54
- **承認日時**: 2026-03-23 17:54
- **承認者コメント**: Act modeへの切り替えにより承認

## 実施記録

### 実施日時
開始: 2026-03-23 17:54
完了: 2026-03-23 18:00

### 最終的な成果物
- [x] `docker-compose.ollama.yml` 作成完了
- [x] `.env.prod.onprem.example` 更新完了
- [x] `README.md` 更新完了
