# タスク計画書: 公開スキーマ（PostgreSQL）ストレージ使用量をストレージ計上に加算

## メタデータ
- **作成日時**: 2026-04-24 09:42
- **タスクID**: 公開スキーマストレージ使用量加算
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

現状、課金情報CSV（情報ダウンロード）およびシステム概要画面のストレージ使用量は、Swift/S3 上の `{organizationId}/` 配下ファイルのみを集計している。  
組織スキーマ（PostgreSQL の `{org_uuid_without_hyphens}` スキーマ内の `maiml_asset` 等テーブル群）のディスク使用量は一切計上されていない。

本タスクでは、`pg_total_relation_size()` を使って各組織スキーマのテーブル物理使用量を取得し、Swift/S3 使用量に加算する。

## 目的と期待される成果

### 目的
- 課金情報 CSV と システム概要画面のストレージ使用量に、PostgreSQL 公開スキーマの容量を正確に含める
- 組織スキーマが存在しない場合（未作成組織等）も安全に 0 として扱う

### 期待される成果
- [ ] `maimlAssetRepository.ts` に `getSchemaStorageSizeBytes()` 関数が追加される
- [ ] `organizationService.ts` の `downloadOrganizationsInformation()` で公開スキーマ容量が加算される
- [ ] `systemOverviewService.ts` の `getStorageStats()` で公開スキーマ容量が加算される

## 実装ステップ

### Phase 1: Repository 層への関数追加
- [ ] `backend/src/repositories/maimlAssetRepository.ts` に `getSchemaStorageSizeBytes()` を追加
  - `toSchemaName()` / `validateSchemaName()` の既存ユーティリティを活用
  - `pg_tables` と `pg_total_relation_size()` を使ったクエリを実装
  - スキーマ未存在時は `COALESCE(..., 0)` で自然に 0 を返す

### Phase 2: organizationService.ts の修正
- [ ] `downloadOrganizationsInformation()` 関数内の Swift/S3 取得ループに、公開スキーマ容量の加算処理を追加
  - `getSchemaStorageSizeBytes()` を import して呼び出す
  - 失敗時は `logger.warn` を出力して 0 加算（エラーは無視）

### Phase 3: systemOverviewService.ts の修正
- [ ] `getStorageStats()` 関数内で、Swift/S3 合計バイト数に公開スキーマ容量を加算
  - `getSchemaStorageSizeBytes()` を import して呼び出す
  - 失敗時は `logError` を出力して 0 加算（エラーは無視）

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `backend/src/repositories/maimlAssetRepository.ts` | 修正（関数追加） | `getSchemaStorageSizeBytes()` を末尾に追加 |
| `backend/src/services/organizationService.ts` | 修正 | `downloadOrganizationsInformation()` に公開スキーマ容量加算を追加 |
| `backend/src/services/systemOverviewService.ts` | 修正 | `getStorageStats()` に公開スキーマ容量加算を追加 |
| `backend/src/repositories/organizationManagementRepository.ts` | 修正（任意） | `OrganizationStatsRow` の注釈追加（実装上は不要） |

## 技術詳細

### getSchemaStorageSizeBytes() の実装

```typescript
/**
 * 組織スキーマの総使用容量をバイト単位で返す
 * 対象: スキーマ内の全テーブルの合計サイズ（インデックス含む）
 * スキーマが存在しない場合は 0 を返す
 */
export async function getSchemaStorageSizeBytes(organizationId: string): Promise<number> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  const row = await pgp.oneOrNone<{ total_bytes: string }>(
    `SELECT COALESCE(
       SUM(pg_total_relation_size(quote_ident($1) || '.' || quote_ident(tablename))),
       0
     )::bigint AS total_bytes
     FROM pg_tables
     WHERE schemaname = $1`,
    [schemaName]
  );
  return row ? Number(row.total_bytes) : 0;
}
```

**ポイント:**
- `pg_total_relation_size()` はテーブル本体 + TOAST + インデックスを含む物理使用量を返す
- `COALESCE(..., 0)` でスキーマが存在しない（テーブルが0行）場合に 0 を返す
- `quote_ident()` で SQL インジェクション対策（スキーマ名・テーブル名のエスケープ）
- 既存の `toSchemaName()` / `validateSchemaName()` を流用し、一貫性を維持

### organizationService.ts の変更箇所

```typescript
// 既存 import に追加
import { getSchemaStorageSizeBytes, createSchemaIfNotExists, createSchemaTables } from '../repositories/maimlAssetRepository';

// downloadOrganizationsInformation() 関数内のループ
for (const org of orgs) {
  let storageSizeBytes = 0;
  try {
    const files = await storageService.listFiles(org.organization_id, '', 1000);
    storageSizeBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  } catch (err) {
    logger.warn(`[organizationService] ストレージ使用量取得失敗: organizationId=${org.organization_id}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 新規追加: 公開用スキーマ（PostgreSQL）の容量を加算
  try {
    const schemaSizeBytes = await getSchemaStorageSizeBytes(org.organization_id);
    storageSizeBytes += schemaSizeBytes;
  } catch (err) {
    logger.warn(`[organizationService] 公開用スキーマ容量取得失敗: organizationId=${org.organization_id}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const storageSizeGb = (storageSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
  // ... 以降は既存のまま
}
```

### systemOverviewService.ts の変更箇所

```typescript
async function getStorageStats(organizationId: string): Promise<{ totalFiles: number; usedCapacityGB: number }> {
  try {
    const storageService = getStorageService();
    const allObjects = await storageService.listFiles(organizationId, '');

    const actualFiles = allObjects.filter(f => !f.key.endsWith('/') && !f.key.endsWith('.keep'));

    const totalFiles = actualFiles.length;
    const totalBytes = actualFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    // 新規追加: 公開用スキーマ（PostgreSQL）の容量を加算
    let schemaSizeBytes = 0;
    try {
      const { getSchemaStorageSizeBytes } = await import('../repositories/maimlAssetRepository');
      schemaSizeBytes = await getSchemaStorageSizeBytes(organizationId);
    } catch (err) {
      logError('Failed to get schema storage size', err as Error, { organizationId });
    }

    const usedCapacityGB = parseFloat(((totalBytes + schemaSizeBytes) / 1073741824).toFixed(3));

    return { totalFiles, usedCapacityGB };
  } catch (error) {
    logError('Failed to get storage stats', error as Error, {
      action: 'get_storage_stats',
      organizationId,
    });
    return { totalFiles: 0, usedCapacityGB: 0 };
  }
}
```

**注意:** `systemOverviewService.ts` は既存の try-catch 構造のため、`getSchemaStorageSizeBytes` の呼び出しを内部の try-catch でラップして、Swift/S3 エラー時でもスキーマ取得を試みる。

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| スキーマ未存在組織でクエリエラー | 低 | 低 | `COALESCE` + `pg_tables` により自然に 0 が返る |
| `pg_total_relation_size` 呼び出しで権限エラー | 中 | 低 | try-catch で catch して warn ログ出力 + 0 加算 |
| 大量組織でのパフォーマンス低下 | 中 | 中 | 情報ダウンロードは管理者のみの低頻度操作のため許容 |
| `systemOverviewService` の既存エラーハンドリングとの干渉 | 低 | 低 | 内部 try-catch で独立して処理 |

## テスト計画

### 手動テスト
- [ ] 情報ダウンロード CSV のストレージ使用量が以前より増加していることを確認
- [ ] システム概要画面のストレージ使用量が以前より増加していることを確認
- [ ] スキーマが存在しない組織（旧来組織等）でもエラーが出ず 0 加算されることを確認
- [ ] ログに `warn` が不必要に出力されていないことを確認

## 承認記録

- **計画書提示日時**: 2026-04-24 09:42
- **承認日時**: 
- **承認者コメント**: 

## 実施記録

### 実施日時
開始:   
完了:   

### 計画からの変更点
（実施後に記入）

### 最終的な成果物
- [ ] `maimlAssetRepository.ts` に `getSchemaStorageSizeBytes()` 追加
- [ ] `organizationService.ts` の `downloadOrganizationsInformation()` 修正
- [ ] `systemOverviewService.ts` の `getStorageStats()` 修正
