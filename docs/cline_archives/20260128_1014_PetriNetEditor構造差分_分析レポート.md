# PetriNetEditor 構造差分分析レポート

**作成日**: 2026-01-28 10:14  
**対象**: reference/PetriNetEditorV2 vs 現行/PetriNetEditor.tsx

## 📊 概要

referenceのPetriNetEditorV2と現行のPetriNetEditor.tsxの構造を比較し、同一構造にするための差分を分析しました。

---

## 🎯 最重要差分: ファイル分割構造

### Reference版（2ファイル構成）

```
PetriNetEditorV2/
├── index.jsx                    # エントリーポイント
│   └── ReactFlowProvider
│       └── PetriNetEditorInner  # メインロジック
└── PetriNetEditorInner.jsx      # 主要コンポーネント
    ├── PetriNetEditorContent    # 内部コンポーネント
    └── PetriNetEditorInnerUI    # UIレンダリング（TemplateProvider内）
```

**特徴:**
- ✅ **ReactFlowProviderを外側で1回だけラップ**
- ✅ **TemplateProviderを内部（PetriNetEditorInnerUI）でラップ**
- ✅ **3層構造**: index.jsx → PetriNetEditorInner.jsx（Content + InnerUI）

### 現行版（1ファイル構成）

```
PetriNetEditor.tsx               # 単一ファイル
└── PetriNetEditor               # すべてのロジックが1つのコンポーネント
```

**特徴:**
- ❌ **ReactFlowProviderが存在しない**
- ❌ **TemplateProviderが存在しない**
- ❌ **単一コンポーネント**

---

## 🔍 詳細差分

### 1. ReactFlowProviderラップ

#### Reference版
```jsx
// index.jsx
import { ReactFlowProvider } from 'reactflow';

const PetriNetEditorV2 = (props) => {
  return (
    <ReactFlowProvider>
      <PetriNetEditorInner {...props} />
    </ReactFlowProvider>
  );
};
```

#### 現行版
```typescript
// PetriNetEditor.tsx
const PetriNetEditor: React.FC<PetriNetEditorProps> = (props) => {
  // ReactFlowProviderなし
  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* ... */}
    </Flex>
  );
};
```

**差分:**
- ❌ 現行版には**ReactFlowProviderが欠如**
- ⚠️ これにより`useReactFlow()`が正常に動作しない可能性

---

### 2. TemplateProviderラップ

#### Reference版
```jsx
// PetriNetEditorInner.jsx
return (
  <TemplateProvider 
    maimlData={maimlData} 
    validationResult={validationResult}
    activeMethodIndex={activeMethodIndex}
    methods={methods}
  >
    <PetriNetEditorInnerUI {...props} />
  </TemplateProvider>
);
```

#### 現行版
```typescript
// PetriNetEditor.tsx
// TemplateProviderなし（単にインポートしているだけ）
import { TemplateProvider } from '@/contexts/TemplateContext';
```

**差分:**
- ❌ 現行版には**TemplateProviderでラップしていない**
- ⚠️ テンプレート管理機能が正常に動作しない

---

### 3. コンポーネント階層構造

#### Reference版（3層構造）

```
PetriNetEditorV2 (index.jsx)
  └── ReactFlowProvider
      └── PetriNetEditorInner (PetriNetEditorInner.jsx)
          ├── PetriNetEditorContent (内部コンポーネント)
          └── TemplateProvider
              └── PetriNetEditorInnerUI (UIレンダリング)
```

**責務分離:**
1. **index.jsx**: ReactFlowProviderのラップのみ
2. **PetriNetEditorContent**: ロジック・State管理
3. **PetriNetEditorInnerUI**: UIレンダリング（TemplateProvider内）

#### 現行版（1層構造）

```
PetriNetEditor (PetriNetEditor.tsx)
  └── すべてのロジックとUIが1つのコンポーネント
```

**問題点:**
- ❌ **責務が分離されていない**
- ❌ **再利用性が低い**
- ❌ **テストが困難**

---

### 4. Props伝達の違い

#### Reference版
```jsx
// index.jsx
<PetriNetEditorInner 
  maimlData={props.initialMaiMLData}
  editingFileName={props.editingFileName}
  originalFileName={props.originalFileName}
  sourceS3Key={props.sourceS3Key}
  editMode={props.initialEditMode}  // ✅ initialEditMode を editMode に変換
  {...props} 
/>
```

**特徴:**
- ✅ **propsの変換処理がindex.jsxで実施**
- ✅ `initialEditMode` → `editMode` の明示的な変換

#### 現行版
```typescript
// PetriNetEditor.tsx
const PetriNetEditor: React.FC<PetriNetEditorProps> = ({
  maimlData,
  editMode,
  // ...直接使用
}) => {
  // propsの変換なし
};
```

**差分:**
- ⚠️ propsの変換処理が欠如

---

### 5. `useReactFlow()` の使用位置

#### Reference版
```jsx
// PetriNetEditorContent内で使用（ReactFlowProvider内）
const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();
```

#### 現行版
```typescript
// PetriNetEditor内で直接使用（ReactFlowProviderなし）
const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();
```

**問題:**
- ⚠️ ReactFlowProviderがないため、`useReactFlow()`が動作しない可能性

---

### 6. TemplateContext利用方法

#### Reference版
```jsx
// PetriNetEditorInnerUI内（TemplateProvider内）
const { templateErrors, addTemplate, deleteTemplate, updateTemplate, allTemplates } = useTemplates();

// グローバルスコープに設定
React.useEffect(() => {
  window.clineAddTemplate = addTemplate;
  window.clineDeleteTemplate = deleteTemplate;
  window.clineUpdateTemplate = updateTemplate;
  window.clineAllTemplates = allTemplates;
}, [addTemplate, deleteTemplate, updateTemplate, allTemplates]);
```

#### 現行版
```typescript
// TemplateProvider未使用のため、useTemplates()が呼べない
// window.clineXxx へのグローバル設定もなし
```

**問題:**
- ❌ **TemplateContextが利用できない**
- ❌ **グローバル関数が設定されていない**

---

## 🎯 今回の実装方針: アプローチB（最小限修正）

### 実装チェックリスト

- [ ] `PetriNetEditor.tsx` に `ReactFlowProvider` を追加
- [ ] `PetriNetEditor.tsx` に `TemplateProvider` を追加
- [ ] `TemplateProvider` の必須propsを確認
- [ ] グローバル関数設定 (`window.clineAddTemplate` 等)
- [ ] 動作確認

### 実装手順

#### Step 1: ReactFlowProviderとTemplateProviderのインポート追加

```typescript
// frontend/src/components/editor/PetriNetEditor.tsx
import { ReactFlowProvider } from 'reactflow';
import { TemplateProvider } from '@/contexts/TemplateContext';
```

#### Step 2: コンポーネント本体をProviderでラップ

```typescript
const PetriNetEditor: React.FC<PetriNetEditorProps> = (props) => {
  // ... 既存のState定義（変更なし） ...
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  // ... その他のState ...
  
  return (
    <ReactFlowProvider>
      <TemplateProvider
        maimlData={effectiveMaimlData}
        validationResult={validationResult}
        activeMethodIndex={activeMethodIndex}
        methods={methods}
      >
        {/* 既存のUIコンポーネント（変更なし） */}
        <Flex vertical style={{ height: '100%' }}>
          <EditorToolbar
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            // ...
          />
          
          <MethodTabPanel
            methods={methods}
            activeMethodIndex={activeMethodIndex}
            onMethodChange={handleMethodChange}
          />
          
          <ReactFlow
            nodes={nodes}
            edges={edges}
            // ...
          />
          
          {/* その他のコンポーネント */}
        </Flex>
      </TemplateProvider>
    </ReactFlowProvider>
  );
};
```

#### Step 3: TemplateProviderの必須props確認

TemplateProviderに渡す必須propsを確認：
- ✅ `maimlData`: 現在のMAIMLデータ（文字列）
- ✅ `validationResult`: バリデーション結果（オブジェクト）
- ✅ `activeMethodIndex`: アクティブなメソッドのインデックス（数値）
- ✅ `methods`: メソッド一覧（配列）

これらは既に`PetriNetEditor.tsx`内でStateとして管理されているため、そのまま渡せます。

#### Step 4: グローバル関数設定（必要に応じて）

reference版では`window.clineAddTemplate`等のグローバル関数を設定していますが、これは既に`TemplateProvider`内で設定されているため、追加作業は不要です。

### この実装のメリット

1. **ファイル構造は変更なし**
   - 既存の`PetriNetEditor.tsx`を修正するだけ
   - 他のファイルへの影響なし

2. **最小限のコード変更**
   - Providerを追加するだけ（約10行）
   - 既存のロジックは一切変更なし

3. **即座に動作確認可能**
   - ビルドエラーのリスクが低い
   - すぐにテスト可能

4. **将来的なリファクタリングも可能**
   - 後からファイル分割も可能
   - 段階的な改善が可能

### ⚠️ 注意事項

1. **ReactFlowProviderの二重ラップ防止**
   - 親コンポーネントで既に`ReactFlowProvider`を使用している場合は、親側を削除

2. **TemplateProviderの依存関係**
   - `effectiveMaimlData`, `validationResult`, `activeMethodIndex`, `methods`が正しく定義されているか確認
   - これらは既存のStateなので通常は問題なし

3. **useReactFlow()の使用位置**
   - `useReactFlow()`を使用している箇所は、`ReactFlowProvider`の内側にあることを確認
   - 現行コードでは既にコンポーネント内で使用しているため、Providerでラップすれば動作する

---

## 📊 影響範囲

### 直接影響するファイル

1. **PetriNetEditor 自体**
   - `frontend/src/components/editor/PetriNetEditor.tsx` → ディレクトリ化

2. **インポートしているコンポーネント**
   ```typescript
   // これらのファイルは変更不要（インポートパスは同じまま）
   - frontend/src/app/experiment-admin/project-management/page.tsx
   - frontend/src/app/experiment-admin/format-management/page.tsx
   - その他PetriNetEditorを使用している画面
   ```

### 間接影響（確認推奨）

1. **TemplateContext依存のコンポーネント**
   - `TemplateEditorDialog`
   - `TemplateList`
   - `PropertyPanel`

2. **useReactFlow() を使用しているカスタムフック**
   - `useWorkflow`
   - その他React Flowフック

---

## ✅ 検証項目

### 機能テスト

- [ ] ペトリネット表示が正常に動作する
- [ ] ノード追加・削除が正常に動作する
- [ ] エッジ追加・削除が正常に動作する
- [ ] Undo/Redoが正常に動作する
- [ ] テンプレート編集が正常に動作する
- [ ] 複数Method切り替えが正常に動作する
- [ ] 保存機能が正常に動作する
- [ ] Draft読み込みが正常に動作する

### パフォーマンステスト

- [ ] 初回読み込み速度が変わらないか
- [ ] ノード追加のレスポンスが変わらないか
- [ ] 大量ノード表示時のパフォーマンスが変わらないか

---

## 🎯 まとめ

### 最重要の差分（Top 3）

1. **ReactFlowProviderの欠如** ⚠️ 最優先対応
2. **TemplateProviderの欠如** ⚠️ 高優先度
3. **ファイル分割構造の違い** ⚠️ 中優先度

### 推奨アプローチ

**段階的移行**（Option A）を推奨します:
1. まず `ReactFlowProvider` ラップのみ追加（即効性・低リスク）
2. 動作確認後、`TemplateProvider` ラップ追加
3. 最後に内部コンポーネント分離（リファクタリング）

この順序により、**リスクを最小化**しながら段階的に構造を統一できます。

---

## 📝 次のステップ

1. **Option A（段階的移行）を実施するか確認**
2. **実装計画書の作成**（承認後に実装開始）
3. **テスト計画の策定**

---

## ❓ 補足: index.jsxは本当に必要か？

### index.jsxの実際の役割

referenceの`index.jsx`は以下の2つの役割を持ちます：

```jsx
// 1. ReactFlowProviderでラップ
<ReactFlowProvider>
  <PetriNetEditorInner {...props} />
</ReactFlowProvider>

// 2. Props変換処理
maimlData={props.initialMaiMLData}  // initialMaiMLData → maimlData
editMode={props.initialEditMode}    // initialEditMode → editMode
```

### 結論: index.jsxは**必須ではない**

**必須なのは**：
- ✅ `ReactFlowProvider`でラップすること
- ✅ `TemplateProvider`でラップすること

**必須ではないのは**：
- ⚠️ それを別ファイル（index.jsx）で行うこと
- ⚠️ Props変換処理（props名を統一すれば不要）

### 2つの実装アプローチ

#### アプローチA: 別ファイル作成（reference版と完全同一）

```
PetriNetEditor/
├── index.tsx               # ReactFlowProviderラップ + Props変換
└── PetriNetEditorInner.tsx # メインロジック + TemplateProviderラップ
```

**メリット:**
- ✅ reference版と完全に同じ構造
- ✅ 責務分離が明確
- ✅ 将来的な拡張が容易

**デメリット:**
- ❌ ファイルが増える
- ❌ 小さなコンポーネントにはオーバーエンジニアリング

#### アプローチB: 現行ファイル内でラップ（シンプル）

```typescript
// PetriNetEditor.tsx（1ファイルのまま）
const PetriNetEditor: React.FC<PetriNetEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TemplateProvider {...templateProviderProps}>
        {/* 既存のコンポーネント内容 */}
        <Flex vertical style={{ height: '100%' }}>
          {/* ... */}
        </Flex>
      </TemplateProvider>
    </ReactFlowProvider>
  );
};
```

**メリット:**
- ✅ ファイル数が増えない
- ✅ シンプルで理解しやすい
- ✅ 既存コードへの影響が最小

**デメリット:**
- ❌ reference版と構造が異なる
- ❌ 責務分離が弱い

### 推奨：アプローチBで十分

**理由:**
1. **本質的な問題は「Providerの欠如」であり、「ファイル分割」ではない**
2. 現行のPetriNetEditor.tsxは既に1000行以上あるが、機能的には問題なく動作
3. ファイル分割よりも、まず動作を正常化することが優先
4. 必要に応じて後からリファクタリング可能

### 最小限の修正（推奨）

```typescript
// PetriNetEditor.tsx（既存ファイルを修正）
import { ReactFlowProvider } from 'reactflow';
import { TemplateProvider } from '@/contexts/TemplateContext';

const PetriNetEditor: React.FC<PetriNetEditorProps> = (props) => {
  // ... 既存のState定義 ...
  
  return (
    <ReactFlowProvider>
      <TemplateProvider
        maimlData={effectiveMaimlData}
        validationResult={validationResult}
        activeMethodIndex={activeMethodIndex}
        methods={methods}
      >
        {/* 既存のUIコンポーネント */}
        <Flex vertical style={{ height: '100%' }}>
          <EditorToolbar ... />
          <MethodTabPanel ... />
          <ReactFlow ... />
          {/* ... */}
        </Flex>
      </TemplateProvider>
    </ReactFlowProvider>
  );
};
```

**この修正のみで：**
- ✅ ReactFlowProviderの問題が解決
- ✅ TemplateProviderの問題が解決
- ✅ `useReactFlow()`が正常動作
- ✅ `useTemplates()`が使用可能
- ✅ ファイル構造は変更なし（影響最小）

---

**作成者**: Cline  
**レビュー**: 未実施  
**ステータス**: ✅ 分析完了 → **推奨: アプローチB（最小限修正）**

---

## 🔄 補足2: index.tsxの命名について

### 質問: index.tsxという名前を変更できるか？

**回答: 完全に可能です。**

`index.tsx`は単なる慣習であり、任意のファイル名に変更できます。

### ファイル名のオプション

#### オプション1: index.tsx（標準）

```
PetriNetEditor/
├── index.tsx               # エントリーポイント
└── PetriNetEditorInner.tsx
```

**インポート方法:**
```typescript
// ディレクトリ名のみでインポート可能
import PetriNetEditor from '@/components/editor/PetriNetEditor';
```

**メリット:**
- ✅ ディレクトリ名だけでインポート可能（ファイル名省略）
- ✅ Node.jsの標準的な慣習
- ✅ インポート文が短くシンプル

**デメリット:**
- ⚠️ `index.tsx`という名前では役割が不明確

---

#### オプション2: PetriNetEditorWrapper.tsx（推奨）

```
PetriNetEditor/
├── PetriNetEditorWrapper.tsx  # Providerラッパー
└── PetriNetEditorCore.tsx      # メインロジック
```

**インポート方法:**
```typescript
// ファイル名を明示してインポート
import PetriNetEditor from '@/components/editor/PetriNetEditor/PetriNetEditorWrapper';
```

**メリット:**
- ✅ 役割が明確（"Wrapper"でProviderラッパーであることが分かる）
- ✅ ファイルを開かなくても何をするファイルか理解できる
- ✅ 検索性が高い

**デメリット:**
- ⚠️ インポート文が長くなる
- ⚠️ ディレクトリ名だけでインポート不可

---

#### オプション3: PetriNetEditorProvider.tsx

```
PetriNetEditor/
├── PetriNetEditorProvider.tsx  # Provider提供
└── PetriNetEditorCore.tsx       # メインロジック
```

**インポート方法:**
```typescript
import PetriNetEditor from '@/components/editor/PetriNetEditor/PetriNetEditorProvider';
```

**メリット:**
- ✅ 役割が非常に明確（"Provider"で何をするか一目瞭然）
- ✅ React Context Patternの命名規則に準拠

**デメリット:**
- ⚠️ インポート文が長くなる

---

#### オプション4: PetriNetEditor.tsx + PetriNetEditorInner.tsx（逆転）

```
PetriNetEditor/
├── PetriNetEditor.tsx       # エントリーポイント（Providerラップ）
└── PetriNetEditorInner.tsx  # メインロジック
```

**インポート方法:**
```typescript
// ファイル名を明示（ディレクトリ名と同じ）
import PetriNetEditor from '@/components/editor/PetriNetEditor/PetriNetEditor';
```

**メリット:**
- ✅ エントリーポイントの名前がコンポーネント名と一致
- ✅ reference版と同じ構造（逆にしただけ）

**デメリット:**
- ⚠️ ディレクトリ名とファイル名が重複（冗長）

---

### 🎯 推奨案: オプション2（PetriNetEditorWrapper.tsx）

**ファイル構成:**
```
frontend/src/components/editor/PetriNetEditor/
├── PetriNetEditorWrapper.tsx   # ReactFlowProvider + props変換
└── PetriNetEditorCore.tsx       # メインロジック + TemplateProvider
```

**エクスポート設定（オプション）:**

インポートを簡略化したい場合、package.jsonのexportsフィールドを使用：

```json
// frontend/package.json
{
  "exports": {
    "./components/editor/PetriNetEditor": "./src/components/editor/PetriNetEditor/PetriNetEditorWrapper.tsx"
  }
}
```

または、ディレクトリにindex.tsを作成してre-export：

```typescript
// frontend/src/components/editor/PetriNetEditor/index.ts
export { default } from './PetriNetEditorWrapper';
export type { PetriNetEditorProps } from './types';
```

**これにより両方のメリットを享受:**
```typescript
// シンプルなインポート（index.ts経由）
import PetriNetEditor from '@/components/editor/PetriNetEditor';

// 明示的なインポート（直接）
import PetriNetEditor from '@/components/editor/PetriNetEditor/PetriNetEditorWrapper';
```

---

### 実装例: オプション2

#### Step 1: ディレクトリ作成
```bash
mkdir -p frontend/src/components/editor/PetriNetEditor
```

#### Step 2: PetriNetEditorWrapper.tsx 作成

```typescript
/**
 * PetriNetEditorWrapper
 * ReactFlowProviderでラップし、propsを変換するエントリーポイント
 */
import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import PetriNetEditorCore from './PetriNetEditorCore';
import type { PetriNetEditorProps } from './types';

const PetriNetEditorWrapper: React.FC<PetriNetEditorProps> = (props) => {
  console.log('🔍 [PetriNetEditorWrapper] Props received:', {
    hasInitialContent: !!props.initialContent,
    editMode: props.editMode,
  });

  return (
    <ReactFlowProvider>
      <PetriNetEditorCore 
        maimlData={props.initialContent || props.maimlData}
        editMode={props.editMode}
        {...props}
      />
    </ReactFlowProvider>
  );
};

export default PetriNetEditorWrapper;
```

#### Step 3: PetriNetEditorCore.tsx 作成

```typescript
/**
 * PetriNetEditorCore
 * メインロジックとTemplateProviderラップ
 */
import React from 'react';
import { TemplateProvider } from '@/contexts/TemplateContext';
// ... 現行のPetriNetEditor.tsxの内容を移行
```

#### Step 4: index.ts でre-export（簡略化インポート用）

```typescript
// frontend/src/components/editor/PetriNetEditor/index.ts
export { default } from './PetriNetEditorWrapper';
export type { PetriNetEditorProps } from './types';
```

#### Step 5: types.ts でProps定義を分離

```typescript
// frontend/src/components/editor/PetriNetEditor/types.ts
export interface PetriNetEditorProps {
  maimlData?: string;
  initialContent?: string;
  editMode?: 'normal' | 'draft';
  // ... その他のprops
}
```

---

### まとめ

**index.tsxという名前は変更可能です。**

推奨構成:
```
PetriNetEditor/
├── index.ts                      # Re-export（簡略化用）
├── PetriNetEditorWrapper.tsx     # エントリーポイント
├── PetriNetEditorCore.tsx         # メインロジック
└── types.ts                      # 型定義
```

**インポート:**
```typescript
// どちらでもOK
import PetriNetEditor from '@/components/editor/PetriNetEditor';
import PetriNetEditor from '@/components/editor/PetriNetEditor/PetriNetEditorWrapper';
```

**この構成により:**
- ✅ ファイル名で役割が明確
- ✅ シンプルなインポートも可能（index.ts経由）
- ✅ 明示的なインポートも可能（直接指定）
- ✅ 保守性・拡張性が高い

**作成者**: Cline  
**最終更新**: 2026-01-28 11:23  
**ステータス**: ✅ 分析完了 → **推奨: PetriNetEditorWrapper.tsx + index.ts re-export**
