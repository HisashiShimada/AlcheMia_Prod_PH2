# タスク計画書: NestedPropertyEditor xsi:type選択時エラー修正

## メタデータ
- **作成日時**: 2026-02-26 15:13
- **タスクID**: xsitype-select-error-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

フォーマット管理画面のXML編集時、新規で属性を追加する際に`xsi:type`を選択すると、Selectコンポーネントで以下のエラーが発生する問題を修正します。

```
Warning: `value` in Select options should not be `null`.
src/components/editorv2/components/NestedPropertyEditor.tsx (406:13)
```

## 2. 問題の原因

### 現状の実装
```typescript
// Line 406-410
{newAttributeName === 'xsi:type' ? (
  <Select
    value={newAttributeValue}  // ← 空文字列が渡される
    onChange={setNewAttributeValue}
  >
```

### 問題点
1. `newAttributeValue`の初期値は空文字列`''`
2. `xsi:type`を選択した時、Line 358で`setNewAttributeValue('stringType')`を実行
3. しかし、モーダルを閉じて再度開いた時、`newAttributeValue`が空文字列にリセットされる
4. Ant DesignのSelectコンポーネントは、空文字列をプレースホルダー表示として解釈せず、内部的に`null`として扱う
5. そのため警告が発生する

## 3. 修正方針

### 方針1: 条件付きvalue設定（推奨）
`xsi:type`が選択されている場合、`newAttributeValue`が空文字列の時は`undefined`を渡す

### 方針2: デフォルト値の維持
モーダルを開く時に、`xsi:type`が選択されている場合は必ずデフォルト値を設定

**→ 方針1を採用**（Selectコンポーネントの標準的な使用方法に準拠）

## 4. 実装ステップ

- [ ] NestedPropertyEditor.tsxの修正
  - [ ] Line 406のSelect valueプロパティを条件付きに変更
  - [ ] 空文字列の場合は`undefined`を渡す
  - [ ] コメント追加

## 5. 修正内容

### Before
```typescript
<Select
  style={{ width: '100%' }}
  placeholder="MaiML Property Type"
  value={newAttributeValue}
  onChange={setNewAttributeValue}
>
```

### After
```typescript
<Select
  style={{ width: '100%' }}
  placeholder="MaiML Property Type"
  value={newAttributeValue || undefined}  // 空文字列の場合はundefinedを渡す
  onChange={setNewAttributeValue}
>
```

## 6. テスト計画

### 手動テスト
- [ ] フォーマット管理画面を開く
- [ ] XMLファイルを選択して編集モードに入る
- [ ] 属性追加ボタンをクリック
- [ ] 属性名で`xsi:type`を選択
- [ ] エラーが発生しないことを確認
- [ ] プレースホルダーが正しく表示されることを確認
- [ ] 型を選択して保存できることを確認

## 7. 承認記録

- **計画書提示日時**: 2026-02-26 15:13
- **承認日時**: （承認待ち）

## 8. 関連情報

### エラー詳細
- **エラーメッセージ**: `Warning: \`value\` in Select options should not be \`null\`.`
- **発生箇所**: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx:406`
- **条件**: `xsi:type`属性を新規追加する際

### Ant Design Select仕様
- `value={''}`（空文字列）の場合、内部的に`null`として扱われる
- プレースホルダーを表示する場合は`value={undefined}`を使用する
- または`value`プロパティを省略する
