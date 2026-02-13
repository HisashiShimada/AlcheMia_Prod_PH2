# タスク計画書: maimlParserTyped.ts DOMパーサー代替メソッド追加

## メタデータ
- **作成日時**: 2025-02-03 18:03
- **タスクID**: maimlParserTyped_dom_methods
- **優先度**: 高
- **推定工数**: 1.5時間

## 1. タスク概要

`frontend/src/utils/maimlParserTyped.ts` に、現在DOMパーサーで取得している項目を型安全に取得できるメソッドを追加します。これにより、`petriNetExtractor.ts` からDOMパーサーの直接使用を完全に削減できます。

## 2. 目的と期待される成果

### 目的
- DOMパーサー依存の完全削除
- 型安全な低レベルXMLアクセスAPI提供
- コードの統一性確保

### 期待される成果
- [x] placeRef取得メソッドの追加
- [x] Template metadata取得メソッドの追加
- [x] petriNetExtractor.tsでの利用
- [x] DOMパーサー使用箇所の完全削減

## 3. 実装ステップ

### Phase 1: DOMパーサー使用箇所の分析
- [x] extractPetriNetStructure内の使用箇所特定
  - getPlaceIdFromTemplate関数（行87-103）
  - 取得項目: placeRef要素のref属性
  
- [x] buildTemplateMap内の使用箇所特定
  - Materials/Conditions/Results処理（行241-497）
  - 取得項目: uuid要素、placeRef要素（配列）、templateRef要素（配列）

### Phase 2: 新メソッドの設計
- [x] メソッド1: getPlaceRefByTemplateId
- [x] メソッド2: getTemplateMetadata
- [x] メソッド3（補助）: searchElementByIdWithNamespace

### Phase 3: maimlParserTyped.tsへのメソッド追加
- [ ] xml-jsパース結果をキャッシュ
- [ ] getPlaceRefByTemplateId実装
- [ ] getTemplateMetadata実装
- [ ] searchElementByIdWithNamespace実装
- [ ] 型定義の追加

### Phase 4: petriNetExtractor.tsの修正
- [ ] extractPetriNetStructureのDOM削除
- [ ] buildTemplateMapのDOM削除
- [ ] 新メソッドへの置き換え

### Phase 5: 動作確認
- [ ] TypeScriptコンパイルエラーなし
- [ ] PetriNetエディタでの表示確認
- [ ] テンプレートマップ生成の確認

## 4. 技術的詳細

### 追加するメソッド

#### 4.1. getPlaceRefByTemplateId

```typescript
/**
 * Template IDからplaceRef要素のref属性を取得
 * @param templateId テンプレートID
 * @returns placeRefのref属性値、見つからない場合はtemplateIdをそのまま返す
 */
getPlaceRefByTemplateId(templateId: string): string {
  // xml-jsでパースした結果から検索
  const template = this.findTemplateById(templateId);
  if (template && template.placeRef) {
    // placeRef要素のref属性を取得
    if (Array.isArray(template.placeRef)) {
      const firstPlaceRef = template.placeRef[0];
      return firstPlaceRef?._attributes?.ref || templateId;
    } else {
      return template.placeRef._attributes?.ref || templateId;
    }
  }
  
  // フォールバック: template IDをそのまま使用
  return templateId;
}
```

#### 4.2. getTemplateMetadata

```typescript
/**
 * Template metadata取得用の型定義
 */
export interface PlaceRefObject {
  id: string;
  ref: string;
  uuid: string;
}

export interface TemplateRefObject {
  id: string;
  href: string;
}

export interface TemplateMetadata {
  uuid: string;
  placeRefs: PlaceRefObject[];
  templateRefs: TemplateRefObject[];
  element?: any; // DOMElement互換用（段階的移行のため保持）
}

/**
 * Template要素のメタデータを一括取得
 * @param templateId テンプレートID
 * @returns uuid, placeRefs, templateRefsを含むオブジェクト
 */
getTemplateMetadata(templateId: string): TemplateMetadata {
  const template = this.findTemplateById(templateId);
  
  const metadata: TemplateMetadata = {
    uuid: '',
    placeRefs: [],
    templateRefs: [],
    element: template // 段階的移行のため保持
  };
  
  if (!template) {
    return metadata;
  }
  
  // uuid要素を取得
  if (template.uuid) {
    metadata.uuid = this.extractTextContent(template.uuid);
  }
  
  // placeRef要素を全て取得（配列化）
  const placeRefArray = Array.isArray(template.placeRef) 
    ? template.placeRef 
    : template.placeRef ? [template.placeRef] : [];
    
  metadata.placeRefs = placeRefArray.map(placeRef => ({
    id: placeRef._attributes?.id || '',
    ref: placeRef._attributes?.ref || placeRef._attributes?.idref || '',
    uuid: this.extractTextContent(placeRef.uuid) || ''
  }));
  
  // templateRef要素を全て取得（配列化）
  const templateRefArray = Array.isArray(template.templateRef)
    ? template.templateRef
    : template.templateRef ? [template.templateRef] : [];
    
  metadata.templateRefs = templateRefArray.map(templateRef => ({
    id: templateRef._attributes?.id || '',
    href: templateRef._attributes?.href || ''
  }));
  
  return metadata;
}
```

#### 4.3. findTemplateById（内部ヘルパーメソッド）

```typescript
/**
 * Template IDから要素を検索（内部用）
 * @param templateId テンプレートID
 * @returns テンプレート要素オブジェクト
 */
private findTemplateById(templateId: string): any {
  // xml-jsパース結果から検索
  const xmlObj = this.getXmlObject(); // キャッシュされたxml-jsオブジェクト
  
  // Material/Condition/Result Templateを検索
  const templates = [
    ...(xmlObj?.materialTemplates?.materialTemplate || []),
    ...(xmlObj?.conditionTemplates?.conditionTemplate || []),
    ...(xmlObj?.resultTemplates?.resultTemplate || [])
  ];
  
  return templates.find(t => t._attributes?.id === templateId);
}

/**
 * xml-jsパース結果をキャッシュして返す
 */
private getXmlObject(): any {
  if (!this.xmlObjectCache) {
    this.xmlObjectCache = xmljs.xml2js(this.maimlDataString, {
      compact: true,
      trim: true
    });
  }
  return this.xmlObjectCache;
}

/**
 * テキストコンテンツを抽出
 */
private extractTextContent(element: any): string {
  if (!element) return '';
  if (typeof element === 'string') return element;
  if (element._text) return element._text;
  return '';
}
```

### 使用例（petriNetExtractor.ts）

#### Before（DOMパーサー使用）
```typescript
const domParser = new DOMParser();
const xmlDoc = domParser.parseFromString(maimlData, "text/xml");

const getPlaceIdFromTemplate = (templateId: string): string => {
  const templateElement = xmlDoc.querySelector(`[id="${templateId}"]`);
  if (templateElement) {
    const placeRefElement = templateElement.querySelector('placeRef');
    if (placeRefElement) {
      const refAttr = placeRefElement.getAttribute('ref');
      if (refAttr) {
        return refAttr;
      }
    }
  }
  return templateId;
};
```

#### After（maimlParserTyped使用）
```typescript
const getPlaceIdFromTemplate = (templateId: string): string => {
  return parser.getPlaceRefByTemplateId(templateId);
};
```

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| xml-jsパース構造の違い | 高 | 中 | 実際のMAIMLファイルでテスト |
| 名前空間の扱い | 中 | 中 | 複数パターンの属性名を試行 |
| パフォーマンス低下 | 低 | 低 | キャッシュ機構の実装 |

## 6. 代替案の検討

### Option A: xml-jsライブラリ使用（推奨）
- ✅ メリット: 既にプロジェクトで使用中、型安全
- ⚠️ デメリット: xml-jsのcompact形式の構造理解が必要

### Option B: DOMParserをラップ
- ✅ メリット: 既存ロジックをそのまま移行可能
- ❌ デメリット: DOMParserへの依存が残る

### 決定: Option Aを採用

## 7. 実装方針

1. **段階的移行**: elementプロパティを残して互換性確保
2. **キャッシュ機構**: xml-jsパース結果をキャッシュしてパフォーマンス確保
3. **フォールバック**: 取得失敗時は空文字列またはtemplateIdを返す

## 8. テスト計画

### ユニットテスト
- [ ] getPlaceRefByTemplateIdのテスト
- [ ] getTemplateMetadataのテスト
- [ ] 各種エッジケースのテスト

### 統合テスト
- [ ] 実際のMAIMLファイルでの動作確認
- [ ] PetriNetエディタでの表示確認
- [ ] テンプレートマップ生成の確認

## 9. 関連ドキュメント

- `frontend/src/utils/maimlParserTyped.ts` - 修正対象ファイル
- `frontend/src/utils/petriNetExtractor.ts` - 使用側ファイル
- `docs/20250203_1731_petriNetExtractor_新方式変換_PLAN.md` - 前回のタスク

## 10. 承認記録

- **計画書提示日時**: 2025-02-03 18:03
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 発生した問題と解決方法
（未記入）

### 最終的な成果物
- [ ] maimlParserTyped.ts に3つの新メソッド追加
- [ ] petriNetExtractor.ts のDOMパーサー削除