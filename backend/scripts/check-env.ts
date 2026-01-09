/**
 * 環境変数読み込み確認スクリプト
 * 
 * backend/.envファイルが正しく読み込まれているかを確認します
 */

import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('='.repeat(80));
console.log('環境変数読み込み確認');
console.log('='.repeat(80));
console.log();

// 基本設定
console.log('【基本設定】');
console.log(`NODE_ENV: ${process.env.NODE_ENV || '(未設定)'}`);
console.log(`PORT: ${process.env.PORT || '(未設定)'}`);
console.log();

// データベース設定
console.log('【データベース設定】');
console.log(`DB_HOST: ${process.env.DB_HOST || '(未設定)'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || '(未設定)'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || '(未設定)'}`);
console.log(`DB_USER: ${process.env.DB_USER || '(未設定)'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***設定済み***' : '(未設定)'}`);
console.log();

// JWT設定
console.log('【JWT設定】');
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***設定済み***' : '(未設定)'}`);
console.log(`JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || '(未設定)'}`);
console.log();

// Session設定
console.log('【セッション設定】');
console.log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? '***設定済み***' : '(未設定)'}`);
console.log();

// ストレージ設定
console.log('【ストレージ設定】');
console.log(`STORAGE_TYPE: ${process.env.STORAGE_TYPE || '(未設定)'}`);
console.log();

// OpenStack Swift設定
console.log('【OpenStack Swift設定】');
console.log(`SWIFT_AUTH_URL: ${process.env.SWIFT_AUTH_URL || '(未設定)'}`);
console.log(`SWIFT_USERNAME: ${process.env.SWIFT_USERNAME || '(未設定)'}`);
console.log(`SWIFT_PASSWORD: ${process.env.SWIFT_PASSWORD ? '***設定済み***' : '(未設定)'}`);
console.log(`SWIFT_ACCOUNT: ${process.env.SWIFT_ACCOUNT || '(未設定)'}`);
console.log(`SWIFT_CONTAINER: ${process.env.SWIFT_CONTAINER || '(未設定)'}`);
console.log();

// S3互換API設定
console.log('【S3互換API設定】');
console.log(`USE_S3_COMPATIBLE_API: ${process.env.USE_S3_COMPATIBLE_API || '(未設定)'}`);
console.log(`S3_ENDPOINT: ${process.env.S3_ENDPOINT || '(未設定)'}`);
console.log(`S3_ACCESS_KEY_ID: ${process.env.S3_ACCESS_KEY_ID || '(未設定)'}`);
console.log(`S3_SECRET_ACCESS_KEY: ${process.env.S3_SECRET_ACCESS_KEY ? '***設定済み***' : '(未設定)'}`);
console.log(`S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || '(未設定)'}`);
console.log(`S3_REGION: ${process.env.S3_REGION || '(未設定)'}`);
console.log(`S3_FORCE_PATH_STYLE: ${process.env.S3_FORCE_PATH_STYLE || '(未設定)'}`);
console.log();

// CORS設定
console.log('【CORS設定】');
console.log(`CORS_ORIGIN: ${process.env.CORS_ORIGIN || '(未設定)'}`);
console.log();

// ログ設定
console.log('【ログ設定】');
console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || '(未設定)'}`);
console.log(`LOG_DIR: ${process.env.LOG_DIR || '(未設定)'}`);
console.log();

// 検証
console.log('='.repeat(80));
console.log('検証結果');
console.log('='.repeat(80));
console.log();

const errors: string[] = [];
const warnings: string[] = [];

// 必須項目のチェック
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-jwt-secret-key-here-change-in-production') {
  errors.push('JWT_SECRET が未設定または例示値のままです');
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-session-secret-key-here-change-in-production') {
  errors.push('SESSION_SECRET が未設定または例示値のままです');
}

if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'mmdpf_password') {
  warnings.push('DB_PASSWORD がデフォルト値のままです（開発環境ではOK）');
}

// ストレージ設定のチェック
if (!process.env.STORAGE_TYPE) {
  errors.push('STORAGE_TYPE が未設定です');
} else if (process.env.STORAGE_TYPE === 'swift') {
  if (!process.env.SWIFT_AUTH_URL) {
    errors.push('SWIFT_AUTH_URL が未設定です');
  }
  if (!process.env.SWIFT_USERNAME) {
    errors.push('SWIFT_USERNAME が未設定です');
  }
  if (!process.env.SWIFT_PASSWORD) {
    errors.push('SWIFT_PASSWORD が未設定です');
  }
  if (!process.env.SWIFT_CONTAINER) {
    errors.push('SWIFT_CONTAINER が未設定です');
  }
  
  // S3互換API設定のチェック
  if (process.env.USE_S3_COMPATIBLE_API === 'true') {
    if (!process.env.S3_ENDPOINT) {
      errors.push('S3_ENDPOINT が未設定です');
    }
    if (!process.env.S3_ACCESS_KEY_ID) {
      errors.push('S3_ACCESS_KEY_ID が未設定です');
    }
    if (!process.env.S3_SECRET_ACCESS_KEY) {
      errors.push('S3_SECRET_ACCESS_KEY が未設定です');
    }
  }
} else if (process.env.STORAGE_TYPE === 's3') {
  if (!process.env.AWS_REGION) {
    errors.push('AWS_REGION が未設定です');
  }
  if (!process.env.AWS_ACCESS_KEY_ID) {
    errors.push('AWS_ACCESS_KEY_ID が未設定です');
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    errors.push('AWS_SECRET_ACCESS_KEY が未設定です');
  }
  if (!process.env.AWS_S3_BUCKET) {
    errors.push('AWS_S3_BUCKET が未設定です');
  }
}

// 結果表示
if (errors.length > 0) {
  console.log('❌ エラー:');
  errors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error}`);
  });
  console.log();
}

if (warnings.length > 0) {
  console.log('⚠️  警告:');
  warnings.forEach((warning, index) => {
    console.log(`  ${index + 1}. ${warning}`);
  });
  console.log();
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ すべての環境変数が正しく設定されています！');
  console.log();
} else if (errors.length === 0) {
  console.log('✅ 必須の環境変数は設定されています（警告あり）');
  console.log();
}

// StorageServiceの初期化テスト
console.log('='.repeat(80));
console.log('StorageServiceの初期化テスト');
console.log('='.repeat(80));
console.log();

try {
  // 動的インポート
  const { getStorageService } = require('../src/services/storageService');
  
  console.log('StorageServiceをインポート中...');
  const storage = getStorageService();
  
  console.log(`✅ StorageService初期化成功`);
  console.log(`   ストレージタイプ: ${storage.getStorageType()}`);
  console.log(`   バケット/コンテナ: ${storage.getBucketName()}`);
  console.log();
  
  if (errors.length === 0) {
    console.log('='.repeat(80));
    console.log('✅ 環境変数は正しく読み込まれ、StorageServiceも正常に動作します！');
    console.log('='.repeat(80));
    process.exit(0);
  } else {
    console.log('='.repeat(80));
    console.log('⚠️  環境変数にエラーがありますが、StorageServiceは初期化できました');
    console.log('='.repeat(80));
    process.exit(1);
  }
} catch (error: any) {
  console.log('❌ StorageServiceの初期化に失敗しました');
  console.log(`   エラー: ${error.message}`);
  console.log();
  console.log('スタックトレース:');
  console.log(error.stack);
  console.log();
  console.log('='.repeat(80));
  console.log('❌ 環境変数の設定を確認してください');
  console.log('='.repeat(80));
  process.exit(1);
}