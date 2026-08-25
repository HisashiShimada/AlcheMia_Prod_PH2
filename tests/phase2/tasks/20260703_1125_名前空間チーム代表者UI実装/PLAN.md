# タスク計画書: 名前空間管理タブ チーム代表者UIの実装

## メタデータ
- **作成日時**: 2026-07-03 11:25
- **タスクID**: namespace-team-owner-ui
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

実験管理者メニューの名前空間管理タブ内にある「Prefix管理」と「用語管理」を、
チームの代表者（team_owner）としてログインしたユーザーの権限に基づいたUIにする。

## 要件

1. 材料グループとは別のチーム（解析チーム）を追加する
2. Personal ▼ を押下した際に解析チームのメンバーを表示する
3. チームの行を選択したら、選択チーム＋研究開発部＋株式会社サンプルテックの
   Prefix管理と用語管理のデータが見れる
4. スコープが「研究開発部」または「株式会社サンプルテック」の行はグレーアウトする

## 実装ステップ

- [x] タスク計画書作成
- [ ] uncertainty-scope.json: 解析チーム追加 + Personalにメンバー追加
- [ ] department-unit-members.json: rd-analysis メンバー追加
- [ ] NamespaceMain.tsx: ロール切替 + getRelatedPrefixes修正 + グレーアウト
- [ ] PrefixManagement.tsx: flattenPrefixes修正 + グレーアウト

## 変更ファイル

1. `frontend/mock/namespace/uncertainty-scope.json` - 解析チーム・メンバー追加
2. `frontend/mock/namespace/department-unit-members.json` - rd-analysis メンバー追加
3. `frontend/src/components/namespace/NamespaceMain.tsx` - ロール変更・グレーアウト
4. `frontend/src/components/namespace/PrefixManagement.tsx` - グレーアウト

## 承認記録
- **承認日時**: 2026-07-03 11:27
