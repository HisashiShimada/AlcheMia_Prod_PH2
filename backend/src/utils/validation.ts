/**
 * Validation Utility Functions
 * 
 * @description 共通バリデーション関数
 * Task: 5.2.3 UUIDバリデーションの強化
 * Requirements: 14
 */

/**
 * UUID v4形式の検証
 * 
 * @param uuid - 検証対象のUUID文字列
 * @returns UUIDが有効な場合true、無効な場合false
 * 
 * @example
 * ```typescript
 * isValidUUID('123e4567-e89b-12d3-a456-426614174000'); // true
 * isValidUUID('invalid-uuid'); // false
 * isValidUUID(''); // false
 * ```
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  // UUID v4形式: 8-4-4-4-12の16進数文字列（ハイフン区切り）
  // 大文字小文字を区別しない（iフラグ）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(uuid);
}

/**
 * UUID検証エラーレスポンスの生成
 * 
 * @param fieldName - フィールド名（例: 'projectId', 'userId'）
 * @returns 統一されたエラーレスポンスオブジェクト
 */
export function createUUIDValidationError(fieldName: string) {
  return {
    code: 'VALIDATION_INVALID_FORMAT' as const,
    message: `${fieldName}はUUID形式である必要があります`,
    details: [{
      field: fieldName,
      message: 'UUID形式が必要です',
      code: 'INVALID_FORMAT' as const,
    }],
  };
}