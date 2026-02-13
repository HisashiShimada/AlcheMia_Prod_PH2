# PetriNetEditorV2 構造差異分析レポート

## 作成日時
2026-01-29 16:33

## 概要
referenceの`PetriNetEditorInner.jsx`と現在の`PetriNetEditorV2.tsx`を比較した結果、**構造が根本的に異なり、移植が正しく完了していない**ことが判明しました。

---

## 🔴 重大な問題

### 1. ファイルサイズの違い
- **reference**: 約1,800行（複雑な実装）
- **V2**: 約400行（簡易版）

### 2. 欠落している主要機能

#### ❌ MaiMLデータ読み込み処理が完全に欠落
**reference**: 
```javascript
// 約200行のuseEffectで以下を実装
useEffect(() => {
  const fetchPetriNetData = async () => {
    // 1. 新規作成モード処理
    // 2. MaiMLデータをBase64エンコード
    // 3. 複数method構造取得APIを試行
    // 4. テンプレートマップ構築
    // 5. Document情報抽出
    // 6. React Flow形式に変換
    // 7. 共通テンプレート検出
    // 8. 自動バリデーション実行
  };
}, [maimlData]);
```

**V2**: 
```typescript
// この処理が完全に存在しない
// → ファイルを開けない！
```

#### ❌ TemplateProvider未実装
**reference**:
```javascript
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

**V2**:
```typescript
// TemplateProviderなし
return (
  <ReactFlowProvider>
    <Layout>...</Layout>
  </ReactFlowProvider>
);
```

#### ❌ 複数ダイアログ未実装

| ダイアログ | reference | V2 | 状態 |
|-----------|-----------|-----|------|
| SaveDialog | ✅ | ✅ | OK |
| SaveConfirmDialog | ✅ | ❌ | **未実装** |
| ValidationPanel | ✅ | ✅ | 簡易版 |
| TemplateEditorDialog | ✅ | ✅ | OK |
| DocumentEditDialog | ✅ | ✅ | OK |
| WorkflowSelectorDialog | ✅ | ❌ | **未実装** |
| DraftManager | ✅ | ❌ | **未実装** |

#### ❌ エラーハンドリング未実装
**reference**:
```javascript
// 致命的・非致命的エラー分類
const [criticalErrors, setCriticalErrors] = useState([]);
const [nonCriticalErrors, setNonCriticalErrors] = useState([]);

// エラーノード/エッジの視覚化
useEffect(() => {
  const { nodeIds, edgeIds } = extractAffectedElements(nonCriticalErrors);
  setNodes(prevNodes => prevNodes.map(node => ({
    ...node,
    data: { ...node.data, hasError: true },
    className: 'error-node'
  })));
}, [nonCriticalErrors]);
```

**V2**:
```typescript
// エラーハンドリングなし
```

#### ❌ 複雑な状態管理が欠落
**reference**:
```javascript
// 30個以上のuseState
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [methods, setMethods] = useState([]);
const [activeMethodIndex, setActiveMethodIndex] = useState(0);
const [multiMethodMode, setMultiMethodMode] = useState(false);
const [validationResult, setValidationResult] = useState(null);
const [criticalErrors, setCriticalErrors] = useState([]);
// ... 他多数
```

**V2**:
```typescript
// カスタムフックに分離（useWorkflow中心）
// しかし機能が大幅に簡略化されている
```

---

## 📊 詳細比較表

### コンポーネント構造

| 要素 | reference | V2 | 差異 |
|------|-----------|-----|------|
| **メインコンポーネント** | PetriNetEditorContent | PetriNetEditorV2 | 別物 |
| **ラッパー** | TemplateProvider | ReactFlowProvider | TemplateProvider欠落 |
| **内部UI** | PetriNetEditorInnerUI | Layout直接 | UI分離なし |
| **行数** | 1,800行 | 400行 | **4.5倍の差** |

### 主要機能

| 機能 | reference | V2 | 実装率 |
|------|-----------|-----|--------|
| MaiML読み込み | ✅ 完全実装 | ❌ 未実装 | **0%** |
| TemplateContext | ✅ 完全実装 | ❌ 未実装 | **0%** |
| 複数method管理 | ✅ 完全実装 | ⚠️ 簡易版 | **30%** |
| バリデーション | ✅ 完全実装 | ⚠️ スタブ | **20%** |
| エラー表示 | ✅ 完全実装 | ❌ 未実装 | **0%** |
| Draft自動保存 | ✅ 完全実装 | ⚠️ フックのみ | **50%** |
| ワークフロー追加 | ✅ 完全実装 | ❌ 未実装 | **0%** |
| 保存確認ダイアログ | ✅ 完全実装 | ❌ 未実装 | **0%** |

### useEffectの数

| | reference | V2 |
|---|-----------|-----|
| useEffect数 | **15個以上** | **0個** |

主要なuseEffect:
- maimlData読み込み
- バリデーション結果反映
- エラー分類
- エラーノード視覚化
- Draft自動保存トリガー
- ビューポート保存/復元
- テンプレートエラーマッピング
- キーボードショートカット
- etc.

---

## 🎯 移植状況の実態

### ファイル対応表の記載
```
| 2 | ✅ | PetriNetEditorInner.jsx | PetriNetEditorV2.tsx |
```
→ **「✅移植完了」と記載されているが、実際は未完了**

### 実際の状況
- **コード行数**: 約22%のみ（400/1800行）
- **機能実装**: 約30%のみ
- **重要機能の欠落**: 
  - MaiML読み込み（0%）
  - TemplateProvider（0%）
  - エラーハンドリング（0%）
  - 複数ダイアログ（40%）

---

## 🔍 設計方針の違い

### reference: モノリシック設計
- **1つの巨大コンポーネント**に全機能を実装
- **多数のuseState/useEffect**で状態管理
- **Props Drilling**でデータ伝達
- **直接的な実装**で動作が明確

**利点**:
- 動作フローが追いやすい
- デバッグしやすい
- 完全な機能が保証される

**欠点**:
- コードが長い（1,800行）
- 保守性が低い
- テストしにくい

### V2: フック分離設計（Phase 9）
- **カスタムフック**に機能分離
- **useWorkflow中心**の設計
- **モジュール化**されたコード
- **抽象化**が進んでいる

**利点**:
- コードが短い（400行）
- 保守性が高い
- テストしやすい

**欠点**:
- **機能が大幅に欠落**
- 動作フローが複雑
- デバッグしにくい
- **実際に動かない**

---

## ❗ 致命的な問題

### 1. MaiML読み込みが動作しない
```typescript
// V2には以下の処理が存在しない
- maimlDataをBase64エンコード
- /api/worker/multiple-methods-structure-from-content APIを呼び出し
- ペトリネット構造を取得
- テンプレートマップ構築
- React Flow形式に変換
- 共通テンプレート検出
- ノード/エッジ初期化
```

**結果**: **ファイルを開けない** → エディタとして機能しない

### 2. TemplateProviderがない
```typescript
// V2にはTemplateContextが存在しない
- allTemplates取得不可
- addTemplate未実装
- updateTemplate未実装
- deleteTemplate未実装
```

**結果**: **テンプレート編集が動作しない**

### 3. エラー表示ができない
```typescript
// V2にはエラーハンドリングが存在しない
- バリデーションエラー非表示
- エラーノード視覚化なし
- 警告バナーなし
```

**結果**: **ユーザーがエラーに気づけない**

---

## 📋 移植が必要な主要コード

### 1. MaiML読み込みuseEffect（約200行）
```javascript
// reference: 行1028-1230
useEffect(() => {
  const fetchPetriNetData = async () => {
    // ... 巨大な実装
  };
  fetchPetriNetData();
}, [maimlData]);
```

### 2. TemplateProvider統合（約50行）
```javascript
// reference: 行1705-1755
return (
  <TemplateProvider {...props}>
    <PetriNetEditorInnerUI {...props} />
  </TemplateProvider>
);
```

### 3. エラーハンドリング（約100行）
```javascript
// reference: 行256-356
// 致命的・非致命的エラー分類
// エラーノード/エッジ視覚化
```

### 4. 欠落ダイアログ（約300行）
- SaveConfirmDialog
- WorkflowSelectorDialog
- DraftManager

### 5. 複雑な状態管理（約400行）
- 30個以上のuseState
- 15個以上のuseEffect
- 多数のuseCallback

---

## 🎯 推奨される対応方針

### Option A: reference版を採用（推奨）
**理由**:
- ✅ 完全に動作する
- ✅ 全機能が実装済み
- ✅ 本番投入可能

**作業**:
1. `PetriNetEditorInner.jsx`を`PetriNetEditorV2.tsx`にリネーム
2. Material-UI → Ant Design変換（UI部分のみ）
3. JSDoc追加
4. 型定義追加（必要最小限）

**工数**: 2-3日

### Option B: V2を完全移植（非推奨）
**理由**:
- ❌ 大量のコード追加が必要（1,400行）
- ❌ 複雑な状態管理の再実装
- ❌ デバッグが困難
- ❌ バグのリスク大

**作業**:
1. MaiML読み込みロジック追加（200行）
2. TemplateProvider統合（50行）
3. エラーハンドリング追加（100行）
4. 欠落ダイアログ追加（300行）
5. 状態管理追加（400行）
6. useEffect追加（15個×平均30行）
7. 動作確認・デバッグ

**工数**: 2-3週間

### Option C: ハイブリッド（中間案）
**理由**:
- カスタムフック（useWorkflow等）は有用
- reference実装を一部フック化

**作業**:
1. reference版をベースに採用
2. 一部機能をカスタムフックに抽出
3. 段階的にリファクタリング

**工数**: 1-2週間

---

## 📝 結論

### 現状の評価
- **ファイル対応表の記載**: ✅ 移植完了
- **実際の状況**: ❌ **未完了（実装率30%）**
- **動作状況**: ❌ **ファイルを開けない（致命的）**

### 推奨アクション
1. **即座にreference版を採用**（Option A）
2. ファイル対応表を修正
3. V2はPhase 11以降のリファクタリング対象として保留

### 理由
- reference版は完全に動作する
- V2は機能の大部分が欠落
- V2の完全移植は工数・リスクが大きすぎる
- リファクタリングは動作する実装があってこそ

---

## 📌 次のステップ

### 緊急対応（今すぐ）
1. reference版をV2として採用
2. Material-UI → Ant Design変換（UI部分）
3. 動作確認

### Phase 10以降
1. 段階的にカスタムフック化
2. useWorkflowの有効活用
3. コードの整理・リファクタリング

---

**作成者**: Cline  
**分析日時**: 2026-01-29 16:33  
**分析対象**:
- `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx` (1,800行)
- `frontend/src/components/editorv2/PetriNetEditorV2.tsx` (400行)