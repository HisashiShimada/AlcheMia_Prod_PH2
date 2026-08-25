# タスク計画書: 秘匿化・改竄防止 テストモード実装

## メタデータ
- **作成日時**: 2026-07-17 09:13
- **タスクID**: 秘匿化改竄防止_テストモード実装
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

秘匿化（XML暗号化）および改竄防止（XML署名）機能について、  
`NODE_ENV` によるテストモード / 本番モードの切り替えを実装する。

テストモードでは `backend/test-keys/` 配下に配置した鍵ファイルを直接参照して  
実際のAES暗号化・RSA署名処理を実行できるようにする。  
本番モードでは鍵が取得できず no-op（スキップ＋メッセージ返却）となる設計。

## 方針サマリー

| 項目 | テストモード（NODE_ENV !== production） | 本番モード（NODE_ENV === production） |
|---|---|---|
| 鍵の取得先 | `backend/test-keys/encryption/*.key` （AES鍵バイト列） | 取得しない（null返却） |
| 暗号化/復号処理 | 実際のAES処理を実行 | スキップ、success:true + skipメッセージ |
| 署名鍵の取得先 | `backend/test-keys/signing/*.pem` （RSA秘密鍵） | 取得しない（null返却） |
| 署名/検証処理 | 実際のRSA署名処理を実行 | スキップ、success:true + skipメッセージ |
| タイムスタンプ | ローカル日時モック（変更なし） | 同左（変更なし） |
| 既存 encryption_keys テーブル | 使用しない（コントローラーから参照を除去） | 同左 |
| 公開鍵ラッピング（RSA鍵ラッピング） | TODO（本実装フェーズで対応） | 同左 |

## 実装ステップ

### Phase 1: 鍵ファイル読み込みユーティリティの作成
- [ ] `backend/test-keys/encryption/` ディレクトリ作成（.gitignoreに追加）
- [ ] `backend/test-keys/signing/` ディレクトリ作成
- [ ] `backend/src/utils/testKeyLoader.ts` を新規作成
  - `loadEncryptionKey(keyName: string): Promise<Buffer | null>` — テストモード時のみAES鍵を読み込む
  - `loadSigningKey(keyName: string): Promise<string | null>` — テストモード時のみRSA秘密鍵PEMを読み込む
  - 本番モード（`NODE_ENV === 'production'`）では常に `null` を返す

### Phase 2: maimlEncryptionService の修正
- [ ] `generateKey()` の `'local-dummy'` 分岐を削除し、`testKeyLoader.loadEncryptionKey()` を呼び出す `'local-file'` プロバイダに置き換え
- [ ] `EncryptionPolicy.keyProvider` の型に `'local-file'` を追加（`'local-dummy'` は削除またはdeprecated）
- [ ] `retrieveKeyForDecryption()` も同様に `testKeyLoader` を参照するよう修正
- [ ] `DEFAULT_ENCRYPTION_POLICY` の `keyProvider` を `'local-file'` に変更

### Phase 3: maimlIntegrityService の修正
- [ ] `ensureDummyKeyPair()` を削除し、`testKeyLoader.loadSigningKey()` を呼び出す方式に置き換え
- [ ] `IntegrityPolicy.signatureProvider` に `'local-file'` を追加（`'local-dummy'` はdeprecated）
- [ ] `DEFAULT_INTEGRITY_POLICY` の `signatureProvider` を `'local-file'` に変更

### Phase 4: encryptionController の修正
- [ ] `encryptElement`: `encryptionKeyRepository.updateUsage()` の呼び出しを削除
- [ ] `generateKeyHandler`（鍵生成API）: DBへの `encryptionKeyRepository.insert()` 呼び出しを削除、「テストモードでは test-keys/ にファイルを置いてください」というメッセージを返すように変更
- [ ] `importKey`（鍵インポートAPI）: 同様にDB保存を削除
- [ ] `listKeys` / `getKey` / `deleteKey`: DBへの依存を除去（空配列返却など）
- [ ] 各ハンドラに「本番モードスキップ」分岐を追加

### Phase 5: signatureController の修正
- [ ] 各ハンドラに「本番モードスキップ」分岐を追加

### Phase 6: テスト鍵ファイルの生成スクリプト作成
- [ ] `backend/scripts/generate-test-keys.ts` を新規作成
  - AES-256 鍵（32byte）を生成して `backend/test-keys/encryption/test-key.key` に保存
  - RSA-2048 鍵ペアを生成して `backend/test-keys/signing/test-key.pem` に保存
  - 使い方をREADMEに記載

### Phase 7: 動作確認・型チェック
- [ ] `npx tsc --noEmit` でコンパイルエラーがないことを確認

## 変更ファイル一覧

### 新規作成
1. `backend/src/utils/testKeyLoader.ts` — テストモード鍵読み込みユーティリティ
2. `backend/scripts/generate-test-keys.ts` — テスト鍵生成スクリプト
3. `backend/test-keys/.gitkeep` — ディレクトリ保持用（中身はgitignore）

### 修正
1. `backend/src/services/maimlEncryptionService.ts` — local-dummy → local-file への移行
2. `backend/src/services/maimlIntegrityService.ts` — local-dummy → local-file への移行
3. `backend/src/types/encryptionTypes.ts` — EncryptionPolicy.keyProvider 型追加
4. `backend/src/types/integrityTypes.ts` — IntegrityPolicy.signatureProvider 型追加
5. `backend/src/controllers/encryptionController.ts` — DB依存除去・no-op分岐追加
6. `backend/src/controllers/signatureController.ts` — no-op分岐追加
7. `.gitignore` — backend/test-keys/ 配下の鍵ファイルを除外

## リスク

| リスク | 対策 |
|---|---|
| test-keys/ の鍵ファイルが誤ってコミットされる | .gitignore で除外（.key / .pem を除外） |
| 本番モード判定が誤る | `NODE_ENV === 'production'` で統一し、テストでも確認 |
| encryption_keys テーブル参照除去で既存APIが壊れる | コントローラーごとにスタブ/空レスポンスに置き換える |

## 承認記録
- **計画書提示日時**: 2026-07-17 09:13
- **承認日時**: 2026-07-17 09:13
- **承認者コメント**: 鍵の件については後々整理するのでこの方針で進める
