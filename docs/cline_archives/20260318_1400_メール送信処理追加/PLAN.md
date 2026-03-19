# タスク計画書: メール送信処理追加

## メタデータ
- **作成日時**: 2026-03-18 14:00
- **タスクID**: email-notification
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

組織追加時・ユーザー追加時・ログイン試行時（パスワード認証成功→PIN送信）の3タイミングで通知メールを送信する機能を追加する。
メールサービス（SMTPホスト）と送信者メールアドレスは環境変数で管理する。

既に `EmailService` クラス（`backend/src/services/emailService.ts`）が存在しており、
SMTP設定の環境変数（`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_ADDRESS` 等）も定義済みのため、
**新たにメソッドを追加する形で拡張**する。

---

## 目的と期待される成果

### 目的
- 組織・ユーザー追加時に代表者・担当者へ登録完了通知を送信する
- ログイン試行時（パスワード認証成功後）にPINコード送信の通知を行う（既存のPIN送信は対象外・現在も機能中）

### 期待される成果
- [x] 組織追加時に代表者メールアドレス宛に「組織登録完了+一時パスワード」通知メールが送信される
- [x] ユーザー追加時（単体・CSV一括）にユーザーのメールアドレス宛に「アカウント作成+一時パスワード」通知メールが送信される
- [x] ログイン試行時（パスワード認証成功時）の通知はPINコード送信メールとして既に実装済みのため対応不要（現状確認）
- [x] 環境変数 `SMTP_HOST`（SMTPホスト）・`SMTP_FROM_ADDRESS`（送信者アドレス）で設定可能
- [x] 開発環境（`NODE_ENV=development`）では `EMAIL_ENABLED=false` でメール送信をスキップしてログ出力のみ

---

## 調査結果まとめ

### 既存の EmailService について

| メソッド | 用途 | 呼び出し元 |
|---|---|---|
| `sendPinCode()` | PINコードメール送信 | `PinCodeService` |
| `sendPasswordReset()` | パスワードリセットメール | 未使用（旧設計） |
| `sendTempPassword()` | 一時パスワードメール | `AuthService.processPasswordResetRequest()` |

### 既存の環境変数（SMTP関連）

`backend/.env` に以下が定義済み（コメントアウト状態）：

```
# Email Configuration (将来実装)
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_USER=noreply@example.com
# EMAIL_PASSWORD=your-email-password
# EMAIL_FROM=noreply@example.com
```

`EmailService` コンストラクター内では `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_ADDRESS` 等を参照しているため、**環境変数名の整合性を取る必要がある**。

ユーザーの要望として「メールサービスと送信者メールアドレスを環境変数で設定」とあるため、既存の変数名（`SMTP_HOST`, `SMTP_FROM_ADDRESS`）をそのまま活用し、`.env` のコメントアウト箇所を更新する。

### ログイン試行時のメール送信（現状）

`AuthService.processLogin()` → `PinCodeService.generateAndSendPin()` → `EmailService.sendPinCode()` の流れで**既に実装済み**。ログイン成功時にPINコードメールが送信されている。

---

## 実装ステップ

### Phase 1: EmailService にメソッドを追加

**対象ファイル**: `backend/src/services/emailService.ts`

追加するメソッド：

1. **`sendOrganizationCreated()`** — 組織登録完了通知メール
   - 引数: `email`, `userId`, `tempPassword`
   - 内容: ログインURL・ユーザーID（メールアドレス）・初期パスワード

2. **`sendUserCreated()`** — ユーザーアカウント作成通知メール
   - 引数: `email`, `userId`, `tempPassword`
   - 内容: ログインURL・ユーザーID（メールアドレス）・初期パスワード

### Phase 2: organizationService に EmailService 呼び出しを追加

**対象ファイル**: `backend/src/services/organizationService.ts`

- `createOrganization()` の末尾（フォルダ作成・スキーマ作成と同様の非同期ブロック）に `sendOrganizationCreated()` を呼び出すコードを追加
- 証明書生成・フォルダ作成と同様に**メール送信失敗でも組織作成は成功**とする（try/catch でログ出力のみ）
- `uploadOrganizationsCsv()` 内の `createOrganization()` 呼び出し部分は `createOrganization()` 側で処理されるため追加変更不要

**追加箇所のイメージ**:
```typescript
// 組織作成成功後、登録完了メールを送信
// メール内容: ログインURL・ユーザーID・初期パスワード
// 失敗しても組織作成自体は成功とする
try {
  if (process.env.EMAIL_ENABLED === 'true') {
    const emailService = new EmailService();
    if (data.chiefUserEmail && plainPassword) {
      await emailService.sendOrganizationCreated(
        data.chiefUserEmail,  // 送信先
        data.chiefUserEmail,  // ユーザーID（メールアドレスと同一）
        plainPassword         // 初期パスワード
      );
    }
  } else {
    logger.info(`[organizationService] 登録完了メール（EMAIL_ENABLED=false スキップ）: userId=${data.chiefUserEmail}`);
  }
} catch (emailError) {
  logger.warn(`[organizationService] 登録完了メール送信失敗（組織作成は成功）`, { ... });
}
```

⚠️ **注意**: `plainPassword` は現在 `createOrganization` 内でのみスコープされており、スキーマ作成ブロックの後にアクセスできないため、メール送信ブロックを**適切な位置**に配置する必要がある。

### Phase 3: userService に EmailService 呼び出しを追加

**対象ファイル**: `backend/src/services/userService.ts`

- `createUser()` の末尾に `sendUserCreated()` を追加
  - `plainPassword` が関数内で生成されているのでそのまま利用可能
  - メール送信失敗はログ出力のみ（ユーザー作成は成功とする）
- `uploadUsersFromCSV()` の各ユーザー作成ループ内にも同様に追加
  - CSV一括登録時も各ユーザーに通知メールを送信

**追加箇所のイメージ（createUser）**:
```typescript
const user = await userRepository.create(...);

// アカウント作成完了メールを送信（失敗しても作成は成功）
// メール内容: ログインURL・ユーザーID・初期パスワード
try {
  if (process.env.EMAIL_ENABLED === 'true') {
    const emailService = new EmailService();
    await emailService.sendUserCreated(
      data.mailAddress,   // 送信先
      data.mailAddress,   // ユーザーID（メールアドレスと同一）
      plainPassword       // 初期パスワード
    );
  } else {
    logger.info(`[userService] アカウント作成通知（EMAIL_ENABLED=false スキップ）: userId=${data.mailAddress}`);
  }
} catch (emailError) {
  logger.warn('[userService] アカウント作成通知メール失敗（ユーザー作成は成功）', { ... });
}

return user;
```

### Phase 4: 環境変数の整理

**対象ファイル**: `backend/.env`

- コメントアウトされている Email Configuration セクションを有効化
- 変数名を `EmailService` コンストラクターで参照している名称（`SMTP_HOST`, `SMTP_FROM_ADDRESS`）に統一

```env
# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_ADDRESS=noreply@example.com
SMTP_FROM_NAME=MMDPF System
```

---

## 影響範囲

### 変更するファイル
1. `backend/src/services/emailService.ts` — メソッド追加（`sendOrganizationCreated`, `sendUserCreated`）
2. `backend/src/services/organizationService.ts` — `createOrganization()` にメール送信処理追加
3. `backend/src/services/userService.ts` — `createUser()`, `uploadUsersFromCSV()` にメール送信処理追加
4. `backend/.env` — Email Configuration のコメントアウト解除・変数名整理

### 新規作成するファイル
なし

### 影響を受ける機能
- 組織追加（プロバイダーメニュー）: 追加後は代表者宛にメール送信
- ユーザー追加（システム管理メニュー・CSV一括）: 追加後はユーザー宛にメール送信
- ログイン: 変更なし（既にPINメール送信あり）

---

## 技術的詳細

### メール送信の制御フロー

- **本番環境（`NODE_ENV=production`）**: 常にメール送信（`EMAIL_ENABLED` は参照しない）
- **本番以外（`NODE_ENV=development` 等）**: `EMAIL_ENABLED` フラグで制御

```
本番環境 (NODE_ENV=production)
  → 常に EmailService 経由でSMTP送信
  → 失敗時はログ記録のみ（処理継続）

本番以外 + EMAIL_ENABLED=false（デフォルト）
  → メール送信スキップ
  → ログにユーザーID・パスワードを出力（確認用）

本番以外 + EMAIL_ENABLED=true
  → EmailService 経由でSMTP送信（Outlook等で動作確認可能）
  → 失敗時はログ記録のみ（処理継続）
```

**想定ユースケース:**

| 環境 | `NODE_ENV` | `EMAIL_ENABLED` | 動作 |
|---|---|---|---|
| 開発環境（通常） | `development` | `false` | スキップ・ログ出力のみ |
| 開発環境（動作確認時） | `development` | `true` | Outlook等へ実際に送信 |
| 本番環境 | `production` | 参照しない | 常に送信 |

**実装イメージ（各サービス共通パターン）:**
```typescript
const shouldSendEmail =
  process.env.NODE_ENV === 'production' ||
  process.env.EMAIL_ENABLED === 'true';

if (shouldSendEmail) {
  const emailService = new EmailService();
  await emailService.sendOrganizationCreated(email, userId, tempPassword);
} else {
  logger.info(`[メール送信スキップ] EMAIL_ENABLED=false: userId=${userId}`);
}
```

### EmailService の環境変数マッピング

| 環境変数 | EmailService プロパティ | デフォルト値 |
|---|---|---|
| `SMTP_HOST` | `smtpHost` | `localhost` |
| `SMTP_PORT` | `smtpPort` | `587` |
| `SMTP_SECURE` | `smtpSecure` | `false` |
| `SMTP_USER` | `smtpUser` | `''` |
| `SMTP_PASSWORD` | `smtpPassword` | `''` |
| `SMTP_FROM_ADDRESS` | `fromAddress` | `noreply@mmdpf.example.com` |
| `SMTP_FROM_NAME` | `fromName` | `MMDPF Authentication` |

---

## セキュリティ考慮事項
- [ ] 一時パスワードはメール本文に含まれるが、これは意図的な設計（初回ログイン時に変更を促す）
- [ ] メール送信失敗でもユーザー/組織の作成処理は成功とする（可用性を優先）
- [ ] 開発環境でのパスワードコンソール出力は既存の `console.log` と同様

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SMTP未設定時の送信失敗 | 低 | 高（開発環境） | NODE_ENV=development でスキップ |
| CSV一括登録時の大量メール送信 | 中 | 中 | 失敗時もログのみで継続 |
| plainPassword スコープ問題 | 中 | 低 | createOrganization内の適切な位置に実装 |

## テスト計画
- [ ] 組織追加後にログに「メール送信成功」が出力されること（開発環境：スキップログ）
- [ ] ユーザー追加後に同様のログが出力されること
- [ ] SMTP未設定でもエラー終了しないこと（メール失敗→警告ログ→処理継続）
- [ ] 本番環境設定でSMTP接続エラー時にリトライ（最大3回）されること

## 承認記録
- **計画書提示日時**: 2026-03-18 14:06
- **承認日時**: 
- **承認者コメント**: 
