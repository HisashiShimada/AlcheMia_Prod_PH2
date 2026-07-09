# タスク計画書: チーム編集ダイアログに代表者編集項目を追加

## メタデータ
- **作成日時**: 2026-07-06 09:56
- **タスクID**: チーム編集ダイアログ代表者追加
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
実験管理者メニューのチーム編集ダイアログ（TeamEditDialog）に、
チームの代表者を変更できるプルダウンを追加する。
初期値はチームの現在の代表者を表示する。

## 実装ステップ
- [x] 調査完了
- [ ] namespace.ts: Team型・TeamEditDialogProps型・onSavedコールバック型を更新
- [ ] TeamEditDialog.tsx: 代表者プルダウンを追加・保存処理に代表者更新APIを追加
- [ ] TeamManagementPanel.tsx: 代表者情報を渡す・onSavedで代表者更新を反映

## 変更ファイル
1. `frontend/src/types/namespace.ts` - 型定義更新
2. `frontend/src/components/namespace/TeamEditDialog.tsx` - 代表者プルダウン追加
3. `frontend/src/components/namespace/TeamManagementPanel.tsx` - 代表者情報の受け渡し

## 承認記録
- **承認日時**: 2026-07-06 09:57
