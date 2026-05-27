"use strict";

const constNaming = require("./rules/const-naming");

/**
 * eslint-plugin-mmdpf
 *
 * mmdpfプロジェクト用カスタムESLintプラグイン。
 * naming-convention.md の命名規則をAST解析で強制する。
 */
module.exports = {
  rules: {
    "const-naming": constNaming,
  },
  configs: {
    recommended: {
      plugins: ["mmdpf"],
      rules: {
        "mmdpf/const-naming": "error",
      },
    },
  },
};
