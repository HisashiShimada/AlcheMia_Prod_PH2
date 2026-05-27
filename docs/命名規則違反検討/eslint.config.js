import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import mmdpfPlugin from "eslint-plugin-mmdpf";

/**
 * naming-convention ルール（命名規則規約 .clinerules/development/naming-convention.md 準拠）
 *
 * 優先度：より具体的なルールが後勝ちになるため、順序に注意。
 */
const namingConventionRules = [
  "error",

  // ─── デフォルト: すべての識別子は camelCase ───────────────────────────────
  {
    selector: "default",
    format: ["camelCase"],
    leadingUnderscore: "allow",
    trailingUnderscore: "allow",
  },

  // ─── 変数（let）: camelCase のみ ────────────────────────────────────────
  // let は可変値であるため camelCase のみ許容
  {
    selector: "variable",
    format: ["camelCase"],
    leadingUnderscore: "allow",
  },

  // ─── const 変数（スコープ不問）: camelCase / UPPER_SNAKE_CASE / PascalCase ─
  // UPPER_SNAKE_CASE: 固定値定数（new Set([...]), 数値リテラル等）
  // camelCase: 関数の戻り値・可変値
  // PascalCase: Reactコンポーネント（const MyComp = () => {}）
  {
    selector: "variable",
    modifiers: ["const"],
    format: ["camelCase", "UPPER_CASE", "PascalCase"],
    leadingUnderscore: "allow",
  },

  // ─── モジュールレベルの const 定数: UPPER_SNAKE_CASE / camelCase / PascalCase ─
  // camelCase: export const findAll = async () => {} のような関数型 const
  // PascalCase: styled-components（const SubHeaderContainer = styled.div`...`）
  {
    selector: "variable",
    modifiers: ["const", "global"],
    format: ["UPPER_CASE", "camelCase", "PascalCase"],
    leadingUnderscore: "allow",
  },

  // ─── 例外①: エラーコード定数 E1001〜E9999 は除外 ─────────────────────────
  {
    selector: "variable",
    modifiers: ["const", "global"],
    filter: {
      regex: "^E\\d{4}$",
      match: true,
    },
    format: null,
  },

  // ─── 例外②: 分割代入変数（DBカラム名 snake_case 対応）は制限なし ─────────
  {
    selector: "variable",
    modifiers: ["destructured"],
    format: null,
  },

  // ─── 例外③: モジュールレベルの分割代入（Typography.Text 等）は制限なし ────
  // const { Text, Paragraph } = Typography; のようなケースは
  // const + global + destructured の3修飾子ルールが必要
  {
    selector: "variable",
    modifiers: ["const", "global", "destructured"],
    format: null,
  },

  // ─── import 名: camelCase または PascalCase（クラス・ライブラリ名の import 対応） ─
  {
    selector: "import",
    format: ["camelCase", "PascalCase", "UPPER_CASE"],
  },

  // ─── 関数: camelCase または PascalCase（Reactコンポーネント対応） ────────
  {
    selector: "function",
    format: ["camelCase", "PascalCase"],
    leadingUnderscore: "allow",
  },

  // ─── パラメータ: camelCase（先頭アンダースコア許容） ─────────────────────
  {
    selector: "parameter",
    format: ["camelCase"],
    leadingUnderscore: "allow",
  },

  // ─── メソッド（クラスメソッド・オブジェクトリテラルメソッド）: camelCase / PascalCase ─
  // PascalCase: Reactクラスコンポーネントの static MyMethod() など
  {
    selector: "method",
    format: ["camelCase", "PascalCase"],
    leadingUnderscore: "allow",
  },

  // ─── アクセサ（getter / setter）: camelCase ───────────────────────────────
  // get foo() / set foo() はプロパティアクセスのため常に camelCase
  {
    selector: "accessor",
    format: ["camelCase"],
    leadingUnderscore: "allow",
  },

  // ─── パラメータプロパティ（コンストラクタ引数宣言）: camelCase ─────────────
  // constructor(private name: string) のような宣言はパラメータと同等
  {
    selector: "parameterProperty",
    format: ["camelCase"],
    leadingUnderscore: "allow",
  },

  // ─── クラス: PascalCase ───────────────────────────────────────────────────
  {
    selector: "class",
    format: ["PascalCase"],
  },

  // ─── interface / typeAlias / enum: PascalCase ────────────────────────────
  {
    selector: "interface",
    format: ["PascalCase"],
  },
  {
    selector: "typeAlias",
    format: ["PascalCase"],
  },
  {
    selector: "enum",
    format: ["PascalCase"],
  },

  // ─── enumMember: 制限なし（UPPER_CASE が多いが強制しない） ───────────────
  {
    selector: "enumMember",
    format: null,
  },

  // ─── プロパティ: 制限なし（DBカラム名・オブジェクトキーを除外） ─────────
  {
    selector: "property",
    format: null,
  },

  // ─── 型パラメータ (T, TData など): PascalCase ────────────────────────────
  {
    selector: "typeParameter",
    format: ["PascalCase"],
  },
];

export default [
  {
    files: ["backend/src/**/*.ts", "frontend/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      mmdpf: mmdpfPlugin,
    },
    rules: {
      "@typescript-eslint/naming-convention": namingConventionRules,
      "mmdpf/const-naming": "error",
    },
  },
];
