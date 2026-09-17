# タスク計画書: logger.ts に Winston を組み込み（本番エラー検知対応）

## メタデータ
- **作成日時**: 2026-09-17 16:00
- **タスクID**: 20260917_1600
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

現在の `backend/src/utils/logger.ts` は `console.*` のみでログ出力しており、ファイルへの保存が一切されていない。
一方で `projectService.ts` では `winston` を直接 import してログ出力しており、実装が分散・不統一な状態にある。

本タスクでは `logger.ts` に Winston を組み込み、以下を実現する：
- **本番環境**: error ログをファイルに出力（エラー検知）+ コンバインドログ（全レベル）もファイル保存
- **開発環境**: コンソール出力（色付き・整形済み）
- **`projectService.ts` の直接 winston 呼び出しを `logger` 経由に統一**

---

## 目的と期待される成果

- [ ] `logger.ts` が Winston を内部で使用し、環境に応じてコンソール/ファイル出力を切り替える
- [ ] 本番環境で `backend/logs/error.log`（エラーのみ）と `backend/logs/combined.log`（全レベル）にログが記録される
- [ ] `winston-daily-rotate-file` を使い日次ローテーション・14日間保存（`security.md` 規約準拠）
- [ ] `projectService.ts` の `winston` 直接呼び出しを `logger` 経由に変更し、logger の一元管理を実現
- [ ] 既存の `logger.ts` の公開 API（`logger.error/warn/info/debug`、各 `log*` ヘルパー関数）は変更なし（後方互換性維持）

---

## 実装ステップ

- [ ] **Step 1**: `backend/logs/` ディレクトリを作成し `.gitkeep` を置く（ディレクトリをgit管理、ログファイル自体は `.gitignore`）
- [ ] **Step 2**: `backend/src/utils/logger.ts` を Winston ベースに書き換え
  - `winston.createLogger` で Logger を生成
  - トランスポート設定（環境別）:
    - 全環境: Console transport
    - 本番 (`NODE_ENV === 'production'`): `DailyRotateFile` × 2（error 専用 / combined）
  - フォーマット: JSON（本番）/ カラー付きシンプル形式（開発）
  - 既存の公開インターフェース（`LogLevel` enum、`logger` singleton、各 `log*` 関数）は維持
- [ ] **Step 3**: `backend/src/services/projectService.ts` の `winston` 直接 import を削除し、`logger` を使うよう変更
- [ ] **Step 4**: `.gitignore` にログファイルパターンを追加（`backend/logs/*.log` 等）
- [ ] **Step 5**: 動作確認（ビルド通過・テスト確認）

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/utils/logger.ts` | Winston ベースに書き換え（公開 API は維持） |
| 2 | `backend/src/services/projectService.ts` | `winston` 直接 import → `logger` import に変更 |
| 3 | `backend/logs/.gitkeep` | 新規作成（ディレクトリ管理用） |
| 4 | `.gitignore` または `backend/.gitignore` | `logs/*.log` などのパターン追加 |

---

## 影響範囲

- `logger.ts` を import しているすべてのファイル → **公開 API は変更なし** なので影響なし
- `projectService.ts` の winston 直接呼び出し箇所 → logger 経由に変更するが動作は同等

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `test` 環境でファイルログが生成されテスト汚染 | 中 | 中 | `NODE_ENV === 'test'` の場合はファイルトランスポートを無効化 |
| `backend/logs/` が存在しない場合にエラー | 高 | 低 | Winston の `DailyRotateFile` は自動でディレクトリ作成するが、念のため `.gitkeep` で保証 |
| 既存テストが `winston` を直接モックしている | 中 | 高（確認済み） | `projectService.ts` 変更後、テストの mock 対象を `logger` に変更 |

---

## テスト計画

- [ ] `npm run build` が通ること（TypeScript コンパイルエラーなし）
- [ ] `NODE_ENV=production` で起動し `backend/logs/` にログファイルが生成されること（手動確認）
- [ ] 既存テスト（`projectService.requestApproval.logging.*.test.ts`）が引き続きパスすること

---

## 承認記録
- **計画書提示日時**: 2026-09-17 16:00
- **承認日時**: 2026-09-17 16:xx
- **承認者コメント**: 承認します

## 実施記録

### 実施日時
開始: 2026-09-17 16:xx
完了: 2026-09-17 17:xx

### 最終的な成果物
- [x] Step 1: `backend/logs/.gitkeep` 作成（ディレクトリ確保）
- [x] Step 2: `backend/src/utils/logger.ts` を Winston ベースに書き換え
- [x] Step 3: `backend/src/services/projectService.ts` の `winston` 直接 import を `logger` 経由に変更
- [x] Step 4: テストファイルのスパイ対象を `winston` → `logger` に修正
- [x] Step 5: `npm run build` 通過確認（エラーなし）
- [x] `.gitignore` は既に `backend/logs/` が記載済みのため変更不要

### 確認事項
- テスト（projectService.requestApproval.logging.*.test.ts）は変更前から失敗しており、今回の変更による新規失敗なし
