/// <reference types="node" />

/**
 * テスト用鍵ファイル生成スクリプト
 *
 * @description
 * `backend/test-keys/` 配下にテスト用の AES 暗号化鍵と RSA 署名鍵を生成する。
 * 生成されたファイルは gitignore されているため、各開発環境で1回実行する必要がある。
 *
 * @usage
 *   npx ts-node backend/scripts/generate-test-keys.ts
 *
 * @output
 *   backend/test-keys/
 *     encryption/
 *       test-encryption-key-aes256.key  ← AES-256-CBC / AES-256-GCM 鍵（32 bytes raw binary）
 *       test-encryption-key-aes128.key  ← AES-128-CBC 鍵（16 bytes raw binary）
 *     signing/
 *       test-signing-key.pem      ← RSA-2048 秘密鍵（PKCS#8 PEM）
 *       test-signing-key.pub.pem  ← RSA-2048 公開鍵（SPKI PEM）
 *
 * @note
 *   後方互換のため旧ファイル名 `test-encryption-key.key`（32 bytes）も引き続き生成される。
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TEST_KEYS_DIR = path.resolve(__dirname, '../test-keys');
const ENCRYPTION_DIR = path.join(TEST_KEYS_DIR, 'encryption');
const SIGNING_DIR = path.join(TEST_KEYS_DIR, 'signing');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[generate-test-keys] ディレクトリを作成しました: ${dirPath}`);
  }
}

function generateEncryptionKey(): void {
  // -----------------------------------------------------------------------
  // AES-256 用鍵（32 bytes）: AES-256-CBC / AES-256-GCM 共用
  // -----------------------------------------------------------------------
  const aes256Path = path.join(ENCRYPTION_DIR, 'test-encryption-key-aes256.key');
  if (fs.existsSync(aes256Path)) {
    console.log(`[generate-test-keys] AES-256 鍵は既に存在します（スキップ）: ${aes256Path}`);
  } else {
    const key256 = crypto.randomBytes(32);
    fs.writeFileSync(aes256Path, key256);
    console.log(`[generate-test-keys] ✅ AES-256 鍵を生成しました: ${aes256Path} (${key256.length} bytes)`);
  }

  // -----------------------------------------------------------------------
  // AES-128 用鍵（16 bytes）: AES-128-CBC 用
  // -----------------------------------------------------------------------
  const aes128Path = path.join(ENCRYPTION_DIR, 'test-encryption-key-aes128.key');
  if (fs.existsSync(aes128Path)) {
    console.log(`[generate-test-keys] AES-128 鍵は既に存在します（スキップ）: ${aes128Path}`);
  } else {
    const key128 = crypto.randomBytes(16);
    fs.writeFileSync(aes128Path, key128);
    console.log(`[generate-test-keys] ✅ AES-128 鍵を生成しました: ${aes128Path} (${key128.length} bytes)`);
  }

  // -----------------------------------------------------------------------
  // 後方互換: 旧ファイル名（test-encryption-key.key, 32 bytes）
  // testKeyLoader の fallback として引き続き使用可能
  // -----------------------------------------------------------------------
  const legacyPath = path.join(ENCRYPTION_DIR, 'test-encryption-key.key');
  if (fs.existsSync(legacyPath)) {
    console.log(`[generate-test-keys] 旧鍵ファイルは既に存在します（スキップ）: ${legacyPath}`);
  } else {
    const legacyKey = crypto.randomBytes(32);
    fs.writeFileSync(legacyPath, legacyKey);
    console.log(`[generate-test-keys] ✅ 旧互換鍵を生成しました: ${legacyPath} (${legacyKey.length} bytes)`);
  }
}

function generateSigningKeyPair(): void {
  const privateKeyPath = path.join(SIGNING_DIR, 'test-signing-key.pem');
  const publicKeyPath = path.join(SIGNING_DIR, 'test-signing-key.pub.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    console.log(`[generate-test-keys] 署名鍵は既に存在します（スキップ）: ${privateKeyPath}`);
    return;
  }

  // RSA-2048 鍵ペアを生成
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

  console.log(`[generate-test-keys] ✅ 署名秘密鍵を生成しました: ${privateKeyPath}`);
  console.log(`[generate-test-keys] ✅ 署名公開鍵を生成しました: ${publicKeyPath}`);
}

function main(): void {
  console.log('[generate-test-keys] テスト用鍵ファイルの生成を開始します...');
  console.log(`[generate-test-keys] 出力先: ${TEST_KEYS_DIR}`);
  console.log('');

  ensureDir(TEST_KEYS_DIR);
  ensureDir(ENCRYPTION_DIR);
  ensureDir(SIGNING_DIR);

  generateEncryptionKey();
  generateSigningKeyPair();

  console.log('');
  console.log('[generate-test-keys] 完了しました。');
  console.log('[generate-test-keys] ⚠️  生成された鍵ファイルは gitignore されています。本番環境には絶対に使用しないでください。');
}

main();
