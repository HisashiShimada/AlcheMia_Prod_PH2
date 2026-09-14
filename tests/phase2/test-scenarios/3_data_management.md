# データ管理者 シナリオテスト対象一覧

> **作成日**: 2026-03-24  
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）  
> **照合先**: UI設計書（`docs/design/ui/`）、API設計書（`docs/design/api/api_master_management.md`）

---

## 0. テスト実施情報

| 項目 | 値 |
|------|-----|
| テスト実施日 | 2026-09-01 |
| テスト実施者 | Cline |
| テスト環境バージョン | - |
| 総合判定 | 不合格（NG 8件） |
| 備考 | NG: 3-1-9・3-2-7・3-3-7（AISOLMAIML-324）、3-1-10・3-2-8・3-3-8（AISOLMAIML-325）、3-1-15・3-2-13（AISOLMAIML-326） |

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | 根拠 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|------|-----------|-----------|------|-------|-------|
| **3-1** | Creator マスタ管理 | 要件書#3 | 19件 | Playwright自動 | 12 | 3 | 4 |
| **3-2** | Vendor マスタ管理 | 要件書#3 | 17件 | Playwright自動 | 12 | 3 | 2 |
| **3-3** | Instrument マスタ管理 | 要件書#3 | 18件 | Playwright自動 | 12 | 3 | 3 |
| **合計** | - | - | **54件** | - | **37** | **8** | **9** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| 名前空間の定義（要件書#1） | 設計書に実装なし |
| プロパティの登録・エディタカスタマイズ（要件書#2） | 設計書に実装なし |
| ユーザー詳細情報の登録（要件書#4） | 設計書に実装なし |
| ワークフローベースの作成（要件書#5） | 設計書に実装なし |
| バックアップのタイミング・バックアップ先の設定（要件書#6） | 設計書に実装なし |
| データの削除権限の行使（要件書#7） | 設計書に実装なし |
| 操作履歴の閲覧（要件書#8） | 設計書に実装なし |
| 削除データの関係者への通知（要件書#9） | 設計書に実装なし |
| ファイルからのデータ入力（要件書#10） | 設計書に実装なし |
| データマート内の保存データの削除（要件書#11） | 設計書に実装なし |
| システムダウン時の異常状態の詳細通知の受信（要件書#12） | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 3-1: Creator マスタ管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 3-1-1 | Creator マスタ一覧が表示されること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.1 | GET `/api/v1/master/creator` | OK | |
| 3-1-2 | 表示切替「すべて」で全組織の Creator が表示されること | 正常系 | `api_master_management.md` §display_scope=all | GET `/api/v1/master/creator?display_scope=all` | OK | 「すべて」→「全体」 |
| 3-1-3 | 表示切替「自組織のみ」で自組織作成の Creator のみ表示されること | 正常系 | `api_master_management.md` §display_scope=own | GET `/api/v1/master/creator?display_scope=own` | - | |
| 3-1-4 | Creator ID・Creator 名のキーワードで検索できること | 正常系 | `ui_master_main.md` §5.2.1 | GET `/api/v1/master/creator` | OK | |
| 3-1-5 | ステータスフィルターで「アクティブ」に絞り込みできること | 正常系 | `ui_master_main.md` §5.2.2 | GET `/api/v1/master/creator` | OK | ステータスフィルタなし |
| 3-1-6 | ステータスフィルターで「非アクティブ」に絞り込みできること | 正常系 | `ui_master_main.md` §5.2.2 | GET `/api/v1/master/creator` | OK | ステータスフィルタなし |
| 3-1-7 | 「追加」ボタンから Creator を新規作成できること | 正常系 | 要件書#3、`ui_master_add_dialog.md` §5.2 | POST `/api/v1/master/creator` | OK | |
| 3-1-8 | Creator ID が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §7.1 | - | OK | |
| 3-1-9 | Creator ID に使用不可文字（日本語・スペース等）を含む場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.1 | - | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-324 |
| 3-1-10 | Creator ID が 50 文字超の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.1 | - | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-325 |
| 3-1-11 | 既存の Creator ID と重複する場合に重複エラーが表示されること | 異常系 | `ui_master_add_dialog.md` §7.2（MASTER_ID_DUPLICATE） | POST `/api/v1/master/creator` | OK | |
| 3-1-12 | 「編集」ボタンから Creator 名を編集して保存できること | 正常系 | 要件書#3、`ui_master_edit_dialog.md` §5.2 | PUT `/api/v1/master/creator/:creatorId` | OK | |
| 3-1-13 | 編集ダイアログで Creator ID が読み取り専用（変更不可）であること | 表示確認 | `ui_master_edit_dialog.md` §4.1 | - | OK | |
| 3-1-14 | Creator 名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_edit_dialog.md` §8.1 | - | OK | |
| 3-1-15 | 操作カラムの「非アクティブ化」ボタンから Creator を非アクティブ化できること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.1（操作カラム） | PATCH `/api/v1/master/creator/:creatorId/status` | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-326 |
| 3-1-16 | 操作カラムの「アクティブ化」ボタンから Creator をアクティブ化できること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.1（操作カラム） | PATCH `/api/v1/master/creator/:creatorId/status` | OK | |
| 3-1-17 | CSV ダウンロードボタンをクリックすると Creator 一覧 CSV がダウンロードされること | 正常系 | 要件書#3、`ui_master_main.md` §5.2.3 | GET `/api/v1/master/creator/download-csv` | OK | |
| 3-1-18 | CSV ファイルを編集してアップロードすると Creator が一括作成されること | 正常系 | 要件書#3、`ui_master_main.md` §5.2.4 | POST `/api/v1/master/creator/upload-csv` | OK | |
| 3-1-19 | 不正な CSV ファイルをアップロードするとエラー詳細（行番号・エラー内容）が表示されること | 異常系 | `api_master_management.md` §3（エラーレスポンス） | POST `/api/v1/master/creator/upload-csv` | OK | |

**前提条件:**
- data_admin ロールでログイン済み
- データ管理者メニュー > マスタ管理 > Creator タブが表示されている
- 検索・フィルタシナリオ（3-1-4〜3-1-6）用: Creator マスタが複数件（アクティブ/非アクティブ混在）存在すること
- 表示切替シナリオ（3-1-2〜3-1-3）用: 共通マスタ（`organization_id IS NULL`）が 1 件以上存在すること
- 編集シナリオ（3-1-12〜3-1-14）用: 編集対象の Creator マスタが 1 件以上存在すること
- アクティブ/非アクティブ化シナリオ（3-1-15〜3-1-16）用: アクティブな Creator とアクティブでない Creator が各 1 件以上存在すること
- CSV アップロードシナリオ（3-1-18〜3-1-19）用: 事前に CSV ダウンロードを実行してテンプレートを入手すること

**後処理:**
- 新規作成した Creator マスタを `creator` テーブルから削除（3-1-7、3-1-18）
- ダウンロードした CSV ファイルをローカルから削除（3-1-17）

**ビジネスルール（設計書より）:**
- Creator ID は英数字・アンダースコア・ハイフンのみ使用可（最大 50 文字）
- Creator 名は最大 50 文字
- Creator ID は同一組織内で一意であること
- Creator ID は作成後に変更不可（主キーのため）
- `display_scope=all` の場合、共通マスタ（`organization_id IS NULL`）も含めて表示される

---

### 3-2: Vendor マスタ管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 3-2-1 | Vendor マスタ一覧が表示されること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.2 | GET `/api/v1/master/vendor` | OK | |
| 3-2-2 | Vendor ID・Vendor 名のキーワードで検索できること | 正常系 | `ui_master_main.md` §5.2.1 | GET `/api/v1/master/vendor` | OK | |
| 3-2-3 | ステータスフィルターで「アクティブ」に絞り込みできること | 正常系 | `ui_master_main.md` §5.2.2 | GET `/api/v1/master/vendor` | OK | ステータスフィルタなし |
| 3-2-4 | ステータスフィルターで「非アクティブ」に絞り込みできること | 正常系 | `ui_master_main.md` §5.2.2 | GET `/api/v1/master/vendor` | OK | ステータスフィルタなし |
| 3-2-5 | 「追加」ボタンから Vendor を新規作成できること | 正常系 | 要件書#3、`ui_master_add_dialog.md` §5.2 | POST `/api/v1/master/vendor` | OK | |
| 3-2-6 | Vendor ID が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §7.1 | - | OK | |
| 3-2-7 | Vendor ID に使用不可文字（日本語・スペース等）を含む場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.1 | - | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-324 |
| 3-2-8 | Vendor ID が 50 文字超の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.1 | - | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-325 |
| 3-2-9 | 既存の Vendor ID と重複する場合に重複エラーが表示されること | 異常系 | `ui_master_add_dialog.md` §7.2（MASTER_ID_DUPLICATE） | POST `/api/v1/master/vendor` | OK | |
| 3-2-10 | 「編集」ボタンから Vendor 名を編集して保存できること | 正常系 | 要件書#3、`ui_master_edit_dialog.md` §5.2 | PUT `/api/v1/master/vendor/:vendorId` | OK | |
| 3-2-11 | 編集ダイアログで Vendor ID が読み取り専用（変更不可）であること | 表示確認 | `ui_master_edit_dialog.md` §4.1 | - | OK | |
| 3-2-12 | Vendor 名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_edit_dialog.md` §8.1 | - | OK | |
| 3-2-13 | 操作カラムの「非アクティブ化」ボタンから Vendor を非アクティブ化できること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.2（操作カラム） | PATCH `/api/v1/master/vendor/:vendorId/status` | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-326 |
| 3-2-14 | 操作カラムの「アクティブ化」ボタンから Vendor をアクティブ化できること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.2（操作カラム） | PATCH `/api/v1/master/vendor/:vendorId/status` | OK | |
| 3-2-15 | CSV ダウンロードボタンをクリックすると Vendor 一覧 CSV がダウンロードされること | 正常系 | 要件書#3、`ui_master_main.md` §5.2.3 | GET `/api/v1/master/vendor/download-csv` | OK | |
| 3-2-16 | CSV ファイルを編集してアップロードすると Vendor が一括作成されること | 正常系 | 要件書#3、`ui_master_main.md` §5.2.4 | POST `/api/v1/master/vendor/upload-csv` | OK | |
| 3-2-17 | 不正な CSV ファイルをアップロードするとエラー詳細（行番号・エラー内容）が表示されること | 異常系 | `api_master_management.md` §3（エラーレスポンス） | POST `/api/v1/master/vendor/upload-csv` | OK | |

**前提条件:**
- data_admin ロールでログイン済み
- データ管理者メニュー > マスタ管理 > Vendor タブが表示されている
- 検索・フィルタシナリオ（3-2-2〜3-2-4）用: Vendor マスタが複数件（アクティブ/非アクティブ混在）存在すること
- 編集シナリオ（3-2-10〜3-2-12）用: 編集対象の Vendor マスタが 1 件以上存在すること
- アクティブ/非アクティブ化シナリオ（3-2-13〜3-2-14）用: アクティブな Vendor とアクティブでない Vendor が各 1 件以上存在すること
- CSV アップロードシナリオ（3-2-16〜3-2-17）用: 事前に CSV ダウンロードを実行してテンプレートを入手すること

**後処理:**
- 新規作成した Vendor マスタを `vendor` テーブルから削除（3-2-5、3-2-16）
- ダウンロードした CSV ファイルをローカルから削除（3-2-15）

**ビジネスルール（設計書より）:**
- Vendor ID は英数字・アンダースコア・ハイフンのみ使用可（最大 50 文字）
- Vendor 名は最大 50 文字
- Vendor ID は同一組織内で一意であること
- Vendor ID は作成後に変更不可（主キーのため）
- Vendor マスタは Instrument マスタから参照されるため、非アクティブ化後も Instrument の参照先として使用される

---

### 3-3: Instrument マスタ管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 3-3-1 | Instrument マスタ一覧が表示されること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.3 | GET `/api/v1/master/instrument` | OK | |
| 3-3-2 | Instrument ID・Instrument 名のキーワードで検索できること | 正常系 | `ui_master_main.md` §5.2.1 | GET `/api/v1/master/instrument` | OK | |
| 3-3-3 | ステータスフィルターで「アクティブ」に絞り込みできること | 正常系 | `ui_master_main.md` §5.2.2 | GET `/api/v1/master/instrument` | OK | ステータスフィルタなし |
| 3-3-4 | ステータスフィルターで「非アクティブ」に絞り込みできること | 正常系 | `ui_master_main.md` §5.2.2 | GET `/api/v1/master/instrument` | OK | ステータスフィルタなし |
| 3-3-5 | 「追加」ボタンから Instrument を新規作成できること（Vendor ID を選択して保存） | 正常系 | 要件書#3、`ui_master_add_dialog.md` §3.3 | POST `/api/v1/master/instrument` | OK | |
| 3-3-6 | Instrument ID が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §7.1 | - | OK | |
| 3-3-7 | Instrument ID に使用不可文字（日本語・スペース等）を含む場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.1 | - | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-324 |
| 3-3-8 | Instrument ID が 50 文字超の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.1 | - | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-325 |
| 3-3-9 | 既存の Instrument ID と重複する場合に重複エラーが表示されること | 異常系 | `ui_master_add_dialog.md` §7.2（MASTER_ID_DUPLICATE） | POST `/api/v1/master/instrument` | OK | |
| 3-3-10 | Instrument 追加ダイアログで Vendor ID が未選択の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_add_dialog.md` §4.3 | - | OK | Vender選択機能はない |
| 3-3-11 | 「編集」ボタンから Instrument 名・Vendor ID を編集して保存できること | 正常系 | 要件書#3、`ui_master_edit_dialog.md` §5.2 | PUT `/api/v1/master/instrument/:instrumentId` | OK | |
| 3-3-12 | 編集ダイアログで Instrument ID が読み取り専用（変更不可）であること | 表示確認 | `ui_master_edit_dialog.md` §4.1 | - | OK | |
| 3-3-13 | Instrument 名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_master_edit_dialog.md` §8.1 | - | OK | |
| 3-3-14 | 操作カラムの「非アクティブ化」ボタンから Instrument を非アクティブ化できること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.3（操作カラム） | PATCH `/api/v1/master/instrument/:instrumentId/status` | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-326 |
| 3-3-15 | 操作カラムの「アクティブ化」ボタンから Instrument をアクティブ化できること | 正常系 | 要件書#3、`ui_master_main.md` §6.2.3（操作カラム） | PATCH `/api/v1/master/instrument/:instrumentId/status` | OK | |
| 3-3-16 | CSV ダウンロードボタンをクリックすると Instrument 一覧 CSV がダウンロードされること | 正常系 | 要件書#3、`ui_master_main.md` §5.2.3 | GET `/api/v1/master/instrument/download-csv` | OK | |
| 3-3-17 | CSV ファイルを編集してアップロードすると Instrument が一括作成されること | 正常系 | 要件書#3、`ui_master_main.md` §5.2.4 | POST `/api/v1/master/instrument/upload-csv` | OK | |
| 3-3-18 | 不正な CSV ファイルをアップロードするとエラー詳細（行番号・エラー内容）が表示されること | 異常系 | `api_master_management.md` §3（エラーレスポンス） | POST `/api/v1/master/instrument/upload-csv` | OK | |

**前提条件:**
- data_admin ロールでログイン済み
- データ管理者メニュー > マスタ管理 > Instrument タブが表示されている
- 検索・フィルタシナリオ（3-3-2〜3-3-4）用: Instrument マスタが複数件（アクティブ/非アクティブ混在）存在すること
- 新規作成・編集シナリオ（3-3-5、3-3-11）用: アクティブな Vendor マスタが 1 件以上存在すること（Vendor ID プルダウンに表示されること）
- 編集シナリオ（3-3-11〜3-3-13）用: 編集対象の Instrument マスタが 1 件以上存在すること
- アクティブ/非アクティブ化シナリオ（3-3-14〜3-3-15）用: アクティブな Instrument とアクティブでない Instrument が各 1 件以上存在すること
- CSV アップロードシナリオ（3-3-17〜3-3-18）用: 事前に CSV ダウンロードを実行してテンプレートを入手すること

**後処理:**
- 新規作成した Instrument マスタを `instrument` テーブルから削除（3-3-5、3-3-17）
- ダウンロードした CSV ファイルをローカルから削除（3-3-16）

**ビジネスルール（設計書より）:**
- Instrument ID は英数字・アンダースコア・ハイフンのみ使用可（最大 50 文字）
- Instrument 名は最大 50 文字
- Instrument ID は同一組織内で一意であること
- Instrument ID は作成後に変更不可（主キーのため）
- Instrument 作成・編集時に Vendor ID の選択が必須（アクティブな Vendor マスタから選択）

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
| ロール | data_admin |
| ユーザーID | 要確認 |
| パスワード | 要確認 |

### 3.3 テスト用データ

| データ | 用途 | 準備方法 |
|--------|------|---------|
| Creator マスタ（アクティブ/非アクティブ混在、複数件） | 3-1（検索・フィルタ・アクティブ化確認） | テスト実行前に `creator` テーブルへ挿入 |
| 共通マスタ（`organization_id IS NULL` の Creator） | 3-1-2〜3-1-3（display_scope 切替確認） | テスト実行前に `creator` テーブルへ挿入 |
| Vendor マスタ（アクティブ/非アクティブ混在、複数件） | 3-2（検索・フィルタ・アクティブ化確認）、3-3（Instrument 作成時の参照） | テスト実行前に `vendor` テーブルへ挿入 |
| Instrument マスタ（アクティブ/非アクティブ混在、複数件） | 3-3（検索・フィルタ・アクティブ化確認） | テスト実行前に `instrument` テーブルへ挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 1 | 名前空間の定義（`<property>`・`<content>`要素の定義） | ❌ 設計書に未定義 | - | **対象外** |
| 2 | プロパティの登録・エディタのカスタマイズ | ❌ 設計書に未定義 | - | **対象外** |
| 3 | 実験機器・計測機器の登録（Creator / Vendor / Instrument マスタ） | ✅ `MasterManagement`（Creator / Vendor / Instrument タブ） | GET・POST・PUT・PATCH `/api/v1/master/{creator\|vendor\|instrument}` | **3-1・3-2・3-3** |
| 4 | ユーザー詳細情報の登録・設定 | ❌ 設計書に未定義 | - | **対象外** |
| 5 | ワークフローベースの作成 | ❌ 設計書に未定義 | - | **対象外** |
| 6 | バックアップのタイミング・バックアップ先の設定 | ❌ 設計書に未定義 | - | **対象外** |
| 7 | データの削除権限の行使（ごみ箱内ファイルの削除含む） | ❌ 設計書に未定義 | - | **対象外** |
| 8 | 操作履歴の閲覧（自身・システム管理者） | ❌ 設計書に未定義 | - | **対象外** |
| 9 | 削除データの関係者への通知 | ❌ 設計書に未定義 | - | **対象外** |
| 10 | ファイルからのデータ入力（外注試験報告書・Excel読み込み） | ❌ 設計書に未定義 | - | **対象外** |
| 11 | データマート内の保存データの削除権限の行使 | ❌ 設計書に未定義 | - | **対象外** |
| 12 | システムダウン時の異常状態の詳細通知の受信 | ❌ 設計書に未定義 | - | **対象外** |

---

## 5. 参照ドキュメント

### 5.1 UI設計書

| ドキュメント | パス |
|------------|------|
| マスタ管理メイン画面設計 | `docs/design/ui/ui_master_main.md` |
| マスタ追加ダイアログ設計 | `docs/design/ui/ui_master_add_dialog.md` |
| マスタ編集ダイアログ設計 | `docs/design/ui/ui_master_edit_dialog.md` |

### 5.2 API設計書

| ドキュメント | パス |
|------------|------|
| マスタ管理API設計 | `docs/design/api/api_master_management.md` |

### 5.3 その他

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
