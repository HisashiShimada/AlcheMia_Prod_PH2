# タスク計画書: 非公開バッチ（backend/batch/unpublish）実装

## メタデータ
- **作成日時**: 2026-03-10 11:44
- **タスクID**: unpublish_batch
- **優先度**: 高
- **推定工数**: 1〜2時間

## タスク概要

`backend/batch/unpublish/index.ts` に存在するスタブ（TODOのみ）を、
判明している仕様に基づき実装する。

**方針: 完全独立バッチ**
`backend/src/` のサービス・リポジトリには一切依存せず、
`backend/batch/unpublish/` ディレクトリ内で完結する独立ソースとして実装する。

対象処理:
- `retention_until` が現在日時以前かつ `status='published'` のアセットを一括非公開にする
- デフォルトは `keep_meta` モード（代表メタは残し、KV/プレビュー/生データを削除）
- 環境変数 `UNPUBLISH_MODE=full_delete` で完全削除モードに切り替え可能
- 非公開後に registry の status を `'unpublished'` に更新

---

## ファイル構成

```
backend/batch/unpublish/
├── index.ts         ← メインエントリポイント（変更）
├── db.ts            ← DB接続（新規・独自実装）
├── repository.ts    ← DBアクセス層（新規・独自実装）
├── unpublish.ts     ← 非公開ロジック（新規・独自実装）
├── tsconfig.json    ← 既存（変更なし）
└── README.md        ← 既存（変更なし）
```

---

## 変更ファイル

### 新規作成
1. `backend/batch/unpublish/db.ts` - DB接続（dotenv + pg.Pool を独立生成）
2. `backend/batch/unpublish/repository.ts` - DBアクセス層（独自実装）
3. `backend/batch/unpublish/unpublish.ts` - 非公開ロジック（独自実装）

### 修正
1. `backend/batch/unpublish/index.ts` - TODOを実装に置き換え
2. `backend/package.json` - `batch:unpublish` スクリプト追加

---

## 各ファイルの実装内容

### db.ts
- `dotenv` で `backend/.env` を読み込み
- `pg.Pool` を独立生成して接続
- `backend/src/database/db.ts` には依存しない

### repository.ts
以下の関数を実装：
- `findDueAssets(pool)`: `retention_until <= now()` かつ `status='published'` の一覧取得
- `findRegistryByAssetId(pool, assetId)`: registry 取得（`keep_raw_on_unpublish` フラグ確認）
- `deleteConditionKv(client, assetId)`: `maiml_condition_kv` 削除
- `deleteMaterialKv(client, assetId)`: `maiml_material_kv` 削除
- `deletePreview(client, assetId)`: `maiml_series_preview` 削除
- `deleteRawHeader(client, assetId)`: `maiml_series_raw_header` 削除（CASCADE で chunk も削除）
- `updateRegistryStatus(client, registryId, status)`: status を `'unpublished'` に更新
- `deleteAsset(client, assetId)`: asset ごと完全削除（full_delete 用）

### unpublish.ts
- `unpublishAsset(pool, assetId, registryId, keepRawOnUnpublish, mode)`: 1件の非公開処理（トランザクション）
  - `keep_meta`: KV/プレビュー/生データを削除、registry を `unpublished` に更新
  - `full_delete`: asset ごと CASCADE 削除
- `unpublishDueAssets(pool, mode)`: 期限切れ全件を処理して結果サマリーを返す

### index.ts
- `dotenv/config` ロード
- DB接続 → `unpublishDueAssets()` 呼び出し
- 結果ログ出力 → 正常終了 / エラー時は exit(1)
- 環境変数 `UNPUBLISH_MODE` で `keep_meta` / `full_delete` を切り替え可能（デフォルト: `keep_meta`）

### package.json
```json
"batch:unpublish": "ts-node -P batch/unpublish/tsconfig.json batch/unpublish/index.ts"
```

---

## スコープ外（今回実装しない）

- bullmq による定期実行（cron 手動実行で対応、README.md に記載済み）
- フロントエンド・API の追加

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 暫定スキーマと DDL の差異 | 中 | 低 | migrations ファイルを正とする |
| DB 接続情報が .env にない | 中 | 低 | dotenv で自動読み込み、未設定時はエラーメッセージで終了 |

---

## 承認記録
- **計画書提示日時**: 2026-03-10 11:48
- **承認日時**: 2026-03-10 11:49
- **承認者コメント**: 承認（完全独立バッチとして実装）

---

## 実施記録

### 実施日時
開始: 2026-03-10 11:49
完了: 2026-03-10 11:53

### 最終的な成果物
- [x] `backend/batch/unpublish/db.ts` - pg.Pool 独立生成（dotenv + pg）
- [x] `backend/batch/unpublish/repository.ts` - findDueAssets / 削除系関数を独自実装
- [x] `backend/batch/unpublish/unpublish.ts` - unpublishAsset / unpublishDueAssets（トランザクション）
- [x] `backend/batch/unpublish/index.ts` - エントリポイント（UNPUBLISH_MODE 環境変数対応）
- [x] `backend/package.json` - `batch:unpublish` スクリプト追加
- [x] TypeScript 型チェック（`tsc --noEmit`）: エラー 0

### 実装の概要
- `backend/src/` への依存ゼロ。`backend/batch/unpublish/` 内で完結
- `db.ts`: dotenv で `.env` を読み込み、pg.Pool を独立生成
- `repository.ts`: `maiml_publish_registry` / 各 KV・プレビュー・生データテーブルへの SQL を定義
- `unpublish.ts`: `keep_meta` / `full_delete` モードを切り替えられるトランザクション処理
- `index.ts`: `UNPUBLISH_MODE` 環境変数でモード制御、失敗件数 > 0 の場合は exit(1)
