# タスク計画書: プロジェクト管理 公開・非公開機能 仕様書作成

## メタデータ
- **作成日時**: 2026-03-13 16:12
- **タスクID**: 公開非公開機能仕様書作成
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要

プロジェクト管理画面に存在する「公開」「非公開」機能について、以下の仕様書を `docs/design/` 配下に作成・更新する。

**配置方針**
- 公開/非公開ボタン仕様 → `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` に追記
- 公開ダイアログUI仕様 → `docs/design/ui/experiment_admin/01_project_management/` に新規作成
- 非公開ダイアログUI仕様 → `docs/design/ui/experiment_admin/01_project_management/` に新規作成
- API仕様書 → `docs/design/api/api_maiml_opendata.md`（既存ファイル全面更新）
- Worker仕様書 → `docs/design/worker/`（新規フォルダ、公開/非公開それぞれ別ファイル）

**既存ファイルとの関係**
- `docs/design/ui/experiment_admin/ui_maiml_publish.md` — 旧設計書（`01_project_management/`外に存在、未実装時代の内容）→ 今回の作業対象外（参考のみ）
- `docs/design/api/api_maiml_opendata.md` — 旧設計書（エンドポイントが現実装と異なる）→ **全面更新**
- Worker仕様書は存在しないため新規作成

## 目的と期待される成果

### 目的
実装済みのソースコードを正確に反映した仕様書を整備し、開発・保守・レビュー時の参照資料とする。

### 期待される成果
- [ ] `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` — 公開/非公開ボタン仕様を追記
- [ ] `docs/design/ui/experiment_admin/01_project_management/ui_maiml_publish_dialog.md` — 公開確認ダイアログUI仕様（新規）
- [ ] `docs/design/ui/experiment_admin/01_project_management/ui_maiml_unpublish_dialog.md` — 非公開確認ダイアログUI仕様（新規）
- [ ] `docs/design/api/api_maiml_opendata.md` — API仕様書（全面更新）
- [ ] `docs/design/worker/worker_maiml_publish.md` — 公開Workerおよびジョブ仕様書（新規）
- [ ] `docs/design/worker/worker_maiml_unpublish.md` — 非公開Workerおよびジョブ仕様書（新規）

## 実装ステップ

### Phase 1: プロジェクト管理画面仕様書へ公開/非公開ボタン追記
- [ ] `ui_project_management.md` の「ファイル操作ツールバー」セクションに公開/非公開ボタン仕様を追記
- [ ] ポーリング中のボタン状態（disabled・loading・ラベル変化）を記述
- [ ] 関連ダイアログ（MaimlPublishDialog / MaimlUnpublishDialog）への参照リンクを追記
- [ ] 使用するAPIと状態管理（publishStatus / isPolling）を追記

### Phase 2: 公開確認ダイアログUI仕様書を新規作成
- [ ] `ui_maiml_publish_dialog.md` を新規作成
- [ ] ダイアログ仕様（タイトル・本文・ボタン）を記述
- [ ] 操作フロー・エラーメッセージ一覧を記述
- [ ] Props定義・State定義を記述

### Phase 3: 非公開確認ダイアログUI仕様書を新規作成
- [ ] `ui_maiml_unpublish_dialog.md` を新規作成
- [ ] ダイアログ仕様（タイトル・本文・ボタン）を記述
- [ ] 操作フロー・エラーメッセージ一覧を記述
- [ ] Props定義・State定義を記述

### Phase 4: API仕様書を全面更新
- [ ] `api_maiml_opendata.md` を現行実装に合わせて全面書き直し
- [ ] GET /api/v1/projects/:projectName/publish-status の仕様を記述
- [ ] POST /api/v1/projects/:projectName/publish の仕様・プリコンディション・エラーコードを記述
- [ ] POST /api/v1/projects/:projectName/unpublish の仕様・エラーコードを記述

### Phase 5: Worker仕様書を新規作成
- [ ] `docs/design/worker/` フォルダを作成
- [ ] `worker_maiml_publish.md` を新規作成（処理フロー・キュー設定・ジョブペイロード・自動非公開Jobを記述）
- [ ] `worker_maiml_unpublish.md` を新規作成（処理フロー・キュー設定・ジョブペイロードを記述）

## 変更ファイル

### 追記（既存ファイル）
| ファイル | 変更内容 |
|---------|---------|
| `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` | 公開/非公開ボタン仕様・状態管理・関連ダイアログを追記 |
| `docs/design/api/api_maiml_opendata.md` | 現行実装に合わせて全面更新 |

### 新規作成
| ファイル | 説明 |
|---------|------|
| `docs/design/ui/experiment_admin/01_project_management/ui_maiml_publish_dialog.md` | 公開確認ダイアログUI仕様書 |
| `docs/design/ui/experiment_admin/01_project_management/ui_maiml_unpublish_dialog.md` | 非公開確認ダイアログUI仕様書 |
| `docs/design/worker/worker_maiml_publish.md` | 公開Worker・Jobの仕様書 |
| `docs/design/worker/worker_maiml_unpublish.md` | 非公開Worker・Jobの仕様書 |

### 削除（旧設計書）
| ファイル | 削除理由 |
|---------|---------|
| `docs/design/ui/experiment_admin/ui_maiml_publish.md` | 未実装時代の旧設計書。新仕様書に置き換えたため削除 |

### 参照するソースファイル（読み取りのみ）
| ファイル | 内容 |
|---------|------|
| `frontend/src/components/project/ProjectManagement.tsx` | 公開ボタン制御 |
| `frontend/src/components/project/MaimlPublishDialog.tsx` | 公開ダイアログ |
| `frontend/src/components/project/MaimlUnpublishDialog.tsx` | 非公開ダイアログ |
| `frontend/src/hooks/usePublishStatusPoller.ts` | ポーリングフック |
| `backend/src/routes/projectRoutes.ts` | ルーティング定義 |
| `backend/src/controllers/projectController.ts` | コントローラー |
| `backend/src/services/maimlPublishService.ts` | ビジネスロジック |
| `backend/src/workers/maimlPublishWorker.ts` | 公開Workerロジック |
| `backend/src/workers/maimlUnpublishWorker.ts` | 非公開Workerロジック |
| `backend/src/types/maimlOpenData.ts` | 型定義 |
| `backend/src/repositories/maimlPublishJobRepository.ts` | DBアクセス |

## リスク

| リスク | 対策 |
|--------|------|
| 仕様書の内容がソースコードと乖離する | 実装済みソースコードを直接参照して記述する |
| 大規模ファイルのwrite_file失敗 | 段階的に replace_in_file で追記する |

## テスト計画
- [ ] 仕様書の内容がソースコードと一致していることを手動確認

## 承認記録
- **計画書提示日時**: 2026-03-13 16:12
- **承認日時**: 2026-03-13 16:20
- **承認者コメント**: 古い設計書は最後に削除する
