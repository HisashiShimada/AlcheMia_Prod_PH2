# Requirements Document

## Project Description (Input)
バックエンド認証API実装（POST /api/v1/auth/login, verify-pin, resend-pin, logout, reset-password-request, reset-password）を実装する。既存のdocs/20251229_1451_認証機能バックエンド実装_PLAN.md、docs/design/api/api_auth.md、docs/design/db/db_auth.mdを参照。

---

## Requirements

### 1. パスワード認証とPINコード送信（Login Endpoint）

#### 要件1.1: ユーザー認証
**When** クライアントがユーザー名とパスワードを送信した時、**the** 認証APIサービスは **shall** organization_userテーブルからユーザーを検索し、パスワードをbcryptで検証する。

**Acceptance Criteria:**
- ユーザー名と組織IDの組み合わせでユーザーを一意に特定すること
- パスワードハッシュをbcryptで比較検証すること
- 検証に成功した場合は次のステップ（PINコード生成）に進むこと

#### 要件1.2: PINコード生成と送信
**When** パスワード検証が成功した時、**the** 認証APIサービスは **shall** 6桁のランダムな数字PINコードを生成し、ユーザーのメールアドレスに送信する。

**Acceptance Criteria:**
- PINコードは6桁の数字（100000〜999999）であること
- crypto.randomIntを使用してランダム生成すること
- 有効期限を現在時刻+5分に設定すること
- pin_codesテーブルに保存すること
- nodemailerを使用してメール送信すること

#### 要件1.3: 仮セッショントークン生成
**When** PINコードの送信が完了した時、**the** 認証APIサービスは **shall** 仮セッショントークンを生成し、クライアントに返却する。

**Acceptance Criteria:**
- トークン形式は`temp_session-{id}_{timestamp}`であること
- トークンの有効期限は5分であること
- レスポンスにマスキングされたメールアドレスを含めること（例: use***@example.com）

#### 要件1.4: ログイン失敗時のエラーハンドリング
**If** ユーザー名またはパスワードが不正な場合、**then the** 認証APIサービスは **shall** HTTP 401エラーを返却し、login_historyテーブルに失敗履歴を記録する。

**Acceptance Criteria:**
- エラーコード`AUTH_INVALID_CREDENTIALS`を返すこと
- ユーザー名が存在しない場合もパスワードが不正な場合も同じエラーメッセージを返すこと（情報漏洩防止）
- login_historyテーブルに失敗履歴を記録すること

---

### 2. PINコード検証とセッション生成（Verify PIN Endpoint）

#### 要件2.1: PINコード検証
**When** クライアントがPINコードと仮セッショントークンを送信した時、**the** 認証APIサービスは **shall** pin_codesテーブルからPINコードを検索し、有効性を検証する。

**Acceptance Criteria:**
- PINコードと仮セッショントークンの組み合わせで検索すること
- 有効期限（5分以内）をチェックすること
- 試行回数が最大3回を超えていないことを確認すること
- 使用済みフラグ（is_used）がfalseであることを確認すること

#### 要件2.2: 本セッション生成
**When** PINコード検証が成功した時、**the** 認証APIサービスは **shall** JWT形式の本セッショントークンを生成し、HTTPOnly Cookieとして設定する。

**Acceptance Criteria:**
- トークン形式は`maiml_session-{id}_{timestamp}`であること
- JWTペイロードにユーザーID、組織ID、ロールを含めること
- ロール別の有効期限を設定すること（Admin: 48h, Manager: 24h, Worker: 12h）
- HTTPOnly, Secure, SameSite=Strict属性を設定すること

#### 要件2.3: ユーザー情報の返却
**When** セッション生成が完了した時、**the** 認証APIサービスは **shall** ユーザー情報とロール別リダイレクトURLをクライアントに返却する。

**Acceptance Criteria:**
- ユーザーID、ユーザー名、メールアドレス、ロール、組織ID、組織名、表示名を含めること
- ロールに応じたリダイレクトURLを返すこと（provider: /provider, system_admin: /system-admin, etc.）
- セッショントークンとその有効期限を含めること

#### 要件2.4: PINコードの使用済み処理
**When** PINコード検証が成功した時、**the** 認証APIサービスは **shall** pin_codesテーブルから該当PINコードを削除する。

**Acceptance Criteria:**
- 検証成功後、即座にpin_codesテーブルから削除すること
- 同じPINコードの再利用を防ぐこと

#### 要件2.5: PINコード検証失敗時のエラーハンドリング
**If** PINコードが不正または有効期限切れの場合、**then the** 認証APIサービスは **shall** HTTP 401エラーを返却し、試行回数をインクリメントする。

**Acceptance Criteria:**
- エラーコード`AUTH_PIN_INVALID`または`AUTH_PIN_EXPIRED`を返すこと
- pin_codesテーブルのattempts_countをインクリメントすること
- 試行回数が3回に達した場合は`AUTH_PIN_MAX_ATTEMPTS`エラーを返すこと

---

### 3. PINコード再送信（Resend PIN Endpoint）

#### 要件3.1: PINコード再生成
**When** クライアントがPINコード再送信を要求した時、**the** 認証APIサービスは **shall** 既存のPINコードを削除し、新しいPINコードを生成してメール送信する。

**Acceptance Criteria:**
- 仮セッショントークンを検証すること
- pin_codesテーブルから既存のPINコードを削除すること
- 新しい6桁PINコードを生成すること
- 有効期限を現在時刻+5分に設定すること
- ユーザーのメールアドレスに送信すること

#### 要件3.2: 再送信レート制限
**While** 15分以内に3回以上再送信を試みた場合、**the** 認証APIサービスは **shall** HTTP 429エラーを返却し、再送信を拒否する。

**Acceptance Criteria:**
- 再送信回数を追跡すること（3回/15分/ユーザー）
- レート制限超過時は`AUTH_RESEND_LIMIT_EXCEEDED`エラーを返すこと
- レスポンスにRetry-Afterヘッダーを含めること

---

### 4. ログアウト（Logout Endpoint）

#### 要件4.1: セッショントークンの無効化
**When** クライアントがログアウトを要求した時、**the** 認証APIサービスは **shall** JWTトークンを検証し、HTTPOnly Cookieをクリアする。

**Acceptance Criteria:**
- Authorizationヘッダーからトークンを取得すること
- JWTトークンの署名と有効期限を検証すること
- Set-CookieヘッダーでMax-Age=0を設定し、Cookieをクリアすること

#### 要件4.2: 監査ログの記録（Admin権限）
**When** Admin権限ユーザーがログアウトした時、**the** 認証APIサービスは **shall** admin_audit_logテーブルにログアウト履歴を記録する。

**Acceptance Criteria:**
- ユーザーID、組織ID、アクション（logout）、IPアドレス、User-Agent、タイムスタンプを記録すること
- Admin権限（provider, system_admin）の場合のみ記録すること

---

### 5. パスワードリセット要求（Reset Password Request Endpoint）

#### 要件5.1: リセット要求の受付
**When** クライアントがパスワードリセットを要求した時、**the** 認証APIサービスは **shall** ユーザーの存在を確認し、リセットトークンを生成してメール送信する。

**Acceptance Criteria:**
- ユーザー名と組織IDでユーザーを検索すること
- リセットトークンを生成すること（形式: `reset_{uuid}_{timestamp}`）
- トークンの有効期限を1時間に設定すること
- リセット用URLを含むメールを送信すること
- ユーザーが存在しない場合も同じレスポンスを返すこと（情報漏洩防止）

#### 要件5.2: リセット要求のレート制限
**While** 15分以内に3回以上リセット要求を試みた場合、**the** 認証APIサービスは **shall** HTTP 429エラーを返却する。

**Acceptance Criteria:**
- リセット要求回数を追跡すること（3回/15分/組織ID）
- レート制限超過時は`AUTH_RATE_LIMIT_EXCEEDED`エラーを返すこと

---

### 6. パスワードリセット実行（Reset Password Endpoint）

#### 要件6.1: リセットトークンの検証
**When** クライアントがリセットトークンと新しいパスワードを送信した時、**the** 認証APIサービスは **shall** トークンの有効性を検証する。

**Acceptance Criteria:**
- リセットトークンの存在を確認すること
- トークンの有効期限（1時間以内）をチェックすること
- 使用済みフラグをチェックすること

#### 要件6.2: パスワードの更新
**When** リセットトークン検証が成功した時、**the** 認証APIサービスは **shall** 新しいパスワードをbcryptでハッシュ化し、user_authenticationテーブルを更新する。

**Acceptance Criteria:**
- 新しいパスワードを最低8文字に制限すること
- パスワードをbcryptでハッシュ化すること（rounds: 12）
- user_authenticationテーブルのpasswordカラムを更新すること
- リセットトークンを使用済みにマークまたは削除すること

---

### 7. セキュリティとレート制限

#### 要件7.1: ログイン試行のレート制限
**While** 15分以内に5回以上ログイン失敗した場合、**the** 認証APIサービスは **shall** HTTP 429エラーを返却し、一時的にログインを拒否する。

**Acceptance Criteria:**
- 組織ID + ユーザー名の組み合わせで失敗回数を追跡すること
- login_historyテーブルを使用して失敗回数をカウントすること
- レート制限超過時は`AUTH_RATE_LIMIT_EXCEEDED`エラーを返すこと
- Retry-Afterヘッダーを含めること

#### 要件7.2: PINコード入力のレート制限
**While** 5分以内に3回以上PINコード検証に失敗した場合、**the** 認証APIサービスは **shall** 該当PINコードを無効化し、再ログインを要求する。

**Acceptance Criteria:**
- pin_codesテーブルのattempts_countで試行回数を追跡すること
- 最大試行回数（max_attempts: 3）を超えた場合はPINコードを削除すること
- エラーコード`AUTH_PIN_MAX_ATTEMPTS`を返すこと

#### 要件7.3: パスワードハッシュ化
**The** 認証APIサービスは **shall** すべてのパスワードをbcryptアルゴリズムでハッシュ化して保存する。

**Acceptance Criteria:**
- Admin権限（provider, system_admin）のパスワードは14 roundsでハッシュ化すること
- その他のユーザーは12 roundsでハッシュ化すること
- 平文パスワードをログやデータベースに記録しないこと

---

### 8. データ管理とメンテナンス

#### 要件8.1: 期限切れPINコードの自動削除
**The** 認証APIサービスは **shall** 定期的に期限切れPINコードをpin_codesテーブルから削除する。

**Acceptance Criteria:**
- 1時間ごとに期限切れPINコード（expires_at < 現在時刻 - 1時間）を削除すること
- データベース負荷を考慮してバッチ処理で実行すること

#### 要件8.2: 古いログイン履歴の削除
**The** 認証APIサービスは **shall** 定期的に古いログイン履歴をlogin_historyテーブルから削除する。

**Acceptance Criteria:**
- 毎日実行すること
- 90日以上前のログイン履歴を削除すること
- Admin権限のログイン履歴は削除しないこと（監査目的）

---

### 9. エラーハンドリングとロギング

#### 要件9.1: 統一エラーレスポンス形式
**The** 認証APIサービスは **shall** すべてのエラーレスポンスを統一された形式で返却する。

**Acceptance Criteria:**
- レスポンス形式: `{ success: false, error: { code, message, details }, meta }`
- エラーコードは明確で一貫性のあるものを使用すること（例: AUTH_*, VALIDATION_*, SYSTEM_*）
- HTTPステータスコードを適切に設定すること（400, 401, 403, 429, 500）

#### 要件9.2: ログイン試行履歴の記録
**When** ログイン試行が発生した時、**the** 認証APIサービスは **shall** login_historyテーブルに履歴を記録する。

**Acceptance Criteria:**
- 成功・失敗にかかわらずすべての試行を記録すること
- user_id, org_id, login_at, login_sf（成功/失敗）, failure_reason（失敗理由）を記録すること
- IPアドレスとUser-Agentを記録すること（セキュリティ監査用）

---

### 10. パフォーマンスと信頼性

#### 要件10.1: メール送信の非同期処理
**When** PINコードやパスワードリセットリンクをメール送信する時、**the** 認証APIサービスは **shall** 非同期処理で送信し、送信失敗時はリトライする。

**Acceptance Criteria:**
- メール送信を非同期で実行し、APIレスポンスをブロックしないこと
- 送信失敗時は最大3回までリトライすること
- 送信タイムアウトを30秒に設定すること

#### 要件10.2: データベースクエリの最適化
**The** 認証APIサービスは **shall** すべてのデータベースクエリでインデックスを活用し、パフォーマンスを最適化する。

**Acceptance Criteria:**
- レート制限判定クエリでインデックス（idx_login_history_rate_limit）を使用すること
- PINコード検証でユニークインデックス（idx_pin_codes_pin_session）を使用すること
- N+1問題を回避すること

---

## Related Documents
- [API設計書](../../design/api/api_auth.md)
- [データベース設計書](../../design/db/db_auth.md)
- [実装計画書](../../20251229_1451_認証機能バックエンド実装_PLAN.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
