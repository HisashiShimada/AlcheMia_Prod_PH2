# タスク計画書: テンプレート一覧名称修正（MAIMLテンプレート名/ID表示）

## メタデータ
- **作成日時**: 2026-04-30 09:27
- **タスクID**: テンプレート一覧名称修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

実験データ記録ダイアログ内のテンプレート一覧において、現状「材料テンプレート」「条件テンプレート」「結果テンプレート」という固定文字列が表示されている。これをMAIMLファイルに記載されている各テンプレートの名前（`<name>`タグ）を優先表示し、名前が存在しない場合はテンプレートIDを表示するよう修正する。これにより「テンプレート名で検索」が機能するようになる。

## 目的と期待される成果

- [ ] テンプレート一覧にMAIMLファイル内の `<name>` タグの値が表示される
- [ ] `<name>` タグが存在しない場合はテンプレートIDが表示される
- [ ] テンプレート名検索が正常に機能する

## 実装ステップ

### Phase 1: バックエンド修正
- [ ] `PropertySet` インターフェースに `templateName?: string | null` フィールドを追加
- [ ] `buildFallbackTemplates()` でフォールバック時に `templateName` をセット
- [ ] DB実績データ取得時（8-a）にも `templateName` をセット

### Phase 2: フロントエンド修正
- [ ] `TemplateDataItem` インターフェースに `templateName?: string | null` フィールドを追加
- [ ] `DataRecordDialog.tsx` のテンプレート名生成ロジックを修正（templateName優先、なければtemplateId）

## 変更ファイル

1. `backend/src/repositories/templateDataRepository.ts` - `PropertySet` に `templateName` フィールド追加
2. `backend/src/services/experimentDataService.ts` - フォールバック・DB実績時に `templateName` 設定
3. `frontend/src/types/api.ts` - `TemplateDataItem` に `templateName` フィールド追加
4. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - テンプレート名表示ロジック修正

## 技術詳細

### データフロー
```
MAIMLファイル
  └── Template.name (例: "material03")
       ↓
buildFallbackTemplates()
  └── propertySet.templateName = template.name
       ↓
TemplateDataItem.data.templateName
       ↓
convertTemplateDataItemsToTemplates()
  └── item.data.templateName → Template.name (表示用)
       ↓
DataRecordDialog テンプレート一覧
  └── template.name に templateName または templateId が表示される
```

### 表示ロジック
- `templateName` が存在しかつ空文字でない → `templateName` を表示
- それ以外 → `templateId` を表示（例: `MTmaterial-1764899487787`）

### 後方互換性
- 既存のDB保存済みデータは `templateName` フィールドが `null` のため、`templateId` で表示される
- DBスキーマ変更不要（`property_set` JSONB カラムに追加フィールドとして格納）

## 承認記録
- **計画書提示日時**: 2026-04-30 09:27
- **承認日時**: 2026-04-30 09:27
- **承認者コメント**: 承認済み
