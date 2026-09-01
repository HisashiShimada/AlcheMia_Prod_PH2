# タスク計画書: templateDataProperty DB保存時空補完修正

## メタデータ
- **作成日時**: 2026-08-24 15:30
- **タスクID**: templateDataProperty_DB保存時空補完修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブ内のTemplateに紐づくpropertyが表示されない問題を修正する。

対象プロジェクト: project_s4mRmPp9e_98 / method_test_ito_d4076d3d / taskNo=1

## 原因

`experimentDataService.ts` の `getTemplateData()` 関数（322〜353行）において、
`template_data` テーブルにDBレコード（`place_id`行）が存在する場合は必ず `property_set.properties` を使用する実装になっている。

しかし、**以下の状況で `property_set.properties` が空になる**ことがある：
1. タスク登録時の旧バージョンのバグで、`properties` が空で INSERT された
2. `property_set` 自体は存在するが、`properties` フィールドが `[]` または `null`

結果として：
- `enrichedProperties = (ps?.properties ?? []).map(...)` → 空配列
- `data.properties = []` となる
- フロントエンド `WorkRecordPanel.tsx` の `.filter((tpl) => tpl.properties.length > 0)` でフィルタアウト
- テンプレートカードが0件になり何も表示されない

一方、フォールバックパス（DBレコードなし）では `buildFallbackTemplates()` が MAIML定義から正しくプロパティを読み込むため表示される。

## 修正方針

DBレコードが存在しても `property_set.properties` が空（または件数がMAIML定義より少ない）場合、
**MAIMLフォールバック定義の properties を補完として使用する**。

具体的には、`experimentDataService.ts` の「DB実績データパス」（8-a）を以下のように変更：
- `enrichedProperties` が空の場合、`fallbackAll` から該当 `placeId` のエントリを取得して properties を補完
- これにより、DBに実績レコードはあるが properties が空という状態でもプロパティが表示される

## 変更ファイル

1. `backend/src/services/experimentDataService.ts` - DB実績パスのproperties空補完ロジック追加

## テスト確認

- project_s4mRmPp9e_98 / method_test_ito_d4076d3d / taskNo=1 のプロパティが表示されること
- DBに実績値がある場合はその値が保持されること

## 承認記録
- **計画書提示日時**: 2026-08-24 15:30
