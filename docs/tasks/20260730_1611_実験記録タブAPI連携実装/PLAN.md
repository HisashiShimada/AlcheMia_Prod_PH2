# タスク計画書: 実験記録タブ API連携実装（モック削除）

## メタデータ
- **作成日時**: 2026-07-30 16:11
- **タスクID**: 20260730_1611_実験記録タブAPI連携実装
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

実験作業者画面の「実験記録タブ」（`WorkRecordPanel.tsx`）が現在モックデータを使用している。
`experimentDataApiService.ts` に実API（GET/POST）が既に実装済みなので、モックを削除して実APIに接続する。

合わせて `ExperimentWorkerMenu.tsx` から `WorkRecordPanel` にプロジェクト・メソッド・タスク・トランジション情報を props として渡すよう対応する。

## 目的と期待される成果

- [ ] `WorkRecordPanel` がモックデータではなく実APIからテンプレートデータを取得して表示する
- [ ] 「保存」「保存して次へ」ボタンが実APIへデータを送信する
- [ ] `ExperimentWorkerMenu` が `progressRows` の作業中トランジション情報を `WorkRecordPanel` に渡す
- [ ] プロジェクト未選択・作業中トランジションなしの場合は適切なEmpty状態を表示する

## 実装ステップ

### Phase 1: ExperimentWorkerMenu.tsx の変更

- [ ] `WorkRecordPanel` に渡す props を `progressRows` から導出する
  - `in_progress` のトランジション（最初の1件）から `projectId`, `methodId`, `taskNo`, `transitionId` を特定
- [ ] タブ定義の `WorkRecordPanel` 呼び出しを props付きに変更

### Phase 2: WorkRecordPanel.tsx のリファクタリング

- [ ] Props インターフェース定義を追加
  ```typescript
  interface WorkRecordPanelProps {
    projectId: string | null;
    methodId: string | null;
    taskNo: number | null;
    transitionId: string | null;
  }
  ```
- [ ] モック定数・型を削除（`MOCK_TRANSITIONS`, `MOCK_METHODS`, `INITIAL_TASKS`, `ORDERED_TRANSITION_IDS` 等）
- [ ] `getTemplateData()` API呼び出しを実装（props変更時に再取得）
- [ ] APIレスポンス → UI用テンプレート型へのマッピング処理を実装
  - `templateType: "material"` → `category: "Materials"`
  - `templateType: "condition"` → `category: "Conditions"`
  - `templateType: "result"` → `category: "Results"`
  - `properties[].key`, `xsiType`, `value`, `units` → プロパティ表示用構造へ変換
- [ ] `saveBatchExperimentData()` API呼び出しを保存処理に実装
  - 「保存」ボタン → API呼び出し後 成功メッセージ表示
  - 「保存して次へ」ボタン → API呼び出し後 トランジションステータス更新 → 次へ
- [ ] プロジェクト未選択 / 作業中トランジションなしの場合の Empty表示を追加
- [ ] ローディング状態の追加（データ取得中の Spin 表示）

### Phase 3: 多言語対応

- [ ] `ja.json` / `en.json` に新規追加テキストを定義（既存キーで対応できないもののみ）

## 変更ファイル

1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - WorkRecordPanelへprops渡し
2. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - モック削除・API連携
3. `frontend/src/locales/ja.json` - 追加テキスト（必要に応じて）
4. `frontend/src/locales/en.json` - 追加テキスト（必要に応じて）

## データマッピング仕様

### GET レスポンス → UI表示変換

```
APIレスポンス (GetTemplateDataResponse.templates[]):
{
  placeId: string,
  templateType: "material" | "condition" | "result",
  templateId: string,
  templateName: string,
  data: {
    properties: [{ key, xsiType, value, units, ... }]
  }
}

↓ 変換後（UI用テンプレート）:
{
  id: templateId,
  placeId: placeId,         // 保存時に必要
  name: templateName,
  category: "Materials" | "Conditions" | "Results",  // templateType変換
  properties: [{ key, xsiType, value, unit, ... }]
}
```

### POST リクエスト形式

```typescript
SaveBatchExperimentDataRequest = {
  records: [{
    placeId: string,
    data: {
      templateId: string,
      templateType: string,
      properties: [{ key, value, ... }]
    }
  }]
}
```

## 作業中トランジション特定ロジック

```typescript
// ExperimentWorkerMenu の progressRows から作業中を特定
const inProgressRow = progressRows.find(r => r.status === 'in_progress');
// → projectId=selectedProject, methodId, taskNo, transitionId を WorkRecordPanel に渡す
```

## リスク

| リスク | 対策 |
|---|---|
| APIレスポンス構造と UI想定が不一致 | `GetTemplateDataResponse` 型定義を確認してマッピング実装 |
| 複数の `in_progress` トランジションが存在する場合 | 先頭の1件を選択（order順） |
| プロジェクト未選択での表示 | Empty ステートを表示してUIクラッシュを防ぐ |

## テスト計画

- [ ] プロジェクト選択後、作業中トランジションのテンプレートが表示されること
- [ ] テンプレートの `category` が正しく `Materials` / `Conditions` / `Results` に変換されること
- [ ] 「保存」ボタンで API POST が呼ばれること
- [ ] プロジェクト未選択時に Empty 表示されること
- [ ] ローディング中に Spin が表示されること

## 承認記録

- **計画書提示日時**: 2026-07-30 16:11
- **承認日時**: （承認後に記入）
