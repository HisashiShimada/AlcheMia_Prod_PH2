# 不確かさ基準管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ルートバージョン**: `uncertaintyCriteriaRoutes.ts` v1.0.0 / `uncertaintyCriteriaController.ts` v1.0.0
- **カテゴリ**: 不確かさ基準管理（phase2 核心機能）

---

## 1. 概要

不確かさ基準管理APIは、MAIML実験データに付随する「不確かさ（uncertainty）」の評価基準を管理します。不確かさ基準はバージョン管理され、実験評価画面での基準選択・入力に使用されます。

### 主要機能
- **不確かさ基準管理**: 基準の作成・バージョン管理・無効化
- **評価方式**: 定量評価（xsi:type / 単位 / フォーマット文字列）と定性評価（選択肢リスト）の2種類
- **セレクター向け取得**: 実験評価画面（UncertaintyCriteriaSelectorModal）で使用する有効な基準一覧

### データモデルの概念

```
不確かさ基準（UncertaintyCriteria）
  ├─ 主キー: (organization_id, name_space_id, uncertainty_key, version)
  ├─ uncertaintyKey: "measurement_uncertainty_001"
  ├─ nameSpaceId: "ns_maiml_001"（名前空間への参照）
  ├─ version: 3（MAX(version)+1 で自動採番）
  ├─ evaluationMethod: 1（定量）または 2（定性）
  ├─ isInvalid: false（有効）/ true（無効化済み旧バージョン）
  │
  ├─ 定量評価の場合
  │    ├─ xsiType: "xsd:float"
  │    ├─ units: "mm"
  │    └─ formatString: "%.3f"
  │
  └─ 定性評価の場合
       └─ qualitativeOptions（intuition_selector テーブル）
            ├─ { displayOrder: 1, selectorValue: "低", displayColor: "#00FF00", isDefault: false }
            ├─ { displayOrder: 2, selectorValue: "中", displayColor: "#FFFF00", isDefault: true }
            └─ { displayOrder: 3, selectorValue: "高", displayColor: "#FF0000", isDefault: false }
```

### バージョン管理の仕組み

```
バージョン保存時のトランザクション処理:
  1. uncertainty_criteria に MAX(version)+1 で新規 INSERT
  2. 同一 (organization_id, name_space_id, uncertainty_key) の旧バージョンを一括無効化
     （is_Invalid = TRUE に UPDATE）
  3. 定性評価（evaluationMethod=2）の場合、intuition_selector に選択肢を INSERT
```

### 使用箇所

- **不確かさ基準管理画面**: 基準の登録・バージョン更新・履歴確認
- **実験評価画面 / UncertaintyCriteriaSelectorModal**: `/for-selector` エンドポイントで有効な基準一覧を取得
- **実験記録**: 不確かさ基準の選択・評価値の入力

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/uncertainty-criteria
```

### 2.2. 認証・テナント分離

すべてのエンドポイントに `authMiddleware` + `tenantIsolation` が適用されます。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `organizationId` はセッションから自動取得
- クロステナントアクセスは `tenantIsolation` ミドルウェアで禁止

### 2.3. 権限

- **すべてのロールがアクセス可能**（テナント分離で保護）

### 2.4. 評価方式コード

| コード | 種別 | 説明 |
|--------|------|------|
| `1` | 定量評価 | 数値による評価。`xsiType` / `units` / `formatString` を使用 |
| `2` | 定性評価 | 選択肢による評価。`qualitativeOptions` を `intuition_selector` テーブルで管理 |

### 2.5. 共通レスポンス形式

**エラーレスポンス（404）**:
```json
{
  "error": {
    "code": "E6001",
    "message": "Uncertainty criterion not found"
  }
}
```

**エラーレスポンス（バリデーション 400）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "evaluationMethod must be 1 (quantitative) or 2 (qualitative)",
    "details": []
  }
}
```

---

## 3. API一覧

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 1 | GET | `/api/v1/uncertainty-criteria` | 不確かさ基準一覧取得（全バージョン） | ✅ 実装済み |
| 2 | GET | `/api/v1/uncertainty-criteria/for-selector` | セレクター用一覧取得（有効版のみ） | ✅ 実装済み |
| 3 | GET | `/api/v1/uncertainty-criteria/:uncertaintyKey` | 不確かさ基準詳細取得 | ✅ 実装済み |
| 4 | POST | `/api/v1/uncertainty-criteria` | 新バージョン保存 | ✅ 実装済み |

**完了率**: 100% (4/4)

---

## 4. API詳細仕様

---

### 4.1. GET /api/v1/uncertainty-criteria — 不確かさ基準一覧取得

**説明**: 組織に紐づく不確かさ基準の全バージョン一覧を取得する。無効化済み（`isInvalid=true`）のバージョンも含む。

#### リクエスト

パラメータなし（組織IDはセッションから自動取得）

#### レスポンス

**成功時（200 OK）**:
```json
[
  {
    "uncertaintyKey": "measurement_uncertainty_001",
    "uncertaintyName": "測定不確かさA",
    "nameSpaceId": "ns_maiml_001",
    "version": 3,
    "evaluationMethod": 1,
    "isInvalid": false,
    "inheritanceUncertaintyKey": null,
    "xsiType": "xsd:float",
    "units": "mm",
    "formatString": "%.3f",
    "description": "長さ測定の不確かさ基準"
  },
  {
    "uncertaintyKey": "measurement_uncertainty_001",
    "uncertaintyName": "測定不確かさA（旧版）",
    "nameSpaceId": "ns_maiml_001",
    "version": 2,
    "evaluationMethod": 1,
    "isInvalid": true,
    "inheritanceUncertaintyKey": null,
    "xsiType": "xsd:float",
    "units": "mm",
    "formatString": "%.2f",
    "description": null
  }
]
```

**フィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `uncertaintyKey` | string | 不確かさ基準を識別するキー |
| `uncertaintyName` | string | 不確かさ基準名 |
| `nameSpaceId` | string | 紐づく名前空間ID |
| `version` | number | バージョン番号（1始まり） |
| `evaluationMethod` | number | `1`: 定量 / `2`: 定性 |
| `isInvalid` | boolean | `true`: 無効化済み（旧バージョン）/ `false`: 有効 |
| `inheritanceUncertaintyKey` | string \| null | 継承元の不確かさ基準Key |
| `xsiType` | string \| null | xsi:type（定量のみ）例: `xsd:float` |
| `units` | string \| null | 単位（定量のみ）例: `mm`, `°C` |
| `formatString` | string \| null | フォーマット文字列（定量のみ）例: `%.3f` |
| `description` | string \| null | 説明文 |

#### 実装ファイル
- **コントローラー**: `uncertaintyCriteriaController.ts` (`getList`)
- **サービス**: `uncertaintyCriteriaService.ts` (`getList`)
- **SQL**: `backend/src/sql/uncertainty_criteria/findAllByOrganization.sql`

---

### 4.2. GET /api/v1/uncertainty-criteria/for-selector — セレクター用一覧取得

**説明**: 実験評価画面の `UncertaintyCriteriaSelectorModal` で使用する、有効（`isInvalid=FALSE`）な不確かさ基準の一覧を取得する。定性評価の選択肢（`qualitativeOptions`）も含む。

> ⚠️ **ルーティング上の注意**: `/:uncertaintyKey` より前に定義されているため、`/for-selector` が正しく解決される。

#### リクエスト

パラメータなし

#### レスポンス

**成功時（200 OK）**:
```json
[
  {
    "uncertaintyKey": "measurement_uncertainty_001",
    "uncertaintyName": "測定不確かさA",
    "nameSpaceId": "ns_maiml_001",
    "version": 3,
    "evaluationMethod": 1,
    "xsiType": "xsd:float",
    "units": "mm",
    "formatString": "%.3f",
    "description": "長さ測定の不確かさ基準",
    "qualitativeOptions": []
  },
  {
    "uncertaintyKey": "quality_uncertainty_001",
    "uncertaintyName": "品質評価基準B",
    "nameSpaceId": "ns_maiml_001",
    "version": 2,
    "evaluationMethod": 2,
    "xsiType": null,
    "units": null,
    "formatString": null,
    "description": "目視による品質評価",
    "qualitativeOptions": [
      {
        "displayOrder": 1,
        "selectorValue": "低",
        "displayColor": "#00FF00",
        "isDefault": false
      },
      {
        "displayOrder": 2,
        "selectorValue": "中",
        "displayColor": "#FFFF00",
        "isDefault": true
      },
      {
        "displayOrder": 3,
        "selectorValue": "高",
        "displayColor": "#FF0000",
        "isDefault": false
      }
    ]
  }
]
```

**一覧レスポンスのフィールド定義**（`UncertaintyCriteriaSelectorRow`）:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `uncertaintyKey` | string | 不確かさ基準Key |
| `uncertaintyName` | string | 不確かさ基準名 |
| `nameSpaceId` | string | 名前空間ID |
| `version` | number | バージョン番号 |
| `evaluationMethod` | number | `1`: 定量 / `2`: 定性 |
| `xsiType` | string \| null | xsi:type（定量のみ） |
| `units` | string \| null | 単位（定量のみ） |
| `formatString` | string \| null | フォーマット文字列（定量のみ） |
| `description` | string \| null | 説明文 |
| `qualitativeOptions` | QualitativeOptionRow[] | 定性評価の選択肢（定量の場合は空配列） |

**`QualitativeOptionRow` フィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `displayOrder` | number | 表示順（1始まり） |
| `selectorValue` | string | 選択肢の値（表示ラベル） |
| `displayColor` | string | 表示色（`#RRGGBB` 形式） |
| `isDefault` | boolean | デフォルト選択かどうか |

#### 実装ファイル
- **コントローラー**: `uncertaintyCriteriaController.ts` (`getForSelector`)
- **サービス**: `uncertaintyCriteriaService.ts` (`getForSelector`)
- **SQL**: `backend/src/sql/uncertainty_criteria/findForSelector.sql`

---

### 4.3. GET /api/v1/uncertainty-criteria/:uncertaintyKey — 不確かさ基準詳細取得

**説明**: 指定した `uncertaintyKey` と `version` の不確かさ基準を1件取得する。定性評価の場合は `qualitativeOptions` も含む。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `uncertaintyKey` | string | ✅ | 不確かさ基準Key |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `version` | integer | ✅ | バージョン番号（1以上の整数） |

**リクエスト例**:
```
GET /api/v1/uncertainty-criteria/measurement_uncertainty_001?version=3
```

#### レスポンス

**成功時（200 OK）**:

定量評価の場合:
```json
{
  "uncertaintyKey": "measurement_uncertainty_001",
  "uncertaintyName": "測定不確かさA",
  "nameSpaceId": "ns_maiml_001",
  "version": 3,
  "evaluationMethod": 1,
  "isInvalid": false,
  "inheritanceUncertaintyKey": null,
  "xsiType": "xsd:float",
  "units": "mm",
  "formatString": "%.3f",
  "description": "長さ測定の不確かさ基準",
  "qualitativeOptions": []
}
```

定性評価の場合:
```json
{
  "uncertaintyKey": "quality_uncertainty_001",
  "uncertaintyName": "品質評価基準B",
  "nameSpaceId": "ns_maiml_001",
  "version": 2,
  "evaluationMethod": 2,
  "isInvalid": false,
  "inheritanceUncertaintyKey": null,
  "xsiType": null,
  "units": null,
  "formatString": null,
  "description": "目視による品質評価",
  "qualitativeOptions": [
    {
      "displayOrder": 1,
      "selectorValue": "低",
      "displayColor": "#00FF00",
      "isDefault": false
    },
    {
      "displayOrder": 2,
      "selectorValue": "中",
      "displayColor": "#FFFF00",
      "isDefault": true
    }
  ]
}
```

**エラー時**:
| ステータス | エラーコード | 説明 |
|-----------|-------------|------|
| 400 | `VALIDATION_ERROR` | `uncertaintyKey` が未指定、または `version` が整数でない |
| 401 | `AUTH_TOKEN_INVALID` | 認証エラー |
| 404 | `E6001` | 指定した基準が存在しない |

#### 実装ファイル
- **コントローラー**: `uncertaintyCriteriaController.ts` (`getDetail`)
- **サービス**: `uncertaintyCriteriaService.ts` (`getDetail`)
- **SQL**: `backend/src/sql/uncertainty_criteria/findByKey.sql`

---

### 4.4. POST /api/v1/uncertainty-criteria — 新バージョン保存

**説明**: 不確かさ基準を新バージョンとして保存する。同一 `(organization_id, name_space_id, uncertainty_key)` の最大バージョン+1で新規 INSERT し、旧バージョンを一括無効化する。定性評価の場合は `intuition_selector` にも選択肢を INSERT する。

> **注意**: この操作は既存バージョンを上書きせず、常に新バージョンを作成する。旧バージョンは `isInvalid=TRUE` に更新される（論理削除）。

#### リクエスト

**Content-Type**: `application/json`

**ボディ（定量評価の例）**:
```json
{
  "nameSpaceId": "ns_maiml_001",
  "uncertaintyKey": "measurement_uncertainty_001",
  "uncertaintyName": "測定不確かさA v4",
  "evaluationMethod": 1,
  "isInvalid": false,
  "inheritanceUncertaintyKey": null,
  "xsiType": "xsd:float",
  "units": "mm",
  "formatString": "%.4f",
  "description": "長さ測定の不確かさ基準（精度向上版）",
  "qualitativeOptions": []
}
```

**ボディ（定性評価の例）**:
```json
{
  "nameSpaceId": "ns_maiml_001",
  "uncertaintyKey": "quality_uncertainty_001",
  "uncertaintyName": "品質評価基準B v3",
  "evaluationMethod": 2,
  "isInvalid": false,
  "inheritanceUncertaintyKey": null,
  "xsiType": null,
  "units": null,
  "formatString": null,
  "description": "目視による品質評価（選択肢追加版）",
  "qualitativeOptions": [
    {
      "displayOrder": 1,
      "value": "低",
      "displayColor": "#00FF00",
      "isDefault": false
    },
    {
      "displayOrder": 2,
      "value": "中",
      "displayColor": "#FFFF00",
      "isDefault": true
    },
    {
      "displayOrder": 3,
      "value": "高",
      "displayColor": "#FF0000",
      "isDefault": false
    }
  ]
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `nameSpaceId` | string | ✅ | 紐づく名前空間ID |
| `uncertaintyKey` | string | ✅ | 不確かさ基準Key（既存キーの場合はバージョンアップ） |
| `uncertaintyName` | string | × | 不確かさ基準名（省略時は空文字列） |
| `evaluationMethod` | integer | ✅ | `1`: 定量 / `2`: 定性 |
| `isInvalid` | boolean | × | `true` で無効な基準として保存（省略時: `false`） |
| `inheritanceUncertaintyKey` | string \| null | × | 継承元の不確かさ基準Key |
| `xsiType` | string \| null | × | xsi:type（定量のみ）例: `xsd:float` |
| `units` | string \| null | × | 単位（定量のみ）例: `mm`, `°C` |
| `formatString` | string \| null | × | フォーマット文字列（定量のみ）例: `%.3f` |
| `description` | string \| null | × | 説明文 |
| `qualitativeOptions` | array | × | 定性評価の選択肢（定量の場合は省略可） |

**`qualitativeOptions` 要素の定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `displayOrder` | integer | ✅ | 表示順（1始まり） |
| `value` | string | ✅ | 選択肢の値（表示ラベル） |
| `displayColor` | string | ✅ | 表示色（`#RRGGBB` 形式） |
| `isDefault` | boolean | ✅ | デフォルト選択にする場合 `true` |

#### レスポンス

**成功時（201 Created）**:
```json
{
  "version": 4
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `version` | number | 新たに採番されたバージョン番号 |

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | 必須フィールド未指定、または `evaluationMethod` が 1/2 以外 |
| 401 | 認証エラー |
| 500 | システムエラー（トランザクション失敗） |

#### トランザクション処理詳細

```
① uncertainty_criteria テーブルに新バージョンを INSERT
   （version = MAX(version) + 1 で自動採番）
   ↓
② 同一 (organization_id, name_space_id, uncertainty_key) の
   旧バージョン（version < new_version）を一括無効化
   （is_Invalid = TRUE に UPDATE）
   ↓
③ evaluationMethod=2（定性）かつ qualitativeOptions が空でない場合
   intuition_selector テーブルに選択肢を INSERT
```

#### 実装ファイル
- **コントローラー**: `uncertaintyCriteriaController.ts` (`createNewVersion`)
- **サービス**: `uncertaintyCriteriaService.ts` (`createNewVersion`)
- **SQL**: 
  - `backend/src/sql/uncertainty_criteria/insertNewVersion.sql`
  - `backend/src/sql/uncertainty_criteria/invalidatePreviousVersions.sql`
  - `backend/src/sql/uncertainty_criteria/insertIntuitionSelector.sql`

---

## 5. 関連テーブル

| テーブル | 役割 |
|---------|------|
| `uncertainty_criteria` | 不確かさ基準本体。主キー: `(organization_id, name_space_id, uncertainty_key, version)` |
| `intuition_selector` | 定性評価の選択肢。主キー: `(organization_id, name_space_id, uncertainty_key, version, display_order)` |

---

## 6. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/uncertaintyCriteriaRoutes.ts` (v1.0.0) |
| コントローラー | `backend/src/controllers/uncertaintyCriteriaController.ts` (v1.0.0) |
| サービス | `backend/src/services/uncertaintyCriteriaService.ts` (v1.0.0) |
| リポジトリ | `backend/src/repositories/uncertaintyCriteriaRepository.ts` (v1.0.0) |
| SQL | `backend/src/sql/uncertainty_criteria/` |

---

## 7. 関連ドキュメント

- [api_list.md](./api_list.md)
- [api_namespace.md](./api_namespace.md)（nameSpaceId による名前空間との連携）
- `docs/requirement/phase2/03_Uncertainty/`（不確かさ機能の要件定義）

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 4エンドポイント全件を記載 | |
| | | - uncertaintyCriteriaRoutes.ts v1.0.0 / Controller v1.0.0 をベースに作成 | |
| | | - バージョン管理トランザクションの詳細を記載 | |
| | | - 定量/定性評価の2種類の評価方式を詳細に記載 | |
