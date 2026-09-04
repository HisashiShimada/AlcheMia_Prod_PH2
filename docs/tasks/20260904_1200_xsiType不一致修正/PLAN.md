# タスク計画書: xsiType不一致修正（integerType vs intType）

## メタデータ
- **作成日時**: 2026-09-04 12:00
- **タスクID**: 20260904_1200_xsiType不一致修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

ペトリネット編集画面でテンプレートを作成する際、Namespaceのtype_hintから`integerType`が表示されセット
されるが、これはMAIML仕様の正式なxsi:type（`intType`）ではない。その結果：

1. 指示詳細ダイアログでは`stringType`と表示される（バックエンドが`integerType`を未知の型として`stringType`にフォールバック）
2. ペトリネット編集画面に戻るとunits枠が消える（フロントエンドのmaimlTypeConverterが`integerType`を数値型と認識せずunitsを保持しない）

## 根本原因

```
[DB: namespace_term.xsi_type] = "integerType"  ← Namespace管理UIのtype_hint値
  ↓ SQL: COALESCE(t.xsi_type, 'stringType') AS type
[NamespaceTermRow.type] = "integerType"
  ↓ TemplateEditorDialog（666行目）: matchedTerm.type → 'xsi:type'属性
[MAIML Property: xsi:type="integerType"]  ← 保存（MAIMLの正式型ではない）
  ↓ バックエンド maimlTypeConverter.ts（536行目）
  // const xsiType = (xmlProp._attributes?.['xsi:type'] || 'stringType') as PropertyType;
  // → integerType は既知の型に一致しない → デフォルト stringType にフォールバック
[convertTemplate: xsiType="stringType"]
  ↓ 指示詳細ダイアログ（898行目: {field.xsiType ?? field.type}）
[表示: "stringType"] ← 事象②

  ↓ フロントエンド maimlTypeConverter.ts（1171-1175行目）
  // integerType は数値型リストに含まれていない
  // → 末尾の未指定ブランチ（units保持なし）で処理される
[TemplateEditorDialog再表示: units属性なし] ← 事象③
```

## 修正方針

**新規保存時（根本修正）**: TemplateEditorDialogでNamespace type_hintをMAIML正式xsi:typeに変換するマッピングを追加

**既存データ対応（フォールバック）**: フロントエンド・バックエンドのmaimlTypeConverterで`integerType`を`intType`として処理

## 実装ステップ

- [ ] Step 1: `frontend/src/components/editorv2/TemplateEditorDialog.tsx` 修正
  - `handleAddProperty`内（666行目付近）でtype_hint→MAIML xsi:typeの変換マッピングを追加
  - `integerType` → `intType` など

- [ ] Step 2: `frontend/src/utils/maimlTypeConverter.ts` 修正
  - `convertXmlJsProperty`関数に`integerType`を`intType`として処理するフォールバックを追加
  - 既に`integerType`で保存されている既存データへの対応

- [ ] Step 3: `backend/src/utils/maimlTypeConverter.ts` 修正
  - `convertXmlJsProperty`関数に`integerType`を`intType`として処理するフォールバックを追加

- [ ] Step 4: `backend/src/services/experimentInstructionService.ts` 修正
  - `detectFieldType`関数に`integerType`を数値型として認識させる処理を追加

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | type_hint→MAIML xsi:type変換マッピング追加 |
| 2 | `frontend/src/utils/maimlTypeConverter.ts` | integerTypeをintTypeとして処理 |
| 3 | `backend/src/utils/maimlTypeConverter.ts` | integerTypeをintTypeとして処理 |
| 4 | `backend/src/services/experimentInstructionService.ts` | detectFieldTypeにintegerType追加 |

## 制約

- UIの変更は行わない（NamespaceMainのtype_hint表示はそのまま）
- MaiMLファイルへの保存は実験記録タブ内では行わない
- 関連しないファイルのリファクタリングは行わない

## リスク

| リスク | 対策 |
|--------|------|
| 他のtype_hintも同様の問題がある可能性 | integerType以外のマッピングも確認して追加 |
| 既存データ（integerType保存済み）の処理 | maimlTypeConverterにフォールバック追加で対応 |

## テスト計画

- [ ] ペトリネット編集でintegerTypeのキーを持つプロパティを保存 → intTypeとして保存されること
- [ ] 指示詳細ダイアログでintType（数値型）として表示されること
- [ ] ペトリネット編集に戻った際にunitsが保持されること
- [ ] 既存データ（integerType保存済み）も正常に表示されること

## 承認記録
- **計画書提示日時**: 2026-09-04 12:00
- **承認日時**: 2026-09-04 12:30（Actモード切り替えにより承認）

## 実施記録

### 実施日時
開始: 2026-09-04 12:30
完了: 2026-09-04 12:45

### 最終的な成果物
- [x] Step 1: `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
  - `NAMESPACE_TYPE_HINT_TO_XSI_TYPE`定数を追加（integerType → intType）
  - `handleAddProperty`で`normalizedXsiType`を使用するよう変更
- [x] Step 2: `frontend/src/utils/maimlTypeConverter.ts`
  - `convertXmlJsProperty`内に`LEGACY_XSI_TYPE_MAP`を追加
  - `integerType`を`intType`に正規化してから型判定を行うよう変更
- [x] Step 3: `backend/src/utils/maimlTypeConverter.ts`
  - `convertXmlJsProperty`内に`LEGACY_XSI_TYPE_MAP`を追加
  - `integerType`を`intType`に正規化してから型判定を行うよう変更
- [x] Step 4: `backend/src/services/experimentInstructionService.ts`
  - `detectFieldType`の数値型リストに`integerType`を追加
