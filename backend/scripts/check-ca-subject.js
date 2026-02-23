/**
 * CA証明書のSubject属性を確認するスクリプト
 */
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

// CA証明書のパス
const projectRoot = path.resolve(__dirname, '../..');
const caCertPath = path.join(projectRoot, 'backend/certs/ca/ca.crt');

console.log('CA証明書のパス:', caCertPath);
console.log('---');

try {
  // CA証明書を読み込み
  const caCertPem = fs.readFileSync(caCertPath, 'utf8');
  const caCert = forge.pki.certificateFromPem(caCertPem);

  console.log('✅ CA証明書の読み込み成功');
  console.log('');

  // Subject属性を表示
  console.log('📋 CA証明書のSubject属性:');
  console.log('---');
  caCert.subject.attributes.forEach((attr) => {
    console.log(`  ${attr.name || attr.shortName}: ${attr.value}`);
    if (attr.type) {
      console.log(`    (OID: ${attr.type})`);
    }
  });
  console.log('');

  // certificateService.tsで設定しているIssuer属性と比較
  console.log('📋 certificateService.tsで設定しているIssuer属性:');
  console.log('---');
  console.log('  C: JP');
  console.log('  ST: Tokyo');
  console.log('  L: Tokyo');
  console.log('  O: MMDPF');
  console.log('  OU: Development');
  console.log('  CN: MMDPF CA');
  console.log('');

  // 不一致があるかチェック
  const expectedAttrs = {
    C: 'JP',
    ST: 'Tokyo',
    L: 'Tokyo',
    O: 'MMDPF',
    OU: 'Development',
    CN: 'MMDPF CA'
  };

  let hasMismatch = false;
  console.log('🔍 一致確認:');
  console.log('---');
  
  Object.entries(expectedAttrs).forEach(([shortName, expectedValue]) => {
    const attr = caCert.subject.attributes.find(
      a => (a.shortName === shortName || a.name === shortName)
    );
    
    if (!attr) {
      console.log(`  ❌ ${shortName}: 見つかりません`);
      hasMismatch = true;
    } else if (attr.value !== expectedValue) {
      console.log(`  ❌ ${shortName}: 不一致`);
      console.log(`      期待値: ${expectedValue}`);
      console.log(`      実際の値: ${attr.value}`);
      hasMismatch = true;
    } else {
      console.log(`  ✅ ${shortName}: 一致`);
    }
  });

  console.log('');
  
  if (hasMismatch) {
    console.log('⚠️ 不一致が見つかりました！');
    console.log('certificateService.tsのIssuer属性を修正する必要があります。');
  } else {
    console.log('✅ すべて一致しています！');
    console.log('問題は別の原因にあります。');
  }

} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  console.error(error.stack);
}
