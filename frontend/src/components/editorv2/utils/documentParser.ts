/**
 * Document Parser - MaiMLからDocument情報を抽出
 * 
 * @version 1.0.0
 * @date 2025-10-31
 */

import type { 
  DocumentData, 
  Creator, 
  Vendor, 
  Owner, 
  Instrument,
  RefObject 
} from '../types';

/**
 * XMLテキストから特定のタグの内容を抽出
 */
function extractTagContent(
  xml: string, 
  tagName: string, 
  parentContent: string | null = null
): string | null {
  const content = parentContent || xml;
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * XMLテキストから特定のタグの属性を抽出
 */
function extractTagAttribute(
  xml: string, 
  tagName: string, 
  attrName: string, 
  parentContent: string | null = null
): string | null {
  const content = parentContent || xml;
  const regex = new RegExp(`<${tagName}[^>]*${attrName}="([^"]*)"`, 'i');
  const match = content.match(regex);
  return match ? match[1] : null;
}

/**
 * 自己閉じタグの属性を抽出
 */
function extractSelfClosingTagAttributes(
  xml: string, 
  tagName: string, 
  parentContent: string
): RefObject | null {
  const regex = new RegExp(`<${tagName}([^>]*)\\/?>`, 'i');
  const match = parentContent.match(regex);
  if (!match) return null;
  
  const attrString = match[1];
  const attributes: Partial<RefObject> = {};
  
  // id属性
  const idMatch = attrString.match(/id="([^"]*)"/);
  if (idMatch) attributes.id = idMatch[1];
  
  // ref属性
  const refMatch = attrString.match(/ref="([^"]*)"/);
  if (refMatch) attributes.ref = refMatch[1];
  
  return Object.keys(attributes).length > 0 ? attributes as RefObject : null;
}

/**
 * Document要素の内容を抽出
 */
function parseDocumentElement(documentContent: string): DocumentData {
  // 基本情報
  const id = extractTagAttribute(documentContent, 'document', 'id', documentContent) || 'documentID';
  const name = extractTagContent(documentContent, 'name', documentContent) || 'document';
  const uuid = extractTagContent(documentContent, 'uuid', documentContent) || '';
  const description = extractTagContent(documentContent, 'description', documentContent) || '';
  const date = extractTagContent(documentContent, 'date', documentContent) || new Date().toISOString();
  
  const documentData: DocumentData = {
    id,
    name,
    uuid,
    description,
    date,
    creators: [],
    vendors: [],
    owners: [],
    instruments: [],
    protocolId: '',
    methodId: '',
    pnmlId: '',
    programId: ''
  };
  
  // Creator - 複数対応
  const creatorMatches = documentContent.matchAll(/<creator\s+([^>]*)>([\s\S]*?)<\/creator>/gi);
  for (const match of creatorMatches) {
    const creatorAttrString = match[1];
    const creatorContent = match[2];
    const creatorIdMatch = creatorAttrString.match(/id="([^"]*)"/);
    const creatorId = creatorIdMatch ? creatorIdMatch[1] : `Creator${documentData.creators.length + 1}`;
    
    const creator: Creator = {
      id: creatorId,
      name: extractTagContent(creatorContent, 'name', creatorContent) || '',
      uuid: extractTagContent(creatorContent, 'uuid', creatorContent) || '',
      description: extractTagContent(creatorContent, 'description', creatorContent) || '',
      annotation: extractTagContent(creatorContent, 'annotation', creatorContent) || ''
    };
    
    // vendorRef
    const vendorRef = extractSelfClosingTagAttributes(creatorContent, 'vendorRef', creatorContent);
    if (vendorRef && (vendorRef.id || vendorRef.ref)) {
      creator.vendorRef = {
        id: String(vendorRef.id || ''),
        ref: String(vendorRef.ref || '')
      };
    }
    
    // instrumentRef
    const instrumentRef = extractSelfClosingTagAttributes(creatorContent, 'instrumentRef', creatorContent);
    if (instrumentRef && (instrumentRef.id || instrumentRef.ref)) {
      creator.instrumentRef = {
        id: String(instrumentRef.id || ''),
        ref: String(instrumentRef.ref || '')
      };
    }
    
    documentData.creators.push(creator);
  }
  
  // Vendor - 複数対応（自己閉じタグvendorRefを除外）
  const vendorMatches = documentContent.matchAll(/<vendor\s+([^>]*)>([\s\S]*?)<\/vendor>/gi);
  for (const match of vendorMatches) {
    const vendorAttrString = match[1];
    const vendorContent = match[2];
    const vendorIdMatch = vendorAttrString.match(/id="([^"]*)"/);
    const vendorId = vendorIdMatch ? vendorIdMatch[1] : `Vendor${documentData.vendors.length + 1}`;
    
    const vendor: Vendor = {
      id: vendorId,
      name: extractTagContent(vendorContent, 'name', vendorContent) || '',
      uuid: extractTagContent(vendorContent, 'uuid', vendorContent) || '',
      description: extractTagContent(vendorContent, 'description', vendorContent) || '',
      annotation: extractTagContent(vendorContent, 'annotation', vendorContent) || ''
    };
    
    documentData.vendors.push(vendor);
  }
  
  // Owner - 複数対応
  const ownerMatches = documentContent.matchAll(/<owner\s+([^>]*)>([\s\S]*?)<\/owner>/gi);
  for (const match of ownerMatches) {
    const ownerAttrString = match[1];
    const ownerContent = match[2];
    const ownerIdMatch = ownerAttrString.match(/id="([^"]*)"/);
    const ownerId = ownerIdMatch ? ownerIdMatch[1] : `Owner${documentData.owners.length + 1}`;
    
    const owner: Owner = {
      id: ownerId,
      name: extractTagContent(ownerContent, 'name', ownerContent) || '',
      uuid: extractTagContent(ownerContent, 'uuid', ownerContent) || '',
      description: extractTagContent(ownerContent, 'description', ownerContent) || '',
      annotation: extractTagContent(ownerContent, 'annotation', ownerContent) || ''
    };
    
    documentData.owners.push(owner);
  }
  
  // Instrument - 複数対応（自己閉じタグinstrumentRefを除外）
  const instrumentMatches = documentContent.matchAll(/<instrument\s+([^>]*)>([\s\S]*?)<\/instrument>/gi);
  for (const match of instrumentMatches) {
    const instrumentAttrString = match[1];
    const instrumentContent = match[2];
    const instrumentIdMatch = instrumentAttrString.match(/id="([^"]*)"/);
    const instrumentId = instrumentIdMatch ? instrumentIdMatch[1] : `Instrument${documentData.instruments.length + 1}`;
    
    const instrument: Instrument = {
      id: instrumentId,
      name: extractTagContent(instrumentContent, 'name', instrumentContent) || '',
      uuid: extractTagContent(instrumentContent, 'uuid', instrumentContent) || '',
      description: extractTagContent(instrumentContent, 'description', instrumentContent) || '',
      annotation: extractTagContent(instrumentContent, 'annotation', instrumentContent) || ''
    };
    
    documentData.instruments.push(instrument);
  }
  
  return documentData;
}

/**
 * MaiMLからDocument情報を抽出
 */
export function extractDocumentFromMaiML(maimlData: string | null | undefined): DocumentData | null {
  if (!maimlData) {
    return null;
  }
  
  try {
    // Document要素を抽出
    const documentContent = extractTagContent(maimlData, 'document');
    
    if (!documentContent) {
      console.log('📄 [documentParser] Document要素が見つかりません');
      return null;
    }
    
    console.log('📄 [documentParser] Document要素を検出:', {
      contentLength: documentContent.length
    });
    
    // Document情報をパース
    const documentData = parseDocumentElement(documentContent);
    
    // Protocol, Method, PNML, ProgramのID属性を抽出
    const protocolId = extractTagAttribute(maimlData, 'protocol', 'id') || 'protocolID';
    const methodId = extractTagAttribute(maimlData, 'method', 'id') || 'methodID';
    const pnmlId = extractTagAttribute(maimlData, 'pnml', 'id') || 'pnmlID';
    const programId = extractTagAttribute(maimlData, 'program', 'id') || 'programID';
    
    // ID属性を追加
    documentData.protocolId = protocolId;
    documentData.methodId = methodId;
    documentData.pnmlId = pnmlId;
    documentData.programId = programId;
    
    console.log('✅ [documentParser] Document情報抽出完了:', {
      id: documentData.id,
      name: documentData.name,
      protocolId: documentData.protocolId,
      methodId: documentData.methodId,
      pnmlId: documentData.pnmlId,
      programId: documentData.programId,
      creatorsCount: documentData.creators.length,
      vendorsCount: documentData.vendors.length,
      ownersCount: documentData.owners.length,
      instrumentsCount: documentData.instruments.length
    });
    
    // デバッグ: 複数要素の詳細を確認
    console.log('🔍 [documentParser] Creators:', documentData.creators);
    console.log('🔍 [documentParser] Vendors:', documentData.vendors);
    console.log('🔍 [documentParser] Owners:', documentData.owners);
    console.log('🔍 [documentParser] Instruments:', documentData.instruments);
    
    return documentData;
  } catch (error) {
    console.error('❌ [documentParser] Document抽出エラー:', error);
    return null;
  }
}

/**
 * Document情報の存在チェック
 */
export function hasDocumentInMaiML(maimlData: string | null | undefined): boolean {
  if (!maimlData) return false;
  return /<document[^>]*>/.test(maimlData);
}