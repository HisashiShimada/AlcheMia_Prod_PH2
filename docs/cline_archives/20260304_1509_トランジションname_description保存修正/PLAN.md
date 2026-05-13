# タスク計画書: トランジションname/descriptionが保存・表示されない問題修正

## メタデータ
- **作成日時**: 2026-03-04 15:09
- **タスクID**: transition-name-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

MAIMLエディタ画面でトランジションを選択してname/descriptionを入力・保存しても、
再度プロジェクトを開いた際にnameがプロパティパネルに表示されない。
また、ダウンロードしたMAIMLファイルにも`<name>`要素が存在しない。

## 原因分析

### 根本原因
`frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` の `buildMethodXML` 関数内で、Transition要素の出力時にnameとdescriptionが**完全に無視**されている。

```typescript
// ❌ 現状の問題コード
transitions.forEach((transition: Node<NodeData>) => {
  methodXml += `        <transition id="${transition.id}"/>\n`;  // name/descriptionが出力されない！
});
```

単一メソッド版の `reactFlowToMaiml.ts` では正しく出力されている：
```typescript
// ✅ 正しい実装（reactFlowToMaiml.ts）
transitions.forEach(transition => {
  const hasName = transition.data.name && transition.data.name.trim() !== '';
  const hasDescription = transition.data.description && transition.data.description.trim() !== '';
  if (hasName || hasDescription) {
    maiml += `        <transition id="${escapeXml(transition.id)}">\n`;
    if (hasName) {
      maiml += `          <name>${escapeXml(transition.data.name)}</name>\n`;
    }
    if (hasDescription) {
      maiml += `          <description>${escapeXml(transition.data.description)}</description>\n`;
    }
    maiml += `        </transition>\n`;
  } else {
    maiml += `        <transition id="${escapeXml(transition.id)}"/>\n`;
  }
});
```

### 影響範囲
- 複数methodモード（`convertMultipleMethodsToMaiML`使用）でのみ発生
- 単一methodモード（`convertReactFlowToMaiML`使用）は正常動作
- instruction要素のdescriptionは更新される（ユーザー報告通り）

## 実装ステップ

- [ ] `multiMethodConverter.ts` の `buildMethodXML` 関数内のTransition出力を修正

## 変更ファイル
1. `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` - Transition出力にname/description追加

## テスト計画
- [ ] エディタでトランジションを選択してname/descriptionを入力
- [ ] 保存後、再度プロジェクトを開いてname/descriptionが表示されることを確認
- [ ] ダウンロードしたMAIMLファイルに`<name>`要素があることを確認

## 承認記録
- **計画書提示日時**: 2026-03-04 15:09
