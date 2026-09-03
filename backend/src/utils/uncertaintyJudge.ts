/**
 * 不確かさ判定ロジック
 *
 * 作業者が入力した Uncertainty Value と
 * uncertainty_criteria の tolerance_upper / tolerance_lower を比較して
 * '良好' または '不良' を返す。
 *
 * @module uncertaintyJudge
 */

/**
 * 不確かさ値と許容値を比較して判定結果を返す。
 *
 * 判定条件: tolerance_lower ≦ value ≦ tolerance_upper → '良好'
 * それ以外: '不良'
 *
 * @param value - 作業者が入力した不確かさ値
 * @param upper - 許容上限値（tolerance_upper）
 * @param lower - 許容下限値（tolerance_lower）
 * @returns '良好' | '不良'
 */
export function judgeUncertainty(
  value: number,
  upper: number,
  lower: number
): '良好' | '不良' {
  if (value >= lower && value <= upper) {
    return '良好';
  }
  return '不良';
}
