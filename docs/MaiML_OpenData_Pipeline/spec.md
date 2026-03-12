# MaiML OpenData Pipeline 仕様書

> 作成日: 2026-03-11  
> ステータス: **確定事項のみ記載**（未確定事項は [pending.md](./pending.md) を参照）

---

## 1. システム概要

ユーザーが MaiML（XML フォーマットの材料科学データ）ファイルを「公開」「非公開」できる仕組みを提供する。

| 操作 | 概要 |
|------|------|
| **公開 (Publish)** | 指定した MaiML ファイルを解析・DB へ取り込み、検索・閲覧できる状態にする |
| **非公開 (Unpublish)** | 公開したデータを削除して非公開にする |

---

## 2. アーキテクチャ

### 2.1 処理の分割方針

ボタン押下から処理完了までを「同期部分」と「非同期部分」に分割する。

| フェーズ | 処理内容 | 実行方式 |
|---------|---------|---------|
| **同期部分** | DB への登録（asset / registry INSERT）・ジョブ投入 | API レスポンス前に完了 |
| **非同期部分** | ファイル取得・DOM 解析・DB 一括挿入 | bullmq Worker が非同期で実行 |

### 2.2 コンポーネント構成

```
[フロントエンド]
    │  公開ボタン / 非公開ボタン押下（experiment_admin のみ）
    ▼
[バックエンド API（Express）]
    │  ① DB登録（maiml_asset / maiml_publish_registry）
    │  ② bullmq キューにジョブを投入
    │  ③ 202 Accepted を即返す
    ▼
[bullmq Worker（同一 Node.js プロセス内）]
    │  ④ Swift/S3 から MaiML ファイルを取得
    │  ⑤ DOM解析（MaimlParserTyped を流用）
    │  ⑥ DB へデータ登録（テーブル構成は pending.md 参照）
    │  ⑦ status を 'published' に更新
    ▼
[PostgreSQL（組織単位スキーマ）]

[フロントエンド（ポーリング）]
    GET /api/v1/projects/:name/publish-status
    → status が 'published' / 'failed' になるまで定期確認
```

### 2.3 使用インフラ・パッケージ

| 項目 | 内容 |
|------|------|
| **ジョブキュー** | bullmq（Redis は docker-compose.yml に既存の `redis:7-alpine` を流用） |
| **XML 解析** | 既存の `MaimlParserTyped`（DOM ベース）を流用 |
| **実行言語** | TypeScript（Node.js / Express バックエンドに組み込む） |

---

## 3. 公開処理フロー

### 3.1 フロー詳細

```
① ユーザーが「公開」ボタンを押下
    ↓
② API（同期部分）
    - maiml_asset INSERT（status='requested'）
    - maiml_publish_registry INSERT
    - bullmq キューにジョブ投入
    - 202 Accepted を返す
    ↓
③ bullmq Worker（非同期部分）
    - status を 'processing' に更新
    - Swift/S3 から最新 MaiML ファイルをダウンロード
    - MaimlParserTyped で DOM 解析
    - データを DB へ一括挿入
    - status を 'published' に更新
    ↓
④ フロントエンドがポーリングで 'published' を検知 → 完了表示
```

### 3.2 対象ファイル

- ボタン押下時点でのプロジェクトの**最新 MaiML ファイル**を自動的に対象とする
- ユーザーが個別にファイルを指定する UI は設けない

### 3.3 ジョブの単体実行

開発・保守時のデバッグ用に、bullmq キューへジョブを登録するスクリプトを用意する。

```bash
# ジョブ登録スクリプト経由で単体起動
npm run batch:enqueue-publish -- --registryId=xxx
# → Redis が起動していれば Worker が処理する
```

---

## 4. 非公開処理フロー

### 4.1 即時非公開（UIボタン押下）

```
① ユーザーが「非公開」ボタンを押下
    ↓
② API（同期部分）
    - bullmq キューにジョブ投入
    - 202 Accepted を返す
    ↓
③ bullmq Worker（非同期部分）
    - 対象アセットのデータを削除（CASCADE 削除）
    - status を 'unpublished' に更新
    ↓
④ フロントエンドがポーリングで完了を検知 → 完了表示
```

### 4.2 定期実行（スケジュール非公開）

- bullmq の **Repeat Job** を使用して定期実行する
- 実行タイミングは cron 表現で設定可能（例: 毎日 0 時）
- 期限（`retention_until`）が到来したアセットを一括非公開する
- 即時非公開と**同じ Worker** が処理する（ジョブの投入元が違うだけ）

```typescript
// 実装イメージ（server.ts 起動時に登録）
await unpublishQueue.add('due-check', {}, {
  repeat: { pattern: '0 0 * * *' }  // 毎日0時
});
```

### 4.3 ジョブステータス遷移

```
requested → processing → published（公開完了）
                      ↘ failed（エラー）

published → processing → unpublished（非公開完了）
```

---

## 5. XML 解析方式

### 5.1 採用方式

**DOM パース**（`MaimlParserTyped` を流用）

- MaiML ファイル全体をメモリに展開してから処理する方式
- 既存の `MaimlParserTyped`（DOM ベースの型付きパーサー）をそのまま利用する

### 5.2 注意事項

- 大容量ファイル（数百MB 超）は DOM 方式ではメモリ使用量が増加する
- bullmq Worker は非同期で処理するためリクエストのタイムアウトは発生しない
- ファイルサイズの上限については運用ルールで定める（仕様書の対象外）

---

## 6. DB 設計

詳細は **[db.md](./db.md)** を参照すること。

### 概要

- 公開データは**組織単位の PostgreSQL スキーマ**に格納する（命名規則は [pending.md](./pending.md) 参照）
- テーブル構成: `maiml_asset` → `maiml_instance` → `maiml_element` / `maiml_insertion` の階層構造
- テンプレート（protocol 層）: `maiml_template` → `maiml_template_element` / `maiml_template_insertion`
- スキーマは組織作成時に自動作成する。スキーマが存在しない場合は公開操作時にエラー

---

## 7. API 仕様

### 7.1 エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `POST` | `/api/v1/projects/:projectName/publish` | 公開ジョブを登録・投入 |
| `POST` | `/api/v1/projects/:projectName/unpublish` | 非公開ジョブを登録・投入 |
| `GET` | `/api/v1/projects/:projectName/publish-status` | 公開ステータスを取得 |

> 既存の `projectRoutes.ts` / `projectController.ts` に実装済み。継続利用する。

### 7.2 公開 API（POST /publish）

**リクエスト:**
```json
{
  "template_only": false,
  "store_raw_series": false,
  "retention_until": null,
  "keep_raw_on_unpublish": false
}
```

**レスポンス（202 Accepted）:**
```json
{
  "success": true,
  "data": {
    "asset_id": 123,
    "registry_id": 456,
    "status": "requested",
    "message": "公開処理を開始しました。完了までしばらくお待ちください。"
  }
}
```

### 7.3 ステータス取得 API（GET /publish-status）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "is_published": true,
    "status": "published",
    "asset_id": 123,
    "registry_id": 456,
    "updated_at": "2026-03-11T13:00:00Z"
  }
}
```

**ステータス値:**
| 値 | 意味 |
|----|------|
| `requested` | ジョブ登録済み・処理待ち |
| `processing` | Worker が処理中 |
| `published` | 公開完了 |
| `unpublished` | 非公開完了 |
| `failed` | エラー終了 |

---

## 8. 権限・セキュリティ

### 8.1 実行可能ロール

| 操作 | 実行可能ロール |
|------|-------------|
| 公開（Publish） | `experiment_admin` のみ |
| 非公開（Unpublish） | `experiment_admin` のみ |
| ステータス確認 | `experiment_admin` 以上 |

### 8.2 ミドルウェアチェーン

全エンドポイントに以下を適用:

```
auth → tenantIsolation → permissionCheck（experiment_admin のみ許可）
```

### 8.3 マルチテナント分離

- すべての DB 操作で `organization_id` によるスキーマ分離を適用する
- 組織をまたいだデータアクセスは禁止（System Admin を除く）

---

## 9. 実装ファイル構成（予定）

```
backend/src/
├── config/
│   └── redis.ts                    （新規）bullmq 用 Redis 接続設定
├── queues/
│   └── maimlIngestQueue.ts         （新規）公開ジョブ Queue 定義
│   └── maimlUnpublishQueue.ts      （新規）非公開ジョブ Queue 定義
├── workers/
│   └── maimlIngestWorker.ts        （新規）公開 Worker
│   └── maimlUnpublishWorker.ts     （新規）非公開 Worker
├── services/
│   └── maimlIngestService.ts       （変更）requestPublish() に分割
├── controllers/
│   └── projectController.ts        （変更・既存）202 返却に変更
├── routes/
│   └── projectRoutes.ts            （変更なし・既存）
└── server.ts                       （変更）Worker 起動を追加
backend/scripts/
└── enqueue-publish.ts              （新規）単体起動用ジョブ登録スクリプト
```

---

## 10. 未確定事項

テーブル構成・カラムマッピング・DBスキーマ命名規則については **[pending.md](./pending.md)** を参照すること。

**テーブル関連の実装は `pending.md` の更新（確定）後に着手すること。**
