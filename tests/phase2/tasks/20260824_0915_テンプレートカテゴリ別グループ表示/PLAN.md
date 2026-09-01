# タスク計画書: テンプレートカテゴリ別グループ表示

## メタデータ
- **作成日時**: 2026-08-24 09:15
- **タスクID**: テンプレートカテゴリ別グループ表示
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
実験記録タブ内（WorkRecordPanel）の左Sider テンプレートリストで、現在フラットなTableで表示されているテンプレートを、Materials / Conditions / Results カテゴリ別にグループ分けして表示する。クリックされたテンプレートのpropertyやcontentsを右Contentエリアに表示する（右側は既存実装済み）。

## 目的と期待される成果
- [ ] 左Siderのテンプレートリストがカテゴリ別グループ表示になる
- [ ] 画像例のように「Condition-Mixing（3項目）[Conditions][IN]」のカード形式で表示
- [ ] クリックで選択され、右Contentにpropertyが表示される

## 実装ステップ
- [ ] PlanBコンポーネント内に `categorizedTemplates` useMemoを追加
- [ ] 左SiderのTableをカテゴリ別グループリストに置き換え
- [ ] 計画書作成後に実装

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - PlanB左Sider テンプレート表示部分

## 承認記録
- **承認日時**: 2026-08-24 09:15
