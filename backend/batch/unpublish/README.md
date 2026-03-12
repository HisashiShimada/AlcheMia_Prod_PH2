# MaiML 非公開バッチ（unpublish）

期限（`retention`）が到来した MaiML 公開アセットを一括で非公開にするバッチです。

仕様: `docs/MaiML_OpenData_Pipeline/spec.md` §3.2 非公開（Unpublish）フロー

---

## 実行方法

### 手動実行

```bash
# mmdpf リポジトリルートから実行
npx ts-node -P backend/batch/unpublish/tsconfig.json backend/batch/unpublish/index.ts
```

または `backend/` ディレクトリから：

```bash
cd backend
npx ts-node -P batch/unpublish/tsconfig.json batch/unpublish/index.ts
```

### npm scripts から実行

`backend/package.json` に以下を追加することで `npm run batch:unpublish` で実行できます：

```json
"scripts": {
  "batch:unpublish": "ts-node -P batch/unpublish/tsconfig.json batch/unpublish/index.ts"
}
```

---

## cron 設定例

### Linux cron（毎日 0:00 に実行）

```cron
0 0 * * * cd /path/to/mmdpf && npx ts-node -P backend/batch/unpublish/tsconfig.json backend/batch/unpublish/index.ts >> /var/log/mmdpf/unpublish.log 2>&1
```

### Docker コンテナ内から実行する場合

```bash
docker exec mmdpf-backend-1 npx ts-node -P batch/unpublish/tsconfig.json batch/unpublish/index.ts
```

---

## 環境変数

`backend/.env` の設定をそのまま使用します。バッチ実行前に以下が設定されていることを確認してください。

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` または `DB_*` 系 | PostgreSQL 接続情報 |

---

## 処理内容

1. `maiml_publish_registry` の `retention` が現在日時以前のアセットを取得
2. 各アセットに対して `maiml_unpublish_asset(asset_id, keep_meta)` を実行
   - `keep_meta=true`（デフォルト）: `maiml_asset` の代表メタは残し、KV・プレビュー・生データを削除
   - `keep_meta=false`（full_delete）: `maiml_asset` ごと完全削除

---

## 関連ファイル

- 処理ロジック実装先（予定）: `backend/src/services/maimlUnpublishService.ts`
- 仕様書: `docs/MaiML_OpenData_Pipeline/spec.md`
- 推奨事項: `docs/MaiML_OpenData_Pipeline/recommendations.md`
