# タスク計画書: maimlParser型変換統合

## メタデータ
- **作成日時**: 2026-02-02 13:34
- **タスクID**: maimlParser型変換統合
- **優先度**: 高
- **推定工数**: 4-6時間

## 1. タスク概要

既存の`maimlParserExp.ts`のxml-js使用箇所を、XSDから生成された型定義（`maiml-schema.ts`, `maiml-type-guards.ts`, `maiml-unified.ts`）に統一する。

**🔄 方針変更（2026-02-02 13:56）:**
- ❌ デュアル型システム（既存型+新型の併存）は採用しない
- ✅ XSD準拠型に統一した単一型システムへ移行
- ✅ 段階的な移行で既存機能への影響を最小化
- ✅ 移行完了後は型安全性を完全確保

**統一型システムのメリット:**
- 型定義が一箇所に集約（保守性向上）
- TypeScriptの型チェックが完全に機能
- 将来のMAIML仕様変更に柔軟に対応
- コードの可読性向上

## 2. 目的と期待される成果（統一型システム版）

### 目的
1. **型定義の一元化**: XSD準拠型のみを使用し、any型を排除
2. **完全な型安全性**: TypeScriptの型チェックをフル活用
3. **保守性の向上**: 型定義変更時の影響範囲を明確化
4. **段階的移行**: 既存機能を壊さず、計画的に型を統一

### 期待される成果
- [x] Phase 1: 型変換ユーティリティ関数の実装 ✅
- [x] Phase 2初回: maimlParserExp.tsへの型変換統合 ✅
- [ ] **Phase 2改訂: 統一型システムへの移行計画**
  - [ ] 段階的移行戦略の策定
  - [ ] 旧型フィールド（data, maiml）の段階的廃止計画
  - [ ] 全メソッドのXSD準拠型への書き換え優先順位
- [ ] Phase 3: 動作確認とテスト
- [ ] Phase 4: ドキュメント作成

## 3. 実装ステップ（統一型システム版）

### Phase 1: 型変換ユーティリティの作成（✅完了済み）
- [x] `frontend/src/utils/maimlTypeConverter.ts`を新規作成
- [x] xml-js結果からProperty型への変換関数
- [x] xml-js結果からMaimlRoot型への変換関数
- [x] 型ガード関数の活用

**注意**: Phase 1は既に完了していますが、maimlTypeConverter.tsが実際に使用されているかは未確認です。

### Phase 2改訂: 統一型システムへの移行（3-4時間）

#### Phase 2-1: 基盤整備
- [ ] maimlParserExp.tsのリファクタリング準備
  - [ ] 旧型フィールド（data, maiml）を段階的に削除する計画
  - [ ] typedMaimlをメインフィールドに昇格
  - [ ] 全メソッドの書き換え優先順位を決定

#### Phase 2-2: コア変換の統一
- [ ] コンストラクタの完全書き換え
  - [ ] xml2js → 型変換を唯一のパースパスにする
  - [ ] this.data, this.maimlを廃止
  - [ ] this.typedMaimlのみを保持
  - [ ] エラーハンドリングの強化

#### Phase 2-3: アクセサメソッドの書き換え（高優先度）
- [ ] getProtocol() → XSD準拠型に書き換え
- [ ] getMethods() → XSD準拠型に書き換え
- [ ] getProperty() → XSD準拠型に書き換え
- [ ] getProperties() → XSD準拠型に書き換え

#### Phase 2-4: 実験管理メソッドの書き換え（中優先度）
- [ ] getTransitionsForExperimentManager() → XSD準拠型に書き換え
- [ ] getTemplates() → XSD準拠型に書き換え
- [ ] getTemplatesForPetriNetViewer() → XSD準拠型に書き換え

#### Phase 2-5: DOM関連メソッドの統合（低優先度）
- [ ] getTemplatePropertiesFromDOM() → 廃止を検討
- [ ] DOM Parserの必要性を再評価
- [ ] 必要であればXSD準拠型との統合方法を検討

### Phase 3: 動作確認とテスト（1-1.5時間）
- [ ] 既存の使用箇所で動作確認
  - [ ] `petriNetExtractor.ts`の動作確認
  - [ ] `petriNetExtractorEnhanced.ts`の動作確認
  - [ ] 既存の3メソッドが正常動作することを確認
- [ ] 新しい型安全メソッドのテスト
  - [ ] `getTypedMaiml()`が正しい型を返すか
  - [ ] Property型変換が正確か
  - [ ] ネスト構造が正しく変換されるか
- [ ] エッジケースのテスト
  - [ ] 空のProperty
  - [ ] 未定義のxsi:type
  - [ ] 不正なXML構造

### Phase 4: ドキュメント作成（0.5-1時間）
- [ ] 型変換ロジックの説明
- [ ] 使用例の追加
- [ ] 移行ガイドの作成
  - [ ] 既存コード: xml-js形式を継続使用可能
  - [ ] 新規コード: 型安全メソッドを推奨

## 4. 影響範囲（統一型システム版）

### 変更するファイル

#### 段階1: 型変換基盤（✅完了済み）
1. **新規作成**: `frontend/src/utils/maimlTypeConverter.ts`
   - xml-js形式からXSD準拠型への変換
   - 300-400行
   - **状態**: ファイルは作成済みだが、maimlParserExp.tsでは未使用

#### 段階2: maimlParserExp.tsの完全書き換え（⚠️未実施）
2. **大幅変更**: `frontend/src/utils/maimlParserExp.ts`
   - ⚠️ **現状**: 旧型フィールド（data, maiml）のみで実装されている
   - ⚠️ **typedMaimlフィールドは存在しない**
   - Phase 1-2の型変換統合は未実施の状態
   - 変更規模: 400-500行（ほぼ全面書き換え）

**重要な発見（2026-02-02 14:25）:**
- maimlParserExp.tsは旧型のみで実装されている
- typedMaimlフィールドは追加されていない
- maimlTypeConverterの統合は未実施
- Phase 1-2は「計画のみ」で実装されていない

#### 段階3: 使用側の修正（影響大）
3. **要修正**: `frontend/src/utils/petriNetExtractor.ts`
   - buildTemplateMap(), buildNodeData()の型修正
   - parser.maiml → parser.getTypedMaiml()

4. **要修正**: `frontend/src/utils/petriNetExtractorEnhanced.ts`
   - enhancedBuildNodeData()の型修正
   - 同様にXSD準拠型に対応

5. **要調査**: その他の使用箇所
   - `docs/20260202_1306_使用箇所調査_完了報告.md` 参照
   - 全ての使用箇所でコンパイルエラーが発生する可能性

### 影響を受ける機能（統一型システム版）

**⚠️ 大きな影響（全面的な修正が必要）:**
- ❌ `petriNetExtractor.ts` - 型修正必須
- ❌ `petriNetExtractorEnhanced.ts` - 型修正必須
- ❌ PetriNetエディタ関連コンポーネント - 連鎖的な修正
- ❌ テンプレート編集関連 - 型修正必須

**破壊的変更のリスク:**
- maimlParserExp.tsの既存メソッドの戻り値型が変わる
- 使用側で型エラーが大量発生する可能性
- 段階的な移行が難しく、一気に修正が必要

## 5. 技術的詳細

### 型変換の実装例

#### Property変換
```typescript
// maimlTypeConverter.ts
import type { Property, PropertyType } from '@/types/maiml-unified';

export function convertXmlJsProperty(xmlProp: any): Property {
  const key = xmlProp._attributes?.key || '';
  const xsiType = xmlProp._attributes?.['xsi:type'] || 'stringType';
  const description = xmlProp.description?._text || undefined;
  
  // PropertyListTypeの場合（ネスト構造）
  if (xsiType === 'propertyListType') {
    const properties: Property[] = [];
    if (xmlProp.property) {
      const propArray = Array.isArray(xmlProp.property) 
        ? xmlProp.property 
        : [xmlProp.property];
      propArray.forEach(p => {
        properties.push(convertXmlJsProperty(p)); // 再帰
      });
    }
    return {
      key,
      'xsi:type': 'propertyListType',
      description,
      properties
    };
  }
  
  // 数値型の場合
  if (xsiType === 'intType' || xsiType === 'doubleType' || xsiType === 'floatType') {
    const value = parseFloat(xmlProp.value?._text || '0');
    return {
      key,
      'xsi:type': xsiType as PropertyType,
      description,
      value,
      units: xmlProp._attributes?.units,
      formatString: xmlProp._attributes?.formatString,
      scaleFactor: parseFloat(xmlProp._attributes?.scaleFactor || '1.0')
    } as Property;
  }
  
  // 文字列型の場合（デフォルト）
  return {
    key,
    'xsi:type': xsiType as PropertyType,
    description,
    value: xmlProp.value?._text || ''
  } as Property;
}
```

#### MaimlRoot変換
```typescript
export function convertXmlJsToMaimlRoot(xmlData: any): MaimlRoot {
  const maiml = xmlData.maiml || xmlData;
  
  return {
    version: maiml._attributes?.version || '1.0',
    'xsi:type': 'maimlRootType',
    document: convertDocument(maiml.document),
    protocol: convertProtocol(maiml.protocol),
    data: maiml.data ? convertData(maiml.data) : undefined,
    eventLog: maiml.eventLog ? convertEventLog(maiml.eventLog) : undefined
  };
}

function convertProtocol(xmlProtocol: any): Protocol {
  // methodを配列として正規化
  const methods = Array.isArray(xmlProtocol.method)
    ? xmlProtocol.method
    : (xmlProtocol.method ? [xmlProtocol.method] : []);
  
  return {
    id: xmlProtocol._attributes?.id,
    uuid: xmlProtocol.uuid?._text,
    name: xmlProtocol.name?._text,
    description: xmlProtocol.description?._text,
    method: methods.map(convertMethod)
  };
}

function convertMethod(xmlMethod: any): Method {
  const pnml = Array.isArray(xmlMethod.pnml)
    ? xmlMethod.pnml
    : (xmlMethod.pnml ? [xmlMethod.pnml] : []);
  
  const program = Array.isArray(xmlMethod.program)
    ? xmlMethod.program
    : (xmlMethod.program ? [xmlMethod.program] : []);
  
  return {
    id: xmlMethod._attributes?.id,
    uuid: xmlMethod.uuid?._text,
    name: xmlMethod.name?._text,
    description: xmlMethod.description?._text,
    pnml: pnml.map(convertPNML),
    program: program.map(convertProgram)
  };
}
```

### maimlParserExp.ts統合例
```typescript
// maimlParserExp.ts
import { convertXmlJsToMaimlRoot } from './maimlTypeConverter';
import type { MaimlRoot, Property, Protocol } from '@/types/maiml-unified';

export class MaiMLParserExp {
  private data: MaimlStructure;
  private maiml: MaimlStructure['maiml'];
  private maimlDataString: string | null;
  private domDocument: Document | null;
  
  // ✅ 新規追加: 型安全な構造
  private typedMaiml: MaimlRoot | null = null;

  constructor(maimlData: string | any) {
    // 既存のxml-jsパース処理（変更なし）
    if (typeof maimlData === 'string') {
      this.data = xmljs.xml2js(maimlData, { compact: true });
    } else {
      this.data = maimlData;
    }
    
    this.maiml = this.data.maiml || this.data;
    
    // ✅ 新規追加: 型変換の実行
    try {
      this.typedMaiml = convertXmlJsToMaimlRoot(this.data);
      console.log('✅ [MaiMLParser] 型変換成功');
    } catch (error) {
      console.warn('⚠️ [MaiMLParser] 型変換失敗:', error);
      this.typedMaiml = null;
    }
    
    // 既存のDOMParser処理（変更なし）
    // ...
  }
  
  // ✅ 新規追加: 型安全なアクセサメソッド
  getTypedMaiml(): MaimlRoot | null {
    return this.typedMaiml;
  }
  
  getTypedProtocol(): Protocol | null {
    return this.typedMaiml?.protocol || null;
  }
  
  // 既存メソッドは全て維持（変更なし）
  getTransitionsForExperimentManager() { ... }
  getTemplates() { ... }
  // ...
}
```

## 6. 型定義不足時の対応フロー

### 想定される不足項目

実装中に以下のような型定義不足が発見される可能性があります：

1. **content要素**（GC-MS.maimlで使用）
   - ResultTemplate内のcontent要素
   - 現在の型定義には未定義

2. **カスタム属性**
   - xsi:type以外の独自属性
   - ベンダー固有の拡張属性

3. **拡張要素**
   - XSD仕様外の独自要素
   - バージョン間の差異による追加要素

4. **Property型の未対応バリエーション**
   - xsi:typeの新しい値
   - 実MAIMLファイル固有の型

### 対応フロー

```
型定義不足を発見
    ↓
【STOP】実装を一時中断
    ↓
不足項目を報告
  - 要素名/属性名
  - 出現箇所（ファイル名、XPathまたは行番号）
  - 実際の値の例
  - 使用頻度（必須 or オプション）
    ↓
実装方針の検討（ユーザーと協議）
    ↓
    ├─【A】型定義を拡張する
    │   - maiml-unified.tsに追加
    │   - maiml-type-guards.tsに型ガード追加
    │   └→ 型安全性を維持
    │
    ├─【B】柔軟な変換ロジックで対応
    │   - unknown型やany型で一時的に保持
    │   - 型安全性は部分的に犠牲
    │   └→ 既存機能の動作を優先
    │
    └─【C】該当要素をスキップ
        - 変換時に無視
        - 既存のxml-js形式でアクセス可能
        └→ 最小限の影響
```

### 報告フォーマット

型定義不足を発見した場合、以下の形式で報告します：

```markdown
## 型定義不足レポート

### 1. 不足項目の詳細
- **要素/属性名**: `content`
- **親要素**: `resultTemplate`
- **出現箇所**: `frontend/src/data/mock/GC-MS.maiml` (L234-L256)

### 2. 実際の構造
```xml
<resultTemplate id="RT1">
  <content>
    <property key="..." xsi:type="...">...</property>
  </content>
</resultTemplate>
```

### 3. 使用頻度
- 必須 / オプション
- 出現頻度: 3ファイル中1ファイル

### 4. 推奨対応方針
A. 型定義拡張 / B. 柔軟な変換 / C. スキップ

### 5. 影響範囲
- 影響を受ける機能
- 回避策の有無
```

### 実装時の確認ポイント

Phase 1-2の実装中、以下を重点的に確認します：

✅ **確認タイミング:**
- [ ] Property変換時（convertXmlJsProperty）
- [ ] Template変換時（MaterialTemplate, ConditionTemplate, ResultTemplate）
- [ ] Method/Protocol変換時
- [ ] EventLog変換時

✅ **確認内容:**
- [ ] xml-jsのデータに型定義にない要素が含まれていないか
- [ ] xsi:typeに未定義の値がないか
- [ ] 属性に未定義のものがないか

### 想定される具体例

#### 例1: content要素
```typescript
// GC-MS.maimlで発見される可能性
<resultTemplate id="RT1">
  <content>  <!-- ← 型定義に未定義 -->
    <property key="..." xsi:type="...">...</property>
  </content>
</resultTemplate>
```

**対応候補:**
- A案: ResultTemplateにcontent?: { property: Property[] }を追加
- B案: unknown型でcontentを保持
- C案: contentを無視（既存のpropertyのみ使用）

#### 例2: カスタムxsi:type
```typescript
// 実MAIMLで独自の型が使用される可能性
<property key="..." xsi:type="customVendorType">  <!-- ← 未定義の型 -->
  <value>...</value>
</property>
```

**対応候補:**
- A案: PropertyTypeにcustomVendorTypeを追加
- B案: stringTypeとして扱う
- C案: 変換時にワーニングを出力し、デフォルト型を使用

## 7. リスクと対策（統一型システム版）

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| **破壊的変更による広範囲なバグ** | **極大** | **高** | • Phase 2-1で全影響箇所を徹底調査<br>• Phase 2-2でテストケースを先に作成<br>• 段階的なコミットで問題箇所を特定可能に |
| **使用側の大規模修正が必要** | **極大** | **確定** | • 使用箇所調査報告書を元に修正計画を立てる<br>• コンパイルエラーを一つずつ潰していく<br>• 推定工数: 6-8時間（本タスク外） |
| **型定義不足の発見** | 高 | 中 | 発見時に即座に報告し、方針を協議してから実装継続 |
| **既存機能の完全停止** | **極大** | 中 | • 旧型フィールド削除前にバックアップブランチ作成<br>• ロールバック手順を明確化<br>• 最悪の場合は旧版に戻す |
| **型変換でパフォーマンス劣化** | 中 | 低 | 変換処理はコンストラクタで1回のみ実行 |
| **不完全な型変換** | 高 | 中 | エラーハンドリングを厳格に実装、変換失敗時は明示的エラー |
| **複雑なネスト構造の変換ミス** | 高 | 中 | 再帰処理を慎重に実装、Phase 3で徹底的にテスト |
| **DOM Parser機能の喪失** | 中 | 低 | Phase 2-5でDOM Parser統合方法を検討 |

### 重大リスクへの特別対策

#### 🚨 リスク1: 破壊的変更による広範囲なバグ
**対策:**
1. **事前調査の徹底**（Phase 2-1）
   - 全使用箇所のリストアップ
   - 各使用箇所での型依存関係の特定
   - 修正難易度の評価

2. **段階的実装**（Phase 2-2〜2-5）
   - 一度にすべてを変更しない
   - 各Phase終了時に動作確認
   - 問題発見時は即座に報告

3. **包括的テスト**（Phase 3）
   - 全メソッドのユニットテスト
   - 統合テストで実際の使用パターンを検証
   - エッジケースの網羅

#### 🚨 リスク2: 使用側の大規模修正が必要
**対策:**
1. **修正計画の事前策定**
   - petriNetExtractor.ts の修正内容を明確化
   - petriNetExtractorEnhanced.ts の修正内容を明確化
   - その他コンポーネントの修正優先順位

2. **段階的な修正**
   - まずコンパイルエラーを解消
   - 次にランタイムエラーを解消
   - 最後に動作確認

3. **ユーザーとの確認**
   - Phase 2完了時に影響範囲を報告
   - 使用側修正の工数見積もりを提示
   - 承認を得てから使用側修正に着手

#### 🚨 リスク3: 既存機能の完全停止
**対策:**
1. **バックアップ戦略**
   - Phase 2-2開始前にブランチ作成
   - 重要なマイルストーンでコミット
   - いつでも元に戻せる状態を維持

2. **ロールバック手順**
   ```bash
   # 問題発生時の緊急ロールバック
   git checkout <backup_branch>
   git checkout -b maiml-parser-rollback
   ```

3. **最悪のシナリオ**
   - 統一型システムへの移行を中止
   - デュアル型システム（Phase 2初回実装）に戻る
   - typedMaimlは補助的な機能として残す

## 7. テスト計画

### ユニットテスト（maimlTypeConverter.ts）
- [ ] convertXmlJsProperty()のテスト
  - [ ] String型プロパティ
  - [ ] Int/Double/Float型プロパティ
  - [ ] Boolean型プロパティ
  - [ ] PropertyList型プロパティ（ネスト）
  - [ ] 不正なxsi:typeの処理
- [ ] convertXmlJsToMaimlRoot()のテスト
  - [ ] 完全なMAIML構造の変換
  - [ ] 部分的なMAIML構造の変換
  - [ ] 複数method対応の確認

### 統合テスト（maimlParserExp.ts）
- [ ] 既存メソッドの動作確認
  - [ ] getTransitionsForExperimentManager()
  - [ ] getTemplates()
  - [ ] getTemplatesForPetriNetViewer()
- [ ] 新メソッドの動作確認
  - [ ] getTypedMaiml()
  - [ ] getTypedProtocol()
- [ ] petriNetExtractor系での動作確認
  - [ ] buildTemplateMap()
  - [ ] buildNodeData()

### 手動テスト
- [ ] test_omori11.maimlでの変換確認
- [ ] XRF.maimlでの変換確認（参照専用テンプレート対応）
- [ ] GC-MS.maimlでの変換確認（content要素対応）

## 8. ロールバック計画

### Phase 1-2で問題発生時
1. 新規ファイル（maimlTypeConverter.ts）を削除
2. maimlParserExp.tsの変更を元に戻す
3. 既存コードは影響を受けない（追加のみのため）

### Phase 3でバグ発見時
1. typedMaiml関連の新メソッドを一時的に無効化
2. 既存メソッドは引き続き動作（後方互換性により）
3. バグ修正後に再度有効化

## 9. 関連ドキュメント

- [型定義生成完了報告](./20260202_1137_Phase4完了_バリデーションテスト_報告書.md)
- [使用箇所調査](./20260202_1306_使用箇所調査_完了報告.md)
- [型定義ファイル最新化状況](./20260202_1331_型定義ファイル最新化状況_報告書.md)
- 型定義ファイル:
  - `frontend/src/types/maiml-schema.ts` - XSD生成型定義
  - `frontend/src/types/maiml-type-guards.ts` - 型ガード関数
  - `frontend/src/types/maiml-unified.ts` - 統合型定義

## 10. 承認記録

### 初回承認（デュアル型システム版）
- **計画書提示日時**: 2026-02-02 13:34
- **承認日時**: 2026-02-02 13:40
- **承認者コメント**: 承認。型定義不足が発見された場合は報告の上で方針を協議する。
- **実施結果**: Phase 1完了（maimlTypeConverter.ts作成のみ）、Phase 2未着手

### 改訂版承認（統一型システム版）
- **改訂計画書提示日時**: 2026-02-02 13:58
- **改訂理由**: デュアル型システムから統一型システムへの方針変更
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後に記録）

### 改訂版の重要な変更点
1. **破壊的変更**: 旧型フィールド（data, maiml）を完全削除
2. **影響範囲**: petriNetExtractor等の使用側も全面修正が必要
3. **推定工数増加**: 4-6時間 → 10-14時間（本タスク） + 6-8時間（使用側修正）
4. **リスク上昇**: 極大リスク（既存機能完全停止の可能性）が3件

### 承認時の確認事項
- [ ] 破壊的変更であることを理解
- [ ] 使用側の大規模修正が必要なことを理解
- [ ] 推定工数の増加を承認
- [ ] リスクとロールバック計画を確認
- [ ] 段階的実装とテスト計画を確認

## 11. 実施記録

### 実施日時
開始: 2026-02-02 13:40
Phase 1完了: 2026-02-02 13:50（maimlTypeConverter.ts作成）
Phase 2未着手: maimlParserExp.tsファイルが作り直されたため、typedMaiml統合が未実施の状態

### 現状分析（2026-02-02 14:25更新）
**maimlParserExp.tsの実装状況:**
- ✅ xml-jsベースの基本パース機能（動作中）
- ✅ 複数method対応の実装済み
- ✅ getTransitionsForExperimentManager()実装済み
- ✅ getTemplates()実装済み（DOMParser版含む）
- ✅ getExistingExperimentData()実装済み
- ❌ typedMaimlフィールドなし
- ❌ getTypedMaiml()メソッドなし
- ❌ maimlTypeConverterの統合なし

**Phase 2の実装が必要:**
- maimlTypeConverterのインポート
- typedMaimlフィールドの追加
- コンストラクタでの型変換実行
- getTypedMaiml()等の新メソッド追加

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

### 最終的な成果物
- [x] maimlTypeConverter.ts作成（Phase 1完了）
- [ ] maimlParserExp.ts拡張（Phase 2未着手）
- [ ] 既存コード動作確認
- [ ] ドキュメント作成

### 次のステップ
1. **Phase 2の実施判断**
   - 統一型システムへの移行を実施するか
   - デュアル型システムで進めるか
   - または旧型のまま維持するか

2. **実施する場合の優先タスク**
   - Phase 2-1: 基盤整備（typedMaimlフィールド追加）
   - Phase 2-2: コア変換の統合（コンストラクタ修正）
   - Phase 2-3: アクセサメソッド追加（getTypedMaiml等）

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）

---

## 重要な設計判断

### なぜ新しいパーサークラスを作らないのか？

1. **後方互換性の完全保証**: 既存コードを一切変更しない
2. **段階的移行**: 既存メソッドと新メソッドの併存が可能
3. **低リスク**: 既存機能への影響ゼロ
4. **実装コスト削減**: 推定7-10時間 → 4-6時間に短縮

### 型変換のタイミング

**コンストラクタで実行（採用）:**
- ✅ 変換は1回のみ（パフォーマンス最適）
- ✅ 以降のアクセスは高速
- ✅ エラーハンドリングが明確

**遅延初期化（不採用）:**
- ❌ 毎回変換が必要（パフォーマンス劣化）
- ❌ 複雑なキャッシュ管理が必要

### 既存メソッドの扱い

**変更しない（採用）:**
- ✅ 完全後方互換性
- ✅ 既存コードの動作保証
- ✅ リスクゼロ

**内部実装を型安全に書き換える（不採用）:**
- ❌ 予期せぬバグのリスク
- ❌ 大規模な変更が必要
- ❌ テストコストが増大