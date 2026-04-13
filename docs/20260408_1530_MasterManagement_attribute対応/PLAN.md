# タスク計画書: Attributeマスタの検索・編集処理追加

## メタデータ
- **作成日時**: 2026-04-08 14:02
- **タスクID**: attribute_master追加
- **優先度**: 中
- **推定工数**: 8〜12時間

## 1. タスク概要

`frontend/src/components/DataManagement/MasterManagement.tsx` に現在存在する Creator / Vendor / Instrument の3種類のマスタ管理画面に、**Attribute（属性）マスタ** を追加する。

Attributeマスタは DB テーブル `attribute`（DDL: `docs/design/db/ddl/attribute.sql`）として定義済みであり、今回のタスクで以下のカラムを追加するマイグレーションも実施する。

### 現行 attribute テーブル

| カラム名         | 型                  | 説明       |
|-----------------|---------------------|------------|
| organization_id | UUID (PK)           | 組織ID     |
| attribute_id    | CHARACTER VARYING (PK) | 属性ID   |
| attribute_name  | CHARACTER VARYING   | 属性名     |
| attribute_value | CHARACTER VARYING   | 属性値     |
| create_user_id  | VARCHAR             | 作成ユーザ |
| update_user_id  | VARCHAR             | 更新ユーザ |
| create_at       | TIMESTAMP           | 作成日時   |
| update_at       | TIMESTAMP           | 更新日時   |

### 今回追加するカラム（DDLマイグレーション）

| カラム名        | 型      | 説明                              |
|----------------|---------|-----------------------------------|
| is_active      | BOOLEAN | アクティブ判定（他マスタと統一）   |
| department_cd  | VARCHAR(50) | 部署CD（departmentテーブル参照）|

```sql
-- マイグレーション例
ALTER TABLE attribute ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE attribute ADD COLUMN department_cd VARCHAR(50);
```

`department_cd` は `department` テーブルの `department_cd` を参照する。  
値の選択はCreatorマスタの vendorName / instrumentName と同様に **Selectドロップダウン** で行う。

---

## 2. 目的と期待される成果

### 目的
マスタ管理画面（データ管理メニュー）でAttributeマスタの閲覧・追加・編集・アクティブ/非アクティブ切替ができるようにする。

### 期待される成果
- [ ] マスタ選択セレクトボックスに「Attribute」が追加される
- [ ] Attribute一覧がテーブルに表示される（検索・フィルタ含む）
- [ ] Attributeの新規追加ダイアログが動作する
- [ ] Attributeの編集ダイアログが動作する
- [ ] CSVダウンロード・アップロードが動作する（任意対応）
- [ ] バックエンドAPIが整備される（CRUD + CSV）

---

## 3. 現状の構造まとめ

### フロントエンド（既存構造）

```
MasterManagement.tsx
  └── convertMasterIdToType()    masterId文字列 → MasterDataType変換
  └── masterTypes (useMemo)      セレクトボックスの選択肢
  └── selectedMasterInfo         現在選択中マスタの設定（fields etc.）
  └── handleModalOk()            masterId='1','2','3' 別に個別API呼び出し

frontend/src/types/masterDataTypes.ts
  └── MasterDataType             'instrument' | 'vendor' | 'creator'
  └── MASTER_DATA_CONFIGS        各マスタのフィールド定義
  └── getMasterDataConfig()      type → config 取得関数

frontend/src/services/masterApiService.ts
  └── MasterRecord               CreatorRecord | InstrumentRecord | VendorRecord のUnion
  └── fetchMasters()             一覧取得
  └── createMaster() / updateMaster() など
```

### バックエンド（既存構造）

```
backend/src/controllers/masterController.ts   各マスタのCRUDコントローラー
backend/src/services/masterService.ts         ビジネスロジック
backend/src/repositories/
  ├── creatorRepository.ts
  ├── instrumentRepository.ts
  └── vendorRepository.ts
backend/src/routes/masterRoutes.ts            ルート定義
backend/src/sql/queries/
  ├── instruments/
  ├── creators/
  └── vendors/
```

---

## 4. 実装ステップ

### Phase 0: DBマイグレーション

- [ ] `backend/migrations/20260408_alter_attribute_add_columns.sql` を新規作成
  ```sql
  -- attribute テーブルに is_active / department_cd を追加
  ALTER TABLE attribute ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE attribute ADD COLUMN IF NOT EXISTS department_cd VARCHAR(50);
  ```
- [ ] `docs/design/db/ddl/attribute.sql` を更新（カラム追加を反映）

### Phase 1: バックエンド — リポジトリ層

- [ ] `backend/src/repositories/attributeRepository.ts` を新規作成
  - `findAll()` — 全件取得
  - `findById()` — ID指定1件取得
  - `findAllWithFilters()` — フィルタ付き取得（search / isActive）
  - `create()` — 新規作成（attribute_id, attribute_name, attribute_value, department_cd, is_active）
  - `update()` — 更新（attribute_name, attribute_value, department_cd, is_active）
  - `updateStatus()` — アクティブ/非アクティブ切替（is_active）
  - `existsById()` — ID重複チェック

- [ ] `backend/src/sql/queries/attributes/` ディレクトリを作成し以下を追加
  - `findAll.sql` — 全件取得（department JOINで department_name を付与）
  - `findById.sql` — ID指定1件取得
  - `findAllWithFilters.sql` — フィルタ付き取得のベースクエリ
  - `create.sql` — INSERT
  - `update.sql` — UPDATE
  - `updateStatus.sql` — is_active のみ更新

> **department_cd の JOIN について**  
> 一覧表示では `department` テーブルと JOIN し `department_name` も返すことで、
> 画面上に部署名を表示できるようにする（Creatorマスタの vendorName 表示と同様の方針）。

### Phase 2: バックエンド — サービス層

- [ ] `backend/src/services/masterService.ts` に Attribute 関連メソッドを追加
  - `getAttributeMastersWithFilters()` — フィルタ付き一覧取得（department JOIN含む）
  - `getAttributeById()` — 1件取得
  - `createAttributeMaster()` — 新規作成（department_cd は存在チェックあり）
  - `updateAttributeMaster()` — 更新
  - `updateAttributeStatus()` — アクティブ/非アクティブ切替
  - `uploadAttributesCsv()` — CSV一括登録

### Phase 3: バックエンド — コントローラー層

- [ ] `backend/src/controllers/masterController.ts` に Attribute 関連コントローラーを追加
  - `getAttributes()`
  - `getAttributeById()`
  - `createAttribute()`
  - `updateAttribute()`
  - `updateAttributeStatus()`
  - `downloadAttributesCsv()`
  - `uploadAttributesCsv()`

### Phase 4: バックエンド — ルート定義

- [ ] `backend/src/routes/masterRoutes.ts` に Attribute ルートを追加（既存マスタと同じパターン）
  ```
  GET    /api/v1/master/attribute
  GET    /api/v1/master/attribute/download-csv
  POST   /api/v1/master/attribute/upload-csv
  GET    /api/v1/master/attribute/:attributeId
  POST   /api/v1/master/attribute
  PUT    /api/v1/master/attribute/:attributeId
  PATCH  /api/v1/master/attribute/:attributeId/status
  ```

### Phase 5: フロントエンド — 型定義

- [ ] `frontend/src/types/masterDataTypes.ts` を更新
  - `MasterDataType` に `'attribute'` を追加
  - `MASTER_DATA_CONFIGS` に `attribute` 設定を追加
    ```typescript
    attribute: {
      masterId: '4',
      type: 'attribute',
      displayName: 'Attribute',
      apiEndpoint: '/master/attribute',
      supportsCsvUpload: true,
      supportsCsvDownload: true,
      fields: [
        { dbField: 'attributeId',    displayName: 'ID',      searchFixed: false, isDisplay: true,  addable: true,  update: false },
        { dbField: 'attributeName',  displayName: '属性名',   searchFixed: false, isDisplay: true,  addable: true,  update: true  },
        { dbField: 'attributeValue', displayName: '属性値',   searchFixed: false, isDisplay: true,  addable: true,  update: true  },
        { dbField: 'departmentName', displayName: '部署名',   searchFixed: false, isDisplay: true,  addable: true,  update: true  },
        { dbField: 'isActive',       displayName: 'ステータス', searchFixed: false, isDisplay: false, addable: true,  update: true  },
        { dbField: 'updatedAt',      displayName: '更新日時',  searchFixed: false, isDisplay: false, addable: false, update: false },
      ],
    }
    ```
  > `departmentName` は一覧表示用（JOIN結果）。入力フォームでは `departmentName` フィールドを Selectに差し替え。

- [ ] `frontend/src/services/masterApiService.ts` を更新
  - `AttributeRecord` 型を追加（attributeId, attributeName, attributeValue, departmentCd, departmentName?, isActive）
  - `MasterRecord` の Union 型に `AttributeRecord` を追加

### Phase 6: フロントエンド — MasterManagement.tsx

- [ ] `convertMasterIdToType()` に `'4' → 'attribute'` を追加
- [ ] `masterTypes`（useMemo）の `targetOrder` に `'attribute'` を追加
- [ ] 部署選択肢の state と useEffect を追加
  - `departmentOptions` state を追加（`[{ value: departmentCd, label: departmentName }]` 形式）
  - `selectedMasterInfo?.masterId === '4'` 時に部署一覧を取得する useEffect を追加
  - 取得API: `GET /api/v1/department`（既存）
- [ ] モーダルフォームで `departmentName` フィールドを Select に差し替え
  - Creatorマスタの vendorName / instrumentName と同じ実装パターン
  - 値は `{ departmentCd, departmentName }` の JSON文字列で保持
- [ ] `handleEdit()` で attribute 編集時に `departmentName` を JSON 形式に変換
- [ ] `handleModalOk()` に `masterId === '4'`（Attribute）の POST/PUT 処理を追加
  - POST: `attributeId`, `attributeName`, `attributeValue`, `departmentCd`, `isActive`
  - PUT:  `attributeName`, `attributeValue`, `departmentCd`, `isActive`
- [ ] `handleDownload()` / `handleCSVUpload()` に masterId `'4'` 分岐を追加

---

## 5. 影響範囲

### 変更するファイル
1. `backend/src/controllers/masterController.ts` — Attribute CRUD コントローラー追加
2. `backend/src/services/masterService.ts` — Attribute サービスメソッド追加
3. `backend/src/routes/masterRoutes.ts` — Attribute ルート追加
4. `frontend/src/types/masterDataTypes.ts` — MasterDataType, MASTER_DATA_CONFIGS に attribute 追加
5. `frontend/src/services/masterApiService.ts` — AttributeRecord 型・Union 型更新
6. `frontend/src/components/DataManagement/MasterManagement.tsx` — masterId '4' 分岐追加

### 新規作成するファイル
1. `backend/migrations/20260408_alter_attribute_add_columns.sql` — DBマイグレーション
2. `backend/src/repositories/attributeRepository.ts` — リポジトリ
3. `backend/src/sql/queries/attributes/findAll.sql`
4. `backend/src/sql/queries/attributes/findById.sql`
5. `backend/src/sql/queries/attributes/findAllWithFilters.sql`
6. `backend/src/sql/queries/attributes/create.sql`
7. `backend/src/sql/queries/attributes/update.sql`
8. `backend/src/sql/queries/attributes/updateStatus.sql`

### 変更するファイル（DDL）
- `docs/design/db/ddl/attribute.sql` — `is_active` / `department_cd` カラム追加を反映

### 変更するファイル（仕様書）
- `docs/design/api/api_master_management.md` — Attribute マスタ API エンドポイント一覧を追加
- `docs/design/ui/data_management/ui_master_main.md` — マスタ選択肢に「Attribute」追加・一覧テーブル列定義追加
- `docs/design/ui/data_management/ui_master_add_dialog.md` — Attribute 追加ダイアログのフィールド定義追加（attributeId / attributeName / attributeValue / departmentName Select）
- `docs/design/ui/data_management/ui_master_edit_dialog.md` — Attribute 編集ダイアログのフィールド定義追加（attributeName / attributeValue / departmentName Select）

### 影響を受ける機能
- データ管理 > マスタ管理画面（MasterManagement.tsx）のみ
- 既存の Creator / Vendor / Instrument 機能には影響なし
- attribute テーブルへのDBマイグレーションが必要（既存データの `is_active` は `DEFAULT TRUE` で補完）

---

## 6. 確定した仕様

ユーザーからの指示により以下を確定とする。

| 確認項目 | 決定内容 |
|---------|---------|
| is_active 機能 | **追加する**（DDLマイグレーションで `is_active BOOLEAN DEFAULT TRUE` を追加） |
| department_cd 機能 | **追加する**（DDLマイグレーションで `department_cd VARCHAR(50)` を追加） |
| masterId | **`'4'`** を Attribute に割り当てる |
| CSV 対応 | **対応する**（upload-csv / download-csv ともに実装） |
| corporation_id スコープ | **対応しない**（attribute テーブルは organization_id スコープのみ） |
| department_cd 選択UI | Creator の vendorName/instrumentName と同様の **Select ドロップダウン**（既存 `/api/v1/department` API を利用） |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| マイグレーション適用漏れ | 高 | 低 | Phase 0 完了後に DB スキーマを確認してから次フェーズへ進む |
| masterId `'4'` が他の画面と衝突 | 低 | 低 | 実装前に全ファイルで `'4'` の使用箇所を検索して確認 |
| department API が返すデータに非アクティブ部署が含まれる | 低 | 中 | Selectオプション生成時に `isActive !== false` でフィルタ（Creatorマスタと同様） |
| displayScope（全体/自組織）を Attribute に適用しない場合の UI 差異 | 低 | 低 | Attribute マスタ選択時は displayScope セレクトを非表示または organization_id 固定とする |

---

## 8. テスト計画

- [ ] DBマイグレーション適用後、attribute テーブルに `is_active` / `department_cd` カラムが存在すること
- [ ] マスタ選択セレクトに「Attribute」が表示されること
- [ ] Attribute マスタ一覧が表示されること（department_name JOIN 表示含む）
- [ ] 検索テキストで `attribute_name` / `attribute_value` が絞り込まれること
- [ ] 新規追加ダイアログで `attributeId` / `attributeName` / `attributeValue` / `departmentName`（Select） が入力・保存できること
- [ ] 編集ダイアログで `attributeName` / `attributeValue` / `departmentName` が変更・保存できること
- [ ] ID重複時に 409 エラーが適切に表示されること
- [ ] アクティブ/非アクティブ切替ボタンが動作すること
- [ ] 一括アクティブ化/非アクティブ化が動作すること
- [ ] CSV ダウンロードが動作すること（`department_cd` カラム含む）
- [ ] CSV アップロードが動作すること

---

## 9. 承認記録

- **計画書提示日時**: 2026-04-08 14:02
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 10. 実施記録

### 実施日時
開始: 2026-04-08 14:02  
完了: 2026-04-08 14:36

### 最終的な成果物
- [x] `backend/migrations/20260408_alter_attribute_add_columns.sql` 新規作成
- [x] `docs/design/db/ddl/attribute.sql` 更新（is_active / department_cd 追加）
- [x] `backend/src/sql/queries/attributes/findAll.sql` 新規作成
- [x] `backend/src/sql/queries/attributes/findById.sql` 新規作成
- [x] `backend/src/sql/queries/attributes/findAllWithFilters.sql` 新規作成
- [x] `backend/src/sql/queries/attributes/create.sql` 新規作成
- [x] `backend/src/sql/queries/attributes/update.sql` 新規作成
- [x] `backend/src/sql/queries/attributes/updateStatus.sql` 新規作成
- [x] `backend/src/repositories/attributeRepository.ts` 新規作成
- [x] `backend/src/services/masterService.ts` Attribute系メソッド追加
- [x] `backend/src/controllers/masterController.ts` Attributeコントローラー追加
- [x] `backend/src/routes/masterRoutes.ts` Attributeルート追加
- [x] `frontend/src/types/masterDataTypes.ts` attribute型・設定追加
- [x] `frontend/src/services/masterApiService.ts` AttributeRecord型・Union型追加
- [x] `frontend/src/components/DataManagement/MasterManagement.tsx` Attribute対応追加
