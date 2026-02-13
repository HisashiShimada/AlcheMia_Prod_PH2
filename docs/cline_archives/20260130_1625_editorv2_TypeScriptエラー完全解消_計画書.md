# タスク計画書: editorv2 TypeScriptエラー完全解消

## メタデータ
- **作成日時**: 2026-01-30 16:25
- **タスクID**: editorv2-typescript-error-fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

frontend/src/components/editorv2配下の全TypeScriptエラーを解消する。

## 2. エラー分析結果

### カテゴリ1: 型定義の不一致（8件）
1. Line 433: EditorState関数シグネチャ不一致
2. Line 863: string vs null型不一致
3. Line 939: string | undefined vs string | null不一致
4. Line 3211: Date | null vs number | null不一致
5. Line 3600: "partial" vs SelectionMode不一致
6. Line 3617: "dots" vs BackgroundVariant不一致
7. Line 3687: string | null vs string | undefined不一致
8. Line 3707: Node<NodeData> | null vs { id: string; data: NodeData }不一致

### カテゴリ2: プロパティ不存在エラー（15件）
1. Line 904-905: MethodData.places, transitions不存在
2. Line 991-993: MethodData.places, transitions, arcs不存在
3. Line 574-583: TemplateEditorDialogの{}型（10件）

### カテゴリ3: 関数型不一致（6件）
1. Line 1665: setNodes関数型
2. Line 1731: undefined可能性
3. Line 3486: handleTemplateAdd関数型
4. Line 3653: handleTemplateSelect関数型
5. Line 3666: handleUpdateNodeProperty関数型
6. Line 3708: handleSaveTemplate関数型
7. Line 3749: handleWorkflowFileSelect関数型

### カテゴリ4: インポート/エクスポートエラー（6件）
1. Line 2299: DraftDataインポート漏れ
2. Line 2314: edge型指定漏れ
3. components/index.ts: TemplateDataエクスポート漏れ
4. index.ts: MethodDataエクスポート漏れ
5. multiMethodConverter.ts: editorTypes.ts参照エラー
6. reactFlowToMaiml.ts: TemplateMap不存在

### カテゴリ5: PetriNetEditorV2.tsx（2件）
1. Line 298, 361: MethodData型不足プロパティ

## 3. 修正計画

### Phase 1: types/index.tsの修正
- TemplateMap型エイリアスを追加
- 型定義のエクスポート確認

### Phase 2: PetriNetEditorInner.tsxの修正
- 型アサーション追加
- 関数シグネチャ修正
- プロパティアクセス修正

### Phase 3: TemplateEditorDialog.tsxの修正
- 初期値の型指定

### Phase 4: インポート/エクスポート修正
- components/index.ts
- index.ts
- multiMethodConverter.ts
- reactFlowToMaiml.ts

### Phase 5: PetriNetEditorV2.tsxの修正
- MethodData構造の修正

### Phase 6: 検証
- TypeScriptコンパイルチェック
- エラーゼロ確認

## 4. 実装開始

承認後、Phase 1から順次実施します。