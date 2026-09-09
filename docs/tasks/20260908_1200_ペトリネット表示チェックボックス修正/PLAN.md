# タスク計画書: ペトリネット表示チェックボックス修正

## メタデータ
- **作成日時**: 2026-09-08 12:00
- **タスクID**: 20260908_1200_ペトリネット表示チェックボックス修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験管理者画面の「実験指示タブ」にあるペトリネット表示機能（PetriNetViewer）で、
ノードのプロパティダイアログ（PropertyViewerWithSelection）のチェックボックスにチェックが入らない不具合を修正する。

## 根本原因

`PropertyViewerWithSelection.tsx` のチェックボックスで **2重トグル（即時解除）** が発生している。

### 問題のメカニズム
1. ユーザーがチェックボックスをクリック
2. `Checkbox.onChange` → `onPropertyToggle()` 呼び出し（1回目: チェック ON）
3. イベントがバブリング（`e.stopPropagation()` が DOM の click バブリングを止めない）
4. `onRow.onClick` → `onPropertyToggle()` 呼び出し（2回目: チェック OFF）
5. チェックが入った直後に外れる → 「チェックが入らない」

### 誤った実装（現状）
```tsx
<Checkbox
  checked={selected.includes(record.key)}
  onChange={(e) => {
    e.stopPropagation();  // ❌ Ant Design の CheckboxChangeEvent の stopPropagation は
                          //    DOM の click バブリングを止めない
    onPropertyToggle(structure, record.key);  // 1回目
  }}
/>
// + onRow.onClick でも onPropertyToggle が呼ばれる（2回目）
```

### 正しい実装（StructuredPropertySelector.tsx と同じパターン）
```tsx
<Checkbox
  checked={selected.includes(record.key)}
  onChange={() => onPropertyToggle(structure, record.key)}
  onClick={(e) => e.stopPropagation()}  // ✅ onClick で DOM バブリングを明示的に止める
/>
```

## 目的と期待される成果
- [x] チェックボックスにチェックが正しく入るようになる
- [x] チェック解除も正常に動作する
- [x] StructuredPropertySelector.tsx と同一のイベントハンドリングパターンに統一される

## 実装ステップ
- [x] `PropertyViewerWithSelection.tsx` の `getColumns()` 内 Checkbox を修正（基本情報・データタブ用）
- [x] `PropertyViewerWithSelection.tsx` のテンプレートタブ専用 `templateCols` 内 Checkbox を修正
- [x] 修正後のファイルを確認

## 変更ファイル
1. `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` - Checkbox イベントハンドリング修正（3か所）

## リスク
| リスク | 対策 |
|--------|------|
| 修正によって行クリック（onRow.onClick）によるトグルが無効化される | onRow.onClick は残すため問題なし |

## テスト計画
- [ ] ノードクリック → プロパティダイアログが開く
- [ ] 基本情報タブのチェックボックスをクリック → チェックが入る
- [ ] 再度クリック → チェックが外れる
- [ ] テンプレートタブ・データタブでも同様に確認

## 承認記録
- **承認日時**: 2026-09-08 12:00
- **承認者コメント**: Act モードに切り替えて承認
