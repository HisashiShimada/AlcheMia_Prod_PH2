# 実験管理者 シナリオテスト対象一覧

> **作成日**: 2026-03-10  
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）  
> **照合先**: UI設計書（`docs/design/ui/experiment_admin/`）、API設計書（`docs/design/api/api_project_management.md`）

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | 根拠 | シナリオ数 | テスト方法 |
|----------------|----------------|------|-----------|-----------|
| **4-1** | プロジェクト作成 | 要件書#1、追加機能C/D | 6件 | Playwright自動 |
| **4-2** | チェックアウト/チェックイン | 要件書#4/#5 | 8件 | Playwright自動 |
| **4-3** | タスク登録 | 要件書#3、追加機能K | 3件 | Playwright自動 |
| **4-4** | 指示登録・送信 | 要件書#6、追加機能G/H/I | 6件 | Playwright自動 |
| **4-5** | 進捗確認・タスク結果 | 要件書#7/#15、追加機能E/F/J | 5件 | Playwright自動 |
| **4-6** | プロジェクトフィルタ・検索 | 追加機能A/B | 3件 | Playwright自動 |
| **4-7** | フォーマット管理 | 要件書#13 | 3件 | Playwright自動 |
| **4-8** | MAIML編集（PetriNetEditor） | 要件書#2 | 3件 | 手動 |
| **4-9** | トランジション検索 | - | 10件 | 手動 |
| **4-10** | プロジェクト公開 | - | 1件 | Playwright自動 | 
| **合計** | - | - | **47件** | - |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| 信頼性フラグの記録（要件書#8） | 設計書に実装なし |
| データマート関連（要件書#9-11） | 設計書に実装なし |
| 操作履歴の閲覧（要件書#12） | 設計書に実装なし |
| システムダウン通知（要件書#14） | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 4-1: プロジェクト作成

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-1-1 | プロジェクトを新規作成できること | 正常系 | 要件書#1 | POST `/api/v1/projects` |
| 4-1-2 | プロジェクト名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - |
| 4-1-3 | プロジェクト名が3文字未満の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - |
| 4-1-4 | プロジェクト名が100文字超の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - |
| 4-1-5 | キャンセルしてもプロジェクトが作成されないこと | 正常系 | `CreateProjectModal` キャンセル | - |
| 4-1-6 | 既存のプロジェクト名を入力した場合に重複エラーが表示されること | 異常系 | 要件書#1、API 409エラー | POST `/api/v1/projects` |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブが表示されている

**後処理:**
- 作成したプロジェクトを `project` テーブルから削除

---

### 4-2: チェックアウト / チェックイン

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-2-1 | プロジェクトをチェックアウトできること（`checked_in` ステータス） | 正常系 | 要件書#4 | POST `/api/v1/projects/:projectName/checkout` |
| 4-2-2 | チェックアウト中のプロジェクトをチェックインできること | 正常系 | 要件書#5 | POST `/api/v1/projects/:projectName/checkin` |
| 4-2-3 | チェックアウト中のプロジェクトには「チェックアウト中」タグが表示されること | 表示確認 | `ui_project_management.md` §2.2.3 | GET `/api/v1/projects` |
| 4-2-4 | `created` ステータスのプロジェクトをチェックアウトできること | 正常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` |
| 4-2-5 | `checked_out` ステータスのプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` |
| 4-2-6 | `in_progress` ステータスのプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` |
| 4-2-7 | 実行中のタスクがある場合はチェックインできないこと | 異常系 | ビジネスルール（チェックイン不可条件） | POST `/api/v1/projects/:projectName/checkin` |
| 4-2-8 | チェックアウトしたユーザー以外はチェックインできないこと | 異常系 | ビジネスルール（チェックイン可能ユーザー） | POST `/api/v1/projects/:projectName/checkin` |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトが「チェックイン済み」状態である

**ビジネスルール（設計書より）:**
- チェックアウトできるのは `created` または `checked_in` ステータスのみ
- チェックインできるのはチェックアウトしたユーザーのみ
- 実行中のタスクがある場合はチェックイン不可

---

### 4-3: タスク登録

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-3-1 | タスク登録タブで試行回数を設定して保存できること | 正常系 | 要件書#3 | POST `/api/v1/projects/:projectName/task-registration` |
| 4-3-2 | タスク登録タブで実験条件を変更して保存できること | 正常系 | 要件書#3 | POST `/api/v1/projects/:projectName/task-registration` |
| 4-3-3 | ドラッグ＆ドロップでタスクの実行順序を変更して保存できること | 正常系 | 追加機能K | POST `/api/v1/projects/:projectName/task-registration` |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトにMAIMLファイルが登録済みである（`isMaimlRegistered: true`）
- プロジェクトがチェックアウト中でない（`isCheckoutLocked: false`）

**ビジネスルール（設計書より）:**
- MAIMLが未登録の場合は保存ボタンが無効化される
- チェックアウト中の場合は保存ボタンが無効化される
- 試行回数は1〜999の整数のみ有効

---

### 4-4: 指示登録・送信

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-4-1 | 指示を追加して一括送信できること | 正常系 | 要件書#6 | POST `/api/v1/projects/:projectName/instructions/send` |
| 4-4-2 | 未送信の指示を編集できること | 正常系 | 追加機能G | PUT `/api/v1/projects/:projectName/instructions/:instructionId` |
| 4-4-3 | 未送信の指示を削除できること | 正常系 | 追加機能H | DELETE `/api/v1/projects/:projectName/instructions/:instructionId` |
| 4-4-4 | 送信済みの指示は削除ボタンが非表示であること | 表示確認 | `ui_instruction_registration_tab.md` §3.3.3 | - |
| 4-4-5 | 指示が0件の場合に一括送信ボタンが無効化されること | 表示確認 | `ui_instruction_registration_tab.md` §3.3.4 | - |
| 4-4-6 | 指示登録状況（未送信件数/送信済み件数/合計）が表示されること | 表示確認 | 追加機能I | GET `/api/v1/projects/:projectName/instructions/status` |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクト管理タブ > 「指示登録」タブが表示されている

**ビジネスルール（設計書より）:**
- 送信済みの指示は編集・削除不可（読み取り専用になる）
- 指示が0件の場合は一括送信ボタンが無効化される
- 送信と同時に `project_task` レコードが生成される

---

### 4-5: 進捗確認・タスク結果

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-5-1 | 進捗確認タブでプロジェクト一覧が表示されること | 正常系 | 要件書#7 | GET `/api/v1/projects` |
| 4-5-2 | 進捗確認タブの詳細ボタンで詳細ダイアログが表示されること | 正常系 | 追加機能J | GET `/api/v1/projects` |
| 4-5-3 | タスク結果タブでタスク統計（件数）が表示されること | 表示確認 | 要件書#15、追加機能E | GET `/api/v1/projects/:projectName/tasks` |
| 4-5-4 | レビュー待ちタスクを一括完了できること | 正常系 | 追加機能F | POST `/api/v1/projects/:projectName/tasks/complete-review` |
| 4-5-5 | 問題確認ができること | 正常系 | - | - |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する（タスクデータを含む）

**統計カラー定義（設計書より）:**
- 実行待ち（pending）: セカンダリー
- 実行中（in_progress）: プライマリー青
- 異常終了（error）: 赤
- レビュー待ち（review_waiting）: 警告黄
- 完了（completed）: 成功緑

---

### 4-6: プロジェクトフィルタ・検索

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-6-1 | プロジェクトステータスでフィルタリングできること | 正常系 | 追加機能A | GET `/api/v1/projects` |
| 4-6-2 | チェックアウト状態でフィルタリングできること | 正常系 | 追加機能A | GET `/api/v1/projects` |
| 4-6-3 | キーワード検索でプロジェクトを絞り込みできること | 正常系 | 追加機能B | GET `/api/v1/projects` |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブが表示されている
- 検索・フィルタの対象となる複数のプロジェクトがDBに存在する

**フィルタ選択肢（設計書より）:**
- **ステータス**: 全て / 計画中(planning) / 実行待ち(pending) / 実行中(in_progress) / レビュー待ち(review_waiting) / 完了(completed) / エラー(error)
- **チェックアウト状態**: 全て / チェックイン済み(checked_in) / チェックアウト中(checked_out)
- **検索対象**: プロジェクト名、プロジェクトID、ステータス表示名、部門名、所有者名

---

### 4-7: フォーマット管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-7-1 | フォーマット一覧が表示されること | 正常系 | 要件書#13 | GET `/api/v1/formats` |
| 4-7-2 | フォーマット（ワークフローベース）を新規登録できること | 正常系 | 要件書#13 | POST `/api/v1/formats` |
| 4-7-3 | 登録済みフォーマットを削除できること | 正常系 | 要件書#13 | DELETE `/api/v1/formats/:formatId` |

**前提条件:**
- 実験管理者ロールでログイン済み
- フォーマット管理画面が表示されている

**後処理:**
- 登録したフォーマットを削除

---

### 4-8: MAIML編集（PetriNetEditor）

> **テスト方法**: 手動テスト（GUI操作が複雑かつ専門的なため、Playwrightによる自動化対象外）

| シナリオID | シナリオ名 | 種別 | 根拠 |
|-----------|-----------|------|------|
| 4-8-1 | PetriNetEditorでワークフローを開いて表示できること | 正常系 | 要件書#2 |
| 4-8-2 | PetriNetEditorでノード・トランジションを編集して保存できること | 正常系 | 要件書#2 |
| 4-8-3 | 編集内容がS3に反映されMAIMLファイルが更新されること | 正常系 | 要件書#2 |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトにMAIMLファイルが登録済みである
- プロジェクトがチェックアウト済みである（編集ロックを取得済み）

**手動テスト手順（概要）:**
1. プロジェクト管理画面からPetriNetEditorを開く
2. ワークフローのノード・トランジションが正しく表示されていることを目視確認
3. ノードの追加・移動・削除など基本操作を実施
4. 保存操作を行い、成功メッセージを確認
5. S3上のMAIMLファイルが更新されていることを確認

**注意事項:**
- PetriNetEditorはReactFlowベースのGUIエディタであり、ドラッグ操作など自動化が困難な操作を含む
- 手動テスト実施者はMAIML仕様の基礎知識を有すること

---

### 4-9: トランジション検索

> **テスト方法**: 手動テスト

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API |
|-----------|-----------|------|------|---------|
| 4-9-1 | （シナリオ名を記入） | - | - | - |
| 4-9-2 | （シナリオ名を記入） | - | - | - |
| 4-9-3 | （シナリオ名を記入） | - | - | - |
| 4-9-4 | （シナリオ名を記入） | - | - | - |
| 4-9-5 | （シナリオ名を記入） | - | - | - |
| 4-9-6 | （シナリオ名を記入） | - | - | - |
| 4-9-7 | （シナリオ名を記入） | - | - | - |
| 4-9-8 | （シナリオ名を記入） | - | - | - |
| 4-9-9 | （シナリオ名を記入） | - | - | - |
| 4-9-10 | （シナリオ名を記入） | - | - | - |

**前提条件:**
- 実験管理者ロールでログイン済み
- （その他前提条件を記入）

---

### 4-10: プロジェクト公開

| シナリオID | シナリオ名 | 種別 | 根拠 |
|-----------|-----------|------|------|

**前提条件:**

**手動テスト手順（概要）:**

**注意事項:**

---

## 3. テスト実行に必要な前提情報

### 3.1 テスト環境

| 項目 | 値 |
|------|-----|
| フロントエンドURL | http://localhost:3000 |
| バックエンドURL | http://localhost:3001 |
| DB接続 | PostgreSQL（直接接続でDB検証用） |
| 組織ID（orgId） | 要確認 |

### 3.2 テストユーザー

| 項目 | 値 |
|------|-----|
| ロール | experiment_admin |
| ユーザーID | 要確認 |
| パスワード | 要確認 |

### 3.3 テスト用データ

| データ | 用途 | 準備方法 |
|--------|------|---------|
| テスト用プロジェクト（チェックイン済み） | 4-2, 4-3, 4-4, 4-5 | テスト実行前にDBに挿入 |
| MAIMLファイル登録済みプロジェクト | 4-3（タスク登録） | S3にMAIMLファイルを配置 |
| タスクデータ付きプロジェクト | 4-5（タスク結果確認） | project_task_detailレコードを挿入 |
| 複数ステータスのプロジェクト | 4-6（フィルタ・検索） | DBに複数プロジェクトを挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 1 | プロジェクトの作成（ワークフローベースを選択して作成） | ✅ `CreateProjectModal` | POST `/api/v1/projects` | **4-1** |
| 2 | ワークフローの修正（プロジェクト内のワークフロー編集） | ✅ `PetriNetEditorScreen` | S3ファイル操作 | **4-8** |
| 3 | タスクの作成（メソッド・試行回数・実験条件設定） | ✅ `TaskRegistrationTab` | POST `/api/v1/projects/:projectName/task-registration` | **4-3** |
| 4 | 実験前のワークフロー・タスクの設定 | ✅ チェックアウト操作（編集ロック） | POST `/api/v1/projects/:projectName/checkout` | **4-2** |
| 5 | 実験タスク実行中のワークフロー修正（チェックイン操作） | ✅ チェックイン操作 | POST `/api/v1/projects/:projectName/checkin` | **4-2** |
| 6 | 実験作業者への指示事項の入力・提示 | ✅ `InstructionRegistrationTab` | POST `/api/v1/projects/:projectName/instructions/send` | **4-4** |
| 7 | 実験中の進捗・実験作業者のメモの閲覧 | ✅ `ProgressMonitoring` + `WorkProgressDetailDialog` | GET `/api/v1/projects`（進捗情報含む） | **4-5** |
| 8 | 実験結果の信頼性フラグの記録（○/△/×） | ❌ 設計書に未定義 | - | **対象外** |
| 9 | データマートの作成 | ❌ 設計書に未定義 | - | **対象外** |
| 10 | 解析に利用するデータの指定・検索・構造化・蓄積 | ❌ 設計書に未定義 | - | **対象外** |
| 11 | 外部データのアップロード（フォーマット変換後） | ❌ 設計書に未定義 | - | **対象外** |
| 12 | 実験管理者の操作履歴の閲覧 | ❌ 設計書に未定義 | - | **対象外** |
| 13 | ワークフローベースの作成（慣れた後） | ✅ `FormatManagement` | GET `/api/v1/formats` など | **4-7** |
| 14 | システムダウン時の状態通知の受信 | ❌ 設計書に未定義 | - | **対象外** |
| 15 | タスク実行状況の確認 | ✅ `TaskResultsTable` + 統計カード | GET `/api/v1/projects/:projectName/tasks` | **4-5** |

---

## 5. 追加機能一覧（要件書に未記載・設計書に実装済み）

設計書を精査した結果、要件書に記載のない以下の機能が実装されていることが確認された。これらもテスト対象に追加する。

| 追加機能ID | 機能名 | 根拠（設計書） | 対応API | テスト対象 |
|-----------|--------|---------------|---------|-----------|
| A | プロジェクト一覧のフィルタリング（所有者/部門/ステータス/チェックアウト状態） | `ui_project_management.md` §3.2 | GET `/api/v1/projects`（クエリパラメータ） | **4-6** |
| B | プロジェクト一覧のキーワード検索 | `ui_project_management.md` §3.2 | GET `/api/v1/projects`（クエリパラメータ） | **4-6** |
| C | プロジェクトファイル一覧表示（ルート・アーカイブ） | `ui_file_list_table.md`、`ui_project_folder_tree.md` | GET `/api/v1/projects/:projectName/files` | **4-1** |
| D | プロジェクト一括ダウンロード（ZIP形式） | `ui_project_management.md` §3.7 | POST `/api/v1/files/download-folder-zip` | **4-1** |
| E | タスク結果の統計表示（実行待ち/実行中/レビュー待ち/完了/異常終了） | `ui_task_results_table.md`、`ui_project_management.md` §3.9 | GET `/api/v1/projects/:projectName/tasks` | **4-5** |
| F | レビュー待ちタスクの一括完了 | `api_project_management.md` §API#16 | POST `/api/v1/projects/:projectName/tasks/complete-review` | **4-5** |
| G | 指示の個別編集（未送信のみ） | `ui_instruction_registration_tab.md` §3.3.3、`api_project_management.md` §API#18 | PUT `/api/v1/projects/:projectName/instructions/:instructionId` | **4-4** |
| H | 指示の個別削除（未送信のみ） | `ui_instruction_registration_tab.md` §3.3.3、`api_project_management.md` §API#19 | DELETE `/api/v1/projects/:projectName/instructions/:instructionId` | **4-4** |
| I | 指示登録状況の確認（未送信件数/送信済み件数/合計件数） | `api_project_management.md` §API#17 | GET `/api/v1/projects/:projectName/instructions/status` | **4-4** |
| J | 進捗確認タブでの詳細ダイアログ表示 | `ui_progress_monitoring.md` §3.1.8、`ui_work_progress_detail_dialog.md` | GET `/api/v1/projects`（進捗情報含む） | **4-5** |
| K | タスク登録のドラッグ＆ドロップ順序変更 | `ui_task_registration_tab.md` §3.3.2 | POST `/api/v1/projects/:projectName/task-registration` | **4-3** |

---

## 6. 設計書との差異・懸念事項

### 6.1 要件書と設計書の相違点

| # | 相違内容 | 詳細 |
|---|---------|------|
| 1 | 要件書#1「ワークフローベースを選択して作成」→ 設計書では選択なし | 設計書（`CreateProjectModal`）ではプロジェクト名・概要のみ入力。ワークフローベース選択機能は未実装。 |
| 2 | 要件書#3「プロパティ一覧をダウンロード・値入力・アップロードで複数タスク生成」→ 設計書では異なる | 設計書（`TaskRegistrationTab`）では メソッドID/試行回数/実験条件のみ設定。プロパティ一覧のダウンロード機能は未実装。 |
| 3 | 要件書#8「信頼性フラグ（○/△/×）の記録」→ 設計書に存在しない | 完全に未実装。テストシナリオの対象外とする。 |
| 4 | 要件書#9-11「データマート/解析データ管理」→ 設計書に存在しない | 完全に未実装。テストシナリオの対象外とする。 |
| 5 | 要件書#12「操作履歴の閲覧」→ 設計書に存在しない | 完全に未実装。テストシナリオの対象外とする。 |

### 6.2 APIの実装状況

| API | 状態 | テストへの影響 |
|-----|------|--------------|
| POST `/api/v1/projects` | ✅ 実装済み | 影響なし |
| POST `/api/v1/projects/:projectName/checkout` | ✅ 実装済み | 影響なし |
| POST `/api/v1/projects/:projectName/checkin` | ✅ 実装済み | 影響なし |
| GET `/api/v1/projects/:projectName/task-registration` | ✅ 実装済み | 影響なし |
| POST `/api/v1/projects/:projectName/task-registration` | ✅ 実装済み | 影響なし |
| POST `/api/v1/projects/:projectName/instructions/send` | ✅ 実装済み | 影響なし |
| PUT `/api/v1/projects/:projectName/instructions/:id` | ✅ 実装済み | 影響なし |
| DELETE `/api/v1/projects/:projectName/instructions/:id` | ✅ 実装済み | 影響なし |
| GET `/api/v1/projects/:projectName/instructions/status` | ✅ 実装済み | 影響なし |
| POST `/api/v1/projects/:projectName/tasks/complete-review` | ✅ 実装済み | 影響なし |
| GET `/api/v1/projects/:projectName/tasks` | ✅ 実装済み | 影響なし |
| GET `/api/v1/projects/:projectName/instructions`（管理者用） | 🔴 未実装 | 4-4-6（指示一覧確認）の実施に影響する可能性あり |

---

## 7. 参照ドキュメント

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| 実験管理者メニュー設計 | `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` |
| プロジェクト管理画面設計 | `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` |
| プロジェクト作成モーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_create_project_modal.md` |
| タスク登録タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md` |
| 指示登録タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_instruction_registration_tab.md` |
| 進捗確認画面設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/ui_progress_monitoring.md` |
| プロジェクト管理API設計 | `docs/design/api/api_project_management.md` |
| プロバイダーテスト（参考実装） | `e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `e2e/steps/provider/1-1_corporation_create.ts` |
