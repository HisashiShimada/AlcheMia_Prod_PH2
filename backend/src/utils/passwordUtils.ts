/**
 * パスワード関連のユーティリティ関数
 */

/**
 * 一時パスワードを生成する
 * 12文字、大小英数字+特殊文字を含む
 * 
 * @returns 生成された一時パスワード
 * 
 * @example
 * generateTempPassword() // => 'Xy9@aB3$mN1z'
 */
export function generateTempPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + special;

  let password = '';
  
  // 最低1文字ずつ各種類を含める
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // 残り8文字をランダムに
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // シャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
