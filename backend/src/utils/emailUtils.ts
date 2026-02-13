/**
 * メール関連のユーティリティ関数
 */

/**
 * メールアドレスをマスキングする
 * 
 * @param email - マスキング対象のメールアドレス
 * @returns マスキングされたメールアドレス
 * 
 * @example
 * maskEmail('user@example.com') // => 'use***@example.com'
 * maskEmail('ab@example.com')   // => 'a***@example.com'
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 3) {
    return `${localPart.charAt(0)}***@${domain}`;
  }
  
  return `${localPart.substring(0, 3)}***@${domain}`;
}
