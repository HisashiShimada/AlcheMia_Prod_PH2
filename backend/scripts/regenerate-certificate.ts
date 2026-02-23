/**
 * 既存組織の証明書を手動で再生成するスクリプト
 * 
 * 使用方法:
 *   npx ts-node backend/scripts/regenerate-certificate.ts <organization_id>
 * 
 * 例:
 *   npx ts-node backend/scripts/regenerate-certificate.ts b6ae9356-48e2-4b8c-bae6-945fa2db66ee
 */

import { generateAndSaveCertificate } from '../src/services/certificateService';
import { logger } from '../src/utils/logger';

const organizationId = process.argv[2];

if (!organizationId) {
  console.error('❌ 使用方法: npx ts-node backend/scripts/regenerate-certificate.ts <organization_id>');
  console.error('');
  console.error('例:');
  console.error('  npx ts-node backend/scripts/regenerate-certificate.ts b6ae9356-48e2-4b8c-bae6-945fa2db66ee');
  process.exit(1);
}

// UUIDフォーマットの簡易チェック
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(organizationId)) {
  console.error(`❌ 無効な組織ID形式です: ${organizationId}`);
  console.error('   組織IDはUUID形式である必要があります（例: b6ae9356-48e2-4b8c-bae6-945fa2db66ee）');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(80));
  console.log('クライアント証明書 再生成スクリプト');
  console.log('='.repeat(80));
  console.log('');
  console.log(`組織ID: ${organizationId}`);
  console.log('');
  
  try {
    console.log('証明書を生成中...');
    console.log('');
    
    const result = await generateAndSaveCertificate(organizationId);
    
    console.log('');
    console.log('='.repeat(80));
    
    if (result.success) {
      console.log('✅ 証明書の生成・保存に成功しました');
      console.log('='.repeat(80));
      console.log('');
      console.log('保存先:');
      console.log(`  ${organizationId}/certificates/${organizationId}.p12`);
      console.log('');
      console.log('次のステップ:');
      console.log('  1. 組織管理画面で「証明書DL」ボタンを押下');
      console.log('  2. ブラウザに証明書（.p12ファイル）をインポート');
      console.log('');
    } else {
      console.log('❌ 証明書の生成・保存に失敗しました');
      console.log('='.repeat(80));
      console.log('');
      console.log('エラー:');
      console.log(`  ${result.errorMessage}`);
      console.log('');
      console.log('トラブルシューティング:');
      console.log('  1. CA証明書が存在するか確認:');
      console.log('     ls -la backend/certs/ca/ca.crt');
      console.log('     ls -la backend/certs/ca/ca.key');
      console.log('');
      console.log('  2. CA証明書が存在しない場合は生成:');
      console.log('     bash scripts/generate-certificates.sh');
      console.log('');
      console.log('  3. 環境変数が正しく設定されているか確認:');
      console.log('     cat backend/.env | grep CA_CERT');
      console.log('');
      process.exit(1);
    }
  } catch (error) {
    console.log('');
    console.log('='.repeat(80));
    console.log('❌ 予期しないエラーが発生しました');
    console.log('='.repeat(80));
    console.log('');
    console.error('エラー詳細:', error);
    console.log('');
    process.exit(1);
  }
}

// スクリプト実行
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
