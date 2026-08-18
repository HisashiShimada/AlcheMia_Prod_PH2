# 鍵ローテーション 実装設計書

**作成日**: 2026-06-24  
**ステータス**: 検討中（未確定）  
**関連タスク**: docs/20260624_0934_鍵管理画面仕様変更/PLAN.md

---

## 1. 概要

鍵ローテーションとは、**ある暗号化鍵（旧鍵）で暗号化された全ての EncryptedData を、新しい鍵（新鍵）で再暗号化する処理**。

### 1.1 なぜ必要か

- 鍵の有効期限切れ対応
- セキュリティインシデント発生時の鍵の無効化
- 定期的な鍵更新（セキュリティベストプラクティス）

### 1.2 処理の対象

**⚠ 重要な前提:**

- 暗号化データは `maiml_element` テーブル（公開用DB）ではなく、**S3/Swift に保存された MAIML ファイル自体**が対象
- `file_metadata` テーブルに暗号化情報（鍵名など）は現在記録されていない
- 1 ファイル内に複数の EncryptedData が存在し、異なる鍵で暗号化されている可能性がある
- 旧鍵で暗号化されたファイルを特定するには、**全 MAIML ファイルをスキャン**する必要がある

### 1.3 処理の複雑さ

- 対象ファイルの特定に全ファイルスキャンが必要（処理時間が長い）
- 同期処理は不可能 → **バックグラウンドジョブが必須**
- ファイルの部分的な再暗号化（旧鍵の EncryptedData のみ対象）
- 処理失敗時のロールバック設計が必要

---

## 2. データ構造確認

### 2.1 file_metadata テーブル

```sql
-- 現状: 暗号化情報（鍵名・暗号化有無）は記録されていない
SELECT file_id, organization_id, file_path, file_type, ...
FROM file_metadata
WHERE organization_id = $1;
-- → 全 MAIML ファイルのリストは取得できる
-- → しかし、どの鍵で暗号化されているかは不明
```

### 2.2 S3/Swift のファイル配置

```
{organization_id}/
├── projects/
│   └── {project_name}/
│       ├── {project_name}.maiml    ← 対象
│       └── archive/
│           ├── {project_name}_v1.maiml  ← 対象（アーカイブも含む？）
│           └── {project_name}_v2.maiml  ← 対象（アーカイブも含む？）
└── formats/
    └── {dept_cd}/
        └── {folder}/
            └── *.maiml              ← 対象（フォーマットも含む？）
```

**⚠ 確認が必要な事項:**
- アーカイブファイル（archive/）も対象か？
- フォーマットファイル（formats/）も対象か？

### 2.3 MAIML ファイル内の EncryptedData 構造

1 ファイル内に複数の EncryptedData が存在し、異なる鍵の混在も想定：

```xml
<maiml xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"
       xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <data>
    <!-- 鍵Aで暗号化 -->
    <xenc:EncryptedData Type="...">
      <ds:KeyInfo>
        <ds:KeyName>key-A-2025</ds:KeyName>
      </ds:KeyInfo>
      <xenc:CipherData>
        <xenc:CipherValue>AAAA...</xenc:CipherValue>
      </xenc:CipherData>
    </xenc:EncryptedData>

    <!-- 鍵Bで暗号化（別の鍵！） -->
    <xenc:EncryptedData Type="...">
      <ds:KeyInfo>
        <ds:KeyName>key-B-2026</ds:KeyName>
      </ds:KeyInfo>
      <xenc:CipherData>
        <xenc:CipherValue>BBBB...</xenc:CipherValue>
      </xenc:CipherData>
    </xenc:EncryptedData>
  </data>

</maiml>
```

**ローテーション対象:** KeyName が旧鍵名と一致する EncryptedData のみ再暗号化

---

## 3. 全ファイルスキャン方式

### 3.1 処理フロー

```
Phase 1: 対象ファイルのスキャン
───────────────────────────────
1. file_metadata テーブルから全 MAIML ファイルの一覧を取得
   WHERE organization_id = $1
     AND file_type = 'maiml'（または拡張子 = '.maiml'）

2. 各ファイルを S3/Swift から取得（100件ずつバッチ処理）

3. XML パースして <xenc:EncryptedData> 要素を全件取得

4. 各 EncryptedData の <ds:KeyName> を抽出

5. 旧鍵名（old_key_name）と一致するものを検出

6. 対象ファイルリストと対象 EncryptedData の件数を集計

Phase 2: 再暗号化実行
──────────────────────
7. 対象ファイルごとに処理（1件ずつ、失敗時は継続）:
   a. S3/Swift からファイルを取得
   b. XML をパース
   c. KeyName = 旧鍵名の EncryptedData を全て再暗号化
      - CipherValue を旧鍵で復号化
      - 新 IV を生成して新鍵で再暗号化
      - CipherValue を更新
      - KeyName を新鍵名に更新
   d. XML を再構築
   e. S3/Swift に上書き保存（元ファイルを上書き）
   f. 処理済みカウントを更新

8. 全件完了 → ジョブステータスを 'completed' に更新
```

### 3.2 スキャンの代替案

#### 案1: file_metadata 全件スキャン（現状唯一の方法）

```typescript
// file_metadata から全 MAIML ファイルを取得
const maimlFiles = await db.any(
  `SELECT file_id, file_path
   FROM file_metadata
   WHERE organization_id = $1
     AND file_path LIKE '%.maiml'`,
  [organizationId]
);
// 全件を S3/Swift からダウンロードして XML パース
```

**特徴:**
- ✅ 現状で唯一の確実な方法
- ❌ ファイル数が多いと処理時間が長い
- ❌ S3/Swift アクセス数が多い

#### 案2: S3/Swift オブジェクト一覧からスキャン（代替）

```typescript
// storageService.listFiles() で *.maiml ファイルを列挙
const allFiles = await storageService.listFiles(
  organizationId,
  'projects',         // または全パス
);
const maimlFiles = allFiles.filter(f => f.key.endsWith('.maiml'));
```

**特徴:**
- ✅ file_metadata に依存しない
- ❌ S3/Swift API コール数が多い
- ❌ アーカイブ・フォーマット配下も含まれる

#### 案3: file_metadata に暗号化情報カラムを追加（将来的な最適化）

```sql
-- マイグレーション追加（将来実装）
ALTER TABLE file_metadata
  ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE,
  ADD COLUMN encryption_key_names TEXT[];  -- 使用している鍵名の配列

CREATE INDEX ix_file_metadata_is_encrypted
  ON file_metadata(organization_id, is_encrypted)
  WHERE is_encrypted = TRUE;

-- 検索（高速・ピンポイント）
SELECT file_id, file_path
FROM file_metadata
WHERE organization_id = $1
  AND is_encrypted = TRUE
  AND $2 = ANY(encryption_key_names);
```

**特徴:**
- ✅ 検索が高速・ピンポイント
- ✅ S3/Swift アクセス数を最小化
- ❌ テーブル変更が必要
- ❌ 既存ファイルの情報移行スクリプトが必要
- ❌ 暗号化時に file_metadata を更新する実装が必要

---

## 4. 実装方針（バックグラウンドジョブ）

### 4.1 全体アーキテクチャ

```
[クライアント]
     |
     | POST /api/v1/encryption/keys/:keyId/rotate
     ↓
[バックエンド: encryptionController.ts]
  1. 旧鍵情報を encryption_keys テーブルから取得
  2. 新しい鍵を生成（または既存鍵を指定）
  3. key_rotation_job テーブルにジョブを登録
  4. { jobId } を返す
     |
     | （非同期）
     ↓
[バックグラウンドワーカー: keyRotationWorker.ts]
  Phase 1: スキャン
    1. file_metadata から全 MAIML ファイルを取得
    2. バッチで S3/Swift からダウンロード・XMLパース
    3. 対象 EncryptedData を特定
    4. total_count を更新

  Phase 2: 再暗号化
    5. 対象ファイルを 1 件ずつ処理
    6. 部分的再暗号化（旧鍵の EncryptedData のみ）
    7. S3/Swift に上書き保存
    8. processed_count を更新
     |
     | GET /api/v1/encryption/keys/rotate/:jobId/progress
     ↓
[クライアント: KeyRotateModal.tsx]
  - 進捗バーを表示（processed_count / total_count）
  - 完了時にモーダルを閉じてリストを更新
```

### 4.2 key_rotation_job テーブル

```sql
-- マイグレーション: create_key_rotation_job.sql
CREATE TABLE key_rotation_job (
  job_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL,
  old_key_id          TEXT NOT NULL,
  old_key_name        TEXT NOT NULL,   -- EncryptedData の KeyName と照合
  new_key_id          TEXT NOT NULL,
  new_key_name        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' / 'scanning' / 'running' / 'completed' / 'failed' / 'cancelled'
  scan_total          INT DEFAULT 0,   -- スキャン対象ファイル数
  scan_processed      INT DEFAULT 0,   -- スキャン済みファイル数
  target_file_count   INT DEFAULT 0,   -- 再暗号化対象ファイル数
  target_element_count INT DEFAULT 0,  -- 再暗号化対象 EncryptedData 数
  processed_count     INT DEFAULT 0,   -- 再暗号化済みファイル数
  error_message       TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at          TIMESTAMP WITH TIME ZONE,
  completed_at        TIMESTAMP WITH TIME ZONE
);

CREATE INDEX ix_key_rotation_job_org_status
  ON key_rotation_job(organization_id, status);
```

### 4.3 バックグラウンドジョブ基盤

既存の `backend/src/queues/` を確認して統一することを推奨。

**暫定案: `setInterval` + `key_rotation_job` テーブルのポーリング**

```typescript
// backend/src/workers/keyRotationWorker.ts
const POLL_INTERVAL_MS = 5000;  // 5秒ごとにジョブ確認

export function startKeyRotationWorker() {
  setInterval(async () => {
    // pending なジョブを1件取得して処理
    const job = await db.oneOrNone(
      `UPDATE key_rotation_job
       SET status = 'scanning', started_at = NOW()
       WHERE job_id = (
         SELECT job_id FROM key_rotation_job
         WHERE status = 'pending'
         ORDER BY created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    if (job) await processRotationJob(job);
  }, POLL_INTERVAL_MS);
}
```

---

## 5. 再暗号化処理の詳細

### 5.1 対象 EncryptedData の識別

```typescript
function findEncryptedDataElements(xmlDoc: Document, oldKeyName: string): Element[] {
  const encDataElements = xmlDoc.getElementsByTagNameNS(
    'http://www.w3.org/2001/04/xmlenc#', 'EncryptedData'
  );

  return Array.from(encDataElements).filter((el) => {
    const keyNames = el.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#', 'KeyName'
    );
    return Array.from(keyNames).some(kn => kn.textContent?.trim() === oldKeyName);
  });
}
```

### 5.2 再暗号化処理

```typescript
async function reencryptElement(
  encDataEl: Element,
  oldKeyMaterial: Buffer,  // 旧鍵の生素材（32バイト AES-256）
  newKeyMaterial: Buffer,  // 新鍵の生素材（32バイト AES-256）
  newKeyName: string
): Promise<void> {
  // 1. CipherValue を取得
  const cipherValueEl = encDataEl.getElementsByTagNameNS(
    'http://www.w3.org/2001/04/xmlenc#', 'CipherValue'
  )[0];
  const encryptedBytes = Buffer.from(cipherValueEl.textContent!.trim(), 'base64');

  // 2. AES-256-CBC: 先頭16バイトが IV（W3C XML Encryption 仕様）
  const iv = encryptedBytes.subarray(0, 16);
  const ciphertext = encryptedBytes.subarray(16);

  // 3. 旧鍵で復号化
  const decipher = crypto.createDecipheriv('aes-256-cbc', oldKeyMaterial, iv);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // 4. 新 IV を生成して新鍵で再暗号化
  const newIv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', newKeyMaterial, newIv);
  const reencrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  // 5. IV + 暗号文を結合（W3C XML Encryption 仕様に従い先頭に IV を付与）
  const newCipherValue = Buffer.concat([newIv, reencrypted]).toString('base64');

  // 6. XML を更新
  cipherValueEl.textContent = newCipherValue;

  // 7. KeyName を新鍵名に更新
  const keyNameEls = encDataEl.getElementsByTagNameNS(
    'http://www.w3.org/2000/09/xmldsig#', 'KeyName'
  );
  Array.from(keyNameEls).forEach(kn => {
    if (kn.textContent?.trim() === /* oldKeyName */ '') {
      kn.textContent = newKeyName;
    }
  });
}
```

### 5.3 1ファイルの処理フロー

```typescript
async function processFile(
  filePath: string,
  organizationId: string,
  oldKeyName: string,
  oldKeyMaterial: Buffer,
  newKeyMaterial: Buffer,
  newKeyName: string
): Promise<number> {  // 再暗号化した EncryptedData の件数を返す
  // 1. S3/Swift からファイルを取得
  const fileBuffer = await storageService.downloadFile(organizationId, filePath);
  const xmlText = fileBuffer.toString('utf-8');

  // 2. XML パース
  const xmlDoc = parseXml(xmlText);

  // 3. 対象 EncryptedData を検索
  const targets = findEncryptedDataElements(xmlDoc, oldKeyName);
  if (targets.length === 0) return 0;  // 対象なし → 処理不要

  // 4. 各 EncryptedData を再暗号化
  for (const el of targets) {
    await reencryptElement(el, oldKeyMaterial, newKeyMaterial, newKeyName);
  }

  // 5. XML を再構築して S3/Swift に上書き保存
  const newXmlText = serializeXml(xmlDoc);
  await storageService.uploadFile(
    organizationId,
    filePath,
    Buffer.from(newXmlText, 'utf-8'),
    { contentType: 'application/xml' }
  );

  return targets.length;
}
```

---

## 6. フロントエンド側の進捗表示

### 6.1 ポーリング方式

```typescript
// KeyRotateModal.tsx

const handleOk = async () => {
  // ローテーション開始
  const { jobId } = await encryptionService.rotateKey(targetKey.keyId);
  setJobId(jobId);
  setStatus('scanning');

  // 2秒ごとに進捗を確認
  const pollInterval = setInterval(async () => {
    const progress = await encryptionService.getRotationProgress(jobId);
    setProgress(progress);

    if (progress.status === 'completed') {
      clearInterval(pollInterval);
      message.success('鍵ローテーションが完了しました。');
      onRotated?.();
      onClose();
    } else if (progress.status === 'failed') {
      clearInterval(pollInterval);
      message.error(`ローテーションに失敗しました: ${progress.errorMessage}`);
    }
  }, 2000);
};
```

### 6.2 進捗表示 UI（案）

```
鍵ローテーション実行中...

[スキャン中]
ファイルをスキャン中: 45 / 120 件

  ↓ スキャン完了後

[再暗号化中]
対象ファイル: 12 件 / 対象 EncryptedData: 38 件
[████████░░░░░░░░░░░░] 5 / 12 ファイル (42%)

推定残り時間: 約45秒

[キャンセル]
```

---

## 7. 検討が必要な事項（未確定）

| # | 事項 | 内容 | 優先度 |
|---|------|------|--------|
| 1 | スキャン対象範囲 | アーカイブ（archive/）・フォーマット（formats/）も含めるか | 高 |
| 2 | IV の格納場所の確認 | CipherValue 先頭16バイト（W3C仕様）で本当に合っているか | 高 |
| 3 | 鍵素材の取得方法 | encryption_keys テーブル or S3/Swift の .key ファイルから取得 | 高 |
| 4 | 処理中の並行アクセス | ローテーション中に同じファイルへの読み書きが発生した場合 | 高 |
| 5 | エラー時のロールバック | 一部ファイルの処理失敗時の扱い（中断？継続？） | 高 |
| 6 | XMLパースライブラリ | xmldom / @xmldom/xmldom / fast-xml-parser 等 | 中 |
| 7 | バックグラウンドジョブ基盤 | 既存 queues/ との整合性確認 | 中 |
| 8 | 処理のキャンセル機能 | 処理中にキャンセルできるか | 低 |
| 9 | file_metadata への暗号化情報追加 | 将来的な最適化（is_encrypted, encryption_key_names） | 低 |

---

## 8. 実装ステップ（案）

### Phase 1: 最小実装（同期処理・小規模データ向け）

**目的:** 基本動作確認・100ファイル未満の対応

- [ ] `processFile()` の実装と動作確認
- [ ] IV の格納形式を実際のファイルで確認
- [ ] スキャン対象範囲を確定（projects/ のみ？）
- [ ] 件数上限チェック（100ファイル超はエラーを返す）

### Phase 2: バックグラウンドジョブ化（本実装）

**目的:** 大規模データ対応・進捗表示

- [ ] `key_rotation_job` テーブルのマイグレーション作成
- [ ] `keyRotationWorker.ts` の実装
- [ ] 進捗確認 API 追加（`GET /keys/rotate/:jobId/progress`）
- [ ] `KeyRotateModal.tsx` にポーリングと進捗表示を追加

### Phase 3: 最適化（将来実装）

- [ ] `file_metadata` に `is_encrypted` / `encryption_key_names` カラム追加
- [ ] 既存ファイルの情報移行スクリプト
- [ ] スキャン不要の高速ローテーション実装

---

## 9. 参考: 既存の関連実装

| ファイル | 内容 |
|---------|------|
| `backend/src/queues/` | 既存のキュー基盤（統一できるか確認要） |
| `backend/src/services/storageService.ts` | S3/Swift のファイル操作 |
| `backend/src/repositories/` | file_metadata アクセス |
| `docs/design/db/ddl/file_metadata.sql` | file_metadata テーブル DDL |
| `backend/migrations/20260623_create_encryption_keys_table.sql` | encryption_keys テーブル |
| `docs/references/s3_structure.md` | S3/Swift フォルダ構成 |
