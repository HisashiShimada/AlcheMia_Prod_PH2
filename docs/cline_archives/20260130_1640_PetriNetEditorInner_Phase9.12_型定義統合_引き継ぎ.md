# Phase9.12: 型定義統合 - 引き継ぎ資料

## メタデータ
- **作成日時**: 2026-01-30 15:40
- **フェーズ**: Phase9.12
- **タスク**: 型定義統合作業
- **ステータス**: 計画完了、実装準備完了

## 1. 作業概要

### 目的
editorv2ディレクトリ内の型定義ファイル（`types/index.ts`と`types/editorTypes.ts`）を統合し、重複を解消して型定義の一貫性を確保する。

### 完了した作業
- [x] types/index.tsの型定義を確認
- [x] types/editorTypes.tsの型定義を確認
- [x] 重複・統合可能な型定義を特定
- [x] 統合計画書を作成

### 未完了の作業
- [ ] editorTypes.tsの型定義を整理
- [ ] 型定義の統合実装
- [ ] 全ファイルのインポートパスを修正
- [ ] 型チェック・動作確認
- [ ] 完了報告書の作成

## 2. 現状分析結果

### types/index.ts（PetriNetEditorV2用 - 共通基盤型）
**役割**: ReactFlow形式のPetriNetEditorV2系コンポーネントで使用する基本型定義

**主要な型定義**:
- ノード関連: `NodeType`, `PlaceType`, `EditorNodeType`, `NodeData`（基本型）
- テンプレート関連: `Property`, `TemplateRef`, `Template`, `TemplateMap`
- Document関連: `RefObject`, `Creator`, `Vendor`, `Owner`, `Instrument`, `DocumentData`
- Method関連: `MethodInfo`, `MethodData`（ReactFlow形式）
- Validation関連: `ValidationError`, `ValidationWarning`, `ValidationResult`
- Workflow関連: `WorkflowFile`, `WorkflowData`
- Draft関連: `DraftData`（完全版）
- 履歴関連: `HistoryState`, `HistoryEntry`
- 名前空間関連: `NamespaceInfo`, `NamespaceTemplate`
- コンポーネントProps型: 各種ダイアログ、パネル、ツールバー等
- Hook戻り値型: `UseHistoryReturn`, `UseWorkflowReturn`等

### types/editorTypes.ts（PetriNetEditorInner用 - 専用拡張型）
**役割**: PetriNetEditorInner固有の型定義と、index.tsの型を拡張した型

**主要な型定義**:
- 拡張型:
  - `NodeData` - index.tsのNodeDataを拡張（`isNewTemplate`, `templateCategory`, `methodId`等を追加）
  - `DocumentData` - index.tsのDocumentDataを拡張（単数形プロパティ`creator`, `vendor`等を追加）
- 独自型:
  - `EdgeData` - エッジ専用のデータ型
  - `Method` - editorTypes専用のMethod型
  - `MethodData` - API取得直後の形式（places/transitions/arcsを持つ）
  - `DraftData` - 簡易版（nodes/arcs/edgesのみ）
  - `FileInfo` - ファイル選択用
  - `ClipboardData` - クリップボード操作用
- Props型:
  - `PetriNetEditorInnerProps`
  - `PetriNetEditorInnerUIProps`（巨大なProps型）
- その他:
  - `SetState`, `HistoryState`（簡易版）

### 重複型定義の一覧

| 型名 | index.ts | editorTypes.ts | 統合方針 |
|------|----------|----------------|----------|
| **NodeData** | ✓ 基本型 | ✓ 拡張型 | editorTypesでindex.tsから継承 |
| **DocumentData** | ✓ 基本型 | ✓ 拡張型 | editorTypesでindex.tsから継承 |
| **MethodData** | ✓ ReactFlow型 | ✓ API取得型 | editorTypesの型を`MethodDataRaw`にリネーム |
| **DraftData** | ✓ 完全版 | ✓ 簡易版 | editorTypesの型を`DraftDataSimple`にリネーム |
| **HistoryState** | ✓ 完全版 | ✓ 簡易版 | editorTypesの型を削除し、独自定義不要 |
| **TemplateRef** | ✓ 定義 | ✓ 再エクスポート | 現状維持（再エクスポートのみ） |
| **ValidationError** | ✓ 定義 | ✓ 再エクスポート | 現状維持（再エクスポートのみ） |
| **ValidationResult** | ✓ 定義 | ✓ 再エクスポート | 現状維持（再エクスポートのみ） |
| **Property** | ✓ 定義 | ✓ 再エクスポート | 現状維持（再エクスポートのみ） |

## 3. 統合方針

### 基本方針
1. **types/index.ts**: 共通基盤型定義（変更なし）
2. **types/editorTypes.ts**: PetriNetEditorInner専用型のみに絞る

### 統合ルール

#### ルール1: 同名で構造が異なる型 → リネーム
```typescript
// editorTypes.ts - 変更前
export interface MethodData {
  methodId: string;
  places?: any[];
  transitions?: any[];
  arcs?: any[];
}

// editorTypes.ts - 変更後
export interface MethodDataRaw {  // リネーム
  methodId: string;
  places?: any[];
  transitions?: any[];
  arcs?: any[];
}
```

#### ルール2: 拡張関係にある型 → importして拡張
```typescript
// editorTypes.ts - 変更前
import type { 
  NodeData as ImportedNodeData,
  DocumentData as ImportedDocumentData,
} from '../types';

export type NodeData = ImportedNodeData & { /* 拡張 */ };
export type DocumentData = ImportedDocumentData & { /* 拡張 */ };

// editorTypes.ts - 変更後（importパスを修正）
import type { 
  NodeData as BaseNodeData,
  DocumentData as BaseDocumentData,
} from './index';

export type NodeData = BaseNodeData & { /* 拡張 */ };
export type DocumentData = BaseDocumentData & { /* 拡張 */ };
```

#### ルール3: 完全に同じ型 → 再エクスポート
```typescript
// editorTypes.ts - 現状維持
export type {
  NodeType,
  PlaceType,
  ValidationError,
  ValidationResult,
  Property,
  TemplateRef,
} from './index';
```

## 4. 実装手順（Step by Step）

### Step 1: editorTypes.tsの型定義整理

**作業内容**:
1. importパスを`'../types'`から`'./index'`に修正
2. リネームが必要な型を特定
   - `MethodData` → `MethodDataRaw`
   - `DraftData` → `DraftDataSimple`
3. 不要なHistoryState定義を削除（index.tsのものを使用）

### Step 2: editorTypes.tsの実装

**変更箇所**:
```typescript
// ===== import文の修正 =====
// 変更前
import type { 
  NodeData as ImportedNodeData, 
  NodeType,
  PlaceType,
  ValidationError,
  ValidationResult,
  Property,
  TemplateRef as ImportedTemplateRef,
  DocumentData as ImportedDocumentData,
} from '../types';

// 変更後
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

// ===== 型定義のリネーム =====
// MethodData → MethodDataRaw
export interface MethodDataRaw {  // リネーム
  methodId: string;
  places?: any[];
  transitions?: any[];
  arcs?: any[];
}

// DraftData → DraftDataSimple
export interface DraftDataSimple {  // リネーム
  nodes: Node<NodeData>[];
  arcs?: Edge<EdgeData>[];
  edges?: Edge<EdgeData>[];
  documentData?: DocumentData;
}

// ===== 不要な型定義を削除 =====
// HistoryState（簡易版）を削除 - index.tsのものを使用
```

### Step 3: 影響を受けるファイルのimport修正

**修正が必要なファイル**（予測）:
1. `PetriNetEditorInner.tsx` - MethodDataRaw, DraftDataSimpleの使用箇所
2. `loaders/maimlLoader.ts` - MethodDataRawの使用箇所
3. `utils/converters/*.ts` - MethodDataRawの使用箇所
4. その他editorTypes.tsをimportしているファイル

**検索コマンド**:
```bash
# MethodDataを使用しているファイルを検索
grep -r "MethodData" frontend/src/components/editorv2/ --include="*.ts" --include="*.tsx"

# DraftDataを使用しているファイルを検索
grep -r "DraftData" frontend/src/components/editorv2/ --include="*.ts" --include="*.tsx"
```

### Step 4: 型チェックと動作確認

**確認項目**:
- [ ] `npm run type-check` - 型エラーゼロ
- [ ] VSCodeでの型エラー表示なし
- [ ] エディタ起動確認
- [ ] ファイル読み込み動作確認

## 5. 注意事項

### 重要な注意点
1. **型名のリネームは慎重に**: MethodData, DraftDataは多くの箇所で使用されている可能性あり
2. **importパスの一貫性**: すべて`'./index'`または`'./editorTypes'`から統一してimport
3. **index.tsは変更しない**: PetriNetEditorV2系に影響を与えないため
4. **段階的な確認**: 各ステップごとに型チェックを実行

### トラブルシューティング

#### 問題1: 型エラーが大量発生
**対策**: git resetして最初からやり直し、より慎重に進める

#### 問題2: リネーム後に参照エラー
**対策**: VSCodeの「シンボルの名前変更」機能を使用する、またはgrepで全検索して手動修正

## 6. 期待される成果

### 統合後のファイル構造

#### types/index.ts
```typescript
/**
 * 共通基盤型定義（PetriNetEditorV2系）
 * 変更なし
 */
```

#### types/editorTypes.ts
```typescript
/**
 * PetriNetEditorInner専用型定義
 * 
 * 変更点:
 * - importパスを'./index'に統一
 * - MethodData → MethodDataRaw（リネーム）
 * - DraftData → DraftDataSimple（リネーム）
 * - HistoryState（簡易版）削除
 */
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

// 拡張型
export type NodeData = BaseNodeData & { /* ... */ };
export type DocumentData = BaseDocumentData & { /* ... */ };

// 独自型（リネーム済み）
export interface EdgeData { /* ... */ }
export interface MethodDataRaw { /* ... */ }  // リネーム
export interface Method { /* ... */ }
export interface DraftDataSimple { /* ... */ }  // リネーム
export interface FileInfo { /* ... */ }
export interface ClipboardData { /* ... */ }

// Props型
export interface PetriNetEditorInnerProps { /* ... */ }
export interface PetriNetEditorInnerUIProps { /* ... */ }

// ユーティリティ型
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

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

### メリット
- ✅ 型定義の重複解消
- ✅ インポートパスの一貫性確保
- ✅ 型の役割が明確化
- ✅ 保守性の向上

## 7. 次のアクション

### 次セッションで実施すべき作業

1. **Step 1実施**: editorTypes.tsのimportパス修正
2. **Step 2実施**: 型のリネーム実装
3. **Step 3実施**: 影響ファイルの修正
4. **Step 4実施**: 型チェック・動作確認
5. **完了報告**: Phase9.12完了報告書の作成

### 推奨作業時間
- 1時間程度（型チェックとデバッグ含む）

## 8. 参考資料

- [Phase9.12計画書](./20260130_1635_PetriNetEditorInner_Phase9.12_型定義統合_計画書.md)
- [Phase9.11完了報告](./20260130_1610_PetriNetEditorInner_Phase9.11_完了報告.md)
- [types/index.ts](../../frontend/src/components/editorv2/types/index.ts)
- [types/editorTypes.ts](../../frontend/src/components/editorv2/types/editorTypes.ts)

## 9. 作業チェックリスト

### 実装前チェック
- [x] 計画書の作成
- [x] 型定義の分析完了
- [x] 統合方針の決定
- [x] 引き継ぎ書類の作成

### 実装中チェック（次セッション）
- [ ] Step 1: editorTypes.tsのimportパス修正
- [ ] Step 2: 型定義のリネーム実装
- [ ] Step 3: 影響ファイルの修正
- [ ] Step 4: 型チェック実行
- [ ] 動作確認

### 完了後チェック
- [ ] 型エラーゼロ確認
- [ ] エディタ起動・動作確認
- [ ] git commitの準備
- [ ] 完了報告書の作成

---

**作成者**: Cline AI  
**日時**: 2026-01-30 15:40  
**ステータス**: 計画完了、実装待ち