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
import type { XmlJsMaimlRoot, XmlJsElement } from '@/types/xml-js-types';
import type { 
  MaimlRoot, 
  Protocol, 
  Method, 
  Transition,
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Property,
  PlaceRef
} from '@/types/maiml-unified';
import type { 
  TransitionWithMetadata,
  MaterialTemplateInfo,
  ConditionTemplateInfo,
  ResultTemplateInfo
} from '@/types/maiml-extended';

export interface TransitionsResult {
  success: boolean;
  error?: string | null;             // Phase 3追加: エラーメッセージ
  transitions: TransitionWithMetadata[];  // Phase 6-2修正: TransitionInfo → TransitionWithMetadata
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

/**
 * Template結果型
 * 
 * Phase 6-2修正: XSD準拠型を直接使用
 */
export interface TemplatesResult {
  materials: MaterialTemplate[];       // Phase 6-2修正: TemplateInfo → MaterialTemplate
  conditions: ConditionTemplate[];     // Phase 6-2修正: TemplateInfo → ConditionTemplate
  results: ResultTemplate[];           // Phase 6-2修正: TemplateInfo → ResultTemplate
}

/**
 * Template メタデータ型定義
 */
export interface TemplateMetadata {
  uuid: string;
  placeRefs: Array<{
    id: string;
    ref: string;
    uuid: string;
  }>;
  templateRefs: Array<{
    id: string;
    href: string;
  }>;
}

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
    
    // 3. XSD準拠型に変換
    try {
      this.typedMaiml = convertXmlJsToMaimlRoot(xmlData);
      console.log('✅ [MaimlParserTyped] 型変換成功');
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
    if (!protocol.method) {
      return [];
    }
    
    return Array.isArray(protocol.method) 
      ? protocol.method 
      : [protocol.method];
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
  getTransitions(): TransitionsResult {
    try {
      const methods = this.getMethods();
      const allTransitions: TransitionWithMetadata[] = [];  // Phase 6-2修正
      
      methods.forEach((method, methodIndex) => {
        const methodId = method.id || `method_${methodIndex}`;
        const methodName = method.name;
        
        // pnml取得（配列なので最初の要素を使用）
        const pnmlArray = method.pnml;
        if (!pnmlArray || pnmlArray.length === 0) {
          return;
        }
        const pnml = pnmlArray[0];
        
        // transition取得
        const transitions = pnml.transition || [];
        
        // arc取得
        const arcs = pnml.arc || [];
        
        transitions.forEach(transition => {
          const transitionId = transition.id || '';
          
          // このtransitionに関連するarcを取得
          const relatedArcs = arcs.filter(arc => 
            arc.source === transitionId || arc.target === transitionId
          ).map(arc => ({
            id: arc.id || '',
            source: arc.source,
            target: arc.target,
            type: (arc.source === transitionId ? 'output' : 'input') as 'input' | 'output'
          }));
          
          // カテゴリ判定
          const category = this.determineTransitionCategory(transition, methodIndex, transitions.length);
          
          // Phase 3追加: displayName生成
          const displayName = this.formatTransitionDisplayName(
            transitionId,
            transition.name,
            methodId
          );
          
          // Phase 3追加: isExperimentRelevant判定
          const isExperimentRelevant = ['experiment', 'preparation'].includes(category);
          
          // Phase 4追加: hasInstruction判定
          const hasInstruction = this.hasInstructionByTransitionId(methodId, transitionId);
          
          allTransitions.push({
            id: transitionId,
            methodId,
            methodName,
            name: transition.name,
            description: transition.description,
            hasInstruction,        // Phase 4追加: 実装完了
            arcCount: relatedArcs.length,
            arcs: relatedArcs,
            category,
            displayName,           // Phase 3追加
            isExperimentRelevant  // Phase 3追加
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
        error: null,  // Phase 3追加
        transitions: allTransitions,
        metadata: {
          totalMethods: methods.length,
          totalTransitions: allTransitions.length,
          categoryCounts
        }
      };
    } catch (error) {
      // Phase 3追加: エラーハンドリング
      console.error('❌ [MaimlParserTyped] getTransitions() failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        transitions: [],
        metadata: {
          totalMethods: 0,
          totalTransitions: 0,
          categoryCounts: {
            experiment: 0,
            preparation: 0,
            finalization: 0,
            other: 0
          }
        }
      };
    }
  }
  
  /**
   * Transitionの表示名をフォーマット
   * 
   * Phase 3追加: 表示用の整形された名前を生成
   * 
   * @param {string} id - Transition ID
   * @param {string | undefined} name - Transition名
   * @param {string} methodId - Method ID
   * @returns {string} 整形された表示名
   * @private
   */
  private formatTransitionDisplayName(
    id: string,
    name: string | undefined,
    methodId: string
  ): string {
    // メソッドプレフィックスを追加（method_0以外の場合）
    const methodPrefix = methodId && methodId !== 'method_0' ? `[${methodId}] ` : '';
    
    // 名前が長すぎる場合は省略
    if (name && name.length > 50) {
      return `${methodPrefix}${id} - ${name.substring(0, 47)}...`;
    }
    
    // 名前がある場合は "ID - 名前" 形式
    if (name) {
      return `${methodPrefix}${id} - ${name}`;
    }
    
    // 名前がない場合はIDのみ
    return `${methodPrefix}${id}`;
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
  private determineTransitionCategory(
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
  
  /**
   * 指定されたTransitionに対するInstructionが存在するか判定
   * 
   * Phase 4追加: program/instructionからhasInstructionを判定
   * 
   * @param {string} methodId - Method ID
   * @param {string} transitionId - Transition ID
   * @returns {boolean} Instructionが存在する場合true
   * @private
   */
  private hasInstructionByTransitionId(
    methodId: string,
    transitionId: string
  ): boolean {
    // 1. 該当するMethodを取得
    const method = this.getMethod(methodId);
    if (!method || !method.program) {
      return false;
    }
    
    // 2. program配列を取得（単一要素と配列の両方に対応）
    const programs = Array.isArray(method.program) 
      ? method.program 
      : [method.program];
    
    // 3. 各programのinstructionを検索
    for (const program of programs) {
      if (!program.instruction) {
        continue;
      }
      
      // instruction配列を取得（単一要素と配列の両方に対応）
      const instructions = Array.isArray(program.instruction)
        ? program.instruction
        : [program.instruction];
      
      // 4. 該当するtransitionIdを持つinstructionを検索（早期終了）
      // Instruction型はtransitionRef配列を持つので、その中のrefを確認
      const hasMatch = instructions.some(instruction => {
        if (!instruction.transitionRef || instruction.transitionRef.length === 0) {
          return false;
        }
        return instruction.transitionRef.some(tRef => tRef.ref === transitionId);
      });
      
      if (hasMatch) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 全Templateを取得
   * 
   * @returns {TemplatesResult} Material/Condition/Result テンプレート一覧
   */
  getTemplates(): TemplatesResult {
    const protocol = this.getProtocol();
    const methods = this.getMethods();
    
    const materials: MaterialTemplate[] = [];
    const conditions: ConditionTemplate[] = [];
    const results: ResultTemplate[] = [];
    
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
   * 
   * @param {any} templates - Template オブジェクトまたは配列
   * @param {string} type - テンプレートタイプ
   * @param {TemplateInfo[]} result - 収集結果を格納する配列
   * @private
   */
  private collectTemplates(
    templates: MaterialTemplate | ConditionTemplate | ResultTemplate | Array<MaterialTemplate | ConditionTemplate | ResultTemplate>,
    type: 'material' | 'condition' | 'result',
    result: Array<MaterialTemplate | ConditionTemplate | ResultTemplate>
  ): void {
    const templateArray = Array.isArray(templates) ? templates : [templates];
    
    templateArray.forEach(template => {
      // placeRef から最初の ref 値を取得（配列型なので）
      const placeRefs = template.placeRef as PlaceRef[] | undefined;
      const placeRefValue = placeRefs && placeRefs.length > 0 
        ? placeRefs[0].ref 
        : undefined;
      
      // transitionRef は MaterialTemplate のみに存在
      let transitionRefValue: string | undefined = undefined;
      if (type === 'material' && 'templateRef' in template) {
        const tRefs = (template as MaterialTemplate).templateRef;
        transitionRefValue = tRefs && tRefs.length > 0 ? tRefs[0].ref : undefined;
      }
      
      // Phase 6-2修正: XSD準拠型をそのまま使用（追加フィールドは不要）
      result.push(template);
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
      const pnmlArray = method.pnml;
      const transitions: Array<{ id: string; name: string }> = [];
      
      if (pnmlArray && pnmlArray.length > 0) {
        const pnml = pnmlArray[0];
        const transitionArray = pnml.transition || [];
        
        transitionArray.forEach(transition => {
          transitions.push({
            id: transition.id || '',
            name: transition.name || transition.id || ''
          });
        });
      }
      
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
      const methods = protocol?.method ? (Array.isArray(protocol.method) ? protocol.method : [protocol.method]) : [];
      
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
  getArcs(): Array<{
    id: string;
    source: string;
    target: string;
    methodId: string;
  }> {
    const methods = this.getMethods();
    const allArcs: Array<{
      id: string;
      source: string;
      target: string;
      methodId: string;
    }> = [];
    
    methods.forEach((method, index) => {
      const methodId = method.id || `method_${index}`;
      const pnmlArray = method.pnml;
      
      if (!pnmlArray || pnmlArray.length === 0) {
        return;
      }
      
      const pnml = pnmlArray[0];
      const arcs = pnml.arc || [];
      
      arcs.forEach(arc => {
        allArcs.push({
          id: arc.id || '',
          source: arc.source,
          target: arc.target,
          methodId
        });
      });
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
    
    const transitionsResult = this.getTransitions();
    const transitions = transitionsResult.transitions;
    
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
    
    if (!this.typedMaiml.protocol?.method || this.getMethods().length === 0) {
      validation.errors.push('protocol/methodセクションが見つかりません');
      validation.isValid = false;
    }
    
    // 警告レベルの検証
    const methods = this.getMethods();
    if (methods.length > 0) {
      const hasAnyPnml = methods.some(m => m.pnml && m.pnml.length > 0);
      if (!hasAnyPnml) {
        validation.warnings.push('pnmlセクションが見つかりません');
      }
    }
    
    return validation;
  }
  
  /**
   * ExperimentManager向けTransition取得（互換性ラッパー）
   * 
   * Phase 5追加: petriNetExtractor.ts互換性のため
   * 内部では getTransitions() を呼び出します
   * 
   * @returns {TransitionsResult} getTransitions()と同じ結果
   * @deprecated 新規コードでは getTransitions() を直接使用してください
   */
  getTransitionsForExperimentManager(): TransitionsResult {
    return this.getTransitions();
  }
  
  /**
   * PetriNetViewer向けTemplate取得（互換性ラッパー）
   * 
   * Phase 5追加: petriNetExtractor.ts互換性のため
   * 内部では getTemplates() を呼び出します
   * 
   * @returns {TemplatesResult} getTemplates()と同じ結果
   * @deprecated 新規コードでは getTemplates() を直接使用してください
   */
  getTemplatesForPetriNetViewer(): TemplatesResult {
    return this.getTemplates();
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
    ...templates.materials,
    ...templates.conditions,
    ...templates.results
  ];
  
  const template = allTemplates.find(t => t.id === templateId);
  
  if (template && template.placeRef && template.placeRef.length > 0) {
    // ✅ 明示的に最初のplaceRefのrefを返す（既存動作との互換性）
    return template.placeRef[0].ref || templateId;
  }
  
  // フォールバック: templateId自身を返す
  return templateId;
}

/**
 * Template要素のメタデータを一括取得
 * 
 * 📌 複数placeRefの詳細情報が必要な場合はこのメソッドを使用してください。
 * uuid, placeRefs配列, templateRefs配列を含むオブジェクトを返します。
 * 
 * @param {string} templateId - テンプレートID
 * @returns {TemplateMetadata} uuid, placeRefs, templateRefsを含むメタデータ
 * 
 * @example
 * const metadata = parser.getTemplateMetadata('mat001');
 * console.log(metadata.placeRefs);
 * // [
 * //   { id: 'pr1', ref: 'place001', uuid: 'uuid1' },
 * //   { id: 'pr2', ref: 'place002', uuid: 'uuid2' },  // ← 複数placeRefがある場合
 * // ]
 */
getTemplateMetadata(templateId: string): TemplateMetadata {
  const templates = this.getTemplates();
  
  // Materials/Conditions/Resultsから該当テンプレートを検索
  const allTemplates = [
    ...templates.materials,
    ...templates.conditions,
    ...templates.results
  ];
  
  const template = allTemplates.find(t => t.id === templateId);
  
  // デフォルト値
  const metadata: TemplateMetadata = {
    uuid: '',
    placeRefs: [],
    templateRefs: []
  };
  
  if (!template) {
    return metadata;
  }
  
  // uuid取得（XSD準拠型から直接取得）
  if (template.uuid) {
    metadata.uuid = template.uuid;
  }
  
  // placeRefs取得（配列として取得）
  if (template.placeRef && Array.isArray(template.placeRef)) {
    metadata.placeRefs = template.placeRef.map(pr => ({
      id: pr.id || '',
      ref: pr.ref || '',
      uuid: pr.uuid || ''
    }));
  }
  
  // templateRefs取得（MaterialTemplateのみ持つ）
  if ('templateRef' in template && template.templateRef) {
    const templateRefs = Array.isArray(template.templateRef) 
      ? template.templateRef 
      : [template.templateRef];
    
    metadata.templateRefs = templateRefs.map(tr => ({
      id: tr.id || '',
      href: tr.href || ''
    }));
  }
  
  return metadata;
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
    if (!eventLog || !eventLog.log) {
      return [];
    }
    
    const logs = Array.isArray(eventLog.log) ? eventLog.log : [eventLog.log];
    const events: Array<{
      id: string;
      transitionRef?: string;
      timestamp?: string;
      operatorId?: string;
    }> = [];
    
    logs.forEach(log => {
      if (!log.trace) return;
      
      const traces = Array.isArray(log.trace) ? log.trace : [log.trace];
      
      traces.forEach(trace => {
        if (!trace.event) return;
        
        const traceEvents = Array.isArray(trace.event) ? trace.event : [trace.event];
        
        traceEvents.forEach(event => {
          // Propertyから必要な情報を抽出
          let timestamp: string | undefined;
          let operatorId: string | undefined;
          
          if (event.property) {
            const props = Array.isArray(event.property) ? event.property : [event.property];
            
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
}
