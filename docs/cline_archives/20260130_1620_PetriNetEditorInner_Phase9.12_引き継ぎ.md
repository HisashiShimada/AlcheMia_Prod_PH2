# PetriNetEditorInner Phase9.12 引き継ぎ資料

## 現在の状況

### Step 1完了: 型定義の確認完了

#### 確認結果

**✅ 存在する型:**
1. `Template` (line 60) - 完全なテンプレート定義
2. `TemplateRef` (line 48) - テンプレート参照（簡易版）
3. `MethodData` (line 145) - メソッドデータ
4. `MethodInfo` (line 136) - メソッド情報
5. `DocumentData` (line 15) - ドキュメントデータ
6. `ValidationResult` (line 178) - バリデーション結果

**❌ 存在しない型:**
1. `TemplateData` - 存在しない（TemplateまたはTemplateRefを使用すべき）
2. `Method` - 存在しない（MethodDataを使用すべき）

## 残存エラーの原因分析

### A. 存在しない型の使用（2件）
1. Line 3709: `TemplateData` → `TemplateRef`または`Template`に修正必要
2. Line 3559, PetriNetEditorV2.tsx Line 361: `Method[]` → `MethodData[]`に修正必要

### B. Template vs TemplateRef型の不一致（2件）
3. Line 3654: `handleTemplateSelect` - TemplateRef vs Template
4. Line 3487: `handleTemplateCreate` - Template vs any

### C. Props型の不一致（5件）
5. Line 3667: `handleNodeUpdate` - NodeData vs Record<string, unknown>
6. Line 3730: `documentData` - DocumentData vs DocumentData|undefined
7. Line 3732: `onDocumentDataChange` - DocumentData型の不一致
8. Line 3738: `validationResult` - ValidationResult型の不一致
9. Line 3750: `onFileLoad` - FileInfo vs any

### D. React Flow型の文字列リテラル（2件）
10. Line 3601: `selectionMode="partial"` → 型アサーション必要
11. Line 3618: `variant="dots"` → 型アサーション必要

### E. null vs undefined の不統一（3件）
12. Line 865: string vs null
13. Line 941: string|undefined vs string|null
14. Line 3688: selectedMethodId - string|null vs string|undefined

### F. Node型の簡易型への変換（2件）
15. Line 3708: Node<NodeData>|null vs {id, data}
16. Line 3710: Node<NodeData>[] vs {id, data}[]

### G. その他の型エラー（5件）
17. Line 435: handleEditorStateChange - EditorState vs unknown
18. Line 3212: Date|null vs number|null
19. Line 1666: setNodes関数の型
20. Line 1732: 未定義の可能性がある関数呼び出し
21. Line 3730: DocumentData|null vs DocumentData|undefined

## 次のアクション（Phase9.12.1）

### 優先度1: 存在しない型の修正（最も簡単）
```typescript
// PetriNetEditorInner.tsx Line 3709
// ❌ 修正前
handleTemplateAssign: (
  nodeId: string,
  templateRef: TemplateData,  // 存在しない型
  ...
) => void

// ✅ 修正後
handleTemplateAssign: (
  nodeId: string,
  templateRef: TemplateRef,  // 正しい型
  ...
) => void

// PetriNetEditorInner.tsx Line 3559
// ❌ 修正前
methods: Method[]  // 存在しない型

// ✅ 修正後
methods: MethodData[]  // 正しい型
```

### 優先度2: React Flow型の型アサーション
```typescript
// Line 3601
selectionMode={"partial" as SelectionMode}

// Line 3618
variant={"dots" as BackgroundVariant}
```

### 優先度3: Props型の修正
TemplateEditorDialog, PropertyPanel, DocumentEditDialogなどのPropsインターフェースを修正

### 優先度4: null/undefined統一
selectedMethodIdやdocumentDataの型を統一

### 優先度5: Node型変換
Node<NodeData>を{id, data}形式に変換するヘルパー関数を作成

## 推定作業時間
- Phase9.12.1（優先度1,2）: 10分
- Phase9.12.2（優先度3）: 20分
- Phase9.12.3（優先度4,5）: 15分

合計: 約45分

## 実装の注意点

1. **型アサーションは最小限に**: 可能な限りインターフェース修正で対応
2. **Props変更時の互換性**: コンポーネント間の型整合性を確認
3. **段階的確認**: 各優先度ごとにエラー数を確認しながら進める

## 完了条件

- [ ] editorv2関連の型エラーが0件
- [ ] ビルドが成功する
- [ ] 型安全性が向上している

## リスク

- Props型の変更により、他のコンポーネントに影響が出る可能性あり
- 型アサーションの多用による型安全性の低下

## 結論

**Phase9.12は大規模な作業ですが、段階的に進めることで確実に型エラーを解消できます。**

次のセッションでPhase9.12.1から順次実施してください。