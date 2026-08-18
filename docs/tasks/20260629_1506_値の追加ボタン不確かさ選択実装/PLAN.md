# タスク計画書: 値の追加ボタン - 不確かさ基準選択＋値入力UIの実装

## メタデータ
- **作成日時**: 2026-06-29 15:06
- **タスクID**: values-add-button-uncertainty
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
実験作業者メニューの実験記録タブ内のPropertyCard の「＋ 値の追加」ボタン押下時に、
定量評価の不確かさ基準名をプルダウンで選択し、右側のテキストで値を入力できるUIを実装する。

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - PropertyCard に追加値UIを実装

## 実装ステップ
- [ ] タスク計画書作成
- [ ] WorkRecordPanel.tsx の PropertyCard コンポーネントに AddedValue 型定義を追加
- [ ] uncertainty.json から quantitative & active な選択肢を生成
- [ ] PropertyCard に addedValues state を追加
- [ ] ＋値の追加ボタンで行追加（Select + Input + 削除ボタン）UIを実装
- [ ] 動作確認

## 承認記録
- **承認日時**: 2026-06-29 15:06
