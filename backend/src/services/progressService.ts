/**
 * Progress Service
 * 進捗データ取得のビジネスロジック
 * 
 * Task 1.1: MAIMLパーサーアダプターの実装
 */

import * as maimlService from './maimlService';

/**
 * 解析結果の型定義
 */
export interface ParsedMethod {
  methodId: string;
  methodName: string;
  methodIndex: number;
  transitions: PetriNetTransition[];
  places: PetriNetPlace[];
  arcs: PetriNetArc[];
  metadata: {
    uuid: string;
    name: string;
    description: string;
    [key: string]: any;
  };
  statistics: {
    placeCount: number;
    transitionCount: number;
    arcCount: number;
  };
}

export interface PetriNetTransition {
  id: string;
  type: 'transition';
  data: {
    label: string;
    methodId: string;
    stereotype?: string;
    description?: string;
    program?: string;
    instructionId?: string;
    [key: string]: any;
  };
}

export interface PetriNetPlace {
  id: string;
  type: 'place';
  data: {
    name: string;
    label: string;
    methodId: string;
    stereotype?: string;
    description?: string;
    initialMarking?: string;
    [key: string]: any;
  };
}

export interface PetriNetArc {
  id: string;
  source: string;
  target: string;
  type: 'arc';
  methodId: string;
  data: {
    methodId: string;
    name: string;
    arcType?: string;
    weight?: string;
    [key: string]: any;
  };
}

export interface ParseResult {
  success: boolean;
  methods: ParsedMethod[];
  error?: string;
}

/**
 * MAIMLファイルから複数メソッド構造を抽出するアダプター関数
 * 既存のparsePetriNetStructure関数をラップし、統一されたインターフェースを提供
 * 
 * @param xmlContent MAIMLファイルのXML文字列
 * @returns 解析結果（成功フラグ、methods配列、エラー情報）
 * 
 * @requirements Requirement 4: MAIMLファイルとの連携
 */
export async function parseMultipleMethodsStructure(
  xmlContent: string
): Promise<ParseResult> {
  try {
    console.log('🔍 [progressService] parseMultipleMethodsStructure 開始');

    // 既存のparsePetriNetStructure関数を呼び出す
    const parseResult = await maimlService.parsePetriNetStructure(xmlContent);

    // エラーチェック
    if (!parseResult.success) {
      console.error('❌ [progressService] MAIML解析失敗:', parseResult.error);
      return {
        success: false,
        methods: [],
        error: parseResult.error || 'MAIML解析に失敗しました',
      };
    }

    // methods配列を取得
    const methods = parseResult.methods || [];

    console.log(
      `✅ [progressService] MAIML解析成功: ${methods.length}個のメソッド検出`
    );

    // 既存の返却データ構造をそのまま使用
    return {
      success: true,
      methods: methods as ParsedMethod[],
    };
  } catch (error) {
    console.error('❌ [progressService] parseMultipleMethodsStructure エラー:', error);

    // 予期しない例外をキャッチ
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      success: false,
      methods: [],
      error: errorMessage,
    };
  }
}
