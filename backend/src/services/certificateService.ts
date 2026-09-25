/**
 * クライアント証明書生成サービス
 * 
 * 組織ごとのクライアント証明書を自動生成し、ファイルサーバに保存する
 * node-forgeを使用した純粋なJavaScript実装（OpenSSL不要）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';
import { getStorageService } from './storageService';
import { logger } from '../utils/logger';

/**
 * 証明書生成結果
 */
export interface CertificateGenerationResult {
  success: boolean;
  p12Buffer?: Buffer;
  errorMessage?: string;
}

/**
 * 環境変数から証明書設定を取得
 */
function getCertificateConfig() {
  // アプリルートを取得:
  //   ローカル (ts-node): backend/src/services → ../.. → backend/
  //   ECS (compiled JS):  /app/dist/services  → ../.. → /app/
  const appRoot = path.resolve(__dirname, '../..');
  
  const caCertPath = process.env.CA_CERT_PATH || 
    path.join(appRoot, 'certs/ca/ca.crt');
  const caKeyPath = process.env.CA_KEY_PATH || 
    path.join(appRoot, 'certs/ca/ca.key');
  const p12Password = process.env.CERT_P12_PASSWORD || 'mmdpf123';
  const validityDays = parseInt(process.env.CERT_VALIDITY_DAYS || '365', 10);

  return {
    caCertPath,
    caKeyPath,
    p12Password,
    validityDays,
  };
}

/**
 * CA証明書ファイルの存在確認
 */
function validateCACertificates(): { valid: boolean; errorMessage?: string } {
  const { caCertPath, caKeyPath } = getCertificateConfig();

  if (!fs.existsSync(caCertPath)) {
    return {
      valid: false,
      errorMessage: `CA証明書ファイルが見つかりません: ${caCertPath}`,
    };
  }

  if (!fs.existsSync(caKeyPath)) {
    return {
      valid: false,
      errorMessage: `CA秘密鍵ファイルが見つかりません: ${caKeyPath}`,
    };
  }

  return { valid: true };
}

/**
 * PEMファイルからCA証明書と秘密鍵を読み込み
 */
function loadCACertificates(): {
  caCert: forge.pki.Certificate;
  caKey: forge.pki.PrivateKey;
} {
  const { caCertPath, caKeyPath } = getCertificateConfig();

  // CA証明書を読み込み
  const caCertPem = fs.readFileSync(caCertPath, 'utf8');
  const caCert = forge.pki.certificateFromPem(caCertPem);

  // CA秘密鍵を読み込み
  const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);

  return { caCert, caKey };
}

/**
 * クライアント証明書を生成（PKCS#12形式）
 * node-forgeを使用した純粋なJavaScript実装
 * 
 * @param organizationId 組織ID（UUIDをCNに使用）
 * @returns 証明書生成結果（.p12のBuffer）
 */
export async function generateClientCertificate(
  organizationId: string
): Promise<CertificateGenerationResult> {
  logger.info(`[certificateService] 証明書生成開始: organizationId=${organizationId}`);

  // CA証明書の存在確認
  const validation = validateCACertificates();
  if (!validation.valid) {
    logger.error(`[certificateService] CA証明書の検証失敗: ${validation.errorMessage}`);
    return {
      success: false,
      errorMessage: validation.errorMessage,
    };
  }

  const { p12Password, validityDays } = getCertificateConfig();

  try {
    // 1. CA証明書と秘密鍵を読み込み
    logger.info(`[certificateService] Step 1: CA証明書を読み込み中...`);
    const { caCert, caKey } = loadCACertificates();

    // 2. クライアント秘密鍵を生成（RSA 2048bit）
    // コールバック形式を使うことで Node.js の crypto.generateKeyPair（libuv スレッドプール）が
    // 使用され、イベントループのブロッキングを回避する
    logger.info(`[certificateService] Step 2: クライアント秘密鍵を生成中...`);
    const keys = await new Promise<forge.pki.rsa.KeyPair>((resolve, reject) => {
      forge.pki.rsa.generateKeyPair(2048, 65537, (err: Error, keypair: forge.pki.rsa.KeyPair) => {
        if (err) {
          reject(err);
        } else {
          resolve(keypair);
        }
      });
    });

    // 3. クライアント証明書を作成
    logger.info(`[certificateService] Step 3: クライアント証明書を作成中...`);
    const cert = forge.pki.createCertificate();
    
    // 公開鍵を設定
    cert.publicKey = keys.publicKey;
    
    // シリアル番号を生成（ランダム）
    cert.serialNumber = generateSerialNumber();
    
    // 有効期間を設定
    const notBefore = new Date();
    const notAfter = new Date();
    notAfter.setDate(notBefore.getDate() + validityDays);
    cert.validity.notBefore = notBefore;
    cert.validity.notAfter = notAfter;

    // Subject（証明書の所有者情報）を設定
    // CA証明書のSubject属性をベースに、CNのみ変更してOID解決エラーを完全回避
    cert.subject.attributes = caCert.subject.attributes.map((attr) => {
      // CNのみ組織IDに変更、他はCA証明書と同じ値を使用
      if (attr.name === 'commonName' || attr.shortName === 'CN') {
        return { ...attr, value: organizationId };
      }
      return { ...attr };
    });

    // Issuer（発行者情報）を設定
    // CA証明書のSubject属性を直接コピー（OID解決エラーを完全回避）
    cert.issuer.attributes = caCert.subject.attributes;

    // 拡張フィールドを設定
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        clientAuth: true,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    // 4. CA秘密鍵で署名
    logger.info(`[certificateService] Step 4: クライアント証明書を署名中...`);
    cert.sign(caKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create());

    // 5. PKCS#12形式に変換
    logger.info(`[certificateService] Step 5: PKCS#12形式に変換中...`);
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
      keys.privateKey as forge.pki.rsa.PrivateKey, // RSA秘密鍵として型キャスト
      [cert, caCert], // クライアント証明書 + CA証明書のチェーン
      p12Password,
      {
        algorithm: '3des', // 暗号化アルゴリズム
      }
    );

    // DER形式にエンコード
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    const p12Buffer = Buffer.from(p12Der, 'binary');

    logger.info(
      `[certificateService] 証明書生成成功: organizationId=${organizationId}, size=${p12Buffer.length}bytes`
    );

    return {
      success: true,
      p12Buffer,
    };
  } catch (error) {
    logger.error(`[certificateService] 証明書生成失敗: organizationId=${organizationId}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      organizationId,
    });
    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : '証明書生成中に不明なエラーが発生しました',
    };
  }
}

/**
 * シリアル番号を生成（ランダムな16進数）
 */
function generateSerialNumber(): string {
  // 128ビットのランダムな16進数を生成
  const bytes = forge.random.getBytesSync(16);
  let serialNumber = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes.charCodeAt(i);
    serialNumber += ('0' + byte.toString(16)).slice(-2);
  }
  return serialNumber;
}

/**
 * 証明書をファイルサーバに保存
 * 
 * @param organizationId 組織ID
 * @param p12Buffer PKCS#12形式の証明書Buffer
 * @returns 保存先パス
 */
export async function saveCertificateToStorage(
  organizationId: string,
  p12Buffer: Buffer
): Promise<string> {
  logger.info(`[certificateService] 証明書をファイルサーバに保存中: organizationId=${organizationId}`);

  const storageService = getStorageService();
  const filePath = `certificates/${organizationId}.p12`;

  try {
    await storageService.uploadFile(organizationId, filePath, p12Buffer, {
      contentType: 'application/x-pkcs12',
    });

    logger.info(`[certificateService] 証明書の保存成功: ${organizationId}/${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(
      `[certificateService] 証明書の保存失敗: organizationId=${organizationId}`,
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      }
    );
    throw error;
  }
}

/**
 * ファイルサーバから証明書を取得
 * 
 * @param organizationId 組織ID
 * @returns PKCS#12形式の証明書Buffer
 */
export async function getCertificateFromStorage(organizationId: string): Promise<Buffer> {
  logger.info(
    `[certificateService] 証明書をファイルサーバから取得中: organizationId=${organizationId}`
  );

  const storageService = getStorageService();
  const filePath = `certificates/${organizationId}.p12`;

  try {
    const buffer = await storageService.downloadFile(organizationId, filePath);

    logger.info(
      `[certificateService] 証明書の取得成功: ${organizationId}/${filePath}, size=${buffer.length}bytes`
    );
    return buffer;
  } catch (error) {
    logger.error(
      `[certificateService] 証明書の取得失敗: organizationId=${organizationId}`,
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      }
    );
    throw error;
  }
}

/**
 * 証明書の存在確認
 * 
 * @param organizationId 組織ID
 * @returns 証明書が存在するか
 */
export async function certificateExists(organizationId: string): Promise<boolean> {
  const storageService = getStorageService();
  const filePath = `certificates/${organizationId}.p12`;

  try {
    const exists = await storageService.fileExists(organizationId, filePath);
    logger.info(
      `[certificateService] 証明書の存在確認: organizationId=${organizationId}, exists=${exists}`
    );
    return exists;
  } catch (error) {
    logger.error(
      `[certificateService] 証明書の存在確認失敗: organizationId=${organizationId}`,
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      }
    );
    return false;
  }
}

/**
 * 組織作成時に証明書を自動生成して保存
 * 
 * @param organizationId 組織ID
 * @returns 成功・失敗のステータス
 */
export async function generateAndSaveCertificate(
  organizationId: string
): Promise<{ success: boolean; errorMessage?: string }> {
  logger.info(
    `[certificateService] 組織作成時の証明書自動生成: organizationId=${organizationId}`
  );

  try {
    // 1. 証明書生成
    const result = await generateClientCertificate(organizationId);

    if (!result.success || !result.p12Buffer) {
      return {
        success: false,
        errorMessage: result.errorMessage || '証明書生成に失敗しました',
      };
    }

    // 2. ファイルサーバに保存
    await saveCertificateToStorage(organizationId, result.p12Buffer);

    logger.info(`[certificateService] 証明書の自動生成・保存が完了しました: organizationId=${organizationId}`);

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '証明書の生成・保存中に不明なエラーが発生しました';
    logger.error(
      `[certificateService] 証明書の自動生成・保存失敗: organizationId=${organizationId}`,
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      }
    );
    return {
      success: false,
      errorMessage,
    };
  }
}
