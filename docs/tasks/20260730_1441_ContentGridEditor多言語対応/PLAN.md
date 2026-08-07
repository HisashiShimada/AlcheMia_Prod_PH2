# タスク計画書: ContentGridEditor 多言語対応

## メタデータ
- **作成日時**: 2026-07-30 14:41
- **タスクID**: ContentGridEditor多言語対応
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
以下3ファイルにハードコードされた日本語文字列を多言語対応（i18n）する。

- `frontend/src/components/common/ContentGridEditor.tsx`
- `frontend/src/hooks/useContentGridEditor.ts`
- `frontend/src/utils/dataGridImporter.ts`

## 対象文字列一覧

### ContentGridEditor.tsx（UIコンポーネント）
| 箇所 | 現在の文字列 |
|------|-------------|
| ラベル | `Content Grid ({rowCount}行 × {colCount}列)` |
| Tooltip | `CSV/XMLファイルをインポート（ドラッグ&ドロップも可）` |
| Tooltip | `グリッドをクリア` |
| DnDヒント | `CSVまたはXMLをドロップ` |
| 列ヘッダー | `Col {ci + 1}` |
| 行追加ボタン | `行を追加` |
| Tooltip | `列を追加` |

### useContentGridEditor.ts（フック）
| 箇所 | 現在の文字列 |
|------|-------------|
| message.error | `CSVまたはXMLファイルを選択してください（.csv / .xml）` |
| message.warning | `インポートできるデータが見つかりませんでした` |
| message.success | `インポート完了: ${result.data.length}行 × ${Math.max(...)}列` |
| message.warning | `他 ${n} 件の警告があります` |
| message.error | `インポートに失敗しました` |

### dataGridImporter.ts（ユーティリティ）
| 箇所 | 現在の文字列 |
|------|-------------|
| cellToNumber 警告 | `行 ${row+1} 列 ${col+1}: "${cell}" は数値に変換できません。0 として扱います。` |
| validateFileSize エラー | `ファイルサイズが上限（${mb} MB）を超えています（${fileMb} MB）` |
| parseXmlToGrid エラー | `XMLのパースに失敗しました: ${e.message}` |
| parseXmlToGrid 警告 | `数値データが見つかりませんでした。XMLの構造を確認してください。` |
| parseCsvToGrid 警告 | `CSV パースエラー（行 ${row}）: ${message}` |

## 実装方針

### Reactコンポーネント・フック（.tsx/.ts）
- `useLanguage()` から `t` 関数を取得して使用
- `useContentGridEditor.ts` は hooks なので `useLanguage()` を使用可能

### ユーティリティ関数（.ts）
- `dataGridImporter.ts` は React 外のピュア関数
- `getTranslation()` を `@/contexts/LanguageContext` からインポートして使用（既存の `formatUtils.ts` などと同じパターン）

### i18nキー設計
新規セクション `contentGridEditor` を `ja.json` / `en.json` に追加。

```
contentGridEditor:
  label              ← "Content Grid ({rows}行 × {cols}列)"
  importTooltip      ← "CSV/XMLファイルをインポート（ドラッグ&ドロップも可）"
  clearTooltip       ← "グリッドをクリア"
  addColTooltip      ← "列を追加"
  dropHint           ← "CSVまたはXMLをドロップ"
  colHeader          ← "Col {n}"
  addRowButton       ← "行を追加"
  importInvalidType  ← "CSVまたはXMLファイルを選択してください（.csv / .xml）"
  importNoData       ← "インポートできるデータが見つかりませんでした"
  importSuccess      ← "インポート完了: {rows}行 × {cols}列"
  importMoreWarnings ← "他 {n} 件の警告があります"
  importFailed       ← "インポートに失敗しました"
  cellNotNumber      ← "行 {row} 列 {col}: \"{value}\" は数値に変換できません。0 として扱います。"
  fileSizeExceeded   ← "ファイルサイズが上限（{maxMb} MB）を超えています（{fileMb} MB）"
  xmlParseFailed     ← "XMLのパースに失敗しました: {message}"
  xmlNoData          ← "数値データが見つかりませんでした。XMLの構造を確認してください。"
  csvParseError      ← "CSV パースエラー（行 {row}）: {message}"
```

## 変更ファイル
1. `frontend/src/locales/ja.json` - `contentGridEditor` セクション追加
2. `frontend/src/locales/en.json` - `contentGridEditor` セクション追加
3. `frontend/src/components/common/ContentGridEditor.tsx` - `useLanguage()` 導入・文字列置換
4. `frontend/src/hooks/useContentGridEditor.ts` - `useLanguage()` 導入・文字列置換
5. `frontend/src/utils/dataGridImporter.ts` - `getTranslation()` 導入・文字列置換

## 承認記録
- **計画書提示日時**: 2026-07-30 14:41
