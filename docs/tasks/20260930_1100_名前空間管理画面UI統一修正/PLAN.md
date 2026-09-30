# タスク計画書: 名前空間管理画面UI統一修正

## メタデータ
- **作成日時**: 2026-09-30 11:00
- **タスクID**: 名前空間管理画面UI統一修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

実験管理者メニュー > 名前空間管理タブ（UncertaintyManagement.tsx）の UI 統一性の問題を修正する。

## 修正対象と原因

### 1. タブ名の不統一
- **問題**: 「Prefix管理（管理）」「用語管理（管理）」「不確かさ基準一覧（一覧）」で末尾語が不統一
- **原因**: `frontend/src/locales/ja.json` の `uncertainty.management.tabCriteria` が `"不確かさ基準一覧"` で他の「管理」と不一致
- **修正**: `"不確かさ基準一覧"` → `"不確かさ基準管理"` に統一

### 2. テーブル1列目だけ背景色がついている
- **問題**: 用語管理の Prefix 列、不確かさ基準一覧の基準名列のみ背景グレー
- **原因**: Ant Design Table の `defaultSortOrder: 'ascend'` 設定により、初期ソート対象列のセルに自動的にグレー背景が適用される仕様（意図的なデザインではなく副作用）
- **修正**: 両テーブルの該当列から `defaultSortOrder: 'ascend'` を削除

### 3. フィルター・検索窓サイズ不統一
- **問題**: 不確かさ基準一覧タブのフィルター群だけ `size="small"` で他タブより小さい
- **原因**: `UncertaintyManagement.tsx` のツールバー内 Select/Input に `size="small"` を明示指定
- **修正**: `size="small"` を削除してデフォルト（middle）に統一

### 4. インポート・エクスポートボタン表記不統一
- **問題**: Prefix管理・用語管理は「CSVインポート」「CSVエクスポート」（アイコンなし）、不確かさ基準管理は「インポート」「エクスポート」（アイコンあり）
- **原因**: 各コンポーネントで個別実装された際にスタイルが揃えられなかった
- **修正**: 全タブで「インポート」「エクスポート」+ `ImportOutlined`/`ExportOutlined` アイコン付きに統一

## 目的と期待される成果
- [x] 3タブのタブ名語尾を「〇〇管理」に統一
- [x] 全テーブルの1列目背景色グレーを除去
- [x] 全タブのフィルター・検索窓サイズを統一（middle）
- [x] 全タブのインポート・エクスポートボタンを統一

## 変更ファイル
1. `frontend/src/locales/ja.json` - タブ名・ボタン表記変更
2. `frontend/src/locales/en.json` - 同上（英語版）
3. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - フィルターサイズ統一
4. `frontend/src/components/namespace/NamespaceMain.tsx` - defaultSortOrder削除、アイコン追加
5. `frontend/src/components/namespace/PrefixManagement.tsx` - アイコン追加
6. `frontend/src/components/uncertainty/UncertaintyListTable.tsx` - defaultSortOrder削除

## 実装ステップ
- [x] PLAN.md 作成
- [x] ja.json 修正（タブ名・ボタン表記）
- [x] en.json 修正
- [x] UncertaintyListTable.tsx 修正（defaultSortOrder削除）
- [x] NamespaceMain.tsx 修正（defaultSortOrder削除・アイコン追加）
- [x] PrefixManagement.tsx 修正（アイコン追加）
- [x] UncertaintyManagement.tsx 修正（サイズ統一）
- [x] ビルド確認（TSエラー 0件）

## リスク
| リスク | 対策 |
|--------|------|
| defaultSortOrder削除で初期ソート順変化 | API返却順での表示に変わるが機能影響なし |
| i18nキー変更が他画面に影響 | 対象キーは当該コンポーネントのみで使用（事前確認済み） |

## 承認記録
- **計画書提示日時**: 2026-09-30 11:00
- **承認日時**: 2026-09-30 11:12
