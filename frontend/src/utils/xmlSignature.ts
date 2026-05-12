/**
 * xmlSignature.ts - XML署名ユーティリティ
 * 
 * W3C XMLDSig仕様に基づくXML署名機能を提供
 * - SHA-256ハッシュ計算
 * - Base64エンコード
 * - Signature要素生成
 * 
 * @version 1.0.0
 * @date 2025-11-25
 */

/**
 * 署名結果
 */
export interface SignResult {
  signedXml: string;
  digestValue: string;
}

/**
 * 検証結果
 */
export interface VerifyResult {
  valid: boolean;
  expectedDigest?: string;
  actualDigest?: string;
  error?: string;
}

/**
 * 署名情報
 */
export interface SignatureInfo {
  algorithm: string;
  encoding: string;
  digestValue: string;
  digestLength: number;
  timestamp: string;
}

/**
 * SHA-256ハッシュを計算してBase64エンコード
 */
export async function calculateSHA256Hash(xmlContent: string): Promise<string> {
  try {
    // TextEncoderでUTF-8バイト列に変換
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlContent);
    
    // Web Crypto APIでSHA-256ハッシュ計算
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // ArrayBufferをUint8Arrayに変換
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Base64エンコード
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    
    return hashBase64;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ SHA-256ハッシュ計算エラー:', error);
    throw new Error(`ハッシュ計算に失敗しました: ${errorMessage}`);
  }
}

/**
 * XML Signature要素を生成
 */
export function generateSignatureElement(digestValue: string): string {
  return `  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments"/>
      <SignatureMethod Algorithm="http://www.w3.org/2009/xmldsig11#dsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${digestValue}</DigestValue>
      </Reference>
    </SignedInfo>
  </Signature>`;
}

/**
 * MaiML XMLにSignature要素を挿入
 */
export function insertSignatureIntoMaiML(maimlXml: string, signatureElement: string): string {
  // <document>タグを探して、その直後にSignature要素を挿入
  const documentOpenTagRegex = /(<document[^>]*>)/;
  const match = maimlXml.match(documentOpenTagRegex);
  
  if (!match) {
    throw new Error('MaiML内に<document>要素が見つかりません');
  }
  
  // <document>タグの直後に改行とSignature要素を挿入
  return maimlXml.replace(documentOpenTagRegex, `$1\n${signatureElement}`);
}

/**
 * MaiML XMLからSignature要素を除去
 */
export function removeSignatureFromMaiML(maimlXml: string): string {
  // <Signature>...</Signature>を除去（改行も含む）
  const signatureRegex = /\s*<Signature[^>]*>[\s\S]*?<\/Signature>\s*/;
  return maimlXml.replace(signatureRegex, '');
}

/**
 * MaiML XMLに署名を追加
 */
export async function signMaiMLXml(maimlXml: string): Promise<SignResult> {
  try {
    // 1. Signature要素を除去（念のため）
    const xmlWithoutSignature = removeSignatureFromMaiML(maimlXml);
    
    // 2. SHA-256ハッシュを計算
    const digestValue = await calculateSHA256Hash(xmlWithoutSignature);
    
    // 3. Signature要素を生成
    const signatureElement = generateSignatureElement(digestValue);
    
    // 4. MaiMLにSignature要素を挿入
    const signedXml = insertSignatureIntoMaiML(xmlWithoutSignature, signatureElement);
    
    return {
      signedXml,
      digestValue
    };
  } catch (error) {
    console.error('❌ XML署名エラー:', error);
    throw error;
  }
}

/**
 * MaiML XMLの署名を検証
 */
export async function verifyMaiMLSignature(signedMaimlXml: string): Promise<VerifyResult> {
  try {
    // 1. Signature要素から<DigestValue>を抽出
    const digestValueRegex = /<DigestValue>([^<]+)<\/DigestValue>/;
    const match = signedMaimlXml.match(digestValueRegex);
    
    if (!match) {
      return {
        valid: false,
        error: 'DigestValue要素が見つかりません'
      };
    }
    
    const expectedDigest = match[1];
    
    // 2. Signature要素を除去
    const xmlWithoutSignature = removeSignatureFromMaiML(signedMaimlXml);
    
    // 3. ハッシュを再計算
    const actualDigest = await calculateSHA256Hash(xmlWithoutSignature);
    
    // 4. 比較
    const valid = expectedDigest === actualDigest;
    
    return {
      valid,
      expectedDigest,
      actualDigest
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ XML署名検証エラー:', error);
    return {
      valid: false,
      error: errorMessage
    };
  }
}

/**
 * 署名情報のフォーマット
 */
export function formatSignatureInfo(digestValue: string): SignatureInfo {
  return {
    algorithm: 'SHA-256',
    encoding: 'Base64',
    digestValue: digestValue,
    digestLength: digestValue.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * 署名有効性チェック
 */
export function isValidDigestValue(digestValue: string | null | undefined): boolean {
  if (!digestValue) return false;
  
  // Base64形式チェック（44文字、最後に=が付くこともある）
  const base64Regex = /^[A-Za-z0-9+/]{43}=?$/;
  return base64Regex.test(digestValue);
}

export default {
  calculateSHA256Hash,
  generateSignatureElement,
  insertSignatureIntoMaiML,
  removeSignatureFromMaiML,
  signMaiMLXml,
  verifyMaiMLSignature,
  formatSignatureInfo,
  isValidDigestValue
};