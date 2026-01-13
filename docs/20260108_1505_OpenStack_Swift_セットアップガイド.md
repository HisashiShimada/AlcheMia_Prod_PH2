# OpenStack Swift セットアップガイド

## 目次
1. [クイックスタート](#1-クイックスタート)
2. [詳細セットアップ手順](#2-詳細セットアップ手順)
3. [使用方法](#3-使用方法)
4. [よくある質問](#4-よくある質問)

---

## 1. クイックスタート

### 前提条件
- Docker & Docker Compose がインストールされていること
- Node.js 24.0以上、npm 11.0以上がインストールされていること

### 5分でセットアップ

```bash
# 1. プロジェクトルートに移動
cd /home/mi_ito/mmdpf

# 2. Swiftコンテナを起動
docker-compose up -d swift

# 3. 起動確認（60秒程度待つ）
docker-compose logs swift

# 4. Swiftコンテナ内でコンテナを作成
docker exec -it mmdpf-swift bash -c "swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing post mmdpf-files"

# 5. backend/.envファイルを作成
cd backend
cp .env.example .env

# 6. 必要なパッケージをインストール
npm install

# 7. 接続テスト
npm run test:swift
```

### 期待される結果

```
================================================================================
OpenStack Swift 接続テスト
================================================================================

1. StorageServiceの初期化...
   ✅ ストレージタイプ: swift
   ✅ コンテナ/バケット: mmdpf-files

...

================================================================================
✅ すべてのテストが成功しました！
================================================================================
```

---

## 2. 詳細セットアップ手順

### ステップ1: Docker Composeファイルの確認

プロジェクトルートの `docker-compose.yml` を確認します：

```yaml
services:
  swift:
    image: bouncestorage/swift-aio:latest
    container_name: mmdpf-swift
    ports:
      - "8080:8080"
    environment:
      - AUTH_URL=http://localhost:8080/auth/v1.0
      - ACCOUNT=test
      - USER=tester
      - PASSWORD=testing
    volumes:
      - swift-data:/srv
```

### ステップ2: Swiftコンテナの起動

```bash
# Swiftのみを起動
docker-compose up -d swift

# または、全サービスを起動
docker-compose up -d

# 起動確認
docker-compose ps

# 期待される出力:
# NAME            IMAGE                           STATUS
# mmdpf-swift     bouncestorage/swift-aio:latest  Up (healthy)
```

### ステップ3: コンテナ内でSwiftコンテナを作成

```bash
# 方法1: docker execで直接実行
docker exec -it mmdpf-swift bash -c "swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing post mmdpf-files"

# 方法2: コンテナ内に入って実行
docker exec -it mmdpf-swift bash
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing post mmdpf-files
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing list
exit
```

### ステップ4: 環境変数の設定

```bash
cd backend

# .env.example をコピー
cp .env.example .env

# 必要に応じて編集（デフォルトのままでOK）
vi .env
```

デフォルト設定で動作する環境変数：

```bash
# Storage Configuration
STORAGE_TYPE=swift

# OpenStack Swift Configuration
SWIFT_AUTH_URL=http://localhost:8080/auth/v1.0
SWIFT_USERNAME=test:tester
SWIFT_PASSWORD=testing
SWIFT_ACCOUNT=test
SWIFT_CONTAINER=mmdpf-files

# S3互換APIモード
USE_S3_COMPATIBLE_API=true
S3_ENDPOINT=http://localhost:8080
S3_ACCESS_KEY_ID=test:tester
S3_SECRET_ACCESS_KEY=testing
S3_BUCKET_NAME=mmdpf-files
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

### ステップ5: 依存パッケージのインストール

```bash
# backend ディレクトリで実行
cd backend
npm install

# 必要なパッケージ:
# - @aws-sdk/client-s3
# - @aws-sdk/s3-request-presigner
```

### ステップ6: 接続テストの実行

```bash
# テストスクリプトを実行
npm run test:swift

# または手動で実行
ts-node scripts/test-swift-connection.ts
```

---

## 3. 使用方法

### 3.1. バックエンドコードでの使用例

```typescript
import { getStorageService } from './services/storageService';

// StorageServiceのインスタンスを取得
const storage = getStorageService();

// ファイルのアップロード
const organizationId = 'maiml_lab_001';
const filePath = 'projects/project123/data.xml';
const fileContent = Buffer.from('<xml>...</xml>');

await storage.uploadFile(
  organizationId,
  filePath,
  fileContent,
  { contentType: 'application/xml' }
);

// ファイルのダウンロード
const downloadedContent = await storage.downloadFile(
  organizationId,
  filePath
);

// ファイル一覧の取得
const files = await storage.listFiles(
  organizationId,
  'projects/project123/'
);

// ファイルの削除
await storage.deleteFile(organizationId, filePath);

// 署名付きURLの生成（一時的なアクセス権）
const signedUrl = await storage.getSignedUrl(
  organizationId,
  filePath,
  3600  // 1時間有効
);
```

### 3.2. APIエンドポイントの実装例

```typescript
import express from 'express';
import { getStorageService } from '../services/storageService';

const router = express.Router();
const storage = getStorageService();

// ファイルアップロードAPI
router.post('/files/upload', async (req, res) => {
  try {
    const { organizationId } = req;  // 認証ミドルウェアから取得
    const { filePath } = req.body;
    const fileContent = req.file.buffer;

    const key = await storage.uploadFile(
      organizationId,
      filePath,
      fileContent
    );

    res.json({
      success: true,
      data: { key }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ファイルダウンロードAPI（署名付きURL）
router.get('/files/download/:filePath', async (req, res) => {
  try {
    const { organizationId } = req;
    const { filePath } = req.params;

    const signedUrl = await storage.getSignedUrl(
      organizationId,
      filePath,
      300  // 5分間有効
    );

    res.json({
      success: true,
      data: { url: signedUrl }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### 3.3. マルチテナント対応

StorageServiceは自動的にマルチテナント分離を実装します：

```typescript
// 組織1のファイル
await storage.uploadFile('maiml_lab_001', 'data.xml', content);
// 実際のキー: org_maiml_lab_001/data.xml

// 組織2のファイル
await storage.uploadFile('maiml_lab_002', 'data.xml', content);
// 実際のキー: org_maiml_lab_002/data.xml

// 組織ごとにファイルが完全に分離される
```

---

## 4. よくある質問

### Q1: Swiftコンテナが起動しない

**A:** ログを確認してください：

```bash
docker-compose logs swift

# ポートが既に使用されている場合
sudo lsof -i :8080
# 競合するプロセスを停止するか、docker-compose.ymlのポートを変更
```

### Q2: 接続テストが失敗する

**A:** 以下を確認してください：

```bash
# 1. Swiftコンテナの状態
docker-compose ps swift

# 2. コンテナが作成されているか
docker exec -it mmdpf-swift bash
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing list

# 3. 環境変数が正しいか
cat backend/.env | grep SWIFT
```

### Q3: ファイルがアップロードされない

**A:** コンテナ内の権限を確認：

```bash
docker exec -it mmdpf-swift bash
ls -la /srv
chmod -R 777 /srv  # 開発環境の場合のみ
exit
```

### Q4: パフォーマンスが遅い

**A:** ローカルSwiftは開発・テスト用です。本番環境では：
- 専用サーバーにSwiftを配置
- または AWS S3 を使用（環境変数で簡単に切り替え可能）

### Q5: 別の端末のSwiftに接続したい

**A:** `docs/20260108_1503_Swift別端末移行手順.md` を参照してください。

### Q6: AWS S3に切り替えたい

**A:** backend/.env を以下のように変更：

```bash
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-bucket-name
```

コードの変更は不要です。StorageServiceが自動的に切り替わります。

### Q7: データを永続化したい

**A:** docker-compose.ymlのボリューム設定により、データは自動的に永続化されます：

```bash
# データの保存場所を確認
docker volume inspect mmdpf_swift-data

# バックアップ
docker run --rm -v mmdpf_swift-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/swift-backup.tar.gz /data

# リストア
docker run --rm -v mmdpf_swift-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/swift-backup.tar.gz -C /
```

---

## 5. トラブルシューティング

### エラー: "Container not found"

```bash
# コンテナを作成
docker exec -it mmdpf-swift bash -c "swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing post mmdpf-files"
```

### エラー: "Connection refused"

```bash
# Swiftコンテナを再起動
docker-compose restart swift

# ヘルスチェックを待つ
docker-compose ps swift
# STATUS が "Up (healthy)" になるまで待つ
```

### エラー: "Authentication failed"

```bash
# 環境変数を確認
echo $SWIFT_USERNAME
echo $SWIFT_PASSWORD

# 手動で認証テスト
curl -v -H "X-Auth-User: test:tester" \
  -H "X-Auth-Key: testing" \
  http://localhost:8080/auth/v1.0
```

---

## 6. 関連ドキュメント

- [OpenStack Swift 導入手順（詳細版）](./20260108_1452_OpenStack_Swift_導入手順_PLAN.md)
- [別端末移行手順](./20260108_1503_Swift別端末移行手順.md)
- [StorageService API リファレンス](../backend/src/services/storageService.ts)

---

## 7. サポート

問題が解決しない場合：

1. **ログの確認**
   ```bash
   docker-compose logs swift
   ```

2. **Issue報告**
   - プロジェクトのIssueトラッカーで報告

3. **開発チームに相談**
   - エラーメッセージ
   - `docker-compose ps` の出力
   - 環境変数の設定（機密情報を除く）
   を添えて相談してください

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-08 | 初版作成 | Development Team |