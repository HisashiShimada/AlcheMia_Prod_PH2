// frontend/src/components/viewer/utils/maimlParser.ts
// MAIML XMLパーサーユーティリティ

/**
 * Place（ノード）の情報
 */
export interface Place {
  id: string;
  name?: string;
  type?: 'material' | 'condition' | 'result';
  description?: string;
  x?: number;
  y?: number;
}

/**
 * Transition（遷移）の情報
 */
export interface Transition {
  id: string;
  name?: string;
  description?: string;
  x?: number;
  y?: number;
}

/**
 * Arc（エッジ）の情報
 */
export interface Arc {
  id: string;
  source: string;
  target: string;
  name?: string;
}

/**
 * テンプレート情報
 */
export interface Template {
  id: string;
  type: 'material' | 'condition' | 'result';
  name: string;
  description?: string;
  placeRefs: string[];
  properties?: Array<{
    key: string;
    defaultValue?: string;
    type?: string;
    description?: string;
  }>;
}

/**
 * ペトリネット構造
 */
export interface PetriNetStructure {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
  templates: Record<string, Template>;
  // 共通テンプレート情報（複数methodで共有されるテンプレート）
  commonTemplateIds?: Set<string>;
  commonTemplateRefMap?: Record<string, string>; // { placeId: firstPlaceId }
}

/**
 * MAIML XMLからペトリネット構造を抽出
 * @param maimlXml MAIML XML文字列
 * @param selectedMethodId 選択されたメソッドID（複数メソッド対応）
 */
export function parseMaimlToPetriNet(maimlXml: string, selectedMethodId?: string): PetriNetStructure {
  console.log('🔍 [parseMaimlToPetriNet] パース開始:', {
    xmlLength: maimlXml.length,
    selectedMethodId: selectedMethodId || 'all',
    firstChars: maimlXml.substring(0, 200),
  });

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(maimlXml, 'text/xml');

  // パースエラーチェック
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    console.error('❌ [parseMaimlToPetriNet] XMLパースエラー:', parseError.textContent);
    console.error('XMLの先頭100文字:', maimlXml.substring(0, 100));
    throw new Error(`MAIML XMLのパースに失敗しました: ${parseError.textContent}`);
  }

  console.log('✅ [parseMaimlToPetriNet] XML解析成功');

  // 🎯 複数メソッド対応: 特定のメソッドのみを抽出
  let targetDoc: Document | Element = xmlDoc;
  if (selectedMethodId) {
    const methodElement = xmlDoc.querySelector(`method[id="${selectedMethodId}"]`);
    if (methodElement) {
      console.log('🎯 [parseMaimlToPetriNet] メソッドフィルタリング:', selectedMethodId);
      targetDoc = methodElement;
    } else {
      console.warn('⚠️ [parseMaimlToPetriNet] 指定されたメソッドが見つかりません:', selectedMethodId);
      // メソッドが見つからない場合は全体をパース（フォールバック）
    }
  }

  // Placesを抽出（targetDocから）
  const places: Place[] = [];
  const placeElements = targetDoc.querySelectorAll('place');
  placeElements.forEach((placeEl) => {
    const id = placeEl.getAttribute('id') || '';
    const nameEl = placeEl.querySelector('name');
    const name = nameEl?.textContent || id;
    
    // 位置情報（graphics要素から取得）
    const graphicsEl = placeEl.querySelector('graphics position');
    const x = graphicsEl ? parseFloat(graphicsEl.getAttribute('x') || '0') : undefined;
    const y = graphicsEl ? parseFloat(graphicsEl.getAttribute('y') || '0') : undefined;

    places.push({ id, name, x, y });
  });

  // Transitionsを抽出（targetDocから）
  const transitions: Transition[] = [];
  const transitionElements = targetDoc.querySelectorAll('transition');
  transitionElements.forEach((transEl) => {
    const id = transEl.getAttribute('id') || '';
    const nameEl = transEl.querySelector('name');
    const name = nameEl?.textContent || id;
    
    // 位置情報
    const graphicsEl = transEl.querySelector('graphics position');
    const x = graphicsEl ? parseFloat(graphicsEl.getAttribute('x') || '0') : undefined;
    const y = graphicsEl ? parseFloat(graphicsEl.getAttribute('y') || '0') : undefined;

    transitions.push({ id, name, x, y });
  });

  // Arcsを抽出（targetDocから）
  const arcs: Arc[] = [];
  const arcElements = targetDoc.querySelectorAll('arc');
  arcElements.forEach((arcEl) => {
    const id = arcEl.getAttribute('id') || '';
    const source = arcEl.getAttribute('source') || '';
    const target = arcEl.getAttribute('target') || '';
    const nameEl = arcEl.querySelector('name');
    const name = nameEl?.textContent;

    arcs.push({ id, source, target, name });
  });

  // Templatesを抽出（xmlDocから - テンプレートは全体から取得）
  const templates: Record<string, Template> = {};
  
  // Material Templates
  const materialTemplates = xmlDoc.querySelectorAll('materialTemplate');
  materialTemplates.forEach((templateEl) => {
    const template = parseTemplate(templateEl, 'material');
    if (template) {
      // placeRefsに対応する各placeIdにtemplateを関連付け
      template.placeRefs.forEach(placeId => {
        templates[placeId] = template;
      });
    }
  });

  // Condition Templates
  const conditionTemplates = xmlDoc.querySelectorAll('conditionTemplate');
  conditionTemplates.forEach((templateEl) => {
    const template = parseTemplate(templateEl, 'condition');
    if (template) {
      template.placeRefs.forEach(placeId => {
        templates[placeId] = template;
      });
    }
  });

  // Result Templates
  const resultTemplates = xmlDoc.querySelectorAll('resultTemplate');
  resultTemplates.forEach((templateEl) => {
    const template = parseTemplate(templateEl, 'result');
    if (template) {
      template.placeRefs.forEach(placeId => {
        templates[placeId] = template;
      });
    }
  });

  // 🎯 共通テンプレート検出: 複数placeRefを持つテンプレートを特定
  const commonTemplateIds = new Set<string>();
  const commonTemplateRefMap: Record<string, string> = {};
  
  const allTemplateElements = [
    ...Array.from(xmlDoc.querySelectorAll('materialTemplate')),
    ...Array.from(xmlDoc.querySelectorAll('conditionTemplate')),
    ...Array.from(xmlDoc.querySelectorAll('resultTemplate'))
  ];
  
  console.log('🔍 [parseMaimlToPetriNet] 共通テンプレート検出開始:', {
    totalTemplates: allTemplateElements.length
  });
  
  allTemplateElements.forEach(templateEl => {
    const templateId = templateEl.getAttribute('id');
    if (!templateId) return;
    
    const placeRefEls = Array.from(templateEl.querySelectorAll('placeRef'));
    
    if (placeRefEls.length > 1) {
      commonTemplateIds.add(templateId);
      
      // placeRefからplace IDを取得する関数
      const getPlaceId = (placeRefEl: Element): string | null => {
        return placeRefEl.getAttribute('ref') ||
               placeRefEl.getAttribute('idref') ||
               placeRefEl.getAttribute('href')?.replace('#', '') ||
               null;
      };
      
      // 最初のplaceRef以外のplaceに対して参照関係を設定
      const firstPlaceId = getPlaceId(placeRefEls[0]);
      
      if (firstPlaceId) {
        for (let i = 1; i < placeRefEls.length; i++) {
          const placeId = getPlaceId(placeRefEls[i]);
          if (placeId) {
            commonTemplateRefMap[placeId] = firstPlaceId;
          }
        }
        
        console.log('🔗 [parseMaimlToPetriNet] 共通テンプレート検出:', {
          templateId,
          placeRefCount: placeRefEls.length,
          firstPlaceId,
          referencePlaceIds: placeRefEls.slice(1).map(ref => getPlaceId(ref)).filter(Boolean)
        });
      } else {
        console.warn('⚠️ [parseMaimlToPetriNet] placeRef IDが取得できません:', {
          templateId,
          placeRefHTML: placeRefEls[0]?.outerHTML
        });
      }
    }
  });
  
  console.log('📋 [parseMaimlToPetriNet] 共通テンプレート一覧:', Array.from(commonTemplateIds));
  console.log('🔗 [parseMaimlToPetriNet] 参照関係マップ:', commonTemplateRefMap);

  console.log('📊 [parseMaimlToPetriNet] 抽出結果:', {
    places: places.length,
    transitions: transitions.length,
    arcs: arcs.length,
    templates: Object.keys(templates).length,
    commonTemplates: commonTemplateIds.size,
    commonTemplateRefs: Object.keys(commonTemplateRefMap).length,
  });

  return { 
    places, 
    transitions, 
    arcs, 
    templates,
    commonTemplateIds,
    commonTemplateRefMap
  };
}

/**
 * テンプレート要素をパース
 */
function parseTemplate(
  templateEl: Element,
  type: 'material' | 'condition' | 'result'
): Template | null {
  const id = templateEl.getAttribute('id');
  if (!id) return null;

  const nameEl = templateEl.querySelector('name');
  const name = nameEl?.textContent || id;

  const descEl = templateEl.querySelector('description');
  const description = descEl?.textContent || undefined;

  // placeRef要素を取得
  const placeRefEls = templateEl.querySelectorAll('placeRef');
  const placeRefs: string[] = [];
  placeRefEls.forEach(el => {
    const ref = el.getAttribute('ref');
    if (ref) placeRefs.push(ref);
  });

  // placeRefがない場合は、template IDをplace IDとして使用（後方互換性）
  if (placeRefs.length === 0) {
    placeRefs.push(id);
  }

  // プロパティを抽出
  const properties: Array<{
    key: string;
    defaultValue?: string;
    type?: string;
    description?: string;
  }> = [];

  const propertyEls = templateEl.querySelectorAll('property');
  propertyEls.forEach(propEl => {
    const key = propEl.getAttribute('key') || '';
    const defaultValue = propEl.getAttribute('defaultValue') || undefined;
    const propType = propEl.getAttribute('type') || undefined;
    const propDesc = propEl.querySelector('description')?.textContent || undefined;

    if (key) {
      properties.push({ key, defaultValue, type: propType, description: propDesc });
    }
  });

  return {
    id,
    type,
    name,
    description,
    placeRefs,
    properties,
  };
}
