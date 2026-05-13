# タスク計画書: マスタ管理_Instrument_Vendor_DB接続化

## メタデータ
- **作成日時**: 2026-01-19 11:44
- **タスクID**: instrument-vendor-db-connection
- **優先度**: 中
- **推定工数**: 4時間

## 1. タスク概要

データ管理者メニューのマスタ管理画面で、InstrumentマスタとVendorマスタ選択時に、JSONファイルではなくデータベース（`instrument_master`、`vendor_master`）からデータを取得して一覧表示するように改修します。

## 2. 目的と期待される成果

### 目的
- InstrumentマスタとVendorマスタのデータソースを静的JSONファイルからデータベースに移行
- Creatorマスタと同様の実装パターンで統一
- リアルタイムなデータ更新を可能にする

### 期待される成果
- [ ] instrument_masterテーブルから正しくデータを取得できる
- [ ] vendor_masterテーブルから正しくデータを取得できる
- [ ] 一覧画面に正しくデータが表示される
- [ ] is_activeによるアクティブ/非アクティブの切り替えが機能する
- [ ] マルチテナント分離が正しく機能する

## 3. 実装ステップ

### Phase 1: マスタID確認
- [x] master-management-master.jsonでmasterIdを確認
  - Instrument: masterId="5"
  - Vendor: masterId="7"
  - Creator: masterId="8"（実装済み）

### Phase 2: バックエンド実装（Instrument）
- [ ] APIルート追加（/api/v1/master/instrument）
- [ ] コントローラー実装（getInstruments）
- [ ] サービス実装（getInstrumentMasters）
- [ ] リポジトリ実装（instrumentRepository.ts）

### Phase 3: バックエンド実装（Vendor）
- [ ] APIルート追加（/api/v1/master/vendor）
- [ ] コントローラー実装（getVendors）
- [ ] サービス実装（getVendorMasters）
- [ ] リポジトリ実装（vendorRepository.ts）

### Phase 4: フロントエンド実装
- [ ] fetchInstrumentMasters関数追加
- [ ] fetchVendorMasters関数追加
- [ ] useEffect条件分岐追加（masterId="5"と"7"の処理）

### Phase 5: テストデータ確認・作成
- [ ] instrument_masterのテストデータ確認
- [ ] vendor_masterのテストデータ確認
- [ ] 不足していれば作成

### Phase 6: 動作確認
- [ ] Instrumentマスタ一覧表示確認
- [ ] Vendorマスタ一覧表示確認
- [ ] Creatorマスタが引き続き正常動作することを確認

## 4. 影響範囲

### 変更するファイル
1. **バックエンド**
   - `backend/src/routes/masterRoutes.ts` - ルート追加
   - `backend/src/controllers/masterController.ts` - コントローラー追加
   - `backend/src/services/masterService.ts` - サービス追加
   - `backend/src/repositories/instrumentRepository.ts` - リポジトリ新規作成
   - `backend/src/repositories/vendorRepository.ts` - リポジトリ新規作成

2. **フロントエンド**
   - `frontend/mock/components/MasterManagementMock.tsx` - API呼び出し実装

### 新規作成するファイル
1. `backend/src/repositories/instrumentRepository.ts` - Instrumentマスタリポジトリ
2. `backend/src/repositories/vendorRepository.ts` - Vendorマスタリポジトリ

## 5. 技術的詳細

### 5.1. データベーススキーマ

#### instrument_master
```sql
CREATE TABLE instrument_master (
    organization_id CHARACTER VARYING NOT NULL,
    instrument_uuid UUID NOT NULL,
    instrument_id CHARACTER VARYING NOT NULL,      -- ID列
    instrument_name CHARACTER VARYING NOT NULL,    -- 名称列
    instrument_description CHARACTER VARYING,      -- 説明列
    instrument_annotation CHARACTER VARYING,       -- 注釈列
    is_active BOOLEAN,                             -- アクティブ判定
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT instrument_master_PKC PRIMARY KEY (organization_id, instrument_uuid)
);
```

#### vendor_master
```sql
CREATE TABLE vendor_master (
    organization_id CHARACTER VARYING NOT NULL,
    vendor_uuid UUID NOT NULL,
    vendor_id CHARACTER VARYING NOT NULL,          -- ID列
    vendor_name CHARACTER VARYING NOT NULL,        -- 名称列
    vendor_description CHARACTER VARYING,          -- 説明列
    vendor_annotation CHARACTER VARYING,           -- 注釈列
    is_active BOOLEAN,                             -- アクティブ判定
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT vendor_master_PKC PRIMARY KEY (organization_id, vendor_uuid)
);
```

### 5.2. データマッピング仕様

#### Instrumentマスタ
| DB カラム名 | 画面表示列名 | JSON項目名 |
|------------|------------|-----------|
| `instrument_id` | ID | laboratorEquipmentId |
| `instrument_name` | 名称 | laboratorEquipmentName |
| `instrument_description` | 説明 | laboratorEquipmentExplan |
| `instrument_annotation` | 注釈 | laboratorEquipmentAnnotation |
| `is_active` | アクティブボタン | isActive |

#### Vendorマスタ
| DB カラム名 | 画面表示列名 | JSON項目名 |
|------------|------------|-----------|
| `vendor_id` | ID | laboratorEquipmentVendorId |
| `vendor_name` | 名称 | laboratorEquipmentVendorName |
| `vendor_description` | 説明 | laboratorEquipmentVendorExplan |
| `vendor_annotation` | 注釈 | laboratorEquipmentVendorAnnotation |
| `is_active` | アクティブボタン | isActive |

### 5.3. API設計

#### エンドポイント1: GET /api/v1/master/instrument

**レスポンス（成功）**
```json
{
  "success": true,
  "data": [
    {
      "instrumentId": "INST001",
      "instrumentName": "X線回折装置",
      "instrumentDescription": "結晶構造解析用",
      "instrumentAnnotation": "定期校正必要",
      "isActive": true,
      "updatedAt": "2026-01-19T11:44:00"
    }
  ]
}
```

#### エンドポイント2: GET /api/v1/master/vendor

**レスポンス（成功）**
```json
{
  "success": true,
  "data": [
    {
      "vendorId": "VEND001",
      "vendorName": "Rigaku",
      "vendorDescription": "科学機器メーカー",
      "vendorAnnotation": "国内大手",
      "isActive": true,
      "updatedAt": "2026-01-19T11:44:00"
    }
  ]
}
```

### 5.4. SQL実装

#### Instrument取得SQL
```sql
SELECT 
    instrument_id,
    instrument_name,
    instrument_description,
    instrument_annotation,
    is_active,
    update_at
FROM instrument_master
WHERE organization_id = $1
ORDER BY instrument_id;
```

#### Vendor取得SQL
```sql
SELECT 
    vendor_id,
    vendor_name,
    vendor_description,
    vendor_annotation,
    is_active,
    update_at
FROM vendor_master
WHERE organization_id = $1
ORDER BY vendor_id;
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| テストデータ不足 | 中 | 中 | 事前に確認・作成 |
| 既存JSON構造との不一致 | 中 | 低 | データ変換処理で対応 |
| Creatorマスタへの影響 | 高 | 低 | 条件分岐を慎重に実装 |

## 7. テスト計画

### 手動テスト
- [ ] Instrumentマスタ一覧表示確認
- [ ] Vendorマスタ一覧表示確認
- [ ] Creatorマスタが引き続き正常動作
- [ ] アクティブ/非アクティブ切り替え確認
- [ ] 検索機能確認

## 8. ロールバック計画

問題が発生した場合、フロントエンドの条件分岐をコメントアウトしてJSONファイルからの読み込みに戻す。

## 9. 関連ドキュメント

- [instrument_master DDL](../design/db/ddl/instrument_master.sql)
- [vendor_master DDL](../design/db/ddl/vendor_master.sql)
- [Creator DB接続化タスク](./20260119_0818_マスタ管理_Creator_DB接続_PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-19 11:44
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 最終的な成果物
- [ ] バックエンドAPI実装完了（Instrument）
- [ ] バックエンドAPI実装完了（Vendor）
- [ ] フロントエンド修正完了
- [ ] 動作確認完了
