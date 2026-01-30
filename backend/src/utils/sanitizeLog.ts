/**
 * ログ出力用サニタイズ・フィルタリングユーティリティ
 * 
 * Task 5.2.4: ログ内容の機密情報チェック
 * Requirement: 12 (セキュリティとマルチテナント分離)
 * 
 * 目的: ログ出力から機密情報（password, token, API key等）を除去する
 */

/**
 * 機密情報パターンの定義
 */
const SENSITIVE_PATTERNS = [
  // パスワード関連
  { pattern: /password["\s:=]+([^\s"',}]+)/gi, replacement: '[REDACTED]' },
  { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password": "[REDACTED]"' },
  
  // トークン関連（Bearerキーワードも削除）
  { pattern: /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, replacement: '[REDACTED]' },
  { pattern: /token["\s:=]+([^\s"',}]+)/gi, replacement: '[REDACTED]' },
  { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token": "[REDACTED]"' },
  
  // セッションID
  { pattern: /session[_-]?id["\s:=]+([^\s"',}]+)/gi, replacement: '[REDACTED]' },
  { pattern: /sess_[\w-]+/gi, replacement: '[REDACTED]' },
  
  // AWS Access Key（AKIAプレフィックスも削除）
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED]' },
  { pattern: /aws[_-]?access[_-]?key[_-]?id["\s:=]+([^\s"',}]+)/gi, replacement: '[REDACTED]' },
  { pattern: /aws[_-]?secret[_-]?access[_-]?key["\s:=]+([^\s"',}]+)/gi, replacement: '[REDACTED]' },
  
  // API Key（sk_live_プレフィックスも削除）
  { pattern: /api[_-]?key["\s:=]+([^\s"',}]+)/gi, replacement: '[REDACTED]' },
  { pattern: /sk_live_[\w-]+/gi, replacement: '[REDACTED]' },
  { pattern: /sk_test_[\w-]+/gi, replacement: '[REDACTED]' },
  
  // 秘密鍵（BEGIN/ENDキーワードも削除）
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, replacement: '[REDACTED]' },
  
  // データベース接続文字列
  { pattern: /(postgresql|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s"']+/gi, replacement: '$1://[REDACTED]' },
  
  // クレジットカード番号（16桁）
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[REDACTED]' },
  
  // 環境変数の秘密値（KEY=value形式）
  { pattern: /(SECRET|KEY|TOKEN|PASSWORD|CREDENTIAL)[_A-Z0-9]*\s*=\s*([^\s"']+)/gi, replacement: '[REDACTED]' },
];

/**
 * 文字列から機密情報を除去する
 * 
 * @param input - サニタイズする文字列
 * @returns サニタイズされた文字列
 */
export function sanitizeForLog(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  let sanitized = input;

  // 各パターンに対してマスキング処理を実行
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * オブジェクトから機密情報を除去する（再帰的）
 * 
 * @param obj - サニタイズするオブジェクト
 * @returns サニタイズされたオブジェクト
 */
export function sanitizeObjectForLog(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // プリミティブ型の場合
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeForLog(obj);
    }
    return obj;
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectForLog(item));
  }

  // オブジェクトの場合
  const sanitized: any = {};
  
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    
    // 機密フィールド名の場合は値を [REDACTED] に置き換え
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key') ||
      lowerKey.includes('credential') ||
      lowerKey.includes('authorization')
    ) {
      sanitized[key] = '[REDACTED]';
    } else {
      // 再帰的にサニタイズ
      sanitized[key] = sanitizeObjectForLog(obj[key]);
    }
  }

  return sanitized;
}

/**
 * Errorオブジェクトから機密情報を除去する
 * 
 * @param error - エラーオブジェクト
 * @returns サニタイズされたエラー情報
 */
export function sanitizeErrorForLog(error: Error): {
  name: string;
  message: string;
  stack?: string;
} {
  return {
    name: error.name,
    message: sanitizeForLog(error.message),
    stack: error.stack ? sanitizeForLog(error.stack) : undefined,
  };
}