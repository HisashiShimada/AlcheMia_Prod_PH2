# タスク計画書: E2Eテスト環境構築（Playwright + playwright-bdd）

## メタデータ
- **作成日時**: 2026-03-03 15:19
- **タスクID**: e2e-setup
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

Playwright + playwright-bdd を使った E2E テスト環境を構築する。
フロント(React/Next.js) → バックエンド(Node.js/Express) → DB(PostgreSQL) を一気通貫でテストできる基盤を整備し、
「組織追加機能」のシナリオを第1弾として実装する。

## 目的と期待される成果

- [ ] `playwright.config.ts` に `defineBddConfig` を設定し、BDD連携を完成させる
- [ ] `e2e/db.ts` にDB接続ヘルパーを作成し、Given/Then でDBを直接操作できるようにする
- [ ] `e2e/features/organizationManagement.feature` に日本語 Gherkin シナリオを作成する
- [ ] `e2e/steps/organizationManagement.ts` にステップ定義を実装する
- [ ] `npm test` でテストが実行できる状態にする

## 実装ステップ

### Phase 1: 設定ファイル修正
- [ ] `playwright.config.ts` に `defineBddConfig` を追加
- [ ] `testDir`・`baseURL`・`projects` を E2E 用に設定

### Phase 2: DB接続ヘルパー作成
- [ ] `e2e/db.ts` を作成
- [ ] 環境変数 `E2E_DB_*` から接続情報を取得
- [ ] テスト後のクリーンアップ関数を用意

### Phase 3: Gherkin シナリオ作成
- [ ] `e2e/features/organizationManagement.feature` を作成（`.md` → `.feature` に変更）
- [ ] 以下のシナリオを記述：
  - プロバイダーユーザーがログインできること
  - 新規組織を1件追加できること（DBへの書き込みまで確認）

### Phase 4: ステップ定義実装
- [ ] `e2e/steps/organizationManagement.ts` を作成
- [ ] Given: DB に直接 provider ユーザーを用意（または既存ユーザーでログイン）
- [ ] When: Playwright でログイン → 組織追加モーダル操作
- [ ] Then: DB クエリで organization レコードの存在を確認
- [ ] アフター: テストデータのクリーンアップ

## 変更ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `playwright.config.ts` | 修正 | `defineBddConfig` 追加、`testDir`・`baseURL` 設定 |
| `e2e/db.ts` | 新規 | PostgreSQL 接続ヘルパー |
| `e2e/features/organizationManagement.feature` | 新規 | 組織管理の Gherkin シナリオ |
| `e2e/steps/organizationManagement.ts` | 新規 | ステップ定義（Given/When/Then） |
| `e2e/features/organizationManagement.md` | 削除対象 | `.feature` に置き換えるため不要 |

## 技術的詳細

### ログイン仕様
- ログイン URL: `http://localhost:3000/`（`/?orgId=<org_cd>` パラメータで組織を指定）
- ログインは2段階: 認証情報入力 → PIN コード入力（または PIN 免除）
- E2E テスト用に `is_entry=0`（PIN なし）の provider ユーザーを前提とする

### DB 接続
- `pg` ライブラリを使用（すでに `package.json` に追加済み）
- 接続先は環境変数 `E2E_DB_*` で制御（デフォルトは `localhost:5432/mmdpf_db`）

### テストデータ戦略
- Given ステップで必要なデータを DB に直接挿入
- After ステップで挿入したデータを削除（冪等性確保）

## リスク

| リスク | 対策 |
|---|---|
| PIN コード認証が必要な場合テストが止まる | `is_entry=0` の provider ユーザーを前提とするか、devMode の PIN をコードで取得する |
| テストデータが残留してDB汚染 | After フックで必ず DELETE する |
| フロントエンドの DOM 構造変更でセレクタが壊れる | `data-testid` 属性を推奨するが初期版は既存セレクタを活用 |

## 承認記録
- **計画書提示日時**: 2026-03-03 15:19
- **承認日時**: 2026-03-03 15:19（ユーザー承認済み・Act Mode 移行）
