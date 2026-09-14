# 分類B シナリオテスト ― 名前空間管理（Namespace）

**作成日**: 2026-08-19
**更新日**: 2026-08-26（タスク: PrefixManagement共有ボタン追加・共有ダイアログツリー表示修正・UncertaintyManagement Prefix共有修正・名前空間管理多言語化対応）  
**作成者**: SSV  
**対象機能**: 名前空間管理（Namespace）  
**前提資料**:  
- 要件定義書: `docs/requirement/phase2/01_namespace/`  
- UI設計書: `docs/design/ui/experiment_admin/04_namespace_management/` / `docs/design/ui/provider/`  
- API設計書: `docs/design/api/api_namespace.md`  
- DB設計書: `docs/design/db/ddl/namespace.sql` / `namespace_term.sql` / `prefix.sql` 
- DB設計書: `docs/design/db/ddl/namespace.sql` / `namespace_term.sql` / `prefix.sql` 

---

## 目次

- [テスト実施の前提](#テスト実施の前提)
- [B-NS-01：ユーザ登録時の個人名前空間自動生成](#b-ns-01ユーザ登録時の個人名前空間自動生成)
- [B-NS-02：グローバル名前空間宣言の閲覧・インポート・エクスポート（プロバイダー）](#b-ns-02グローバル名前空間宣言の閲覧インポートエクスポートプロバイダー)
- [B-NS-03：Prefixの登録・編集・非アクティブ化・CSVエクスポート（実験管理者）](#b-ns-03prefixの登録編集非アクティブ化csvエクスポート実験管理者)
- [B-NS-04：用語の登録・編集・有効無効切替・CSVエクスポート（実験管理者）](#b-ns-04用語の登録編集有効無効切替csvエクスポート実験管理者)
- [B-NS-05：グループ追加と名前空間URI自動採番（実験管理者）](#b-ns-05グループ追加と名前空間uri自動採番実験管理者)
- [B-NS-05：グループ追加と名前空間URI自動採番（実験管理者）](#b-ns-05グループ追加と名前空間uri自動採番実験管理者)
- [B-NS-06：用語登録・編集・重複チェック（実験管理者）](#b-ns-06用語登録編集重複チェック実験管理者)
- [B-NS-07：用語の上位層共有（ロール別共有先範囲の確認）](#b-ns-07用語の上位層共有ロール別共有先範囲の確認)
- [B-NS-08：アクセス権限制御（閲覧範囲の確認）](#b-ns-08アクセス権限制御閲覧範囲の確認)
- [B-NS-09：prefix非アクティブ化・MaiML xmlns自動宣言](#b-ns-09prefix非アクティブ化maiml-xmlns自動宣言)
- [B-NS-10：UncertaintyManagement Prefix共有・名前空間管理多言語化確認](#b-ns-10uncertaintymanagement-prefix共有名前空間管理多言語化確認)

---

## テスト実施の前提

### 共通前提データ

| 項目 | 値 |
|------|-----|
| テスト環境 | ローカル Docker 環境（`docker-compose.yml`） |
| テストデータ格納場所 | `tests/phase2/fixtures/testdata/` |
| 組織 | `org-test-001`（テスト用組織） |
| グローバル Prefix | `maiml`（http://www.maiml.jp/maiml/1.0/）/ `xsi`（http://www.w3.org/2001/XMLSchema-instance）が初期登録済み |

### テストアカウント一覧

| ロール | メールアドレス | 備考 |
|--------|-------------|------|
| provider | `provider@test.example` | グローバル層管理権限 |
| system_admin | `sysadmin@test.example` | ユーザ登録権限 |
| experiment_admin（代表者） | `admin-leader@test.example` | チーム代表者フラグ ON |
| experiment_admin（一般） | `admin-general@test.example` | 代表者フラグ OFF |
| experiment_worker | `worker@test.example` | 実験作業者 |

### テスト結果記録欄（共通フォーマット）

各シナリオ末尾に以下の表を配置する。

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| | | | |

---

## B-NS-01：ユーザ登録時の個人名前空間自動生成

### 概要

システム管理者が新規ユーザを登録したとき、そのユーザ専用の個人名前空間が自動生成されることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| 要件 | F-10-01：ユーザ登録時個人名前空間自動作成機能 |
| ユースケース | UC-21：ユーザを登録する |
| 業務フロー | BF-21：ユーザを登録する |
| API | `POST /api/v1/users`（ユーザ登録時に namespace 自動作成） |

### 前提条件

- `system_admin` としてログイン済み
- 以下のメールアドレスのユーザが未登録であること
  - `new-user@test.example`

### 操作手順

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | system_admin | システム管理者メニュー → 「ユーザ管理」タブを開く | ユーザ一覧が表示される |
| 2 | system_admin | 「＋ユーザを追加」ボタンを押す | ユーザ追加ダイアログが開く |
| 3 | system_admin | メールアドレス `new-user@test.example`、氏名「新規 テスト」、ロール `experiment_admin` を入力して「登録」を押す | 「ユーザを登録しました」のメッセージが表示され、一覧に追加される |
| 4 | system_admin | `new-user@test.example` として一度ログインし直す（または DB を直接確認） | — |
| 5 | experiment_admin（new-user） | 実験管理者メニュー → 「名前空間管理」タブを開く | 名前空間ツリーの「👤 個人 (Personal)」配下に `new-user` の名前空間ノードが表示される |
| 6 | experiment_admin（new-user） | 個人名前空間ノードを選択する | 右ペインに用語リスト（空もしくは初期キー）が表示される |

### 確認ポイント

- [ ] 個人名前空間の URI が `https://組織CD.Alchemia.co.jp/new-user`（またはメールアドレスの `@` 前を使用した形式）で自動生成されている
- [ ] 同名メールアドレスの別ユーザが存在する場合、URI に連番（`2` 等）が付与される
- [ ] 個人名前空間は本人のみ編集可能である（他ユーザには表示されない）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | NG |ユーザーが登録できない。https://soft-service.atlassian.net/browse/AISOLMAIML-410?atlOrigin=eyJpIjoiNmY1MmNiYjJjZTE0NDJkZmFhOTViMzYyMTJkNGQwYTgiLCJwIjoiaiJ9|

---

## B-NS-02：グローバル名前空間宣言の閲覧・インポート・エクスポート（プロバイダー）

### 概要

プロバイダーがプロバイダーメニューの「名前空間管理（グローバル）」タブで、グローバル名前空間宣言（Prefix + URI）の一覧を確認し、CSV インポート（全置換）・エクスポートができることを確認する。

> ⚠️ **注意**: データは DB ではなくファイルサーバの CSV ファイル（`system/namespaces/global-declarations.csv`）で管理される。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/provider/ui_namespace_management_global.md` |
| ユースケース | UC-01：prefix一覧を確認する / UC-02：CSVでインポート・エクスポートする |
| API | `GET /api/v1/namespaces/global-declarations` / `POST /api/v1/namespaces/global-declarations`（CSV全置換）|

### 前提条件

- `provider` としてログイン済み
- グローバル名前空間宣言に `maiml`・`xsi` が登録済みであること
- テスト用 CSV ファイル（`test-global-declarations.csv`）を手元に準備済みであること

### 操作手順

#### ステップ 1：一覧表示の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | provider | プロバイダーメニュー → 「名前空間管理（グローバル）」タブを開く | `GlobalNamespaceView` が表示される（サブタブなし） |
| 2 | provider | 一覧テーブルを確認する | Prefix 列・URI 列（コピーボタン付き）の2列で `maiml`・`xsi` 等が表示される |
| 3 | provider | 件数表示を確認する | 「N 件」の表示がテーブル上部に表示される |
| 4 | provider | URI 列の「コピー」ボタンを押す | URI がクリップボードにコピーされる |

#### ステップ 2：CSV エクスポート

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | provider | 「エクスポート」ボタン（`DownloadOutlined` アイコン）を押す | CSV ファイルのダウンロードが自動開始される |
| 6 | — | ダウンロードされた CSV を確認する | `prefix,uri` のヘッダーで、グローバル名前空間宣言が全件含まれている |

#### ステップ 3：CSV インポート（確認ダイアログ → 全置換）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | provider | 「インポート」ボタン（`UploadOutlined` アイコン・primary）を押す | ファイル選択ダイアログが開く |
| 8 | provider | `test-global-declarations.csv` を選択する | 確認ダイアログ（`Modal.confirm`）が表示される（全置換の警告。OK ボタンは danger スタイル） |
| 9 | provider | 確認ダイアログで「キャンセル」を選択する | インポートはキャンセルされ、一覧は変化しない |
| 10 | provider | 再度インポートボタンを押してファイルを選択し、確認ダイアログで「OK」を選択する | CSV が全置換でインポートされ、「インポートに成功しました」のトーストが表示され一覧が更新される |

#### ステップ 4：リロード

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 11 | provider | 「リロード」ボタン（`ReloadOutlined` アイコン）を押す | テーブルがスピナー表示後に最新データで再描画される |

#### ステップ 5：他ロールによるアクセス確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | experiment_admin | プロバイダーメニューへのアクセスを試みる | アクセスできない（プロバイダーメニュー自体が表示されない） |

### 確認ポイント

- [ ] サブタブは表示されない（Prefix / 用語 等のサブタブなし）
- [ ] テーブルには「編集」「削除」「＋Prefix 追加」ボタンが存在しない（閲覧・インポート・エクスポートのみ）
- [ ] インポートは CSV 全置換であり、確認ダイアログの OK ボタンが danger スタイルで表示される
- [ ] `experiment_admin` 等の他ロールはプロバイダーメニューにアクセスできない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | OK | |

---

## B-NS-03：Prefixの登録・編集・非アクティブ化・CSVエクスポート（実験管理者）

### 概要

実験管理者が名前空間管理画面の `PrefixManagement` コンポーネントで Prefix を登録・編集・非アクティブ化し、CSV エクスポート・インポートができることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_prefix_management.md` ※v1.2.0（2026-08-25更新） |
| 要件 | F-07-01：Prefix 登録・編集・非アクティブ化機能 / F-07-02：重複チェック機能 |
| API | `GET /api/v1/namespaces` / `POST /api/v1/namespaces` / `PUT /api/v1/namespaces/:prefix` / `PATCH /api/v1/namespaces/:prefix/active` ※2026-08-25変更：旧 `DELETE /api/v1/namespaces/:prefix` から変更 |

### 前提条件

- `experiment_admin` としてログイン済み
- 自分の個人名前空間（Personal）が存在すること
- Prefix `test-pfx` が未登録であること
- システム名前空間 Prefix（`SYSTEM_NAMESPACE_PREFIX` 定数に一致）が1件以上存在すること

### 操作手順

#### ステップ 1：Prefix 一覧の表示確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験管理者メニュー → 「名前空間管理」タブを開く | 名前空間ツリーが左ペインに表示される |
| 2 | experiment_admin | ツリーで自分の個人名前空間ノードを選択する | 右ペインに `PrefixManagement` が表示される（Prefix列・URI列・説明列・スコープ列・操作列） |
| 3 | experiment_admin | ツールバーを確認する | 検索欄 / インポート / エクスポート / `＋ prefix追加` / 保存 / キャンセル の各要素が表示されている |
| 4 | experiment_admin | 操作列のボタンを確認する | 通常行には「編集」「非アクティブ」ボタンが表示されること |

#### ステップ 2：新規 Prefix のインライン追加（URI自動生成確認）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_admin | 「＋ prefix追加」ボタンを押す | テーブル先頭行に黄色背景（`#fffbe6`）の新規入力行が追加される。URI フィールドに `GET /api/v1/namespaces/suggested-uri` で取得した URI が自動入力される（disabled・編集不可） |
| 6 | experiment_admin | Prefix フィールドに `test-pfx`、説明フィールドに `テスト用 Prefix` を入力する | 各フィールドに値が入力される。URI は自動生成値のまま変更不可 |
| 7 | experiment_admin | 「保存」ボタンを押す（新規行がある場合のみ活性） | Prefix が登録され、一覧に `test-pfx` 行が表示される（スコープ列に個人名前空間名が表示される） |

#### ステップ 3：重複チェック（保存時の `Modal.confirm`）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin | 「＋ prefix追加」を押し、同一 Prefix `test-pfx`（すでに登録済み）を入力して「保存」を押す | 確認ダイアログ（`Modal.confirm`・`WarningOutlined` アイコン）が表示される（「prefix test-pfx はすでに登録されています。…」） |
| 9 | experiment_admin | 確認ダイアログで「キャンセル」を選択する | 登録が中止される |
| 10 | experiment_admin | 再度「保存」→ 確認ダイアログで「OK」を選択する | 強行登録（上書き）される |

#### ステップ 4：既存 Prefix のインライン編集（prefix・説明のみ変更可）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 11 | experiment_admin | `test-pfx` 行の「編集」ボタンを押す | 行がインライン編集モードに切り替わる（`prefix`・`description` が `<Input>` に変わる。URI は表示のみ・編集不可） |
| 12 | experiment_admin | 説明 を 「プレフィックス変更」 に変更する | 説明 フィールドの値が変更される |
| 13 | experiment_admin | 「保存」ボタンを押す | `prefix` と `description` が更新される（URI は送信されない） |
| 14 | experiment_admin | 再度「編集」→ 説明を変更 → 「キャンセル」を押す | 変更が破棄され、元の値に戻る |

#### ステップ 5：Prefix の非アクティブ化

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 15 | experiment_admin | `test-pfx` 行の「非アクティブ」ボタンを押す | 確認ダイアログが表示される |
| 16 | experiment_admin | 確認ダイアログで「キャンセル」を選択する | 操作がキャンセルされ、Prefix はアクティブのまま |
| 17 | experiment_admin | 再度「非アクティブ」ボタンを押し、確認ダイアログで確定する | `PATCH /api/v1/namespaces/:prefix/active` が呼ばれ `is_active=false` に更新される。一覧から `test-pfx` が非表示になる |

#### ステップ 6：検索・絞り込み

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 18 | experiment_admin | 検索欄に `test` と入力する | Prefix 列・URI 列・説明列に `test` を含む行のみ絞り込まれて表示される |
| 19 | experiment_admin | 検索欄をクリアする | 全 Prefix が再表示される |

#### ステップ 7：CSV エクスポート

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 20 | experiment_admin | 「エクスポート」ボタンを押す | `prefixes.csv` がダウンロードされる（選択行対象） |
| 21 | — | ダウンロードした CSV を確認する | ヘッダー: `prefix,uri,description`、BOM 付き UTF-8 で全 Prefix が含まれている |

#### ステップ 8：CSV インポート

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 22 | experiment_admin | 「インポート」ボタンを押す | ファイル選択ダイアログが開く |
| 23 | experiment_admin | `prefix,uri,description` ヘッダーを含む CSV を選択する | Prefix が一括登録される（ヘッダー行はスキップ、prefix/uri が空の行もスキップ） |

#### ステップ 9：UncertaintyManagement 経由の Prefix 共有ボタン確認（タスク1・4対応）

> `UncertaintyManagement.tsx` の Prefix タブでのみ共有ボタンが表示される（`showShareButton=true` が渡される場合）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 24 | experiment_admin | 実験管理者メニュー → 「名前空間管理」タブ → 右ペインの「Prefix」タブを開く。チェックボックスを1件も選択しない | テーブル上部にボタン行が表示されないこと |
| 25 | experiment_admin | チェックボックスで1件の Prefix を選択する | テーブル上部に「1件 共有する」（緑色ボタン）と「1件 一括非アクティブ」（赤色ボタン）のボタン行が表示されること |
| 26 | experiment_admin | さらにチェックボックスで2件目の Prefix を選択する | ボタン行のラベルが「2件 共有する」・「2件 一括非アクティブ」に更新されること |
| 27 | experiment_admin | 「2件 共有する」（緑色ボタン）をクリックする | `ShareScopeModal`（ツリー形式）が開くこと |
| 28 | experiment_admin | モーダルのツリーを確認する | Global ノードが表示されないこと。ツリーノードにアイコン（🌐🏦👥👤）が表示されないこと |
| 29 | experiment_admin | ツリーで任意のスコープノードをクリックして選択する | 「共有先：〇〇」の確認欄が表示されること |
| 30 | experiment_admin | 「共有する」ボタンをクリックする | `POST /api/v1/namespaces/prefixes/share` が呼ばれ、成功トーストが表示されること |
| 31 | experiment_admin | 全チェックボックスを外す | ボタン行が非表示になること |

### 確認ポイント

- [ ] 新規追加行は黄色背景（`#fffbe6`）で表示される
- [ ] 「＋ prefix追加」押下時に URI が自動生成・disabled 表示される（手動入力不可）
- [ ] 操作列に「非アクティブ」ボタンが表示される
- [ ] 非アクティブ化後は `is_active=false` に更新され一覧から非表示になる（物理削除ではない）
- [ ] 編集モードで `prefix`・`description` のみ編集可。URI は編集不可
- [ ] 「保存」「キャンセル」ボタンは新規入力行がない場合は非活性
- [ ] 重複保存時は `Modal.confirm`（`WarningOutlined`）が表示され、OK で強行登録・キャンセルで中止
- [ ] エクスポートは選択行のみ、BOM 付き UTF-8 の `prefixes.csv`
- [ ] **[タスク1・4対応]** チェックボックス未選択時はボタン行が非表示、1件以上選択時のみ表示される
- [ ] **[タスク1・4対応]** 共有ボタンは緑色（`background: '#52c41a'`）、一括非アクティブボタンは赤色（`danger`）
- [ ] **[タスク1・4対応]** 「N件 共有する」ボタンクリックで `ShareScopeModal`（ツリー形式）が開く
- [ ] **[タスク5対応]** `ShareScopeModal` に Global ノードが表示されない
- [ ] **[タスク5対応]** `ShareScopeModal` のツリーノードにアイコンが表示されない
- [ ] **[タスク4対応]** 共有後に `POST /api/v1/namespaces/prefixes/share` が呼ばれ、成功トーストが表示される

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | OK | |

---

## B-NS-04：用語の登録・編集・有効無効切替・CSVエクスポート（実験管理者）

### 概要

実験管理者が名前空間管理画面の `TermManagement` コンポーネントで用語を登録・編集・有効化/無効化し、CSV エクスポート・インポートができることを確認する。
フェーズB追加として、**指示用語同時登録機能**（`SupervisorDirective{localName}` の同時登録）と `hasDirectiveTerm` バッジ表示も確認する。
フェーズB追加として、**指示用語同時登録機能**（`SupervisorDirective{localName}` の同時登録）と `hasDirectiveTerm` バッジ表示も確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_term_management.md`（v1.2.0） |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_term_management.md`（v1.2.0） |
| 要件 | F-08-01：用語登録・編集機能 / F-08-02：用語検索・絞り込み機能 |
| ユースケース | UC-04：用語を登録する / UC-05：用語を編集・削除する |
| API | `GET /api/v1/namespace-terms` / `POST /api/v1/namespace-terms` / `PUT /api/v1/namespace-terms/:prefix/:localName` / `PATCH /api/v1/namespace-terms/:prefix/:localName/active` |

### 前提条件

- `experiment_admin` としてログイン済み
- 自分の個人名前空間に Prefix `chem` が登録済みであること
- `chem:SampleRate` が未登録であること

### 操作手順

#### ステップ 1：用語一覧の表示確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験管理者メニュー → 「名前空間管理」タブを開く | 名前空間ツリーが左ペインに表示される |
| 2 | experiment_admin | ツリーで自分の個人名前空間ノードを選択する | 右ペインに `TermManagement` が表示される（Prefix列・ローカル名列・表示名列・説明列・型列・単位列・スコープ列・操作列） |
| 3 | experiment_admin | ツールバーを確認する | 検索欄 / Prefix フィルター / 型フィルター / インポート / エクスポート / ＋用語追加 / 保存 / キャンセル の各要素が表示されている |

#### ステップ 2：用語の新規登録（指示用語同時登録 ON）
#### ステップ 2：用語の新規登録（指示用語同時登録 ON）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 4 | experiment_admin | 「＋ 用語追加」ボタンを押す | テーブル先頭に黄色背景の新規入力行が追加される |
| 5 | — | 新規行末尾の「指示用語同時登録」チェックボックスを確認する | **チェックボックスがデフォルトで ON（チェックあり）** になっている |
| 6 | — | ローカル名 Input が空の状態でチェックボックスを確認する | `localName` 未入力のためチェックボックスが **`disabled`** になっている |
| 7 | experiment_admin | Prefix プルダウンで `chem` を選択し、ローカル名 `SampleRate`・表示名 `サンプリングレート`・型 `floatType`・単位 `Hz` を入力する | 各フィールドに値が入力される。ローカル名入力後にチェックボックスが **活性化** される |
| 8 | — | チェックボックスが ON のままであることを確認する | チェックが ON の状態 |
| 9 | experiment_admin | 「保存」ボタンを押す | `POST /api/v1/namespace-terms`（`createDirectiveTerm: true`）が呼ばれ、`chem:SampleRate` と `chem:SupervisorDirectiveSampleRate` の **2件** が DB に登録される |
| 10 | — | 保存後の一覧を確認する | `chem:SampleRate` 行の操作列に **「指示あり」バッジ** が表示されている（`hasDirectiveTerm=true`） |

#### ステップ 3：用語の新規登録（指示用語同時登録 OFF）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 11 | experiment_admin | 再度「＋ 用語追加」を押す | 新規行が追加され、チェックボックスは ON |
| 12 | experiment_admin | ローカル名 `ReactionTime` を入力し、チェックボックスを **OFF** にする | チェックが外れる |
| 13 | experiment_admin | 「保存」ボタンを押す | `POST /api/v1/namespace-terms`（`createDirectiveTerm: false`）が呼ばれ、`chem:ReactionTime` の **1件のみ** が DB に登録される |
| 14 | — | 保存後の `chem:ReactionTime` 行の操作列を確認する | 「指示あり」バッジは**表示されない**（`hasDirectiveTerm=false`）|
| 5 | — | 新規行末尾の「指示用語同時登録」チェックボックスを確認する | **チェックボックスがデフォルトで ON（チェックあり）** になっている |
| 6 | — | ローカル名 Input が空の状態でチェックボックスを確認する | `localName` 未入力のためチェックボックスが **`disabled`** になっている |
| 7 | experiment_admin | Prefix プルダウンで `chem` を選択し、ローカル名 `SampleRate`・表示名 `サンプリングレート`・型 `floatType`・単位 `Hz` を入力する | 各フィールドに値が入力される。ローカル名入力後にチェックボックスが **活性化** される |
| 8 | — | チェックボックスが ON のままであることを確認する | チェックが ON の状態 |
| 9 | experiment_admin | 「保存」ボタンを押す | `POST /api/v1/namespace-terms`（`createDirectiveTerm: true`）が呼ばれ、`chem:SampleRate` と `chem:SupervisorDirectiveSampleRate` の **2件** が DB に登録される |
| 10 | — | 保存後の一覧を確認する | `chem:SampleRate` 行の操作列に **「指示あり」バッジ** が表示されている（`hasDirectiveTerm=true`） |

#### ステップ 3：用語の新規登録（指示用語同時登録 OFF）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 11 | experiment_admin | 再度「＋ 用語追加」を押す | 新規行が追加され、チェックボックスは ON |
| 12 | experiment_admin | ローカル名 `ReactionTime` を入力し、チェックボックスを **OFF** にする | チェックが外れる |
| 13 | experiment_admin | 「保存」ボタンを押す | `POST /api/v1/namespace-terms`（`createDirectiveTerm: false`）が呼ばれ、`chem:ReactionTime` の **1件のみ** が DB に登録される |
| 14 | — | 保存後の `chem:ReactionTime` 行の操作列を確認する | 「指示あり」バッジは**表示されない**（`hasDirectiveTerm=false`）|

#### ステップ 4：完全一致重複のエラー確認
#### ステップ 4：完全一致重複のエラー確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 15 | experiment_admin | 再度「＋ 用語追加」を押し、Prefix: `chem`・ローカル名: `SampleRate`（同一 QName）を入力して「保存」を押す | `Modal.error`（エラーダイアログ）が表示され、登録がブロックされる（完全一致重複は登録不可） |
| 15 | experiment_admin | 再度「＋ 用語追加」を押し、Prefix: `chem`・ローカル名: `SampleRate`（同一 QName）を入力して「保存」を押す | `Modal.error`（エラーダイアログ）が表示され、登録がブロックされる（完全一致重複は登録不可） |

#### ステップ 5：部分一致重複の警告確認
#### ステップ 5：部分一致重複の警告確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 16 | experiment_admin | 別の Prefix（例: `lab`）でローカル名 `SampleRate`（別 prefix・同 localName）を入力して「保存」を押す | `Modal.confirm`（確認ダイアログ）が表示される（警告あり・登録続行可） |
| 17 | experiment_admin | 確認ダイアログで「キャンセル（いいえ）」を選択する | その行の登録はスキップされ、他の行は登録処理に進む |
| 16 | experiment_admin | 別の Prefix（例: `lab`）でローカル名 `SampleRate`（別 prefix・同 localName）を入力して「保存」を押す | `Modal.confirm`（確認ダイアログ）が表示される（警告あり・登録続行可） |
| 17 | experiment_admin | 確認ダイアログで「キャンセル（いいえ）」を選択する | その行の登録はスキップされ、他の行は登録処理に進む |

#### ステップ 6：用語のインライン編集
#### ステップ 6：用語のインライン編集

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 18 | experiment_admin | `chem:SampleRate` 行の「編集」ボタンを押す | 行がインライン編集モードに切り替わる（ローカル名は編集不可） |
| 19 | experiment_admin | 表示名を「サンプリング周波数」・単位を `kHz` に変更する | フィールドの値が変更される |
| 20 | experiment_admin | 「保存」ボタンを押す | 変更が保存され、通常表示に戻る |
| 21 | experiment_admin | 「編集」→ 内容変更 → 「キャンセル」を押す | 変更が破棄され、元の値に戻る |
| 18 | experiment_admin | `chem:SampleRate` 行の「編集」ボタンを押す | 行がインライン編集モードに切り替わる（ローカル名は編集不可） |
| 19 | experiment_admin | 表示名を「サンプリング周波数」・単位を `kHz` に変更する | フィールドの値が変更される |
| 20 | experiment_admin | 「保存」ボタンを押す | 変更が保存され、通常表示に戻る |
| 21 | experiment_admin | 「編集」→ 内容変更 → 「キャンセル」を押す | 変更が破棄され、元の値に戻る |

#### ステップ 7：有効化/無効化（isActive トグル）
#### ステップ 7：有効化/無効化（isActive トグル）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 22 | experiment_admin | `chem:SampleRate` 行の「無効化」ボタンを押す | 確認ダイアログが表示される（`termManagement.deactivateConfirm` メッセージ） |
| 23 | experiment_admin | 確認ダイアログで「無効化」を選択する | 行がグレー背景・グレーテキストに変わり、操作列のボタンが「有効化」に切り替わる |
| 24 | experiment_admin | 「有効化」ボタンを押す → 確認ダイアログで「有効化」を選択する | 行がアクティブ表示に戻り、ボタンが「無効化」に切り替わる |
| 22 | experiment_admin | `chem:SampleRate` 行の「無効化」ボタンを押す | 確認ダイアログが表示される（`termManagement.deactivateConfirm` メッセージ） |
| 23 | experiment_admin | 確認ダイアログで「無効化」を選択する | 行がグレー背景・グレーテキストに変わり、操作列のボタンが「有効化」に切り替わる |
| 24 | experiment_admin | 「有効化」ボタンを押す → 確認ダイアログで「有効化」を選択する | 行がアクティブ表示に戻り、ボタンが「無効化」に切り替わる |

#### ステップ 8：検索・絞り込み
#### ステップ 8：検索・絞り込み

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 25 | experiment_admin | 検索欄に `サンプリング` と入力する | `SampleRate`（表示名一致）が絞り込まれて表示される |
| 26 | experiment_admin | Prefix フィルターで `chem` を選択する | `chem` の用語のみが表示される |
| 27 | experiment_admin | 型フィルターで `floatType` を選択する | floatType の用語のみが表示される |
| 28 | experiment_admin | 各フィルターをクリアする | 全用語が再表示される |
| 25 | experiment_admin | 検索欄に `サンプリング` と入力する | `SampleRate`（表示名一致）が絞り込まれて表示される |
| 26 | experiment_admin | Prefix フィルターで `chem` を選択する | `chem` の用語のみが表示される |
| 27 | experiment_admin | 型フィルターで `floatType` を選択する | floatType の用語のみが表示される |
| 28 | experiment_admin | 各フィルターをクリアする | 全用語が再表示される |

#### ステップ 9：CSV エクスポート
#### ステップ 9：CSV エクスポート

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 29 | experiment_admin | 「エクスポート」ボタンを押す | `terms.csv` がダウンロードされる |
| 30 | — | ダウンロードした CSV を確認する | ヘッダー: `prefix,localName,displayName,description,type,unitHint`、BOM 付き UTF-8 で全用語が含まれている |
| 29 | experiment_admin | 「エクスポート」ボタンを押す | `terms.csv` がダウンロードされる |
| 30 | — | ダウンロードした CSV を確認する | ヘッダー: `prefix,localName,displayName,description,type,unitHint`、BOM 付き UTF-8 で全用語が含まれている |

### 確認ポイント

- [ ] 新規追加行のローカル名は必須バリデーションが動作する（空のまま保存不可）
- [ ] `isActive: false` の行はグレー背景（`#f5f5f5`）・グレーテキストで表示され、型 Tag も半透明になる
- [ ] 完全一致重複は `Modal.error` でブロック、部分一致（別prefix同localName）は `Modal.confirm` で続行可
- [ ] エクスポートは BOM 付き UTF-8 の `terms.csv`
- [ ] 新規行の「指示用語同時登録」チェックボックスはデフォルト **ON**
- [ ] `localName` 未入力時はチェックボックスが `disabled`
- [ ] チェック ON で保存すると `SupervisorDirective{localName}` が同時登録される（DB に2件）
- [ ] チェック OFF で保存すると元の用語1件のみ登録される
- [ ] 同時登録失敗（どちらかの INSERT エラー）時は両方ロールバックされる
- [ ] `hasDirectiveTerm=true` の用語行に「指示あり」バッジが表示される
- [ ] 新規行の「指示用語同時登録」チェックボックスはデフォルト **ON**
- [ ] `localName` 未入力時はチェックボックスが `disabled`
- [ ] チェック ON で保存すると `SupervisorDirective{localName}` が同時登録される（DB に2件）
- [ ] チェック OFF で保存すると元の用語1件のみ登録される
- [ ] 同時登録失敗（どちらかの INSERT エラー）時は両方ロールバックされる
- [ ] `hasDirectiveTerm=true` の用語行に「指示あり」バッジが表示される
- [ ] `experiment_worker` の実験作業者メニューには「名前空間管理」タブが存在せず、名前空間管理画面にアクセスできない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | NG | 用語重複がインライン表示でエラーになっているhttps://soft-service.atlassian.net/browse/AISOLMAIML-411?atlOrigin=eyJpIjoiYmRmN2I0ZjliNWE4NDZjN2EyNGEwZGZlYTVkMDExZTciLCJwIjoiaiJ9|

---

## B-NS-05：グループ追加と名前空間URI自動採番（実験管理者）
## B-NS-05：グループ追加と名前空間URI自動採番（実験管理者）

### 概要

実験管理者がグループ管理タブ（`ExperimentAdminMenu` key=`'5'`）でグループを追加したとき、名前空間URIが `generateNamespaceUri` により自動生成されることを確認する。また、`GroupAddDialog` でメンバー設定・URI自動生成が動作することを確認する。
加えて、名前空間ツリーのコンテキストメニューが `companyDepth >= 2` のノードで表示されることを確認する。
実験管理者がグループ管理タブ（`ExperimentAdminMenu` key=`'5'`）でグループを追加したとき、名前空間URIが `generateNamespaceUri` により自動生成されることを確認する。また、`GroupAddDialog` でメンバー設定・URI自動生成が動作することを確認する。
加えて、名前空間ツリーのコンテキストメニューが `companyDepth >= 2` のノードで表示されることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_main.md` §2.2, §12（v2.5.0） |
| 要件 | F-09-01：グループ追加・管理機能 / F-09-02：グループメンバー管理機能 / F-02-02：名前空間URI自動採番機能 |
| コンポーネント | `GroupManagementPanel` / `GroupAddDialog` / `GroupEditDialog` |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_main.md` §2.2, §12（v2.5.0） |
| 要件 | F-09-01：グループ追加・管理機能 / F-09-02：グループメンバー管理機能 / F-02-02：名前空間URI自動採番機能 |
| コンポーネント | `GroupManagementPanel` / `GroupAddDialog` / `GroupEditDialog` |

### 前提条件

- `experiment_admin` としてログイン済み
- 組織配下に `organization_group`（部門/グループ）が存在すること
- 追加するグループ名「テストグループ001」が未登録であること
- 追加するグループ名「テストグループ001」が未登録であること

### 操作手順

#### ステップ 1：グループ管理タブへのナビゲーション
#### ステップ 1：グループ管理タブへのナビゲーション

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験管理者メニュー → 「グループ管理」タブ（key=`'5'`）を開く | `GroupManagementPanel` が表示される（グループ一覧・「グループを作成」ボタンが表示される） |
| 1 | experiment_admin | 実験管理者メニュー → 「グループ管理」タブ（key=`'5'`）を開く | `GroupManagementPanel` が表示される（グループ一覧・「グループを作成」ボタンが表示される） |

#### ステップ 2：グループ追加（GroupAddDialog）
#### ステップ 2：グループ追加（GroupAddDialog）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 2 | experiment_admin | 「グループを作成」ボタンを押す | `GroupAddDialog` が開く |
| 3 | experiment_admin | 「追加先」プルダウンで部門/グループを選択し、グループ名「テストグループ001」を入力する | 「名前空間URI（自動生成）」フィールドに `generateNamespaceUri(organizationCd, deptCd, グループ名)` による URI がリアルタイム生成される |
| 4 | — | 生成された URI を確認する | `https://{organizationCd}/{deptCd}/test-group-001/`（表示名スラッグ形式）で自動生成されている（手入力不可） |
| 2 | experiment_admin | 「グループを作成」ボタンを押す | `GroupAddDialog` が開く |
| 3 | experiment_admin | 「追加先」プルダウンで部門/グループを選択し、グループ名「テストグループ001」を入力する | 「名前空間URI（自動生成）」フィールドに `generateNamespaceUri(organizationCd, deptCd, グループ名)` による URI がリアルタイム生成される |
| 4 | — | 生成された URI を確認する | `https://{organizationCd}/{deptCd}/test-group-001/`（表示名スラッグ形式）で自動生成されている（手入力不可） |
| 5 | experiment_admin | メンバー追加欄でユーザーを検索し `worker@test.example` を追加する | メンバーリストにユーザーが追加される |
| 6 | experiment_admin | 「追加」ボタンを押す | グループが作成され、`GroupManagementPanel` の一覧に「テストグループ001」が追加される |
| 6 | experiment_admin | 「追加」ボタンを押す | グループが作成され、`GroupManagementPanel` の一覧に「テストグループ001」が追加される |

#### ステップ 3：グループ情報の編集（GroupEditDialog）
#### ステップ 3：グループ情報の編集（GroupEditDialog）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | experiment_admin | 「テストグループ001」行の「編集」ボタンを押す | `GroupEditDialog` が開く（グループ名・メンバー・代表者フィールドが表示される） |
| 7 | experiment_admin | 「テストグループ001」行の「編集」ボタンを押す | `GroupEditDialog` が開く（グループ名・メンバー・代表者フィールドが表示される） |
| 8 | experiment_admin | メンバー追加欄で `admin-leader@test.example` を追加して「保存」を押す | メンバーが追加される |
| 9 | experiment_admin | グループ名を「テストグループ001（改）」に変更して「保存」を押す | グループ名が更新され、一覧に反映される |
| 9 | experiment_admin | グループ名を「テストグループ001（改）」に変更して「保存」を押す | グループ名が更新され、一覧に反映される |

#### ステップ 4：グループ一覧確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_admin | `GroupManagementPanel` のグループ一覧を確認する | 自分が所属・管理するグループが表示される |
| 11 | experiment_admin | 「テストグループ001（改）」行の `namespaceUri` 列（または詳細）を確認する | 作成時に自動生成された名前空間 URI が設定されている |

#### ステップ 5：グループ追加・編集の動線確認
#### ステップ 4：グループ一覧確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_admin | `GroupManagementPanel` のグループ一覧を確認する | 自分が所属・管理するグループが表示される |
| 11 | experiment_admin | 「テストグループ001（改）」行の `namespaceUri` 列（または詳細）を確認する | 作成時に自動生成された名前空間 URI が設定されている |

#### ステップ 5：グループ追加・編集の動線確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | experiment_admin | グループ管理タブ（key=`'5'`）の「グループを作成」ボタンを押す | `GroupAddDialog` が開く（§12 グループ管理タブ経由が正しいトリガー） |
| 13 | experiment_admin | グループ管理タブの一覧でグループ行の「編集」ボタンを押す | `GroupEditDialog` が開く（§12 グループ管理タブ経由が正しいトリガー） |
| 14 | — | 名前空間管理タブ（key=`'4'`）の左ペインツリー上で任意のノードを右クリックする | コンテキストメニューは**表示されない**（現在機能していないデッドコードのため） |
| 12 | experiment_admin | グループ管理タブ（key=`'5'`）の「グループを作成」ボタンを押す | `GroupAddDialog` が開く（§12 グループ管理タブ経由が正しいトリガー） |
| 13 | experiment_admin | グループ管理タブの一覧でグループ行の「編集」ボタンを押す | `GroupEditDialog` が開く（§12 グループ管理タブ経由が正しいトリガー） |
| 14 | — | 名前空間管理タブ（key=`'4'`）の左ペインツリー上で任意のノードを右クリックする | コンテキストメニューは**表示されない**（現在機能していないデッドコードのため） |

### 確認ポイント

- [ ] `GroupAddDialog` の「名前空間URI（自動生成）」フィールドはグループ名入力に連動してリアルタイム更新される（手入力不可）
- [ ] URI は `generateNamespaceUri(organizationCd, deptCd, グループ名)` により生成される
- [ ] グループ管理は `ExperimentAdminMenu` tab key=`'5'` の独立タブであり、名前空間管理タブ（key=`'4'`）のサブタブではない
- [ ] **[2026-08-27 更新]** 右クリックコンテキストメニューは現在機能していない（デッドコード）。グループ操作はグループ管理タブ（key='5'）のボタン経由であることを確認する
- [ ] コンポーネント名は `GroupManagementPanel` / `GroupAddDialog` / `GroupEditDialog`（旧: TeamManagementPanel / TeamAddDialog / TeamEditDialog）
- [ ] `GroupAddDialog` の「名前空間URI（自動生成）」フィールドはグループ名入力に連動してリアルタイム更新される（手入力不可）
- [ ] URI は `generateNamespaceUri(organizationCd, deptCd, グループ名)` により生成される
- [ ] グループ管理は `ExperimentAdminMenu` tab key=`'5'` の独立タブであり、名前空間管理タブ（key=`'4'`）のサブタブではない
- [ ] **[2026-08-27 更新]** 右クリックコンテキストメニューは現在機能していない（デッドコード）。グループ操作はグループ管理タブ（key='5'）のボタン経由であることを確認する
- [ ] コンポーネント名は `GroupManagementPanel` / `GroupAddDialog` / `GroupEditDialog`（旧: TeamManagementPanel / TeamAddDialog / TeamEditDialog）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | OK | |

---

## B-NS-06：用語登録・編集・重複チェック（実験管理者）

### 概要

実験管理者が自分の名前空間に用語を登録・編集し、重複チェックが正しく動作することを確認する。また、用語の検索・絞り込みと継承元（スコープ）の表示を確認する。
フェーズB追加として、**Prefix 管理での Global スコープ重複チェック**（グローバルに登録済みの Prefix と同名の Prefix を登録しようとするとエラーが表示されること）も確認する。
フェーズB追加として、**Prefix 管理での Global スコープ重複チェック**（グローバルに登録済みの Prefix と同名の Prefix を登録しようとするとエラーが表示されること）も確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| 要件 | F-08-01：用語登録・編集機能 / F-07-02：重複チェック機能 / F-08-02：用語検索・絞り込み機能 |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_prefix_management.md`（v1.3.0） |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_prefix_management.md`（v1.3.0） |
| ユースケース | UC-04：用語を登録する / UC-05：用語を編集・削除する / UC-18：用語を検索・絞り込む / UC-19：用語の継承元を確認する |
| 業務フロー | BF-04 / BF-05 / BF-18 / BF-19 |
| API | `POST /api/v1/namespaces/terms` / `PUT /api/v1/namespaces/terms/:prefix/:localName` / `GET /api/v1/namespaces/terms` |

### 前提条件

- `experiment_admin（一般）` としてログイン済み
- 個人名前空間（Personal）が存在すること
- Prefix `mgr-admin` が自分の名前空間に登録済みであること
- グローバルに Prefix `maiml` が登録済みであること
- グローバルに Prefix `maiml` が登録済みであること

### 操作手順

#### ステップ 1：用語の新規登録

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 名前空間管理 → ツリーで自分の個人名前空間ノードを選択 | 右ペインに用語リストが表示される |
| 2 | experiment_admin | 「＋ 用語を追加」ボタンを押す | テーブル先頭に黄色背景の入力行が追加される |
| 3 | experiment_admin | ローカル名: `Temperature`、表示名: `温度`、説明: `実験時の温度`、型: `floatType`、単位: `℃` を入力 | 各フィールドに値が入力される |
| 4 | experiment_admin | 「保存」ボタンを押す | 用語が登録され、一覧に表示される（スコープ列に個人名前空間名が表示される） |

#### ステップ 2：同一 QName 重複エラーの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_admin | 「＋ 用語を追加」を押し、Prefix: `mgr-admin`、ローカル名: `Temperature`（同一 QName）を入力して「保存」を押す | `Modal.error`（エラーダイアログ）が表示され、登録がブロックされる |

#### ステップ 3：上位層に同名が存在する場合の警告確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 6 | experiment_admin | 上位層（組織名前空間）に `Temperature` と同名だが別 Prefix の用語が存在する状態で、同ローカル名を入力して「保存」を押す | `Modal.confirm`（確認ダイアログ）が表示される（警告あり・登録続行可） |
| 7 | experiment_admin | 確認ダイアログで「続行」を選択する | 用語が登録される |

#### ステップ 4：Prefix 管理での Global スコープ重複チェック

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin | 名前空間管理 → 自分のスコープを選択 → 「Prefix 管理」タブに切り替える | Prefix 一覧が表示される |
| 9 | experiment_admin | 「＋ prefix 追加」ボタンを押す | 新規入力行が追加される |
| 10 | experiment_admin | Prefix 欄にグローバルに登録済みの Prefix（例: `maiml`）を入力し「保存」を押す | **エラーメッセージ**「Prefix「maiml」はグローバルに既に登録されています。グローバルと同じPrefixは登録できません。」が表示され、**登録がブロックされる** |
| 11 | experiment_admin | Prefix 欄に存在しない Prefix（例: `mylab`）を入力し「保存」を押す | エラーが表示されず、正常に登録される |

#### ステップ 5：用語の編集
#### ステップ 4：Prefix 管理での Global スコープ重複チェック

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin | 名前空間管理 → 自分のスコープを選択 → 「Prefix 管理」タブに切り替える | Prefix 一覧が表示される |
| 9 | experiment_admin | 「＋ prefix 追加」ボタンを押す | 新規入力行が追加される |
| 10 | experiment_admin | Prefix 欄にグローバルに登録済みの Prefix（例: `maiml`）を入力し「保存」を押す | **エラーメッセージ**「Prefix「maiml」はグローバルに既に登録されています。グローバルと同じPrefixは登録できません。」が表示され、**登録がブロックされる** |
| 11 | experiment_admin | Prefix 欄に存在しない Prefix（例: `mylab`）を入力し「保存」を押す | エラーが表示されず、正常に登録される |

#### ステップ 5：用語の編集

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 12 | experiment_admin | `Temperature` 行の「✏ 編集」ボタンを押す | 行がインライン編集モードに切り替わる（ローカル名は編集不可） |
| 13 | experiment_admin | 説明を「実験時の環境温度」に変更して「保存」を押す | 変更が反映され、通常行に戻る |
| 12 | experiment_admin | `Temperature` 行の「✏ 編集」ボタンを押す | 行がインライン編集モードに切り替わる（ローカル名は編集不可） |
| 13 | experiment_admin | 説明を「実験時の環境温度」に変更して「保存」を押す | 変更が反映され、通常行に戻る |

#### ステップ 6：用語の非アクティブ化

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 14 | experiment_admin | `Temperature` 行の「非アクティブ」ボタンを押す | 確認ダイアログが表示される |
| 15 | experiment_admin | 確認ダイアログで「OK」を選択する | 行がグレーアウト表示に変わり、ボタンが「アクティブ」に切り替わる |
| 14 | experiment_admin | `Temperature` 行の「非アクティブ」ボタンを押す | 確認ダイアログが表示される |
| 15 | experiment_admin | 確認ダイアログで「OK」を選択する | 行がグレーアウト表示に変わり、ボタンが「アクティブ」に切り替わる |

#### ステップ 7：用語の検索・絞り込み
#### ステップ 7：用語の検索・絞り込み

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 16 | experiment_admin | 用語検索欄に「温度」と入力する | `Temperature`（表示名「温度」）が絞り込まれて表示される |
| 17 | experiment_admin | 検索欄をクリアする | 全用語が再表示される |
| 18 | experiment_admin | 型フィルターで `floatType` を選択する | floatType の用語のみが表示される |
| 16 | experiment_admin | 用語検索欄に「温度」と入力する | `Temperature`（表示名「温度」）が絞り込まれて表示される |
| 17 | experiment_admin | 検索欄をクリアする | 全用語が再表示される |
| 18 | experiment_admin | 型フィルターで `floatType` を選択する | floatType の用語のみが表示される |

### 確認ポイント

- [ ] 用語追加行のローカル名は必須バリデーションが動作する（空のまま保存不可）
- [ ] 「保存」ボタンは入力行が1件以上のときのみ活性化する
- [ ] 「キャンセル」ボタンを押すと全入力行が破棄される
- [ ] ページネーション（20件/ページ）が正しく動作する
- [ ] グローバルに登録済みの Prefix と同名の Prefix を登録しようとするとエラーが表示されブロックされる
- [ ] エラーメッセージ文言：「Prefix「{prefix}」はグローバルに既に登録されています。グローバルと同じPrefixは登録できません。」（日本語）
- [ ] グローバルに登録済みの Prefix と同名の Prefix を登録しようとするとエラーが表示されブロックされる
- [ ] エラーメッセージ文言：「Prefix「{prefix}」はグローバルに既に登録されています。グローバルと同じPrefixは登録できません。」（日本語）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | NG | ステップ2:用語重複がインライン表示でエラーになっているhttps://soft-service.atlassian.net/browse/AISOLMAIML-411?atlOrigin=eyJpIjoiYmRmN2I0ZjliNWE4NDZjN2EyNGEwZGZlYTVkMDExZTciLCJwIjoiaiJ9|

---

## B-NS-07：用語の上位層共有（ShareScopeModal ツリー形式・タスク5対応）

### 概要

チーム代表者が個人名前空間の用語を組織（チーム）名前空間に共有（移動）できることを確認する。
共有ダイアログは `ShareScopeModal`（ツリー形式）で表示され、Global ノードが非表示・アイコンなし・「※ 選択した共有先に移動します。」と表示されることを確認する。
また、重複チェックの警告と続行操作も確認する。

> **[タスク5対応]** `ShareScopeModal` を旧フラット `<Select>` 形式から `<Tree>` 形式に変更した実装に対応した修正。

### 関連

| 項目 | 参照先 |
|------|--------|
| 要件 | F-04-01：用語上位層移動（共有）機能 / F-05-01：名前空間・用語アクセス権限制御機能 |
| ユースケース | UC-14：配下の用語を上位層に共有する |
| 業務フロー | BF-14：配下の用語を上位層に共有する |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_share_scope_modal.md`（v1.3.0） |
| API | `GET /api/v1/namespaces/terms` / `POST /api/v1/namespaces/terms`（共有先に登録） |

### 前提条件

- `experiment_admin（代表者）` としてログイン済み（`admin-leader@test.example`）
- 配下ユーザ `admin-general@test.example` の個人名前空間に `Temperature`・`Pressure` 用語が登録済み
- `admin-leader` がチームの代表者に設定済み

### 操作手順

#### ステップ 1：配下ユーザの用語確認（代表者の閲覧権限確認）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin（代表者） | 名前空間管理 → ツリーで `admin-general` の個人名前空間ノードを選択 | 右ペインに `admin-general` の用語一覧が表示される（代表者は配下ユーザの用語を閲覧可） |

#### ステップ 2：用語の上位層共有（ShareScopeModal ツリー形式確認）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 2 | experiment_admin（代表者） | `Temperature` のチェックボックスを選択する | アクションバーに「N件 共有する」（緑色）ボタンが表示される |
| 3 | experiment_admin（代表者） | 「N件 共有する」ボタンを押す | `ShareScopeModal` が開く（`<Tree>` コンポーネントによる階層ツリー形式）|
| 4 | — | `ShareScopeModal` のツリーを確認する | ① Global ノードが表示されない ② ツリーノードにアイコン（🌐🏦👥👤）が表示されない ③ 「※ 選択した共有先に移動します。」と表示される（コピーではなく移動） |
| 5 | experiment_admin（代表者） | ツリーでチームノードをクリックして選択する | 「共有先：〇〇」の確認欄が表示される。「共有する」ボタン（緑色）が活性化される |
| 6 | experiment_admin（代表者） | 「共有する」ボタンを押す | 用語が組織（チーム）名前空間に移動される（元の用語は残らない） |
| 7 | experiment_admin（代表者） | ツリーでチーム名前空間ノードを選択する | `Temperature` 用語が追加されており、スコープ列にチーム名が表示されている |

#### ステップ 3：キャンセル操作の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin（代表者） | 再度「N件 共有する」ボタンを押して `ShareScopeModal` を開く | モーダルが開く |
| 9 | experiment_admin（代表者） | 「キャンセル」ボタンを押す | モーダルが閉じる。選択状態がリセットされる。用語は移動されない |

#### ステップ 4：代表者以外による共有不可の確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 10 | experiment_admin（一般） | `admin-general` としてログインし、個人名前空間の用語を選択する | 「N件 共有する」ボタンが表示されない（または非活性） |

### 確認ポイント

- [ ] 一般ユーザは「組織に共有」操作ができない
- [ ] **[タスク5対応]** 共有ダイアログが `<Tree>` 形式で階層表示される（旧フラット `<Select>` ではない）
- [ ] **[タスク5対応]** ダイアログに Global ノードが表示されない
- [ ] **[タスク5対応]** ツリーノードにアイコン（🌐🏦👥👤）が表示されない
- [ ] **[タスク5対応]** 「※ 選択した共有先に移動します。」と表示される（元の用語/Prefix は残らない）
- [ ] 共有先未選択時は「共有する」ボタンが disabled（非活性）
- [ ] 「共有する」ボタン活性時は緑色（`#52c41a`）で表示される
- [ ] モーダルを閉じると選択状態がリセットされる

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | NG |ステップ 2:共有に失敗する https://soft-service.atlassian.net/browse/AISOLMAIML-412?atlOrigin=eyJpIjoiZDY3ZmQ5MWU5OGMwNGE3Yzk3YTExOTNmZmY1ZTM0OGUiLCJwIjoiaiJ9|

---

## B-NS-08：アクセス権限制御（閲覧範囲の確認）

### 概要

ユーザの所属階層と役割に応じて、名前空間・用語の閲覧・編集範囲が正しく制御されることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| 要件 | F-05-01：名前空間・用語アクセス権限制御機能 |
| ユースケース | UC-15：アクセス可能な用語・名前空間を確認する |
| 業務フロー | BF-15：アクセス可能な用語・名前空間を確認する |
| API | `GET /api/v1/namespaces?scopeKey=...` / `GET /api/v1/namespaces/terms` |

### 前提条件

以下の組織構造が存在すること：
```
組織（org-test-001）
 └── 部門: LabA
      ├── チーム: TeamX（admin-general@test.example が所属）
      └── チーム: TeamY（別の実験管理者が所属）
```

- `admin-general` は `TeamX` に所属し、`TeamY` には所属しない
- `TeamX` と `TeamY` それぞれの名前空間に用語が登録済み

### 操作手順

#### ステップ 1：自分の名前空間の閲覧・編集確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin（admin-general） | 名前空間管理 → ツリーで自分の個人名前空間ノードを選択 | 自分の用語が表示され、編集ボタンが活性化している |
| 2 | experiment_admin | 自分の用語を編集する | 編集できる |

#### ステップ 2：上位層（チーム・組織）の読み取り専用確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 3 | experiment_admin（admin-general） | ツリーで所属する `TeamX` 名前空間を選択する | `TeamX` の用語が表示されるが、編集ボタンが非活性または非表示 |
| 4 | experiment_admin | グローバルノードのPrefix・URIを確認する | グローバルPrefix・URIが表示されるが、編集操作ができない |

#### ステップ 3：同階層の別チームが見えないことの確認

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_admin（admin-general） | 名前空間ツリーを確認する | `TeamY` ノードがツリーに表示されない |

### 確認ポイント

- [ ] 自分の名前空間のみ編集可能で、上位層（チーム・グローバル）は読み取り専用
- [ ] 同階層の別チームの名前空間・用語は見えない
- [ ] `GET /api/v1/namespaces/terms` のレスポンスには、アクセス権限外の用語が含まれない

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | OK | |

---

## B-NS-09：prefix非アクティブ化・MaiML xmlns自動宣言

### 概要

prefix の非アクティブ化時に影響ファイルへの警告が表示されること、および MaiML ファイルを開いたときに利用可能な prefix の `xmlns` 宣言が自動付与されることを確認する。

### 関連

| 項目 | 参照先 |
|------|--------|
| 要件 | F-07-03：prefix非アクティブ化機能 / F-06-02：prefix自動宣言機能 |
| ユースケース | UC-03：prefixを非アクティブ化する / UC-17：MaiMLファイルにprefixを宣言する |
| 業務フロー | BF-03：prefixを非アクティブ化する / BF-17：MaiMLファイルにprefixを宣言する |
| API | `GET /api/v1/namespaces/declarations` / `GET /api/v1/namespaces/project-declarations` |

### 前提条件

- `experiment_admin（一般）` としてログイン済み
- 自分の名前空間に Prefix `mgr-admin` が登録済み
- `mgr-admin` を使用する MaiML ファイルが1件以上存在すること

### 操作手順

#### ステップ 1：prefix の非アクティブ化（使用中ファイルあり）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 名前空間管理 → ツリーで自分の個人名前空間を選択 → 「Prefix 管理」タブに切り替える | Prefix 一覧が表示される |
| 2 | experiment_admin | `mgr-admin` 行の「非アクティブ化」ボタンを押す | 警告ダイアログが表示される：「このprefixを使用中のMaiMLファイルへの影響があります」 |
| 4 | experiment_admin | 「中止」を選択する | 非アクティブ化はキャンセルされ、prefix はアクティブのまま |

#### ステップ 2：prefix の非アクティブ化（続行）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 5 | experiment_admin | 再度「非アクティブ化」ボタンを押し、警告ダイアログで「続行」を選択する | prefix が非アクティブ化される |
| 6 | experiment_admin | prefix 一覧を確認する | `mgr-admin` がグレーアウト・非アクティブ状態で表示される |

#### ステップ 3：非アクティブ化した prefix の再アクティブ化

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | experiment_admin | `mgr-admin` 行の「アクティブ化」ボタンを押す → 確認 | prefix がアクティブに戻る |

#### ステップ 4：MaiML ファイルを開いたときの xmlns 自動宣言

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin | プロジェクト管理 → 対象プロジェクトの MaiML ファイルを MaiML エディターで開く | — |
| 9 | experiment_admin | XML ビューを確認する | 利用可能な全 prefix の `xmlns:xxx` 宣言が自動挿入されている（グローバル prefix は必ず含まれる） |
| 10 | — | 同一 prefix 名が複数階層に存在する場合を確認する | 最下位階層の URI が優先して使用されている（上位階層の URI は上書きされる） |
| 11 | experiment_admin | 宣言された prefix の一覧が正しいことを確認する | 自分の名前空間・所属チーム・グローバルの全アクティブ prefix が含まれ、非アクティブ prefix は含まれない |

### 確認ポイント

- [ ] 非アクティブ化後、その prefix を参照していた用語は MaiML 上で認識されなくなる（警告対象）
- [ ] `GET /api/v1/namespaces/declarations` のレスポンスに全アクティブ prefix が含まれる
- [ ] 同一 prefix 名の競合時は最下位階層が優先される（BF-17 の業務仕様通り）

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
| 8/27 | 佐藤 | NG |ステップ1:https://soft-service.atlassian.net/browse/AISOLMAIML-294?atlOrigin=eyJpIjoiYmQzZDVjYTU5NDQwNDg4Y2ExNzMwNzQwZDlhZDA0MGQiLCJwIjoiaiJ9 |

---

## B-NS-10：UncertaintyManagement Prefix共有・名前空間管理多言語化確認

### 概要

`UncertaintyManagement.tsx` の Prefix タブから `ShareScopeModal` 経由で Prefix を別スコープに共有（移動）できることを確認する（タスク4対応）。
また、名前空間管理機能の UI 表示文字列が日英切り替え時に翻訳キー経由で正しく多言語化されていることを確認する（タスク7対応）。

### 関連

| 項目 | 参照先 |
|------|--------|
| 要件 | F-07-01：Prefix 登録・編集・共有機能 |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_uncertainty_criteria_management.md`（v1.1.0） |
| UI設計書 | `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_share_scope_modal.md`（v1.3.0） |
| API | `POST /api/v1/namespaces/prefixes/share` |
| 多言語化 | `frontend/src/locales/ja.json` / `en.json`（`namespaceMain`・`prefixManagement`・`shareScopeModal` セクション） |

### 前提条件

- `experiment_admin` としてログイン済み
- 自分のスコープに Prefix が2件以上登録済みであること（`test-pfx-A`・`test-pfx-B`）
- 共有先として別の名前空間スコープ（`target-scope`）が存在し、`namespace` テーブルにレコードが存在すること
- 多言語化確認用: ブラウザ側で言語を英語に切り替えられること

### 操作手順

#### ステップ 1：Prefix 共有の正常系（タスク4）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | experiment_admin | 実験管理者メニュー → 「名前空間管理」タブ → 右ペインの「Prefix」タブを開く | Prefix 一覧が表示される |
| 2 | experiment_admin | `test-pfx-A`・`test-pfx-B` のチェックボックスを選択する | 「2件 共有する」（緑色）と「2件 一括非アクティブ」（赤色）のボタン行が表示される |
| 3 | experiment_admin | 「2件 共有する」ボタンをクリックする | `ShareScopeModal` が開く |
| 4 | experiment_admin | ツリーで `target-scope` に対応するノードをクリックして選択する | 「共有先：〇〇」確認欄が表示され「共有する」ボタンが活性化される |
| 5 | experiment_admin | 「共有する」ボタンをクリックする | `POST /api/v1/namespaces/prefixes/share` が呼ばれ、成功トーストが表示される |
| 6 | — | DB の `prefix` テーブルを確認する | `target-scope` の `namespace_id` に `test-pfx-A`・`test-pfx-B` が登録されている |

#### ステップ 2：重複スキップ確認（タスク4）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 7 | experiment_admin | 再度 `test-pfx-A` を選択して同じ `target-scope` に共有する | `POST /api/v1/namespaces/prefixes/share` が呼ばれる。すでに存在するため `skippedCount=1`（重複はスキップ・エラーにはならない） |

#### ステップ 3：対象スコープに namespace が存在しない場合のエラー確認（タスク4）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 8 | experiment_admin | `namespace` テーブルにレコードが存在しないスコープキーを共有先に指定する（テスト環境での直接指定またはモック） | エラーメッセージが表示される（`E6001`：コピー先スコープの namespace が見つかりません） |

#### ステップ 4：多言語化確認（日本語 → 英語切り替え・タスク7）

| # | ロール | 操作 | 期待結果 |
|---|--------|------|---------|
| 9 | experiment_admin | 言語設定を日本語のまま `ShareScopeModal` を開く | タイトル「共有先を選択」、ボタン「共有する」、備考「※ 選択した共有先に移動します。」が日本語で表示される |
| 10 | experiment_admin | 言語設定を英語に切り替える | タイトル・ボタン・備考テキストが英語表示に切り替わる（翻訳キー `shareScopeModal.*` が正しく反映される） |
| 11 | experiment_admin | 英語設定で名前空間管理タブの各ラベルを確認する | `prefixManagement.*` / `namespaceMain.*` の翻訳キーが英語で表示される（ハードコード日本語が残っていない） |
| 12 | experiment_admin | 言語設定を日本語に戻す | 各ラベルが日本語に戻る |

### 確認ポイント

- [ ] **[タスク4]** Prefix 共有後に `POST /api/v1/namespaces/prefixes/share` が呼ばれること
- [ ] **[タスク4]** 共有先スコープに `test-pfx-A`・`test-pfx-B` が登録されること
- [ ] **[タスク4]** 同一 Prefix が既に存在する場合は `ON CONFLICT DO NOTHING` でスキップされ、エラーにならないこと
- [ ] **[タスク4]** 対象スコープに `namespace` レコードが存在しない場合はエラー（`E6001`）が表示されること
- [ ] **[タスク7]** `ShareScopeModal` のタイトル・ボタン・備考テキストが `t()` 経由で多言語化されていること（ハードコード日本語なし）
- [ ] **[タスク7]** 言語切り替え時に名前空間管理機能全体（`namespaceMain`・`prefixManagement`・`shareScopeModal` セクション）のラベルが正しく切り替わること

### テスト結果

| 実施日 | 実施者 | 結果（OK/NG/未実施） | 備考・NG内容 |
|--------|-------|---------------------|------------|
|09/14 | 佐藤 | NG | ステップ1：https://soft-service.atlassian.net/browse/AISOLMAIML-413?atlOrigin=eyJpIjoiODhjN2ZjMTNlYTg2NDU3MGExMzU0MTM4ZmI1MGMyMGEiLCJwIjoiaiJ9|

---

## シナリオ一覧サマリ

| シナリオID | タイトル | 対象ロール | ステータス |
|-----------|---------|-----------|----------|
| B-NS-01 | ユーザ登録時の個人名前空間自動生成 | system_admin | NG |
| B-NS-02 | グローバル名前空間宣言の閲覧・インポート・エクスポート | provider | OK |
| B-NS-03 | Prefixの登録・編集・非アクティブ化・CSVエクスポート | experiment_admin / experiment_worker | OK |
| B-NS-04 | 用語の登録・編集・有効無効切替・CSVエクスポート | experiment_admin / experiment_worker | NG |
| B-NS-05 | グループ追加と名前空間URI自動採番 | experiment_admin | OK |
| B-NS-06 | 用語登録・編集・重複チェック | experiment_admin | NG |
| B-NS-07 | 用語の上位層共有（ロール別共有先範囲の確認） | experiment_admin | NG |
| B-NS-08 | アクセス権限制御（閲覧範囲の確認） | experiment_admin / experiment_worker | OK |
| B-NS-09 | prefix非アクティブ化・MaiML xmlns自動宣言 | experiment_admin | NG |
| B-NS-10 | UncertaintyManagement Prefix共有・名前空間管理多言語化確認 | experiment_admin | NG |
