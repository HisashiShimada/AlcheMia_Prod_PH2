/**
 * ファイルパス検証ユーティリティ
 * 
 * タスク1.1: ファイル名サニタイゼーション機能の実装
 * Requirements: 2 (ファイルパスの検証とセキュリティ)
 * 
 * パストラバーサル攻撃、絶対パス、不正なファイル名を検出・除去し、
 * マルチテナント分離を維持しながら安全なファイルアクセスを提供します。
 */

/**
 * Windowsの予約ファイル名
 */
const WINDOWS_RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

/**
 * ファイル名の最大長
 */
const MAX_FILENAME_LENGTH = 255;

/**
 * ファイル名のサニタイゼーション
 * 
 * パストラバーサルパターン（../, ..\）やパス区切り文字を除去し、
 * 安全なファイル名を返します。
 * 
 * @param fileName - サニタイズするファイル名
 * @returns サニタイズされたファイル名
 * 
 * @example
 * ```typescript
 * sanitizeFileName('../../../etc/passwd')  // => 'etcpasswd'
 * sanitizeFileName('file.txt')             // => 'file.txt'
 * sanitizeFileName('%2e%2e%2ffile.txt')   // => 'file.txt'
 * ```
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || fileName.trim().length === 0) {
    return '';
  }

  let sanitized = fileName.trim();

  // URLデコード（最大2回：二重エンコード対策）
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(sanitized);
      if (decoded === sanitized) break; // これ以上デコードできない
      sanitized = decoded;
    } catch {
      break; // デコードエラーの場合は現在の値を使用
    }
  }

  // パストラバーサルパターンを除去
  // ../ と ..\ を除去
  sanitized = sanitized.replace(/\.\.[\\/]/g, '');
  
  // 残った .. も除去（例: 'file..txt' を防ぐため、ファイル名内の .. は許可）
  // ただし、パストラバーサルの残骸のみを除去
  sanitized = sanitized.replace(/^\.\.+/g, '');

  // パス区切り文字を除去（/, \）
  sanitized = sanitized.replace(/[\\/]/g, '');

  // 先頭と末尾の空白を再度除去
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * パスの妥当性を検証
 * 
 * パストラバーサル、絶対パス、URLエンコードされた不正パスを検出します。
 * 
 * @param path - 検証するパス
 * @returns パスが有効な場合はtrue、それ以外はfalse
 * 
 * @example
 * ```typescript
 * isValidPath('projects/project1/file.txt')  // => true
 * isValidPath('../../../etc/passwd')          // => false
 * isValidPath('/etc/passwd')                  // => false
 * isValidPath('C:\\windows\\system32')        // => false
 * ```
 */
export function isValidPath(path: string): boolean {
  if (!path || path.trim().length === 0) {
    return false;
  }

  const trimmedPath = path.trim();

  // URLデコード（最大2回）
  let decodedPath = trimmedPath;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(decodedPath);
      if (decoded === decodedPath) break;
      decodedPath = decoded;
    } catch {
      break;
    }
  }

  // パストラバーサルパターンを検出
  if (/\.\.[\\/]/.test(decodedPath)) {
    return false;
  }

  // 先頭に .. がある場合（例: '../../file'）
  if (/^\.\./.test(decodedPath)) {
    return false;
  }

  // 絶対パス（Unix形式: /で始まる）を検出
  if (/^[\\/]/.test(decodedPath)) {
    return false;
  }

  // 絶対パス（Windows形式: C:\ や D:\ など）を検出
  if (/^[a-zA-Z]:[\\/]/.test(decodedPath)) {
    return false;
  }

  return true;
}

/**
 * ファイル名の妥当性を検証
 * 
 * ファイル名の長さ、フォーマット、特殊文字、予約名を検証します。
 * 
 * @param fileName - 検証するファイル名
 * @returns ファイル名が有効な場合はtrue、それ以外はfalse
 * 
 * @example
 * ```typescript
 * isValidFileName('file.txt')      // => true
 * isValidFileName('file<>.txt')    // => false
 * isValidFileName('CON')           // => false（Windows予約名）
 * isValidFileName('a'.repeat(256)) // => false（長すぎる）
 * ```
 */
export function isValidFileName(fileName: string): boolean {
  if (!fileName || fileName.trim().length === 0) {
    return false;
  }

  const trimmedName = fileName.trim();

  // 長さチェック
  if (trimmedName.length > MAX_FILENAME_LENGTH) {
    return false;
  }

  // 特殊文字チェック（<, >, :, ", |, ?, *, \0などの制御文字）
  // Windows/Unix共通で禁止される文字
  if (/[<>:"|?*\x00-\x1F]/.test(trimmedName)) {
    return false;
  }

  // Windowsの予約名チェック（大文字小文字区別なし）
  const nameWithoutExt = trimmedName.split('.')[0].toUpperCase();
  if (WINDOWS_RESERVED_NAMES.includes(nameWithoutExt)) {
    return false;
  }

  return true;
}

/**
 * URLエンコードされたファイル名をデコードして検証
 * 
 * URLエンコードされたファイル名を安全にデコードし、
 * サニタイズと検証を実行します。
 * 
 * @param encodedFileName - URLエンコードされたファイル名
 * @returns 有効なファイル名、または無効な場合はnull
 * 
 * @example
 * ```typescript
 * decodeAndValidateFileName('file%20name.txt')     // => 'file name.txt'
 * decodeAndValidateFileName('%2e%2e%2ffile.txt')  // => null（パストラバーサル）
 * decodeAndValidateFileName('file%3C%3E.txt')     // => null（特殊文字）
 * ```
 */
export function decodeAndValidateFileName(encodedFileName: string): string | null {
  if (!encodedFileName || encodedFileName.trim().length === 0) {
    return null;
  }

  let decodedName: string;
  
  try {
    // URLデコード（最大2回：二重エンコード対策）
    decodedName = encodedFileName;
    for (let i = 0; i < 2; i++) {
      const decoded = decodeURIComponent(decodedName);
      if (decoded === decodedName) break;
      decodedName = decoded;
    }
  } catch {
    // デコードエラー（不正なエンコード）
    return null;
  }

  // デコード直後にパス検証（不正な入力を即座に拒否）
  if (!isValidPath(decodedName)) {
    return null;
  }

  // サニタイズ
  const sanitized = sanitizeFileName(decodedName);

  // 空文字列になった場合は無効
  if (!sanitized || sanitized.length === 0) {
    return null;
  }

  // ファイル名検証
  if (!isValidFileName(sanitized)) {
    return null;
  }

  return sanitized;
}
