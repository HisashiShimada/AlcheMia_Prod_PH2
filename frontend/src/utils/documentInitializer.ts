/**
 * Document初期化ユーティリティ
 * 
 * DocumentDataの初期値生成に関する共通関数を提供
 * 
 * @module documentInitializer
 */

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type { User } from '@/types/auth';
import type { DocumentTagData } from '@/types/maiml-unified';

/**
 * ログインユーザー情報を取得
 * @returns ログインユーザー情報（取得できない場合はnull）
 */
export const getLoginUserInfo = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
      console.warn('⚠️ [documentInitializer] userInfoがlocalStorageに存在しません');
      return null;
    }
    
    const userInfo: User = JSON.parse(userInfoStr);
    
    // 必須フィールドの検証
    if (!userInfo.id || !userInfo.username) {
      console.warn('⚠️ [documentInitializer] userInfoに必須フィールドが不足しています', userInfo);
      return null;
    }
    
    return userInfo;
  } catch (error) {
    console.error('❌ [documentInitializer] userInfoのパースエラー:', error);
    return null;
  }
};

/**
 * メールアドレスベースのUUID v5を生成
 * @param email メールアドレス
 * @returns UUID v5（メールアドレスが無効な場合はUUID v4）
 */
export const generateOwnerUUID = (email?: string): string => {
  if (!email || !email.includes('@')) {
    // メールアドレスが無効な場合はUUID v4で代用
    console.warn('⚠️ [documentInitializer] メールアドレスが無効なため、UUID v4を生成します');
    return uuidv4();
  }
  
  // UUID v5 DNS namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
  const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  return uuidv5(email, DNS_NAMESPACE);
};

/**
 * ログインユーザー情報からOwner初期値を生成
 * @returns Owner用DocumentTagData配列（ログインユーザー情報が取得できない場合は空配列）
 */
export const generateInitialOwner = (): DocumentTagData[] => {
  const userInfo = getLoginUserInfo();
  
  if (!userInfo) {
    console.warn('⚠️ [documentInitializer] ログインユーザー情報が取得できないため、Owner初期値を設定しません');
    return [];
  }
  
  const ownerUuid = generateOwnerUUID(userInfo.email);
  
  const owner: DocumentTagData = {
    tagName: 'Owner',
    id: userInfo.id,
    uuid: ownerUuid,
    name: userInfo.username,
    description: '',
    annotation: '',
  };
  
  console.log('✅ [documentInitializer] Owner初期値を生成しました', {
    id: owner.id,
    name: owner.name,
    uuid: owner.uuid,
    email: userInfo.email,
  });
  
  return [owner];
};

/**
 * DocumentData初期値を生成
 * @param editingFileName 編集中のファイル名（オプション）
 * @param options 追加オプション（新規作成時のみ適用、S3から既存MAIMLを読み込んだ場合はMAIML内の値が優先される）
 * @param options.documentId DocumentData.id の初期値（省略時は `document_${Date.now()}` が自動生成される）
 * @param options.description DocumentData.description の初期値
 * @returns DocumentData初期値
 */
export const generateInitialDocumentData = (
  editingFileName?: string,
  options?: {
    /** DocumentData.id の初期値 */
    documentId?: string;
    /** DocumentData.description の初期値 */
    description?: string;
  }
) => {
  const baseFileName = editingFileName ? editingFileName.replace('.maiml', '') : '';
  const uuidFull = uuidv4();
  const uuidPrefix = uuidFull.substring(0, 8);
  
  // 日付フォーマット生成
  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD形式
  
  const documentData = {
    id: options?.documentId || `document_${Date.now()}`,
    uuid: uuidFull,
    name: baseFileName || 'document',
    description: options?.description || '',
    date: formattedDate,
    // XSD準拠プロパティ（配列、必須）
    creators: [],
    vendors: [],
    owners: generateInitialOwner(),
    instruments: [],
    // エディター用拡張プロパティ
    protocolId: `protocol_${baseFileName}_${uuidPrefix}`,
    methodId: `method_${baseFileName}_${uuidPrefix}`,
    pnmlId: `pnml_${baseFileName}_${uuidPrefix}`,
    programId: `program_${baseFileName}_${uuidPrefix}`,
    chains: [],
    parents: []
  };
  
  console.log('📄 [documentInitializer] DocumentData初期化（ID自動生成）:', {
    documentId: documentData.id,
    protocolId: documentData.protocolId,
    methodId: documentData.methodId,
    pnmlId: documentData.pnmlId,
    programId: documentData.programId,
    name: documentData.name,
    ownersCount: documentData.owners.length
  });
  
  return { documentData };
};

/**
 * MethodData初期値を生成
 * @param methodId メソッドID
 * @returns MethodData初期値
 */
export const generateInitialMethod = (methodId: string) => {
  const initialMethod = {
    methodId: methodId,
    methodIndex: 0,
    name: 'Method 1',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  };
  
  console.log('📋 [documentInitializer] Method初期化:', {
    methodId: initialMethod.methodId
  });
  
  return initialMethod;
};
