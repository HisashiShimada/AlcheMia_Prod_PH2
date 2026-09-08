# spec-implワークフロー実行時の注意事項

## 概要

spec-implワークフロー（仕様書から実装への移行）を実行する際の重要なルールを定義します。

## 発生する問題

### 問題の症状

spec-implワークフロー実行時に、以下の問題が発生することがあります：

1. **ソースコードファイルの作成・修正が行われない**
   - design.mdやresearch.mdの内容を確認するだけで終わる
   - 実装ステップを読み取るが、実際のコード生成に進まない
   - タスク計画書を作成せずに「実装完了」と報告してしまう

2. **タスク計画書のスキップ**
   - core/workflow.mdで定義されているタスク計画書の作成をスキップ
   - ユーザー承認を得ずに作業を開始（または開始したと誤認）

## 根本原因

### 1. ワークフロー実行の誤解

spec-implワークフローは以下のように誤解されることがあります：

```
❌ 誤った理解：
tasks.md → design.md → research.md を読む
→ 「仕様を確認しました」で完了

✅ 正しい理解：
tasks.md → design.md → research.md を読む
→ タスク計画書を作成
→ ユーザー承認
→ 実際のソースコードを実装
→ テスト
→ 完了報告
```

### 2. 「実装」の定義の曖昧さ

- **仕様の確認** = 実装ではない
- **設計の理解** = 実装ではない
- **実装** = ソースコードファイルの作成・修正

## 必須ルール

### ルール1: spec-implワークフローでは必ず実装を行う

```
spec-implワークフロー実行時は、以下のステップを必ず実行すること：

1. 仕様書（design.md, research.md）を読む
2. タスク計画書を作成（core/workflow.mdに従う）
3. ユーザー承認を得る
4. 【必須】ソースコードファイルを実装する
   - write_fileまたはreplace_in_fileを使用
   - 実際のTypeScript/JavaScriptファイルを作成・修正
5. 実装内容をテスト
6. attempt_completionで完了報告
```

### ルール2: 実装対象ファイルの明示

タスク計画書には以下を必ず含めること：

```markdown
## 実装ファイル

### 新規作成
- [ ] `backend/src/controllers/xxxController.ts`
- [ ] `backend/src/services/xxxService.ts`
- [ ] `backend/src/repositories/xxxRepository.ts`

### 修正
- [ ] `backend/src/routes/xxxRoutes.ts`
- [ ] `backend/src/types/xxx.ts`

## 実装内容

### ファイル1: backend/src/controllers/xxxController.ts
**目的**: xxxの処理を行うコントローラー
**主要機能**:
- function1(): ...
- function2(): ...

### ファイル2: backend/src/services/xxxService.ts
**目的**: xxxのビジネスロジック
**主要機能**:
- serviceFunction1(): ...
- serviceFunction2(): ...
```

### ルール3: 実装確認のチェックポイント

attempt_completionを使用する前に、以下を確認すること：

```
自己チェックリスト：
- [ ] write_fileまたはreplace_in_fileを実行したか？
- [ ] 実際のソースコードファイルが作成・修正されたか？
- [ ] ユーザーから「ファイル作成成功」の確認を得たか？
- [ ] テストコードも必要に応じて作成したか？
- [ ] migration SQLファイルがあれば作成したか？
- [ ] バックエンドに変更がある場合 → `cd backend && npx tsc --noEmit` がエラー0件か？
- [ ] フロントエンドに変更がある場合 → `cd frontend && npx tsc --noEmit` がエラー0件か？

もし上記のいずれかが「No」なら、attempt_completionを使用してはいけない。
```

## ワークフロー実行例

### ✅ 正しい実行例

```
1. read_file(tasks.md)
   → ユーザー確認待ち

2. read_file(design.md)
   → ユーザー確認待ち

3. write_file(docs/YYYYMMDD_HHMM_xxx_PLAN.md)
   → タスク計画書作成
   → ユーザー承認待ち

4. write_file(backend/src/controllers/xxxController.ts)
   → 実装ファイル1作成
   → ユーザー確認待ち

5. write_file(backend/src/services/xxxService.ts)
   → 実装ファイル2作成
   → ユーザー確認待ち

6. write_file(backend/src/repositories/xxxRepository.ts)
   → 実装ファイル3作成
   → ユーザー確認待ち

7. write_file(backend/tests/controllers/xxxController.test.ts)
   → テストファイル作成
   → ユーザー確認待ち

8. attempt_completion
   → 完了報告
```

### ❌ 誤った実行例

```
1. read_file(tasks.md)
   → ユーザー確認待ち

2. read_file(design.md)
   → ユーザー確認待ち

3. attempt_completion
   → 「仕様を確認しました」で完了
   ❌ これは間違い！実装していない！
```

## 例外ケース

以下の場合のみ、実装なしで完了可能：

1. **調査タスク**: research.mdの作成のみが目的の場合
2. **設計タスク**: design.mdの作成のみが目的の場合
3. **レビュータスク**: 既存コードのレビューのみが目的の場合

ただし、この場合でもタスク計画書で「実装は行わない」ことを明示すること。

## トラブルシューティング

### 問題: 「実装したつもり」で完了報告してしまう

**原因**: 仕様の理解を「実装」と誤認識

**対策**:
```
attempt_completionを使用する前に、以下を自問すること：

Q1: write_fileまたはreplace_in_fileを実行しましたか？
    → No なら実装していない

Q2: backend/src/またはfrontend/src/配下のファイルを作成・修正しましたか？
    → No なら実装していない

Q3: ユーザーから「ファイル作成成功」の確認を得ましたか？
    → No なら実装確認ができていない
```

### 問題: タスク計画書をスキップしてしまう

**原因**: ワークフローの手順を省略

**対策**:
```
spec-implワークフローでは、core/workflow.mdのルールが適用されます。
必ず以下の順序で実行すること：

1. 仕様書を読む
2. タスク計画書を作成（省略不可）
3. ユーザー承認を得る
4. 実装を開始

タスク計画書なしでの実装開始は禁止です。
```

## まとめ

### 最も重要な3つのルール

1. **spec-implワークフローでは必ずソースコードファイルを実装する**
   - 仕様の確認だけでは不十分
   - write_file/replace_in_fileを使用する

2. **タスク計画書は省略しない**
   - core/workflow.mdのルールに従う
   - 実装対象ファイルを明示する

3. **attempt_completion前に実装を確認する**
   - ファイル作成の成功確認を得る
   - 自己チェックリストを実施する

### DO（推奨）

✅ 必ずソースコードファイルを実装する
✅ タスク計画書で実装対象ファイルを明示する
✅ 各ファイル作成後にユーザー確認を待つ
✅ attempt_completion前に自己チェックリストを実施する
✅ 実装内容をテストコードで検証する

### DON'T（非推奨）

❌ 仕様の確認だけで「実装完了」と報告しない
❌ タスク計画書を省略しない
❌ write_file/replace_in_fileを実行せずに完了報告しない
❌ ユーザー確認を待たずに次のステップに進まない
❌ 自己チェックリストをスキップしない

## 関連ドキュメント

- [core/workflow.md](workflow.md) - タスク実行の基本ワークフロー
- [development/file-writing.md](../development/file-writing.md) - ファイル書き込み規約
- [development/backend.md](../development/backend.md) - バックエンド実装規約
- [development/frontend.md](../development/frontend.md) - フロントエンド実装規約

---

**作成日**: 2026-02-03
**対象**: spec-implワークフロー実行時
**重要度**: 最高