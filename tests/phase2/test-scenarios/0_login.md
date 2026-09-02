# ログイン シナリオテスト対象一覧

> **作成日**: 2026-03-30
> **更新日**: 2026-08-21（ソース照合による差異修正）
> **参照元**: `docs/design/ui/ui_login.md`、`docs/design/api/api_auth.md`、`docs/design/db/ddl/organization.sql`、`docs/design/db/ddl/organization_group.sql`
> **照合先**: UI設計書（`docs/design/ui/`）、ソース（`frontend/src/components/LoginPage.tsx`、`frontend/src/utils/validationUtils.ts`）
>
> **フェーズ２更新内容**:
> - `api_auth.md` 2.0.0（2026-08-14）対応：ログインリクエストのフィールド名 `username` → `userId` に変更
> - `api_auth.md` 2.0.0（2026-08-14）対応：新規API（`/auth/refresh`、`/auth/heartbeat`、`/auth/change-password`）追加に伴いシナリオ追加
> - `department` 廃止・`organization_group` 移行に伴い、前提データ記述を更新

---

## 0. テスト実施情報

| 項目 | 値 |
|------|-----|
| テスト実施日 | 2026-09-02（0-1、0-3、0-4 実施済み） |
| テスト実施者 | Cline |
| テスト環境バージョン | - |
| 総合判定 | 不合格（NG 1件・未実施 9件） |
| 備考 | NG: 0-3-3（AISOLMAIML-284）。未実施: 0-2（0-2-2は is_entry=0組織で手動） |

---

## 1. テスト対象スコープ（確定版）

### スコープ内

| テストグループID | テストグループ名 | シナリオ数 | テスト方法 | 合格 | 不合格 | 未実施 |
|----------------|----------------|-----------|-----------|------|-------|-------|
| **0-1** | ログイン（Step1: パスワード認証） | 7件 | 自動6件 / 手動1件 | 5 | 0 | 2 |
| **0-2** | 二段階認証（Step2: PINコード認証） | 7件 | 自動3件 / 手動4件 | 0 | 0 | 7 |
| **0-3** | ログイン後の画面遷移（ロール別） | 5件 | 手動5件 | 4 | 1 | 0 |
| **0-4** | ログアウト | 1件 | 自動1件 | 1 | 0 | 0 |
| **合計** | - | **20件** | 自動9件 / 手動11件 | **10** | **1** | **9** |

### スコープ外

| 除外対象 | 除外理由 |
|---------|---------|
| クライアント証明書エラー画面 | nginx層で制御されるためPlaywrightでは再現困難（インフラ依存） |
| PINコード有効期限切れ（タイマー00:00） | 5分待機が必要なため自動テストに不向き |
| PINコード再送信の制限超過（3回/15分） | クールダウン待ちが必要なため自動テストに不向き |
| パスワードリセット | `PasswordResetRequest.tsx` がフロントエンドに実装済み。ただし `ui_login.md` v1.0.0 にはリセットフローの記載なし。シナリオは別途作成予定 |
| 新規ユーザー登録画面（`/register`） | UI設計書で「将来実装」と明記 |
| mi_engineer ロールのログイン後遷移 | 本プロジェクトのスコープ外（保留） |
| トークンリフレッシュ（`/auth/refresh`）の詳細 | フロントエンドが自動呼出し。UI操作との直接対応がないため個別E2Eシナリオは対象外 |
| ハートビート（`/auth/heartbeat`）の詳細 | バックグラウンド呼出し。UI操作との直接対応がないため個別E2Eシナリオは対象外 |

---

## 2. シナリオ詳細一覧

### 0-1: ログイン（Step1: パスワード認証）

> ⚠️ **フェーズ２変更点**: `POST /api/v1/auth/login` のリクエストボディのフィールド名が `username` → **`userId`** に変更された（api_auth.md §3.1、2026-08-14変更）。
> 自動テストコードのリクエスト定義を `userId` に修正すること。

| シナリオID | シナリオ名 | 種別 | テスト方法 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|-----------|------|---------|------|------|
| 0-1-1 | 正しいユーザーID・パスワードでログインボタンをクリックすると二段階認証画面（`/login/verify`）へ遷移すること | 正常系 | **自動** | `ui_login.md` §3.5、§6.1 | POST `/api/v1/auth/login` | - | リクエストフィールド: `userId`（旧`username`） |
| 0-1-2 | ユーザーIDが未入力のままログインボタンをクリックすると「ユーザーIDを入力してください」バリデーションエラーが表示されること | 異常系 | **自動** | `LoginPage.tsx`（`validateEmail()`） | - | OK | クライアントサイドバリデーション。ユーザーID欄は**メールアドレス形式**で検証。形式不正時は「有効なユーザーIDを入力してください」 |
| 0-1-3 | パスワードが未入力のままログインボタンをクリックすると「パスワードを入力してください」バリデーションエラーが表示されること | 異常系 | **自動** | `LoginPage.tsx`（`validatePassword()`） | - | OK | クライアントサイドバリデーション |
| 0-1-4 | 誤ったパスワードでログインすると「ユーザー名またはパスワードが正しくありません」エラーが表示されること | 異常系 | **自動** | `ui_login.md` §3.6、`api_auth.md` §3.1 | POST `/api/v1/auth/login` | OK | エラーコード: `AUTH_INVALID_CREDENTIALS` |
| 0-1-5 | 非アクティブなアカウントでログインすると「このアカウントは無効化されています」エラーが表示されること | 異常系 | **自動** | `ui_login.md` §3.6、`api_auth.md` §3.1（403） | POST `/api/v1/auth/login` | OK | エラーコード: `AUTH_ACCOUNT_DISABLED` |
| 0-1-6 | ログイン試行が5回失敗するとレート制限エラーが表示されること | 異常系 | **手動** | `ui_login.md` §9.2、`api_auth.md` §4.1 | POST `/api/v1/auth/login` | - | エラーコード: `AUTH_RATE_LIMIT_EXCEEDED`。後続テストへの影響を避けるため手動 |
| 0-1-7 | ログインAPIの処理中はログインボタンがローディング状態（「ログイン中...」）になること | 表示確認 | **自動** | `ui_login.md` §3.5 | POST `/api/v1/auth/login` | OK | |

**前提条件:**
- クライアント証明書がインストール済みであること（E2Eテスト環境ではnginxモック or 証明書設定済み）
- `is_entry = 1`（二段階認証あり）の組織のテストユーザーが存在すること
- 非アクティブ状態のテストユーザーが存在すること（0-1-5用）
- レート制限リセット手段を事前に確認すること（0-1-6用）

---

### 0-2: 二段階認証（Step2: PINコード認証）

| シナリオID | シナリオ名 | 種別 | テスト方法 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|-----------|------|---------|------|------|
| 0-2-1 | `is_entry = 1` の組織のユーザーがパスワード認証を通過すると二段階認証画面へ遷移すること | 正常系 | **自動** | `organization.is_entry`、`ui_login.md` §6.1 | POST `/api/v1/auth/login` | - | |
| 0-2-2 | `is_entry = 0` の組織のユーザーがパスワード認証を通過すると二段階認証画面をスキップしてロール別トップ画面へ遷移すること | 正常系 | **手動** | `organization.is_entry`、`ui_login.md` §6.1 | POST `/api/v1/auth/login` | - | `is_entry = 0` の組織データを別途用意すること |
| 0-2-3 | 正しいPINコードを入力すると確認ボタンが有効になり、ロール別トップ画面へ遷移すること | 正常系 | **自動** | `ui_login.md` §4.5、§6.1 | POST `/api/v1/auth/verify-pin` | - | テスト用メールサーバーで受信したPINコードを使用 |
| 0-2-4 | 誤ったPINコードを入力すると「PINコードが正しくありません」エラーが表示されること | 異常系 | **自動** | `ui_login.md` §4.6、`api_auth.md` §3.2（401） | POST `/api/v1/auth/verify-pin` | - | エラーコード: `AUTH_PIN_INVALID` |
| 0-2-5 | PINコードを3回連続で誤ると「入力試行回数が上限に達しました」エラーが表示されること | 異常系 | **手動** | `ui_login.md` §6.2、`api_auth.md` §3.2（429） | POST `/api/v1/auth/verify-pin` | - | エラーコード: `AUTH_PIN_MAX_ATTEMPTS`。試行回数超過後のDBリセットが必要なため手動 |
| 0-2-6 | 「再送信する」をクリックするとPINコードが再送信されタイマーが5分にリセットされること | 正常系 | **手動** | `ui_login.md` §4.5、`api_auth.md` §3.3 | POST `/api/v1/auth/resend-pin` | - | メール受信確認が必要なため手動 |
| 0-2-7 | 「ログイン画面に戻る」をクリックするとログイン画面（`/login`）へ遷移すること | 正常系 | **自動** | `ui_login.md` §4.5 | - | - | |

**前提条件:**
- `is_entry = 1`（二段階認証あり）の組織のテストユーザーでパスワード認証済みであること（0-2-3〜0-2-7用）
- `is_entry = 0`（二段階認証なし）の組織とテストユーザーがDBに存在すること（0-2-2用）
- テスト用メールサーバーが稼働しており、送信されたPINコードメールを受信できること（0-2-3用）

---

### 0-3: ログイン後の画面遷移（ロール別）

| シナリオID | シナリオ名 | 種別 | テスト方法 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|-----------|------|---------|------|------|
| 0-3-1 | provider ロールでログインすると `/provider` へ遷移すること | 正常系 | **手動** | `api_auth.md` §5 | POST `/api/v1/auth/verify-pin` | OK | |
| 0-3-2 | system_admin ロールでログインすると `/system-admin` へ遷移すること | 正常系 | **手動** | `api_auth.md` §5 | POST `/api/v1/auth/verify-pin` | OK | |
| 0-3-3 | data_admin ロールでログインすると `/data-admin` へ遷移すること | 正常系 | **手動** | `api_auth.md` §5 | POST `/api/v1/auth/verify-pin` | NG | https://soft-service.atlassian.net/browse/AISOLMAIML-284 |
| 0-3-4 | experiment_admin ロールでログインすると `/experiment-admin` へ遷移すること | 正常系 | **手動** | `api_auth.md` §5 | POST `/api/v1/auth/verify-pin` | OK | |
| 0-3-5 | experiment_worker ロールでログインすると `/experiment-worker` へ遷移すること | 正常系 | **手動** | `api_auth.md` §5 | POST `/api/v1/auth/verify-pin` | OK | |
| ~~0-3-6~~ | ~~mi_engineer ロールでログインすると `/mi-engineer` へ遷移すること~~ | ~~正常系~~ | **保留** | `api_auth.md` §5 | POST `/api/v1/auth/verify-pin` | OK | 本プロジェクトのスコープ外のため保留 |

**前提条件:**
- 各ロール（provider / system_admin / data_admin / experiment_admin / experiment_worker）のテストユーザーがDBに存在すること
- `is_entry = 1`（二段階認証あり）の場合、各ユーザーのPINコードを取得できること
- `is_entry = 0`（二段階認証なし）の場合、パスワード認証のみで遷移先を確認すること

---

### 0-4: ログアウト

| シナリオID | シナリオ名 | 種別 | テスト方法 | 根拠 | 対応API | 結果 | 備考 |
|-----------|-----------|------|-----------|------|---------|------|------|
| 0-4-1 | ログイン済みの状態でログアウトするとログイン画面（`/login`）へ遷移し、セッションCookieがクリアされること | 正常系 | **自動** | `api_auth.md` §3.5 | POST `/api/v1/auth/logout` | OK | Set-Cookie の Max-Age=0 を確認 |

**前提条件:**
- いずれかのロールでログイン済みであること

---

## 3. テスト実行に必要な前提情報

### 3.1 テスト環境

| 項目 | 値 |
|------|-----|
| フロントエンドURL | http://localhost:3000 |
| バックエンドURL | http://localhost:3001 |
| DB接続 | PostgreSQL（直接接続でDB検証用） |
| 組織ID（orgId） | 要確認 |
| メールサーバー | 要確認（テスト用SMTPサーバー） |
| メール受信確認 | 手動（受信ボックスでPINコードを確認） |

### 3.2 テストユーザー

| ロール | 用途 | 備考 |
|--------|------|------|
| system_admin | 0-1, 0-2, 0-4, 0-5 の基本シナリオ | `is_entry = 1` の組織に所属 |
| 非アクティブユーザー（任意ロール） | 0-1-5 | `organization_user.is_active = false` に設定 |
| provider | 0-3-1 | |
| system_admin | 0-3-2 | |
| data_admin | 0-3-3 | |
| experiment_admin | 0-3-4 | |
| experiment_worker | 0-3-5 | |

### 3.3 テスト用データ

> ⚠️ **フェーズ２変更点**: `department` テーブルは廃止され `organization_group` テーブルに移行した。
> テスト前提データの準備では `department` の代わりに `organization_group` および `organization_group_user` テーブルを使用すること。

| データ | 用途 | 準備方法 |
|--------|------|---------|
| `is_entry = 1` の組織 + テストユーザー | 0-1, 0-2-1, 0-2-3〜0-2-7, 0-5 | テスト実行前にDBに挿入 |
| `is_entry = 0` の組織 + テストユーザー | 0-2-2 | テスト実行前にDBに挿入 |
| 非アクティブユーザー | 0-1-5 | `organization_user.is_active = false` に設定 |
| 各ロール別テストユーザー | 0-3-1〜0-3-5 | テスト実行前にDBに挿入 |
| `organization_group` レコード（`is_active = true`） | 全シナリオ共通 | テスト実行前にDBに挿入（旧`department`の代替） |
| `organization_group_user` レコード（テストユーザー所属） | 全シナリオ共通 | テスト実行前にDBに挿入 |

### 3.4 テスト後の後処理

| 処理 | 対象シナリオ |
|------|------------|
| `pin_codes` テーブルのテストデータ削除 | 0-2-3〜0-2-7 |
| レート制限リセット（`login_history` テーブルのテストデータ削除） | 0-1-6 実施後 |
| パスワードを元の値に戻す（または変更後パスワードでの動作確認を行う） | 0-5-1 実施後 |

---

## 4. 参照ドキュメント

### 4.1 UI設計書

| ドキュメント | パス |
|------------|------|
| ログイン画面設計 | `docs/design/ui/ui_login.md` |

### 4.2 API設計書

| ドキュメント | パス |
|------------|------|
| 認証API設計 | `docs/design/api/api_auth.md` |

### 4.3 DB設計書

| ドキュメント | パス |
|------------|------|
| 認証関連DB設計 | `docs/design/db/db_auth.md` |
| organization テーブルDDL | `docs/design/db/ddl/organization.sql` |
| organization_group テーブルDDL ※フェーズ２追加 | `docs/design/db/ddl/organization_group.sql` |
| organization_group_user テーブルDDL ※フェーズ２追加 | `docs/design/db/ddl/organization_group_user.sql` |

### 4.4 その他

| ドキュメント | パス |
|------------|------|
| プロバイダーテスト（参考実装） | `tests/e2e/features/provider/1-1_corporation_create.feature` |
| プロバイダーステップ定義（参考実装） | `tests/e2e/steps/provider/1-1_corporation_create.ts` |
