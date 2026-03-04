# タスク計画書: No.8 DataRecordDialog.tsx templatesList モック → テンプレート実績一覧取得API接続

## メタデータ
- **作成日時**: 2026-02-25 18:48
- **タスクID**: No8_templatesList_API化
- **優先度**: 中
- **推定工数**: 1.5時間
- **関連調査**: `docs/20260225_0946_実験記録タブAPI統合/mock_investigation.md` No.8

---

## タスク概要

`DataRecordDialog.tsx` のサイドバー（テンプレート一覧）は、現在 `projectsData.ts` の
ハードコードされたモックデータ `templatesList` を参照している。

本タスクでは、ダイアログオープン時に
`GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data?transitionId=xxx`
（API 8.2: テンプレート実績一覧取得）を呼び出し、**過去に保存された実績データをフォームの初期値として復元**する。

> **注意**: テンプレート一覧の定義自体（`templatesList`）は、現時点でテンプレート定義取得 API が未実装のため
> 引き続きモックを使用する。本タスクは「実績データの復元」を追加するものである。

---

## 目的と期待される成果

### 目的
- ダイアログオープン時に API を呼び出し、当該トランジションの過去入力済みデータを取得する
- 取得した実績データをフォームフィールドの初期値として反映（再入力の手間を省く）
- ローディング中はサイドバーに `Spin` を表示してユーザーに進行状況を伝える

### 期待される成果
- [x] バックエンド API（`GET .../data?transitionId=xxx`）の実装確認
- [x] フロントエンド型定義（`TemplateDataItem`, `GetTemplateDataResponse`）を `api.ts` に追加
- [x] `experimentDataApiService.ts` に `getTemplateData()` 関数を追加
- [x] `DataRecordDialog.tsx` でダイアログオープン時に `getTemplateData()` を呼び出す
- [x] 取得した実績データをフォームフィールドに初期値として復元する
- [x] ローディング中は `<Spin>` を表示する

---

## 実装ステップ

### Phase 1: バックエンドAPI確認（実装済み）

- [x] `backend/src/services/experimentDataService.ts` — `getTemplateData()` 関数 実装済み
- [x] `backend/src/controllers/experimentController.ts` — `getTemplateData` コントローラー 実装済み
- [x] `backend/src/routes/experimentRoutes.ts` — `GET .../tasks/:taskNo/data` ルート 実装済み
- [x] `backend/src/repositories/templateDataRepository.ts` — `findByTaskNo()` 実装済み
- [x] `backend/src/sql/queries/template_data/findByTaskNo.sql` 実装済み

### Phase 2: フロントエンド型定義追加

- [x] `frontend/src/types/api.ts` に以下を追加
  - `TemplateDataItem` — 実績データの1要素
  - `GetTemplateDataResponseData` — レスポンスの `data` オブジェクト
  - `GetTemplateDataResponse` — レスポンス全体

### Phase 3: フロントエンドAPIサービス関数追加

- [x] `frontend/src/services/experimentDataApiService.ts` に `getTemplateData()` を追加
  - `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`
  - クエリパラメータ: `transitionId`

### Phase 4: DataRecordDialog.tsx 修正

- [x] `Spin` を antd imports に追加
- [x] `templateDataLoading` state を追加（`boolean`, 初期値 `false`）
- [x] `getTemplateData` を `experimentDataApiService` からインポート
- [x] `useEffect`（ダイアログオープン時）内で `getTemplateData()` を呼び出す
  - `projectName / methodId / taskNo / transition.transitionId` が揃っている場合のみ実行
  - 成功時: `form.setFieldsValue()` で実績データをフォームに反映
  - 成功時: 最初の実績データの `templateId` でサイドバー選択状態を復元
  - 失敗時: `console.warn` のみ（初回記録は 404 になるため非致命的）
- [x] サイドバーのテンプレートテーブルを `<Spin spinning={templateDataLoading}>` でラップ

---

## 変更ファイル一覧

### 新規作成
なし

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/api.ts` | `TemplateDataItem`, `GetTemplateDataResponseData`, `GetTemplateDataResponse` 型定義を追加 |
| `frontend/src/services/experimentDataApiService.ts` | `getTemplateData()` 関数を追加 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | `Spin` import 追加、`templateDataLoading` state 追加、`getTemplateData` 呼び出し + 初期値復元 useEffect 追加、サイドバー `<Spin>` ラップ |

---

## 技術的詳細

### API仕様

**エンドポイント**
```
GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
```

**クエリパラメータ**
| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `transitionId` | 必須 | トランジションID |

**レスポンス（200 OK）**
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
        "placeId": "template_001",
        "templateType": "material",
        "templateId": "template_001",
        "data": { "fieldKey": "fieldValue", ... },
        "recordedBy": "user-uuid",
        "recordedAt": "2026-02-25T10:00:00.000Z"
      }
    ],
    "totalCount": 1
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### フォーム初期値の復元ロジック

```typescript
// item.templateId + fieldKey がフォームのフィールド名に対応
const formKey = `${item.templateId}_${fieldKey}`;
initialValues[formKey] = fieldValue;
form.setFieldsValue(initialValues);
```

### エラーハンドリング方針

| ケース | 処理 |
|--------|------|
| 初回記録（DB未保存）→ 404 | `console.warn` のみ、フォームは空で開く |
| 認証エラー → 401 | `console.warn` のみ（非致命的扱い） |
| サーバーエラー → 500 | `console.warn` のみ（非致命的扱い） |

---

## 制約・注意事項

### templatesList はモックのまま
テンプレート定義（テンプレート名・プロパティ構造）の取得 API は未実装のため、
`templatesList` からのモック参照は維持する。

本タスクは「過去の入力値を復元する」ことが目的であり、
テンプレート定義自体の API 化は別タスク（テンプレート定義取得 API 実装後）で対応する。

### placeId と templateId の対応
現状の実装では `placeId` として `templateId` を代替使用している。
将来 `Transition.templates` に正式な `placeId` が追加された際に修正が必要。

---

## テスト計画

### 手動テスト

- [ ] 初回記録時（DB未保存）: フォームが空の状態でダイアログが開くことを確認
- [ ] 2回目以降: 前回保存した値がフォームに復元されることを確認
- [ ] ローディング中: サイドバーに「実績データ読み込み中...」Spin が表示されることを確認
- [ ] 読み込み完了後: Spin が消えてテーブルが操作可能なことを確認
- [ ] `projectName / methodId / taskNo` が未設定の場合: API呼び出しをスキップして空フォームで開くことを確認

---

## 承認記録

- **計画書提示日時**: 2026-02-25 18:48
- **承認日時**: 2026-02-25 18:48（実装完了後に記録）
- **承認者コメント**: -

---

## 実施記録

### 実施日時
開始: 2026-02-25 18:34
完了: 2026-02-25 18:48

### 実施内容

1. バックエンドのコントローラー・サービス・リポジトリ・SQLファイルがすべて実装済みであることを確認（Phase 1 はスキップ）
2. `frontend/src/types/api.ts` に `TemplateDataItem`, `GetTemplateDataResponseData`, `GetTemplateDataResponse` を追加
3. `frontend/src/services/experimentDataApiService.ts` に `getTemplateData()` 関数を追加
4. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` を修正
   - antd imports に `Spin` を追加
   - `templateDataLoading` state を追加
   - `getTemplateData` を import に追加
   - `useEffect` 内で API 呼び出しと初期値復元を実装
   - サイドバーテーブルを `<Spin>` でラップ

### 最終的な成果物
- [x] `frontend/src/types/api.ts` — 型定義追加
- [x] `frontend/src/services/experimentDataApiService.ts` — `getTemplateData()` 追加
- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — API接続・実績復元実装
