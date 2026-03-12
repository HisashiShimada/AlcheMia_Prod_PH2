# MaiML公開処理 実装推奨事項

> 作成日: 2026-03-09
> 対象: mmdpfへのMaiML公開処理機能組み込みにあたっての推奨事項

---

## 1. アーキテクチャ推奨

### 1.1 結論：APIトリガー型バックグラウンドジョブ（bullmq）を推奨

```
[フロントエンド]
    │  公開ボタン押下（experiment_admin のみ）
    ▼
[バックエンドAPI（Express）]
    │  ① maiml_publish_registry に status='requested' で登録
    │  ② bullmqキューにジョブをエンキュー
    │  ③ 即座に 202 Accepted を返却
    ▼
[bullmq Worker（同一Expressプロセス内）]
    │  ④ SwiftからMaiMLファイルを取得
    │  ⑤ SAXストリーミング解析（sax パッケージ）
    │  ⑥ プレビュー生成（uniform/maxhold/MMR）
    │  ⑦ KV属性・生データをDBに挿入
    │  ⑧ status を 'published' に更新
    ▼
[PostgreSQL]
```

### 1.2 この構成を選ぶ理由

| 観点 | 理由 |
|------|------|
| **既存インフラの活用** | Redisがすでにdocker-compose.ymlに存在（`redis:7-alpine`）。bullmqを追加コストなしで導入できる |
| **タイムアウト回避** | SAX解析＋チャンク分割Insertは数十秒以上かかりうる。同期HTTP処理では返せない |
| **冪等性・リトライ** | 仕様書で明記された「途中失敗→再実行で一致」要件にbullmqのリトライ機構が自然に対応 |
| **mmdpfとの統合** | Expressミドルウェア（auth/tenantIsolation）でRBAC・organization_idが自動付与される |
| **Pythonコンテナ不要** | 元仕様書はPython想定だが、アルゴリズムはTypeScriptで十分再実装可能 |
| **将来のスケールアウト** | Worker部分だけを別プロセス/別コンテナに切り出すことが容易 |

### 1.3 比較：却下した方式

| 方式 | 却下理由 |
|------|---------|
| 同期API（処理完了まで待つ） | HTTPタイムアウトリスク、UX悪化 |
| Pythonバッチ（child_process） | Node.jsコンテナへのPython同梱が必要。依存関係増大 |
| Python独立コンテナ＋HTTP呼び出し | コンテナ管理コスト増。mmdpfのRBACと統合しにくい |
| 完全独立バッチ（cronのみ） | UIボタン押下のリアルタイム性が失われる |

---

## 2. Worker実装推奨

### 2.1 XML解析

```
推奨: Node.js の sax パッケージ（ストリーミングSAX解析）
```

- `sax` パッケージはNode.js向けの定番SAXパーサー
- 元仕様書のPython `iterparse` と同等のストリーミング処理が可能
- 巨大MaiMLファイル（数百MB〜GB）でもメモリに全展開しない

### 2.2 プレビュー生成のデフォルトモード

仕様書では3モードのデフォルトが未定義。以下を推奨：

| ユースケース | 推奨モード | 理由 |
|------------|----------|------|
| **デフォルト** | `maxhold` | ピーク保持でスペクトルデータの特徴を損なわない。MaiMLの主ユースケース（分光・XRF）に適合 |
| 汎用グラフ表示 | `uniform` | 形状把握に均等サンプリングで十分 |
| 高精度要約 | `mmr` | 処理コストが高いため、ユーザーが明示選択時のみ |

### 2.3 生データ保存（store_raw_series）

```
推奨: デフォルト false（プレビューのみ保存）
理由: DBサイズ肥大化リスクを避ける。必要なユーザーのみ true に設定
```

---

## 3. DB設計推奨

### 3.1 mmdpf固有カラムの追加

元仕様書のテーブルにmmdpf固有のカラムを追加する必要がある：

```sql
-- maiml_asset に追加
ALTER TABLE maiml_asset
  ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL;
  -- project_id は不要（spec.mdの決定に従う）

-- maiml_publish_registry に追加
ALTER TABLE maiml_publish_registry
  ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL;
```

### 3.2 スキーマ設計の優先確認事項

実装前に以下を必ず確認すること：

- [ ] OpenData側DB SQLの `maiml_publish_registry` CREATE TABLE全文を受領
- [ ] OpenData側DB SQLの `maiml_asset` CREATE TABLE全文を受領
- [ ] これらのスキーマとmmdpfへの追加カラムを統合した最終DDLを作成

### 3.3 インデックス設計

仕様書の推奨に加え、mmdpfのマルチテナント分離のために以下を追加：

```sql
-- organization_id での絞り込みを高速化
CREATE INDEX IF NOT EXISTS ix_asset_organization ON maiml_asset(organization_id);
CREATE INDEX IF NOT EXISTS ix_registry_organization ON maiml_publish_registry(organization_id);
```

---

## 4. セキュリティ推奨

### 4.1 認証・認可

```
元仕様書のDBロール（viewer/publisher/admin）は使わない
→ mmdpfのRBAC（experiment_adminのみ）に統一する
```

全APIエンドポイントに以下のミドルウェアチェーンを適用：
```
auth → tenantIsolation → permissionCheck（experiment_adminのみ許可）
```

### 4.2 organization_idの強制

- `maiml_asset` / `maiml_publish_registry` を含む全DBクエリに `organization_id` フィルタを必須とする
- バックエンドミドルウェアで `req.organizationId` を自動付与し、Repositoryに必ず渡す

---

## 5. 未解決課題への対応推奨

### 5.1 series_type判定ロジック（Priority: 高）

```
対応: inline seriesを含むMaiMLサンプル（クロマトグラフィー系）を入手し、
      <content key="..."> の実際の値を確認してルールを決定する
暫定案: key属性に "TIC" が含まれれば TIC、"SPECTRUM" が含まれれば SPECTRUM_TOTAL、
        それ以外は OTHER
```

### 5.2 スケジュール自動非公開（Priority: 中）

元仕様書の `maiml_unpublish_due_assets()` を実現するための推奨：

```
推奨: bullmqの Repeat Job（定期実行ジョブ）を使用
理由: Redisが既存のため追加インフラ不要。毎日0時など定期的に
      retention期限切れのアセットを一括非公開できる
```

```typescript
// 実装イメージ
const unpublishQueue = new Queue('maiml-unpublish', { connection: redis });
await unpublishQueue.add('due-check', {}, {
  repeat: { pattern: '0 0 * * *' }  // 毎日0時に実行
});
```

### 5.3 フロントエンドUI（Priority: 低）

実装前に以下を設計すること：
- [ ] 公開ボタン・非公開ボタンの配置（プロジェクト詳細画面）
- [ ] 公開設定フォーム（template_only / store_raw_series / retention の入力）
- [ ] 公開ステータスの表示（requested → publishing → published / failed）
- [ ] 処理中のプログレス表示（bullmqのジョブ進捗をWebSocketまたはポーリングで取得）

---

## 6. 実装ロードマップ推奨

### Phase 1: 最小実装（コア機能）

- [ ] DBマイグレーション（maiml_asset / maiml_publish_registry の organization_id 追加含む）
- [ ] bullmqキューのセットアップ
- [ ] SAXパーサーによるMaiMLファイル解析（KV属性抽出）
- [ ] プレビュー生成（maxhold のみ）
- [ ] 公開API（POST /api/v1/publish）
- [ ] 非公開API（POST /api/v1/unpublish）
- [ ] フロントエンド：公開/非公開ボタン（基本UI）

### Phase 2: 品質向上

- [ ] uniform / mmr プレビューモードの追加
- [ ] 生データ保存（store_raw_series）の実装
- [ ] series_type判定ロジックの実装（サンプル入手後）
- [ ] フロントエンド：公開ステータス表示・設定フォーム

### Phase 3: 運用機能

- [ ] スケジュール自動非公開（bullmq Repeat Job）
- [ ] 品質指標保存（MAE/MAPE/Peak Recall/Area）
- [ ] プレビューデータの検索・表示UI

---

## 7. 依存パッケージ推奨

```json
{
  "dependencies": {
    "bullmq": "^5.x",     // ジョブキュー（Redisと接続）
    "sax": "^1.x"         // SAXストリーミングXML解析
  },
  "devDependencies": {
    "@types/sax": "^1.x"  // SAXの型定義
  }
}
```
