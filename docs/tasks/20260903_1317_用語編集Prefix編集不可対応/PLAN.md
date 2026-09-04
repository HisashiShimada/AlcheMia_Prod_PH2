# タスク計画書: 編集時のPrefix編集不可対応

## メタデータ
- **作成日時**: 2026-09-03 13:17
- **タスクID**: 用語編集Prefix編集不可対応
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

用語管理画面で既存の用語を編集するとき、Prefix フィールドが `<Select>` として表示されており、ユーザーが変更できてしまっている。Prefix は識別子として変更不可とすべきであるため、編集中も非活性（disabled）表示に変更する。

## 目的と期待される成果

- [ ] 既存用語の編集モード中に Prefix フィールドを非活性（disabled）の `<Input>` として表示する
- [ ] Prefix の値は編集不可だが、API 呼び出し時の識別情報として引き続き使用される

## 実装ステップ

- [x] `NamespaceMain.tsx` の Prefix 列 render 内（1842〜1855行）の既存行編集中ブランチを修正する
  - `<Select>` → `<Input disabled size="small" value={editingValues.prefix} />` に変更
- [x] `PrefixManagement.tsx` の Prefix 列 render 内の既存行編集中ブランチを修正する
  - `<Input onChange=...>` → `<Input disabled size="small" value={editingValues.prefix} />` に変更

## 変更ファイル

1. `frontend/src/components/namespace/NamespaceMain.tsx` - 用語管理テーブルの Prefix 列レンダリングの修正
2. `frontend/src/components/namespace/PrefixManagement.tsx` - Prefix 管理テーブルの Prefix 列レンダリングの修正

## 影響範囲

- 用語管理タブ（NamespaceMain）の既存用語編集モードの Prefix セル表示
- Prefix 管理タブ（PrefixManagement）の既存 Prefix 編集モードの Prefix セル表示
- 新規行追加時の Prefix 入力欄は変更なし（新規行では引き続き入力・選択可能）
- API 呼び出しのロジックは変更なし（`editingValues.prefix` は保持したまま）

## リスク

| リスク | 対策 |
|--------|------|
| 保存ロジックへの影響 | `editingValues.prefix` の値は変更せず保持するため影響なし |

## テスト計画

- [ ] 既存用語の編集ボタンを押したとき、Prefix セルが非活性の Input（グレーアウト）で表示されることを確認
- [ ] 編集モードで他のフィールド（表示名・説明・型・単位）が編集可能なことを確認
- [ ] 保存ボタン押下後、正常に更新されることを確認

## 承認記録

- **計画書提示日時**: 2026-09-03 13:17
- **承認日時**: 
- **承認者コメント**: 
