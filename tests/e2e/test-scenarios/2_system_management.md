# システム管理者 シナリオテスト対象一覧

> **作成日**: 2026-03-24
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）
> **照合先**: UI設計書（`docs/design/ui/`）、API設計書（`docs/design/api/`）

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

| テストグループID | テストグループ名 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|-----------|-----------|------|-------|-------|
| **2-1** | システム概要 | 7件 | Playwright自動 | 7 | 0 | 0 |
| **2-2** | ユーザー管理 | 16件 | Playwright自動 | 16 | 0 | 0 |
| **2-3** | 部署管理 | 13件 | Playwright自動 | 13 | 0 | 0 |
| **2-4** | ロール管理 | 13件 | Playwright自動 | 13 | 0 | 0 |
| **合計** | - | **49件** | - | **49** | **0** | **0** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| システム異常通知の受信 | 設計書に実装なし |
| メンテナンス通知の発信 | 設計書に実装なし |
| 操作履歴の閲覧 | 設計書に実装なし |
| 接続機器タイムアウト通知 | 設計書に実装なし |
| セッション操作（強制切断等） | 専用画面が設計書に存在しない。セッション数の確認はシステム概要カードに統合 |

---

## 2. シナリオ詳細一覧

### 2-1: システム概要

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 2-1-1 | システム概要画面が表示され、5枚の統計カードが表示されること | 正常系 | `ui_system_overview_main.md` §3.3 | GET `/api/v1/systemManagement/system-overview` | OK | |
| 2-1-2 | ユーザーカードに「総ユーザー数」「アクティブ」「契約ユーザー数」が表示されること | 表示確認 | `ui_system_overview_main.md` §4.2 | GET `/api/v1/systemManagement/system-overview` | OK | |
| 2-1-3 | セッションカードに「総セッション」が表示されること | 表示確認 | `ui_system_overview_main.md` §4.3 | GET `/api/v1/systemManagement/system-overview` | OK | |
| 2-1-4 | 実験システムカードに「総プロジェクト数」「プロジェクト計画中/タスク実行待ち」「タスク実行中/タスク結果レビュー待ち」「プロジェクト完了/タスク異常終了」「契約プロジェクト数」が表示されること | 表示確認 | `ui_system_overview_main.md` §4.4 | GET `/api/v1/systemManagement/system-overview` | OK | |
| 2-1-5 | ストレージカードに「総ファイル数」「使用容量」「契約容量」が表示されること | 表示確認 | `ui_system_overview_main.md` §4.5 | GET `/api/v1/systemManagement/system-overview` | OK | |
| 2-1-6 | ログイン（過去7日）カードに「総ログイン」「成功」「失敗」が表示されること | 表示確認 | `ui_system_overview_main.md` §4.6 | GET `/api/v1/systemManagement/system-overview` | OK | |
| 2-1-7 | system_admin以外のロールでシステム概要画面にアクセスするとアクセスが拒否されること | 異常系 | `ui_system_overview_main.md` §1.3 | GET `/api/v1/systemManagement/system-overview` | OK | |

**前提条件:**
- system_admin ロールでログイン済み
- システム管理者メニューが表示されている
- 組織にユーザー・プロジェクト・ログイン履歴のデータが存在すること

---

### 2-2: ユーザー管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 2-2-1 | ユーザー一覧が表示されること | 正常系 | `ui_user_main.md` §5 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-2 | ユーザー名・メールアドレスで検索できること | 正常系 | `ui_user_main.md` §4.1 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-3 | 所属部署でフィルタリングできること | 正常系 | `ui_user_main.md` §4.2 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-4 | 二段階認証設定でフィルタリングできること | 正常系 | `ui_user_main.md` §4.3 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-5 | ロールでフィルタリングできること | 正常系 | `ui_user_main.md` §4.4 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-6 | 「追加」ボタンからユーザーを新規作成できること | 正常系 | `ui_user_main.md` §3.3 | POST `/api/v1/systemManagement/user` | OK | |
| 2-2-7 | ユーザー作成時に必須項目が未入力の場合にバリデーションエラーが表示されること | 異常系 | `api_user_management.md` §3 バリデーション | - | OK | |
| 2-2-8 | 既存のユーザーIDと重複するユーザーを作成しようとすると重複エラーが表示されること | 異常系 | `api_user_management.md` §3（409エラー） | POST `/api/v1/systemManagement/user` | OK | |
| 2-2-9 | 「編集」ボタンからユーザー情報を編集できること | 正常系 | `ui_user_main.md` §5.5 | PUT `/api/v1/systemManagement/user/:userId` | OK | |
| 2-2-10 | チェックボックスで複数ユーザーを選択し「アクティブ」ボタンで一括アクティブ化できること | 正常系 | `ui_user_main.md` §3.4 | PATCH `/api/v1/systemManagement/user/:userId/status` | OK | |
| 2-2-11 | チェックボックスで複数ユーザーを選択し「非アクティブ」ボタンで一括非アクティブ化できること | 正常系 | `ui_user_main.md` §3.5 | PATCH `/api/v1/systemManagement/user/:userId/status` | OK | |
| 2-2-12 | ユーザーが未選択の場合「アクティブ」「非アクティブ」ボタンが非活性であること | 表示確認 | `ui_user_main.md` §3.4、§3.5 | - | OK | |
| 2-2-13 | CSVダウンロードボタンをクリックするとユーザー一覧CSVがダウンロードされること | 正常系 | `ui_user_main.md` §3.2 | GET `/api/v1/systemManagement/user/download-csv` | OK | |
| 2-2-14 | CSVファイルを編集してアップロードするとユーザーが一括作成されること | 正常系 | `ui_user_main.md` §3.1 | POST `/api/v1/systemManagement/user/upload-csv` | OK | |
| 2-2-15 | 不正なCSVファイルをアップロードするとエラーメッセージが表示されること | 異常系 | `ui_user_main.md` §9.3 | POST `/api/v1/systemManagement/user/upload-csv` | OK | |
| 2-2-16 | 非アクティブなユーザーの行がグレー表示になること | 表示確認 | `ui_user_main.md` §5.6 | - | OK | |

**前提条件:**
- system_admin ロールでログイン済み
- システム管理者メニュー > ユーザー管理タブが表示されている
- 組織に複数のユーザー（アクティブ/非アクティブ混在）が存在すること
- 組織に複数の部署・ロールが存在すること（フィルター確認用）
- CSVアップロードシナリオ（2-2-14）用: 事前にCSVダウンロードを実行してテンプレートを入手すること

**後処理:**
- 新規作成したユーザーを `organization_user` テーブルから削除（2-2-6、2-2-14）
- CSVアップロードで作成したユーザーを削除（2-2-14）

---

### 2-3: 部署管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 2-3-1 | 部署一覧が表示されること | 正常系 | `ui_department_main.md` §4 | GET `/api/v1/systemManagement/department` | OK | |
| 2-3-2 | 部署CD・部署名で検索できること | 正常系 | `ui_department_main.md` §3.2.1 | GET `/api/v1/systemManagement/department` | OK | |
| 2-3-3 | ステータスフィルターでアクティブ/非アクティブを絞り込みできること | 正常系 | `ui_department_main.md` §3.2.2 | GET `/api/v1/systemManagement/department` | OK | |
| 2-3-4 | 「追加」ボタンから部署を新規作成できること | 正常系 | `ui_department_main.md` §3.2.5 | POST `/api/v1/systemManagement/department` | OK | |
| 2-3-5 | 部署作成時に部署CDまたは部署名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `api_department_management.md` §5 バリデーション | - | OK | |
| 2-3-6 | 既存の部署CDと重複する部署を作成しようとすると重複エラーが表示されること | 異常系 | `api_department_management.md` §5（409エラー） | POST `/api/v1/systemManagement/department` | OK | |
| 2-3-7 | 「編集」ボタンから部署名を編集できること | 正常系 | `ui_department_main.md` §4.2.5 | PUT `/api/v1/systemManagement/department/:departmentCd` | OK | |
| 2-3-8 | 操作カラムの「非アクティブ化」ボタンから部署を非アクティブ化できること | 正常系 | `ui_department_main.md` §4.2.5 | PATCH `/api/v1/systemManagement/department/:departmentCd/status` | OK | |
| 2-3-9 | 操作カラムの「アクティブ化」ボタンから部署をアクティブ化できること | 正常系 | `ui_department_main.md` §4.2.5 | PATCH `/api/v1/systemManagement/department/:departmentCd/status` | OK | |
| 2-3-10 | 非アクティブな部署の行がバッジ「非アクティブ」として表示されること | 表示確認 | `ui_department_main.md` §4.2.3 | - | OK | |
| 2-3-11 | CSVダウンロードボタンをクリックすると部署一覧CSVがダウンロードされること | 正常系 | `ui_department_main.md` §3.2.3 | GET `/api/v1/systemManagement/department/download-csv` | OK | |
| 2-3-12 | CSVファイルを編集してアップロードすると部署が一括作成されること | 正常系 | `ui_department_main.md` §3.2.4 | POST `/api/v1/systemManagement/department/upload-csv` | OK | |
| 2-3-13 | 不正なCSVファイルをアップロードするとエラー詳細（行番号・エラー内容）が表示されること | 異常系 | `api_department_management.md` §3 エラーレスポンス | POST `/api/v1/systemManagement/department/upload-csv` | OK | |

**前提条件:**
- system_admin ロールでログイン済み
- システム管理者メニュー > 部署管理タブが表示されている
- 組織に複数の部署（アクティブ/非アクティブ混在）が存在すること
- CSVアップロードシナリオ（2-3-12）用: 事前にCSVダウンロードを実行してテンプレートを入手すること

**後処理:**
- 新規作成した部署を `department` テーブルから削除（2-3-4、2-3-12）

---

### 2-4: ロール管理

| シナリオID | シナリオ名 | 種別 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|------|---------|------|------|
| 2-4-1 | ロール一覧が表示されること | 正常系 | `ui_role_main.md` §5 | GET `/api/v1/master/role` | OK | |
| 2-4-2 | 機能名で検索（曖昧検索）できること | 正常系 | `ui_role_main.md` §4.2 | - （クライアントサイドフィルタリング） | OK | |
| 2-4-3 | ロール名フィルターでロールを絞り込みできること | 正常系 | `ui_role_main.md` §4.3 | - （クライアントサイドフィルタリング） | OK | |
| 2-4-4 | 「追加」ボタンからロールを新規作成できること | 正常系 | `ui_role_main.md` §3.2（追加ボタン） | POST `/api/v1/master/role` | OK | |
| 2-4-5 | ロール作成時にロールCDまたはロール名が未入力の場合にバリデーションエラーが表示されること | 異常系 | `api_role_management.md` §5 バリデーション | - | OK | |
| 2-4-6 | 既存のロールCDと重複するロールを作成しようとすると重複エラーが表示されること | 異常系 | `api_role_management.md` §5（409エラー） | POST `/api/v1/master/role` | OK | |
| 2-4-7 | 「編集」ボタンからロール名・初期画面機能名を編集できること | 正常系 | `ui_role_main.md` §5.4 | PUT `/api/v1/master/role/:roleId` | OK | |
| 2-4-8 | ロール編集ダイアログから機能権限（Ⓦ/Ⓡ）を更新できること | 正常系 | `ui_role_main.md` §5.3、`api_role_management.md` §7 | PUT `/api/v1/master/role/:roleId/permissions` | OK | |
| 2-4-9 | チェックボックスで複数ロールを選択し「アクティブ」ボタンで一括アクティブ化できること | 正常系 | `ui_role_main.md` §3.2（アクティブボタン） | PATCH `/api/v1/master/role/:roleId/status` | OK | |
| 2-4-10 | チェックボックスで複数ロールを選択し「非アクティブ」ボタンで一括非アクティブ化できること | 正常系 | `ui_role_main.md` §3.2（非アクティブボタン） | PATCH `/api/v1/master/role/:roleId/status` | OK | |
| 2-4-11 | ロールが未選択の場合「アクティブ」「非アクティブ」ボタンが非活性であること | 表示確認 | `ui_role_main.md` §3.2 | - | OK | |
| 2-4-12 | CSVダウンロードボタンをクリックするとロール一覧CSVがダウンロードされること | 正常系 | `ui_role_main.md` §3.2（CSVダウンロード） | GET `/api/v1/master/role/download-csv` | OK | |
| 2-4-13 | CSVファイルを編集してアップロードするとロールが一括作成されること | 正常系 | `ui_role_main.md` §3.2（CSVアップロード） | POST `/api/v1/master/role/upload-csv` | OK | |

**前提条件:**
- system_admin ロールでログイン済み
- システム管理者メニュー > ロール管理タブが表示されている
- 組織に複数のロール（アクティブ/非アクティブ混在）が存在すること
- CSVアップロードシナリオ（2-4-13）用: 事前にCSVダウンロードを実行してテンプレートを入手すること

**後処理:**
- 新規作成したロールを `role` テーブル・`role_permission` テーブルから削除（2-4-4、2-4-13）

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
| ロール | system_admin |
| ユーザーID | 要確認 |
| パスワード | 要確認 |

### 3.3 テスト用データ

| データ | 用途 | 準備方法 |
|--------|------|---------|
| 複数ユーザー（アクティブ/非アクティブ混在） | 2-2（ユーザー管理） | テスト実行前にDBに挿入 |
| 複数部署（アクティブ/非アクティブ混在） | 2-3（部署管理）、2-2（フィルター用） | テスト実行前にDBに挿入 |
| 複数ロール（アクティブ/非アクティブ混在） | 2-4（ロール管理）、2-2（フィルター用） | テスト実行前にDBに挿入 |
| プロジェクトデータ（ステータス別） | 2-1（実験システムカード値確認） | テスト実行前にDBに挿入 |
| ログイン履歴（過去7日分） | 2-1（ログインカード値確認） | テスト実行前にDBに挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 業務内容（元番号） | 業務名 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 2-1〜2-6 | システム概要統計の確認（ユーザー/セッション/実験システム/ストレージ/ログイン） | ✅ `SystemOverview` 5カード | GET `/api/v1/systemManagement/system-overview` | **2-1** |
| 2-6〜2-10 | ユーザーの一覧・作成・編集・アクティブ化・CSV操作 | ✅ `UserManagement` | `/api/v1/systemManagement/user` | **2-2** |
| 2-11〜2-12 | セッションの一覧確認・操作 | ⚠️ セッション数の「確認」のみ（セッション概要カード）。操作機能は設計書に未定義 | GET `/api/v1/systemManagement/system-overview` | **2-1**（統合） |
| 2-13〜2-17 | 部署の一覧・作成・編集・アクティブ化・CSV操作 | ✅ `DepartmentManagement` | `/api/v1/systemManagement/department` | **2-3** |
| 2-18〜2-22 | ロールの一覧・作成・編集・アクティブ化・CSV操作 | ✅ `RoleManagement` | `/api/v1/master/role` | **2-4** |

---

## 5. 参照ドキュメント

### 5.1 UI設計書

| ドキュメント | パス |
|------------|------|
| システム概要画面設計 | `docs/design/ui/ui_system_overview_main.md` |
| ユーザー管理画面設計 | `docs/design/ui/ui_user_main.md` |
| 部署管理画面設計 | `docs/design/ui/ui_department_main.md` |
| ロール管理画面設計 | `docs/design/ui/ui_role_main.md` |

### 5.2 API設計書

| ドキュメント | パス |
|------------|------|
| システム概要API設計 | `docs/design/api/api_system_overview.md` |
| ユーザー管理API設計 | `docs/design/api/api_user_management.md` |
| 部署管理API設計 | `docs/design/api/api_department_management.md` |
| ロール管理API設計 | `docs/design/api/api_role_management.md` |

### 5.3 その他

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
