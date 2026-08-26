# タスク計画書: 共有ダイアログのツリー表示修正

## メタデータ
- **作成日時**: 2026-08-26 09:20
- **タスクID**: 共有ダイアログツリー表示修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

名前空間管理の用語管理タブにある共有ボタンを押下した際に表示される「共有先を選択（N件の用語）」ダイアログの表示内容を変更する。

現状はフラットな `<Select>` ドロップダウンで共有先を選択する実装になっているが、左ペインの階層ツリーと同様に組織グループの階層構造を `<Tree>` コンポーネントで表示するよう変更する。

また、Global ノードは共有先として不適切なため非表示にし、アイコンも非表示にする。

## 現状の問題

- `UncertaintyManagement.tsx` の共有モーダルは `<Modal>` + `<Select>` のフラット実装
- `frontend/src/components/namespace/ShareScopeModal.tsx` にツリー形式のモーダルが実装済みだが、`UncertaintyManagement.tsx` で使われていない
- `ShareScopeModal.tsx` にはアイコン（BankOutlined、TeamOutlined 等）が表示されているが不要

## 目的と期待される成果

- [ ] 共有ダイアログが階層ツリー形式（`<Tree>`）で表示される
- [ ] Global ノードがダイアログに表示されない
- [ ] ツリーノードにアイコンが表示されない
- [ ] 組織グループの階層構造が正しく表示される
- [ ] Personal ノード配下にログインユーザーが表示される
- [ ] 共有先を選択して「共有する」ボタンが機能する

## 実装ステップ

### Phase 1: ShareScopeModal.tsx の修正

- [ ] `getNodeIcon()` 関数を削除
- [ ] アイコン用 import を削除（`BankOutlined`, `TeamOutlined`, `UserOutlined`, `GlobalOutlined`）
- [ ] `toAntTreeData()` 内のアイコン表示部分（`{getNodeIcon(depth)}`）を削除

### Phase 2: UncertaintyManagement.tsx の修正

- [ ] `ShareScopeModal` と `ScopeNode`、`ShareTarget` 型のインポートを追加
- [ ] `shareScopeOptions` useMemo を削除し、`shareScopeNodes` useMemo（`ScopeNode[]` を返す）に置き換え
  - Global ノードは含めない
  - 組織グループ階層（`orgGroups`）をツリーに変換
  - Personal ノード配下にログインユーザーを追加
  - 現在選択中スコープは除外しない（ツリーの `selectable` で制御）
- [ ] `shareTargetKey` / `setShareTargetKey` state を削除
- [ ] `handleShareOk` を削除し、`ShareScopeModal` の `onShare` コールバックに統合
- [ ] インライン `<Modal>` + `<Select>`（746〜768行目）を `<ShareScopeModal>` に置き換え

## 変更ファイル

1. `frontend/src/components/namespace/ShareScopeModal.tsx` - アイコン関連コードの削除
2. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - Modal+Select → ShareScopeModal 置き換え

## 技術的詳細

### ShareScopeModal の `sourceRole` について

`UncertaintyManagement` にはロール情報が渡されないため、`sourceRole: { kind: 'sys_admin' }` 固定とする。
これにより、組織ノード（depth=0）を含む全ノードが選択可能になる。

### ScopeNode ツリーの構造

```
[
  {
    key: 'company',
    label: '組織名',
    children: [
      { key: 'group_cd_A', label: 'グループA', children: [...] },
      ...
    ]
  },
  {
    key: 'personal-{userId}',
    label: 'Personal',
    children: [
      { key: '{userId}', label: 'ユーザー名' }
    ]
  }
]
```

### orgGroups → ScopeNode ツリー変換ロジック

`buildOrgTree()` と同様の再帰ロジックを使用して `OrganizationGroupRow[]` を `ScopeNode[]` に変換する。

## リスク

| リスク | 対策 |
|---|---|
| orgGroups が空の場合にツリーが空になる | 組織ノード自体（'company' キー）は orgChildren が空でも表示し、Personal は常に表示 |
| shareTargetKey state 削除による既存ロジックへの影響 | Modal+Select のコードを丸ごと ShareScopeModal に置き換えるため影響なし |

## テスト計画

- [ ] 共有ボタンクリックでダイアログが開く
- [ ] ツリーに Global ノードが表示されない
- [ ] ツリーにアイコンが表示されない
- [ ] 組織グループの階層が正しく表示される
- [ ] Personal ノード配下にユーザーが表示される
- [ ] ノードを選択して「共有する」ボタンが有効になる
- [ ] 「共有する」ボタンクリックで共有処理が実行される

## 承認記録

- **計画書提示日時**: 2026-08-26 09:20
- **承認日時**: 2026-08-26 09:20
- **承認者コメント**: 計画に問題なし。タスク計画書作成依頼
