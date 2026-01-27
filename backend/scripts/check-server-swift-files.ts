/**
 * サーバーSwiftのファイル状況確認スクリプト
 * 
 * 10.1.1.219:3002のmmdpf-filesコンテナの内容を詳細表示します
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// サーバーSwift設定
const SERVER_SWIFT_CONFIG = {
  endpoint: 'http://10.1.1.219:3002',
  credentials: {
    accessKeyId: 'test:tester',
    secretAccessKey: 'testing',
  },
  region: 'us-east-1',
  forcePathStyle: true,
};

const CONTAINER_NAME = 'mmdpf-files';

async function checkServerFiles() {
  console.log('='.repeat(80));
  console.log('サーバーSwift (10.1.1.219:3002) - ファイル状況確認');
  console.log('='.repeat(80));
  console.log();
  console.log(`コンテナ: ${CONTAINER_NAME}`);
  console.log();

  try {
    const client = new S3Client(SERVER_SWIFT_CONFIG);

    // 全ファイルを取得
    console.log('ファイル一覧を取得中...');
    const listCommand = new ListObjectsV2Command({
      Bucket: CONTAINER_NAME,
    });
    const response = await client.send(listCommand);
    
    if (response.Contents && response.Contents.length > 0) {
      console.log(`総ファイル数: ${response.Contents.length}`);
      console.log();
      
      // 組織ごとにグループ化
      const byOrg: { [key: string]: any[] } = {};
      response.Contents.forEach(obj => {
        const parts = obj.Key?.split('/') || [];
        const org = parts[0] || 'root';
        if (!byOrg[org]) byOrg[org] = [];
        byOrg[org].push(obj);
      });
      
      // 組織ごとに表示
      console.log('='.repeat(80));
      console.log('組織別ファイル構造:');
      console.log('='.repeat(80));
      console.log();
      
      Object.keys(byOrg).sort().forEach(org => {
        console.log(`📁 ${org}/ (${byOrg[org].length} ファイル)`);
        
        // フォルダ構造を整理
        const folders = new Set<string>();
        byOrg[org].forEach(obj => {
          const path = obj.Key?.replace(org + '/', '') || '';
          const parts = path.split('/');
          for (let i = 0; i < parts.length - 1; i++) {
            folders.add(parts.slice(0, i + 1).join('/'));
          }
        });
        
        // フォルダを表示
        Array.from(folders).sort().forEach(folder => {
          console.log(`   └─ ${folder}/`);
        });
        
        // ファイルを表示
        console.log(`   ファイル一覧:`);
        byOrg[org].forEach(obj => {
          const path = obj.Key?.replace(org + '/', '     ') || '';
          const size = obj.Size || 0;
          console.log(`     ${path} (${size} bytes)`);
        });
        console.log();
      });
      
      // 合計統計
      const totalSize = response.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      console.log('='.repeat(80));
      console.log('統計情報:');
      console.log('='.repeat(80));
      console.log(`  総ファイル数: ${response.Contents.length}`);
      console.log(`  総サイズ: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);
      console.log(`  組織数: ${Object.keys(byOrg).length}`);
      console.log();
      
    } else {
      console.log('⚠️  コンテナは空です');
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ サーバーSwiftの状態確認完了');
    console.log('='.repeat(80));
    console.log();

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(80));
    console.error('エラー詳細:', error.message);
    console.error();
    
    if (error.$metadata) {
      console.error('HTTPステータス:', error.$metadata.httpStatusCode);
    }
    
    console.error();
    console.error('トラブルシューティング:');
    console.error('  1. サーバーSwiftが起動しているか確認:');
    console.error('     ping 10.1.1.219');
    console.error('  2. サーバーSwiftに接続可能か確認:');
    console.error('     curl http://10.1.1.219:3002');
    console.error();
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  checkServerFiles();
}

export default checkServerFiles;