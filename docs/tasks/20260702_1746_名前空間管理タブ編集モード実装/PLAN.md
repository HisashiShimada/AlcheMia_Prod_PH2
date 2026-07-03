# タスク計画書: 名前空間管理タブ編集モード実装

## メタデータ
- **作成日時**: 2026-07-02 17:46
- **タスクID**: namespace-edit-mode
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験管理者メニューのタブ4（現在「テンプレート管理」という誤ったラベル）を「名前空間管理」に修正し、
編集モード選択時の以下の動作を実装する。

1. Prefix一覧・用語管理にグローバル以外のデータのみ表示
2. チェックボックスで選択→共有ボタン→共有先選択ダイアログ→選択階層に共有

## 変更ファイル

1. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - タブ4ラベル「テンプレート管理」→「名前空間管理」に修正
2. `frontend/src/components/namespace/PrefixManagement.tsx` - 編集モード時グローバル除外・scopeNodes内部計算・ShareScopeModalに渡す

## 実装ステップ

- [x] タスク計画書作成
- [ ] ExperimentAdminMenu: タブ4ラベル・コメントを「名前空間管理」に修正
- [ ] PrefixManagement: viewOnly=false時のグローバル除外（baseRows をviewOnly連動で動的計算）
- [ ] PrefixManagement: company配下のscopeNodesを内部計算
- [ ] PrefixManagement: ShareScopeModal に shareScopeNodes を渡す

## 承認記録
- **承認日時**: 2026-07-02 17:46
