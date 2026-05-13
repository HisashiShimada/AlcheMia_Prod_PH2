# reactFlowToMaiml.ts 移植検証票

**検証日時**: 2026-01-30 08:15  
**検証者**: Cline  
**ファイル**: `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`  
**移植元**: `reference/frontend/src/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js`

---

## 📊 検証結果サマリー

| 項目 | 評価 | 詳細 |
|------|------|------|
| **総合評価** | **88点 ⚠️** | **未完成の移植** |
| 構造の一致性 | 95% | 主要構造は一致 |
| ロジックの一致性 | 85% | Template出力部分が未完成 |
| 型安全性 | 100% | TypeScript型定義完備 |
| コメント | 95% | ほぼ完全保持 |

### 評価コメント

**reactFlowToMaiml.tsは未完成の移植です。**

主要な関数とロジックはほぼ完璧に移植されていますが、最も重要な`convertReactFlowToMaiML`関数の最後の部分（materialTemplate/conditionTemplate/resultTemplateのXML出力）が未実装です。この部分がないと、テンプレート情報を含むMaiML XMLが正しく生成されません。

**重大な問題**: Template要素のXML出力が欠落（-12点の減点）

---

## 🎯 ファイルの役割

### 主要機能

React FlowのノードとエッジからMaiML XML形式に変換する機能を提供します。

### 実装機能

1. **XML特殊文字エスケープ** - escapeXml関数
2. **UUID生成** - generateUUID関数
3. **Place/Transition/Arc XML生成** - buildXXXXML関数
4. **ペトリネット構造バリデーション** - validatePetriNet関数
5. **Document要素XML生成** - buildDocumentXML関数
6. **Property要素XML生成** - buildPropertyXML関数（再帰対応）
7. **Content要素XML生成** - buildContentXML関数
8. **共通テンプレートXML生成** - buildCommonTemplateXML関数
9. **MaiML XML完全生成** - convertReactFlowToMaiML関数 ⚠️ **未完成**

---

## ✅ 移植完了項目

### 1. 型定義の完璧な実装

#### インターフェース定義

```typescript
// ✅ editorv2版（完璧な型定義）
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
  // MaiMLParser形式とNestedPropertyEditor形式の両方に対応
  key?: string;
  name?: string;
  type?: string;
  xsiType?: string;
  attributes?: Record<string, string>;
  elements?: Record<string, string>;
  // ... 20以上のプロパティ定義
}
```

完璧な型定義により、すべての関数とデータ構造が型安全になっています。

### 2. escapeXml関数

**完全に一致** ✅

```typescript
export function escapeXml(text: string | number | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

型定義が追加され、undefinedとnullを許容するようになっています。

### 3. generateUUID関数

**完全に一致** ✅

### 4. buildPlaceXML関数

**完全に一致** ✅

### 5. buildTransitionXML関数

**完全に一致** ✅

### 6. buildArcXML関数

**完全に一致** ✅

### 7. validatePetriNet関数

**ロジック完全一致** ✅

```typescript
export function validatePetriNet(
  nodes: Node<NodeData>[], 
  edges: Edge[], 
  allTemplates: TemplateMap | null = null, 
  allMethods: MethodData[] | null = null
): ValidationResult
```

型定義が追加され、複数メソッド対応、共通テンプレート対応のバリデーションロジックが完璧に移植されています。

### 8. buildDocumentXML関数

**ロジック完全一致** ✅

creators, vendors, owners, instrumentsの配列対応、後方互換性維持のロジックが完全に移植されています。

### 9. buildPropertyXML関数

**ロジック完全一致** ✅

```typescript
export function buildPropertyXML(prop: Property, indentLevel = 5): string
```

NestedPropertyEditor形式とMaiMLParser形式の両方に対応した再帰的なProperty要素生成ロジックが完全に移植されています。

### 10. buildContentXML関数

**ロジック完全一致** ✅

```typescript
function buildContentXML(content: Property, indentLevel = 6): string
```

MaiMLParser.jsデータ構造に対応したcontent要素生成ロジックが完全に移植されています。

### 11. buildCommonTemplateXML関数

**ロジック完全一致** ✅

```typescript
function buildCommonTemplateXML(
  node: Node<NodeData>, 
  templateType: string, 
  allPlaces: Node<NodeData>[] = [], 
  allNodes: Node<NodeData>[] = []
): string
```

複数placeRef対応、protocol直下用の共通テンプレートXML生成ロジックが完全に移植されています。

### 12. convertReactFlowToMaiML関数（前半）

**前半部分は完全移植** ✅

以下の処理が完璧に移植されています：
- バリデーション
- ファイル名決定
- ノード分類
- ID取得（documentDataからIDを取得）
- XMLヘッダー生成
- MaiML要素開始
- Document要素生成
- 共通テンプレート取得とprotocol直下への配置
- protocol/method/pnml構造生成
- Place要素群生成
- Transition要素群生成
- Arc要素群生成
- Program要素生成
- Instruction要素群生成
- TemplateContextからのテンプレート取得

---

## 🚨 未完成部分（重大な問題）

### ⚠️ 問題: materialTemplate/conditionTemplate/resultTemplateのXML出力が欠落

#### reference版（完全実装）

reference版では、以下の処理が実装されています：

```javascript
// materialTemplate要素群（約50行）
materialTemplates.forEach(node => {
  const template = node.data.template;
  const templateId = template.templateId || template.id || `MT${node.id}`;
  
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
  // uuid
  // templateRef（継承）
  // insertion要素
  // name
  // description
  // property要素群（insertion型を除外）
  // placeRef（複数対応）
  maiml += `        </materialTemplate>\n`;
});

// conditionTemplate要素群（約50行）
// 同様の処理

// resultTemplate要素群（約50行）
// 同様の処理
```

#### editorv2版（未実装）

```typescript
// materialTemplate要素群の出力は次のメッセージで実装します
maiml += `      </program>\n`;
```

**コメントだけで実装が欠落しています。**

この部分がないと：
- ❌ materialTemplateが出力されない
- ❌ conditionTemplateが出力されない
- ❌ resultTemplateが出力されない
- ❌ テンプレート情報を含むMaiMLが生成できない

**評価**: 🚫 **重大な未完成部分**（-12点）

### 必要な実装

```typescript
// ✅ 以下の実装が必要
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
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
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

// conditionTemplate要素群（同様の実装が必要）
conditionTemplates.forEach(node => {
  // 上記と同様の処理（templateIdのプレフィックスをCTに変更）
});

// resultTemplate要素群（同様の実装が必要）
resultTemplates.forEach(node => {
  // 上記と同様の処理（templateIdのプレフィックスをRTに変更）
});
```

---

## 🔍 その他の差異

### ⚠️ 差異2: XML署名処理の欠落

#### reference版

```javascript
// XML署名処理（documentData.signature.enabled が true の場合）
if (documentData && documentData.signature && documentData.signature.enabled) {
  try {
    const { signMaiMLXml } = await import('../xmlSignature.js');
    
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
```

#### editorv2版

**完全に欠落**

**評価**: ❌ 未実装（ただし、別途xmlSignature.tsが存在するため、統合は容易）

---

## 📈 型安全性の評価

### 完璧な型定義

#### 関数シグネチャ

```typescript
// ✅ 全ての関数に明示的な型定義
export function escapeXml(text: string | number | undefined | null): string
export function generateUUID(): string
export function validatePetriNet(...): ValidationResult
export function buildDocumentXML(documentData: DocumentData | null): string
export function buildPropertyXML(prop: Property, indentLevel = 5): string
export async function convertReactFlowToMaiML(...): Promise<string>
export function formatMaiMLXml(xml: string): string
export function formatValidationErrors(errors: string[]): string
export function getGraphStatistics(nodes: Node<NodeData>[], edges: Edge[]): GraphStatistics
```

すべての関数がTypeScriptの型システムを完全に活用しています。

#### 型エイリアスの活用

```typescript
// ✅ editorv2版の型からインポート
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

editorv2の型システムと完全に統合されています。

---

## 🏆 結論

### 総合評価: **88点 / 100点** ⚠️

**reactFlowToMaiml.tsは未完成の移植です。**

#### 成功要因

1. **完璧な型定義**: すべての関数とデータ構造が型安全
2. **主要関数の完全移植**: buildPropertyXML, buildDocumentXMLなど複雑な関数が完璧に移植
3. **バリデーションロジックの完全移植**: 複数メソッド対応、共通テンプレート対応
4. **Property/Content要素の完全実装**: 再帰的な構造を正確に移植
5. **共通テンプレートロジックの完全実装**: protocol直下への配置ロジックが完璧

#### 重大な問題

**-12点の減点理由:**

1. **Template要素のXML出力が未実装**（-10点）
   - materialTemplate要素群の出力が欠落
   - conditionTemplate要素群の出力が欠落
   - resultTemplate要素群の出力が欠落
   - この部分がないと、テンプレート情報を含むMaiMLが生成できない

2. **XML署名処理の欠落**（-2点）
   - reference版の署名処理が未実装
   - ただし、xmlSignature.tsが別途存在するため、統合は容易

#### 優れている点

- escapeXml関数の型定義強化（undefined, null許容）
- validatePetriNetの完璧な型定義
- buildPropertyXMLの再帰的実装（完全移植）
- buildCommonTemplateXMLの完全移植
- Property型の包括的な定義（20以上のプロパティ）
- OriginalStructure型の詳細な定義

#### 必須の修正事項

**最優先（必須）:**
```typescript
// ⚠️ materialTemplate/conditionTemplate/resultTemplateのXML出力を実装
// 約150行の実装が必要（各テンプレートタイプごとに約50行）
```

**高優先（推奨）:**
```typescript
// ⚠️ XML署名処理を統合
// xmlSignature.tsからインポートして統合
```

---

## 📋 検証完了確認

- [x] ファイル読み込み完了
- [x] 構造比較完了（主要構造は一致）
- [x] ロジック比較完了（Template出力部分が未完成）
- [x] 型定義確認完了（完璧）
- [x] コメント確認完了（ほぼ保持）
- [x] escapeXml/generateUUID確認完了（完全一致）
- [x] バリデーション関数確認完了（完全移植）
- [x] buildPropertyXML確認完了（完全移植）
- [x] convertReactFlowToMaiML確認完了（未完成）
- [x] 評価・採点完了
- [x] 検証票作成完了

---

## 🎯 Phase 2 進捗

**Phase 2 (utils/converters/) の2/3完了**

| No | ファイル | 得点 | 評価 |
|----|---------|------|------|
| 4 | maimlToReactFlow.ts | 95点 | ✨ 優秀 |
| 5 | reactFlowToMaiml.ts | 88点 | ⚠️ 未完成 |
| 6 | multiMethodConverter.ts | - | ⏳ 未着手 |

**Phase 2 平均点（暫定）**: **91.5点** ✅

---

**検証完了**: 2026-01-30 08:15  
**次の検証**: Phase 2 - multiMethodConverter.ts  
**重要**: reactFlowToMaiml.tsのTemplate出力部分の実装が最優先です