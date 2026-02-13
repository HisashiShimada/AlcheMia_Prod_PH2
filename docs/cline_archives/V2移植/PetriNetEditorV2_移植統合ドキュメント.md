# PetriNetEditorV2 移植統合ドキュメント

## 📋 ドキュメント情報
- **作成日**: 2026-01-29
- **最終更新**: 2026-01-29 16:38 (ファイル実態確認・最新化)
- **統合元ドキュメント**:
  1. `PetriNetEditorV2_移植ファイル一覧.md`
  2. `ファイル対応表.md`
  3. `未移植ファイルの依存関係.md`
- **最新検証**:
  - reference実ファイル: 31ファイル確認
  - editorv2実ファイル: 47ファイル確認
  - 差異分析完了

## 📚 目次
1. [概要](#概要)
2. [移植状況サマリー](#移植状況サマリー)
3. [ファイル対応表](#ファイル対応表)
4. [未移植ファイルの依存関係](#未移植ファイルの依存関係)
5. [実装状況調査](#実装状況調査)
6. [移植作業の推奨順序](#移植作業の推奨順序)
7. [外部依存関係](#外部依存関係)
8. [完了チェックリスト](#完了チェックリスト)

---

## 概要

このドキュメントは、reference版 PetriNetEditorV2 の editorv2 フォルダへの移植作業に関する統合情報です。

### 移植対象
- **移植元**: `reference/frontend/src/components/PetriNetEditorV2/`
- **移植先**: `frontend/src/components/editorv2/`
- **変更点**: TypeScript化（jsx/js → tsx/ts）、Ant Design対応

---

## 移植状況サマリー

### 📊 全体統計（2026-01-29 16:38更新）

#### reference実ファイル数
- **移植元合計**: 31ファイル（jsx/js/css）

#### editorv2実ファイル数  
- **移植先合計**: 47ファイル（tsx/ts）
- **内訳**:
  - メインファイル: 3ファイル（index.ts, index.tsx, PetriNetEditorV2.tsx）
  - components/: 16ファイル + index.ts
  - components/nodes/: 5ファイル + index.ts
  - components/TemplateViewer/: 3ファイル + index.ts
  - hooks/: 4ファイル + index.ts
  - nodes/: 2ファイル + index.ts
  - types/: 1ファイル
  - utils/: 3ファイル
  - utils/converters/: 3ファイル + index.ts
  - styles/: 空ディレクトリ

#### 移植状況

| 項目 | reference | editorv2実在 | 状態 |
|------|----------|-------------|------|
| **移植完了** (✅) | 26ファイル | 26ファイル存在 | 84% |
| **未移植** (❌) | 5ファイル | 0ファイル | 16% |
| **新規作成** (✨) | - | 21ファイル | - |
| **合計** | 31ファイル | 47ファイル | - |

### 📂 カテゴリ別進捗（実ファイルベース）

| カテゴリ | reference | editorv2実在 | 新規index.ts等 | 状態 |
|---------|----------|-------------|---------------|------|
| メインファイル | 2 | 3 | +1 (index.ts, index.tsx) | ✅ |
| components/ | 14 | 16 | +1 index.ts | ✅ 12/14移植 |
| components/nodes/ | 0 | 6 | +6 (全て新規) | ✨ |
| components/TemplateViewer/ | 3 | 4 | +1 index.ts | ✅ |
| hooks/ | 4 | 5 | +1 index.ts | ✅ |
| nodes/ | 2 | 3 | +1 index.ts | ✅ |
| styles/ | 2 | 0 | 空ディレクトリのみ | ❌ |
| utils/ | 3 | 3 | - | ✅ |
| utils/converters/ | 3 | 4 | +1 index.ts | ✅ |
| types/ | 0 | 1 | +1 (新規) | ✨ |

#### ❗重要な発見
- **styles/**: ディレクトリは存在するが**ファイルは0個**（editorTheme.js、errorStyles.cssとも未移植）
- **components/MultiObjectEditor**: reference版に存在するが**editorv2に未移植**
- **components/TemplateListItem**: reference版に存在するが**editorv2に未移植**
- **components/TemplateListView**: reference版に存在するが**editorv2に未移植**

### ⚠️ 未移植ファイル（2026-01-29 16:38 実ファイル確認済み）

#### 実在確認結果

| No | ファイル名 | reference | editorv2 | 状態 |
|----|-----------|----------|----------|------|
| 1 | **MultiObjectEditor.jsx** | ✅ 存在 | ❌ **不在** | 未移植 |
| 2 | **TemplateListView.jsx** | ✅ 存在 | ❌ **不在** | 未移植 |
| 3 | **TemplateListItem.jsx** | ✅ 存在 | ❌ **不在** | 未移植 |
| 4 | **editorTheme.js** | ✅ 存在 | ❌ **不在** | 未移植 |
| 5 | **errorStyles.css** | ✅ 存在 | ❌ **不在** | 未移植 |

#### 優先度順

##### 🟡 Phase 1: 高優先度（機能欠落）
1. **MultiObjectEditor.jsx** → **MultiObjectEditor.tsx**
   - 📂 reference: `components/MultiObjectEditor.jsx`
   - 📂 推奨移植先: `components/MultiObjectEditor.tsx`
   - ⚠️ 現状: DocumentEditDialog.tsxでTODO明記
   - 🎯 影響: Creator/Vendor/Owner/Instrument一括編集が使用不可

##### 🟢 Phase 2: 中優先度（使用箇所コメントアウト）
2. **TemplateListView.jsx** → **TemplateListView.tsx**
   - 📂 reference: `components/TemplateListView.jsx`
   - 📂 推奨移植先: `components/TemplateListView.tsx`
   - ⚠️ 現状: PetriNetEditorV2.tsxでimport文なし
   
3. **TemplateListItem.jsx** → **TemplateListItem.tsx**
   - 📂 reference: `components/TemplateListItem.jsx`
   - 📂 推奨移植先: `components/TemplateListItem.tsx`
   - ⚠️ 現状: TemplateListViewの依存先

##### ⚪ Phase 3: 低優先度（代替実装済み）
4. **editorTheme.js** → **不要**
   - 📂 reference: `styles/editorTheme.js`
   - ✅ 代替: Ant Designのtheme.useToken()で完全代替済み
   - 📝 理由: Material-UI固有のテーマ定義

5. **errorStyles.css** → **不要**
   - 📂 reference: `styles/errorStyles.css`
   - ✅ 代替: Ant DesignのAlert/Message/Typography.Textで代替済み
   - 📝 理由: CSS-in-JSへの移行

### ✅ 移植完了ファイル（Phase 11-14）

#### Phase 11: TemplateViewerフォルダ（2026-01-29 15:58完了）
- ✅ **TemplateItem.tsx** - テンプレート項目コンポーネント
- ✅ **TemplateList.tsx** - テンプレート一覧コンポーネント
- ✅ **index.ts** - エクスポートファイル

#### Phase 12: DraftManager（2026-01-29 16:02完了）
- ✅ **DraftManager.tsx** - Draft管理UIコンポーネント

#### Phase 13: SaveConfirmDialog（2026-01-29 16:07完了）
- ✅ **SaveConfirmDialog.tsx** - 保存確認ダイアログ

#### Phase 14: WorkflowSelectorDialog（2026-01-29 16:12完了）
- ✅ **WorkflowSelectorDialog.tsx** - ワークフロー選択ダイアログ

---

## ファイル対応表

### 1. メインファイル

| No | 状態 | 移植元（reference） | 移植先（editorv2） |
|----|------|-------------------|------------------|
| 1 | ✅ | PetriNetEditorV2/index.jsx | editorv2/index.tsx |
| 2 | ✅ | PetriNetEditorV2/PetriNetEditorInner.jsx | editorv2/PetriNetEditorV2.tsx |

---

### 2. componentsフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 3 | ✅ | components/DocumentEditDialog.jsx | components/DocumentEditDialog.tsx | |
| 4 | ✅ | components/DraftManager.jsx | components/DraftManager.tsx | Phase 12完了 |
| 5 | ✅ | components/EditorToolbar.jsx | components/EditorToolbar.tsx | |
| 6 | ✅ | components/MethodTabPanel.jsx | components/MethodTabPanel.tsx | |
| 7 | ❌ | components/MultiObjectEditor.jsx | **未定** | TODO明記 |
| 8 | ✅ | components/PropertyPanel.jsx | components/PropertyPanel.tsx | |
| 9 | ✅ | components/SaveConfirmDialog.jsx | components/SaveConfirmDialog.tsx | Phase 13完了 |
| 10 | ✅ | components/SaveDialog.jsx | components/SaveDialog.tsx | |
| 11 | ✅ | components/TemplateEditorDialog.jsx | components/TemplateEditorDialog.tsx | |
| 12 | ❌ | components/TemplateListItem.jsx | **未定** | |
| 13 | ❌ | components/TemplateListView.jsx | **未定** | referenceでコメントアウト |
| 14 | ✅ | components/ValidationPanel.jsx | components/ValidationPanel.tsx | |
| 15 | ✅ | components/WorkflowSelectorDialog.jsx | components/WorkflowSelectorDialog.tsx | Phase 14完了 |
| 16 | ✨ | **（新規作成）** | components/ReactFlowCanvas.tsx | React Flow統合用の新規コンポーネント |
| 17 | ✨ | **（新規作成）** | components/index.ts | コンポーネントエクスポートファイル |

#### 2-1. components/TemplateViewerフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） |
|----|------|-------------------|------------------|
| 18 | ✅ | components/TemplateViewer/index.js | components/TemplateViewer/index.ts |
| 19 | ✅ | components/TemplateViewer/TemplateItem.jsx | components/TemplateViewer/TemplateItem.tsx |
| 20 | ✅ | components/TemplateViewer/TemplateList.jsx | components/TemplateViewer/TemplateList.tsx |

#### 2-2. components/nodesフォルダ（新規）

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 21 | ✨ | PetriNetViewer/nodes/ConditionTemplateNode.jsx | components/nodes/ConditionPlaceNode.tsx | PetriNetViewerから移植 |
| 22 | ✨ | PetriNetViewer/nodes/MaterialTemplateNode.jsx | components/nodes/MaterialPlaceNode.tsx | PetriNetViewerから移植 |
| 23 | ✨ | PetriNetViewer/nodes/ResultTemplateNode.jsx | components/nodes/ResultPlaceNode.tsx | PetriNetViewerから移植 |
| 24 | ✨ | PetriNetViewer/nodes/TransitionNode.jsx | components/nodes/TransitionNode.tsx | PetriNetViewerから移植 |
| 25 | ✨ | **（新規作成）** | components/nodes/index.ts | エクスポートファイル |

---

### 3. hooksフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 26 | ✅ | hooks/useDraftManager.js | hooks/useDraftManager.ts | |
| 27 | ✅ | hooks/useHistory.js | hooks/useHistory.ts | |
| 28 | ✅ | hooks/useNamespaceOperations.js | hooks/useNamespaceOperations.ts | |
| 29 | ✅ | hooks/useWorkflow.js | hooks/useWorkflow.ts | |
| 30 | ✨ | **（新規作成）** | hooks/index.ts | Hooksエクスポートファイル |

---

### 4. nodesフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 31 | ✅ | nodes/EditablePlaceNode.jsx | nodes/EditablePlaceNode.tsx | |
| 32 | ✅ | nodes/EditableTransitionNode.jsx | nodes/EditableTransitionNode.tsx | |
| 33 | ✨ | **（新規作成）** | nodes/index.ts | Nodesエクスポートファイル |

---

### 5. stylesフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 34 | ❌ | styles/editorTheme.js | **未定** | Ant Designで代替 |
| 35 | ❌ | styles/errorStyles.css | **未定** | Ant Designで代替 |

---

### 6. utilsフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） |
|----|------|-------------------|------------------|
| 36 | ✅ | utils/documentParser.js | utils/documentParser.ts |
| 37 | ✅ | utils/templateExtractor.js | utils/templateExtractor.ts |
| 38 | ✅ | utils/xmlSignature.js | utils/xmlSignature.ts |

#### 6-1. utils/convertersフォルダ

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 39 | ✅ | utils/converters/maimlToReactFlow.js | utils/converters/maimlToReactFlow.ts | |
| 40 | ✅ | utils/converters/multiMethodConverter.js | utils/converters/multiMethodConverter.ts | |
| 41 | ✅ | utils/converters/reactFlowToMaiml.js | utils/converters/reactFlowToMaiml.ts | |
| 42 | ✨ | **（新規作成）** | utils/converters/index.ts | Convertersエクスポートファイル |

---

### 7. typesフォルダ（新規）

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 43 | ✨ | **（新規作成）** | types/index.ts | TypeScript型定義ファイル |

---

### 8. エントリーポイント

| No | 状態 | 移植元（reference） | 移植先（editorv2） | 備考 |
|----|------|-------------------|------------------|------|
| 44 | ✨ | **（新規作成）** | index.tsx | メインエントリーポイント |

---

## 未移植ファイルの依存関係

### 依存関係グラフ

```
PetriNetEditorV2.tsx (メイン) ← ✅ 移植済み
├── DraftManager ← ✅ 移植完了（Phase 12）
│   └── useDraftManager ← ✅ 実装済み
├── SaveConfirmDialog ← ✅ 移植完了（Phase 13）
├── WorkflowSelectorDialog ← ✅ 移植完了（Phase 14）
├── TemplateViewer/ ← ✅ 移植完了（Phase 11）
│   ├── index.ts
│   ├── TemplateList.tsx
│   └── TemplateItem.tsx
├── TemplateListView ← ❌ 未移植 ⚠️ 中優先度（コメントアウト）
│   └── TemplateListItem ← ❌ 未移植
├── editorTheme.js ← ❌ 未移植（代替可能）
└── errorStyles.css ← ❌ 未移植（代替可能）

DocumentEditDialog.tsx ← ✅ 移植済み
└── MultiObjectEditor ← ❌ 未移植 ⚠️ 高優先度（TODO明記）
```

### 未移植ファイル詳細

#### 1. MultiObjectEditor.jsx（未移植 - 次期実装予定）

**移植元**: `reference/frontend/src/components/PetriNetEditorV2/components/MultiObjectEditor.jsx`  
**推奨移植先**: `frontend/src/components/editorv2/components/MultiObjectEditor.tsx`

| 項目 | 内容 |
|------|------|
| 参照元 | DocumentEditDialog.tsx（`import MultiObjectEditor from './MultiObjectEditor'`） |
| 優先度 | 🟡 高（次期実装予定） |
| 影響 | Creator/Vendor/Owner/Instrument一括編集が使用不可 |
| 現状 | 意図的に未実装（TODOコメントあり） |
| 備考 | 14行目: `* : MultiObjectEditorPhase`<br>551行目: 警告表示あり |

---

#### 2. TemplateListView.jsx & TemplateListItem.jsx

**移植元**: 
- `reference/frontend/src/components/PetriNetEditorV2/components/TemplateListView.jsx`
- `reference/frontend/src/components/PetriNetEditorV2/components/TemplateListItem.jsx`

**推奨移植先**: 
- `frontend/src/components/editorv2/components/TemplateListView.tsx`
- `frontend/src/components/editorv2/components/TemplateListItem.tsx`

| 項目 | 内容 |
|------|------|
| 参照元 | PetriNetEditorV2.tsx（コメントアウト状態） |
| 優先度 | 🟢 中 |
| 影響 | 軽微（使用予定不明） |
| 現状 | referenceでもコメントアウト |
| 備考 | lazy loadingで読み込まれる予定の可能性 |

---

#### 3. editorTheme.js & errorStyles.css

**移植元**: 
- `reference/frontend/src/components/PetriNetEditorV2/styles/editorTheme.js`
- `reference/frontend/src/components/PetriNetEditorV2/styles/errorStyles.css`

| 項目 | 内容 |
|------|------|
| 優先度 | ⚪ 低（代替可能） |
| 影響 | なし |
| 現状 | Ant Designで完全代替 |
| 推奨 | 移植不要 |

---

## 実装状況調査

### 📅 調査日: 2026-01-29 16:38（実ファイル確認完了）

#### 調査方法
1. **reference実ファイル**: `reference/frontend/src/components/PetriNetEditorV2/` 配下を完全列挙
2. **editorv2実ファイル**: `frontend/src/components/editorv2/` 配下を完全列挙  
3. **差分分析**: ファイル名ベースで対応関係を確認
4. **import確認**: 移植済みファイル内で未移植ファイルへの参照を検証

### PetriNetEditorV2.tsx（移植済み）

| 未移植ファイル | import状況 | 実装詳細 |
|-------------|-----------|---------|
| DraftManager.jsx | ❌ **未実装** | コンポーネントimportなし<br>`useDraftManager` hookのみ使用（20行目、104行目） |
| SaveConfirmDialog.jsx | ❌ **未実装** | import文なし、使用箇所なし |
| WorkflowSelectorDialog.jsx | ❌ **未実装** | import文なし、使用箇所なし |
| TemplateViewer/* | ❌ **未実装** | import文なし、使用箇所なし |
| TemplateListView.jsx | ❌ **未実装** | import文なし、使用箇所なし |
| editorTheme.js | ❌ **未実装** | Ant Designで代替済み |
| errorStyles.css | ❌ **未実装** | Ant Designで代替済み |

### DocumentEditDialog.tsx（移植済み）

| 未移植ファイル | import状況 | 実装詳細 |
|-------------|-----------|---------|
| MultiObjectEditor.jsx | ⚠️ **未実装（TODO）** | 14行目: コメント `* : MultiObjectEditorPhase`<br>551行目: 警告表示 `"MultiObjectEditor（Creator/Vendor/Owner/Instrument編集）は次Phaseで実装します"` |

### 🚨 重要な発見

1. **全ての未移植ファイルが実装されていない**
   - reference版で参照されていた7つの未移植ファイルすべてが、移植版では実装されていません

2. **DraftManagerの特殊な状況**
   - コンポーネントは未実装
   - `useDraftManager` hookのみ実装済み
   - Draft管理UIが存在しない

3. **MultiObjectEditorは意図的に未実装**
   - 次フェーズ対応予定と明示
   - TODOコメントと警告表示あり

4. **スタイルファイルは不要**
   - Ant Designへの完全移行により、MUIテーマとCSSは不要化

### 代替実装

| 未移植ファイル | 代替実装 |
|-------------|---------|
| DraftManager.jsx | `useDraftManager` hookのみ実装<br>UIコンポーネントは未実装 |
| SaveConfirmDialog.jsx | Ant Designの`Modal.confirm`で代替可能 |
| editorTheme.js | Ant Designのテーマシステムで代替 |
| errorStyles.css | Ant DesignのAlert/Messageコンポーネントで代替 |

---

## 移植作業の推奨順序

### ステップ1: 独立したコンポーネント（基礎）

```
1. TemplateViewer/TemplateItem.jsx
   ├─ 依存: なし
   └─ 優先度: 高
   
2. TemplateViewer/TemplateList.jsx
   ├─ 依存: TemplateItem.jsx
   └─ 優先度: 高
   
3. TemplateViewer/index.js
   ├─ 依存: TemplateList.jsx
   └─ 優先度: 高
```

### ステップ2: メインから参照されるダイアログ

```
4. DraftManager.jsx
   ├─ 依存: なし（hookは実装済み）
   ├─ 優先度: 高
   └─ 備考: UIコンポーネントの実装が必要
   
5. SaveConfirmDialog.jsx
   ├─ 依存: なし
   ├─ 優先度: 高
   └─ 代替: Ant Designの Modal.confirm でも可
   
6. WorkflowSelectorDialog.jsx
   ├─ 依存: なし
   └─ 優先度: 高
```

### ステップ3: 移植済みコンポーネントから参照

```
7. MultiObjectEditor.jsx
   ├─ 依存: なし
   ├─ 優先度: 高（次期実装予定）
   └─ 備考: TODO明記済み
```

### ステップ4: 将来的に必要になる可能性

```
8. TemplateListItem.jsx
   ├─ 依存: なし
   └─ 優先度: 中
   
9. TemplateListView.jsx
   ├─ 依存: TemplateListItem.jsx
   └─ 優先度: 中（referenceでもコメントアウト）
```

### ステップ5: スタイル対応（オプション）

```
10. editorTheme.js
    ├─ 優先度: 低
    └─ 推奨: 移植不要（Ant Designで代替）
    
11. errorStyles.css
    ├─ 優先度: 低
    └─ 推奨: 移植不要（Ant Designで代替）
```

---

## 外部依存関係

### 必須の外部コンポーネント

PetriNetEditorV2フォルダ外で必要なコンポーネント（最低限）：

#### 1. PetriNetViewerコンポーネント
```
reference/frontend/src/components/PetriNetViewer/
├── nodes/
│   ├── MaterialTemplateNode.jsx        # ★必須
│   ├── ConditionTemplateNode.jsx       # ★必須
│   ├── ResultTemplateNode.jsx          # ★必須
│   └── TransitionNode.jsx              # ★必須
└── utils/
    ├── petriNetExtractor.js            # ★必須: buildTemplateMap関数
    └── reactFlowConverter.js           # ★必須: convertToReactFlowFormat関数
```

#### 2. Contextsフォルダ
```
reference/frontend/src/contexts/
└── TemplateContext.js                  # ★必須
    - TemplateProvider
    - useTemplates
```

#### 3. ExperimentRecorderコンポーネント
```
reference/frontend/src/components/ExperimentRecorder/
└── utils/
    └── MaiMLParser.js                  # ★必須
```

#### 4. Servicesフォルダ
```
reference/frontend/src/services/
└── apiService.js                       # ★必須
    - fetchFileContent
    - fetchFileList
```

#### 5. Hooksフォルダ
```
reference/frontend/src/hooks/
└── useNamespaceOperations.js           # ★必須
```

### 外部ライブラリ依存関係

#### React Flow関連
```json
{
  "reactflow": "^11.11.4",
  "@reactflow/core": "^11.x",
  "@reactflow/node-toolbar": "^1.x"
}
```

#### Material-UI関連（reference版）
```json
{
  "@mui/material": "^5.x",
  "@mui/icons-material": "^5.x",
  "@emotion/react": "^11.x",
  "@emotion/styled": "^11.x"
}
```

#### その他
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "xml-js": "^1.6.11"
}
```

---

## 完了チェックリスト

### 🎯 基本機能

#### ファイル移植
- [x] メインファイル（2/2）
- [x] componentsフォルダ（12/14）
- [x] components/TemplateViewerフォルダ（3/3）
- [x] hooksフォルダ（4/4）
- [x] nodesフォルダ（2/2）
- [ ] stylesフォルダ（0/2）※代替可能
- [x] utilsフォルダ（3/3）
- [x] utils/convertersフォルダ（3/3）

#### 未移植ファイル
- [x] DraftManager.jsx ← ✅ Phase 12完了
- [x] SaveConfirmDialog.jsx ← ✅ Phase 13完了
- [x] WorkflowSelectorDialog.jsx ← ✅ Phase 14完了
- [x] TemplateViewer/index.ts ← ✅ Phase 11完了
- [x] TemplateViewer/TemplateItem.tsx ← ✅ Phase 11完了
- [x] TemplateViewer/TemplateList.tsx ← ✅ Phase 11完了
- [ ] MultiObjectEditor.jsx ← ⚠️ 次期実装予定
- [ ] TemplateListItem.jsx ← 中優先度（オプション）
- [ ] TemplateListView.jsx ← 中優先度（オプション）

#### 外部依存
- [ ] PetriNetViewer/nodes/* (4ファイル)
- [ ] PetriNetViewer/utils/* (2ファイル)
- [ ] TemplateContext
- [ ] MaiMLParser
- [ ] apiService（既存確認）
- [ ] useNamespaceOperations（既存確認）

---

### ✅ 機能確認

#### 編集機能
- [ ] ペトリネット表示
- [ ] ノード追加・削除
- [ ] エッジ接続
- [ ] Undo/Redo
- [ ] 複数Method対応

#### ダイアログ機能
- [ ] テンプレート編集
- [ ] Document編集
- [ ] Draft管理
- [ ] ワークフロー追加
- [ ] 保存確認

#### バリデーション・保存
- [ ] バリデーション機能
- [ ] S3保存
- [ ] ローカル保存

#### UI/UX
- [ ] テンプレート一覧表示
- [ ] プロパティパネル
- [ ] ツールバー機能

---

### 📝 TypeScript化

- [ ] 全TSX/TSファイルに型定義追加
- [ ] interface/type定義ファイル作成
- [ ] エラーなくビルドが通る

---

### 🎨 スタイリング

- [ ] Ant Designテーマで同等のスタイリング実現
- [ ] エラー表示が正常に機能
- [ ] MUI依存を完全削除

---

## 📞 サポート情報

### ドキュメント管理

このドキュメントは以下の3つのファイルを統合したものです。個別の更新があった場合は、このドキュメントも更新してください。

1. **PetriNetEditorV2_移植ファイル一覧.md**
   - 移植対象ファイルの全体リスト
   - 外部依存関係の詳細
   
2. **ファイル対応表.md**
   - reference版とeditorv2版の対応表
   - 番号付きファイル一覧
   
3. **未移植ファイルの依存関係.md**
   - 未移植ファイルの参照元分析
   - 依存関係グラフ
   - 実装状況調査結果

### 更新履歴

| 日付 | 変更内容 | 更新者 |
|------|----------|--------|
| 2026-01-29 09:00 | 初版作成（3ファイルを統合） | Cline |
| 2026-01-29 16:13 | Phase 11-14完了を反映、進捗率84%に更新 | Cline |
| 2026-01-29 16:38 | **実ファイル確認による最新化完了**<br>- reference: 31ファイル確認<br>- editorv2: 47ファイル確認<br>- 未移植5ファイルの実在確認<br>- styles/フォルダが空であることを確認 | Cline |

---

## 📌 まとめ

### 現状（2026-01-29 16:38 実ファイル確認完了）

#### ファイル数（実態ベース）
- **reference元**: 31ファイル（jsx/js/css）
- **editorv2先**: 47ファイル（tsx/ts + 21の新規index.ts等）
- **移植完了**: 26ファイル (84%)
- **未移植**: 5ファイル (16%)
  - MultiObjectEditor.jsx ⚠️ **高優先度**
  - TemplateListView.jsx 🟢 **中優先度**
  - TemplateListItem.jsx 🟢 **中優先度**  
  - editorTheme.js ⚪ **代替済み**
  - errorStyles.css ⚪ **代替済み**

#### 🚨 重要な確認事項
1. **PetriNetEditorV2.tsx**（400行）は**簡易版**
   - referenceの`PetriNetEditorInner.jsx`（1,800行）と構造が大きく異なる
   - 前回分析レポート（`20260129_1633_PetriNetEditorV2_構造差異分析レポート.md`）参照
   
2. **styles/フォルダ**: ディレクトリのみ存在、ファイル0個

3. **未移植の実在確認**: 5ファイルすべてreferenceに存在、editorv2に不在

### ✅ Phase 11-14 完了

#### Phase 11: TemplateViewerフォルダ（2026-01-29 15:58完了）
- ✅ TemplateViewer/TemplateItem.tsx
- ✅ TemplateViewer/TemplateList.tsx
- ✅ TemplateViewer/index.ts

#### Phase 12: DraftManager（2026-01-29 16:02完了）
- ✅ DraftManager.tsx - Draft管理UIコンポーネント

#### Phase 13: SaveConfirmDialog（2026-01-29 16:07完了）
- ✅ SaveConfirmDialog.tsx - 保存確認ダイアログ

#### Phase 14: WorkflowSelectorDialog（2026-01-29 16:12完了）
- ✅ WorkflowSelectorDialog.tsx - ワークフロー選択ダイアログ

### 次のアクション

#### 🟡 高優先度（次期フェーズ）
1. MultiObjectEditor.jsx を実装（TODO明記済み）

#### 🟢 中優先度（オプション）
2. TemplateListView.jsx & TemplateListItem.jsx を検討

#### ⚪ 低優先度（不要の可能性）
3. スタイルファイルは Ant Design で代替

### 成功の鍵

1. **依存関係の順守**: TemplateItemから順に実装
2. **TypeScript化**: すべてのファイルを型定義付きで実装
3. **テスト**: 各ファイル移植後に動作確認
4. **ドキュメント更新**: 進捗に応じてこのドキュメントを更新

---

**📄 ドキュメント終了**
