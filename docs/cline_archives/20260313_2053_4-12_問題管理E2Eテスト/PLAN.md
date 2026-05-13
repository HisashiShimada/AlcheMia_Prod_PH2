# タスク計画書: 4-12 問題管理 E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 21:00
- **タスクID**: 4-12_issue_management_e2e
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-12: 問題管理」に基づき、
Playwright + playwright-bdd を使用した E2E テストの featureファイルおよびステップ定義ファイルを作成する。

全8シナリオすべて Playwright 自動化対象。

## 目的と期待される成果

- [ ] `tests/e2e/features/4_experiment_admin/4-12_issue_management.feature` の作成
- [ ] `tests/e2e/steps/4_experiment_admin/4-12_issue_management.ts` の作成

## 実装ステップ

### Phase 1: featureファイル作成
- [ ] `4-12_issue_management.feature` を作成（背景・8シナリオ）

### Phase 2: stepsファイル作成（基本構造）
- [ ] ファイル骨格（import・定数・Before/After フック）を作成

### Phase 3: stepsファイル作成（ステップ定義）
- [ ] Given / When ステップ定義を追加
- [ ] Then ステップ定義を追加

### Phase 4: stepsファイル作成（ヘルパー関数）
- [ ] DB操作ヘルパー関数（upsertProject / insertTestIssue など）を追加

## シナリオ一覧

| シナリオID | 内容 | 種別 |
|-----------|------|------|
| 4-12-1 | 問題管理モーダルで問題一覧が表示されること（検索・ステータスフィルター） | 正常系 |
| 4-12-2 | 新規問題をプロジェクト単位で登録できること | 正常系 |
| 4-12-3 | 新規問題をトランジション単位で登録できること | 正常系 |
| 4-12-4 | タイトルまたは内容が未入力の場合にバリデーションエラーが表示されること | 異常系 |
| 4-12-5 | 既存問題を選択してコメントを追加できること | 正常系 |
| 4-12-6 | コメントが未入力の場合に「コメント送信」「解決」「未解決」ボタンが非活性であること | 表示確認 |
| 4-12-7 | 未解決の問題を「解決済」に変更できること（コメントと同時送信） | 正常系 |
| 4-12-8 | 解決済の問題を「未解決」に戻せること（コメントと同時送信） | 正常系 |

## 変更ファイル

### 新規作成
1. `tests/e2e/features/4_experiment_admin/4-12_issue_management.feature`
2. `tests/e2e/steps/4_experiment_admin/4-12_issue_management.ts`

## 設計上の注意点

- **ロール**: `experiment_admin`（実験管理者）でログイン
- **モーダルの開き方**: プロジェクト選択後のツールバー or 進捗確認タブの「問題管理」ボタンから開く
- **問題対象種別**:
  - 4-12-2: `project` 単位（プロジェクト全体に対する問題）
  - 4-12-3: `transition` 単位（トランジションに対する問題）
- **4-12-6**: コメント未入力時「コメント送信」「解決」「未解決」の3ボタン全て非活性
- **4-12-7/8**: コメントを入力した上でステータス変更ボタンをクリック（コメントと同時送信）

## テストデータ設計

```
テスト用プロジェクト: E2Eテスト用プロジェクト_4-12 (project_id: E2E-4-12)
  - project_status: 2 (in_progress)
  - checkout_status: 0 (checked_in)

シナリオ別 issue 事前データ:
  - 4-12-1: 未解決問題×1件、解決済問題×1件（検索・フィルタ確認）
  - 4-12-5: 既存問題×1件（コメント追加テスト）
  - 4-12-6: 既存問題×1件（ボタン非活性確認）
  - 4-12-7: 未解決問題×1件（解決済に変更テスト）
  - 4-12-8: 解決済問題×1件（未解決に戻すテスト）
```

## 参照ドキュメント

- `tests/e2e/test-scenarios/4_experiment_admin.md` §4-12
- `tests/e2e/features/5_experiment_worker/5-3_issue_management.feature`（参考実装）
- `tests/e2e/steps/5_experiment_worker/5-3_issue_management.ts`（参考実装）
- `tests/e2e/features/4_experiment_admin/4-11_file_upload.feature`（参考実装・4系）
- `tests/e2e/steps/4_experiment_admin/4-11_file_upload.ts`（参考実装・4系）

## 承認記録

- **計画書提示日時**: 2026-03-13 21:00
- **承認日時**: 2026-03-13 21:04
