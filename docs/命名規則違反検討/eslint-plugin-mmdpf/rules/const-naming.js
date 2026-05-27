"use strict";

/**
 * カスタムESLintルール: const-naming
 *
 * naming-convention.md の命名規則に基づき、const変数の命名をAST解析で強制する。
 *
 * 【判定基準】
 * - 固定値（Literal, BinaryExpression, ArrayExpression, ObjectExpression, NewExpression 等）
 *   → UPPER_SNAKE_CASE 必須
 * - 可変値・関数戻り値（CallExpression, AwaitExpression, MemberExpression, Identifier 等）
 *   → camelCase 必須
 *
 * 【対象外】
 * - let 宣言（既存ルールで対応済み）
 * - 分割代入（DBカラム名等を含むため）
 * - ArrowFunctionExpression / FunctionExpression（関数定義は既存ルールで対応）
 * - TaggedTemplateExpression（styled-components等の特殊ケース）
 * - エラーコード E1001〜E9999
 * - TSAsExpression / TSTypeAssertion（TypeScriptの型アサーション）
 */

/** UPPER_SNAKE_CASE（大文字アンダースコア）かどうかを判定 */
function isUpperSnakeCase(name) {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

/** camelCase かどうかを判定（先頭が小文字、または先頭アンダースコア許容） */
function isCamelCase(name) {
  return /^_?[a-z][a-zA-Z0-9]*$/.test(name);
}

/** PascalCase かどうかを判定（Reactコンポーネント等） */
function isPascalCase(name) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/** エラーコード定数（E1001〜E9999）を判定 */
function isErrorCode(name) {
  return /^E\d{4}$/.test(name);
}

/**
 * 右辺のASTノードの種別から「固定値か・可変値か・対象外か」を判定する
 *
 * @returns {'constant' | 'variable' | 'skip'}
 */
function classifyInit(init) {
  if (!init) {
    // 初期化なし（宣言のみ）→ skip
    return "skip";
  }

  const type = init.type;

  // ── 対象外（スキップ） ────────────────────────────────────────────────
  // 関数定義はアロー・通常ともに既存ルールで対応
  if (type === "ArrowFunctionExpression" || type === "FunctionExpression") {
    return "skip";
  }

  // styled-components等の tagged template（タグ付きテンプレートリテラル）
  if (type === "TaggedTemplateExpression") {
    return "skip";
  }

  // TypeScriptの型アサーション（as const, as Type 等）は中身で再判定
  if (type === "TSAsExpression" || type === "TSTypeAssertion") {
    return classifyInit(init.expression);
  }

  // TSNonNullExpression（!アサーション）は中身で再判定
  if (type === "TSNonNullExpression") {
    return classifyInit(init.expression);
  }

  // TypeScript satisfies 演算子
  if (type === "TSSatisfiesExpression") {
    return classifyInit(init.expression);
  }

  // ── 固定値（UPPER_SNAKE_CASE 必須） ──────────────────────────────────
  // リテラル: 数値・文字列・boolean・null・正規表現
  if (type === "Literal") {
    return "constant";
  }

  // テンプレートリテラル（バッククォート文字列）
  // ※ タグなしのもののみ（TaggedTemplateExpression は上でスキップ済み）
  if (type === "TemplateLiteral") {
    return "constant";
  }

  // 二項演算式（10 * 1024 等）
  if (type === "BinaryExpression") {
    return "constant";
  }

  // 単項演算式（-1 等）
  if (type === "UnaryExpression") {
    return "constant";
  }

  // 配列リテラル（[1, 2, 3] 等）
  if (type === "ArrayExpression") {
    return "constant";
  }

  // オブジェクトリテラル（{ key: value } 等）→ 固定オブジェクト
  if (type === "ObjectExpression") {
    return "constant";
  }

  // new 式（new Set([...]), new Map() 等）
  if (type === "NewExpression") {
    return "constant";
  }

  // ── 可変値・関数戻り値（camelCase / PascalCase 必須） ────────────────
  // 関数呼び出し（fn(), service.method() 等）
  if (type === "CallExpression") {
    return "variable";
  }

  // await 式（await fn() 等）
  if (type === "AwaitExpression") {
    return "variable";
  }

  // メンバー参照（obj.prop 等）
  if (type === "MemberExpression") {
    return "variable";
  }

  // 識別子参照（他の変数を代入）
  if (type === "Identifier") {
    return "variable";
  }

  // 三項演算子（a ? b : c）
  if (type === "ConditionalExpression") {
    return "variable";
  }

  // 論理演算（a ?? b, a || b 等）
  if (
    type === "LogicalExpression" ||
    type === "ChainExpression" ||
    type === "OptionalMemberExpression" ||
    type === "OptionalCallExpression"
  ) {
    return "variable";
  }

  // yield 式
  if (type === "YieldExpression") {
    return "variable";
  }

  // その他 → 判定不能のためスキップ（エラーにしない）
  return "skip";
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "const変数の命名規則を値の性質（固定値/可変値）に基づいて強制する（naming-convention.md準拠）",
      category: "Stylistic Issues",
      recommended: true,
      url: "https://bitbucket.org/soft-service-ws/mmdpf",
    },
    messages: {
      shouldBeUpperSnakeCase:
        "'{{name}}' は固定値のため UPPER_SNAKE_CASE で命名してください（例: {{suggestion}}）。",
      shouldBeCamelCase:
        "'{{name}}' は関数の戻り値または可変値のため camelCase で命名してください（例: {{suggestion}}）。",
    },
    schema: [],
  },

  create(context) {
    /**
     * 識別子名を UPPER_SNAKE_CASE に変換する（エラーメッセージ用）
     * 例: taskStatusMap → TASK_STATUS_MAP
     */
    function toUpperSnakeCase(name) {
      return name
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .toUpperCase();
    }

    /**
     * 識別子名を camelCase に変換する（エラーメッセージ用）
     * 例: TASK_STATUS_MAP → taskStatusMap
     */
    function toCamelCase(name) {
      return name
        .toLowerCase()
        .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    }

    return {
      VariableDeclaration(node) {
        // const のみ対象（let / var は除外）
        if (node.kind !== "const") {
          return;
        }

        for (const declarator of node.declarations) {
          // 分割代入（{ a, b } = ... または [ a, b ] = ...）は除外
          if (
            declarator.id.type === "ObjectPattern" ||
            declarator.id.type === "ArrayPattern"
          ) {
            continue;
          }

          const name = declarator.id.name;
          if (!name) {
            continue;
          }

          // エラーコード定数（E1001〜E9999）は除外
          if (isErrorCode(name)) {
            continue;
          }

          const category = classifyInit(declarator.init);

          if (category === "skip") {
            // 対象外（関数定義・styled-components等）→ チェックしない
            continue;
          }

          if (category === "constant") {
            // 固定値 → UPPER_SNAKE_CASE 必須
            if (!isUpperSnakeCase(name)) {
              context.report({
                node: declarator.id,
                messageId: "shouldBeUpperSnakeCase",
                data: {
                  name,
                  suggestion: toUpperSnakeCase(name),
                },
              });
            }
          } else if (category === "variable") {
            // 可変値・関数戻り値 → camelCase または PascalCase 許容
            // PascalCase は Reactコンポーネントのインスタンス化等で使う場合があるため許容
            if (!isCamelCase(name) && !isPascalCase(name)) {
              context.report({
                node: declarator.id,
                messageId: "shouldBeCamelCase",
                data: {
                  name,
                  suggestion: toCamelCase(name),
                },
              });
            }
          }
        }
      },
    };
  },
};
