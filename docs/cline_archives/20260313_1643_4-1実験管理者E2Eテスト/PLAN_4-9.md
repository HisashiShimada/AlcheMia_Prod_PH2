# タスク計画書: [4-9] トランジション検索 E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 20:00
- **タスクID**: 4-9_transition_search_e2e
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-9: トランジション検索」に対応する
Playwright BDD（playwright-bdd）の featureファイルおよびstepsファイルを作成する。

手動テストとなっている 4-9-10（意味的類似検索）については featureファイルのみ作成し、
stepsファイルは作成しない。

## 目的と期待される成果

- [ ] タスク計画書の作成（本ファイル）
- [ ] featureファイルの作成（4-9-1〜4-9-10 全10シナリオ）
- [ ] stepsファイルの作成（4-9-1〜4-9-9 の自動テスト9シナリオ）

## 実装ステップ

### Phase 1: タスク計画書
- [x] `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN_4-9.md` を作成

### Phase 2: featureファイル
- [ ] `tests/e2e/features/4_experiment_admin/4-9_transition_search.feature` を作成
  - 4-9-1: 進捗確認画面にトランジション検索タブが表示されること（表示確認）
  - 4-9-2: プロジェクト名でトランジションを検索できること（正常系）
  - 4-9-3: トランジション名でトランジションを検索できること（正常系）
  - 4-9-4: ステータスでトランジションをフィルタリングできること（正常系）
  - 4-9-5: 検索結果一覧にトランジション情報が表示されること（表示確認）
  - 4-9-6: 検索結果が0件の場合にメッセージが表示されること（正常系）
  - 4-9-7: 検索条件を変更して再検索すると結果が更新されること（正常系）
  - 4-9-8: 検索条件をリセットすると全件が表示されること（正常系）
  - 4-9-9: 検索結果の行をクリックするとプロジェクト進捗詳細ダイアログが開き、
           該当トランジションが強調表示されること（正常系）
  - 4-9-10: 意味的類似検索でテキスト内容が類似するトランジションが返されること（手動）

### Phase 3: stepsファイル
- [ ] `tests/e2e/steps/4_experiment_admin/4-9_transition_search.ts` を作成
  - Before フック: transition_set テーブルにテストデータをUPSERT
  - After フック: テストデータをクリーンアップ
  - Given ステップ: テストデータ存在確認（no-op）
  - When ステップ: 各画面操作
  - Then ステップ: 各表示確認

## 変更ファイル

### 新規作成
1. `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN_4-9.md` - 本ファイル
2. `tests/e2e/features/4_experiment_admin/4-9_transition_search.feature` - featureファイル
3. `tests/e2e/steps/4_experiment_admin/4-9_transition_search.ts` - stepsファイル

## 技術詳細

### テスト対象コンポーネント
- 進捗確認画面: `frontend/src/components/progress/ProgressMonitoring.tsx`
- 作業進捗詳細ダイアログ: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- ※トランジション検索専用コンポーネントは未実装のため、data-testidを新規定義する

### 対応API
- `GET /api/v1/transition-search` （検索）
- `GET /api/v1/transition-search?semantic=true` （意味的類似検索・手動のみ）

### テストデータ
- `transition_set` テーブルにテスト用データをUPSERT
- 各ステータス（完了/作業中/未着手）のトランジションを少なくとも1件ずつ準備
- 前処理: project → project_task → transition_set の順でINSERT
- 後処理: transition_set → project_task → project の順でDELETE（外部キー制約）

### 想定 data-testid 一覧（新規定義）

| data-testid | コンポーネント | 説明 |
|-------------|---------------|------|
| `transition-search-tab` | ProgressMonitoring | トランジション検索タブ |
| `transition-search-project-input` | TransitionSearch | プロジェクト名検索入力 |
| `transition-search-transition-input` | TransitionSearch | トランジション名検索入力 |
| `transition-search-status-filter` | TransitionSearch | ステータスフィルタ Select |
| `transition-search-button` | TransitionSearch | 検索ボタン |
| `transition-search-reset-button` | TransitionSearch | リセットボタン |
| `transition-search-results` | TransitionSearch | 検索結果テーブル |
| `transition-search-no-results` | TransitionSearch | 0件メッセージ |
| `transition-search-semantic-input` | TransitionSearch | セマンティック検索入力 |
| `transition-search-semantic-button` | TransitionSearch | セマンティック検索ボタン |

### 既存コードの踏襲パターン
- ログイン: `tests/e2e/steps/4_experiment_admin/4-6_progress_monitoring.ts` の `実験管理者ユーザー {string} でログインする` ステップを流用
- 進捗確認画面遷移: `4-6` の `進捗確認画面が表示されている` ステップを流用
- DBヘルパー: `4-6` の `upsertProject` / `upsertProjectTask` / `upsertTransitionSet` 関数を流用
- Before/After フックパターン: `4-6` のパターンを踏襲

## セキュリティ考慮事項
- [ ] 認証済みユーザー（実験管理者）のみがトランジション検索にアクセスできること
- [ ] organization_id によるマルチテナント分離が維持されること

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| TransitionSearch コンポーネント未実装 | 高 | data-testid を事前定義し、実装時に合わせる旨をコメントに明記 |
| 4-9-9（行クリック→詳細ダイアログ）でのトランジション強調表示確認困難 | 中 | ダイアログの表示確認のみに範囲を絞り、強調表示は目視確認コメントを追記 |
| 4-9-10（セマンティック検索）はOllamaサービス依存 | 高 | 手動テストとしてfeatureのみ作成 |

## テスト計画

### 自動テスト（4-9-1〜4-9-9）
- テストデータはBefore/Afterフックで制御
- 各ステータスのトランジションデータを準備
- API呼び出しはPlaywright標準のwaitForResponseで待機

### 手動テスト（4-9-10）
- featureファイルに @manual タグを付与
- Ollamaエンベディングサービス起動が必要
- 検索精度は目視確認

## 承認記録
- **計画書提示日時**: 2026-03-13 20:00

## 関連ドキュメント
- [テストシナリオ一覧](../../tests/e2e/test-scenarios/4_experiment_admin.md) §4-9
- [進捗管理画面設計](../../docs/design/ui/experiment_admin/03_progress_monitoring/ui_progress_monitoring.md)
- [作業進捗詳細ダイアログ設計](../../docs/design/ui/experiment_admin/03_progress_monitoring/ui_work_progress_detail_dialog.md)
- [参考実装（4-6）](../../tests/e2e/steps/4_experiment_admin/4-6_progress_monitoring.ts)
