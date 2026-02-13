// MaiMLParser.ts - Phase 2型統合版
// ✅ XSD準拠型システム統合・型安全性強化版
// TypeScript版に変換

import * as xmljs from 'xml-js';
import { convertXmlJsToMaimlRoot } from './maimlTypeConverter';
import type { MaimlRoot, Protocol, Method } from '@/types/maiml-unified';

export class MaiMLParserExp {
  private data: any;
  private maiml: any;
  private maimlDataString: string | null;
  private domDocument: Document | null;
  
  // ✅ Phase 2新規追加: XSD準拠型フィールド
  private typedMaiml: MaimlRoot | null = null;

  constructor(maimlData: string | any) {
    console.log('🔍 [MaiMLParser] Phase 2型統合版初期化開始');
    
    // ✅ 詳細デバッグ: データ型を完全に解析
    console.log('🔍 [MaiMLParser] データ型詳細解析:', {
      type: typeof maimlData,
      isString: typeof maimlData === 'string',
      isObject: typeof maimlData === 'object',
      isNull: maimlData === null,
      length: maimlData?.length,
      keys: typeof maimlData === 'object' && maimlData !== null ? Object.keys(maimlData).slice(0, 5) : 'N/A',
      preview: typeof maimlData === 'string' ? maimlData.slice(0, 200) + '...' : 'Not a string',
      constructorName: maimlData?.constructor?.name || 'Unknown'
    });
    
    // 🆕 XML文字列を保存（DOMParser用）
    this.maimlDataString = typeof maimlData === 'string' ? maimlData : null;
    
    try {
      // 既存: xml-js実装（後方互換性のため維持）
      if (typeof maimlData === 'string') {
        console.log('📄 [MaiMLParser] xml-js: 文字列からXML解析');
        this.data = xmljs.xml2js(maimlData, { compact: true });
      } else if (typeof maimlData === 'object' && maimlData !== null) {
        console.log('📦 [MaiMLParser] xml-js: オブジェクトをそのまま使用');
        this.data = maimlData;
      } else {
        throw new Error(`未対応のデータ型: ${typeof maimlData}`);
      }
      
      this.maiml = this.data.maiml || this.data;
      
      // 🆕 DOMParser実装（空要素取得用）
      if (this.maimlDataString) {
        console.log('🔧 [MaiMLParser] DOMParser: XML文字列をパース');
        const parser = new DOMParser();
        this.domDocument = parser.parseFromString(this.maimlDataString, 'text/xml');
        
        // パースエラーチェック
        const parseError = this.domDocument.querySelector('parsererror');
        if (parseError) {
          console.error('❌ [MaiMLParser] DOMParser: パースエラー:', parseError.textContent);
          this.domDocument = null;
        } else {
          console.log('✅ [MaiMLParser] DOMParser: パース成功');
        }
      } else {
        console.log('⚠️ [MaiMLParser] DOMParser: XML文字列なし（オブジェクト入力のため）');
        this.domDocument = null;
      }
      
      // ✅ Phase 2新規追加: XSD準拠型への変換
      try {
        console.log('🔄 [MaiMLParser] Phase 2: XSD準拠型への変換開始');
        this.typedMaiml = convertXmlJsToMaimlRoot(this.data);
        console.log('✅ [MaiMLParser] Phase 2: 型変換成功', {
          hasProtocol: !!this.typedMaiml?.protocol,
          hasMethods: !!this.typedMaiml?.protocol?.method,
          methodCount: this.typedMaiml?.protocol?.method?.length || 0,
          hasData: !!this.typedMaiml?.data,
          hasEventLog: !!this.typedMaiml?.eventLog
        });
      } catch (conversionError) {
        console.error('❌ [MaiMLParser] Phase 2: 型変換エラー:', conversionError);
        console.warn('⚠️ [MaiMLParser] Phase 2: 旧型フィールドで動作継続');
        this.typedMaiml = null;
      }
      
      console.log('✅ [MaiMLParser] Phase 2型統合版初期化完了:', {
        hasProtocol: !!this.maiml?.protocol,
        hasMethod: !!this.maiml?.protocol?.method,
        hasProgram: !!this.maiml?.protocol?.method?.program,
        hasData: !!this.maiml?.data,
        hasPnml: !!this.maiml?.protocol?.method?.pnml,
        hasDomDocument: !!this.domDocument,
        hasTypedMaiml: !!this.typedMaiml
      });
      
    } catch (error) {
      console.error('❌ [MaiMLParser] 初期化エラー:', error);
      throw new Error(`MaiML解析エラー: ${error.message}`);
    }
  }

  /**
   * ✅ Phase 2新規: 型安全なMaimlRootを取得
   */
  getTypedMaiml(): MaimlRoot | null {
    return this.typedMaiml;
  }

  /**
   * ✅ Phase 2新規: 型安全なProtocolを取得
   */
  getTypedProtocol(): Protocol | null {
    return this.typedMaiml?.protocol || null;
  }

  /**
   * ✅ Phase 2新規: 型安全なMethodを取得
   */
  getTypedMethods(): Method[] {
    return this.typedMaiml?.protocol?.method || [];
  }

  /**
   * ✅ Phase 2新規: 特定のMethodを取得
   * @param methodId - メソッドID
   * @returns 指定されたMethodオブジェクト、見つからない場合はnull
   */
  getTypedMethod(methodId: string): Method | null {
    const methods = this.getTypedMethods();
    return methods.find(m => m.id === methodId) || null;
  }

  /**
   * 🆕 Phase 1専用: ExperimentManager向けトランジション抽出
   * エラーハンドリング強化・詳細情報付き
   * ✅ 複数method/複数pnml構造対応版
   */
  getTransitionsForExperimentManager() {
    console.log('🔄 [MaiMLParser] ExperimentManager向けトランジション抽出開始（複数method対応）');
    
    try {
      const transitions = [];
      const protocol = this.maiml?.protocol;
      
      if (!protocol) {
        console.warn('⚠️ [getTransitionsForExperimentManager] protocolが見つかりません');
        return {
          success: false,
          error: 'このMaiMLファイルにはprotocolセクションが含まれていません。',
          transitions: [],
          metadata: {
            hasProtocol: false,
            hasMethod: false,
            hasPnml: false
          }
        };
      }

      // ✅ 複数method対応: すべてのmethod要素を取得
      const methods = Array.isArray(protocol.method) 
        ? protocol.method 
        : (protocol.method ? [protocol.method] : []);

      if (methods.length === 0) {
        console.warn('⚠️ [getTransitionsForExperimentManager] method要素が見つかりません');
        return {
          success: false,
          error: 'このMaiMLファイルにはmethod要素が含まれていません。',
          transitions: [],
          metadata: {
            hasProtocol: true,
            hasMethod: false,
            hasPnml: false
          }
        };
      }

      console.log(`🔍 [getTransitionsForExperimentManager] method数: ${methods.length}`);

      let totalPnmlCount = 0;
      let totalTransitionCount = 0;

      // ✅ 複数method対応: 各methodのpnmlを順次処理
      methods.forEach((method, methodIndex) => {
        const methodId = method._attributes?.id || `method_${methodIndex}`;
        const pnml = method.pnml;
        
        if (!pnml) {
          console.warn(`⚠️ [getTransitionsForExperimentManager] method[${methodId}]にpnmlが見つかりません`);
          return; // このmethodをスキップして次へ
        }

        totalPnmlCount++;
        console.log(`🔍 [getTransitionsForExperimentManager] method[${methodId}]のpnml処理中`);

        const transitionElements = Array.isArray(pnml.transition) 
          ? pnml.transition 
          : (pnml.transition ? [pnml.transition] : []);

        console.log(`🔍 [getTransitionsForExperimentManager] method[${methodId}]トランジション要素数: ${transitionElements.length}`);
        totalTransitionCount += transitionElements.length;

        transitionElements.forEach((transition, index) => {
          try {
            const id = transition._attributes?.id;
            if (!id) {
              console.warn(`⚠️ [getTransitionsForExperimentManager] method[${methodId}] transition[${index}]にIDがありません`);
              return;
            }

            // このmethodのpnmlコンテキストでinstructionとarcsを取得
            const instruction = this.findInstructionInMethod(method, id);
            const arcs = this.getTransitionArcsInPnml(pnml, id);
            
            // トランジション詳細情報を構築
            const transitionInfo = {
              id: id,
              methodId: methodId, // ✅ method識別情報を追加
              methodIndex: methodIndex, // ✅ method順序を追加
              name: instruction?.description?._text || transition.name?._text || id,
              description: instruction?.description?._text || '',
              hasInstruction: !!instruction,
              arcCount: arcs.length,
              arcs: arcs,
              // ExperimentManager表示用の追加情報
              displayName: this.formatTransitionDisplayName(id, instruction, methodId),
              category: this.categorizeTransition(id, instruction),
              isExperimentRelevant: this.isExperimentRelevantTransition(id, instruction)
            };
            
            transitions.push(transitionInfo);
            console.log(`✅ [getTransitionsForExperimentManager] method[${methodId}] transition追加: ${id} (${transitionInfo.category})`);
            
          } catch (transitionError) {
            console.warn(`⚠️ [getTransitionsForExperimentManager] method[${methodId}] transition[${index}]処理エラー:`, transitionError);
          }
        });
      });

      // pnmlが1つも見つからなかった場合
      if (totalPnmlCount === 0) {
        console.warn('⚠️ [getTransitionsForExperimentManager] 全methodでpnmlが見つかりません');
        return {
          success: false,
          error: 'このMaiMLファイルにはPetri Netデータ(pnml)が含まれていません。',
          transitions: [],
          metadata: {
            hasProtocol: true,
            hasMethod: true,
            hasPnml: false,
            methodCount: methods.length
          }
        };
      }

      console.log('🔍 [getTransitionsForExperimentManager] 統合前トランジション数:', transitions.length);

      // トランジションが1つも見つからなかった場合
      if (transitions.length === 0) {
        console.warn('⚠️ [getTransitionsForExperimentManager] 全methodでトランジションが見つかりません');
        return {
          success: false,
          error: 'このMaiMLファイルにはトランジション要素が定義されていません。',
          transitions: [],
          metadata: {
            hasProtocol: true,
            hasMethod: true,
            hasPnml: true,
            methodCount: methods.length,
            pnmlCount: totalPnmlCount,
            transitionElementCount: 0
          }
        };
      }

      // 実験関連トランジションを優先的にソート
      transitions.sort((a, b) => {
        if (a.isExperimentRelevant && !b.isExperimentRelevant) return -1;
        if (!a.isExperimentRelevant && b.isExperimentRelevant) return 1;
        return a.id.localeCompare(b.id);
      });

      console.log('✅ [getTransitionsForExperimentManager] トランジション抽出完了（複数method対応）:', {
        methodCount: methods.length,
        pnmlCount: totalPnmlCount,
        totalCount: transitions.length,
        experimentRelevantCount: transitions.filter(t => t.isExperimentRelevant).length,
        categories: [...new Set(transitions.map(t => t.category))],
        methodBreakdown: methods.map((m, i) => ({
          methodId: m._attributes?.id || `method_${i}`,
          transitionCount: transitions.filter(t => t.methodIndex === i).length
        }))
      });

      return {
        success: true,
        error: null,
        transitions: transitions,
        metadata: {
          hasProtocol: true,
          hasMethod: true,
          hasPnml: true,
          methodCount: methods.length,
          pnmlCount: totalPnmlCount,
          transitionElementCount: totalTransitionCount,
          extractedCount: transitions.length,
          experimentRelevantCount: transitions.filter(t => t.isExperimentRelevant).length,
          categories: [...new Set(transitions.map(t => t.category))],
          methodBreakdown: methods.map((m, i) => ({
            methodId: m._attributes?.id || `method_${i}`,
            transitionCount: transitions.filter(t => t.methodIndex === i).length
          }))
        }
      };

    } catch (error) {
      console.error('❌ [getTransitionsForExperimentManager] トランジション抽出エラー（複数method対応）:', error);
      return {
        success: false,
        error: `トランジション抽出中にエラーが発生しました: ${error.message}`,
        transitions: [],
        metadata: {
          hasProtocol: !!this.maiml?.protocol,
          hasMethod: !!(this.maiml?.protocol?.method),
          hasPnml: false,
          error: error.message
        }
      };
    }
  }

  /**
   * ✅ 新規追加: 特定method内でinstructionを検索
   */
  findInstructionInMethod(method, transitionId) {
    const program = method?.program;
    if (!program) return null;

    const instructions = Array.isArray(program.instruction) 
      ? program.instruction 
      : (program.instruction ? [program.instruction] : []);

    return instructions.find(inst => 
      inst.transitionRef?._attributes?.ref === transitionId
    );
  }

  /**
   * ✅ 新規追加: 特定pnml内でトランジションに関連するアークを取得（複数method対応）
   */
  getTransitionArcsInPnml(pnml, transitionId) {
    const arcs = [];
    
    if (!pnml) return arcs;

    const arcElements = Array.isArray(pnml.arc) 
      ? pnml.arc 
      : (pnml.arc ? [pnml.arc] : []);

    arcElements.forEach(arc => {
      const source = arc._attributes?.source;
      const target = arc._attributes?.target;
      
      if (source === transitionId || target === transitionId) {
        arcs.push({
          id: arc._attributes?.id,
          source: source,
          target: target,
          direction: source === transitionId ? 'outgoing' : 'incoming'
        });
      }
    });

    return arcs;
  }

  /**
   * 🆕 複数method対応: method一覧を取得
   * 各methodのID、name、所属トランジションを返す
   */
  getMethodList() {
    console.log('🔬 [getMethodList] method一覧取得開始');
    
    try {
      const protocol = this.maiml?.protocol;
      if (!protocol) {
        console.warn('⚠️ [getMethodList] protocolが見つかりません');
        return [];
      }

      // ✅ 複数method対応: すべてのmethod要素を取得
      const methods = Array.isArray(protocol.method) 
        ? protocol.method 
        : (protocol.method ? [protocol.method] : []);

      if (methods.length === 0) {
        console.warn('⚠️ [getMethodList] method要素が見つかりません');
        return [];
      }

      console.log(`🔬 [getMethodList] method数: ${methods.length}`);

      // 各methodの情報を抽出
      const methodList = methods.map((method: any, index: number) => {
        const methodId = method._attributes?.id || `method_${index}`;
        const methodName = method.name?._text || method._attributes?.name || methodId;
        
        // このmethodのpnmlからトランジションを取得
        const transitions: any[] = [];
        const pnml = method.pnml;
        
        if (pnml) {
          const transitionElements = Array.isArray(pnml.transition) 
            ? pnml.transition 
            : (pnml.transition ? [pnml.transition] : []);
          
          transitionElements.forEach((transition: any) => {
            const id = transition._attributes?.id;
            if (id) {
              const instruction = this.findInstructionInMethod(method, id);
              transitions.push({
                id: id,
                name: instruction?.description?._text || transition.name?._text || id
              });
            }
          });
        }
        
        const methodData = {
          methodId: methodId,
          methodName: methodName,
          transitions: transitions,
          transitionCount: transitions.length
        };
        
        console.log(`🔬 [getMethodList] method[${methodId}]:`, methodData);
        
        return methodData;
      });

      console.log('✅ [getMethodList] method一覧取得完了:', {
        methodCount: methodList.length,
        methods: methodList.map((m: any) => ({
          methodId: m.methodId,
          methodName: m.methodName,
          transitionCount: m.transitionCount
        }))
      });

      return methodList;

    } catch (error) {
      console.error('❌ [getMethodList] method一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * Protocol内の全method情報を取得（後方互換性のため残存）
   * @returns {Object} { success: boolean, methods: [{ id, name, transitions: [...] }] }
   */
  getMethodsOld() {
    try {
      const methods: any[] = [];
      
      // DOMDocument版の実装（未実装のためスキップ）
      console.warn('⚠️ [getMethodsOld] この実装は未対応です。getMethodList()を使用してください');
      return { success: false, methods: [], error: 'Not implemented - use getMethodList() instead' };
    } catch (error) {
      console.error('❌ [MaiMLParser] getMethods error:', error);
      return { success: false, methods: [], error: error.message };
    }
  }

  /**
   * 🆕 Phase 1専用: トランジションの表示名をフォーマット
   * ✅ 複数method対応: methodId情報を追加
   */
  formatTransitionDisplayName(id, instruction, methodId) {
    const methodPrefix = methodId && methodId !== 'method_0' ? `[${methodId}] ` : '';
    
    if (instruction?.description?._text) {
      const description = instruction.description._text;
      // 長い説明は省略
      if (description.length > 50) {
        return `${methodPrefix}${id} - ${description.substring(0, 47)}...`;
      }
      return `${methodPrefix}${id} - ${description}`;
    }
    return `${methodPrefix}${id}`;
  }

  /**
   * 🆕 Phase 1専用: トランジションのカテゴリ分類
   */
  categorizeTransition(id, instruction) {
    const idLower = id.toLowerCase();
    const description = instruction?.description?._text?.toLowerCase() || '';
    
    // 実験操作関連のキーワード
    const experimentKeywords = ['experiment', 'measure', 'analysis', 'test', 'sample', 'data', 'record'];
    const preparationKeywords = ['prepare', 'setup', 'init', 'start', 'begin'];
    const finalizationKeywords = ['finish', 'end', 'complete', 'finalize', 'cleanup'];
    
    if (experimentKeywords.some(keyword => idLower.includes(keyword) || description.includes(keyword))) {
      return 'experiment';
    } else if (preparationKeywords.some(keyword => idLower.includes(keyword) || description.includes(keyword))) {
      return 'preparation';
    } else if (finalizationKeywords.some(keyword => idLower.includes(keyword) || description.includes(keyword))) {
      return 'finalization';
    } else {
      return 'other';
    }
  }

  /**
   * 🆕 Phase 1専用: 実験関連トランジションかどうかの判定
   */
  isExperimentRelevantTransition(id, instruction) {
    const category = this.categorizeTransition(id, instruction);
    return ['experiment', 'preparation'].includes(category);
  }

  /**
   * 既存機能: トランジション一覧を取得（後方互換性のため残存）
   */
  getTransitions() {
    const result = this.getTransitionsForExperimentManager();
    return result.transitions || [];
  }

  /**
   * 🆕 複数method対応: method一覧を取得
   * 各methodのID、name、所属トランジションを返す
   */
  getMethods() {
    console.log('🔬 [getMethods] method一覧取得開始');
    
    try {
      const protocol = this.maiml?.protocol;
      if (!protocol) {
        console.warn('⚠️ [getMethods] protocolが見つかりません');
        return [];
      }

      // ✅ 複数method対応: すべてのmethod要素を取得
      const methods = Array.isArray(protocol.method) 
        ? protocol.method 
        : (protocol.method ? [protocol.method] : []);

      if (methods.length === 0) {
        console.warn('⚠️ [getMethods] method要素が見つかりません');
        return [];
      }

      console.log(`🔬 [getMethods] method数: ${methods.length}`);

      // 各methodの情報を抽出
      const methodList = methods.map((method, index) => {
        const methodId = method._attributes?.id || `method_${index}`;
        const methodName = method.name?._text || method._attributes?.name || methodId;
        
        // このmethodのpnmlからトランジションを取得
        const transitions = [];
        const pnml = method.pnml;
        
        if (pnml) {
          const transitionElements = Array.isArray(pnml.transition) 
            ? pnml.transition 
            : (pnml.transition ? [pnml.transition] : []);
          
          transitionElements.forEach(transition => {
            const id = transition._attributes?.id;
            if (id) {
              const instruction = this.findInstructionInMethod(method, id);
              transitions.push({
                id: id,
                name: instruction?.description?._text || transition.name?._text || id
              });
            }
          });
        }
        
        const methodData = {
          methodId: methodId,
          methodName: methodName,
          transitions: transitions,
          transitionCount: transitions.length
        };
        
        console.log(`🔬 [getMethods] method[${methodId}]:`, methodData);
        
        return methodData;
      });

      console.log('✅ [getMethods] method一覧取得完了:', {
        methodCount: methodList.length,
        methods: methodList.map(m => ({
          methodId: m.methodId,
          methodName: m.methodName,
          transitionCount: m.transitionCount
        }))
      });

      return methodList;

    } catch (error) {
      console.error('❌ [getMethods] method一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * トランジションに関連するアークを取得
   */
  getTransitionArcs(transitionId) {
    const arcs = [];
    const pnml = this.maiml?.protocol?.method?.pnml;
    
    if (!pnml) return arcs;

    const arcElements = Array.isArray(pnml.arc) 
      ? pnml.arc 
      : (pnml.arc ? [pnml.arc] : []);

    arcElements.forEach(arc => {
      const source = arc._attributes?.source;
      const target = arc._attributes?.target;
      
      if (source === transitionId || target === transitionId) {
        arcs.push({
          id: arc._attributes?.id,
          source: source,
          target: target,
          direction: source === transitionId ? 'outgoing' : 'incoming'
        });
      }
    });

    return arcs;
  }

  /**
   * instructionを検索
   */
  findInstruction(transitionId) {
    const program = this.maiml?.protocol?.method?.program;
    if (!program) return null;

    const instructions = Array.isArray(program.instruction) 
      ? program.instruction 
      : (program.instruction ? [program.instruction] : []);

    return instructions.find(inst => 
      inst.transitionRef?._attributes?.ref === transitionId
    );
  }

  /**
   * 🆕 Phase 1専用: MaiMLファイルの基本情報を取得
   */
  getFileBasicInfo() {
    try {
      return {
        hasProtocol: !!this.maiml?.protocol,
        hasMethod: !!this.maiml?.protocol?.method,
        hasProgram: !!this.maiml?.protocol?.method?.program,
        hasPnml: !!this.maiml?.protocol?.method?.pnml,
        hasData: !!this.maiml?.data,
        protocolName: this.maiml?.protocol?.name?._text || 'Unknown Protocol',
        methodName: this.maiml?.protocol?.method?.name?._text || 'Unknown Method',
        fileVersion: this.maiml?._attributes?.version || 'Unknown Version',
        namespace: this.maiml?._attributes?.xmlns || 'Unknown Namespace'
      };
    } catch (error) {
      console.error('❌ [getFileBasicInfo] エラー:', error);
      return {
        hasProtocol: false,
        hasMethod: false,
        hasProgram: false,
        hasPnml: false,
        hasData: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 Phase 1専用: ファイル検証
   */
  validateForExperimentManager() {
    console.log('🔍 [MaiMLParser] ExperimentManager向けファイル検証開始');
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      info: this.getFileBasicInfo()
    };

    // 必須要素の検証
    if (!this.maiml?.protocol) {
      validation.errors.push('protocolセクションが見つかりません');
      validation.isValid = false;
    }

    if (!this.maiml?.protocol?.method) {
      validation.errors.push('protocol/methodセクションが見つかりません');
      validation.isValid = false;
    }

    if (!this.maiml?.protocol?.method?.pnml) {
      validation.errors.push('protocol/method/pnmlセクションが見つかりません');
      validation.isValid = false;
    }

    // トランジションの検証
    const transitionResult = this.getTransitionsForExperimentManager();
    if (!transitionResult.success) {
      validation.errors.push(transitionResult.error);
      validation.isValid = false;
    } else if (transitionResult.transitions.length === 0) {
      validation.warnings.push('トランジションが定義されていません');
    }

    // プログラムセクションの検証
    if (!this.maiml?.protocol?.method?.program) {
      validation.warnings.push('programセクションが見つかりません - 一部機能が制限される可能性があります');
    }

    console.log('✅ [validateForExperimentManager] 検証完了:', validation);
    return validation;
  }

  // 🔧 既存のメソッド群はそのまま維持（後方互換性のため）
  
  /**
   * 🆕 PetriNetViewer専用: テンプレート一覧を取得
   * petriNetExtractor.jsのbuildTemplateMap()から呼ばれる
   * 配列形式のpropertiesを返す（convertPropertiesArrayToNestedFormat()で変換される）
   */
  getTemplatesForPetriNetViewer() {
    return this.getTemplates();
  }

  /**
   * テンプレート一覧を取得
   * 🆕 DOMDocumentが利用可能な場合はDOMParser版を使用（空要素対応）
   */
  getTemplates() {
    console.log('🎯 [getTemplates] メソッド呼び出し開始');
    
    // ✅ DOMParser版を強制有効化（propertyListType子要素対応のため）
    const USE_DOM_PARSER = true;
    
    // 🆕 DOMDocumentが利用可能な場合はDOMParser版を使用
    if (this.domDocument && USE_DOM_PARSER) {
      console.log('🔧 [getTemplates] DOMParser版を使用します（propertyListType子要素対応）');
      try {
        const domResult = this.getTemplatesFromDOM();
        if (domResult && (domResult.materials.length > 0 || domResult.conditions.length > 0 || domResult.results.length > 0)) {
          console.log('✅ [getTemplates] DOMParser版テンプレート取得成功:', {
            materials: domResult.materials.length,
            conditions: domResult.conditions.length,
            results: domResult.results.length
          });
          return domResult;
        } else {
          console.warn('⚠️ [getTemplates] DOMParser版が空の結果を返した、xml-js版にフォールバック');
        }
      } catch (domError) {
        console.error('❌ [getTemplates] DOMParser版でエラー発生:', domError);
        console.warn('⚠️ [getTemplates] xml-js版にフォールバック');
      }
    } else {
      if (this.domDocument && !USE_DOM_PARSER) {
        console.log('⚠️ [getTemplates] DOMParser版は一時的に無効化中、xml-js版を使用');
      } else {
        console.log('📋 [getTemplates] DOMDocumentなし（maimlDataがオブジェクト形式）、xml-js版を使用');
      }
    }
    
    // 既存: xml-js版の実装（フォールバック）
    const templates = {
      materials: [],
      conditions: [],
      results: []
    };
    
    // 🆕 デバッグ用：深いネスト構造検証フラグ
    const DEEP_NEST_DEBUG = false;

    console.log('🔍 [getTemplates] maiml構造:', {
      hasMaiml: !!this.maiml,
      hasProtocol: !!this.maiml?.protocol,
      hasMethod: !!this.maiml?.protocol?.method,
      maimlType: typeof this.maiml,
      maimlKeys: this.maiml ? Object.keys(this.maiml) : []
    });

    const method = this.maiml?.protocol?.method;
    if (!method) {
      console.warn('⚠️ [getTemplates] methodが見つかりません');
      return templates;
    }

    console.log('🔍 [getTemplates] method要素:', Object.keys(method));

    // ヘルパー関数: テンプレートを配列として取得
    const getTemplateArray = (source, templateType) => {
      if (!source) return [];
      const templates = source[templateType];
      return Array.isArray(templates) ? templates : (templates ? [templates] : []);
    };

    // ヘルパー関数: テンプレートを解析して追加
    const addTemplates = (sourceTemplates, category, categoryName) => {
      sourceTemplates.forEach(template => {
        // テンプレートIDを取得（xml2js形式）
        const templateId = template._attributes?.id || template.$?.id || '';
        
        if (!templateId) {
          console.warn(`⚠️ [getTemplates] ${categoryName}Templateにid属性がありません:`, template);
          return;
        }
        
        // ✅ 修正: templateRefのみを持つ「参照専用テンプレート」をスキップ
        // （property、content、その他の実体的な要素を持たない場合）
        const hasTemplateRef = !!template.templateRef;
        const hasProperty = !!template.property;
        const hasContent = !!template.content;
        
        if (hasTemplateRef && !hasProperty && !hasContent) {
          console.log(`⏭️ [getTemplates] 参照専用テンプレートをスキップ: ${templateId} (templateRefのみ)`);
          return;
        }
        
        // 重複チェック（IDベース）
        const exists = templates[category].some(t => t.id === templateId);
        if (!exists) {
          const parsed = this.parseTemplate(template, categoryName);
          if (parsed && parsed.id) {
            templates[category].push(parsed);
            console.log(`📦 [getTemplates] ${categoryName}Template追加:`, parsed.id, `(プロパティ数: ${parsed.properties.length})`);
          } else {
            console.warn(`⚠️ [getTemplates] ${categoryName}Template解析失敗:`, templateId);
          }
        } else {
          console.log(`⏭️ [getTemplates] ${categoryName}Template重複スキップ:`, templateId);
        }
      });
    };

    // 1. protocol直下のテンプレートを取得（XRF.maiml対応）
    console.log('📍 [getTemplates] Phase 1: protocol直下のテンプレート取得');
    const protocol = this.maiml?.protocol;
    if (protocol) {
      addTemplates(getTemplateArray(protocol, 'materialTemplate'), 'materials', 'material');
      addTemplates(getTemplateArray(protocol, 'conditionTemplate'), 'conditions', 'condition');
      addTemplates(getTemplateArray(protocol, 'resultTemplate'), 'results', 'result');
    }

    // 2. method直下のテンプレートを取得（複数method対応版）
    console.log('📍 [getTemplates] Phase 2: method直下のテンプレート取得（複数method対応）');
    
    // ✅ 複数method対応: すべてのmethod要素を配列化
    const methods = Array.isArray(method) 
      ? method 
      : (method ? [method] : []);
    
    console.log(`🔍 [getTemplates] 検出されたmethod数: ${methods.length}`);
    
    // ✅ 複数method対応: 各methodを順次処理
    methods.forEach((singleMethod, methodIndex) => {
      const methodId = singleMethod._attributes?.id || singleMethod.$?.id || `method_${methodIndex}`;
      console.log(`🔍 [getTemplates] method[${methodIndex}] (id: ${methodId}) を処理中`);
      
      // method直下のテンプレート取得
      addTemplates(getTemplateArray(singleMethod, 'materialTemplate'), 'materials', 'material');
      addTemplates(getTemplateArray(singleMethod, 'conditionTemplate'), 'conditions', 'condition');
      addTemplates(getTemplateArray(singleMethod, 'resultTemplate'), 'results', 'result');
    });

    // 3. program配下のテンプレートを取得（複数method対応版）
    console.log('📍 [getTemplates] Phase 3: program配下のテンプレート取得（複数method対応）');
    
    // ✅ 複数method対応: 各methodのprogramを順次処理
    methods.forEach((singleMethod, methodIndex) => {
      const methodId = singleMethod._attributes?.id || singleMethod.$?.id || `method_${methodIndex}`;
      
      const programs = Array.isArray(singleMethod.program) 
        ? singleMethod.program 
        : (singleMethod.program ? [singleMethod.program] : []);
      
      console.log(`🔍 [getTemplates] method[${methodIndex}] (id: ${methodId}) のprogram数: ${programs.length}`);
      
      programs.forEach((program, programIndex) => {
        const programId = program._attributes?.id || program.$?.id || `program_${programIndex}`;
        console.log(`🔍 [getTemplates] method[${methodIndex}] program[${programIndex}] (id: ${programId}) を処理中`);
        
        addTemplates(getTemplateArray(program, 'materialTemplate'), 'materials', 'material');
        addTemplates(getTemplateArray(program, 'conditionTemplate'), 'conditions', 'condition');
        addTemplates(getTemplateArray(program, 'resultTemplate'), 'results', 'result');
      });
    });

    console.log('✅ [getTemplates] テンプレート解析完了（複数method対応）:', {
      materials: templates.materials.length,
      conditions: templates.conditions.length,
      results: templates.results.length,
      methodCount: methods.length,
      totalProgramCount: methods.reduce((sum, m) => {
        const progs = Array.isArray(m.program) ? m.program : (m.program ? [m.program] : []);
        return sum + progs.length;
      }, 0)
    });

    return templates;
  }

  /**
   * ✅ 修正: 既存実験データを取得・解析（完全忠実パース処理版）
   */
  getExistingExperimentData() {
    console.log('🔍 [getExistingExperimentData] 既存実験データ忠実解析開始');
    
    const existingData = {
      materials: [],
      conditions: [],
      results: []
    };

    const dataElements = this.maiml?.data;
    if (!dataElements) {
      console.log('📋 [getExistingExperimentData] <data>要素が見つかりません - 新規ファイル');
      return existingData;
    }

    console.log('✅ [getExistingExperimentData] <data>要素発見:', {
      dataType: typeof dataElements,
      isArray: Array.isArray(dataElements),
      keys: typeof dataElements === 'object' ? Object.keys(dataElements) : []
    });

    const dataArray = Array.isArray(dataElements) ? dataElements : [dataElements];
    
    dataArray.forEach((dataElement, dataIndex) => {
      console.log(`🔍 [getExistingExperimentData] データ要素 ${dataIndex + 1}/${dataArray.length} 忠実解析開始`);
      
      const resultsElements = dataElement?.results;
      if (!resultsElements) {
        console.log(`⚠️ [getExistingExperimentData] データ要素 ${dataIndex}に<results>が見つかりません`);
        return;
      }

      const resultsArray = Array.isArray(resultsElements) ? resultsElements : [resultsElements];
      
      resultsArray.forEach((results, resultsIndex) => {
        console.log(`📊 [getExistingExperimentData] results要素 ${resultsIndex + 1}/${resultsArray.length} 忠実解析中`);
        
        // materials, conditions, results の各要素を忠実解析
        this.parseExistingCategoryFaithful(results, 'material', existingData.materials);
        this.parseExistingCategoryFaithful(results, 'condition', existingData.conditions);  
        this.parseExistingCategoryFaithful(results, 'result', existingData.results);
      });
    });

    console.log('✅ [getExistingExperimentData] 既存実験データ忠実解析完了:', {
      materials: existingData.materials.length,
      conditions: existingData.conditions.length, 
      results: existingData.results.length,
      onePointElements: this.countOnePointElements(existingData),
      propertyListTypeElements: this.countPropertyListTypeElements(existingData)
    });

    return existingData;
  }

  /**
   * ✅ 修正: 既存データのカテゴリ別忠実解析
   */
  parseExistingCategoryFaithful(resultsElement, categoryName, targetArray) {
    const categoryElements = resultsElement?.[categoryName];
    if (!categoryElements) {
      console.log(`📋 [parseExistingCategoryFaithful] ${categoryName}要素が見つかりません`);
      return;
    }

    const elementsArray = Array.isArray(categoryElements) ? categoryElements : [categoryElements];
    
    elementsArray.forEach((element, index) => {
      console.log(`🔍 [parseExistingCategoryFaithful] ${categoryName}要素 ${index + 1}/${elementsArray.length} 忠実解析中`);
      
      const parsedElement = this.parseExistingElementFaithful(element, categoryName);
      if (parsedElement) {
        targetArray.push(parsedElement);
        console.log(`✅ [parseExistingCategoryFaithful] ${categoryName}要素追加:`, {
          templateRef: parsedElement.templateRef,
          hasOnePoint: this.hasOnePointProperty(parsedElement.properties),
          hasPropertyListType: this.hasPropertyListTypeProperty(parsedElement.properties),
          source: parsedElement.source
        });
      }
    });
  }

  /**
   * ✅ 修正: 既存データ要素の完全忠実解析
   */
  parseExistingElementFaithful(element, categoryType) {
    if (!element || !element._attributes) {
      console.warn('⚠️ [parseExistingElementFaithful] 要素またはattributesが不正:', element);
      return null;
    }

    const attributes = element._attributes;
    const elementId = attributes.id;
    const templateRef = attributes.ref;

    console.log('🔍 [parseExistingElementFaithful] 要素忠実解析:', {
      categoryType,
      elementId,
      templateRef,
      hasProperties: !!element.property,
      hasContent: !!element.content,
      hasDescription: !!element.description
    });

    if (!templateRef) {
      console.warn('⚠️ [parseExistingElementFaithful] ref属性が見つかりません:', elementId);
      return null;
    }

    // ✅ 修正: プロパティの忠実解析（xsi:type最優先・強制判定完全除去）
    const properties = this.parseExistingPropertiesFaithful(element.property);

    const parsedElement = {
      elementId: elementId,
      templateRef: templateRef,
      templateName: templateRef,
      categoryType: categoryType,
      properties: properties,
      timestamp: new Date().toISOString(),
      source: 'faithful_parse_v3', // 忠実パース処理v3フラグ
      description: element.description?._text || '',
      uuid: element.uuid?._text || '',
      onePointCount: this.countOnePointInProperties(properties),
      propertyListTypeCount: this.countPropertyListTypeInProperties(properties)
    };

    console.log('✅ [parseExistingElementFaithful] 要素忠実解析完了:', {
      templateRef: parsedElement.templateRef,
      propertyCount: Object.keys(properties).length,
      hasDescription: !!parsedElement.description,
      hasContentData: Object.values(properties).some(prop => 
        typeof prop === 'object' && prop !== null && prop.isDataGrid
      ),
      onePointElements: parsedElement.onePointCount,
      propertyListTypeElements: parsedElement.propertyListTypeCount,
      source: parsedElement.source
    });

    return parsedElement;
  }

  /**
   * ✅ 強化修正: 既存データのプロパティ忠実解析（propertyListType処理強化版）
   */
  parseExistingPropertiesFaithful(propertyElements) {
    const properties = {};

    if (!propertyElements) {
      console.log('📋 [parseExistingPropertiesFaithful] プロパティ要素なし');
      return properties;
    }

    const propArray = Array.isArray(propertyElements) ? propertyElements : [propertyElements];
    
    console.log('🔍 [parseExistingPropertiesFaithful] プロパティ要素数:', propArray.length);

    propArray.forEach((prop, index) => {
      if (!prop || !prop._attributes) {
        console.warn(`⚠️ [parseExistingPropertiesFaithful] プロパティ[${index}]が不正:`, prop);
        return;
      }

      const attributes = prop._attributes;
      const key = attributes.key;
      const xsiType = attributes['xsi:type'] || 'stringType';
      const units = attributes.units || '';

      if (!key) {
        console.warn(`⚠️ [parseExistingPropertiesFaithful] プロパティ[${index}]にkeyがありません`);
        return;
      }

      console.log(`🔍 [parseExistingPropertiesFaithful] プロパティ忠実処理: ${key} (xsi:type="${xsiType}")`);

      // ✅ 強化修正: xsi:type="propertyListType"の完全忠実処理（OnePoint含む全てのpropertyListType）
      if (xsiType === 'propertyListType') {
        console.log(`🗂️ [parseExistingPropertiesFaithful] propertyListType忠実処理開始: ${key}`);
        
        const nestedProperties = {};
        
        // ✅ 強化: ネストされたproperty要素を解析（propertyListType内のproperty要素）
        if (prop.property) {
          const nestedProps = Array.isArray(prop.property) ? prop.property : [prop.property];
          
          nestedProps.forEach((nestedProp, nestedIndex) => {
            if (nestedProp && nestedProp._attributes && nestedProp._attributes.key) {
              const nestedKey = nestedProp._attributes.key;
              const nestedXsiType = nestedProp._attributes['xsi:type'] || 'stringType';
              const nestedValue = this.extractPropertyValueFaithful(nestedProp);
              nestedProperties[nestedKey] = nestedValue;
              
              console.log(`🗂️ [parseExistingPropertiesFaithful] ネストproperty追加: ${key}.${nestedKey} (${nestedXsiType})`);
            } else {
              console.warn(`⚠️ [parseExistingPropertiesFaithful] ネストproperty[${nestedIndex}]が不正:`, nestedProp);
            }
          });
        }
        
        // ✅ 強化修正: propertyListType内のcontent要素を忠実解析（OnePoint内のIntensityなど）
        if (prop.content) {
          console.log(`📊 [parseExistingPropertiesFaithful] propertyListType内contentデータ忠実解析開始: ${key}`);
          
          const contentElements = Array.isArray(prop.content) ? prop.content : [prop.content];
          
          contentElements.forEach((contentElement, contentIndex) => {
            if (contentElement && contentElement._attributes) {
              const contentData = this.parseContentDataFaithful(contentElement);
              if (contentData) {
                const contentKey = contentElement._attributes?.key || `content_${contentIndex}`;
                nestedProperties[contentKey] = contentData;
                
                console.log(`📊 [parseExistingPropertiesFaithful] propertyListType内contentデータ忠実解析完了: ${key}.${contentKey}`, {
                  valueCount: contentData.values?.length || 0,
                  contentType: contentData.contentType,
                  axis: contentData.axis,
                  units: contentData.units,
                  isDataGrid: contentData.isDataGrid
                });
              } else {
                console.warn(`⚠️ [parseExistingPropertiesFaithful] propertyListType内contentデータ忠実解析失敗: ${key}.content[${contentIndex}]`);
              }
            } else {
              console.warn(`⚠️ [parseExistingPropertiesFaithful] propertyListType内content[${contentIndex}]が不正:`, contentElement);
            }
          });
        }
        
        // ✅ 修正: OnePoint判定はキー名のみで実施（特別処理は除去）
        const isOnePointElement = key.toLowerCase() === 'onepoint';
        
        properties[key] = {
          type: 'propertyList',
          xsiType: xsiType,
          units: units,
          properties: nestedProperties,
          source: 'faithful_xsitype_parse_v3', // xsi:type忠実パース処理v3フラグ
          isOnePoint: isOnePointElement, // OnePoint判定は単純なkey比較のみ
          nestedPropertyCount: Object.keys(nestedProperties).length,
          hasNestedContent: Object.values(nestedProperties).some(val => 
            typeof val === 'object' && val !== null && val.isDataGrid
          )
        };
        
        console.log(`✅ [parseExistingPropertiesFaithful] propertyListType忠実処理完了: ${key}`, {
          xsiType: xsiType,
          nestedCount: Object.keys(nestedProperties).length,
          nestedKeys: Object.keys(nestedProperties),
          isOnePoint: properties[key].isOnePoint,
          hasNestedContent: properties[key].hasNestedContent,
          source: properties[key].source
        });
        
      } else {
        // 通常のプロパティ処理（content含む）
        const value = this.extractPropertyValueFaithful(prop);
        
        if (typeof value === 'object' && value !== null && value.isDataGrid) {
          properties[key] = value;
          console.log('📊 [parseExistingPropertiesFaithful] contentデータプロパティ追加:', {
            key,
            dataType: value.type,
            valueCount: value.values?.length || 0,
            xsiType,
            units
          });
        } else {
          const convertedValue = this.convertPropertyValue(value, xsiType);
          properties[key] = convertedValue;
          console.log('🔍 [parseExistingPropertiesFaithful] 通常プロパティ追加:', {
            key,
            value: typeof convertedValue === 'string' ? convertedValue.slice(0, 50) : convertedValue,
            xsiType,
            units
          });
        }
      }
    });

    console.log('✅ [parseExistingPropertiesFaithful] プロパティ忠実解析完了:', {
      totalCount: Object.keys(properties).length,
      propertyListTypes: Object.values(properties).filter(p => 
        typeof p === 'object' && p !== null && p.type === 'propertyList'
      ).length,
      onePointElements: Object.entries(properties).filter(([key, value]) => 
        key.toLowerCase() === 'onepoint' && typeof value === 'object' && value !== null && value.type === 'propertyList'
      ).length,
      contentDataElements: Object.values(properties).filter(prop => 
        typeof prop === 'object' && prop !== null && prop.isDataGrid
      ).length
    });

    return properties;
  }

  /**
   * ✅ 修正: プロパティ値の忠実抽出（contentデータ完全対応版）
   */
  extractPropertyValueFaithful(property) {
    // ✅ 修正: contentがある場合（最重要修正箇所）
    if (property.content) {
      console.log('🔍 [extractPropertyValueFaithful] content要素忠実処理:', {
        hasAttributes: !!property.content._attributes,
        hasValue: !!property.content.value,
        contentKeys: Object.keys(property.content),
        attributeKeys: property.content._attributes ? Object.keys(property.content._attributes) : []
      });
      
      const contentData = this.parseContentDataFaithful(property.content);
      if (contentData) {
        console.log('📊 [extractPropertyValueFaithful] contentデータ忠実解析成功:', {
          dataType: contentData.type,
          valueCount: contentData.values?.length || 0,
          isDataGrid: contentData.isDataGrid,
          contentType: contentData.contentType,
          source: contentData.source
        });
        return contentData;
      } else {
        console.warn('⚠️ [extractPropertyValueFaithful] contentデータ忠実解析失敗');
      }
    }
    
    // 通常のvalueがある場合
    if (property.value) {
      if (typeof property.value === 'string') {
        return property.value;
      } else if (property.value._text) {
        return property.value._text;
      } else if (typeof property.value === 'object' && property.value !== null) {
        return JSON.stringify(property.value);
      }
    }
    
    return '';
  }

  /**
   * ✅ 修正: contentデータの忠実解析（完全対応版）
   */
  parseContentDataFaithful(content) {
    if (!content || !content._attributes) {
      console.warn('⚠️ [parseContentDataFaithful] content要素またはattributesが不正');
      return null;
    }

    const attributes = content._attributes;
    const contentType = attributes['xsi:type'] || 'unknown';
    const size = parseInt(attributes.size) || 0;
    const axis = attributes.axis || '';
    const units = attributes.units || '';
    const key = attributes.key || '';
    const formatString = attributes.formatString || '';
    const scaleFactor = parseFloat(attributes.scaleFactor) || 1.0;
    
    console.log('🔍 [parseContentDataFaithful] コンテンツデータ忠実解析開始:', {
      contentType,
      size,
      axis,
      units,
      key,
      formatString,
      scaleFactor,
      hasValue: !!content.value
    });

    // ✅ 修正: 値の忠実取得（完全対応版）
    let rawValue = '';
    if (content.value) {
      if (typeof content.value === 'string') {
        rawValue = content.value.trim();
      } else if (content.value._text) {
        rawValue = content.value._text.trim();
      } else if (typeof content.value === 'object' && content.value !== null) {
        // オブジェクトの場合、文字列化を試みる
        rawValue = JSON.stringify(content.value);
        console.log('🔧 [parseContentDataFaithful] オブジェクト値を文字列化:', rawValue.slice(0, 100));
      }
    }

    if (!rawValue) {
      console.warn('⚠️ [parseContentDataFaithful] コンテンツ値が見つかりません');
      return null;
    }

    console.log('📊 [parseContentDataFaithful] 生データ忠実取得成功:', {
      rawValueLength: rawValue.length,
      rawValuePreview: rawValue.slice(0, 200) + (rawValue.length > 200 ? '...' : ''),
      expectedSize: size
    });

    // ✅ 修正: 数値変換（忠実対応版・より堅牢）
    const values = rawValue
      .split(/\s+/)              // 空白文字で分割
      .map(val => val.trim())    // 前後の空白を除去
      .filter(val => val.length > 0)  // 空文字列を除去
      .map(val => {
        const num = parseFloat(val);
        if (isNaN(num)) {
          console.warn(`⚠️ [parseContentDataFaithful] 数値変換失敗: "${val}"`);
          return 0;
        }
        return num;
      });
    
    console.log(`📊 [parseContentDataFaithful] 数値変換忠実完了:`, {
      parsedCount: values.length,
      expectedSize: size,
      sizeMatch: values.length === size,
      firstFewValues: values.slice(0, 5),
      lastFewValues: values.slice(-5),
      minValue: values.length > 0 ? Math.min(...values) : 0,
      maxValue: values.length > 0 ? Math.max(...values) : 0,
      avgValue: values.length > 0 ? (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(4) : 0
    });

    // ✅ 修正: サイズ不一致の詳細警告
    if (size > 0 && values.length !== size) {
      console.warn(`⚠️ [parseContentDataFaithful] サイズ不一致詳細:`, {
        expectedSize: size,
        actualSize: values.length,
        difference: values.length - size,
        rawValueLength: rawValue.length,
        splitCount: rawValue.split(/\s+/).length
      });
    }

    // ✅ 修正: 完全な忠実contentDataオブジェクトを返す
    const contentDataObject = {
      type: 'content',
      contentType: contentType,
      axis: axis,
      units: units,
      key: key,
      size: size,
      formatString: formatString,
      scaleFactor: scaleFactor,
      values: values,
      rawValue: rawValue.slice(0, 500) + (rawValue.length > 500 ? '...' : ''),
      isDataGrid: true,
      parsedSize: values.length,
      isValidSize: size === 0 || values.length === size,
      source: 'faithful_content_parse_v3', // 忠実contentパース処理v3フラグ
      statistics: {
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        avg: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0,
        count: values.length
      }
    };

    console.log(`✅ [parseContentDataFaithful] 忠実contentデータオブジェクト作成完了:`, {
      key: contentDataObject.key,
      axis: contentDataObject.axis,
      units: contentDataObject.units,
      valueCount: contentDataObject.values.length,
      isValid: contentDataObject.isValidSize,
      source: contentDataObject.source,
      statistics: contentDataObject.statistics
    });

    return contentDataObject;
  }

  /**
   * プロパティ値の型変換
   */
  convertPropertyValue(value, xsiType) {
    if (!value || value === '') return '';

    try {
      switch (xsiType) {
        case 'doubleType':
        case 'floatType':
          const floatValue = parseFloat(value);
          return isNaN(floatValue) ? value : floatValue;
        
        case 'intType':
          const intValue = parseInt(value);
          return isNaN(intValue) ? value : intValue;
        
        case 'booleanType':
          if (typeof value === 'boolean') return value;
          return value.toLowerCase() === 'true';
        
        case 'dateTimeType':
          return value;
        
        case 'stringType':
        default:
          return String(value);
      }
    } catch (error) {
      console.warn('⚠️ [convertPropertyValue] 値変換エラー:', error, { value, xsiType });
      return String(value);
    }
  }

  /**
   * テンプレートを解析（templateRef参照解決対応版 + insertion要素対応）
   */
  parseTemplate(template, type) {
    // 既存のプロパティ解析
    let properties = this.parsePropertiesFaithful(template.property);
    const templateId = template._attributes?.id || '';
    
    console.log('🔍 [parseTemplate] テンプレート解析開始:', {
      id: templateId,
      type: type,
      hasTemplateRef: !!template.templateRef,
      hasProperty: !!template.property,
      hasContent: !!template.content,
      hasInsertion: !!template.insertion,
      hasPlaceRef: !!template.placeRef,
      placeRefKeys: template.placeRef ? Object.keys(template.placeRef) : [],
      templateKeys: Object.keys(template)
    });
    
    // ✅ Phase 1新規: <insertion>要素の検出・解析
    if (template.insertion) {
      console.log(`📎 [parseTemplate] <insertion>要素検出: ${templateId}`);
      const insertionProperty = this.parseInsertionElement(template.insertion, templateId);
      if (insertionProperty) {
        properties.push(insertionProperty);
        console.log('✅ [parseTemplate] <insertion>要素をプロパティに追加:', insertionProperty);
      }
    }
    
    // ✅ 修正: template直下のcontent要素も処理（GC-MS.maiml対応）
    if (template.content) {
      const contentElements = Array.isArray(template.content) 
        ? template.content 
        : [template.content];
      
      console.log('📊 [parseTemplate] template直下content要素処理:', {
        templateId,
        contentCount: contentElements.length
      });
      
      contentElements.forEach((content, index) => {
        if (content && content._attributes) {
          const contentProp = this.parseContentElementFaithful(content);
          if (contentProp) {
            properties.push(contentProp);
            console.log(`✅ [parseTemplate] template直下content要素追加: ${contentProp.key} (${contentProp.type})`);
          }
        }
      });
    }
    
    // 🔗 templateRef解決処理
    if (template.templateRef) {
      const templateRefId = template.templateRef._attributes?.ref || 
                           template.templateRef.$?.ref;
      if (templateRefId) {
        console.log(`🔗 [parseTemplate] templateRef検出: ${templateId} -> ${templateRefId}`);
        const referencedProps = this.resolveTemplateRef(templateRefId, new Set([templateId]));
        if (referencedProps.length > 0) {
          properties = [...properties, ...referencedProps];
          console.log(`✅ [parseTemplate] templateRef解決成功: ${referencedProps.length}個のプロパティを追加`);
        }
      }
    }
    
    // 🔍 placeRef取得の詳細ログ
    console.log('🔍 [parseTemplate] placeRef取得試行:', {
      templateId,
      hasPlaceRef: !!template.placeRef,
      placeRefType: typeof template.placeRef,
      placeRefKeys: template.placeRef ? Object.keys(template.placeRef) : [],
      _attributes: template.placeRef?._attributes,
      $: template.placeRef?.$,
      isArray: Array.isArray(template.placeRef)
    });
    
    // ✅ 修正: placeRefを配列として処理（複数のplaceRef要素に対応）
    let placeRefs = [];
    if (template.placeRef) {
      const placeRefElements = Array.isArray(template.placeRef) 
        ? template.placeRef 
        : [template.placeRef];
      
      placeRefs = placeRefElements
        .map(pr => pr._attributes?.ref || pr.$?.ref)
        .filter(ref => ref); // 空の参照を除外
    }
    
    console.log('🔍 [parseTemplate] placeRef取得結果:', {
      templateId,
      placeRefs,
      placeRefsCount: placeRefs.length,
      hasPlaceRefs: placeRefs.length > 0
    });
    
    // ✅ 修正: 最初のplaceRefでtransitionRefを検索（後方互換性のため）
    const transitionRef = placeRefs.length > 0 ? this.findTransitionByPlace(placeRefs[0]) : null;

    const parsed = {
      id: templateId,
      type: type,
      name: template.name?._text || templateId,
      description: template.description?._text || '',
      placeRef: placeRefs.length > 0 ? placeRefs[0] : '', // 後方互換性のため最初の要素
      placeRefs: placeRefs, // ✅ 新規: 全てのplaceRefsを配列として保持
      transitionRef: transitionRef,
      properties: properties,
      hasTemplateRef: !!template.templateRef,
      hasInsertion: !!template.insertion,
      resolvedFromRef: template.templateRef ? (template.templateRef._attributes?.ref || template.templateRef.$?.ref) : null
    };

    console.log('🔍 [parseTemplate] テンプレート忠実解析:', {
      id: parsed.id,
      type: parsed.type,
      propertyCount: properties.length,
      propertyListTypeCount: properties.filter(p => p.type === 'propertyListType').length,
      onePointCount: properties.filter(p => p.key.toLowerCase() === 'onepoint').length,
      insertionCount: properties.filter(p => p.type === 'insertion').length,
      hasTransitionRef: !!transitionRef,
      hasTemplateRef: parsed.hasTemplateRef,
      hasInsertion: parsed.hasInsertion,
      resolvedFromRef: parsed.resolvedFromRef
    });

    return parsed;
  }

  /**
   * ✅ Phase 1新規: <insertion>要素を解析してプロパティ形式に変換
   * @param {object} insertionElement - <insertion>要素のXMLオブジェクト
   * @param {string} templateId - テンプレートID（ログ用）
   * @returns {object} insertion型プロパティオブジェクト
   */
  parseInsertionElement(insertionElement, templateId) {
    console.log('📎 [parseInsertionElement] <insertion>要素解析開始:', {
      templateId,
      hasUri: !!insertionElement.uri,
      hasHash: !!insertionElement.hash,
      hasFormat: !!insertionElement.format,
      insertionKeys: Object.keys(insertionElement)
    });

    if (!insertionElement) {
      console.warn('⚠️ [parseInsertionElement] insertion要素がnull/undefined');
      return null;
    }

    // <uri>, <hash>, <format>の各要素を解析
    const elements = {};

    // <uri>要素の解析
    if (insertionElement.uri !== undefined) {
      const uriValue = insertionElement.uri?._text || '';
      elements.uri = {
        key: 'uri',
        type: 'stringType',
        description: 'ファイルURI（相対パス: ./filename）',
        defaultValue: uriValue,
        required: true,
        isFileInput: true, // ファイル選択UI用フラグ
        source: 'insertion_parse_v1'
      };
      console.log('📎 [parseInsertionElement] <uri>要素解析:', {
        value: uriValue,
        hasValue: !!uriValue
      });
    }

    // <hash>要素の解析
    if (insertionElement.hash !== undefined) {
      const hashValue = insertionElement.hash?._text || '';
      elements.hash = {
        key: 'hash',
        type: 'stringType',
        description: 'SHA256ハッシュ（自動生成）',
        defaultValue: hashValue,
        required: true,
        autoGenerate: true, // 自動生成フラグ
        source: 'insertion_parse_v1'
      };
      console.log('📎 [parseInsertionElement] <hash>要素解析:', {
        value: hashValue ? hashValue.slice(0, 20) + '...' : '',
        hasValue: !!hashValue
      });
    }

    // <format>要素の解析
    if (insertionElement.format !== undefined) {
      const formatValue = insertionElement.format?._text || 'application/octet-stream';
      elements.format = {
        key: 'format',
        type: 'stringType',
        description: 'MIMEタイプ（自動検出）',
        defaultValue: formatValue,
        required: true,
        autoDetect: true, // 自動検出フラグ
        source: 'insertion_parse_v1'
      };
      console.log('📎 [parseInsertionElement] <format>要素解析:', {
        value: formatValue,
        hasValue: !!formatValue
      });
    }

    // insertion型プロパティオブジェクトを構築
    const insertionProperty = {
      key: 'insertion',
      type: 'insertion',
      description: 'ファイル添付（画像・データファイル）',
      elements: elements,
      required: true,
      source: 'insertion_parse_v1',
      elementCount: Object.keys(elements).length
    };

    console.log('✅ [parseInsertionElement] <insertion>要素解析完了:', {
      templateId,
      elementCount: insertionProperty.elementCount,
      hasUri: !!elements.uri,
      hasHash: !!elements.hash,
      hasFormat: !!elements.format,
      elements: Object.keys(elements)
    });

    return insertionProperty;
  }

  /**
   * 🆕 templateRef参照を解決してpropertiesを取得
   * @param {string} templateRefId - 参照先テンプレートID
   * @param {Set} visitedIds - 循環参照チェック用
   * @returns {Array} プロパティ配列
   */
  resolveTemplateRef(templateRefId, visitedIds = new Set()) {
    console.log('🔗 [resolveTemplateRef] 参照解決開始:', templateRefId);
    
    // 循環参照チェック
    if (visitedIds.has(templateRefId)) {
      console.warn('⚠️ [resolveTemplateRef] 循環参照検出:', templateRefId);
      return [];
    }
    
    visitedIds.add(templateRefId);
    
    // 参照先テンプレートを検索
    const template = this.findTemplateById(templateRefId);
    if (!template) {
      console.warn('⚠️ [resolveTemplateRef] 参照先テンプレート未発見:', templateRefId);
      return [];
    }
    
    console.log('✅ [resolveTemplateRef] 参照先テンプレート発見:', {
      id: templateRefId,
      hasProperty: !!template.property,
      hasContent: !!template.content,
      hasTemplateRef: !!template.templateRef
    });
    
    // プロパティ取得（property要素）
    let properties = this.parsePropertiesFaithful(template.property);
    
    // ✅ 修正: content要素も処理（GC-MS.maimlのcontent要素対応）
    if (template.content) {
      const contentElements = Array.isArray(template.content) 
        ? template.content 
        : [template.content];
      
      console.log('📊 [resolveTemplateRef] content要素処理:', {
        contentCount: contentElements.length,
        templateRefId: templateRefId
      });
      
      contentElements.forEach((content, index) => {
        if (content && content._attributes) {
          const contentProp = this.parseContentElementFaithful(content);
          if (contentProp) {
            properties.push(contentProp);
            console.log(`✅ [resolveTemplateRef] content要素追加: ${contentProp.key} (${contentProp.type})`);
          }
        }
      });
    }
    
    // 参照先もtemplateRefを持つ場合、再帰的に解決
    if (template.templateRef) {
      const nestedRefId = template.templateRef._attributes?.ref || 
                         template.templateRef.$?.ref;
      if (nestedRefId) {
        console.log('🔗 [resolveTemplateRef] 多段参照検出:', {
          current: templateRefId,
          next: nestedRefId
        });
        const nestedProps = this.resolveTemplateRef(nestedRefId, visitedIds);
        properties = [...properties, ...nestedProps];
        console.log('✅ [resolveTemplateRef] 多段参照解決完了:', {
          current: templateRefId,
          totalProperties: properties.length
        });
      }
    }
    
    console.log('✅ [resolveTemplateRef] 参照解決完了:', {
      templateRefId: templateRefId,
      propertiesCount: properties.length,
      propertyCount: properties.filter(p => p.type !== 'content').length,
      contentCount: properties.filter(p => p.type === 'content' || p.type === 'contentDoubleListType').length,
      visitedCount: visitedIds.size
    });
    
    return properties;
  }

  /**
   * 🆕 テンプレートIDでテンプレートを検索
   * @param {string} templateId - 検索するテンプレートID
   * @returns {object|null} テンプレートオブジェクト
   */
  findTemplateById(templateId) {
    console.log('🔍 [findTemplateById] テンプレート検索開始:', templateId);
    
    const protocol = this.maiml?.protocol;
    const method = protocol?.method;
    
    if (!protocol) {
      console.warn('⚠️ [findTemplateById] protocolが見つかりません');
      return null;
    }
    
    // ヘルパー関数: 配列からテンプレートを検索
    const searchInArray = (arr, label) => {
      if (!arr) return null;
      const templates = Array.isArray(arr) ? arr : [arr];
      const found = templates.find(t => 
        (t._attributes?.id === templateId) || (t.$?.id === templateId)
      );
      if (found) {
        console.log(`✅ [findTemplateById] テンプレート発見: ${label}`, templateId);
      }
      return found;
    };
    
    // protocol直下を検索（XRF.maiml対応）
    let found = searchInArray(protocol.materialTemplate, 'protocol.materialTemplate');
    if (found) return found;
    
    found = searchInArray(protocol.conditionTemplate, 'protocol.conditionTemplate');
    if (found) return found;
    
    found = searchInArray(protocol.resultTemplate, 'protocol.resultTemplate');
    if (found) return found;
    
    // method直下を検索（GC-MS.maiml対応）
    if (method) {
      found = searchInArray(method.materialTemplate, 'method.materialTemplate');
      if (found) return found;
      
      found = searchInArray(method.conditionTemplate, 'method.conditionTemplate');
      if (found) return found;
      
      found = searchInArray(method.resultTemplate, 'method.resultTemplate');
      if (found) return found;
    }
    
    // program配下を検索
    if (!method) {
      console.warn('⚠️ [findTemplateById] methodが見つかりません（program検索スキップ）');
      console.warn('⚠️ [findTemplateById] テンプレート未発見:', templateId);
      return null;
    }
    
    const programs = Array.isArray(method.program) 
      ? method.program 
      : (method.program ? [method.program] : []);
    
    console.log(`🔍 [findTemplateById] program配下を検索 (${programs.length}個)`);
    
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const programId = program._attributes?.id || program.$?.id || `program_${i}`;
      
      found = searchInArray(program.materialTemplate, `program[${programId}].materialTemplate`);
      if (found) return found;
      
      found = searchInArray(program.conditionTemplate, `program[${programId}].conditionTemplate`);
      if (found) return found;
      
      found = searchInArray(program.resultTemplate, `program[${programId}].resultTemplate`);
      if (found) return found;
    }
    
    console.warn('⚠️ [findTemplateById] テンプレート未発見:', templateId);
    return null;
  }

  /**
   * ✅ Phase 1完全版: プロパティを完全再帰解析（Level 1からの多重ネスト対応）
   * - propertyListType+content混在対応
   * - Level 3以降の多重ネスト構造に完全対応
   * - <value>と子<property>が混在するケース（XRF.maimlのxrayGenerationFlag等）に対応
   */
  parsePropertiesFaithful(propertyElement, nestLevel = 1) {
    if (!propertyElement) return [];
    
    const properties = [];
    const elements = Array.isArray(propertyElement) ? propertyElement : [propertyElement];
    
    console.log(`🔍 [parsePropertiesFaithful Level${nestLevel}] プロパティ要素解析開始: ${elements.length}件`);
    
    elements.forEach((prop, index) => {
      const attributes = prop._attributes || {};
      const type = attributes['xsi:type'] || 'stringType';
      const key = attributes.key || `property_${index}`;
      const units = attributes.units || '';
      
      console.log(`🔍 [parsePropertiesFaithful Level${nestLevel}] プロパティ詳細解析: ${key} (${type})`);
      
      // ✅ Phase 1新規: 子<property>要素の存在チェック
      const hasChildProperties = !!(prop.property);
      const hasValue = !!(prop.value);
      
      // ✅ Phase 1: propertyListTypeまたは子<property>を持つ場合の再帰処理
      if (type === 'propertyListType' || hasChildProperties) {
        console.log(`🗂️ [parsePropertiesFaithful Level${nestLevel}] 多重ネスト検出: ${key}`, {
          type,
          hasChildProperties,
          hasValue
        });
        
        const subProperties = [];
        
        // 子property要素を再帰的に解析（Level 2→3→4...）
        if (prop.property) {
          const nestedProps = Array.isArray(prop.property) ? prop.property : [prop.property];
          
          nestedProps.forEach((nestedProp, nestedIndex) => {
            if (nestedProp && nestedProp._attributes) {
              // ✅ Phase 1: parsePropertyElementFaithfulを使用して再帰解析
              const nestedParsed = this.parsePropertyElementFaithful(nestedProp, nestLevel + 1);
              if (nestedParsed) {
                subProperties.push(nestedParsed);
                console.log(`✅ [parsePropertiesFaithful Level${nestLevel}] 子property追加: ${key}.${nestedParsed.key} (Level${nestLevel + 1})`);
              } else {
                console.warn(`⚠️ [parsePropertiesFaithful Level${nestLevel}] 子property[${nestedIndex}]解析失敗`);
              }
            }
          });
        }
        
        // ✅ Phase 1: propertyListType内のcontent要素を解析
        if (prop.content) {
          console.log(`📊 [parsePropertiesFaithful Level${nestLevel}] propertyListType内content要素処理: ${key}`);
          
          const contentElements = Array.isArray(prop.content) ? prop.content : [prop.content];
          
          contentElements.forEach((contentElement, contentIndex) => {
            if (contentElement && contentElement._attributes) {
              const contentParsed = this.parseContentElementFaithful(contentElement);
              if (contentParsed) {
                subProperties.push(contentParsed);
                console.log(`📊 [parsePropertiesFaithful Level${nestLevel}] ネストcontent要素追加: ${key}.${contentParsed.key}`);
              }
            }
          });
        }
        
        const isOnePointElement = key.toLowerCase() === 'onepoint';
        
        // ✅ Phase 1新規: <value>と子<property>の混在型プロパティ構築
        const parsed = {
          key: key,
          type: type === 'propertyListType' ? 'propertyListType' : this.convertXsiType(type),
          xsiType: type,
          description: prop.description?._text || key,
          units: units,
          properties: subProperties,
          isOnePoint: isOnePointElement,
          source: `faithful_template_parse_v5_L${nestLevel}`, // Phase 1: v5+レベル情報
          nestLevel: nestLevel,
          nestedPropertyCount: subProperties.length,
          hasNestedContent: subProperties.some(sp => 
            sp.type === 'contentDoubleListType' || sp.type === 'contentListType' || sp.type === 'content'
          ),
          // ✅ Phase 1新規: 混在型の場合、自身の<value>も保持
          ...(hasValue && type !== 'propertyListType' && {
            value: prop.value?._text || '',
            defaultValue: prop.value?._text || '',
            hasMixedContent: true // 混在フラグ
          }),
          formatString: attributes.formatString || '',
          scaleFactor: parseFloat(attributes.scaleFactor) || 1.0
        };
        
        properties.push(parsed);
        console.log(`✅ [parsePropertiesFaithful Level${nestLevel}] 多重ネスト処理完了: ${key}`, {
          type: parsed.type,
          hasValue: !!parsed.value,
          hasMixedContent: parsed.hasMixedContent,
          childCount: subProperties.length,
          nestLevel: parsed.nestLevel
        });
      }
      // contentタイプの場合
      else if (prop.content) {
        const parsed = {
          key: key,
          type: 'content',
          description: prop.description?._text || key,
          units: units,
          contentType: type,
          size: prop.content?._attributes?.size || 0,
          axis: prop.content?._attributes?.axis || '',
          source: `faithful_template_parse_v5_L${nestLevel}`,
          nestLevel: nestLevel
        };
        
        properties.push(parsed);
        console.log(`📊 [parsePropertiesFaithful Level${nestLevel}] contentプロパティ追加: ${key}`);
      }
      // 通常のプロパティ
      else {
        const parsed = {
          key: key,
          type: this.convertXsiType(type),
          description: prop.description?._text || key,
          units: units,
          defaultValue: prop.value?._text || '',
          xsiType: type,
          source: `faithful_template_parse_v5_L${nestLevel}`,
          nestLevel: nestLevel,
          formatString: attributes.formatString || '',
          scaleFactor: parseFloat(attributes.scaleFactor) || 1.0
        };
        
        properties.push(parsed);
        console.log(`🔍 [parsePropertiesFaithful Level${nestLevel}] 通常プロパティ追加: ${key}`);
      }
    });
    
    console.log(`✅ [parsePropertiesFaithful Level${nestLevel}] プロパティ解析完了:`, {
      totalCount: properties.length,
      propertyListTypes: properties.filter(p => p.type === 'propertyListType').length,
      mixedContentCount: properties.filter(p => p.hasMixedContent).length,
      onePointElements: properties.filter(p => p.isOnePoint).length,
      contentElements: properties.filter(p => p.type === 'content').length
    });

    return properties;
  }

  /**
   * ✅ Phase 1実装: property要素の完全再帰解析（Level 3以降+混在型対応）
   * - Level 3以降の多重ネスト構造に対応
   * - <value>と子<property>が混在するケース（XRF.maimlのxrayGenerationFlag等）に対応
   */
  parsePropertyElementFaithful(propElement, nestLevel = 2) {
    if (!propElement || !propElement._attributes) {
      return null;
    }

    const attributes = propElement._attributes;
    const key = attributes.key || '';
    const type = attributes['xsi:type'] || 'stringType';
    const units = attributes.units || '';
    
    if (!key) {
      console.warn(`⚠️ [parsePropertyElementFaithful Level${nestLevel}] keyが見つかりません:`, propElement);
      return null;
    }

    console.log(`🔍 [parsePropertyElementFaithful Level${nestLevel}] ネスト要素解析: ${key} (${type})`);

    // ✅ Phase 1新規: 子<property>要素の存在チェック（Level 3以降対応）
    const hasChildProperties = !!(propElement.property);
    const hasValue = !!(propElement.value);
    
    // ✅ Phase 1新規: propertyListTypeまたは子<property>を持つ場合の再帰処理
    if (type === 'propertyListType' || hasChildProperties) {
      console.log(`🗂️ [parsePropertyElementFaithful Level${nestLevel}] 多重ネスト検出: ${key}`, {
        type,
        hasChildProperties,
        hasValue,
        willRecurse: true
      });
      
      const subProperties = [];
      
      // 子property要素を再帰的に解析
      if (propElement.property) {
        const nestedProps = Array.isArray(propElement.property) ? propElement.property : [propElement.property];
        
        nestedProps.forEach((nestedProp, nestedIndex) => {
          if (nestedProp && nestedProp._attributes) {
            // ✅ Phase 1: 再帰呼び出しでnestLevelを渡す
            const nestedParsed = this.parsePropertyElementFaithful(nestedProp, nestLevel + 1);
            if (nestedParsed) {
              subProperties.push(nestedParsed);
              console.log(`✅ [parsePropertyElementFaithful Level${nestLevel}] 子property追加: ${key}.${nestedParsed.key} (Level${nestLevel + 1})`);
            }
          }
        });
      }
      
      // ✅ Phase 1新規: <value>と子<property>の混在型プロパティ構築
      const result = {
        key: key,
        type: type === 'propertyListType' ? 'propertyListType' : this.convertXsiType(type),
        xsiType: type,
        description: propElement.description?._text || key,
        units: units,
        properties: subProperties,
        source: `faithful_multilevel_parse_v5_L${nestLevel}`, // Phase 1: レベル情報付きフラグ
        nestLevel: nestLevel,
        nestedPropertyCount: subProperties.length,
        // ✅ Phase 1新規: 混在型の場合、自身の<value>も保持
        ...(hasValue && type !== 'propertyListType' && {
          value: propElement.value?._text || '',
          hasMixedContent: true // 混在フラグ
        }),
        formatString: attributes.formatString || '',
        scaleFactor: parseFloat(attributes.scaleFactor) || 1.0
      };
      
      console.log(`✅ [parsePropertyElementFaithful Level${nestLevel}] 多重ネスト解析完了: ${key}`, {
        type: result.type,
        hasValue: !!result.value,
        hasMixedContent: result.hasMixedContent,
        childCount: subProperties.length,
        nestLevel: result.nestLevel
      });
      
      return result;
    }

    // ✅ Phase 1: 通常のプロパティ（子要素なし）
    return {
      key: key,
      type: this.convertXsiType(type),
      xsiType: type,
      description: propElement.description?._text || key,
      units: units,
      defaultValue: propElement.value?._text || '',
      formatString: attributes.formatString || '',
      scaleFactor: parseFloat(attributes.scaleFactor) || 1.0,
      source: `faithful_nested_parse_v5_L${nestLevel}`, // Phase 1: v5フラグ
      nestLevel: nestLevel
    };
  }

  /**
   * ✅ 修正: content要素の忠実解析（propertyListType内のネスト要素用）
   */
  parseContentElementFaithful(contentElement) {
    if (!contentElement || !contentElement._attributes) {
      return null;
    }

    const attributes = contentElement._attributes;
    const key = attributes.key || '';
    const type = attributes['xsi:type'] || 'contentDoubleListType';
    const axis = attributes.axis || '';
    const units = attributes.units || '';
    const size = parseInt(attributes.size) || 0;
    
    if (!key) {
      console.warn('⚠️ [parseContentElementFaithful] keyが見つかりません:', contentElement);
      return null;
    }

    console.log(`📊 [parseContentElementFaithful] ネストcontent要素忠実解析: ${key} (${type})`);

    return {
      key: key,
      type: this.convertXsiType(type),
      xsiType: type,
      description: axis || key,
      units: units,
      contentType: type,
      size: size,
      axis: axis,
      formatString: attributes.formatString || '',
      scaleFactor: parseFloat(attributes.scaleFactor) || 1.0,
      source: 'faithful_nested_content_parse_v3' // 忠実ネストcontent解析v3フラグ
    };
  }

  /**
   * xsi:typeをシンプルな型名に変換（強化版）
   */
  convertXsiType(xsiType) {
    const typeMap = {
      'stringType': 'stringType',
      'doubleType': 'doubleType',
      'floatType': 'floatType',
      'intType': 'intType',
      'booleanType': 'booleanType',
      'dateTimeType': 'dateTimeType',
      'propertyListType': 'propertyListType',
      'contentDoubleListType': 'contentDoubleListType',
      'contentListType': 'contentListType'
    };
    
    const converted = typeMap[xsiType] || 'stringType';
    
    if (converted !== xsiType && xsiType !== 'stringType') {
      console.log('🔄 [convertXsiType] 型変換:', xsiType, '→', converted);
    }
    
    return converted;
  }

  /**
   * 🆕 追加: OnePoint要素数をカウント
   */
  countOnePointElements(existingData) {
    let count = 0;
    ['materials', 'conditions', 'results'].forEach(category => {
      if (existingData[category]) {
        existingData[category].forEach(item => {
          if (item.properties) {
            count += this.countOnePointInProperties(item.properties);
          }
        });
      }
    });
    return count;
  }

  /**
   * 🆕 追加: プロパティ内のOnePoint要素数をカウント
   */
  countOnePointInProperties(properties) {
    let count = 0;
    if (properties && typeof properties === 'object') {
      Object.entries(properties).forEach(([key, value]) => {
        if (key.toLowerCase() === 'onepoint' && 
            typeof value === 'object' && 
            value !== null && 
            value.type === 'propertyList') {
          count++;
        }
      });
    }
    return count;
  }

  /**
   * 🆕 追加: OnePointプロパティの存在チェック
   */
  hasOnePointProperty(properties) {
    return this.countOnePointInProperties(properties) > 0;
  }

  /**
   * 🆕 追加: propertyListType要素数をカウント
   */
  countPropertyListTypeElements(existingData) {
    let count = 0;
    ['materials', 'conditions', 'results'].forEach(category => {
      if (existingData[category]) {
        existingData[category].forEach(item => {
          if (item.properties) {
            count += this.countPropertyListTypeInProperties(item.properties);
          }
        });
      }
    });
    return count;
  }

  /**
   * 🆕 追加: プロパティ内のpropertyListType要素数をカウント
   */
  countPropertyListTypeInProperties(properties) {
    let count = 0;
    if (properties && typeof properties === 'object') {
      Object.entries(properties).forEach(([key, value]) => {
        if (typeof value === 'object' && 
            value !== null && 
            value.type === 'propertyList') {
          count++;
        }
      });
    }
    return count;
  }

  /**
   * 🆕 追加: propertyListTypeプロパティの存在チェック
   */
  hasPropertyListTypeProperty(properties) {
    return this.countPropertyListTypeInProperties(properties) > 0;
  }

  /**
   * placeからトランジションを特定（強化ログ版）
   */
  findTransitionByPlace(placeId) {
    if (!placeId) {
      console.log('⚠️ [findTransitionByPlace] placeIdが空です');
      return null;
    }

    console.log('🔍 [findTransitionByPlace] トランジション検索開始:', placeId);
    
    const arcs = this.getArcs();
    console.log('🔍 [findTransitionByPlace] アーク数:', arcs.length);
    
    // このplaceに接続されているアークを検索
    const connectedArcs = arcs.filter(arc => 
      arc.source === placeId || arc.target === placeId
    );
    
    console.log('🔍 [findTransitionByPlace] 接続アーク:', {
      placeId,
      connectedCount: connectedArcs.length,
      arcs: connectedArcs.map(a => ({ id: a.id, source: a.source, target: a.target }))
    });
    
    if (connectedArcs.length === 0) {
      console.warn('⚠️ [findTransitionByPlace] 接続アークが見つかりません:', placeId);
      return null;
    }
    
    const transitions = this.getTransitions();
    console.log('🔍 [findTransitionByPlace] トランジション数:', transitions.length);
    
    // アークの反対側の要素（transition）を探す
    for (const arc of connectedArcs) {
      // placeがsourceの場合、targetがtransition
      // placeがtargetの場合、sourceがtransition
      const transitionId = arc.source === placeId ? arc.target : arc.source;
      
      const transition = transitions.find(t => t.id === transitionId);
      if (transition) {
        console.log('✅ [findTransitionByPlace] トランジション発見:', {
          placeId,
          transitionId: transition.id,
          arcId: arc.id
        });
        return transition.id;
      } else {
        console.log('🔍 [findTransitionByPlace] トランジション候補チェック:', {
          placeId,
          candidateId: transitionId,
          found: false
        });
      }
    }
    
    console.warn('⚠️ [findTransitionByPlace] トランジションが見つかりません:', {
      placeId,
      connectedArcs: connectedArcs.length,
      transitions: transitions.length
    });
    return null;
  }

  /**
   * ✅ 複数method対応: 全てのアークを取得
   */
  getArcs() {
    const arcs = [];
    const protocol = this.maiml?.protocol;
    
    if (!protocol) {
      console.log('⚠️ [getArcs] protocolが見つかりません');
      return arcs;
    }

    // ✅ 複数method対応: すべてのmethod要素を取得
    const methods = Array.isArray(protocol.method) 
      ? protocol.method 
      : (protocol.method ? [protocol.method] : []);

    console.log(`🔍 [getArcs] method数: ${methods.length}`);

    // ✅ 複数method対応: 各methodのpnmlからarcを取得
    methods.forEach((method, methodIndex) => {
      const methodId = method._attributes?.id || `method_${methodIndex}`;
      const pnml = method.pnml;
      
      if (!pnml) {
        console.log(`⚠️ [getArcs] method[${methodId}]にpnmlが見つかりません`);
        return;
      }

      const arcElements = Array.isArray(pnml.arc) 
        ? pnml.arc 
        : (pnml.arc ? [pnml.arc] : []);

      arcElements.forEach(arc => {
        arcs.push({
          id: arc._attributes?.id,
          source: arc._attributes?.source,
          target: arc._attributes?.target,
          methodId: methodId, // ✅ method情報を追加
          methodIndex: methodIndex
        });
      });

      console.log(`🔍 [getArcs] method[${methodId}]のarc数: ${arcElements.length}`);
    });

    console.log(`✅ [getArcs] 全arc数: ${arcs.length}`);
    return arcs;
  }

  /**
   * 既存のインスタンスデータを取得
   */
  getExistingInstances() {
    const instances = {};
    const results = this.maiml?.data?.results?.result;
    
    if (!results) return instances;

    const resultArray = Array.isArray(results) ? results : [results];
    
    resultArray.forEach(result => {
      const templateRef = result._attributes?.ref;
      if (templateRef) {
        if (!instances[templateRef]) {
          instances[templateRef] = [];
        }
        instances[templateRef].push({
          id: result._attributes?.id,
          properties: this.parsePropertiesFaithful(result.property)
        });
      }
    });

    return instances;
  }

  /**
   * イベントログを取得
   */
  getEventLogs() {
    const logs = [];
    const events = this.maiml?.eventLog?.log?.trace?.event;
    
    if (!events) return logs;

    const eventArray = Array.isArray(events) ? events : [events];
    
    eventArray.forEach(event => {
      logs.push({
        id: event._attributes?.id,
        transitionRef: event._attributes?.ref,
        timestamp: this.findPropertyValue(event.property, 'time:timestamp'),
        operatorId: this.findPropertyValue(event.property, 'operator:id')
      });
    });

    return logs;
  }

  /**
   * プロパティから特定のキーの値を取得
   */
  findPropertyValue(properties, key) {
    if (!properties) return null;
    
    const propArray = Array.isArray(properties) ? properties : [properties];
    const prop = propArray.find(p => p._attributes?.key === key);
    
    return prop?.value?._text || null;
  }

  // ========================================
  // 🆕 Phase 2: DOMParser実装メソッド群
  // ========================================

  /**
   * 🆕 DOMParser版: テンプレート一覧を取得（空要素対応）
   * propertyListType内の空<property>要素も正しく取得します
   */
  getTemplatesFromDOM() {
    console.log('🎯 [getTemplatesFromDOM] DOMParser版テンプレート取得開始');
    
    if (!this.domDocument) {
      console.warn('⚠️ [getTemplatesFromDOM] DOMDocumentが利用できません。従来版にフォールバック。');
      return null;
    }

    const templates = {
      materials: [],
      conditions: [],
      results: []
    };

    try {
      // protocol要素を取得
      const protocolElement = this.domDocument.querySelector('protocol');
      if (!protocolElement) {
        console.warn('⚠️ [getTemplatesFromDOM] protocol要素が見つかりません');
        return templates;
      }

      // method要素を取得
      const methodElement = protocolElement.querySelector('method');
      if (!methodElement) {
        console.warn('⚠️ [getTemplatesFromDOM] method要素が見つかりません');
        return templates;
      }

      // 各カテゴリのテンプレートを取得
      this.extractTemplatesFromDOM(protocolElement, templates, 'protocol');
      this.extractTemplatesFromDOM(methodElement, templates, 'method');

      // program配下のテンプレートも取得
      const programElements = methodElement.querySelectorAll(':scope > program');
      programElements.forEach((programElement, index) => {
        const programId = programElement.getAttribute('id') || `program_${index}`;
        this.extractTemplatesFromDOM(programElement, templates, `program[${programId}]`);
      });

      console.log('✅ [getTemplatesFromDOM] DOMParser版テンプレート取得完了:', {
        materials: templates.materials.length,
        conditions: templates.conditions.length,
        results: templates.results.length
      });

      return templates;

    } catch (error) {
      console.error('❌ [getTemplatesFromDOM] エラー:', error);
      return null;
    }
  }

  /**
   * 🆕 DOMParser版: 指定要素からテンプレートを抽出
   */
  extractTemplatesFromDOM(parentElement, templates, location) {
    const templateTypes = [
      { selector: 'materialTemplate', category: 'materials', type: 'material' },
      { selector: 'conditionTemplate', category: 'conditions', type: 'condition' },
      { selector: 'resultTemplate', category: 'results', type: 'result' }
    ];

    templateTypes.forEach(({ selector, category, type }) => {
      const templateElements = parentElement.querySelectorAll(`:scope > ${selector}`);
      
      templateElements.forEach(templateElement => {
        const templateId = templateElement.getAttribute('id');
        if (!templateId) {
          console.warn(`⚠️ [extractTemplatesFromDOM] ${selector}にid属性がありません`);
          return;
        }

        // 重複チェック
        const exists = templates[category].some(t => t.id === templateId);
        if (exists) {
          console.log(`⏭️ [extractTemplatesFromDOM] ${selector}重複スキップ: ${templateId}`);
          return;
        }

        // templateRefのみの場合はスキップ
        const hasTemplateRef = !!templateElement.querySelector(':scope > templateRef');
        const hasProperty = !!templateElement.querySelector(':scope > property');
        const hasContent = !!templateElement.querySelector(':scope > content');
        
        if (hasTemplateRef && !hasProperty && !hasContent) {
          console.log(`⏭️ [extractTemplatesFromDOM] 参照専用テンプレートをスキップ: ${templateId}`);
          return;
        }

        // テンプレートをパース
        const parsed = this.parseTemplateFromDOM(templateElement, type);
        if (parsed && parsed.id) {
          templates[category].push(parsed);
          console.log(`📦 [extractTemplatesFromDOM] ${selector}追加: ${templateId} (${location})`);
        }
      });
    });
  }

  /**
   * 🆕 DOMParser版: テンプレート要素をパース
   */
  parseTemplateFromDOM(templateElement, type) {
    const templateId = templateElement.getAttribute('id');
    const nameElement = templateElement.querySelector(':scope > name');
    const descriptionElement = templateElement.querySelector(':scope > description');
    
    console.log('🔍 [parseTemplateFromDOM] テンプレート解析開始:', templateId);

    // プロパティをパース（空要素も含む）
    const properties = this.parsePropertiesFromDOM(templateElement);

    // placeRefを取得
    const placeRefElement = templateElement.querySelector(':scope > placeRef');
    const placeRef = placeRefElement ? placeRefElement.getAttribute('ref') : '';
    
    const transitionRef = this.findTransitionByPlace(placeRef);

    const parsed = {
      id: templateId,
      type: type,
      name: nameElement?.textContent || templateId,
      description: descriptionElement?.textContent || '',
      placeRef: placeRef,
      transitionRef: transitionRef,
      properties: properties,
      source: 'dom_parser_v1' // DOMParserフラグ
    };

    console.log('✅ [parseTemplateFromDOM] テンプレート解析完了:', {
      id: parsed.id,
      propertyCount: properties.length,
      hasTransitionRef: !!transitionRef
    });

    return parsed;
  }

  /**
   * 🆕 DOMParser版: プロパティ一覧をパース（空要素対応）
   */
  parsePropertiesFromDOM(parentElement, nestLevel = 1) {
    const properties = [];
    
    // ✅ 修正: element.childrenを使用して名前空間対応
    // タグ名が'property'で終わる直接の子要素のみを取得（名前空間プレフィックスに対応）
    const propertyElements = Array.from(parentElement.children).filter(el => 
      el.tagName.toLowerCase().endsWith('property') || el.tagName === 'property'
    );
    
    console.log(`🔍 [parsePropertiesFromDOM Level${nestLevel}] プロパティ要素数: ${propertyElements.length}`);

    propertyElements.forEach((propElement, index) => {
      const key = propElement.getAttribute('key');
      const xsiType = propElement.getAttribute('xsi:type') || 'stringType';
      const units = propElement.getAttribute('units') || '';

      if (!key) {
        console.warn(`⚠️ [parsePropertiesFromDOM Level${nestLevel}] property[${index}]にkeyがありません`);
        return;
      }

      console.log(`🔍 [parsePropertiesFromDOM Level${nestLevel}] プロパティ: ${key} (${xsiType})`);

      // ✅ 修正: 子要素の存在チェック（property + content要素、localName使用で名前空間対応）
      const childPropertyElements = Array.from(propElement.children).filter(el => 
        el.localName === 'property'
      );
      const childContentElements = Array.from(propElement.children).filter(el => 
        el.localName === 'content'
      );
      const hasChildProperties = childPropertyElements.length > 0;
      const hasChildContent = childContentElements.length > 0;

      console.log(`🔍 [parsePropertiesFromDOM Level${nestLevel}] ${key} 子要素チェック:`, {
        xsiType,
        childPropertyCount: childPropertyElements.length,
        childContentCount: childContentElements.length,
        hasChildProperties,
        hasChildContent,
        childElements: [
          ...childPropertyElements.map(el => ({
            tagName: el.tagName,
            key: el.getAttribute('key'),
            type: el.getAttribute('xsi:type')
          })),
          ...childContentElements.map(el => ({
            tagName: el.tagName,
            key: el.getAttribute('key'),
            type: el.getAttribute('xsi:type'),
            axis: el.getAttribute('axis')
          }))
        ],
        method: 'element.children (namespace compatible, property+content)'
      });

      // ✅ 修正: propertyListTypeまたは子要素（property/content）を持つ場合
      if (xsiType === 'propertyListType' || hasChildProperties || hasChildContent) {
        console.log(`🗂️ [parsePropertiesFromDOM Level${nestLevel}] ネスト検出: ${key}`, {
          willRecurse: true,
          childPropertyCount: childPropertyElements.length,
          childContentCount: childContentElements.length
        });
        
        // ✅ 修正: property要素を再帰的に解析
        const subProperties = this.parsePropertiesFromDOM(propElement, nestLevel + 1);
        
        // ✅ 新規: content要素も解析して追加
        childContentElements.forEach((contentEl, contentIdx) => {
          const contentKey = contentEl.getAttribute('key') || `content_${contentIdx}`;
          const contentType = contentEl.getAttribute('xsi:type') || 'contentDoubleListType';
          const axis = contentEl.getAttribute('axis') || '';
          const size = parseInt(contentEl.getAttribute('size')) || 0;
          const contentUnits = contentEl.getAttribute('units') || '';
          
          console.log(`📊 [parsePropertiesFromDOM Level${nestLevel + 1}] content要素追加: ${contentKey} (${contentType})`);
          
          subProperties.push({
            key: contentKey,
            type: this.convertXsiType(contentType),
            xsiType: contentType,
            description: axis || contentKey,
            units: contentUnits,
            contentType: contentType,
            size: size,
            axis: axis,
            nestLevel: nestLevel + 1,
            source: `dom_parser_v1_L${nestLevel + 1}_content`
          });
        });

        const parsed = {
          key: key,
          type: 'propertyListType',
          xsiType: xsiType,
          description: key,
          units: units,
          properties: subProperties,
          nestLevel: nestLevel,
          source: `dom_parser_v1_L${nestLevel}`
        };

        properties.push(parsed);
        console.log(`✅ [parsePropertiesFromDOM Level${nestLevel}] ネストプロパティ追加: ${key} (子要素: ${subProperties.length}, property: ${childPropertyElements.length}, content: ${childContentElements.length})`);
      }
      // 通常のプロパティ
      else {
        const valueElement = propElement.querySelector(':scope > value');
        const defaultValue = valueElement ? valueElement.textContent.trim() : '';

        const parsed = {
          key: key,
          type: this.convertXsiType(xsiType),
          xsiType: xsiType,
          description: key,
          units: units,
          defaultValue: defaultValue,
          nestLevel: nestLevel,
          source: `dom_parser_v1_L${nestLevel}`
        };

        properties.push(parsed);
        console.log(`🔍 [parsePropertiesFromDOM Level${nestLevel}] 通常プロパティ追加: ${key}`);
      }
    });

    console.log(`✅ [parsePropertiesFromDOM Level${nestLevel}] 解析完了: ${properties.length}件`);
    return properties;
  }
}
