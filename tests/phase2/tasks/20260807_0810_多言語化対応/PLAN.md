# タスク計画書: 名前空間管理コンポーネント多言語化対応

## メタデータ
- **作成日時**: 2026-08-07 08:11
- **タスクID**: 20260807_0810_多言語化対応
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
namespace 配下コンポーネントで使用している t() キーが ja.json / en.json に未定義のため、
多言語化対応が機能していない。全キーを両ファイルに追加する。

## 対象コンポーネントと追加キーグループ
- TeamAddDialog → `teamAddDialog.*`
- TeamEditDialog → `teamEditDialog.*`
- TeamManagementPanel → `teamManagement.*`
- ShareScopeModal → `shareScopeModal.*`
- NamespaceAddDialog → `namespaceAddDialog.*`
- DetailModal → `detailModal.*`
- DuplicateSuggestModal → `duplicateSuggestModal.*`
- ExperimentAdminNav → `experimentAdminNav.*`
- NamespaceMain → `namespaceMain.*`（未定義分）

## 変更ファイル
1. `frontend/src/locales/ja.json` - 未定義キー追加
2. `frontend/src/locales/en.json` - 未定義キー追加

## 承認記録
- **承認日時**: 2026-08-07 08:11
