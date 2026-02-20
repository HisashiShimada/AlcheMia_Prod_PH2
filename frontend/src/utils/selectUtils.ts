/**
 * selectUtils.ts
 * Selectコンポーネント用のユーティリティ関数
 */

/**
 * コード値オプションの型定義
 */
export interface CodeOption {
  value: number | string;
  label: string;
}

/**
 * コード値オプションをAnt Design SelectのOptionsに変換
 * @param options コード値オプションの配列
 * @returns Ant Design Select用のオプション配列
 */
export const createSelectOptions = (options: CodeOption[]) => {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
  }));
};

/**
 * code_masterから取得したデータをSelectOptionsに変換
 * @param codeMasterData code_masterから取得したデータ
 * @returns Ant Design Select用のオプション配列
 * 
 * @example
 * const experimentConditionOptions = createSelectOptionsFromCodeMaster([
 *   { code_value: 0, code_name: '全て同一条件' },
 *   { code_value: 1, code_name: '実験ごとに条件変更' }
 * ]);
 */
export const createSelectOptionsFromCodeMaster = <T extends { value: number | string; label: string }>(
  codeMasterData: T[]
): Array<{ value: number | string; label: string }> => {
  return codeMasterData.map((item) => ({
    value: item.value,
    label: item.label,
  }));
};

/**
 * 数値の範囲からSelectOptionsを生成
 * @param min 最小値
 * @param max 最大値
 * @param labelFormatter ラベルのフォーマッター関数（オプション）
 * @returns Ant Design Select用のオプション配列
 * 
 * @example
 * const orderOptions = createRangeOptions(1, 10); // [{ value: 1, label: '1' }, ...]
 * const customOptions = createRangeOptions(1, 3, (n) => `試行${n}`); // [{ value: 1, label: '試行1' }, ...]
 */
export const createRangeOptions = (
  min: number,
  max: number,
  labelFormatter?: (value: number) => string
) => {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const value = min + i;
    return {
      value,
      label: labelFormatter ? labelFormatter(value) : value.toString(),
    };
  });
};
