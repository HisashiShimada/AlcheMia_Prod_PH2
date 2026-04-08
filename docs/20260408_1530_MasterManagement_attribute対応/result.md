# 実装結果サマリー（最終版）

本ドキュメントは以下2タスクの対応結果をまとめたものです。

- タスク1: `docs/20260408_1402_attribute_master追加/PLAN.md`  
- タスク2: `docs/20260408_1530_MasterManagement_attribute対応/PLAN.md`

---

## 対応概要

`attribute` テーブルの構造変更（属性IDを削除・属性_備考を追加）と Attribute マスタ管理機能の新規追加に対応。
DBマイグレーション・バックエンド（SQL/Repository/Service/Controller/Routes）・フロントエンド（型定義/API Service/MasterManagement.tsx）をすべて実装済み。

---

## 変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260408_alter_attribute_add_columns.sql` | attribute テーブルに `is_active` / `department_cd` / `attribute_remark` を追加 |
| `backend/src/sql/queries/attributes/findAll.sql` | 全件取得（department JOIN で department_name 付与） |
| `backend/src/sql/queries/attributes/findById.sql` | 複合PK `(organization_id, attribute_name, attribute_value)` で1件取得 |
| `backend/src/sql/queries/attributes/findAllWithFilters.sql` | フィルタ付き全件取得（search / isActive / department_cd） |
| `backend/src/sql/queries/attributes/create.sql` | INSERT（attribute_remark 対応・attribute_id 除去） |
| `backend/src/sql/queries/attributes/update.sql` | UPDATE（複合PK WHERE条件・attribute_remark 対応） |
| `backend/src/sql/queries/attributes/updateStatus.sql` | is_active のみ更新（複合PK WHERE条件） |
| `backend/src/repositories/attributeRepository.ts` | CRUD リポジトリ（複合PK対応・attributeRemark 追加） |

### 更新済み（バックエンド）

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/masterService.ts` | Attribute 系メソッドを追加（getAttributeMastersWithFilters / getAttributeById / createAttributeMaster / updateAttributeMaster / updateAttributeStatus / uploadAttributesCsv） |
| `backend/src/controllers/masterController.ts` | Attribute 系コントローラーを追加（getAttributes / getAttributeById / createAttribute / updateAttribute / updateAttributeStatus / downloadAttributesCsv / uploadAttributesCsv） |
| `backend/src/routes/masterRoutes.ts` | Attribute ルートを追加（GET/POST/PUT/PATCH/CSV） |

### 更新済み（フロントエンド）

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/masterDataTypes.ts` | `MasterDataType` に `'attribute'` 追加 / `MASTER_DATA_CONFIGS` に attribute 設定追加（attributeName / attributeValue / attributeRemark / departmentName（searchFixed:true） / isActive / updatedAt） |
| `frontend/src/services/masterApiService.ts` | `AttributeRecord` 型追加（attributeName・attributeValue・attributeRemark・departmentCd・departmentName） / `MasterRecord` Union 型に追加 |
| `frontend/src/components/DataManagement/MasterManagement.tsx` | Attribute マスタ（masterId='4'）の全処理を追加・修正（下記詳細） |

### 更新済み（DDL・設計書）

| ファイル | 変更内容 |
|---------|---------|
| `docs/design/db/ddl/attribute.sql` | `is_active` / `department_cd` / `attribute_remark` カラム追加を反映 |
| `docs/design/api/api_master_management.md` | Attribute マスタ API エンドポイント一覧を追加 |
| `docs/design/ui/data_management/ui_master_main.md` | マスタ選択肢に「Attribute」追加・一覧テーブル列定義追加 |
| `docs/design/ui/data_management/ui_master_add_dialog.md` | Attribute 追加ダイアログのフィールド定義追加（attributeName Select+新規入力 / attributeValue / attributeRemark / departmentName Select） v1.1.0 |
| `docs/design/ui/data_management/ui_master_edit_dialog.md` | Attribute 編集ダイアログのフィールド定義追加（attributeName 読取専用 / attributeValue / attributeRemark / departmentName Select） v1.1.0 |

---

## MasterManagement.tsx 実装詳細

### タスク1（20260408_1402）で実装済み

| 処理 | 実装内容 |
|------|---------|
| `convertMasterIdToType()` | `'4' → 'attribute'` 追加 |
| `masterTypes`（useMemo） | `'attribute'` を targetOrder に追加 |
| 部署選択肢取得 | `selectedMasterInfo?.masterId === '4'` 時に `GET /systemManagement/department` を呼び出し `departmentOptions` を生成 |
| 属性名選択肢生成 | `masters` データから一意の `attributeName` を抽出し `attributeNameOptions` を生成（「＋ 新規入力」オプション付き） |
| `handleEdit()` | Attribute 編集時に `isNewAttributeName` リセット・`attributeNameSelect` に既存値をセット |
| `handleModalOk()` | `masterId === '4'` 分岐で POST/PUT 処理を追加 |
| `handleDownload()` | `masterId === '4'` 分岐で CSV ダウンロード対応 |
| `handleCSVUpload()` | `masterId === '4'` 分岐で CSV アップロード対応 |
| 一括有効化/無効化 | `DB_CONNECTED_MASTERS = ['3','2','1','4']` に `'4'` 追加済み |
| フォームフィールド描画 | `attributeName`（Select + 新規入力切替）・`departmentName`（Select）を描画 |
| `rowKey` | 複合PK `attributeName + '__' + attributeValue` の2項目複合に設定 |
| `handleModalOk()` の `attributeName` フォールバック | `isNewAttributeName` フラグに応じて `values.attributeName || values.attributeNameSelect` で安全取得 |
| Fix 3: `departmentName` `searchFixed: true` | `masterDataTypes.ts` の `departmentName` を `searchFixed: true` に設定済み → 部署ドロップダウンフィルター自動生成 |

### タスク2（20260408_1530）で実装

| Fix | 内容 |
|-----|------|
| Fix 1 | `handleModalOk()` の `attributeName` フォールバック → 確認済み（タスク1内で実装完了） |
| Fix 2 | `isNewAttributeName=true` 時の `Form.Item name="attributeName"` に `{ min: 1, message: '1文字以上入力してください' }` バリデーション追加 |
| Fix 3 | `departmentName` の `searchFixed: true` → 確認済み（タスク1内で実装完了） |

---

## attribute テーブルの PKカラム変更（重要）

### 変更前
```
主キー: (organization_id, attribute_id)
attribute_id: CHARACTER VARYING
```

### 変更後
```
主キー: (organization_id, attribute_name, attribute_value)
attribute_id: 廃止
attribute_remark: CHARACTER VARYING (nullable) ← 新規追加
```

### 影響するURL設計（バックエンド）

| エンドポイント | パラメータ形式 |
|---|---|
| `GET /master/attribute/:attributeId` | `attributeId = "name__value"`（URLエンコード） |
| `PUT /master/attribute/:attributeId` | `attributeId = attributeName`（URLエンコード）、body に `attributeValue` |
| `PATCH /master/attribute/:attributeId/status` | `attributeId = "name__value"`（URLエンコード） |

---

## 残作業（次セッション以降）

1. **ブラウザで Attribute マスタの CRUD 動作を確認する（結合テスト）**

   テストシナリオ（`docs/20260408_1530_MasterManagement_attribute対応/PLAN.md` Phase 1 参照）:
   - Attribute マスタ選択 → 一覧表示される
   - 検索テキスト入力 → `attributeName` / `attributeValue` / `departmentName` で絞り込まれる
   - 部署ドロップダウンフィルター動作確認
   - 新規追加（既存属性名選択 / 新規属性名入力）→ POST 成功
   - 編集ダイアログ → 既存値プリセット確認 → PUT 成功
   - アクティブ/非アクティブ個別切替・一括切替
   - CSV ダウンロード・CSV アップロード

2. **DBマイグレーション適用確認**  
   `backend/migrations/20260408_alter_attribute_add_columns.sql` が開発環境の DB に適用済みであることを確認する。
