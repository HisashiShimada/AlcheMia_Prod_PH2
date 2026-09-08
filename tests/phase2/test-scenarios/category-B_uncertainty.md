# 分類B シナリオテスト ― 不確かさ（Uncertainty）記録機能

**作成日**: 2026-08-19
**更新日**: 2026-09-08
**作成者**: SSV
**対象機能**: 不確かさ（Uncertainty）記録機能
**前提資料**:
- UI設計書: `docs/design/ui/experiment_admin/04_namespace_management/ui_uncertainty_criteria_management.md`
- UI設計書: `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md`
- ソース: `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
- ソース: `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx`
- ソース: `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx`
- ソース: `frontend/src/components/uncertainty/UncertaintyListTable.tsx`
- ソース: `frontend/src/components/project/ExperimentInstructionTab.tsx`

> **注意**: `ui_uncertainty_approval_tab.md` はドキュメント内に「古いバージョン・参考にしないこと」の警告があるため参照していません。

---

## 目次

- [テスト実施の前提](#テスト実施の前提)
- [B-UC-01：不確かさ基準の新規作成（Key選択・定量/定性設定）](#b-uc-01不確かさ基準の新規作成key選択定量定性設定)
- [B-UC-02：継承元設定・Globalノード参照](#b-uc-02継承元設定globalノード参照)
- [B-UC-03：不確かさ基準の編集・廃止・バージョン差分確認](#b-uc-03不確かさ基準の編集廃止バージョン差分確認)
- [B-UC-04：実験指示タブの一覧確認・フィルタ・列切り替え](#b-uc-04実験指示タブの一覧確認フィルタ列切り替え)
- [B-UC-05：実験指示タブからの承認処理（承認・NG）](#b-uc-05実験指示タブからの承認処理承認ng)
- [B-UC-06：CSVインポート・エクスポート（不確かさ基準）](#b-uc-06csvインポートエクスポート不確かさ基準)

---

## テスト実施の前提

### 共通前提データ

| 項目 | 値 |
|------|-----|
| テスト環境 | ローカル Docker 環境（`docker-compose.yml`） |
| テストデータ格納場所 | `tests/phase2/fixtures/testdata/` |
| プロジェクト | `proj-test-001`（テスト用プロジェクト） |
| namespace_term | `thermo-uc-001`（表示名「温度不確かさ基準」）/ `obs-qual-001`（表示名「観察者評価基準」）が名前空間管理に登録済み |

### テストアカウント一覧

| ロール | メールアドレス | 備考 |
|--------|-------------|------|
| experiment_admin | `admin@test.example` | 実験管理者 |
| experiment_worker | `worker@test.example` | 実験作業者（`proj-test-001` の担当者）|

### テスト結果記録欄（共通フォーマット）

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | | |

---

## B-UC-01：不確かさ基準の新規作成（Key選択・定量/定性設定）

### 概要

実験管理者が `UncertaintyManagement`（名前空間管理画面）の「不確かさ基準」タブから `UncertaintyCreateModal` を開き、定量・定性それぞれの不確かさ基準を新規作成できることを確認する。Key は既存の `namespace_term` からプルダウン選択し、基準名・説明文は自動填入されることも確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_uncertainty_criteria_management.md` |
| コンポーネント | `UncertaintyManagement.tsx` / `UncertaintyCreateModal.tsx` / `QualitativeOptionEditor.tsx` |
| API | `POST /api/v1/uncertainty-criteria` |

### 前提条件

- `experiment_admin` としてログイン済み
- 名前空間管理の namespace_term に `thermo-uc-001`（表示名「温度不確かさ基準」）が登録済みであること
- 名前空間管理の namespace_term に `obs-qual-001`（表示名「観察者評価基準」）が登録済みであること

### 操作手順

#### ステップ 1：不確かさ基準タブへの遷移

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験管理者メニュー → 「名前空間管理」タブを開く | 名前空間ツリー（Global / 組織 / Personal）が左ペインに表示される |
| 2 | experiment_admin | ツリーで組織配下のいずれかのノードを選択する | 右ペインにタブバー（Prefix / 用語管理 / **不確かさ基準**）が表示される |
| 3 | experiment_admin | 「不確かさ基準」タブをクリックする | `UncertaintyListTable` と上部ツールバーが表示される（評価方式フィルター / 状態フィルター / 検索欄 / インポート / エクスポート / ＋新規作成）|

#### ステップ 2：定量評価基準の新規作成

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | ツールバーの「＋ 新規作成」ボタンを押す | `UncertaintyCreateModal`（幅900px）が開く |
| 5 | — | モーダルの構成を確認する | セクション1「基本情報」（参照元不確かさ基準 / Key属性設定 / 不確かさ基準名 / 説明文）とセクション2「評価方式設定」（Segmented: 定量/定性）が表示されている |
| 6 | experiment_admin | 「参照元不確かさ基準」フィールドは空のまま（任意項目）にする | — |
| 7 | experiment_admin | 「Key属性設定」プルダウンで `thermo-uc-001` を選択する | 「不確かさ基準名」フィールドに「温度不確かさ基準」が自動填入される（読み取り専用）。「説明文」フィールドも連動して自動填入される（読み取り専用）|
| 8 | experiment_admin | 評価方式 Segmented で「定量」が選択されていることを確認する | xsi:type（`doubleType` デフォルト）/ units / formatString / scaleFactor の4フィールドが表示されている |
| 9 | experiment_admin | xsi:type を `doubleType`、units に `℃`、scaleFactor に `1` を入力する | 各フィールドに値が入力される |
| 10 | experiment_admin | 「保存」ボタンを押す | 成功トーストに保存バージョン（例：「V1 として保存しました」）が表示され、一覧に `thermo-uc-001` が追加される |

#### ステップ 3：定性評価基準の新規作成

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 11 | experiment_admin | 「＋ 新規作成」ボタンを押す | `UncertaintyCreateModal` が開く |
| 12 | experiment_admin | 「Key属性設定」プルダウンで `obs-qual-001` を選択する | 「観察者評価基準」が基準名に自動填入される |
| 13 | experiment_admin | 評価方式 Segmented で「定性」を選択する | xsi:type 等の定量フィールドが非表示になり、`QualitativeOptionEditor`（選択肢エディタ）が表示される |
| 14 | experiment_admin | デフォルトで表示されている選択肢行に値「良好」と色を設定する | 行に値と色が入力される |
| 15 | experiment_admin | 選択肢をさらに2件追加し（「普通」「要注意」）、それぞれ色を設定する | 3件の選択肢行が表示される |
| 16 | experiment_admin | いずれか1件の「デフォルト」ラジオボタンを選択する | 選択した行がデフォルト選択肢として設定される |
| 17 | experiment_admin | 「保存」ボタンを押す | 成功トーストが表示され、一覧に `obs-qual-001` が追加される |

#### ステップ 4：バリデーション確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 18 | experiment_admin | 「＋ 新規作成」を開き、Key属性設定を未選択のまま「保存」を押す | 「Key属性設定は必須です」のバリデーションエラーが表示され、保存がブロックされる |

### 確認ポイント

- [ ] 「Key属性設定」は既存 namespace_term からの Select（必須）であり、手入力できない
- [ ] Key を選択すると「不確かさ基準名」「説明文」が読み取り専用で自動填入される
- [ ] 評価方式「定量」選択時は xsi:type / units / formatString / scaleFactor の4フィールドが表示される
- [ ] 評価方式「定性」選択時は `QualitativeOptionEditor`（選択肢・色・デフォルト設定）が表示される
- [ ] 保存成功後、`fetchUncertaintyCriteriaList` が再実行されて一覧が自動更新される
- [ ] `experiment_worker` ロールでは「不確かさ基準」タブ自体が表示されない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-UC-02：継承元設定・Globalノード参照

> ⚠️ **【実施不可・仕様変更予定】**
> このシナリオは仕様変更が予定されているため、現時点での実施は不可です。
> 仕様が確定次第、シナリオ本文を更新してください。

### 概要

不確かさ基準作成時に「参照元不確かさ基準」（`inheritanceUncertaintyKey`）を設定すると、継承元の詳細が自動填入されることを確認する。また、ツリーで Global ノードを選択したときに右ペインが `GlobalNamespaceView`（viewOnly）に切り替わることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `UncertaintyCreateModal.tsx` / `UncertaintyManagement.tsx` / `GlobalNamespaceView.tsx` |
| API | `GET /api/v1/uncertainty-criteria/:uncertaintyKey?version=:version`（継承元詳細取得）|

### 前提条件

- `experiment_admin` としてログイン済み
- B-UC-01 で作成した `thermo-uc-001`（V1）が不確かさ基準一覧に存在すること

### 操作手順

#### ステップ 1：Global ノード選択時の右ペイン確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 名前空間管理を開き、ツリーで「🌐 Global」ノードを選択する | 右ペインのタブバーが非表示になり、`GlobalNamespaceView`（`viewOnly=true`）が全面表示される |
| 2 | — | Global ビューの内容を確認する | グローバル Prefix 一覧（名称・URI）が表示される |
| 3 | experiment_admin | ツリーで組織配下のノードを選択し直す | タブバー（Prefix / 用語管理 / 不確かさ基準）が再表示される |

#### ステップ 2：継承元を設定した新規作成

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | 「不確かさ基準」タブ → 「＋ 新規作成」を開く | `UncertaintyCreateModal` が開く |
| 5 | experiment_admin | 「参照元不確かさ基準」プルダウンを開く | 既存の不確かさ基準（基準名 + Key が2段表示）が選択肢に表示されている |
| 6 | experiment_admin | `thermo-uc-001` を選択する | 最新バージョンの詳細（`fetchUncertaintyCriteriaDetail`）が取得され、評価方式・xsi:type・units・scaleFactor・formatString・定性オプションがフォームに自動填入される |
| 7 | experiment_admin | 別の Key（`thermo-uc-002` など）を「Key属性設定」で選択し、保存する | `inheritanceUncertaintyKey: thermo-uc-001`、`uncertaintyKey: thermo-uc-002` で登録される |
| 8 | — | `UncertaintyDetailModal` を開いて継承元の設定を確認する | 「継承元（参照元）」フィールドに `thermo-uc-001` が表示されている（※一覧テーブルに「継承元」列は存在しないため、詳細モーダルで確認する）|

### 確認ポイント

- [ ] Global ノード選択時はタブバーが非表示になり `GlobalNamespaceView`（viewOnly=true）が表示される
- [ ] 組織ノードに戻ると Prefix / 用語管理 / 不確かさ基準のタブバーが再表示される
- [ ] 参照元選択後、`fetchUncertaintyCriteriaDetail` が呼ばれて評価方式設定が自動填入される
- [ ] 継承元は `UncertaintyDetailModal` の「参照元不確かさ基準」フィールドで確認できる（一覧テーブルには「継承元」列なし）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（仕様変更待ち） | |

---

## B-UC-03：不確かさ基準の編集・廃止・バージョン差分確認

### 概要

実験管理者が `UncertaintyDetailModal` から不確かさ基準を編集（新バージョンとして保存）し、廃止（`isInvalid: true`）への変更と、`TemplateDiffPreviewModal` によるバージョン差分確認ができることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `UncertaintyDetailModal.tsx` / `TemplateDiffPreviewModal.tsx` / `UncertaintyListTable.tsx` |
| API | `PUT /api/v1/uncertainty-criteria/:key`（新バージョン保存）|

### 前提条件

- `experiment_admin` としてログイン済み
- B-UC-01 で作成した `thermo-uc-001`（V1）が一覧に存在すること

### 操作手順

#### ステップ 1：詳細モーダルを開く

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 一覧テーブルで `thermo-uc-001` 行の「編集」ボタン（EditOutlined）を押す | `UncertaintyDetailModal` が開き、現在のバージョン情報（基本情報・評価方式設定）が表示される |
| 2 | — | モーダルの構成を確認する | 「Key属性設定」「不確かさ基準名」「説明文」「評価方式設定」に加え、バージョン管理セクション（有効/廃止スイッチ、バージョン差分プレビューボタン）が表示されている |

#### ステップ 2：内容を変更して新バージョンとして保存

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 3 | experiment_admin | units を `℃` から `K` に変更する | フィールドの値が変わる |
| 4 | experiment_admin | 「保存」ボタンを押す | 新バージョン（V2）として保存され、成功トースト「V2 として保存しました」が表示される |
| 5 | — | 一覧テーブルを確認する | `thermo-uc-001` のバージョン列が `V2` に更新されている |

#### ステップ 3：廃止への変更（最新バージョンのみ可能）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 6 | experiment_admin | 一覧で `thermo-uc-001`（V2）行の「編集」ボタンを押す | `UncertaintyDetailModal` が開く（`isLatestVersion=true`）|
| 7 | experiment_admin | モーダル内の有効/廃止 Switch を「廃止」に切り替える | Switch が廃止（灰色 Tag）状態になる |
| 8 | experiment_admin | 「保存」ボタンを押す | `isInvalid: true` が送信され、一覧の状態列が `廃止`（gray Tag）に更新される |
| 9 | — | 一覧で廃止行の「編集」ボタンを確認する | 「編集」ボタンが disabled（グレーアウト）になっている |

#### ステップ 4：バージョン差分プレビュー

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_admin | 一覧で「編集」ボタンを押す | `UncertaintyDetailModal` が開く |
| 11 | experiment_admin | モーダル内の「バージョン差分プレビュー」ボタンを押す | `TemplateDiffPreviewModal` が開く |
| 12 | — | 差分プレビューの内容を確認する | のバージョン（V1）との変更箇所（units: `℃` → `K`）がハイライト表示されている |
| 13 | experiment_admin | `TemplateDiffPreviewModal` を閉じる | `UncertaintyDetailModal` に戻る |

#### ステップ 5：CSV インポート後のリロード確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 14 | experiment_admin | ツールバーの「インポート」ボタンを押す | `UncertaintyImportModal` が開く |
| 15 | experiment_admin | CSV をインポートして完了する | モーダルが閉じる |
| 16 | — | 一覧テーブルを確認する | **インポート直後は一覧が自動更新されない**（設計上の仕様）。最新データを表示するにはページリロードが必要 |

### 確認ポイント

- [ ] 編集保存は必ず新バージョンとして保存される（`saveUncertaintyCriteriaNewVersion`）
- [ ] 廃止状態のレコードは「編集」ボタンが disabled
- [ ] 廃止への変更は `isLatestVersion=true` の場合のみ有効
- [ ] 新規作成・編集保存後は `fetchUncertaintyCriteriaList` が再実行されて一覧が自動更新される
- [ ] CSV インポート後は自動再取得なし（ページリロードが必要）
- [ ] `TemplateDiffPreviewModal` で前バージョンとの差分フィールドがハイライト表示される

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## B-UC-04：実験指示タブの一覧確認・フィルタ・列切り替え

> ⚠️ **【実施不可・仕様変更予定】**
> このシナリオは仕様変更が予定されているため、現時点での実施は不可です。
> 仕様が確定次第、シナリオ本文を更新してください。

### 概要

実験管理者がプロジェクト管理画面の「実験指示（task_results）」タブ（`ExperimentInstructionTab`）を開き、フィルタ・列切り替え・実験指示編集・ペトリネット表示が動作することを確認する。`experiment_worker` はこのタブにアクセスできないことも確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md`（※旧設計書のため差異あり） |
| コンポーネント | `ExperimentInstructionTab.tsx` / `ExperimentPlanDialog.tsx` / `ViewRendererDialog.tsx` |
| API | `GET /api/v1/experiment-instructions` / `GET /api/v1/projects/:id/methods` |

### 前提条件

- `experiment_admin` としてログイン済み
- `proj-test-001` が存在し、メソッド・タスク・トランジションが設定済みであること

### 操作手順

#### ステップ 1：実験指示タブの表示確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | プロジェクト管理画面 → `proj-test-001` を選択する | プロジェクト詳細画面が表示される |
| 2 | experiment_admin | 「実験指示」タブ（`task_results`）を選択する | `ExperimentInstructionTab` が表示される |
| 3 | — | フィルタバーを確認する | タスクNo / メソッドID / トランジション名 / テンプレート名 / Key の各 Select フィルターが表示されている |
| 4 | — | ツールバーを確認する | 左: 「列リセット」テキスト、右: 「実験指示を編集」/ 「ペトリネットを表示」/ 「⚙ 列を選択 ▼」/ 「承認処理」ボタンが表示されている |
| 5 | — | テーブルの固定列を確認する | メソッド名 / タスクNo / タスクステータス（Tag）/ トランジション名 が常時表示されている |

#### ステップ 2：フィルタ操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 6 | experiment_admin | タスクNo フィルターで「1」を選択する | タスクNo が 1 の行のみ表示される |
| 7 | experiment_admin | メソッドID フィルターを選択してさらに絞り込む | 対象メソッドの行のみ表示される |
| 8 | experiment_admin | 各フィルターをクリアする | 全行が再表示される |

#### ステップ 3：列の表示切り替え

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 「⚙ 列を選択 ▼」ドロップダウンを開く | トグル可能な列一覧（templateName / xsiType / expected / expectedAverage / actual / actualAverage / diff / uncertaintyCriteriaName / uncertaintyAssignedValue / uncertaintyAssignedBy / uncertaintyAssignedAt / uncertaintyComment）が表示される |
| 10 | experiment_admin | `uncertaintyCriteriaName` / `uncertaintyAssignedValue` / `uncertaintyComment` をオンにする | 3列がテーブルに追加表示される |
| 11 | experiment_admin | 「列リセット」テキストをクリックする | 表示列が既定値に戻る |

#### ステップ 4：実験指示の編集・ペトリネット表示

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | experiment_admin | 「実験指示を編集」ボタンを押す | `ExperimentPlanDialog` が開く |
| 13 | experiment_admin | `ExperimentPlanDialog` を閉じる | 実験指示タブに戻る |
| 14 | experiment_admin | 「ペトリネットを表示」ボタンを押す | `ViewRendererDialog`（ペトリネットビューア）が開く |

#### ステップ 5：experiment_worker のアクセス不可確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 15 | experiment_worker | `worker@test.example` でログインし、プロジェクト管理画面を開く | 「実験指示（task_results）」タブが表示されないか、アクセスが制限されている |

### 確認ポイント

- [ ] フィルターの各 Select にはそのカラムのユニーク値が選択肢として表示される
- [ ] タスクステータスは Tag で色分け表示される（waiting: default / inProgress: processing / reviewWaiting: warning / completed: success / ng: error）
- [ ] 「列を選択」でトグル可能な12列（templateName〜uncertaintyComment）が制御できる
- [ ] `experiment_worker` はこのタブにアクセスできない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（仕様変更待ち） | |

---

## B-UC-05：実験指示タブからの承認処理（承認・NG）

> ⚠️ **【実施不可・仕様変更予定】**
> このシナリオは仕様変更が予定されているため、現時点での実施は不可です。
> 仕様が確定次第、シナリオ本文を更新してください。

### 概要

実験管理者が `ExperimentInstructionTab` のツールバー「承認処理」ボタンから承認・NG ダイアログを開き、タスクの承認と NG（差し戻し）を実行できることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `ExperimentInstructionTab.tsx`（承認処理 Modal）|
| API | `POST /api/v1/tasks/:taskKey/approve` / `POST /api/v1/tasks/:taskKey/ng` |

### 前提条件

- `experiment_admin` としてログイン済み
- `proj-test-001` にタスクステータスが「レビュー待ち（04）」のタスクが1件以上存在すること

### 操作手順

#### ステップ 1：承認処理ダイアログを開く

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験指示タブ → ツールバーの「承認処理」ボタンを押す | 承認処理 Modal が開く |
| 2 | — | ダイアログの構成を確認する | メソッド選択（Select 幅180px）/ タスクNo選択（Select 幅90px）/ 操作 Radio（承認=緑 / NG=赤）が表示されている |
| 3 | — | 「実行」ボタンの状態を確認する | タスクKey（タスクNo）未選択時は「実行」ボタンが disabled になっている |

#### ステップ 2：承認操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | メソッド選択で対象メソッドを選択する | タスクNo 選択が活性化される |
| 5 | experiment_admin | タスクNo 選択でレビュー待ちタスクを選択する | 「実行」ボタンが活性化される |
| 6 | experiment_admin | 操作 Radio で「承認（緑）」を選択する | NG理由入力欄が非表示のままになっている |
| 7 | experiment_admin | 「実行」ボタンを押す | 承認 API が呼ばれ、成功メッセージが表示される |
| 8 | — | 一覧テーブルで該当タスクのステータスを確認する | タスクステータスが「完了（05）」（success Tag）に更新されている |

#### ステップ 3：NG（差し戻し）操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 「承認処理」ダイアログを再度開く | ダイアログが開く |
| 10 | experiment_admin | メソッドとタスクNoを選択し、操作 Radio で「NG（赤）」を選択する | NG理由入力 TextArea（最大500文字）が表示される |
| 11 | experiment_admin | NG理由 TextArea に理由を入力する（例：「測定値が許容範囲外。再測定してください。」） | テキストが入力される |
| 12 | experiment_admin | 「実行」ボタンを押す | NG API が呼ばれ、成功メッセージが表示される |
| 13 | — | 一覧テーブルで該当タスクのステータスを確認する | タスクステータスが「NG（06）」（error Tag）に更新されている |

#### ステップ 4：キャンセル操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 14 | experiment_admin | 「承認処理」ダイアログを開いて「キャンセル」を押す | ダイアログが閉じる。タスクステータスは変化しない |

### 確認ポイント

- [ ] タスクKey（タスクNo）未選択時は「実行」ボタンが disabled
- [ ] 「承認」選択時は NG理由入力欄が非表示
- [ ] 「NG」選択時は NG理由入力 TextArea（最大500文字）が表示される
- [ ] 承認後のタスクステータスは「完了（05）」/ NG後は「NG（06）」
- [ ] このダイアログは `experiment_worker` からはアクセスできない（`ExperimentInstructionTab` 自体へのアクセス不可）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不可（仕様変更待ち） | |

---

## B-UC-06：CSVインポート・エクスポート（不確かさ基準）

### 概要

実験管理者が不確かさ基準管理タブからCSVエクスポート（選択行のみ）とCSVインポートができることを確認する。エクスポートは行選択時のみ活性になること、インポート後の一覧は自動更新されないことも確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `UncertaintyExportModal.tsx` / `UncertaintyImportModal.tsx` / `UncertaintyListTable.tsx` |

### 前提条件

- `experiment_admin` としてログイン済み
- 不確かさ基準一覧に2件以上のレコードが存在すること

### 操作手順

#### ステップ 1：エクスポートボタンの活性状態確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 不確かさ基準タブを開く | ツールバーの「エクスポート」ボタンが disabled（灰色）になっている |
| 2 | experiment_admin | テーブルのチェックボックスで1件選択する | 「エクスポート」ボタンが活性化される |

#### ステップ 2：選択行のCSVエクスポート

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 3 | experiment_admin | チェックボックスで2件を選択した状態で「エクスポート」ボタンを押す | `UncertaintyExportModal` が開く（選択件数「2件」が表示される）|
| 4 | experiment_admin | エクスポートを実行する | CSV ファイルがダウンロードされる（選択した2件のみ含まれる）|

#### ステップ 3：フィルタを組み合わせた絞り込み確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_admin | 「評価方式」フィルターで「定量」を選択する | 定量評価の基準のみ表示される |
| 6 | experiment_admin | 「状態」フィルターで「有効」を選択する | 有効な定量評価の基準のみ表示される |
| 7 | experiment_admin | 検索欄に「温度」と入力する | 基準名 / Key / 説明に「温度」を含む行のみ表示される |
| 8 | experiment_admin | 各フィルターをクリアする | 全件が再表示される |

#### ステップ 4：CSVインポート後の自動更新なし確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 「インポート」ボタンを押す | `UncertaintyImportModal` が開く |
| 10 | experiment_admin | CSV ファイルを選択してインポートを実行する | インポートが完了しモーダルが閉じる |
| 11 | — | 一覧テーブルを確認する | インポートした内容が**反映されていない**（自動再取得は行われない仕様）|
| 12 | experiment_admin | ブラウザでページをリロードする | インポートした不確かさ基準が一覧に表示される |

### 確認ポイント

- [ ] 「エクスポート」ボタンは行を1件以上チェックした場合のみ活性化する（`selectedIds.length === 0` の場合は disabled）
- [ ] エクスポートは選択行のみ対象（全件エクスポートではない）
- [ ] CSVインポート後、モーダルを閉じても一覧は自動更新されない（ページリロードが必要）
- [ ] 評価方式フィルター（定量/定性）・状態フィルター（有効/廃止）・フリーテキスト検索が複合動作する

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 未実施 | |

---

## シナリオ一覧サマリ

| シナリオID | タイトル | 対象ロール | ステータス |
|-----------|---------|-----------|----------|
| B-UC-01 | 不確かさ基準の新規作成（Key選択・定量/定性設定） | experiment_admin | 未実施 |
| B-UC-02 | 継承元設定・Globalノード参照 | experiment_admin | 実施不可（仕様変更待ち） |
| B-UC-03 | 不確かさ基準の編集・廃止・バージョン差分確認 | experiment_admin | 未実施 |
| B-UC-04 | 実験指示タブの一覧確認・フィルタ・列切り替え | experiment_admin | 実施不可（仕様変更待ち） |
| B-UC-05 | 実験指示タブからの承認処理（承認・NG） | experiment_admin | 実施不可（仕様変更待ち） |
| B-UC-06 | CSVインポート・エクスポート（不確かさ基準） | experiment_admin | 未実施 |
