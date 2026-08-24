# 分類B シナリオテスト ― 実験計画指示記入機能・実験作業者UI

**作成日**: 2026-08-19
**更新日**: 2026-08-21
**作成者**: SSV
**対象機能**: 実験計画指示記入機能・実験作業者UI
**前提資料**:
- UI設計書（管理者側）: `docs/design/ui/experiment_admin/01_project_management/ui_task_registration_tab.md`
- UI設計書（管理者側）: `docs/design/ui/experiment_admin/01_project_management/ui_experiment_plan_dialog.md`
- UI設計書（作業者側）: `docs/design/ui/experiment_worker/ui_progress_overview_tab.md`
- UI設計書（作業者側）: `docs/design/ui/experiment_worker/ui_work_record_panel.md`
- ソース: `frontend/src/components/project/TaskRegistrationTab.tsx`
- ソース: `frontend/src/components/project/ExperimentPlanDialog.tsx`
- ソース: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- ソース: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

> **フェーズ注記**: 現時点（フェーズA）はモックデータで動作しているシナリオがあります。フェーズBで実 API 接続に切り替え予定です。

---

## 目次

- [テスト実施の前提](#テスト実施の前提)
- [B-EI-01：実験計画指示ダイアログの基本操作・指示入力](#b-ei-01実験計画指示ダイアログの基本操作指示入力)
- [B-EI-02：CreatorRef / InstrumentRef / OwnerRef の設定](#b-ei-02creatorrefinstrumentrefownerref-の設定)
- [B-EI-03：プロジェクト指示ダイアログの指示種別入力と指示粒度設定](#b-ei-03プロジェクト指示ダイアログの指示種別入力と指示粒度設定)
- [B-EI-04：一括タブ→タスクNタブへの伝播と個別編集](#b-ei-04一括タブタスクnタブへの伝播と個別編集)
- [B-EI-05：トランジション DnD 並べ替え](#b-ei-05トランジション-dnd-並べ替え)
- [B-EI-06：実験作業者 ─ 進捗確認タブ・フィルタ・前提チェック](#b-ei-06実験作業者--進捗確認タブフィルタ前提チェック)
- [B-EI-07：実験作業者 ─ 作業記録パネル・実績値入力・トランジション完了](#b-ei-07実験作業者--作業記録パネル実績値入力トランジション完了)
- [B-EI-08：差異表示・確信度ボタン・定量評価入力](#b-ei-08差異表示確信度ボタン定量評価入力)
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
| 5 | experiment_admin | 「安全上の注意事項」（`mgr-instruction:caution`）を選択する | セレクトに「安全上の注意事項」が表示される |
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
| 17 | experiment_worker | 実験作業者メニュー → 「作業記録」タブを開く | `WorkRecordPanel` が表示される |
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

> ⚠️ **【実施不可・仕様変更待ち】**
> このシナリオは仕様変更が予定されており、現時点での実施は不可です。
> 仕様が確定次第、操作手順・確認ポイントを更新してから実施してください。

### 概要

実験作業者が進捗確認タブ（`ProgressOverviewTab`）でサマリーカード・フィルタバー・トランジションテーブルを確認し、前提未完了のトランジションがロックされることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_worker/ui_progress_overview_tab.md` |
| コンポーネント | `ProgressOverviewTab.tsx` / `SummaryCard`（サブコンポーネント）|

### 前提条件

- `experiment_worker` としてログイン済み
- 親コンポーネント（`ExperimentWorkerMenu`）から `rows`（ProgressRow 配列）が渡されていること
- `transition-2` の `prerequisiteTransitionIds` に `transition-1` が設定されていること

### 操作手順

#### ステップ 1：サマリーカードの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 実験作業者メニュー → 「進捗確認」タブを開く | `ProgressOverviewTab` が表示される |
| 2 | — | サマリーカードを確認する | 全体進捗バー（%）・タスク完了数・ステータス別件数（未着手/作業中/完了）が表示されている |
| 3 | — | 問題あり件数の表示を確認する | `issue` ステータス行が1件以上ある場合のみ赤色で件数表示される。0件の場合は非表示 |

#### ステップ 2：フィルタバーの操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_worker | フィルタバーの「ステータス」セレクトで「未着手」を選択する | `not_started` のトランジションのみに絞り込まれる |
| 5 | experiment_worker | 「メソッド名」フィルタで `method-A` を選択する | `method-A` のトランジションのみに絞り込まれる |
| 6 | experiment_worker | 「メソッド名」フィルタを変更する | 「トランジション名」フィルタが自動リセットされる |
| 7 | experiment_worker | 各フィルタをクリアする | 全トランジションが再表示される |

#### ステップ 3：ステータス別操作ボタンの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | — | `not_started`（前提なし）行の操作列を確認する | 「開始」ボタンが活性状態 |
| 9 | — | `in_progress` 行の操作列を確認する | 「作業へ」ボタン（primary）が表示される |
| 10 | — | `on_hold` 行の操作列を確認する | 「再開」ボタンが表示される |
| 11 | — | `completed` または `issue` 行の操作列を確認する | 「詳細確認」ボタンが表示される |

#### ステップ 4：前提未完了による開始ボタンのロック確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | — | `transition-2`（前提: `transition-1` 未完了）の操作列を確認する | 「開始」ボタンが `disabled` になり 🔒（LockOutlined・黄色）アイコンがトランジション名横に表示される |
| 13 | experiment_worker | `disabled` の「開始」ボタンにホバーする | Tooltip「前の順序のトランジションを先に完了してください」が表示される |

#### ステップ 5：レスポンシブ表示の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 14 | experiment_worker | ブラウザ幅を xl（1200px）以上に設定する | 進捗列が Material / Condition / Result の独立3列（Progress バー + rec/tot 数値）で表示される |
| 15 | experiment_worker | ブラウザ幅を xl（1200px）未満に設定する | 進捗列が「進捗」1列に統合され、`M rec/tot · C rec/tot · R rec/tot` のテキスト表示になる |

### 確認ポイント

- [ ] `canAccessTransition` ロジックは同一タスク内の前提完了のみを確認する（異なるタスク間は対象外）
- [ ] 前提未完了のトランジションは操作ボタンが `disabled`、トランジション名横に 🔒 アイコン
- [ ] レスポンシブ切り替えポイントは xl（1200px）
- [ ] ステータスは5種類：`not_started` / `in_progress` / `on_hold` / `completed` / `issue`

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（仕様変更待ち） | |

---

## B-EI-07：実験作業者 ─ 作業記録パネル・実績値入力・トランジション完了

> ⚠️ **【実施不可・仕様変更待ち】**
> このシナリオは仕様変更が予定されており、現時点での実施は不可です。
> 仕様が確定次第、操作手順・確認ポイントを更新してから実施してください。

### 概要

実験作業者が `WorkRecordPanel` でテンプレートを選択し、型に応じた入力コントロール（InputNumber / Input）で実績値を入力し、「保存して次へ」ボタンでトランジションを完了させられることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_worker/ui_work_record_panel.md` |
| コンポーネント | `WorkRecordPanel.tsx` / `PropertyCard`（サブコンポーネント）|

### 前提条件

- `experiment_worker` としてログイン済み
- 作業対象トランジション（`transition-1`）が `in_progress` 状態であること
- `transition-1` のテンプレートに `FloatValue`・`StringValue` のプロパティが存在すること

> **フェーズA注記**: 本シナリオはモックデータで動作します。「保存」は `Modal.success` 通知のみで API 保存は未実装（フェーズB予定）。

### 操作手順

#### ステップ 1：WorkRecordPanel の構成確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_worker | 実験作業者メニュー → 「作業記録」タブを開く | `WorkRecordPanel` が表示される |
| 2 | — | 左 Sider（幅280px固定）を確認する | テンプレート件数・検索 Input・種別 Select・テンプレートテーブルが表示されている |
| 3 | — | テンプレートテーブルのカラムを確認する | テンプレート名・プロパティ数・カテゴリ Tag（Materials=緑/Conditions=青/Results=紫）・I/O Tag が表示される |
| 4 | — | WorkHeader を確認する | ステータス Tag・タスク#・メソッドID（Tooltip付き省略）・トランジションID（Tooltip付き省略）が表示される |

#### ステップ 2：テンプレート選択と型対応コントロールの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_worker | 左 Sider で `Condition-Mixing` テンプレート行をクリックする | 右コンテンツに PropertyCard グリッド（3列）が表示される |
| 6 | — | `FloatValue` プロパティの入力コントロールを確認する | `InputNumber`（数値入力）が表示され、単位ラベルが横に表示されている |
| 7 | — | `IntegerValue` プロパティの入力コントロールを確認する | `InputNumber` が表示されている |
| 8 | — | `StringValue` プロパティの入力コントロールを確認する | テキスト `Input` が表示されている |
| 9 | — | 各カードの「想定値」エリアを確認する | 背景色 `#e6f7ff`（青系）で想定値 + 単位が表示されている（未設定時は「未設定」italic）|

#### ステップ 3：実績値の入力

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_worker | `temperature`（FloatValue）の InputNumber に `27.3` を入力する | 想定値 `25.0` と実績値 `27.3` が並んで表示される |
| 11 | experiment_worker | `description`（StringValue）の Input に「安定確認後開始」と入力する | テキストが入力される |
| 12 | experiment_worker | 「保存」ボタンを押す | 保存成功の `Modal.success` が表示される（フェーズA: API 未接続）|

#### ステップ 4：「保存して次へ」でテンプレート進行・トランジション完了

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 13 | — | ボタンラベルを確認する（最後のテンプレートでない場合） | 「テンプレート {current+1}/{total} へ」と表示されている |
| 14 | experiment_worker | 「保存して次へ」ボタンを押す（途中テンプレート）| 次テンプレートのインデックスに切り替わる |
| 15 | — | ボタンラベルを確認する（最後のテンプレートの場合） | 「トランジション完了・次へ」と表示されている |
| 16 | experiment_worker | 「保存して次へ（トランジション完了・次へ）」ボタンを押す | 対象トランジションが `completed` に更新され、次のトランジションが `Modal.success` で通知される |

#### ステップ 5：スキップ操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 17 | — | スキップボタンの状態を確認する（他に実行可能なトランジションあり）| スキップボタンが活性状態 |
| 18 | experiment_worker | スキップボタンを押す | 現トランジションがスキップリストに追加され、次の実行可能トランジションへ移動する |
| 19 | — | スキップボタンの状態を確認する（他に実行可能なトランジションなし）| スキップボタンが `disabled`、Tooltip「スキップできるトランジションがありません」が表示される |

#### ステップ 6：完了済みトランジションの参照閲覧

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 20 | experiment_worker | 完了済みトランジションを進捗確認タブから「詳細確認」で開く | `WorkRecordPanel` が読取専用（`isReadOnly=true`）で開く |
| 21 | — | WorkHeader を確認する | 情報アイコン付き Alert「完了済み（参照のみ）」と「作業に戻る」ボタンが表示されている |
| 22 | — | 実績値の表示を確認する | 実績値は参照表示（Input ではなく値テキスト）になっており、確信度ボタン・定量評価追加ボタンが非表示 |

### 確認ポイント

- [ ] `FloatValue`/`IntegerValue` → `InputNumber`（単位ラベル付き）
- [ ] `StringValue` → テキスト `Input`
- [ ] 「保存して次へ」は最後のテンプレート時のみトランジションを `completed` に更新する
- [ ] 完了済み閲覧時（`isReadOnly=true`）は保存ボタン群が非表示になる
- [ ] データ保存はフェーズAではモック実装（`Modal.success` 通知のみ）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（仕様変更待ち） | |

---

## B-EI-08：差異表示・確信度ボタン・定量評価入力

> ⚠️ **【実施不可・仕様変更待ち】**
> このシナリオは仕様変更が予定されており、現時点での実施は不可です。
> 仕様が確定次第、操作手順・確認ポイントを更新してから実施してください。

### 概要

実験作業者が PropertyCard で実績値入力後に差異（`calcDiff`）が表示されること、確信度ボタン（確か / 曖昧 / 不確か / OK / NG）で定性評価を選択できること、および定量評価（不確かさ基準 + 値）を追加・削除できることを確認する。

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
| B-EI-06 | 実験作業者：進捗確認タブ・フィルタ・前提チェック | experiment_worker | 実施不可（仕様変更待ち）|
| B-EI-07 | 実験作業者：作業記録パネル・実績値入力・トランジション完了 | experiment_worker | 実施不可（仕様変更待ち）|
| B-EI-08 | 差異表示・確信度ボタン・定量評価入力 | experiment_worker | 実施不可（仕様変更待ち）|
| B-EI-09 | 承認ワークフロー（フェーズB予定・現在未実装） | experiment_worker / experiment_admin | 実施不可（フェーズB未実装）|
