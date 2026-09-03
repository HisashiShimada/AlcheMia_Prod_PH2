/**
 * XML NCName バリデーションユーティリティ
 *
 * @remarks
 * XML Namespaces 仕様の NCName 定義に基づくバリデーション。
 * NCName ::= (Letter | '_') (NCNameChar)*
 * NCNameChar ::= Letter | Digit | '.' | '-' | '_' | CombiningChar | Extender
 *
 * このシステムでは ASCII サブセットのみを許容し、全角カナ・漢字・コロン等は不可とする。
 *
 * 有効例: `MyPrefix`, `_corpA`, `corp-A`, `corp.A`, `corp1`
 * 無効例: `テスト`, `1start`, `co:lon`, `with space`
 */

/** ASCII サブセットの NCName 正規表現 */
const NCNAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;

/**
 * 値が xs:NCName 形式かどうかを検証する
 *
 * @param value - 検証対象の文字列
 * @returns NCName として有効であれば true
 */
export function isValidNCName(value: string): boolean {
  return NCNAME_REGEX.test(value);
}
