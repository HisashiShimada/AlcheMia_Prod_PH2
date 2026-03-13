# タスク計画書: 4-1 プロジェクト作成・ファイル操作 E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 16:43
- **タスクID**: e2e-4-1-project-create-file-operation
- **優先度**: 中
- **推定工数**: 4時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-1: プロジェクト作成・ファイル操作」（20件）に対応する Playwright + playwright-bdd の E2E テストを作成する。

- **手動テスト項目**: 4-1 には手動テスト対象なし（全件 Playwright 自動）
- **featureファイル**: 20件すべてのシナリオを記述
- **stepsファイル**: 20件すべてのステップ実装

---

## 目的と期待される成果

- [ ] `tests/e2e/features/4_experiment_admin/4-1_project_create_file_operation.feature` の作成（20シナリオ）
- [ ] `tests/e2e/steps/4_experiment_admin/4-1_project_create_file_operation.ts` の作成（ステップ実装）
- [ ] `tests/e2e/steps/4_experiment_admin/common.ts` の作成（ログイン・ナビゲーション共通ステップ）
- [ ] フロントエンドソース 4 ファイルへの `data-testid` 追加

---

## 実装ステップ

### Phase 1: フロントエンドソースへの data-testid 追加

- [ ] `frontend/src/components/project/ProjectManagement.tsx` に data-testid を追加
  - `create-project-button`（新規作成ボタン）
  - `project-download-button`（ZIPダウンロードボタン）
  - `project-reload-button`（リロードボタン）
  - `project-list-item`（プロジェクト一覧の各行）
- [ ] `frontend/src/components/project/CreateProjectModal.tsx` に data-testid を追加
  - `create-project-name-input`（プロジェクト名 Input）
  - `create-project-description-input`（概要 TextArea）
  - `create-project-submit-button`（作成ボタン）
  - `create-project-cancel-button`（キャンセルボタン）
- [ ] `frontend/src/components/project/FileListTable.tsx` に data-testid を追加
  - `file-download-button`（各行のダウンロードボタン）
  - `file-viewer-button`（各行のビューアボタン）
- [ ] `frontend/src/components/project/ProjectDetailModal.tsx` に data-testid を追加
  - `project-detail-open-button`（「プロジェクトを開く」ボタン）
  - `project-detail-close-button`（「閉じる」ボタン）

### Phase 2: common.ts 作成

- [ ] `tests/e2e/steps/4_experiment_admin/common.ts` を作成
  - 実験管理者ログインステップ
  - プロジェクト管理画面遷移ステップ

### Phase 3: featureファイル作成

- [ ] `tests/e2e/features/4_experiment_admin/4-1_project_create_file_operation.feature` を作成
  - 4-1-1: プロジェクト新規作成（正常系）
  - 4-1-2: プロジェクト名未入力バリデーション
  - 4-1-3: プロジェクト名3文字未満バリデーション
  - 4-1-4: プロジェクト名100文字超バリデーション
  - 4-1-5: キャンセルでプロジェクト未作成
  - 4-1-6: 重複エラー（409）
  - 4-1-7: プロジェクト未選択時ZIPダウンロードボタン非活性
  - 4-1-8: プロジェクト選択後ZIPダウンロードボタン活性化
  - 4-1-9: ZIPダウンロード
  - 4-1-10: ファイルダウンロード
  - 4-1-11: ダウンロード中のUI状態（ローディング・他ボタン非活性）
  - 4-1-12: ダウンロード失敗エラー
  - 4-1-13: ビューアダイアログ起動
  - 4-1-14: 複数ビューアダイアログ（上限5個）
  - 4-1-15: 5個超過警告メッセージ
  - 4-1-16: プロジェクト名クリックでProjectDetailModal表示
  - 4-1-17: ProjectDetailModal内のプロジェクト情報表示
  - 4-1-18: 「プロジェクトを開く」ボタンの動作
  - 4-1-19: ProjectDetailModal内FileListTable表示
  - 4-1-20: 「閉じる」ボタンでモーダル閉鎖

### Phase 4: stepsファイル作成

- [ ] `tests/e2e/steps/4_experiment_admin/4-1_project_create_file_operation.ts` を作成
  - Before/After フック実装（テストデータ準備・クリーンアップ）
  - Given/When/Then ステップ実装
  - DB操作ヘルパー関数実装

---

## 変更ファイル

### 新規作成
1. `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN.md` - このタスク計画書
2. `tests/e2e/features/4_experiment_admin/4-1_project_create_file_operation.feature` - featureファイル
3. `tests/e2e/steps/4_experiment_admin/4-1_project_create_file_operation.ts` - stepsファイル
4. `tests/e2e/steps/4_experiment_admin/common.ts` - 共通ステップ

### 修正
1. `frontend/src/components/project/ProjectManagement.tsx` - data-testid 追加
2. `frontend/src/components/project/CreateProjectModal.tsx` - data-testid 追加
3. `frontend/src/components/project/FileListTable.tsx` - data-testid 追加
4. `frontend/src/components/project/ProjectDetailModal.tsx` - data-testid 追加

---

## シナリオ詳細設計

### テストデータ方針

| データ種別 | 用途 | 準備方法 |
|-----------|------|---------|
| テスト用プロジェクト（作成系） | 4-1-1,4-1-5,4-1-6 | After フックで DB DELETE |
| テスト用プロジェクト（操作系） | 4-1-7〜4-1-20 | Before フックで DB UPSERT |
| テスト用ファイルデータ | 4-1-10〜4-1-15,4-1-19 | S3にファイルが存在すること（前提） |
| 重複確認用プロジェクト | 4-1-6 | Before フックで DB UPSERT |

### ORG_ID・ログイン情報

| 項目 | 値 |
|------|-----|
| orgId | `a0718dc5-21f3-44e6-87e9-cc2ae83f3385`（playwright.config.ts の baseURL より） |
| ユーザーID | 実験管理者ユーザー（要確認） |
| パスワード | 要確認 |

### セレクタ方針

- `data-testid` を優先使用（フロントエンドソースに追加）
- Ant Design コンポーネントは `.ant-modal`, `.ant-form-item-explain-error`, `.ant-message-notice-wrapper` 等を使用
- タブ切り替えは `.ant-tabs-tab:has-text("テキスト")`

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| data-testid 追加によるUI崩れ | 低 | 低 | 属性追加のみのため影響なし |
| 4-1-11（ダウンロード中状態）の自動化難易度 | 中 | 中 | APIレスポンスを遅延させる方法を検討、困難な場合は状態確認のみ |
| 4-1-12（ダウンロード失敗）のモック | 中 | 中 | `page.route()` でAPIをモックしてエラーを再現 |
| 4-1-14（5個同時ダイアログ）の操作 | 中 | 中 | 繰り返しビューアボタン押下で実現 |

---

## テスト計画

### 手動確認
- [ ] 各シナリオの実行が完了すること
- [ ] After フックで作成データが削除されること
- [ ] 重複してテストを実行しても安定して動作すること

---

## 承認記録

- **計画書提示日時**: 2026-03-13 16:43
- **承認日時**: 2026-03-13 16:43
- **承認者コメント**: Act mode 移行により承認

---

## 実施記録

### 実施日時
開始: 2026-03-13 16:43  
完了: （未）

### 計画からの変更点
（未）

### 発生した問題と解決方法
（未）
