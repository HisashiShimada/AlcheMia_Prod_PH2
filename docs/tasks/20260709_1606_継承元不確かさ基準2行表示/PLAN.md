# タスク計画書: 継承元不確かさ基準の2行表示実装

## メタデータ
- **作成日時**: 2026-07-09 16:06
- **タスクID**: 継承元不確かさ基準2行表示
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
不確かさ基準追加ダイアログ（UncertaintyCreateModal）および編集ダイアログ（UncertaintyDetailModal）の「継承元不確かさ基準」Selectに以下2点を実装する。
1. 保存時に選択したKeyを `inheritance_uncertainty_key` へ登録（既存実装で対応済みであることを確認）
2. 一覧表示を「上に基準名・下にKey」の2行表示に変更

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` - parentOptions の label 修正 + optionRender/labelRender 追加
2. `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` - 同上

## 実装ステップ
- [x] コード調査完了
- [ ] UncertaintyCreateModal.tsx の継承元 Select を2行表示化
- [ ] UncertaintyDetailModal.tsx の継承元 Select を2行表示化
- [ ] 動作確認

## 承認記録
- **承認日時**: 2026-07-09 16:06
