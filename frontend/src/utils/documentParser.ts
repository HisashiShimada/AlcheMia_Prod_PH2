/**
 * Document Parser - MaiMLからDocument情報を抽出
 * 
 * @version 1.0.0
 * @date 2025-12-23
 */

/**
 * Document情報の型定義
 */
export interface DocumentData {
  id: string;
  name: string;
  uuid: string;
  description: string;
  date: string;
  protocolId: string;
  methodId: string;
  pnmlId: string;
  programId: string;
  creators: CreatorData[];
  vendors: VendorData[];
  owners: OwnerData[];
  instruments: InstrumentData[];
}

/**
 * Creator情報の型定義
 */
export interface CreatorData {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
  vendorRef?: {
    id: string;
    ref: string;
  };
  instrumentRef?: {
    id: string;
    ref: string;
  };
}

/**
 * Vendor情報の型定義
 */
export interface VendorData {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
}

/**
 * Owner情報の型定義
 */
export interface OwnerData {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
}

/**
 * Instrument情報の型定義
 */
export interface InstrumentData {
  id: string;
  name: string;
  uuid: string;
  description: string;
  annotation: string;
}

/**
 * XMLテキストから特定のタグの内容を抽出
 * @param xml - XML文字列
 * @param tagName - タグ名
 * @param parentContent - 親要素の内容（オプション）
 * @returns タグの内容
 */
function extractTagContent(xml: string, tagName: string, parentContent: string | null = null): string | null {
  const content = parentContent || xml;
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * XMLテキストから特定のタグの属性を抽出
 * @param xml - XML文字列
 * @param tagName - タグ名
 * @param attrName - 属性名
 * @param parentContent - 親要素の内容（オプション）
 * @returns 属性値
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
 * @param xml - XML文字列
 * @param tagName - タグ名
 * @param parentContent - 親要素の内容
 * @returns 属性のオブジェクト
 */
function extractSelfClosingTagAttributes(
  xml: string,
  tagName: string,
  parentContent: string
): { id?: string; ref?: string } | null {
  const regex = new RegExp(`<${tagName}([^>]*)\\/?>`, 'i');
  const match = parentContent.match(regex);
  if (!match) return null;

  const attrString = match[1];
  const attributes: { id?: string; ref?: string } = {};

  // id属性
  const idMatch = attrString.match(/id="([^"]*)"/);
  if (idMatch) attributes.id = idMatch[1];

  // ref属性
  const refMatch = attrString.match(/ref="([^"]*)"/);
  if (refMatch) attributes.ref = refMatch[1];

  return Object.keys(attributes).length > 0 ? attributes : null;
}

/**
 * Document要素の内容を抽出
 * @param documentContent - Document要素の内容
 * @returns Document情報
 */
function parseDocumentElement(documentContent: string): Omit<DocumentData, 'protocolId' | 'methodId' | 'pnmlId' | 'programId'> {
  // 基本情報
  const id = extractTagAttribute(documentContent, 'document', 'id', documentContent) || 'documentID';
  const name = extractTagContent(documentContent, 'name', documentContent) || 'document';
  const uuid = extractTagContent(documentContent, 'uuid', documentContent) || '';
  const description = extractTagContent(documentContent, 'description', documentContent) || '';
  const date = extractTagContent(documentContent, 'date', documentContent) || new Date().toISOString();

  const documentData = {
    id,
    name,
    uuid,
    description,
    date,
    creators: [] as CreatorData[],
    vendors: [] as VendorData[],
    owners: [] as OwnerData[],
    instruments: [] as InstrumentData[],
  };

  // Creator - 複数対応
  const creatorMatches = documentContent.matchAll(/<creator\s+([^>]*)>([\s\S]*?)<\/creator>/gi);
  for (const match of creatorMatches) {
    const creatorAttrString = match[1];
    const creatorContent = match[2];
    const creatorIdMatch = creatorAttrString.match(/id="([^"]*)"/);
    const creatorId = creatorIdMatch ? creatorIdMatch[1] : `Creator${documentData.creators.length + 1}`;

    const creator: CreatorData = {
      id: creatorId,
      name: extractTagContent(creatorContent, 'name', creatorContent) || '',
      uuid: extractTagContent(creatorContent, 'uuid', creatorContent) || '',
      description: extractTagContent(creatorContent, 'description', creatorContent) || '',
      annotation: extractTagContent(creatorContent, 'annotation', creatorContent) || '',
    };

    // vendorRef
    const vendorRef = extractSelfClosingTagAttributes(creatorContent, 'vendorRef', creatorContent);
    if (vendorRef && (vendorRef.id || vendorRef.ref)) {
      creator.vendorRef = {
        id: String(vendorRef.id || ''),
        ref: String(vendorRef.ref || ''),
      };
    }

    // instrumentRef
    const instrumentRef = extractSelfClosingTagAttributes(creatorContent, 'instrumentRef', creatorContent);
    if (instrumentRef && (instrumentRef.id || instrumentRef.ref)) {
      creator.instrumentRef = {
        id: String(instrumentRef.id || ''),
        ref: String(instrumentRef.ref || ''),
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

    documentData.vendors.push({
      id: vendorId,
      name: extractTagContent(vendorContent, 'name', vendorContent) || '',
      uuid: extractTagContent(vendorContent, 'uuid', vendorContent) || '',
      description: extractTagContent(vendorContent, 'description', vendorContent) || '',
      annotation: extractTagContent(vendorContent, 'annotation', vendorContent) || '',
    });
  }

  // Owner - 複数対応
  const ownerMatches = documentContent.matchAll(/<owner\s+([^>]*)>([\s\S]*?)<\/owner>/gi);
  for (const match of ownerMatches) {
    const ownerAttrString = match[1];
    const ownerContent = match[2];
    const ownerIdMatch = ownerAttrString.match(/id="([^"]*)"/);
    const ownerId = ownerIdMatch ? ownerIdMatch[1] : `Owner${documentData.owners.length + 1}`;

    documentData.owners.push({
      id: ownerId,
      name: extractTagContent(ownerContent, 'name', ownerContent) || '',
      uuid: extractTagContent(ownerContent, 'uuid', ownerContent) || '',
      description: extractTagContent(ownerContent, 'description', ownerContent) || '',
      annotation: extractTagContent(ownerContent, 'annotation', ownerContent) || '',
    });
  }

  // Instrument - 複数対応（自己閉じタグinstrumentRefを除外）
  const instrumentMatches = documentContent.matchAll(/<instrument\s+([^>]*)>([\s\S]*?)<\/instrument>/gi);
  for (const match of instrumentMatches) {
    const instrumentAttrString = match[1];
    const instrumentContent = match[2];
    const instrumentIdMatch = instrumentAttrString.match(/id="([^"]*)"/);
    const instrumentId = instrumentIdMatch ? instrumentIdMatch[1] : `Instrument${documentData.instruments.length + 1}`;

    documentData.instruments.push({
      id: instrumentId,
      name: extractTagContent(instrumentContent, 'name', instrumentContent) || '',
      uuid: extractTagContent(instrumentContent, 'uuid', instrumentContent) || '',
      description: extractTagContent(instrumentContent, 'description', instrumentContent) || '',
      annotation: extractTagContent(instrumentContent, 'annotation', instrumentContent) || '',
    });
  }

  return documentData;
}

/**
 * MaiMLからDocument情報を抽出
 * @param maimlData - MaiML XML文字列
 * @returns Document情報、存在しない場合はnull
 */
export function extractDocumentFromMaiML(maimlData: string): DocumentData | null {
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
      contentLength: documentContent.length,
    });

    // Document情報をパース
    const documentData = parseDocumentElement(documentContent);

    // Protocol, Method, PNML, ProgramのID属性を抽出
    const protocolId = extractTagAttribute(maimlData, 'protocol', 'id') || 'protocolID';
    const methodId = extractTagAttribute(maimlData, 'method', 'id') || 'methodID';
    const pnmlId = extractTagAttribute(maimlData, 'pnml', 'id') || 'pnmlID';
    const programId = extractTagAttribute(maimlData, 'program', 'id') || 'programID';

    // ID属性を追加
    const fullDocumentData: DocumentData = {
      ...documentData,
      protocolId,
      methodId,
      pnmlId,
      programId,
    };

    console.log('✅ [documentParser] Document情報抽出完了:', {
      id: fullDocumentData.id,
      name: fullDocumentData.name,
      protocolId: fullDocumentData.protocolId,
      methodId: fullDocumentData.methodId,
      pnmlId: fullDocumentData.pnmlId,
      programId: fullDocumentData.programId,
      creatorsCount: fullDocumentData.creators.length,
      vendorsCount: fullDocumentData.vendors.length,
      ownersCount: fullDocumentData.owners.length,
      instrumentsCount: fullDocumentData.instruments.length,
    });

    // デバッグ: 複数要素の詳細を確認
    console.log('🔍 [documentParser] Creators:', fullDocumentData.creators);
    console.log('🔍 [documentParser] Vendors:', fullDocumentData.vendors);
    console.log('🔍 [documentParser] Owners:', fullDocumentData.owners);
    console.log('🔍 [documentParser] Instruments:', fullDocumentData.instruments);

    return fullDocumentData;
  } catch (error) {
    console.error('❌ [documentParser] Document抽出エラー:', error);
    return null;
  }
}

/**
 * Document情報の存在チェック
 * @param maimlData - MaiML XML文字列
 * @returns Document要素が存在するか
 */
export function hasDocumentInMaiML(maimlData: string): boolean {
  if (!maimlData) return false;
  return /<document[^>]*>/.test(maimlData);
}
