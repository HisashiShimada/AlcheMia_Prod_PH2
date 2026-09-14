# タスク計画書: TemplateEditorDialog キー選択表示統一

## メタデータ
- **作成日時**: 2026-09-09 00:00
- **タスクID**: 20260909_0000
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`TemplateEditorDialog` 側のプロパティのキー選択部品と `ExperimentPlanDialog` のキー選択部品で、
プルダウンの選択肢表示の見え方が異なる。
`ExperimentPlanDialog` の方が見える情報が多いのでそちらの表示形式に合わせる。

## 問題の詳細

### 現状（TemplateEditorDialog 側）

#### ① NestedPropertyEditor のキー選択 Select
- `termKeyOptions` は `Array<{ value: string; label: string }>` 型で、label は `"表示名（prefix:localName）"` の1行テキスト
- `<Select options={termKeyOptions} />` のフラット方式で描画
- **type・unitHint の情報が表示されない**

#### ② TemplateEditorDialog プロパティ追加モーダル
- `<Option>` カスタムJSX で displayName（太字）+ qname（グレー小字）の2行
- **type・unitHint の Tag が表示されない**

### 目標（ExperimentPlanDialog / TemplateInputPanel 側）
- displayName（太字）
- qname（グレー小字）+ type Tag（青）+ unitHint Tag（緑）
- `<Option>` カスタムJSX で描画

## 実装ステップ

- [x] 調査・計画書作成
- [x] Step 1: `NestedPropertyEditorProps` の `termKeyOptions` 型を拡張（`type?`, `unitHint?` 追加）
- [x] Step 2: `TemplateEditorDialog.tsx` の `termKeyOptions` useMemo を更新（type / unitHint を含める）
- [x] Step 3: `NestedPropertyEditor.tsx` の key 属性 Select 描画を `<Option>` カスタムJSX 方式に変更
- [x] Step 4: `TemplateEditorDialog.tsx` のプロパティ追加モーダルの `<Option>` に type / unitHint Tag を追加
- [x] 動作確認（型エラーなし：`npx tsc --noEmit` でエラー 0 件確認済み）

## 変更ファイル

1. `frontend/src/components/editorv2/NestedPropertyEditor.tsx` — termKeyOptions 型拡張 + Select 描画変更
2. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` — termKeyOptions useMemo 更新 + プロパティ追加モーダル Option 更新

## リスク

| リスク | 対策 |
|--------|------|
| termKeyOptions 型変更による型エラー | optional フィールドの追加のみで後方互換を維持 |
| レイアウト崩れ | ExperimentPlanDialog で実証済みのスタイルを踏襲 |

## 承認記録
- **計画書提示日時**: 2026-09-09 00:00
- **承認日時**: 2026-09-09（ユーザー承認済み）
