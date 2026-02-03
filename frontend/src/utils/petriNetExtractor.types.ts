/**
 * petriNetExtractor.ts 専用の型定義ファイル
 * 
 * XSD準拠型（maiml-unified.ts）を基底として、
 * petriNetExtractor特有の拡張型を定義します。
 */

import type {
  Property,
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Place,
  Transition,
  Arc,
} from '@/types/maiml-unified';

// =========================================
// 拡張型定義（XSD型に存在しない情報）
// =========================================

/**
 * XSD型の拡張: Place型にpnmlIdを追加
 * 
 * 拡張理由: 複数PNMLを扱う際にどのPNMLに属するかを識別するため
 * XSDには定義されていないが、エディタ上で必要な情報
 */
export interface PlaceWithPnmlId extends Omit<Place, 'data'> {
  data: Place['data'] & {
    pnmlId?: string | null;
  };
}

/**
 * XSD型の拡張: Transition型にpnmlIdとhasInstructionを追加
 * 
 * 拡張理由:
 * - pnmlId: 複数PNMLを扱う際の識別用
 * - hasInstruction: UIでインストラクション有無を判定するため
 * XSDには定義されていないが、エディタ上で必要な情報
 */
export interface TransitionWithPnmlId extends Omit<Transition, 'data'> {
  data: Transition['data'] & {
    pnmlId?: string | null;
    hasInstruction?: boolean;
  };
}

/**
 * XSD型の拡張: Arc型にpnmlIdを追加
 * 
 * 拡張理由: 複数PNMLを扱う際にどのPNMLに属するかを識別するため
 */
export interface ArcWithPnmlId extends Arc {
  pnmlId?: string | null;
}

// =========================================
// ヘルパー関数の型定義
// =========================================

/**
 * Insertion情報を格納する型
 * 
 * テンプレートのinsertion要素から抽出される情報
 */
export interface InsertionData {
  targetNode: string;
  targetAttribute: string;
  templateId: string;
}

/**
 * extractInsertionFromProperties関数の戻り値型
 */
export interface ExtractInsertionResult {
  insertion: InsertionData | null;
  properties: Property[];
}

/**
 * ネストされたプロパティノードの型
 * 
 * Property配列をツリー構造に変換する際に使用
 */
export interface NestedPropertyNode {
  id: string;
  name: string;
  value?: string;
  children?: NestedPropertyNode[];
  path: string[];
}

// =========================================
// テンプレートマップの型定義
// =========================================

/**
 * テンプレート情報を格納する型（拡張版）
 * 
 * XSD型のテンプレートにinsertion情報を追加
 */
export interface TemplateMapEntry {
  type: 'material' | 'condition' | 'result';
  template: MaterialTemplate | ConditionTemplate | ResultTemplate;
  insertion: InsertionData | null;
}

/**
 * テンプレートマップの型
 * 
 * key: テンプレートID
 * value: テンプレート情報
 */
export type TemplateMap = Record<string, TemplateMapEntry>;

// =========================================
// extractPetriNetStructure関数の戻り値型
// =========================================

/**
 * Petri Net構造の抽出結果
 */
export interface ExtractedPetriNetStructure {
  places: PlaceWithPnmlId[];
  transitions: TransitionWithPnmlId[];
  arcs: ArcWithPnmlId[];
  templateMap: TemplateMap;
}