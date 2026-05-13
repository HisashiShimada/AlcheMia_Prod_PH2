# タスク計画書: content属性 axis/size のマスタ対応（手入力許可）

## メタデータ
- **作成日時**: 2026-04-09 14:32
- **タスクID**: 20260409_1432_content_axis_size_master対応
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

前タスク（NestedPropertyEditor_attribute_master対応 / MAIML編集属性制限対応）の追加対応。  
content 要素の属性 `axis` / `size` について、属性値の入力 UI をマスタ提案 + 手入力許可の AutoComplete に変更する。

## 目的と期待される成果

- [ ] axis/size 属性の値入力欄を「マスタからの提案 + 手入力可能な AutoComplete」に変更
- [ ] attribute_master に axis/size のレコードがある場合 → 候補値をプルダウン表示しつつ自由入力も可
- [ ] attribute_master に axis/size のレコードがない場合 → 自由テキスト入力のみ（エラーにしない）
- [ ] units/formatString/scaleFactor とは異なり「マスタ必須」ではない

## 対象ファイル

`frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` の属性追加モーダル内の値入力ロジックのみ変更。

## 実装ステップ

- [ ] `OPTIONAL_MASTER_ATTRIBUTES` 定数を追加（`axis` / `size`）
- [ ] `AutoComplete` を antd インポートに追加
- [ ] 属性値入力分岐に `OPTIONAL_MASTER_ATTRIBUTES` ブランチを追加（masterAttributeValues チェックより前）
  - masterAttributeValues がある場合 → options に候補値を表示した AutoComplete
  - masterAttributeValues が空の場合 → プレーン Input（既存の fallback）
- [ ] OK ボタン disabled 条件から axis/size を除外（REQUIRED_MASTER_ATTRIBUTES には含まれないため変更不要）

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | OPTIONAL_MASTER_ATTRIBUTES 定数追加、AutoComplete import 追加、値入力分岐追加 |

## 現状の値入力分岐（変更前）

```
属性名選択後の値入力欄:
1. xsi:type → MaiML型 Select
2. masterAttributeValues.length > 0 → 属性値 Select（マスタ必須）
3. REQUIRED_MASTER_ATTRIBUTES.has(name) → エラー表示（保存不可）
4. else (key/axis/size/id/ref) → テキスト Input
```

## 変更後の値入力分岐

```
属性名選択後の値入力欄:
1. xsi:type → MaiML型 Select（変更なし）
2. OPTIONAL_MASTER_ATTRIBUTES.has(name) → AutoComplete（マスタ候補 + 手入力可）← 新規追加
3. masterAttributeValues.length > 0 → 属性値 Select（マスタ必須）（変更なし）
4. REQUIRED_MASTER_ATTRIBUTES.has(name) → エラー表示（変更なし）
5. else → テキスト Input（変更なし）
```

## リスク

| リスク | 対策 |
|--------|------|
| AutoComplete の value/onChange 型不一致 | antd の AutoComplete は string 型で統一 |
| axis/size がマスタに登録されていない場合に UI が壊れる | 空 options でも動作する AutoComplete を使用 |

## 承認記録
- **計画書提示日時**: 2026-04-09 14:32
