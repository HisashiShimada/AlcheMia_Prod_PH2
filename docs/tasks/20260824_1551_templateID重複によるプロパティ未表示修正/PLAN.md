# タスク計画書: templateID重複によるプロパティ未表示修正

## メタデータ
- **作成日時**: 2026-08-24 15:51
- **タスクID**: templateID重複_プロパティ未表示修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブ内のTemplateに紐づくpropertyが表示されない問題を修正する。
`template_data`テーブルの`property_set`カラムにはデータが存在するが、フロントエンドで表示されない。

## 原因

`WorkRecordPanel.tsx` の `buildTransitions` 関数内で、`MockTemplate` の `id` を
`item.data.templateId`（テンプレートID）から生成しているため、同一テンプレートIDを持つ
複数の `placeId` エントリが同一 `id` の `MockTemplate` になり、重複して1件しか表示されない。

APIレスポンス `templates[]` は **placeId ごとに1エントリ**が返るが、複数のplaceが
同じtemplateIdを参照している場合、id衝突によりpropertyが未表示になる。

## 修正内容

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`id` 生成ロジックを `item.data.templateId`（非ユニーク）から
`item.placeId`（ユニーク）ベースに変更する。

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - id生成ロジック1行修正

## テスト計画
- [ ] プロジェクト `project_s4mRmPp9e_98`、メソッド `method_test_ito_d4076d3d`、タスク番号1で実験記録タブを表示し、Templateのpropertyが表示されることを確認

## 承認記録
- **承認日時**: 2026-08-24 15:51（ユーザーAct Mode移行により承認済み）

## 実施記録

### 実施日時
開始: 2026-08-24 16:54
完了: 2026-08-24 16:54

### 変更内容
`frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` の `buildTransitions` 関数内、
`MockTemplate` の `id` 生成ロジックを以下のように修正した。

**修正前（問題のあったコード）:**
```typescript
const builtTemplates: MockTemplate[] = templateDataRes.data.templates
  .map((item) => {
    // ...
    return {
      id: String(item.placeId || (item.data.templateId ?? item.data.template_id ?? `tpl-${row.transitionId}`)),
```

**修正後（修正後のコード）:**
```typescript
const builtTemplates: MockTemplate[] = templateDataRes.data.templates
  .map((item, _tplIdx) => {
    // ...
    return {
      id: String(item.placeId || `tpl-${row.transitionId}-${_tplIdx}`),
```

### 修正の要点
- `item.placeId` が存在する場合はそれをそのまま使用（変更なし）
- `item.placeId` が falsy の場合のフォールバックを `item.data.templateId`（非ユニーク）から
  `tpl-{transitionId}-{インデックス}` に変更し、一意性を保証
- `.map()` コールバックに `_tplIdx` インデックス引数を追加

### 最終的な成果物
- [x] WorkRecordPanel.tsx の id 生成ロジック修正（1行）
- [x] TypeScript コンパイルエラーなし
