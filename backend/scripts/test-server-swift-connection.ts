/**
 * サーバーOpenStack Swift 接続テストスクリプト
 * 
 * サーバー環境（10.1.1.219:9090）への接続をテストします
 * 
 * 使用方法:
 *   ts-node backend/scripts/test-server-swift-connection.ts
 */

import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// サーバーSwift接続情報
const SERVER_SWIFT_CONFIG = {
  endpoint: 'http://10.1.1.219:3002',
  credentials: {
    accessKeyId: 'test:tester',
    secretAccessKey: 'testing',
  },
  region: 'us-east-1', // Swift互換のため任意の値
  forcePathStyle: true, // Swift互換のため必須
};

// テストデータ
const TEST_FILE_KEY = 'test-connection/sample.txt';
const TEST_FILE_CONTENT = 'Hello from Server Swift! Connection test successful.';

async function testServerSwiftConnection() {
  console.log('='.repeat(80));
  console.log('サーバーOpenStack Swift 接続テスト');
  console.log('='.repeat(80));
  console.log();
  console.log('接続先:', SERVER_SWIFT_CONFIG.endpoint);
  console.log('アクセスキー:', SERVER_SWIFT_CONFIG.credentials.accessKeyId);
  console.log();

  try {
    // S3Client初期化
    console.log('1. S3Client（Swift互換）の初期化...');
    const client = new S3Client(SERVER_SWIFT_CONFIG);
    console.log('   ✅ クライアント初期化成功');
    console.log();

    // コンテナ（バケット）一覧の取得
    console.log('2. コンテナ一覧の取得...');
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResponse = await client.send(listBucketsCommand);
    
    if (bucketsResponse.Buckets && bucketsResponse.Buckets.length > 0) {
      console.log(`   ✅ コンテナ数: ${bucketsResponse.Buckets.length}`);
      bucketsResponse.Buckets.forEach((bucket, index) => {
        console.log(`   ${index + 1}. ${bucket.Name} (作成日: ${bucket.CreationDate?.toISOString()})`);
      });
    } else {
      console.log('   ⚠️  コンテナが存在しません');
      console.log('   推奨: "mmdpf-files" コンテナを作成してください');
    }
    console.log();

    // 使用するコンテナ名を決定
    let containerName = 'mmdpf-files'; // デフォルト
    if (bucketsResponse.Buckets && bucketsResponse.Buckets.length > 0) {
      // 既存のコンテナがあれば最初のものを使用
      containerName = bucketsResponse.Buckets[0].Name || 'mmdpf-files';
      console.log(`   使用するコンテナ: ${containerName}`);
      console.log();
    }

    // コンテナ内のオブジェクト一覧を取得
    console.log('3. コンテナ内のオブジェクト一覧を取得...');
    try {
      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: containerName,
        MaxKeys: 10,
      });
      const objectsResponse = await client.send(listObjectsCommand);
      
      if (objectsResponse.Contents && objectsResponse.Contents.length > 0) {
        console.log(`   ✅ オブジェクト数: ${objectsResponse.Contents.length}`);
        objectsResponse.Contents.slice(0, 5).forEach((obj, index) => {
          console.log(`   ${index + 1}. ${obj.Key} (${obj.Size} bytes, ${obj.LastModified?.toISOString()})`);
        });
        if (objectsResponse.Contents.length > 5) {
          console.log(`   ... 他 ${objectsResponse.Contents.length - 5} 件`);
        }
      } else {
        console.log('   ⚠️  コンテナは空です');
      }
    } catch (error: any) {
      if (error.name === 'NoSuchBucket') {
        console.log(`   ⚠️  コンテナ "${containerName}" が存在しません`);
        console.log('   Cyberduckなどでコンテナを作成してください');
      } else {
        throw error;
      }
    }
    console.log();

    // テストファイルのアップロード
    console.log('4. テストファイルのアップロード...');
    try {
      const putCommand = new PutObjectCommand({
        Bucket: containerName,
        Key: TEST_FILE_KEY,
        Body: TEST_FILE_CONTENT,
        ContentType: 'text/plain',
      });
      await client.send(putCommand);
      console.log(`   ✅ アップロード成功: ${TEST_FILE_KEY}`);
      console.log();

      // テストファイルのダウンロード
      console.log('5. テストファイルのダウンロード...');
      const getCommand = new GetObjectCommand({
        Bucket: containerName,
        Key: TEST_FILE_KEY,
      });
      const getResponse = await client.send(getCommand);
      const downloadedContent = await getResponse.Body?.transformToString();
      console.log(`   ✅ ダウンロード成功`);
      console.log(`   ✅ 内容一致: ${downloadedContent === TEST_FILE_CONTENT}`);
      console.log(`   内容: "${downloadedContent}"`);
      console.log();

      // テストファイルの削除
      console.log('6. テストファイルの削除...');
      const deleteCommand = new DeleteObjectCommand({
        Bucket: containerName,
        Key: TEST_FILE_KEY,
      });
      await client.send(deleteCommand);
      console.log(`   ✅ 削除成功`);
      console.log();
    } catch (error: any) {
      if (error.name === 'NoSuchBucket') {
        console.log(`   ⚠️  コンテナ "${containerName}" が存在しないため、ファイル操作をスキップしました`);
        console.log();
      } else {
        throw error;
      }
    }

    console.log('='.repeat(80));
    console.log('✅ サーバーSwift接続テスト成功！');
    console.log('='.repeat(80));
    console.log();
    console.log('次のステップ:');
    console.log('1. コンテナが存在しない場合は "mmdpf-files" を作成');
    console.log('2. ローカルのフォルダ構造をサーバーに同期');
    console.log('3. 本番アプリケーションの接続設定を更新');
    console.log();

    process.exit(0);

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ サーバーSwift接続テスト失敗');
    console.error('='.repeat(80));
    console.error('エラー詳細:');
    console.error(error);
    console.error();

    if (error.message) {
      console.error('メッセージ:', error.message);
    }
    if (error.$metadata) {
      console.error('HTTPステータス:', error.$metadata.httpStatusCode);
    }
    if (error.name) {
      console.error('エラータイプ:', error.name);
    }

    console.error();
    console.error('トラブルシューティング:');
    console.error('1. サーバーSwiftが起動しているか確認:');
    console.error('   curl http://10.1.1.219:9090');
    console.error();
    console.error('2. ネットワーク接続を確認:');
    console.error('   ping 10.1.1.219');
    console.error();
    console.error('3. 認証情報が正しいか確認:');
    console.error('   アクセスキーID: test:tester');
    console.error('   シークレットアクセスキー: testing');
    console.error();
    console.error('4. Cyberduckで手動接続を試してみる');
    console.error('   詳細: docs/20260126_0950_Cyberduck_Swift接続手順.md');
    console.error();

    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  testServerSwiftConnection();
}

export default testServerSwiftConnection;