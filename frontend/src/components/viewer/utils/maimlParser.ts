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
}

/**
 * MAIML XMLからペトリネット構造を抽出
 */
export function parseMaimlToPetriNet(maimlXml: string): PetriNetStructure {
  console.log('🔍 [parseMaimlToPetriNet] パース開始:', {
    xmlLength: maimlXml.length,
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

  // Placesを抽出
  const places: Place[] = [];
  const placeElements = xmlDoc.querySelectorAll('place');
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

  // Transitionsを抽出
  const transitions: Transition[] = [];
  const transitionElements = xmlDoc.querySelectorAll('transition');
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

  // Arcsを抽出
  const arcs: Arc[] = [];
  const arcElements = xmlDoc.querySelectorAll('arc');
  arcElements.forEach((arcEl) => {
    const id = arcEl.getAttribute('id') || '';
    const source = arcEl.getAttribute('source') || '';
    const target = arcEl.getAttribute('target') || '';
    const nameEl = arcEl.querySelector('name');
    const name = nameEl?.textContent;

    arcs.push({ id, source, target, name });
  });

  // Templatesを抽出
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

  console.log('📊 [parseMaimlToPetriNet] 抽出結果:', {
    places: places.length,
    transitions: transitions.length,
    arcs: arcs.length,
    templates: Object.keys(templates).length,
  });

  return { places, transitions, arcs, templates };
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
