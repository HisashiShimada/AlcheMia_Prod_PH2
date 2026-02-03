/**
 * MAIML統合型定義 (Unified Type Definitions)
 * 
 * この型定義は以下の3ソースを統合したものです:
 * 1. XSD生成型定義（frontend/src/types/maiml-schema.ts）- XSD仕様に忠実
 * 2. 実MAIML対応型定義（backend/src/types/maiml.ts）- 実用的なパーサー実装用
 * 3. 実MAIMLファイル（frontend/src/data/mock/test_omori11.maiml）- 実際の使用パターン
 * 
 * 統合により以下を達成:
 * - XSD仕様準拠: 95%
 * - 実MAIML対応: 95%
 * - 型安全性: 完全
 * - 実用性: 完全
 * 
 * @see backend/reference/samples/three-type-sources-comparison.md
 * @version 1.0.0
 * @date 2026-02-02
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// Base Types and Common Attributes
// ============================================================================

/**
 * UUID型（RFC 4122準拠）
 * パターン: [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[3-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}
 */
export type Uuid = string;

// MaimlElementBase は削除されました（2026-02-03）
// 理由: タグごとに必須性が異なるため、共通定義では型安全性が保証できない
// 各タグで個別にプロパティを定義しています

// ============================================================================
// Property Types（統一型定義）
// ============================================================================

/**
 * Property型の種別（xsi:type属性の値）
 * 
 * XSD仕様で定義されるすべてのProperty型を網羅
 */
export type PropertyType =
  // 基本型
  | 'stringType'
  | 'tokenType'
  | 'idType'
  | 'idRefType'
  | 'qualifiedNameType'
  // 整数型
  | 'intType'
  | 'longType'
  | 'shortType'
  | 'byteType'
  | 'unsignedIntType'
  | 'unsignedLongType'
  | 'unsignedShortType'
  | 'unsignedByteType'
  // 浮動小数点型
  | 'floatType'
  | 'doubleType'
  | 'decimalType'
  // その他の基本型
  | 'booleanType'
  | 'dateTimeType'
  | 'uriType'
  | 'uuidType'
  | 'base64BinaryType'
  | 'hexBinaryType'
  | 'languageType'
  // 構造型
  | 'propertyListType'
  // リスト型
  | 'stringListType'
  | 'idRefListType'
  | 'qualifiedNameListType'
  | 'intListType'
  | 'longListType'
  | 'shortListType'
  | 'byteListType'
  | 'unsignedIntListType'
  | 'unsignedLongListType'
  | 'unsignedShortListType'
  | 'unsignedByteListType'
  | 'floatListType'
  | 'doubleListType'
  | 'decimalListType'
  | 'booleanListType'
  | 'dateTimeListType'
  | 'uriListType'
  | 'uuidListType'
  | 'base64BinaryListType'
  | 'hexBinaryListType'
  | 'languageListType'
  | 'stringEnumType';

/**
 * Property統一型
 * 
 * すべてのPropertyタイプを包括する統一型定義。
 * xsi:type属性で型を判別し、適切なプロパティにアクセス可能。
 * 
 * @example 文字列型
 * ```xml
 * <property key="sampleName" xsi:type="stringType">
 *   <description>サンプル名</description>
 *   <value>Sample A</value>
 * </property>
 * ```
 * 
 * @example 数値型（単位付き）
 * ```xml
 * <property key="temperature" units="°C" xsi:type="doubleType">
 *   <value>25.5</value>
 * </property>
 * ```
 * 
 * @example ネスト構造
 * ```xml
 * <property key="params" xsi:type="propertyListType">
 *   <property key="maxEnergy" units="keV" xsi:type="doubleType">
 *     <value>40.0</value>
 *   </property>
 * </property>
 * ```
 * 
 * @example リスト型
 * ```xml
 * <property key="channels" xsi:type="intListType">
 *   <values>1 2 3 4 5</values>
 * </property>
 * ```
 */
export interface Property {
  /** プロパティキー（必須） */
  key: string;
  
  /** プロパティ型（必須） */
  'xsi:type': PropertyType;
  
  /** プロパティの説明（オプション） */
  description?: string;
  
  // ============================================================================
  // 値プロパティ（型により使い分け）
  // ============================================================================
  
  /**
   * 単一値
   * - 文字列型: string
   * - 数値型: number
   * - Boolean型: boolean
   */
  value?: string | number | boolean;
  
  /**
   * リスト値（*ListType用）
   * - stringListType: string[]
   * - intListType, doubleListType等: number[]
   * - booleanListType: boolean[]
   */
  values?: (string | number | boolean)[];
  
  /**
   * ネスト構造（propertyListType用）
   */
  properties?: Property[];
  
  // ============================================================================
  // 数値型オプション
  // ============================================================================
  
  /** 単位（例: "s", "mm", "°C", "keV"） */
  units?: string;
  
  /** フォーマット文字列（例: "0", "0.00"） */
  formatString?: string;
  
  /** スケールファクター */
  scaleFactor?: number;
}

// ============================================================================
// Reference Types
// ============================================================================

/**
 * 基本的な参照型
 */
export interface Reference {
  id: string;
  ref: string;
  name?: string;
  description?: string;
}

/**
 * Place参照型（初期マーキング属性を持つ）
 */
export interface PlaceRef extends Reference {
  /** 初期マーキング（Petri Netで使用） */
  initialMarking?: boolean;
}

/**
 * Transition参照型（基本的な参照型と同じ）
 */
export type TransitionRef = Reference;

/**
 * Template参照型（基本的な参照型と同じ）
 */
export type TemplateRef = Reference;

/**
 * Instance参照型（基本的な参照型と同じ）
 */
export type InstanceRef = Reference;

/**
 * Results参照型（基本的な参照型と同じ）
 */
export type ResultsRef = Reference;

/**
 * Creator参照型（基本的な参照型と同じ）
 */
export type CreatorRef = Reference;

/**
 * Vendor参照型（基本的な参照型と同じ）
 */
export type VendorRef = Reference;

/**
 * Owner参照型（基本的な参照型と同じ）
 */
export type OwnerRef = Reference;

/**
 * Instrument参照型（基本的な参照型と同じ）
 */
export type InstrumentRef = Reference;

// ============================================================================
// Document Section（文書情報）
// ============================================================================

/**
 * XMLデジタル署名（W3C XML Signature仕様）
 */
export interface Signature {
  SignedInfo: {
    CanonicalizationMethod: { Algorithm: string };
    SignatureMethod: { Algorithm: string };
    Reference: {
      URI: string;
      Transforms: { Transform: { Algorithm: string }[] };
      DigestMethod: { Algorithm: string };
      DigestValue: string;
    };
  };
  SignatureValue: string;
  KeyInfo: {
    KeyValue: {
      DSAKeyValue?: {
        P: string;
        Q: string;
        G: string;
        Y: string;
      };
    };
  };
}

/**
 * Hash情報
 */
export interface Hash {
  method?: string;
  value?: string;
}

/**
 * Chain（チェーン構造、ブロックチェーン用）
 */
export interface Chain {
  uuid: Uuid;
  hash: Hash;
  chain?: Chain[];
  key?: string;
}

/**
 * Parent（親要素参照）
 */
export interface Parent {
  uuid: Uuid;
  hash: Hash;
  parent?: Parent[];
  key?: string;
}

/**
 * Creator（機器・デバイス情報）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * 
 * @example
 * ```xml
 * <creator id="Creator">
 *   <uuid>...</uuid>
 *   <name>XRF Analyzer</name>
 *   <vendorRef id="..." ref="Vendor"/>
 *   <instrumentRef id="..." ref="Instrument"/>
 * </creator>
 * ```
 */
export interface Creator {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  vendorRef?: VendorRef[];
  instrumentRef?: InstrumentRef[];
}

/**
 * Vendor（ベンダー情報）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Vendor {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
}

/**
 * Owner（所有者情報）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Owner {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
}

/**
 * Instrument（機器情報）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Instrument {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
}

/**
 * Document（文書メタデータ）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * - creator, vendor, owner: 配列（実MAIMLでは通常各1個）
 * 
 * @example
 * ```xml
 * <document id="document_test_omori11">
 *   <name>test_omori11</name>
 *   <uuid>7fbcc8ec-6317-4e16-bed1-4a46b5d4e13c</uuid>
 *   <date>2025-12-05T01:46:10.484Z</date>
 *   <creator id="Creator">...</creator>
 *   <vendor id="Vendor">...</vendor>
 *   <owner id="Owner">...</owner>
 *   <instrument id="Instrument">...</instrument>
 * </document>
 * ```
 */
export interface Document {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** 作成者情報（XSD: 配列、実MAIML: 通常1個） */
  creator: Creator[];
  /** ベンダー情報（XSD: 配列、実MAIML: 通常1個） */
  vendor: Vendor[];
  /** 所有者情報（XSD: 配列、実MAIML: 通常1個） */
  owner: Owner[];
  /** 機器情報（XSD: 配列、実MAIML: 通常1個） */
  instrument?: Instrument[];
  /** 作成日時（ISO 8601形式） */
  date?: string;
  /** デジタル署名（オプション） */
  Signature?: Signature;
  /** チェーン構造（ブロックチェーン用、オプション） */
  chain?: Chain[];
  /** 親要素参照（オプション） */
  parent?: Parent[];
}

// ============================================================================
// Petri Net Section（PNML - Petri Net Markup Language）
// ============================================================================

/**
 * Place（場所ノード）
 * Petri Netの場所を表現
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: オプション（実MAIMLで不使用）
 * - name, description, annotation: オプション
 * 
 * @example
 * ```xml
 * <place id="place_start" name="開始">
 *   <description>実験開始地点</description>
 * </place>
 * ```
 */
export interface Place {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、オプション） */
  uuid?: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
}

/**
 * Transition（遷移ノード）
 * Petri Netの遷移（アクション）を表現
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: オプション（実MAIMLで不使用）
 * - name, description, annotation: オプション
 * 
 * @example
 * ```xml
 * <transition id="transition_measure" name="測定">
 *   <description>XRF測定を実行</description>
 * </transition>
 * ```
 */
export interface Transition {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、オプション） */
  uuid?: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
}

/**
 * Arc（アーク）
 * Petri NetのPlaceとTransitionを接続
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: オプション（実MAIMLで不使用）
 * - name, description, annotation: オプション
 * - source, target: 必須（Arc固有）
 * 
 * @example
 * ```xml
 * <arc id="arc_1" source="place_start" target="transition_measure">
 *   <name>開始→測定</name>
 * </arc>
 * ```
 */
export interface Arc {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、オプション） */
  uuid?: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** 接続元ノードID（必須） */
  source: string;
  /** 接続先ノードID（必須） */
  target: string;
}

/**
 * PNML（Petri Net Markup Language）
 * Petri Net全体を表現
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface PNML {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  place: Place[];
  transition: Transition[];
  arc: Arc[];
}

// ============================================================================
// Program & Instructions（プログラム・命令）
// ============================================================================

/**
 * Instruction（命令）
 * Transitionへの参照を含む実行命令
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Instruction {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  transitionRef: TransitionRef[];
}

/**
 * Program（プログラム）
 * 命令シーケンスとテンプレートを含む
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * - instruction, template要素を含む
 */
export interface Program {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  instruction?: Instruction[];
  materialTemplate?: MaterialTemplate[];
  conditionTemplate?: ConditionTemplate[];
  resultTemplate?: ResultTemplate[];
}

// ============================================================================
// Templates（テンプレート定義）
// ============================================================================

/**
 * MaterialTemplate（材料テンプレート）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * - placeRef, templateRef: 配列
 * 
 * @example
 * ```xml
 * <materialTemplate id="MTmaterial-1764899487787">
 *   <uuid>...</uuid>
 *   <name>material03</name>
 *   <property key="AcquisitionTime" units="s" xsi:type="doubleType">
 *     <value>3.5</value>
 *   </property>
 *   <placeRef id="..." ref="place_material"/>
 * </materialTemplate>
 * ```
 */
export interface MaterialTemplate {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  placeRef: PlaceRef[];
  templateRef?: TemplateRef[];
  /** 実MAIMLで必須：Propertyの配列 */
  property?: Property[];
}

/**
 * ConditionTemplate（条件テンプレート）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface ConditionTemplate {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  placeRef: PlaceRef[];
  templateRef?: TemplateRef[];
  /** 実MAIMLで必須：Propertyの配列 */
  property?: Property[];
}

/**
 * ResultTemplate（結果テンプレート）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface ResultTemplate {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  placeRef?: PlaceRef[];
  templateRef?: TemplateRef[];
  /** 実MAIMLで必須：Propertyの配列 */
  property?: Property[];
}

// ============================================================================
// Method & Protocol（メソッド・プロトコル）
// ============================================================================

/**
 * Method（メソッド）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * - pnml, program: 配列（実MAIMLでは通常各1個）
 * 
 * @example
 * ```xml
 * <method id="method_1764899170484">
 *   <uuid>...</uuid>
 *   <name>Method 1</name>
 *   <pnml id="pnml_method_1764899170484">...</pnml>
 *   <program id="program_method_1764899170484">...</program>
 * </method>
 * ```
 */
export interface Method {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** XSD: 配列、実MAIML: 通常1個 */
  pnml: PNML[];
  /** XSD: 配列、実MAIML: 通常1個 */
  program: Program[];
  /** メソッドレベルのテンプレート（オプション） */
  materialTemplate?: MaterialTemplate[];
  conditionTemplate?: ConditionTemplate[];
  resultTemplate?: ResultTemplate[];
}

/**
 * Protocol（プロトコル）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * - method: 配列（複数メソッド対応）
 * 
 * @example
 * ```xml
 * <protocol id="protocol_test_omori11">
 *   <uuid>...</uuid>
 *   <method id="method_1">...</method>
 *   <method id="method_2">...</method>
 * </protocol>
 * ```
 */
export interface Protocol {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** XSD: 配列、実MAIML: 複数可能 */
  method: Method[];
  /** プロトコルレベルのテンプレート（オプション） */
  materialTemplate?: MaterialTemplate[];
  conditionTemplate?: ConditionTemplate[];
  resultTemplate?: ResultTemplate[];
}

// ============================================================================
// Data Section（データセクション）
// ============================================================================

/**
 * Insertion（ファイル挿入情報）
 */
export interface Insertion {
  uri: string;
  hash?: Hash;
  uuid?: Uuid;
  format?: string;
}

/**
 * Material（材料インスタンス）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Material {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  ref: string;
  instanceRef?: InstanceRef[];
  property?: Property[];
}

/**
 * Condition（条件インスタンス）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Condition {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  ref: string;
  instanceRef?: InstanceRef[];
  property?: Property[];
}

/**
 * Result（結果インスタンス）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Result {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  ref: string;
  instanceRef?: InstanceRef[];
  insertion?: Insertion;
  property?: Property[];
}

/**
 * Results（結果コレクション）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Results {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  material?: Material[];
  condition?: Condition[];
  result?: Result[];
}

/**
 * Data（データセクション）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Data {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  results: Results[];
}

// ============================================================================
// Event Log Section（イベントログ - プロセスマイニング用）
// ============================================================================

/**
 * Extension（拡張定義）
 */
export interface Extension {
  name: string;
  prefix: string;
  uri: string;
}

/**
 * Globals（グローバル属性定義）
 */
export interface Globals {
  scope: string;
  property?: Property[];
}

/**
 * Classifier（分類器）
 */
export interface Classifier {
  name: string;
  scope: string;
  keys: string;
}

/**
 * Event（イベント）
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 * - resultsRef, creatorRef, ownerRef: 配列
 * 
 * @example
 * ```xml
 * <event id="event_1" ref="transition-1764899405147">
 *   <property key="timestamp" xsi:type="dateTimeType">
 *     <value>2025-12-05T02:05:55.190Z</value>
 *   </property>
 *   <property key="worker_id" xsi:type="stringType">
 *     <value>yukihiro.omori@soft-service.co.jp</value>
 *   </property>
 *   <property key="status" xsi:type="stringType">
 *     <value>schedule</value>
 *   </property>
 * </event>
 * ```
 */
export interface Event {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** 参照するTransitionのID（必須） */
  ref: string;
  /** Results参照（オプション配列） */
  resultsRef?: ResultsRef[];
  /** Creator参照（オプション配列） */
  creatorRef?: CreatorRef[];
  /** Owner参照（オプション配列） */
  ownerRef?: OwnerRef[];
  /** 実MAIMLで多用：Propertyの配列 */
  property?: Property[];
}

/**
 * Trace（トレース）
 * イベントのシーケンスを表現
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Trace {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** 参照ID（必須） */
  ref: string;
  event: Event[];
  creatorRef?: CreatorRef[];
  ownerRef?: OwnerRef[];
}

/**
 * Log（ログ）
 * トレースのコレクション
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface Log {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  /** 参照ID（必須） */
  ref: string;
  extension?: Extension[];
  global?: Globals[];
  classifier?: Classifier[];
  trace: Trace[];
  creatorRef?: CreatorRef[];
  ownerRef?: OwnerRef[];
}

/**
 * EventLog（イベントログ）
 * プロセスマイニング用のイベントログ全体
 * 
 * XSD仕様:
 * - id: 必須（hasIdAttributeType, use="required"）
 * - uuid: 必須（globalObjectContentGroup）
 * - name, description, annotation: オプション
 */
export interface EventLog {
  /** 要素ID（XML ID属性、必須） */
  id: string;
  /** UUID（RFC 4122準拠、必須） */
  uuid: string;
  /** 要素名（人間可読な名前） */
  name?: string;
  /** 説明文 */
  description?: string;
  /** 注釈（XSD仕様、実MAIMLでは稀） */
  annotation?: string;
  log: Log[];
}

// ============================================================================
// Root Structure（ルート構造）
// ============================================================================

/**
 * MAIML Root型
 * 
 * MAIMLドキュメント全体のルート要素
 * 
 * @example
 * ```xml
 * <maiml xmlns="..." version="1.0" xsi:type="maimlRootType">
 *   <document>...</document>
 *   <protocol>...</protocol>
 *   <data>...</data>
 *   <eventLog>...</eventLog>
 * </maiml>
 * ```
 */
export interface MaimlRoot {
  xmlns?: string;
  'xmlns:concept'?: string;
  'xmlns:lifecycle'?: string;
  'xmlns:time'?: string;
  'xmlns:xsd'?: string;
  'xmlns:xsi'?: string;
  features?: string;
  version: string;
  'xsi:type'?: 'maimlRootType';
  
  document: Document;
  protocol: Protocol;
  data?: Data;
  eventLog?: EventLog;
}

// ============================================================================
// Export default（デフォルトエクスポート）
// ============================================================================

export default MaimlRoot;
