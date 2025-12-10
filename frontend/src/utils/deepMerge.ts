/**
 * 2つのオブジェクトを深くマージする
 * target: ベースとなるオブジェクト
 * source: 上書きするオブジェクト
 * 
 * sourceに存在するキーのみがtargetを上書きする
 * ネストされたオブジェクトも再帰的にマージされる
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // 両方がオブジェクトの場合は再帰的にマージ
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        // それ以外の場合はsourceの値で上書き
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}
