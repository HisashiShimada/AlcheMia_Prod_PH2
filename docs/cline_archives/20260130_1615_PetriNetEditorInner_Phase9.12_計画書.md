# PetriNetEditorInner Phase9.12 計画書

## 目的
PetriNetEditorInner.tsxとPetriNetEditorV2.tsxに残存する21件の型エラーを修正する

## 現状分析

### 残存エラー（21件）

#### A. Props型の不一致（9件）
1. Line 3487: `handleTemplateCreate` - Template vs any
2. Line 3654: `handleTemplateSelect` - TemplateRef vs Template
3. Line 3667: `handleNodeUpdate` - NodeData vs Record<string, unknown>
4. Line 3709: `handleTemplateAssign` - TemplateRef vs TemplateData
5. Line 3730: `documentData` - DocumentData vs DocumentData|undefined
6. Line 3732: `onDocumentDataChange` - DocumentData型の不一致
7. Line 3738: `validationResult` - ValidationResult型の不一致
8. Line 3750: `onFileLoad` - FileInfo vs any
9. Line 435: `handleEditorStateChange` - EditorState vs unknown

#### B. React Flow型の不一致（2件）
10. Line 3601: `selectionMode` - "partial" vs SelectionMode
11. Line 3618: `background variant` - "dots" vs BackgroundVariant

#### C. データ構造の不一致（4件）
12. Line 3559: `methods` - Method[] vs MethodData[]
13. Line 3688: `selectedMethodId` - string|null vs string|undefined
14. Line 3708: `selectedNode` - Node<NodeData>|null vs {id, data}
15. Line 3710: `allNodes` - Node<NodeData>[] vs {id, data}[]

#### D. 型変換の問題（3件）
16. Line 865: string vs null
17. Line 941: string|undefined vs string|null
18. Line 3212: Date|null vs number|null

#### E. 関数型の問題（2件）
19. Line 1666: setNodes関数の型
20. Line 1732: 未定義の可能性がある関数呼び出し

#### F. PetriNetEditorV2.tsx（1件）
21. Line 361: Method[]型の不一致

## 修正戦略

### Phase 9.12.1: Props型の修正（優先度: 高）
- TemplateEditorDialog, PropertyPanel等のPropsインターフェースを修正
- Template/TemplateRef/TemplateDataの型統一
- DocumentData型の重複定義を解消

### Phase 9.12.2: React Flow型の修正（優先度: 中）
- SelectionModeとBackgroundVariant型の適切な使用
- 文字列リテラルの型アサーション追加

### Phase 9.12.3: データ構造の型修正（優先度: 高）
- Method vs MethodData型の統一
- null vs undefined の統一
- Node型の簡易型への変換関数作成

### Phase 9.12.4: 型変換とガード（優先度: 低）
- 型ガードの追加
- 適切な型アサーションの追加

### Phase 9.12.5: PetriNetEditorV2.tsx修正（優先度: 中）
- Method[]型の修正

## 実装計画

### Step 1: 型定義の確認と整理
- [ ] Template/TemplateRef/TemplateDataの定義確認
- [ ] DocumentDataの重複定義確認
- [ ] Method/MethodDataの定義確認
- [ ] ValidationResultの定義確認

### Step 2: Props型の修正
- [ ] TemplateEditorDialogのProps修正
- [ ] PropertyPanelのProps修正
- [ ] DocumentEditDialogのProps修正
- [ ] FileLoadDialogのProps修正

### Step 3: データ構造の型修正
- [ ] methods配列の型修正
- [ ] selectedMethodIdの型統一
- [ ] Node型の簡易型変換

### Step 4: React Flow型の修正
- [ ] selectionModeの型アサーション
- [ ] background variantの型アサーション

### Step 5: その他の型エラー修正
- [ ] 型ガードの追加
- [ ] 型アサーションの追加

### Step 6: 最終確認
- [ ] 型エラー数の確認
- [ ] ビルド確認

## 期待される成果

- 21件の型エラーを0件に削減
- 型安全性の向上
- コードの保守性向上

## リスク

- Props型の変更によるコンポーネント間の互換性問題
- 型アサーションの過度な使用による型安全性の低下

## 次のアクション

Phase 9.12.1から順次実施し、各Stepごとに型エラー数を確認しながら進める