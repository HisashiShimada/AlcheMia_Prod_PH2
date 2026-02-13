# セッション1: MaimlParserTyped作成 実装計画書

## メタデータ
- **作成日時**: 2026-02-02 14:53
- **目的**: 型安全な新クラスMaimlParserTypedの作成
- **予定工数**: 2-3時間
- **親計画書**: docs/20260202_1445_型統一実装_目標整理.md

---

## 🎯 セッション1の目標

### 成果物
- `frontend/src/utils/maimlParserTyped.ts`（約500-800行）
- 基本的な型安全メソッド群
- 動作確認済みのクラス

### 達成条件
- [ ] MaimlParserTypedクラスが作成されている
- [ ] コンストラクタで型変換が成功している
- [ ] 基本アクセサメソッドが実装されている
- [ ] getTransitions()が実装されている（新規）
- [ ] getTemplates()が実装されている（新規）
- [ ] コンパイルエラーが0件
- [ ] 簡単なテストで動作確認完了

---

## 📋 実装タスク一覧

### Phase 1: ファイル作成と基本構造（30分）

#### タスク1-1: ファイル作成
```typescript
// frontend/src/utils/maimlParserTyped.ts
```

#### タスク1-2: インポート文の追加
```typescript
import xmljs from 'xml-js';
import { convertXmlJsToMaimlRoot } from './maimlTypeConverter';
import type { 
  MaimlRoot, 
  Protocol, 
  Method, 
  Transition,
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Property
} from '@/types/maiml-unified';
```

#### タスク1-3: クラス骨格の作成
```typescript
/**
 * 型安全なMAIMLパーサークラス
 * XSD準拠型のみを使用し、any型を一切使用しない
 */
export class MaimlParserTyped {
  private typedMaiml: MaimlRoot;
  private maimlString: string | null = null;
  
  constructor(maimlData: string | any) {
    // 実装予定
  }
}
```

---

### Phase 2: コンストラクタ実装（30分）

#### タスク2-1: XML文字列のパース
```typescript
constructor(maimlData: string | any) {
  // 1. XML文字列を保存
  if (typeof maimlData === 'string') {
    this.maimlString = maimlData;
  }
  
  // 2. xml-js形式に変換
  let xmlData: any;
  if (typeof maimlData === 'string') {
    try {
      xmlData = xmljs.xml2js(maimlData, { 
        compact: true,
        ignoreComment: true,
        alwaysChildren: false
      });
    } catch (error) {
      throw new Error(`XML parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    xmlData = maimlData;
  }
  
  // 3. XSD準拠型に変換
  try {
    this.typedMaiml = convertXmlJsToMaimlRoot(xmlData);
    console.log('✅ [MaimlParserTyped] 型変換成功');
  } catch (error) {
    console.error('❌ [MaimlParserTyped] 型変換失敗:', error);
    throw new Error(`MAIML type conversion error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### タスク2-2: エラーハンドリングの確認
- [ ] 不正なXML文字列でエラーが発生するか確認
- [ ] 型変換失敗時にエラーが発生するか確認

---

### Phase 3: 基本アクセサメソッド実装（30分）

#### タスク3-1: getTypedMaiml()
```typescript
/**
 * 型安全なMaimlRootを取得
 */
getTypedMaiml(): MaimlRoot {
  return this.typedMaiml;
}
```

#### タスク3-2: getProtocol()
```typescript
/**
 * Protocolを取得
 */
getProtocol(): Protocol {
  if (!this.typedMaiml.protocol) {
    throw new Error('Protocol not found in MAIML');
  }
  return this.typedMaiml.protocol;
}
```

#### タスク3-3: getMethods()
```typescript
/**
 * 全Methodを取得
 */
getMethods(): Method[] {
  const protocol = this.getProtocol();
  
  // methodが配列でない場合は配列化
  if (!protocol.method) {
    return [];
  }
  
  return Array.isArray(protocol.method) 
    ? protocol.method 
    : [protocol.method];
}
```

#### タスク3-4: getMethod()
```typescript
/**
 * 特定のMethodを取得
 */
getMethod(methodId: string): Method | null {
  const methods = this.getMethods();
  return methods.find(m => m.id === methodId) || null;
}
```

---

### Phase 4: getTransitions()実装（30-45分）

#### タスク4-1: Transitionデータ構造の定義
```typescript
/**
 * Transition情報（拡張版）
 */
export interface TransitionInfo {
  id: string;
  methodId: string;
  methodName?: string;
  name?: string;
  description?: string;
  hasInstruction: boolean;
  arcCount: number;
  arcs: Array<{
    id: string;
    source: string;
    target: string;
    type: 'input' | 'output';
  }>;
  category: 'experiment' | 'preparation' | 'finalization' | 'other';
}

export interface TransitionsResult {
  success: boolean;
  transitions: TransitionInfo[];
  metadata: {
    totalMethods: number;
    totalTransitions: number;
    categoryCounts: {
      experiment: number;
      preparation: number;
      finalization: number;
      other: number;
    };
  };
}
```

#### タスク4-2: getTransitions()実装
```typescript
/**
 * 全Transitionを取得（ExperimentWorker用）
 */
getTransitions(): TransitionsResult {
  const methods = this.getMethods();
  const allTransitions: TransitionInfo[] = [];
  
  methods.forEach((method, methodIndex) => {
    const methodId = method.id || `method_${methodIndex}`;
    const methodName = method.name;
    
    // pnml取得
    const pnml = method.pnml;
    if (!pnml) {
      return;
    }
    
    // transition取得
    const transitions = Array.isArray(pnml.transition) 
      ? pnml.transition 
      : pnml.transition ? [pnml.transition] : [];
    
    // arc取得
    const arcs = Array.isArray(pnml.arc)
      ? pnml.arc
      : pnml.arc ? [pnml.arc] : [];
    
    transitions.forEach(transition => {
      const transitionId = transition.id || '';
      
      // このtransitionに関連するarcを取得
      const relatedArcs = arcs.filter(arc => 
        arc.source === transitionId || arc.target === transitionId
      ).map(arc => ({
        id: arc.id || '',
        source: arc.source || '',
        target: arc.target || '',
        type: (arc.source === transitionId ? 'output' : 'input') as 'input' | 'output'
      }));
      
      // カテゴリ判定
      const category = this.determineTransitionCategory(transition, methodIndex, transitions.length);
      
      allTransitions.push({
        id: transitionId,
        methodId,
        methodName,
        name: transition.name,
        description: transition.description,
        hasInstruction: false, // TODO: program/instructionから判定
        arcCount: relatedArcs.length,
        arcs: relatedArcs,
        category
      });
    });
  });
  
  // メタデータ生成
  const categoryCounts = {
    experiment: allTransitions.filter(t => t.category === 'experiment').length,
    preparation: allTransitions.filter(t => t.category === 'preparation').length,
    finalization: allTransitions.filter(t => t.category === 'finalization').length,
    other: allTransitions.filter(t => t.category === 'other').length
  };
  
  return {
    success: true,
    transitions: allTransitions,
    metadata: {
      totalMethods: methods.length,
      totalTransitions: allTransitions.length,
      categoryCounts
    }
  };
}

/**
 * Transitionのカテゴリを判定
 */
private determineTransitionCategory(
  transition: any,
  methodIndex: number,
  totalTransitions: number
): 'experiment' | 'preparation' | 'finalization' | 'other' {
  const name = (transition.name || '').toLowerCase();
  
  // 準備系キーワード
  if (name.includes('準備') || name.includes('prepare') || name.includes('setup')) {
    return 'preparation';
  }
  
  // 終了系キーワード
  if (name.includes('終了') || name.includes('完了') || name.includes('finalize') || name.includes('cleanup')) {
    return 'finalization';
  }
  
  // 実験系キーワード
  if (name.includes('実験') || name.includes('測定') || name.includes('分析') || name.includes('experiment')) {
    return 'experiment';
  }
  
  return 'other';
}
```

---

### Phase 5: getTemplates()実装（45-60分）

#### タスク5-1: Templateデータ構造の定義
```typescript
/**
 * Template情報
 */
export interface TemplateInfo {
  id: string;
  type: 'material' | 'condition' | 'result';
  name?: string;
  placeRef?: string;
  transitionRef?: string;
  properties: PropertyInfo[];
}

export interface PropertyInfo {
  key: string;
  type: string;
  description?: string;
  units?: string;
  defaultValue?: string;
  properties?: PropertyInfo[]; // propertyListType用
}

export interface TemplatesResult {
  materials: TemplateInfo[];
  conditions: TemplateInfo[];
  results: TemplateInfo[];
}
```

#### タスク5-2: getTemplates()実装
```typescript
/**
 * 全Templateを取得
 */
getTemplates(): TemplatesResult {
  const protocol = this.getProtocol();
  const methods = this.getMethods();
  
  const materials: TemplateInfo[] = [];
  const conditions: TemplateInfo[] = [];
  const results: TemplateInfo[] = [];
  
  // protocol直下のテンプレート
  if (protocol.materialTemplate) {
    this.collectTemplates(protocol.materialTemplate, 'material', materials);
  }
  if (protocol.conditionTemplate) {
    this.collectTemplates(protocol.conditionTemplate, 'condition', conditions);
  }
  if (protocol.resultTemplate) {
    this.collectTemplates(protocol.resultTemplate, 'result', results);
  }
  
  // 各method内のテンプレート
  methods.forEach(method => {
    if (method.materialTemplate) {
      this.collectTemplates(method.materialTemplate, 'material', materials);
    }
    if (method.conditionTemplate) {
      this.collectTemplates(method.conditionTemplate, 'condition', conditions);
    }
    if (method.resultTemplate) {
      this.collectTemplates(method.resultTemplate, 'result', results);
    }
    
    // method.program内のテンプレート
    if (method.program) {
      const program = Array.isArray(method.program) ? method.program : [method.program];
      program.forEach(prog => {
        if (prog.materialTemplate) {
          this.collectTemplates(prog.materialTemplate, 'material', materials);
        }
        if (prog.conditionTemplate) {
          this.collectTemplates(prog.conditionTemplate, 'condition', conditions);
        }
        if (prog.resultTemplate) {
          this.collectTemplates(prog.resultTemplate, 'result', results);
        }
      });
    }
  });
  
  return { materials, conditions, results };
}

/**
 * テンプレートを収集
 */
private collectTemplates(
  templates: MaterialTemplate | ConditionTemplate | ResultTemplate | Array<MaterialTemplate | ConditionTemplate | ResultTemplate>,
  type: 'material' | 'condition' | 'result',
  result: TemplateInfo[]
): void {
  const templateArray = Array.isArray(templates) ? templates : [templates];
  
  templateArray.forEach(template => {
    const templateInfo: TemplateInfo = {
      id: template.id || '',
      type,
      name: template.name,
      placeRef: template.placeRef,
      transitionRef: template.transitionRef,
      properties: this.parseProperties(template.property)
    };
    
    result.push(templateInfo);
  });
}

/**
 * Propertyを解析
 */
private parseProperties(properties: Property | Property[] | undefined): PropertyInfo[] {
  if (!properties) {
    return [];
  }
  
  const propArray = Array.isArray(properties) ? properties : [properties];
  
  return propArray.map(prop => {
    const propertyInfo: PropertyInfo = {
      key: prop.key || '',
      type: prop.type || '',
      description: prop.description,
      units: prop.units,
      defaultValue: prop.defaultValue
    };
    
    // propertyListType の場合、ネストされたpropertyを再帰的に解析
    if (prop.type === 'propertyListType' && prop.property) {
      propertyInfo.properties = this.parseProperties(prop.property);
    }
    
    return propertyInfo;
  });
}
```

---

### Phase 6: 動作確認（30分）

#### タスク6-1: 簡単なテストコード作成
```typescript
// frontend/src/utils/__tests__/maimlParserTyped.test.ts
import { MaimlParserTyped } from '../maimlParserTyped';

describe('MaimlParserTyped', () => {
  test('コンストラクタでの型変換', () => {
    const sampleMaiml = `
      <maiml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <protocol>
          <method id="method_0">
            <pnml>
              <transition id="T001" name="サンプル準備" />
            </pnml>
          </method>
        </protocol>
      </maiml>
    `;
    
    const parser = new MaimlParserTyped(sampleMaiml);
    expect(parser.getTypedMaiml()).toBeDefined();
    expect(parser.getProtocol()).toBeDefined();
  });
  
  test('getMethods', () => {
    // テスト実装
  });
  
  test('getTransitions', () => {
    // テスト実装
  });
  
  test('getTemplates', () => {
    // テスト実装
  });
});
```

#### タスク6-2: 実際のMAIMLファイルで動作確認
- [ ] GC-MS.maimlで動作確認
- [ ] XRF.maimlで動作確認
- [ ] エラーケースの確認

---

## 🚨 想定される問題と対策

### 問題1: 型定義不足の発見

**症状**: convertXmlJsToMaimlRootで変換エラー

**対策**:
1. エラーメッセージを確認
2. 不足している型定義を特定
3. maiml-unified.tsに追加定義
4. または一時的にany型で回避（要報告）

### 問題2: propertyListType の複雑なネスト

**症状**: ネストされたpropertyの解析が不正確

**対策**:
1. parseProperties()を再帰的に実装
2. 最大ネスト深度を設定（無限ループ防止）
3. テストケースで検証

### 問題3: 空要素の取り扱い

**症状**: `<property key="..." />` が正しく取得できない

**対策**:
1. xml-jsのオプション調整
2. または型変換時に空要素を補完

---

## ✅ 完了チェックリスト

### コード実装
- [ ] maimlParserTyped.tsファイル作成
- [ ] インポート文追加
- [ ] クラス骨格作成
- [ ] コンストラクタ実装
- [ ] getTypedMaiml()実装
- [ ] getProtocol()実装
- [ ] getMethods()実装
- [ ] getMethod()実装
- [ ] getTransitions()実装
- [ ] determineTransitionCategory()実装
- [ ] getTemplates()実装
- [ ] collectTemplates()実装
- [ ] parseProperties()実装

### テスト
- [ ] 簡単なテストコード作成
- [ ] コンパイルエラー0件
- [ ] 実際のMAIMLファイルで動作確認
- [ ] エラーケースの確認

### ドキュメント
- [ ] JSDocコメント追加
- [ ] 型定義不足レポート作成（もしあれば）
- [ ] セッション1完了報告作成

---

## 📊 進捗管理

### 予定時刻
- Phase 1: 14:55-15:25（30分）
- Phase 2: 15:25-15:55（30分）
- Phase 3: 15:55-16:25（30分）
- Phase 4: 16:25-17:10（45分）
- Phase 5: 17:10-18:10（60分）
- Phase 6: 18:10-18:40（30分）

### 実績記録
- Phase 1: 開始______、完了______（____分）
- Phase 2: 開始______、完了______（____分）
- Phase 3: 開始______、完了______（____分）
- Phase 4: 開始______、完了______（____分）
- Phase 5: 開始______、完了______（____分）
- Phase 6: 開始______、完了______（____分）

---

## 📝 次のセッションへの引き継ぎ

セッション1完了後、以下を報告します：

1. **完成したファイル**: maimlParserTyped.ts
2. **実装したメソッド一覧**
3. **動作確認結果**
4. **発見された型定義不足**（もしあれば）
5. **セッション2で実装すべき内容**

---

**Status**: Ready to Start
**開始時刻**: 2026-02-02 14:55（予定）