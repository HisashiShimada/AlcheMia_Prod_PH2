# 分類B シナリオテスト ― 実験計画指示記入機能・実験作業者UI

**作成日**: 2026-08-19
**更新日**: 2026-08-27（設計書 ui_progress_overview_tab.md v3.1.0・ui_work_record_panel.md v3.2.0 対応）
**作成者**: SSV
**対象機能**: 実験計画指示記入機能・実験作業者UI・トランジション状態遷移
**前提資料**:
- UI設計書（管理者側）: `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md`
- UI設計書（管理者側）: `docs/design/ui/experiment_admin/01_project_management/ui_experiment_plan_dialog.md`
- UI設計書（作業者側）: `docs/design/ui/experiment_worker/ui_progress_overview_tab.md`（**v3.1.0** / 最終更新: 2026-08-27）
- UI設計書（作業者側）: `docs/design/ui/experiment_worker/ui_work_record_panel.md`（**v3.2.0** / 最終更新: 2026-08-27）
- ソース: `frontend/src/components/project/TaskRegistrationTab.tsx`
- ソース: `frontend/src/components/project/ExperimentPlanDialog.tsx`
- ソース: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- ソース: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- バックエンド: `backend/src/services/progressService.ts`（`ALLOWED_TRANSITIONS` 定義）
- バックエンド: `backend/src/types/transitionData.ts`（`TransitionStatusEnum` 定義）
- フロントエンド: `frontend/src/constants/codeMaster.ts`（`TransitionStatusCode` 定義）

---

## 目次

- [テスト実施の前提](#テスト実施の前提)
- [B-EI-01：実験計画指示ダイアログの基本操作・指示入力](#b-ei-01実験計画指示ダイアログの基本操作指示入力)
- [B-EI-02：CreatorRef / InstrumentRef / OwnerRef の設定](#b-ei-02creatorrefinstrumentrefownerref-の設定)
- [B-EI-03：プロジェクト指示ダイアログの指示種別入力と指示粒度設定](#b-ei-03プロジェクト指示ダイアログの指示種別入力と指示粒度設定)
- [B-EI-04：一括タブ→タスクNタブへの伝播と個別編集](#b-ei-04一括タブタスクnタブへの伝播と個別編集)
- [B-EI-05：トランジション DnD 並べ替え](#b-ei-05トランジション-dnd-並べ替え)
- [B-EI-06：実験作業者 ─ 進捗確認タブ・フィルタ・前提チェック](#b-ei-06実験作業者--進捗確認タブフィルタ前提チェック)
- [B-EI-07：実験作業者 ─ 実験記録タブ・実績値入力・トランジション完了](#b-ei-07実験作業者--実験記録タブ実績値入力トランジション完了)
- [B-EI-07：実験作業者 ─ 実験記録タブ・実績値入力・トランジション完了](#b-ei-07実験作業者--実験記録タブ実績値入力トランジション完了)
- [B-EI-08：差異表示・確信度ボタン・定量評価入力](#b-ei-08差異表示確信度ボタン定量評価入力)
- [トランジション状態遷移](#トランジション状態遷移)
  - [B-TR-01：通常フロー](#b-tr-01通常フロー)
  - [B-TR-02：異常終了](#b-tr-02異常終了)
  - [B-TR-03：一時停止・再開](#b-tr-03一時停止再開)
  - [B-TR-04：作業中切り替え](#b-tr-04作業中切り替え)
  - [B-TR-05：終端状態からの遷移拒否](#b-tr-05終端状態からの遷移拒否)
  - [B-TR-06：不正な遷移拒否](#b-tr-06不正な遷移拒否)
- [B-EI-09：承認ワークフロー（フェーズB予定・現在未実装）](#b-ei-09承認ワークフローフェーズb予定現在未実装)

---

## テスト実施の前提

### 共通前提データ

| 項目 | 値 |
|------|-----|
| テスト環境 | ローカル Docker 環境（`docker-compose.yml`） |
| テストデータ格納場所 | `tests/phase2/fixtures/testdata/` |
| プロジェクト | `proj-test-001`（テスト用プロジェクト） |
| メソッド | `method-A`（タスク2件・トランジション3件設定済み） |

### テストアカウント一覧

| ロール | メールアドレス | 備考 |
|--------|-------------|------|
| experiment_admin | `admin@test.example` | 実験管理者 |
| experiment_worker | `worker@test.example` | 実験作業者（`method-A` の担当者に設定済み） |

### テスト結果記録欄（共通フォーマット）

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | | |

---

## B-EI-01：実験計画指示ダイアログの基本操作・指示入力

### 概要

実験管理者がプロジェクト管理画面の「タスク登録」タブのメソッド行から `ExperimentPlanDialog`（実験計画詳細指示ダイアログ・幅1400px）を開き、左パネルでトランジションを選択し、右パネルのテンプレート入力タブで想定値を入力・保存できることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書（起点） | `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md` |
| UI設計書（ダイアログ） | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_plan_dialog.md` |
| コンポーネント | `TaskRegistrationTab.tsx` / `ExperimentPlanDialog.tsx` / `TemplateInputPanel.tsx` |
| API | `GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` / `PUT /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo` |

### 前提条件

- `experiment_admin` としてログイン済み
- プロジェクト `proj-test-001` の MAIML が登録済みで、`method-A` にトランジション・テンプレートが設定済みであること
- `maimlHasErrors === false`、`isCheckoutLocked === false`、`isProjectCompleted === false` であること

### 操作手順

#### ステップ 1：タスク登録タブから ExperimentPlanDialog を開く

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | プロジェクト管理画面 → `proj-test-001` を選択する | プロジェクト詳細画面が表示される |
| 2 | experiment_admin | 「タスク登録」タブを選択する | `TaskRegistrationTab` が表示される（メソッド行一覧・ツールバー）|
| 3 | — | ツールバーを確認する | 左側に「ドラッグ&ドロップでタスクの順序を変更できます」ヒント、右側に「プロジェクト指示」ボタンと「💾 保存」ボタンが表示されている |
| 4 | — | MAIMLバリデーションエラー警告バナーを確認する | `maimlHasErrors=false` のためバナーは表示されていない |
| 5 | — | `method-A` 行の `+指示` ボタンの状態を確認する（正常時） | ボタンが活性状態になっている |
| 6 | — | `+指示` ボタンの無効化条件を確認する | `isCheckoutLocked=true` / `maimlHasErrors=true` / `isProjectCompleted=true` のいずれかの場合にボタンが `disabled` になること |
| 7 | experiment_admin | `method-A` 行の `+指示` ボタンを押す | `ExperimentPlanDialog`（幅1400px）が開く |

#### ステップ 2：ダイアログ構成の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 6 | — | 左パネルを確認する | トランジション一覧（⠿ ドラッグハンドル付き）が表示されており、選択中の行がハイライトされる |
| 8 | — | 右パネル上部タブを確認する | 「一括」タブと「タスク1」「タスク2」タブが表示されている |
| 9 | — | 右パネル内部タブを確認する | 「基本情報」と「テンプレート入力」タブが表示されている |

#### ステップ 3：テンプレート入力タブで想定値を入力する

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_admin | 左パネルでトランジション `transition-1` を選択する | 右パネルに `transition-1` の内容が表示される |
| 11 | experiment_admin | 内部タブ「テンプレート入力」を選択する | `TemplateInputPanel` が表示される |
| 12 | experiment_admin | `temperature`（FloatValue）のフィールドに `25.0` を入力する | InputNumber に値が入力される |
| 13 | — | 前工程参照（result カテゴリ + inputPlaceIds）のフィールドを確認する | disabled（参照専用）になっており入力できない |
| 14 | experiment_admin | 「保存」ボタンを押す | 全タスク分のデータが `PUT /api/v1/.../experiment-plans/...` で保存される |
| 15 | — | 保存後のダイアログを確認する | ダイアログが閉じる。成功メッセージが表示される |

### 確認ポイント

- [ ] `isCheckoutLocked` / `maimlHasErrors` / `isProjectCompleted` のいずれかが `true` の場合、`+指示` ボタンが `disabled`
- [ ] `experiment_worker` ロールはタスク登録タブ自体にアクセスできない
- [ ] ダイアログオープン時に `getPlanDialogData` と `getExperimentPlans` が呼ばれ、既存データが復元される
- [ ] `result` カテゴリかつ前工程参照フィールドは入力 `disabled`
- [ ] 保存は `taskNumbers` の各タスク分を順に `PUT` で送信する

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-EI-02：CreatorRef / InstrumentRef / OwnerRef の設定

### 概要

実験管理者が `ExperimentPlanDialog` の基本情報タブから、CreatorRef（作成者）・InstrumentRef（装置）・OwnerRef（担当者）をそれぞれセレクトから選択して追加・削除できることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `ExperimentPlanDialog.tsx` / `RefSection.tsx` |
| API | `GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data`（各 Ref 選択肢を取得）|

### 前提条件

- `experiment_admin` としてログイン済み
- タスク登録タブで `method-A` 行の `+指示` ボタンを押し、`ExperimentPlanDialog` が開いた状態であること

### 操作手順

#### ステップ 1：CreatorRef の追加・削除

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 内部タブ「基本情報」を選択する | `RefSection`（CreatorRef / InstrumentRef / OwnerRef）が表示される |
| 2 | experiment_admin | 「CreatorRef」セクションのプルダウンから `creator_001` を選択する | 選択肢に値が表示される |
| 3 | experiment_admin | 「追加」ボタンを押す | `creator_001` がリストに追加される（`[×]` ボタン付き）|
| 4 | experiment_admin | 追加済みの `creator_001` の `[×]` ボタンを押す | リストから `creator_001` が削除される |

#### ステップ 2：InstrumentRef の追加

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_admin | 「InstrumentRef」セクションのプルダウンから装置を選択して「追加」ボタンを押す | 装置がリストに追加される |
| 6 | — | 追加済みリストを確認する | UUID ではなく人間可読な装置名がラベルとして表示されている |

#### ステップ 3：OwnerRef（担当者）の追加

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | experiment_admin | 「OwnerRef」セクションのプルダウンから `worker@test.example` を選択して「追加」ボタンを押す | 担当者がリストに追加される |

#### ステップ 4：一括タブからタスクNへの伝播確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin | 「一括」タブで上記の InstrumentRef・OwnerRef を設定する | — |
| 9 | experiment_admin | 「タスク1」タブに切り替える | 一括タブで設定した InstrumentRef・OwnerRef が同じ値で表示されている（伝播済み）|

### 確認ポイント

- [ ] CreatorRef / InstrumentRef / OwnerRef の各セレクトには API から取得した選択肢が表示される
- [ ] 追加済みアイテムは `[×]` ボタンで削除できる
- [ ] 一括タブで変更した値がタスクNタブに自動伝播される
- [ ] タスクNタブで個別編集しても一括タブには反映されない（一方向伝播）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-EI-03：プロジェクト指示ダイアログの指示種別入力と指示粒度設定

### 概要

実験管理者がタスク登録タブのツールバー「プロジェクト指示」ボタンから `InstructionEditDialog`（幅700px）を開き、指示種別（6種類）・指示対象（メソッド/トランジション/タスクNo）を設定して指示を追加できることを確認する。また「続けて追加」ボタンで連続追加できること、および実験作業者の `WorkRecordPanel` で登録した指示が `InstructionCollapse`（黄色折りたたみ）として表示されることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/01_project_management/ui_instruction_edit_dialog.md` |
| コンポーネント | `TaskRegistrationTab.tsx`（「プロジェクト指示」ボタン）/ `InstructionEditDialog.tsx` / `WorkRecordPanel.tsx`（InstructionCollapse）|
| 型定義 | `frontend/src/types/instructionRegistration.ts`（`INSTRUCTION_KEY` / `INSTRUCTION_KEY_LABELS`）|
| タスク記録 | `tests/phase2/tasks/20260807_1400_プロジェクト指示ダイアログ注意事項移行と粒度追加/PLAN.md` |

### 前提条件

- `experiment_admin` としてログイン済み
- タスク登録タブ（`TaskRegistrationTab`）が表示されていること
- `isCheckoutLocked === false`、`maimlHasErrors === false`、`isProjectCompleted === false` であること

### 操作手順

#### ステップ 1：「プロジェクト指示」ボタンから InstructionEditDialog を開く

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | タスク登録タブ ツールバーの「プロジェクト指示」ボタンを押す | `InstructionEditDialog`（幅700px、タイトル「新規指示の追加」）が開く |
| 2 | — | フォーム構成を確認する | 「指示種別 *」セレクト → 「指示対象（任意）」3セレクト（メソッド/トランジション/タスクNo）→「指示内容 *」TextArea の順で表示されている |
| 3 | — | フッターボタンを確認する | 「キャンセル」「続けて追加」「追加」の3ボタンが表示されている |

#### ステップ 2：指示種別（6種類）の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | 「指示種別」セレクトを開く | 「通常指示 / 安全上の注意事項 / 操作手順上の注記 / 実施前後の確認事項 / 禁止事項 / その他注意事項」の6種別が表示される |
| 5 | experiment_admin | 「安全上の注意事項」（`Alchemia:SupervisorDirectiveCaution`）を選択する | セレクトに「安全上の注意事項」が表示される |
| 6 | experiment_admin | 「指示内容」に「高温注意：200℃以上に達するため接触禁止」を入力する | テキストが入力される（文字数カウンタ表示）|

#### ステップ 3：指示対象と granularity の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | experiment_admin | 指示対象を**すべて未選択**のまま「追加」ボタンを押す | 指示が `granularity=OVERALL`（プロジェクト全体指示）として追加され、ダイアログが閉じる |
| 8 | experiment_admin | 再度「プロジェクト指示」ボタンを押し、「指示種別」を選択し「メソッドを選択」で `method-A` を選択する | 「トランジションを選択」と「タスクNoを選択」が活性化される（メソッド未選択時は `disabled`）|
| 9 | experiment_admin | 「トランジションを選択」で `transition-1` を選択する | トランジション選択肢が `method-A` に紐づくものだけに絞り込まれている |
| 10 | experiment_admin | 「タスクNoを選択」を未選択のまま「追加」ボタンを押す | 指示が `granularity=TRANSITION`（メソッド+トランジション単位）として追加される |
| 11 | experiment_admin | 再度「プロジェクト指示」ボタンを押し、メソッド・タスクNo（例: `1`）を選択して「追加」を押す | 指示が `granularity=TASK`（タスク単位）として追加される |

#### ステップ 4：「続けて追加」ボタンで連続追加

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | experiment_admin | 「プロジェクト指示」ボタンを押し、指示種別・内容を入力して「**続けて追加**」ボタンを押す | ダイアログが閉じずに全フィールドがリセットされ、続けて入力できる状態になる |
| 13 | experiment_admin | さらに別の指示種別・内容を入力して「続けて追加」ボタンを押す | 2件目もローカルに追加される（ダイアログは引き続き開いたまま）|
| 14 | experiment_admin | 「キャンセル」ボタンを押す | ダイアログが閉じる |

#### ステップ 5：指示バリデーションの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 15 | experiment_admin | 「指示種別」を未選択のまま「追加」ボタンを押す | 「指示種別を選択してください」バリデーションエラーが表示される |
| 16 | experiment_admin | 「指示内容」を空のまま「追加」ボタンを押す | 「指示内容を入力してください」バリデーションエラーが表示される |

#### ステップ 6：実験作業者の InstructionCollapse 確認（フェーズA・モック）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 17 | experiment_worker | 実験作業者メニュー → 「実験記録」タブを開く | `WorkRecordPanel` が表示される |
| 17 | experiment_worker | 実験作業者メニュー → 「実験記録」タブを開く | `WorkRecordPanel` が表示される |
| 18 | — | 画面上部を確認する | `WarningOutlined`（黄色）+「プロジェクト指示」+ 件数バッジの折りたたみパネル（背景色 `#fffbe6`）が表示されている |
| 19 | experiment_worker | 折りたたみパネルを展開する | 指示事項が箇条書き（`<ul><li>`）で表示される |
| 20 | — | 表示条件を確認する | 指示事項が0件の場合はパネル自体が非表示になっている |

> **フェーズA注記**: ステップ17〜20はモックデータ（`MOCK_PROJECT_INSTRUCTIONS` 4件固定）で動作します。フェーズBで API 接続予定。

### 確認ポイント

- [ ] 指示種別は6種別（通常指示 / 安全上の注意事項 / 操作手順上の注記 / 実施前後の確認事項 / 禁止事項 / その他注意事項）から選択できる
- [ ] 指示対象すべて未入力 → `granularity=OVERALL`（プロジェクト全体）
- [ ] メソッド + トランジション 指定 → `granularity=TRANSITION`
- [ ] メソッド + タスクNo 指定 → `granularity=TASK`
- [ ] トランジション/タスクNoの選択肢はメソッド選択時のみ活性化（メソッド未選択時は `disabled`）
- [ ] 「続けて追加」はダイアログを閉じずにフォームをリセットする
- [ ] `ExperimentPlanDialog` の基本情報タブに「注意事項」セクションが**表示されない**こと（廃止確認）
- [ ] `WorkRecordPanel` の `InstructionCollapse` は `instructions.length > 0` の場合のみ表示される

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-EI-04：一括タブ→タスクNタブへの伝播と個別編集

### 概要

実験管理者が「一括」タブ（TAB_KEY_ALL）でトランジションの想定値・Ref を変更すると、各「タスクN」タブに自動伝播することを確認する。また、タスクNタブで個別編集した場合は一括タブに反映されないこと（一方向伝播）を確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `ExperimentPlanDialog.tsx`（継承ロジック `updateCurrentTabData`）|

### 前提条件

- `experiment_admin` としてログイン済み
- タスク登録タブで `method-A`（試行回数 = タスク2件）行の `+指示` ボタンを押し、`ExperimentPlanDialog` が開いた状態であること

### 操作手順

#### ステップ 1：一括タブで想定値を設定

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 右パネルの「一括」タブを選択する | 一括タブが表示される |
| 2 | experiment_admin | 左パネルでトランジション `transition-1` を選択する | 右パネルに `transition-1` のフォームが表示される |
| 3 | experiment_admin | 内部タブ「テンプレート入力」で `temperature` に `25.0` を入力する | 値が入力される |
| 4 | experiment_admin | 「タスク1」タブに切り替える | `transition-1` の `temperature` が `25.0` で表示されている（一括から伝播済み）|
| 5 | experiment_admin | 「タスク2」タブに切り替える | 同様に `temperature` が `25.0` で表示されている |

#### ステップ 2：タスク1タブで個別編集（逆伝播しないことを確認）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 6 | experiment_admin | 「タスク1」タブの `temperature` を `30.0` に変更する | タスク1の値が `30.0` になる |
| 7 | experiment_admin | 「一括」タブに切り替えて `transition-1` の `temperature` を確認する | `25.0` のまま（タスク1の変更は一括タブに反映されない）|
| 8 | experiment_admin | 「タスク2」タブの `temperature` を確認する | `25.0` のまま（タスク2には影響しない）|

#### ステップ 3：一括タブで再変更して再伝播を確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 「一括」タブで `temperature` を `20.0` に変更する | 一括タブの値が `20.0` になる |
| 10 | experiment_admin | 「タスク2」タブで `temperature` を確認する | `20.0` に更新されている（再伝播）|
| 11 | experiment_admin | 「保存」ボタンを押す | タスク1・タスク2それぞれのデータが API で保存される |

> **注記**: 一括（`TAB_KEY_ALL`）タブのデータ自体は保存 API への送信対象ではない。各タスクNタブに伝播された値のみ保存される。

### 確認ポイント

- [ ] 一括タブの変更は `creatorRefs / instrumentRefs / ownerRefs / templateValues` の全フィールドに伝播される（`InheritableField`）
- [ ] タスクNタブでの個別編集は一括タブに反映されない（一方向伝播）
- [ ] 保存時は `taskNumbers` の各タスク番号に対して個別に `PUT` が呼ばれる
- [ ] 一括タブのデータは保存 API に送信されない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-EI-05：トランジション DnD 並べ替え

### 概要

実験管理者が `ExperimentPlanDialog` の左パネルでトランジションを Drag & Drop で並べ替えられることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `ExperimentPlanDialog.tsx` / `SortableTransitionRow.tsx`（`@dnd-kit/sortable`）|

### 前提条件

- `experiment_admin` としてログイン済み
- タスク登録タブで `method-A` 行の `+指示` ボタンを押し、`ExperimentPlanDialog` が開いており、左パネルにトランジションが3件以上表示されていること

### 操作手順

#### ステップ 1：DnD 並べ替え（依存関係なし）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 左パネルで `transition-1` のドラッグハンドル（⠿）をドラッグして `transition-3` の下に移動する | `transition-1` が3番目に移動する（`transitionOrder` が更新される）|
| 2 | — | 並べ替え後の順序を確認する | トランジション一覧に新しい順序が反映されている |

#### ステップ 2：DnD 並べ替え（依存関係制約）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 3 | experiment_admin | `prerequisiteTransitionIds` が設定されているトランジションを、依存元より前の位置に移動しようとする | 移動がキャンセルされ、元の位置に戻る（`canMoveToOrder()` による制約）|

### 確認ポイント

- [ ] DnD によるトランジション並べ替えが `@dnd-kit/sortable` で動作する
- [ ] 依存関係制約（`prerequisiteTransitionIds`）を違反する移動はキャンセルされる

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-EI-06：実験作業者 ─ 進捗確認タブ・フィルタ・前提チェック

### 概要

実験作業者が進捗確認タブ（`ProgressOverviewTab`）でサマリーカード・フィルタバー・トランジションテーブルを確認し、前提未完了のトランジションがロックされることを確認する。
また、フェーズB移行により追加された `preparing`（準備中）・`ready`（準備完了）ステータスの操作ボタン仕様を確認する。
また、フェーズB移行により追加された `preparing`（準備中）・`ready`（準備完了）ステータスの操作ボタン仕様を確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_worker/ui_progress_overview_tab.md`（v3.0.0） |
| UI設計書 | `docs/design/ui/experiment_worker/ui_progress_overview_tab.md`（v3.0.0） |
| コンポーネント | `ProgressOverviewTab.tsx` / `SummaryCard`（サブコンポーネント）|
| API | `GET /api/v1/progress/projects/:projectName/work-details` |
| API | `GET /api/v1/progress/projects/:projectName/work-details` |

### 前提条件

- `experiment_worker` としてログイン済み
- `ExperimentWorkerMenu` が `getWorkDetails` API を呼び出し、`rows`（ProgressRow 配列）が `ProgressOverviewTab` に渡されていること
- テスト用プロジェクトに以下のステータスのトランジションが含まれていること：
  - `not_started` が1件以上
  - `preparing` が1件（進捗確認タブから「開始」を押した直後の状態）
  - `ready` が1件（「指示確認」ボタンを押した後の状態）
  - `in_progress` が1件以上
  - `completed` が1件以上
- `ExperimentWorkerMenu` が `getWorkDetails` API を呼び出し、`rows`（ProgressRow 配列）が `ProgressOverviewTab` に渡されていること
- テスト用プロジェクトに以下のステータスのトランジションが含まれていること：
  - `not_started` が1件以上
  - `preparing` が1件（進捗確認タブから「開始」を押した直後の状態）
  - `ready` が1件（「指示確認」ボタンを押した後の状態）
  - `in_progress` が1件以上
  - `completed` が1件以上
- `transition-2` の `prerequisiteTransitionIds` に `transition-1` が設定されていること

### 操作手順

#### ステップ 1：サマリーカードの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 実験作業者メニュー → 「進捗確認」タブを開く | `ProgressOverviewTab` が表示される |
| 2 | — | サマリーカードを確認する | 全体進捗バー（%）・タスク完了数・ステータス別件数が表示されている |
| 3 | — | サマリーカードのステータス別件数を確認する | 未着手・作業中・完了 の各件数が表示される。`preparing`（準備中）・`ready`（準備完了）は**サマリーカードに個別表示されない**（2026-08-27 修正：設計書 v3.1.0 §6.1 に準拠）|
| 4 | — | 問題あり件数の表示を確認する | `issue` ステータス行が1件以上ある場合のみ赤色で件数表示される。0件の場合は非表示 |

#### ステップ 2：フィルタバーの操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_worker | フィルタバーの「ステータス」セレクトを開く | 選択肢に「未着手」「作業中」「一時停止」「完了」「問題あり」の**5種**が表示される。**「準備中」「準備完了」はフィルター選択肢に含まれない**（2026-08-27 修正：設計書 v3.1.0 §6.2 に準拠）|
| 6 | experiment_worker | 「ステータス」セレクトで「作業中」を選択する | `in_progress` のトランジションのみに絞り込まれる |
| 7 | — | `preparing`（準備中）・`ready`（準備完了）のトランジションをフィルターで絞り込めないことを確認する | 「ステータス」セレクトに「準備中」「準備完了」の選択肢が存在しない（これらのトランジションはフィルターなし時に一覧に表示される）|
| 8 | experiment_worker | 「メソッド名」フィルタで `method-A` を選択する | `method-A` のトランジションのみに絞り込まれる |
| 9 | experiment_worker | 各フィルタをクリアする | 全トランジションが再表示される |

#### ステップ 3：ステータス別操作ボタンの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | — | `not_started`（前提なし）行の操作列を確認する | 「開始」ボタンが活性状態で表示される |
| 11 | — | `preparing`（準備中）行の操作列を確認する | 「作業へ」ボタン（default）が表示される（2026-08-27 修正：「指示確認」→「作業へ」default に変更。設計書 v3.1.0 §9 に準拠）|
| 12 | — | `ready`（準備完了）行の操作列を確認する | 「作業へ」ボタン（primary）が表示される（2026-08-27 修正：「開始」→「作業へ」primary に変更。設計書 v3.1.0 §9 に準拠）|
| 13 | — | `in_progress` 行の操作列を確認する | 「作業へ」ボタン（primary）が表示される |
| 14 | — | `on_hold` 行の操作列を確認する | 「再開」ボタンが表示される |
| 15 | — | `completed` または `issue` 行の操作列を確認する | 「詳細確認」ボタンが表示される |
| 16 | experiment_worker | `preparing` 行の「作業へ」ボタンを押す | 作業記録タブ（`WorkRecordPanel`）に遷移し、対象トランジションが表示される（`onGoToWork` 呼び出し。2026-08-27 修正：設計書 v3.1.0 §9 に準拠）|

#### ステップ 4：前提未完了による開始ボタンのロック確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 17 | — | `transition-2`（前提: `transition-1` 未完了）の操作列を確認する | 「開始」ボタンが `disabled` になり 🔒（LockOutlined・黄色）アイコンがトランジション名横に表示される |
| 18 | experiment_worker | `disabled` の「開始」ボタンにホバーする | Tooltip「前の順序のトランジションを先に完了してください」が表示される |
| 17 | — | `transition-2`（前提: `transition-1` 未完了）の操作列を確認する | 「開始」ボタンが `disabled` になり 🔒（LockOutlined・黄色）アイコンがトランジション名横に表示される |
| 18 | experiment_worker | `disabled` の「開始」ボタンにホバーする | Tooltip「前の順序のトランジションを先に完了してください」が表示される |

#### ステップ 5：レスポンシブ表示の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 19 | experiment_worker | ブラウザ幅を xl（1200px）以上に設定する | 進捗列が Material / Condition / Result の独立3列（Progress バー + rec/tot 数値）で表示される |
| 20 | experiment_worker | ブラウザ幅を xl（1200px）未満に設定する | 進捗列が「進捗」1列に統合され、`M rec/tot · C rec/tot · R rec/tot` のテキスト表示になる |

### 確認ポイント

- [ ] `canAccessTransition` ロジックは同一タスク内の前提完了のみを確認する（異なるタスク間は対象外）
- [ ] 前提未完了のトランジションは操作ボタンが `disabled`、トランジション名横に 🔒 アイコン
- [ ] レスポンシブ切り替えポイントは xl（1200px）
- [ ] **ステータスは7種類**：`not_started` / `preparing` / `ready` / `in_progress` / `on_hold` / `completed` / `issue`
- [ ] `preparing` 行には「作業へ」ボタン（default）が表示される（2026-08-27 修正：設計書 v3.1.0 §9 に準拠）
- [ ] `ready` 行には「作業へ」ボタン（primary）が表示される（2026-08-27 修正：設計書 v3.1.0 §9 に準拠）
- [ ] サマリーカードに `preparing`・`ready` の個別件数は表示されない（2026-08-27 修正：表示は not_started / in_progress / completed のみ）
- [ ] フィルター「ステータス」の選択肢は5種（`not_started`・`in_progress`・`on_hold`・`completed`・`issue`）のみ。`preparing`・`ready` はない（2026-08-27 修正）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |
| | | 未実施 | |

---

## B-EI-07：実験作業者 ─ 実験記録タブ・実績値入力・トランジション完了
## B-EI-07：実験作業者 ─ 実験記録タブ・実績値入力・トランジション完了

### 概要

実験作業者が `WorkRecordPanel` でテンプレートを選択し、型に応じた入力コントロール（InputNumber / Input）で実績値を入力し、「次へ」ボタンでトランジションを完了させられることを確認する。
フェーズB対応として、指示確認フロー（`preparing` → `ready` → `in_progress`）・状態記録ダイアログ・状態プルダウン・API保存も検証する。
実験作業者が `WorkRecordPanel` でテンプレートを選択し、型に応じた入力コントロール（InputNumber / Input）で実績値を入力し、「次へ」ボタンでトランジションを完了させられることを確認する。
フェーズB対応として、指示確認フロー（`preparing` → `ready` → `in_progress`）・状態記録ダイアログ・状態プルダウン・API保存も検証する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_worker/ui_work_record_panel.md`（**v3.2.0**）|
| コンポーネント | `WorkRecordPanel.tsx` / `PropertyCard`（サブコンポーネント）|
| API | `GET /api/v1/progress/projects/:projectName/work-details` |
| API | `GET /api/v1/experiment-data/template-data` |
| API | `POST /api/v1/experiment-data` |
| API | `PATCH /api/v1/progress/.../transitions/:transitionId/status` |
| API | `POST /api/v1/projects/.../instructions/confirm` |
| API | `GET /api/v1/progress/projects/:projectName/work-details` |
| API | `GET /api/v1/experiment-data/template-data` |
| API | `POST /api/v1/experiment-data` |
| API | `PATCH /api/v1/progress/.../transitions/:transitionId/status` |
| API | `POST /api/v1/projects/.../instructions/confirm` |

### 前提条件

- `experiment_worker` としてログイン済み
- 作業対象トランジション（`transition-1`）が `preparing` 状態であること（進捗確認タブから「開始」が押された直後）
- 作業対象トランジション（`transition-1`）が `preparing` 状態であること（進捗確認タブから「開始」が押された直後）
- `transition-1` のテンプレートに `FloatValue`・`StringValue` のプロパティが存在すること
- プロジェクト指示が1件以上登録されていること
- プロジェクト指示が1件以上登録されていること

### 操作手順

#### ステップ 1：WorkRecordPanel の構成確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 実験作業者メニュー → 「実験記録」タブを開く | `WorkRecordPanel` が表示される |
| 2 | — | 画面最上部のプロジェクト指示パネルを確認する | `WarningOutlined`（黄色）+「プロジェクト指示」+ 件数バッジの折りたたみパネル（背景色 `#fffbe6`）が表示されている |
| 3 | — | WorkHeader（ステータス行）を確認する | **状態プルダウン**（準備中「preparing」が選択された状態）・タスク#・メソッドID・トランジションID が表示されている |
| 4 | — | WorkHeader 右端のボタン群（1行目）を確認する | 「開始」「終了」 **\|（Divider）** 「異常終了」「状態記録」の4ボタンが表示されている。「異常終了」は**赤色（danger）** |
| 5 | — | 左 Sider（幅280px固定）のテンプレートリストを確認する | **Materials / Conditions / Results のカテゴリ別グループ**（カード形式：テンプレート名・プロパティ数・カテゴリ Tag・I/O Tag）で表示されている |
| 6 | — | Content 上部（WorkHeader 直下）のボタン群（2行目）を確認する | 「保存」「次へ」 **\|（Divider）** 「コメント」「スキップ」の4ボタンが並んでいる（**Content 最下部ではなく上部**） |

#### ステップ 2：指示確認フロー（`preparing` → `ready`）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | — | プロジェクト指示パネル右端のボタンを確認する | 「指示確認」ボタンが表示されている |
| 8 | experiment_worker | 「指示確認」ボタンを押す | API `POST /api/v1/projects/.../instructions/confirm` が呼ばれ、トランジションが `READY`（準備完了）状態に遷移する |
| 9 | — | WorkHeader の状態プルダウンを確認する | 「準備完了（ready）」が選択された状態になっている |

#### ステップ 3：テンプレート選択と型対応コントロールの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_worker | 左 Sider で「Conditions」グループ内の `Condition-Mixing` テンプレートカードをクリックする | 右コンテンツに PropertyCard グリッド（3列）が表示される |
| 11 | — | `FloatValue` プロパティの入力コントロールを確認する | `InputNumber`（数値入力）が表示され、単位ラベルが横に表示されている |
| 12 | — | `StringValue` プロパティの入力コントロールを確認する | テキスト `Input` が表示されている |
| 13 | — | 各カードの「想定値」エリアを確認する | `plannedValue`（API取得値）が表示されている（未設定時は「未設定」italic）|
| 14 | — | 各カードの「不確かさ値」「不確かさ説明」を確認する | `toleranceValue`・`uncertaintyNote`（API取得値）が表示されている |

#### ステップ 4：「開始」ボタンで `ready` → `in_progress` 遷移

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 15 | experiment_worker | WorkHeader の「開始」ボタンを押す | API `PATCH .../status` が呼ばれ、トランジションが `IN_PROGRESS`（作業中）状態に遷移する |
| 16 | — | WorkHeader の状態プルダウンを確認する | 「作業中（in_progress）」が選択された状態になっている |

#### ステップ 5：実績値の入力と保存

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 17 | experiment_worker | `temperature`（FloatValue）の InputNumber に `27.3` を入力する | 想定値と並んで実績値が表示される |
| 18 | experiment_worker | 「保存」ボタンを押す | API `POST /api/v1/experiment-data` が呼ばれ、実績値が保存される |

#### ステップ 6：「次へ」でトランジション完了

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 19 | experiment_worker | 「次へ」ボタンを押す | トランジションが `COMPLETED` 状態に更新され、次のトランジションへ切り替わる |

#### ステップ 7：スキップ操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 20 | — | スキップボタンの状態を確認する（他に実行可能なトランジションあり）| スキップボタンが活性状態、ホバー時に Tooltip「このトランジションを後回しにして次へ進みます」が表示される（2026-08-27 修正：`t('workRecord.skipTooltipAvailable')` の実値）|
| 21 | experiment_worker | スキップボタンを押す | 現トランジションがスキップリストに追加され、次の実行可能トランジションへ移動する |
| 22 | — | スキップボタンの状態を確認する（他に実行可能なトランジションなし）| スキップボタンが `disabled`、Tooltip「スキップできる別のトランジションがありません」が表示される（2026-08-27 修正：`t('workRecord.skipTooltipUnavailable')` の実値）|

#### ステップ 8：状態記録ダイアログ

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 23 | experiment_worker | WorkHeader の「状態記録」ボタンを押す | 状態記録ダイアログ（Modal）が開く |
| 24 | — | ダイアログ内容を確認する | 「動作状態」固定行（日時 + 状態選択）が表示されている |
| 25 | experiment_worker | 「＋ 休止状態記録追加」ボタンを押す | 休止状態 + 動作状態のペア行がボーダーで囲まれて追加される |
| 26 | experiment_worker | 追加されたペア行の「- 休止状態記録削除」ボタンを押す | ペア行が削除される |
| 27 | experiment_worker | ダイアログを「キャンセル」で閉じる | ダイアログが閉じる |

#### ステップ 9：状態プルダウンの直接操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 28 | — | WorkHeader の状態 Select を確認する | プルダウンが**活性状態**（`disabled` ではない）で操作可能 |
| 29 | experiment_worker | 状態プルダウンを開いて選択肢を確認する | 「準備中」「準備完了」「実行中」「完了」「エラー」の選択肢が表示される |

#### ステップ 10：完了済みトランジションの参照閲覧

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 30 | experiment_worker | 完了済みトランジションを進捗確認タブから「詳細確認」で開く | `WorkRecordPanel` が読取専用（`isReadOnly=true`）で開く |
| 31 | — | WorkHeader を確認する | 情報アイコン付き Alert「完了済み（参照のみ）」と「作業に戻る」ボタンが表示されている |
| 32 | — | 実績値の表示を確認する | 実績値は参照表示（Input ではなく値テキスト）になっており、確信度ボタン・定量評価追加ボタンが非表示 |

### 確認ポイント

- [ ] `FloatValue`/`IntegerValue` → `InputNumber`（単位ラベル付き）
- [ ] `StringValue` → テキスト `Input`
- [ ] 左Sider は **Materials / Conditions / Results のカテゴリ別グループ表示**（フラットなTableではない）
- [ ] **ボタン群は Content 上部（WorkHeader 直下）に配置**（Content 最下部ではない）
- [ ] ボタン配置：「保存」「次へ」 **|** 「コメント」「スキップ」（Divider でグループ区切り）
- [ ] WorkHeader 1行目：「開始」「終了」 **|** 「異常終了（赤）」「状態記録」（Divider でグループ区切り）
- [ ] **状態プルダウンは活性状態**（`disabled` 属性が削除済み）
- [ ] 指示確認ボタン押下 → `preparing` → `ready` 遷移・API 呼び出し確認
- [ ] 「開始」ボタン押下 → `ready` → `in_progress` 遷移
- [ ] 「次へ」ボタン押下 → `completed` 遷移・API 呼び出し確認
- [ ] **保存は実 API（`POST /api/v1/experiment-data`）** が呼ばれること（モック通知ではない）
- [ ] 状態記録ダイアログが「状態記録」ボタンで開く
- [ ] 左Sider は **Materials / Conditions / Results のカテゴリ別グループ表示**（フラットなTableではない）
- [ ] **ボタン群は Content 上部（WorkHeader 直下）に配置**（Content 最下部ではない）
- [ ] ボタン配置：「保存」「次へ」 **|** 「コメント」「スキップ」（Divider でグループ区切り）
- [ ] WorkHeader 1行目：「開始」「終了」 **|** 「異常終了（赤）」「状態記録」（Divider でグループ区切り）
- [ ] **状態プルダウンは活性状態**（`disabled` 属性が削除済み）
- [ ] 指示確認ボタン押下 → `preparing` → `ready` 遷移・API 呼び出し確認
- [ ] 「開始」ボタン押下 → `ready` → `in_progress` 遷移
- [ ] 「次へ」ボタン押下 → `completed` 遷移・API 呼び出し確認
- [ ] **保存は実 API（`POST /api/v1/experiment-data`）** が呼ばれること（モック通知ではない）
- [ ] 状態記録ダイアログが「状態記録」ボタンで開く
- [ ] 完了済み閲覧時（`isReadOnly=true`）は保存ボタン群が非表示になる

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |
| | | 未実施 | |

---

## B-EI-08：差異表示・確信度ボタン・定量評価入力

### 概要

実験作業者が PropertyCard で実績値入力後に差異（`calcDiff`）が表示されること、確信度ボタン（DB 登録選択肢）で定性評価を選択できること、および定量評価（不確かさ基準 + 値）を追加・削除できることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_worker/ui_work_record_panel.md`（v3.0.0 §5.4 PropertyCard）|
| コンポーネント | `WorkRecordPanel.tsx`（PropertyCard サブコンポーネント）|

### 前提条件

- `experiment_worker` としてログイン済み
- `WorkRecordPanel` が入力モードで表示されていること
- `plannedValue`（想定値 `25.0`）・`toleranceValue`（不確かさ値）・`uncertaintyNote`（不確かさ説明）が設定済みのプロパティ（例: `temperature`）が存在すること
- テストプロジェクトの `intuition_selector` テーブルに定性評価選択肢が登録されていること（例：「良好」「要確認」「NG」）

### 操作手順

#### ステップ 1：PropertyCard の表示内容確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | — | `temperature` PropertyCard の上部を確認する | 「想定値」セルに `plannedValue`（例: `25.0 °C`）が表示されている |
| 2 | — | 「不確かさ値」列を確認する | ヘッダーに `uncertaintyName`、セルに `toleranceValue` が表示されている |
| 3 | — | 「不確かさ説明」セルを確認する | `uncertaintyNote` が全幅セルに表示されている（未設定時は「—」）|

#### ステップ 2：差異表示（calcDiff）の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_worker | `temperature`（想定値 `25.0`）に実績値 `27.3` を入力する | 差分 `+2.3` が赤色（`#cf1322`）で表示される |
| 5 | experiment_worker | `temperature` に実績値 `22.0` を入力する | 差分 `-3.0` が青色（`#096dd9`）で表示される |
| 6 | experiment_worker | `temperature` に実績値 `25.0`（想定値と同じ）を入力する | 差分 `±0` が secondary（グレー）で表示される |

#### ステップ 3：確信度ボタンの操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | — | PropertyCard の確信度ボタン群を確認する | **DB 登録の選択肢**（例: 「良好」「要確認」「NG」）が表示されている（固定3択「確か/曖昧/不確か」ではない）|
| 8 | experiment_worker | 最初の選択肢ボタン（例: 「良好」）を選択する | ボタンが強調表示され、カードの選択中確信度 Tag が表示される |
| 9 | experiment_worker | 再度同ボタンを押す | 選択が解除される（確信度 Tag が非表示になる）|
| 10 | — | `qualitativeEval` が保存済みのプロパティを確認する | 保存済みの値が**初期選択状態**になっている |
| 11 | — | `qualitativeNote`（定性評価説明）が設定されているプロパティを確認する | **確信度ラベルの右隣**に `（description）` 形式で表示されている（2026-08-27 修正：設計書 v3.2.0 §3.0.1 に準拠。旧「不確かさ値ヘッダー右隣」は誤り）|

#### ステップ 4：定量評価の追加・削除

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | experiment_worker | PropertyCard 下部の「＋値の追加」ボタンを押す | 不確かさ基準 Select + 値 Input + `DeleteOutlined` ボタンの行が追加される |
| 13 | experiment_worker | 不確かさ基準 Select を開く | `uncertainty.json` から `eval==='quantitative' && status==='active'` で絞り込まれた基準一覧が表示される |
| 14 | experiment_worker | 不確かさ基準を選択し、値 Input に数値を入力する | 選択・入力できる |
| 15 | experiment_worker | `DeleteOutlined` ボタンを押す | その定量評価行が削除される |

### 確認ポイント

- [ ] 差分 > 0 → `+値`（赤 `#cf1322`）、差分 < 0 → `値`（青 `#096dd9`）、差分 = 0 → `±0`（secondary）
- [ ] **確信度ボタンは `qualitativeOptions`（DB登録値 = `intuition_selector` テーブル由来）を使用する**（固定3択ではない）
- [ ] **`qualitativeEval`（保存済み選択値）が初期選択状態になっている**
- [ ] **`qualitativeNote`（定性評価の説明文）が設定されている場合、「定性評価」ラベルの右隣に `（description）` 形式で表示される**（2026-08-27 修正：旧「不確かさ値ヘッダー右隣」は誤り。設計書 v3.2.0 §3.0.1 に準拠）
- [ ] 確信度ボタンは再クリックで解除される
- [ ] 定量評価の不確かさ基準は `eval==='quantitative' && status==='active'` で絞り込まれる
- [ ] PropertyCard に `plannedValue`（想定値）・`toleranceValue`（不確かさ値）・`uncertaintyNote`（不確かさ説明）が API データから正しく表示される

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_worker/ui_work_record_panel.md`（§3.4 PropertyCard）|
| コンポーネント | `WorkRecordPanel.tsx`（PropertyCard サブコンポーネント）|

### 前提条件

- `experiment_worker` としてログイン済み
- `WorkRecordPanel` が入力モードで表示されていること
- 想定値が設定済みのプロパティ（例: `temperature`、想定値 `25.0`）が存在すること

> **フェーズA注記**: 確信度（`confidence` State）と定量評価追加行（`addedValues` State）はコンポーネント内ローカル State であり、保存時の API 送信は未実装（フェーズB予定）。

### 操作手順

#### ステップ 1：差異表示（calcDiff）の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | `temperature`（想定値 `25.0`）に実績値 `27.3` を入力する | 差分 `+2.3` が赤色（`#cf1322`）で表示される |
| 2 | experiment_worker | `temperature` に実績値 `22.0` を入力する | 差分 `-3.0` が青色（`#096dd9`）で表示される |
| 3 | experiment_worker | `temperature` に実績値 `25.0`（想定値と同じ）を入力する | 差分 `±0` が secondary（グレー）で表示される |

#### ステップ 2：確信度ボタンの操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | — | PropertyCard の確信度ボタン群を確認する | 「確か」（緑）・「曖昧」（橙）・「不確か」（赤）・「OK」（緑）・「NG」（赤）の5ボタンが表示されている |
| 5 | experiment_worker | 「確か」ボタンを選択する | ボタンが太字 + outline で強調表示され、カードの選択中確信度 Tag（緑）が表示される |
| 6 | experiment_worker | 再度「確か」ボタンを押す | 選択が解除される（確信度 Tag が非表示になる）|
| 7 | experiment_worker | 「NG」ボタンを選択する | 「NG」ボタンが強調表示され、カードの確信度 Tag が赤色で「NG」と表示される |

#### ステップ 3：定量評価の追加・削除

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_worker | PropertyCard 下部の「＋値の追加」ボタン（背景色 `#1d4e63`）を押す | 不確かさ基準 Select + 値 Input + `DeleteOutlined` ボタンの行が追加される |
| 9 | experiment_worker | 不確かさ基準 Select を開く | `uncertainty.json` から `eval==='quantitative' && status==='active'` で絞り込まれた基準一覧が表示される |
| 10 | experiment_worker | 不確かさ基準を選択し、値 Input に数値を入力する | 選択・入力できる |
| 11 | experiment_worker | `DeleteOutlined` ボタンを押す | その定量評価行が削除される |

### 確認ポイント

- [ ] 差分 > 0 → `+値`（赤 `#cf1322`）、差分 < 0 → `値`（青 `#096dd9`）、差分 = 0 → `±0`（secondary）
- [ ] 確信度ボタンは再クリックで解除される
- [ ] 定量評価の不確かさ基準は `eval==='quantitative' && status==='active'` で絞り込まれる
- [ ] 確信度・定量評価の保存はフェーズAでは未実装（ローカル State のみ）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（仕様変更待ち） | |

---

## トランジション状態遷移

## ステータス定義・遷移マトリクス

### ステータス定義（`TransitionStatusEnum`）

| 数値 | 定数名 | フロントエンド文字列 | 表示ラベル |
|------|--------|-------------------|----------|
| 0 | `INITIAL` | `not_started` | **初期状態** |
| 1 | `PREPARING` | `preparing` | **準備状態** |
| 2 | `READY` | `ready` | **準備完了状態** |
| 3 | `IN_PROGRESS` | `in_progress` | **動作状態** |
| 4 | `PAUSED` | `on_hold` | **休止状態** |
| 5 | `COMPLETED` | `completed` | **終状態** |
| 6 | `ERROR` | `issue` | **異常終了状態** |

### 遷移マトリクス（`ALLOWED_TRANSITIONS` / `progressService.ts` L52-60）

| 遷移元 | 遷移可能先 | 備考 |
|--------|----------|------|
| INITIAL(0) | INITIAL, PREPARING, IN_PROGRESS, COMPLETED, ERROR | 進捗タブ「開始」→ PREPARING |
| PREPARING(1) | PREPARING, READY, COMPLETED, ERROR | 「指示確認」ボタン → READY |
| READY(2) | READY, IN_PROGRESS, COMPLETED, ERROR | WorkHeader「開始」→ IN_PROGRESS |
| IN_PROGRESS(3) | IN_PROGRESS, PAUSED, COMPLETED, ERROR, INITIAL | WorkHeader「終了」→ COMPLETED / 「切り替え」→ INITIAL |
| PAUSED(4) | PAUSED, IN_PROGRESS, COMPLETED, ERROR | WorkHeader「再開」→ IN_PROGRESS |
| COMPLETED(5) | COMPLETED のみ | **終端状態（変更不可）** |
| ERROR(6) | ERROR のみ | **終端状態（変更不可）** |

### UIトリガーとステータス遷移の対応

| UI操作 | 遷移元 → 遷移先 | 実装 |
|--------|--------------|------|
| 全体進捗タブ「開始」ボタン（`handleStartWork`）| INITIAL(0) → PREPARING(1) | `ExperimentWorkerMenu.tsx` L566 |
| 「指示確認」ボタン（`handleConfirmInstruction`）| PREPARING(1) → READY(2) | `ExperimentWorkerMenu.tsx` L241 |
| WorkHeader「開始」（`onStart`）| READY(2) → IN_PROGRESS(3) | `ExperimentWorkerMenu.tsx` L655 |
| WorkHeader「終了」（`onEnd`）| IN_PROGRESS(3) → COMPLETED(5) | `ExperimentWorkerMenu.tsx` L668 |
| WorkHeader「異常終了」（`onForceEnd`）| IN_PROGRESS(3) / not_started(0) → ERROR(6) | `ExperimentWorkerMenu.tsx` L681 |
| 「保存して次へ」（`handleSaveAndNext`）| IN_PROGRESS(3) → COMPLETED(5) | `WorkRecordPanel.tsx` |
| 作業中切り替え「切り替える」| IN_PROGRESS(3) → INITIAL(0) + INITIAL(0) → PREPARING(1) | `ExperimentWorkerMenu.tsx` L611 |
| 状態プルダウン直接変更 | 任意 → 任意（ALLOWED_TRANSITIONS 制約あり）| `WorkRecordPanel.tsx` WorkHeader |

---

## B-TR-01：通常フロー（INITIAL → PREPARING → READY → IN_PROGRESS → COMPLETED）

### 概要

実験作業者が `transition-1` を通常フロー（初期状態→準備状態→準備完了状態→動作状態→終状態）で完了させられることを確認する。

### 前提条件

- `experiment_worker` としてログイン済み
- プロジェクト `proj-test-001` が選択済み
- `transition-1` のステータスが INITIAL(0) であること
- `transition-1` に対応するプロジェクト指示（methodId=null・transitionId=null）が未確認（`is_acknowledged=false`）で1件以上登録されていること

### 操作手順

#### ステップ 1：初期状態 → 準備状態（INITIAL(0) → PREPARING(1)：進捗タブ「開始」）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 進捗確認タブ（key='4'）を開く | `ProgressOverviewTab` が表示され、`transition-1` 行に「開始」ボタンが表示される |
| 2 | experiment_worker | `transition-1` 行の「開始」ボタンをクリックする | `PATCH .../transitions/transition-1/status` が呼ばれ `status=1`（PREPARING）が送信される |
| 3 | — | `transition-1` のステータスを確認する | ステータスが `preparing`（準備状態）に変わり、ProgressOverviewTab の行表示が更新される |
| 4 | — | 実験記録タブ（key='3'）に自動遷移することを確認する | `handleTabChange('3')` が呼ばれて実験記録タブが表示される |

#### ステップ 2：準備状態 → 準備完了状態（PREPARING(1) → READY(2)：「指示確認」ボタン）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_worker | 実験記録タブの `InstructionCollapse`（プロジェクト指示パネル）を展開する | 未確認の指示内容が表示され、「指示確認」ボタンが表示されている |
| 6 | experiment_worker | 「指示確認」ボタンをクリックする | ① `PUT .../instructions/{instructionId}/confirm` が呼ばれて指示が確認済みになる ② `PATCH .../transitions/transition-1/status` が呼ばれ `status=2`（READY）が送信される |
| 7 | — | `transition-1` のステータスを確認する | ステータスが `ready`（準備完了状態）に変わる |

#### ステップ 3：準備完了状態 → 動作状態（READY(2) → IN_PROGRESS(3)：WorkHeader「開始」）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_worker | WorkHeader の「開始」ボタンをクリックする | `PATCH .../transitions/transition-1/status` が呼ばれ `status=3`（IN_PROGRESS）が送信される |
| 9 | — | `transition-1` のステータスを確認する | ステータスが `in_progress`（動作状態）に変わり、WorkHeader の状態プルダウンが「動作状態」になる |

#### ステップ 4：動作状態 → 終状態（IN_PROGRESS(3) → COMPLETED(5)：WorkHeader「終了」または「保存して次へ」）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_worker | WorkHeader の「終了」ボタンをクリックする | `PATCH .../transitions/transition-1/status` が呼ばれ `status=5`（COMPLETED）が送信される |
| 11 | — | `transition-1` のステータスを確認する | ステータスが `completed`（終状態）に変わる |
| 12 | — | WorkHeader の「終了」「開始」ボタンの状態を確認する | COMPLETED は終端状態のため、これ以上ステータス変更できないことを確認する |

### 確認ポイント

- [ ] INITIAL → PREPARING: `status=1` が API に送信される
- [ ] PREPARING → READY: 指示確認後に `status=2` が API に送信される
- [ ] READY → IN_PROGRESS: `status=3` が API に送信される
- [ ] IN_PROGRESS → COMPLETED: `status=5` が API に送信される
- [ ] 各遷移後に `progressRows` が再取得されて UI が更新される
- [ ] DB の `transition_data.status` が各遷移後に正しい数値になっている

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-TR-02：異常終了（IN_PROGRESS → ERROR）

### 概要

動作状態のトランジションを WorkHeader「異常終了」ボタンで異常終了状態（ERROR）に遷移させ、終端状態になることを確認する。

### 前提条件

- `experiment_worker` としてログイン済み
- プロジェクト `proj-test-001` が選択済み
- `transition-1` のステータスが IN_PROGRESS(3) であること

### 操作手順

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 実験記録タブで WorkHeader の「異常終了」ボタン（赤色）をクリックする | `PATCH .../transitions/transition-1/status` が呼ばれ `status=6`（ERROR）が送信される |
| 2 | — | `transition-1` のステータスを確認する | ステータスが `issue`（異常終了状態）に変わる |
| 3 | — | 全体進捗タブで `transition-1` 行の操作列を確認する | 「詳細確認」ボタンが表示される（終端状態のため作業不可）|
| 4 | — | WorkHeader から再度ステータス変更を試みる | ERROR 状態からの遷移が拒否される（`ALLOWED_TRANSITIONS[6] = [6]` のみ）|

### 確認ポイント

- [ ] IN_PROGRESS → ERROR: `status=6` が API に送信される
- [ ] ERROR 状態は終端状態であり、DB 上での他ステータスへの変更が拒否される
- [ ] 全体進捗タブで `issue` ステータスの行には「詳細確認」ボタンが表示される

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-TR-03：休止状態・動作状態（IN_PROGRESS → PAUSED → IN_PROGRESS）

### 概要

動作状態のトランジションを状態プルダウンで休止状態（PAUSED）に変更し、再び動作状態（IN_PROGRESS）に戻せることを確認する。

> **注意**: `PAUSED` (4) への遷移は現在 WorkHeader に専用ボタンなし。状態プルダウン（WorkHeader 内の `<Select>`）から直接変更する。

### 前提条件

- `experiment_worker` としてログイン済み
- `transition-1` のステータスが IN_PROGRESS(3) であること

### 操作手順

#### ステップ 1：動作状態 → 休止状態（IN_PROGRESS(3) → PAUSED(4)）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | WorkHeader の状態プルダウンを開く | 「動作状態」が選択されており、変更可能な選択肢が表示される |
| 2 | experiment_worker | プルダウンで「休止状態」を選択する | `PATCH .../transitions/transition-1/status` が呼ばれ `status=4`（PAUSED）が送信される |
| 3 | — | `transition-1` のステータスを確認する | ステータスが `on_hold`（休止状態）に変わる |
| 4 | — | 全体進捗タブで `transition-1` 行を確認する | 「再開」ボタンが表示される |

#### ステップ 2：休止状態 → 動作状態（PAUSED(4) → IN_PROGRESS(3)）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_worker | 全体進捗タブで `transition-1` 行の「再開」ボタンをクリックする | 実験記録タブに遷移し（`onGoToWork` 呼び出し）、`transition-1` の作業記録画面が表示される |
| 6 | experiment_worker | WorkHeader の状態プルダウンで「動作状態」を選択する | `PATCH .../transitions/transition-1/status` が呼ばれ `status=3`（IN_PROGRESS）が送信される |
| 7 | — | `transition-1` のステータスを確認する | ステータスが `in_progress`（動作状態）に戻る |

### 確認ポイント

- [ ] IN_PROGRESS → PAUSED: `status=4` が API に送信される
- [ ] PAUSED → IN_PROGRESS: `status=3` が API に送信される
- [ ] 休止状態（PAUSED）では全体進捗タブに「再開」ボタンが表示される

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-TR-04：作業中切り替え（IN_PROGRESS → INITIAL → PREPARING）

### 概要

`transition-1` が動作状態（IN_PROGRESS）中に別の `transition-2` の「開始」ボタンを押すと確認ダイアログが表示され、承認すると `transition-1` が初期状態（INITIAL）に戻り `transition-2` が準備状態（PREPARING）になることを確認する。

### 前提条件

- `experiment_worker` としてログイン済み
- `transition-1` のステータスが IN_PROGRESS(3) であること
- `transition-2` のステータスが INITIAL(0) であること

### 操作手順

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 全体進捗タブを開く | `transition-1`（動作状態）と `transition-2`（初期状態）が表示されている |
| 2 | experiment_worker | `transition-2` 行の「開始」ボタンをクリックする | 確認ダイアログが表示される（「別のトランジションが作業中です」タイトル、`transition-1` 名が表示される）|
| 3 | experiment_worker | ダイアログで「切り替える」ボタンをクリックする | ① `transition-1` に `status=0`（初期状態）を PATCH ② `transition-2` に `status=1`（準備状態）を PATCH ③ 実験記録タブに遷移する |
| 4 | — | `transition-1` のステータスを確認する | 初期状態（INITIAL=0）に戻っている |
| 5 | — | `transition-2` のステータスを確認する | 準備状態（PREPARING=1）になっている |
| 6 | experiment_worker | ダイアログで「キャンセル」を選択した場合（別ケース）| ダイアログが閉じ、`transition-1` は動作状態（IN_PROGRESS）のまま変化しない |

### 確認ポイント

- [ ] IN_PROGRESS の別トランジションが存在する場合、「開始」押下で確認ダイアログが表示される
- [ ] 「切り替える」承認時: 旧動作状態トランジションが初期状態（INITIAL=0）に戻る
- [ ] 「切り替える」承認時: 新対象トランジションが準備状態（PREPARING=1）になる
- [ ] 「キャンセル」時: 状態は変化しない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-TR-05：終端状態からの遷移拒否（COMPLETED/ERROR は変更不可）

### 概要

バックエンドが COMPLETED(5)・ERROR(6) からの遷移を拒否することを API レベルで確認する。

### 前提条件

- DB に `status=5`（COMPLETED）のトランジションが存在すること
- DB に `status=6`（ERROR）のトランジションが存在すること

### 操作手順

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | — | `PATCH .../transitions/completed-tr/status` に `status=3`（IN_PROGRESS）を送信する | **400 Bad Request** または **422 Unprocessable Entity** が返る。エラーメッセージに「Cannot change status from terminal state '終状態'」が含まれる |
| 2 | — | `PATCH .../transitions/error-tr/status` に `status=3`（IN_PROGRESS）を送信する | **400 Bad Request** が返る。エラーメッセージに「Cannot change status from terminal state '異常終了状態'」が含まれる |
| 3 | — | `PATCH .../transitions/completed-tr/status` に `status=5`（COMPLETED）を送信する | **200 OK** が返る（自己遷移は許可: `ALLOWED_TRANSITIONS[5] = [5]`）|

### 確認ポイント

- [ ] 終状態（COMPLETED=5）→ 他ステータスは API レベルで拒否される
- [ ] 異常終了状態（ERROR=6）→ 他ステータスは API レベルで拒否される
- [ ] 終端状態への自己遷移（終状態→5、異常終了状態→6）は許可される
- [ ] エラーレスポンスに `InvalidStatusTransitionError` メッセージが含まれる

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-TR-06：不正な遷移拒否（ALLOWED_TRANSITIONS 制約確認）

### 概要

`ALLOWED_TRANSITIONS` で許可されていない遷移を API に送信すると正しくエラーが返ることを確認する。

### 前提条件

- DB に各テスト用ステータスのトランジションが存在すること

### 操作手順

| # | 遷移元ステータス | 試行する遷移先 | 期待結果 |
|---|--------------|-------------|----------|
| 1 | INITIAL(0) | PAUSED(4) | **400 Bad Request**（INITIAL → PAUSED は不可: `ALLOWED_TRANSITIONS[0]` に 4 が含まれない）|
| 2 | PREPARING(1) | IN_PROGRESS(3) | **400 Bad Request**（PREPARING → IN_PROGRESS は不可: `ALLOWED_TRANSITIONS[1]` に 3 が含まれない）|
| 3 | PREPARING(1) | INITIAL(0) | **400 Bad Request**（PREPARING → INITIAL は不可）|
| 4 | READY(2) | PAUSED(4) | **400 Bad Request**（READY → PAUSED は不可）|
| 5 | PAUSED(4) | INITIAL(0) | **400 Bad Request**（PAUSED → INITIAL は不可）|
| 6 | PAUSED(4) | PREPARING(1) | **400 Bad Request**（PAUSED → PREPARING は不可）|
| 7 | PREPARING(1) | READY(2) | **200 OK**（正常遷移の確認）|
| 8 | READY(2) | IN_PROGRESS(3) | **200 OK**（正常遷移の確認）|

### 確認ポイント

- [ ] 不正遷移は全て 400 または 422 が返る
- [ ] エラーメッセージに遷移元・遷移先ステータス名と許可遷移一覧が含まれる
- [ ] 正常な遷移は 200 が返る

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

---

## B-EI-09：承認ワークフロー（フェーズB予定・現在未実装）

> ⚠️ **【実施不可・未実装（フェーズB予定）】**
> 承認依頼・承認・差し戻し・強制終了の承認ワークフロー機能は、フェーズA時点では設計書・ソースに実装されていません。
> フェーズBで実装予定です。仕様が確定次第、シナリオ本文を更新してください。

### 概要（フェーズB実装予定）

実験作業者が実験結果の承認依頼を送信し、実験管理者が承認・差し戻しできる承認ワークフローの動作確認。

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（フェーズB未実装） | |

---

## シナリオ一覧サマリ

| シナリオID | タイトル | 対象ロール | ステータス |
|-----------|---------|-----------|----------|
| B-EI-01 | 実験計画指示ダイアログの基本操作・指示入力 | experiment_admin | 未実施 |
| B-EI-02 | CreatorRef / InstrumentRef / OwnerRef の設定 | experiment_admin | 未実施 |
| B-EI-03 | プロジェクト指示ダイアログの指示種別入力と指示粒度設定 | experiment_admin / experiment_worker | 未実施 |
| B-EI-04 | 一括タブ→タスクNタブへの伝播と個別編集 | experiment_admin | 未実施 |
| B-EI-05 | トランジション DnD 並べ替え | experiment_admin | 未実施 |
| B-EI-06 | 実験作業者：進捗確認タブ・フィルタ・前提チェック | experiment_worker | 未実施 |
| B-EI-07 | 実験作業者：実験記録タブ・実績値入力・トランジション完了 | experiment_worker | 未実施 |
| B-EI-08 | 差異表示・確信度ボタン・定量評価入力 | experiment_worker | 未実施 |
| B-EI-06 | 実験作業者：進捗確認タブ・フィルタ・前提チェック | experiment_worker | 未実施 |
| B-EI-07 | 実験作業者：実験記録タブ・実績値入力・トランジション完了 | experiment_worker | 未実施 |
| B-EI-08 | 差異表示・確信度ボタン・定量評価入力 | experiment_worker | 未実施 |
| B-EI-09 | 承認ワークフロー（フェーズB予定・現在未実装） | experiment_worker / experiment_admin | 実施不可（フェーズB未実装）|
| B-TR-01 | 通常フロー（INITIAL → PREPARING → READY → IN_PROGRESS → COMPLETED）| experiment_worker | 未実施 |
| B-TR-02 | 異常終了（IN_PROGRESS → ERROR）| experiment_worker | 未実施 |
| B-TR-03 | 一時停止・再開（IN_PROGRESS → PAUSED → IN_PROGRESS）| experiment_worker | 未実施 |
| B-TR-04 | 作業中切り替え（IN_PROGRESS → INITIAL → PREPARING）| experiment_worker | 未実施 |
| B-TR-05 | 終端状態からの遷移拒否（COMPLETED/ERROR は変更不可）| API テスト | 未実施 |
| B-TR-06 | 不正な遷移拒否（ALLOWED_TRANSITIONS 制約確認）| API テスト | 未実施 |

