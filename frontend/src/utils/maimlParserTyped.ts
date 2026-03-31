/**
 * 型安全なMAIMLパーサークラス
 * XSD準拠型のみを使用し、any型を一切使用しない
 * 
 * @author Cline
 * @date 2026-02-02
 * @version 1.0.0
 */

import xmljs from 'xml-js';
import { convertXmlJsToMaimlRoot } from './maimlTypeConverter';
import type { ConversionError } from './maimlTypeConverter';
import type { XmlJsMaimlRoot, XmlJsElement } from '@/types/xml-js-types';
import type { 
  MaimlRoot, 
  Protocol, 
  Method, 
  Transition,
  Template,
  Property,
  PropertyCustomElement,
  PlaceRef,
  Reference,
  Document as MaimlDocument,
  Arc,
  Place,
} from '@/types/maiml-unified';
import { xml2js, Element as XmlJsNonCompactElement } from 'xml-js';
import { TemplatesByCategory } from '@/types/editor';

/**
 * 型安全なMAIMLパーサークラス
 * 
 * 戦略B: 並行実装方式
 * - 既存のMaiMLParserExpは維持
 * - 新しい型安全なクラスとして実装
 * - XSD準拠型のみを使用
 * - any型を一切使用しない
 */
export class MaimlParserTyped {
  private typedMaiml: MaimlRoot;
  private maimlString: string | null = null;
  /** 型変換中に収集されたエラー・警告 */
  private conversionErrors: ConversionError[] = [];
  
  /**
   * コンストラクタ
   * 
   * @param maimlData - MAIML XML文字列、またはxml-jsオブジェクト
   * @throws {Error} XML解析エラー、型変換エラー
   */
  constructor(maimlData: string | XmlJsMaimlRoot | XmlJsElement) {
    // 1. XML文字列を保存
    if (typeof maimlData === 'string') {
      this.maimlString = maimlData;
    }
    
    // 2. xml-js形式に変換
    let xmlData: XmlJsMaimlRoot | XmlJsElement;
    if (typeof maimlData === 'string') {
      try {
        xmlData = xmljs.xml2js(maimlData, { 
          compact: true,
          ignoreComment: true,
          alwaysChildren: false
        }) as XmlJsMaimlRoot;
      } catch (error) {
        throw new Error(`XML parse error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      xmlData = maimlData;
    }
    
    // 3. XSD準拠型に変換（エラーハンドリング付き）
    try {
      const conversionResult = convertXmlJsToMaimlRoot(xmlData);
      this.typedMaiml = conversionResult.data;
      this.conversionErrors = conversionResult.errors;

      // 変換エラーをログ出力
      if (conversionResult.hasErrors) {
        console.warn('⚠️ [MaimlParserTyped] 型変換中にエラーが発生しました:', conversionResult.errors);
        conversionResult.errors.forEach(err => {
          console.warn(`  - ${err.level.toUpperCase()}: ${err.path}.${err.element} - ${err.message}`);
        });
      }
      
      if (conversionResult.hasWarnings && !conversionResult.hasErrors) {
        console.info('ℹ️ [MaimlParserTyped] 型変換中に警告が発生しました:', conversionResult.errors.filter(e => e.level === 'warning'));
      }
      
      if (!conversionResult.hasErrors) {
        console.log('✅ [MaimlParserTyped] 型変換成功');
      } else {
        console.log('⚠️ [MaimlParserTyped] 型変換完了（部分的にエラー）');
      }
    } catch (error) {
      console.error('❌ [MaimlParserTyped] 型変換失敗:', error);
      throw new Error(`MAIML type conversion error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 型安全なMaimlRootを取得
   * 
   * @returns {MaimlRoot} XSD準拠型のMaimlRoot
   */
  getTypedMaiml(): MaimlRoot {
    return this.typedMaiml;
  }

  /**
   * 型変換エラー・警告の一覧を取得
   * 
   * @returns {ConversionError[]} 変換エラー・警告の配列
   */
  getConversionErrors(): ConversionError[] {
    return this.conversionErrors;
  }

  /**
   * error レベルの変換エラーが存在するかどうか
   * 
   * @returns {boolean} error が1件以上ある場合 true
   */
  hasConversionErrors(): boolean {
    return this.conversionErrors.some(e => e.level === 'error');
  }

  /**
   * warning レベルの変換警告が存在するかどうか
   * 
   * @returns {boolean} warning が1件以上ある場合 true
   */
  hasConversionWarnings(): boolean {
    return this.conversionErrors.some(e => e.level === 'warning');
  }
  
  /**
   * Documentを取得
   * 
   * Phase 3.2追加: Document情報の型安全な取得
   * 
   * @returns {MaimlDocument} MAIML Document オブジェクト
   * @throws {Error} Documentが存在しない場合
   */
  getDocument(): MaimlDocument {
    if (!this.typedMaiml.document) {
      throw new Error('Document not found in MAIML');
    }
    return this.typedMaiml.document;
  }
  
  /**
   * Protocolを取得
   * 
   * @returns {Protocol} Protocol オブジェクト
   * @throws {Error} Protocolが存在しない場合
   */
  getProtocol(): Protocol {
    if (!this.typedMaiml.protocol) {
      throw new Error('Protocol not found in MAIML');
    }
    return this.typedMaiml.protocol;
  }
  
  /**
   * 全Methodを取得
   * 
   * @returns {Method[]} Method配列
   */
  getMethods(): Method[] {
    const protocol = this.getProtocol();
    
    // methodが配列でない場合は配列化
    if (!protocol.methods) {
      return [];
    }
    
    return protocol.methods;
  }
  
  /**
   * 特定のMethodを取得
   * 
   * @param {string} methodId - Method ID
   * @returns {Method | null} 見つかったMethod、または null
   */
  getMethod(methodId: string): Method | null {
    const methods = this.getMethods();
    return methods.find(m => m.id === methodId) || null;
  }
  
  /**
   * 全Transitionを取得（ExperimentWorker用）
   * 
   * Phase 6-2修正: 戻り値型をTransitionWithMetadataに変更
   * 
   * @returns {TransitionsResult} Transition一覧とメタデータ
   */
  getTransitions(): Transition[] {
    try {
      const methods = this.getMethods();
      const allTransitions : Transition[] = [];
      
      methods.forEach((method) => {
        
        // pnml取得（配列なので最初の要素を使用）
        const pnml = method.pnml;
        
        // transition取得
        const transitions = pnml.transitions || [];

        allTransitions.push(...transitions);
      });
      
      return allTransitions;
    } catch (error) {
      // Phase 3追加: エラーハンドリング
      console.error('❌ [MaimlParserTyped] getTransitions() failed:', error);
      return [];
    }
  }
  
  /**
   * 全Transitionを取得（ExperimentWorker用）
   * 
   * Phase 6-2修正: 戻り値型をTransitionWithMetadataに変更
   * 
   * @returns {TransitionsResult} Transition一覧とメタデータ
   */
  getTransition(transitionId: string): Transition | null {
    const transitions = this.getTransitions();
    return transitions.find(t => t.id === transitionId) || null;
  }
  
  /**
   * Transitionのカテゴリを判定
   * 
   * @param {Transition} transition - Transitionオブジェクト
   * @param {number} methodIndex - Method インデックス
   * @param {number} totalTransitions - 総Transition数
   * @returns {string} カテゴリ名
   * @private
   */
  determineTransitionCategory(
    transition: Transition,
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
  
   getInstructionIdByTransitionId(
    transitionId: string
  ): string {
    // 1. 該当するTransitionを取得
    const methods = this.getMethods();
    if (methods.length ===0) {
      return '';
    }
    
    methods.forEach((method) => {
    // 2. program配列を取得（単一要素と配列の両方に対応）
    const programs = Array.isArray(method.program) 
      ? method.program 
      : [method.program];
    
    // 3. 各programのinstructionを検索
    for (const program of programs) {
      if (!program.instructions) {
        continue;
      }
      
      // instruction配列を取得（単一要素と配列の両方に対応）
      const instructions = program.instructions;
      
      // 4. 該当するtransitionIdを持つinstructionを検索（早期終了）
      // Instruction型はtransitionRef配列を持つので、その中のrefを確認
      const instruction = instructions.find(i => {
        i.transitionRef.ref === transitionId;
      });
      
      if (instruction) {
        return instruction.id;
      }
    }
    })
    
    return '';
  }
  
  /**
   * 全Templateを取得
   * 
   * @returns {TemplatesResult} Material/Condition/Result テンプレート一覧
   */
  getTemplates(): TemplatesByCategory {
    const protocol = this.getProtocol();
    const methods = this.getMethods();
    
    const material: Template[] = [];
    const condition: Template[] = [];
    const result: Template[] = [];
    
    // protocol直下のテンプレート（共通テンプレート: methodId = null）
    if (protocol.materialTemplates) {
      this.collectTemplates(protocol.materialTemplates, 'material', material, null);
    }
    if (protocol.conditionTemplates) {
      this.collectTemplates(protocol.conditionTemplates, 'condition', condition, null);
    }
    if (protocol.resultTemplates) {
      this.collectTemplates(protocol.resultTemplates, 'result', result, null);
    }
    
    // 各method内のテンプレート（methodId = method.id を付与）
    methods.forEach(method => {
      const methodId = method.id || undefined;

      if (method.materialTemplates) {
        this.collectTemplates(method.materialTemplates, 'material', material, methodId);
      }
      if (method.conditionTemplates) {
        this.collectTemplates(method.conditionTemplates, 'condition', condition, methodId);
      }
      if (method.resultTemplates) {
        this.collectTemplates(method.resultTemplates, 'result', result, methodId);
      }
      
      // method.program内のテンプレート（methodId = method.id を付与）
      if (method.program) {
        const program = Array.isArray(method.program) ? method.program : [method.program];
        program.forEach(prog => {
          if (prog.materialTemplates) {
            this.collectTemplates(prog.materialTemplates, 'material', material, methodId);
          }
          if (prog.conditionTemplates) {
            this.collectTemplates(prog.conditionTemplates, 'condition', condition, methodId);
          }
          if (prog.resultTemplates) {
            this.collectTemplates(prog.resultTemplates, 'result', result, methodId);
          }
        });
      }
    });
    
    return { material, condition, result };
  }
  
  /**
   * テンプレートを収集
   * 
   * @param {any} templates - Template オブジェクトまたは配列
   * @param {string} type - テンプレートタイプ
   * @param {TemplateInfo[]} result - 収集結果を格納する配列
   * @private
   */
  private collectTemplates(
    templates: Template | Array<Template>,
    type: 'material' | 'condition' | 'result',
    result: Array<Template>,
    methodId: string | null | undefined = undefined
  ): void {
    const templateArray = Array.isArray(templates) ? templates : [templates];
    
    templateArray.forEach(template => {
      // ✅ methodIdを付与（protocol直下=null、method内=methodId文字列）
      // 既にmethodIdが設定されている場合は上書きしない
      if (template.methodId === undefined) {
        result.push({ ...template, methodId: methodId ?? undefined });
      } else {
        result.push(template);
      }
    });
  }
  
  /**
   * Propertyを解析
   * 
   * @param {Property | Property[] | undefined} properties - Property オブジェクトまたは配列
   * @returns {PropertyInfo[]} 解析されたProperty情報配列
   * @private
   */
  private parseProperties(properties: Property | Property[] | undefined): Property[] {
    if (!properties) {
      return [];
    }
    
    const propArray = Array.isArray(properties) ? properties : [properties];
    
    // Phase 6-2修正: Property型をそのまま返す（型変換不要）
    return propArray;
  }
  
  /**
   * Method一覧を詳細情報付きで取得
   * 
   * @returns {Array} Method一覧（ID、名前、Transition情報を含む）
   */
  getMethodList(): Array<{
    methodId: string;
    methodName: string;
    transitions: Array<{
      id: string;
      name: string;
    }>;
    transitionCount: number;
  }> {
    const methods = this.getMethods();
    
    return methods.map((method, index) => {
      const methodId = method.id || `method_${index}`;
      const methodName = method.name || methodId;
      
      // pnml取得
      const pnml = method.pnml;
      const transitions: Array<{ id: string; name: string }> = [];
      const transitionArray = pnml.transitions || [];
      
      transitionArray.forEach(transition => {
        transitions.push({
          id: transition.id || '',
          name: transition.name || transition.id || ''
        });
      });
      
      return {
        methodId,
        methodName,
        transitions,
        transitionCount: transitions.length
      };
    });
  }
  
  /**
   * ファイル基本情報を取得
   * 
   * @returns {Object} MAIML ファイルの基本情報
   */
  getFileBasicInfo(): {
    hasProtocol: boolean;
    hasMethod: boolean;
    hasData: boolean;
    hasEventLog: boolean;
    protocolName?: string;
    methodCount: number;
    version?: string;
  } {
    try {
      const protocol = this.typedMaiml.protocol;
      const methods = protocol?.methods ? protocol.methods :  [];
      
      return {
        hasProtocol: !!protocol,
        hasMethod: methods.length > 0,
        hasData: !!this.typedMaiml.data,
        hasEventLog: !!this.typedMaiml.eventLog,
        protocolName: protocol?.name,
        methodCount: methods.length,
        version: this.typedMaiml.version
      };
    } catch (error) {
      return {
        hasProtocol: false,
        hasMethod: false,
        hasData: false,
        hasEventLog: false,
        methodCount: 0
      };
    }
  }
  
  /**
   * 全Arcを取得
   * 
   * @returns {Array} Arc情報配列
   */
  getPlaces(): Place[] {
    const methods = this.getMethods();
    const allPlaces: Place[] = [];
    
    methods.forEach((method) => {
      const pnml = method.pnml;
      const places = pnml.places || [];
      
      allPlaces.push(...places);
    });
    
    return allPlaces;
  }
  
  /**
   * 全Arcを取得
   * 
   * @returns {Array} Arc情報配列
   */
  getArcs(): Arc[] {
    const methods = this.getMethods();
    const allArcs: Arc[] = [];
    
    methods.forEach((method) => {
      const pnml = method.pnml;
      const arcs = pnml.arcs || [];
      allArcs.push(...arcs);
    });
    
    return allArcs;
  }
  
  /**
   * PlaceからTransitionを特定
   * 
   * @param {string} placeId - Place ID
   * @returns {string | null} Transition ID、または null
   */
  findTransitionByPlace(placeId: string): string | null {
    if (!placeId) {
      return null;
    }
    
    const arcs = this.getArcs();
    const connectedArcs = arcs.filter(arc => 
      arc.source === placeId || arc.target === placeId
    );
    
    if (connectedArcs.length === 0) {
      return null;
    }
    
    const transitions = this.getTransitions();
    
    for (const arc of connectedArcs) {
      const transitionId = arc.source === placeId ? arc.target : arc.source;
      const transition = transitions.find(t => t.id === transitionId);
      
      if (transition) {
        return transition.id;
      }
    }
    
    return null;
  }
  
  /**
   * Place IDからそのPlaceを保持しているPNML IDを返却
   * 
   * @param {string} placeId - Place ID
   * @returns {string | null} PNML ID、見つからない場合は null
   * 
   * @example
   * const pnmlId = parser.getPnmlIdByPlaceId('place001');
   * if (pnmlId) {
   *   console.log(`Place 'place001' is in PNML '${pnmlId}'`);
   * }
   */
  getPnmlIdByPlaceId(placeId: string): string | null {
    if (!placeId) {
      return null;
    }
    
    const methods = this.getMethods();
    
    for (const method of methods) {
      const pnml = method.pnml;
      
      // pnmlにplaces配列があるか確認
      if (!pnml.places || pnml.places.length === 0) {
        continue;
      }
      
      // 該当するplaceIdを持つPlaceが存在するかチェック
      const hasPlace = pnml.places.some(place => place.id === placeId);
      
      if (hasPlace) {
        // pnmlのIDを返す
        return pnml.id || null;
      }
    }
    
    // 見つからなかった場合
    return null;
  }
  
  /**
   * Transition IDからそのTransitionを保持しているPNML IDを返却
   * 
   * @param {string} transitionId - Transition ID
   * @returns {string | null} PNML ID、見つからない場合は null
   * 
   * @example
   * const pnmlId = parser.getPnmlIdByTransitionId('transition001');
   * if (pnmlId) {
   *   console.log(`Transition 'transition001' is in PNML '${pnmlId}'`);
   * }
   */
  getPnmlIdByTransitionId(transitionId: string): string | null {
    if (!transitionId) {
      return null;
    }
    
    const methods = this.getMethods();
    
    for (const method of methods) {
      const pnml = method.pnml;
      
      // pnmlにtransitions配列があるか確認
      if (!pnml.transitions || pnml.transitions.length === 0) {
        continue;
      }
      
      // 該当するtransitionIdを持つTransitionが存在するかチェック
      const hasTransition = pnml.transitions.some(transition => transition.id === transitionId);
      
      if (hasTransition) {
        // pnmlのIDを返す
        return pnml.id || null;
      }
    }
    
    // 見つからなかった場合
    return null;
  }
  
  /**
   * ExperimentManager向けファイル検証
   * 
   * Phase 5追加: petriNetExtractor.ts互換性のため
   * 
   * @returns {Object} 検証結果
   */
  validateForExperimentManager(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    info: {
      hasProtocol: boolean;
      hasMethod: boolean;
      hasData: boolean;
      hasEventLog: boolean;
      protocolName?: string;
      methodCount: number;
      version?: string;
    };
  } {
    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      info: this.getFileBasicInfo()
    };
    
    // 必須要素の検証
    if (!this.typedMaiml.protocol) {
      validation.errors.push('protocolセクションが見つかりません');
      validation.isValid = false;
    }
    
    if (!this.typedMaiml.protocol?.methods || this.getMethods().length === 0) {
      validation.errors.push('protocol/methodセクションが見つかりません');
      validation.isValid = false;
    }
    
    return validation;
  }
  
/**
 * Template IDから主要なPlace IDを取得
 * 
 * 📌 重要: 複数のplaceRefがある場合、最初のplaceRefのref属性を返します。
 * これは既存のpetriNetExtractor.tsの動作と互換性があります。
 * 
 * 全placeRefが必要な場合は getTemplateMetadata() を使用してください。
 * 
 * @param {string} templateId - テンプレートID
 * @returns {string} 主要なPlace ID（最初のplaceRefのref）、見つからない場合はtemplateIdを返す
 * 
 * @example
 * // placeRefが1つの場合
 * parser.getPlaceRefByTemplateId('mat001'); // → 'place001'
 * 
 * // placeRefが複数の場合
 * parser.getPlaceRefByTemplateId('mat002'); // → 'place002' (最初のplaceRefのみ)
 */
getPlaceRefByTemplateId(templateId: string): string {
  const templates = this.getTemplates();
  
  // Materials/Conditions/Resultsから該当テンプレートを検索
  const allTemplates = [
    ...templates.material,
    ...templates.condition,
    ...templates.result
  ];
  
  const template = allTemplates.find(t => t.id === templateId);
  
  if (template && template.placeRefs && template.placeRefs.length > 0) {
    // ✅ 明示的に最初のplaceRefのrefを返す（既存動作との互換性）
    return template.placeRefs[0].ref || templateId;
  }
  
  // フォールバック: templateId自身を返す
  return templateId;
}

/**
 * EventLogを取得
 * 
 * @returns {Array} Event情報配列
 */
getEventLogs(): Array<{
  id: string;
  transitionRef?: string;
  timestamp?: string;
  operatorId?: string;
}> {
    const eventLog = this.typedMaiml.eventLog;
    if (!eventLog || !eventLog.logs) {
      return [];
    }
    
    const logs =  eventLog.logs;
    const events: Array<{
      id: string;
      transitionRef?: string;
      timestamp?: string;
      operatorId?: string;
    }> = [];
    
    logs.forEach(log => {
      if (!log.traces) return;
      
      const traces = log.traces;
      
      traces.forEach(trace => {
        if (!trace.events) return;
        
        const traceEvents = trace.events;
        
        traceEvents.forEach(event => {
          // Propertyから必要な情報を抽出
          let timestamp: string | undefined;
          let operatorId: string | undefined;
          
          if (event.properties) {
            const props = event.properties;
            
            props.forEach(prop => {
              if (prop.key === 'time:timestamp' && 'value' in prop) {
                timestamp = String(prop.value);
              }
              if (prop.key === 'operator:id' && 'value' in prop) {
                operatorId = String(prop.value);
              }
            });
          }
          
          events.push({
            id: event.id || '',
            transitionRef: event.ref, // Event.refが直接Transition IDを保持
            timestamp,
            operatorId
          });
        });
      });
    });
    
    return events;
  }
  
  // ============================================================================
  // 名前空間テンプレートXMLパース機能（Phase 2追加）
  // ============================================================================
  
  /**
   * 名前空間テンプレートXMLをパース
   * 
   * keyDictionary形式のXMLファイルから、Property配列を抽出します。
   * カスタム要素（wavelength, power等）はcustomElementsとして保持されます。
   * 
   * @param {string} xmlContent - 名前空間XML文字列
   * @returns {Property[]} Property配列
   * @throws {Error} XML解析エラー
   * 
   * @example
   * ```typescript
   * const xmlContent = `
   *   <keyDictionary>
   *     <property key="LaserParameters" xsi:type="objectType">
   *       <wavelength units="nm">532</wavelength>
   *       <power units="mW">10.5</power>
   *     </property>
   *   </keyDictionary>
   * `;
   * const properties = parser.parseNamespaceXml(xmlContent);
   * console.log(properties[0].customElements?.wavelength.value); // "532"
   * ```
   */
  parseNamespaceXml(xmlContent: string): Property[] {
    try {
      // 1. XML文字列をxml-js Element形式でパース（compact: false）
      const result = xml2js(xmlContent, {
        compact: false,
        ignoreComment: true,
        alwaysChildren: true
      }) as XmlJsNonCompactElement;
      
      // 2. ルート要素を特定（keyDictionary または property）
      let rootElement: XmlJsNonCompactElement | undefined;
      
      if (result.type === 'element') {
        if (result.name === 'keyDictionary') {
          rootElement = result;
        } else if (result.name === 'property') {
          // property直下の場合（単一property）
          return [this.parsePropertyElement(result)];
        }
      } else if (result.elements && result.elements.length > 0) {
        // declaration等が含まれる場合、最初のelement要素を探す
        rootElement = result.elements.find(
          (el: XmlJsNonCompactElement) => el.type === 'element' && el.name === 'keyDictionary'
        );
      }
      
      if (!rootElement) {
        throw new Error('Root element <keyDictionary> not found in XML');
      }
      
      // 3. property要素を抽出
      const properties: Property[] = [];
      
      if (rootElement.elements) {
        rootElement.elements.forEach((child: XmlJsNonCompactElement) => {
          if (child.type === 'element' && child.name === 'property') {
            properties.push(this.parsePropertyElement(child));
          }
        });
      }
      
      return properties;
    } catch (error) {
      console.error('❌ [MaimlParserTyped] parseNamespaceXml() failed:', error);
      throw new Error(`Namespace XML parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Property要素をパース
   * 
   * @param {XmlJsNonCompactElement} element - xml-js Element
   * @returns {Property} 解析されたProperty
   * @private
   */
  private parsePropertyElement(element: XmlJsNonCompactElement): Property {
    const prop: Property = {
      key: element.attributes?.key as string || '',
      xsiType: element.attributes?.['xsi:type'] as string || 'stringType',
      customElements: {},
      properties:[],
      contents: [],
    };
    
    // 属性の抽出
    if (element.attributes) {
      if (element.attributes.units) {
        prop.units = element.attributes.units as string;
      }
      if (element.attributes.formatString) {
        prop.formatString = element.attributes.formatString as string;
      }
      if (element.attributes.scaleFactor) {
        prop.scaleFactor = parseFloat(element.attributes.scaleFactor as string);
      }
    }
    
    // 子要素の処理
    if (element.elements) {
      element.elements.forEach((child: XmlJsNonCompactElement) => {
        if (child.type !== 'element') return;
        
        const tagName = child.name as string;
        
        // 標準要素の処理
        if (this.isStandardPropertyElement(tagName)) {
          if (tagName === 'description') {
            prop.description = this.extractTextContent(child);
          } else if (tagName === 'value') {
            const valueText = this.extractTextContent(child);
            // 数値変換を試みる
            const numValue = parseFloat(valueText);
            prop.value = isNaN(numValue) ? valueText : numValue;
          } else if (tagName === 'property') {
            // ネストされたproperty
            if (!prop.properties) {
              prop.properties = [];
            }
            prop.properties.push(this.parsePropertyElement(child));
          }
        } else {
          // カスタム要素の処理
          if (!prop.customElements) {
            prop.customElements = {};
          }
          prop.customElements[tagName] = this.parseCustomElement(child);
        }
      });
    }
    
    // customElementsが空の場合は削除
    if (prop.customElements && Object.keys(prop.customElements).length === 0) {
      delete prop.customElements;
    }
    
    return prop;
  }
  
  /**
   * PropertyCustomElementを再帰的に解析
   * 
   * @param {XmlJsNonCompactElement} element - xml-js Element
   * @param {number} depth - 再帰の深さ（最大10階層）
   * @returns {PropertyCustomElement} 解析されたカスタム要素
   * @private
   */
  private parseCustomElement(
    element: XmlJsNonCompactElement,
    depth: number = 0
  ): PropertyCustomElement {
    // 深さ制限チェック
    if (depth > 10) {
      console.warn('⚠️ [MaimlParserTyped] Max depth exceeded in parseCustomElement');
      return {};
    }
    
    const customElement: PropertyCustomElement = {};
    
    // 属性の抽出
    if (element.attributes && Object.keys(element.attributes).length > 0) {
      customElement.attributes = {};
      Object.entries(element.attributes).forEach(([key, value]) => {
        customElement.attributes![key] = String(value);
      });
    }
    
    // 子要素の処理
    let hasChildren = false;
    if (element.elements && element.elements.length > 0) {
      const textContent = this.extractTextContent(element);
      
      // テキストノードのみの場合
      const hasOnlyText = element.elements.every(
        (el: XmlJsNonCompactElement) => el.type === 'text'
      );
      
      if (hasOnlyText && textContent) {
        // 数値変換を試みる
        const numValue = parseFloat(textContent);
        customElement.value = isNaN(numValue) ? textContent : numValue;
      } else {
        // 子要素がある場合
        customElement.children = {};
        
        element.elements.forEach((child: XmlJsNonCompactElement) => {
          if (child.type === 'element' && child.name) {
            hasChildren = true;
            customElement.children![child.name] = this.parseCustomElement(child, depth + 1);
          }
        });
        
        // children が空の場合は削除
        if (!hasChildren) {
          delete customElement.children;
          // テキストコンテンツがあれば value として設定
          if (textContent) {
            const numValue = parseFloat(textContent);
            customElement.value = isNaN(numValue) ? textContent : numValue;
          }
        }
      }
    }
    
    return customElement;
  }
  
  /**
   * 標準Property要素かどうかを判定
   * 
   * @param {string} tagName - タグ名
   * @returns {boolean} 標準要素の場合true
   * @private
   */
  private isStandardPropertyElement(tagName: string): boolean {
    const standardTags = [
      'description',
      'value',
      'values',
      'property',
      'content',
      'uncertainty'
    ];
    return standardTags.includes(tagName);
  }
  
  /**
   * 要素からテキストコンテンツを抽出
   * 
   * @param {XmlJsNonCompactElement} element - xml-js Element
   * @returns {string} 抽出されたテキスト
   * @private
   */
  private extractTextContent(element: XmlJsNonCompactElement): string {
    if (!element.elements) {
      return '';
    }
    
    const textParts: string[] = [];
    
    element.elements.forEach((child: XmlJsNonCompactElement) => {
      if (child.type === 'text' && child.text) {
        textParts.push(String(child.text).trim());
      } else if (child.type === 'cdata' && child.cdata) {
        textParts.push(String(child.cdata).trim());
      }
    });
    
    return textParts.join(' ').trim();
  }
}
