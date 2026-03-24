# タスク計画書: 実験作業者シナリオテスト 5-1（プロジェクト・メソッド・タスク選択）

## メタデータ
- **作成日時**: 2026-03-11 11:57
- **タスクID**: experiment-worker-scenario-5-1
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者（experiment_worker）ロールを対象としたE2Eシナリオテスト（5-1-1〜5-1-5）を作成する。
テスト方法はPlaywright自動のため、Gherkin シナリオファイル（.feature）と Steps 実装ファイル（.ts）の両方を作成する。

## 目的と期待される成果

- [ ] `playwright.config.ts` を `5_experiment_worker` グループ対応に更新する
- [ ] `5-1_project_selection.feature` を作成する（5-1-1〜5-1-5）
- [ ] `steps/5_experiment_worker/common.ts` を作成する（ログイン共通ステップ）
- [ ] `steps/5_experiment_worker/5-1_project_selection.ts` を作成する

## 実装ステップ

### Phase 1: playwright.config.ts の更新
- [ ] `features` glob を `features/**/*.feature` に拡張
- [ ] `steps` glob を `steps/**/*.ts` に拡張

### Phase 2: featureファイルの作成
- [ ] `tests/e2e/features/5_experiment_worker/5-1_project_selection.feature` を作成
  - 5-1-1: プロジェクト選択コンボボックスで実験作業可能なプロジェクトが表示されること
  - 5-1-2: 「選択」ボタンでプロジェクト選択モーダルが開くこと
  - 5-1-3: プロジェクト変更時にメソッドとタスクがリセットされること
  - 5-1-4: メソッド・タスク選択モーダルでメソッドタブを切り替えてタスクを選択できること
  - 5-1-5: メソッド・タスク選択モーダルでタスク名フィルタが機能すること

### Phase 3: 共通ステップファイルの作成
- [ ] `tests/e2e/steps/5_experiment_worker/common.ts` を作成
  - 実験作業者ユーザーID存在確認 Given（no-op）
  - 実験作業者ログイン When ステップ

### Phase 4: ステップ実装ファイルの作成
- [ ] `tests/e2e/steps/5_experiment_worker/5-1_project_selection.ts` を作成
  - Before フック（テスト用プロジェクトをDBに挿入）
  - After フック（テスト用プロジェクトをDBから削除）
  - 実験作業者メイン画面を開く When ステップ
  - 「選択」ボタンクリック When ステップ
  - プロジェクト選択コンボボックス操作 When ステップ
  - メソッド・タスク選択モーダル操作ステップ
  - Then ステップ各種

## 変更ファイル

1. `tests/e2e/playwright.config.ts` - experiment_worker グループ対応に更新
2. `tests/e2e/features/5_experiment_worker/5-1_project_selection.feature` - 新規作成
3. `tests/e2e/steps/5_experiment_worker/common.ts` - 新規作成
4. `tests/e2e/steps/5_experiment_worker/5-1_project_selection.ts` - 新規作成

## テスト設計上の注意点

### APIの実装状況
- `GET /api/v1/projects/worker-accessible` : TODO状態のため、現状はモックデータ / フロントエンド描画での確認が主目的
- シナリオ 5-1-1 では、コンボボックスに選択肢が存在することをUIレベルで確認する

### テストユーザー（要確認）
- 実験作業者: `worker_user@example.com` / `auth0001`（TODO: 実際のユーザーIDに要更新）
- orgId: `a0718dc5-21f3-44e6-87e9-cc2ae83f3385`（playwright.config.ts のデフォルト値を使用）

### セレクタ設計
- プロジェクト選択コンボボックス: プロジェクト選択エリア内の `.ant-select`
- 「選択」ボタン（プロジェクト）: `button:has-text("選択")` でプロジェクト選択エリア内を特定
- プロジェクト選択モーダル: `.ant-modal` のタイトルテキストで特定
- メソッド・タスク選択モーダル: `.ant-modal:has-text("メソッド・タスク選択")`
- メソッドタブ: `.ant-tabs-card .ant-tabs-tab`
- タスク名フィルター検索: モーダル内の `Input[placeholder="検索..."]`
- 決定ボタン: モーダルフッター内の `.ant-btn-primary`（「決定」テキスト）

### テストデータ（DB直接INSERT）
- テスト用プロジェクト: project テーブルに直接 INSERT
  - status: `in_progress`
  - project_name: `E2Eテスト用プロジェクト_5-1`
- テスト用プロジェクトタスク: project_task テーブルに直接 INSERT

## リスク

| リスク | 対策 |
|--------|------|
| API未実装により5-1-1のAPIレスポンス確認不可 | UIレベル（コンボボックスの選択肢表示）での確認に留める |
| テストユーザー未確定 | 仮値でプレースホルダー実装、TODO コメントで要更新を明示 |
| DBのカラム名不正確 | `docs/design/db/ddl/project.sql` を参照して確認が必要 |

## テスト計画

- [ ] featureファイルのシナリオが正しく記述されているか目視確認
- [ ] bddgen でコード生成が通ること（`npx bddgen --config e2e/playwright.config.ts`）
- [ ] テスト実行前にフロントエンド・バックエンド・DBが起動していること

## 承認記録
- **計画書提示日時**: 2026-03-11 11:57
- **承認日時**: 2026-03-11 11:57（承認済み）
