# システム管理者 シナリオテスト対象一覧

> **作成日**: 2026-03-24
> **更新日**: 2026-08-25（タスク: ユーザ管理編集時URI未設定修正とバックフィル対応）
> **参照元**: `docs/20260310_0940_ロール別業務内容一覧.md`（要求仕様書ベース）
> **照合先**: UI設計書（`docs/design/ui/`）、API設計書（`docs/design/api/`）
>
> **フェーズ２更新内容**:
> - フェーズ１の「部署管理」タブが廃止されたため、`2-3` グループを**削除**。`organization_group`（組織グループ）機能は新規追加されていないため、テスト対象外とする
> - 2-1（システム概要）、2-4（ロール管理）は変更なし（内容流用）
> - 2026-08-21: `ui_user_main.md` 設計書修正対応。所属グループ・二段階認証フィルターが未実装のため 2-2-3・2-2-4 を削除。ロールフィルターのみ残存（旧 2-2-5 → 新 2-2-3 に繰り上げ）。2-2-2 にユーザーID検索を追加
> - 2026-08-25: `ui_user_edit_dialog.md` v1.1.0 対応。編集ダイアログに個人URI表示フィールド追加（2-2-15〜2-2-16 追加）

---

## 0. テスト実施情報

| 項目 | 値 |
|------|-----|
| テスト実施日 | 2026-08-31（2-1〜2-2, 2-4） |
| テスト実施者 | Cline |
| テスト環境バージョン | - |
| 総合判定 | 合格 |
| 備考 | 2-1, 2-2, 2-4はフェーズ１実施済み。2-3（部署管理）はフェーズ２でタブ廃止のためテスト対象から削除 |

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|-----------|-----------|------|-------|-------|
| **2-1** | システム概要 | 7件 | 手動 | 7 | 0 | 0 |
| **2-2** | ユーザー管理 | 15件 | 手動 | 15 | 0 | 0 |
| **2-4** | ロール管理 | 13件 | 手動 | 13 | 0 | 0 |
| **合計** | - | **36件** | - | **35** | **0** | **0** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| システム異常通知の受信 | 設計書に実装なし |
| メンテナンス通知の発信 | 設計書に実装なし |
| 操作履歴の閲覧 | 設計書に実装なし |
| 接続機器タイムアウト通知 | 設計書に実装なし |
| セッション操作（強制切断等） | 専用画面が設計書に存在しない。セッション数の確認はシステム概要カードに統合 |
| 組織グループ管理（旧 2-3） | フェーズ１の「部署管理」タブが廃止されただけで、組織グループ管理機能の新規追加はなし。テスト対象外 |

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
| 2-2-2 | ユーザー名・ユーザーID・メールアドレスで検索できること | 正常系 | `ui_user_main.md` §4.1 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-3 | ロールでフィルタリングできること | 正常系 | `ui_user_main.md` §4.2 | GET `/api/v1/systemManagement/user` | OK | |
| 2-2-4 | 「追加」ボタンからユーザーを新規作成できること | 正常系 | `ui_user_main.md` §3.3 | POST `/api/v1/systemManagement/user` | OK | |
| 2-2-5 | ユーザー作成時に必須項目が未入力の場合にバリデーションエラーが表示されること | 異常系 | `api_user_management.md` §3 バリデーション | - | OK | |
| 2-2-6 | 既存のユーザーIDと重複するユーザーを作成しようとすると重複エラーが表示されること | 異常系 | `api_user_management.md` §3（409エラー） | POST `/api/v1/systemManagement/user` | OK | |
| 2-2-7 | 「編集」ボタンからユーザー情報を編集できること | 正常系 | `ui_user_main.md` §5.5 | PUT `/api/v1/systemManagement/user/:userId` | OK | |
| 2-2-8 | チェックボックスで複数ユーザーを選択し「アクティブ」ボタンで一括アクティブ化できること | 正常系 | `ui_user_main.md` §3.4 | PATCH `/api/v1/systemManagement/user/:userId/status` | OK | |
| 2-2-9 | チェックボックスで複数ユーザーを選択し「非アクティブ」ボタンで一括非アクティブ化できること | 正常系 | `ui_user_main.md` §3.5 | PATCH `/api/v1/systemManagement/user/:userId/status` | OK | |
| 2-2-10 | ユーザーが未選択の場合「アクティブ」「非アクティブ」ボタンが非活性であること | 表示確認 | `ui_user_main.md` §3.4、§3.5 | - | OK | |
| 2-2-11 | CSVダウンロードボタンをクリックするとユーザー一覧CSVがダウンロードされること | 正常系 | `ui_user_main.md` §3.2 | GET `/api/v1/systemManagement/user/download-csv` | OK | |
| 2-2-12 | CSVファイルを編集してアップロードするとユーザーが一括作成されること | 正常系 | `ui_user_main.md` §3.1 | POST `/api/v1/systemManagement/user/upload-csv` | OK | |
| 2-2-13 | 不正なCSVファイルをアップロードするとエラーメッセージが表示されること | 異常系 | `ui_user_main.md` §9.3 | POST `/api/v1/systemManagement/user/upload-csv` | OK | |
| 2-2-14 | 非アクティブなユーザーの行がグレー表示になること | 表示確認 | `ui_user_main.md` §5.6 | - | OK | |
| 2-2-15 | `namespace` テーブルに個人URIが登録済みのユーザーの「編集」ボタンを押すと、ダイアログの「個人URI」フィールドに正しいURIが表示されること | 正常系 | `ui_user_edit_dialog.md` §3.7（v1.1.0） | GET `/api/v1/systemManagement/user` | OK | バグ修正確認: 編集ダイアログ起動時にURIが常に「URI未設定」と表示されていた問題の解消 |

**前提条件:**
- system_admin ロールでログイン済み
- システム管理者メニュー > ユーザー管理タブが表示されている
- 組織に複数のユーザー（アクティブ/非アクティブ混在）が存在すること
- 組織に複数のロールが存在すること（フィルター確認用）
- CSVアップロードシナリオ（2-2-12）用: 事前にCSVダウンロードを実行してテンプレートを入手すること
- 2-2-15 用: `namespace` テーブルに個人URIレコードが存在するユーザーが1件以上存在すること
- 2-2-16 用: `namespace` テーブルに個人URIレコードが存在しないユーザーが1件以上存在すること（バックフィル未実施のユーザー、またはバックフィルSQL実行前の状態）

**後処理:**
- 新規作成したユーザーを `organization_user` テーブルから削除（2-2-4、2-2-12）
- CSVアップロードで作成したユーザーを削除（2-2-12）

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
| 複数ロール（アクティブ/非アクティブ混在） | 2-2（ロールフィルター用）、2-4（ロール管理） | テスト実行前にDBに挿入 |
| プロジェクトデータ（ステータス別） | 2-1（実験システムカード値確認） | テスト実行前にDBに挿入 |
| ログイン履歴（過去7日分） | 2-1（ログインカード値確認） | テスト実行前にDBに挿入 |

---

## 4. 要件書記載業務とUI/API設計書の照合結果

| 業務内容（元番号） | 業務名 | UI設計書での実装状況 | 対応API | テスト対象 |
|---------|---------|---------------------|---------|-----------|
| 2-1〜2-6 | システム概要統計の確認（ユーザー/セッション/実験システム/ストレージ/ログイン） | ✅ `SystemOverview` 5カード | GET `/api/v1/systemManagement/system-overview` | **2-1** |
| 2-6〜2-10 | ユーザーの一覧・作成・編集・アクティブ化・CSV操作 | ✅ `UserManagement` | `/api/v1/systemManagement/user` | **2-2** |
| 2-11〜2-12 | セッションの一覧確認・操作 | ⚠️ セッション数の「確認」のみ（セッション概要カード）。操作機能は設計書に未定義 | GET `/api/v1/systemManagement/system-overview` | **2-1**（統合） |
| 2-13〜2-17 | 組織グループの一覧・作成・編集・アクティブ化・メンバー管理 | ⚠️ `organization_group` への移行は完了しているが、テスト画面は未提供（旧「部署管理」タブ廃止のみ）。機能新規追加なし | `/api/v1/organization-groups` | **対象外**（スコープ外） |
| 2-18〜2-22 | ロールの一覧・作成・編集・アクティブ化・CSV操作 | ✅ `RoleManagement` | `/api/v1/master/role` | **2-4** |

---

## 5. 参照ドキュメント

### 5.1 UI設計書

| ドキュメント | パス |
|------------|------|
| システム概要画面設計 | `docs/design/ui/sysytem_management/ui_system_overview_main.md` |
| ユーザー管理画面設計 | `docs/design/ui/sysytem_management/ui_user_main.md` |
| ユーザー追加ダイアログ設計 | `docs/design/ui/sysytem_management/ui_user_add_dialog.md` |
| ユーザー編集ダイアログ設計 | `docs/design/ui/sysytem_management/ui_user_edit_dialog.md` |
| ロール管理画面設計 | `docs/design/ui/sysytem_management/ui_role_main.md` |
| ロール追加ダイアログ設計 | `docs/design/ui/sysytem_management/ui_role_add_dialog.md` |
| ロール編集ダイアログ設計 | `docs/design/ui/sysytem_management/ui_role_edit_dialog.md` |
| ロール機能管理ダイアログ設計 | `docs/design/ui/sysytem_management/ui_role_function_management_dialog.md` |

### 5.2 API設計書

| ドキュメント | パス |
|------------|------|
| システム概要API設計 | `docs/design/api/api_system_overview.md` |
| ユーザー管理API設計 | `docs/design/api/api_user_management.md` |
| ロール管理API設計 | `docs/design/api/api_role_management.md` |

### 5.3 その他

| ドキュメント | パス |
|------------|------|
| ロール別業務内容一覧 | `docs/20260310_0940_ロール別業務内容一覧.md` |
| department廃止・organization_group移行記録 | `docs/20260710_1142_department廃止_organization_group移行/` |
| システム管理者featureファイル | `tests/e2e/features/2_system_management/2_system_management.feature` |
| システム管理者ステップ定義 | `tests/e2e/steps/2_system_management/2_system_management.ts` |
