# 実験管理者 シナリオテスト対象一覧

> **作成日**: 2026-03-10
> **更新日**: 2026-08-23（§4-8 新規フォーマットフォルダ作成シナリオ追加：4-8-3〜4-8-8、4-8-57〜4-8-58）
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）
> **照合先**: UI設計書（`docs/design/ui/experiment_admin/`）、API設計書（`docs/design/api/`）
>
> **フェーズ２更新内容**:
> - フェーズ２新機能として以下のシナリオグループを追加
>   - **4-18: 名前空間管理**（4-18-A: 基本操作/ツリー操作、4-18-B: プレフィックス管理、4-18-C: 不確かさ基準管理、4-18-D: 用語管理）

---

## 0. テスト実施情報

| 項目 | 値 |
|------|-----|
| テスト実施日 | - |
| テスト実施者 | - |
| テスト環境バージョン | - |
| 総合判定 | - |
| 備考 | - |

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | 根拠 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|------|-----------|-----------|------|-------|-------|
| **4-1** | プロジェクト作成・ファイル操作 | 要件書#1、追加機能C/D/M、`ui_create_project_modal.md`、`docs/design/spec/organization_group_project_access.md` | 31件 | 手動 | 0 | 0 | 31 |
| **4-2** | MAIML編集（PetriNetEditor） | 要件書#2 | 53件 | 手動 | 0 | 0 | 53 |
| **4-3** | チェックアウト/チェックイン | 要件書#4/#5 | 9件 | 手動 | 0 | 0 | 9 |
| **4-4** | タスク登録 | 要件書#3、追加機能K/N | 10件 | 手動 | 0 | 0 | 10 |
| **4-5** | 指示登録・送信 | 要件書#6、追加機能G/H/I/O | 7件 | 手動 | 0 | 0 | 7 |
| **4-6** | 進捗確認・タスク結果 | 要件書#7/#15、追加機能E/F/J/P | 13件 | 手動 | 0 | 0 | 13 |
| **4-7** | プロジェクトフィルタ・検索 | 追加機能A/B/Q | 3件 | 手動 | 0 | 0 | 3 |
| **4-8** | フォーマット管理 | 要件書#13、`docs/改善仕様調査/No.13/PLAN.md`（No.13対応） | 63件 | 手動 | 0 | 0 | 63 |
| **4-9** | トランジション検索 | 追加機能R | 10件 | 手動 | 0 | 0 | 10 |
| **4-10** | プロジェクト公開 | 追加機能S | 11件 | 手動（フロントエンド実装後） | 0 | 0 | 11 |
| **4-11** | ファイルアップロード | `ui_bulk_upload_dialog.md`、`docs/改善仕様調査/No.13/PLAN.md`（No.13対応） | 17件 | 手動 | 0 | 0 | 17 |
| **4-12** | 問題管理 | `ui_issue_management_modal.md`、`api_issue_management.md` | 8件 | 手動 | 0 | 0 | 8 |
| **4-13** | ノード表示切替ドロップダウン | `docs/改善仕様調査/No.7a/result.md`（No.7a対応） | 16件 | 手動 | 0 | 0 | 16 |
| **4-14** | PropertyViewer 値なし区別表示・ツールチップ | `docs/改善仕様調査/No.8/result.md`（No.8対応） | 15件 | 手動 | 0 | 0 | 15 |
| **4-15** | 未保存変更チェック | `docs/改善仕様調査/No.19/PLAN.md`（No.19対応） | 15件 | 手動 | 0 | 0 | 15 |
| **4-16** | テンプレートモード時のツールバーボタン非活性化 | `docs/改善仕様調査/No.20/PLAN.md`（No.20対応） | 4件 | 手動 | 0 | 0 | 4 |
| **4-17** | SubNetViewer トランジション用テンプレート表示 | `docs/改善仕様調査/No.28/result.md`（No.28対応） | 16件 | 手動 | 0 | 0 | 16 |
| **4-18** | 名前空間管理 ※フェーズ２追加 | `docs/requirement/phase2/01_namespace/`、`ui/experiment_admin/04_namespace_management/`、`api_namespace.md`、`api_uncertainty_criteria.md` | 33件 | 手動 | 0 | 0 | 33 |
| **合計** | - | - | **325件** | - | **0** | **0** | **325** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| 信頼性フラグの記録（要件書#8） | 設計書に実装なし |
| データマート関連（要件書#9-11） | 設計書に実装なし |
| 操作履歴の閲覧（要件書#12） | 設計書に実装なし |
| システムダウン通知（要件書#14） | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 4-1: プロジェクト作成・ファイル操作

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-1-1 | プロジェクトを新規作成できること | 正常系 | 要件書#1 | POST `/api/v1/projects` | - | |
| 4-1-2 | プロジェクト名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - | - | |
| 4-1-3 | プロジェクト名が3文字未満の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - | - | |
| 4-1-4 | プロジェクト名が100文字超の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - | - | |
| 4-1-5 | キャンセルしてもプロジェクトが作成されないこと | 正常系 | `CreateProjectModal` キャンセル | - | - | |
| 4-1-6 | 既存のプロジェクト名を入力した場合に重複エラーが表示されること | 異常系 | 要件書#1、API 409エラー | POST `/api/v1/projects` | - | |
| 4-1-7 | プロジェクト未選択時は「プロジェクトダウンロード（ZIP）」ボタンが非活性であること | 表示確認 | `ui_project_management.md` §2.2.4 | - | - | |
| 4-1-8 | プロジェクト選択後に「プロジェクトダウンロード（ZIP）」ボタンが活性化されること | 表示確認 | `ui_project_management.md` §2.2.4 | - | - | |
| 4-1-9 | 「プロジェクトダウンロード」ボタンをクリックするとZIPファイルがダウンロードされること | 正常系 | 追加機能D、`ui_project_management.md` §3.7 | POST `/api/v1/files/download-folder-zip` | - | |
| 4-1-10 | ファイル一覧の「ダウンロード」ボタンをクリックするとファイルがダウンロードされること | 正常系 | 追加機能C、`ui_file_list_table.md` §3.4 | POST `/api/v1/files/download` | - | |
| 4-1-11 | ダウンロード中は該当ファイルの「ダウンロード」ボタンがローディング状態になり、他のダウンロードボタンが非活性になること | 表示確認 | `ui_file_list_table.md` §3.4.2 | - | - | |
| 4-1-12 | ファイルダウンロードに失敗した場合にエラーメッセージが表示されること | 異常系 | `ui_file_list_table.md` §9.1 | POST `/api/v1/files/download` | - | |
| 4-1-13 | ファイル一覧の「ビューア」ボタンをクリックするとビューアダイアログが起動すること | 正常系 | 追加機能C、`ui_file_list_table.md` §3.5 | - | - | |
| 4-1-14 | 複数のビューアダイアログを同時に開けること（上限5個） | 正常系 | `ui_project_management.md` §3.10.2 | - | - | |
| 4-1-15 | 5個を超えてビューアダイアログを開こうとすると警告メッセージが表示されること | 異常系 | `ui_project_management.md` §3.10.2 | - | - | |
| 4-1-21 | ファイル一覧の各ファイル行に「…（その他）」メニューボタンが表示されること | 表示確認 | `ui_file_list_table.md` PR#138 §2.2.3 | - | - | |
| 4-1-22 | 「…」メニューを開くと「名前の変更」と「削除」の項目が表示されること | 表示確認 | `ui_file_list_table.md` §2.2.3 | - | - | |
| 4-1-23 | 「名前の変更」メニュー項目をクリックすると名前の変更ダイアログが開き、名前変更できること | 正常系 | `ui_file_list_table.md` §2.2.3（未実装メッセージ） | - | - | |
| 4-1-24 | MAIMLファイルの「削除」メニュー項目をクリックすると削除確認ダイアログが表示されること | 正常系 | `ui_file_list_table.md` §2.2.3、`ui_project_management.md` PR#138 §2.2.4 | - | - | |
| 4-1-25 | 削除確認ダイアログでキャンセルするとMAIMLファイルが削除されないこと | 正常系 | `ui_file_list_table.md` §2.2.3 | - | - | |
| 4-1-26 | 削除確認ダイアログで確認するとMAIMLファイルおよびarchiveフォルダ内の全バージョンファイルが削除され、`project_maiml_flg`が`false`に更新されること | 正常系 | `docs/改善仕様調査/No.1/20260331_1137_MAIMLファイル削除時Archiveフォルダ削除/PLAN.md` §実装内容 | DELETE `/api/v1/projects/:projectName/maiml` | - | S3上のarchiveフォルダも含めて全削除 |
| 4-1-27 | archiveフォルダが存在しないプロジェクトのMAIMLファイルを削除しても正常に完了すること | 正常系 | `docs/改善仕様調査/No.1/20260331_1137_MAIMLファイル削除時Archiveフォルダ削除/PLAN.md` §8 | DELETE `/api/v1/projects/:projectName/maiml` | - | 初回アップロードのみで未バージョニングの場合 |
| 4-1-28 | `project_status`が実行中（in_progress）のプロジェクトのMAIMLファイルは削除できないこと | 異常系 | `docs/改善仕様調査/No.1/20260327_0822_maimlファイル削除時project_status確認追加/PLAN.md`、`ui_project_management.md` §6.1 | DELETE `/api/v1/projects/:projectName/maiml` | - | エラーメッセージが表示されること |
| 4-1-29 | ファイル操作ツールバーの「名前変更」ボタンをクリックするとプロジェクト名変更モーダル（RenameProjectModal）が表示されること | 正常系 | `ui_project_management.md` §2.2.4、§2.3 | - | - | チェックアウト中・status=4・status=5 の場合は非活性 |
| 4-1-30 | ファイル操作ツールバーの「バリデーション確認」ボタンをクリックするとMAIMLバリデーションモーダル（MaimlValidationModal）が表示されること | 正常系 | `ui_project_management.md` §2.2.4、§2.3 | - | - | プロジェクト未選択時は非活性 |
| 4-1-31 | プロジェクト管理画面を開いた際に未保存の下書きが自動検出された場合、DraftRestoreDialog が表示されること | 正常系 | `ui_project_management.md` §2.3 `DraftRestoreDialog`（マウント時Draft自動検出） | - | - | 下書き復元ダイアログで「復元する」「破棄」を選択できること |
| 4-1-32 | 新規プロジェクト作成モーダルを開くとチーム一覧（`GET /api/v1/organization-groups`）が取得され、チーム選択ドロップダウンに表示されること | 表示確認 | `ui_create_project_modal.md` §3.0、§2.2.2 フィールド3 | GET `/api/v1/organization-groups` | - | ローディング中はスピナーが表示されること（`data-testid="create-project-org-group-select"`） |
| 4-1-33 | チームを選択してプロジェクトを作成すると `organizationGroupCd` が含まれた状態でプロジェクトが登録されること | 正常系 | `ui_create_project_modal.md` §3.1、§4.3 `CreateProjectData` | POST `/api/v1/projects` | - | |
| 4-1-34 | チームを未選択のままプロジェクト作成しようとするとバリデーションエラー（必須選択）が表示されること | 異常系 | `ui_create_project_modal.md` §2.2.2 フィールド3 バリデーション | - | - | |
| 4-1-35 | 自分が所属するチームおよびその下位チームに紐づくプロジェクトがプロジェクト一覧に表示されること | 正常系 | `docs/design/spec/organization_group_project_access.md` §4.2「ステップ1」`findDescendantCds` | GET `/api/v1/projects` | - | 例: `HQ` 所属ユーザーは `HQ-DEV`・`HQ-DEV-A` のプロジェクトも閲覧可能 |
| 4-1-36 | 自分が所属するチームより上位のチームに紐づくプロジェクトはプロジェクト一覧に表示されないこと | アクセス制御 | `docs/design/spec/organization_group_project_access.md` §4「閲覧可能条件まとめ」 | GET `/api/v1/projects` | - | 例: `HQ-DEV` 所属ユーザーは `HQ` のプロジェクトが表示されないこと |
| 4-1-37 | 自分が直接所属するチームに紐づくプロジェクトは `isEditable=true`（編集ボタンが活性）であること | 表示確認 | `docs/design/spec/organization_group_project_access.md` §5.1「直接所属グループのプロジェクト」 | GET `/api/v1/projects` | - | ファイル操作ツールバーの「編集」「チェックアウト」等ボタンが活性であること |
| 4-1-38 | 自分が所属するチームの下位チームに紐づくプロジェクトは閲覧可能だが `isEditable=false`（編集ボタンが非活性）であること | 表示確認 | `docs/design/spec/organization_group_project_access.md` §5.1「子孫グループにのみ所属」→編集不可 | GET `/api/v1/projects` | - | 例: `HQ` 所属ユーザーが `HQ-DEV` のプロジェクトを選択すると「編集」「チェックアウト」ボタンが非活性 |
| 4-1-39 | 自分が `chief_user_id`（代表者）として登録されているチームの非アクティブな下位チームに紐づくプロジェクトは `isEditable=true`（編集可能）であること | 正常系 | `docs/design/spec/organization_group_project_access.md` §5.2「非アクティブグループ編集権限特例」`inactiveEditableCds` | GET `/api/v1/projects` | - | `chief_user_id` が一致する祖先グループを持つ非アクティブグループのプロジェクトで確認 |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブが表示されている
- テスト用プロジェクトがDB・S3に存在すること（4-1-7〜4-1-34）
- テスト用プロジェクトのS3にファイルが存在すること（4-1-10〜4-1-15）
- MAIMLファイル削除シナリオ（4-1-21〜4-1-28）用: MAIMLファイルが登録済み（`project_maiml_flg = true`）のプロジェクトが1件以上存在すること
- 名前変更シナリオ（4-1-29）用: チェックイン済みかつ status が 0/3/5 のプロジェクトが1件存在すること
- バリデーション確認シナリオ（4-1-30）用: MAIMLファイルが登録済みのプロジェクトが1件存在すること
- DraftRestoreDialog シナリオ（4-1-31）用: IndexedDB（または localStorage）に未保存下書きデータが存在すること
- チーム選択シナリオ（4-1-32〜4-1-34）用: `organization_group` テーブルに1件以上のアクティブなチームが存在すること
- チーム階層閲覧制御シナリオ（4-1-35〜4-1-36）用: 以下の階層構造を持つグループとプロジェクトが存在すること
  - 親グループ（例: `HQ`）に紐づくプロジェクトが1件以上存在すること
  - 子グループ（例: `HQ-DEV`）に紐づくプロジェクトが1件以上存在すること
  - 孫グループ（例: `HQ-DEV-A`）に紐づくプロジェクトが1件以上存在すること
  - テストユーザーAが `HQ` にのみ所属すること（下位プロジェクトの閲覧確認用）
  - テストユーザーBが `HQ-DEV` にのみ所属すること（上位プロジェクトの非表示確認用）
- `isEditable` 制御シナリオ（4-1-37〜4-1-38）用:
  - テストユーザーが `HQ` に直接所属し、`HQ` のプロジェクトと `HQ-DEV` のプロジェクトの両方が存在すること
- チーム代表者編集権限シナリオ（4-1-39）用:
  - 非アクティブグループ（`is_active=false`）とその有効な祖先グループが存在すること
  - テストユーザーが有効祖先グループの `chief_user_id` として登録されていること
  - 非アクティブグループに紐づくプロジェクトが1件以上存在すること
- 4-1-26用: S3のarchiveフォルダにバージョンファイル（`_v1`, `_v2`等）が存在するプロジェクトが1件以上存在すること
- 4-1-27用: archiveフォルダが存在しない（初回アップロードのみ）プロジェクトが1件以上存在すること
- 4-1-28用: `project_status = 2`（タスク実行中: in_progress）のプロジェクトにMAIMLファイルが登録済みであること

**後処理:**
- 作成したプロジェクトを `project` テーブルから削除
- ダウンロードされたZIPファイルをローカルから削除（4-1-9）
- ダウンロードされた個別ファイルをローカルから削除（4-1-10）
- 削除したMAIMLファイルをS3/Swiftから復元（4-1-26〜4-1-27）
- `project` テーブルの `project_maiml_flg` を `true` に戻す（4-1-26〜4-1-27）

---

### 4-2: MAIML編集（PetriNetEditor）

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-2-1 | PetriNetEditorでワークフローを開いて表示できること | 正常系 | 要件書#2 | - | |
| 4-2-2 | PetriNetEditorでノード・トランジションを編集して保存できること | 正常系 | 要件書#2 | - | |
| 4-2-3 | 編集内容がS3に反映されMAIMLファイルが更新されること | 正常系 | 要件書#2 | - | |
| 4-2-4 | ペトリネット編集画面が表示されること（ノード・エッジの描画確認） | 正常系 | `ui_petri_net_editor_screen.md` §2.1、`ui_petri_net_editor.md` §6.1 | - | |
| 4-2-5 | ビューモードを「テンプレート」に切り替えるとテンプレート一覧が表示されること | 正常系 | `ui_editor_toolbar.md` §5.1、`ui_petri_net_editor.md` §5.13 | - | |
| 4-2-6 | メソッドタブからメソッドを追加でき、タブが増えること | 正常系 | `ui_petri_net_editor.md` §5.7 | - | |
| 4-2-7 | ツールバーの「Material」ボタン（またはM+クリック）でMaterialノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | - | |
| 4-2-8 | ツールバーの「Condition」ボタン（またはC+クリック）でConditionノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | - | |
| 4-2-9 | ツールバーの「Result」ボタン（またはR+クリック）でResultノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | - | |
| 4-2-10 | ツールバーの「Transition」ボタン（またはT+クリック）でTransitionノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | - | |
| 4-2-11 | ワークフロー取込モードを有効にしてMAIMLファイルを選択するとサブネットが追加されること | 正常系 | `ui_editor_toolbar.md` §5.3、`ui_workflow_selector_dialog.md` §5.5 | - | |
| 4-2-12 | Documentボタンからドキュメント情報（名前・日付・Creator等）を編集して保存できること | 正常系 | `ui_editor_toolbar.md` §5.4、`ui_document_edit_dialog.md` §3.1.8 | - | |
| 4-2-13 | バリデーションボタンをクリックするとバリデーション結果パネルが表示されること | 正常系 | `ui_editor_toolbar.md` §5.4、`ui_validation_panel.md` §5.1 | - | |
| 4-2-14 | バリデーションエラーがある場合にエラー箇所が強調表示されること | 正常系 | `ui_petri_net_editor.md` §5.8、`ui_validation_panel.md` §5.3 | - | |
| 4-2-15 | 保存ダイアログからS3への保存ができること | 正常系 | `ui_save_confirm_dialog.md` §5.4、`ui_petri_net_editor_screen.md` §3.1.2 | - | |
| 4-2-16 | Draftボタンから下書き管理ダイアログが開き、現在の編集内容を下書き保存できること | 正常系 | `ui_draft_manager.md` §3.1.2、`ui_editor_toolbar.md` §5.4 | - | |
| 4-2-17 | 自動保存をONにすると一定時間ごとに下書きが自動保存されること | 正常系 | `ui_draft_manager.md` §3.1.5、`ui_editor_toolbar.md` §5.5 | - | |
| 4-2-18 | ValidationPanelでエラー一覧の各行にチェックボックスが表示されること | 表示確認 | `ui_validation_panel.md` §5.3、自動補正機能 | - | |
| 4-2-19 | ValidationPanelでエラーを1件以上選択すると「自動補正」ボタンが活性化されること | 表示確認 | `ui_validation_panel.md` §自動補正ボタン | - | |
| 4-2-20 | エラー未選択の状態で「自動補正」ボタンをクリックすると警告メッセージが表示されること | 異常系 | `ValidationPanel.tsx` handleApplyCorrections | - | |
| 4-2-21 | version属性が欠落したMAIMLに対して自動補正を実行すると `version="1.0"` が追加されること | 正常系 | `maimlParser.ts` generateAutoCorrections / MISSING_REQUIRED | - | |
| 4-2-22 | 名前空間が欠落したMAIMLに対して自動補正を実行すると正しい xmlns が追加されること　※補正対象は `<maiml>` ルート要素の `xmlns` 属性（デフォルト名前空間）のみ。
 | 正常系 | `maimlParser.ts` generateAutoCorrections / NAMESPACE_ERROR | - | |
| 4-2-23 | 未定義の参照（reference_error）を含むMAIMLに対して自動補正を実行すると無効な ref 属性が削除されること | 正常系 | `maimlParser.ts` generateAutoCorrections / REFERENCE_ERROR | - | |
| 4-2-24 | 保存ダイアログの「自動補正して保存」ボタンをクリックすると補正処理が実行された後に保存されること | 正常系 | `SaveConfirmDialog` auto-correct アクション | - | |
| 4-2-25 | 重複IDエラー・シンタックスエラーは自動補正の対象外であり、補正後もエラーが残ること | 異常系 | `maimlService.ts` autoCorrectMaiml 制限事項 | - | |
| 4-2-26 | 自動補正適用後に再バリデーションが自動実行され、ValidationPanelの結果が更新されること | 正常系 | `PetriNetEditorInner.tsx` handleAutoCorrect → handleRevalidate | - | |
| 4-2-27 | ビューモードを「XMLビュー」に切り替えるとXMLビューパネルが表示されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase3、`EditorToolbar.tsx` viewMode='xml' | - | |
| 4-2-28 | XMLビューにMAIML XMLがシンタックスハイライト付きで表示されること | 表示確認 | `docs/改善仕様調査/No.3/PLAN.md` Phase1、`XMLViewer.tsx` | - | ローディングスピナー（Ant Design Spin）表示後にXMLが描画されること |
| 4-2-29 | ペトリネットにノード/エッジを追加後にXMLビューへ切り替えると追加内容がXMLに反映されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase2、`XMLViewerWrapper.tsx` convertReactFlowToMaiML | - | リアルタイム変換の確認 |
| 4-2-30 | 複数メソッドモードで各メソッドのXMLが正しく出力されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase2、`XMLViewerWrapper.tsx` convertMultipleMethodsToMaiML | - | メソッドタブを2件以上追加した状態で確認 |
| 4-2-31 | XMLビューの「コピー」ボタンをクリックするとXML文字列がクリップボードにコピーされること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase5、`XMLViewer.tsx` コピーボタン | - | ブラウザのクリップボードに内容がセットされることを確認 |
| 4-2-32 | XMLビューの「ダウンロード」ボタンをクリックすると `.xml` ファイルがダウンロードされること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase5、`XMLViewer.tsx` ダウンロードボタン | - | ダウンロードされたファイルの内容がXMLとして有効であること |
| 4-2-33 | XMLビューからペトリネットビューに戻るとビューポート（位置・ズーム）が保持されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase3、`PetriNetEditorInner.tsx` handleViewModeChange | - | ビューポート保存ロジックが `'xml'` モード遷移時にも動作すること |
| 4-2-34 | ペトリネット/テンプレート/XMLビューの3モード間で相互に切り替えられること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase3、`EditorToolbar.tsx` Segmented | - | 各モードへの往復切り替えでUIが正常に表示されること |
| 4-2-35 | 単一Methodのノードをドラッグで移動して保存すると、ダウンロードしたMAIMLファイルの各 place/transition 要素直下に `<position x="..." y="..."/>` タグが出力されること | 正常系 | `docs/改善仕様調査/No.6/result.md` §修正ファイル4・`reactFlowToMaiml.ts` | - | 座標値は整数（`Math.round`）で出力されること |
| 4-2-36 | 複数Methodのノードをドラッグで移動して保存すると、各Methodの place/transition 要素直下に `<position x="..." y="..."/>` タグが出力されること | 正常系 | `docs/改善仕様調査/No.6/result.md` §修正ファイル5・`multiMethodConverter.ts` | - | メソッドタブを2件以上追加した状態で確認 |
| 4-2-37 | `<position>` タグを含むMAIMLファイルを読み込むと、ノードが保存時の座標に配置されること（自動レイアウトが適用されないこと） | 正常系 | `docs/改善仕様調査/No.6/result.md` §修正ファイル2・3・`reactFlowConverter.ts` | - | 保存前後でキャンバス上のノード位置が一致することを目視確認 |
| 4-2-38 | `<position>` タグを含まない旧形式のMAIMLファイルを読み込むと、自動レイアウト（`calculateSimpleLayout`）が適用されてノードが配置されること | 正常系 | `docs/改善仕様調査/No.6/README.md` §5・フォールバック動作 | - | `<position>` タグなしのMAIMLを用意してインポートする |
| 4-2-39 | ノードを任意の位置に移動→保存→MAIMLファイルをダウンロード→再読み込みの一連操作で、ノード位置が保存前と一致すること（往復整合性） | 正常系 | `docs/改善仕様調査/No.6/result.md` §データフロー | - | 単一Method・複数Methodの両パターンで確認すること |
| 4-2-40 | （実験指示タブ-ペトリネット表示機能）Placeノードをクリックすると PropertyViewer（Drawer）が開き、基本情報・テンプレート・データの3タブが表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1 | - | No.8対応: PropertyViewer値なし区別 |
| 4-2-41 | （実験指示タブ-ペトリネット表示機能）基本情報タブで値が `undefined` のプロパティは「未設定」斜体テキストとして表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1「区別表示まとめ」 | - | 変更前は識別不能だった状態 |
| 4-2-42 | （実験指示タブ-ペトリネット表示機能）基本情報タブで値が `undefined` のプロパティにカーソルを合わせると「値が設定されていません」ツールチップが表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1 renderValue()修正 | - | Tooltip title="値が設定されていません" |
| 4-2-43 | （実験指示タブ-ペトリネット表示機能）基本情報タブで値が `null` のプロパティは「null」斜体テキストとして表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1「区別表示まとめ」 | - | `undefined` の「未設定」とは異なるテキスト |
| 4-2-44 | （実験指示タブ-ペトリネット表示機能）基本情報タブで値が `null` のプロパティにカーソルを合わせると「null が設定されています」ツールチップが表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1 renderValue()修正 | - | Tooltip title="null が設定されています" |
| 4-2-45 | （実験指示タブ-ペトリネット表示機能）基本情報タブで値が空文字（`""`）のプロパティは `""(空文字)` として表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1「区別表示まとめ」 | - | `undefined`・`null` とは異なる表示 |
| 4-2-46 | （実験指示タブ-ペトリネット表示機能）基本情報タブで値が空文字（`""`）のプロパティにカーソルを合わせると「空の文字列が設定されています」ツールチップが表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1 renderValue()修正 | - | Tooltip title="空の文字列が設定されています" |
| 4-2-47 | （実験指示タブ-ペトリネット表示機能）基本情報タブで boolean 値 `true` のプロパティは `<Tag color="success">true</Tag>` として表示されること（「はい」ではなく「true」） | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1「区別表示まとめ」 | - | 承認コメント「false を「いいえ」ではなく「false」表示に変更」 |
| 4-2-48 | （実験指示タブ-ペトリネット表示機能）基本情報タブで boolean 値 `false` のプロパティは `<Tag color="error">false</Tag>` として表示されること（「いいえ」ではなく「false」） | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応1「区別表示まとめ」 | - | `false` が「未設定」と誤表示されないこと |
| 4-2-49 | （実験指示タブ-ペトリネット表示機能）テンプレートタブで `xsi:type` が設定されていない列にカーソルを合わせると「xsi:type が設定されていません」ツールチップ付きの「-」が表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応2 xsi:type列レンダラー | - | 変更前は `null`（セル空白）だった |
| 4-2-50 | （実験指示タブ-ペトリネット表示機能）テンプレートタブで説明/単位が設定されていない列にカーソルを合わせると「説明・単位が設定されていません」ツールチップ付きの「-」が表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応2 説明/単位列レンダラー | - | 変更前は `null`（セル空白）だった |
| 4-2-51 | （実験指示タブ-ペトリネット表示機能）テンプレートタブにプロパティが存在しない場合、「表示するプロパティがありません」テキストにカーソルを合わせると「このノードにはテンプレートが設定されていません」ツールチップが表示されること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応2 テンプレート/データタブが空の場合 | - | テンプレート未設定ノードで確認 |
| 4-2-52 | （実験指示タブ-ペトリネット表示機能）PropertyViewerWithSelectionコンポーネント（プロパティ選択チェックボックス付きビューア）においても、同様の `undefined`/`null`/`""` 区別表示とツールチップが機能すること | 表示確認 | `docs/改善仕様調査/No.8/result.md` §対応ファイル一覧 `PropertyViewerWithSelection.tsx` | - | ビューア選択画面でも同一ロジックが適用されること |
| 4-2-53 | 保存ダイアログ（SaveConfirmDialog）のダイアログを閉じるボタンのラベルが「閉じる」と表示されること | 表示確認 | `docs/改善仕様調査/No.16-24/result.md` §SaveConfirmDialog.tsx | - | No.24対応（低優先）: 「キャンセル」→「閉じる」に変更 |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトにMAIMLファイルが登録済みである
- プロジェクトがチェックアウト済みである（編集ロックを取得済み）
- プロジェクト管理タブでプロジェクトを選択後、「編集」ボタンから実験フロー編集画面（PetriNetEditor）を開いていること
- ワークフロー取込（4-2-11）用: S3上にワークフロー取込対象のMAIMLファイルが存在すること
- ワークフロー取込（4-2-11）用: 取込元ファイルは `WorkflowSelectorDialog` で選択可能な状態であること
- XMLビュー（4-2-27〜4-2-34）用: ペトリネットにノード/エッジが少なくとも1件以上存在すること
- Positionタグ書き込み確認（4-2-35〜4-2-39）用: place ノードおよび transition ノードがそれぞれ1件以上存在し、ノードをドラッグ移動できる状態であること
- 4-2-38用: `<position>` タグを含まない旧形式のMAIMLテストファイルを用意すること（`tests/e2e/fixtures/maiml/no_position.maiml` など）
- PropertyViewer値なし区別確認（4-2-40〜4-2-52）用: 以下の値を持つプロパティが含まれるテスト用MAIMLファイルを用意すること
  - `value` が設定されていないプロパティ（`undefined` に相当）
  - `value` が `null` のプロパティ
  - `value` が空文字 (`""`) のプロパティ
  - `value` が `true` / `false` の boolean プロパティ
  - `xsi:type` が設定されていないテンプレートプロパティ（4-2-49用）
  - 説明/単位が設定されていないテンプレートプロパティ（4-2-50用）
  - テンプレートが設定されていないノード（4-2-51用）

**手動テスト手順（概要）:**
1. プロジェクト管理画面からプロジェクトを選択し、「編集」ボタンをクリックしてPetriNetEditorを開く
2. ワークフローのノード・トランジションが正しく表示されていることを目視確認（4-2-1、4-2-4）
3. ビューモード切替ボタンで「テンプレート」表示を確認（4-2-5）
4. メソッドタブのメソッド追加を確認（4-2-6）
5. 各ノード追加ボタン（Material/Condition/Result/Transition）の動作を確認（4-2-7〜4-2-10）
6. ワークフロー取込ボタンをクリックし、WorkflowSelectorDialogからMAIMLファイルを選択してサブネット追加を確認（4-2-11）
7. Documentボタンをクリックし、ドキュメント情報を編集・保存（4-2-12）
8. バリデーションボタンをクリックし、ValidationPanelの表示と結果を確認（4-2-13、4-2-14）
9. 保存ボタン（または Ctrl+S）をクリックし、SaveConfirmDialogからS3保存を確認（4-2-15、4-2-2、4-2-3）
10. Draftボタンをクリックし、下書き管理ダイアログから手動保存を確認（4-2-16）
11. 自動保存スイッチをONにして一定時間後に下書きが作成されることを確認（4-2-17）
12. ValidationPanel内のエラー一覧からチェックボックスでエラーを選択し、「自動補正」ボタンをクリックして補正結果を確認（4-2-18〜4-2-26）
    ※ 補正対象エラーを作成するには以下を実施：
      - 保存前のMAIMLから `version` 属性を手動削除して読み込む（4-2-21用）
      - `xmlns` 属性を削除または変更したMAIMLを読み込む（4-2-22用）
      - 存在しないIDへの `placeRef ref="..."` を追加する（4-2-23用）
      - 重複するIDを持つノードを作成する（4-2-25用・補正不可の確認）

**注意事項:**
- PetriNetEditorはReactFlowベースのGUIエディタであり、ドラッグ操作など自動化が困難な操作を含む
- 手動テスト実施者はMAIML仕様の基礎知識を有すること
- 自動保存（4-2-17）は `useDraftManager` フックの設定間隔（デフォルト30秒）後に確認すること
- バリデーションエラーの強調表示（4-2-14）を確認するには、意図的に不正なノード構成（重複IDなど）を作成すること
- 自動補正（4-2-18〜4-2-26）: 補正可能なエラーは「`version`属性欠落」「名前空間エラー」「未定義参照（参照削除）」の3種類のみ。重複ID・シンタックスエラーは自動補正不可。補正後は必ず内容を手動確認すること
- 4-2-24（自動補正して保存）: `SaveConfirmDialog` の「自動補正して保存」ボタンは `POST /api/v1/maiml/auto-correct` → `POST /api/v1/maiml/save` の順で呼び出される

---

### 4-3: チェックアウト / チェックイン

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-3-1 | プロジェクトをチェックアウトできること（`checked_in` ステータス） | 正常系 | 要件書#4 | POST `/api/v1/projects/:projectName/checkout` | - | |
| 4-3-2 | チェックアウト中のプロジェクトをチェックインできること | 正常系 | 要件書#5 | POST `/api/v1/projects/:projectName/checkin` | - | |
| 4-3-3 | チェックアウト中のプロジェクトには「チェックアウト中」タグが表示されること | 表示確認 | `ui_project_management.md` §2.2.3 | GET `/api/v1/projects` | - | |
| 4-3-4 | `in_progress` ステータスのプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` | - | |
| 4-3-5 | `checkout_status` が `checked_out`（チェックアウト中）のプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` | - | |
| 4-3-6 | `completed` ステータスのプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` | - | |
| 4-3-7 | 実行中のタスクがある場合はチェックインできないこと | 異常系 | ビジネスルール（チェックイン不可条件） | POST `/api/v1/projects/:projectName/checkin` | - | |
| 4-3-9 | MAIMLファイルが未登録のプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト前提条件） | POST `/api/v1/projects/:projectName/checkout` | - | |
| 4-3-10 | タスクが未登録のプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト前提条件） | POST `/api/v1/projects/:projectName/checkout` | - | |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- 4-3-1: プロジェクトが `checkout_status = 0`（チェックイン済み）かつ `project_status` が 0（計画中）、3（レビュー待ち）、または 5 のいずれか、MAIMLファイル登録済み、タスク登録済みであること
- 4-3-2〜4-3-3: プロジェクトが `checkout_status = 1`（チェックアウト中）の状態であること
- 4-3-4: `project_status = 2`（タスク実行中）のプロジェクトが1件存在すること
- 4-3-5: `checkout_status = 1`（チェックアウト中）のプロジェクトが1件存在すること
- 4-3-6: `project_status = 4`（プロジェクト完了）のプロジェクトが1件存在すること
- 4-3-7: チェックアウト済みプロジェクトに `task_status = 2`（実行中）のタスク詳細が存在すること
- 4-3-9: MAIMLファイルが未登録（`project_maiml_flg = false`）の `checkout_status = 0` プロジェクトが1件存在すること
- 4-3-10: タスクが未登録の `checkout_status = 0` プロジェクトが1件存在すること

**ビジネスルール（設計書より）:**
- チェックアウトできるのは `checkout_status = 0`（チェックイン済み）かつ `project_status` が許可された値（0, 3, 5 のいずれか）のプロジェクトのみ
- チェックアウトにはMAIMLファイルの登録が必要
- チェックアウトにはタスクが1件以上登録済みであることが必要
- チェックインできるのはチェックアウトしたユーザーのみ
- 実行中のタスクがある場合はチェックイン不可

---

### 4-4: タスク登録

> **参照設計書**: `ui_task_registration_tab.md` v3.0.0（2026-08-20）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-4-1 | タスク登録タブで試行回数を設定して保存できること | 正常系 | 要件書#3 | POST `/api/v1/projects/:projectName/task-registration` | - | |
| 4-4-2 | タスク登録タブで実験条件を変更して保存できること | 正常系 | 要件書#3 | POST `/api/v1/projects/:projectName/task-registration` | - | ⚠️ 実験条件カラムは現在コメントアウト済み（未実装）のため、実験条件部分はSKIP。`ui_task_registration_tab.md` §13「実験条件カラムについて」参照 |
| 4-4-3 | ドラッグ＆ドロップでタスクの実行順序を変更して保存できること | 正常系 | 追加機能K、`ui_task_registration_tab.md` §7.6 | POST `/api/v1/projects/:projectName/task-registration` | - | `@dnd-kit/core` による D&D。`workerLinkedFlg=false` のタスクのみ移動可能 |
| 4-4-4 | ワーカー連携済みタスク（`workerLinkedFlg=true`）は試行回数・指示追加ボタンが無効化されること | 表示確認 | 追加機能N、`ui_task_registration_tab.md` §6 `isFieldDisabled` | - | - | 行スタイルも `backgroundColor: '#f5f5f5'`, `opacity: 0.7` となること |
| 4-4-5 | ワーカー連携済みタスクはドラッグ＆ドロップによる順序変更ができないこと | 表示確認 | 追加機能N、`ui_task_registration_tab.md` §6 `isOrderChangeDisabled`、§7.6 | - | - | ドラッグハンドルのカーソルが `not-allowed`、opacity 0.5 になること |
| 4-4-6 | 各タスクの「+指示」ボタンをクリックすると実験計画ダイアログ（ExperimentPlanDialog）が表示されること | 正常系 | 追加機能O、`ui_task_registration_tab.md` §7.3、§8.1 | - | - | 設計書 v2.0 では InstructionEditDialog と記載があったが、v3.0.0 では **ExperimentPlanDialog** を開く仕様に変更 |
| 4-4-7 | タスク登録タブから追加した指示が「プロジェクト指示」タブの未送信指示一覧に反映されること | 正常系 | 追加機能O、`ui_task_registration_tab.md` §7.4 `handleInstructionSave` | GET `/api/v1/projects/:projectName/instructions/status` | - | `isNewlyAdded=true` かつ `instruction_status=UNSENT` として登録されること |
| 4-4-8 | タスク登録タブのツールバーに「プロジェクト指示」ボタンが表示されること | 表示確認 | `ui_task_registration_tab.md` §2.1 レイアウト、§2.3 ツールバー、§8.3 | - | - | クリックすると **プロジェクト指示用 InstructionEditDialog**（`fixedMethodId=""`）が開くこと。タブ切り替えではない |
| 4-4-9 | MAIMLにバリデーションエラーがある場合（`maimlHasErrors=true`）、タスク一覧テーブルの上部に警告バナー（Alert type="warning"）が表示されること | 表示確認 | `ui_task_registration_tab.md` §2.2 MAIMLバリデーションエラー警告バナー | - | - | `ExclamationCircleOutlined` アイコン付きの `antd` Alert が表示されること |
| 4-4-10 | MAIMLにバリデーションエラーがある場合（`maimlHasErrors=true`）、保存ボタン・試行回数入力・「+指示」ボタンが無効化されること | 表示確認 | `ui_task_registration_tab.md` §2.3 ツールバーボタン無効化条件、§6 `isFieldDisabled` | - | - | ツールバーの無効化条件: `loadingMethods \|\| isCheckoutLocked \|\| maimlHasErrors \|\| isProjectCompleted \|\| !isEditable` |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトにMAIMLファイルが登録済みである（`isMaimlRegistered: true`）
- プロジェクトがチェックアウト中でない（`isCheckoutLocked: false`）
- 4-4-4〜4-4-5: `workerLinkedFlg=true` のタスクを含むプロジェクトが1件存在すること
- 4-4-6〜4-4-7: プロジェクトにタスクが1件以上登録されていること
- 4-4-9〜4-4-10: `maimlHasErrors=true` の状態を再現すること（MAIMLバリデーション確認モーダルでエラーが検出された状態、または `ProjectManagement` コンポーネントの `maimlHasErrors` prop を `true` に設定）

**ビジネスルール（設計書 v3.0.0 より）:**
- MAIMLが未登録の場合は保存ボタンが無効化される
- チェックアウト中の場合は保存ボタン・試行回数・指示追加ボタンが無効化される
- MAIMLにバリデーションエラーがある場合（`maimlHasErrors=true`）は保存ボタン・試行回数・指示追加ボタンが無効化される（警告バナーも表示）
- プロジェクト完了状態（`isProjectCompleted=true`）は保存ボタン・試行回数・指示追加ボタンが無効化される
- `isEditable=false`（編集権限なし）の場合は保存ボタン・試行回数・指示追加ボタンが無効化される
- 試行回数は1〜999の整数のみ有効
- `workerLinkedFlg=true`（ワーカー連携済み）のタスクはチェックボックス・試行回数・指示追加ボタン・順序変更すべて不可
- 実験条件カラムは現在コメントアウト済みのため未実装（`ui_task_registration_tab.md` §13参照）

---

### 4-5: プロジェクト指示管理

> ⚠️ **名称変更**: 旧「指示登録タブ」は「プロジェクト指示タブ」（`key: 'project_instruction'`）に改称されました。設計書: `ui_instruction_registration_tab.md` v3.0.0

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-5-1 | タスク登録タブの「+指示」ボタンから追加した指示がプロジェクト指示タブの一覧に表示されること | 正常系 | 要件書#6 | GET `/api/v1/experiment-admin/project/:projectName/instructions` | - | プロジェクト指示タブに新規追加ボタンはなく、指示の追加はタスク登録タブから行う（`ui_instruction_registration_tab.md` §3「新規追加ボタンは表示されていません」） |
| 4-5-2 | 未送信の指示を編集できること | 正常系 | 追加機能G、`ui_instruction_registration_tab.md` §操作列 | PUT `/api/v1/experiment-admin/project/:projectName/instruction/:instructionId` | - | 編集ボタンの活性条件: `isEditable && !isProjectCompleted && !isCheckoutLocked` |
| 4-5-3 | 未送信の指示を削除できること | 正常系 | 追加機能H、`ui_instruction_registration_tab.md` §操作列 | DELETE `/api/v1/experiment-admin/project/:projectName/instruction/:instructionId` | - | 削除ボタンの活性条件: `isEditable && !isProjectCompleted && !isCheckoutLocked` |
| 4-5-4 | 送信済みの指示は「編集」「削除」ボタンの代わりに「詳細」ボタンが表示されること | 表示確認 | `ui_instruction_registration_tab.md` §2.1 レイアウト（操作列）| - | - | |
| 4-5-5 | 指示が0件の場合に空のステート（📭アイコン）が表示されること | 表示確認 | `ui_instruction_registration_tab.md` §2.1（データなし時の空ステート表示） | - | - | |
| 4-5-6 | 指示の件数（N件）がタブ内ツールバーに表示されること | 表示確認 | `ui_instruction_registration_tab.md` §2.1 ツールバー「指示一覧 ({N}件)」 | GET `/api/v1/projects/:projectName/instructions/status` | - | |
| 4-5-7 | 送信済み指示の詳細ダイアログ（InstructionEditDialog）の「閉じる」ボタンがグレー（非プライマリ・`type="default"`）で表示されること | 表示確認 | `docs/改善仕様調査/No.16-24/result.md` §InstructionEditDialog.tsx | - | - | No.24対応: 参照専用ダイアログの「閉じる」ボタンを `type="primary"` → `type="default"` に変更 |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクト管理タブ > **「プロジェクト指示」タブ**が表示されている（旧「指示登録タブ」）

**ビジネスルール（設計書より）:**
- 送信済みの指示は編集・削除不可（操作列が「詳細」ボタンのみになる）
- 指示は `project_instruction` テーブルに保存される

---

### 4-6: 進捗確認・タスク結果　※実験指示タブの内容。シナリオ未更新、テスト不可（2026/08/20）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-6-1 | 進捗確認タブでプロジェクト一覧が表示されること | 正常系 | 要件書#7 | GET `/api/v1/projects` | - | |
| 4-6-2-1 | 詳細ボタン（EyeアイコンつきPrimary Ghostボタン）をクリックすると「プロジェクト進捗詳細」モーダルが表示されること | 正常系 | 追加機能J、`ui_progress_monitoring.md` §2.2.5、`ui_work_progress_detail_dialog.md` §2.2.1 | - | - | |
| 4-6-2-2 | 詳細ダイアログにプロジェクト情報（プロジェクト名・ステータスTag・プロジェクトID・説明・オーナー・部門・更新日時）が表示されること | 表示確認 | `ui_work_progress_detail_dialog.md` §2.2.3 | - | - | |
| 4-6-2-3 | プロジェクトに複数メソッドがある場合はメソッドフィルタが表示され、単一メソッドの場合は表示されないこと | 表示確認 | `ui_work_progress_detail_dialog.md` §2.2.4、§3.1.3 | - | - | |
| 4-6-2-4 | タスクタブを切り替えると各タスクの詳細（タスク名・タスクID・ステータス・メソッド名）とトランジションサマリー（全体・完了・作業中・未着手・完了率）が切り替わること | 正常系 | `ui_work_progress_detail_dialog.md` §2.2.5、§2.2.6、§2.2.7、§3.1.4 | - | - | |
| 4-6-2-5 | 詳細ダイアログにトランジション詳細一覧（トランジション名・進捗ステータスTag・作業者・開始日・終了日）が表示されること | 表示確認 | `ui_work_progress_detail_dialog.md` §2.2.9 | - | - | |
| 4-6-2-6 | 詳細ダイアログの「再読み込み」ボタンをクリックするとデータが再取得されること | 正常系 | `ui_work_progress_detail_dialog.md` §2.2.2、§3.1.7 | - | - | |
| 4-6-2-7 | 詳細ダイアログの「閉じる」ボタンをクリックするとモーダルが閉じること | 正常系 | `ui_work_progress_detail_dialog.md` §2.2.2、§3.1.8 | - | - | |
| 4-6-3 | 「実験指示」タブ（`key: 'task_results'`）でタスク統計（件数）が表示されること | 表示確認 | 要件書#15、追加機能E、`ui_project_management.md` §2.2.5 Tab4 | GET `/api/v1/projects/:projectName/tasks` | - | 旧「タスク結果タブ」から「実験指示タブ」に改称 |
| 4-6-4 | 「実験指示」タブでレビュー待ちタスクの承認処理ができること | 正常系 | 追加機能F、`ui_experiment_instruction_tab.md` §主要機能4 | POST `/api/v1/projects/:projectName/tasks/complete-review` | - | 想定値 vs 実績値の確認後に承認またはNG記録を行う |
| 4-6-5 | 「実験指示」タブでフィルターバー（タスクNo・メソッドID・トランジション・テンプレート・Key）によって表示行が絞り込めること | 表示確認 | `ui_experiment_instruction_tab.md` §主要機能2 | - | - | |
| 4-6-6 | 「実験指示」タブで列カスタマイズドロップダウンから表示列を切り替えられること | 正常系 | `ui_experiment_instruction_tab.md` §主要機能3 | - | - | |
| 4-6-7 | 「実験指示」タブで「実験指示を編集」ボタンをクリックすると ExperimentPlanDialog が開くこと | 正常系 | `ui_experiment_instruction_tab.md` §主要機能7 | - | - | |
| 4-6-8 | 「実験指示」タブで「ペトリネット表示」ボタンをクリックすると ViewRendererDialog（フローティング）が開くこと | 正常系 | `ui_experiment_instruction_tab.md` §主要機能8 | - | - | |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する（タスクデータを含む）
- 詳細ダイアログ確認シナリオ（4-6-2-1〜4-6-2-7）用: テスト用プロジェクトに `project_task` テーブルのレコードが少なくとも1件存在すること
- 詳細ダイアログ確認シナリオ（4-6-2-1〜4-6-2-7）用: 各タスクに紐づくトランジション進捗データが少なくとも1件存在すること
- メソッドフィルタ確認シナリオ（4-6-2-3）用: 複数メソッド（2件以上）を持つプロジェクトが少なくとも1件存在すること
- 実験指示タブ確認シナリオ（4-6-3〜4-6-8）用: タスクが登録済みで想定値（planned_values）が存在するプロジェクトが1件以上存在すること
- 承認処理確認シナリオ（4-6-4）用: `task_status = review_waiting`（レビュー待ち）のタスクが1件以上存在すること

**統計カラー定義（設計書より）:**
- 実行待ち（pending）: セカンダリー
- 実行中（in_progress）: プライマリー青
- 異常終了（error）: 赤
- レビュー待ち（review_waiting）: 警告黄
- 完了（completed）: 成功緑

> ⚠️ **名称変更メモ**: 「タスク結果タブ」は「実験指示タブ」（key: `task_results`）に改称されました。承認処理・NG記録・想定値 vs 実績値の確認が主な用途です。`ui_experiment_instruction_tab.md` v2.0.0 参照。

---

### 4-7: プロジェクトフィルタ・検索

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-7-1 | プロジェクトステータスでフィルタリングできること | 正常系 | 追加機能A | GET `/api/v1/projects` | - | |
| 4-7-2 | チェックアウト状態でフィルタリングできること | 正常系 | 追加機能A | GET `/api/v1/projects` | - | |
| 4-7-3 | キーワード検索でプロジェクトを絞り込みできること | 正常系 | 追加機能B | GET `/api/v1/projects` | - | |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブが表示されている
- 検索・フィルタの対象となる複数のプロジェクトがDBに存在する

**フィルタ選択肢（設計書より）:**
- **ステータス**: 全て / 計画中(planning) / 実行待ち(pending) / 実行中(in_progress) / レビュー待ち(review_waiting) / 完了(completed) / エラー(error)
- **チェックアウト状態**: 全て / チェックイン済み(checked_in) / チェックアウト中(checked_out)
- **検索対象**: プロジェクト名、プロジェクトID、ステータス表示名、部門名、所有者名

---

### 4-8: フォーマット管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-8-1 | フォーマット一覧が表示されること | 正常系 | 要件書#13 | GET `/api/v1/formats` | - | |
| 4-8-2 | フォーマット（ワークフローベース）を新規登録できること | 正常系 | 要件書#13 | POST `/api/v1/formats` | - | |
| 4-8-3 | 画面上部ツールバーに「新規フォーマットフォルダ」ボタンが表示されること | 表示確認 | `ui_format_management.md` §2.2.1 ツールバー | - | - | フォーマット未選択状態でもボタンは表示・活性であること |
| 4-8-4 | 「新規フォーマットフォルダ」ボタンをクリックすると `CreateFormatModal` が開くこと | 表示確認 | `ui_format_management.md` §3.6.2、`ui_create_format_modal.md` §2.3.1 | - | - | `CreateFormatFolderModal`（サブフォルダ用）ではなく `CreateFormatModal`（ルートフォルダ用）が開くこと |
| 4-8-5 | `CreateFormatModal` でフォルダ名が未入力のまま「作成」をクリックすると「フォルダ名を入力してください」バリデーションエラーが表示されること | 異常系 | `ui_create_format_modal.md` §3.1.1、§6.1 必須バリデーション | - | - | |
| 4-8-6 | `CreateFormatModal` でフォルダ名に使用不可文字（ハイフン・スペース・日本語等）を入力すると「英数字とアンダースコアのみ使用できます」エラーが表示されること | 異常系 | `ui_create_format_modal.md` §3.1.2 正規表現 `/^[a-zA-Z0-9_]+$/`、§10.1 | - | - | サブフォルダ用 `CreateFormatFolderModal` はハイフン可だが、本モーダルはハイフン不可である点に注意 |
| 4-8-7 | `CreateFormatModal` で正常なフォルダ名を入力して「作成」するとルートレベルのフォーマットフォルダが作成され、左側フォルダツリーの部門直下に新しいフォルダが追加されること | 正常系 | `ui_format_management.md` §3.6、`ui_create_format_modal.md` §3.2 送信処理 | POST `/api/v1/formats/folders` | - | |
| 4-8-8 | `CreateFormatModal` で「キャンセル」ボタンをクリックするとモーダルが閉じてフォルダが作成されないこと | 正常系 | `ui_create_format_modal.md` §2.3.4 キャンセルボタン | - | - | 再度モーダルを開くと入力値・エラーメッセージがリセットされていること |
| 4-8-9 | フォーマット選択後に「新規サブフォルダ」ボタンをクリックすると新規フォルダ作成モーダルが開くこと | 表示確認 | `ui_create_format_folder_modal.md` §3.1.1 | - | - | |
| 4-8-10 | フォルダ名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_folder_modal.md` §3.3 | - | - | |
| 4-8-11 | フォルダ名に使用不可文字（日本語・スペース等）を含む場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_folder_modal.md` §3.3 | - | - | |
| 4-8-12 | 「キャンセル」ボタンをクリックするとモーダルが閉じてフォルダが作成されないこと | 正常系 | `ui_create_format_folder_modal.md` §3.1.4 | - | - | |
| 4-8-14 | フォーマット選択後に「新規ファイル」ボタンをクリックすると新規ファイル作成モーダルが開くこと | 表示確認 | `ui_create_format_file_modal.md` §3.1.1 | - | - | |
| 4-8-16 | ~~MAIMLタイプのフォーマット選択時はテンプレートタイプ選択が表示されないこと~~ | 表示確認 | `ui_create_format_file_modal.md` §3.1.1 / §3.1.3 | - | - | 不要なシナリオ |
| 4-8-17 | ファイル名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_file_modal.md` §3.3 | - | - | |
| 4-8-18 | ファイル名が100文字超の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_file_modal.md` §3.3 | - | - | |
| 4-8-20 | 「キャンセル」ボタンをクリックするとモーダルが閉じてファイルが作成されないこと | 正常系 | `ui_create_format_file_modal.md` §3.1.6 | - | - | |
| 4-8-22 | フォーマット選択後に「アップロード」ボタンをクリックするとアップロードダイアログが開くこと | 表示確認 | `ui_format_upload_dialog.md` §3.1.1 | - | - | |
| 4-8-23 | 単一ファイルモードでファイルを1件選択してアップロードできること | 正常系 | `ui_format_upload_dialog.md` §3.1.3 / §3.1.8 | POST `/api/v1/formats/upload` | - | |
| 4-8-24 | 一括ファイルモードで複数ファイルを選択してアップロードできること | 正常系 | `ui_format_upload_dialog.md` §3.1.3 / §3.1.8 | POST `/api/v1/formats/upload` | - | |
| 4-8-26 | モード切り替え時に選択済みファイルリストがクリアされること | 表示確認 | `ui_format_upload_dialog.md` §3.1.2 | - | - | |
| 4-8-27 | 単一ファイルモードで複数ファイルを選択すると最後の1ファイルのみが選択状態になること | 表示確認 | `ui_format_upload_dialog.md` §3.1.3 | - | - | |
| 4-8-29 | アップロード中にファイル完了件数とパーセントが進捗表示されること | 表示確認 | `ui_format_upload_dialog.md` §2.2.7 / §3.1.8 | - | - | |
| 4-8-30 | アップロード完了後に成功メッセージが表示されること | 表示確認 | `ui_format_upload_dialog.md` §2.2.7 | - | - | |
| 4-8-31 | アップロード中にダイアログを閉じようとすると確認ダイアログが表示され、OKボタンが「中断する」（赤色・dangerスタイル）、キャンセルボタンが「続行」と表示されること | 異常系 | `ui_format_upload_dialog.md` §3.1.10 / §6.2、`docs/改善仕様調査/No.16-24/result.md` | - | SKIP(テスト項目削除) | No.24対応: 中断確認ダイアログのボタンラベル・スタイル変更 |
| 4-8-32 | MAIMLファイル（.maiml）の「編集」ボタンをクリックするとPetriNetEditorがフルスクリーンで開くこと | 正常系 | `ui_format_management.md` §3.1.7、`ui_format_file_list_table.md` §3.1.4 | POST `/api/worker/load-maiml-file` | - | |
| 4-8-33 | XMLファイル（.xml）の「編集」ボタンをクリックするとFormatEditorDialogがモーダルで開くこと | 正常系 | `ui_format_management.md` §3.1.7、`ui_format_file_list_table.md` §3.1.4 | - | - | |
| 4-8-35 | .maimlでも.xmlでもないファイルの「編集」ボタンをクリックするとエラーメッセージが表示されること | 異常系 | `ui_format_management.md` §6.3 | - | - | |
| 4-8-38 | ファイルの「削除」ボタンをクリックすると削除確認ダイアログが表示されること | 表示確認 | `ui_format_file_list_table.md` §3.1.6、`ui_format_management.md` §3.2 | - | - | |
| 4-8-39 | 削除確認ダイアログで確認するとファイルが削除されてファイル一覧から消えること | 正常系 | `ui_format_management.md` §3.2 / §6.4 | DELETE `/api/v1/formats/:formatId/files/:fileId` | - | |
| 4-8-40 | 削除確認ダイアログでキャンセルするとファイルが削除されないこと | 正常系 | `ui_format_file_list_table.md` §3.1.6 | - | - | |
| 4-8-41 | （maiml編集でペトリネット表示→ノード選択→テンプレート編集）TemplateEditorDialogを開くと「UI編集」「XMLビュー」の2タブが表示されること | 表示確認 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`TemplateEditorDialog.tsx` Tabs | - | |
| 4-8-42 | 「UI編集」タブが初期表示されること | 表示確認 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`activeTab='ui'` 初期値 | - | |
| 4-8-43 | 「XMLビュー」タブをクリックするとテンプレートのXML文字列がTextAreaに表示されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`convertTemplateToXML` | - | UI → XML 切り替え時に `convertTemplateToXML` が呼ばれること |
| 4-8-44 | XMLビューでXMLを直接編集して「UI編集」タブに戻るとUI Stateに変更が反映されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`parseXMLToTemplate` | - | XML → UI 切り替え時に `parseXMLToTemplate` が呼ばれること |
| 4-8-45 | XMLビューで不正なXML（構文エラー）を入力してバリデーションを実行するとエラーメッセージが表示されること | 異常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`validateTemplateXML` | - | バリデーションボタン押下時にエラーAlertが表示されること |
| 4-8-46 | XMLビューで有効なXMLを入力してバリデーションを実行するとエラーメッセージが表示されないこと | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`validateTemplateXML` | - | エラーAlertが表示されないこと |
| 4-8-47 | XMLビューから保存するとXMLがパースされてテンプレートデータが正しく保存されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`handleSave` | - | `validateTemplateXML` → `parseXMLToTemplate` → 保存の順で処理されること |
| 4-8-48 | XMLビューでエラーがある状態で保存しようとするとエラーメッセージが表示されること | 異常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`handleSave` バリデーション | - | 不正なXMLのまま保存ボタンを押すとエラーが表示されること |
| 4-8-49 | フォーマットアップロード開始後、プログレスバーの右上に「キャンセル」ボタンが表示されること | 表示確認 | `docs/改善仕様調査/No.13/PLAN.md` §4.1 キャンセルボタンのUI | - | - | |
| 4-8-50 | アップロード完了（progress=100）後はキャンセルボタンが無効化（disabled）になること | 表示確認 | `docs/改善仕様調査/No.13/PLAN.md` §4.1「アップロード完了後はキャンセルボタン無効化」 | - | - | |
| 4-8-51 | アップロード中にキャンセルボタンを押すとアップロードが即座に中断されること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §4.1 handleCancelUpload | POST `/api/v1/files/upload` | - | AbortController.abort()でHTTPリクエストが中断されること |
| 4-8-52 | キャンセル実行後に「アップロードがキャンセルされました」メッセージが表示されること | 表示確認 | `docs/改善仕様調査/No.13/PLAN.md` §12「キャンセル後のUI/UX」 | - | - | |
| 4-8-53 | キャンセル実行後にダイアログのアップロード状態（進捗バー・isUploading）がリセットされること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §4.1 状態管理 | - | - | |
| 4-8-54 | キャンセル実行後、途中までアップロードされたファイルがバックエンド（ストレージ・DB）から削除されること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §4.2 cancelBatch API | POST `/api/v1/files/batches/:batchId/cancel` | - | cancelBatch APIのレスポンス（`deletedFileCount`）で確認 |
| 4-8-55 | 複数ファイルアップロード中にキャンセルした場合、アップロード済みの全ファイルが削除されること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §8「複数ファイルアップロード中のキャンセル」 | POST `/api/v1/files/batches/:batchId/cancel` | - | `deletedFileCount` ≥ 1 であること |
| 4-8-56 | フォーマット未選択時のフッターボタンが「キャンセル」と表示されること | 表示確認 | `docs/改善仕様調査/No.16-24/result.md` §FormatUploadDialog.tsx | - | - | No.24対応: 未選択時フッター「閉じる」→「キャンセル」に変更 |
| 4-8-57 | 既に同名のフォーマットフォルダが存在する状態で `CreateFormatModal` から作成しようとするとフィールド下部にAPIエラーメッセージ（例: 「同名のフォルダが既に存在します」）が表示されること | 異常系 | `ui_create_format_modal.md` §6.2 APIエラー表示、API 409エラー | POST `/api/v1/formats/folders` | - | モーダルは閉じずにインライン表示されること |
| 4-8-58 | `CreateFormatModal` をキャンセルして閉じた後、再度「新規フォーマットフォルダ」ボタンをクリックしてモーダルを開くと、前回の入力値・エラーメッセージが残らずリセットされていること | 正常系 | `ui_create_format_modal.md` §2.3.4 キャンセルボタン、§7「状態リセット」 | - | - | `CreateFormatFolderModal`（サブフォルダ）でも同様の状態リセットが行われることを確認すること |

**前提条件:**
- 実験管理者ロールでログイン済み
- フォーマット管理画面が表示されている
- **新規フォーマットフォルダ作成シナリオ（4-8-3〜4-8-8、4-8-57〜4-8-58）**: フォーマット未選択状態でも「新規フォーマットフォルダ」ボタンは活性であること。部門（organization_group）が少なくとも1件存在すること
- フォーマット選択が必要なシナリオ（4-8-9〜4-8-12、4-8-14〜4-8-20、4-8-22〜4-8-40）: フォーマット一覧にテスト用フォーマットが1件以上存在すること
  - MAIMLタイプのフォーマットが1件以上存在すること（4-8-16）
- ファイル操作シナリオ（4-8-32〜4-8-40）: 選択中のフォーマット内にテスト用ファイルが存在すること
  - MAIMLファイル（.maiml）が1件以上存在すること（4-8-32）
  - XMLファイル（.xml）が1件以上存在すること（4-8-33）
  - その他の拡張子ファイルが1件以上存在すること（4-8-35）
  - 削除確認シナリオ（4-8-38〜4-8-40）用: 削除してよいテスト用ファイルが1件以上存在すること
- 重複フォルダ名シナリオ（4-8-57）用: 同名のルートフォーマットフォルダが既に存在すること（API実装後に確認可能）

**注意事項:**
- **⚠️ `CreateFormatModal`（ルートフォルダ作成）と `CreateFormatFolderModal`（サブフォルダ作成）の違い**:
  - `CreateFormatModal`（4-8-3〜4-8-8、4-8-57〜4-8-58）: ツールバー「新規フォーマットフォルダ」ボタン → **部門直下**（ルートレベル）にフォルダ作成。フォルダ名正規表現: `/^[a-zA-Z0-9_]+$/`（**ハイフン不可**）。最大255文字。API: `POST /api/v1/formats/folders`
  - `CreateFormatFolderModal`（4-8-9〜4-8-12）: フォーマット選択後の「新規サブフォルダ」ボタン → **選択フォーマット配下**にサブフォルダ作成。フォルダ名正規表現: `/^[a-zA-Z0-9_-]+$/`（**ハイフン可**）。最大100文字。API: `POST /api/v1/formats/:formatId/subfolders`
- 4-8-3〜4-8-8（新規フォーマットフォルダ作成）: `POST /api/v1/formats/folders` は✅実装済み（`formatController.createFormatFolder`）。4-8-7（作成完了の確認）・4-8-57（重複エラー）を含む全シナリオはAPIを呼び出して確認可能
- 4-8-9〜4-8-12（新規サブフォルダ作成）: フォルダ作成APIは✅実装済み（`POST /api/v1/formats/subfolders`、`formatController.createFormatSubfolder`）。APIパスは `/formats/:formatId/subfolders` ではなく `/formats/subfolders` であることに注意。全シナリオはAPIを呼び出して確認可能
- 4-8-14、4-8-16〜4-8-18、4-8-20（新規XMLファイル作成）: ファイル作成APIは✅実装済み（`POST /api/v1/formats/:folderName/files`、`formatController.createFormatFile`）。全シナリオはAPIを呼び出して確認可能
- 4-8-23〜4-8-31（アップロード）: `POST /api/v1/formats/upload` は🔴未実装のため、現在はモック処理のみ確認。進捗表示・完了メッセージはフロントエンドのモック動作を確認する
- 4-8-32〜4-8-33（編集・エディタ起動）: PetriNetEditor（MAIML）またはTemplateEditorDialog（XML）が起動することのみを確認する。エディタ操作の詳細テストは 4-2（MAIML）または別途XMLエディタテストで実施する
- 4-8-39（削除）: ファイル削除APIは🔴未実装のため、削除確認ダイアログの表示・UIの動作のみ確認する。削除完了の確認は実装後に追加する

**後処理:**
- 登録したフォーマットを削除（4-8-2）
- 作成したフォーマットフォルダをDBから削除（4-8-7、API実装後）
- アップロードしたファイルをS3から削除（4-8-23〜4-8-25、API実装後）
- 削除したテスト用ファイルをS3から復元（4-8-39、API実装後）

---

### 4-9: トランジション検索

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-9-1 | プロジェクト管理画面に「遷移検索」ボタンが表示されること | 表示確認 | 追加機能R、`TransitionSetSearchModal.tsx`、`ProjectManagement.tsx` | - | - | |
| 4-9-2 | 統合クエリ（テキスト入力）で検索を実行できること | 正常系 | 追加機能R、`TransitionSetSearchModal.tsx` | POST `/api/v1/semantic-search/search` | - | |
| 4-9-3 | 検索クエリをAI分解（4軸分解）して検索できること | 正常系 | 追加機能R、`decomposeNaturalLanguageQuery` | POST `/api/v1/semantic-search/decompose` | - | |
| 4-9-4 | クイック検索ボタン（構造重視・手順重視・入力重視・出力重視・バランス）で重み調整済み検索が実行できること | 正常系 | 追加機能R、`QUICK_SEARCH_BUTTONS`、`WEIGHT_PRESETS` | POST `/api/v1/semantic-search/search` | - | |
| 4-9-5 | 検索結果一覧にトランジション情報（トランジションID・プロジェクト名・ファイルパス・スコア・スコア内訳）が表示されること | 表示確認 | 追加機能R、`SearchResults.tsx` | POST `/api/v1/semantic-search/search` | - | |
| 4-9-6 | 検索結果が0件の場合に「検索結果が見つかりませんでした」メッセージが表示されること | 正常系 | 追加機能R、`SearchResults.tsx` Empty コンポーネント | POST `/api/v1/semantic-search/search` | - | |
| 4-9-7 | 検索条件を変更して再検索すると結果が更新されること | 正常系 | 追加機能R | POST `/api/v1/semantic-search/search` | - | |
| 4-9-8 | リセットボタンをクリックすると検索クエリ・分解結果・検索結果がクリアされること | 正常系 | 追加機能R、`handleClear` | - | - | |
| 4-9-9 | 検索結果のプロジェクト名タグをクリックするとモーダルが閉じてプロジェクトが選択状態になること | 正常系 | 追加機能R、`onOpenProject` コールバック | - | - | |
| 4-9-10 | バッチ処理パネルからEmbedding生成バッチを起動できること | 正常系（手動） | 追加機能R、`TransitionSetBatchProcessingPanel.tsx` | POST `/api/v1/semantic-search/batch` | - | |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理画面（`ProjectManagement.tsx`）が表示されている
- 検索対象となるトランジションデータが `transition_set` テーブルに1件以上存在すること（`emb_input`・`emb_transition`・`emb_output`・`emb_structure` 各768次元ベクトルが格納済み）
- 4-9-10（バッチ処理）用: Ollamaエンベディングサービスが起動していること

**注意事項:**
- `transition_set` テーブルはセマンティック検索（ベクトル類似検索）専用テーブルであり、進捗ステータス（完了/作業中/未着手）・作業者・開始日・終了日などの進捗管理カラムは**持たない**。進捗情報は `project_task` テーブルを参照すること
- 検索エントリポイントはプロジェクト管理画面ヘッダーの「遷移検索」ボタン（`TransitionSetSearchModal`）であり、進捗確認画面のタブではない
- API は `GET /api/v1/transition-search` ではなく `POST /api/v1/semantic-search/search` を使用する
- 4-9-10（バッチ処理）: 検索精度はエンベディングモデルに依存するため、結果の目視確認が必要

---

### 4-10: プロジェクト公開

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|--------| --- | --- |
| 4-10-1 | ファイル操作ツールバーの「公開する」ボタンをクリックするとMaimlPublishDialogが表示されること | 正常系 | 追加機能S、`ui_maiml_publish_dialog.md` | - | - | |
| 4-10-2 | MaimlPublishDialogで「公開する」ボタンをクリックすると公開ジョブが受け付けられ、ポーリング完了後にボタンが「非公開にする」に切り替わること | 正常系 | 追加機能S、`ui_maiml_publish_dialog.md`、`api_maiml_opendata.md` | POST `/api/v1/projects/:projectName/publish`、GET `/api/v1/projects/:projectName/publish-status` | - | |
| 4-10-3 | 公開済みファイルのボタンが「非公開にする」（赤・活性）に切り替わること | 表示確認 | 追加機能S、`ui_maiml_publish_dialog.md` | GET `/api/v1/projects/:projectName/publish-status` | - | |
| 4-10-4 | 公開済みファイルの「非公開にする」ボタンをクリックするとMaimlUnpublishDialogが表示され、確認後に非公開ジョブが受け付けられ、ポーリング完了後にボタンが「公開する」に戻ること | 正常系 | 追加機能S、`ui_maiml_unpublish_dialog.md`、`api_maiml_opendata.md` | POST `/api/v1/projects/:projectName/unpublish`、GET `/api/v1/projects/:projectName/publish-status` | - | |
| 4-10-5 | 公開/非公開ジョブ処理中（status=pending/running）はボタンがローディング状態になること | 表示確認 | `api_maiml_opendata.md` §5.7、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | - | |
| 4-10-6 | 公開条件を満たしていない場合にMaimlPublishDialogにエラーメッセージが表示されること | 異常系 | `api_maiml_opendata.md` §3.4、`ui_maiml_publish_dialog.md` §4 | POST `/api/v1/projects/:projectName/publish` | - | |
| 4-10-7 | 公開ジョブがエラー終了した場合（status=error）にエラーメッセージが表示されること | 異常系 | `api_maiml_opendata.md` §5.6、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | - | |
| 4-10-8 | 公開済みプロジェクトを非公開にした後、再度公開できること（公開⇒非公開⇒公開） | 正常系 | 追加機能S、`ui_maiml_publish_dialog.md`、`ui_maiml_unpublish_dialog.md`、`api_maiml_opendata.md` | POST `/api/v1/projects/:projectName/publish`、POST `/api/v1/projects/:projectName/unpublish`、GET `/api/v1/projects/:projectName/publish-status` | - | 公開ジョブ完了後→非公開ジョブ完了後→再公開ジョブ完了後のボタン状態遷移（「公開する」→「非公開にする」→「公開する」→「非公開にする」）を確認する |
| 4-10-9 | スケジューラーによる自動非公開が完了した後、ボタンが「公開する」に切り替わること | 正常系 | `api_maiml_opendata.md` §trigger_type、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | - | `maiml_publish_job` に `job_type=unpublish`, `status=done`, `trigger_type=schedule` を挿入して状態を再現する |
| 4-10-10 | スケジューラーによる自動非公開が進行中の場合、ボタンがローディング状態かつクリック不可になること | 表示確認 | `api_maiml_opendata.md` §5.7、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | - | `maiml_publish_job` に `job_type=unpublish`, `status=running`, `trigger_type=schedule` を挿入して状態を再現する |
| 4-10-11 | スケジューラーによる自動非公開がエラー終了した場合、エラーメッセージが表示されボタンが「公開する」に戻ること | 異常系 | `api_maiml_opendata.md` §5.6、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | - | `maiml_publish_job` に `job_type=unpublish`, `status=error`, `trigger_type=schedule` を挿入して状態を再現する |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブでプロジェクトが選択済みであること
- テスト用MAIMLファイルがS3に存在すること
- BullMQキュー（Redis）が稼働していること（全シナリオ）
- OpenData Pipelineバックエンドが稼働していること（全シナリオ）
- 4-10-2用: プロジェクトが `checkout_status = 1`（チェックアウト中）の状態であること
- 4-10-2用: プロジェクトが `project_status = 3`（タスク結果レビュー待ち）の状態であること
- 4-10-2用: 全タスク詳細が完了（task_status=3）または異常終了（task_status=4）の状態であること
- 4-10-3〜4-10-4: `maiml_publish_job` テーブルに `status=done`、`job_type=publish` のレコードが存在すること
- 4-10-8用: プロジェクトが非公開状態（`maiml_publish_job` テーブルに `status=done, job_type=publish` のレコードが存在しない、または最新ジョブが `job_type=unpublish` かつ `status=done`）から開始すること
- 4-10-8用: プロジェクトが `checkout_status = 1`（チェックアウト中）の状態であること
- 4-10-8用: プロジェクトが `project_status = 3`（タスク結果レビュー待ち）の状態であること
- 4-10-8用: 全タスク詳細が完了（task_status=3）または異常終了（task_status=4）の状態であること

**注意事項:**
- **フロントエンド未実装のため、フロントエンド実装完了後にテストを実施すること**（`ui_maiml_publish.md` §実装状況: フロントエンド未実装）
- 公開APIはバックエンド実装済みのため、APIレベルのテストは先行して実施可能
- `experiment_admin` および `system_admin` ロールのみ公開ボタンが表示されること
- **公開・非公開処理は非同期（BullMQ）で実行される**。API は 202 Accepted を即時返却し、ダイアログは即座に閉じる。フロントエンドは `GET /publish-status` を3秒ごとにポーリングしてジョブ完了を検知する（`api_maiml_opendata.md` §6.1、§6.2 参照）
- ポーリング中（status=pending/running）はボタンがローディング状態となり、クリック不可になること
- `status=done` になった時点でボタン表示が切り替わること（公開→「非公開にする」、非公開→「公開する」）
- `status=error` の場合はエラーメッセージを表示し、ボタンを操作可能な状態に戻すこと
- 4-10-6 の各エラーケースはテスト用DBデータで事前状態を作成すること（`api_maiml_opendata.md` §3.4 プリコンディションチェック参照）

---

### 4-11: ファイルアップロード

> **テスト方法**: Playwright自動（4-11-1〜2、4-11-5〜10）+ 手動（4-11-3〜4：ブラウザの `webkitdirectory` 属性を使用するフォルダモードは自動化困難なため）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-11-1 | 単一ファイルモードでファイルをアップロードできること | 正常系 | 追加機能L | POST `/api/v1/files/upload` | - | |
| 4-11-2 | 一括ファイルモードで複数ファイルを同時にアップロードできること | 正常系 | 追加機能L | POST `/api/v1/files/upload` | - | |
| 4-11-3 | フォルダモードでフォルダをアップロードできること | 正常系 | 追加機能L | POST `/api/v1/files/upload` | - | |
| 4-11-4 | フォルダ構造を保持するオプションが有効な場合にフォルダ階層を維持してアップロードできること | 正常系 | `ui_bulk_upload_dialog.md` §3.5 | POST `/api/v1/files/upload` | - | |
| 4-11-5 | アップロード中にファイル完了件数とパーセントが進捗表示されること | 表示確認 | `ui_bulk_upload_dialog.md` §3.6.2 | - | - | |
| 4-11-6 | アップロード完了後に成功メッセージが表示されること | 表示確認 | `ui_bulk_upload_dialog.md` §3.6.2 | - | - | |
| 4-11-7 | ファイルを選択せずにアップロードボタンを押すと警告メッセージが表示されること | 異常系 | `ui_bulk_upload_dialog.md` §7.2 | - | - | |
| 4-11-8 | アップロード中にダイアログを閉じようとすると確認ダイアログが表示され、OKボタンが「中断する」（赤色・dangerスタイル）、キャンセルボタンが「続行」と表示されること | 異常系 | `ui_bulk_upload_dialog.md` §3.7、`docs/改善仕様調査/No.16-24/result.md` | - | - | No.24対応: 中断確認ダイアログのボタンラベル・スタイル変更 |
| 4-11-9 | 単一ファイルモードで複数ファイルを選択すると最後の1ファイルのみが選択状態になること | 表示確認 | `ui_bulk_upload_dialog.md` §3.2.3 | - | - | |
| 4-11-10 | モード切り替え時に選択済みファイルリストがクリアされること | 表示確認 | `ui_bulk_upload_dialog.md` §3.1.2 | - | - | |
| 4-11-11 | アップロード開始後、プログレスバーの右上に「キャンセル」ボタンが表示されること | 表示確認 | `docs/改善仕様調査/No.13/PLAN.md` §4.1 キャンセルボタンのUI | - | - | |
| 4-11-12 | アップロード完了（progress=100）後はキャンセルボタンが無効化（disabled）になること | 表示確認 | `docs/改善仕様調査/No.13/PLAN.md` §4.1「アップロード完了後はキャンセルボタン無効化」 | - | - | |
| 4-11-13 | アップロード中にキャンセルボタンを押すとアップロードが即座に中断されること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §4.1 handleCancelUpload | POST `/api/v1/files/upload` | - | AbortController.abort()でHTTPリクエストが中断されること |
| 4-11-14 | キャンセル実行後に「アップロードがキャンセルされました」メッセージが表示されること | 表示確認 | `docs/改善仕様調査/No.13/PLAN.md` §12「キャンセル後のUI/UX」 | - | - | |
| 4-11-15 | キャンセル実行後にダイアログのアップロード状態（進捗バー・isUploading）がリセットされること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §4.1 状態管理 | - | - | |
| 4-11-16 | キャンセル実行後、途中までアップロードされたファイルがバックエンド（ストレージ・DB）から削除されること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §4.2 cancelBatch API | POST `/api/v1/files/batches/:batchId/cancel` | - | cancelBatch APIのレスポンス（`deletedFileCount`）で確認 |
| 4-11-17 | 複数ファイルアップロード中にキャンセルした場合、アップロード済みの全ファイルが削除されること | 正常系 | `docs/改善仕様調査/No.13/PLAN.md` §8「複数ファイルアップロード中のキャンセル」 | POST `/api/v1/files/batches/:batchId/cancel` | - | `deletedFileCount` ≥ 1 であること |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在し、プロジェクト管理タブで選択済みである
- プロジェクト管理画面のツールバーに「アップロード」ボタンが表示されている
- キャンセル機能確認シナリオ（4-11-11〜4-11-17）用: アップロードが完了する前にキャンセルボタンを押せるよう、大きめのファイル（1MB以上）またはネットワーク速度制限環境を使用すること

**後処理:**
- アップロードしたファイルをS3から削除
- `upload_batch` テーブルのテストデータを削除

**対応ファイル形式（設計書より）:**
- MAIML: `.maiml`, `.xml`
- データ: `.json`, `.txt`, `.csv`
- 画像: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.svg`, `.webp`, `.tif`, `.tiff`
- ドキュメント: `.pdf`

**フォルダ構造保持オプション（設計書より）:**
- 一括ファイルモードまたはフォルダモードの場合のみ表示
- チェック時: `webkitRelativePath` を保持してアップロード
- 未チェック時: フラットにアップロード

---

### 4-12: 問題管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-12-1 | 問題管理モーダルで問題一覧が表示されること（タイトル・内容による検索、ステータスフィルター） | 正常系 | `ui_issue_management_modal.md` §5、§6 | GET `/api/v1/issues` | - | |
| 4-12-2 | 新規問題をプロジェクト単位で登録できること | 正常系 | `ui_issue_management_modal.md` §8、`api_issue_management.md` §1 | POST `/api/v1/issues` | - | |
| 4-12-3 | 新規問題をタスク、トランジション単位で登録できること | 正常系 | `ui_issue_management_modal.md` §8、`api_issue_management.md` §1 | POST `/api/v1/issues` | - | |
| 4-12-4 | 新規問題登録時にタイトルまたは内容が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_issue_management_modal.md` §8.2 | - | - | |
| 4-12-5 | 既存問題を選択してコメントを追加できること | 正常系 | `ui_issue_management_modal.md` §7、`api_issue_management.md` §2 | POST `/api/v1/issues/comments` | - | |
| 4-12-6 | コメントが未入力の場合に「コメント送信」「解決」「未解決」ボタンが非活性であること | 表示確認 | `ui_issue_management_modal.md` §7.2 | - | - | |
| 4-12-7 | 未解決の問題を「解決済」に変更できること（コメントと同時送信） | 正常系 | `ui_issue_management_modal.md` §7.2、`api_issue_management.md` §5 | POST `/api/v1/issues/comments`、PATCH `/api/v1/issues/status` | - | |
| 4-12-8 | 解決済の問題を「未解決」に戻せること（コメントと同時送信） | 正常系 | `ui_issue_management_modal.md` §7.2、`api_issue_management.md` §5 | POST `/api/v1/issues/comments`、PATCH `/api/v1/issues/status` | - | |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブでプロジェクトが選択済みであること
- `issue` テーブルにテスト用問題データが挿入済みであること
  - 未解決（`status=unresolved`）の問題を少なくとも1件
  - 解決済（`status=resolved`）の問題を少なくとも1件
  - コメントが1件以上付いている問題を少なくとも1件

**後処理:**
- 登録した問題データを `issue` テーブルから削除（4-12-2〜4-12-3）
- 追加したコメントを `issue_comment` テーブルから削除（4-12-5〜4-12-8）

**問題ステータス定義（`api_issue_management.md` より）:**
- 未解決（`unresolved`）: 警告（オレンジ）タグ
- 解決済（`resolved`）: 成功（緑）タグ

**問題対象種別（`api_issue_management.md` より）:**
- `project`: プロジェクト単位
- `task`: タスク単位
- `transition`: トランジション単位

---

### 4-13: ノード表示切替ドロップダウン

> **テスト方法**: 手動テスト（ReactFlowキャンバス上のリアルタイムラベル切替確認はGUI目視が必要なため）  
> **対応改善仕様**: No.7a ペトリネットTemplate表示確認  
> **実装ドキュメント**: `docs/改善仕様調査/No.7a/result.md`

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-13-1 | ペトリネットモード時にツールバーの「ペトリネット/テンプレート」トグルの直右に「ノード名 ▼」ドロップダウンが表示されること | 表示確認 | `result.md` §3「EditorToolbar修正」 | - | ドロップダウン幅は160px |
| 4-13-2 | テンプレートモードに切り替えるとドロップダウンが非表示になること | 表示確認 | `result.md` §3「EditorToolbar修正」 | - | `viewMode === 'petriNet'` の条件確認 |
| 4-13-3 | ペトリネットモードに戻るとドロップダウンが再表示されること | 表示確認 | `result.md` §3「EditorToolbar修正」 | - | モード切替の往復確認 |
| 4-13-4 | ドロップダウンに「ノード名」「ノードID」「ノードDesc」「テンプレートID」「テンプレート名」「テンプレートDesc」の6選択肢が表示されること | 表示確認 | `result.md` §1「AttributeDisplayContext」選択肢一覧 | - | デフォルト選択は「ノード名」 |
| 4-13-5 | 「ノード名」を選択するとすべてのノード（Material/Condition/Result/Transition）のラベルがノードの `<name>` テキストに切り替わること | 正常系 | `result.md` §2「ノードコンポーネント修正」 | - | デフォルト選択肢 |
| 4-13-6 | 「ノードID」を選択するとすべてのノードのラベルが `place/transition` の `@id` 属性値に切り替わること | 正常系 | `result.md` §1 選択肢一覧 `node_id` | - | |
| 4-13-7 | 「ノードDesc」を選択するとすべてのノードのラベルが `place/transition` の `<description>` テキストに切り替わること | 正常系 | `result.md` §1 選択肢一覧 `node_description` | - | descriptionが未設定のノードは空文字表示 |
| 4-13-8 | 「テンプレートID」を選択するとPlaceノードのラベルがテンプレートの `@id` 属性値に切り替わること | 正常系 | `result.md` §1 選択肢一覧 `template_id` | - | テンプレート未設定ノードは空文字表示 |
| 4-13-9 | 「テンプレート名」を選択するとPlaceノードのラベルがテンプレートの `<name>` テキストに切り替わること | 正常系 | `result.md` §1 選択肢一覧 `template_name`、`README.md` §10.3 | - | `data.template?.name` を参照。テンプレート未設定ノードは空文字表示 |
| 4-13-10 | 「テンプレートDesc」を選択するとPlaceノードのラベルがテンプレートの `<description>` テキストに切り替わること | 正常系 | `result.md` §1 選択肢一覧 `template_description`、`README.md` §10.3 | - | `data.template?.description` を参照。テンプレート未設定ノードは空文字表示 |
| 4-13-11 | 「テンプレート名」を選択したとき、テンプレートが設定されていないPlaceノードのラベルが空文字（または空白）で表示されること | 正常系 | `PLAN.md` §テスト計画「テンプレートが設定されていないノードで空表示になることを確認」 | - | テンプレート未設定ノードを含むプロジェクトで確認 |
| 4-13-12 | 「テンプレートDesc」を選択したとき、テンプレートが設定されていないPlaceノードのラベルが空文字（または空白）で表示されること | 正常系 | `PLAN.md` §テスト計画「テンプレートが設定されていないノードで空表示になることを確認」 | - | テンプレート未設定ノードを含むプロジェクトで確認 |
| 4-13-13 | ドロップダウンで選択肢を切り替えるとすべてのノードのラベルがリアルタイム（即時）に更新されること | 正常系 | `result.md` §「技術的な補足」Context伝播経路 | - | ページリロード不要で即時反映されることを確認 |
| 4-13-14 | ドロップダウンで選択した表示属性がページリロード後も復元されること（localStorage永続化） | 正常系 | `result.md` §「localStorage キー」`maiml_editor_attribute_display` | - | ブラウザのリロード後に前回選択状態が維持されることを確認 |
| 4-13-15 | ペトリネットモード→テンプレートモード→ペトリネットモードへ戻した際に直前のドロップダウン選択状態が維持されること | 正常系 | `PLAN.md` §テスト計画「テンプレートモード切替時に影響しないことを確認」 | - | |
| 4-13-16 | MaterialTemplateNode・ConditionTemplateNode・ResultTemplateNode・TransitionNode の4種類すべてのノードが `useAttributeDisplay` フックで選択状態を取得していること（全ノードにドロップダウン選択が反映されること） | 正常系 | `result.md` §2「ノードコンポーネント修正」対象ファイル一覧 | - | 各ノード種別が混在するMAIMLで切替確認 |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在し、PetriNetEditorで開かれていること
- テスト用MAIMLファイルに以下のノードが含まれること：
  - Material/Condition/Result の各Placeノードが少なくとも1件ずつ
  - Transitionノードが少なくとも1件
  - テンプレートが設定されているノードが少なくとも1件（4-13-9〜4-13-10用）
  - テンプレートが設定されていないノードが少なくとも1件（4-13-11〜4-13-12用）
- ブラウザの localStorage が有効であること（4-13-14用）

**手動テスト手順（概要）:**
1. 実験管理者としてログインし、テスト用プロジェクトのPetriNetEditorを開く
2. ビューモードが「ペトリネット」であることを確認し、ツールバーにドロップダウンが表示されていることを確認（4-13-1）
3. ビューモードを「テンプレート」に切り替え、ドロップダウンが非表示になることを確認（4-13-2）
4. ビューモードを「ペトリネット」に戻し、ドロップダウンが再表示されることを確認（4-13-3）
5. ドロップダウンを開き、6つの選択肢が表示されることを確認（4-13-4）
6. 各選択肢（ノード名/ノードID/ノードDesc/テンプレートID/テンプレート名/テンプレートDesc）を順に選択し、全ノードのラベルが即時切り替わることを確認（4-13-5〜4-13-10、4-13-13）
7. テンプレートが設定されていないノードで「テンプレート名」「テンプレートDesc」を選択し、空文字表示になることを確認（4-13-11〜4-13-12）
8. ドロップダウンで「ノードID」を選択した状態でページをリロードし、「ノードID」選択状態が復元されることを確認（4-13-14）
9. 「テンプレートID」選択状態でペトリネット→テンプレート→ペトリネットとモード切替し、「テンプレートID」選択が維持されることを確認（4-13-15）
10. Material/Condition/Result/Transitionの全ノード種別にラベル変更が反映されることを確認（4-13-16）

**注意事項:**
- 本機能のノードコンポーネントは `frontend/src/components/nodes/` 配下の `*TemplateNode.tsx` であり、`frontend/src/components/editorv2/components/nodes/` 配下（削除済み）ではない点に注意（`result.md` §2「注意」参照）
- localStorage のキーは `maiml_editor_attribute_display`（`result.md` §「localStorage キー」参照）
- テンプレート名・テンプレートDescは `data.template?.name` / `data.template?.description` を参照する（旧 reference 実装の `data.templateName` / `data.templateDescription` とは異なる）
- Transitionノードのテンプレート系選択肢（テンプレートID/テンプレート名/テンプレートDesc）はそれぞれ `instructionId` / `instructionName` / `instructionDescription` にマッピングされる（`PLAN.md` §ノードコンポーネントのラベル生成ロジック Transition参照）

---

### 4-14: PropertyViewer 値なし区別表示・ツールチップ

> **テスト方法**: 手動テスト（PropertyViewer Drawer の表示内容はブラウザでの目視確認が必要なため）  
> **対応改善仕様**: No.8 テンプレート「値なし」表示に対応  
> **実装ドキュメント**: `docs/改善仕様調査/No.8/result.md`  
> **対象コンポーネント**:
> - `frontend/src/components/viewer/dialogs/PropertyViewer.tsx`
> - `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx`
> - `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx`

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-14-1 | PetriNetViewer上でPlaceノードをクリックすると `PropertyViewerWithSelection`（チェックボックス選択付き Drawer）が開き、基本情報・テンプレート・データの3タブが表示されること | 表示確認 | `result.md` §対応ファイル一覧、`PetriNetViewer.tsx` ノードクリック → `PropertyViewerWithSelection` | - | ⚠️ PetriNetEditor（編集モード）のPlaceノードクリックでは `PropertyPanel`（editorv2用編集パネル）が開くが、それは本シナリオの対象外 |
| 4-14-2 | 基本情報タブで値が `undefined`（未設定）のプロパティは「未設定」斜体グレーテキストとして表示されること | 表示確認 | `result.md` §対応1「区別表示まとめ」 | - | `PropertyViewer.tsx` `renderValue()` |
| 4-14-3 | 基本情報タブで値が `undefined` のプロパティにカーソルを合わせると「値が設定されていません」ツールチップが表示されること | 表示確認 | `result.md` §対応1 renderValue()修正 | - | Tooltip title="値が設定されていません" |
| 4-14-4 | 基本情報タブで値が `null`（明示的null）のプロパティは「null」斜体グレーテキストとして表示されること | 表示確認 | `result.md` §対応1「区別表示まとめ」 | - | `undefined` の「未設定」とは異なるテキスト |
| 4-14-5 | 基本情報タブで値が `null` のプロパティにカーソルを合わせると「null が設定されています」ツールチップが表示されること | 表示確認 | `result.md` §対応1 renderValue()修正 | - | Tooltip title="null が設定されています" |
| 4-14-6 | 基本情報タブで値が空文字（`""`）のプロパティは `""(空文字)` として表示されること | 表示確認 | `result.md` §対応1「区別表示まとめ」 | - | `undefined`・`null` とは異なる表示 |
| 4-14-7 | 基本情報タブで値が空文字（`""`）のプロパティにカーソルを合わせると「空の文字列が設定されています」ツールチップが表示されること | 表示確認 | `result.md` §対応1 renderValue()修正 | - | Tooltip title="空の文字列が設定されています" |
| 4-14-8 | 基本情報タブで値が数値 `0` のプロパティは「未設定」ではなく「0」として正しく表示されること | 表示確認 | `docs/改善仕様調査/No.8/PLAN.md` §目的「0 や false が「未設定」と誤表示されない」 | - | falsy値の誤判定がないことを確認 |
| 4-14-9 | 基本情報タブで boolean 値 `true` のプロパティは `<Tag color="success">true</Tag>` として表示されること（「はい」ではなく「true」） | 表示確認 | `result.md` §対応1「区別表示まとめ」 | - | 承認コメント「false を「いいえ」ではなく「false」表示に変更」 |
| 4-14-10 | 基本情報タブで boolean 値 `false` のプロパティは `<Tag color="error">false</Tag>` として表示されること（「いいえ」でも「未設定」でもなく「false」） | 表示確認 | `result.md` §対応1「区別表示まとめ」 | - | falsy値の誤判定がないことを確認 |
| 4-14-11 | テンプレートタブで `xsi:type` が設定されていない列には「-」が表示され、カーソルを合わせると「xsi:type が設定されていません」ツールチップが表示されること | 表示確認 | `result.md` §対応2 xsi:type列レンダラー | - | 変更前は `null`（セル空白）だった |
| 4-14-12 | テンプレートタブで説明/単位が設定されていない列には「-」が表示され、カーソルを合わせると「説明・単位が設定されていません」ツールチップが表示されること | 表示確認 | `result.md` §対応2 説明/単位列レンダラー | - | 変更前は `null`（セル空白）だった |
| 4-14-13 | テンプレートタブ・データタブにプロパティが存在しない場合、「表示するプロパティがありません」テキストにカーソルを合わせると「このノードにはテンプレートが設定されていません」ツールチップが表示されること | 表示確認 | `result.md` §対応2 テンプレート/データタブが空の場合 | - | テンプレート未設定ノードで確認 |
| 4-14-14 | `StructuredPropertySelector`（プロパティ選択チェックボックス付きビューア）においても、`undefined` / `null` / `""` の値が同様に区別表示されること | 表示確認 | `result.md` §対応3 `StructuredPropertySelector.tsx` の修正 | - | `formatPropertyValue()` の kind 付きオブジェクト返却が機能すること |
| 4-14-15 | `PropertyViewerWithSelection`（チェックボックス選択付きPropertyViewer）においても、`undefined` / `null` / `""` の区別表示とツールチップが機能すること | 表示確認 | `result.md` §対応ファイル一覧 `PropertyViewerWithSelection.tsx` | - | `PropertyViewer.tsx` と同一ロジックが適用されること |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在すること
- **テスト経路（主）**: 実験指示タブ → 「ペトリネット表示」ボタン → `ViewRendererDialog`（フローティング）内の `PetriNetViewer` が表示されていること（4-14-1〜4-14-15）
- **テスト経路（補）**: SubNetViewer内の PropertyViewer（`PropertyViewer.tsx` 直接利用）でも確認可（4-17 シナリオと兼用）
- ⚠️ PetriNetEditor（編集モード）のPlaceノードクリックでは `PropertyPanel`（`editorv2/PropertyPanel.tsx`）が開くため、本シナリオの対象外
- 以下の値を持つプロパティが含まれるテスト用MAIMLファイルを用意すること：

| 確認内容 | 必要なデータ | 対応シナリオ |
|---------|-----------|------------|
| `undefined`（未設定）の表示 | `value` 要素なし（`<property key="xxx" xsi:type="stringType"/>` 形式） | 4-14-2、4-14-3 |
| `null`（明示的null）の表示 | `value` が `null` に設定されたプロパティ | 4-14-4、4-14-5 |
| 空文字（`""`）の表示 | `<value></value>` または `<value/>` 形式のプロパティ | 4-14-6、4-14-7 |
| 数値 `0` の表示 | `<value>0</value>` のプロパティ | 4-14-8 |
| boolean `true` の表示 | `xsi:type="booleanType"` で `<value>true</value>` のプロパティ | 4-14-9 |
| boolean `false` の表示 | `xsi:type="booleanType"` で `<value>false</value>` のプロパティ | 4-14-10 |
| `xsi:type` 未設定テンプレートプロパティ | `xsi:type` 属性なしのテンプレートプロパティ | 4-14-11 |
| 説明/単位未設定プロパティ | `description` なし・`units` なしのテンプレートプロパティ | 4-14-12 |
| テンプレートが設定されていないノード | テンプレート紐づけのないPlaceノード | 4-14-13 |

**手動テスト手順（概要）:**
1. 実験管理者としてログインし、テスト用MAIMLプロジェクトをビューアモードまたはPetriNetEditorで開く
2. 各種プロパティを持つPlaceノードをクリックしてPropertyViewer Drawerを開く（4-14-1）
3. 基本情報タブで各値の表示を目視確認し、ホバーでツールチップを確認する（4-14-2〜4-14-10）
   - `undefined` プロパティ → 「未設定」斜体グレー（ツールチップ: 「値が設定されていません」）
   - `null` プロパティ → 「null」斜体グレー（ツールチップ: 「null が設定されています」）
   - 空文字プロパティ → `""(空文字)` 表示（ツールチップ: 「空の文字列が設定されています」）
   - `0` プロパティ → 「0」テキスト（「未設定」と表示されないこと）
   - `true` プロパティ → 緑タグ「true」（「はい」と表示されないこと）
   - `false` プロパティ → 赤タグ「false」（「いいえ」・「未設定」と表示されないこと）
4. テンプレートタブで `xsi:type` 未設定列・説明/単位未設定列にカーソルを合わせてツールチップを確認する（4-14-11〜4-14-12）
5. テンプレートが設定されていないノードをクリックし、空テンプレートタブのツールチップを確認する（4-14-13）
6. `StructuredPropertySelector` コンポーネントが表示される画面（プロパティ選択UI）でも同様の表示を確認する（4-14-14）
7. `PropertyViewerWithSelection` が使用される画面でも同様の表示を確認する（4-14-15）

**注意事項:**
- No.8対応前後の比較確認（変更前は `null` / `undefined` / `""` がすべて「未設定」と表示されていた）
- `0` および `false` が「未設定」と誤表示されないことを重点的に確認すること（No.8対応の主要な修正点）
- ツールチップはホバー時に表示されるため、マウス操作による確認が必要
- `PropertyViewerWithSelection`（4-14-15）は `PropertyViewer.tsx` と同一の `renderValue()` ロジックを使用しているため、基本的に同じ動作になるが、UIの配置が異なるため個別に確認すること
- `StructuredPropertySelector`（4-14-14）は `formatPropertyValue()` が `{ text, kind }` オブジェクトを返却するよう変更されているため、各 `kind` に対応するツールチップが正しく表示されることを確認すること

---

### 4-15: 未保存変更チェック

> **テスト方法**: 手動テスト（PetriNetEditor の編集状態はReactFlowキャンバス操作を伴うため、Playwrightによる自動化対象外）  
> **対応改善仕様**: No.19 保存後メッセージ改善  
> **実装ドキュメント**: `docs/改善仕様調査/No.19/PLAN.md`  
> **対象コンポーネント**:
> - `frontend/src/components/editorv2/PetriNetEditorInner.tsx`（`onContentChange` prop 追加・各ハンドラーで呼び出し）
> - `frontend/src/components/editorv2/PetriNetEditorScreen.tsx`（`hasUnsavedChanges` ステート管理・`handleBack` での確認ダイアログ制御）

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-15-1 | 何も変更せずに「戻る」ボタンをクリックすると確認ダイアログが表示されずに前画面へ遷移すること | 正常系 | `PLAN.md` §目的 `hasUnsavedChanges = false` の場合 | - | 初期状態（変更なし）での「戻る」動作 |
| 4-15-2 | ノードを追加した後に「戻る」ボタンをクリックすると「保存されていない変更があります。破棄して戻りますか？」確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleAddNode` | - | Material/Condition/Result/Transitionノード追加いずれも対象 |
| 4-15-3 | ノードを削除した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleNodesDelete`、`handleDeleteNode` | - | キャンバスからの削除・PropertyPanelからの削除いずれも対象 |
| 4-15-4 | エッジを接続した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleConnect` | - | ノード間をドラッグして接続 |
| 4-15-5 | エッジを削除した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleEdgesDelete`、`handleDeleteEdge` | - | キャンバスからの削除・PropertyPanelからの削除いずれも対象 |
| 4-15-6 | ノードをドラッグ移動した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleNodeDragStop` | - | ドラッグ完了（mouseup）後にフラグが立つこと |
| 4-15-7 | PropertyPanelでノードプロパティを更新した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleUpdateNodeProperty` | - | ノード名・説明など任意のプロパティ変更 |
| 4-15-8 | PropertyPanelでノードIDを変更した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleUpdateNodeId` | - | ID変更はプロパティ更新とは別ハンドラーで処理 |
| 4-15-9 | PropertyPanelでエッジIDを変更した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleUpdateEdgeProperty` | - | エッジプロパティ（エッジID等）の変更 |
| 4-15-10 | ショートカットキー（M/C/R/T + クリック）でノードを追加した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handlePaneClick` | - | `handlePaneClick` 経由でのノード追加操作 |
| 4-15-11 | Documentボタンからドキュメント情報を保存した後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleSaveDocument` | - | Document編集ダイアログから保存 |
| 4-15-12 | テンプレート保存操作を行った後に「戻る」ボタンをクリックすると確認ダイアログが表示されること | 正常系 | `PLAN.md` §Phase1 `handleSaveTemplate` | - | テンプレートモードでの保存 |
| 4-15-13 | 確認ダイアログで「破棄して戻る」（OK）を選択すると前画面へ遷移すること | 正常系 | `PLAN.md` §目的 確認ダイアログ OK | - | 変更内容は破棄され、S3への保存は行われないこと |
| 4-15-14 | 確認ダイアログで「キャンセル」を選択するとエディタ画面に留まり変更内容が保持されること | 正常系 | `PLAN.md` §目的 確認ダイアログ キャンセル | - | キャンセル後も編集内容（追加ノード等）がキャンバスに残ること |
| 4-15-15 | 変更後にS3保存を完了させてから「戻る」ボタンをクリックすると確認ダイアログが表示されずに前画面へ遷移すること | 正常系 | `PLAN.md` §目的 保存完了後 `hasUnsavedChanges = false` | - | 保存完了後は未保存フラグがリセットされること |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在し、MAIMLファイルが登録済みであること
- プロジェクトがチェックアウト済みであること（編集ロックを取得済み）
- プロジェクト管理タブでプロジェクトを選択後、「編集」ボタンから実験フロー編集画面（PetriNetEditorScreen）を開いていること
- 4-15-2〜4-15-3用: キャンバスにノードが少なくとも1件以上存在すること（削除シナリオのため）
- 4-15-4〜4-15-5用: 接続可能な2ノード間にエッジがない状態、またはエッジが存在する状態を用意すること
- 4-15-10用: M/C/R/T ショートカットキーでのノード追加を試みるため、キャンバスペインがアクティブな状態（入力フォームにフォーカスが当たっていない状態）であること
- 4-15-15用: S3保存ダイアログを表示してS3への保存を正常完了させること（`handleSaveConfirmAction` 完了後）

**手動テスト手順（概要）:**
1. 実験管理者としてログインし、チェックアウト済みプロジェクトのPetriNetEditorを開く
2. 何も変更せず「戻る」ボタンをクリックし、確認ダイアログが表示されないことを確認（4-15-1）
3. ノードを1件追加し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-2）
4. 確認ダイアログで「キャンセル」を選択してエディタに留まることを確認（4-15-14）
5. 既存ノードを削除し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-3）
6. エッジを接続し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-4）
7. エッジを削除し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-5）
8. ノードをドラッグ移動し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-6）
9. PropertyPanelでノード名を変更し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-7）
10. PropertyPanelでノードIDを変更し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-8）
11. PropertyPanelでエッジIDを変更し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-9）
12. Mキーを押しながらキャンバスをクリックしてノードを追加し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-10）
13. Documentボタンからドキュメント情報を保存し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-11）
14. テンプレートを保存し「戻る」ボタンをクリックして確認ダイアログが表示されることを確認（4-15-12）
15. 確認ダイアログで「破棄して戻る」（OK）を選択して前画面へ遷移することを確認（4-15-13）
16. エディタを再度開き、ノードを追加後にS3保存を完了させ、その後「戻る」ボタンをクリックして確認ダイアログが表示されないことを確認（4-15-15）

**注意事項:**
- 本テストはPetriNetEditorScreenの `hasUnsavedChanges` ステートが正しく更新されるかを検証する（`PetriNetEditorInner.tsx` の各ハンドラーから `onContentChange()` が呼び出され、`PetriNetEditorScreen.tsx` 内の `handleContentChange` が `setHasUnsavedChanges(true)` を実行することを確認する）
- 保存フラグのリセット（4-15-15）は `onContentSaved` コールバック経由で `setHasUnsavedChanges(false)` が呼び出されることを確認する（S3保存成功後・ローカルダウンロード完了後）
- `handleSaveDocument`・`handleSaveTemplate` は保存操作であるが、これらもコンテンツの変更として扱われるため、`onContentChange` が呼び出されることに注意
- 手動テスト実施者はMAIML仕様の基礎知識と操作方法を事前に確認すること

---

### 4-16: テンプレートモード時のツールバーボタン非活性化

> **テスト方法**: 手動テスト（PetriNetEditor のツールバー表示状態はGUI目視が必要なため）  
> **対応改善仕様**: No.20 テンプレートタブ選択時のボタン非活性化  
> **実装ドキュメント**: `docs/改善仕様調査/No.20/PLAN.md`  
> **対象コンポーネント**:
> - `frontend/src/components/editorv2/components/EditorToolbar.tsx`（`isTemplateMode` フラグ追加・Material/Condition/Result/Transition/ワークフローボタンに `disabled={isTemplateMode}` 付与）

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-16-1 | ペトリネットタブ選択中に Material・Condition・Result・Transition・ワークフローの5ボタンが活性状態（クリック可能）であること | 表示確認 | `PLAN.md` §期待される成果「ペトリネットタブ選択中は通常通り活性状態」 | - | `viewMode === 'petriNet'` 時に `disabled` が付与されないことを確認 |
| 4-16-2 | テンプレートタブ選択中に Material・Condition・Result・Transition・ワークフローの5ボタンが非活性（グレーアウト・クリック不可）になること | 表示確認 | `PLAN.md` §期待される成果「テンプレートタブ選択中、5ボタンが非活性」 | - | `viewMode === 'templates'` 時に各ボタンに `disabled` が付与されること |
| 4-16-3 | テンプレートタブからペトリネットタブに切り替えると、非活性だった5ボタンが再び活性状態に戻ること | 表示確認 | `PLAN.md` §期待される成果「テンプレートタブ→ペトリネットタブに切り替え: ボタンが再度活性化」 | - | モード往復後にボタン状態が正しく復元されること |
| 4-16-4 | テンプレートタブ選択中に Document・バリデーション・保存・Undo・Redoボタンは活性状態のまま操作可能であること | 表示確認 | `PLAN.md` §期待される成果「Document・バリデーション・保存・Undo/Redo は影響を受けない」 | - | `isTemplateMode` の影響を受けないボタンが正常動作すること |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在し、MAIMLファイルが登録済みであること
- プロジェクト管理タブでプロジェクトを選択後、「編集」ボタンからPetriNetEditorを開いていること
- ツールバーのSegmentedコントロール（ペトリネット / テンプレート切り替え）が表示されていること

**非活性化対象ボタン（5件）:**

| ボタン名 | `onClick` ハンドラー | 備考 |
|---------|-------------------|------|
| Material | `onAddNode('material')` | `isTemplateMode` 時 `disabled` |
| Condition | `onAddNode('condition')` | `isTemplateMode` 時 `disabled` |
| Result | `onAddNode('result')` | `isTemplateMode` 時 `disabled` |
| Transition | `onAddNode('transition')` | `isTemplateMode` 時 `disabled` |
| ワークフロー | `onAddWorkflow` | `isTemplateMode` 時 `disabled` |

**非活性化対象外ボタン（影響を受けないボタン）:**
- Document（ドキュメント編集）
- バリデーション
- 保存
- Undo
- Redo

**手動テスト手順（概要）:**
1. 実験管理者としてログインし、チェックアウト済みプロジェクトのPetriNetEditorを開く
2. ツールバーがペトリネットモードであることを確認し、Material/Condition/Result/Transition/ワークフローの5ボタンがクリック可能な活性状態であることを目視確認（4-16-1）
3. ツールバーのSegmentedコントロールで「テンプレート」タブを選択する
4. Material/Condition/Result/Transition/ワークフローの5ボタンがグレーアウトされクリック不可になっていることを目視確認（4-16-2）
5. テンプレートタブ選択中にDocument・バリデーション・保存・Undo・Redoボタンが引き続き活性状態で操作できることを確認（4-16-4）
6. ツールバーのSegmentedコントロールで「ペトリネット」タブに戻す
7. 手順4でグレーアウトした5ボタンが再び活性状態（クリック可能）に戻ることを確認（4-16-3）

**注意事項:**
- `isTemplateMode` フラグは `viewMode === 'templates'` で導出される（`EditorToolbar.tsx` 内で定義）
- `viewMode` は `EditorToolbarProps` に既存定義されており、`PetriNetEditorInner` から渡される
- `viewMode` が `undefined` の場合、`'templates'` との比較は `false` となるため安全に動作する
- ボタンの非活性化はCSSによるグレーアウトと、クリックイベントの無効化の両方で確認すること

---

### 4-17: SubNetViewer トランジション用テンプレート表示

> **テスト方法**: 手動テスト（SubNetViewerはPetriNetViewer上のTransitionノードクリックで起動するダイアログであり、ReactFlow/DOM操作の目視確認が必要なため）  
> **対応改善仕様**: No.28 SubNetViewer templateMapsキー不一致修正  
> **実装ドキュメント**: `docs/改善仕様調査/No.28/result.md`  
> **対象コンポーネント**:
> - `frontend/src/components/viewer/PetriNetViewer.tsx`（Fix1, Fix6, Fix8c）
> - `frontend/src/components/viewer/dialogs/SubNetViewer.tsx`（Fix2, Fix3, Fix8b）
> - `frontend/src/reference/components/SubNetViewer/index.js`（Fix2: reference版）
> - `frontend/src/components/viewer/dialogs/PropertyViewer.tsx`（Fix4）
> - `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx`（Fix5, Fix7）
> - `frontend/src/utils/maimlDataExtractor.ts`（Fix8a: 新規作成）

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-17-1 | PetriNetViewer でTransitionノードをクリックするとSubNetViewerダイアログが開くこと | 正常系 | `result.md` §動作確認ポイント4 | - | SubNetViewer起動の前提確認 |
| 4-17-2 | SubNetViewer内の入力Placeノードのテンプレート種別（Material/Condition/Result）が正しく表示されること | 正常系 | `result.md` §Fix2「templateMapキー不一致修正」 | - | placeIdキーでtemplateMaplにヒットすること |
| 4-17-3 | SubNetViewer内の出力Placeノードのテンプレート種別（Material/Condition/Result）が正しく表示されること | 正常系 | `result.md` §Fix2「templateMapキー不一致修正」 | - | placeIdキーでtemplateMaplにヒットすること |
| 4-17-4 | SubNetViewer内でPlaceノードをクリックするとPropertyViewerが開くこと | 正常系 | `result.md` §動作確認ポイント1 | - | ノードクリック時のDrawer起動確認 |
| 4-17-5 | SubNetViewerのPropertyViewer「テンプレートタブ」に `property` 要素がキー / xsi:type / 値 / 説明・単位 の列で表示されること | 正常系 | `result.md` §Fix3「extractTemplateInfo新実装」、§Fix4「テンプレートタブ専用カラム」 | - | 変更前は「表示するプロパティがありません」と表示されていた |
| 4-17-6 | SubNetViewerのPropertyViewer「基本情報タブ」に id / 名前 / 説明 / 種別 が表示されること | 正常系 | `result.md` §Fix3「uuid/description追加」 | - | placeRef が表示されないこと（内部参照のため非表示） |
| 4-17-7 | SubNetViewerのPropertyViewer「基本情報タブ」に placeRef が表示されないこと | 正常系 | `result.md` §Fix3「placeRef除外」 | - | 変更前はplaceRef要素がテンプレートタブに表示されていた |
| 4-17-8 | SubNetViewerのPropertyViewer「データタブ」に `<data><results>` の実験結果値が個別フィールドに展開されて表示されること | 正常系 | `result.md` §Fix8b「SubNetViewerのデータタブ設定」、§Fix8d「property_*の個別展開表示」 | - | `temperature (value)` / `temperature (type)` / `temperature (units)` 等が個別行に展開されること |
| 4-17-9 | placeId と templateId が異なるケース（placeIdキーでヒットしない場合）でも、templateIdキーでフォールバックしてテンプレート情報が取得されること | 正常系 | `result.md` §Fix2「フォールバック: templateIdキー」 | - | フォールバックケースでも「テンプレート詳細情報が取得できませんでした」と表示されないこと |
| 4-17-10 | PetriNetViewer でPlaceノードをクリックすると **`PropertyViewerWithSelection`（Drawer）** が開き、テンプレートタブにプロパティが表示されること | 正常系 | `result.md` §Fix6「extractTemplateInfoForNode新実装」 | - | SubNetViewer経由ではなく、PetriNetViewer直接クリック時の表示確認。⚠️ PetriNetEditor（編集モード）のPlaceクリックでは `PropertyPanel` が開くため対象外 |
| 4-17-11 | PetriNetViewer のPlaceノードの `PropertyViewerWithSelection`「データタブ」に実験結果値が表示されること | 正常系 | `result.md` §Fix8c「PetriNetViewerのデータタブ設定」 | - | `templateMap[node.id].element.getAttribute('id')` でテンプレートIDを取得してマッチ |
| 4-17-12 | PropertyViewer のテンプレートタブで `property_` プレフィックスが除去されたキー名が表示されること | 表示確認 | `result.md` §Fix4「property_プレフィックス除去」 | - | `property_temperature` ではなく `temperature` と表示されること |
| 4-17-13 | PropertyViewerWithSelection で Object型の値がキー・値ペアに展開されて表示されること（`[object Object]` が表示されないこと） | 表示確認 | `result.md` §Fix5「Object型値のフラット展開表示」 | - | 変更前は `[object Object]` として表示されていた |
| 4-17-14 | 複数種別（material / condition / result）が混在するMAIMLファイルで SubNetViewer を開いた際、各Placeノードの種別が正しく識別されること | 正常系 | `result.md` §動作確認ポイント1 | - | 同一SubNetViewer内に3種類のPlaceが混在するケースで確認 |
| 4-17-15 | SubNetViewer（reference版 JavaScript）でも placeIdキーでtemplateMaplにヒットし、テンプレート種別が正しく表示されること | 正常系 | `result.md` §Fix2「reference版（index.js）」 | - | TypeScript版と同様の修正がreference版にも適用されていること |
| 4-17-16 | SubNetViewer で templateMap にヒットしないPlaceノードが存在した場合でも、他のPlaceノードは正常に表示されること（部分的な失敗が全体に波及しないこと） | 正常系 | `result.md` §Fix2「ログ警告」 | - | 1件のPlaceがtemplateMaplにヒットしなくても他Placeは表示されること |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在し、MAIMLファイルが登録済みであること
- **テスト経路**: 実験指示タブ → 「ペトリネット表示」ボタン → `ViewRendererDialog`（フローティング）内の `PetriNetViewer` が表示されていること（全シナリオ共通）
- ⚠️ **PetriNetEditor（「編集」ボタン経路）では SubNetViewer は起動しないため、本シナリオの対象外**。PetriNetEditor のPlaceノードクリックでは `PropertyPanel`（`editorv2/PropertyPanel.tsx`）が開く
- 以下の構造を持つテスト用MAIMLファイルを用意すること：
  - Material/Condition/Result の各Placeノードが少なくとも1件ずつ存在すること
  - Transitionノードが少なくとも1件存在し、入力Place（Material/Condition）・出力Place（Result）が接続されていること
  - 各PlaceノードにMAIMLテンプレート（`materialTemplate` / `conditionTemplate` / `resultTemplate`）が定義されており、`placeRef ref="..."` で接続されていること
  - テンプレートに `<property>` 要素が少なくとも1件以上定義されていること（4-17-5、4-17-8用）
  - `<data><results>` セクションに実験結果値が記録されていること（4-17-8、4-17-11用）
- PetriNetViewer で対象プロジェクトのMAIMLを閲覧できる状態であること（ビューアモードで開いている）
- 4-17-9用: `placeRef.ref` が設定されておらず、テンプレートIDでフォールバックするケースのMAIMLデータを用意すること（または既存MAIMLを調整）
- 4-17-15（reference版）用: reference版 SubNetViewer を使用する画面（WorkerDashboard等）が存在する場合、そちらでも確認すること

**テスト用MAIMLファイルのサンプル構造（最小構成）:**

```xml
<maiml>
  <method id="method_001">
    <petriNet>
      <place id="p_mat_001"><name>材料A</name></place>
      <place id="p_cond_001"><name>条件B</name></place>
      <place id="p_result_001"><name>結果C</name></place>
      <transition id="t_001"><name>処理T</name></transition>
      <arc source="p_mat_001" target="t_001"/>
      <arc source="p_cond_001" target="t_001"/>
      <arc source="t_001" target="p_result_001"/>
    </petriNet>
    <templates>
      <materialTemplate id="mt_001">
        <name>材料Aテンプレート</name>
        <description>材料Aの説明</description>
        <placeRef ref="p_mat_001"/>
        <property key="temperature" xsi:type="doubleType" units="K">
          <value>300</value>
          <description>温度</description>
        </property>
      </materialTemplate>
      <conditionTemplate id="ct_001">
        <name>条件Bテンプレート</name>
        <placeRef ref="p_cond_001"/>
        <property key="pressure" xsi:type="doubleType" units="Pa">
          <value>101325</value>
        </property>
      </conditionTemplate>
      <resultTemplate id="rt_001">
        <name>結果Cテンプレート</name>
        <placeRef ref="p_result_001"/>
        <property key="yield" xsi:type="doubleType" units="%">
          <value>85.5</value>
        </property>
      </resultTemplate>
    </templates>
  </method>
  <data id="data_001">
    <results id="results_001">
      <material ref="mt_001">
        <property key="temperature"><value>320</value></property>
      </material>
    </results>
  </data>
</maiml>
```

**手動テスト手順（概要）:**
1. 実験管理者としてログインし、テスト用プロジェクトをビューアモード（PetriNetViewer）で開く
2. MAIMLのペトリネットが描画されていることを確認する（4-17-1の前提）
3. Transitionノードをクリックして SubNetViewer ダイアログが開くことを確認（4-17-1）
4. SubNetViewer 内に入力Placeと出力Placeが表示され、各PlaceのテンプレートType（Material/Condition/Result）が正しく表示されることを確認（4-17-2、4-17-3）
5. 入力Placeノード（Material）をクリックして PropertyViewer が開くことを確認（4-17-4）
6. PropertyViewer「テンプレートタブ」にプロパティが表示されることを確認（4-17-5）
   - キー列: `temperature`（`property_` プレフィックスなし）
   - xsi:type列: `doubleType`
   - 値列: `300`
   - 説明・単位列: `温度 / 単位: K`
7. PropertyViewer「基本情報タブ」の内容を確認（4-17-6）
   - id, 名前, 説明, 種別が表示されること
   - placeRef が表示されないこと（4-17-7）
8. PropertyViewer「データタブ」に実験結果値が個別フィールドに展開されて表示されることを確認（4-17-8）
9. Conditionノード・Resultノードでも同様に表示されることを確認（4-17-14）
10. PlaceノードをPetriNetViewer上で直接クリックし（SubNetViewerを経由せず）、PropertyViewerにテンプレートプロパティが表示されることを確認（4-17-10）
11. PetriNetViewer上のPlaceノードのデータタブにも実験結果値が表示されることを確認（4-17-11）
12. `property_temperature` ではなく `temperature` と表示されることを確認（4-17-12）
13. PropertyViewerWithSelectionを使用する画面でObjectの展開表示を確認（4-17-13）

**注意事項:**
- No.28修正前は以下の問題が存在していた（修正後に解消されていることを確認すること）：
  - SubNetViewerのPropertyViewerで「テンプレート詳細情報が取得できませんでした」が表示される
  - テンプレートタブに「表示するプロパティがありません」と表示される
  - Object型のプロパティが `[object Object]` として表示される
  - placeRef 要素がテンプレートタブに表示される
- `buildTemplateMap()` のキーは **placeId**（`placeRef.ref` の値）であることを前提として確認する（`placeId ≠ templateId` のケースが存在する）
- reference版（index.js）は JavaScript で実装されており、TypeScript版と同様の修正が適用されているかを個別に確認すること
- `<data><results>.*ref` は **テンプレートID** を参照する（placeID ではない）ため、データタブ確認時は `templateMap[node.id].element.getAttribute('id')` でテンプレートIDを取得してマッチしていることを意識すること

---

### 4-18: 名前空間管理 ※フェーズ２追加

> 📌 **フェーズ２新機能**: `docs/requirement/phase2/01_namespace/` の要件に基づき追加。
> UI設計書: `docs/design/ui/experiment_admin/04_namespace_management/`（8ファイル）
> API: `docs/design/api/api_namespace.md`

> ⚠️ **実装上の注意（ソース調査結果）**: 実験管理者メニューの「名前空間管理」タブ（key=`'4'`）は `<UncertaintyManagement />` コンポーネントが実体です。  
> 画面構成：左ペイン（名前空間ツリー固定） ＋ 右ペイン（サブタブ: `prefix`（デフォルト） / `namespace` / `criteria`）  
> `NamespaceMain` / `PrefixManagement` / 不確かさ基準管理の3ビューを持ちます。  
> ⚠️ 旧設計書 §4-18-A の「名前空間一覧テーブル・追加ボタン・タイプフィルター」は実装に存在しません（`NamespaceMain` §3.1 参照: 左ペインに追加ボタンは存在しない）。

#### 4-18-A: 名前空間ツリー・基本表示

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-18-1 | 名前空間管理タブを開くと左ペインに名前空間ツリー（Global / 組織 / 個人）が表示され、右ペインにプレフィックス管理タブがデフォルト表示されること | 表示確認 | `UncertaintyManagement.tsx` `activeTab` 初期値 `'prefix'` | GET `/api/v1/organization-groups` | - | `prefix` タブがデフォルト選択状態であること |
| 4-18-2 | 名前空間ツリーで組織ノード（部門・グループ）を選択すると右ペインのコンテンツがそのスコープに絞り込まれること | 正常系 | `UncertaintyManagement.tsx` `selectedNsKey` → `effectiveNsKey` 連携 | - | - | `setSelectedNsKey` 経由で `NamespaceMain` / `PrefixManagement` に `selectedNsKey` が渡されること |
| 4-18-3 | Globalノード（`'global'` / `'ns-maiml'` / `'ns-xsi'`）を選択すると右ペインが `GlobalNamespaceView` に切り替わること | 正常系 | `UncertaintyManagement.tsx` `isGlobalNodeSelected` 条件 | - | - | `プレフィックス管理` / `用語管理` タブが非表示になること |
| 4-18-4 | 組織ツリーの最深リーフノード（チーム）が初回マウント時に自動選択されること | 表示確認 | `UncertaintyManagement.tsx` `findDeepestLeafKey` → `setSelectedNsKey` | GET `/api/v1/organization-groups` | - | 初期表示でツリーの最深ノードが選択ハイライト状態になること |
| 4-18-5 | チームノード（companyDepth=3）を右クリックするとコンテキストメニュー（「チームを追加」「編集」）が表示されること | 表示確認 | `NamespaceMain.tsx` `renderTreeTitle` `isTeam = companyDepth === 3` / `ui_namespace_main.md` §3.2.2 | - | - | 部門・グループ・Globalノードではコンテキストメニューが表示されないこと |
| 4-18-6 | コンテキストメニュー「チームを追加」をクリックすると `TeamAddDialog` が開き、チーム名・追加先・メンバーを入力してチームを作成できること | 正常系 | `UncertaintyManagement.tsx` `teamAddOpen` / `ui_namespace_main.md` §9 | POST `/api/v1/department-units` | - | チーム名が1文字以上の場合のみ「作成」ボタンが活性 |
| 4-18-7 | コンテキストメニュー「編集」をクリックすると `TeamEditDialog` が開き、メンバーを変更して保存できること | 正常系 | `UncertaintyManagement.tsx` `teamEditOpen` / `ui_namespace_main.md` §10 | PUT `/api/v1/department-units/:id/members` | - | チーム名が空の場合「保存」ボタンが非活性 |
| 4-18-8 | Personalノード選択中にチェックした用語の「🏢 組織に共有」ボタンが表示され、クリックすると `ShareScopeModal` 確認ダイアログが開くこと | 正常系 | `NamespaceMain.tsx` §11 `isPersonalSelected && selectedTermIds.length > 0` | - | - | GlobalノードまたはOrganizationノード選択中は「組織に共有」ボタンが表示されないこと |

#### 4-18-B: プレフィックス管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-18-9 | プレフィックス管理タブを開くとプレフィックス一覧が表示されること | 正常系 | `ui_prefix_management.md` §一覧表示 | GET `/api/v1/namespaces/prefixes` | - | `UncertaintyManagement` の `activeTab='prefix'` タブ |
| 4-18-10 | 新規プレフィックスを追加できること | 正常系 | `ui_prefix_management.md` §追加 | POST `/api/v1/namespaces/prefixes` | - | |
| 4-18-11 | 既存プレフィックスを編集できること | 正常系 | `ui_prefix_management.md` §編集 | PUT `/api/v1/namespaces/prefixes/:prefixId` | - | |
| 4-18-12 | プレフィックスを削除できること | 正常系 | `ui_prefix_management.md` §削除 | DELETE `/api/v1/namespaces/prefixes/:prefixId` | - | |

#### 4-18-C: 不確かさ基準管理

> 📌 実装上は `UncertaintyManagement` の `criteria` タブ（`activeTab='criteria'`）として名前空間管理画面内に存在します。
> UI設計書: `docs/design/ui/experiment_admin/04_namespace_management/ui_uncertainty_criteria_management.md`
> API: `docs/design/api/api_uncertainty_criteria.md`（v1.0.0 2026-08-14）

##### 4-18-C-1: 基本CRUD

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-18-C-1 | 不確かさ基準管理タブを開くと基準一覧が表示されること | 正常系 | `ui_uncertainty_criteria_management.md` §一覧 | GET `/api/v1/uncertainty-criteria` | - | uncertaintyKey・nameSpaceId・evaluationMethodが表示されること |
| 4-18-C-2 | 基準名・Key・説明でフリーテキスト検索できること（リアルタイムフィルタ） | 正常系 | `ui_uncertainty_criteria_management.md` §3 ツールバー「リアルタイムフィルタ」 | GET `/api/v1/uncertainty-criteria`（フロントエンド側フィルタ） | - | 検索欄に入力するとAPIを再発行せずテーブル表示が即時絞り込まれること |
| 4-18-C-3 | 定量評価（evaluationMethod=1）の不確かさ基準を新規登録できること | 正常系 | `api_uncertainty_criteria.md` §4.1 | POST `/api/v1/uncertainty-criteria` | - | xsiType / units / formatString を設定する |
| 4-18-C-4 | 定性評価（evaluationMethod=2）の不確かさ基準を新規登録できること（選択肢リスト付き） | 正常系 | `api_uncertainty_criteria.md` §4.1、§データモデル qualitativeOptions | POST `/api/v1/uncertainty-criteria` | - | qualitativeOptions（selectorValue / displayColor / isDefault）を設定する |
| 4-18-C-5 | 基準登録時に基準名（name）または Key（key）が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_uncertainty_criteria_management.md` §3 `UncertaintyCreateModal`、`UncertaintyTemplate` 型定義 §6 | POST `/api/v1/uncertainty-criteria` | - | 評価方式（eval）が未選択の場合も同様にバリデーションエラーが表示されること |
| 4-18-C-6 | 定量評価で formatString が不正な場合にバリデーションエラーが表示されること | 異常系 | `api_uncertainty_criteria.md` §4.1 バリデーション | POST `/api/v1/uncertainty-criteria` | - | |

##### 4-18-C-2: バージョン管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-18-C-7 | 既存の不確かさ基準を更新（バージョンアップ）できること | 正常系 | `api_uncertainty_criteria.md` §4.2（バージョン管理） | POST `/api/v1/uncertainty-criteria` | - | 同一 uncertaintyKey で新規 INSERT → MAX(version)+1 で採番されること |
| 4-18-C-8 | 基準を更新すると旧バージョンが一括無効化（is_Invalid=true）されること | 正常系 | `api_uncertainty_criteria.md` §バージョン管理の仕組み | POST `/api/v1/uncertainty-criteria` | - | 旧バージョンのレコードが `is_Invalid=TRUE` になることをDB確認 |
| 4-18-C-9 | バージョン履歴一覧を確認できること（無効化済みバージョンを含む） | 正常系 | `ui_uncertainty_criteria_management.md` §バージョン履歴 | GET `/api/v1/uncertainty-criteria/:id/history` | - | 最新バージョンとすべての旧バージョンが表示されること |

##### 4-18-C-3: 無効化・セレクター向け取得

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-18-C-10 | 不確かさ基準を個別に無効化（isInvalid=true）できること | 正常系 | `api_uncertainty_criteria.md` §4.3 | PATCH `/api/v1/uncertainty-criteria/:id/invalidate` | - | |
| 4-18-C-11 | 無効化した不確かさ基準は一覧のデフォルト表示から除外されること | 正常系 | `ui_uncertainty_criteria_management.md` §無効化フィルター | GET `/api/v1/uncertainty-criteria` | - | デフォルトは有効（isInvalid=false）のみ表示 |
| 4-18-C-12 | セレクター向け取得エンドポイント（`/for-selector`）では無効化済み（isInvalid=true）の基準が返却されないこと | 正常系 | `api_uncertainty_criteria.md` §4.4（セレクター向け） | GET `/api/v1/uncertainty-criteria/for-selector` | - | 実験評価画面でのセレクター用途 |
| 4-18-C-13 | セレクター向け取得エンドポイントでは有効な最新バージョンの基準のみ返却されること | 正常系 | `api_uncertainty_criteria.md` §4.4 | GET `/api/v1/uncertainty-criteria/for-selector` | - | 旧バージョン（isInvalid=true）は返却されないこと |
| 4-18-C-14 | 定性評価の基準をセレクター向けエンドポイントで取得すると qualitativeOptions（選択肢リスト）が含まれること | 正常系 | `api_uncertainty_criteria.md` §4.4 レスポンス | GET `/api/v1/uncertainty-criteria/for-selector` | - | |
| 4-18-C-15 | 無効化した基準を再有効化できること（is_Invalid=false に戻す） | 正常系 | `ui_uncertainty_criteria_management.md` §再有効化 | PATCH `/api/v1/uncertainty-criteria/:id/invalidate` | - | 再有効化後にセレクターでも表示されること |

#### 4-18-D: 用語管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-18-D-1 | 用語管理タブを開くと用語一覧が表示されること | 正常系 | `ui_term_management.md` §一覧表示 / `UncertaintyManagement` `activeTab='namespace'` | GET `/api/v1/namespaces/:id/terms` | - | `NamespaceMain`（hideTree=true）が表示されること |
| 4-18-D-2 | 新規用語を追加できること（インライン入力行） | 正常系 | `ui_term_management.md` §追加 / `ui_namespace_main.md` §4.3.2 | POST `/api/v1/namespaces/:id/terms` | - | 「＋ 用語を追加」ボタン → 先頭に黄色インライン入力行が追加されること |
| 4-18-D-3 | 既存用語を編集できること（インライン編集） | 正常系 | `ui_term_management.md` §編集 / `ui_namespace_main.md` §8 | PUT `/api/v1/namespaces/:id/terms/:termId` | - | 「✏ 編集」ボタン → 行がインライン編集モードに切り替わること |
| 4-18-D-4 | 用語を非アクティブ化できること | 正常系 | `ui_namespace_main.md` §4.3.3 操作ボタン仕様 | PATCH `/api/v1/namespaces/:id/terms/:termId` | - | 「非アクティブ」ボタン → 確認ダイアログ後に行がグレーアウト表示 |
| 4-18-D-5 | 非アクティブな用語を再アクティブ化できること | 正常系 | `ui_namespace_main.md` §4.3.3 「アクティブ」ボタン | PATCH `/api/v1/namespaces/:id/terms/:termId` | - | 「アクティブ」ボタン → 確認なしで即時アクティブに戻ること |
| 4-18-D-6 | 用語名（ローカル名）が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_namespace_main.md` §4.3.4 バリデーション | - | - | インライン入力行の「保存」クリック時に表示されること |

**前提条件:**
- 実験管理者ロールでログイン済み
- 名前空間管理タブ（`ExperimentAdminMenu` key=`'4'`）が表示されていること
- 4-18-1〜4-18-8: `organization_group` テーブルに1件以上のアクティブなグループが存在すること
- 4-18-5〜4-18-7: `organization_group` テーブルに chidren を持つ3階層（会社＞部門＞グループ）の組織が存在すること
- 4-18-8: Personalノードが選択されており、用語が1件以上チェックされていること
- 4-18-9〜4-18-12: `PrefixManagement` で参照する名前空間にプレフィックスが1件以上存在すること（4-18-11〜4-18-12用）
- 4-18-C-1〜4-18-C-15: `uncertainty_criteria` テーブルと `namespace` テーブルにテストデータが存在すること
  - 4-18-C-7〜4-18-C-9（バージョン管理）: 既存の不確かさ基準（version=1）が1件以上存在すること
  - 4-18-C-8: DB直接確認の権限があること（PostgreSQL接続）
  - 4-18-C-10〜4-18-C-11（無効化）: 有効な不確かさ基準が1件以上存在すること
  - 4-18-C-12〜4-18-C-14: 有効な基準（定量1件以上・定性1件以上）と無効化済み基準（1件以上）が混在すること
  - 4-18-C-15: 無効化された基準が1件以上存在すること
- 4-18-D-1〜4-18-D-6: 対象名前空間に用語が1件以上存在すること（4-18-D-3〜4-18-D-5用）

**後処理:**
- 追加したプレフィックスを削除（4-18-10）
- 登録した不確かさ基準を `uncertainty_criteria` テーブルから削除（4-18-C-3〜4-18-C-4）
- バージョンアップで作成した新バージョンのレコードを削除し、旧バージョンを有効化（4-18-C-7〜4-18-C-8）
- 無効化した基準を再有効化（4-18-C-10）
- 追加した用語を削除（4-18-D-2）

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
| テスト用プロジェクト（チェックイン済み） | 4-3, 4-4, 4-5, 4-6 | テスト実行前にDBに挿入 |
| MAIMLファイル登録済みプロジェクト | 4-4（タスク登録） | S3にMAIMLファイルを配置 |
| タスクデータ付きプロジェクト | 4-6（タスク結果確認） | project_task_detailレコードを挿入 |
| 複数ステータスのプロジェクト | 4-7（フィルタ・検索） | DBに複数プロジェクトを挿入 |
| 未解決・解決済の問題データ（`issue`テーブル） | 4-12-1〜4-12-8（問題管理） | `issue`テーブルにテストデータを挿入（`status=unresolved`を1件以上、`status=resolved`を1件以上） |
| 問題に紐づくコメントデータ（`issue_comment`テーブル） | 4-12-1（問題一覧・コメント表示確認） | `issue_comment`テーブルにテストデータを挿入（既存問題に対して1件以上） |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 1 | プロジェクトの作成（ワークフローベースを選択して作成） | ✅ `CreateProjectModal` | POST `/api/v1/projects` | **4-1** |
| 2 | ワークフローの修正（プロジェクト内のワークフロー編集） | ✅ `PetriNetEditorScreen` | S3ファイル操作 | **4-2** |
| 3 | タスクの作成（メソッド・試行回数・実験条件設定） | ✅ `TaskRegistrationTab` | POST `/api/v1/projects/:projectName/task-registration` | **4-4** |
| 4 | 実験前のワークフロー・タスクの設定 | ✅ チェックアウト操作（編集ロック） | POST `/api/v1/projects/:projectName/checkout` | **4-3** |
| 5 | 実験タスク実行中のワークフロー修正（チェックイン操作） | ✅ チェックイン操作 | POST `/api/v1/projects/:projectName/checkin` | **4-3** |
| 6 | 実験作業者への指示事項の入力・提示 | ✅ `InstructionRegistrationTab` | POST `/api/v1/projects/:projectName/instructions/send` | **4-5** |
| 7 | 実験中の進捗・実験作業者のメモの閲覧 | ✅ `ProgressMonitoring` + `WorkProgressDetailDialog` | GET `/api/v1/projects`（進捗情報含む） | **4-6** |
| 8 | 実験結果の信頼性フラグの記録（○/△/×） | ❌ 設計書に未定義 | - | **対象外** |
| 9 | データマートの作成 | ❌ 設計書に未定義 | - | **対象外** |
| 10 | 解析に利用するデータの指定・検索・構造化・蓄積 | ❌ 設計書に未定義 | - | **対象外** |
| 11 | 外部データのアップロード（フォーマット変換後） | ❌ 設計書に未定義 | - | **対象外** |
| 12 | 実験管理者の操作履歴の閲覧 | ❌ 設計書に未定義 | - | **対象外** |
| 13 | ワークフローベースの作成（慣れた後） | ✅ `FormatManagement` | GET `/api/v1/formats` など | **4-8** |
| 14 | システムダウン時の状態通知の受信 | ❌ 設計書に未定義 | - | **対象外** |
| 15 | タスク実行状況の確認 | ✅ `TaskResultsTable` + 統計カード | GET `/api/v1/projects/:projectName/tasks` | **4-6** |

---

## 5. 追加機能一覧（要件書に未記載・設計書に実装済み）

設計書を精査した結果、要件書に記載のない以下の機能が実装されていることが確認された。これらもテスト対象に追加する。

| 追加機能ID | 機能名 | 根拠（設計書） | 対応API | テスト対象 |
|-----------|--------|---------------|---------|-----------|
| A | プロジェクト一覧のフィルタリング（所有者/部門/ステータス/チェックアウト状態） | `ProjectManagement.md` §フィルタ | GET `/api/v1/projects`（クエリパラメータ） | **4-7** |
| B | プロジェクト一覧のキーワード検索 | `ProjectManagement.md` §検索 | GET `/api/v1/projects`（クエリパラメータ） | **4-7** |
| C | プロジェクトファイル一覧表示・ファイルダウンロード・ビューア起動（ルート・アーカイブ） | `FileListTable.md`、`ProjectFolderTree.md` | GET `/api/v1/projects/:projectName/files`、POST `/api/v1/files/download` | **4-1** |
| D | プロジェクト一括ダウンロード（ZIP形式） | `ProjectManagement.md` §一括ダウンロード | POST `/api/v1/files/download-folder-zip` | **4-1** |
| E | タスク結果の統計表示（実行待ち/実行中/レビュー待ち/完了/異常終了） | `TaskResultsTable.md`、`ProgressMonitoring.md` §統計 | GET `/api/v1/projects/:projectName/tasks` | **4-6** |
| F | レビュー待ちタスクの一括完了 | `TaskResultsTable.md` §一括完了 | POST `/api/v1/projects/:projectName/tasks/complete-review` | **4-6** |
| G | 指示の個別編集（未送信のみ） | `InstructionDialog.md` §編集、API設計書 §API#18 | PUT `/api/v1/projects/:projectName/instructions/:instructionId` | **4-5** |
| H | 指示の個別削除（未送信のみ） | `InstructionDialog.md` §削除、API設計書 §API#19 | DELETE `/api/v1/projects/:projectName/instructions/:instructionId` | **4-5** |
| I | 指示登録状況の確認（未送信件数/送信済み件数/合計件数） | API設計書 §API#17 | GET `/api/v1/projects/:projectName/instructions/status` | **4-5** |
| J | 進捗確認タブでの詳細ダイアログ表示 | `ProgressMonitoring.md` §詳細表示、`WorkProgressDetailDialog.md` | GET `/api/v1/projects`（進捗情報含む） | **4-6** |
| K | タスク登録のドラッグ＆ドロップ順序変更 | `TaskResultsTable.md` §順序変更 | POST `/api/v1/projects/:projectName/task-registration` | **4-4** |
| L | 一括ファイルアップロード（単一/一括/フォルダの3モード、進捗表示、フォルダ構造保持） | `BulkUploadDialog.md` | POST `/api/v1/files/upload` | **4-11** |
| M | プロジェクト詳細モーダル（ProjectDetailModal）での詳細情報表示 | `ProjectDetailModal.md` | GET `/api/v1/projects/:projectName` | **4-1** |
| N | ワーカー連携済みタスクの編集・順序変更ロック（`workerLinkedFlg`） | `TaskResultsTable.md` §workerLinkedFlg | - | **4-4** |
| O | タスク登録タブからの指示追加（InstructionEditDialog連携） | `InstructionDialog.md` §タスク連携 | GET `/api/v1/projects/:projectName/instructions/status` | **4-4**、**4-5** |
| P | 進捗確認画面でのPetriNet可視化表示 | `PetriNetVisualization.md` | - | **4-6** |
| Q | プロジェクト検索モーダル（ProjectSearchModal）での高度な検索 | `ProjectSearchModal.md` | GET `/api/v1/projects`（クエリパラメータ） | **4-7** |
| R | トランジション検索（キーワード/ステータス/セマンティック検索） | `ProgressMonitoring.md` §トランジション検索 | GET `/api/v1/transition-search` | **4-9** |
| S | MAIMLファイルのOpenData Pipeline公開・非公開管理 | `ui_maiml_publish.md` | POST `/api/v1/projects/:projectName/publish`、POST `/api/v1/projects/:projectName/unpublish` | **4-10** |

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
| GET `/api/v1/projects/:projectName/instructions`（管理者用） | 🔴 未実装 | 4-5-6（指示一覧確認）の実施に影響する可能性あり |
| POST `/api/v1/formats/search` | 🔴 未実装 | 4-8-4〜4-8-7（詳細検索）はUI操作のみ確認。検索結果の検証は実装後に追加 |
| POST `/api/v1/formats/folders` | ✅ 実装済み | 4-8-3〜4-8-8・4-8-57〜4-8-58（ルートフォルダ作成）はAPIを呼び出して全確認可能 |
| POST `/api/v1/formats/subfolders` | ✅ 実装済み | 4-8-9〜4-8-12（新規サブフォルダ作成）はAPIを呼び出して全確認可能。APIパスは `/formats/subfolders`（`:formatId` なし）に注意 |
| POST `/api/v1/formats/:folderName/files` | ✅ 実装済み | 4-8-14・4-8-17〜4-8-18・4-8-20（新規ファイル作成）はAPIを呼び出して全確認可能 |
| POST `/api/v1/formats/upload` | 🔴 未実装 | 4-8-23〜4-8-31（アップロード）はフロントエンドのモック動作のみ確認 |
| POST `/api/worker/load-maiml-file` | ✅ 実装済み | 4-8-32（MAIMLファイル編集起動）に使用。PetriNetEditorへのファイル読み込みのみ確認 |
| PUT `/api/v1/formats/:formatId/files/:fileId` | 🔴 未実装 | 4-8-34（編集保存）はAPI実装後に確認 |
| POST `/api/v1/files/download`（フォーマット管理） | 🔴 未実装 | 4-8-36〜4-8-37（ファイルダウンロード）はAPI実装後に確認 |
| DELETE `/api/v1/formats/:formatId/files/:fileId` | 🔴 未実装 | 4-8-39（ファイル削除）は削除確認ダイアログの動作のみ確認。削除完了の確認はAPI実装後に追加 |
| POST `/api/v1/maiml/auto-correct` | ✅ 実装済み | 4-2-21〜4-2-23、4-2-24（自動補正）に使用。バックエンドの `maimlService.autoCorrectMaiml()` で補正処理を実行 |
| DELETE `/api/v1/projects/:projectName/maiml` | ✅ 実装済み | 4-1-24〜4-1-28（MAIMLファイル削除）に使用。S3ファイル削除・archiveフォルダ削除・`project_maiml_flg`更新を実施 |
| POST `/api/v1/maiml/save` | ✅ 実装済み | 4-2-24（自動補正して保存）で `auto-correct` 後に呼び出される |

---

## 7. 参照ドキュメント

### 7.1 UI設計書索引

| ドキュメント | パス |
|------------|------|
| 実験管理者UI設計書索引 | `docs/design/ui/experiment_admin/README.md` |

### 7.2 メニュー

| ドキュメント | パス |
|------------|------|
| 実験管理者メニュー設計 | `docs/design/ui/experiment_admin/00_menu/ui_experiment_admin_menu.md` |

### 7.3 プロジェクト管理

| ドキュメント | パス |
|------------|------|
| プロジェクト管理画面設計 | `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md` |
| プロジェクトフォルダツリー設計 | `docs/design/ui/experiment_admin/01_project_management/ui_project_folder_tree.md` |
| ファイル一覧テーブル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` |
| プロジェクト作成モーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_create_project_modal.md` |
| プロジェクトリネームモーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_rename_project_modal.md` |
| プロジェクト完了ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_project_completion_dialog.md` |
| 一括アップロードダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_bulk_upload_dialog.md` |
| タスク登録タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md` |
| 実験計画ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_plan_dialog.md` |
| 評価登録タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_evaluation_registration_tab.md` |
| 評価ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_evaluation_dialog.md` |
| 実験指示タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` |
| 指示編集ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_instruction_edit_dialog.md` |
| 指示登録タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_instruction_registration_tab.md` |
| 不確かさ承認タブ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_uncertainty_approval_tab.md` |
| MAIMLバリデーションモーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_validation_modal.md` |
| MAIML公開確認ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_publish_dialog.md` |
| MAIML非公開確認ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_unpublish_dialog.md` |
| トランジション検索結果設計 | `docs/design/ui/experiment_admin/01_project_management/ui_transition_search_results.md` |
| トランジションセット検索モーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_transition_set_search_modal.md` |
| トランジションセット一括処理パネル設計 | `docs/design/ui/experiment_admin/01_project_management/ui_transition_set_batch_processing_panel.md` |
| ウェイトスライダー設計 | `docs/design/ui/experiment_admin/01_project_management/ui_weight_sliders.md` |

### 7.4 フォーマット管理

| ドキュメント | パス |
|------------|------|
| フォーマット管理画面設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_management.md` |
| フォーマットフォルダツリー設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_folder_tree.md` |
| フォーマットファイル一覧設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` |
| フォーマット作成モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_modal.md` |
| フォーマットファイル作成モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_file_modal.md` |
| フォーマットフォルダ作成モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/ui_create_format_folder_modal.md` |
| フォーマット詳細モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_file_detail_modal.md` |
| フォーマット検索モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_search_modal.md` |
| フォーマットアップロードダイアログ設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_upload_dialog.md` |
| フォーマットエディタダイアログ設計 | `docs/design/ui/experiment_admin/02_format_management/ui_format_editor_dialog.md` |
| 組織グループセレクター設計 | `docs/design/ui/experiment_admin/02_format_management/ui_organization_group_selector.md` |

### 7.5 進捗確認

| ドキュメント | パス |
|------------|------|
| 進捗確認画面設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/ui_progress_monitoring.md` |
| 作業進捗詳細ダイアログ設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/ui_work_progress_detail_dialog.md` |
| タスク結果テーブル設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/ui_task_results_table.md` |
| Petri Net可視化設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/ui_petri_net_visualization.md` |

### 7.6 MAIML編集

| ドキュメント | パス |
|------------|------|
| Petri Netエディタ画面設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_petri_net_editor_screen.md` |
| Petri Netエディタコア設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_petri_net_editor.md` |
| Petri Netエディタ内部設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_petri_net_editor_inner.md` |
| エディタツールバー設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_editor_toolbar.md` |
| プロパティパネル設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_property_panel.md` |
| ネストプロパティエディタ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_nested_property_editor.md` |
| バリデーションパネル設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_validation_panel.md` |
| メソッドタブパネル設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_method_tab_panel.md` |
| ワークフロー選択ダイアログ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_workflow_selector_dialog.md` |
| 保存ダイアログ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_save_dialog.md` |
| 保存確認ダイアログ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/ui_save_confirm_dialog.md` |
| プレイスノード設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/nodes/ui_place_nodes.md` |
| トランジションノード設計 | `docs/design/ui/experiment_admin/05_maiml_editor/petri_net/nodes/ui_transition_node.md` |
| ドキュメント編集ダイアログ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/document/ui_document_edit_dialog.md` |
| テンプレートエディタ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/document/ui_template_editor.md` |
| マルチオブジェクトエディタ設計 | `docs/design/ui/experiment_admin/05_maiml_editor/document/ui_multi_object_editor.md` |
| XMLビューア設計 | `docs/design/ui/experiment_admin/05_maiml_editor/document/ui_xml_viewer.md` |
| 下書き管理設計 | `docs/design/ui/experiment_admin/05_maiml_editor/document/ui_draft_manager.md` |

### 7.7 MAIML公開管理

| ドキュメント | パス |
|------------|------|
| MaiML公開管理設計（概要） | `docs/design/ui/experiment_admin/ui_maiml_publish.md` |
| MaiML公開確認ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_publish_dialog.md` |
| MaiML非公開確認ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_unpublish_dialog.md` |
| MaiML OpenData Pipeline API設計 | `docs/design/api/api_maiml_opendata.md` |

### 7.8 API設計書

| ドキュメント | パス |
|------------|------|
| プロジェクト管理API設計 | `docs/design/api/api_project_management.md` |
| ファイルアクセスAPI設計 | `docs/design/api/api_file_access.md` |
| 問題管理API設計 | `docs/design/api/api_issue_management.md` |

### 7.9 名前空間管理 ※フェーズ２追加

| ドキュメント | パス |
|------------|------|
| 名前空間メイン画面設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_main.md` |
| 名前空間追加ダイアログ設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_add_dialog.md` |
| グローバル名前空間ビュー設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_global_namespace_view.md` |
| 重複候補サジェストモーダル設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_duplicate_suggest_modal.md` |
| 公開範囲変更モーダル設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_share_scope_modal.md` |
| プレフィックス管理画面設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_prefix_management.md` |
| 用語管理画面設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_term_management.md` |
| 不確かさ基準管理画面設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_uncertainty_criteria_management.md` |
| 名前空間管理API設計 | `docs/design/api/api_namespace.md` |

### 7.10 不確かさ基準管理 ※フェーズ２追加

| ドキュメント | パス |
|------------|------|
| 不確かさ基準管理画面設計 | `docs/design/ui/experiment_admin/04_namespace_management/ui_uncertainty_criteria_management.md` |
| 不確かさ基準管理API設計 | `docs/design/api/api_uncertainty_criteria.md` |
| 不確かさ基準要件定義 | `docs/requirement/phase2/03_Uncertainty/` |

### 7.11 Viewer ※フェーズ２追加

| ドキュメント | パス |
|------------|------|
| ドラフト復元ダイアログ設計 | `docs/design/ui/experiment_admin/06_Viewer/ui_draft_restore_dialog.md` |

### 7.12 その他

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| 問題管理モーダル設計（実験作業者側） | `docs/design/ui/experiment_worker/ui_issue_management_modal.md` |
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
