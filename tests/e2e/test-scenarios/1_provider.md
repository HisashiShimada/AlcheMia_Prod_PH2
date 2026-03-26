# プロバイダー シナリオテスト対象一覧

> **作成日**: 2026-03-24  
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）  
> **照合先**: UI設計書（`docs/design/ui/`）、API設計書（`docs/design/api/`）

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

| テストグループID | テストグループ名 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|-----------|-----------|------|-------|-------|
| **1-1** | 会社の作成 | 7件 | Playwright自動 | - | - | 7 |
| **1-2** | 会社の編集 | 6件 | Playwright自動 | - | - | 6 |
| **1-3** | 会社のアクティブ/非アクティブ化 | 5件 | Playwright自動 | - | - | 5 |
| **1-4** | 会社のCSVダウンロード・アップロード | 4件 | Playwright自動 | - | - | 4 |
| **1-5** | 組織の作成 | 7件 | Playwright自動 | - | - | 7 |
| **1-6** | 組織の編集 | 8件 | Playwright自動 | - | - | 8 |
| **1-7** | 組織のアクティブ/非アクティブ化 | 5件 | Playwright自動 | - | - | 5 |
| **1-8** | 組織のCSVダウンロード・アップロード | 4件 | Playwright自動 | - | - | 4 |
| **1-9** | 全組織の課金情報CSVダウンロード | 2件 | Playwright自動 | - | - | 2 |
| **合計** | - | **48件** | - | - | - | - |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| ユーザーID/PWの発行・登録 | システム管理者ロールの業務範囲（2_system_management）でカバー |
| 部門／グループの作成・設定 | システム管理者ロールの業務範囲（2_system_management）でカバー |
| アクセス権限（パーミッション）の管理 | システム管理者ロールの業務範囲（2_system_management）でカバー |
| システムダウン時の詳細通知受信 | 設計書に実装なし |
| メンテナンス通知の発信 | 設計書に実装なし |
| システム稼働状況の管理・最適化 | 設計書に実装なし |

---

## 2. シナリオ詳細一覧

### 1-1: 会社の作成

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-1-1 | アクティブな会社を新規作成できること | 正常系 | `ui_corporation_add_dialog.md` §3.1 | POST `/api/v1/provider/corporation` | － | |
| 1-1-2 | 非アクティブな会社を新規作成できること | 正常系 | `ui_corporation_add_dialog.md` §3.3 | POST `/api/v1/provider/corporation` | － | |
| 1-1-3 | 会社追加ダイアログをキャンセルしても会社が作成されないこと | 正常系 | `ui_corporation_add_dialog.md` §4.1 | - | － | |
| 1-1-4 | 会社追加ダイアログの初期状態が正しいこと | 表示確認 | `ui_corporation_add_dialog.md` §2.2 | - | － | |
| 1-1-5 | 会社名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_corporation_add_dialog.md` §3.2 バリデーション | - | － | |
| 1-1-6 | 会社名が51文字以上の場合にバリデーションエラーが表示されること | 異常系 | `ui_corporation_add_dialog.md` §3.2 バリデーション | - | － | |
| 1-1-7 | 既存の会社名を入力した場合に重複エラーが表示されること | 異常系 | `ui_corporation_add_dialog.md` §6.2、API 409エラー | POST `/api/v1/provider/corporation` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 会社管理画面が表示されている
- 1-1-7: DBに会社名 "MaimlソフトYYY" が1件存在すること

**後処理:**
- 作成した会社を `corporation` テーブルから削除（1-1-1、1-1-2）

---

### 1-2: 会社の編集

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-2-1 | 会社名を変更して保存できること | 正常系 | `ui_corporation_edit_dialog.md` | PUT `/api/v1/provider/corporation/:corporationId` | － | |
| 1-2-2 | 会社の状態をアクティブから非アクティブに変更して保存できること | 正常系 | `ui_corporation_edit_dialog.md` | PUT `/api/v1/provider/corporation/:corporationId` | － | |
| 1-2-3 | 会社の状態を非アクティブからアクティブに変更して保存できること | 正常系 | `ui_corporation_edit_dialog.md` | PUT `/api/v1/provider/corporation/:corporationId` | － | |
| 1-2-4 | 会社編集ダイアログをキャンセルしても変更が保存されないこと | 正常系 | `ui_corporation_edit_dialog.md` §キャンセル | - | － | |
| 1-2-5 | 会社編集ダイアログに既存の値が表示されること | 表示確認 | `ui_corporation_edit_dialog.md` §初期値 | GET `/api/v1/provider/corporation/:corporationId` | － | |
| 1-2-6 | 会社名を空にして保存しようとするとバリデーションエラーが表示されること | 異常系 | `ui_corporation_edit_dialog.md` §バリデーション | - | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 会社管理画面が表示されている
- DBに常設テスト用会社 "MaimlソフトAAA"（1-2-1用・is_active=true）が存在すること
- DBに常設テスト用会社 "MaimlソフトBBB"（1-2-2〜1-2-6用・is_active=true）が存在すること

**後処理:**
- 1-2-1: 変更した会社名を "MaimlソフトAAA" に戻す

---

### 1-3: 会社のアクティブ/非アクティブ化

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-3-1 | 個別ボタンでアクティブな会社を非アクティブに切り替えられること | 正常系 | `ui_corporation_main.md` §4.2.5 | PATCH `/api/v1/provider/corporation/:corporationId/status` | － | |
| 1-3-2 | 個別ボタンで非アクティブな会社をアクティブに切り替えられること | 正常系 | `ui_corporation_main.md` §4.2.5 | PATCH `/api/v1/provider/corporation/:corporationId/status` | － | |
| 1-3-3 | 個別切り替えダイアログをキャンセルしても状態が変わらないこと | 正常系 | `ui_corporation_main.md` §7.6 | - | － | |
| 1-3-4 | 複数選択して一括アクティブ化できること | 正常系 | `ui_corporation_main.md` §一括操作 | PATCH `/api/v1/provider/corporation/bulk-status` | － | |
| 1-3-5 | 複数選択して一括非アクティブ化できること | 正常系 | `ui_corporation_main.md` §一括操作 | PATCH `/api/v1/provider/corporation/bulk-status` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 会社管理画面が表示されている
- DBに常設テスト用会社 "MaimlソフトBBB"（is_active=true）が存在すること
- DBに常設テスト用会社 "MaimlソフトCCC"（1-3-1用・is_active=true）が存在すること
- DBに常設テスト用会社 "MaimlソフトDDD"（1-3-2用・is_active=false）が存在すること
- DBに常設テスト用会社 "MaimlソフトYYY"（1-3-4用）が存在すること
- DBに常設テスト用会社 "MaimlソフトAAA"（1-3-5用・is_active=true）が存在すること

**後処理:**
- 1-3-1: "MaimlソフトCCC" をis_active=trueに戻す
- 1-3-2: "MaimlソフトDDD" をis_active=falseに戻す
- 1-3-4: "MaimlソフトYYY" の状態を元に戻す
- 1-3-5: "MaimlソフトAAA" の状態を元に戻す

---

### 1-4: 会社のCSVダウンロード・アップロード

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-4-1 | CSVダウンロードボタンをクリックするとCSVファイルが取得できること | 正常系 | `ui_corporation_main.md` §3.2.3 | GET `/api/v1/provider/corporation/download-csv` | － | |
| 1-4-2 | ダウンロードしたCSVに会社名を追加してアップロードすると会社が作成されること | 正常系 | `ui_corporation_main.md` §3.2.4 | POST `/api/v1/provider/corporation/upload-csv` | － | |
| 1-4-3 | 既存の会社名を含むCSVをアップロードするとエラーが表示されること | 異常系 | `ui_corporation_main.md` §6.4 | POST `/api/v1/provider/corporation/upload-csv` | － | |
| 1-4-4 | 会社名が空のCSVをアップロードするとエラーが表示されること | 異常系 | `ui_corporation_main.md` §6.4 | POST `/api/v1/provider/corporation/upload-csv` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 会社管理画面が表示されている
- 1-4-2用アップロードCSVファイル: `tests/e2e/fixtures/csv/upload/corporations_valid.csv`（会社名 "E2E_CSV追加会社" を含む）
- 1-4-3用アップロードCSVファイル: `tests/e2e/fixtures/csv/upload/corporations_dup.csv`（既存会社名を含む）
- 1-4-4用アップロードCSVファイル: `tests/e2e/fixtures/csv/upload/corporations_empty.csv`（会社名が空行を含む）

**CSVフォーマット（設計書より）:**
```csv
会社ID,会社名,状態
CORP001,テスト会社,アクティブ
```

**後処理:**
- 1-4-2: アップロードで作成された会社 "E2E_CSV追加会社" を `corporation` テーブルから削除
- 1-4-1: ダウンロードしたCSVファイルをローカルから削除

---

### 1-5: 組織の作成

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-5-1 | アクティブな組織を新規作成できること | 正常系 | `ui_organization_add_dialog.md` §4.8 | POST `/api/v1/provider/organization` | － | |
| 1-5-2 | 非アクティブな組織を新規作成できること | 正常系 | `ui_organization_add_dialog.md` §4.8 | POST `/api/v1/provider/organization` | － | |
| 1-5-3 | 組織追加ダイアログをキャンセルしても組織が作成されないこと | 正常系 | `ui_organization_add_dialog.md` §5.1 | - | － | |
| 1-5-4 | 組織追加ダイアログの初期状態が正しいこと | 表示確認 | `ui_organization_add_dialog.md` §3.2 | - | － | |
| 1-5-5 | 組織CDが未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_organization_add_dialog.md` §4.1 バリデーション | - | － | |
| 1-5-6 | 組織表示名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `ui_organization_add_dialog.md` §4.2 バリデーション | - | － | |
| 1-5-7 | 既存の組織CDを入力した場合に重複エラーが表示されること | 異常系 | `ui_organization_add_dialog.md` §7.2、API 409エラー | POST `/api/v1/provider/organization` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 組織管理画面が表示されている
- 1-5-1: DBに組織CD "e2e-org-test-001" が存在しないこと
- 1-5-2: DBに組織CD "e2e-org-test-002" が存在しないこと
- 1-5-7: DBに常設テスト用組織 "e2e-permanent-org-aaa" が存在すること

**作成時の自動処理（設計書より）:**
- `organization`、`organization_user`、`role`（ROLE002: システム管理者）、`role_permission`（4機能権限）の4テーブルに自動挿入

**後処理:**
- 1-5-1: 作成した組織CD "e2e-org-test-001" のレコードを関連テーブルごと削除
- 1-5-2: 作成した組織CD "e2e-org-test-002" のレコードを関連テーブルごと削除

---

### 1-6: 組織の編集

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-6-1 | 組織表示名を変更して保存できること | 正常系 | `ui_organization_edit_dialog.md` | PUT `/api/v1/provider/organization/:organizationId` | － | |
| 1-6-2 | 組織の状態をアクティブから非アクティブに変更して保存できること | 正常系 | `ui_organization_edit_dialog.md` | PUT `/api/v1/provider/organization/:organizationId` | － | |
| 1-6-3 | 組織の状態を非アクティブからアクティブに変更して保存できること | 正常系 | `ui_organization_edit_dialog.md` | PUT `/api/v1/provider/organization/:organizationId` | － | |
| 1-6-4 | 組織編集ダイアログをキャンセルしても変更が保存されないこと | 正常系 | `ui_organization_edit_dialog.md` §キャンセル | - | － | |
| 1-6-5 | 組織編集ダイアログに既存の値が表示されること | 表示確認 | `ui_organization_edit_dialog.md` §初期値 | GET `/api/v1/provider/organization/:organizationId` | － | |
| 1-6-6 | 組織表示名を空にして保存しようとするとバリデーションエラーが表示されること | 異常系 | `ui_organization_edit_dialog.md` §バリデーション | - | － | |
| 1-6-7 | 組織表示名を51文字以上に変更するとバリデーションエラーが表示されること | 異常系 | `ui_organization_edit_dialog.md` §バリデーション | - | － | |
| 1-6-8 | 既存の別組織表示名に変更しようとすると重複エラーが表示されること | 異常系 | `ui_organization_edit_dialog.md` §エラー、API 409エラー | PUT `/api/v1/provider/organization/:organizationId` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 組織管理画面が表示されている
- DBに常設テスト用組織 "E2E組織編集前"（1-6-1用）が存在すること
- DBに常設テスト用組織 "E2E組織トグルBBB"（1-6-2〜1-6-8用・is_active=true）が存在すること
- DBに常設テスト用組織 "E2E常設組織AAA"（1-6-8の重複チェック用）が存在すること

**後処理:**
- 1-6-1: 変更した組織表示名を "E2E組織編集前" に戻す

---

### 1-7: 組織のアクティブ/非アクティブ化

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-7-1 | 個別ボタンでアクティブな組織を非アクティブに切り替えられること | 正常系 | `ui_organization_main.md` §5.2.8 | PATCH `/api/v1/provider/organization/:organizationId/status` | － | |
| 1-7-2 | 個別ボタンで非アクティブな組織をアクティブに切り替えられること | 正常系 | `ui_organization_main.md` §5.2.8 | PATCH `/api/v1/provider/organization/:organizationId/status` | － | |
| 1-7-3 | 個別切り替えダイアログをキャンセルしても状態が変わらないこと | 正常系 | `ui_organization_main.md` §8.5 | - | － | |
| 1-7-4 | 複数選択して一括アクティブ化できること | 正常系 | `ui_organization_main.md` §一括操作 | PATCH `/api/v1/provider/organization/bulk-status` | － | |
| 1-7-5 | 複数選択して一括非アクティブ化できること | 正常系 | `ui_organization_main.md` §一括操作 | PATCH `/api/v1/provider/organization/bulk-status` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 組織管理画面が表示されている
- DBに常設テスト用組織 "E2E組織トグルBBB"（is_active=true）が存在すること
- DBに常設テスト用組織 "E2E組織トグルCCC"（1-7-1用・is_active=true）が存在すること
- DBに常設テスト用組織 "E2E組織トグルDDD"（1-7-2用・is_active=false）が存在すること
- DBに常設テスト用組織 "E2E常設組織AAA"（1-7-4〜1-7-5用）が存在すること

**後処理:**
- 1-7-1: "E2E組織トグルCCC" をis_active=trueに戻す
- 1-7-2: "E2E組織トグルDDD" をis_active=falseに戻す
- 1-7-4: "E2E常設組織AAA" の状態を元に戻す
- 1-7-5: "E2E常設組織AAA" の状態を元に戻す

---

### 1-8: 組織のCSVダウンロード・アップロード

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-8-1 | CSVダウンロードボタンをクリックすると組織CSVファイルが取得できること | 正常系 | `ui_organization_main.md` §4.2.3 | GET `/api/v1/provider/organization/download-csv` | － | |
| 1-8-2 | ダウンロードしたCSVに組織表示名を追加してアップロードすると組織が作成されること | 正常系 | `ui_organization_main.md` §4.2.4 | POST `/api/v1/provider/organization/upload-csv` | － | |
| 1-8-3 | 既存の組織表示名を含むCSVをアップロードするとエラーが表示されること | 異常系 | `ui_organization_main.md` §CSVアップロード | POST `/api/v1/provider/organization/upload-csv` | － | |
| 1-8-4 | 組織表示名が空のCSVをアップロードするとエラーが表示されること | 異常系 | `ui_organization_main.md` §CSVアップロード | POST `/api/v1/provider/organization/upload-csv` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 組織管理画面が表示されている
- 1-8-2用アップロードCSVファイル: `tests/e2e/fixtures/csv/upload/organizations_valid.csv`（組織表示名 "E2ECSVUP組織ZZZ" を含む）
- 1-8-3用アップロードCSVファイル: `tests/e2e/fixtures/csv/upload/organizations_dup.csv`（既存組織表示名を含む）
- 1-8-4用アップロードCSVファイル: `tests/e2e/fixtures/csv/upload/organizations_empty.csv`（組織表示名が空行を含む）

**CSVフォーマット（設計書より）:**
```csv
organization_cd,organization_display_name,organization_email,chief_user_name,chief_user_email,corporation_name,is_entry,update_at,is_active
```

**後処理:**
- 1-8-2: アップロードで作成された組織 "E2ECSVUP組織ZZZ" を関連テーブルごと削除
- 1-8-1: ダウンロードしたCSVファイルをローカルから削除

---

### 1-9: 全組織の課金情報CSVダウンロード

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 1-9-1 | CSVダウンロードボタンをクリックするとCSVファイルが取得できること | 正常系 | `ui_information_download_main.md` §4.1 | GET `/api/v1/provider/organization/download-information-csv` | － | |
| 1-9-2 | ダウンロードした情報CSVに正しいヘッダーが含まれること | 表示確認 | `ui_information_download_main.md` §6.4 | GET `/api/v1/provider/organization/download-information-csv` | － | |

**前提条件:**
- プロバイダーロールでログイン済み
- 情報ダウンロード画面が表示されている
- DBに1件以上の組織データが存在すること

**CSVカラム構成（設計書より）:**

| カラム名 | 説明 |
|---------|------|
| 組織CD | 組織コード |
| 組織表示名 | 組織表示名 |
| 組織e-mail | 組織メールアドレス |
| 代表システム管理者 | 代表者名 |
| 会社名 | 所属会社名 |
| 契約容量 | 契約ストレージ容量 |
| 契約ユーザー数 | 契約ユーザー上限数 |
| 契約プロジェクト数 | 契約プロジェクト上限数 |
| ストレージ使用量 | 現在のストレージ使用量 |
| プロジェクト数 | 現在のプロジェクト数 |
| アクティブユーザー数 | アクティブユーザー数 |

**後処理:**
- ダウンロードしたCSVファイルをローカルから削除

---

## 3. テスト実行に必要な前提情報

### 3.1 テスト環境

| 項目 | 値 |
|------|-----|
| フロントエンドURL | http://localhost:3000 |
| バックエンドURL | http://localhost:3001 |
| DB接続 | PostgreSQL（直接接続でDB検証用） |

### 3.2 テストユーザー

| 項目 | 値 |
|------|-----|
| ロール | provider |
| ユーザーID | seiya.takizawa@soft-service.co.jp |
| パスワード | 要確認 |

### 3.3 常設テストデータ（事前にDBへ挿入が必要）

| データ | 用途 | 準備方法 |
|--------|------|---------|
| 会社 "MaimlソフトAAA"（is_active=true） | 1-2-1（会社名変更）、1-3-5（一括非アクティブ化） | テスト実行前にDBに挿入 |
| 会社 "MaimlソフトBBB"（is_active=true） | 1-2-2〜1-2-6、1-3-3 | テスト実行前にDBに挿入 |
| 会社 "MaimlソフトCCC"（is_active=true） | 1-3-1（非アクティブ化） | テスト実行前にDBに挿入 |
| 会社 "MaimlソフトDDD"（is_active=false） | 1-3-2（アクティブ化） | テスト実行前にDBに挿入 |
| 会社 "MaimlソフトYYY"（is_active=false） | 1-1-7（重複チェック）、1-3-4（一括アクティブ化） | テスト実行前にDBに挿入 |
| 組織 "E2E組織編集前" | 1-6-1（組織表示名変更） | テスト実行前にDBに挿入 |
| 組織 "E2E組織トグルBBB"（is_active=true） | 1-6-2〜1-6-8、1-7-3 | テスト実行前にDBに挿入 |
| 組織 "E2E組織トグルCCC"（is_active=true） | 1-7-1（非アクティブ化） | テスト実行前にDBに挿入 |
| 組織 "E2E組織トグルDDD"（is_active=false） | 1-7-2（アクティブ化） | テスト実行前にDBに挿入 |
| 組織 "E2E常設組織AAA" | 1-5-7（重複チェック）、1-6-8（重複チェック）、1-7-4〜1-7-5 | テスト実行前にDBに挿入 |
| 組織 "e2e-permanent-org-aaa"（組織CD） | 1-5-7（組織CD重複チェック） | テスト実行前にDBに挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 要件書 # | 業務内容（プロバイダー） | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|------------------------|---------------------|---------|-----------|
| 1 | ユーザーID/PWの発行・登録 | ✅ システム管理者と共通（`ui_user_main.md`） | POST `/api/v1/provider/user` | **対象外**（2_system_management でカバー） |
| 2 | 部門／グループの作成・設定 | ✅ システム管理者と共通（`ui_department_main.md`） | POST `/api/v1/provider/department` | **対象外**（2_system_management でカバー） |
| 3 | アクセス権限（パーミッション）の管理 | ✅ システム管理者と共通（`ui_role_main.md`） | POST `/api/v1/provider/role` | **対象外**（2_system_management でカバー） |
| 4 | システムの開発・テスト・要求仕様充足の確認 | ❌ 設計書に未定義 | - | **対象外** |
| 5 | システム運用責任の管理 | ❌ 設計書に未定義 | - | **対象外** |
| 6 | システムダウン時の異常状態の詳細通知の受信 | ❌ 設計書に未定義 | - | **対象外** |
| 7 | メンテナンス等の事前通知の発信 | ❌ 設計書に未定義 | - | **対象外** |
| 8 | システム稼働状況の管理・最適化 | ❌ 設計書に未定義 | - | **対象外** |
| - | 会社の作成・編集・アクティブ/非アクティブ化・CSV操作 | ✅ `ui_corporation_main.md`、`ui_corporation_add_dialog.md`、`ui_corporation_edit_dialog.md` | GET/POST/PUT/PATCH `/api/v1/provider/corporation` | **1-1〜1-4** |
| - | 組織の作成・編集・アクティブ/非アクティブ化・CSV操作 | ✅ `ui_organization_main.md`、`ui_organization_add_dialog.md`、`ui_organization_edit_dialog.md` | GET/POST/PUT/PATCH `/api/v1/provider/organization` | **1-5〜1-8** |
| - | 全組織の課金情報CSVダウンロード | ✅ `ui_information_download_main.md` | GET `/api/v1/provider/organization/download-information-csv` | **1-9** |

---

## 5. 参照ドキュメント

### 5.1 UI設計書

| ドキュメント | パス |
|------------|------|
| 会社管理メイン画面設計 | `docs/design/ui/ui_corporation_main.md` |
| 会社追加ダイアログ設計 | `docs/design/ui/ui_corporation_add_dialog.md` |
| 会社編集ダイアログ設計 | `docs/design/ui/ui_corporation_edit_dialog.md` |
| 組織管理メイン画面設計 | `docs/design/ui/ui_organization_main.md` |
| 組織追加ダイアログ設計 | `docs/design/ui/ui_organization_add_dialog.md` |
| 組織編集ダイアログ設計 | `docs/design/ui/ui_organization_edit_dialog.md` |
| 情報ダウンロード画面設計 | `docs/design/ui/ui_information_download_main.md` |
| 画面一覧 | `docs/design/ui/ui_screen_list.md` |

### 5.2 API設計書

| ドキュメント | パス |
|------------|------|
| マスタ管理API設計 | `docs/design/api/api_master.md` |
| 組織管理API設計 | `docs/design/api/api_organization_management.md` |

### 5.3 その他

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| プロバイダーfeatureファイル | `tests/e2e/features/1_provider/1_provider.feature` |
| プロバイダーステップ定義 | `tests/e2e/steps/1_provider/1_provider.ts` |
