# PetriNetEditorV2移植タスク計画書

## メタデータ
- **作成日時**: 2026-01-29 09:47
- **タスクID**: PetriNetEditorV2移植
- **優先度**: 中
- **推定工数**: 8時間

## 1. タスク概要

reference版のPetriNetEditorV2コンポーネントとその依存コンポーネントを、現行プロジェクトのポリシー（TypeScript + Ant Design）に準拠した形式に変換し、`frontend/src/components/editorv2`配下に取り込む。

**重要**: 一旦画面接続は不要（スタンドアロンコンポーネントとして実装）

## 2. 目的と期待される成果

### 目的
- Material-UI版のPetriNetEditorV2をAnt Design版に移植
- TypeScript化による型安全性の向上
- 現行プロジェクトのコーディング規約への準拠

### 期待される成果
- [x] ディレクトリ構造の準備完了
- [x] 型定義ファイル（types/index.ts）の作成完了
- [x] エントリーポイント（index.tsx）の作成完了
- [ ] 全コンポーネント・ユーティリティのTypeScript化完了
- [ ] Ant Designへの移行完了
- [ ] 画面接続なしでのビルド成功

## 3. 実装ステップ

### Phase 1: ディレクトリ構造準備 ✅ 完了
- [x] editorv2ディレクトリ作成
- [x] components, hooks, nodes, styles, utils, types サブディレクトリ作成

### Phase 2: 型定義作成 ✅ 完了
- [x] types/index.ts作成（全ての型定義を含む）

### Phase 3: エントリーポイント作成 ✅ 完了
- [x] index.tsx作成（ReactFlowProvider ラッパー）

### Phase 4: ユーティリティ関数変換（6ファイル）
**優先度: 高**（他のファイルの依存関係となるため先に変換）

- [ ] utils/documentParser.ts
  - MaiMLからDocument情報を抽出
  - 正規表現ベースのXMLパース
  
- [ ] utils/templateExtractor.ts
  - MaiMLからテンプレート情報を抽出
  - バリデーションエラーとの紐付け
  
- [ ] utils/xmlSignature.ts
  - XML署名生成・検証
  - セキュリティ関連
  
- [ ] utils/converters/reactFlowToMaiml.ts
  - React Flow形式からMaiML XML形式への変換
  - バリデーション機能
  
- [ ] utils/converters/multiMethodConverter.ts
  - 複数method対応の変換処理
  
- [ ] utils/converters/namespaceHandler.ts
  - 名前空間の取り込み・管理

### Phase 5: カスタムノード変換（2ファイル）
**優先度: 高**（ReactFlowの表示に必要）

参照元: `reference/frontend/src/components/PetriNetViewer/nodes/`

- [ ] nodes/MaterialTemplateNode.tsx
- [ ] nodes/ConditionTemplateNode.tsx  
- [ ] nodes/ResultTemplateNode.tsx
- [ ] nodes/TransitionNode.tsx

**注意**: 既存のPetriNetViewerのノードをそのまま使用する可能性もあるため、要確認

### Phase 6: カスタムフック変換（4ファイル）

- [ ] hooks/useHistory.ts
  - Undo/Redo履歴管理
  
- [ ] hooks/useWorkflow.ts
  - ワークフロー追加機能
  
- [ ] hooks/useDraftManager.ts
  - 自動保存・Draft管理
  
- [ ] hooks/useNamespaceOperations.ts
  - 名前空間操作

### Phase 7: 子コンポーネント変換（14ファイル）
**優先度: 中**（メインコンポーネントに依存）

#### ツールバー・UI制御
- [ ] components/EditorToolbar.tsx
- [ ] components/MethodTabPanel.tsx
- [ ] components/PropertyPanel.tsx

#### ダイアログ・パネル
- [ ] components/TemplateEditorDialog.tsx
- [ ] components/DocumentEditDialog.tsx
- [ ] components/SaveDialog.tsx
- [ ] components/SaveConfirmDialog.tsx
- [ ] components/ValidationPanel.tsx
- [ ] components/DraftManager.tsx
- [ ] components/WorkflowSelectorDialog.tsx

#### テンプレートビューア
- [ ] components/TemplateViewer/index.tsx
- [ ] components/TemplateViewer/TemplateList.tsx
- [ ] components/TemplateViewer/TemplateListView.tsx
- [ ] components/TemplateViewer/TemplateCard.tsx

### Phase 8: メインコンポーネント変換
**優先度: 低**（最後に統合）

- [ ] PetriNetEditorInner.tsx
  - 約2500行の大規模コンポーネント
  - 段階的に分割して変換を検討

### Phase 9: スタイル定義変換

- [ ] styles/editorTheme.ts (Material-UI → Ant Design)
- [ ] styles/errorStyles.css

### Phase 10: 統合テスト

- [ ] ビルドエラーの解消
- [ ] 型エラーの解消
- [ ] ESLint警告の解消
- [ ] 簡易的な動作確認（画面接続なし）

## 4. 影響範囲

### 変更するファイル
- 新規作成のみ（既存ファイルへの影響なし）

### 新規作成するファイル（約30ファイル）

```
frontend/src/components/editorv2/
├── index.tsx ✅
├── PetriNetEditorInner.tsx
├── types/
│   └── index.ts ✅
├── components/
│   ├── EditorToolbar.tsx
│   ├── MethodTabPanel.tsx
│   ├── PropertyPanel.tsx
│   ├── TemplateEditorDialog.tsx
│   ├── DocumentEditDialog.tsx
│   ├── SaveDialog.tsx
│   ├── SaveConfirmDialog.tsx
│   ├── ValidationPanel.tsx
│   ├── DraftManager.tsx
│   ├── WorkflowSelectorDialog.tsx
│   └── TemplateViewer/
│       ├── index.tsx
│       ├── TemplateList.tsx
│       ├── TemplateListView.tsx
│       └── TemplateCard.tsx
├── hooks/
│   ├── useHistory.ts
│   ├── useWorkflow.ts
│   ├── useDraftManager.ts
│   └── useNamespaceOperations.ts
├── nodes/
│   ├── MaterialTemplateNode.tsx
│   ├── ConditionTemplateNode.tsx
│   ├── ResultTemplateNode.tsx
│   └── TransitionNode.tsx
├── utils/
│   ├── documentParser.ts
│   ├── templateExtractor.ts
│   ├── xmlSignature.ts
│   └── converters/
│       ├── reactFlowToMaiml.ts
│       ├── multiMethodConverter.ts
│       └── namespaceHandler.ts
└── styles/
    ├── editorTheme.ts
    └── errorStyles.css
```

### 影響を受ける機能
- なし（独立したコンポーネントとして実装）

## 5. 技術的詳細

### Material-UI → Ant Designへの変換規則

#### コンポーネント対応表
| Material-UI | Ant Design | 備考 |
|------------|------------|------|
| Box | Space / Flex | レイアウトに応じて使い分け |
| Button | Button | propsの調整が必要 |
| Dialog | Modal | APIが異なる |
| TextField | Input | フォーム系 |
| Select | Select | オプション構造が異なる |
| Tabs | Tabs | items配列形式に変更 |
| CircularProgress | Spin | ローディング表示 |
| Alert | Alert | 基本的に同じ |
| Checkbox | Checkbox | 基本的に同じ |
| Radio | Radio | 基本的に同じ |

#### スタイリング変更
```typescript
// Material-UI
import { styled } from '@mui/material/styles';

// Ant Design
import styled from '@emotion/styled';
import { theme } from 'antd';
const { token } = theme.useToken();
```

### TypeScript化のポイント

1. **型定義の明示化**
   - すべてのpropsに型定義
   - useStateの型引数を明示
   - 関数の戻り値型を明示

2. **any型の排除**
   - 可能な限り具体的な型を使用
   - unknown型の活用

3. **null/undefinedの厳格な処理**
   - Optional Chaining (`?.`)の活用
   - Nullish Coalescing (`??`)の活用

### セキュリティ考慮事項
- [ ] XML署名検証の実装確認
- [ ] XSS対策（dangerouslySetInnerHTMLの使用箇所確認）
- [ ] ファイルアップロードのバリデーション

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Material-UIとAnt Designの機能差異 | 高 | 中 | 事前に対応表を作成し、代替実装を用意 |
| 大規模ファイルの変換ミス | 高 | 中 | 段階的に分割して変換、都度確認 |
| 型エラーの大量発生 | 中 | 高 | any型を一時的に許容し、段階的に修正 |
| ReactFlow APIの差異 | 中 | 低 | 現行の実装を参考にする |
| ビルド時間の増加 | 低 | 中 | 影響は限定的 |

## 7. テスト計画

### ユニットテスト
- 各ユーティリティ関数のテスト
- カスタムフックのテスト

### 統合テスト
- コンポーネントの結合テスト
- ReactFlowとの統合テスト

### 手動テスト
- [ ] エディタ起動確認
- [ ] ノード追加・削除
- [ ] エッジ接続
- [ ] テンプレート編集
- [ ] ファイル保存・読込

## 8. ロールバック計画

問題が発生した場合の対応:

1. **部分的なロールバック**
   - 問題のあるファイルのみを削除
   - Git履歴から復元

2. **完全なロールバック**
   - editorv2ディレクトリ全体を削除
   - 影響なし（独立コンポーネント）

## 9. 関連ドキュメント

- [フロントエンド規約](../../.clinerules/development/frontend.md)
- [UI設計ポリシー](../../.clinerules/references/ui_policy.md)
- [TypeScript規約](../../.clinerules/development/config.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-29 09:47
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 11. 実施記録

### 実施日時
開始: 2026-01-29 09:47

### 進捗状況

#### Phase 1: ディレクトリ構造準備 ✅ 完了
- 完了日時: 2026-01-29 09:47
- 結果: 成功

#### Phase 2: 型定義作成 ✅ 完了
- 完了日時: 2026-01-29 09:47
- 結果: 成功
- 備考: ESLint警告（any型）は後で修正

#### Phase 3: エントリーポイント作成 ✅ 完了
- 完了日時: 2026-01-29 09:47
- 結果: 成功
- 備考: PetriNetEditorInnerへの参照エラーは後続作業で解消

#### Phase 4-10: （未着手）

### 計画からの変更点
- なし

### 発生した問題と解決方法
- なし

### 最終的な成果物
- （Phase 4以降で記録）

## 12. 振り返り

### うまくいった点
- 型定義を先に作成することで、後続の実装がスムーズになる見込み
- ディレクトリ構造を整理したことで、依存関係が明確になった

### 改善が必要な点
- 大規模ファイル（PetriNetEditorInner）の変換戦略を事前に検討する必要がある

### 学んだこと
- Material-UIからAnt Designへの移行は、コンポーネント対応表を作成することで効率化できる
- 段階的な変換アプローチが有効

## 13. 次のステップ

1. **Phase 4: ユーティリティ関数変換**
   - documentParser.tsから開始
   - 依存関係の少ないものから順に変換

2. **Phase 5: カスタムノード確認**
   - 既存のPetriNetViewerノードが使用可能か確認
   - 必要に応じて複製または参照

3. **Phase 6-7: フック・コンポーネント変換**
   - 小さなコンポーネントから順に変換

4. **Phase 8: メインコンポーネント統合**
   - 最後にPetriNetEditorInner.tsxを変換

5. **Phase 9-10: スタイル・テスト**
   - ビルド確認とエラー修正