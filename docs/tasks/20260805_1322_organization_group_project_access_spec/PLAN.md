# タスク計画書: organization_group によるプロジェクト閲覧・編集仕様のまとめとテストデータ作成

## メタデータ
- **作成日時**: 2026-08-05 13:22
- **タスクID**: organization_group_project_access_spec
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

organization_group によるプロジェクトの閲覧・編集権限の現状仕様を調査し、
仕様ドキュメントとして恒久的にまとめる。また、そのドキュメントをもとに
動作確認用のテストデータ（SQL）を作成する。

## 目的と期待される成果

- [x] organization_group テーブル定義・仕様の調査
- [x] projectService.list() の閲覧・編集ロジック調査
- [x] findAllWithDetails.sql の isEditable 算出ロジック調査
- [x] 各 API エンドポイントの権限チェック実装状況調査
- [x] フロントエンド反映箇所の調査
- [ ] 仕様ドキュメント作成: `docs/design/spec/organization_group_project_access.md`
- [ ] 動作確認用テストデータ SQL 作成: `backend/sql/test_data_organization_group_access.sql`

## 実装ステップ

### Phase 1: 仕様ドキュメント作成
- [x] ソースコード調査（完了）
- [ ] `docs/design/spec/organization_group_project_access.md` を作成

### Phase 2: テストデータ SQL 作成
- [ ] `backend/sql/test_data_organization_group_access.sql` を作成
- [ ] テスト検証パターンの網羅確認

## 変更・新規作成ファイル
1. `docs/design/spec/organization_group_project_access.md` - 仕様ドキュメント（新規）
2. `backend/sql/test_data_organization_group_access.sql` - テストデータ SQL（新規）

## 承認記録
- **計画書提示日時**: 2026-08-05 13:22
- **承認日時**: 2026-08-05 13:22
