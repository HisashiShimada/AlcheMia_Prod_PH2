# 実験管理者 シナリオテスト対象一覧

> **作成日**: 2026-03-10  
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）  
> **照合先**: UI設計書（`docs/design/ui/experiment_admin/`）、API設計書（`docs/design/api/api_project_management.md`）

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
| **4-1** | プロジェクト作成・ファイル操作 | 要件書#1、追加機能C/D/M | 28件 | Playwright自動 | 20 | 0 | 8 |
| **4-2** | MAIML編集（PetriNetEditor） | 要件書#2 | 34件 | 手動 | 26 | 0 | 8 |
| **4-3** | チェックアウト/チェックイン | 要件書#4/#5 | 9件 | Playwright自動 | 9 | 0 | 0 |
| **4-4** | タスク登録 | 要件書#3、追加機能K/N | 7件 | Playwright自動 | 7 | 0 | 0 |
| **4-5** | 指示登録・送信 | 要件書#6、追加機能G/H/I/O | 10件 | Playwright自動 | 10 | 0 | 0 |
| **4-6** | 進捗確認・タスク結果 | 要件書#7/#15、追加機能E/F/J/P | 13件 | Playwright自動 | 13 | 0 | 0 |
| **4-7** | プロジェクトフィルタ・検索 | 追加機能A/B/Q | 7件 | Playwright自動 | 7 | 0 | 0 |
| **4-8** | フォーマット管理 | 要件書#13 | 48件 | Playwright自動 | 40 | 0 | 8 |
| **4-9** | トランジション検索 | 追加機能R | 10件 | Playwright自動（手動1件含む） | 10 | 0 | 0 |
| **4-10** | プロジェクト公開 | 追加機能S | 11件 | Playwright自動（フロントエンド実装後） | 4 | 0 | 0 |
| **4-11** | ファイルアップロード | `ui_bulk_upload_dialog.md` | 10件（手動2件含む） | Playwright自動 + 手動 | 10 | 0 | 0 |
| **4-12** | 問題管理 | `ui_issue_management_modal.md`、`api_issue_management.md` | 8件 | Playwright自動 | 8 | 0 | 0 |
| **合計** | - | - | **188件** | - | **164** | **0** | **24** |


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
| 4-1-1 | プロジェクトを新規作成できること | 正常系 | 要件書#1 | POST `/api/v1/projects` | OK | |
| 4-1-2 | プロジェクト名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - | OK | |
| 4-1-3 | プロジェクト名が3文字未満の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - | OK | |
| 4-1-4 | プロジェクト名が100文字超の場合にバリデーションエラーが表示されること | 異常系 | `CreateProjectModal` バリデーション | - | OK | |
| 4-1-5 | キャンセルしてもプロジェクトが作成されないこと | 正常系 | `CreateProjectModal` キャンセル | - | OK | |
| 4-1-6 | 既存のプロジェクト名を入力した場合に重複エラーが表示されること | 異常系 | 要件書#1、API 409エラー | POST `/api/v1/projects` | OK | |
| 4-1-7 | プロジェクト未選択時は「プロジェクトダウンロード」ボタンが非活性であること | 表示確認 | `ui_project_management.md` §2.2.3 | - | OK | |
| 4-1-8 | プロジェクト選択後に「プロジェクトダウンロード」ボタンが活性化されること | 表示確認 | `ui_project_management.md` §2.2.3-B、§3.7 | - | OK | |
| 4-1-9 | 「プロジェクトダウンロード」ボタンをクリックするとZIPファイルがダウンロードされること | 正常系 | 追加機能D、`ui_project_management.md` §3.7 | POST `/api/v1/files/download-folder-zip` | OK | |
| 4-1-10 | ファイル一覧の「ダウンロード」ボタンをクリックするとファイルがダウンロードされること | 正常系 | 追加機能C、`ui_file_list_table.md` §3.4 | POST `/api/v1/files/download` | OK | |
| 4-1-11 | ダウンロード中は該当ファイルの「ダウンロード」ボタンがローディング状態になり、他のダウンロードボタンが非活性になること | 表示確認 | `ui_file_list_table.md` §3.4.2 | - | OK | |
| 4-1-12 | ファイルダウンロードに失敗した場合にエラーメッセージが表示されること | 異常系 | `ui_file_list_table.md` §9.1 | POST `/api/v1/files/download` | OK | |
| 4-1-13 | ファイル一覧の「ビューア」ボタンをクリックするとビューアダイアログが起動すること | 正常系 | 追加機能C、`ui_file_list_table.md` §3.5 | - | OK | |
| 4-1-14 | 複数のビューアダイアログを同時に開けること（上限5個） | 正常系 | `ui_project_management.md` §3.10.2 | - | OK | |
| 4-1-15 | 5個を超えてビューアダイアログを開こうとすると警告メッセージが表示されること | 異常系 | `ui_project_management.md` §3.10.2 | - | OK | |
| 4-1-16 | プロジェクト一覧のプロジェクト名をクリックするとProjectDetailModalが表示されること | 正常系 | 追加機能M、`ui_project_detail_modal.md` §概要 | - | OK | |
| 4-1-17 | ProjectDetailModalにプロジェクト情報（名前・ステータスタグ・フォルダ名・説明・所有者・メンバー・ファイル数・ストレージ使用量・作成日・最終更新日・タグ）が表示されること | 表示確認 | `ui_project_detail_modal.md` §2.3 | GET `/api/v1/projects/:projectName` | OK | |
| 4-1-18 | ProjectDetailModalの「プロジェクトを開く」ボタンをクリックするとモーダルが閉じてプロジェクトが選択状態になること | 正常系 | `ui_project_detail_modal.md` §2.6 | - | OK | |
| 4-1-19 | ProjectDetailModal内のファイル一覧にFileListTableコンポーネントが表示されること | 表示確認 | `ui_project_detail_modal.md` §2.5 | GET `/api/v1/projects/:projectName/files` | OK | |
| 4-1-20 | ProjectDetailModalの「閉じる」ボタンをクリックするとモーダルが閉じること | 正常系 | `ui_project_detail_modal.md` §2.6 | - | OK | |
| 4-1-21 | ファイル一覧の各ファイル行に「…（その他）」メニューボタンが表示されること | 表示確認 | `ui_file_list_table.md` PR#138 §2.2.3 | - | - | |
| 4-1-22 | 「…」メニューを開くと「名前の変更」と「削除」の項目が表示されること | 表示確認 | `ui_file_list_table.md` §2.2.3 | - | - | |
| 4-1-23 | 「名前の変更」メニュー項目をクリックすると「名前の変更機能は未実装です」メッセージが表示されること | 正常系 | `ui_file_list_table.md` §2.2.3（未実装メッセージ） | - | - | |
| 4-1-24 | MAIMLファイルの「削除」メニュー項目をクリックすると削除確認ダイアログが表示されること | 正常系 | `ui_file_list_table.md` §2.2.3、`ui_project_management.md` PR#138 §2.2.4 | - | - | |
| 4-1-25 | 削除確認ダイアログでキャンセルするとMAIMLファイルが削除されないこと | 正常系 | `ui_file_list_table.md` §2.2.3 | - | - | |
| 4-1-26 | 削除確認ダイアログで確認するとMAIMLファイルおよびarchiveフォルダ内の全バージョンファイルが削除され、`project_maiml_flg`が`false`に更新されること | 正常系 | `docs/改善仕様調査/No.1/20260331_1137_MAIMLファイル削除時Archiveフォルダ削除/PLAN.md` §実装内容 | DELETE `/api/v1/projects/:projectName/maiml` | - | S3上のarchiveフォルダも含めて全削除 |
| 4-1-27 | archiveフォルダが存在しないプロジェクトのMAIMLファイルを削除しても正常に完了すること | 正常系 | `docs/改善仕様調査/No.1/20260331_1137_MAIMLファイル削除時Archiveフォルダ削除/PLAN.md` §8 | DELETE `/api/v1/projects/:projectName/maiml` | - | 初回アップロードのみで未バージョニングの場合 |
| 4-1-28 | `project_status`が実行中（in_progress）のプロジェクトのMAIMLファイルは削除できないこと | 異常系 | `docs/改善仕様調査/No.1/20260327_0822_maimlファイル削除時project_status確認追加/PLAN.md`、`ui_project_management.md` §6.1 | DELETE `/api/v1/projects/:projectName/maiml` | - | エラーメッセージが表示されること |

**前提条件:**
- 実験管理者ロールでログイン済み
- プロジェクト管理タブが表示されている
- テスト用プロジェクトがDB・S3に存在すること（4-1-7〜4-1-28）
- テスト用プロジェクトのS3にファイルが存在すること（4-1-10〜4-1-15、4-1-19）
- ProjectDetailModal確認シナリオ（4-1-16〜4-1-20）用: タグ・メンバーが設定されたテスト用プロジェクトが1件以上存在すること
- MAIMLファイル削除シナリオ（4-1-21〜4-1-28）用: MAIMLファイルが登録済み（`project_maiml_flg = true`）のプロジェクトが1件以上存在すること
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

> **テスト方法**: 手動テスト（GUI操作が複雑かつ専門的なため、Playwrightによる自動化対象外）

| シナリオID | シナリオ名 | 種別 | 根拠 | 結果 | 備考 |
|-----------|-----------|------|------|------|------|
| 4-2-1 | PetriNetEditorでワークフローを開いて表示できること | 正常系 | 要件書#2 | OK | |
| 4-2-2 | PetriNetEditorでノード・トランジションを編集して保存できること | 正常系 | 要件書#2 | OK | |
| 4-2-3 | 編集内容がS3に反映されMAIMLファイルが更新されること | 正常系 | 要件書#2 | OK | |
| 4-2-4 | ペトリネット編集画面が表示されること（ノード・エッジの描画確認） | 正常系 | `ui_petri_net_editor_screen.md` §2.1、`ui_petri_net_editor.md` §6.1 | OK | |
| 4-2-5 | ビューモードを「テンプレート」に切り替えるとテンプレート一覧が表示されること | 正常系 | `ui_editor_toolbar.md` §5.1、`ui_petri_net_editor.md` §5.13 | OK | |
| 4-2-6 | メソッドタブからメソッドを追加でき、タブが増えること | 正常系 | `ui_petri_net_editor.md` §5.7 | OK | |
| 4-2-7 | ツールバーの「Material」ボタン（またはM+クリック）でMaterialノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | OK | |
| 4-2-8 | ツールバーの「Condition」ボタン（またはC+クリック）でConditionノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | OK | |
| 4-2-9 | ツールバーの「Result」ボタン（またはR+クリック）でResultノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | OK | |
| 4-2-10 | ツールバーの「Transition」ボタン（またはT+クリック）でTransitionノードがキャンバスに追加されること | 正常系 | `ui_editor_toolbar.md` §5.2、`ui_petri_net_editor.md` §5.3 | OK | |
| 4-2-11 | ワークフロー取込モードを有効にしてMAIMLファイルを選択するとサブネットが追加されること | 正常系 | `ui_editor_toolbar.md` §5.3、`ui_workflow_selector_dialog.md` §5.5 | OK | |
| 4-2-12 | Documentボタンからドキュメント情報（名前・日付・Creator等）を編集して保存できること | 正常系 | `ui_editor_toolbar.md` §5.4、`ui_document_edit_dialog.md` §3.1.8 | OK | |
| 4-2-13 | バリデーションボタンをクリックするとバリデーション結果パネルが表示されること | 正常系 | `ui_editor_toolbar.md` §5.4、`ui_validation_panel.md` §5.1 | OK | |
| 4-2-14 | バリデーションエラーがある場合にエラー箇所が強調表示されること | 正常系 | `ui_petri_net_editor.md` §5.8、`ui_validation_panel.md` §5.3 | OK | |
| 4-2-15 | 保存ダイアログからS3への保存ができること | 正常系 | `ui_save_confirm_dialog.md` §5.4、`ui_petri_net_editor_screen.md` §3.1.2 | OK | |
| 4-2-16 | Draftボタンから下書き管理ダイアログが開き、現在の編集内容を下書き保存できること | 正常系 | `ui_draft_manager.md` §3.1.2、`ui_editor_toolbar.md` §5.4 | OK | |
| 4-2-17 | 自動保存をONにすると一定時間ごとに下書きが自動保存されること | 正常系 | `ui_draft_manager.md` §3.1.5、`ui_editor_toolbar.md` §5.5 | OK | |
| 4-2-18 | ValidationPanelでエラー一覧の各行にチェックボックスが表示されること | 表示確認 | `ui_validation_panel.md` §5.3、自動補正機能 | OK | |
| 4-2-19 | ValidationPanelでエラーを1件以上選択すると「自動補正」ボタンが活性化されること | 表示確認 | `ui_validation_panel.md` §自動補正ボタン | OK | |
| 4-2-20 | エラー未選択の状態で「自動補正」ボタンをクリックすると警告メッセージが表示されること | 異常系 | `ValidationPanel.tsx` handleApplyCorrections | OK | |
| 4-2-21 | version属性が欠落したMAIMLに対して自動補正を実行すると `version="1.0"` が追加されること | 正常系 | `maimlParser.ts` generateAutoCorrections / MISSING_REQUIRED | OK | |
| 4-2-22 | 名前空間が欠落したMAIMLに対して自動補正を実行すると正しい xmlns が追加されること | 正常系 | `maimlParser.ts` generateAutoCorrections / NAMESPACE_ERROR | OK | |
| 4-2-23 | 未定義の参照（reference_error）を含むMAIMLに対して自動補正を実行すると無効な ref 属性が削除されること | 正常系 | `maimlParser.ts` generateAutoCorrections / REFERENCE_ERROR | OK | |
| 4-2-24 | 保存ダイアログの「自動補正して保存」ボタンをクリックすると補正処理が実行された後に保存されること | 正常系 | `SaveConfirmDialog` auto-correct アクション | OK | |
| 4-2-25 | 重複IDエラー・シンタックスエラーは自動補正の対象外であり、補正後もエラーが残ること | 異常系 | `maimlService.ts` autoCorrectMaiml 制限事項 | OK | |
| 4-2-26 | 自動補正適用後に再バリデーションが自動実行され、ValidationPanelの結果が更新されること | 正常系 | `PetriNetEditorInner.tsx` handleAutoCorrect → handleRevalidate | OK | |
| 4-2-27 | ビューモードを「XMLビュー」に切り替えるとXMLビューパネルが表示されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase3、`EditorToolbar.tsx` viewMode='xml' | - | |
| 4-2-28 | XMLビューにMAIML XMLがシンタックスハイライト付きで表示されること | 表示確認 | `docs/改善仕様調査/No.3/PLAN.md` Phase1、`XMLViewer.tsx` | - | ローディングスピナー（Ant Design Spin）表示後にXMLが描画されること |
| 4-2-29 | ペトリネットにノード/エッジを追加後にXMLビューへ切り替えると追加内容がXMLに反映されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase2、`XMLViewerWrapper.tsx` convertReactFlowToMaiML | - | リアルタイム変換の確認 |
| 4-2-30 | 複数メソッドモードで各メソッドのXMLが正しく出力されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase2、`XMLViewerWrapper.tsx` convertMultipleMethodsToMaiML | - | メソッドタブを2件以上追加した状態で確認 |
| 4-2-31 | XMLビューの「コピー」ボタンをクリックするとXML文字列がクリップボードにコピーされること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase5、`XMLViewer.tsx` コピーボタン | - | ブラウザのクリップボードに内容がセットされることを確認 |
| 4-2-32 | XMLビューの「ダウンロード」ボタンをクリックすると `.xml` ファイルがダウンロードされること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase5、`XMLViewer.tsx` ダウンロードボタン | - | ダウンロードされたファイルの内容がXMLとして有効であること |
| 4-2-33 | XMLビューからペトリネットビューに戻るとビューポート（位置・ズーム）が保持されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase3、`PetriNetEditorInner.tsx` handleViewModeChange | - | ビューポート保存ロジックが `'xml'` モード遷移時にも動作すること |
| 4-2-34 | ペトリネット/テンプレート/XMLビューの3モード間で相互に切り替えられること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase3、`EditorToolbar.tsx` Segmented | - | 各モードへの往復切り替えでUIが正常に表示されること |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトにMAIMLファイルが登録済みである
- プロジェクトがチェックアウト済みである（編集ロックを取得済み）
- プロジェクト管理タブでプロジェクトを選択後、「編集」ボタンから実験フロー編集画面（PetriNetEditor）を開いていること
- ワークフロー取込（4-2-11）用: S3上にワークフロー取込対象のMAIMLファイルが存在すること
- ワークフロー取込（4-2-11）用: 取込元ファイルは `WorkflowSelectorDialog` で選択可能な状態であること
- XMLビュー（4-2-27〜4-2-34）用: ペトリネットにノード/エッジが少なくとも1件以上存在すること

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
| 4-3-1 | プロジェクトをチェックアウトできること（`checked_in` ステータス） | 正常系 | 要件書#4 | POST `/api/v1/projects/:projectName/checkout` | OK | |
| 4-3-2 | チェックアウト中のプロジェクトをチェックインできること | 正常系 | 要件書#5 | POST `/api/v1/projects/:projectName/checkin` | OK | |
| 4-3-3 | チェックアウト中のプロジェクトには「チェックアウト中」タグが表示されること | 表示確認 | `ui_project_management.md` §2.2.3 | GET `/api/v1/projects` | OK | |
| 4-3-4 | `in_progress` ステータスのプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` | OK | |
| 4-3-5 | `checkout_status` が `checked_out`（チェックアウト中）のプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` | OK | |
| 4-3-6 | `completed` ステータスのプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト可能ステータス） | POST `/api/v1/projects/:projectName/checkout` | OK | |
| 4-3-7 | 実行中のタスクがある場合はチェックインできないこと | 異常系 | ビジネスルール（チェックイン不可条件） | POST `/api/v1/projects/:projectName/checkin` | OK | |
| 4-3-9 | MAIMLファイルが未登録のプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト前提条件） | POST `/api/v1/projects/:projectName/checkout` | OK | |
| 4-3-10 | タスクが未登録のプロジェクトはチェックアウトできないこと | 異常系 | ビジネスルール（チェックアウト前提条件） | POST `/api/v1/projects/:projectName/checkout` | OK | |

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

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-4-1 | タスク登録タブで試行回数を設定して保存できること | 正常系 | 要件書#3 | POST `/api/v1/projects/:projectName/task-registration` | OK | |
| 4-4-2 | タスク登録タブで実験条件を変更して保存できること | 正常系 | 要件書#3 | POST `/api/v1/projects/:projectName/task-registration` | OK | |
| 4-4-3 | ドラッグ＆ドロップでタスクの実行順序を変更して保存できること | 正常系 | 追加機能K | POST `/api/v1/projects/:projectName/task-registration` | OK | |
| 4-4-4 | ワーカー連携済みタスク（`workerLinkedFlg=true`）は試行回数・実験条件の編集ができないこと | 表示確認 | 追加機能N、`ui_task_registration_tab.md` §ビジネスルール | - | OK | |
| 4-4-5 | ワーカー連携済みタスクはドラッグ＆ドロップによる順序変更ができないこと | 表示確認 | 追加機能N、`ui_task_registration_tab.md` §ビジネスルール | - | OK | |
| 4-4-6 | 各タスクの「指示追加」ボタンをクリックすると指示編集ダイアログ（InstructionEditDialog）が表示されること | 正常系 | 追加機能O、`ui_instruction_edit_dialog.md` §概要 | - | OK | |
| 4-4-7 | タスク登録タブから追加した指示が指示登録タブの未送信指示一覧に反映されること | 正常系 | 追加機能O、`ui_instruction_edit_dialog.md` §saveMode | GET `/api/v1/projects/:projectName/instructions/status` | OK | |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクトにMAIMLファイルが登録済みである（`isMaimlRegistered: true`）
- プロジェクトがチェックアウト中でない（`isCheckoutLocked: false`）
- 4-4-4〜4-4-5: `workerLinkedFlg=true` のタスクを含むプロジェクトが1件存在すること
- 4-4-6〜4-4-7: プロジェクトにタスクが1件以上登録されていること

**ビジネスルール（設計書より）:**
- MAIMLが未登録の場合は保存ボタンが無効化される
- チェックアウト中の場合は保存ボタンが無効化される
- 試行回数は1〜999の整数のみ有効
- `workerLinkedFlg=true`（ワーカー連携済み）のタスクは試行回数・実験条件の編集および順序変更不可

---

### 4-5: 指示登録・送信

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-5-1 | 指示を追加して一括送信できること | 正常系 | 要件書#6 | POST `/api/v1/projects/:projectName/instructions/send` | OK | |
| 4-5-2 | 未送信の指示を編集できること | 正常系 | 追加機能G | PUT `/api/v1/projects/:projectName/instructions/:instructionId` | OK | |
| 4-5-3 | 未送信の指示を削除できること | 正常系 | 追加機能H | DELETE `/api/v1/projects/:projectName/instructions/:instructionId` | OK | |
| 4-5-4 | 送信済みの指示は削除ボタンが非表示であること | 表示確認 | `ui_instruction_registration_tab.md` §3.3.3 | - | OK | |
| 4-5-5 | 指示が0件の場合に一括送信ボタンが無効化されること | 表示確認 | `ui_instruction_registration_tab.md` §3.3.4 | - | OK | |
| 4-5-6 | 指示登録状況（未送信件数/送信済み件数/合計）が表示されること | 表示確認 | 追加機能I | GET `/api/v1/projects/:projectName/instructions/status` | OK | |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する
- プロジェクト管理タブ > 「タスク登録」タブが表示されている

**ビジネスルール（設計書より）:**
- 送信済みの指示は編集・削除不可（読み取り専用になる）
- 指示が0件の場合は一括送信ボタンが無効化される
- 送信と同時に `project_instruction` レコードが生成される

---

### 4-6: 進捗確認・タスク結果

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-6-1 | 進捗確認タブでプロジェクト一覧が表示されること | 正常系 | 要件書#7 | GET `/api/v1/projects` | OK | |
| 4-6-2-1 | 詳細ボタン（EyeアイコンつきPrimary Ghostボタン）をクリックすると「プロジェクト進捗詳細」モーダルが表示されること | 正常系 | 追加機能J、`ui_progress_monitoring.md` §2.2.5、`ui_work_progress_detail_dialog.md` §2.2.1 | - | OK | |
| 4-6-2-2 | 詳細ダイアログにプロジェクト情報（プロジェクト名・ステータスTag・プロジェクトID・説明・オーナー・部門・更新日時）が表示されること | 表示確認 | `ui_work_progress_detail_dialog.md` §2.2.3 | - | OK | |
| 4-6-2-3 | プロジェクトに複数メソッドがある場合はメソッドフィルタが表示され、単一メソッドの場合は表示されないこと | 表示確認 | `ui_work_progress_detail_dialog.md` §2.2.4、§3.1.3 | - | OK | |
| 4-6-2-4 | タスクタブを切り替えると各タスクの詳細（タスク名・タスクID・ステータス・メソッド名）とトランジションサマリー（全体・完了・作業中・未着手・完了率）が切り替わること | 正常系 | `ui_work_progress_detail_dialog.md` §2.2.5、§2.2.6、§2.2.7、§3.1.4 | - | OK | |
| 4-6-2-5 | 詳細ダイアログにトランジション詳細一覧（トランジション名・進捗ステータスTag・作業者・開始日・終了日）が表示されること | 表示確認 | `ui_work_progress_detail_dialog.md` §2.2.9 | - | OK | |
| 4-6-2-6 | 詳細ダイアログの「再読み込み」ボタンをクリックするとデータが再取得されること | 正常系 | `ui_work_progress_detail_dialog.md` §2.2.2、§3.1.7 | - | OK | |
| 4-6-2-7 | 詳細ダイアログの「閉じる」ボタンをクリックするとモーダルが閉じること | 正常系 | `ui_work_progress_detail_dialog.md` §2.2.2、§3.1.8 | - | OK | |
| 4-6-3 | タスク結果タブでタスク統計（件数）が表示されること | 表示確認 | 要件書#15、追加機能E | GET `/api/v1/projects/:projectName/tasks` | OK | |
| 4-6-4 | レビュー待ちタスクを一括完了できること | 正常系 | 追加機能F | POST `/api/v1/projects/:projectName/tasks/complete-review` | OK | |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在する（タスクデータを含む）
- 詳細ダイアログ確認シナリオ（4-6-2-1〜4-6-2-7）用: テスト用プロジェクトに `project_task` テーブルのレコードが少なくとも1件存在すること
- 詳細ダイアログ確認シナリオ（4-6-2-1〜4-6-2-7）用: 各タスクに紐づくトランジション進捗データが少なくとも1件存在すること
- メソッドフィルタ確認シナリオ（4-6-2-3）用: 複数メソッド（2件以上）を持つプロジェクトが少なくとも1件存在すること

**統計カラー定義（設計書より）:**
- 実行待ち（pending）: セカンダリー
- 実行中（in_progress）: プライマリー青
- 異常終了（error）: 赤
- レビュー待ち（review_waiting）: 警告黄
- 完了（completed）: 成功緑

---

### 4-7: プロジェクトフィルタ・検索

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-7-1 | プロジェクトステータスでフィルタリングできること | 正常系 | 追加機能A | GET `/api/v1/projects` | OK | |
| 4-7-2 | チェックアウト状態でフィルタリングできること | 正常系 | 追加機能A | GET `/api/v1/projects` | OK | |
| 4-7-3 | キーワード検索でプロジェクトを絞り込みできること | 正常系 | 追加機能B | GET `/api/v1/projects` | OK | |

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
| 4-8-1 | フォーマット一覧が表示されること | 正常系 | 要件書#13 | GET `/api/v1/formats` | OK | |
| 4-8-2 | フォーマット（ワークフローベース）を新規登録できること | 正常系 | 要件書#13 | POST `/api/v1/formats` | OK | |
| 4-8-3 | 登録済みフォーマットを削除できること | 正常系 | 要件書#13 | DELETE `/api/v1/formats/:formatId` | OK | |
| 4-8-4 | 「詳細検索」ボタンをクリックすると詳細検索モーダルが開くこと | 表示確認 | `ui_format_search_modal.md` §3.1.1 | - | OK | |
| 4-8-5 | 検索条件を「条件追加」ボタンで5件まで追加できること | 表示確認 | `ui_format_search_modal.md` §3.1.2 | - | OK | |
| 4-8-6 | 「リセット」ボタンをクリックすると検索条件と結果がクリアされ初期状態（条件1件）に戻ること | 正常系 | `ui_format_search_modal.md` §3.1.2 | - | OK | |
| 4-8-7 | 有効な検索条件が0件の状態で検索を実行するとエラーメッセージが表示されること | 異常系 | `ui_format_search_modal.md` §3.3 | - | OK | |
| 4-8-8 | フォーマット未選択時に「新規フォルダ」ボタンをクリックすると警告メッセージが表示されること | 異常系 | `ui_format_management.md` §3.2 | - | OK | |
| 4-8-9 | フォーマット選択後に「新規フォルダ」ボタンをクリックすると新規フォルダ作成モーダルが開くこと | 表示確認 | `ui_create_format_folder_modal.md` §3.1.1 | - | OK | |
| 4-8-10 | フォルダ名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_folder_modal.md` §3.3 | - | OK | |
| 4-8-11 | フォルダ名に使用不可文字（日本語・スペース等）を含む場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_folder_modal.md` §3.3 | - | OK | |
| 4-8-12 | 「キャンセル」ボタンをクリックするとモーダルが閉じてフォルダが作成されないこと | 正常系 | `ui_create_format_folder_modal.md` §3.1.4 | - | OK | |
| 4-8-13 | フォーマット未選択時に「新規ファイル」ボタンをクリックすると警告メッセージが表示されること | 異常系 | `ui_format_management.md` §3.2 / §6.3 | - | OK | |
| 4-8-14 | フォーマット選択後に「新規ファイル」ボタンをクリックすると新規ファイル作成モーダルが開くこと | 表示確認 | `ui_create_format_file_modal.md` §3.1.1 | - | OK | |
| 4-8-15 | XMLタイプのフォーマット選択時はテンプレートタイプ選択（Material/Condition/Result）が表示されること | 表示確認 | `ui_create_format_file_modal.md` §3.1.1 / §3.1.3 | - | OK | |
| 4-8-16 | MAIMLタイプのフォーマット選択時はテンプレートタイプ選択が表示されないこと | 表示確認 | `ui_create_format_file_modal.md` §3.1.1 / §3.1.3 | - | OK | |
| 4-8-17 | ファイル名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_file_modal.md` §3.3 | - | OK | |
| 4-8-18 | ファイル名が100文字超の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_file_modal.md` §3.3 | - | OK | |
| 4-8-19 | XMLファイル作成時にテンプレートタイプが未選択の場合にバリデーションエラーが表示されること | 異常系 | `ui_create_format_file_modal.md` §3.3 | - | OK | |
| 4-8-20 | 「キャンセル」ボタンをクリックするとモーダルが閉じてファイルが作成されないこと | 正常系 | `ui_create_format_file_modal.md` §3.1.6 | - | OK | |
| 4-8-21 | フォーマット未選択時に「アップロード」ボタンをクリックすると警告メッセージが表示されること | 異常系 | `ui_format_management.md` §3.2 / §6.3 | - | OK | |
| 4-8-22 | フォーマット選択後に「アップロード」ボタンをクリックするとアップロードダイアログが開くこと | 表示確認 | `ui_format_upload_dialog.md` §3.1.1 | - | OK | |
| 4-8-23 | 単一ファイルモードでファイルを1件選択してアップロードできること | 正常系 | `ui_format_upload_dialog.md` §3.1.3 / §3.1.8 | POST `/api/v1/formats/upload` | OK | |
| 4-8-24 | 一括ファイルモードで複数ファイルを選択してアップロードできること | 正常系 | `ui_format_upload_dialog.md` §3.1.3 / §3.1.8 | POST `/api/v1/formats/upload` | OK | |
| 4-8-25 | フォルダモードでフォルダを選択してアップロードできること | 正常系 | `ui_format_upload_dialog.md` §3.1.4 / §3.1.8 | POST `/api/v1/formats/upload` | OK | |
| 4-8-26 | モード切り替え時に選択済みファイルリストがクリアされること | 表示確認 | `ui_format_upload_dialog.md` §3.1.2 | - | OK | |
| 4-8-27 | 単一ファイルモードで複数ファイルを選択すると最後の1ファイルのみが選択状態になること | 表示確認 | `ui_format_upload_dialog.md` §3.1.3 | - | OK | |
| 4-8-28 | ファイルを選択せずにアップロードボタンを押すと警告メッセージが表示されること | 異常系 | `ui_format_upload_dialog.md` §3.3 / §6.1 | - | OK | |
| 4-8-29 | アップロード中にファイル完了件数とパーセントが進捗表示されること | 表示確認 | `ui_format_upload_dialog.md` §2.2.7 / §3.1.8 | - | OK | |
| 4-8-30 | アップロード完了後に成功メッセージが表示されること | 表示確認 | `ui_format_upload_dialog.md` §2.2.7 | - | OK | |
| 4-8-31 | アップロード中にダイアログを閉じようとすると確認ダイアログが表示されること | 異常系 | `ui_format_upload_dialog.md` §3.1.10 / §6.2 | - | OK | |
| 4-8-32 | MAIMLファイル（.maiml）の「編集」ボタンをクリックするとPetriNetEditorがフルスクリーンで開くこと | 正常系 | `ui_format_management.md` §3.1.7、`ui_format_file_list_table.md` §3.1.4 | POST `/api/worker/load-maiml-file` | OK | |
| 4-8-33 | XMLファイル（.xml）の「編集」ボタンをクリックするとTemplateEditorDialogがモーダルで開くこと | 正常系 | `ui_format_management.md` §3.1.7、`ui_format_file_list_table.md` §3.1.4 | - | OK | |
| 4-8-34 | MAIMLファイルの編集後に保存するとS3ファイルが更新されること | 正常系 | `ui_format_management.md` §3.1.7 | PUT `/api/v1/formats/:formatId/files/:fileId` | OK | |
| 4-8-35 | .maimlでも.xmlでもないファイルの「編集」ボタンをクリックするとエラーメッセージが表示されること | 異常系 | `ui_format_management.md` §6.3 | - | OK | |
| 4-8-36 | ファイルの「ダウンロード」ボタンをクリックするとファイルがダウンロードされること | 正常系 | `ui_format_file_list_table.md` §3.1.5 | POST `/api/v1/files/download` | OK | |
| 4-8-37 | ファイルダウンロードに失敗した場合にエラーメッセージが表示されること | 異常系 | `ui_format_management.md` §6.2 | POST `/api/v1/files/download` | OK | |
| 4-8-38 | ファイルの「削除」ボタンをクリックすると削除確認ダイアログが表示されること | 表示確認 | `ui_format_file_list_table.md` §3.1.6、`ui_format_management.md` §3.2 | - | OK | |
| 4-8-39 | 削除確認ダイアログで確認するとファイルが削除されてファイル一覧から消えること | 正常系 | `ui_format_management.md` §3.2 / §6.4 | DELETE `/api/v1/formats/:formatId/files/:fileId` | OK | |
| 4-8-40 | 削除確認ダイアログでキャンセルするとファイルが削除されないこと | 正常系 | `ui_format_file_list_table.md` §3.1.6 | - | OK | |
| 4-8-41 | TemplateEditorDialogを開くと「UI編集」「XMLビュー」の2タブが表示されること | 表示確認 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`TemplateEditorDialog.tsx` Tabs | - | |
| 4-8-42 | 「UI編集」タブが初期表示されること | 表示確認 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`activeTab='ui'` 初期値 | - | |
| 4-8-43 | 「XMLビュー」タブをクリックするとテンプレートのXML文字列がTextAreaに表示されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`convertTemplateToXML` | - | UI → XML 切り替え時に `convertTemplateToXML` が呼ばれること |
| 4-8-44 | XMLビューでXMLを直接編集して「UI編集」タブに戻るとUI Stateに変更が反映されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`parseXMLToTemplate` | - | XML → UI 切り替え時に `parseXMLToTemplate` が呼ばれること |
| 4-8-45 | XMLビューで不正なXML（構文エラー）を入力してバリデーションを実行するとエラーメッセージが表示されること | 異常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`validateTemplateXML` | - | バリデーションボタン押下時にエラーAlertが表示されること |
| 4-8-46 | XMLビューで有効なXMLを入力してバリデーションを実行するとエラーメッセージが表示されないこと | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`validateTemplateXML` | - | エラーAlertが表示されないこと |
| 4-8-47 | XMLビューから保存するとXMLがパースされてテンプレートデータが正しく保存されること | 正常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`handleSave` | - | `validateTemplateXML` → `parseXMLToTemplate` → 保存の順で処理されること |
| 4-8-48 | XMLビューでエラーがある状態で保存しようとするとエラーメッセージが表示されること | 異常系 | `docs/改善仕様調査/No.3/PLAN.md` Phase7、`handleSave` バリデーション | - | 不正なXMLのまま保存ボタンを押すとエラーが表示されること |

**前提条件:**
- 実験管理者ロールでログイン済み
- フォーマット管理画面が表示されている
- フォーマット選択が必要なシナリオ（4-8-5〜4-8-7、4-8-9〜4-8-20、4-8-22〜4-8-40）: フォーマット一覧にテスト用フォーマットが1件以上存在すること
  - XMLタイプのフォーマットが1件以上存在すること（4-8-15、4-8-19）
  - MAIMLタイプのフォーマットが1件以上存在すること（4-8-16）
- ファイル操作シナリオ（4-8-32〜4-8-40）: 選択中のフォーマット内にテスト用ファイルが存在すること
  - MAIMLファイル（.maiml）が1件以上存在すること（4-8-32、4-8-34）
  - XMLファイル（.xml）が1件以上存在すること（4-8-33）
  - その他の拡張子ファイルが1件以上存在すること（4-8-35）
  - 削除確認シナリオ（4-8-38〜4-8-40）用: 削除してよいテスト用ファイルが1件以上存在すること

**注意事項:**
- 4-8-4〜4-8-7（詳細検索）: 検索実行APIは🔴未実装のため、検索結果の表示確認は対象外。UI操作（モーダル開閉・条件追加・リセット・バリデーション）のみを確認する
- 4-8-8〜4-8-12（新規フォルダ作成）: フォルダ作成APIは🔴未実装のため、作成完了の確認はフロントエンドのバリデーション・モーダル動作の範囲に限定する
- 4-8-13〜4-8-20（新規XMLファイル作成）: ファイル作成APIは🔴未実装のため、バリデーション・モーダル動作のみを確認する。作成完了の確認は実装後に追加する
- 4-8-23〜4-8-31（アップロード）: `POST /api/v1/formats/upload` は🔴未実装のため、現在はモック処理のみ確認。進捗表示・完了メッセージはフロントエンドのモック動作を確認する
- 4-8-25（フォルダモード）: ブラウザの `webkitdirectory` 属性を使用するため、Playwrightでの自動化が困難。手動テストを検討する
- 4-8-32〜4-8-33（編集・エディタ起動）: PetriNetEditor（MAIML）またはTemplateEditorDialog（XML）が起動することのみを確認する。エディタ操作の詳細テストは 4-2（MAIML）または別途XMLエディタテストで実施する
- 4-8-34（編集保存）: `PUT /api/v1/formats/:formatId/files/:fileId` は🔴未実装のため、API実装後に確認する
- 4-8-36〜4-8-37（ダウンロード）: `POST /api/v1/files/download` は🔴未実装のため、API実装後に確認する。現在はコンソールログ出力のみ
- 4-8-39（削除）: ファイル削除APIは🔴未実装のため、削除確認ダイアログの表示・UIの動作のみ確認する。削除完了の確認は実装後に追加する

**後処理:**
- 登録したフォーマットを削除（4-8-2）
- アップロードしたファイルをS3から削除（4-8-23〜4-8-25、API実装後）
- 削除したテスト用ファイルをS3から復元（4-8-39、API実装後）

---

### 4-9: トランジション検索

> **テスト方法**: Playwright自動（4-9-1〜4-9-9）+ 手動（4-9-10：意味的類似検索は検索精度の目視確認が必要なため）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 4-9-1 | 進捗確認画面にトランジション検索タブが表示されること | 表示確認 | 追加機能R、`ui_progress_monitoring.md` §タブ構成 | - | OK | |
| 4-9-2 | プロジェクト名でトランジションを検索できること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-3 | トランジション名でトランジションを検索できること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-4 | ステータス（完了/作業中/未着手）でトランジションをフィルタリングできること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-5 | 検索結果一覧にトランジション情報（トランジション名・プロジェクト名・タスク名・ステータス・作業者・開始日・終了日）が表示されること | 表示確認 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-6 | 検索結果が0件の場合に「該当するトランジションが見つかりません」等のメッセージが表示されること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-7 | 検索条件を変更して再検索すると結果が更新されること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-8 | 検索条件をリセットすると全件が表示されること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-9 | 検索結果の行をクリックするとプロジェクト進捗詳細ダイアログが開き、該当トランジションが強調表示されること | 正常系 | 追加機能R | GET `/api/v1/transition-search` | OK | |
| 4-9-10 | 意味的類似検索（ベクトル検索）でテキスト内容が類似するトランジションが返されること | 正常系（手動） | 追加機能R（セマンティック検索） | GET `/api/v1/transition-search?semantic=true` | OK | |

**前提条件:**
- 実験管理者ロールでログイン済み
- 進捗確認画面のトランジション検索タブが表示されている
- 検索対象となるトランジションデータが `transition_set` テーブルに1件以上存在すること
- 各ステータス（完了/作業中/未着手）のトランジションが少なくとも1件ずつ存在すること
- 4-9-10（セマンティック検索）用: Ollamaエンベディングサービスが起動していること

**注意事項:**
- 4-9-10（意味的類似検索）: 検索精度は使用するエンベディングモデルに依存するため、結果の目視確認が必要。自動化は境界値テストにのみ適用

---

### 4-10: プロジェクト公開

> **テスト方法**: Playwright自動（フロントエンド実装後に実施。現在フロントエンド未実装のため保留）

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|--------| --- | --- |
| 4-10-1 | ファイル操作ツールバーの「公開する」ボタンをクリックするとMaimlPublishDialogが表示されること | 正常系 | 追加機能S、`ui_maiml_publish_dialog.md` | - | OK | |
| 4-10-2 | MaimlPublishDialogで「公開する」ボタンをクリックすると公開ジョブが受け付けられ、ポーリング完了後にボタンが「非公開にする」に切り替わること | 正常系 | 追加機能S、`ui_maiml_publish_dialog.md`、`api_maiml_opendata.md` | POST `/api/v1/projects/:projectName/publish`、GET `/api/v1/projects/:projectName/publish-status` | OK | |
| 4-10-3 | 公開済みファイルのボタンが「非公開にする」（赤・活性）に切り替わること | 表示確認 | 追加機能S、`ui_maiml_publish_dialog.md` | GET `/api/v1/projects/:projectName/publish-status` | OK | |
| 4-10-4 | 公開済みファイルの「非公開にする」ボタンをクリックするとMaimlUnpublishDialogが表示され、確認後に非公開ジョブが受け付けられ、ポーリング完了後にボタンが「公開する」に戻ること | 正常系 | 追加機能S、`ui_maiml_unpublish_dialog.md`、`api_maiml_opendata.md` | POST `/api/v1/projects/:projectName/unpublish`、GET `/api/v1/projects/:projectName/publish-status` | OK | |
| 4-10-5 | 公開/非公開ジョブ処理中（status=pending/running）はボタンがローディング状態になること | 表示確認 | `api_maiml_opendata.md` §5.7、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | OK | |
| 4-10-6 | 公開条件を満たしていない場合にMaimlPublishDialogにエラーメッセージが表示されること | 異常系 | `api_maiml_opendata.md` §3.4、`ui_maiml_publish_dialog.md` §4 | POST `/api/v1/projects/:projectName/publish` | OK | |
| 4-10-7 | 公開ジョブがエラー終了した場合（status=error）にエラーメッセージが表示されること | 異常系 | `api_maiml_opendata.md` §5.6、`ui_maiml_publish_dialog.md` §3.1 | GET `/api/v1/projects/:projectName/publish-status` | OK | |
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
| 4-11-1 | 単一ファイルモードでファイルをアップロードできること | 正常系 | 追加機能L | POST `/api/v1/files/upload` | OK | |
| 4-11-2 | 一括ファイルモードで複数ファイルを同時にアップロードできること | 正常系 | 追加機能L | POST `/api/v1/files/upload` | OK | |
| 4-11-3 | フォルダモードでフォルダをアップロードできること | 正常系 | 追加機能L | POST `/api/v1/files/upload` | OK | |
| 4-11-4 | フォルダ構造を保持するオプションが有効な場合にフォルダ階層を維持してアップロードできること | 正常系 | `ui_bulk_upload_dialog.md` §3.5 | POST `/api/v1/files/upload` | OK | |
| 4-11-5 | アップロード中にファイル完了件数とパーセントが進捗表示されること | 表示確認 | `ui_bulk_upload_dialog.md` §3.6.2 | - | OK | |
| 4-11-6 | アップロード完了後に成功メッセージが表示されること | 表示確認 | `ui_bulk_upload_dialog.md` §3.6.2 | - | OK | |
| 4-11-7 | ファイルを選択せずにアップロードボタンを押すと警告メッセージが表示されること | 異常系 | `ui_bulk_upload_dialog.md` §7.2 | - | OK | |
| 4-11-8 | アップロード中にダイアログを閉じようとすると確認ダイアログが表示されること | 異常系 | `ui_bulk_upload_dialog.md` §3.7 | - | OK | |
| 4-11-9 | 単一ファイルモードで複数ファイルを選択すると最後の1ファイルのみが選択状態になること | 表示確認 | `ui_bulk_upload_dialog.md` §3.2.3 | - | OK | |
| 4-11-10 | モード切り替え時に選択済みファイルリストがクリアされること | 表示確認 | `ui_bulk_upload_dialog.md` §3.1.2 | - | OK | |

**前提条件:**
- 実験管理者ロールでログイン済み
- テスト用プロジェクトがDB・S3に存在し、プロジェクト管理タブで選択済みである
- プロジェクト管理画面のツールバーに「アップロード」ボタンが表示されている

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
| 4-12-1 | 問題管理モーダルで問題一覧が表示されること（タイトル・内容による検索、ステータスフィルター） | 正常系 | `ui_issue_management_modal.md` §5、§6 | GET `/api/v1/issues` | OK | |
| 4-12-2 | 新規問題をプロジェクト単位で登録できること | 正常系 | `ui_issue_management_modal.md` §8、`api_issue_management.md` §1 | POST `/api/v1/issues` | OK | |
| 4-12-3 | 新規問題をトランジション単位で登録できること | 正常系 | `ui_issue_management_modal.md` §8、`api_issue_management.md` §1 | POST `/api/v1/issues` | OK | |
| 4-12-4 | 新規問題登録時にタイトルまたは内容が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_issue_management_modal.md` §8.2 | - | OK | |
| 4-12-5 | 既存問題を選択してコメントを追加できること | 正常系 | `ui_issue_management_modal.md` §7、`api_issue_management.md` §2 | POST `/api/v1/issues/comments` | OK | |
| 4-12-6 | コメントが未入力の場合に「コメント送信」「解決」「未解決」ボタンが非活性であること | 表示確認 | `ui_issue_management_modal.md` §7.2 | - | OK | |
| 4-12-7 | 未解決の問題を「解決済」に変更できること（コメントと同時送信） | 正常系 | `ui_issue_management_modal.md` §7.2、`api_issue_management.md` §5 | POST `/api/v1/issues/comments`、PATCH `/api/v1/issues/status` | OK | |
| 4-12-8 | 解決済の問題を「未解決」に戻せること（コメントと同時送信） | 正常系 | `ui_issue_management_modal.md` §7.2、`api_issue_management.md` §5 | POST `/api/v1/issues/comments`、PATCH `/api/v1/issues/status` | OK | |

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
| POST `/api/v1/formats/:formatId/folders` | 🔴 未実装 | 4-8-8〜4-8-12（新規フォルダ作成）はバリデーション・モーダル動作のみ確認 |
| POST `/api/v1/formats/:formatId/files` | 🔴 未実装 | 4-8-13〜4-8-20（新規ファイル作成）はバリデーション・モーダル動作のみ確認。作成完了の確認は実装後に追加 |
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
| 実験管理者メニュー設計 | `docs/design/ui/experiment_admin/00_menu/ExperimentAdminMenu.md` |

### 7.3 プロジェクト管理

| ドキュメント | パス |
|------------|------|
| プロジェクト管理画面設計 | `docs/design/ui/experiment_admin/01_project_management/ProjectManagement.md` |
| プロジェクトフォルダツリー設計 | `docs/design/ui/experiment_admin/01_project_management/ProjectFolderTree.md` |
| ファイル一覧テーブル設計 | `docs/design/ui/experiment_admin/01_project_management/FileListTable.md` |
| プロジェクト作成モーダル設計 | `docs/design/ui/experiment_admin/01_project_management/CreateProjectModal.md` |
| プロジェクト詳細モーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ProjectDetailModal.md` |
| プロジェクト検索モーダル設計 | `docs/design/ui/experiment_admin/01_project_management/ProjectSearchModal.md` |
| 一括アップロードダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/BulkUploadDialog.md` |
| チェックアウト状態ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/CheckoutStatusDialog.md` |

### 7.4 フォーマット管理

| ドキュメント | パス |
|------------|------|
| フォーマット管理画面設計 | `docs/design/ui/experiment_admin/02_format_management/FormatManagement.md` |
| フォーマットフォルダツリー設計 | `docs/design/ui/experiment_admin/02_format_management/FormatFolderTree.md` |
| フォーマットファイル一覧設計 | `docs/design/ui/experiment_admin/02_format_management/FormatFileListTable.md` |
| フォーマットファイル作成モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/CreateFormatFileModal.md` |
| フォーマットフォルダ作成モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/CreateFormatFolderModal.md` |
| フォーマット詳細モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/FormatFileDetailModal.md` |
| フォーマット検索モーダル設計 | `docs/design/ui/experiment_admin/02_format_management/FormatSearchModal.md` |
| フォーマットアップロードダイアログ設計 | `docs/design/ui/experiment_admin/02_format_management/FormatUploadDialog.md` |

### 7.5 進捗確認

| ドキュメント | パス |
|------------|------|
| 進捗確認画面設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/ProgressMonitoring.md` |
| 作業進捗詳細ダイアログ設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/WorkProgressDetailDialog.md` |
| タスク結果テーブル設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/TaskResultsTable.md` |
| 指示確認ダイアログ設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/InstructionDialog.md` |
| Petri Net可視化設計 | `docs/design/ui/experiment_admin/03_progress_monitoring/PetriNetVisualization.md` |

### 7.6 MAIML編集

| ドキュメント | パス |
|------------|------|
| Petri Netエディタ画面設計 | `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetEditorScreen.md` |
| Petri Netエディタコア設計 | `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetEditor.md` |
| エディタツールバー設計 | `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/EditorToolbar.md` |
| プロパティパネル設計 | `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PropertyPanel.md` |
| バリデーションパネル設計 | `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/ValidationPanel.md` |
| メソッドタブパネル設計 | `docs/design/ui/experiment_admin/04_maiml_editor/petri_net/MethodTabPanel.md` |
| ドキュメント編集ダイアログ設計 | `docs/design/ui/experiment_admin/04_maiml_editor/document/DocumentEditDialog.md` |
| テンプレートエディタ設計 | `docs/design/ui/experiment_admin/04_maiml_editor/document/TemplateEditor.md` |
| 下書き管理設計 | `docs/design/ui/experiment_admin/04_maiml_editor/document/DraftManager.md` |

### 7.7 MAIML公開管理

| ドキュメント | パス |
|------------|------|
| MaiML公開管理設計（概要・旧仕様） | `docs/design/ui/experiment_admin/ui_maiml_publish.md` |
| MaiML公開確認ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_publish_dialog.md` |
| MaiML非公開確認ダイアログ設計 | `docs/design/ui/experiment_admin/01_project_management/ui_maiml_unpublish_dialog.md` |
| MaiML OpenData Pipeline API設計 | `docs/design/api/api_maiml_opendata.md` |

### 7.8 API設計書

| ドキュメント | パス |
|------------|------|
| プロジェクト管理API設計 | `docs/design/api/api_project_management.md` |
| ファイルアクセスAPI設計 | `docs/design/api/api_file_access.md` |
| 問題管理API設計 | `docs/design/api/api_issue_management.md` |

### 7.9 その他

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| 問題管理モーダル設計（実験作業者側） | `docs/design/ui/experiment_worker/ui_issue_management_modal.md` |
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
