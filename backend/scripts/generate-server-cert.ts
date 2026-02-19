/**
 * Nginx用サーバー証明書生成スクリプト（TypeScript版）
 * 
 * OpenSSL不要でnode-forgeを使用して証明書を生成
 * 
 * 実行方法:
 *   npx ts-node backend/scripts/generate-server-cert.ts
 *   または
 *   npm run generate-server-cert
 */

import * as fs from 'fs';
import * as path from 'path';
import * as forge from 'node-forge';

// カラー出力用
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

/**
 * Nginx用サーバー証明書を生成
 */
async function generateServerCertificate(): Promise<void> {
  console.log(`${colors.green}==========================================${colors.reset}`);
  console.log(`${colors.green}Nginx用サーバー証明書生成（自己署名）${colors.reset}`);
  console.log(`${colors.green}==========================================${colors.reset}`);
  console.log('');

  // 出力先ディレクトリ
  const projectRoot = path.resolve(__dirname, '../..');
  const certDir = path.join(projectRoot, 'backend/certs/server');
  const serverKeyPath = path.join(certDir, 'server.key');
  const serverCertPath = path.join(certDir, 'server.crt');

  console.log(`証明書出力先: ${certDir}`);
  console.log('');

  // ディレクトリ作成
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
    console.log(`${colors.green}✓ ディレクトリ作成: ${certDir}${colors.reset}`);
  }

  // 既存チェック
  if (fs.existsSync(serverKeyPath) && fs.existsSync(serverCertPath)) {
    console.log(`${colors.yellow}⚠ サーバー証明書が既に存在します。スキップします。${colors.reset}`);
    console.log(`  - ${serverCertPath}`);
    console.log(`  - ${serverKeyPath}`);
    console.log('');
    console.log(`${colors.yellow}既存の証明書を削除してから再実行してください。${colors.reset}`);
    return;
  }

  try {
    // 1. サーバー秘密鍵の生成（2048bit RSA）
    console.log('サーバー秘密鍵を生成中...');
    const keys = forge.pki.rsa.generateKeyPair(2048);
    console.log(`${colors.green}✓ サーバー秘密鍵を生成（2048bit RSA）${colors.reset}`);

    // 2. サーバー証明書の生成（自己署名）
    console.log('サーバー証明書を生成中...');
    const cert = forge.pki.createCertificate();
    
    // 公開鍵を設定
    cert.publicKey = keys.publicKey;
    
    // シリアル番号をランダムに生成
    cert.serialNumber = generateSerialNumber();
    
    // 有効期間を設定（1年）
    const notBefore = new Date();
    const notAfter = new Date();
    notAfter.setFullYear(notBefore.getFullYear() + 1);
    cert.validity.notBefore = notBefore;
    cert.validity.notAfter = notAfter;
    
    // Subject（発行先）を設定
    const attrs = [
      { name: 'countryName', value: 'JP' },
      { name: 'stateOrProvinceName', value: 'Tokyo' },
      { name: 'localityName', value: 'Tokyo' },
      { name: 'organizationName', value: 'MMDPF' },
      { name: 'organizationalUnitName', value: 'Development' },
      { name: 'commonName', value: 'localhost' },
    ];
    cert.setSubject(attrs);
    
    // Issuer（発行者）を設定（自己署名なのでSubjectと同じ）
    cert.setIssuer(attrs);
    
    // 拡張属性を設定
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        keyCertSign: false,
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: false,
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },           // DNS
          { type: 2, value: '*.localhost' },         // DNS
          { type: 7, ip: '127.0.0.1' },             // IP
        ],
      },
    ]);
    
    // 自己署名
    cert.sign(keys.privateKey, forge.md.sha256.create());
    console.log(`${colors.green}✓ サーバー証明書を生成（自己署名、1年有効）${colors.reset}`);

    // 3. PEM形式に変換
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const certPem = forge.pki.certificateToPem(cert);

    // 4. ファイルに保存
    fs.writeFileSync(serverKeyPath, privateKeyPem, 'utf8');
    console.log(`${colors.green}✓ サーバー秘密鍵を保存: ${serverKeyPath}${colors.reset}`);
    
    fs.writeFileSync(serverCertPath, certPem, 'utf8');
    console.log(`${colors.green}✓ サーバー証明書を保存: ${serverCertPath}${colors.reset}`);

    // Windows以外ではファイルアクセス権限を厳格化
    if (process.platform !== 'win32') {
      fs.chmodSync(serverKeyPath, 0o600);
      console.log(`${colors.green}✓ サーバー秘密鍵のアクセス権限を600に設定${colors.reset}`);
    }

    console.log('');
    console.log(`${colors.green}==========================================${colors.reset}`);
    console.log(`${colors.green}サーバー証明書生成完了${colors.reset}`);
    console.log(`${colors.green}==========================================${colors.reset}`);
    console.log('');
    console.log(`${colors.green}生成されたファイル:${colors.reset}`);
    console.log(`  - ${serverCertPath} (Nginx用証明書)`);
    console.log(`  - ${serverKeyPath} (Nginx用秘密鍵)`);
    console.log('');
    console.log(`${colors.yellow}次のステップ:${colors.reset}`);
    console.log('  1. docker-compose.ymlでNginxコンテナに証明書をマウント');
    console.log('  2. Nginxを起動: docker-compose up -d nginx');
    console.log('  3. https://localhost でアクセス確認');
    console.log('');
    console.log(`${colors.yellow}⚠ 注意:${colors.reset}`);
    console.log('  - これは自己署名証明書です');
    console.log('  - ブラウザで「信頼されない証明書」警告が表示されます');
    console.log('  - 本番環境では Let\'s Encrypt などの正式な証明書を使用してください');
    console.log('');
  } catch (error) {
    console.error(`${colors.red}❌ エラーが発生しました:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

/**
 * シリアル番号を生成（ランダムな正の整数）
 */
function generateSerialNumber(): string {
  // ランダムな8バイト（16桁の16進数）を生成
  const bytes = forge.random.getBytesSync(8);
  const hex = forge.util.bytesToHex(bytes);
  return hex;
}

// スクリプト実行
if (require.main === module) {
  generateServerCertificate().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
