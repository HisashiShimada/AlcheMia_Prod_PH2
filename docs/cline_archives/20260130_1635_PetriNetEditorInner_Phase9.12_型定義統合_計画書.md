# Phase9.12: 型定義統合計画書

## メタデータ
- **作成日時**: 2026-01-30 15:38
- **タスクID**: Phase9.12
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

editorv2ディレクトリ内に分散している独自の型定義を抽出し、`types/index.ts`にまとめた後、`types/editorTypes.ts`の型定義と統合して内容的に同じものがある場合はすべて型定義を統一する。

## 2. 目的と期待される成果

### 目的
- 型定義の重複を解消
- 型定義の一貫性を確保
- インポートパスを整理
- 保守性を向上

### 期待される成果
- [x] types/index.tsとtypes/editorTypes.tsの重複型定義を特定
- [ ] 統一された型定義ファイル構造
- [ ] 全ファイルでの型インポートパスの統一
- [ ] 型エラーゼロの状態

## 3. 現状分析

### types/index.ts の型定義（PetriNetEditorV2用）
- NodeType, PlaceType, EditorNodeType
- NodeData（基本型）
- Property, TemplateRef, Template
- RefObject, Creator, Vendor, Owner, Instrument, DocumentData
- MethodInfo, MethodData（ReactFlowのNode[]を持つ）
- ValidationError, ValidationWarning, ValidationResult
- WorkflowFile, WorkflowData
- DraftData（完全な構造）
- HistoryState, HistoryEntry
- NamespaceInfo, NamespaceTemplate
- 各種コンポーネントProps型
- 各種Hook戻り値型

### types/editorTypes.ts の型定義（PetriNetEditorInner用）
- NodeData（index.tsのImportedNodeDataを拡張）
- EdgeData
- DocumentData（index.tsのImportedDocumentDataを拡張）
- Method（ReactFlowのNode[]を持つ）
- MethodData（API取得直後、places/transitions/arcsを持つ）
- DraftData（簡易版、nodes/arcs/edgesを持つ）
- FileInfo
- ClipboardData
- TemplateRef（index.tsから再エクスポート）
- PetriNetEditorInnerProps
- PetriNetEditorInnerUIProps（巨大なProps型）
- SetState, HistoryState

### 重複している型定義

| 型名 | index.ts | editorTypes.ts | 内容の違い |
|------|----------|----------------|-----------|
| NodeData | ✓ 基本型 | ✓ 拡張型 | editorTypesは追加プロパティあり |
| DocumentData | ✓ 基本型 | ✓ 拡張型 | editorTypesは単数形プロパティ追加 |
| MethodData | ✓ ReactFlow型 | ✓ API取得型 | 構造が異なる |
| DraftData | ✓ 完全版 | ✓ 簡易版 | 構造が異なる |
| HistoryState | ✓ 完全版 | ✓ 簡易版 | 構造が異なる |
| TemplateRef | ✓ 定義 | ✓ 再エクスポート | 同じ |
| ValidationError | ✓ 定義 | ✓ 再エクスポート | 同じ |
| ValidationResult | ✓ 定義 | ✓ 再エクスポート | 同じ |

## 4. 統合方針

### 基本方針
1. **types/index.ts**: 共通基盤型定義（PetriNetEditorV2系）
2. **types/editorTypes.ts**: PetriNetEditorInner専用拡張型

### 具体的な統合ルール

#### ルール1: 同名で構造が異なる型
→ 異なる名前にリネームして両方残す

```typescript
// index.ts
export interface MethodData {  // ReactFlow形式
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
}

// editorTypes.ts
export interface MethodDataRaw {  // API取得直後形式（リネーム）
  methodId: string;
  places?: any[];
  transitions?: any[];
  arcs?: any[];
}
```

#### ルール2: 拡張関係にある型
→ editorTypes.tsでindex.tsから型をimportして拡張

```typescript
// editorTypes.ts
import type { NodeData as BaseNodeData } from './index';

export type NodeData = BaseNodeData & {
  isNewTemplate?: boolean;
  templateCategory?: string;
  methodId?: string | null;
  // ...
};
```

#### ルール3: 完全に同じ型
→ index.tsに定義を残し、editorTypes.tsでは再エクスポートのみ

```typescript
// editorTypes.ts
export type {
  ValidationError,
  ValidationResult,
  Property,
} from './index';
```

## 5. 実装ステップ

### Step 1: editorTypes.tsの型定義を整理
- [ ] 重複型を特定
- [ ] リネームが必要な型を決定
- [ ] import文を整理

### Step 2: 型定義の統合実装
- [ ] editorTypes.tsを更新
  - 重複型を削除
  - 必要な型をindex.tsからimport
  - 独自型のみ残す
- [ ] 型の再エクスポートを整理

### Step 3: 全ファイルのインポートパスを修正
- [ ] PetriNetEditorInner.tsx
- [ ] 各handlerファイル
- [ ] 各utilsファイル
- [ ] 各loaderファイル

### Step 4: 型チェック
- [ ] `npm run type-check`実行
- [ ] エラー修正

## 6. 統合後の型定義ファイル構造

### types/index.ts（共通基盤型）
```typescript
// ReactFlowの基本型
import { Node, Edge, Viewport } from 'reactflow';

// ノード関連
export type NodeType = 'place' | 'transition';
export type PlaceType = 'material' | 'condition' | 'result';
export interface NodeData { /* 基本定義 */ }

// テンプレート関連
export interface Property { /* ... */ }
export interface TemplateRef { /* ... */ }
export interface Template { /* ... */ }

// Document関連
export interface DocumentData { /* ... */ }

// Method関連（ReactFlow形式）
export interface MethodData {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
}

// Validation関連
export interface ValidationError { /* ... */ }
export interface ValidationResult { /* ... */ }

// Draft関連（完全版）
export interface DraftData {
  id: string;
  timestamp: number;
  name: string;
  description?: string;
  methods: MethodData[];
  document: DocumentData;
  templates: Template[];
}

// 履歴関連
export interface HistoryState {
  methods: MethodData[];
  document: DocumentData;
  templates: Template[];
}

// コンポーネントProps型
// Hook戻り値型
```

### types/editorTypes.ts（PetriNetEditorInner専用）
```typescript
import type { Node, Edge, Connection } from 'reactflow';
import type { 
  NodeData as BaseNodeData,
  DocumentData as BaseDocumentData,
  NodeType,
  PlaceType,
  ValidationError,
  ValidationResult,
  Property,
  TemplateRef,
} from './index';

// 拡張型定義
export type NodeData = BaseNodeData & {
  isNewTemplate?: boolean;
  templateCategory?: string;
  methodId?: string | null;
  // ...
};

export type DocumentData = BaseDocumentData & {
  creator?: { id: string; name: string };
  vendor?: { id: string; name: string };
  // ...
};

// 独自型定義
export interface EdgeData { /* ... */ }

export interface MethodDataRaw {  // リネーム
  methodId: string;
  places?: any[];
  transitions?: any[];
  arcs?: any[];
}

export interface Method {  // editorTypes.ts専用のMethod
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  viewport: { x: number; y: number; zoom: number };
}

export interface DraftDataSimple {  // リネーム
  nodes: Node<NodeData>[];
  arcs?: Edge<EdgeData>[];
  edges?: Edge<EdgeData>[];
  documentData?: DocumentData;
}

export interface FileInfo { /* ... */ }
export interface ClipboardData { /* ... */ }

// PetriNetEditorInner専用Props型
export interface PetriNetEditorInnerProps { /* ... */ }
export interface PetriNetEditorInnerUIProps { /* ... */ }

// 再エクスポート
export type {
  NodeType,
  PlaceType,
  ValidationError,
  ValidationResult,
  Property,
  TemplateRef,
};
```

## 7. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/types/editorTypes.ts` - 型定義の統合
2. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - importパス修正
3. `frontend/src/components/editorv2/handlers/*.ts` - importパス修正
4. `frontend/src/components/editorv2/utils/*.ts` - importパス修正
5. `frontend/src/components/editorv2/loaders/*.ts` - importパス修正
6. `frontend/src/components/editorv2/components/*.tsx` - importパス修正

### 新規作成するファイル
なし

### 削除するファイル
なし

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型の不整合による実行時エラー | 高 | 中 | 段階的に統合、各段階でテスト |
| importパス修正漏れ | 中 | 中 | grepで全ファイル検索、型チェック実行 |
| 既存コードの破壊 | 高 | 低 | リネーム時は慎重に、git diffで確認 |

## 9. テスト計画

### 型チェック
- [ ] `npm run type-check` - 型エラーゼロを確認
- [ ] VSCodeでの型エラー表示確認

### 動作確認
- [ ] エディタ起動確認
- [ ] ノード追加・削除
- [ ] テンプレート編集
- [ ] ファイル保存

## 10. ロールバック計画

問題が発生した場合：
1. git resetで変更前の状態に戻す
2. 段階的統合を再実行

## 11. 関連ドキュメント

- [Phase9.11完了報告](./20260130_1610_PetriNetEditorInner_Phase9.11_完了報告.md)
- [Phase9.10完了報告](./20260130_1600_PetriNetEditorInner_Phase9.10_完了報告.md)

## 12. 承認記録

- **計画書提示日時**: 2026-01-30 15:38
- **承認日時**: （承認待ち）
- **承認者コメント**: -