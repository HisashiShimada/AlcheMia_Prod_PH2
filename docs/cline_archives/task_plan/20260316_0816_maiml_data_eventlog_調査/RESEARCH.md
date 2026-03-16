# MAIMLファイル data層・eventLog層 書き出し処理 調査レポート

**作成日時**: 2026-03-16 08:16  
**調査対象**: data層・eventLog層の書き出し処理 / transition_data・template_dataテーブルの書き出し処理

---

## 1. MAIMLファイルへの data層・eventLog層 書き出し処理

### 結論：**処理は存在するが、空要素のみ**

---

### 1-1. 書き出し処理が存在するファイル一覧

| ファイル | バージョン | rawXML引き継ぎ | 内容出力 |
|---------|-----------|--------------|--------|
| `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | editorv2（現行メイン） | ✅ あり | ❌ 空要素のみ（rawXMLなし時） |
| `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` | editorv2（複数method用） | ❌ なし | ❌ 空要素のみ（固定ID） |
| `frontend/src/utils/converters/multiMethodConverter.ts` | 旧版 | ❌ なし | ❌ 空要素のみ（固定ID） |

---

### 1-2. 各ファイルの実装詳細

#### `editorv2/utils/converters/reactFlowToMaiml.ts`（メイン実装）

```typescript
// data/eventLog要素（元のXMLがあれば使用）
if (originalStructure?.data?.rawXML) {
  maiml += `  ${originalStructure.data.rawXML}\n`;   // ← 元のXMLをそのまま出力（引き継ぎ）
} else {
  const dataId = originalStructure?.data?.id || 'dataID';
  maiml += `  <data id="${escapeXml(dataId)}">\n`;
  maiml += `  </data>\n`;                             // ← 空要素
}

if (originalStructure?.eventLog?.rawXML) {
  maiml += `  ${originalStructure.eventLog.rawXML}\n`; // ← 元のXMLをそのまま出力（引き継ぎ）
} else {
  const eventLogId = originalStructure?.eventLog?.id || 'eventLogID';
  maiml += `  <eventLog id="${escapeXml(eventLogId)}">\n`;
  maiml += `  </eventLog>\n`;                          // ← 空要素
}
```

**特徴**:
- `originalStructure.data.rawXML` または `originalStructure.eventLog.rawXML` が存在すれば、元ファイルのXMLをそのまま引き継ぐ
- rawXMLがない場合は空要素を生成（ID値のみ保持）

#### `editorv2/utils/converters/multiMethodConverter.ts`（複数method用）

```typescript
// data/eventLog要素（常に空要素・固定ID）
maiml += `  <data id="dataID">\n`;
maiml += `  </data>\n`;
maiml += `  <eventLog id="eventLogID">\n`;
maiml += `  </eventLog>\n`;
```

**特徴**:
- rawXML引き継ぎ機能なし
- IDが "dataID" / "eventLogID" に固定

---

### 1-3. 型定義・パーサーの状況

#### 型定義（`frontend/src/types/maiml-unified.ts`）

```typescript
export interface EventLog { ... }  // ← 定義済み
// Data型も定義済み
```

#### OriginalStructure型（editorv2版）

```typescript
data?: {
  id?: string;
  rawXML?: string;   // 元のXMLを保持する構造は定義済み
};
eventLog?: {
  id?: string;
  rawXML?: string;   // 同上
};
```

#### パーサー（`frontend/src/utils/maimlTypeConverter.ts`）

- `convertEventLog()` 関数が実装済み（EventLog型へのパース処理）
- `maimlParserTyped.ts` にも `getEventLogs()` メソッドが実装済み

---

### 1-4. 現状の課題

- **内部データ（logs, entries等）を構造的に組み立てて出力する処理は未実装**
- multiMethodConverter系はrawXML引き継ぎすら未対応
- 新規作成時は常に空の `<data>` / `<eventLog>` が出力される

---

## 2. 実験作業者画面における transition_data・template_data テーブルへの書き出し処理

### 結論：**バックエンドに書き出し処理が実装済み**

---

### 2-1. 処理フロー全体図

```
実験管理者画面
  ↓ タスク登録保存（POST /api/v1/projects/:projectName/task-registration）
taskRegistrationService.ts
  ├── deleteAndInsertTransitionData()  → transition_dataテーブルへ初期INSERT
  └── deleteAndInsertTemplateData()   → template_dataテーブルへ初期INSERT

実験作業者画面
  ↓ 実験データ保存（POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data）
experimentController.ts → experimentDataService.ts
  ├── templateRepository.upsert()     → template_dataテーブルへ実績UPSERT
  └── updateDeemedProgress()          → transition_dataテーブルへ自動ステータス更新
```

---

### 2-2. タスク登録時の初期データ書き出し（taskRegistrationService.ts）

**エンドポイント**: `POST /api/v1/projects/:projectName/task-registration`  
**ロール**: experiment_admin（書込可）

#### `deleteAndInsertTransitionData()` 処理

```
1. transition_dataの全レコードを削除（deleteByProject）
2. MAIMLの各メソッドからtransition ID一覧を取得（parser.getMethodList()）
3. project_task_detail の各レコード（method_id × task_no）に対してINSERT
   → 初期状態（未着手）でtransition_dataを登録
```

**INSERT対象カラム**:
- `organization_id`, `project_id`, `method_id`, `task_no`, `transition_id`, `status（初期値）`, `create_user_id`

#### `deleteAndInsertTemplateData()` 処理

```
1. template_dataの全レコードを削除（deleteByProject）
2. MAIMLの各メソッドのtemplate（material/condition/result）を解析
3. 各template.placeRef ごとに、property_setを構築してINSERT
   → property_set: { templateId, templateType, properties: [{key, xsiType, value: null, units}] }
4. project_task_detail の各レコード（method_id × task_no）に対してINSERT
```

**INSERT対象カラム**:
- `organization_id`, `project_id`, `method_id`, `task_no`, `place_id`, `property_set(JSONB)`, `create_user_id`

---

### 2-3. 実験作業者による実績データ保存（experimentDataService.ts / experimentController.ts）

**エンドポイント**: `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`  
**ロール**: experiment_worker（書込可）  
**権限チェック**: `checkPermission('050000', 1)`

#### `saveBatchData()` 処理

```
1. project_id・プロジェクトステータスを確認
2. タスク存在確認
3. template_dataへのUPSERT（templateRepository.upsert）
   → property_set に実測値を含むデータを保存
4. みなし進捗の更新（updateDeemedProgress）
   → use_deemed_progress=true の組織のみ実行
   → template_dataの実績数に応じて transition_data の status/progress_rate を自動更新
```

#### `updateDeemedProgress()` 処理

```
1. use_deemed_progress フラグ確認
2. MAIMLダウンロード＆パース
3. 保存placeIdからtransitionIdを特定（arc情報を解析）
4. 実績登録済みplaceId数をカウント
5. transition_dataのstatus/progress_rateを更新
   - 0件: スキップ
   - 一部: IN_PROGRESS (3)
   - 全件: COMPLETED (5)
6. EventLogRepository.insertTransitionProgressLog() でイベントログ記録
```

---

### 2-4. テンプレート実績データ取得（getTemplateData）

**エンドポイント**: `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`  
**ロール**: experiment_worker（読取可）  
**権限チェック**: `checkPermission('050000', 0)`

```
1. project_id解決
2. template_dataから対象タスクの全レコード取得
3. S3/SwiftからMAIMLファイルをダウンロード・パース
4. transitionIdに隣接するplaceIdを特定（arc解析）
5. 隣接placeIdでフィルタリング
6. DB実績がなければMAIML定義からフォールバックデータを生成（buildFallbackTemplates）
```

---

### 2-5. 関連ファイル一覧

| 分類 | ファイルパス |
|-----|------------|
| ルート | `backend/src/routes/experimentRoutes.ts` |
| コントローラー | `backend/src/controllers/experimentController.ts` |
| サービス（実験データ） | `backend/src/services/experimentDataService.ts` |
| サービス（タスク登録） | `backend/src/services/taskRegistrationService.ts` |
| Repository（template_data） | `backend/src/repositories/templateDataRepository.ts` |
| Repository（transition_data） | `backend/src/repositories/transitionDataRepository.ts` |
| Repository（eventLog） | `backend/src/repositories/eventLogRepository.ts` |
| 型定義（DB） | `backend/src/types/database.ts` |
| SQLファイル | `backend/src/sql/queries/transition_data/`, `backend/src/sql/queries/template_data/` |

---

## 3. まとめ

### MAIMLファイルへの書き出し（フロントエンド）

| 処理 | 実装状況 |
|-----|---------|
| `<data>` 要素の空要素出力 | ✅ 実装済み |
| `<eventLog>` 要素の空要素出力 | ✅ 実装済み |
| 元ファイルのrawXML引き継ぎ（editorv2版のみ） | ✅ 実装済み |
| データ内容（logs等）の構造的な書き出し | ❌ **未実装** |

### DBへの書き出し（バックエンド）

| 処理 | 実装状況 |
|-----|---------|
| タスク登録時 transition_data 初期INSERT | ✅ 実装済み |
| タスク登録時 template_data 初期INSERT | ✅ 実装済み |
| 実験作業者による template_data UPSERT | ✅ 実装済み |
| みなし進捗による transition_data 自動更新 | ✅ 実装済み |
| イベントログ記録 | ✅ 実装済み |
