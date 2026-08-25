# タスク計画書: 名前空間多言語化コンポーネント対応

## メタデータ
- **作成日時**: 2026-07-30 08:26
- **タスクID**: 名前空間多言語化コンポーネント対応
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
前タスクで ja.json / en.json に `prefixManagement` セクション（44キー）・`namespaceMain` セクション（18キー）の翻訳キーを追加済み。
本タスクではコンポーネント側のハードコード文字列を `t()` 呼び出しに置換する。

## 変更ファイル
1. `frontend/src/components/namespace/PrefixManagement.tsx` — useLanguage 導入 + 全ハードコード文字列を t() に置換
2. `frontend/src/components/namespace/NamespaceMain.tsx` — 残りのハードコード文字列を t() に置換

## 実装ステップ
- [x] タスク計画書作成
- [x] PrefixManagement.tsx 修正
- [x] NamespaceMain.tsx 修正
