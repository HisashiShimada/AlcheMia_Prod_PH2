/**
 * xml-js Library Type Definitions
 * 
 * xml-jsライブラリの出力形式に対応する型定義
 * 
 * @module xml-js-types
 * @version 1.0.0
 * @date 2026-02-02
 */

/**
 * xml-jsの要素属性
 */
export interface XmlJsAttributes {
  [key: string]: string | undefined;
}

/**
 * xml-jsの基本要素
 */
export interface XmlJsElement {
  /** 要素の属性（_attributes形式） */
  _attributes?: XmlJsAttributes;
  /** テキストコンテンツ（_text形式） */
  _text?: string;
  /** 子要素や他のプロパティ */
  [key: string]: XmlJsElement | XmlJsElement[] | XmlJsAttributes | string | undefined;
}

/**
 * xml-jsのテキスト要素
 */
export interface XmlJsTextElement extends XmlJsElement {
  _text?: string;
}

/**
 * xml-jsの配列または単一要素
 */
export type XmlJsArrayOrSingle<T> = T | T[] | undefined;

/**
 * MAIMLルート要素（xml-js形式）
 */
export interface XmlJsMaimlRoot {
  maiml?: XmlJsMaiml;
  [key: string]: XmlJsElement | undefined;
}

/**
 * MAIML要素（xml-js形式）
 */
export interface XmlJsMaiml extends XmlJsElement {
  _attributes?: XmlJsAttributes & {
    xmlns?: string;
    'xmlns:concept'?: string;
    'xmlns:lifecycle'?: string;
    'xmlns:time'?: string;
    'xmlns:xsd'?: string;
    'xmlns:xsi'?: string;
    features?: string;
    version?: string;
  };
  document?: XmlJsElement;
  protocol?: XmlJsElement;
  data?: XmlJsElement;
  eventLog?: XmlJsElement;
}

/**
 * Property要素（xml-js形式）
 */
export interface XmlJsProperty extends XmlJsElement {
  _attributes?: XmlJsAttributes & {
    key?: string;
    'xsi:type'?: string;
    units?: string;
    formatString?: string;
    scaleFactor?: string;
  };
  description?: XmlJsElement;
  value?: XmlJsElement;
  property?: XmlJsArrayOrSingle<XmlJsProperty>;
}

/**
 * Template要素（xml-js形式）
 */
export interface XmlJsTemplate extends XmlJsElement {
  _attributes?: XmlJsAttributes & {
    id?: string;
  };
  uuid?: XmlJsElement;
  name?: XmlJsElement;
  description?: XmlJsElement;
  placeRef?: XmlJsArrayOrSingle<XmlJsElement>;
  templateRef?: XmlJsArrayOrSingle<XmlJsElement>;
  property?: XmlJsArrayOrSingle<XmlJsProperty>;
}

/**
 * Method要素（xml-js形式）
 */
export interface XmlJsMethod extends XmlJsElement {
  _attributes?: XmlJsAttributes & {
    id?: string;
  };
  uuid?: XmlJsElement;
  name?: XmlJsElement;
  description?: XmlJsElement;
  pnml?: XmlJsArrayOrSingle<XmlJsElement>;
  program?: XmlJsArrayOrSingle<XmlJsElement>;
  materialTemplate?: XmlJsArrayOrSingle<XmlJsTemplate>;
  conditionTemplate?: XmlJsArrayOrSingle<XmlJsTemplate>;
  resultTemplate?: XmlJsArrayOrSingle<XmlJsTemplate>;
}

/**
 * 型ガード: XmlJsElementかどうかを判定
 */
export function isXmlJsElement(value: unknown): value is XmlJsElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * 型ガード: XmlJsTextElementかどうかを判定
 */
export function isXmlJsTextElement(value: unknown): value is XmlJsTextElement {
  return (
    isXmlJsElement(value) &&
    typeof (value as XmlJsTextElement)._text === 'string'
  );
}

/**
 * ヘルパー: 配列正規化
 */
export function normalizeXmlJsArray<T>(value: XmlJsArrayOrSingle<T>): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * ヘルパー: テキスト抽出
 */
export function extractText(element: XmlJsElement | undefined): string | undefined {
  if (!element) return undefined;
  const textElement = element as XmlJsTextElement;
  return textElement._text;
}

/**
 * ヘルパー: 属性取得
 */
export function getAttribute(element: XmlJsElement | undefined, key: string): string | undefined {
  if (!element || !element._attributes) return undefined;
  return element._attributes[key];
}