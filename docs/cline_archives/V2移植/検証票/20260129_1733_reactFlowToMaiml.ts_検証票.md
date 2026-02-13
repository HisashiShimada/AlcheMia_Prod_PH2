# reactFlowToMaiml.ts 移植検証票

**検証日時**: 2026-01-29 17:33  
**検証者**: Cline  
**Phase**: Phase 3（変換ユーティリティ）

---

## 📋 基本情報

### 移植元
- **ファイルパス**: `reference/frontend/src/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js`
- **行数**: 約1000行
- **言語**: JavaScript
- **役割**: React FlowデータをMaiML XML形式に変換

### 移植先
- **ファイルパス**: `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`
- **行数**: 約800行
- **言語**: TypeScript
- **役割**: React FlowデータをMaiML XML形式に変換（TypeScript版）

---

## 🎯 検証結果サマリー

| 評価項目 | 配点 | 獲得点 | 達成率 | 評価 |
|---------|------|--------|--------|------|
| **A. 構造の整合性** | 30 | 23 | 77% | 🟡 要改善 |
| **B. 処理の完全性** | 30 | 15 | 50% | 🔴 未完成 |
| **C. TypeScript化** | 20 | 20 | 100% | 🟢 完璧 |
| **D. Ant Design対応** | 10 | 10 | 100% | 🟢 N/A |
| **E. 依存関係** | 10 | 10 | 100% | 🟢 完璧 |
| **合計** | **100** | **78** | **78%** | **🟡 未完成** |

### 総合評価: 🔴 未完成（78点）

**判定**: ❌ **重要な処理が未実装**

---

## 🚨 重大な問題

### 未実装部分（致命的）

**convertReactFlowToMaiML関数内で200行の処理が欠落**

```typescript
// ❌ 現在の実装（移植先）
// materialTemplate要素群の出力は次のメッセージで実装します
maiml += `      </program>\n`;
maiml += `    </method>\n`;
```

**✅ 移植元の実装（約200行）**
```javascript
// materialTemplate要素群
materialTemplates.forEach(node => {
  const template = node.data.template;
  const templateId = template.templateId || template.id || `MT${node.id}`;
  
  // ✅ placeRefsを取得（バリデーション済みなので安全）
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
  // ... 約70行の処理 ...
  maiml += `        </materialTemplate>\n`;
});

// conditionTemplate要素群（約70行）
conditionTemplates.forEach(node => { ... });

// resultTemplate要素群（約70行）
resultTemplates.forEach(node => { ... });
```

**影響範囲：**
- ❌ テンプレート情報が保存されない
- ❌ プロパティ情報が失われる
- ❌ insertion情報が欠落
- ❌ placeRef情報が出力されない
- ❌ 保存→再読込で情報が消失

---

## 📊 詳細評価

### A. 構造の整合性（23/30点）

#### ✅ 達成項目（23点）
1. **ファイル構造一致（7/10）**
   - import/export: 完全一致
   - 型定義: 完全一致
   - 関数配置: ほぼ同じ順序
   - **-3点**: メイン関数が未完成

2. **関数数と名前（10/10）**
   - escapeXml: ✅
   - generateUUID: ✅
   - buildPlaceXML: ✅
   - buildTransitionXML: ✅
   - buildArcXML: ✅
   - validatePetriNet: ✅
   - buildDocumentXML: ✅
   - buildPropertyXML: ✅
   - buildContentXML: ✅
   - buildCommonTemplateXML: ✅
   - convertReactFlowToMaiML: ⚠️ 未完成
   - formatMaiMLXml: ✅
   - formatValidationErrors: ✅
   - getGraphStatistics: ✅

3. **型定義（6/10）**
   - ValidationResult: ✅
   - GraphStatistics: ✅
   - OriginalStructure: ✅
   - Property: ✅
   - **-4点**: テンプレート出力部分の型が未使用

#### ⚠️ 改善必要
- convertReactFlowToMaiML関数が未完成

---

### B. 処理の完全性（15/30点）

#### ✅ 完全移植された処理（15点）

1. **ユーティリティ関数（3/3）**
```typescript
// ✅ 完全一致
export function escapeXml(text: string | number | undefined | null): string
export function generateUUID(): string
```

2. **バリデーション（4/4）**
```typescript
// ✅ 完全移植
export function validatePetriNet(
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  allTemplates: TemplateMap | null = null, 
  allMethods: MethodData[] | null = null
): ValidationResult
```

3. **Document/Property/Content生成（4/4）**
```typescript
// ✅ 完全移植
export function buildDocumentXML(documentData: DocumentData | null): string
export function buildPropertyXML(prop: Property, indentLevel = 5): string
function buildContentXML(content: Property, indentLevel = 6): string
```

4. **共通テンプレート生成（4/4）**
```typescript
// ✅ 完全移植
function buildCommonTemplateXML(
  node: Node<NodeData>, 
  templateType: string, 
  allPlaces: Node<NodeData>[] = [], 
  allNodes: Node<NodeData>[] = []
): string
```

#### ❌ 未実装部分（-15点）

**1. materialTemplate要素群の出力（-5点）**

移植元（約70行）:
```javascript
// materialTemplate要素群
materialTemplates.forEach(node => {
  const template = node.data.template;
  const templateId = template.templateId || template.id || `MT${node.id}`;
  
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    maiml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = places.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `MT${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    maiml += `          <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    maiml += `          </insertion>\n`;
  }
  
  // name（オプション）
  if (template.name) {
    maiml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description（オプション）
  if (template.description) {
    maiml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群（insertion型を除外して出力）
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter(prop => prop.type !== 'insertion')
      .forEach(prop => {
        maiml += buildPropertyXML(prop, 5);
      });
  }
  
  // placeRef（複数対応）
  placeRefs.forEach((placeRef, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_${index}`;
    maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
  });
  
  maiml += `        </materialTemplate>\n`;
});
```

移植先: **未実装**

**2. conditionTemplate要素群の出力（-5点）**

移植元（約70行）:
```javascript
// conditionTemplate要素群
conditionTemplates.forEach(node => {
  // materialTemplateと同様の処理（約70行）
  maiml += `        <conditionTemplate id="${escapeXml(templateId)}">\n`;
  // ... 同様の処理 ...
  maiml += `        </conditionTemplate>\n`;
});
```

移植先: **未実装**

**3. resultTemplate要素群の出力（-5点）**

移植元（約70行）:
```javascript
// resultTemplate要素群
resultTemplates.forEach(node => {
  // materialTemplateと同様の処理（約70行）
  maiml += `        <resultTemplate id="${escapeXml(templateId)}">\n`;
  // ... 同様の処理 ...
  maiml += `        </resultTemplate>\n`;
});
```

移植先: **未実装**

#### 📊 実装状況の比較

| 処理 | 移植元 | 移植先 | 状態 |
|------|--------|--------|------|
| escapeXml | ✅ | ✅ | 完全一致 |
| generateUUID | ✅ | ✅ | 完全一致 |
| validatePetriNet | ✅ | ✅ | 完全一致 |
| buildDocumentXML | ✅ | ✅ | 完全一致 |
| buildPropertyXML | ✅ | ✅ | 完全一致 |
| buildContentXML | ✅ | ✅ | 完全一致 |
| buildCommonTemplateXML | ✅ | ✅ | 完全一致 |
| materialTemplate出力 | ✅ (70行) | ❌ | 未実装 |
| conditionTemplate出力 | ✅ (70行) | ❌ | 未実装 |
| resultTemplate出力 | ✅ (70行) | ❌ | 未実装 |
| XML署名処理 | ✅ | ❌ | 未実装 |

---

### C. TypeScript化（20/20点）

#### ✅ 型定義の完璧性

**実装済みの型定義（13個）:**

```typescript
// ✅ 完璧な型定義
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GraphStatistics {
  totalNodes: number;
  places: number;
  transitions: number;
  edges: number;
  placesByType: {
    material: number;
    condition: number;
    result: number;
  };
}

export interface OriginalStructure {
  protocol?: { id?: string; uuid?: string; };
  method?: { id?: string; uuid?: string; };
  pnml?: { id?: string; uuid?: string; name?: string; description?: string; };
  program?: { id?: string; uuid?: string; description?: string; };
  instructions?: Record<string, { ... }>;
  data?: { id?: string; rawXML?: string; };
  eventLog?: { id?: string; rawXML?: string; };
}

export interface Property {
  key?: string;
  name?: string;
  type?: string;
  xsiType?: string;
  attributes?: Record<string, string>;
  elements?: Record<string, string>;
  // ... 15個のプロパティ定義
}
```

**評価:**
- any型の使用: **0個** ✅
- 型定義の完全性: **100%** ✅
- インターフェースの明確性: **完璧** ✅

---

### D. Ant Design対応（10/10点）

**該当なし** - ユーティリティ関数のためUIコンポーネント不使用

---

### E. 依存関係（10/10点）

#### ✅ インポートの最適化

**移植先（editorv2）:**
```typescript
// ✅ React Flow公式型
import { Node, Edge } from 'reactflow';

// ✅ 内部型システム
import { 
  NodeData,
  NodeType,
  PlaceType,
  Template,
  TemplateMap,
  DocumentData,
  MethodData
} from '../../types';
```

**評価**: 🟢 完璧
- 型システムとの完全な統合
- any型を使用せず、すべて明示的な型定義

---

## 🔍 未実装部分の詳細分析

### 未実装箇所の特定

**convertReactFlowToMaiML関数内（830行目付近）:**

```typescript
// ✅ ここまでは実装済み
console.log('📊 [convertReactFlowToMaiML] テンプレート統計:', {
  material: materialTemplates.length,
  condition: conditionTemplates.length,
  result: resultTemplates.length
});
}

// ❌ ここから未実装（約200行）
// materialTemplate要素群の出力は次のメッセージで実装します
maiml += `      </program>\n`;
maiml += `    </method>\n`;
maiml += `  </protocol>\n`;
```

### 必要な実装内容

#### 1. materialTemplate要素群（約70行）
- uuid生成または使用
- テンプレート継承（templateRef）
- insertion要素
- name/description
- property要素群（buildPropertyXML使用）
- placeRef（複数対応）

#### 2. conditionTemplate要素群（約70行）
- materialTemplateと同様の処理

#### 3. resultTemplate要素群（約70行）
- materialTemplateと同様の処理

#### 4. XML署名処理（オプション、約20行）
```javascript
// 移植元のみ実装
if (documentData && documentData.signature && documentData.signature.enabled) {
  try {
    const { signMaiMLXml } = await import('../xmlSignature.js');
    console.log('📝 XML署名を実行します...');
    const { signedXml, digestValue } = await signMaiMLXml(maiml);
    console.log('✅ XML署名が完了しました');
    return signedXml;
  } catch (error) {
    console.error('❌ XML署名エラー:', error);
    return maiml;
  }
}
```

---

## ⚠️ 影響範囲

### 機能への影響

#### 1. 保存機能への影響（致命的）
```typescript
// ❌ テンプレート情報が保存されない
const maiml = await convertReactFlowToMaiML(nodes, edges, ...);
// → materialTemplate要素が出力されない
// → conditionTemplate要素が出力されない
// → resultTemplate要素が出力されない
```

**結果:**
- ❌ ユーザーが設定したプロパティが失われる
- ❌ テンプレート構造が保存されない
- ❌ 再読込時にデータが欠落する

#### 2. データ整合性への影響
```typescript
// 保存時
nodes: [Place1, Place2, Transition1]
templates: [MaterialTemplate1, ConditionTemplate1]

// ❌ 保存されるXML
<pnml>
  <place id="Place1">...</place>
  <place id="Place2">...</place>
  <transition id="Transition1">...</transition>
</pnml>
<!-- ❌ materialTemplate要素なし -->
<!-- ❌ conditionTemplate要素なし -->

// 再読込時
nodes: [Place1, Place2, Transition1]
templates: []  // ❌ テンプレート情報が失われている
```

#### 3. ユーザー体験への影響
- ❌ 編集内容が保存されない
- ❌ プロパティ設定がリセットされる
- ❌ データ損失のリスク

---

## 📋 修正アクション

### Priority 1: テンプレート出力の実装（必須）

**追加が必要なコード（約200行）:**

```typescript
// materialTemplate要素群
materialTemplates.forEach(node => {
  const template = node.data.template;
  if (!template) return;
  
  const templateId = template.templateId || template.id || `MT${node.id}`;
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    maiml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = places.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || 
        inheritNode.data.template.id || `MT${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    maiml += `          <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    maiml += `          </insertion>\n`;
  }
  
  // name/description
  if (template.name) {
    maiml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  if (template.description) {
    maiml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
  }
  
  // placeRef
  placeRefs.forEach((placeRef, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_${index}`;
    maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
  });
  
  maiml += `        </materialTemplate>\n`;
});

// conditionTemplate要素群（同様の処理）
conditionTemplates.forEach(node => {
  // materialTemplateと同様（約70行）
});

// resultTemplate要素群（同様の処理）
resultTemplates.forEach(node => {
  // materialTemplateと同様（約70行）
});
```

### Priority 2: XML署名処理の実装（オプション）

**追加が必要なコード（約20行）:**

```typescript
// XML署名処理（documentData.signature.enabled が true の場合）
if (documentData && documentData.signature && documentData.signature.enabled) {
  try {
    // xmlSignature.tsをインポート（動的インポート）
    const { signMaiMLXml } = await import('../xmlSignature');
    
    console.log('📝 XML署名を実行します...');
    const { signedXml, digestValue } = await signMaiMLXml(maiml);
    
    console.log('✅ XML署名が完了しました');
    console.log(`   DigestValue: ${digestValue}`);
    
    return signedXml;
  } catch (error) {
    console.error('❌ XML署名エラー:', error);
    console.warn('⚠️ 署名なしのMaiMLを返します');
    return maiml;
  }
}

return maiml;
```

---

## 🎯 推奨事項

### 1. 早急な実装完了（必須）

**理由:**
- 保存機能が動作しない
- ユーザーデータが失われる
- 本番環境で使用不可

**作業量:**
- 約200行のコード追加
- 移植元からのコピー&型修正
- 推定時間: 2-3時間

### 2. テストケース追加（推奨）

```typescript
describe('convertReactFlowToMaiML', () => {
  it('materialTemplate要素を出力する', async () => {
    const nodes: Node<NodeData>[] = [/* テストデータ */];
    const edges: Edge[] = [/* テストデータ */];
    const templates: TemplateMap = {
      material: [{ id: 'MT1', methodId: 'M1', placeRefs: ['P1'], properties: [] }],
      condition: [],
      result: []
    };
    
    const maiml = await convertReactFlowToMaiML(nodes, edges, {}, null, null, templates, null);
    
    expect(maiml).toContain('<materialTemplate id="MT1">');
    expect(maiml).toContain('<uuid>');
    expect(maiml).toContain('<placeRef');
    expect(maiml).toContain('</materialTemplate>');
  });
  
  it('conditionTemplate要素を出力する', async () => {
    // 同様のテスト
  });
  
  it('resultTemplate要素を出力する', async () => {
    // 同様のテスト
  });
});
```

### 3. ドキュメント更新（推奨）

```typescript
/**
 * React FlowのノードとエッジからMaiML XMLを生成
 * 
 * @description
 * - 完全なMaiML 1.0形式のXMLを生成
 * - materialTemplate/conditionTemplate/resultTemplate要素を出力
 * - 共通テンプレート対応
 * - 複数メソッド対応
 * - XML署名対応（オプション）
 * 
 * @param nodes - React Flowノード配列
 * @param edges - React Flowエッジ配列
 * @param metadata - メタデータ
 * @param documentData - Document情報
 * @param originalStructure - 元MaiML構造情報
 * @param allTemplates - TemplateContext のテンプレート
 * @param allMethods - 全メソッドの配列
 * @returns Promise<string> MaiML XML文字列
 * @throws {Error} バリデーションエラー時
 */
export async function convertReactFlowToMaiML(
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  metadata: Record<string, string> = {}, 
  documentData: DocumentData | null = null, 
  originalStructure: OriginalStructure | null = null, 
  allTemplates: TemplateMap | null = null, 
  allMethods: MethodData[] | null = null
): Promise<string>
```

---

## 📊 機能比較表

| 機能 | 移植元 | 移植先 | 状態 | 行数 |
|------|--------|--------|------|------|
| escapeXml | ✅ | ✅ | 完全一致 | 10行 |
| generateUUID | ✅ | ✅ | 完全一致 | 8行 |
| buildPlaceXML | ✅ | ✅ | 完全一致 | 35行 |
| buildTransitionXML | ✅ | ✅ | 完全一致 | 12行 |
| buildArcXML | ✅ | ✅ | 完全一致 | 8行 |
| validatePetriNet | ✅ | ✅ | 完全一致 | 150行 |
| buildDocumentXML | ✅ | ✅ | 完全一致 | 80行 |
| buildPropertyXML | ✅ | ✅ | 完全一致 | 60行 |
| buildContentXML | ✅ | ✅ | 完全一致 | 25行 |
| buildCommonTemplateXML | ✅ | ✅ | 完全一致 | 80行 |
| materialTemplate出力 | ✅ | ❌ | **未実装** | 70行 |
| conditionTemplate出力 | ✅ | ❌ | **未実装** | 70行 |
| resultTemplate出力 | ✅ | ❌ | **未実装** | 70行 |
| XML署名処理 | ✅ | ❌ | **未実装** | 20行 |
| TypeScript型定義 | ❌ | ✅ | ✨ 完璧 | 100行 |

---

## 🎓 学習ポイント

### 大規模ファイルの移植手法

1. **段階的な移植**
   - ✅ ユーティリティ関数から実装
   - ✅ バリデーション処理を実装
   - ⚠️ メイン処理は未完成
   - ❌ 動作確認が不十分

2. **TypeScript化のベストプラクティス**
   - ✅ 完璧な型定義（100%）
   - ✅ any型を使用しない
   - ✅ インターフェースで構造を明示

3. **未完成での中断リスク**
   - ❌ 重要な処理が欠けている
   - ❌ 動作しない状態でコミット
   - ❌ 後続作業への影響大

---

## 📝 結論

### 総合評価: 🔴 未完成（78点）

**判定**: ❌ **重要な処理が未実装のため本番使用不可**

#### 評価理由
1. ✅ **TypeScript化は完璧**（20/20点）
   - 型定義100%
   - any型0個
   
2. ✅ **ユーティリティ関数は完全移植**（15/15点）
   - escapeXml, generateUUID
   - buildDocumentXML, buildPropertyXML
   - buildCommonTemplateXML
   
3. ❌ **メイン処理が未完成**