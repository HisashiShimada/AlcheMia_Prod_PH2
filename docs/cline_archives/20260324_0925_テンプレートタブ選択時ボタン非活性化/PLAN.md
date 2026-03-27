# タスク計画書: テンプレートタブ選択時のボタン非活性化

## メタデータ
- **作成日時**: 2026-03-24 09:25
- **タスクID**: テンプレートタブ_ボタン非活性化
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

MaimiのPetriNetエディタ編集画面において、ツールバーの「テンプレート」タブ（Segmented切り替え）を選択中に、ペトリネット編集用のボタン群を非活性（disabled）にする。

## 目的と期待される成果

### 目的
テンプレートタブ選択中はペトリネットのキャンバスが表示されていないため、以下のボタンを操作しても意味がない。誤操作を防ぎ、UIの一貫性を向上させる。

### 期待される成果
- [ ] テンプレートタブ選択中、Material〜ワークフローまでの5ボタンが非活性（グレーアウト）になる
- [ ] ペトリネットタブ選択中は通常通り活性状態である
- [ ] Document・バリデーション・保存・Undo/Redo は影響を受けない

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] タスク計画書を作成する

### Phase 2: EditorToolbar.tsx 修正
- [ ] `viewMode === 'templates'` から `isTemplateMode` フラグを導出する
- [ ] Materialボタンに `disabled={isTemplateMode}` を追加
- [ ] Conditionボタンに `disabled={isTemplateMode}` を追加
- [ ] Resultボタンに `disabled={isTemplateMode}` を追加
- [ ] Transitionボタンに `disabled={isTemplateMode}` を追加
- [ ] ワークフローボタンに `disabled={isTemplateMode}` を追加

## 変更ファイル

### 修正するファイル
1. `frontend/src/components/editorv2/components/EditorToolbar.tsx` - テンプレートモード時のボタン非活性化

### 新規作成するファイル
なし

## 技術的詳細

### 変更箇所
`EditorToolbar` 関数コンポーネント内に以下を追加：

```tsx
// テンプレートモード時はペトリネット編集ボタンを非活性化
const isTemplateMode = viewMode === 'templates';
```

各ボタンに `disabled={isTemplateMode}` を付与：

| ボタン名 | onClick |
|---|---|
| Material | `onAddNode('material')` |
| Condition | `onAddNode('condition')` |
| Result | `onAddNode('result')` |
| Transition | `onAddNode('transition')` |
| ワークフロー | `onAddWorkflow` |

### 設計考慮事項
- `viewMode` は既に `EditorToolbarProps` に定義済みのため、Props変更不要
- `PetriNetEditorInner` から渡されるため、呼び出し元の変更も不要
- テンプレートモードから戻ると自動的に活性化される

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `viewMode` が undefined の場合 | 低 | 低 | `viewMode === 'templates'` は undefined の場合 false になるため問題なし |

## テスト計画

### 手動テスト
- [ ] ペトリネットタブ選択中: Material〜ワークフローボタンが活性
- [ ] テンプレートタブ選択中: Material〜ワークフローボタンが非活性（グレーアウト）
- [ ] テンプレートタブ→ペトリネットタブに切り替え: ボタンが再度活性化
- [ ] テンプレートタブ選択中: Document・バリデーション・保存・Undo/Redo は操作可能

## 承認記録
- **計画書提示日時**: 2026-03-24 09:25
- **承認日時**: -
- **承認者コメント**: -
