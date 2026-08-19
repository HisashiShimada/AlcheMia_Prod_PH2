# 実験評価管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ファイル**: `experimentEvaluationRoutes.ts` / `experimentEvaluationController.ts` v1.0.0
- **カテゴリ**: 実験評価・不確かさ評価管理

---

## 1. 概要

実験評価管理APIは、実験プロジェクトにおける不確かさ評価（Uncertainty Evaluation）データの管理と、MAiMLファイルへのエクスポート機能を提供します。承認処理ダイアログの定性評価保存・取得に使用されます。

### 主要機能
- **評価データ取得**: プロジェクト単位で評価結果一覧を取得
- **評価データ一括保存**: 複数の評価結果をUPSERT（存在すれば更新・なければ挿入）
- **MAiMLエクスポート**: DBに保存された評価データをMAiMLファイルの `<Uncertainties>` セクションに書き出し（プロジェクト完了処理）

### データモデルの概念

```
実験評価（ExperimentEvaluation）
  ├─ 識別キー: (organization_id, project_id, evaluation_unit, name_space_id, uncertainty_key, uc_version)
  ├─ evaluation_unit: "task_001_transition_002"（評価単位の識別子）
  ├─ method_id: "method_001"（紐づくメソッドID）
  ├─ task_no: 1（紐づくタスク番号）
  ├─ transition_id: "transition_002"（紐づくトランジションID）
  ├─ name_space_id: "ns_maiml_001"（不確かさ基準の名前空間）
  ├─ uncertainty_key: "quality_uncertainty_001"（不確かさ基準Key）
  ├─ uc_version: 2（不確かさ基準バージョン）
  ├─ evaluation_value: "中"（評価値。定性: 選択肢値 / 定量: 数値文字列）
  ├─ comment: "目視確認済み"
  ├─ uncertainty_xml: { ... }（XML補足データ）
  ├─ evaluated_by: "user-001"
  └─ evaluated_at: "2026-08-14T11:00:00.000Z"
```

### MAiMLへの書き出しフロー（export-to-maiml）

```
① experiment_evaluation テーブルから全評価データ取得
   ↓
② projectId → project_uuid を取得（projectRepository）
   ↓
③ project_uuid → file_metadata → MAiMLファイルの file_key を特定
   （fallback: project_uuid が未設定の場合は project_name で検索）
   ↓
④ S3/Swift から既存の MAiML ファイルを読み込み
   ↓
⑤ 各評価レコードを <Uncertainty> タグに変換し
   <Uncertainties> セクションを置換（既存あり）または挿入（なければ </maiml> 直前）
   ↓
⑥ 更新済み XML を S3/Swift に上書き保存
```

### 使用箇所
- **承認処理ダイアログ**: 定性評価の入力・保存・取得
- **プロジェクト完了処理**: 全評価データをMAiMLファイルに書き出す

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/experiment-evaluations
```

### 2.2. 認証・テナント分離

すべてのエンドポイントに `authMiddleware` + `tenantIsolation` が適用されます。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `organizationId` はセッションから自動取得
- クロステナントアクセスは `tenantIsolation` ミドルウェアで禁止

### 2.3. 共通レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... }
}
```

**エラーレスポンス（404）**:
```json
{
  "error": {
    "code": "E6001",
    "message": "Project not found"
  }
}
```

**バリデーションエラー（400）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "evaluationUnit is required",
    "details": []
  }
}
```

### 2.4. エラーコード

| コード | ステータス | 説明 |
|--------|----------|------|
| `E6001` | 404 | プロジェクトが見つからない |
| `E6002` | 404 | MAiMLファイルが見つからない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |

---

## 3. API一覧

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 1 | GET | `/api/v1/experiment-evaluations/:projectId` | 評価結果一覧取得 | ✅ 実装済み |
| 2 | POST | `/api/v1/experiment-evaluations` | 評価結果一括UPSERT | ✅ 実装済み |
| 3 | POST | `/api/v1/experiment-evaluations/:projectId/export-to-maiml` | MAiMLへ一括書き出し | ✅ 実装済み |

**完了率**: 100% (3/3)

---

## 4. API詳細仕様

---

### 4.1. GET /api/v1/experiment-evaluations/:projectId — 評価結果一覧取得

**説明**: 指定プロジェクトの全評価結果を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectId` | string | ✅ | プロジェクトID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "organizationId": "org-001",
      "projectId": "project-001",
      "evaluationUnit": "task_001_transition_002",
      "methodId": "method_001",
      "taskNo": 1,
      "transitionId": "transition_002",
      "nameSpaceId": "ns_maiml_001",
      "uncertaintyKey": "quality_uncertainty_001",
      "ucVersion": 2,
      "evaluationValue": "中",
      "comment": "目視確認済み",
      "uncertaintyXml": null,
      "evaluatedBy": "user-001",
      "evaluatedAt": "2026-08-14T11:00:00.000Z"
    }
  ]
}
```

**フィールド定義**（`ExperimentEvaluationRow`）:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `organizationId` | string | 組織ID |
| `projectId` | string | プロジェクトID |
| `evaluationUnit` | string | 評価単位の識別子 |
| `methodId` | string \| null | メソッドID |
| `taskNo` | number \| null | タスク番号 |
| `transitionId` | string \| null | トランジションID |
| `nameSpaceId` | string | 不確かさ基準の名前空間ID |
| `uncertaintyKey` | string | 不確かさ基準Key |
| `ucVersion` | number | 不確かさ基準バージョン |
| `evaluationValue` | string \| null | 評価値（定性: 選択肢値 / 定量: 数値文字列） |
| `comment` | string \| null | コメント |
| `uncertaintyXml` | object \| null | XML補足データ |
| `evaluatedBy` | string \| null | 評価実施者のユーザーID |
| `evaluatedAt` | string \| null | 評価日時（ISO 8601） |

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `projectId` が未指定 |
| 401 | 認証エラー |

#### 実装ファイル
- **コントローラー**: `experimentEvaluationController.ts` (`getByProject`)
- **サービス**: `experimentEvaluationService.ts` (`getByProject`)
- **SQL**: `experimentEvaluationRepository.findByProject()`

---

### 4.2. POST /api/v1/experiment-evaluations — 評価結果一括UPSERT

**説明**: 複数の評価結果を一括UPSERT（存在すれば更新・なければ挿入）する。承認処理ダイアログからの評価データ保存に使用される。

#### リクエスト

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "projectId": "project-001",
  "evaluations": [
    {
      "evaluationUnit": "task_001_transition_002",
      "methodId": "method_001",
      "taskNo": 1,
      "transitionId": "transition_002",
      "nameSpaceId": "ns_maiml_001",
      "uncertaintyKey": "quality_uncertainty_001",
      "ucVersion": 2,
      "evaluationValue": "中",
      "comment": "目視確認済み",
      "uncertaintyXml": null
    },
    {
      "evaluationUnit": "task_001_transition_003",
      "nameSpaceId": "ns_maiml_001",
      "uncertaintyKey": "measurement_uncertainty_001",
      "ucVersion": 3,
      "evaluationValue": "0.025"
    }
  ]
}
```

**フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `projectId` | string | ✅ | プロジェクトID |
| `evaluations` | EvaluationInput[] | ✅ | 評価データ配列（1件以上必須） |

**`EvaluationInput` フィールド定義**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `evaluationUnit` | string | ✅ | 評価単位の識別子 |
| `nameSpaceId` | string | ✅ | 不確かさ基準の名前空間ID |
| `uncertaintyKey` | string | ✅ | 不確かさ基準Key |
| `ucVersion` | integer | ✅ | 不確かさ基準バージョン（1以上の整数） |
| `methodId` | string | × | メソッドID |
| `taskNo` | integer | × | タスク番号 |
| `transitionId` | string | × | トランジションID |
| `evaluationValue` | string | × | 評価値（定性: 選択肢値 / 定量: 数値文字列） |
| `comment` | string | × | コメント |
| `uncertaintyXml` | object | × | XML補足データ |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "organizationId": "org-001",
      "projectId": "project-001",
      "evaluationUnit": "task_001_transition_002",
      "methodId": "method_001",
      "taskNo": 1,
      "transitionId": "transition_002",
      "nameSpaceId": "ns_maiml_001",
      "uncertaintyKey": "quality_uncertainty_001",
      "ucVersion": 2,
      "evaluationValue": "中",
      "comment": "目視確認済み",
      "uncertaintyXml": null,
      "evaluatedBy": "user-001",
      "evaluatedAt": "2026-08-14T11:00:00.000Z"
    }
  ]
}
```

**エラー時（バリデーション）**:
| ステータス | 説明 |
|-----------|------|
| 400 | 必須フィールド未指定（`projectId`/`evaluationUnit`/`nameSpaceId`/`uncertaintyKey`/`ucVersion`） |
| 400 | `evaluations` が空配列 |
| 400 | `ucVersion` が1未満の整数 |
| 401 | 認証エラー |

#### 実装ファイル
- **コントローラー**: `experimentEvaluationController.ts` (`saveEvaluations`)
- **サービス**: `experimentEvaluationService.ts` (`saveEvaluations`)
- **Repository**: `experimentEvaluationRepository.upsertEvaluations()`

---

### 4.3. POST /api/v1/experiment-evaluations/:projectId/export-to-maiml — MAiMLへ一括書き出し

**説明**: DBに保存された評価データをMAiMLファイルの `<Uncertainties>` セクションに一括書き込みする。プロジェクト完了処理の一部として呼び出される。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectId` | string | ✅ | プロジェクトID |

ボディは不要。

#### レスポンス

**成功時（200 OK）— 書き出しあり**:
```json
{
  "success": true,
  "data": {
    "written": 3,
    "message": "3 evaluation record(s) written to MAiML file"
  }
}
```

**成功時（200 OK）— 評価データなし**:
```json
{
  "success": true,
  "data": {
    "written": 0,
    "message": "No evaluation data found, skipping write."
  }
}
```

**フィールド定義**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| `written` | number | MAiMLファイルに書き込まれた評価件数 |
| `message` | string | 処理結果メッセージ |

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | `projectId` が未指定 |
| 401 | - | 認証エラー |
| 404 | `E6001` | プロジェクトが見つからない |
| 404 | `E6002` | MAiMLファイルが見つからない（`file_metadata` に存在しないか、S3/Swiftにファイルがない） |

#### MAiMLへの書き出し形式

評価データは以下の `<Uncertainty>` タグに変換されます。

```xml
<Uncertainties>
  <!-- Qualitative evaluation data written by evaluation process -->
  <Uncertainty evaluationUnit="task_001_transition_002"
               methodId="method_001"
               taskNo="1"
               transitionId="transition_002"
               nameSpaceId="ns_maiml_001"
               uncertaintyKey="quality_uncertainty_001"
               ucVersion="2"
               value="中"
               evaluatedAt="2026-08-14T11:00:00.000Z">
    <Comment>目視確認済み</Comment>
  </Uncertainty>
  <Uncertainty evaluationUnit="task_001_transition_003"
               nameSpaceId="ns_maiml_001"
               uncertaintyKey="measurement_uncertainty_001"
               ucVersion="3"
               value="0.025"
               evaluatedAt="2026-08-14T11:01:00.000Z">
  </Uncertainty>
</Uncertainties>
```

**書き込みルール**:
- `evaluation_value` が空の評価レコードは書き出し対象外
- MAiMLに `<Uncertainties>` セクションが既にある場合は**置換**
- `<Uncertainties>` がない場合は `</maiml>` 直前に**挿入**
- コメント（`comment`）がある場合のみ `<Comment>` タグを追記

#### 実装ファイル
- **コントローラー**: `experimentEvaluationController.ts` (`exportToMaiml`)
- **サービス**: `experimentEvaluationService.ts` (`exportToMaiml`)
- **依存サービス**:
  - `projectRepository.findNameAndUuidById()`: projectId → project_uuid 取得
  - `FileMetadataRepository.findMaimlByProjectUuid()` / `findMaimlByProjectName()`: MAiMLファイルのfile_key取得
  - `storageService.downloadFile()` / `uploadFile()`: S3/Swiftとのファイル操作

---

## 5. 関連テーブル

| テーブル | 役割 |
|---------|------|
| `experiment_evaluation` | 評価データ本体 |
| `file_metadata` | MAiMLファイルの保存先（file_key）管理 |

---

## 6. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/experimentEvaluationRoutes.ts` (v1.0.0) |
| コントローラー | `backend/src/controllers/experimentEvaluationController.ts` (v1.0.0) |
| サービス | `backend/src/services/experimentEvaluationService.ts` (v1.0.0) |
| リポジトリ | `backend/src/repositories/experimentEvaluationRepository.ts` |

---

## 7. 関連ドキュメント

- [api_list.md](./api_list.md)
- [api_uncertainty_criteria.md](./api_uncertainty_criteria.md)（`uncertaintyKey` / `nameSpaceId` / `ucVersion` との連携）

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 3エンドポイント全件を記載 | |
| | | - EvaluationInput 型の詳細フィールドを記載 | |
| | | - export-to-maiml の6ステップ処理フローを記載 | |
| | | - MAiMLへの `<Uncertainty>` / `<Uncertainties>` 書き出し形式を記載 | |
