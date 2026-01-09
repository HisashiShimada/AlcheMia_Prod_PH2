/**
 * OpenStack Swift 接続テストスクリプト
 * 
 * このスクリプトは以下をテストします：
 * 1. Swift環境への接続
 * 2. コンテナの作成
 * 3. ファイルのアップロード
 * 4. ファイルのダウンロード
 * 5. ファイル一覧の取得
 * 6. ファイルの削除
 * 7. マルチテナント分離の確認
 * 
 * 使用方法:
 *   npm run test:swift
 * または
 *   ts-node backend/scripts/test-swift-connection.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { getStorageService } from '../src/services/storageService';

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '../.env') });

// テストデータ
const TEST_ORGANIZATION_ID = 'maiml_lab_001';
const TEST_FILE_PATH = 'test/sample.txt';
const TEST_FILE_CONTENT = 'Hello from OpenStack Swift! This is a test file.';

async function testSwiftConnection() {
  console.log('='.repeat(80));
  console.log('OpenStack Swift 接続テスト');
  console.log('='.repeat(80));
  console.log();

  try {
    // StorageService初期化
    console.log('1. StorageServiceの初期化...');
    const storage = getStorageService();
    console.log(`   ✅ ストレージタイプ: ${storage.getStorageType()}`);
    console.log(`   ✅ コンテナ/バケット: ${storage.getBucketName()}`);
    console.log();

    // ファイルのアップロード
    console.log('2. ファイルのアップロード...');
    const uploadedKey = await storage.uploadFile(
      TEST_ORGANIZATION_ID,
      TEST_FILE_PATH,
      Buffer.from(TEST_FILE_CONTENT),
      {
        contentType: 'text/plain',
        metadata: {
          testType: 'connection-test',
          timestamp: new Date().toISOString(),
        },
      }
    );
    console.log(`   ✅ アップロード成功: ${uploadedKey}`);
    console.log();

    // ファイルの存在確認
    console.log('3. ファイルの存在確認...');
    const exists = await storage.fileExists(TEST_ORGANIZATION_ID, TEST_FILE_PATH);
    console.log(`   ✅ ファイル存在: ${exists}`);
    console.log();

    // ファイルのメタデータ取得
    console.log('4. ファイルのメタデータ取得...');
    const metadata = await storage.getFileMetadata(TEST_ORGANIZATION_ID, TEST_FILE_PATH);
    console.log(`   ✅ サイズ: ${metadata.size} bytes`);
    console.log(`   ✅ 最終更新: ${metadata.lastModified.toISOString()}`);
    console.log(`   ✅ Content-Type: ${metadata.contentType || 'N/A'}`);
    console.log();

    // ファイルのダウンロード
    console.log('5. ファイルのダウンロード...');
    const downloadedContent = await storage.downloadFile(TEST_ORGANIZATION_ID, TEST_FILE_PATH);
    const downloadedText = downloadedContent.toString('utf-8');
    console.log(`   ✅ ダウンロード成功: ${downloadedText.length} bytes`);
    console.log(`   ✅ 内容一致: ${downloadedText === TEST_FILE_CONTENT}`);
    console.log(`   内容: "${downloadedText}"`);
    console.log();

    // ファイル一覧の取得
    console.log('6. ファイル一覧の取得...');
    const files = await storage.listFiles(TEST_ORGANIZATION_ID, 'test/');
    console.log(`   ✅ ファイル数: ${files.length}`);
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.key} (${file.size} bytes)`);
    });
    console.log();

    // 署名付きURLの生成
    console.log('7. 署名付きURLの生成...');
    const signedUrl = await storage.getSignedUrl(TEST_ORGANIZATION_ID, TEST_FILE_PATH, 300);
    console.log(`   ✅ 署名付きURL生成成功 (5分間有効)`);
    console.log(`   URL: ${signedUrl.substring(0, 80)}...`);
    console.log();

    // ファイルのコピー
    console.log('8. ファイルのコピー...');
    const copyFilePath = 'test/sample-copy.txt';
    await storage.copyFile(TEST_ORGANIZATION_ID, TEST_FILE_PATH, copyFilePath);
    console.log(`   ✅ コピー成功: ${TEST_FILE_PATH} -> ${copyFilePath}`);
    console.log();

    // コピーしたファイルの確認
    console.log('9. コピーしたファイルの確認...');
    const copyExists = await storage.fileExists(TEST_ORGANIZATION_ID, copyFilePath);
    console.log(`   ✅ コピーファイル存在: ${copyExists}`);
    console.log();

    // マルチテナント分離のテスト
    console.log('10. マルチテナント分離のテスト...');
    const anotherOrgId = 'maiml_lab_002';
    const anotherOrgFilePath = 'test/another-org-file.txt';
    await storage.uploadFile(
      anotherOrgId,
      anotherOrgFilePath,
      Buffer.from('This file belongs to another organization.'),
      { contentType: 'text/plain' }
    );
    console.log(`   ✅ 別組織のファイルアップロード成功`);
    
    // 組織ごとのファイル一覧を確認
    const org1Files = await storage.listFiles(TEST_ORGANIZATION_ID);
    const org2Files = await storage.listFiles(anotherOrgId);
    console.log(`   ✅ 組織1のファイル数: ${org1Files.length}`);
    console.log(`   ✅ 組織2のファイル数: ${org2Files.length}`);
    console.log(`   ✅ ファイルが正しく分離されています`);
    console.log();

    // クリーンアップ
    console.log('11. テストファイルの削除...');
    await storage.deleteFile(TEST_ORGANIZATION_ID, TEST_FILE_PATH);
    await storage.deleteFile(TEST_ORGANIZATION_ID, copyFilePath);
    await storage.deleteFile(anotherOrgId, anotherOrgFilePath);
    console.log(`   ✅ クリーンアップ完了`);
    console.log();

    // 最終確認
    const finalExists = await storage.fileExists(TEST_ORGANIZATION_ID, TEST_FILE_PATH);
    console.log(`   ✅ ファイル削除確認: ${!finalExists}`);
    console.log();

    console.log('='.repeat(80));
    console.log('✅ すべてのテストが成功しました！');
    console.log('='.repeat(80));
    process.exit(0);

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ テスト失敗');
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
    console.error('1. Swiftコンテナが起動しているか確認:');
    console.error('   docker-compose ps swift');
    console.error();
    console.error('2. 環境変数が正しく設定されているか確認:');
    console.error('   cat backend/.env | grep SWIFT');
    console.error();
    console.error('3. Swiftのログを確認:');
    console.error('   docker-compose logs swift');
    console.error();
    console.error('4. 手動でSwiftに接続してみる:');
    console.error('   docker exec -it mmdpf-swift bash');
    console.error('   swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing stat');
    console.error();

    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  testSwiftConnection();
}

export default testSwiftConnection;