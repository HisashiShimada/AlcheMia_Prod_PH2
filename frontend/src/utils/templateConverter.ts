/**
 * templateConverter - Template変換ユーティリティ
 * 
 * TemplateEditorDialogから分離
 * Property/Content変換、XML解析、UIヘルパー関数を提供
 * 
 * @version 1.0.0
 * @date 2026-02-13
 */

import React from 'react';
import { Property, Content, PropertyCustomElement } from '@/types/maiml-unified';
import { xml2js, ElementCompact } from 'xml-js';
import type { PropertyData } from '@/types/editor';
import type { FormatTemplateFile } from '@/types/format';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';

// ===== Property変換系 =====

/**
 * MaiMLParser形式からNestedPropertyEditor形式への変換（配列版）
 * Property配列をRecord<string, PropertyData>に変換
 * 
 * @param propertiesArray - Property配列（maiml-unified.tsのProperty型）
 * @returns Record<string, PropertyData> - NestedPropertyEditor用の形式
 */
export function convertPropertiesArrayToNestedFormat(propertiesArray: Property[]): Record<string, PropertyData> {
  const result: Record<string, PropertyData> = {};
  
  propertiesArray.forEach((item) => {
    const prop = item;
    const key = (prop.key as string) || `prop_${Date.now()}`;
    
    const attributes: Record<string, string> = {};

    // ✅ Bug Fix: prop.attributes（マスタ属性等のカスタム属性）を先にコピー
    if (prop.attributes && typeof prop.attributes === 'object') {
      Object.entries(prop.attributes).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          attributes[k] = String(v);
        }
      });
    }

    // 個別フィールドは上書き優先（空でない場合のみセット）
    if (prop.xsiType) {
      attributes['xsi:type'] = prop.xsiType as string;
    }
    if (prop.units !== undefined && prop.units !== '') {
      attributes.units = prop.units as string;
    }
    if (prop.formatString !== undefined && prop.formatString !== '') {
      attributes.formatString = prop.formatString as string;
    }
    if (prop.scaleFactor !== undefined) {
      attributes.scaleFactor = String(prop.scaleFactor);
    }
    
    result[key] = {
      key: key,
      tagName: 'property',
      attributes: attributes,
      elements: {},
      children: []
    };
    
    if (prop.value !== undefined && prop.value !== null && prop.value !== '') {
      result[key].elements.value = String(prop.value);
    }
    
    if (prop.description !== undefined && prop.description !== null && prop.description !== '') {
      result[key].elements.description = String(prop.description);
    }
    
    // customElementsの変換（PropertyCustomElement → elements）
    if (prop.customElements && typeof prop.customElements === 'object') {
      Object.entries(prop.customElements).forEach(([elemName, elemValue]) => {
        // PropertyCustomElementは複雑な構造を持つ可能性があるため、
        // valueプロパティがあればそれを使用、なければ全体をJSON文字列化
        if (elemValue && typeof elemValue === 'object' && 'value' in elemValue) {
          result[key].elements[elemName] = String(elemValue.value);
        } else if (elemValue !== undefined && elemValue !== null) {
          result[key].elements[elemName] = String(elemValue);
        }
      });
    }
    
    // 子要素の変換（properties, contentsの順）
    const childrenData: PropertyData[] = [];
    
    // 子プロパティの変換
    if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(prop.properties));
    }
    
    // 子コンテンツの変換
    if (prop.contents && Array.isArray(prop.contents) && prop.contents.length > 0) {
      childrenData.push(...convertContentsArrayToNestedFormatRecursive(prop.contents));
    }
    
    // 子要素がある場合は設定
    if (childrenData.length > 0) {
      result[key].children = childrenData;
      // 子要素がある場合、xsi:typeが未設定ならpropertyListTypeに設定
      if (!result[key].attributes['xsi:type']) {
        result[key].attributes['xsi:type'] = 'propertyListType';
      }
    }
  });
  
  return result;
}

/**
 * 再帰的な子プロパティ変換
 * Property配列をPropertyData配列に変換（ネスト構造対応）
 * 
 * @param propertiesArray - Property配列
 * @returns PropertyData[] - 変換されたPropertyData配列
 */
export function convertPropertiesArrayToNestedFormatRecursive(propertiesArray: Property[]): PropertyData[] {
  if (!Array.isArray(propertiesArray)) return [];
  
  return propertiesArray.map((item) => {
    const prop = item;
    const convertedAttrs: Record<string, string> = {};

    // ✅ Bug Fix: prop.attributes（マスタ属性等のカスタム属性）を先にコピー
    if (prop.attributes && typeof prop.attributes === 'object') {
      Object.entries(prop.attributes).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          convertedAttrs[k] = String(v);
        }
      });
    }

    // 個別フィールドは上書き優先（空でない場合のみセット）
    if (prop.xsiType) {
      convertedAttrs['xsi:type'] = prop.xsiType as string;
    }
    if (prop.units) convertedAttrs.units = prop.units as string;
    if (prop.formatString) convertedAttrs.formatString = prop.formatString as string;
    if (prop.scaleFactor) convertedAttrs.scaleFactor = String(prop.scaleFactor);

    const converted: PropertyData = {
      key: (prop.key as string) || `child_${Date.now()}`,
      tagName: 'property',
      attributes: convertedAttrs,
      elements: {},
      children: []
    };
    
    if (prop.value !== undefined && prop.value !== '') {
      converted.elements.value = String(prop.value);
    }
    
    if (prop.description !== undefined && prop.description !== '') {
      converted.elements.description = String(prop.description);
    }
    
    // customElementsの変換（PropertyCustomElement → elements）
    if (prop.customElements && typeof prop.customElements === 'object') {
      Object.entries(prop.customElements).forEach(([elemName, elemValue]) => {
        // PropertyCustomElementは複雑な構造を持つ可能性があるため、
        // valueプロパティがあればそれを使用、なければ全体をJSON文字列化
        if (elemValue && typeof elemValue === 'object' && 'value' in elemValue) {
          converted.elements[elemName] = String(elemValue.value);
        } else if (elemValue !== undefined && elemValue !== null) {
          converted.elements[elemName] = String(elemValue);
        }
      });
    }
    
    // 子要素の変換（properties, contentsの順）
    const childrenData: PropertyData[] = [];
    
    // 子プロパティの再帰的変換
    if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(prop.properties));
    }
    
    // 子コンテンツの再帰的変換
    if (prop.contents && Array.isArray(prop.contents) && prop.contents.length > 0) {
      childrenData.push(...convertContentsArrayToNestedFormatRecursive(prop.contents));
    }
    
    // 子要素がある場合は設定
    if (childrenData.length > 0) {
      converted.children = childrenData;
      if (!converted.attributes['xsi:type']) {
        converted.attributes['xsi:type'] = 'propertyListType';
      }
    }
    
    return converted;
  });
}

/**
 * PropertyData形式からProperty配列への逆変換
 * NestedPropertyEditor形式 → maiml-unified.ts Property型配列
 * 
 * @param propertyDataRecord - PropertyDataのRecord
 * @returns Property[] - 変換されたProperty配列
 */
export function convertPropertyDataToPropertiesArray(propertyDataRecord: Record<string, PropertyData>): Property[] {
  const result: Property[] = [];
  
  Object.values(propertyDataRecord).forEach((propData) => {
    // tagNameがpropertyのもののみを変換
    if (propData.tagName !== 'property') {
      return;
    }
    
    const property: Property = {
      key: propData.key,
      // xsi:type が未設定の場合は空文字（強制的に stringType を設定しない）
      // 空文字の場合、MAIMLパーサー側で xsi:type 属性を出力しない
      xsiType: propData.attributes?.['xsi:type'] || '',
      properties: [],
      contents: [],
    };
    
    // 属性の変換
    if (propData.attributes?.units) {
      property.units = propData.attributes.units;
    }
    if (propData.attributes?.formatString) {
      property.formatString = propData.attributes.formatString;
    }
    if (propData.attributes?.scaleFactor) {
      property.scaleFactor = parseFloat(propData.attributes.scaleFactor);
    }
    if (propData.attributes?.key) {
      property.key = propData.attributes.key;
    }
    
    // ✅ 新規: id、ref、カスタム属性を property.attributes にコピー
    if (propData.attributes) {
      const customAttrs: Record<string, string> = {};
      Object.entries(propData.attributes).forEach(([key, value]) => {
        // xsi:type、units、formatString、scaleFactor、keyは既に個別フィールドに変換済みなので除外
        if (key !== 'xsi:type' && key !== 'units' && key !== 'formatString' && 
            key !== 'scaleFactor' && key !== 'key') {
          customAttrs[key] = value;
        }
      });
      
      if (Object.keys(customAttrs).length > 0) {
        property.attributes = customAttrs;
      }
    }
    
    // 要素の変換
    if (propData.elements?.value) {
      property.value = propData.elements.value;
    }
    if (propData.elements?.description) {
      property.description = propData.elements.description;
    }
    
    // customElementsの変換（elements内の他の要素）
    if (propData.elements) {
      const customElements: Record<string, PropertyCustomElement> = {};
      Object.entries(propData.elements).forEach(([key, value]) => {
        // value, description以外をcustomElementsに格納
        if (key !== 'value' && key !== 'description') {
          customElements[key] = { value };
        }
      });
      
      if (Object.keys(customElements).length > 0) {
        property.customElements = customElements;
      }
    }
    
    // 子要素の再帰的変換
    if (propData.children && Array.isArray(propData.children) && propData.children.length > 0) {
      const { properties, contents } = convertPropertyDataChildrenToArrays(propData.children);
      property.properties = properties;
      property.contents = contents;
    }
    
    result.push(property);
  });
  
  return result;
}

/**
 * PropertyDataの子要素配列をProperty配列とContent配列に分離
 * 
 * @param children - PropertyData配列
 * @returns { properties: Property[], contents: Content[] }
 */
export function convertPropertyDataChildrenToArrays(
  children: PropertyData[]
): { properties: Property[]; contents: Content[] } {
  const properties: Property[] = [];
  const contents: Content[] = [];
  
  children.forEach((child) => {
    if (child.tagName === 'property') {
      const property: Property = {
        key: child.key,
        // xsi:type が未設定の場合は空文字（強制的に stringType を設定しない）
        xsiType: child.attributes?.['xsi:type'] || '',
        properties: [],
        contents: [],
      };
      
      // 属性の変換
      if (child.attributes?.units) property.units = child.attributes.units;
      if (child.attributes?.formatString) property.formatString = child.attributes.formatString;
      if (child.attributes?.scaleFactor) property.scaleFactor = parseFloat(child.attributes.scaleFactor);
      
      // ✅ 新規: id、ref、カスタム属性を property.attributes にコピー
      if (child.attributes) {
        const customAttrs: Record<string, string> = {};
        Object.entries(child.attributes).forEach(([key, value]) => {
          if (key !== 'xsi:type' && key !== 'units' && key !== 'formatString' && 
              key !== 'scaleFactor' && key !== 'key') {
            customAttrs[key] = value;
          }
        });
        
        if (Object.keys(customAttrs).length > 0) {
          property.attributes = customAttrs;
        }
      }
      
      // 要素の変換
      if (child.elements?.value) property.value = child.elements.value;
      if (child.elements?.description) property.description = child.elements.description;
      
      // customElements
      if (child.elements) {
        const customElements: Record<string, PropertyCustomElement> = {};
        Object.entries(child.elements).forEach(([key, value]) => {
          if (key !== 'value' && key !== 'description') {
            customElements[key] = { value };
          }
        });
        if (Object.keys(customElements).length > 0) {
          property.customElements = customElements;
        }
      }
      
      // 子要素の再帰的変換
      if (child.children && child.children.length > 0) {
        const childArrays = convertPropertyDataChildrenToArrays(child.children);
        property.properties = childArrays.properties;
        property.contents = childArrays.contents;
      }
      
      properties.push(property);
      
    } else if (child.tagName === 'content') {
      const content: Content = {
        key: child.key,
        // xsi:type が未設定の場合は空文字（強制的に stringType を設定しない）
        xsiType: child.attributes?.['xsi:type'] || '',
        properties: [],
        contents: [],
        uncertainty: [],
      };
      
      // Content固有の属性
      if (child.attributes?.axis) content.axis = child.attributes.axis;
      if (child.attributes?.size) content.size = parseInt(child.attributes.size);
      if (child.attributes?.id) content.id = child.attributes.id;
      if (child.attributes?.ref) content.ref = child.attributes.ref;
      
      // 数値型オプション
      if (child.attributes?.units) content.units = child.attributes.units;
      if (child.attributes?.formatString) content.formatString = child.attributes.formatString;
      if (child.attributes?.scaleFactor) content.scaleFactor = parseFloat(child.attributes.scaleFactor);
      
      // 要素の変換
      if (child.elements?.value) content.value = child.elements.value;
      if (child.elements?.description) content.description = child.elements.description;
      
      // 子要素の再帰的変換
      if (child.children && child.children.length > 0) {
        const childArrays = convertPropertyDataChildrenToArrays(child.children);
        content.properties = childArrays.properties;
        content.contents = childArrays.contents;
      }
      
      contents.push(content);
    }
  });
  
  return { properties, contents };
}

// ===== Content変換系 =====

/**
 * Content配列からNestedPropertyEditor形式への変換
 * Content型（maiml-unified.ts）を使用してRecord<string, PropertyData>に変換
 * 
 * @param contentsArray - Content配列（maiml-unified.tsのContent型）
 * @returns Record<string, PropertyData> - NestedPropertyEditor用の形式
 */
export function convertContentsArrayToNestedFormat(contentsArray: Content[]): Record<string, PropertyData> {
  const result: Record<string, PropertyData> = {};
  
  if (!Array.isArray(contentsArray)) return result;
  
  contentsArray.forEach((content) => {
    // keyがない場合はユニークなキーを生成
    const key = content.key || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 属性の構築
    const attributes: Record<string, string> = {};
    
    // xsi:type（必須）
    if (content.xsiType) {
      attributes['xsi:type'] = content.xsiType;
    }
    
    // Content固有の属性
    if (content.axis !== undefined && content.axis !== '') {
      attributes.axis = content.axis;
    }
    if (content.size !== undefined) {
      attributes.size = String(content.size);
    }
    if (content.id !== undefined && content.id !== '') {
      attributes.id = content.id;
    }
    if (content.ref !== undefined && content.ref !== '') {
      attributes.ref = content.ref;
    }
    
    // 数値型オプション
    if (content.units !== undefined && content.units !== '') {
      attributes.units = content.units;
    }
    if (content.formatString !== undefined && content.formatString !== '') {
      attributes.formatString = content.formatString;
    }
    if (content.scaleFactor !== undefined) {
      attributes.scaleFactor = String(content.scaleFactor);
    }
    
    // PropertyDataオブジェクトの構築
    result[key] = {
      key: key,
      tagName: 'content',
      attributes: attributes,
      elements: {},
      children: []
    };
    
    // value要素の追加
    if (content.value !== undefined && content.value !== null && content.value !== '') {
      result[key].elements.value = String(content.value);
    }
    
    // description要素の追加
    if (content.description !== undefined && content.description !== null && content.description !== '') {
      result[key].elements.description = String(content.description);
    }
    
    // 子要素の変換（properties, contents, uncertaintyの順）
    const childrenData: PropertyData[] = [];
    
    // 子プロパティの変換
    if (content.properties && Array.isArray(content.properties) && content.properties.length > 0) {
      childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(content.properties));
    }
    
    // 子コンテンツの再帰的変換
    if (content.contents && Array.isArray(content.contents) && content.contents.length > 0) {
      childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.contents));
    }
    
    // uncertainty（不確実性情報）の変換
    if (content.uncertainty && Array.isArray(content.uncertainty) && content.uncertainty.length > 0) {
      childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.uncertainty));
    }
    
    // 子要素がある場合は設定
    if (childrenData.length > 0) {
      result[key].children = childrenData;
      // 子要素がある場合、xsi:typeが未設定ならpropertyListTypeに設定
      if (!result[key].attributes['xsi:type']) {
        result[key].attributes['xsi:type'] = 'propertyListType';
      }
    }
  });
  
  return result;
}

/**
 * 再帰的な子Content変換
 * Content配列をPropertyData配列に変換（ネスト構造対応）
 * 
 * @param contentsArray - Content配列
 * @returns PropertyData[] - 変換されたPropertyData配列
 */
export function convertContentsArrayToNestedFormatRecursive(contentsArray: Content[]): PropertyData[] {
  if (!Array.isArray(contentsArray)) return [];
  
  return contentsArray.map((content) => {
    const key = content.key || `content_child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 属性の構築
    const attributes: Record<string, string> = {};
    
    if (content.xsiType) {
      attributes['xsi:type'] = content.xsiType;
    }
    if (content.axis) attributes.axis = content.axis;
    if (content.size !== undefined) attributes.size = String(content.size);
    if (content.id) attributes.id = content.id;
    if (content.ref) attributes.ref = content.ref;
    if (content.units) attributes.units = content.units;
    if (content.formatString) attributes.formatString = content.formatString;
    if (content.scaleFactor !== undefined) attributes.scaleFactor = String(content.scaleFactor);
    
    const converted: PropertyData = {
      key: key,
      tagName: 'content',
      attributes: attributes,
      elements: {},
      children: []
    };
    
    // value要素
    if (content.value !== undefined && content.value !== '') {
      converted.elements.value = String(content.value);
    }
    
    // description要素
    if (content.description !== undefined && content.description !== '') {
      converted.elements.description = String(content.description);
    }
    
    // 子要素の変換
    const childrenData: PropertyData[] = [];
    
    if (content.properties && Array.isArray(content.properties) && content.properties.length > 0) {
      childrenData.push(...convertPropertiesArrayToNestedFormatRecursive(content.properties));
    }
    
    if (content.contents && Array.isArray(content.contents) && content.contents.length > 0) {
      childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.contents));
    }
    
    if (content.uncertainty && Array.isArray(content.uncertainty) && content.uncertainty.length > 0) {
      childrenData.push(...convertContentsArrayToNestedFormatRecursive(content.uncertainty));
    }
    
    if (childrenData.length > 0) {
      converted.children = childrenData;
      if (!converted.attributes['xsi:type']) {
        converted.attributes['xsi:type'] = 'propertyListType';
      }
    }
    
    return converted;
  });
}

/**
 * PropertyData形式からContent配列への逆変換
 * NestedPropertyEditor形式 → maiml-unified.ts Content型配列
 * 
 * @param propertyDataRecord - PropertyDataのRecord
 * @returns Content[] - 変換されたContent配列
 */
export function convertPropertyDataToContentsArray(propertyDataRecord: Record<string, PropertyData>): Content[] {
  const result: Content[] = [];
  
  Object.values(propertyDataRecord).forEach((propData) => {
    // tagNameがcontentのもののみを変換
    if (propData.tagName !== 'content') {
      return;
    }
    
    const content: Content = {
      key: propData.key,
      // xsi:type が未設定の場合は空文字（強制的に stringType を設定しない）
      xsiType: propData.attributes?.['xsi:type'] || '',
      properties: [],
      contents: [],
      uncertainty: [],
    };
    
    // Content固有の属性
    if (propData.attributes?.axis) {
      content.axis = propData.attributes.axis;
    }
    if (propData.attributes?.size) {
      content.size = parseInt(propData.attributes.size);
    }
    if (propData.attributes?.id) {
      content.id = propData.attributes.id;
    }
    if (propData.attributes?.ref) {
      content.ref = propData.attributes.ref;
    }
    
    // 数値型オプション
    if (propData.attributes?.units) {
      content.units = propData.attributes.units;
    }
    if (propData.attributes?.formatString) {
      content.formatString = propData.attributes.formatString;
    }
    if (propData.attributes?.scaleFactor) {
      content.scaleFactor = parseFloat(propData.attributes.scaleFactor);
    }
    
    // 要素の変換
    if (propData.elements?.value) {
      content.value = propData.elements.value;
    }
    if (propData.elements?.description) {
      content.description = propData.elements.description;
    }
    
    // 子要素の再帰的変換
    if (propData.children && Array.isArray(propData.children) && propData.children.length > 0) {
      const { properties, contents } = convertPropertyDataChildrenToArrays(propData.children);
      content.properties = properties;
      content.contents = contents;
      // uncertainty は contents と同じ型なので、同様に処理可能
    }
    
    result.push(content);
  });
  
  return result;
}

// ===== XML解析系 =====

/**
 * XMLファイルから名前空間定義を解析
 * 
 * @param xmlContent - XMLコンテンツ文字列
 * @returns Record<string, PropertyData> - 解析されたプロパティ
 */
export function parseNamespacesFromXml(xmlContent: string): Record<string, PropertyData> {
  try {
    const result = xml2js(xmlContent, { compact: true }) as ElementCompact;
    
    // ルート要素を特定（MaterialTemplate, ConditionTemplate, ResultTemplate）
    const rootKey = Object.keys(result).find(key => 
      key.includes('Template') || key === 'maiml:MaterialTemplate' || 
      key === 'maiml:ConditionTemplate' || key === 'maiml:ResultTemplate'
    );

    if (!rootKey || !result[rootKey]) {
      throw new Error('テンプレートルート要素が見つかりません');
    }

    const templateRoot = result[rootKey] as ElementCompact;
    const propertiesElement = templateRoot['properties'];

    if (!propertiesElement) {
      return {};
    }

    // property要素を抽出
    const propertyElements = propertiesElement['property'];
    if (!propertyElements) {
      return {};
    }

    // 配列化
    const propertyArray = Array.isArray(propertyElements) ? propertyElements : [propertyElements];

    // PropertyData形式に変換
    const parsedProperties: Record<string, PropertyData> = {};

    propertyArray.forEach((prop: ElementCompact) => {
      const attributes = (prop['_attributes'] || {}) as Record<string, string>;
      const key = attributes['key'] || `property_${Date.now()}`;

      const propertyData: PropertyData = {
        key,
        tagName: 'property',
        attributes: { ...attributes },
        elements: {},
        children: []
      };

      // value要素を抽出
      if (prop['value'] && prop['value']['_text']) {
        propertyData.elements.value = String(prop['value']['_text']);
      }

      // description要素を抽出
      if (prop['description'] && prop['description']['_text']) {
        propertyData.elements.description = String(prop['description']['_text']);
      }

      // 子property要素を再帰的に解析
      if (prop['property']) {
        propertyData.children = parseChildPropertiesFromXml(prop['property']);
      }

      parsedProperties[key] = propertyData;
    });

    return parsedProperties;
  } catch (error) {
    console.error('XML解析エラー:', error);
    throw error;
  }
}

/**
 * 子property要素を再帰的に解析
 * 
 * @param propertyElements - property要素（単一またはCompact）
 * @returns PropertyData[] - 解析された子プロパティ配列
 */
export function parseChildPropertiesFromXml(propertyElements: ElementCompact | ElementCompact[]): PropertyData[] {
  const propertyArray = Array.isArray(propertyElements) ? propertyElements : [propertyElements];

  return propertyArray.map((prop: ElementCompact) => {
    const attributes = (prop['_attributes'] || {}) as Record<string, string>;
    const key = attributes['key'] || `child_${Date.now()}`;

    const propertyData: PropertyData = {
      key,
      tagName: 'property',
      attributes: { ...attributes },
      elements: {},
      children: []
    };

    // value要素を抽出
    if (prop['value'] && prop['value']['_text']) {
      propertyData.elements.value = String(prop['value']['_text']);
    }

    // description要素を抽出
    if (prop['description'] && prop['description']['_text']) {
      propertyData.elements.description = String(prop['description']['_text']);
    }

    // 子property要素を再帰的に解析
    if (prop['property']) {
      propertyData.children = parseChildPropertiesFromXml(prop['property']);
    }

    return propertyData;
  });
}

// ===== UI支援系 =====

/**
 * TreeNode型定義（TreeSelect用）
 */
export interface TreeNode {
  title: string;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
  icon?: React.ReactElement;
}

/**
 * フォルダツリー構築
 * テンプレートファイル一覧からTreeSelect用のツリー構造を構築
 * 
 * @param files - TemplateFile配列
 * @returns TreeNode[] - ツリー構造データ
 */
export function buildTreeData(files: FormatTemplateFile[]): TreeNode[] {
  const tree: Record<string, TreeNode> = {};
  
  files.forEach(file => {
    const parts = file.key.split('/');
    let currentPath = '';
    
    parts.forEach((part, index) => {
      const previousPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!tree[currentPath]) {
        const isFile = index === parts.length - 1;
        tree[currentPath] = {
          title: isFile ? `${part} (${(file.size / 1024).toFixed(1)}KB)` : part,
          value: currentPath,
          key: currentPath,
          isLeaf: isFile,
          children: [],
          icon: isFile ? React.createElement(FileOutlined) : React.createElement(FolderOutlined)
        };
      }
      
      // 親ノードに子を追加
      if (previousPath && tree[previousPath]) {
        const existingChild = tree[previousPath].children?.find(c => c.key === currentPath);
        if (!existingChild && tree[previousPath].children) {
          tree[previousPath].children.push(tree[currentPath]);
        }
      }
    });
  });
  
  // ルートレベルのノードのみを返す
  const rootNodes = Object.values(tree).filter(node => !node.value.includes('/'));
  return rootNodes;
}
