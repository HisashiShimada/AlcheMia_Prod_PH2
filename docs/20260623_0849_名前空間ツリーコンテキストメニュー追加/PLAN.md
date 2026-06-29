# タスク計画書: 名前空間ツリーコンテキストメニュー追加

## メタデータ
- **作成日時**: 2026-06-23 08:49
- **タスクID**: namespace-tree-context-menu
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`UncertaintyManagement.tsx` の左ペイン名前空間ツリーにコンテキストメニュー（右クリックメニュー）を追加する。  
チームノード（companyDepth === 3）を右クリックすると「チームを追加」「編集」が表示される。

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - コンテキストメニュー追加

## 実装ステップ
- [ ] import に PlusOutlined / EditOutlined / useCallback / useEffect を追加
- [ ] TeamAddDialog / TeamEditDialog を import
- [ ] コンテキストメニュー・ダイアログ用 state を追加
- [ ] window mousedown で閉じる useEffect を追加
- [ ] toAntTree を companyDepth 対応にしてチームノードに onContextMenu を付与
- [ ] 左ペイン内にコンテキストメニュー UI を追加
- [ ] TeamAddDialog / TeamEditDialog をレンダリング

## 承認記録
- **承認日時**: 2026-06-23 08:49（ユーザーがACTモードに切り替えにより承認）
