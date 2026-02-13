# PetriNetEditorInner Phase 8: Step 5完了・型エラー状況報告

## メタデータ
- **作成日時**: 2026-01-30 14:00
- **報告者**: Cline
- **対象**: Phase 8（メインファイルリファクタ）

---

## 実施完了内容

### Step 1: インポート追加 ✅
- hooks（useKeyboardShortcuts, useEditorActions）
- handlers（createNodeHandlers, createEdgeHandlers, createCanvasHandlers）
- utils（nodeUtils, edgeUtils, validationUtils）
- loaders（maimlLoader）

### Step 2: キーボードショートカット統合 ✅
- useKeyboardShortcutsフックを統合
- 旧実装をコメントアウト

### Step 3: エディタアクション統合 ✅
- useEditorActionsフックを統合
- handleCopy/Pasteを新実装に置き換え

### Step 4: ノードハンドラー統合 ✅
- createNodeHandlersを統合
- ノード操作ハンドラーを新実装に置き換え

### Step 5: エッジハンドラー統合 ✅
- createEdgeHandlersを統合
- エッジ操作ハンドラーを新実装に置き換え

---

## 発生している問題

### 🔴 型エラー（約100件以上）

#### 1. any型の使用（ESLint）
```
Line 3235: Unexpected any. Specify a different type.
Line 3236: Unexpected any. Specify a different type.
...（複数）
```

#### 2. useKeyboardShortcutsのプロパティ不一致
```
Line 485: オブジェクト リテラルは既知のプロパティのみ指定できます。
'onCopy' は型 'UseKeyboardShortcutsProps' に存在しません。
```

**原因**: useKeyboardShortcutsの型定義と使用方法が一致していない

#### 3. EditorHandlersの型不一致
```
Line 474: プロパティ 'setSelectedNode' は型 '{ nodes: ...' にありませんが、
型 'EdgeHandlersProps' では必須です。
```

**原因**: createEdgeHandlersに必要なプロパティが渡されていない

#### 4. DocumentDataの型不一致
```
Line 709: 型 '{ id: string; protocolId: string; ... }' の引数を型 
'SetStateAction<DocumentData | null>' のパラメーターに割り当てることはできません。
```

**原因**: DocumentData型の定義が複数存在し、互換性がない

#### 5. 暗黙のany型
```
Line 803: パラメーター 'm' の型は暗黙的に 'any' になります。
Line 839: パラメーター 'placeRefEl' の型は暗黙的に 'any' になります。
...（複数）
```

---

## 未完了のステップ

### Step 6: キャンバスハンドラー統合 ❌
- createCanvasHandlersの統合
- handlePaneClick, handleInit等

### Step 7: ユーティリティ関数統合 ❌
- 重複するヘルパー関数の削除
- インポート済みユーティリティの使用

### Step 8: MAIMLローダー統合 ❌
- loadMaimlFromXml関数の使用
- 既存ロジックとの統合

### Step 9: 最終調整 ❌
- 未使用インポート削除
- 未使用変数削除
- ESLintエラー修正

---

## 優先修正事項

### 🔥 緊急（ビルドブロッカー）

#### 1. useKeyboardShortcutsのプロパティ修正
```typescript
// ❌ 現在（エラー）
const { pressedKeys: keysPressedFromHook } = useKeyboardShortcuts({
  onCopy: () => { ... },  // ← プロパティが存在しない
  onPaste: () => { ... },
  ...
});

// ✅ 修正案
const { pressedKeys: keysPressedFromHook } = useKeyboardShortcuts({
  onCopyPaste: () => { ... },  // ← hooks/useKeyboardShortcuts.tsの実際の型に合わせる
  ...
});
```

#### 2. EdgeHandlersPropsの修正
```typescript
// ❌ 現在（エラー）
const edgeHandlers = createEdgeHandlers({
  nodes,
  edges,
  setEdges,
  setSelectedEdge,
  pushState,
});

// ✅ 修正案（setSelectedNodeを追加）
const edgeHandlers = createEdgeHandlers({
  nodes,
  edges,
  setNodes,  // ← 追加
  setEdges,
  setSelectedNode,  // ← 追加
  setSelectedEdge,
  pushState,
});
```

### ⚠️ 重要（型安全性）

#### 3. DocumentData型の統一
- editorTypes.tsのDocumentData
- DocumentEditDialog.tsxのDocumentData
→ 型定義を統一または変換関数を作成

#### 4. 暗黙のany型の明示化
```typescript
// ❌ 現在
methods.map((m, index) => { ... })

// ✅ 修正案
methods.map((m: Method, index: number) => { ... })
```

---

## 次のアクション

### Phase 8 Step 6: 型エラー修正（推定: 1時間）

1. **useKeyboardShortcutsの修正**
   - hooks/useKeyboardShortcuts.tsの型定義を確認
   - PetriNetEditorInner.tsxの使用箇所を修正

2. **EdgeHandlersPropsの修正**
   - handlers/edgeHandlers.tsの型定義を確認
   - 必要なプロパティを追加

3. **暗黙のany型を明示化**
   - パラメーター型を明示
   - 推論可能な箇所は型アサーションを使用

4. **DocumentData型の統一**
   - 型定義を確認して統一
   - または変換関数を作成

### Phase 8 Step 7-9: 残りの統合（推定: 1時間）

5. **キャンバスハンドラー統合**
6. **ユーティリティ関数統合**
7. **MAIMLローダー統合**
8. **最終調整・クリーンアップ**

---

## コンテキスト使用量

- **現在**: 約80%使用（158,569 / 200K tokens）
- **予測**: Step 6完了で85%、Step 9完了で90%
- **結論**: 1セッションで完了可能

---

## リスク評価

| リスク | 影響度 | 発生確率 | 現状 |
|--------|--------|----------|------|
| 型エラーの増加 | 高 | ✅ 発生中 | 修正作業中 |
| 既存機能の動作不良 | 中 | 低 | 未確認 |
| コンテキスト超過 | 低 | 低 | 余裕あり |

---

## 結論

**Phase 8は予定通り進行中ですが、型エラーの修正が必要です。**

- ✅ Step 1-5: 完了（ハンドラー統合）
- 🔧 Step 6: 型エラー修正（次のアクション）
- ⏳ Step 7-9: 残りの統合作業

**推定残り時間**: 2時間
**完了予定**: 2026-01-30 16:00

---

**次のステップ**: useKeyboardShortcutsの型定義を確認して修正を開始