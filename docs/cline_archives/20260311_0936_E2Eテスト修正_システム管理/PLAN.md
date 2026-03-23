# タスク計画書: E2Eテスト修正（システム管理機能 41件失敗対応）

## メタデータ
- **作成日時**: 2026-03-11 09:36
- **タスクID**: e2e-fix-system-management
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要
`2_system_management.ts` のE2Eテスト41件失敗を対応する。
優先度「高」「中」の対応を実施。

## 調査結果

### カテゴリA: DBスキーマ不一致
- `login_history` テーブルの成否カラムは `login_sf`（DDL確認済）  
  ステップ定義では `is_success` を使っているため修正が必要

- `organization.contract_users` は存在する（DDL確認済） → 問題なし

### カテゴリC: ページネーション問題
- `UserManagement.tsx` / `DepartmentManagement.tsx` / `RoleManagement.tsx` は pageSize=20 のページネーション付き
- ステップ定義で `table tbody tr` の行数を数えると1ページ分しかカウントされない
- 修正方針：Ant Designの pagination total 表示テキスト（`全 N 件`）からDBカウントと比較する

### カテゴリC: セッションGivenステップ
- `テスト用セッションが存在すること` が空実装
- 修正方針：APIで別ユーザーとしてログインしてセッションを生成する

### カテゴリC: 「非アクティブ」ボタン取得 XPath
- `addBtn.locator('xpath=ancestor::div[1]')` でボタン行コンテナを探すのが不安定
- 修正方針：`page.locator('button').filter({ hasText: '非アクティブ' }).first()` に変更

### カテゴリD: CSVフィクスチャ
- 全ファイル既存確認済み（users_valid.csv, users_dup.csv, departments_valid.csv, departments_dup.csv, roles_valid.csv）
- 対応不要

## 実装ステップ

- [x] コード調査
- [ ] PLAN.md作成
- [ ] 修正1: login_sf カラム名修正（login_history クエリ）
- [ ] 修正2: ページネーション問題 → pagination total テキストから件数取得
- [ ] 修正3: セッションGivenステップに別ユーザーログイン実装
- [ ] 修正4: 「非アクティブ」ボタン取得ロジック修正

## 変更ファイル
1. `tests/e2e/steps/system_management/2_system_management.ts` - 全修正を実施

## 承認記録
- **承認日時**: 2026-03-11 09:39
