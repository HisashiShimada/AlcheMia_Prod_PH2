---
name: unit-integration-test-skill
description: 単体テスト・結合テストの仕様作成、設計、実施を行う際に使用する
---

# unit-integration-test-skill

## 重要：必須の事前準備

**このスキルを使用する際は、作業開始前に必ず以下のファイルを `read_file` ツールで読み込み、記載されているルール・ベストプラクティスに従うこと。**

```
.cline/skills/unit-integration-test-skill/docs/test.md
```

## Usage

このスキルは以下のフェーズで使用する：

1. **仕様作成フェーズ**: テスト対象の要件を分析し、テストケース一覧を作成する
2. **設計フェーズ**: テストコードの構造・モック・テストデータを設計する
3. **実施フェーズ**: テストコードを実装し、実行・結果を確認する

## Steps

1. `read_file` で `.cline/skills/unit-integration-test-skill/docs/test.md` を読み込む
2. `docs/test.md`（このスキルディレクトリ内） のテスト種類（単体テスト／結合テスト）と対象を確認する
3. `docs/test.md`（このスキルディレクトリ内） のテスト記述規約・命名規則に従ってテスト設計を行う
4. `docs/test.md`（このスキルディレクトリ内） のベストプラクティスに従ってテストコードを実装する
5. `docs/test.md`（このスキルディレクトリ内） に記載のコマンドでテストを実行し、結果を確認する
6. `docs/test.md`（このスキルディレクトリ内） のカバレッジ目標を達成しているか確認する
