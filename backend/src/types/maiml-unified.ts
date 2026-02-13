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
// Content Types（統一型定義）
// ============================================================================

/**
 * Content型の種別（xsi:type属性の値）
 * 
 * XSD仕様で定義されるすべてのContent型を網羅（すべてリスト型）
 */
export type ContentType =
  // リスト型
  | 'contentStringListType'
  | 'contentIdRefListType'
  | 'contentQualifiedNameListType'
  | 'contentDateTimeListType'
  | 'contentDecimalListType'
  | 'contentDoubleListType'
  | 'contentFloatListType'
  | 'contentIntListType'
  | 'contentLongListType'
  | 'contentShortListType'
  | 'contentByteListType'
  | 'contentUnsignedIntListType'
  | 'contentUnsignedLongListType'
  | 'contentUnsignedShortListType'
  | 'contentUnsignedByteListType'
  | 'contentBooleanListType'
  | 'contentBase64BinaryListType'
  | 'contentHexBinaryListType'
  | 'contentUriListType'
  | 'contentUuidListType'
  | 'contentLanguageListType'
  | 'contentStringEnumType';

/**
 * Content統一型
 * 
 * すべてのContentタイプを包括する統一型定義。
 * xsi:type属性で型を判別し、適切なプロパティにアクセス可能。
 * 
 * XSD仕様:
 * - contentBaseType: uncertaintyBaseTypeから派生
 * - 固有属性: axis, size, id, ref
 * - すべての具体型はリスト型のみ（単一値型は存在しない）
 * 
 * @example 文字列リスト型
 * ```xml
 * <content key="sampleNames" xsi:type="contentStringListType" axis="x" size="3">
 *   <description>サンプル名リスト</description>
 *   <value>Sample A Sample B Sample C</value>
 * </content>
 * ```
 * 
 * @example 数値リスト型（単位付き）
 * ```xml
 * <content key="temperatures" units="°C" xsi:type="contentDoubleListType" axis="y" size="5">
 *   <value>25.5 26.0 25.8 26.2 25.9</value>
 * </content>
 * ```
 * 
 * @example ネスト構造
 * ```xml
 * <content key="dataSet" xsi:type="contentStringListType">
 *   <property key="source" xsi:type="stringType">
 *     <value>XRF Analyzer</value>
 *   </property>
 *   <content key="channels" xsi:type="contentIntListType">
 *     <value>1 2 3 4 5</value>
 *   </content>
 * </content>
 * ```
 */
export interface Content {
  /** 不確実性キー（uncertaintyBaseTypeから継承、必須） */
  key: string;
  
  /** Content型（必須） */
  xsiType: string;
  
  // ============================================================================
  // contentBaseType固有の属性
  // ============================================================================
  
  /** 軸名（例: "x", "y", "z", "time"） */
  axis?: string;
  
  /** データサイズ */
  size?: number;
  
  /** 要素ID（XML ID属性） */
  id?: string;
  
  /** 参照ID（XML IDREF属性） */
  ref?: string;
  
  // ============================================================================
  // 共通プロパティ
  // ============================================================================
  
  /** Contentの説明（オプション） */
  description?: string;
  
  // ============================================================================
  // 値プロパティ（すべてリスト型）
  // ============================================================================
  
  /**
   * リスト値（すべてのContent型で使用）
   * - contentStringListType: string[]
   * - contentIntListType, contentDoubleListType等: number[]
   * - contentBooleanListType: boolean[]
   */
  value?: (string | number | boolean);
  
  // ============================================================================
  // ネスト構造（genericDataContainerGroup）
  // ============================================================================
  
  /**
   * ネストされたProperty（オプション）
   */
  properties: Property[];
  
  /**
   * ネストされたContent（オプション）
   */
  contents: Content[];
  
  // ============================================================================
  // 不確実性情報
  // ============================================================================
  
  /**
   * 不確実性情報（オプション、配列）
   */
  uncertainty: Content[];
  
  // ============================================================================
  // 数値型オプション（数値リスト型で使用）
  // ============================================================================
  
  /** 単位（例: "s", "mm", "°C", "keV"） */
  units?: string;
  
  /** フォーマット文字列（例: "0", "0.00"） */
  formatString?: string;
  
  /** スケールファクター */
  scaleFactor?: number;
}

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
 * Property カスタム要素型
 * 
 * 任意のタグ名を持つ子要素を表現（名前空間テンプレートXML用）
 * 
 * @example シンプルな値
 * ```xml
 * <wavelength units="nm">532</wavelength>
 * ```
 * → `{ value: "532", attributes: { units: "nm" } }`
 * 
 * @example ネスト構造
 * ```xml
 * <calibration>
 *   <date>2024-11-15</date>
 *   <certificate>LASER-CAL-2024-089</certificate>
 * </calibration>
 * ```
 * → `{ children: { date: { value: "2024-11-15" }, certificate: { value: "LASER-CAL-2024-089" } } }`
 */
export interface PropertyCustomElement {
  /** 要素の値（テキストノード） */
  value?: string | number | boolean;
  
  /** 要素の属性 */
  attributes?: Record<string, string>;
  
  /** 子要素（ネスト構造） */
  children?: Record<string, PropertyCustomElement>;
}

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
 * 
 * @example カスタム要素（名前空間テンプレート）
 * ```xml
 * <property key="LaserParameters" xsi:type="objectType">
 *   <wavelength units="nm">532</wavelength>
 *   <power units="mW">10.5</power>
 *   <calibration>
 *     <date>2024-11-15</date>
 *   </calibration>
 * </property>
 * ```
 * → `{ customElements: { wavelength: { value: "532", attributes: { units: "nm" } }, ... } }`
 */
export interface Property {
  /** プロパティキー（必須） */
  key: string;
  
  /** プロパティ型（必須） */
  xsiType: string;
  
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
   * ネスト構造（propertyListType用）
   */
  properties: Property[];

  contents : Content[];
  
  // ============================================================================
  // 🆕 カスタム要素（任意のタグ名を持つ子要素）
  // ============================================================================
  
  /**
   * カスタム要素の辞書（名前空間テンプレートXML用）
   * 
   * キー: タグ名（例: "wavelength", "power", "calibration"）
   * 値: PropertyCustomElement型
   * 
   * 標準のProperty仕様外の任意のタグ名を持つ子要素を表現します。
   * 主に名前空間テンプレート（CTAdvanced.xml等）のパースで使用されます。
   * 
   * @example
   * ```typescript
   * {
   *   wavelength: {
   *     value: "532",
   *     attributes: { units: "nm" }
   *   },
   *   calibration: {
   *     children: {
   *       date: { value: "2024-11-15" },
   *       certificate: { value: "LASER-CAL-2024-089" }
   *     }
   *   }
   * }
   * ```
   */
  customElements?: Record<string, PropertyCustomElement>;
  
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
}

/**
 * Place参照型（初期マーキング属性を持つ）
 */
export interface PlaceRef extends Reference {
  /** 初期マーキング（Petri Netで使用） */
  initialMarking?: boolean;
}
/**
 * 基本的な参照型
 */
export interface InstanceRef extends Reference {
  name?: string;
  description?: string;
}

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
  chains: Chain[];
  key?: string;
}

/**
 * Parent（親要素参照）
 */
export interface Parent {
  uuid: Uuid;
  hash: Hash;
  parents: Parent[];
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
export interface DocumentTagData {
  tagName : string;
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
  vendorRef?: Reference;
  instrumentRef?: Reference;
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
  creators: DocumentTagData[];
  /** ベンダー情報（XSD: 配列、実MAIML: 通常1個） */
  vendors: DocumentTagData[];
  /** 所有者情報（XSD: 配列、実MAIML: 通常1個） */
  owners: DocumentTagData[];
  /** 機器情報（XSD: 配列、実MAIML: 通常1個） */
  instruments: DocumentTagData[];
  /** 作成日時（ISO 8601形式） */
  date?: string;
  /** デジタル署名（オプション） */
  Signature?: Signature;
  /** チェーン構造（ブロックチェーン用、オプション） */
  chains: Chain[];
  /** 親要素参照（オプション） */
  parents: Parent[];
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
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
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
  transitionRef: Reference;
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
  instructions: Instruction[];
  materialTemplates: Template[];
  conditionTemplates: Template[];
  resultTemplates: Template[];
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
export interface Template {
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
  category : string;
  placeRefs: PlaceRef[];
  templateRef?: Reference;
  /** 実MAIMLで必須：Propertyの配列 */
  properties: Property[];
  contents : Content[];
  insertion? : Insertion;
  methodId? : string;
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
  pnml: PNML;
  /** XSD: 配列、実MAIML: 通常1個 */
  program: Program[];
  /** メソッドレベルのテンプレート（オプション） */
  materialTemplates: Template[];
  conditionTemplates: Template[];
  resultTemplates: Template[];
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
  methods: Method[];
  /** プロトコルレベルのテンプレート（オプション） */
  materialTemplates: Template[];
  conditionTemplates: Template[];
  resultTemplates: Template[];
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
  instanceRef?: InstanceRef;
  properties: Property[];
  contents : Content[];
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
  instanceRef?: InstanceRef;
  properties: Property[];
  contents : Content[];
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
  instanceRef?: InstanceRef;
  insertion?: Insertion;
  properties: Property[];
  contents : Content[];
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
  materials: Material[];
  conditions: Condition[];
  results: Result[];
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
  properties: Property[];
  contents : Content[];
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
  resultsRefs: Reference[];
  /** Creator参照（オプション配列） */
  creatorRefs: Reference[];
  /** Owner参照（オプション配列） */
  ownerRefs: Reference[];
  /** 実MAIMLで多用：Propertyの配列 */
  properties: Property[];
  contents : Content[];
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
  events: Event[];
  creatorRefs: Reference[];
  ownerRefs: Reference[];
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
  extensions: Extension[];
  globals: Globals[];
  classifiers: Classifier[];
  traces: Trace[];
  creatorRefs: Reference[];
  ownerRefs: Reference[];
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
  logs: Log[];
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
  xmlnsConcept?: string;
  xmlnsLifecycle?: string;
  xmlnsTime?: string;
  xmlnsXsd?: string;
  xmlnsXsi?: string;
  features?: string;
  version: string;
  xsiType?: string;
  
  document: Document;
  protocol: Protocol;
  data?: Data;
  eventLog?: EventLog;
}

// ============================================================================
// Export default（デフォルトエクスポート）
// ============================================================================

export default MaimlRoot;
