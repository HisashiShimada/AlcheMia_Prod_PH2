# タスク計画書: 暗号化設定画面整理

## メタデータ
- **作成日時**: 2026-06-23 09:31
- **タスクID**: encryption-config-panel-refactor
- **優先度**: 高
- **推定工数**: 4時間

---

## タスク概要

`EncryptionConfigPanel.tsx` の設定項目を仕様書に基づいて整理・追加する。
現状実装と仕様書の乖離を埋め、秘匿レベル選択・鍵設定UI刷新・UPA制約チェック・insertion警告を実装する。
あわせてバックエンドAPIスタブを追加し、本実装フェーズへの移行を準備する。

---

## 目的と期待される成果

- [x] 設定項目の仕様書との差分を整理（計画フェーズ完了）
- [ ] 秘匿レベル選択（自動/L1/L2）UIが動作する
- [ ] 暗号化アルゴリズムが3択＋脆弱版グレーアウトで表示される
- [ ] 鍵設定UIが「鍵ソース選択＋識別子表示＋消去ボタン」構成になる
- [ ] UPA制約チェック結果が表示される（L2選択時のみ）
- [ ] insertion警告が表示される（該当ノード選択時のみ）
- [ ] バックエンドAPIスタブが実装される

---

## 確定仕様

### 秘匿レベル選択

| 値 | ラベル | 動作 |
|---|---|---|
| `auto` | 自動選択（推奨） | グローバル要素→L1、property/content→L2 |
| `l1` | L1: グローバル要素全体 | UUID以外を一括暗号化 |
| `l2` | L2: データコンテナのコンテンツのみ | 汎用データコンテナのコンテンツを暗号化 |

### 暗号化アルゴリズム

| 選択肢 | 状態 |
|---|---|
| AES-256-CBC | ✅ デフォルト |
| AES-128-CBC | ✅ 選択可 |
| AES-256-GCM | ✅ 選択可 |
| AES-192-CBC | 🔒 グレーアウト（脆弱） |
| Triple DES-CBC | 🔒 グレーアウト（脆弱） |
| RSA-OAEP | 🔒 グレーアウト（脆弱） |

### 鍵設定

**鍵ソース選択（Radio Button）：**
- 新しい共通鍵を設定 → AES-256鍵をランダム生成 → `.key`形式で保存
- 既存キーファイルを読み込む → `.key` / `.pem` / `.pfx` 形式
- 非対称鍵（受信者公開鍵） → `.pem` / `.cer` 形式

**鍵識別子表示：**
- 設定済み：`現在の鍵: {SHA-256の先頭16文字}` ＋ `[鍵を消去]` ボタン（緑色Alert）
- 未設定：`⚠ 鍵が設定されていません（暗号化を実行できません）`（オレンジ色Alert）

**鍵の保存先：** ファイルサーバ（S3/Swift）

### UPA制約チェック

- **表示条件：** 秘匿レベル = L2 かつ グローバル要素内の一部の property/content を選択時
- **違反時：** ダイアログで「分割ウィザードを開く」または「このまま続ける」を選択

### insertion警告

- **表示条件：** 選択ノードの子要素に `<insertion>` が含まれる場合
- `⚠ この要素には挿入履歴（insertion）が含まれています。暗号化すると履歴が参照できなくなります。`

---

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] `docs/20260623_0931_暗号化設定画面整理/PLAN.md` 作成

### Phase 2: バックエンドDB設計
- [ ] `backend/migrations/20260623_create_encryption_keys_table.sql` マイグレーションSQL作成

### Phase 3: バックエンド型定義・Repository・Service（スタブ）
- [ ] `backend/src/types/encryptionTypes.ts` 型定義追加
- [ ] `backend/src/repositories/encryptionKeyRepository.ts` Repositoryスタブ作成
- [ ] `backend/src/services/encryptionKeyService.ts` Serviceスタブ作成

### Phase 4: バックエンドAPI（スタブ）
- [ ] `backend/src/controllers/encryptionController.ts` エンドポイント追加
  - `POST /keys/generate` - AES-256鍵生成
  - `POST /keys/upload` - 鍵ファイルアップロード
  - `GET /keys` - 鍵一覧取得
  - `DELETE /keys/:keyId` - 鍵削除
  - `POST /upa-check` - UPA制約チェック
  - `GET /check-insertion/:projectName/:nodePath` - insertion存在確認
- [ ] `backend/src/routes/encryptionRoutes.ts` ルート追加

### Phase 5: フロントエンド型定義更新
- [ ] `frontend/src/types/encryption.ts` 更新
  - `EncryptionLevel` 定数追加
  - `KeySource` 定数追加（keyMethod定数を置き換え）
  - `LoadedKeyInfo` インターフェース追加
  - `UpaCheckResult` インターフェース追加
  - `EncryptionConfig` 更新（encryptionLevel / keySource / loadedKey）
  - `MaimlTreeNode` 更新（hasInsertion / upaCheckResult / nodeType）
  - `DEFAULT_ENCRYPTION_CONFIG` 更新

### Phase 6: フロントエンドサービス更新
- [ ] `frontend/src/services/encryptionService.ts` 更新
  - `generateNewKey()` 追加
  - `uploadKeyFile()` 追加
  - `deleteKey()` 追加
  - `checkUpaConstraints()` 追加
  - `checkInsertion()` 追加

### Phase 7: EncryptionConfigPanel 全面改修
- [ ] `frontend/src/components/encryption/EncryptionConfigPanel.tsx` 更新
  - 秘匿レベル選択（Radio.Group）追加
  - アルゴリズム選択を3択＋グレーアウト方式に変更
  - 鍵設定UIを全面刷新
  - UPA制約チェック結果表示エリア追加
  - insertion警告Alert追加

### Phase 8: 新規コンポーネント作成
- [ ] `frontend/src/components/encryption/SplitWizardModal.tsx` 新規作成
  - UPA制約違反時の分割ウィザードモーダル（簡易版）

---

## 変更・新規ファイル一覧

### バックエンド（新規作成）
1. `backend/migrations/20260623_create_encryption_keys_table.sql`
2. `backend/src/types/encryptionTypes.ts`
3. `backend/src/repositories/encryptionKeyRepository.ts`
4. `backend/src/services/encryptionKeyService.ts`

### バックエンド（修正）
1. `backend/src/controllers/encryptionController.ts`
2. `backend/src/routes/encryptionRoutes.ts`

### フロントエンド（新規作成）
1. `frontend/src/components/encryption/SplitWizardModal.tsx`

### フロントエンド（修正）
1. `frontend/src/types/encryption.ts`
2. `frontend/src/services/encryptionService.ts`
3. `frontend/src/components/encryption/EncryptionConfigPanel.tsx`

---

## 技術仕様

### バックエンドAPIエンドポイント一覧

| メソッド | パス | 説明 | 実装状態 |
|---|---|---|---|
| POST | `/api/v1/encryption/keys/generate` | AES-256鍵生成 | スタブ |
| POST | `/api/v1/encryption/keys/upload` | 鍵ファイルアップロード | スタブ |
| GET | `/api/v1/encryption/keys` | 鍵一覧取得 | スタブ |
| DELETE | `/api/v1/encryption/keys/:keyId` | 鍵削除 | スタブ |
| POST | `/api/v1/encryption/upa-check` | UPA制約チェック | スタブ |
| GET | `/api/v1/encryption/check-insertion/:projectName/:nodePath` | insertion確認 | スタブ |

### DBテーブル

**`encryption_keys`**
- `key_id` UUID PK
- `organization_id` UUID FK
- `key_name` VARCHAR
- `key_identifier` VARCHAR(16) - SHA-256の先頭16文字
- `algorithm` VARCHAR
- `key_source` VARCHAR - 'new_key' / 'load_file' / 'public_key'
- `file_path` TEXT - S3/Swiftのパス
- `file_name` VARCHAR
- `file_size` INTEGER
- `is_active` BOOLEAN
- `created_by` UUID FK
- `created_at` TIMESTAMP
- `expires_at` TIMESTAMP NULL
- `last_used_at` TIMESTAMP NULL
- `usage_count` INTEGER
- `description` TEXT

### 鍵ソースと対応ファイル形式

| 鍵ソース | 対応形式 | 説明 |
|---|---|---|
| `new_key` | `.key` | AES-256をランダム生成 |
| `load_file` | `.key` / `.pem` / `.pfx` | 既存の共通鍵 |
| `public_key` | `.pem` / `.cer` | 受信者の公開鍵 |

### 本実装フェーズへの移行ポイント（TODO箇所）

**鍵生成（generateKey）:**
- `crypto.randomBytes(32)` でAES-256鍵生成
- `crypto.createHash('sha256')` でSHA-256ハッシュ計算
- `storageService.uploadFile()` でS3/Swiftに保存
- `encryptionKeyRepository.insert()` でDB登録

**鍵ファイルアップロード（uploadKeyFile）:**
- `multer` でファイル受け取り
- ファイル形式バリデーション
- SHA-256ハッシュ計算
- S3/Swiftへの保存

**UPA制約チェック（checkUpaConstraints）:**
- MAIMLファイルのパース
- XPathで対象要素取得
- XSDスキーマのUPA制約検証
- 違反要素リストの返却

**insertionチェック（checkInsertion）:**
- MAIMLファイルのパース
- XPathで対象ノードの子要素を検索
- `<insertion>` 要素の存在確認

---

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| UPA制約チェックのロジックが複雑 | 高 | スタブで固定値を返し、本実装は別タスクで対応 |
| 鍵ファイル形式の多様性（.pfx等） | 中 | ファイル受け付けはマルチフォーマット対応、パースは本実装時 |
| `EncryptionConfig`型変更による既存コードへの影響 | 中 | 段階的に移行し、不要なフィールドは削除ではなくdeprecated扱い |
| 鍵識別子計算（フロントエンド側） | 低 | `crypto.subtle.digest`（Web Crypto API）で対応可能 |

---

## 承認記録
- **計画書提示日時**: 2026-06-23 09:31
- **承認日時**: 2026-06-23 09:31（実装開始承認済み）

---

## 実施記録

### 実施日時
開始: 2026-06-23 09:31
完了: （作業中）

### 計画からの変更点
（作業中に記録）

### 最終的な成果物
（作業完了後に記録）
