# タスク計画書: MaiML 自動非公開・リカバリ実装 + 旧バッチ廃止

## メタデータ
- **作成日時**: 2026-03-13 09:38
- **タスクID**: maiml-auto-unpublish
- **優先度**: 高
- **推定工数**: 4〜6時間

## 1. タスク概要

前タスク（`docs/20260312_1800_公開機能実装/PLAN.md`）で実装した公開・非公開 API の続き。
仕様書 `spec.md §4.2` で確定済みだが未実装の以下を完成させる。

1. **公開 Worker の delayed Job 登録**（公開完了時に `retention_until` 時刻の自動非公開 Job を bullmq に登録）
2. **Scanner Worker の新規作成**（毎日 0 時に期限切れアセットを検出して削除 Job を投入するリカバリ）
3. **旧バッチスクリプトの廃止**（`backend/batch/unpublish/` ディレクトリのソースを削除）

---

## 2. 目的と期待される成果

### 目的
- 公開から `retention_until` 日後に自動で非公開になることを保証する
- Redis/bullmq の Job が消失しても翌日には必ず非公開処理が走るリカバリ機構を確立する
- 廃止確定のバッチスクリプトをコードベースから除去してメンテナンス性を向上させる

### 期待される成果
- [ ] 公開 Worker 完了後に delayed Job が bullmq に登録されること
- [ ] Scanner Worker が毎日 0 時（Repeat Job）に起動し、期限切れアセットを削除 Job に投入すること
- [ ] `backend/batch/unpublish/` ディレクトリが削除されること
- [ ] TSC コンパイルが EXIT:0 であること

---

## 3. 実装ステップ

### Phase 1: 公開 Worker に delayed Job 登録を追加

**対象ファイル**: `backend/src/workers/maimlPublishWorker.ts`

- [ ] `maimlUnpublishQueue.ts` の Queue インスタンスを import
- [ ] アセット INSERT 完了後（Step 6 の後）に以下を追加:
  ```typescript
  // retention_until 時刻に自動非公開 delayed Job を登録
  const delayMs = retentionUntil.getTime() - Date.now();
  const unpublishQueue = getMaimlUnpublishQueue();
  await unpublishQueue.add(
    'auto-unpublish',
    {
      jobId:          `auto-unpublish-${assetId}`,  // maiml_publish_job との対応はなし
      organizationId,
      assetId,
    } satisfies UnpublishJobData,
    {
      jobId: `unpublish-${assetId}`,   // 重複登録防止（bullmq の jobId 重複チェック）
      delay: Math.max(delayMs, 0),
    }
  );
  ```
- [ ] `UnpublishJobData` 型は既存 `types/maimlOpenData.ts` を確認して利用
- [ ] `getMaimlUnpublishQueue()` を `maimlUnpublishQueue.ts` に export する（なければ追加）

### Phase 2: Scanner Worker の新規作成

**新規ファイル**: `backend/src/workers/maimlScannerWorker.ts`

処理フロー:
```
Repeat Job（毎日 0 時・pattern: '0 0 * * *'）
  ↓
全組織の maiml_asset を取得（retention_until IS NOT NULL）
  ↓
各アセットに対して:
  ├─ retention_until <= now() かつ unpublish Job なし
  │     → 即座に unpublish Job 投入（delay: 0）
  └─ retention_until > now() かつ unpublish Job なし
        → delayed Job を再登録（delay = retention_until - now()）
```

実装内容:
- [ ] `backend/src/workers/maimlScannerWorker.ts` を新規作成
  - `startMaimlScannerWorker()` / `stopMaimlScannerWorker()` を export
  - bullmq `Worker` ではなく `QueueScheduler` + 専用 Queue で Repeat Job を登録
  - または bullmq v4 以降の `repeat` オプションを `Queue.add()` で登録する方式で実装
- [ ] `backend/src/queues/maimlScannerQueue.ts` を新規作成（Scanner 用 Queue 定義）
- [ ] Scanner Queue / Worker を `server.ts` に追加登録

**Scanner Worker の実装詳細:**
```typescript
// 全組織スキャン用 Repository 呼び出し
const assets = await assetRepo.findAllWithRetentionUntil(); // 全組織対象

for (const asset of assets) {
  const delayMs = asset.retention_until.getTime() - Date.now();
  const jobId = `unpublish-${asset.asset_id}`;

  // 既存 Job があればスキップ（重複投入防止）
  const existingJob = await unpublishQueue.getJob(jobId);
  if (existingJob) continue;

  // Job がない → 投入（即時 or delayed）
  await unpublishQueue.add(
    'auto-unpublish',
    { jobId, organizationId: asset.organization_id, assetId: asset.asset_id },
    { jobId, delay: Math.max(delayMs, 0) }
  );
}
```

### Phase 3: maimlAssetRepository に全件取得メソッドを追加

**対象ファイル**: `backend/src/repositories/maimlAssetRepository.ts`

- [ ] `findAllWithRetentionUntil()` メソッドを追加
  - 全組織の `maiml_asset` テーブルを横断して `retention_until IS NOT NULL` のアセットを返す
  - 組織ごとのスキーマを使うため `pg_catalog.pg_tables` から組織スキーマ一覧を取得して動的クエリを実行
  - 返却型: `{ organization_id: string; asset_id: bigint; retention_until: Date }[]`

### Phase 4: 旧バッチスクリプトの削除

**削除対象**:
- [ ] `backend/batch/unpublish/unpublish.ts`
- [ ] `backend/batch/unpublish/index.ts`
- [ ] `backend/batch/unpublish/repository.ts`
- [ ] `backend/batch/unpublish/db.ts`
- [ ] `backend/batch/unpublish/tsconfig.json`
- [ ] `backend/batch/unpublish/README.md`
- [ ] `backend/batch/unpublish/` ディレクトリ自体
- [ ] `backend/batch/` ディレクトリが空になれば削除

### Phase 5: コンパイル確認

- [ ] `tsc --noEmit` で EXIT:0 を確認

---

## 4. 影響範囲

### 変更するファイル
1. `backend/src/workers/maimlPublishWorker.ts` - delayed Job 登録追加
2. `backend/src/queues/maimlUnpublishQueue.ts` - `getMaimlUnpublishQueue()` export 追加（必要な場合）
3. `backend/src/repositories/maimlAssetRepository.ts` - `findAllWithRetentionUntil()` 追加
4. `backend/src/server.ts` - Scanner Worker / Queue 起動登録追加

### 新規作成するファイル
1. `backend/src/workers/maimlScannerWorker.ts` - Scanner Worker
2. `backend/src/queues/maimlScannerQueue.ts` - Scanner Queue 定義

### 削除するファイル
1. `backend/batch/unpublish/` 配下の全ファイル（6ファイル）

### 影響を受ける機能
- 公開処理: delayed Job が追加登録されるようになる（副作用なし）
- 非公開処理: delayed Job / Repeat Job からも Unpublish Worker が呼ばれるようになる（既存処理と同一 Worker を共用）

---

## 5. 技術的詳細

### bullmq の jobId 重複登録防止
- `Queue.add(name, data, { jobId: 'unpublish-{assetId}' })` で固定 jobId を指定すると、同一 jobId の Job が既に存在する場合は追加されない（bullmq の仕様）
- Scanner Worker でも同じ jobId を使うことで二重登録を防止

### Repeat Job の登録方法（bullmq v4 系）
```typescript
await scannerQueue.add(
  'scan-retention',
  {},
  {
    repeat: { pattern: '0 0 * * *' },  // 毎日 0 時
  }
);
```
- `QueueScheduler` は bullmq v4 では不要（内蔵）

### 全組織スキャンの実装方針
- `public.organization` テーブルから全組織 ID を取得
- 各組織スキーマ `{org_id_without_hyphen}.maiml_asset` を動的クエリで検索
  - スキーマ名: `org_` + `organization_id.replace(/-/g, '_')`

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| delayed Job の delay 計算がマイナスになる | 中 | 低 | `Math.max(delayMs, 0)` で即時実行に fallback |
| Scanner Worker が全組織を並列処理して DB 負荷が高くなる | 中 | 低 | concurrency: 1（逐次処理）で運用 |
| batch/unpublish 削除後に参照箇所が残る | 低 | 低 | 削除前に grep で参照チェック |

---

## 7. テスト計画

### 手動確認
- [ ] 公開後に Redis で `bull:maiml-unpublish:*` の delayed Job が登録されることを確認
- [ ] Scanner Worker 起動後に期限切れアセットが削除されることを確認

### コンパイル
- [ ] `tsc --noEmit` EXIT:0

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-13 09:38
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）
