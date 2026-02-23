/**
 * CA証明書生成スクリプト（node-forge使用）
 * 
 * OpenSSLが不要な純粋なNode.js実装
 * 
 * 使用方法:
 *   npx ts-node backend/scripts/generate-ca-certificate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';

const CERT_DIR = path.resolve(__dirname, '../certs/ca');

console.log('========================================');
console.log('CA証明書生成スクリプト（node-forge）');
console.log('========================================');
console.log('');

// ディレクトリの作成
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
  console.log(`✓ ディレクトリを作成しました: ${CERT_DIR}`);
} else {
  console.log(`✓ ディレクトリが存在します: ${CERT_DIR}`);
}
console.log('');

console.log('[1/3] CA秘密鍵を生成中...');
// 1. CA秘密鍵を生成（RSA 4096bit）
const keys = forge.pki.rsa.generateKeyPair(4096);
console.log('✓ CA秘密鍵を生成しました（4096bit）');
console.log('');

console.log('[2/3] CA証明書を作成中...');
// 2. CA証明書を作成
const cert = forge.pki.createCertificate();

// 公開鍵を設定
cert.publicKey = keys.publicKey;

// シリアル番号を生成
cert.serialNumber = generateSerialNumber();

// 有効期間を設定（10年）
const notBefore = new Date();
const notAfter = new Date();
notAfter.setFullYear(notBefore.getFullYear() + 10);
cert.validity.notBefore = notBefore;
cert.validity.notAfter = notAfter;

// Subject（証明書の所有者情報）を設定
cert.subject.attributes = [
  { name: 'countryName', value: 'JP' },
  { name: 'stateOrProvinceName', value: 'Tokyo' },
  { name: 'localityName', value: 'Tokyo' },
  { name: 'organizationName', value: 'MMDPF' },
  { name: 'organizationalUnitName', value: 'Development' },
  { name: 'commonName', value: 'MMDPF CA' },
];

// Issuer（発行者情報）= Subjectと同じ（自己署名）
cert.issuer.attributes = cert.subject.attributes;

// CA用の拡張フィールドを設定
cert.setExtensions([
  {
    name: 'basicConstraints',
    cA: true,
    critical: true,
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    cRLSign: true,
    critical: true,
  },
  {
    name: 'subjectKeyIdentifier',
  },
]);

console.log('✓ CA証明書を作成しました');
console.log('');

console.log('[3/3] CA証明書に自己署名中...');
// 3. 自己署名（CA秘密鍵で署名）
cert.sign(keys.privateKey, forge.md.sha256.create());
console.log('✓ 自己署名が完了しました');
console.log('');

// 4. PEM形式に変換して保存
console.log('ファイルに保存中...');

const caKeyPath = path.join(CERT_DIR, 'ca.key');
const caCrtPath = path.join(CERT_DIR, 'ca.crt');

// 秘密鍵をPEM形式で保存
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
fs.writeFileSync(caKeyPath, privateKeyPem);
console.log(`✓ CA秘密鍵を保存しました: ${caKeyPath}`);

// 証明書をPEM形式で保存
const certPem = forge.pki.certificateToPem(cert);
fs.writeFileSync(caCrtPath, certPem);
console.log(`✓ CA証明書を保存しました: ${caCrtPath}`);

console.log('');
console.log('========================================');
console.log('✅ CA証明書の生成が完了しました！');
console.log('========================================');
console.log('');
console.log('生成されたファイル:');
console.log(`  - CA秘密鍵: ${caKeyPath}`);
console.log(`  - CA証明書: ${caCrtPath}`);
console.log('');
console.log('次のステップ:');
console.log('  1. バックエンドを再起動: docker-compose restart backend');
console.log('  2. 組織管理画面で組織を作成');
console.log('');

/**
 * シリアル番号を生成（ランダムな16進数）
 */
function generateSerialNumber(): string {
  const bytes = forge.random.getBytesSync(16);
  let serialNumber = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes.charCodeAt(i);
    serialNumber += ('0' + byte.toString(16)).slice(-2);
  }
  return serialNumber;
}
