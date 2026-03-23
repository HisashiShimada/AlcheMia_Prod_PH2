/**
 * テストメール送信スクリプト
 * 
 * 使い方:
 *   npx ts-node backend/scripts/test-email.ts <送信先メールアドレス>
 * 
 * 例:
 *   npx ts-node backend/scripts/test-email.ts yourname@example.com
 * 
 * .env の SMTP設定を使って実際にメールを送信します。
 * EMAIL_ENABLED の値に関わらず強制的に送信します。
 */

import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

// .env を読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const toAddress = process.argv[2];

  if (!toAddress) {
    console.error('❌ 送信先メールアドレスを指定してください');
    console.error('   使い方: npx ts-node backend/scripts/test-email.ts <メールアドレス>');
    process.exit(1);
  }

  // SMTP設定を表示（パスワードはマスク）
  console.log('=== SMTP設定（.env から読み込み） ===');
  console.log(`  SMTP_HOST         : ${process.env.SMTP_HOST || '(未設定)'}`);
  console.log(`  SMTP_PORT         : ${process.env.SMTP_PORT || '(未設定)'}`);
  console.log(`  SMTP_SECURE       : ${process.env.SMTP_SECURE || '(未設定)'}`);
  console.log(`  SMTP_USER         : ${process.env.SMTP_USER || '(未設定)'}`);
  console.log(`  SMTP_PASSWORD     : ${process.env.SMTP_PASSWORD ? '********' : '(未設定)'}`);
  console.log(`  SMTP_FROM_ADDRESS : ${process.env.SMTP_FROM_ADDRESS || '(未設定)'}`);
  console.log(`  SMTP_FROM_NAME    : ${process.env.SMTP_FROM_NAME || '(未設定)'}`);
  console.log(`  FRONTEND_URL      : ${process.env.FRONTEND_URL || '(未設定)'}`);
  console.log(`  NODE_ENV          : ${process.env.NODE_ENV || '(未設定)'}`);
  console.log(`  EMAIL_ENABLED     : ${process.env.EMAIL_ENABLED || '(未設定)'}`);
  console.log('');

  const smtpHost = process.env.SMTP_HOST || 'localhost';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPassword = process.env.SMTP_PASSWORD || '';
  const fromAddress = process.env.SMTP_FROM_ADDRESS || 'noreply@mmdpf.example.com';
  const fromName = process.env.SMTP_FROM_NAME || 'MMDPF System';

  // transporter を作成
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPassword
      ? { user: smtpUser, pass: smtpPassword }
      : undefined,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  // Step 1: SMTP接続確認
  console.log(`Step 1: SMTPサーバーへの接続確認中... (${smtpHost}:${smtpPort})`);
  try {
    await transporter.verify();
    console.log('  ✅ SMTP接続成功\n');
  } catch (err) {
    console.error('  ❌ SMTP接続失敗:');
    console.error(`     ${(err as Error).message}`);
    console.error('');
    console.error('【よくある原因】');
    console.error('  - SMTP_HOST / SMTP_PORT が間違っている');
    console.error('  - SMTP_USER / SMTP_PASSWORD が間違っている');
    console.error('  - Outlookの場合: アプリパスワードではなく通常パスワードが必要（または MFA 設定確認）');
    console.error('  - Gmailの場合: アプリパスワード（16文字）が必要');
    console.error('  - ファイアウォールがポート587をブロックしている');
    process.exit(1);
  }

  // Step 2: テストメール送信
  console.log(`Step 2: テストメールを送信中... (宛先: ${toAddress})`);
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: toAddress,
      subject: '[MMDPF テスト] メール送信設定の確認',
      text: [
        'これはMMDPFのメール送信テストです。',
        '',
        'このメールが届いている場合、SMTP設定は正常です。',
        '',
        '--- 設定情報 ---',
        `SMTP_HOST         : ${smtpHost}`,
        `SMTP_PORT         : ${smtpPort}`,
        `SMTP_FROM_ADDRESS : ${fromAddress}`,
        `FRONTEND_URL      : ${loginUrl}`,
        `送信日時          : ${new Date().toLocaleString('ja-JP')}`,
        '',
        '---',
        'MMDPF System',
      ].join('\n'),
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background-color: #CF0027; color: white; padding: 20px; text-align: center; }
  .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
  .success { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
  .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 10px 0; font-family: monospace; font-size: 13px; }
  .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>MMDPF メール送信テスト</h1></div>
  <div class="content">
    <div class="success">
      <strong>✅ メール送信設定は正常です！</strong>
    </div>
    <p>このメールが届いている場合、SMTP設定は正しく動作しています。</p>
    <h3>設定情報</h3>
    <div class="info-box">
      SMTP_HOST: ${smtpHost}<br>
      SMTP_PORT: ${smtpPort}<br>
      SMTP_FROM_ADDRESS: ${fromAddress}<br>
      FRONTEND_URL: ${loginUrl}<br>
      送信日時: ${new Date().toLocaleString('ja-JP')}
    </div>
  </div>
  <div class="footer"><p>MMDPF System</p></div>
</div>
</body>
</html>
      `.trim(),
    });

    console.log('  ✅ テストメール送信成功！');
    console.log(`     MessageId: ${info.messageId}`);
    if (info.response) {
      console.log(`     Response : ${info.response}`);
    }
    console.log('');
    console.log(`📧 ${toAddress} にメールが届いているか確認してください。`);
    console.log('   迷惑メールフォルダも確認してください。');
  } catch (err) {
    console.error('  ❌ メール送信失敗:');
    console.error(`     ${(err as Error).message}`);
    console.error('');
    console.error('【よくある原因】');
    console.error('  - 送信元アドレス (SMTP_FROM_ADDRESS) が SMTP_USER と異なる（Outlookでは一致が必要）');
    console.error('  - 送信先アドレスが存在しない');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
