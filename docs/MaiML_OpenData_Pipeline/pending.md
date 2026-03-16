# MaiML OpenData Pipeline 未確定事項

> 作成日: 2026-03-11  
> 最終更新: 2026-03-12 16:58  
> 確定事項は [spec.md](./spec.md) を参照  
> DB テーブル設計（確定）は [db.md](./db.md) を参照

---

## ⏳ 未確定事項

---

### 6. スケジュール非公開の方式 ✅ 確定（E案・organization ループ）

**背景:**  
bullmq Repeat Job（毎日0時）が全組織横断で `maiml_asset.retention_until <= now()` を検索する際、組織ごとのスキーマ（例: `550e8400_e29b_41d4_a716_446655440000`）をどう列挙するかが未定義。

**⚠️ パフォーマンス懸念:**

現在の想定方式（全組織ループ）は以下の理由で重くなる可能性がある：

| 懸念 | 内容 |
|------|------|
| **N+1 的なクエリ** | 組織数が N の場合、スキーマごとに 1 クエリ発行 → N 回の DB アクセス |
| **毎日0時に一斉実行** | 全組織分の処理が同タイミングに集中する |
| **スキーマ切り替えコスト** | PostgreSQL のスキーマ（`SET search_path`）を組織ごとに切り替えるオーバーヘッド |

**パフォーマンス改善の候補案:**

| 案 | 内容 | 効果 |
|----|------|------|
| **A案（基本）** | `public.organization` からループ | シンプル。組織数が数十〜100程度なら許容範囲 |
| **A案＋バッチ化** | 組織を複数スレッドで並列処理（bullmq concurrency） | 処理時間を短縮できる |
| **B案（UNION ALL）** | 全組織スキーマを動的に `UNION ALL` して 1 クエリで取得 | DB ラウンドトリップを 1 回に削減。スキーマ数が多いと SQL が巨大化 |
| **C案（公開時に job 登録）** | 公開 Worker が `retention_until` を算出した時点で、期限到来時刻の delayed Job を bullmq に登録しておく | 期限切れのたびにスキャン不要。ただし公開 Worker の責務が増える |

> **C案の詳細:**  
> 公開処理完了時に `bullmq.add('due-check', { asset_id }, { delay: <retention_until - now()> })` を登録する。  
> これにより「毎日0時に全スキャン」が不要になり、期限が来たアセットのみ処理される。  
> ただし Redis の delayed job が大量になる可能性・bullmq のジョブが消えた場合のリカバリが課題。

**候補案（列挙方式）:**

| 案 | 方法 | メリット | デメリット |
|----|------|---------|-----------|
| **A案** | `public.organization` テーブルから全 `organization_id` を取得してループ | テーブルが単一の信頼できる情報源 | organization テーブルが large になると遅い可能性 |
| **B案** | `information_schema.schemata` から COMMENT（= organization_cd）付きスキーマを動的列挙 | DB だけで完結 | スキーマ名のパターンに依存・UUID変換の逆引きが必要 |

**関連する未確定事項:**  
due-check 1回で複数アセットを処理する際の `maiml_publish_job` の記録単位も未定義。
- アセット1件につき1レコード
- due-check 1回（スケジュール実行）につき1レコード

**✅ 採用方針: E案（C案 + D案 ハイブリッド）**

| 役割 | 処理 |
|------|------|
| **公開 Worker（通常時）** | `retention_until` 算出 → bullmq に delayed Job 登録（C案） |
| **Scanner Worker（毎日0時）** | 全組織スキャン → Job消失を検出 → 削除Job を投入（D案） |
| **Unpublish Worker** | asset_id 指定で DELETE（即時非公開と共通処理） |

### E案のフロー

```
【公開時（C案部分）】
  公開 Worker 完了
      ↓
  bullmq.add('unpublish', { asset_id }, {
    jobId: `unpublish-${asset_id}`,  // 重複登録防止
    delay: retention_until - now()
  })
  → 期限になったら自動的に Unpublish Worker が実行

【毎日0時（D案リカバリ部分）】
  Scanner Worker 起動
      ↓
  全組織スキャン: maiml_asset.retention_until IS NOT NULL なアセットを取得
      ↓
  各アセットに対して:
      ├─ retention_until <= now() かつ Job なし
      │      → 即座に削除Job投入（期限切れ・Job消失リカバリ）
      │
      └─ retention_until > now() かつ Job なし
             → delayed Job を再登録（期限前・Job消失リカバリ）
             （delay = retention_until - now()）
```

### 期限の扱い（重要）

- `maiml_asset.retention_until` が **唯一の真実（Single Source of Truth）**
- Redis の delayed Job は「実行予約のキャッシュ」に過ぎない
- Job が消失しても `retention_until` は **変更しない・引き直しをしない**
- 最大遅延: スキャン間隔分（デフォルト24時間。cron 頻度を上げることで短縮可能）

### E案のメリット

| メリット | 説明 |
|---------|------|
| **通常時は軽量** | 期限ごとに delayed Job が分散実行されるため、0時に集中しない |
| **リカバリが自動** | Redis 再起動・Job 消失後も翌日0時に自動復旧 |
| **期限は変わらない** | DB の `retention_until` が真実。Job消失は遅延を生むだけ |
| **Unpublish Worker を共通化** | 即時非公開・delayed Job・リカバリJob すべて同じ Worker が処理 |

### 既存の C案・D案候補との比較

| 案 | 通常時スキャン | リカバリ | 実装複雑度 |
|----|------------|---------|-----------|
| **A案（基本ループ）** | 全組織ループ（重い） | ○ | 低 |
| **C案（delayed Jobのみ）** | 不要（軽量） | △ Redis消失リスク | 中 |
| **D案（スキャン+削除分離）** | 全組織ループ（重い） | ◎ | 中 |
| **E案（C+D ハイブリッド）** | **軽量**（Job消失確認のみ） | ◎ | 中 |

### 実装上の注意

- delayed Job の `jobId` を `unpublish-${asset_id}` で固定 → 重複登録防止
- Scanner Worker は「Job の有無確認」だけで大半が終わるため、通常時は軽い
- Redis永続化（AOF/RDB）を追加すれば再起動時のJob消失も防げる（オプション）

**確定に必要な残課題:**
- `maiml_publish_job` の記録粒度（アセット1件=1レコード vs スキャン1回=1レコード）

---

### 8. `organization.default_retention_days` の扱い ✅ 確定

- `default_retention_days` は **必ず正の整数（1以上）**とする
- `0`・`NULL`・負の値は**不許可**（バリデーションエラー）
- 組織登録時のデフォルト値は環境変数 `RETENTION_DAYS_DEFAULT`（デフォルト: 365）から取得する
- 詳細は `spec.md` セクション4.3 および `unpublish_spec.md` セクション8.3 を参照

---

### 9. eventLog テーブル設計の見直し（検討中断）

**背景:**  
`db.md` セクション7（eventLog テーブル設計）について見直しを実施した。現設計（`maiml_event_log` → `maiml_log` → `maiml_trace` → `maiml_event` → `maiml_event_instance_ref` の5層構造）に対し、以下の方針が候補として挙がった。

**方針案:**
- `event` タグを `maiml_instance` と同じ位置づけとし、event配下のpropertyを `maiml_element` と同様に `maiml_event_element` / `maiml_event_element_value` に展開する構造に統一する

```
maiml_event_log（eventLog + log + trace のコンテキスト情報）
    └── maiml_event（event = instanseと同じ位置づけ）
              └── maiml_event_element（property行 = elementと同じ構造）
                        └── maiml_event_element_value（value展開）
```

**検討中断の理由:**  
`concept:instance` の value（結果インスタンスのUUID）と `maiml_instance` との紐づけ方法について以下の3案が挙がったが、判断に必要な情報が不足しているため確定を保留した。

| 案 | 内容 | メリット | デメリット |
|----|------|---------|-----------|
| **A案** | `maiml_event_element` に `instance_id FK` を追加 | テーブル数増えない | `concept:instance` 以外の行はNULL → 不自然 |
| **B案** | `maiml_event_element_value` に `instance_id FK` を追加 | valueと直接紐付く | 他のUUID型valueとの区別が困難 |
| **C案** | FKなし・JOIN解決（`instance_uuid = value` でJOIN） | 設計がinstanceと完全統一 | 検索時にUUID解決が必要 |

**確定に必要な情報:**
- `concept:instance` の参照先が必ず同一ファイル内の `maiml_instance` であるか（仕様確認）
- 取込後の検索クエリで「eventとinstanceを結合する」ユースケースの頻度・重要度
- 取込パイプライン側でUUID→instance_idの解決処理を行う工数の許容度

**参照資料:**
- `db.md` セクション7（現行のeventLog設計）
- `sample/XRF.maiml`（eventLog構造の実例）

---

## ✅ 確定済み事項

### 1. DB スキーマ命名規則 ✅ 確定

| 項目 | 内容 |
|------|------|
| **スキーマ名** | `organization_id` の UUID をハイフン(`-`) → アンダースコア(`_`) に変換したもの |
| **例** | `organization_id = 550e8400-e29b-41d4-a716-446655440000` → スキーマ名 `550e8400_e29b_41d4_a716_446655440000` |
| **プレフィックス** | なし |
| **スキーマ作成タイミング** | 組織作成時（`POST /api/v1/provider/organization`）に自動作成 |
| **スキーマ COMMENT** | `organization_cd` の値を設定（識別用） |

**DDL イメージ:**
```sql
-- スキーマ名: organization_id の '-' を '_' に変換
CREATE SCHEMA IF NOT EXISTS "550e8400_e29b_41d4_a716_446655440000";
COMMENT ON SCHEMA "550e8400_e29b_41d4_a716_446655440000" IS 'org_code_001';
-- COMMENT の値は organization.organization_cd
```

**TypeScript 変換関数:**
```typescript
// organization_id → スキーマ名
const toSchemaName = (organizationId: string): string =>
  organizationId.replace(/-/g, '_');
```

### 2. 公開設定 UI ✅ 確定（不要）

絞り込み等の要件がないため、公開設定ダイアログ・ステータス表示・非公開ボタン等の UI 項目は実装しない。

### 3. inline series・生データ保存 ✅ 確定（不要）

DB 構成変更（`maiml2Excel` ベースのテーブル設計に統一）に伴い、`store_raw_series` / `maiml_series_raw_*` テーブルは実装しない。

### 5. 再公開（二重公開）の扱い ✅ 確定（禁止）

- **公開中のプロジェクトへの再公開は禁止**（二重公開 NG）
- 再公開したい場合は**一度「非公開」にしてから「公開」を実行**する
- 公開 API（`POST /publish`）は、対象プロジェクトに `maiml_asset` が存在する場合は `409 Conflict` を返す

### 7. `maiml_publish_job.asset_id` の FK なし運用 ✅ 確定

- `maiml_publish_job` は `public` スキーマ、`maiml_asset` は各組織スキーマに存在する
- PostgreSQL の FK 制約はスキーマ間では機能しないため、`asset_id` は **FK なしの BIGINT** となる
- 参照整合性はアプリケーション側（Worker）で管理する
- 詳細は `db.md` セクション10 および `spec.md` セクション10 を参照

### スケジュール非公開のトリガー方式 ✅ 確定（bullmq Repeat Job）

- スケジュール非公開は **bullmq の Repeat Job** を使用する（cron 直実行は廃止）
- 既存の `backend/batch/unpublish/` バッチスクリプトは**廃止**
- 既存マイグレーション `20260310_create_maiml_opendata_tables.sql` の KV方式テーブル群は**廃止**（`maiml_publish_registry` / `maiml_condition_kv` / `maiml_material_kv` / `maiml_series_*` 等）
- DB は db.md の新設計（maiml2Excel 方式）に統一。`maiml_asset` を DELETE するだけで CASCADE 削除される
- `keep_meta` モードは**廃止**（新設計では `maiml_asset` の有無で公開状態を管理するため不要）

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-11 | 初版作成 |
| 2026-03-11 | テーブル構成・カラムマッピングを暫定確定（db.md に移行） |
| 2026-03-12 | DB テーブル設計を「確定」に昇格。`maiml_publish_registry` 廃止を反映 |
| 2026-03-12 | スキーマ命名規則確定（UUID ハイフン→アンダースコア変換、プレフィックスなし）。UI 項目・生データ保存を不要として確定。全未確定事項が解消 |
| 2026-03-12 | eventLog テーブル設計の見直し検討を開始したが情報不足により中断。未確定事項4として追記 |
| 2026-03-12 | 期限関連仕様（retention_until）の確定に伴い未確定事項6〜8を追記（スキーマ横断検索・asset_id FK なし・境界値バリデーション）。再公開禁止（未確定事項5）を確定済みに昇格 |
| 2026-03-12 | スケジュール非公開を bullmq Repeat Job に確定・cron直実行廃止・既存KV方式マイグレーション廃止（未確定事項6）を確定済みに昇格。`keep_meta` モード廃止を明記 |
| 2026-03-12 16:58 | #7（asset_id FK なし運用）を確定済みに昇格。#6・#8 は後回し保留継続。#9 は解決不可・保留継続 |
