/**
 * サーバーSwift環境にフォルダ構造を自動生成するスクリプト
 * 
 * サーバー環境（10.1.1.219:9090）にローカルと同じフォルダ構造を作成します
 * 
 * 処理内容:
 * 1. ローカルSwiftからフォルダ構造を取得
 * 2. サーバーSwiftに同じ構造を作成
 * 3. テストファイルをアップロード
 */

import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '../.env') });

// ローカルSwift設定
const LOCAL_SWIFT_CONFIG = {
  endpoint: process.env.SWIFT_ENDPOINT || 'http://localhost:8080',
  credentials: {
    accessKeyId: process.env.SWIFT_ACCESS_KEY_ID || 'test:tester',
    secretAccessKey: process.env.SWIFT_SECRET_ACCESS_KEY || 'testing',
  },
  region: 'us-east-1',
  forcePathStyle: true,
};

// サーバーSwift設定
const SERVER_SWIFT_CONFIG = {
  endpoint: 'http://10.1.1.219:9090',
  credentials: {
    accessKeyId: 'test:tester',
    secretAccessKey: 'testing',
  },
  region: 'us-east-1',
  forcePathStyle: true,
};

// コンテナ名
const LOCAL_CONTAINER = process.env.SWIFT_CONTAINER || process.env.S3_BUCKET_NAME || 'mmdpf-files';
const SERVER_CONTAINER = 'mmdpf-files'; // サーバー側のコンテナ名

interface FileInfo {
  key: string;
  size: number;
  lastModified?: Date;
}

async function listAllFiles(client: S3Client, container: string, prefix: string = ''): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: container,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await client.send(command);
    
    if (response.Contents) {
      response.Contents.forEach(obj => {
        if (obj.Key) {
          files.push({
            key: obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified,
          });
        }
      });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return files;
}

async function copyFile(
  sourceClient: S3Client,
  sourceContainer: string,
  targetClient: S3Client,
  targetContainer: string,
  key: string
): Promise<void> {
  // ソースからファイルを取得
  const getCommand = new GetObjectCommand({
    Bucket: sourceContainer,
    Key: key,
  });
  const getResponse = await sourceClient.send(getCommand);
  
  if (!getResponse.Body) {
    throw new Error(`Failed to get file body: ${key}`);
  }

  // ボディをバッファに変換
  const bodyContents = await getResponse.Body.transformToByteArray();
  
  // ターゲットにアップロード
  const putCommand = new PutObjectCommand({
    Bucket: targetContainer,
    Key: key,
    Body: bodyContents,
    ContentType: getResponse.ContentType || 'application/octet-stream',
  });
  
  await targetClient.send(putCommand);
}

async function createKeepFile(
  client: S3Client,
  container: string,
  folderPath: string
): Promise<void> {
  const keepKey = `${folderPath}/.keep`;
  const putCommand = new PutObjectCommand({
    Bucket: container,
    Key: keepKey,
    Body: Buffer.from(''),
    ContentType: 'text/plain',
  });
  
  await client.send(putCommand);
}

async function main() {
  console.log('='.repeat(80));
  console.log('サーバーSwift フォルダ構造セットアップ');
  console.log('='.repeat(80));
  console.log();

  try {
    // クライアントの初期化
    console.log('1. クライアントの初期化...');
    const localClient = new S3Client(LOCAL_SWIFT_CONFIG);
    const serverClient = new S3Client(SERVER_SWIFT_CONFIG);
    console.log(`   ✅ ローカルSwift: ${LOCAL_SWIFT_CONFIG.endpoint}`);
    console.log(`   ✅ ローカルコンテナ: ${LOCAL_CONTAINER}`);
    console.log(`   ✅ サーバーSwift: ${SERVER_SWIFT_CONFIG.endpoint}`);
    console.log(`   ✅ サーバーコンテナ: ${SERVER_CONTAINER}`);
    console.log();

    // ローカルのファイル一覧を取得
    console.log('2. ローカルのファイル一覧を取得...');
    let localFiles: FileInfo[] = [];
    try {
      localFiles = await listAllFiles(localClient, LOCAL_CONTAINER);
      console.log(`   ✅ ${localFiles.length} 件のファイルを検出`);
      
      if (localFiles.length === 0) {
        console.log('   ⚠️  ローカルSwiftにファイルがありません');
        console.log('   ヒント: setup-swift-folders.ts を先に実行してください');
        console.log();
      } else {
        // ファイル一覧をプレビュー表示
        console.log('   ファイル一覧（最初の10件）:');
        localFiles.slice(0, 10).forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.key} (${file.size} bytes)`);
        });
        if (localFiles.length > 10) {
          console.log(`   ... 他 ${localFiles.length - 10} 件`);
        }
        console.log();
      }
    } catch (error: any) {
      console.log(`   ⚠️  ローカルSwiftへの接続に失敗: ${error.message}`);
      console.log('   推奨される基本構造を作成します');
      console.log();
    }

    // サーバー側のフォルダ構造を作成
    console.log('3. サーバーSwiftにフォルダ構造を作成...');
    console.log();

    if (localFiles.length > 0) {
      // ローカルのファイルをサーバーにコピー
      let successCount = 0;
      let errorCount = 0;

      for (const file of localFiles) {
        try {
          await copyFile(localClient, LOCAL_CONTAINER, serverClient, SERVER_CONTAINER, file.key);
          console.log(`   ✅ ${file.key}`);
          successCount++;
        } catch (error: any) {
          console.log(`   ❌ ${file.key} - エラー: ${error.message}`);
          errorCount++;
        }
      }

      console.log();
      console.log(`   成功: ${successCount} 件`);
      console.log(`   失敗: ${errorCount} 件`);
      console.log();

    } else {
      // ローカルにファイルがない場合は基本構造を作成
      console.log('   基本構造を作成します...');
      console.log();

      const basicStructure = [
        'org_aiml_lab/projects/',
        'org_aiml_lab/formats/',
        'org_system_admin/projects/',
        'org_system_admin/formats/',
      ];

      for (const folder of basicStructure) {
        try {
          await createKeepFile(serverClient, SERVER_CONTAINER, folder);
          console.log(`   ✅ ${folder}.keep`);
        } catch (error: any) {
          console.log(`   ❌ ${folder}.keep - エラー: ${error.message}`);
        }
      }
      console.log();
    }

    // サーバー側のファイル一覧を確認
    console.log('4. サーバーSwiftのファイル一覧を確認...');
    const serverFiles = await listAllFiles(serverClient, SERVER_CONTAINER);
    console.log(`   ✅ ${serverFiles.length} 件のファイル`);
    
    if (serverFiles.length > 0) {
      console.log('   ファイル一覧（最初の10件）:');
      serverFiles.slice(0, 10).forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.key} (${file.size} bytes)`);
      });
      if (serverFiles.length > 10) {
        console.log(`   ... 他 ${serverFiles.length - 10} 件`);
      }
    }
    console.log();

    // フォルダ構造を整理して表示
    console.log('5. フォルダ構造の表示...');
    const folders = new Set<string>();
    serverFiles.forEach(file => {
      const parts = file.key.split('/');
      for (let i = 1; i <= parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    });

    const sortedFolders = Array.from(folders).sort();
    const orgFolders: { [key: string]: string[] } = {};

    sortedFolders.forEach(folder => {
      const parts = folder.split('/');
      if (parts[0].startsWith('org_')) {
        if (!orgFolders[parts[0]]) {
          orgFolders[parts[0]] = [];
        }
        if (parts.length > 1) {
          orgFolders[parts[0]].push(parts.slice(1).join('/'));
        }
      }
    });

    Object.keys(orgFolders).sort().forEach(org => {
      console.log(`   ${org}/`);
      const subFolders = orgFolders[org];
      subFolders.sort().forEach((sub, index) => {
        const isLast = index === subFolders.length - 1;
        const prefix = isLast ? '└──' : '├──';
        console.log(`   ${prefix} ${sub}`);
      });
      console.log();
    });

    console.log('='.repeat(80));
    console.log('✅ サーバーSwift フォルダ構造のセットアップが完了しました！');
    console.log('='.repeat(80));
    console.log();
    console.log('確認方法:');
    console.log('  1. Cyberduckでサーバーに接続（10.1.1.219:9090）');
    console.log('  2. アクセスキー: test:tester / testing');
    console.log('  3. コンテナ: mmdpf-files を開く');
    console.log();

    process.exit(0);

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ エラーが発生しました');
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

    console.error();
    console.error('トラブルシューティング:');
    console.error('1. ローカルSwiftが起動しているか確認:');
    console.error('   docker-compose ps swift');
    console.error();
    console.error('2. サーバーSwiftが起動しているか確認:');
    console.error('   ping 10.1.1.219');
    console.error('   curl http://10.1.1.219:9090');
    console.error();
    console.error('3. 環境変数を確認:');
    console.error('   cat backend/.env | grep SWIFT');
    console.error();

    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

export default main;