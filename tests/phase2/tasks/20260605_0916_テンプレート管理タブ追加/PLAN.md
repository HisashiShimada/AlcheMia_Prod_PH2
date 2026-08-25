# タスク計画書: テンプレート管理タブ追加（Uncertainty）

## メタデータ
- **作成日時**: 2026-06-05 09:16
- **タスクID**: uncertainty-tab
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要
実験管理者メニューに「テンプレート管理」タブを追加し、HTMLモックアップ（template_top_mockup.html）をReact/Ant Design TSXコンポーネントに変換する。
ファイル・フォルダ名は「Uncertainty」プレフィックスで統一。

## 目的と期待される成果
- [ ] 実験管理者メニューにタブ4「テンプレート管理」が表示される
- [ ] 左ペイン（スコープツリー）＋右ペイン（テンプレート一覧）の2カラムレイアウトが動作する
- [ ] モックデータ（uncertainty.json）から一覧が表示される
- [ ] 詳細・インポート・エクスポート・新規作成モーダルが動作する

## 実装ステップ

- [x] フロントエンド構造の調査
- [x] 実験管理メニューの既存タブ構造の確認
- [ ] タスク計画書の作成
- [ ] モックデータJSONの作成（frontend/mock/uncertainty.json）
- [ ] TSXコンポーネントの作成（frontend/src/components/uncertainty/）
- [ ] テンプレート管理タブを実験管理メニューに追加（ExperimentAdminMenu.tsx）
- [ ] 翻訳キー追加（ja.json / en.json）

## 変更ファイル

### 新規作成
1. `docs/20260605_0916_テンプレート管理タブ追加/PLAN.md` - 本計画書
2. `frontend/mock/uncertainty.json` - モックデータ
3. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - メイン画面
4. `frontend/src/components/uncertainty/UncertaintyScopeTree.tsx` - スコープツリー
5. `frontend/src/components/uncertainty/UncertaintyListTable.tsx` - 一覧テーブル
6. `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` - 詳細モーダル
7. `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` - 新規作成モーダル
8. `frontend/src/components/uncertainty/UncertaintyImportModal.tsx` - インポートモーダル
9. `frontend/src/components/uncertainty/UncertaintyExportModal.tsx` - エクスポートモーダル

### 修正
1. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - タブ4追加
2. `frontend/src/locales/ja.json` - 翻訳キー追加
3. `frontend/src/locales/en.json` - 翻訳キー追加

## 承認記録
- **計画書提示日時**: 2026-06-05 09:16
- **承認日時**: 2026-06-05 09:16
