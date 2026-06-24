# タスク計画書: 不確かさ記録タブ追加（実験作業者メニュー）

## メタデータ
- **作成日時**: 2026-06-15 15:31
- **タスクID**: 不確かさ記録タブ追加_実験作業者
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
実験作業者メニュー（ExperimentWorkerMenu）内の「進捗確認」タブの右隣に「不確かさ記録」タブを追加する。

## 目的と期待される成果
- [ ] 実験作業者メニューに「不確かさ記録（key: '5'）」タブが表示される
- [ ] タブ内容として既存の `UncertaintyManagement` コンポーネントを表示する
- [ ] i18n（ja/en）対応済みのタブラベルを使用する

## 実装ステップ
- [ ] タスク計画書作成
- [ ] `ExperimentWorkerMenu.tsx` に不確かさ記録タブを追加
- [ ] `ja.json` に翻訳キー追加
- [ ] `en.json` に翻訳キー追加

## 変更ファイル
1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - UncertaintyManagementインポート＋tabItems追加
2. `frontend/src/locales/ja.json` - 翻訳キー追加
3. `frontend/src/locales/en.json` - 翻訳キー追加

## 承認記録
- **計画書提示日時**: 2026-06-15 15:31
- **承認日時**: 2026-06-15 15:31
