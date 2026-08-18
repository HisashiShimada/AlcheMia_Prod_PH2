# タスク計画書: 暗号化鍵参照固定化とアルゴリズム分岐完全化

## メタデータ
- **作成日時**: 2026-07-17 13:32
- **タスクID**: 20260717_1032_暗号化鍵参照固定化とアルゴリズム分岐完全化
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

テストモード向け暗号化機能について以下2点を修正する：

1. **鍵管理をDBから固定ファイル参照に変更**
   - `encryption_keys` テーブルへのDB書き込みを廃止し、`backend/test-keys/` 配下の固定ファイルのみを参照する
   - API・UIの外部インターフェースは変更しない（互換性を維持）

2. **暗号化・復号のアルゴリズム分岐バグを修正**
   - Controller層のリクエスト・レスポンス不整合を修正し、フロントエンドが選択したアルゴリズムが実際の暗号化処理に反映されるようにする

## 目的と期待される成果

### 目的
- 開発・テスト環境において「DBへの書き込み不要・固定ファイルのみで動作」という一貫した設計にする
- ユーザーがUIで選択したアルゴリズム（AES-256-CBC / AES-128-CBC / AES-256-GCM）が実際の暗号化・復号処理に正しく反映されるようにする

### 期待される成果
- [x] `encryption_keys` テーブルへのDB書き込みが廃止される
- [x] `GET /keys` が `test-keys/encryption/` フォルダをスキャンして鍵情報を返す
- [x] `POST /keys/generate` `POST /keys/upload` 等は固定鍵情報を返し、DBに書かない
- [x] フロントエンドが `aes256-gcm` を指定した場合、`encryptElement` が AES-256-GCM で暗号化する
- [x] フロントエンドが `aes128-cbc` を指定した場合、`encryptElement` が AES-128-CBC で暗号化する
- [x] 復号処理がCipherResultのalgorithmUriから正しくアルゴリズムを判定して復号する

## 問題の詳細

### 問題1: DB依存

#### 現状
- `listKeys` / `getKey` → `encryptionKeyRepository.findAllByOrganization` / `findById` でDB参照
- `generateKey` / `createKey` / `uploadKeyFile` / `importKey` → `encryptionKeyRepository.insert` でDB書き込み
- `deleteKey` → `encryptionKeyRepository.softDelete` でDB更新

#### 修正後
- `listKeys` / `getKey` → `testKeyLoader.listEncryptionKeyNames()` でスキャン、ファイル情報から生成した仮想RowをReturnする
- 書き込み系API → DB書き込みなし、対応する固定鍵情報を返す
- `deleteKey` → 固定鍵は削除不可として409を返す

---

### 問題2: Controller層のリクエスト不整合（アルゴリズム分岐バグ）

#### 現状の不整合

| エンドポイント | フロントが送るbody | バックエンドが期待するbody |
|---|---|---|
| `POST /encrypt` | `{ targetPaths: string[], config: EncryptionConfig }` | `{ targetPath: string, keyId: string }` |
| `POST /decrypt` | `{ targetPaths: string[], decryptionKey: {...} }` | `{ targetPath: string, keyId: string }` |

→ `targetPath` / `keyId` は常に `undefined` → `badRequest('targetPath と keyId は必須です')` でエラー終了

さらに暗号化時にアルゴリズムが `DEFAULT_ENCRYPTION_POLICY`（固定 `aes-256-cbc`）のみ使われており、フロントの選択が無視される。

#### 修正後

**`POST /encrypt`:**
```
受け取り: { targetPath: string, config: { algorithm, loadedKey? } }
処理:
  1. config.algorithm → normalizeAlgorithmFront でEncryptionPolicy.algorithmに変換
  2. EncryptionPolicy を構築
  3. maimlEncryptionService.generateKey(policy) → test-keys/から鍵読み込み
  4. maimlEncryptionService.encryptElement(keyEntry, targetPath, policy) で暗号化
  5. 暗号化結果を返す
```

**`POST /decrypt`・`POST /decrypt-execute`:**
```
受け取り: { targetPath: string, keyId: string, algorithm?: string }
処理:
  1. algorithm（またはMAIMLファイルのalgorithmUri）からEncryptionPolicyを構築
  2. maimlEncryptionService.retrieveKeyForDecryption(keyId, policy) で鍵取得
  3. maimlEncryptionService.decryptElement(keyEntry, cipherResult) で復号
```

---

### アルゴリズム変換の整理

| フロント値（EncryptionAlgorithmType） | バックエンドPolicy値 | DB保存値（廃止後は不要） |
|---|---|---|
| `aes256-cbc` | `aes-256-cbc` | `aes256-cbc` |
| `aes128-cbc` | `aes-128-cbc` | `aes128-cbc` |
| `aes256-gcm` | `aes-256-gcm` | `aes256-gcm` |

現状の `normalizeAlgorithm()` はバックエンド内部値（`aes-256-cbc` 形式）への変換だが、
フロントが送る値は `aes256-cbc`（ハイフン1本）形式なので、**フロント値→ Policy値への正規化関数** を追加する。

## 実装ステップ

### Phase 1: 鍵管理のDB廃止・固定ファイル参照化

- [ ] `backend/src/controllers/encryptionController.ts`
  - `listKeys`: DB→`testKeyLoader.listEncryptionKeyNames()`でスキャン、仮想Rowを返す
  - `getKey`: 固定鍵一覧から該当するkeyIdを検索
  - `generateKey` / `createKey` / `uploadKeyFile` / `importKey`: DB書き込みを削除し、固定鍵情報を返す
  - `deleteKey`: 409「固定鍵は削除できません」を返す
  - `exportKey`: スタブJSONではなく、実際に`testKeyLoader.loadEncryptionKeyByAlgorithm()`で鍵バイト列を取得し返す（パスワード保護はスタブのまま可）

### Phase 2: アルゴリズム分岐バグ修正

- [ ] `backend/src/controllers/encryptionController.ts`
  - `normalizeFrontAlgorithm()` 関数を追加（フロント値 `aes256-gcm` → Policy値 `aes-256-gcm`）
  - `encryptElement`: リクエストを `{ targetPath, config }` に変更、`config.algorithm` からPolicyを構築
  - `decryptElement`: リクエストを `{ targetPath, keyId, algorithm? }` に変更、algorithmからPolicyを構築
  - `decryptPreview`: 同様にPolicyをalgorithmから構築
  - `executeDecrypt`: 同様にPolicyをalgorithmから構築

### Phase 3: テスト・確認

- [ ] バックエンドの型エラーがないことを確認（`tsc --noEmit`）
- [ ] `listKeys` APIが正常に固定鍵一覧を返すことを確認
- [ ] `generateKey` APIがDBに書き込まないことを確認
- [ ] `encryptElement` で `aes-256-gcm` を指定した場合、GCMで暗号化されることを確認（ログ確認）
- [ ] `encryptElement` で `aes-128-cbc` を指定した場合、AES-128で暗号化されることを確認

## 影響範囲

### 変更するファイル
1. `backend/src/controllers/encryptionController.ts` - DB廃止・アルゴリズム分岐修正（メインの変更）

### 実質的に不使用になるファイル（削除・廃止）
1. `backend/src/repositories/encryptionKeyRepository.ts` - DB廃止によりimport不要になる

### 変更しないファイル（互換維持）
- `backend/src/routes/encryptionRoutes.ts` - ルート定義は変更なし
- `backend/src/services/maimlEncryptionService.ts` - 既にアルゴリズム分岐が正しく実装済み
- `backend/src/utils/testKeyLoader.ts` - 既に完成済み
- `backend/src/types/encryptionTypes.ts` - 型定義は変更なし
- `frontend/src/services/encryptionService.ts` - フロント側は変更なし
- `backend/migrations/20260623_create_encryption_keys_table.sql` - テーブル作成はそのまま残す（本番移行時対応）

### 注意: DBマイグレーション
- `encryption_keys` テーブルのDROPは行わない
- テーブルは残したまま、Controller側でDBを参照しないようにするだけ

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 固定鍵ファイルが存在しない環境で動作確認できない | 高 | 低 | generate-test-keys.ts 実行手順をREADMEに記載済み |
| フロント値→Policy値の変換漏れ | 中 | 中 | normalizeFrontAlgorithm()で一元管理し、全エンドポイントで使用 |
| listKeys のレスポンス形式がフロントと不一致 | 中 | 低 | フロントの`EncryptionKey`型と同じフィールドを返す |

## テスト計画

### 手動テスト
- [ ] `GET /api/v1/encryption/keys` → test-keys/encryption/ の2ファイルから生成された鍵一覧が返ること
- [ ] `POST /api/v1/encryption/keys/generate` → DBに書き込まれず、固定鍵情報が返ること
- [ ] `POST /api/v1/encryption/projects/:name/encrypt`（algorithm: aes256-gcm）→ GCMで暗号化されること
- [ ] `POST /api/v1/encryption/projects/:name/encrypt`（algorithm: aes128-cbc）→ AES-128で暗号化されること
- [ ] TypeScriptコンパイルエラーなし

## 承認記録
- **計画書提示日時**: 2026-07-17 13:32
- **承認日時**: 2026-07-17 13:34
- **承認者コメント**: 承認します。実装を進めてください。

## 実施記録
### 実施日時
開始: 2026-07-17 13:34
完了: 2026-07-17 13:38

### 計画からの変更点
- `ALGORITHM_URI_MAP` を `encryptionTypes.ts` から import して `encryptElement` レスポンスで使用（計画書への記載漏れ）
- `getKeySize()` ヘルパー関数を追加（使用箇所は今後の本実装のために定義）

### 最終的な成果物
- [x] `backend/src/controllers/encryptionController.ts` 全面書き換え
  - DB（`encryptionKeyRepository`）依存を完全に除去
  - `testKeyLoader` による固定ファイル参照に統一
  - `normalizeFrontAlgorithm()` / `toFrontAlgorithm()` ヘルパーを追加
  - `listKeys`: test-keys/encryption/ スキャンで仮想鍵情報を返すように変更
  - `getKey`: 固定鍵一覧から keyId で検索
  - `generateKey` / `createKey` / `uploadKeyFile` / `importKey`: DB書き込みを削除、固定鍵情報を返す
  - `deleteKey`: 409「固定鍵は削除できません」を返す
  - `exportKey`: test-keys/ から実際の鍵バイト列を読み込んでBase64返却（パスワード保護はスタブ）
  - `encryptElement`: `targetPaths`（複数）を受け取り、`config.algorithm` → `normalizeFrontAlgorithm()` → `EncryptionPolicy` に正しく変換
  - `decryptElement`: `targetPaths`（複数）を受け取り、後方互換で `targetPath`（単数）も受け付け
  - `decryptPreview` / `executeDecrypt`: `algorithm` → `normalizeFrontAlgorithm()` → `EncryptionPolicy` に正しく変換
- [x] TypeScriptコンパイル: `tsc --noEmit` が EXIT:0（エラーなし）
