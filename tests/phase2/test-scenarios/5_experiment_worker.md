# 実験作業者 シナリオテスト対象一覧

> **作成日**: 2026-03-10
> **最終更新日**: 2026-09-09（UI設計書2026-09-09更新分を反映：コメント保存API連携済みに修正・WorkRecordPanel PropCard新機能対応・API実装状況更新）
> **最終更新日**: 2026-08-27（参照設計書バージョン更新: ui_progress_overview_tab.md v3.1.0・ui_work_record_panel.md v3.2.0・ui_issue_management_modal.md v1.5.0・ui_project_selection_modal.md v1.2.0・ui_experiment_comment_dialog.md v1.1.0 / 5-1グループ見直し: MethodTaskSelectionModal 廃止に伴い9件→4件に縮小）
> **最終更新日**: 2026-08-20（設計書リデザイン対応）
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）
> **照合先**: UI設計書（`docs/design/ui/experiment_worker/`）、API設計書（`docs/design/api/API一覧_実験作業者画面.md`）
>
> **フェーズ２更新内容**:
> - フェーズ２新機能として以下のシナリオグループを追加（既存 5-1〜5-5 は変更なし・内容流用）
>   - **5-6: 作業記録パネル（WorkRecordPanel）**（`docs/requirement/phase2/02_experiment_instruction_workerUI/`、`ui_work_record_panel.md` 2026-06-22）
>     - 指示確認（InstructionCollapse）・テンプレート選択・プロパティ入力・保存/スキップ/保存して次へ・コメント記録・カスタム Insertion/Content 操作
> - 2026-09-09 UI設計書更新に伴う追加・修正
>   - **5-6-15** コメント保存の対応APIを修正（`saveTransitionComment` API連携済みに更新）
>   - **5-6-23** 根拠・備考を最新設計書（v3.3.0）に合わせて修正
>   - **5-6-24〜5-6-27** PropertyCard の新機能（定性評価説明・定性評価理由入力欄・判定結果バッジ・quantitativeUncertainties プリセット表示）シナリオを追加
>   - スコープ表・フェーズ注記・API実装状況表・参照ドキュメント表を最新化

---

## 0. テスト実施情報

| 項目 | 値 |
|------|-----|
| テスト実施日 | 2026-03-26 |
| テスト実施者 | Cline |
| テスト環境バージョン | - |
| 総合判定 | - |
| 備考 | - |

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | 根拠 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|------|-----------|-----------|------|-------|-------|
| **5-1** | プロジェクト選択 | 要件書#1、追加機能A、`ui_project_selection_modal.md`（v1.2.0）| 4件 | 手動 | 4 | 0 | 0 |
| **5-2** | 実験記録（トランジション記録） | **廃止**（2026-08-27） | 0件 | — | 0 | 0 | 0 |
| **5-3** | 問題報告・ステータス変更 | 要件書（なし）、追加機能D/E/F/G | 18件 | 手動 | 18 | 0 | 0 |
| **5-4** | プロジェクト指示確認（WorkRecordPanel内）| 要件書#8、`ui_work_record_panel.md`（v3.3.0）| 3件 | 手動 | 3 | 0 | 0 |
| **5-5** | 進捗確認・承認依頼 | 要件書#1、追加機能C/K、`docs/改善仕様調査/No.23/result.md`（No.23対応）、`ui_progress_overview_tab.md`（**v3.1.0** / 2026-09-09: 変更履歴重複削除のみ・機能変更なし）| 15件 | 手動 | 12 | 0 | 0 |
| **5-6** | 作業記録パネル（WorkRecordPanel） | `docs/requirement/phase2/02_experiment_instruction_workerUI/`、`ui_work_record_panel.md`（**v3.3.0** / 2026-09-09: PropertyCard新機能追加・API連携状況更新）。API接続済み・カテゴリ別グループ表示・状態記録ダイアログ・指示確認フロー（preparing→ready→in_progress）・状態プルダウン活性化・is_recorded管理・スキップ制御・承認依頼条件 | 27件 | 手動 + 手動 | 27 | 0 | 0 |
| **合計** | - | - | **67件** | - | **64** | **0** | **0** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| 操作履歴の閲覧（要件書#9） | 設計書に実装なし |
| システムダウン通知（要件書#10） | 設計書に実装なし |
| 削除データ通知（要件書#11） | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 5-1: プロジェクト選択

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-1-1 | プロジェクト選択エリアのコンボボックスに実験作業可能なプロジェクトが表示されること | 正常系 | 追加機能A、`ui_project_selection_modal.md` §1.3 | GET `/api/v1/projects/worker-accessible` | OK | |
| 5-1-2 | 「選択」ボタンでプロジェクト選択モーダル（`ProjectSelectionModal`）が開くこと | 正常系 | 追加機能A | - | OK | |
| 5-1-3 | プロジェクト選択モーダルでプロジェクト名・プロジェクトコードのあいまい検索が機能すること | 正常系 | `ui_project_selection_modal.md` §6.1 | - | OK | 旧 5-1-6 を繰り上げ（2026-08-27）|
| 5-1-4 | プロジェクト選択モーダルでプロジェクト名フィルターが機能すること | 正常系 | `ui_project_selection_modal.md` §6.2 | - | OK | 旧 5-1-7 を繰り上げ（2026-08-27）|

**前提条件:**
- 実験作業者ロールでログイン済み
- 実験作業者メニューが表示されている
- テスト用プロジェクト（status: in_progress）がDBに存在する

**スコープ外（廃止）:**

| 旧シナリオID | 廃止理由 |
|------------|---------|
| 5-1-3（旧）プロジェクト変更時にメソッドとタスクがリセットされること | メソッド・タスク選択UIが `ExperimentWorkerMenu` から削除済み（2026-08-27）|
| 5-1-4（旧）メソッド・タスク選択モーダルでメソッドタブを切り替えてタスクを選択できること | `MethodTaskSelectionModal` が未使用（2026-08-27）|
| 5-1-5（旧）メソッド・タスク選択モーダルでタスク名フィルタが機能すること | 同上 |
| 5-1-8（旧）メソッド・タスク選択モーダルでステータスフィルターが機能すること | 同上 |
| 5-1-9（旧）メソッド・タスク選択モーダルで複数フィルター条件がAND条件で適用されること | 同上 |

---

### 5-3: 問題報告・ステータス変更

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-3-1 | トランジションの「問題報告」ボタンで問題管理モーダルが開くこと | 正常系 | 追加機能D | GET `/api/v1/issues` | OK | |
| 5-3-2 | 問題管理モーダルで新しい問題を報告できること | 正常系 | 追加機能D | POST `/api/v1/issues` | OK | |
| 5-3-3 | 問題管理モーダルで既存の問題にコメントを投稿できること | 正常系 | 追加機能E | POST `/api/v1/issues/comments` | OK | |
| 5-3-4 | タイトルが未入力の場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | |
| 5-3-5 | 問題一覧がステータスでフィルタリングできること | 正常系 | 追加機能F | GET `/api/v1/issues` | OK | |
| 5-3-6 | 未解決の問題を解決済みに変更できること | 正常系 | 追加機能G | PATCH `/api/v1/issues/status` | OK | |
| 5-3-7 | 解決済みの問題を未解決に戻せること | 正常系 | 追加機能G | PATCH `/api/v1/issues/status` | OK | |
| 5-3-8 | 内容が未入力の場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | |
| 5-3-9 | 問題タイプが未選択の場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | |
| 5-3-10 | 内容が10文字未満の場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | |
| 5-3-11 | タイトルが100文字を超える場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | https://soft-service.atlassian.net/browse/AISOLMAIML-349?atlOrigin=eyJpIjoiZGVkYjYzNzg4OTYyNGIzYWJkZWE0ZGUzNzNlN2Y4ZDAiLCJwIjoiaiJ9 |
| 5-3-12 | 内容が1000文字を超える場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | https://soft-service.atlassian.net/browse/AISOLMAIML-350?atlOrigin=eyJpIjoiZGM2ODQyYjc2ZmY1NDUyMzk4OTczZWNmOTk3YTk2MjAiLCJwIjoiaiJ9 |
| 5-3-13 | 問題一覧で問題を選択すると詳細エリアにタイトル・状態・対象・報告者・報告時刻・内容が表示されること | 表示確認 | `ui_issue_management_modal.md` §7.2 | - | OK | |
| 5-3-14 | 問題詳細にコメントが存在する場合、コメント一覧（投稿者名・投稿時刻・コメント内容）が表示されること | 表示確認 | `ui_issue_management_modal.md` §7.2 | - | OK | |
| 5-3-15 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合に新規の問題報告ができないこと | 表示確認 | `ui_issue_management_modal.md` §4.3 | - | 不要 | 承認待ちプロジェクトは実験作業者画面に表示されない |
| 5-3-16 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合にコメントの投稿ができないこと | 表示確認 | `ui_issue_management_modal.md` §4.3 | - | 不要 | 承認待ちプロジェクトは実験作業者画面に表示されない |
| 5-3-17 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合にステータスの更新ができないこと | 表示確認 | `ui_issue_management_modal.md` §4.3 | - | 不要 | 承認待ちプロジェクトは実験作業者画面に表示されない |
| 5-3-18 | 実験作業者メニューの「問題報告」ボタンを押すと `IssueManagementModal` が開くこと | 正常系 | `ui_screen_transition.md` §3（2026-08-26更新）、`ui_issue_management_modal.md` | GET `/api/v1/issues` | OK | バグ修正確認: `IssueManagementModal` の import と JSX レンダリングが欠落していた問題の解消。ボタン活性条件: プロジェクトが選択済みであること |

**前提条件:**
- 実験作業者ロールでログイン済み（5-3-1〜5-3-18）
- Manager権限ユーザーでログイン済み（5-3-6、5-3-7）
- プロジェクト・メソッド・タスクが選択済み
- 実験記録タブが表示されトランジション一覧が表示されている
- 問題データが1件以上存在すること（5-3-13、5-3-14）
- コメントが1件以上存在する問題データが存在すること（5-3-14）
- **5-3-18 用**: プロジェクトが選択済みであること（問題報告ボタン活性条件）

**ビジネスルール（設計書より）:**
- 実験作業者は問題報告・コメント投稿・ステータス更新が可能
- プロジェクトが承認依頼中（`waiting_approval`）の場合は問題のコメント投稿・ステータス変更が不可（`ui_issue_management_modal.md` §4.3）
- 問題タイプの選択肢はコードマスターAPI（`useCodeMaster('issue_type')`）から動的取得

**新規問題報告フォームのバリデーション（`ui_issue_management_modal.md` §8.1、§8.2 より）:**

| 項目 | 入力タイプ | バリデーション | 対応シナリオ |
|------|-----------|---------------|------------|
| タイトル | Input | 必須 | 5-3-4 |
| タイトル | Input | 最大100文字 | 5-3-11 |
| 対象 | Select | 必須（初期値: `transition`） | ※初期値あり、通常は未選択にならない |
| 問題タイプ | Select | 必須 | 5-3-9 |
| 内容 | TextArea | 必須 | 5-3-8 |
| 内容 | TextArea | 最小10文字 | 5-3-10 |
| 内容 | TextArea | 最大1000文字 | 5-3-12 |

**問題詳細の表示項目（`ui_issue_management_modal.md` §7.2 より）:**

| 表示項目 | 内容 | 対応シナリオ |
|---------|------|------------|
| タイトル | 選択した問題のタイトル（太字） | 5-3-13 |
| 状態 | ステータスタグ（未解決：オレンジ / 解決済：緑） | 5-3-13 |
| 対象 | 対象タイプ + 対象名（例：「トランジション: xxx」） | 5-3-13 |
| 報告者 | 報告者のユーザー名 | 5-3-13 |
| 報告時刻 | 日本語ロケール形式（例：2026/3/13 13:00:00） | 5-3-13 |
| 内容 | 問題の詳細内容（背景色あり） | 5-3-13 |
| コメント一覧 | コメント数、各コメントの投稿者名・投稿時刻・内容 | 5-3-14 |

---

### 5-4: プロジェクト指示確認（WorkRecordPanel内のInstructionCollapse）

| シナリオ数 | **3件** |
|---------|---------|

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-4-1 | 実験記録タブ（`WorkRecordPanel`）上部の `InstructionCollapse` にプロジェクト指示が表示されること | 正常系 | `ui_work_record_panel.md` §2.2（InstructionCollapse）| GET `/api/v1/instructions` | OK | 黄色背景 `#fffbe6`、折りたたみ表示、右端に「指示確認」ボタン |
| 5-4-2 | `InstructionCollapse` の折りたたみ・展開が機能すること | 正常系 | `ui_work_record_panel.md` §2.2 | - | OK | |
| 5-4-3 | `InstructionCollapse` 右端の「指示確認」ボタンを押すと `PUT .../confirm` API が呼ばれ、`preparing` 状態のトランジションが `ready` に遷移すること | 正常系 | `ui_work_record_panel.md` §1.2、`ExperimentWorkerMenu.tsx` L211-256 | PUT `/api/v1/instructions/{instructionId}/confirm` | OK | 対象: 未確認のプロジェクト指示のみ（methodId・transitionId なし）https://soft-service.atlassian.net/browse/AISOLMAIML-351?atlOrigin=eyJpIjoiMWFiOTZkZTNlNzAxNDUwMDg4OTFmOWNhNmM3NzJjMmYiLCJwIjoiaiJ9 |

**前提条件:**
- 実験作業者ロールでログイン済み
- プロジェクトが選択済み（実験記録タブが表示されていること）
- テスト用プロジェクトにプロジェクト指示データが登録済み（project_instructionテーブル、methodId=null、transitionId=null）
- 5-4-3 用: preparing 状態のトランジションが1件以上存在すること

### スコープ外（廃止）

| 旧シナリオ範囲 | 廃止理由 |
|------------|--------|
| 5-4-1～5-4-10（旧全10件） | 指示確認タブ（InstructionConfirmationTab）が `ExperimentWorkerMenu` に存在しない。タスク・トランジション単位の個別確認ボタンも現在のUIには存在しない。2026-08-27 確認 |

---
### 5-5: 進捗確認・承認依頼

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-5-1 | 進捗確認タブでタスク一覧が表示されること | 正常系 | 要件書#1、追加機能C | GET `/api/v1/worker/tasks` | OK | |
| 5-5-2 | 「記録」ボタンをクリックすると実験記録タブに遷移すること | 正常系 | 要件書#1 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | OK | https://soft-service.atlassian.net/browse/AISOLMAIML-395 |
| 5-5-3 | 進捗確認タブ表示時に、全トランジション完了 (`allCompleted`) かつ 全記録済み (`allRecorded`) の場合「承認依頼」ボタンが表示されること | 表示確認 | 追加機能K | - | OK | |
| 5-5-9 | フロー図ボタンをクリックするとフロー図ダイアログが表示されること | 正常系 | `ui_task_list_table.md` §5.2 | - | OK | |
| 5-5-13 | 「承認依頼」ボタンをクリックすると承認依頼が送信され、成功メッセージが表示されること | 正常系 | `ui_experiment_worker_main.md` §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | OK | |
| 5-5-14 | 承認依頼送信後にプロジェクトステータスが「承認待ち（waiting_approval）」に更新されること | 正常系 | `ui_experiment_worker_main.md` §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | OK | |
| 5-5-15 | 既に承認依頼済みのプロジェクトで再度「承認依頼」ボタンをクリックするとエラーメッセージが表示されること | 異常系 | `ui_experiment_worker_main.md` §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | OK | |
| 5-5-21 | `ProgressOverviewTab` の SummaryCard に全体進捗率・タスク完了数・ステータス別件数（未着手/作業中/完了）が表示されること | 表示確認 | `ui_progress_overview_tab.md` §6.1（SummaryCard）、v2.0.0 | - | OK | 完了100%時はバー緑色、それ以外は青色 |
| 5-5-22 | `ProgressOverviewTab` の FilterBar でメソッド名・タスクNo・トランジション名・ステータスの各フィルタが機能すること | 正常系 | `ui_progress_overview_tab.md` §6.2（FilterBar）、v2.0.0 | - | OK | メソッドフィルタ変更時はトランジションフィルタが自動リセットされること |
| 5-5-23 | 前提トランジション（`prerequisiteTransitionIds`）が未完了の場合に「開始」ボタンが disabled になり、Tooltip が表示されること | 表示確認 | `ui_progress_overview_tab.md` §9（操作ボタン仕様）、§10（前提チェックロジック）、v2.0.0 | - | OK | Tooltip: 「前の順序のトランジションを先に完了してください」 |
| 5-5-24 | `on_hold`（一時停止）ステータスのトランジション行に「再開」ボタンが表示され、クリックすると作業記録タブに遷移すること | 表示確認 | `ui_progress_overview_tab.md` §9（操作ボタン仕様）、v2.0.0 | - | 不要 | 実装では全ステータス共通「記録」ボタンのみ（v3.1.0 修正済み）。「再開」ボタンは実装に存在しない |
| 5-5-25 | 完了済みトランジション行に「詳細確認」ボタンが表示され、クリックすると作業記録タブが読取専用で開くこと | 正常系 | `ui_progress_overview_tab.md` §9（操作ボタン仕様）、v2.0.0 | - | 不要 | 実装では全ステータス共通「記録」ボタンのみ（v3.1.0 修正済み）。「詳細確認」ボタン・`onViewDetail` は実装に存在しない |
| 5-5-26 | 作業中（`in_progress`）トランジション行に「作業へ」ボタンが表示され、クリックすると作業記録タブに遷移すること | 正常系 | `ui_progress_overview_tab.md` §9（操作ボタン仕様）、v2.0.0 | - | 不要 | 実装では全ステータス共通「記録」ボタンのみ（v3.1.0 修正済み）。「作業へ」ボタンは実装に存在しない |
| 5-5-27 | 全トランジションが `completed` であっても `isRecorded=false` の行が1件でもある場合、「承認依頼」ボタンが disabled であること | 表示確認 | `ui_work_record_panel.md` §6.3（v3.1.0）、`ui_progress_overview_tab.md` | - | OK | `progressRows` の全行で `isRecorded=true` であることが承認依頼ボタン活性の必要条件 |
| 5-5-28 | 全トランジションが `completed` かつ全て `isRecorded=true` の場合、「承認依頼」ボタンが活性化されること | 表示確認 | `ui_work_record_panel.md` §6.3（v3.1.0）、`ui_progress_overview_tab.md` | - | OK | 全完了 + 全記録済みの両条件を同時に満たした場合のみ活性 |

**前提条件:**
- 実験作業者ロールでログイン済み
- テスト用プロジェクトにタスクデータが存在する（project_taskテーブル）
- プロジェクトが選択済み
- 5-5-21〜5-5-28（`ProgressOverviewTab` 新機能）用: `ProgressRow[]` データとして複数のトランジション（未着手・作業中・一時停止・完了・前提あり）が存在すること
- **5-5-27 用**: 全トランジションが `completed` かつ少なくとも1件が `isRecorded=false` のテストデータが存在すること
- **5-5-28 用**: 全トランジションが `completed` かつ全件 `isRecorded=true` のテストデータが存在すること

**ビジネスルール（設計書より）:**

#### テーブル内アクションボタンの活性/非活性条件（`ui_task_list_table.md` §5.3 より）

| ボタン名 | アクション | 常時有効 | 有効条件（タスクステータス） | 有効条件（プロジェクトステータス） |
|---------|-----------|---------|---------------------------|--------------------------------|
| 指示確認 | `instruction` | ✅ 常に有効 | - | - |
| 開始 | `start` | - | `not_started`（開始前）のみ | `waiting_task` または `executing_task` のみ（isEditableStatus） |
| 問題確認 | `issueCheck` | ✅ 常に有効 | - | - |
| 実験記録 | `record` | ✅ 常に有効 | - | - |
| 強制終了 | `forceTerminate` | - | `completed`・`forced_terminated` 以外 | `waiting_task` または `executing_task` のみ（isEditableStatus） |

#### プロジェクトステータスと isEditableStatus の対応

| プロジェクトステータス（数値） | isEditableStatus | 開始・強制終了ボタン |
|------------------------------|-----------------|-------------------|
| 0（計画中） | false | **無効** |
| 1（タスク実行待ち） | **true** | 有効 |
| 2（タスク実行中） | **true** | 有効 |
| 3（承認待ち） | false | **無効** |
| 4（完了） | false | **無効** |
| 5（異常終了） | false | **無効** |

#### タスクステータスの表示（`ui_task_list_table.md` §8.3 より）

| TaskStatus | 表示ラベル | バッジ色 |
|-----------|-----------|---------|
| `not_started` | 開始前 | default（灰色） |
| `in_progress` | 作業中 | orange（オレンジ色） |
| `completed` | 完了 | green（緑色） |
| `forced_terminated` | 強制終了 | red（赤色） |

#### 承認依頼API（`ui_experiment_worker_main.md` §15.2 より）

- エンドポイント: `PATCH /api/v1/projects/{projectName}/approval-request`
- パスパラメータは `projectId`（UUID）ではなく **`projectName`**（プロジェクト名の文字列）を使用
- 成功後にプロジェクト一覧を再取得してステータスをUIに反映

---

### 5-6: 作業記録パネル（WorkRecordPanel）

#### 5-6-A: 画面表示・指示確認

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-6-1 | 実験作業者メニューの「作業記録」タブ（key='3'）をクリックすると `WorkRecordPanel` が表示されること | 正常系 | `ui_work_record_panel.md` §1.1、§2.2 | - | OK | |
| 5-6-2 | `WorkRecordPanel` の上部にプロジェクト指示の折りたたみ（`InstructionCollapse`）が表示され、展開するとプロジェクト指示内容が確認できること | 正常系 | `ui_work_record_panel.md` §1.2（プロジェクト指示の確認）、要件 F-01-04 | GET `/api/v1/instructions` | OK | 黄色背景 `#fffbe6` で表示されること |
| 5-6-3 | `WorkHeader` にステータスTag・タスク番号・メソッドID・トランジションIDが表示されること | 表示確認 | `ui_work_record_panel.md` §2.2（WorkHeader） | - | OK | |
| 5-6-4 | 完了済みトランジションを閲覧する場合は「完了済み（参照のみ）」Alertと「戻る」ボタンが表示されること | 表示確認 | `ui_work_record_panel.md` §2.2（完了済み閲覧） | - | OK | |

#### 5-6-B: テンプレート選択・プロパティ入力

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-6-5 | 左サイドバーのテンプレート一覧（材料/条件/結果の種別）が表示されること | 表示確認 | `ui_work_record_panel.md` §2.2（Sider 280px）、要件 F-07-01 | - | OK | テンプレート数・検索Input・種別Selectが表示されること |
| 5-6-6 | テンプレート名検索Inputでテンプレート一覧が絞り込まれること | 正常系 | `ui_work_record_panel.md` §1.2（テンプレート選択） | - | OK | |
| 5-6-7 | 種別Select（Material/Condition/Result）でテンプレート一覧が絞り込まれること | 正常系 | `ui_work_record_panel.md` §1.2（テンプレート選択）、要件 F-07-01 | - | OK | |
| 5-6-8 | テンプレートを選択すると右コンテンツ部分に `[Category Tag] テンプレート名` と3列グリッドのプロパティカードが表示されること | 正常系 | `ui_work_record_panel.md` §2.2（Content）、要件 F-07-01 | - | OK | |
| 5-6-9 | プロパティカードごとに実績値を入力できること（文字列・数値・真偽値等の xsi:type 対応） | 正常系 | `ui_work_record_panel.md` §1.2（プロパティカードごとの実績値入力）、要件 F-07-01 | - | OK | https://soft-service.atlassian.net/browse/AISOLMAIML-398 |
| 5-6-10 | 定性評価タイプのプロパティカードで確信度（qualitativeOptions セレクタ）を選択できること | 正常系 | `ui_work_record_panel.md` §1.2（確信度（定性評価）追加）、要件 F-08-01 | - | OK | 不確かさ基準マスター（`/for-selector`）から選択肢を取得すること |
| 5-6-11 | 定量評価タイプのプロパティカードで定量評価値（数値・単位）を追加できること | 正常系 | `ui_work_record_panel.md` §1.2（定量評価追加）、要件 F-08-01 | - | OK | |

#### 5-6-C: 保存・スキップ・完了操作

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-6-12 | 「保存」ボタンをクリックすると入力した実績値が保存されること | 正常系 | `ui_work_record_panel.md` §1.2（保存）、要件 F-07-01 | POST `/api/v1/experiments/…/data` | OK | |
| 5-6-13 | 「スキップ」ボタンをクリックすると現在のトランジションをスキップして次のトランジションに遷移すること | 正常系 | `ui_work_record_panel.md` §1.2（スキップ）、要件 F-07-01 | - | OK | |
| 5-6-14 | 「保存して次へ」（トランジション完了）ボタンをクリックすると実績値を保存してトランジションを完了状態にし、次のトランジションへ遷移すること | 正常系 | `ui_work_record_panel.md` §1.2（保存して次へ（トランジション完了））、要件 F-09-01 | POST `/api/v1/experiments/…/data`、PATCH `…/transitions/…/status` | OK | |

#### 5-6-D: コメント・カスタム Insertion/Content

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-6-15 | 「コメント」ボタンをクリックすると `ExperimentCommentDialog` が開き、コメントを記録できること | 正常系 | `ui_work_record_panel.md` §1.2（コメント記録（ExperimentCommentDialog））、`ui_experiment_comment_dialog.md`（**v1.2.0** / 2026-09-09: API連携済みに更新）、要件 F-07-01 | PATCH `/api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/status` | OK | `saveTransitionComment` API でコメントを保存する。成功時 `modal.success`・失敗時 `message.error` が表示されること。`projectId` または `methodId` が未設定の場合は `console.warn` のみで処理中断 |
| 5-6-16 | カスタム Insertion（ファイル添付）を追加できること | 正常系 | `ui_work_record_panel.md` §1.2（カスタム Insertion（ファイル添付）追加・削除） | POST `/api/v1/files/upload` | OK | |
| 5-6-17 | 追加したカスタム Insertion（ファイル添付）を削除できること | 正常系 | `ui_work_record_panel.md` §1.2（カスタム Insertion（ファイル添付）追加・削除） | DELETE `/api/v1/files/…` | OK | |
| 5-6-18 | カスタム Content（DataGrid）を追加・編集・削除できること | 正常系 | `ui_work_record_panel.md` §1.2（カスタム Content（DataGrid）追加・削除） | POST `/api/v1/experiments/…/data` | OK | |

#### 5-6-E: is_recorded フラグ・スキップ制御・表示優先順位

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-6-19 | 実験データを保存すると対象トランジションの `is_recorded` フラグが `TRUE` に更新されること | 正常系 | `ui_work_record_panel.md` §1.2（v3.1.0）、`transition_data` テーブル | POST `/api/v1/experiments/…/data` | OK | 保存後に `transition_data.is_recorded=TRUE` をDBで直接確認する |
| 5-6-20 | `in_progress`（動作状態）のトランジションが選択中のとき「スキップ」ボタンが disabled であること | 表示確認 | `ui_work_record_panel.md` §6.1（v3.1.0） | - | OK | バグ修正確認: in_progress時はスキップ不可 |
| 5-6-21 | `ready`（準備完了）のトランジションが選択中のとき「スキップ」ボタンが活性であること | 表示確認 | `ui_work_record_panel.md` §6.1（v3.1.0） | - | OK | |
| 5-6-22 | トランジション一覧の表示順が `in_progress` > `ready` > `preparing`（同一ステータス内は `order` 昇順）であること | 表示確認 | `ui_work_record_panel.md` §10.2 #10（v3.1.0） | - | OK | 複数のトランジションが各ステータスに混在するテストデータで確認する |
| 5-6-23 | 定性評価プロパティカードの確信度ボタン選択肢（`qualitativeOptions`）が `intuition_selector` テーブル由来の値で表示され、`confidenceOptionsWithColor` がある場合はボタン色に反映されること | 表示確認 | `ui_work_record_panel.md` §4（WorkProperty型定義）、§5.3（確信度）（v3.3.0） | - | OK | `display_color` フィールドが存在する選択肢でボタン色が変化することを確認する |

#### 5-6-F: PropertyCard 新機能（2026-09-09 追加）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-6-24 | 定性評価プロパティカードの確信度ボタン横に `description`（評価説明）が表示されること | 表示確認 | `ui_work_record_panel.md` §5.3（定性評価説明）（v3.3.0） | - | OK | |
| 5-6-25 | 定性評価プロパティカードに定性評価理由の入力欄（TextArea）が表示され、入力した値が保存されること | 正常系 | `ui_work_record_panel.md` §5.3（定性評価理由入力欄）（v3.3.0） | POST `/api/v1/experiments/…/data` | OK | |
| 5-6-26 | 定量評価プロパティカードに判定結果バッジ（合格/不合格/判定中等）が表示されること | 表示確認 | `ui_work_record_panel.md` §5.4（判定結果バッジ）（v3.3.0） | GET `/api/v1/experiments/…/data` | OK | |
| 5-6-27 | 定量評価プロパティカードに `quantitativeUncertainties` プリセット値が表示され、選択すると入力欄に反映されること | 正常系 | `ui_work_record_panel.md` §5.4（quantitativeUncertainties プリセット表示）（v3.3.0） | - | OK | |

**前提条件:**
- 実験作業者ロールでログイン済み
- 実験作業者メニューが表示されていること
- テスト用プロジェクト（status: executing_task）が選択済みであること
- トランジションが選択済みであること（`WorkRecordPanel` はトランジション単位で作業記録を行う）
- テスト用MAIMLファイルにテンプレート（Material/Condition/Result）が1件以上定義されていること
- 5-6-10（定性評価）用: 不確かさ基準マスター（`uncertainty_criteria` テーブル）に有効な基準（evaluationMethod=2）が1件以上存在すること
- 5-6-11（定量評価）用: 不確かさ基準マスターに有効な基準（evaluationMethod=1）が1件以上存在すること
- 5-6-14（保存して次へ）用: 現在のトランジションの次のトランジションが存在すること
- **5-6-19 用**: トランジションが未保存状態であること（`is_recorded=FALSE`）
- **5-6-20〜5-6-21 用**: `in_progress` および `ready` ステータスのトランジションが存在するテストデータ
- **5-6-22 用**: `in_progress`・`ready`・`preparing` の各ステータスが混在するトランジションが存在するテストデータ
- **5-6-23 用**: `description` フィールドが設定された定性評価プロパティが存在するMAIMLテンプレート

**後処理:**
- 保存した実験データを `experiment_data` テーブルから削除（5-6-12〜5-6-14、5-6-15〜5-6-19）
- アップロードしたファイルを S3 から削除（5-6-16）

**注意事項:**
- フェーズB完了。実APIデータで動作
- 5-6-19〜5-6-23（フェーズB追加機能）はフェーズB完了後に実施
- 定性評価・定量評価のプロパティカード（5-6-10〜5-6-11）は不確かさ基準マスターのフェーズ２新機能（4-19）と連携している
- `ExperimentCommentDialog`（5-6-15）は `docs/design/ui/experiment_worker/ui_experiment_comment_dialog.md` に別途設計書あり

---

## 3. テスト実行に必要な前提情報

### 3.1 テスト環境

| 項目 | 値 |
|------|-----|
| フロントエンドURL | http://localhost:3000 |
| バックエンドURL | http://localhost:3001 |
| DB接続 | PostgreSQL（直接接続でDB検証用） |
| 組織ID（orgId） | 要確認（testers.tsに定義） |

### 3.2 テストユーザー

| ロール | ユーザーID | パスワード | 用途 |
|--------|-----------|-----------|------|
| experiment_worker | 要確認 | 要確認 | 5-1〜5-5（基本シナリオ） |
| experiment_admin（Manager） | 要確認 | 要確認 | 5-3-6、5-3-7（問題ステータス変更） |

### 3.3 テスト用データ

| データ | 用途 | 準備方法 |
|--------|------|---------|
| テスト用プロジェクト（status: executing_task） | 5-1, 5-3, 5-4, 5-5, 5-6 | DBに事前挿入 |
| プロジェクトに紐づくメソッド・タスク | 5-1, 5-5, 5-6 | project_taskテーブルに挿入 |
| トランジションデータ（transition_setテーブル） | 5-3, 5-6 | MAIMLから生成 |
| 指示データ（project_instructionテーブル） | 5-4 | DBに事前挿入 |
| 承認依頼前プロジェクト（status: executing_task） | 5-5-13〜5-5-15 | DBに事前挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 1 | タスクの選択・実行（作業開始・中断・再開） | ✅ `ProgressCheckTab`（メソッド・タスク選択モーダルは廃止済み。現在はプロジェクト選択のみ） | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | **5-1, 5-5** |
| 2 | ワークフローに従った作業手順の順次実行 | ✅ `WorkRecordPanel`（トランジション単位で作業記録） | GET `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | **5-6** |
| 3 | 実験条件（実験者名・作業記録・実験結果・計測結果・実験ログ）の登録 | ✅ `WorkRecordPanel`（旧 `DataRecordDialog` は廃止） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-6** |
| 4 | 実験作業中のメモ・気づきの入力（作業手順に紐づいて記録） | ✅ `WorkRecordPanel`（ExperimentCommentDialog 経由、旧 `DataRecordDialog` は廃止）（コメント欄） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-6** |
| 5 | 事前設定条件と異なる実験条件で実施した場合の実際条件の記録 | ✅ `WorkRecordPanel`（PropertyCard 経由、旧 `DataRecordDialog` は廃止）（ステータス・コメント入力） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-6** |
| 6 | 計測・分析結果の登録（計測・分析システムからのデータ取得） | ✅ `WorkRecordPanel`（PropertyCard 経由、旧 `DataRecordDialog` は廃止） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-6** |
| 7 | 作業手順ごとの実験機器・計測装置の操作 | ✅ `WorkRecordPanel`（旧 `TransitionList` は廃止）（記録ボタン） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-6** |
| 8 | 実験管理者からの指示事項・注意事項の確認 | ✅ `WorkRecordPanel`（`InstructionCollapse` + `InstructionConfirmationModal`。旧 `InstructionConfirmationTab` は廃止） | GET `/api/v1/instructions` | **5-4** |
| 9 | 実験作業者の操作履歴の閲覧 | ❌ 設計書に未定義 | - | **対象外** |
| 10 | システムダウン時の状態通知の受信 | ❌ 設計書に未定義 | - | **対象外** |
| 11 | 削除データの通知の受信 | ❌ 設計書に未定義 | - | **対象外** |

---

## 5. 追加機能一覧（要件書に未記載・設計書に実装済み）

設計書を精査した結果、要件書に記載のない以下の機能が実装されていることが確認された。これらもテスト対象に追加する。

| 追加機能ID | 機能名 | 根拠（設計書） | 対応API | テスト対象 |
|-----------|--------|---------------|---------|-----------|
| A | プロジェクト選択（コンボボックス + 選択モーダル） | `ui_project_selection_modal.md`（v1.2.0）、`ExperimentWorkerMenu.tsx` | GET `/api/v1/projects/worker-accessible` | **5-1** |
| B | ~~メソッド・タスク選択モーダル（タブ切り替え・フィルタリング）~~ | ~~`ui_method_task_selection_modal.md`~~（廃止。`MethodTaskSelectionModal` は `ExperimentWorkerMenu` から削除済み。2026-08-27 確認） | - | ~~**5-1**~~（**廃止**）|
| C | 進捗確認タブでのタスク一覧表示（メソッドタブ切り替え） | `ui_progress_check_tab.md`, `ui_progress_check_table.md` | GET `/api/v1/worker/tasks` | **5-5** |
| D | 問題報告（トランジション単位・タスク単位） | `ui_transition_list.md` §5.2, `ui_issue_management_modal.md` | POST `/api/v1/issues` | **5-3** |
| E | 問題へのコメント投稿 | `ui_issue_management_modal.md` | POST `/api/v1/issues/comments` | **5-3** |
| F | 問題一覧の確認（フィルタリング・ページネーション） | `ui_issue_management_modal.md` | GET `/api/v1/issues` | **5-3** |
| G | 問題ステータス変更（未解決⇔解決済） | `ui_issue_management_modal.md` §8 | PATCH `/api/v1/issues/status` | **5-3** |
| H | 指示の表示（InstructionCollapse + InstructionConfirmationModal）| `ui_work_record_panel.md`（v3.2.0）| GET `/api/v1/instructions` | **5-4** |
| I | InstructionCollapse の折りたたみ/展開 | `ui_work_record_panel.md` §2.2 | - | **5-4** |
| J | 指示確認完了ボタン（グループ単位・全体一括） | `ui_instruction_group.md` §6.2, `ui_instruction_confirmation_tab.md` §3.2 | PUT `/api/v1/instructions/{instructionId}/confirm` | **5-4** |
| K | 承認依頼（進捗確認タブから送信） | `ui_experiment_worker_main.md` §3.2.3, §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | **5-5** |
| L | トランジションのフロー図表示（TransitionFlowDiagram） | `ui_progress_overview_tab.md`（フロー図モードは `ProgressOverviewTab` で実装）| - | **5-5** |
| M | 実験データ保存後のテンプレート実績取得 | `ui_work_record_panel.md`（WorkRecordPanel で実装、旧 DataRecordDialog は廃止）| GET `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-6** |
| N | 記録済みバッジ表示 | `ui_work_record_panel.md`（10.2: hasRecord）| - | **5-6** |
| O | 指示確認タブのフロー図ダイアログ表示（ドラッグ&リサイズ） | `ui_instruction_flow_dialog.md` | GET `/api/v1/projects/:projectName/maiml` | **5-4** |
| P | 全ての指示の一括確認完了 | `ui_instruction_confirmation_tab.md` §3.2 | PUT `/api/v1/instructions/{instructionId}/confirm` | **5-4** |
| Q | 組織設定によるみなし進捗 (`useDeemedProgress` Prop) | `ui_work_record_panel.md`（WorkRecordPanel Prop）| - | **5-6** |

---

## 6. 設計書との差異・懸念事項

### 6.1 旧テストシナリオからの主な変更点

#### 2026-03-13

| # | 変更内容 | 詳細 |
|---|---------|------|
| 1 | 5-1グループにシナリオを追加（計5件→9件） | プロジェクト選択モーダルのあいまい検索・プロジェクト名フィルター、メソッド・タスク選択モーダルのステータスフィルター・AND条件適用を追加（5-1-6〜5-1-9）。※2026-08-27 にメソッド・タスク関連5件を廃止・削除し、9件→4件に縮小 |
| 2 | 5-1-5の根拠を `§7` → `§7.2` に修正 | より具体的なセクション番号に更新 |
| 3 | 5-2グループにシナリオを追加（計23件→24件） | プロパティリストタイプのプロパティ追加・削除を追加（5-2-24） |
| 4 | 5-3グループにシナリオを追加（計7件→14件）・補足情報追加 | バリデーション（内容必須・問題タイプ必須・内容最小10文字・タイトル最大100文字・内容最大1000文字）と問題詳細表示項目確認（基本情報・コメント一覧）を追加（5-3-8〜5-3-14）、前提条件・バリデーション詳細表・問題詳細表示項目表を追記 |
| 5 | 合計件数を64件→71件に修正 | 5-3グループの増加（+7件）に伴う更新 |
| 6 | 5-5グループにシナリオを追加（計15件→16件） | メソッドタブが`project_task`テーブルの`experiment_order`の昇順で表示されることを確認するシナリオを追加（5-5-16）、合計件数を71件→72件に修正 |
| 7 | waiting_approval時の操作制限シナリオを追加（計72件→78件） | 5-2グループに2件追加（実験データ入力・保存不可、ステータス更新不可）、5-3グループに3件追加（新規問題報告不可、コメント投稿不可、ステータス更新不可）、5-4グループに1件追加（確認完了ボタン非活性）（5-2-25〜5-2-26、5-3-15〜5-3-17、5-4-10） |

#### 2026-08-20（設計書リデザイン対応）

| # | 変更内容 | 詳細 |
|---|---------|------|
| 1 | `docs/design/ui/experiment_worker/` の多数設計書が `old/` に移動（廃止確認）（計109件→115件） | アクティブ設計書が5ファイルに集約されたことを確認し、廃止ファイル参照に注記を追加 |
| 2 | 5-5グループに `ProgressOverviewTab`（v2.0.0）対応シナリオを追加（計20件→26件） | SummaryCard表示確認(5-5-21)・FilterBar操作(5-5-22)・前提トランジション制御(5-5-23)・一時停止再開(5-5-24)・完了詳細確認(5-5-25)・作業中遷移(5-5-26)の6件を追加 |
| 3 | 5-5グループの前提条件に `ProgressOverviewTab` 向けデータ条件を追記 | `ProgressRow[]` として各ステータスのトランジションデータが必要なことを明記 |
| 4 | スコープ一覧の合計を109件→115件に更新、5-5の件数を20件→26件（未実施6件追加）に更新 | |
| 5 | 参照ドキュメントに `ui_progress_overview_tab.md`（v2.0.0）を追加、廃止済みファイルに `（廃止→old/ に移動）` を注記 | |
| 6 | 最終更新日を 2026-08-20（設計書リデザイン対応）に更新 | |

#### 2026-08-19（フェーズ２対応）

| # | 変更内容 | 詳細 |
|---|---------|------|
| 1 | フェーズ２新機能シナリオグループ 5-6 を追加（計91件→109件） | `ui_work_record_panel.md`（2026-06-22 / 最終更新: 2026-08-19）と `docs/requirement/phase2/02_experiment_instruction_workerUI/` に基づき、作業記録パネル（WorkRecordPanel）シナリオを追加（18件）。内訳: 画面表示・指示確認(5-6-1〜5-6-4)、テンプレート選択・プロパティ入力(5-6-5〜5-6-11)、保存・スキップ・完了操作(5-6-12〜5-6-14)、コメント・カスタムInsertion/Content(5-6-15〜5-6-18) |
| 2 | 最終更新日を 2026-08-19（フェーズ２対応）に更新 | |
| 3 | 参照ドキュメントにフェーズ２関連設計書を追記 | `ui_work_record_panel.md`、`ui_experiment_comment_dialog.md`、`docs/requirement/phase2/02_experiment_instruction_workerUI/` |

#### 2026-04-06

| # | 変更内容 | 詳細 |
|---|---------|------|
| 1 | 5-2グループにシナリオを追加（計26件→35件） | No.25対応: dissolution異常値警告の確認シナリオを追加（5-2-27〜5-2-35）。正常系（0〜100範囲内・境界値）、異常系（範囲外・保存ブロックなし確認）、バリエーション（大文字小文字不問・日本語キーワード・誤検知防止）の9件 |
| 2 | 合計件数を82件→91件に修正 | 5-2グループの増加（+9件）に伴う更新 |

#### 2026-03-12

| # | 変更内容 | 詳細 |
|---|---------|------|
| 1 | APIエンドポイントをUI設計書最新版に修正 | 進捗取得APIのパスを `projectName/methods/methodId/tasks/taskNo` 形式に統一 |
| 2 | 承認依頼APIを修正 | `POST /projects/{projectId}` → `PATCH /projects/{projectName}/approval-request` |
| 3 | トランジションステータスを数値型（0〜6）に修正 | 旧設計では文字列型（initial/preparing等）だったが、実装では数値型を使用 |
| 4 | タスクステータスを4種類に修正 | 旧設計の `pending`/`error` は実装では `not_started`/`forced_terminated` |
| 5 | 5-2グループに新規シナリオを追加（計20件→23件） | テンプレート実績取得、記録済みバッジ、みなし進捗組織設定、終端ステータス制御 |
| 6 | 5-4グループに新規シナリオを追加（計7件→9件） | フロー図ダイアログ表示、全件一括確認完了 |
| 7 | 5-2グループの「作業指示ボタン」シナリオを削除 | `DataRecordDialog` には「作業指示」ボタンが存在するが、5-2グループは実験データ記録に絞る。指示確認は5-4グループで担当 |

### 6.2 APIの実装状況

| API | 状態 | テストへの影響 |
|-----|------|--------------|
| GET `/api/v1/projects/worker-accessible` | ✅ 完了 | 影響なし |
| GET `/api/v1/worker/tasks` | ✅ 完了 | 影響なし（`getWorkerTasks(projectName)` を使用） |
| GET `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | ✅ 完了 | 影響なし |
| GET `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | ✅ 完了 | 影響なし |
| POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | ✅ 完了 | 影響なし |
| PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` | ✅ 完了 | 影響なし |
| PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | ✅ 完了 | 影響なし（楽観的ロック対応） |
| GET `/api/v1/instructions` | ✅ 完了 | 影響なし |
| PUT `/api/v1/instructions/{instructionId}/confirm` | ✅ 完了 | 影響なし |
| GET `/api/v1/projects/:projectName/maiml` | ✅ 完了 | 影響なし |
| POST `/api/v1/issues` | ✅ 完了 | 影響なし |
| POST `/api/v1/issues/comments` | ✅ 完了 | 影響なし |
| GET `/api/v1/issues` | ✅ 完了 | 影響なし |
| PATCH `/api/v1/issues/status` | ✅ 完了 | 5-3-6、5-3-7はManager権限ユーザーで実施 |
| PATCH `/api/v1/projects/{projectName}/approval-request` | ✅ 完了 | 影響なし（`requestApproval(projectName)` を使用） |

---

## 7. 参照ドキュメント

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| 実験作業者メイン画面設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_experiment_worker_main.md`（廃止→old/ に移動） |
| 実験記録タブ設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_experiment_record_tab.md`（廃止→old/ に移動） |
| データ記録ダイアログ設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_data_record_dialog.md`（廃止→old/ に移動） |
| トランジション一覧設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_transition_list.md`（廃止→old/ に移動） |
| トランジションフロー図設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_transition_flow_diagram.md`（廃止→old/ に移動） |
| 進捗確認タブ設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_progress_check_tab.md`（廃止→old/ に移動） |
| 進捗確認テーブル設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_progress_check_table.md`（廃止→old/ に移動） |
| タスク一覧テーブル設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_task_list_table.md`（廃止→old/ に移動） |
| 指示確認タブ設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_instruction_confirmation_tab.md`（廃止→old/ に移動） |
| 指示グループ設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_instruction_group.md`（廃止→old/ に移動） |
| 指示統計設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_instruction_stats.md`（廃止→old/ に移動） |
| 指示フロー図ダイアログ設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_instruction_flow_dialog.md`（廃止→old/ に移動） |
| 問題管理モーダル設計 ✅現役 | `docs/design/ui/experiment_worker/ui_issue_management_modal.md`（**v1.5.0** / 最終更新: 2026-08-27）|
| メソッド・タスク選択モーダル設計 ⚠️廃止 | `docs/design/ui/experiment_worker/old/ui_method_task_selection_modal.md`（廃止→old/ に移動） |
| プロジェクト選択モーダル設計 ✅現役 | `docs/design/ui/experiment_worker/ui_project_selection_modal.md`（**v1.2.0** / 最終更新: 2026-08-27）|
| **【v3.1.0】全体進捗タブ設計 ✅現役** | `docs/design/ui/experiment_worker/ui_progress_overview_tab.md`（**v3.1.0** / 最終更新: 2026-08-27）|
| 実験作業者API一覧 | `docs/design/api/API一覧_実験作業者画面.md` |
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
| 実験管理者テスト対象一覧（参考） | `docs/20260310_1106_実験管理者シナリオテスト/4_experiment_admin_test_targets.md` |
| **【v3.2.0 フェーズB完了】作業記録パネル設計** | `docs/design/ui/experiment_worker/ui_work_record_panel.md`（**v3.2.0** / 最終更新: 2026-08-27）|
| **【フェーズ２追加】コメントダイアログ設計** | `docs/design/ui/experiment_worker/ui_experiment_comment_dialog.md`（**v1.1.0** / 最終更新: 2026-08-27）|
| **【フェーズ２追加】フェーズ２要件定義（実験計画指示・実験作業者UI）** | `docs/requirement/phase2/02_experiment_instruction_workerUI/` |
