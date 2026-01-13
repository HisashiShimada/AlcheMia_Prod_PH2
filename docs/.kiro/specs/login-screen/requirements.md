# Requirements Document

## Project Description (Input)
ログイン画面を作りたい。以下のタスク計画書を参照してください。
docs\20251229_1451_認証機能バックエンド実装_PLAN.md
docs\design\db\db_auth.md
docs\design\api\api_auth.md

## Introduction

本要件書は、mmdpfプロジェクトのログイン画面機能を定義します。マルチテナント対応の二段階認証（パスワード + メールPINコード）を実装し、ロールベースアクセス制御（RBAC）によるセキュアなユーザー認証を提供します。

### 主要機能
- パスワード認証によるユーザー識別
- メールPINコード二段階認証による本人確認
- ロール別の初期画面自動遷移
- パスワードリセット機能
- レート制限によるブルートフォース攻撃対策

### 技術要件
- フロントエンド: Next.js 15+ + TypeScript + Ant Design v6
- バックエンドAPI: 既存認証API（docs/design/api/api_auth.md参照）
- 認証方式: JWT + Session Hybrid
- セキュリティ: HTTPOnly Cookie、CSRF対策、レート制限

---

## Requirements

### Requirement 1: ログイン画面表示
**Objective:** As a ユーザー, I want ログイン画面を表示する, so that システムにアクセスできる

#### Acceptance Criteria
1. When ユーザーがアプリケーションのルートURLにアクセスした時, the ログイン画面 shall 組織選択フィールド、ユーザー名入力フィールド、パスワード入力フィールドを表示する
2. The ログイン画面 shall レスポンシブデザインに対応し、モバイル・タブレット・デスクトップで適切に表示される
3. The ログイン画面 shall Ant Design v6のデザイントークンを使用してスタイリングされる
4. The ログイン画面 shall 「ログイン」ボタンと「パスワードを忘れた場合」リンクを表示する
5. While ログインが未完了である間, the ログイン画面 shall 認証済みユーザー専用の画面へのアクセスをブロックする

---

### Requirement 2: パスワード認証
**Objective:** As a ユーザー, I want ユーザー名とパスワードで認証する, so that 安全にシステムにログインできる

#### Acceptance Criteria
1. When ユーザーが「ログイン」ボタンをクリックした時, the ログイン画面 shall 入力値のバリデーションを実行する
2. If ユーザー名が空の場合, then the ログイン画面 shall 「ユーザー名を入力してください」エラーメッセージを表示する
3. If パスワードが空の場合, then the ログイン画面 shall 「パスワードを入力してください」エラーメッセージを表示する
4. When 入力値が有効な場合, the ログイン画面 shall POST /api/v1/auth/loginエンドポイントにリクエストを送信する
5. While APIリクエスト中, the ログイン画面 shall ローディングインジケーターを表示し、ボタンを無効化する
6. When API認証が成功した時, the ログイン画面 shall PINコード入力画面に遷移する
7. If API認証が失敗した場合（401エラー）, then the ログイン画面 shall 「ユーザー名またはパスワードが正しくありません」エラーメッセージを表示する
8. If レート制限に達した場合（429エラー）, then the ログイン画面 shall 「ログイン試行回数が上限に達しました。しばらくしてから再度お試しください」エラーメッセージを表示する

---

### Requirement 3: PINコード二段階認証
**Objective:** As a ユーザー, I want メールに送信されたPINコードで本人確認する, so that セキュアに認証を完了できる

#### Acceptance Criteria
1. When パスワード認証が成功した時, the ログイン画面 shall PINコード入力画面を表示する
2. The PINコード入力画面 shall 「PINコードをメール（user***@example.com）に送信しました」メッセージを表示する
3. The PINコード入力画面 shall 6桁の数字入力フィールドを表示する
4. The PINコード入力画面 shall 「確認」ボタンと「PINコードを再送信」リンクを表示する
5. When ユーザーが6桁の数字を入力して「確認」ボタンをクリックした時, the PINコード入力画面 shall POST /api/v1/auth/verify-pinエンドポイントにリクエストを送信する
6. When PINコード検証が成功した時, the PINコード入力画面 shall ロール別の初期画面に自動遷移する
7. If PINコードが不正の場合, then the PINコード入力画面 shall 「PINコードが正しくありません」エラーメッセージを表示する
8. If PINコードの有効期限が切れた場合, then the PINコード入力画面 shall 「PINコードの有効期限が切れました。再送信してください」エラーメッセージを表示する
9. If PINコード入力試行回数が上限（3回）に達した場合, then the PINコード入力画面 shall ログイン画面に戻り、「PINコード入力試行回数の上限に達しました。最初からやり直してください」エラーメッセージを表示する
10. When ユーザーが「PINコードを再送信」リンクをクリックした時, the PINコード入力画面 shall POST /api/v1/auth/resend-pinエンドポイントにリクエストを送信する
11. When PINコード再送信が成功した時, the PINコード入力画面 shall 「PINコードを再送信しました」成功メッセージを表示する

---

### Requirement 4: ロール別画面遷移
**Objective:** As a ユーザー, I want ログイン後に自分のロールに応じた画面に遷移する, so that 適切な機能にすぐにアクセスできる

#### Acceptance Criteria
1. When ロールが「provider」のユーザーがログインに成功した時, the 認証システム shall /providerページに遷移する
2. When ロールが「system_admin」のユーザーがログインに成功した時, the 認証システム shall /system-adminページに遷移する
3. When ロールが「data_admin」のユーザーがログインに成功した時, the 認証システム shall /data-adminページに遷移する
4. When ロールが「experiment_admin」のユーザーがログインに成功した時, the 認証システム shall /experiment-adminページに遷移する
5. When ロールが「experiment_worker」のユーザーがログインに成功した時, the 認証システム shall /experiment-workerページに遷移する
6. When ロールが「mi_engineer」のユーザーがログインに成功した時, the 認証システム shall /mi-engineerページに遷移する
7. The 認証システム shall API レスポンスの redirectUrl フィールドに基づいて遷移先を決定する

---

### Requirement 5: セッション管理
**Objective:** As a ユーザー, I want セッションが安全に管理される, so that 認証状態を維持できる

#### Acceptance Criteria
1. When PINコード検証が成功した時, the 認証システム shall HTTPOnly Cookieにセッショントークンを保存する
2. The セッショントークン shall JWT形式（maiml_session-{id}_{timestamp}）で発行される
3. The セッショントークン shall ロール別の有効期限が設定される（Admin: 48時間、Manager: 24時間、Worker: 12時間）
4. The セッショントークン shall Secure、HttpOnly、SameSite=Strict属性が設定される
5. When ユーザーがログアウトした時, the 認証システム shall POST /api/v1/auth/logoutエンドポイントにリクエストを送信し、Cookieをクリアする
6. When セッショントークンの有効期限が切れた時, the 認証システム shall ユーザーをログイン画面にリダイレクトする

---

### Requirement 6: パスワードリセット機能
**Objective:** As a ユーザー, I want パスワードを忘れた場合にリセットできる, so that アカウントに再度アクセスできる

#### Acceptance Criteria
1. When ユーザーがログイン画面で「パスワードを忘れた場合」リンクをクリックした時, the ログイン画面 shall パスワードリセット要求画面を表示する
2. The パスワードリセット要求画面 shall 組織ID入力フィールドとユーザー名入力フィールドを表示する
3. When ユーザーが「リセットリンクを送信」ボタンをクリックした時, the パスワードリセット要求画面 shall POST /api/v1/auth/reset-password-requestエンドポイントにリクエストを送信する
4. When リセット要求が成功した時, the パスワードリセット要求画面 shall 「パスワードリセット用のリンクをメールに送信しました」成功メッセージを表示する
5. When ユーザーがメール内のリセットリンクをクリックした時, the 認証システム shall パスワードリセット実行画面を表示する
6. The パスワードリセット実行画面 shall 新しいパスワード入力フィールドと確認用パスワード入力フィールドを表示する
7. When ユーザーが新しいパスワードを入力して「パスワードを変更」ボタンをクリックした時, the パスワードリセット実行画面 shall POST /api/v1/auth/reset-passwordエンドポイントにリクエストを送信する
8. When パスワードリセットが成功した時, the パスワードリセット実行画面 shall 「パスワードを変更しました。ログイン画面に戻ります」成功メッセージを表示し、5秒後にログイン画面にリダイレクトする
9. If リセットトークンが無効または期限切れの場合, then the パスワードリセット実行画面 shall 「リセットリンクが無効または期限切れです」エラーメッセージを表示する

---

### Requirement 7: エラーハンドリングとユーザビリティ
**Objective:** As a ユーザー, I want エラーが発生した際に適切なフィードバックを受け取る, so that 問題を理解し解決できる

#### Acceptance Criteria
1. When APIエラーが発生した時, the ログイン画面 shall ユーザーフレンドリーなエラーメッセージを表示する
2. If ネットワークエラーが発生した場合, then the ログイン画面 shall 「通信エラーが発生しました。インターネット接続を確認してください」エラーメッセージを表示する
3. If サーバーエラー（500系）が発生した場合, then the ログイン画面 shall 「サーバーエラーが発生しました。しばらくしてから再度お試しください」エラーメッセージを表示する
4. The エラーメッセージ shall Ant Design の Message コンポーネントまたは Notification コンポーネントを使用して表示される
5. The エラーメッセージ shall 自動的に5秒後に非表示になる
6. When 入力フィールドにバリデーションエラーがある時, the ログイン画面 shall フィールド下部に赤色のエラーメッセージを表示する
7. The ログイン画面 shall アクセシビリティ対応（aria属性、キーボード操作、スクリーンリーダー対応）を実装する

---

### Requirement 8: セキュリティ対策
**Objective:** As a システム管理者, I want ログイン画面がセキュアに実装される, so that 不正アクセスを防止できる

#### Acceptance Criteria
1. The ログイン画面 shall パスワード入力フィールドをtype="password"属性でマスキングする
2. The ログイン画面 shall HTTPS通信のみを許可する
3. The ログイン画面 shall CSRF対策としてトークン検証を実装する
4. The ログイン画面 shall XSS対策として入力値のサニタイゼーションを実装する
5. If APIがレート制限エラー（429）を返した場合, then the ログイン画面 shall 再試行可能になるまでの残り時間を表示する
6. The ログイン画面 shall ブラウザのオートコンプリート機能に対応する（username と password 属性）
7. The ログイン画面 shall パスワードマネージャーとの互換性を確保する
8. When ログインに失敗した時, the ログイン画面 shall 詳細なエラー理由（ユーザー名が存在しないのか、パスワードが間違っているのか）を表示しない（情報漏洩防止）

---

### Requirement 9: パフォーマンスと最適化
**Objective:** As a ユーザー, I want ログイン画面が高速に表示される, so that スムーズにログインできる

#### Acceptance Criteria
1. The ログイン画面 shall 初回表示時のページロード時間が2秒以内である
2. The ログイン画面 shall APIリクエストのレスポンスタイムアウトを30秒に設定する
3. The ログイン画面 shall 画像やアイコンを適切に最適化する
4. The ログイン画面 shall 不要な依存関係を持たない
5. When APIリクエストが30秒以内に完了しない場合, then the ログイン画面 shall タイムアウトエラーメッセージを表示する

---

## Non-Functional Requirements

### セキュリティ
- パスワードはフロントエンドで平文のまま送信される（TLS/HTTPS通信で暗号化）
- バックエンドでbcryptによるハッシュ化（12 rounds）
- セッショントークンはHTTPOnly Cookieで保存（JavaScriptからアクセス不可）

### 互換性
- 対応ブラウザ: Chrome（最新2バージョン）、Firefox（最新2バージョン）、Safari（最新2バージョン）、Edge（最新2バージョン）
- モバイルブラウザ: iOS Safari、Chrome for Android

### アクセシビリティ
- WCAG 2.1 Level AA準拠
- キーボード操作対応（Tab、Enter、Escapeキー）
- スクリーンリーダー対応（aria-label、aria-describedby）

---

## Related Documents
- [認証バックエンド実装計画書](../../20251229_1451_認証機能バックエンド実装_PLAN.md)
- [認証データベース設計書](../../design/db/db_auth.md)
- [認証API仕様書](../../design/api/api_auth.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
- [フロントエンド規約](../../.clinerules/development/frontend.md)
- [UIポリシー](../../.clinerules/references/ui_policy.md)
