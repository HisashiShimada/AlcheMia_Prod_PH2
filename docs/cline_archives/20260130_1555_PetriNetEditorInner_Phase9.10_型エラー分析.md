# PetriNetEditorInner Phase9.10 型エラー分析

**作成日時**: 2026-01-30 15:55
**フェーズ**: Phase 9.10 - error/saveError型統一後の型エラー分析

## 実施内容

### Step 7完了: error/saveError型をnullで統一
- ✅ `error`をstring | nullに統一
- ✅ `saveError`をstring | nullに統一
- ✅ 初期値をnullに設定
- ✅ エラーハンドリングでstring代入

## 検出された型エラー (17件)

### 1. any型の使用 (14件)
```
Line 1716: Unexpected any. Specify a different type.
Line 1999: Unexpected any. Specify a different type.
Line 2004: Unexpected any. Specify a different type.
Line 3274: Unexpected any. Specify a different type.
Line 3275: Unexpected any. Specify a different type.
Line 3282: Unexpected any. Specify a different type.
Line 3288: Unexpected any. Specify a different type.
Line 3345: Unexpected any. Specify a different type.
Line 3373: Unexpected any. Specify a different type.
Line 3379: Unexpected any. Specify a different type.
Line 3384: Unexpected any. Specify a different type.
Line 3385: Unexpected any. Specify a different type.
Line 3386: Unexpected any. Specify a different type.
Line 3770: Unexpected any. Specify a different type.
```

### 2. pushState型の不一致
```
Line 435: 型 '(newState: EditorState) => void' を型 '(action: string, data: unknown) => void' に割り当てることはできません。
```

### 3. 型アサーション問題
```
Line 3601: Expected a `const` instead of a literal type assertion.
Line 3618: Expected a `const` instead of a literal type assertion.
```

### 4. null/undefinedの型不一致
```
Line 865: 型 'string' を型 'null' に割り当てることはできません。
Line 941: 型 'string | undefined' を型 'string | null' に割り当てることはできません。
```

### 5. ノード追加の型エラー
```
Line 1666: 型 '(nds: Node<NodeData, string | undefined>[]) => ...' の引数を型 'SetStateAction<Node<NodeData, string | undefined>[]>' のパラメーターに割り当てることはできません。
```

### 6. 関数呼び出しの型エラー
```
Line 1732: 'undefined' の可能性があるオブジェクトを呼び出すことはできません。
```

### 7. Date/number型の不一致
```
Line 3212: 型 'Date | null' を型 'number | null' に割り当てることはできません。
```

### 8. Template型の不一致
```
Line 3487: 型 '(templateData: { category: "material" | "condition" | "result"; template: Template; }) => void' を型 '(data: { category: string; template: any; }) => void' に割り当てることはできません。
```

### 9. Method[]とMethodData[]の不一致
```
Line 3559: 型 'Method[]' を型 'MethodData[]' に割り当てることはできません。
```

### 10. SelectionMode/BackgroundVariantの型アサーション
```
Line 3601: 型 '"partial"' を型 'SelectionMode | undefined' に割り当てることはできません。
Line 3618: 型 '"dots"' を型 'BackgroundVariant | undefined' に割り当てることはできません。
```

### 11. TemplateRef/Templateの型不一致
```
Line 3654: 型 '(template: TemplateRef) => void' を型 '(template: Template) => void' に割り当てることはできません。
```

### 12. NodeData更新の型エラー
```
Line 3667: 型 '(nodeId: string, newData: NodeData) => void' を型 '(nodeId: string, data: Record<string, unknown>) => void' に割り当てることはできません。
```

### 13. sourceS3Keyの型不一致
```
Line 3688: 型 'string | null' を型 'string | undefined' に割り当てることはできません。
```

### 14. templateEditNodeの型不一致
```
Line 3708: 型 'Node<NodeData> | null' を型 '{ id: string; data: NodeData; }' に割り当てることはできません。
```

### 15. handleSaveTemplateの型不一致
```
Line 3709: 型 '(nodeId: string, templateRef: TemplateRef, ...) => void' を型 '(nodeId: string, templateRef: TemplateData, ...) => void' に割り当てることはできません。
```

### 16. DocumentDataの型不一致
```
Line 3730: 型 'DocumentData | null' を型 'DocumentData | null | undefined' に割り当てることはできません。
  プロパティ 'creators' の型に互換性がありません。
```

### 17. ValidationResultの型不一致
```
Line 3738: 型 'import(".../types/index").ValidationResult | null' を型 'ValidationResult | null' に割り当てることはできません。
  プロパティ 'isValid' は型 '...' にありませんが、型 'ValidationResult' では必須です。
```

### 18. handleWorkflowFileSelectの型不一致
```
Line 3750: 型 '(file: any) => void' を型 '(file: FileInfo) => Promise<void>' に割り当てることはできません。
```

## 分析結果

### エラーの分類

#### カテゴリA: 型定義の不一致 (優先度: 高)
- pushState型の不一致 (Line 435)
- Method[]とMethodData[]の不一致 (Line 3559)
- Template型の不一致 (複数箇所)
- DocumentData型の不一致 (Line 3730, 3732)
- ValidationResult型の不一致 (Line 3738)

#### カテゴリB: any型の使用 (優先度: 中)
- 14箇所で`any`型が使用されている
- 適切な型定義が必要

#### カテゴリC: 型アサーション (優先度: 低)
- SelectionMode, BackgroundVariant等の型アサーション
- `as const`を使用して解決可能

## 次のステップ

### Phase 9.11: 型定義の統一と修正

**優先順位1: 型定義ファイルの確認と統一**
1. editorTypes.tsの型定義を確認
2. コンポーネント間の型定義の不一致を修正
3. DocumentData, ValidationResult, TemplateRef/Template等の型を統一

**優先順位2: any型の置き換え**
1. 各`any`型の使用箇所を特定
2. 適切な型定義を作成または適用

**優先順位3: 型アサーションの修正**
1. リテラル型アサーションを`as const`に変更
2. null/undefinedの扱いを統一

## 推奨アプローチ

1. **まず型定義ファイル（editorTypes.ts）を確認**
   - DocumentData, ValidationResult, Method, TemplateRef等の定義を確認
   - コンポーネント間で共通の型定義を使用

2. **段階的に修正**
   - カテゴリAの型定義の不一致を優先的に修正
   - カテゴリBのany型を適切な型に置き換え
   - カテゴリCの型アサーションを最後に修正

3. **テスト実行**
   - 各修正後にビルドして型エラーが減少することを確認

## 状況サマリー

- ✅ error/saveError型をnullで統一完了
- ⚠️ 17件の型エラーが残存
- 📋 次フェーズで型定義の統一と修正が必要

**次のアクション**: Phase 9.11で型定義の統一と修正を実施