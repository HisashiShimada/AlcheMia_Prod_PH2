# 実験作業者 シナリオテスト対象一覧

> **作成日**: 2026-03-10  
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）  
> **照合先**: UI設計書（`docs/design/ui/experiment_worker/`）、API設計書（`docs/design/api/API一覧_実験作業者画面.md`）

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | 根拠 | シナリオ数 | テスト方法 |
|----------------|----------------|------|-----------|-----------|
| **5-1** | プロジェクト・メソッド・タスク選択 | 要件書#1、追加機能A/B | 5件 | Playwright自動 |
| **5-2** | 実験記録（トランジション記録） | 要件書#2〜7、追加機能L | 6件 | Playwright自動 |
| **5-3** | 問題報告・ステータス変更 | 要件書（なし）、追加機能D/E/F/G | 7件 | Playwright自動 |
| **5-4** | 指示確認 | 要件書#8、追加機能H/I/J | 7件 | Playwright自動 |
| **5-5** | 進捗確認・承認依頼 | 要件書#1、追加機能C/K | 15件 | Playwright自動 |
| **合計** | - | - | **40件** | - |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| 操作履歴の閲覧（要件書#9） | 設計書に実装なし |
| システムダウン通知（要件書#10） | 設計書に実装なし |
| 削除データ通知（要件書#11） | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 5-1: プロジェクト・メソッド・タスク選択

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 5-1-1 | プロジェクト選択コンボボックスで実験作業可能なプロジェクトが表示されること | 正常系 | 追加機能A | GET `/api/v1/projects/worker-accessible` |
| 5-1-2 | 「選択」ボタンでプロジェクト選択モーダルが開くこと | 正常系 | 追加機能A | - |
| 5-1-3 | プロジェクト変更時にメソッドとタスクがリセットされること | 正常系 | `ui_experiment_worker_main.md` §8.1 | - |
| 5-1-4 | メソッド・タスク選択モーダルでメソッドタブを切り替えてタスクを選択できること | 正常系 | 追加機能B | - |
| 5-1-5 | メソッド・タスク選択モーダルでタスク名フィルタが機能すること | 正常系 | `ui_method_task_selection_modal.md` §7 | - |

**前提条件:**
- 実験作業者ロールでログイン済み
- 実験作業者メイン画面が表示されている
- テスト用プロジェクト（status: in_progress）がDBに存在する

---

### 5-2: 実験記録（トランジション記録）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 5-2-1 | 実験記録タブでトランジション一覧が表示されること | 正常系 | 要件書#2 | GET `/api/v1/progress/{projectId}/{methodId}/{taskId}` |
| 5-2-2 | トランジションの「記録」ボタンでデータ記録ダイアログが開くこと | 正常系 | 要件書#3〜7 | - |
| 5-2-3 | データ記録ダイアログでコメントを入力して保存できること | 正常系 | 要件書#4 | POST `/api/v1/experiments/{transitionId}/data` |
| 5-2-4 | プロジェクト未選択時は記録ボタンが無効化されていること | 表示確認 | `ui_transition_list.md` §4.4 | - |
| 5-2-5 | トランジション一覧に番号・名称・ステータス・記録ボタン・問題報告ボタンの各列が正しく表示されること | 表示確認 | 追加機能L、`ui_transition_list.md` | GET `/api/v1/progress/{projectId}/{methodId}/{taskId}` |
| 5-2-6 | フロー図ボタンをクリックするとトランジションフロー図ダイアログが表示されること | 表示確認 | 追加機能L、`ui_transition_flow_diagram.md` | GET `/api/v1/files/maiml/{fileId}` |

**前提条件:**
- 実験作業者ロールでログイン済み
- プロジェクト・メソッド・タスクが選択済み
- 選択済みタスクにトランジションデータが存在する

**ビジネスルール（設計書より）:**
- 記録ボタンはプロジェクトステータスが `waiting_approval`, `waiting_task` の場合は無効化
- 問題報告ボタンは常に有効

---

### 5-3: 問題報告・ステータス変更

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 5-3-1 | トランジションの「問題報告」ボタンで問題管理モーダルが開くこと | 正常系 | 追加機能D | GET `/api/v1/issues` |
| 5-3-2 | 問題管理モーダルで新しい問題を報告できること | 正常系 | 追加機能D | POST `/api/v1/issues` |
| 5-3-3 | 問題管理モーダルで既存の問題にコメントを投稿できること | 正常系 | 追加機能E | POST `/api/v1/issues/:issueId/comments` |
| 5-3-4 | タイトルが未入力の場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` バリデーション | - |
| 5-3-5 | 問題一覧がステータスでフィルタリングできること | 正常系 | 追加機能F | GET `/api/v1/issues` |
| 5-3-6 | 未解決の問題を解決済みに変更できること | 正常系 | 追加機能G | PATCH `/api/v1/issues/:issueId/status` |
| 5-3-7 | 解決済みの問題を未解決に戻せること | 正常系 | 追加機能G | PATCH `/api/v1/issues/:issueId/status` |

**前提条件:**
- 実験作業者ロールでログイン済み（5-3-1〜5-3-5）
- Manager権限ユーザーでログイン済み（5-3-6、5-3-7）
- プロジェクト・メソッド・タスクが選択済み
- 実験記録タブが表示されトランジション一覧が表示されている

**ビジネスルール（設計書より）:**
- 実験作業者は問題報告・コメント投稿、ステータス更新が可能

---

### 5-4: 指示確認

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 5-4-1 | 指示確認タブでプロジェクト指示・タスク指示・トランジション指示が表示されること | 正常系 | 要件書#8、追加機能H | GET `/api/v1/instructions` |
| 5-4-2 | タスク指示グループを折りたたみ・展開できること | 正常系 | 追加機能I | - |
| 5-4-3 | プロジェクト指示の「確認完了」ボタンで確認完了処理が実行されること | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` |
| 5-4-4 | タスク指示の「確認完了」ボタンで確認完了処理が実行されること | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` |
| 5-4-5 | トランジション指示の「確認完了」ボタンで確認完了処理が実行されること | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` |
| 5-4-6 | 「確認完了」ボタンを押下したユーザーは同一指示に対して再度押下できないこと | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` |
| 5-4-7 | 指示がない場合に空状態メッセージが表示されること | 表示確認 | `ui_instruction_group.md` §9 | GET `/api/v1/instructions` |

**前提条件:**
- 実験作業者ロールでログイン済み
- テスト用プロジェクトに指示データが登録済み（project_instructionテーブル）
  - プロジェクト指示（instruction_type: project）が1件以上存在すること（5-4-3）
  - タスク指示（instruction_type: task）が1件以上存在すること（5-4-4）
  - トランジション指示（instruction_type: transition）が1件以上存在すること（5-4-5）
  - 未確認状態の指示が1件以上存在すること（5-4-3〜5-4-6）
- プロジェクト・メソッド・タスクが選択済み

**ビジネスルール（設計書より）:**
- 「確認完了」ボタンは未確認状態（confirmed: false）の指示カードにのみ表示される
- 確認完了後（confirmed: true）は、ボタンが「確認済み」表示に切り替わり、同一ユーザーによる再押下は不可（ボタン無効化または非表示）
- 確認完了の記録はユーザー単位で管理されるため、別ユーザーが同一指示を確認しても、自分の確認状態は変わらない

**各ボタンの確認完了シナリオ詳細（5-4-3〜5-4-6）:**

| シナリオID | 指示種別 | 操作内容 | 期待結果 |
|-----------|---------|---------|---------|
| 5-4-3 | プロジェクト指示 | 未確認のプロジェクト指示カードの「確認完了」ボタンを押下 | APIが呼び出され、ボタンが「確認済み」状態に切り替わること |
| 5-4-4 | タスク指示 | 未確認のタスク指示カードの「確認完了」ボタンを押下 | APIが呼び出され、ボタンが「確認済み」状態に切り替わること |
| 5-4-5 | トランジション指示 | 未確認のトランジション指示カードの「確認完了」ボタンを押下 | APIが呼び出され、ボタンが「確認済み」状態に切り替わること |
| 5-4-6 | 任意（確認済み） | 確認完了済みの指示カードを表示 | 「確認完了」ボタンが無効化または非表示となり、同一ユーザーによる再押下が不可であること |

---

### 5-5: 進捗確認・承認依頼

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 5-5-1 | 進捗確認タブでタスク一覧がメソッドタブ別に表示されること | 正常系 | 要件書#1、追加機能C | GET `/api/v1/tasks?projectId={projectId}` |
| 5-5-2 | 進捗確認タブでタスクのステータスを「開始」に変更できること | 正常系 | 要件書#1 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` |
| 5-5-3 | 進捗確認タブ表示時のみ「承認依頼」ボタンが表示されること | 表示確認 | 追加機能K | - |
| 5-5-4 | プロジェクト選択時に承認依頼ボタンが活性化されること | 表示確認 | `ui_experiment_worker_main.md` §3.2.3 | - |
| 5-5-5 | 「指示確認」ボタンをクリックすると指示確認タブに遷移すること | 正常系 | `ui_task_list_table.md` §5.3 | - |
| 5-5-6 | 「実験記録」ボタンをクリックすると実験記録タブに遷移すること | 正常系 | `ui_task_list_table.md` §5.3 | - |
| 5-5-7 | 「問題確認」ボタンをクリックすると問題確認モーダルが参照専用で開くこと | 正常系 | `ui_task_list_table.md` §5.3 | GET `/api/v1/issues` |
| 5-5-8 | 「強制終了」ボタンをクリックするとタスクが強制終了されること | 正常系 | `ui_task_list_table.md` §5.3 | - |
| 5-5-9 | 進捗率をクリックするとフロー図ダイアログが表示されること | 正常系 | `ui_task_list_table.md` §5.2 | - |
| 5-5-10 | プロジェクトステータスが編集不可（waiting_approval）の場合に「開始」ボタンが無効化されること | 表示確認 | `ui_task_list_table.md` §5.3 | - |
| 5-5-11 | タスクステータスが「実行待ち（pending）」以外の場合に「開始」ボタンが無効化されること | 表示確認 | `ui_task_list_table.md` §5.3 | - |
| 5-5-12 | タスクステータスが「完了（completed）」または「異常終了（error）」の場合に「強制終了」ボタンが無効化されること | 表示確認 | `ui_task_list_table.md` §5.3 | - |
| 5-5-13 | 「承認依頼」ボタンをクリックすると承認依頼が送信され、成功メッセージが表示されること | 正常系 | `ui_experiment_worker_main.md` §15.2 | POST `/api/v1/projects/{projectId}/approval-request` |
| 5-5-14 | 承認依頼送信後にプロジェクトステータスが「承認待ち（waiting_approval）」に更新されること | 正常系 | `ui_experiment_worker_main.md` §15.2 | POST `/api/v1/projects/{projectId}/approval-request` |
| 5-5-15 | 既に承認依頼済みのプロジェクトで再度「承認依頼」ボタンをクリックするとエラーメッセージが表示されること | 異常系 | `ui_experiment_worker_main.md` §15.2 | POST `/api/v1/projects/{projectId}/approval-request` |

**前提条件:**
- 実験作業者ロールでログイン済み
- テスト用プロジェクトにタスクデータが存在する（project_taskテーブル）
- プロジェクトが選択済み

**ビジネスルール（設計書より）:**

#### テーブル内アクションボタンの活性/非活性条件

| ボタン名 | アクション | 常時有効 | 有効条件（タスクステータス） | 有効条件（プロジェクトステータス） |
|---------|-----------|---------|---------------------------|--------------------------------|
| 指示確認 | `instruction` | ✅ 常に有効 | - | - |
| 開始 | `start` | - | `pending`（実行待ち）のみ | `waiting_task` または `executing_task` のみ（isEditableStatus） |
| 問題確認 | `issueCheck` | ✅ 常に有効 | - | - |
| 実験記録 | `record` | ✅ 常に有効 | - | - |
| 強制終了 | `forceTerminate` | - | `completed`・`error` 以外 | `waiting_task` または `executing_task` のみ（isEditableStatus） |

#### プロジェクトステータスと isEditableStatus の対応

| プロジェクトステータス | isEditableStatus | 開始・強制終了ボタン |
|----------------------|-----------------|-------------------|
| `planning`（計画中） | false | **無効** |
| `waiting_task`（タスク実行待ち） | **true** | 有効 |
| `executing_task`（タスク実行中） | **true** | 有効 |
| `waiting_approval`（承認待ち） | false | **無効** |
| `completed`（完了） | false | **無効** |

#### タスクステータスの表示

| TaskStatus | 表示ラベル | バッジ色 |
|-----------|-----------|---------|
| `pending` | 実行待ち | default（灰色） |
| `in_progress` | 実行中 | orange（オレンジ色） |
| `review_waiting` | レビュー待ち | blue（青色） |
| `completed` | 完了 | green（緑色） |
| `error` | 異常終了 | red（赤色） |

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
| テスト用プロジェクト（status: in_progress） | 5-1, 5-2, 5-3, 5-4, 5-5 | DBに事前挿入 |
| プロジェクトに紐づくメソッド・タスク | 5-1, 5-2, 5-5 | project_taskテーブルに挿入 |
| トランジションデータ | 5-2, 5-3 | transition_setテーブル（MAIMLから生成） |
| 指示データ（project_instruction） | 5-4 | DBに事前挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 1 | タスクの選択・実行（作業開始・中断・再開） | ✅ `ProgressCheckTab` / `MethodTaskSelectionModal` | PUT `/api/v1/tasks/{taskId}/status` | **5-1, 5-5** |
| 2 | ワークフローに従った作業手順の順次実行 | ✅ `TransitionList` / `TransitionFlowDiagram` | GET `/api/v1/progress/{projectId}/{methodId}/{taskId}` | **5-2** |
| 3 | 実験条件（実験者名・作業記録・実験結果・計測結果・実験ログ）の登録 | ✅ `DataRecordDialog` | POST `/api/v1/experiments/{transitionId}/data` | **5-2** |
| 4 | 実験作業中のメモ・気づきの入力（作業手順に紐づいて記録） | ✅ `DataRecordDialog`（コメント欄） | POST `/api/v1/experiments/{transitionId}/data` | **5-2** |
| 5 | 事前設定条件と異なる実験条件で実施した場合の実際条件の記録 | ✅ `DataRecordDialog`（ステータス・コメント入力） | POST `/api/v1/experiments/{transitionId}/data` | **5-2** |
| 6 | 計測・分析結果の登録（計測・分析システムからのデータ取得） | ✅ `DataRecordDialog` | POST `/api/v1/experiments/{transitionId}/data` | **5-2** |
| 7 | 作業手順ごとの実験機器・計測装置の操作 | ✅ `TransitionList`（記録ボタン） | POST `/api/v1/experiments/{transitionId}/data` | **5-2** |
| 8 | 実験管理者からの指示事項・注意事項の確認 | ✅ `InstructionConfirmationTab` / `InstructionGroup` / `InstructionCard` | GET `/api/v1/instructions` | **5-4** |
| 9 | 実験作業者の操作履歴の閲覧 | ❌ 設計書に未定義 | - | **対象外** |
| 10 | システムダウン時の状態通知の受信 | ❌ 設計書に未定義 | - | **対象外** |
| 11 | 削除データの通知の受信 | ❌ 設計書に未定義 | - | **対象外** |

---

## 5. 追加機能一覧（要件書に未記載・設計書に実装済み）

設計書を精査した結果、要件書に記載のない以下の機能が実装されていることが確認された。これらもテスト対象に追加する。

| 追加機能ID | 機能名 | 根拠（設計書） | 対応API | テスト対象 |
|-----------|--------|---------------|---------|-----------|
| A | プロジェクト選択（コンボボックス + 選択モーダル） | `ui_experiment_worker_main.md` §3, `ui_project_selection_modal.md` | GET `/api/v1/projects/worker-accessible` | **5-1** |
| B | メソッド・タスク選択モーダル（タブ切り替え・フィルタリング） | `ui_method_task_selection_modal.md` | - | **5-1** |
| C | 進捗確認タブでのタスク一覧表示（メソッドタブ切り替え） | `ui_progress_check_tab.md`, `ui_progress_check_table.md` | GET `/api/v1/tasks?projectId={projectId}` | **5-5** |
| D | 問題報告（トランジション単位・タスク単位） | `ui_transition_list.md` §5.2, `ui_issue_management_modal.md` | POST `/api/v1/issues` | **5-3** |
| E | 問題へのコメント投稿 | `ui_issue_management_modal.md` | POST `/api/v1/issues/:issueId/comments` | **5-3** |
| F | 問題一覧の確認（フィルタリング・ページネーション） | `ui_issue_management_modal.md` | GET `/api/v1/issues` | **5-3** |
| G | 問題ステータス変更（未解決⇔解決済）※権限制限あり | `ui_issue_management_modal.md` §8 | PATCH `/api/v1/issues/:issueId/status` | **5-3** |
| H | 指示のグループ表示（プロジェクト/タスク/トランジション別） | `ui_instruction_group.md` §3.1 | GET `/api/v1/instructions` | **5-4** |
| I | 指示グループの折りたたみ/展開 | `ui_instruction_group.md` §4 | - | **5-4** |
| J | 指示確認完了ボタン（確認完了のマーク） | `ui_instruction_group.md` §6.2 | PUT `/api/v1/instructions/{instructionId}/confirm` | **5-4** |
| K | 承認依頼（進捗確認タブから送信） | `ui_experiment_worker_main.md` §3.2.3 | POST `/api/v1/projects/{projectId}/approval-request` | **5-5** |
| L | トランジションのフロー図表示（TransitionFlowDiagram） | `ui_transition_flow_diagram.md` | GET `/api/v1/files/maiml/{fileId}` | **5-2** |

---

## 6. 設計書との差異・懸念事項

### 6.1 要件書と設計書の相違点

| # | 相違内容 | 詳細 |
|---|---------|------|
| 1 | 要件書#1「作業開始・中断・再開」→ 設計書では「進捗確認タブ」でステータス変更 | タスクステータス更新APIが TODO状態 |
| 2 | 要件書#3「実験者名」の入力 → DataRecordDialogの詳細設計未確認（TODO API） | 実験データ保存APIがTODO |
| 3 | 要件書#9「操作履歴の閲覧」→ 設計書に存在しない | 完全に未実装。テスト対象外 |

### 6.2 APIの実装状況

| API | 状態 | テストへの影響 |
|-----|------|--------------|
| GET `/api/v1/projects/worker-accessible` | TODO | 5-1-1の実施に影響（モックデータで確認） |
| POST `/api/v1/experiments/{transitionId}/data` | TODO | 5-2-3の保存処理がTODO |
| PUT `/api/v1/tasks/{taskId}/status` | TODO | 5-5-2のステータス変更がTODO |
| GET `/api/v1/instructions` | TODO | 5-4-1の指示表示がTODO |
| PUT `/api/v1/instructions/{instructionId}/confirm` | TODO | 5-4-3の確認完了がTODO |
| POST `/api/v1/issues` | ✅ 完了 | 影響なし |
| POST `/api/v1/issues/:issueId/comments` | ✅ 完了 | 影響なし |
| GET `/api/v1/issues` | ✅ 完了 | 影響なし |
| PATCH `/api/v1/issues/:issueId/status` | ✅ 完了 | 5-3-6、5-3-7はManager権限ユーザーで実施 |
| POST `/api/v1/projects/{projectId}/approval-request` | TODO | 5-5-13〜5-5-15の承認依頼処理がTODO |

> **注**: APIがTODO状態のシナリオでは、現状のモック画面での動作確認（UI表示・ダイアログ開閉・バリデーション確認）を主目的とし、実際のAPI通信確認はAPI実装後に追加する。

---

## 7. 参照ドキュメント

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| 実験作業者メイン画面設計 | `docs/design/ui/experiment_worker/ui_experiment_worker_main.md` |
| 実験記録タブ設計 | `docs/design/ui/experiment_worker/ui_experiment_record_tab.md` |
| データ記録ダイアログ設計 | `docs/design/ui/experiment_worker/ui_data_record_dialog.md` |
| トランジション一覧設計 | `docs/design/ui/experiment_worker/ui_transition_list.md` |
| 進捗確認タブ設計 | `docs/design/ui/experiment_worker/ui_progress_check_tab.md` |
| 指示確認タブ設計 | `docs/design/ui/experiment_worker/ui_instruction_confirmation_tab.md` |
| 指示グループ設計 | `docs/design/ui/experiment_worker/ui_instruction_group.md` |
| 問題管理モーダル設計 | `docs/design/ui/experiment_worker/ui_issue_management_modal.md` |
| メソッド・タスク選択モーダル設計 | `docs/design/ui/experiment_worker/ui_method_task_selection_modal.md` |
| 実験作業者API一覧 | `docs/design/api/API一覧_実験作業者画面.md` |
| プロバイダーテスト（参考実装） | `e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `e2e/steps/provider/1-1_corporation_create.ts` |
| 実験管理者テスト対象一覧（参考） | `docs/20260310_1106_実験管理者シナリオテスト/4_experiment_admin_test_targets.md` |
