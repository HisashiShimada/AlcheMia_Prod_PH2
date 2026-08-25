# タスク計画書: 名前空間設計書・実装差異修正

## メタデータ
- **作成日時**: 2026-07-07 14:54
- **タスクID**: namespace-design-doc-sync
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
名前空間関連のUI設計書と実装コードの差異を調査した結果、8点の差異が発見された。
設計書を実装に合わせて更新する。

## 目的と期待される成果
- [ ] `ui_namespace_main.md` を実装に合わせて更新（差異 #1, #5, #6, #7）
- [ ] `ui_namespace_add_dialog.md` を実装に合わせて更新（差異 #2, #3, #4, #8）

## 差異一覧

| # | 差異内容 | 対象ファイル |
|---|---------|-------------|
| 1 | 「共有する」ボタン：表示条件がPersonal限定→チェック1件以上で表示に変更 | ui_namespace_main.md |
| 2 | TeamEditDialog タイトル：「編集」→「チームを編集」 | ui_namespace_add_dialog.md |
| 3 | TeamEditDialog：チーム名編集可能化＋代表者フィールド追加 | ui_namespace_add_dialog.md |
| 4 | TeamAddDialog：追加先フィールドが読み取り専用Tag→プルダウン選択 | ui_namespace_add_dialog.md |
| 5 | TeamManagementPanel：メンバーテーブルの削除ボタン列が未実装 | ui_namespace_main.md |
| 6 | TeamManagementPanel：編集ボタン位置がメンバーセクション右端→チーム名右隣 | ui_namespace_main.md |
| 7 | TeamManagementPanel：右ペインに「所属先」追加・「表示名」欠落 | ui_namespace_main.md |
| 8 | NamespaceAddDialog URIバリデーション：`http://` も許容 | ui_namespace_add_dialog.md |

## 変更するファイル
1. `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_main.md`
2. `docs/design/ui/experiment_admin/04_namespace_management/ui_namespace_add_dialog.md`

## 承認記録
- **承認日時**: 2026-07-07 14:58
