/**
 * ローカルSwiftのコンテナ名確認スクリプト
 * 
 * localhost:8080のコンテナ一覧を表示し、
 * mmpdf-files または mmdpf-files コンテナの存在を確認します
 */

import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// ローカルSwift設定
const LOCAL_SWIFT_CONFIG = {
  endpoint: 'http://localhost:8080',
  credentials: {
    accessKeyId: 'test:tester',
    secretAccessKey: 'testing',
  },
  region: 'us-east-1',
  forcePathStyle: true,
};

async function checkLocalContainers() {
  console.log('='.repeat(80));
  console.log('ローカルSwift (localhost:8080) - コンテナ確認');
  console.log('='.repeat(80));
  console.log();

  try {
    const client = new S3Client(LOCAL_SWIFT_CONFIG);

    // コンテナ一覧を取得
    console.log('1. コンテナ一覧の取得...');
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResponse = await client.send(listBucketsCommand);
    
    if (bucketsResponse.Buckets && bucketsResponse.Buckets.length > 0) {
      console.log(`   ✅ コンテナ数: ${bucketsResponse.Buckets.length}`);
      console.log();
      
      bucketsResponse.Buckets.forEach((bucket, index) => {
        console.log(`   ${index + 1}. ${bucket.Name} (作成日: ${bucket.CreationDate?.toISOString()})`);
      });
      console.log();

      // 各コンテナのファイル数を確認
      console.log('2. 各コンテナのファイル数確認...');
      console.log();
      
      for (const bucket of bucketsResponse.Buckets) {
        try {
          const listObjectsCommand = new ListObjectsV2Command({
            Bucket: bucket.Name!,
            MaxKeys: 1000,
          });
          const objectsResponse = await client.send(listObjectsCommand);
          const fileCount = objectsResponse.Contents?.length || 0;
          
          console.log(`   📦 ${bucket.Name}`);
          console.log(`      ファイル数: ${fileCount}`);
          
          if (fileCount > 0 && objectsResponse.Contents) {
            console.log(`      最初の5ファイル:`);
            objectsResponse.Contents.slice(0, 5).forEach((obj, idx) => {
              console.log(`        ${idx + 1}. ${obj.Key} (${obj.Size} bytes)`);
            });
            if (fileCount > 5) {
              console.log(`        ... 他 ${fileCount - 5} 件`);
            }
          }
          console.log();
        } catch (error: any) {
          console.log(`   ⚠️  ${bucket.Name} - アクセスエラー: ${error.message}`);
          console.log();
        }
      }

      // mmpdf-files または mmdpf-files の存在チェック
      const targetContainers = ['mmpdf-files', 'mmdpf-files'];
      const foundContainers = bucketsResponse.Buckets.filter(b => 
        targetContainers.includes(b.Name || '')
      );

      if (foundContainers.length > 0) {
        console.log('='.repeat(80));
        console.log('✅ 対象コンテナが見つかりました:');
        console.log('='.repeat(80));
        foundContainers.forEach(container => {
          console.log(`   ${container.Name}`);
        });
        console.log();
      } else {
        console.log('='.repeat(80));
        console.log('⚠️  mmpdf-files または mmdpf-files コンテナが見つかりません');
        console.log('='.repeat(80));
        console.log();
      }

    } else {
      console.log('   ⚠️  コンテナが存在しません');
      console.log();
    }

    console.log('次のステップ:');
    console.log('  対象コンテナが見つかった場合:');
    console.log('    npx ts-node backend/scripts/migrate-local-to-server.ts');
    console.log();

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(80));
    console.error('エラー詳細:', error.message);
    console.error();
    console.error('トラブルシューティング:');
    console.error('  1. ローカルSwiftが起動しているか確認:');
    console.error('     docker-compose ps swift');
    console.error('  2. ローカルSwiftに接続可能か確認:');
    console.error('     curl http://localhost:8080');
    console.error();
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  checkLocalContainers();
}

export default checkLocalContainers;