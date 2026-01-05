/**
 * メールサービス
 * 
 * @description メール送信機能を提供（PINコード、パスワードリセット）
 * Requirements: 1.2, 3.1, 5.1, 10.1
 */

import nodemailer from 'nodemailer';
import type { Result, ServiceError } from '../types/auth';

/**
 * メール設定インターフェース
 */
interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  fromName: string;
}

/**
 * メールサービスクラス
 */
export class EmailService {
  private readonly config: EmailConfig;
  private readonly transporter: nodemailer.Transporter;
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30秒

  constructor() {
    // 環境変数から設定を取得
    this.config = {
      smtpHost: process.env.SMTP_HOST || 'localhost',
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD || '',
      fromAddress: process.env.SMTP_FROM_ADDRESS || 'noreply@mmdpf.example.com',
      fromName: process.env.SMTP_FROM_NAME || 'MMDPF Authentication'
    };

    // nodemailer transporterを作成
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword
      },
      connectionTimeout: this.timeout,
      greetingTimeout: this.timeout,
      socketTimeout: this.timeout
    });
  }

  /**
   * PINコードメールを送信
   * 
   * @param email - 送信先メールアドレス
   * @param pinCode - 6桁のPINコード
   * @param username - ユーザー名
   * @returns 送信結果
   */
  async sendPinCode(
    email: string,
    pinCode: string,
    username: string
  ): Promise<Result<void, ServiceError>> {
    // バリデーション
    const validationError = this.validatePinCodeParams(email, pinCode);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // メール内容を構築
    const mailOptions = {
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: email,
      subject: 'MMDPF - ログイン認証コード',
      text: this.createPinCodeTextContent(username, pinCode),
      html: this.createPinCodeHtmlContent(username, pinCode)
    };

    // リトライ付きで送信
    return await this.sendWithRetry(mailOptions);
  }

  /**
   * パスワードリセットメールを送信
   * 
   * @param email - 送信先メールアドレス
   * @param resetToken - リセットトークン
   * @param username - ユーザー名
   * @returns 送信結果
   */
  async sendPasswordReset(
    email: string,
    resetToken: string,
    username: string
  ): Promise<Result<void, ServiceError>> {
    // バリデーション
    const validationError = this.validatePasswordResetParams(email, resetToken);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // リセットURLを生成
    const resetUrl = this.generateResetUrl(resetToken);

    // メール内容を構築
    const mailOptions = {
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: email,
      subject: 'MMDPF - パスワードリセットのご案内',
      text: this.createPasswordResetTextContent(username, resetUrl),
      html: this.createPasswordResetHtmlContent(username, resetUrl)
    };

    // リトライ付きで送信
    return await this.sendWithRetry(mailOptions);
  }

  /**
   * リトライロジック付きメール送信
   * 
   * @param mailOptions - メールオプション
   * @returns 送信結果
   */
  private async sendWithRetry(
    mailOptions: nodemailer.SendMailOptions
  ): Promise<Result<void, ServiceError>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        return { success: true, data: undefined };
      } catch (error) {
        lastError = error as Error;
        
        // 最後の試行でなければ少し待つ
        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt); // 1秒、2秒、3秒と待機時間を増やす
        }
      }
    }

    // すべての試行が失敗
    return {
      success: false,
      error: {
        code: 'SYSTEM_EMAIL_SEND_FAILED',
        message: `Failed to send email after ${this.maxRetries} attempts`,
        originalError: lastError || undefined
      }
    };
  }

  /**
   * PINコードパラメータのバリデーション
   */
  private validatePinCodeParams(email: string, pinCode: string): ServiceError | null {
    if (!this.isValidEmail(email)) {
      return {
        code: 'VALIDATION_INVALID_EMAIL',
        message: 'Invalid email address format'
      };
    }

    if (!/^\d{6}$/.test(pinCode)) {
      return {
        code: 'VALIDATION_INVALID_PIN_CODE',
        message: 'PIN code must be exactly 6 digits'
      };
    }

    return null;
  }

  /**
   * パスワードリセットパラメータのバリデーション
   */
  private validatePasswordResetParams(email: string, resetToken: string): ServiceError | null {
    if (!this.isValidEmail(email)) {
      return {
        code: 'VALIDATION_INVALID_EMAIL',
        message: 'Invalid email address format'
      };
    }

    if (!/^reset_[a-zA-Z0-9_-]+_\d+$/.test(resetToken)) {
      return {
        code: 'VALIDATION_INVALID_RESET_TOKEN',
        message: 'Invalid reset token format'
      };
    }

    return null;
  }

  /**
   * メールアドレスのバリデーション
   */
  private isValidEmail(email: string): boolean {
    // RFC 5322準拠の簡易バージョン
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * リセットURL生成
   */
  private generateResetUrl(resetToken: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/reset-password?token=${resetToken}`;
  }

  /**
   * PINコードメールのテキスト版コンテンツ
   */
  private createPinCodeTextContent(username: string, pinCode: string): string {
    return `
${username} 様

MMDPFにログインしようとしています。

以下の認証コードを入力してログインを完了してください：

認証コード: ${pinCode}

このコードの有効期限は5分間です。

このメールに心当たりがない場合は、無視してください。

---
MMDPF Authentication System
    `.trim();
  }

  /**
   * PINコードメールのHTML版コンテンツ
   */
  private createPinCodeHtmlContent(username: string, pinCode: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #CF0027; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .pin-code { font-size: 32px; font-weight: bold; color: #CF0027; text-align: center; 
                padding: 20px; background-color: white; border: 2px dashed #CF0027; 
                margin: 20px 0; letter-spacing: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MMDPF ログイン認証</h1>
    </div>
    <div class="content">
      <p>${username} 様</p>
      <p>MMDPFにログインしようとしています。</p>
      <p>以下の認証コードを入力してログインを完了してください：</p>
      <div class="pin-code">${pinCode}</div>
      <p><strong>このコードの有効期限は5分間です。</strong></p>
      <p>このメールに心当たりがない場合は、無視してください。</p>
    </div>
    <div class="footer">
      <p>MMDPF Authentication System</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * パスワードリセットメールのテキスト版コンテンツ
   */
  private createPasswordResetTextContent(username: string, resetUrl: string): string {
    return `
${username} 様

MMDPFのパスワードリセットが要求されました。

以下のリンクをクリックして、新しいパスワードを設定してください：

${resetUrl}

このリンクの有効期限は1時間です。

パスワードリセットを要求していない場合は、このメールを無視してください。

---
MMDPF Authentication System
    `.trim();
  }

  /**
   * パスワードリセットメールのHTML版コンテンツ
   */
  private createPasswordResetHtmlContent(username: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #CF0027; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 15px 30px; background-color: #CF0027; 
              color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .button:hover { background-color: #A50020; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { color: #d9534f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MMDPF パスワードリセット</h1>
    </div>
    <div class="content">
      <p>${username} 様</p>
      <p>MMDPFのパスワードリセットが要求されました。</p>
      <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">パスワードをリセット</a>
      </div>
      <p><strong>このリンクの有効期限は1時間です。</strong></p>
      <p class="warning">パスワードリセットを要求していない場合は、このメールを無視してください。</p>
    </div>
    <div class="footer">
      <p>MMDPF Authentication System</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * スリープ関数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
