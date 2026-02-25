# タスク計画書: テンプレート実績一覧取得API 設計・ドキュメント反映

## メタデータ
- **作成日時**: 2026-02-25 17:43
- **タスクID**: No8_テンプレート実績一覧取得API設計
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`DataRecordDialog.tsx` でモックデータ（`templatesList`）を使用しているテンプレート一覧表示を
バックエンドAPIに置き換えるため、新規API「テンプレート実績一覧取得（GET /api/v1/experiments/...）」を設計し、
関連ドキュメントに反映する。

## 目的と期待される成果

- [ ] `api_experiment_data.md` に API 8.2（テンプレート実績一覧取得）の仕様を追記
- [ ] `api_list.md` のセクション8テーブルに API 8.2 を追加
- [ ] `api_list.md` の実装状況サマリーを更新
- [ ] `api_list.md` の変更履歴に記録を追加
- [ ] `mock_investigation.md` の修正一覧・Phase B 記述を更新

## API設計内容（確定済み）

### エンドポイント
```
GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
```

### リクエスト
| 種別 | パラメータ | 型 | 必須 | 説明 |
|------|-----------|-----|------|------|
| Path | projectName | string | ✅ | プロジェクト名 |
| Path | methodId | string | ✅ | メソッドID |
| Path | taskNo | integer | ✅ | タスク連番 |
| Query | transitionId | string | ✅ | トランジションID |

### 処理フロー
1. バリデーション
2. JWT から organizationId 取得
3. projectName → project_id 解決
4. template_data テーブルから対象タスクのレコードを全件取得
5. S3/Swift から MaiML ファイルをダウンロード
6. parsePetriNetStructure() でペトリネット構造解析
7. 指定 transitionId の存在確認（なければ 404）
8. arcs から隣接プレースID（入力・出力の両方）を特定
9. template_data レコードを隣接プレースIDでフィルタリング
10. レスポンス返却

### レスポンス（200 OK）
```json
{
  "success": true,
  "data": {
    "projectName": "sample_project",
    "methodId": "method_001",
    "taskNo": 1,
    "transitionId": "t1",
    "adjacentPlaceIds": ["p1", "p2"],
    "templates": [
      {
        "placeId": "p1",
        "templateType": "material",
        "templateId": "template-mat-001",
        "data": { "key": "value" },
        "recordedBy": "user-uuid",
        "recordedAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "totalCount": 1
  },
  "meta": {
    "timestamp": "2026-02-25T17:00:00.000Z",
    "requestId": "uuid-yyyy"
  }
}
```

### エラーレスポンス
| HTTP | エラーコード | 説明 |
|------|-------------|------|
| 400 | VALIDATION_ERROR | パラメータ不正 |
| 404 | PROJECT_NOT_FOUND | プロジェクト不在 |
| 404 | MAIML_NOT_FOUND | MaiML ファイル不在 |
| 404 | TRANSITION_NOT_FOUND | トランジションID不在 |
| 500 | MAIML_PARSE_FAILED | MaiML パース失敗 |
| 500 | DATABASE_ERROR | DB エラー |

### 権限
- 実験作業者（experiment_worker）読取専用

## 実装ステップ

- [ ] Step 1: タスク計画書の作成（本ファイル）
- [ ] Step 2: ユーザー承認
- [ ] Step 3: `api_experiment_data.md` に API 8.2 を追記
- [ ] Step 4: `api_list.md` セクション8テーブルに API 8.2 追加
- [ ] Step 5: `api_list.md` 実装状況サマリー更新
- [ ] Step 6: `api_list.md` 変更履歴追加
- [ ] Step 7: `mock_investigation.md` セクション4（修正一覧）更新
- [ ] Step 8: `mock_investigation.md` セクション5（Phase B）更新

## 変更ファイル

1. `docs/20260225_0946_実験記録タブAPI統合/PLAN_No8_テンプレート実績一覧取得API設計.md` - 本計画書（新規作成）
2. `docs/design/api/api_experiment_data.md` - API 8.2 仕様追記
3. `docs/design/api/api_list.md` - API 8.2 追加・サマリー更新・変更履歴
4. `docs/20260225_0946_実験記録タブAPI統合/mock_investigation.md` - No.8 の API 情報更新

## 承認記録
- **計画書提示日時**: 2026-02-25 17:43
- **承認日時**: （承認時に記入）
