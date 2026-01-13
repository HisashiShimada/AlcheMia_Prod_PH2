# タスク計画書: OpenStack Swift ローカル環境導入手順

## メタデータ
- **作成日時**: 2026-01-08 14:52
- **タスクID**: OpenStack_Swift_Setup
- **優先度**: 中
- **推定工数**: 2-3時間

## 1. タスク概要

テスト環境で使用するファイルサーバとして、OpenStack Swiftをローカル環境（Docker）に導入し、mmdpfプロジェクトと統合する手順をまとめる。

## 2. 目的と期待される成果

### 目的
- ローカル開発環境でS3互換のオブジェクトストレージをテストできるようにする
- 本番環境（AWS S3）と開発環境（OpenStack Swift）でコードを共通化する
- マルチテナント対応のファイルストレージをテスト可能にする

### 期待される成果
- [ ] OpenStack Swift（SAIO）がDockerで起動できる
- [ ] Swift CLIでの基本操作が可能
- [ ] S3互換APIでアクセス可能
- [ ] mmdpfバックエンドからSwiftにアクセス可能
- [ ] 導入手順ドキュメントの完成

## 3. 実装ステップ

### Phase 1: OpenStack Swiftの理解
- [ ] OpenStack Swiftの概要を理解
- [ ] SAIO（Swift All In One）の概要を理解
- [ ] S3互換性について確認

### Phase 2: Docker環境の準備
- [ ] Docker Composeファイルの作成
- [ ] OpenStack Swift公式イメージの調査
- [ ] 代替案：bouncestorage/swift-aio の検討

### Phase 3: OpenStack Swiftの起動
- [ ] Dockerコンテナの起動
- [ ] Swiftサービスの起動確認
- [ ] ヘルスチェックの実施

### Phase 4: 基本設定とテスト
- [ ] アカウント・コンテナの作成
- [ ] Swift CLIでの動作確認
- [ ] S3互換API（Swift3）の有効化
- [ ] 基本的なCRUD操作のテスト

### Phase 5: mmdpfとの統合
- [ ] backend環境変数の設定
- [ ] S3サービスの修正（Swift対応）
- [ ] 接続テストの実施
- [ ] マルチテナント対応の確認

### Phase 6: ドキュメント作成
- [ ] 導入手順書の作成
- [ ] トラブルシューティングガイドの作成
- [ ] 運用手順の作成

## 4. 技術的詳細

### OpenStack Swiftとは
- オープンソースのオブジェクトストレージシステム
- AWS S3と同様のAPIを提供（Swift3ミドルウェア使用時）
- スケーラブルで耐障害性が高い
- マルチテナント対応

### SAIO（Swift All In One）
- 開発・テスト用のオールインワン構成
- 単一サーバーで全コンポーネントを実行
- 本番環境の動作をシミュレート可能

### Docker イメージ候補
1. **bouncestorage/swift-aio**: 最もポピュラーなSAIOイメージ
2. **docker-swift**: 軽量なSwiftコンテナ
3. **公式ビルド**: OpenStack公式だが複雑

### S3互換性
- Swift3ミドルウェアを使用してS3 APIをエミュレート
- AWS SDK for JavaScriptから接続可能
- 一部のS3機能は未サポート（注意が必要）

## 5. 導入手順（詳細）

### ステップ1: Docker Composeファイルの作成

```yaml
# docker-compose.yml に追加
services:
  swift:
    image: bouncestorage/swift-aio:latest
    container_name: mmdpf-swift
    ports:
      - "8080:8080"  # Swift API
    environment:
      - AUTH_URL=http://localhost:8080/auth/v1.0
      - ACCOUNT=test
      - USER=tester
      - PASSWORD=testing
    volumes:
      - swift-data:/srv
    networks:
      - mmdpf-network
    healthcheck:
      test: ["CMD", "swift", "-A", "http://localhost:8080/auth/v1.0", "-U", "test:tester", "-K", "testing", "stat"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  swift-data:

networks:
  mmdpf-network:
    driver: bridge
```

### ステップ2: Swiftの起動

```bash
# Swiftコンテナの起動
docker-compose up -d swift

# ログ確認
docker-compose logs -f swift

# コンテナ内に入る
docker exec -it mmdpf-swift bash
```

### ステップ3: 基本操作のテスト

```bash
# コンテナ内で実行
# アカウント情報の確認
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing stat

# コンテナの作成
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing post test-container

# ファイルのアップロード
echo "Hello Swift" > test.txt
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing upload test-container test.txt

# ファイル一覧の取得
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing list test-container

# ファイルのダウンロード
swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing download test-container test.txt
```

### ステップ4: S3互換APIの設定

Swift3ミドルウェアが有効な場合、S3 APIでアクセス可能：

```javascript
// AWS SDK for JavaScript v3 での接続例
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: "http://localhost:8080",
  region: "us-east-1",  // ダミー値
  credentials: {
    accessKeyId: "test:tester",
    secretAccessKey: "testing"
  },
  forcePathStyle: true,  // 重要: パススタイルを強制
  signatureVersion: "v4"
});

// バケット一覧の取得
const command = new ListBucketsCommand({});
const response = await s3Client.send(command);
console.log(response.Buckets);
```

### ステップ5: mmdpf環境変数の設定

```bash
# backend/.env に追加

# ストレージタイプ（開発環境では swift を使用）
STORAGE_TYPE=swift  # または s3

# OpenStack Swift設定
SWIFT_AUTH_URL=http://localhost:8080/auth/v1.0
SWIFT_USERNAME=test:tester
SWIFT_PASSWORD=testing
SWIFT_ACCOUNT=test
SWIFT_CONTAINER=mmdpf-files

# S3互換モード（Swift3使用時）
USE_S3_COMPATIBLE_API=true
S3_ENDPOINT=http://localhost:8080
S3_ACCESS_KEY_ID=test:tester
S3_SECRET_ACCESS_KEY=testing
S3_BUCKET_NAME=mmdpf-files
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

### ステップ6: バックエンドコードの修正

既存の`backend/src/services/s3Service.ts`を拡張して、SwiftとS3の両方をサポート：

```typescript
// backend/src/services/storageService.ts (新規作成)
import { S3Client } from "@aws-sdk/client-s3";

export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const storageType = process.env.STORAGE_TYPE || 's3';
    
    if (storageType === 'swift' || process.env.USE_S3_COMPATIBLE_API === 'true') {
      // Swift（S3互換モード）
      this.s3Client = new S3Client({
        endpoint: process.env.S3_ENDPOINT || process.env.SWIFT_AUTH_URL,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.SWIFT_USERNAME!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SWIFT_PASSWORD!
        },
        forcePathStyle: true,  // 重要
        signatureVersion: 'v4'
      });
      this.bucketName = process.env.S3_BUCKET_NAME || process.env.SWIFT_CONTAINER!;
    } else {
      // AWS S3
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-northeast-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      });
      this.bucketName = process.env.AWS_S3_BUCKET!;
    }
  }

  // 既存のs3Service.tsのメソッドをここに移植
  // uploadFile, downloadFile, deleteFile, listFiles など
}
```

## 6. 代替案: docker-swift の使用

より軽量な docker-swift イメージを使用する場合：

```yaml
services:
  swift:
    image: morrisjobke/docker-swift-onlyone:latest
    container_name: mmdpf-swift
    ports:
      - "8080:8080"
    environment:
      - SWIFT_AUTH_URL=http://localhost:8080/auth/v1.0
      - SWIFT_USERNAME=test:tester
      - SWIFT_KEY=testing
    volumes:
      - swift-data:/srv
    networks:
      - mmdpf-network
```

## 7. マルチテナント対応

OpenStack Swiftでのマルチテナント実装：

### アプローチ1: コンテナベース分離
```bash
# 組織ごとにコンテナを作成
swift post org_maiml_lab_001
swift post org_maiml_lab_002

# ファイルパス形式
# <container>/<object_key>
# org_maiml_lab_001/projects/project123/file.xml
```

### アプローチ2: プレフィックスベース分離
```bash
# 共通コンテナを使用
swift post mmdpf-files

# ファイルパス形式（S3と同様）
# mmdpf-files/org_maiml_lab_001/projects/project123/file.xml
```

## 8. トラブルシューティング

### 問題1: Swiftコンテナが起動しない
```bash
# ログ確認
docker-compose logs swift

# コンテナの再起動
docker-compose restart swift

# コンテナの再作成
docker-compose down
docker-compose up -d swift
```

### 問題2: 認証エラー
```bash
# 認証情報の確認
echo $SWIFT_AUTH_URL
echo $SWIFT_USERNAME
echo $SWIFT_PASSWORD

# 手動テスト
curl -v -H "X-Auth-User: test:tester" -H "X-Auth-Key: testing" http://localhost:8080/auth/v1.0
```

### 問題3: S3互換APIが動作しない
- Swift3ミドルウェアが有効か確認
- forcePathStyle: true が設定されているか確認
- エンドポイントURLが正しいか確認

### 問題4: パーミッションエラー
```bash
# ボリュームの権限確認
docker exec -it mmdpf-swift ls -la /srv

# ボリュームの再作成
docker-compose down -v
docker volume rm mmdpf_swift-data
docker-compose up -d swift
```

## 9. パフォーマンス最適化

### 接続プールの設定
```typescript
// S3Clientの接続プール設定
const s3Client = new S3Client({
  maxAttempts: 3,
  requestHandler: {
    connectionTimeout: 5000,
    socketTimeout: 30000
  }
});
```

### キャッシング
```typescript
// よくアクセスされるファイルのキャッシング
import NodeCache from 'node-cache';

const fileCache = new NodeCache({ stdTTL: 600 }); // 10分

export async function getCachedFile(key: string) {
  const cached = fileCache.get(key);
  if (cached) return cached;
  
  const file = await downloadFile(key);
  fileCache.set(key, file);
  return file;
}
```

## 10. セキュリティ考慮事項

### アクセス制御
- [ ] 認証情報を環境変数で管理
- [ ] テナント間のアクセス分離を実装
- [ ] HTTPSの使用（本番環境）
- [ ] IPアドレス制限（必要に応じて）

### 監査ログ
```typescript
// ストレージアクセスのログ記録
logger.info('Storage access', {
  operation: 'upload',
  key: objectKey,
  organizationId: req.organizationId,
  userId: req.user.id,
  timestamp: new Date().toISOString()
});
```

## 11. テスト計画

### ユニットテスト
- [ ] StorageServiceクラスのテスト
- [ ] アップロード機能のテスト
- [ ] ダウンロード機能のテスト
- [ ] 削除機能のテスト

### 統合テスト
- [ ] エンドツーエンドのファイル操作テスト
- [ ] マルチテナント分離のテスト
- [ ] エラーハンドリングのテスト

### 手動テスト
- [ ] ブラウザからのファイルアップロード
- [ ] ファイル一覧の表示
- [ ] ファイルダウンロード
- [ ] 異なる組織間での分離確認

## 12. 運用手順

### 起動手順
```bash
# Swiftコンテナの起動
docker-compose up -d swift

# 初期設定（初回のみ）
docker exec -it mmdpf-swift swift post mmdpf-files
```

### 停止手順
```bash
# Swiftコンテナの停止
docker-compose stop swift

# 完全停止（データ削除）
docker-compose down -v
```

### バックアップ手順
```bash
# データボリュームのバックアップ
docker run --rm \
  -v mmdpf_swift-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/swift-backup-$(date +%Y%m%d).tar.gz /data
```

### リストア手順
```bash
# データボリュームのリストア
docker run --rm \
  -v mmdpf_swift-data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/swift-backup-YYYYMMDD.tar.gz -C /
```

## 13. 関連ドキュメント

- [OpenStack Swift公式ドキュメント](https://docs.openstack.org/swift/latest/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Docker Swift AIOs](https://github.com/bouncestorage/swift-aio)
- [Swift3 - S3 Compatibility](https://docs.openstack.org/swift/latest/middleware.html#module-swift.common.middleware.s3api)

## 14. 承認記録

- **計画書提示日時**: 2026-01-08 14:52
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 15. 補足情報

### 本番環境との違い
| 項目 | 開発環境（Swift） | 本番環境（S3） |
|------|------------------|---------------|
| エンドポイント | localhost:8080 | s3.amazonaws.com |
| 認証方式 | Swift認証 | IAM |
| リージョン | 単一 | マルチリージョン |
| 耐障害性 | 低（単一サーバー） | 高（分散） |
| パフォーマンス | 低 | 高 |
| コスト | 無料 | 従量課金 |

### 推奨事項
- 開発環境では Swift を使用
- CI/CD環境では MinIO も検討可能
- 本番環境では AWS S3 を使用
- コードは両方に対応できるように抽象化

### 今後の拡張
- [ ] MinIO への対応（オンプレ本番環境用）
- [ ] Azure Blob Storage への対応
- [ ] Google Cloud Storage への対応
- [ ] 統一ストレージインターフェースの実装