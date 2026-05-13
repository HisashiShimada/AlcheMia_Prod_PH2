# 手動確認チェックリスト（全Phase統合）

自動テスト（107件）はモックを使ったユニットテストのため、  
実際のDBに対するE2E動作確認を以下の観点で実施する。

---

## Phase1: プロジェクト基本操作（projectService → projectRepository 移行）

| # | 確認機能 | 操作 | 期待結果 | 確認 |
|---|---|---|---|---|
| P-1 | プロジェクト一覧取得 | `GET /api/v1/projects` | 200応答。一覧が正しく返る（件数・ソート順） | - [ ] |
| P-2 | プロジェクト作成 | `POST /api/v1/projects` に新規プロジェクト名を送信 | 201応答。DBに新規レコードが作成される | - [ ] |
| P-3 | 重複プロジェクト作成 | 同名で再度 `POST /api/v1/projects` | 409応答（E7001: プロジェクト名重複） | - [ ] |
| P-4 | チェックアウト | `POST /api/v1/projects/:name/checkout` | 200応答。`checkout_status=1`, `project_status=1` に更新される | - [ ] |
| P-5 | 二重チェックアウト | 他ユーザーがチェックアウト中に同エンドポイントを実行 | 409応答（E7002: チェックアウト中） | - [ ] |
| P-6 | チェックイン | `POST /api/v1/projects/:name/checkin` | 200応答。`checkout_status=0` に更新される | - [ ] |
| P-7 | チェックアウト状態確認 | `GET /api/v1/projects/:name/checkout-status` | チェックアウト中/未チェックアウトが正しく返る | - [ ] |

---

## Phase2: 進捗確認（progressService → Repository 移行）

| # | 確認機能 | 操作 | 期待結果 | 確認 |
|---|---|---|---|---|
| W-1 | 作業詳細取得 | `GET /api/v1/progress/projects/:name/work-details` | 200応答。プロジェクト情報・タスク一覧・トランジション進捗が正しく返る | - [ ] |
| W-2 | メソッド別タスク一覧 | W-1 のレスポンスに複数メソッドのタスクが含まれること | method_id・experiment_order 順で正しく並んでいる | - [ ] |
| W-3 | トランジション進捗更新 | `PATCH /api/v1/progress/projects/:name/methods/:methodId/transitions/:id/status` | 200応答。更新後の status が W-1 の再取得で反映されている | - [ ] |

---

## Phase3: プロジェクト詳細操作（projectRepository インラインSQL外出し）

| # | 確認機能 | 操作 | 期待結果 | 確認 |
|---|---|---|---|---|
| D-1 | プロジェクト詳細取得（project_id） | プロジェクト詳細を返す画面/APIを操作 | プロジェクト全カラムが正しく返る | - [ ] |
| D-2 | プロジェクト詳細取得（project_name） | プロジェクト名検索を行うAPIを操作 | 該当プロジェクトが返る | - [ ] |
| D-3 | タスク一覧取得（ステータスフィルタあり） | `GET /api/v1/projects/:name/tasks` でフィルタ条件を指定 | フィルタ条件通りのタスク一覧が返る | - [ ] |
| D-4 | レビュー待ちタスクを一括完了 | `POST /api/v1/projects/:name/tasks/complete-review` | review_waiting (2) のタスクが completed (3) に更新される | - [ ] |
| D-5 | プロジェクト削除 | `DELETE /api/v1/projects/:name` | 200応答。project と関連テーブル（project_task, project_task_detail, instruction など8テーブル）が全件削除される | - [ ] |

---

## Phase4: タスク制御（projectTaskRepository インラインSQL外出し）

| # | 確認機能 | 操作 | 期待結果 | 確認 |
|---|---|---|---|---|
| K-1 | チェックイン時の実行中タスクチェック | task_status=1 のタスクがある状態で `POST /api/v1/projects/:name/checkin` | 400応答（E7007: タスク作業中） | - [ ] |
| K-2 | チェックイン可否（全タスク完了時） | 全タスクが status=3 or 4 の状態で checkin | 200応答（チェックイン成功） | - [ ] |
| K-3 | タスク登録（一括INSERT） | `POST /api/v1/experiment_admin/projects/:name/task-registration` | タスクが正しく登録される。worker_linked_flg が正しく設定される | - [ ] |

---

## Phase5: 認証・ジョブ系（loginHistoryRepository / maimlPublishJobRepository）

| # | 確認機能 | 操作 | 期待結果 | 確認 |
|---|---|---|---|---|
| H-1 | ログイン成功 | `POST /api/v1/auth/login` に正しい認証情報 | 200応答。`login_history` に `login_sf=true` のレコードが追加される | - [ ] |
| H-2 | ログイン失敗 | `POST /api/v1/auth/login` に誤パスワード | 401応答。`login_history` に `login_sf=false` のレコードが追加される | - [ ] |
| H-3 | 二段階認証 | `POST /api/v1/auth/verify-pin` でPIN検証成功 | `entry_execute_flg=true` のレコードが追加される | - [ ] |
| M-1 | MAIMLパブリッシュ | `POST /api/v1/projects/:name/publish` | 200応答。`maiml_publish_job` に新規レコードが追加される | - [ ] |
| M-2 | 公開済みアセットID取得 | 公開完了（status='done'）後に publish-status 取得 | `asset_id` が null でない値で返る | - [ ] |

---

## 優先度

実施順の目安：

### 🔴 必須（リグレッション確認）
- [ ] P-1: プロジェクト一覧取得
- [ ] P-4: チェックアウト
- [ ] P-6: チェックイン
- [ ] W-1: 作業詳細取得
- [ ] H-1: ログイン成功

### 🟡 推奨
- [ ] P-2: プロジェクト作成
- [ ] P-3: 重複チェック
- [ ] P-5: 二重チェックアウト
- [ ] P-7: チェックアウト状態確認
- [ ] W-3: トランジション進捗更新
- [ ] D-4: レビュー完了一括
- [ ] D-5: プロジェクト削除（8テーブル連鎖削除）
- [ ] K-1: 実行中タスクチェック（チェックイン拒否）
- [ ] K-2: 全タスク完了後チェックイン
- [ ] M-1: MAIMLパブリッシュ

### 🟢 余裕があれば
- [ ] D-1〜D-3: プロジェクト詳細・タスクフィルタ
- [ ] K-3: タスク登録
- [ ] H-2: ログイン失敗履歴
- [ ] H-3: 二段階認証履歴
- [ ] M-2: 公開済みアセットID取得
