# タスク計画書: 組織統計情報タブ削除

## メタデータ
- **作成日時**: 2026-02-26 16:00
- **タスクID**: 組織統計情報タブ削除
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
システム管理者メニューから「組織統計情報」タブを削除する。
関連するコンポーネントファイル・モックデータファイル・翻訳キーを他の画面に影響のない形で削除する。

## 目的と期待される成果
- [ ] システム管理者メニューから「組織統計情報」タブが消える
- [ ] 関連ファイルが削除される
- [ ] 他の画面・機能に影響がない

## 実装ステップ
- [ ] タスク計画書の作成
- [ ] SystemAdminMenu.tsx の修正（タブ削除・番号詰め直し）
- [ ] OrganizationStatistics.tsx ファイルの削除
- [ ] organization-statistics.json ファイルの削除
- [ ] ja.json から organizationStatistics キーの削除
- [ ] en.json から organizationStatistics キーの削除

## 変更ファイル
1. `frontend/src/components/menus/SystemAdminMenu.tsx` - タブ2削除・番号詰め直し・import削除
2. `frontend/src/components/SystemManagement/OrganizationStatistics.tsx` - ファイル削除
3. `frontend/mock/data/organization-statistics.json` - ファイル削除
4. `frontend/src/locales/ja.json` - organizationStatistics キー削除
5. `frontend/src/locales/en.json` - organizationStatistics キー削除

## 承認記録
- **計画書提示日時**: 2026-02-26 16:00
- **承認日時**: 2026-02-26 16:01
