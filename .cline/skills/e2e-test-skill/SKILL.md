---
name: e2e-test-skill
description: e2eテストの仕様作成、設計、実施を行う際に使用する（Playwright/BDD/Gherkin）
---

# e2e-test-skill

## 重要：必須の事前準備

**このスキルを使用する際は、作業開始前に必ず以下のファイルを `read_file` ツールで読み込み、記載されているルール・ベストプラクティスに従うこと。**

```
.cline/skills/e2e-test-skill/docs/test.md
```

## Usage

このスキルは以下のフェーズで使用する：

1. **仕様作成フェーズ**: テスト対象の要件を分析し、テストケース一覧を作成する
2. **設計フェーズ**: featureファイル・stepsの構造・テストデータを設計する
3. **実施フェーズ**: テストコードを実装し（Playwright）、または手動テストを実施し、結果を確認する

## Steps

1. `read_file` で `.cline/skills/e2e-test-skill/docs/test.md` を読み込む
2. `docs/test.md`（このスキルディレクトリ内）のテスト種類と対象を確認する
3. `docs/test.md`（このスキルディレクトリ内）のテスト記述規約・命名規則に従ってテスト設計を行う
4. `docs/test.md`（このスキルディレクトリ内）のベストプラクティスに従ってfeatureファイル・stepsを実装する（自動化の場合）
5. `docs/test.md`（このスキルディレクトリ内）に記載のコマンドでテストを実行し、結果を確認する（Playwrightの場合）
