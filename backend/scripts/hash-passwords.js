/**
 * パスワードをbcryptでハッシュ化するスクリプト
 * 開発環境用のテストパスワードをハッシュ化します
 */

const bcrypt = require('bcrypt');

// ハッシュ化するパスワードリスト
const passwords = [
  'provider123',
  'admin123',
  'data123',
  'exp123',
  'worker123'
];

// bcrypt rounds（セキュリティレベル）
const SALT_ROUNDS = 12;

async function hashPasswords() {
  console.log('='.repeat(60));
  console.log('パスワードハッシュ化スクリプト');
  console.log('='.repeat(60));
  console.log(`bcrypt rounds: ${SALT_ROUNDS}\n`);

  for (const password of passwords) {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      console.log(`元のパスワード: ${password}`);
      console.log(`ハッシュ値: ${hash}`);
      console.log('-'.repeat(60));
    } catch (error) {
      console.error(`エラー（${password}）:`, error.message);
    }
  }

  console.log('\n完了しました。');
}

// スクリプト実行
hashPasswords().catch(console.error);
