# タスク計画書: 個人スコープ Namespace URI 注入修正

## メタデータ
- **作成日時**: 2026-08-21 15:29
- **タスクID**: 20260821_1429_個人スコープNamespaceURI注入修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
MAIMLファイルを保存した際、個人スコープの名前空間URIが正規パターン（`https://{org_cd}.Alchemia.co.jp/{login_name}`）ではなく、DBに手動登録された任意の値（例: `https://Alchemia.co.jp`）が注入されている。

## 根本原因
`getOrganizationNamespaces()` は `prefix` テーブルの `uri` カラム値をそのまま注入するが、個人スコープの prefix に保存されている URI は手動登録値であり、正規の個人スコープ URI ではない。

## 修正方針
個人スコープの prefix を取得した後、各エントリの `uri` を `fetchSuggestedUri()` (scopeKey なし = 個人スコープ) で取得した正規 URI で上書きして注入する。

## 変更ファイル
1. `frontend/src/services/namespaceApiService.ts` - 個人スコープ prefix の URI を正規 URI で上書き

## 承認記録
- **承認日時**: 2026-08-21 15:29
