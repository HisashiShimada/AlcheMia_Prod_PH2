# 実験作業者 シナリオテスト対象一覧

> **作成日**: 2026-03-10  
> **最終更新日**: 2026-03-13  
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）  
> **照合先**: UI設計書（`docs/design/ui/experiment_worker/`）、API設計書（`docs/design/api/API一覧_実験作業者画面.md`）

---

## 0. テスト実施情報

| 項目 | 値 |
|------|-----|
| テスト実施日 | 2026-03-26 |
| テスト実施者 | Cline |
| テスト環境バージョン | - |
| 総合判定 | OK |
| 備考 | - |

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | 根拠 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|------|-----------|-----------|------|-------|-------|
| **5-1** | プロジェクト・メソッド・タスク選択 | 要件書#1、追加機能A/B | 9件 | Playwright自動 | 9 | 0 | 0 |
| **5-2** | 実験記録（トランジション記録） | 要件書#2〜7、追加機能L/M/N/Q | 26件 | Playwright自動 | 26 | 0 | 0 |
| **5-3** | 問題報告・ステータス変更 | 要件書（なし）、追加機能D/E/F/G | 17件 | Playwright自動 | 17 | 0 | 0 |
| **5-4** | 指示確認 | 要件書#8、追加機能H/I/J/O/P | 10件 | Playwright自動 | 10 | 0 | 0 |
| **5-5** | 進捗確認・承認依頼 | 要件書#1、追加機能C/K | 16件 | Playwright自動 | 16 | 0 | 0 |
| **合計** | - | - | **78件** | - | **78** | **0** | **0** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| 操作履歴の閲覧（要件書#9） | 設計書に実装なし |
| システムダウン通知（要件書#10） | 設計書に実装なし |
| 削除データ通知（要件書#11） | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 5-1: プロジェクト・メソッド・タスク選択

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-1-1 | プロジェクト選択コンボボックスで実験作業可能なプロジェクトが表示されること | 正常系 | 追加機能A | GET `/api/v1/projects/worker-accessible` | OK | |
| 5-1-2 | 「選択」ボタンでプロジェクト選択モーダルが開くこと | 正常系 | 追加機能A | - | OK | |
| 5-1-3 | プロジェクト変更時にメソッドとタスクがリセットされること | 正常系 | `ui_experiment_worker_main.md` §8.1 | - | OK | |
| 5-1-4 | メソッド・タスク選択モーダルでメソッドタブを切り替えてタスクを選択できること | 正常系 | 追加機能B | - | OK | |
| 5-1-5 | メソッド・タスク選択モーダルでタスク名フィルタが機能すること | 正常系 | `ui_method_task_selection_modal.md` §7.2 | - | OK | |
| 5-1-6 | プロジェクト選択モーダルでプロジェクト名・プロジェクトコードのあいまい検索が機能すること | 正常系 | `ui_project_selection_modal.md` §6.1 | - | OK | |
| 5-1-7 | プロジェクト選択モーダルでプロジェクト名フィルターが機能すること | 正常系 | `ui_project_selection_modal.md` §6.2 | - | OK | |
| 5-1-8 | メソッド・タスク選択モーダルでステータスフィルターが機能すること | 正常系 | `ui_method_task_selection_modal.md` §7.2 | - | OK | |
| 5-1-9 | メソッド・タスク選択モーダルで複数フィルター条件がAND条件で適用されること | 正常系 | `ui_method_task_selection_modal.md` §7.2 | - | OK | |

**前提条件:**
- 実験作業者ロールでログイン済み
- 実験作業者メイン画面が表示されている
- テスト用プロジェクト（status: in_progress）がDBに存在する

---

### 5-2: 実験記録（トランジション記録）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-2-1 | 実験記録タブでトランジション一覧が表示されること | 正常系 | 要件書#2 | GET `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | OK | |
| 5-2-2 | トランジションの「記録」ボタンでデータ記録ダイアログが開くこと | 正常系 | 要件書#3〜7 | - | OK | |
| 5-2-3 | データ記録ダイアログでテンプレートデータを入力して保存できること | 正常系 | 要件書#3〜7 | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | OK | |
| 5-2-4 | プロジェクト未選択時は記録ボタンが無効化されていること | 表示確認 | `ui_transition_list.md` §4.4 | - | OK | |
| 5-2-5 | トランジション一覧に名称・ステータス・進捗率・材料数・条件数・結果数・記録ボタン・問題報告ボタンの各列が正しく表示されること | 表示確認 | 追加機能L、`ui_transition_list.md` | GET `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | OK | |
| 5-2-6 | 表示切り替えボタンでリスト表示⇄フロー図表示を切り替えられること | 正常系 | 追加機能L、`ui_experiment_record_tab.md` §3.2 | - | OK | |
| 5-2-7 | フロー図表示でトランジションノードが表示されること | 表示確認 | 追加機能L、`ui_transition_flow_diagram.md` | - | OK | |
| 5-2-8 | データ記録ダイアログ表示時に既存テンプレートデータが取得されること | 正常系 | `ui_data_record_dialog.md` §5.4 | GET `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | OK | |
| 5-2-9 | 既存データが存在するテンプレート行に記録済みバッジ（緑ドット）が表示されること | 表示確認 | `ui_data_record_dialog.md` §3.3 | - | OK | |
| 5-2-10 | データ記録ダイアログで「みなし進捗更新」チェックボックスがON（初期状態）の場合にステータス更新セクションが非表示になること | 表示確認 | `ui_data_record_dialog.md` §3.1 | - | OK | |
| 5-2-11 | データ記録ダイアログで「みなし進捗更新」チェックボックスをOFFにするとステータス更新セクション（ステータス選択・進捗スライダー・コメント）が表示されること | 表示確認 | `ui_data_record_dialog.md` §3.1、§4.4 | - | OK | |
| 5-2-12 | 組織設定でみなし進捗を使用しない場合、チェックボックスが非表示でステータス更新セクションが常時表示されること | 表示確認 | `ui_data_record_dialog.md` §3.1（useDeemedProgressProp=false） | - | OK | |
| 5-2-13 | みなし進捗OFFの状態でトランジションステータスを選択して保存ボタンを押すとステータスが更新されること | 正常系 | `ui_data_record_dialog.md` §4.4 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` | OK | |
| 5-2-14 | みなし進捗OFFの状態で進捗率スライダーを操作して保存ボタンを押すと進捗率が更新されること | 正常系 | `ui_data_record_dialog.md` §3.1、§4.4 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` | OK | |
| 5-2-15 | 終端ステータス（終状態=5、異常終了状態=6）の場合にステータス選択が無効化されること | 表示確認 | `ui_data_record_dialog.md` §3.3（終端ステータス） | - | OK | |
| 5-2-16 | プロジェクトステータスが編集不可（waiting_approval）の場合にデータ記録ダイアログのステータス更新セクションが折りたたまれた状態で表示されること | 表示確認 | `ui_data_record_dialog.md` §10.1 | - | OK | |
| 5-2-17 | データ記録ダイアログにテンプレート一覧（材料IN/条件IN/結果OUT）が表示されること | 表示確認 | `ui_data_record_dialog.md` §3.3 | - | OK | |
| 5-2-18 | テンプレート名検索でテンプレート一覧が絞り込まれること | 正常系 | `ui_data_record_dialog.md` §3.1 | - | OK | |
| 5-2-19 | テンプレート種別（材料/条件/結果）フィルタでテンプレート一覧が絞り込まれること | 正常系 | `ui_data_record_dialog.md` §3.1 | - | OK | |
| 5-2-20 | テンプレートを選択するとプロパティ入力フォームが表示されること | 正常系 | `ui_data_record_dialog.md` §4.2 | - | OK | |
| 5-2-21 | テンプレート未選択時に「テンプレートを選択してください」のメッセージが表示されること | 表示確認 | `ui_data_record_dialog.md` §3.3 | - | OK | |
| 5-2-22 | DataGridタイプのプロパティで行・列を追加・削除できること | 正常系 | `ui_data_record_dialog.md` §3.2、§4.3 | - | OK | |
| 5-2-23 | 必須プロパティが未入力の場合に保存ボタンを押すとバリデーションエラーが表示されること | 異常系 | `ui_data_record_dialog.md` §6.1 | - | OK | |
| 5-2-24 | プロパティリストタイプのプロパティで項目を追加・削除できること | 正常系 | `ui_data_record_dialog.md` §3.1、§3.2 | - | OK | |
| 5-2-25 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合にデータ記録ダイアログで実験データの入力・保存ができないこと | 表示確認 | `ui_data_record_dialog.md` §10.1 | - | OK | |
| 5-2-26 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合にデータ記録ダイアログでステータスが更新できないこと | 表示確認 | `ui_data_record_dialog.md` §10.1 | - | OK | |

**前提条件:**
- 実験作業者ロールでログイン済み
- プロジェクト・メソッド・タスクが選択済み
- 選択済みタスクにトランジションデータが存在する

**ビジネスルール（設計書より）:**
- 記録ボタンはプロジェクトステータスが `waiting_approval`, `waiting_task` の場合は無効化
- 問題報告ボタンは常に有効

**みなし進捗更新（`ui_data_record_dialog.md` §3.1 より）:**

| 条件 | チェックボックス | ステータス更新セクション | ステータス更新方法 |
|------|--------------|------------------------|------------------|
| `useDeemedProgress` Prop = true かつ チェックON（初期値） | **表示** | **非表示** | 保存時に自動判定 |
| `useDeemedProgress` Prop = true かつ チェックOFF | **表示** | **表示**（ステータス選択・進捗スライダー・コメント入力） | 手動入力 |
| `useDeemedProgress` Prop = false（組織設定でみなし進捗を使用しない） | **非表示** | **常時表示** | 手動入力 |
| プロジェクト編集不可 | - | 初期**折りたたみ**状態で表示 | - |

**トランジションステータス種別（`ui_data_record_dialog.md` §3.3 より）:**

| 値（数値） | ラベル | 備考 |
|-----------|--------|------|
| `0` | 初期状態 | |
| `1` | 準備状態 | |
| `2` | 準備完了状態 | |
| `3` | 動作状態 | |
| `4` | 休止状態 | |
| `5` | 終状態 | **終端ステータス（変更不可）** |
| `6` | 異常終了状態 | **終端ステータス（変更不可）** |

**ステータス遷移ルール（設計書 `ALLOWED_TRANSITIONS` より）:**

| 現在のステータス | 遷移可能なステータス |
|----------------|-------------------|
| 0: 初期状態 | 1: 準備状態、5: 終状態、6: 異常終了状態 |
| 1: 準備状態 | 2: 準備完了状態、5: 終状態、6: 異常終了状態 |
| 2: 準備完了状態 | 2: 自己遷移、3: 動作状態、5: 終状態、6: 異常終了状態 |
| 3: 動作状態 | 4: 休止状態、5: 終状態、6: 異常終了状態 |
| 4: 休止状態 | 3: 動作状態、5: 終状態、6: 異常終了状態 |
| 5: 終状態 | **遷移不可（変更不可）** |
| 6: 異常終了状態 | **遷移不可（変更不可）** |

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
| 5-3-11 | タイトルが100文字を超える場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | |
| 5-3-12 | 内容が1000文字を超える場合に問題報告がバリデーションエラーになること | 異常系 | `ui_issue_management_modal.md` §8.1 | - | OK | |
| 5-3-13 | 問題一覧で問題を選択すると詳細エリアにタイトル・状態・対象・報告者・報告時刻・内容が表示されること | 表示確認 | `ui_issue_management_modal.md` §7.2 | - | OK | |
| 5-3-14 | 問題詳細にコメントが存在する場合、コメント一覧（投稿者名・投稿時刻・コメント内容）が表示されること | 表示確認 | `ui_issue_management_modal.md` §7.2 | - | OK | |
| 5-3-15 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合に新規の問題報告ができないこと | 表示確認 | `ui_issue_management_modal.md` §4.3 | - | OK | |
| 5-3-16 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合にコメントの投稿ができないこと | 表示確認 | `ui_issue_management_modal.md` §4.3 | - | OK | |
| 5-3-17 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合にステータスの更新ができないこと | 表示確認 | `ui_issue_management_modal.md` §4.3 | - | OK | |

**前提条件:**
- 実験作業者ロールでログイン済み（5-3-1〜5-3-17）
- Manager権限ユーザーでログイン済み（5-3-6、5-3-7）
- プロジェクト・メソッド・タスクが選択済み
- 実験記録タブが表示されトランジション一覧が表示されている
- 問題データが1件以上存在すること（5-3-13、5-3-14）
- コメントが1件以上存在する問題データが存在すること（5-3-14）

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

### 5-4: 指示確認

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-4-1 | 指示確認タブでプロジェクト指示・タスク指示・トランジション指示が表示されること | 正常系 | 要件書#8、追加機能H | GET `/api/v1/instructions` | OK | |
| 5-4-2 | タスク指示グループを折りたたみ・展開できること | 正常系 | 追加機能I | - | OK | |
| 5-4-3 | プロジェクト指示の「確認完了」ボタンで確認完了処理が実行されること | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` | OK | |
| 5-4-4 | タスク指示の「確認完了」ボタンで確認完了処理が実行されること | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` | OK | |
| 5-4-5 | トランジション指示の「確認完了」ボタンで確認完了処理が実行されること | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` | OK | |
| 5-4-6 | 「確認完了」ボタンを押下したユーザーは同一指示に対して再度押下できないこと | 正常系 | 追加機能J | PUT `/api/v1/instructions/{instructionId}/confirm` | OK | |
| 5-4-7 | 指示がない場合に空状態メッセージが表示されること | 表示確認 | `ui_instruction_group.md` §9 | GET `/api/v1/instructions` | OK | |
| 5-4-8 | 「フロー図」ボタンをクリックするとフロー図ダイアログが表示されること | 正常系 | 追加機能O、`ui_instruction_confirmation_tab.md` §4.2 | GET `/api/v1/projects/:projectName/maiml` | OK | |
| 5-4-9 | 「全ての指示の確認完了」ボタンで全未確認指示が一括で確認完了になること | 正常系 | 追加機能P、`ui_instruction_confirmation_tab.md` §3.2 | PUT `/api/v1/instructions/{instructionId}/confirm` | OK | |
| 5-4-10 | プロジェクトステータスが「承認待ち（waiting_approval）」の場合に指示確認タブの「確認完了」ボタンが非活性になること | 表示確認 | `ui_instruction_group.md` §6.2 | - | OK | |

**前提条件:**
- 実験作業者ロールでログイン済み
- テスト用プロジェクトに指示データが登録済み（project_instructionテーブル）
  - プロジェクト指示（instruction_type: project）が1件以上存在すること（5-4-3）
  - タスク指示（instruction_type: task）が1件以上存在すること（5-4-4）
  - トランジション指示（instruction_type: transition）が1件以上存在すること（5-4-5）
  - 未確認状態の指示が1件以上存在すること（5-4-3〜5-4-6、5-4-10）
- プロジェクト・メソッド・タスクが選択済み

**ビジネスルール（設計書より）:**
- 「確認完了」ボタンは未確認状態（`isAcknowledged: false`）の指示グループに表示、全件確認済みの場合は `disabled`
- 確認完了後（`isAcknowledged: true`）は同一ユーザーによる再押下は不可（ボタン無効化）
- `readOnly=true`（オーバーレイ閲覧モード）の場合は全確認完了ボタンが無効化
- プロジェクトステータスが `waiting_approval` の場合は「確認完了」ボタンが無効化

**各ボタンの確認完了シナリオ詳細（5-4-3〜5-4-6）:**

| シナリオID | 指示種別 | 操作内容 | 期待結果 |
|-----------|---------|---------|---------|
| 5-4-3 | プロジェクト指示 | 未確認のプロジェクト指示グループの「確認完了」ボタンを押下 | APIが呼び出され、ボタンがdisabledになること |
| 5-4-4 | タスク指示 | 未確認のタスク指示グループの「確認完了」ボタンを押下 | APIが呼び出され、ボタンがdisabledになること |
| 5-4-5 | トランジション指示 | 未確認のトランジション指示グループの「確認完了」ボタンを押下 | APIが呼び出され、ボタンがdisabledになること |
| 5-4-6 | 任意（確認済み） | 全件確認済みの指示グループを表示 | 「確認完了」ボタンがdisabledとなり再押下不可であること |

---

### 5-5: 進捗確認・承認依頼

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 5-5-1 | 進捗確認タブでタスク一覧がメソッドタブ別に表示されること | 正常系 | 要件書#1、追加機能C | GET `/api/v1/worker/tasks` | OK | |
| 5-5-2 | 進捗確認タブでタスクのステータスを「開始」に変更できること | 正常系 | 要件書#1 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | OK | |
| 5-5-3 | 進捗確認タブ表示時のみ「承認依頼」ボタンが表示されること | 表示確認 | 追加機能K | - | OK | |
| 5-5-4 | プロジェクト選択時に承認依頼ボタンが活性化されること | 表示確認 | `ui_experiment_worker_main.md` §3.2.3 | - | OK | |
| 5-5-5 | 「指示確認」ボタンをクリックすると指示確認タブに遷移すること | 正常系 | `ui_task_list_table.md` §5.3 | - | OK | |
| 5-5-6 | 「実験記録」ボタンをクリックすると実験記録タブに遷移すること | 正常系 | `ui_task_list_table.md` §5.3 | - | OK | |
| 5-5-7 | 「問題確認」ボタンをクリックすると問題確認モーダルが参照専用で開くこと | 正常系 | `ui_task_list_table.md` §5.3 | GET `/api/v1/issues` | OK | |
| 5-5-8 | 「強制終了」ボタンをクリックするとタスクが強制終了されること | 正常系 | `ui_task_list_table.md` §5.3 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | OK | |
| 5-5-9 | 進捗率をクリックするとフロー図ダイアログが表示されること | 正常系 | `ui_task_list_table.md` §5.2 | - | OK | |
| 5-5-10 | プロジェクトステータスが編集不可（waiting_approval）の場合に「開始」ボタンが無効化されること | 表示確認 | `ui_task_list_table.md` §5.3 | - | OK | |
| 5-5-11 | タスクステータスが「開始前（not_started）」以外の場合に「開始」ボタンが無効化されること | 表示確認 | `ui_task_list_table.md` §5.3 | - | OK | |
| 5-5-12 | タスクステータスが「完了（completed）」または「強制終了（forced_terminated）」の場合に「強制終了」ボタンが無効化されること | 表示確認 | `ui_task_list_table.md` §5.3 | - | OK | |
| 5-5-13 | 「承認依頼」ボタンをクリックすると承認依頼が送信され、成功メッセージが表示されること | 正常系 | `ui_experiment_worker_main.md` §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | OK | |
| 5-5-14 | 承認依頼送信後にプロジェクトステータスが「承認待ち（waiting_approval）」に更新されること | 正常系 | `ui_experiment_worker_main.md` §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | OK | |
| 5-5-15 | 既に承認依頼済みのプロジェクトで再度「承認依頼」ボタンをクリックするとエラーメッセージが表示されること | 異常系 | `ui_experiment_worker_main.md` §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | OK | |
| 5-5-16 | 進捗確認タブのメソッドタブが`project_task`テーブルの`experiment_order`の昇順で表示されること | 表示確認 | `ui_progress_check_tab.md` | GET `/api/v1/worker/tasks` | OK | |

**前提条件:**
- 実験作業者ロールでログイン済み
- テスト用プロジェクトにタスクデータが存在する（project_taskテーブル）
- プロジェクトが選択済み

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
| テスト用プロジェクト（status: executing_task） | 5-1, 5-2, 5-3, 5-4, 5-5 | DBに事前挿入 |
| プロジェクトに紐づくメソッド・タスク | 5-1, 5-2, 5-5 | project_taskテーブルに挿入 |
| トランジションデータ（transition_setテーブル） | 5-2, 5-3 | MAIMLから生成 |
| 指示データ（project_instructionテーブル） | 5-4 | DBに事前挿入 |
| 承認依頼前プロジェクト（status: executing_task） | 5-5-13〜5-5-15 | DBに事前挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 1 | タスクの選択・実行（作業開始・中断・再開） | ✅ `ProgressCheckTab` / `MethodTaskSelectionModal` | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | **5-1, 5-5** |
| 2 | ワークフローに従った作業手順の順次実行 | ✅ `TransitionList` / `TransitionFlowDiagram` | GET `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | **5-2** |
| 3 | 実験条件（実験者名・作業記録・実験結果・計測結果・実験ログ）の登録 | ✅ `DataRecordDialog` | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-2** |
| 4 | 実験作業中のメモ・気づきの入力（作業手順に紐づいて記録） | ✅ `DataRecordDialog`（コメント欄） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-2** |
| 5 | 事前設定条件と異なる実験条件で実施した場合の実際条件の記録 | ✅ `DataRecordDialog`（ステータス・コメント入力） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-2** |
| 6 | 計測・分析結果の登録（計測・分析システムからのデータ取得） | ✅ `DataRecordDialog` | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-2** |
| 7 | 作業手順ごとの実験機器・計測装置の操作 | ✅ `TransitionList`（記録ボタン） | POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-2** |
| 8 | 実験管理者からの指示事項・注意事項の確認 | ✅ `InstructionConfirmationTab` / `InstructionGroup` | GET `/api/v1/instructions` | **5-4** |
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
| C | 進捗確認タブでのタスク一覧表示（メソッドタブ切り替え） | `ui_progress_check_tab.md`, `ui_progress_check_table.md` | GET `/api/v1/worker/tasks` | **5-5** |
| D | 問題報告（トランジション単位・タスク単位） | `ui_transition_list.md` §5.2, `ui_issue_management_modal.md` | POST `/api/v1/issues` | **5-3** |
| E | 問題へのコメント投稿 | `ui_issue_management_modal.md` | POST `/api/v1/issues/comments` | **5-3** |
| F | 問題一覧の確認（フィルタリング・ページネーション） | `ui_issue_management_modal.md` | GET `/api/v1/issues` | **5-3** |
| G | 問題ステータス変更（未解決⇔解決済） | `ui_issue_management_modal.md` §8 | PATCH `/api/v1/issues/status` | **5-3** |
| H | 指示のグループ表示（プロジェクト/タスク/トランジション別） | `ui_instruction_group.md` §3.1 | GET `/api/v1/instructions` | **5-4** |
| I | 指示グループの折りたたみ/展開 | `ui_instruction_group.md` §4 | - | **5-4** |
| J | 指示確認完了ボタン（グループ単位・全体一括） | `ui_instruction_group.md` §6.2, `ui_instruction_confirmation_tab.md` §3.2 | PUT `/api/v1/instructions/{instructionId}/confirm` | **5-4** |
| K | 承認依頼（進捗確認タブから送信） | `ui_experiment_worker_main.md` §3.2.3, §15.2 | PATCH `/api/v1/projects/{projectName}/approval-request` | **5-5** |
| L | トランジションのフロー図表示（TransitionFlowDiagram） | `ui_transition_flow_diagram.md` | - | **5-2** |
| M | 実験データ保存後のテンプレート実績取得（ダイアログオープン時） | `ui_data_record_dialog.md` §5.4 | GET `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` | **5-2** |
| N | 記録済みバッジ表示（テンプレート行に緑ドット） | `ui_data_record_dialog.md` §3.3 | - | **5-2** |
| O | 指示確認タブのフロー図ダイアログ表示（ドラッグ&リサイズ） | `ui_instruction_flow_dialog.md` | GET `/api/v1/projects/:projectName/maiml` | **5-4** |
| P | 全ての指示の一括確認完了 | `ui_instruction_confirmation_tab.md` §3.2 | PUT `/api/v1/instructions/{instructionId}/confirm` | **5-4** |
| Q | 組織設定によるみなし進捗チェックボックス表示制御 | `ui_data_record_dialog.md` §3.1（`useDeemedProgress` Prop） | - | **5-2** |

---

## 6. 設計書との差異・懸念事項

### 6.1 旧テストシナリオからの主な変更点

#### 2026-03-13

| # | 変更内容 | 詳細 |
|---|---------|------|
| 1 | 5-1グループにシナリオを追加（計5件→9件） | プロジェクト選択モーダルのあいまい検索・プロジェクト名フィルター、メソッド・タスク選択モーダルのステータスフィルター・AND条件適用を追加（5-1-6〜5-1-9） |
| 2 | 5-1-5の根拠を `§7` → `§7.2` に修正 | より具体的なセクション番号に更新 |
| 3 | 5-2グループにシナリオを追加（計23件→24件） | プロパティリストタイプのプロパティ追加・削除を追加（5-2-24） |
| 4 | 5-3グループにシナリオを追加（計7件→14件）・補足情報追加 | バリデーション（内容必須・問題タイプ必須・内容最小10文字・タイトル最大100文字・内容最大1000文字）と問題詳細表示項目確認（基本情報・コメント一覧）を追加（5-3-8〜5-3-14）、前提条件・バリデーション詳細表・問題詳細表示項目表を追記 |
| 5 | 合計件数を64件→71件に修正 | 5-3グループの増加（+7件）に伴う更新 |
| 6 | 5-5グループにシナリオを追加（計15件→16件） | メソッドタブが`project_task`テーブルの`experiment_order`の昇順で表示されることを確認するシナリオを追加（5-5-16）、合計件数を71件→72件に修正 |
| 7 | waiting_approval時の操作制限シナリオを追加（計72件→78件） | 5-2グループに2件追加（実験データ入力・保存不可、ステータス更新不可）、5-3グループに3件追加（新規問題報告不可、コメント投稿不可、ステータス更新不可）、5-4グループに1件追加（確認完了ボタン非活性）（5-2-25〜5-2-26、5-3-15〜5-3-17、5-4-10） |

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
| 実験作業者メイン画面設計 | `docs/design/ui/experiment_worker/ui_experiment_worker_main.md` |
| 実験記録タブ設計 | `docs/design/ui/experiment_worker/ui_experiment_record_tab.md` |
| データ記録ダイアログ設計 | `docs/design/ui/experiment_worker/ui_data_record_dialog.md` |
| トランジション一覧設計 | `docs/design/ui/experiment_worker/ui_transition_list.md` |
| トランジションフロー図設計 | `docs/design/ui/experiment_worker/ui_transition_flow_diagram.md` |
| 進捗確認タブ設計 | `docs/design/ui/experiment_worker/ui_progress_check_tab.md` |
| 進捗確認テーブル設計 | `docs/design/ui/experiment_worker/ui_progress_check_table.md` |
| タスク一覧テーブル設計 | `docs/design/ui/experiment_worker/ui_task_list_table.md` |
| 指示確認タブ設計 | `docs/design/ui/experiment_worker/ui_instruction_confirmation_tab.md` |
| 指示グループ設計 | `docs/design/ui/experiment_worker/ui_instruction_group.md` |
| 指示統計設計 | `docs/design/ui/experiment_worker/ui_instruction_stats.md` |
| 指示フロー図ダイアログ設計 | `docs/design/ui/experiment_worker/ui_instruction_flow_dialog.md` |
| 問題管理モーダル設計 | `docs/design/ui/experiment_worker/ui_issue_management_modal.md` |
| メソッド・タスク選択モーダル設計 | `docs/design/ui/experiment_worker/ui_method_task_selection_modal.md` |
| プロジェクト選択モーダル設計 | `docs/design/ui/experiment_worker/ui_project_selection_modal.md` |
| 実験作業者API一覧 | `docs/design/api/API一覧_実験作業者画面.md` |
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
| 実験管理者テスト対象一覧（参考） | `docs/20260310_1106_実験管理者シナリオテスト/4_experiment_admin_test_targets.md` |
