# タスク計画書: api_project_management.md 実験データ関連API追加

## メタデータ
- **作成日時**: 2026-03-12 15:22
- **タスクID**: api_project_management実験データAPI追加
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/api/API一覧_実験作業者画面.md` の「3. 実験データ関連 API」（#6, #7, #8、ただし #9 を除く）に記載されているAPIについて、ソースコード実装を元に `docs/design/api/api_project_management.md` に正確な仕様を追加する。

## 目的と期待される成果

- [ ] 実装実態に即した実験データ関連APIの仕様書を追加
- [ ] `API一覧_実験作業者画面.md` の記載との差異を明確化
- [ ] 廃止済みAPIの扱いを正確に記載

## 調査結果

### 調査対象ファイル

| ファイル | 用途 |
|---------|------|
| `backend/src/controllers/experimentController.ts` | コントローラー層 |
| `backend/src/services/experimentDataService.ts` | サービス層 |
| `backend/src/repositories/templateDataRepository.ts` | リポジトリ層 |
| `backend/src/routes/experimentRoutes.ts` | ルート定義・ミドルウェア |

### API #6: テンプレート実績取得

**実際のエンドポイント**: `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`

`API一覧_実験作業者画面.md` との差異:

| 項目 | API一覧記載 | 実装の実態 |
|------|------------|-----------|
| エンドポイント末尾 | `/template-data` | `/data` |
| クエリパラメータ | なし | `transitionId`（**必須**） |
| レスポンス構造 | フラットな配列 | ネスト構造（`templates`配列等） |
| 権限 | 未記載 | `experiment_worker` 以上（機能CD: `050000`）読取可 |

**実際のレスポンス構造** (`GetTemplateDataResult` 型、`experimentDataService.ts`):
```json
{
  "success": true,
  "data": {
    "projectName": "string",
    "methodId": "string",
    "taskNo": 1,
    "transitionId": "string",
    "adjacentPlaceIds": ["place001", "place002"],
    "templates": [
      {
        "placeId": "string",
        "templateType": "material | condition | result",
        "templateId": "string",
        "data": {
          "templateId": "string",
          "templateType": "material | condition | result",
          "properties": [
            { "key": "string", "xsiType": "string", "value": "any", "units": "string | null" }
          ]
        },
        "recordedBy": "string | null",
        "recordedAt": "string (ISO 8601) | null"
      }
    ],
    "totalCount": 1
  }
}
```

**処理フロー** (`experimentDataService.getTemplateData`):
1. `projectName` → `projectId` を解決（SQLファイル: `projects/findIdByName.sql`）
2. `template_data` テーブルから対象タスクの全レコードを取得
3. S3/Swift から MaiML ファイルをダウンロード
4. `MaimlParserTyped` でペトリネット構造解析
5. 指定 `methodId` の method を特定し `transitionId` の存在確認
6. arcs から隣接プレースID を特定（入力・出力プレース両方）
7. `template_data` レコードを隣接プレースIDでフィルタリング
8. DBにデータがない場合は MAIMLテンプレート定義からフォールバック

**エラーレスポンス**:
- `400`: バリデーションエラー（transitionId未指定など）
- `404`: プロジェクト / メソッド / トランジションが見つからない
- `500`: サーバーエラー（S3接続エラー、MAIMLパースエラー等）

---

### API #7: 実験データ一括保存

**実際のエンドポイント**: `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`

`API一覧_実験作業者画面.md` との差異:

| 項目 | API一覧記載 | 実装の実態 |
|------|------------|-----------|
| エンドポイント末尾 | `/template-data` | `/data` |
| リクエスト形式 | 単一レコード | **バッチ処理**（`records` 配列、1〜50件） |
| リクエストボディ | `{ placeId, templateId, ... }` | `{ records: [{ placeId, data: {...} }] }` |
| HTTPステータス（成功時） | 200 OK | **201 Created** |
| 権限 | 未記載 | `experiment_worker` のみ（機能CD: `050000`）書込可 |

**実際のリクエストボディ** (`experimentController.saveBatchData`):
```json
{
  "records": [
    {
      "placeId": "string",
      "data": {
        "templateId": "string",
        "templateType": "material | condition | result",
        "properties": [
          { "key": "string", "xsiType": "string", "value": "any", "units": "string | null" }
        ]
      },
      "comment": "string (optional, max 2000文字)"
    }
  ]
}
```

**バリデーション**（`experimentRoutes.ts`）:
- `records`: 1件以上50件以下の配列
- `records.*.placeId`: 必須、1〜255文字
- `records.*.data`: 必須オブジェクト
- `records.*.data.templateId`: 必須、1〜255文字
- `records.*.data.templateType`: `material` / `condition` / `result` のいずれか
- `records.*.data.properties`: 必須の配列
- `records.*.comment`: オプション、max 2000文字

**処理フロー** (`experimentDataService.saveBatchData`):
1. プロジェクト名からID・ステータス取得（SQLファイル: `projects/findByNameWithStatus.sql`）
2. プロジェクトステータスが編集可能か確認（`project_status = 2`のみ）
3. タスク存在確認（SQLファイル: `tasks/checkExists.sql`）
4. `records`の各要素を`template_data`テーブルにUPSERT
5. `use_deemed_progress = true`の組織の場合、`transition_data`のステータスを自動更新（みなし進捗）
6. トランザクションコミット

**成功レスポンス**（201 Created）:
```json
{
  "success": true,
  "data": {
    "saved": 2,
    "records": [
      {
        "organization_id": "string",
        "project_id": "string",
        "method_id": "string",
        "task_no": 1,
        "place_id": "string",
        "property_set": { ... },
        "create_user_id": "string",
        "update_user_id": "string",
        "create_at": "string",
        "update_at": "string"
      }
    ]
  }
}
```

**エラーレスポンス**:
- `400`: バリデーションエラー
- `403`: プロジェクトが編集不可（`ProjectNotEditableError`）
- `404`: タスクが見つからない（`TaskNotFoundError`）
- `500`: サーバーエラー

---

### API #8: トランジションステータス更新（廃止済み）

**重要**: このAPIは `experimentRoutes.ts` から**廃止・移動**されています。

| 項目 | 内容 |
|------|------|
| 旧エンドポイント | `PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status` |
| 現在の動作 | **410 Gone**（廃止済み、`ENDPOINT_DEPRECATED` エラー） |
| 移動先エンドポイント | `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` |
| 移動先仕様書 | `docs/design/api/api_progress_monitoring.md` - API #6 |
| 移動日 | 2026-02-18 |

`API一覧_実験作業者画面.md` には `PUT /api/v1/experiments/...` として記載されているが、実装上はこのエンドポイントは廃止済みであり、`api_progress_monitoring.md` のAPI #6（PATCH）が正式なエンドポイント。

---

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] docs/20260312_1522_api_project_management実験データAPI追加/PLAN.md 作成

### Phase 2: api_project_management.md 修正
- [ ] ヘッダー・実装状況サマリー更新（API数・完了率）
- [ ] API一覧テーブル更新（#21, #22, #23追加）
- [ ] API #21: テンプレート実績取得 の仕様追加
- [ ] API #22: 実験データ一括保存 の仕様追加
- [ ] API #23: トランジションステータス更新（廃止済み）の仕様追加
- [ ] 変更履歴追加

## 変更ファイル

1. `docs/design/api/api_project_management.md` - 実験データ関連APIの仕様を追加

## テスト計画

- [ ] api_project_management.md のMarkdown構文が正しいことを確認
- [ ] エンドポイント・リクエスト・レスポンス記載が実装と一致することを確認

## 承認記録
- **承認日時**: 2026-03-12 15:22
