# タスク計画書: システム管理者 E2Eシナリオ修正

## メタデータ
- **作成日時**: 2026-03-24 14:09
- **タスクID**: system_management_e2e_scenario_fix
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`tests/e2e/test-scenarios/2_system_management.md` を修正する。
`tests/e2e/test-scenarios/4_experiment_admin.md` のフォーマットを参考に、
以下を追加・整備する：
- シナリオIDごとの詳細（種別・根拠・対応API）
- 前提条件・後処理
- テスト対象スコープ（スコープ内/外テーブル）
- テスト実行に必要な前提情報（テスト環境・テストユーザー）
- 要件書とUI/API設計書の照合結果
- 参照ドキュメント一覧

## 調査結果

### 設計書と業務内容の対応

| 業務 | UI設計書 | API設計書 | エンドポイント |
|------|---------|---------|--------------|
| システム概要 | `ui_system_overview_main.md` | `api_system_overview.md` | GET `/api/v1/systemManagement/system-overview` |
| ユーザー管理 | `ui_user_main.md` | `api_user_management.md` | `/api/v1/systemManagement/user` (7エンドポイント) |
| セッション | `ui_system_overview_main.md`（カード） | `api_system_overview.md` | 同上（統合） |
| 部署管理 | `ui_department_main.md` | `api_department_management.md` | `/api/v1/systemManagement/department` (7エンドポイント) |
| ロール管理 | `ui_role_main.md` | `api_role_management.md` | `/api/v1/master/role` (8エンドポイント) |

### セッション管理について
- 専用の「セッション一覧画面」は設計書には存在しない
- システム概要画面のカードでセッション数（Redis）を表示するのみ
- → システム概要（2-1グループ）に統合し、専用グループは設けない

### 2-22の誤記
- 現行: 「ロールのCSVファイルをダウンロードして〜ロールを作成」
- 正しくは: ロールのCSVアップロードによるロール作成（「部署」は誤記）

## テストグループ設計

| グループID | グループ名 | シナリオ数 | テスト方法 |
|-----------|-----------|-----------|-----------|
| **2-1** | システム概要 | 7件 | Playwright自動 |
| **2-2** | ユーザー管理 | 16件 | Playwright自動 |
| **2-3** | 部署管理 | 13件 | Playwright自動 |
| **2-4** | ロール管理 | 13件 | Playwright自動 |

## 実装ステップ

- [x] Step 1: タスク計画書の作成（本ファイル）
- [x] Step 2: `2_system_management.md` のヘッダー・スコープセクション作成
- [x] Step 3: `2-1 システム概要`シナリオ詳細を追記
- [x] Step 4: `2-2 ユーザー管理`シナリオ詳細を追記
- [x] Step 5: `2-3 部署管理`シナリオ詳細を追記
- [x] Step 6: `2-4 ロール管理`シナリオ詳細を追記
- [x] Step 7: テスト環境情報・参照ドキュメントセクションを追記

## 変更ファイル

1. `tests/e2e/test-scenarios/2_system_management.md` - 全面リライト

## 承認記録
- **計画書提示日時**: 2026-03-24 14:09
- **承認日時**: 2026-03-24 14:08
