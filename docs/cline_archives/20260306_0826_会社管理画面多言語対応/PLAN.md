# タスク計画書: プロバイダー/システム管理/データ管理 各画面 多言語対応

## メタデータ
- **作成日時**: 2026-03-06 08:26
- **タスクID**: admin-menus-i18n
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要
プロバイダーメニュー・システム管理者メニュー・データ管理者メニューに属する全画面に多言語対応を実施する。
`useLanguage` フックを使用し、ハードコードされた日本語文字列を翻訳キーに置き換える。

## 対象画面一覧

### プロバイダーメニュー
- CorporationManagement.tsx（会社管理）
- OrganizationManagement.tsx（組織管理）
- InformationDownload.tsx（情報ダウンロード）

### システム管理者メニュー
- SystemOverview.tsx（システム概要）
- UserManagement.tsx（ユーザー管理）
- DepartmentManagement.tsx（部署管理）
- RoleManagement.tsx（ロール管理）
- SessionManagement.tsx（セッション管理）
- OrganizationStatistics.tsx（組織統計情報）

### データ管理者メニュー
- MasterManagement.tsx（マスタ管理）

## 目的と期待される成果
- [x] 全対象コンポーネントの日本語ハードコード文字列を t() に置き換え
- [x] ja.json に全翻訳キーを追加
- [x] en.json に全翻訳キーを追加（英語）

## 実装ステップ
- [x] CorporationManagement.tsx 多言語化
- [x] OrganizationManagement.tsx 多言語化
- [x] InformationDownload.tsx 多言語化
- [x] SystemOverview.tsx 多言語化
- [x] UserManagement.tsx 多言語化
- [x] DepartmentManagement.tsx 多言語化
- [x] RoleManagement.tsx 多言語化
- [x] SessionManagement.tsx 多言語化
- [x] OrganizationStatistics.tsx 多言語化
- [x] MasterManagement.tsx 多言語化
- [x] ja.json に全翻訳キー追加（masterManagement の不足キー補完・organizationStatistics セクション追加）
- [x] en.json に全翻訳キー追加（masterManagement の不足キー補完・organizationStatistics セクション追加）

## 変更ファイル
1. `frontend/src/components/Provider/CorporationManagement.tsx`
2. `frontend/src/components/Provider/OrganizationManagement.tsx`
3. `frontend/src/components/Provider/InformationDownload.tsx`
4. `frontend/src/components/SystemManagement/SystemOverview.tsx`
5. `frontend/src/components/SystemManagement/UserManagement.tsx`
6. `frontend/src/components/SystemManagement/DepartmentManagement.tsx`
7. `frontend/src/components/SystemManagement/RoleManagement.tsx`
8. `frontend/src/components/SystemManagement/SessionManagement.tsx`
9. `frontend/src/components/SystemManagement/OrganizationStatistics.tsx`
10. `frontend/src/components/DataManagement/MasterManagement.tsx`
11. `frontend/src/locales/ja.json`
12. `frontend/src/locales/en.json`

## 承認記録
- **計画書提示日時**: 2026-03-06 08:26
- **承認日時**: 2026-03-06 08:26

## 実施記録
### 実施日時
開始: 2026-03-06 08:26
完了: 2026-03-06 09:44

### 最終的な成果物
- [x] 全10画面コンポーネントの多言語化完了
- [x] ja.json / en.json への全翻訳キー追加完了

### 主な対応内容
- 各コンポーネントに `useLanguage` フックを追加し `t()` 関数をインポート
- ハードコードされた日本語ラベル・ボタンテキスト・メッセージを `t('キー')` に置き換え
- 動的な文字列（件数・名前など）は `.replace('{count}', ...)` パターンで対応
- ja.json・en.json に `masterManagement`（不足キー補完）・`organizationStatistics` セクションを追加
