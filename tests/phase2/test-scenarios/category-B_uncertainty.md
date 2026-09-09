# 分類B シナリオテスト ― 不確かさ（Uncertainty）記録機能

**作成日**: 2026-08-19
**更新日**: 2026-09-09
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
| 16 | experiment_admin | いずれか1件の「デフォルト」ラジオボタンを選択する | 選択した行がデフォルト選択肢として設定される（※現在ラジオボタンは廃止のため操作不可） |
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
| 09/09 | 佐藤 | NG | ステップ2 No.10：保存ボタン押下時のメッセージが想定と異なる https://soft-service.atlassian.net/browse/AISOLMAIML-359?atlOrigin=eyJpIjoiZmI3ZWZhZjQyZWZhNDU5YmJkZDFmMTAwMmViYmE2ZmMiLCJwIjoiaiJ9 / ステップ2 No.15：選択肢が2件以上あると保存に失敗する https://soft-service.atlassian.net/browse/AISOLMAIML-361?atlOrigin=eyJpIjoiYjZhMzFjMDM3ZDFjNGY4Zjg1Mjk3ZTEyMzY0ZDFiNDAiLCJwIjoiaiJ9 |

---

## B-UC-02：継承元設定・Globalノード参照

### 概要

不確かさ基準作成時に「参照元不確かさ基準」（`inheritanceUncertaintyKey`）を設定すると、継承元の詳細が評価方式設定フィールドに自動填入されることを確認する。また、ツリーで Global ノードを選択したときに右ペインが `GlobalNamespaceView`（viewOnly）に切り替わることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| コンポーネント | `UncertaintyCreateModal.tsx` / `UncertaintyManagement.tsx` / `GlobalNamespaceView.tsx` |
| API | `GET /api/v1/uncertainty-criteria/:uncertaintyKey?version=:version`（継承元詳細取得）|

### 前提条件

- `experiment_admin` としてログイン済み
- B-UC-01 で作成した `thermo-uc-001`（V1、定量評価）が不確かさ基準一覧に存在すること
- 名前空間管理の namespace_term に `thermo-uc-002`（表示名「温度不確かさ基準2」）が登録済みであること（継承先 Key として使用）

### 操作手順

#### ステップ 1：Global ノード選択時の右ペイン確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 名前空間管理を開き、ツリーで「🌐 Global」ノードを選択する | 右ペインのタブバー（Prefix / 用語管理 / 不確かさ基準）が非表示になり、`GlobalNamespaceView`（`viewOnly=true`）が全面表示される |
| 2 | — | Global ビューの内容を確認する | グローバル Prefix 一覧（名称・URI）が表示される |
| 3 | experiment_admin | ツリーで組織配下のノードを選択し直す | タブバー（Prefix / 用語管理 / 不確かさ基準）が再表示される |

> **注意**: `ns-maiml` / `ns-xsi` ノードを選択した場合も同様に `GlobalNamespaceView` が表示される（`isGlobalNodeSelected` 判定）。

#### ステップ 2：継承元を設定した新規作成

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | 「不確かさ基準」タブ → 「＋ 新規作成」を開く | `UncertaintyCreateModal`（幅900px）が開く |
| 5 | experiment_admin | 「参照元不確かさ基準」プルダウンを開く | 既存の不確かさ基準が「基準名（上段・太字） + Key（下段・灰色）」の2段表示で選択肢に表示されている |
| 6 | experiment_admin | `thermo-uc-001` を選択する | 最新バージョンの詳細（`fetchUncertaintyCriteriaDetail`）が取得され、以下のフィールドがフォームに自動填入される：評価方式（定量/定性）・xsi:type・units・scaleFactor・formatString・**toleranceUpper（許容上限値）**・**toleranceLower（許容下限値）**・定性オプション（定性の場合） |
| 7 | experiment_admin | 「Key属性設定」プルダウンで `thermo-uc-002` を選択し、「保存」ボタンを押す | `inheritanceUncertaintyKey: thermo-uc-001`、`uncertaintyKey: thermo-uc-002` でDBに保存され、成功トーストが表示される |
| 8 | — | ブラウザの開発者ツール（Network タブ）で保存リクエストを確認する | `POST /api/v1/uncertainty-criteria` のリクエストボディに `"inheritanceUncertaintyKey": "thermo-uc-001"` が含まれている |

> **実装メモ**: 継承元（`inheritanceUncertaintyKey`）は現バージョンの `UncertaintyDetailModal` 画面には表示フィールドが存在しない。保存時に DB へ保持されるが UI 上での確認は Network タブを使用すること。

### 確認ポイント

- [ ] Global ノード（`global` / `ns-maiml` / `ns-xsi`）選択時はタブバーが非表示になり `GlobalNamespaceView`（`viewOnly=true`）が表示される
- [ ] 組織ノードに戻ると Prefix / 用語管理 / 不確かさ基準のタブバーが再表示される
- [ ] 参照元選択後、`fetchUncertaintyCriteriaDetail` が呼ばれて評価方式設定（xsiType / units / scaleFactor / formatString / toleranceUpper / toleranceLower）が自動填入される
- [ ] 定性評価の継承元を選択した場合は定性オプション（選択肢・色）も自動填入される
- [ ] 保存リクエストの `inheritanceUncertaintyKey` に選択した継承元キーがセットされている（Network タブで確認）
- [ ] 現バージョンの `UncertaintyDetailModal` には「参照元不確かさ基準」の表示フィールドは存在しない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 09/09 | 佐藤 | OK | |

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
| 2 | — | モーダルの構成を確認する | 「Key属性設定」「不確かさ基準名」「説明文」「評価方式設定」に加え、バージョン管理セクション（有効/廃止スイッチ、バージョン差分プレビューボタン）が表示されている。**※現在の実装**: セクション1「基本情報」（Key属性設定 / 不確かさ基準名 / 説明文 / 有効・廃止スイッチ）、セクション2「評価方式設定」の2セクション構成。独立した「バージョン管理セクション」は存在せず、有効/廃止スイッチはセクション1末尾に、バージョン差分プレビューボタンはモーダルフッターのボタン行（閉じる / 🔍バージョン差分プレビュー / 保存）に配置されている |

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
| 09/09 | 佐藤 | OK | |

---

## B-UC-04：実験指示タブの一覧確認・フィルタ・列切り替え（実施不要）

### 概要

実験管理者がプロジェクト管理画面の「実験指示確認」タブ（`task_results`）（`ExperimentInstructionTab`）を開き、フィルタ・列切り替え・訂正モード・実験指示編集・ペトリネット表示が動作することを確認する。`experiment_worker` はこのタブにアクセスできないことも確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` |
| コンポーネント | `ExperimentInstructionTab.tsx` / `ExperimentPlanDialog.tsx` / `ViewRendererDialog.tsx` |
| API | `GET /api/v1/projects/:projectId/experiment-instructions` / `GET /api/v1/projects/:projectId/methods` |

### 前提条件

- `experiment_admin` としてログイン済み
- `proj-test-001` が存在し、メソッド・タスク・トランジションが設定済みであること
- `proj-test-001` にタスクステータスが「レビュー待ち（04）」のタスクが1件以上存在すること（訂正モード確認用）

### 操作手順

#### ステップ 1：実験指示タブの表示確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | プロジェクト管理画面 → `proj-test-001` を選択する | プロジェクト詳細画面が表示される |
| 2 | experiment_admin | 「実験指示確認」タブ（`task_results`）を選択する | `ExperimentInstructionTab` が表示される |
| 3 | — | フィルタバーを確認する | 🔍アイコン + タスクNo（幅70px）/ メソッドID（幅200px）/ トランジション（幅160px）/ テンプレート（幅190px）/ Key（幅160px）の各 Select フィルターと `{絞り込み件数}/{全件}行` テキストが表示されている |
| 4 | — | ツールバーを確認する | 「実験指示を編集」（EditOutlined）/ 「ペトリネット表示」（FileSearchOutlined）/ 「列選択」（SettingOutlined）/ 「承認処理」（CheckCircleOutlined, primary）/ 「訂正」（EditOutlined）の5ボタンが表示されている |
| 5 | — | テーブルの固定列を確認する | `#No`（タスクNo）と `Key` の2列が常時表示されている（非表示不可） |

#### ステップ 2：フィルタ操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 6 | experiment_admin | タスクNo フィルターで「1」を選択する | タスクNo が 1 の行のみ表示される。フィルターバー右端の件数表示が変化する |
| 7 | experiment_admin | メソッドID フィルターを選択してさらに絞り込む | 対象メソッドの行のみ表示される |
| 8 | experiment_admin | 各フィルターの「×」（allowClear）をクリックして全クリアする | 全行が再表示される |

#### ステップ 3：列の表示切り替え

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 「列選択」（SettingOutlined）ドロップダウンを開く | 切替可能な17列のチェックリストが表示される：`taskStatus` / `methodName` / `transitionName` / `templateName` / `xsiType` / `expected` / `expectedAverage` / `actual` / `actualAverage` / `diff` / `qualitativeCriteriaName` / `qualitativeAssignedValue` / `quantitativeCriteriaName` / `quantitativeTolerance` / `quantitativeRecordedValue` / `quantitativeJudgeResult` / `experimentUser` |
| 10 | experiment_admin | `quantitativeCriteriaName` / `quantitativeTolerance` / `quantitativeJudgeResult` のチェックを外す | 3列がテーブルから非表示になる |
| 11 | experiment_admin | ドロップダウンを閉じ、非表示にした列がテーブルにないことを確認する | 選択を外した3列が表示されていない |
| 12 | experiment_admin | 「列選択」ドロップダウンを再度開き、外したチェックを戻す | 3列が再表示される |

#### ステップ 4：実験指示の編集・ペトリネット表示

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 13 | experiment_admin | 「実験指示を編集」ボタンを押す | `ExperimentPlanDialog` が開く |
| 14 | experiment_admin | `ExperimentPlanDialog` を閉じる | 実験指示タブに戻る |
| 15 | experiment_admin | 「ペトリネット表示」ボタンを押す | `ViewRendererDialog`（ペトリネットビューア、フローティング）が開く |
| 16 | experiment_admin | `ViewRendererDialog` を閉じる | ビューアウィンドウが消える |

#### ステップ 5：訂正モードの動作確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 17 | experiment_admin | ツールバーの「訂正」ボタンを押す | 訂正モードが開始される。ツールバーが「保存」（primary）・「キャンセル」の2ボタンのみに切り替わる |
| 18 | — | テーブルを確認する | タスクステータスが「レビュー待ち（04）」の行の `actual`（実績値）列が `Input` フィールドに切り替わっている。他ステータスの行は通常表示のまま |
| 19 | experiment_admin | レビュー待ち行の `actual` Input に新しい値を入力する | フィールドの値が変化する |
| 20 | experiment_admin | 「キャンセル」ボタンを押す | 訂正モードが終了し、入力した値が破棄される。ツールバーが通常モードの5ボタンに戻る |
| 21 | experiment_admin | 再度「訂正」ボタンを押して値を変更し、「保存」ボタンを押す | `PATCH /api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/correct` が呼ばれ、成功メッセージが表示される。訂正モードが終了し、テーブルが最新データで更新される |

#### ステップ 6：experiment_worker のアクセス不可確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 22 | experiment_worker | `worker@test.example` でログインし、プロジェクト管理画面を開く | 「実験指示確認（task_results）」タブが表示されないか、アクセスが制限されている |

### 確認ポイント

- [ ] フィルターの各 Select にはそのカラムのユニーク値が選択肢として表示される
- [ ] フィルターバー右端に `{絞り込み件数}/{全件}行` が表示される
- [ ] 固定列は `taskNumber`（#No）と `propKey`（Key）の2列のみ（非表示不可）
- [ ] タスクステータスは Tag で色分け表示される（`'01'` default / `'02'``'03'` processing / `'04'` warning / `'05'` success / `'06'` error）
- [ ] 「列選択」でトグル可能な列は17列（`taskStatus`〜`experimentUser`）
- [ ] 訂正モード中はツールバーが「保存」「キャンセル」の2ボタンのみになり、通常ボタンは非表示
- [ ] 訂正対象は `taskStatus='04'`（レビュー待ち）の行の `actual` 列のみ
- [ ] 訂正保存後はテーブルが自動更新（`fetchData()` 再実行）される
- [ ] `experiment_worker` はこのタブにアクセスできない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不要 | `4_experiment_admin.md` の 4-6 と重複した内容のため |

---

## B-UC-05：実験指示タブからの承認処理（承認・NG）（実施不要）

### 概要

実験管理者が `ExperimentInstructionTab` のツールバー「承認処理」ボタンから一括承認ダイアログを開き、タスクの承認と NG（差し戻し）を実行できることを確認する。また、テーブル行の操作列から単体承認・単体NG操作も行えることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` |
| コンポーネント | `ExperimentInstructionTab.tsx`（承認処理ダイアログ・単体承認モーダル・NGモーダル）|
| API | `PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve` |
| API | `PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng` |

### 前提条件

- `experiment_admin` としてログイン済み
- `proj-test-001` にタスクステータスが「レビュー待ち（04）」のタスクが2件以上存在すること（一括・単体それぞれ確認用）

### 操作手順

#### ステップ 1：一括承認ダイアログを開く

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験指示タブ → ツールバーの「承認処理」（CheckCircleOutlined, primary）ボタンを押す | 一括承認ダイアログ（幅480px）が開く。選択状態がリセットされた状態で表示される |
| 2 | — | ダイアログの構成を確認する | メソッド選択 Select / タスク番号選択 Select / 操作 Radio（承認 / NG）が表示されている |
| 3 | — | 「実行」ボタンの状態を確認する | タスクキー未選択時は「実行」ボタンが disabled になっている |

> **注意**: 「承認処理」ボタン自体は `reviewWaitingTasks.length === 0`（レビュー待ちタスクが0件）/ `!isEditable` / `isProjectCompleted` / `isCheckoutLocked` のいずれかの場合は disabled になる。

#### ステップ 2：一括承認操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | メソッド選択で対象メソッドを選択する | タスク番号の選択肢が絞り込まれる |
| 5 | experiment_admin | タスク番号選択でレビュー待ちタスクを選択する | 「実行」ボタンが活性化される |
| 6 | experiment_admin | 操作 Radio で「承認」を選択したまま（デフォルト）にする | NG理由入力欄が表示されていないことを確認する |
| 7 | experiment_admin | 「実行」ボタンを押す | `PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve` が呼ばれ、`message.success`（タスク番号入り）が表示される。ダイアログが閉じてテーブルが更新される |
| 8 | — | 一覧テーブルで該当タスクのステータスを確認する | タスクステータスが「完了（05）」（success Tag）に更新されている |

#### ステップ 3：一括NG（差し戻し）操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 「承認処理」ボタンを押してダイアログを再度開く | 選択状態がリセットされた状態でダイアログが開く |
| 10 | experiment_admin | メソッドとタスク番号を選択し、操作 Radio で「NG」を選択する | NG理由入力 TextArea（rows:3, maxLength:500）が表示される |
| 11 | experiment_admin | NG理由入力欄を空のまま「実行」ボタンを押す | フォームバリデーションではなく `message.warning`（NG理由必須の警告）が表示される。ダイアログは閉じない |
| 12 | experiment_admin | NG理由 TextArea に理由を入力する（例：「測定値が許容範囲外。再測定してください。」） | テキストが入力される |
| 13 | experiment_admin | 「実行」ボタンを押す | `PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng` が呼ばれ、`message.warning`（タスク番号入りのNG記録メッセージ）が表示される。ダイアログが閉じてテーブルが更新される |
| 14 | — | 一覧テーブルで該当タスクのステータスを確認する | タスクステータスが「NG（06）」（error Tag）に更新されている |

#### ステップ 4：バリデーション・キャンセル操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 15 | experiment_admin | 「承認処理」ダイアログを開き、タスクキー未選択のまま「実行」を押す | `message.warning`（タスク未選択の警告）が表示される。ダイアログは閉じない |
| 16 | experiment_admin | 「キャンセル」ボタンを押す | ダイアログが閉じる。タスクステータスは変化しない |

#### ステップ 5：テーブル行からの単体承認・NG操作

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 17 | experiment_admin | テーブルのレビュー待ち（04）行の操作列「承認」ボタンを押す | 単体承認確認モーダルが開く（タスク番号・メソッド名が表示される） |
| 18 | experiment_admin | 確認モーダルの「OK」ボタンを押す | 承認 API が呼ばれ、`message.success` が表示される。テーブルが更新される |
| 19 | experiment_admin | 別のレビュー待ち行の操作列「NG」ボタンを押す | NG記録モーダルが開く（NG理由 TextArea が表示される。OKボタンは danger スタイル） |
| 20 | experiment_admin | NG理由を入力して「OK（danger）」ボタンを押す | NG記録 API が呼ばれ、`message.warning` が表示される。テーブルが更新される |

### 確認ポイント

- [ ] 「承認処理」ボタンはレビュー待ちタスクが0件の場合は disabled
- [ ] 一括ダイアログのタスクキー未選択時は `message.warning` 警告が出る（「実行」ボタンは押せるが警告のみ）
- [ ] NG選択かつ理由が空の場合は `message.warning` 警告が出る（フォームバリデーションエラーではない）
- [ ] NG記録成功時のトーストは `message.warning`（承認成功時は `message.success` と異なる）
- [ ] 承認後のタスクステータスは「完了（05）」/ NG後は「NG（06）」
- [ ] 単体承認モーダルはタスク番号・メソッド名を含む確認内容が表示される
- [ ] 単体NGモーダルの「OK」ボタンは danger スタイル
- [ ] 承認/NG操作後は `fetchData()` が再実行されてテーブルが自動更新される
- [ ] このタブは `experiment_worker` からアクセスできない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | 実施不要 | `4_experiment_admin.md` の 4-6 と重複した内容のため |

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
| | | | **※実際のファイル形式は CSV ではなく XML または JSON** |

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
- [ ] エクスポートのファイル形式は XML または JSON（CSV 形式ではない）
- [ ] CSVインポート後、モーダルを閉じても一覧は自動更新されない（ページリロードが必要）
- [ ] 評価方式フィルター（定量/定性）・状態フィルター（有効/廃止）・フリーテキスト検索が複合動作する

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 09/09 | 佐藤 | NG | ステップ 2：選択行のCSVエクスポート → エクスポート機能未実装 https://soft-service.atlassian.net/browse/AISOLMAIML-371?atlOrigin=eyJpIjoiZGM1ODYyOTM1M2QwNDkwNWEyNTYwMmE4OGJiZDQxZjAiLCJwIjoiaiJ9 / ステップ 4：CSVインポート後の自動更新なし確認 → インポート機能未実装 https://soft-service.atlassian.net/browse/AISOLMAIML-373?atlOrigin=eyJpIjoiZTk1ODEzNDA0YjBmNDE0NDhhZjQyYzY4NDdiNGU1ODMiLCJwIjoiaiJ9 |

---

## シナリオ一覧サマリ

| シナリオID | タイトル | 対象ロール | ステータス |
|-----------|---------|-----------|----------|
| B-UC-01 | 不確かさ基準の新規作成（Key選択・定量/定性設定） | experiment_admin | NG |
| B-UC-02 | 継承元設定・Globalノード参照 | experiment_admin | OK |
| B-UC-03 | 不確かさ基準の編集・廃止・バージョン差分確認 | experiment_admin | OK |
| B-UC-04 | 実験指示タブの一覧確認・フィルタ・列切り替え | experiment_admin | 実施不要 |
| B-UC-05 | 実験指示タブからの承認処理（承認・NG） | experiment_admin | 実施不要 |
| B-UC-06 | CSVインポート・エクスポート（不確かさ基準） | experiment_admin | NG |
