# 非同期バッチ実装方式 比較検討

> 作成日: 2026-03-11  
> 目的: MaiML 公開・非公開バッチの非同期実装方式を選定するための比較資料

---

## 前提条件

| 条件 | 内容 |
|------|------|
| 実行環境 | Node.js / TypeScript（Express バックエンド） |
| 既存インフラ | Redis（`redis:7-alpine`）が docker-compose.yml に存在 |
| 既存バッチ | `backend/batch/unpublish/`（別プロセス実行・cron想定） |
| UI起動 | フロントエンドのボタン押下を契機に非同期実行 |
| 定期実行 | 非公開バッチは時間指定による定期実行も必要 |
| 処理の重さ | DOM解析（MaimlParserTyped）→ DB一括挿入（ファイルサイズ次第で数十秒〜数分） |

---

## 方式比較

### 方式A: bullmq（Redis ジョブキュー）

#### 概要

```
[ボタン押下]
    │
    ▼
[API (Express)]
    │ ① DB登録（同期）: asset / registry INSERT
    │ ② bullmqキューにジョブ投入
    │ ③ 202 Accepted を即返す
    ▼
[bullmq Worker（同一 Node.js プロセス内）]
    │ ④ ファイルダウンロード
    │ ⑤ DOM解析（MaimlParserTyped）
    │ ⑥ DB一括挿入
    │ ⑦ status を 'published' に更新
    ▼
[フロントエンド（ポーリング）]
    GET /api/v1/projects/:name/publish-status
    → status が 'published' / 'failed' になるまで3秒ごとに確認
```

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| **追加インフラ** | ✅ 不要 | Redis は既存。`bullmq` パッケージ追加のみ |
| **UI連携（進捗確認）** | ✅ 容易 | `registry.status` をポーリングする既存APIが実装済み |
| **リトライ機構** | ✅ 内蔵 | 失敗時に自動リトライ（回数・バックオフを設定可能） |
| **定期実行（非公開バッチ）** | ✅ 対応可 | bullmq の Repeat Job で cron 表現による定期実行が可能 |
| **デプロイ複雑度** | 🔺 やや増加 | Redis との接続管理・Worker 起動が必要（server.ts に追加） |
| **クラッシュ耐性** | 🔺 注意 | Worker プロセスが落ちると処理中のジョブは失われる（bullmq の `lock` 機構で軽減可能） |
| **実装量** | 中 | Queue定義・Worker定義・Redis設定の追加が必要 |
| **既存実装との整合性** | ✅ 高 | `async_design.md` で詳細設計済み。コードイメージあり |

#### 実装ファイル（追加・変更）

```
backend/src/
├── config/
│   └── redis.ts              （新規）bullmq用Redis接続設定
├── queues/
│   └── maimlIngestQueue.ts   （新規）Queue定義
├── workers/
│   └── maimlIngestWorker.ts  （新規）Worker定義
├── services/
│   └── maimlIngestService.ts （変更）publishMaiml() → requestPublish() に分割
├── controllers/
│   └── projectController.ts  （変更）201→202, requestPublish()呼び出し
└── server.ts                 （変更）Worker起動を追加
```

---

### 方式B: 別プロセス実行（childProcess.spawn）

#### 概要

```
[ボタン押下]
    │
    ▼
[API (Express)]
    │ ① DB登録（同期）: asset / registry INSERT
    │ ② childProcess.spawn() でバッチスクリプトを起動
    │ ③ 202 Accepted を即返す
    ▼
[バッチスクリプト（別 Node.js プロセス）]
    │ ④ ファイルダウンロード
    │ ⑤ DOM解析（MaimlParserTyped）
    │ ⑥ DB一括挿入
    │ ⑦ status を 'published' に更新
    ▼
[フロントエンド（ポーリング）]
    GET /api/v1/projects/:name/publish-status
    → status が 'published' / 'failed' になるまで3秒ごとに確認
```

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| **追加インフラ** | ✅ 不要 | Redis不要。Node.js の `child_process` 標準モジュールのみ |
| **UI連携（進捗確認）** | ✅ 容易 | `registry.status` をポーリング（方式Aと同じ） |
| **リトライ機構** | ❌ 自前実装 | 失敗時のリトライは自分で実装する必要がある |
| **定期実行（非公開バッチ）** | ✅ 対応可 | OS の cron / docker cron で既存の `batch:unpublish` スクリプトを定期実行 |
| **デプロイ複雑度** | ✅ シンプル | childProcess.spawn のみ。Redisとの接続管理不要 |
| **クラッシュ耐性** | ✅ 高い | 別プロセスのため API サーバーのクラッシュと独立 |
| **実装量** | 小〜中 | バッチスクリプト追加 + API側のchildProcess.spawn追加 |
| **既存実装との整合性** | ✅ 高 | `batch/unpublish/` と同じ構成のため一貫性がある |

#### 実装ファイル（追加・変更）

```
backend/
├── batch/
│   ├── unpublish/            （既存）
│   └── publish/              （新規）
│       ├── index.ts          バッチエントリポイント（引数: assetId, registryId, orgId, fileUri）
│       ├── publish.ts        公開処理ロジック
│       └── db.ts             DB接続
├── src/
│   ├── services/
│   │   └── maimlIngestService.ts （変更）requestPublish()でchildProcess.spawnを追加
│   └── controllers/
│       └── projectController.ts  （変更）201→202
└── package.json              （変更）batch:publish スクリプト追加
```

---

### 方式C: Promiseベース非同期（setImmediate / process.nextTick）

#### 概要

```
[ボタン押下]
    │
    ▼
[API (Express)]
    │ ① DB登録（同期）: asset / registry INSERT
    │ ② setImmediate() で重い処理を非同期スケジュール
    │ ③ 202 Accepted を即返す
    ▼
[同一プロセス内（非同期）]
    │ ④ ファイルダウンロード〜DB挿入をプロミスチェーンで処理
    ▼
```

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| **追加インフラ** | ✅ 不要 | Node.js標準機能のみ |
| **UI連携（進捗確認）** | ✅ 容易 | `registry.status` をポーリング |
| **リトライ機構** | ❌ 自前実装 | |
| **定期実行（非公開バッチ）** | ❌ 別途実装必要 | Node-cron などが別途必要 |
| **デプロイ複雑度** | ✅ 最もシンプル | |
| **クラッシュ耐性** | ❌ 低い | API サーバーがクラッシュすると処理が中断 |
| **同時実行制御** | ❌ 困難 | 複数ユーザーが同時に公開すると無制限に並列処理される |
| **実装量** | 最小 | |

> ⚠️ **推奨しない**: 大量処理・クラッシュ耐性・同時実行制御の面で本番向きではない

---

## 方式D: Node-cron + DB ポーリング方式

#### 概要

```
[ボタン押下]
    │ ① DB登録のみ（status='requested'）→ 202 Accepted
    ▼
[node-cron（定期ジョブ）]
    │ 10秒ごとに status='requested' のレコードを DB スキャン
    │ 未処理ジョブがあれば処理開始
    ▼
```

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| **追加インフラ** | ✅ 不要 | `node-cron` パッケージのみ |
| **UI連携（進捗確認）** | ✅ 対応可 | ポーリング可能 |
| **リトライ機構** | 🔺 DB管理 | `status='failed'` を再度 `requested` に戻すことでリトライ |
| **定期実行（非公開バッチ）** | ✅ 対応可 | node-cron で定期実行 |
| **デプロイ複雑度** | ✅ シンプル | |
| **レイテンシ** | 🔺 最大10秒の遅延 | ポーリング間隔分の遅延が発生 |
| **実装量** | 中 | |

---

## 総合比較表

| 方式 | 追加インフラ | リトライ | 定期実行 | クラッシュ耐性 | 実装量 | 推奨度 |
|------|------------|---------|---------|--------------|--------|--------|
| **A: bullmq** | Redis（既存） | ✅ 内蔵 | ✅ Repeat Job | 🔺 中 | 中 | ⭐⭐⭐ |
| **B: 別プロセス** | なし | ❌ 自前 | ✅ OS cron | ✅ 高 | 小〜中 | ⭐⭐⭐ |
| **C: setImmediate** | なし | ❌ 自前 | ❌ 別途 | ❌ 低 | 最小 | ⭐（非推奨） |
| **D: node-cron+DB** | なし | 🔺 DB管理 | ✅ node-cron | ✅ 高 | 中 | ⭐⭐ |

---

## 検討ポイント

方式選定にあたり、以下の点をご確認ください：

1. **Redis の利用をバッチ処理にも拡張することへの許容度**
   - 方式A は Redis をより積極的に活用する方針
   - 現在 Redis はセッション管理にのみ使用されている

2. **定期実行の管理場所**
   - **方式A（bullmq）**: Node.js プロセス内で管理（コードで定義）
   - **方式B（別プロセス）**: OS レベルの cron / docker cron で管理（インフラで定義）
   - どちらのレイヤーで管理したいか

3. **既存の `batch/unpublish/` との統一性**
   - 公開バッチを `batch/publish/` として同じ方式で作る → **方式B**
   - 既存の非公開バッチも bullmq に移行する → **方式A**

4. **実装の緊急度**
   - テーブル構成が未確定の現状では、バッチ本体の実装は後回し
   - まず「ボタン → 同期DB登録 → 202 Accepted → バッチ実行」の骨格だけ作り、方式は後で差し替えることも可能

---

## 推奨案

### 案1（短期）: 方式B（別プロセス）で統一
- 既存の `batch/unpublish/` と同じ構成で `batch/publish/` を作成
- シンプルで既存パターンと一貫性がある
- テーブル構成確定後に実装するため、まず骨格のみ用意

### 案2（長期安定）: 方式A（bullmq）
- Redis が既存のため追加インフラコストが低い
- リトライ・進捗管理・定期実行がワンパッケージで揃う
- `async_design.md` で詳細設計済みなので実装に入りやすい

> **どちらの方式を選ぶかを確定いただければ、計画書の確定事項に追記します。**
