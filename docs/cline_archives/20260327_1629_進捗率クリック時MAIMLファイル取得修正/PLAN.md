# タスク計画書: 進捗率クリック時に実際のプロジェクトMAIMLファイルを表示する修正

## メタデータ
- **作成日時**: 2026-03-27 16:29
- **タスクID**: progress-rate-click-maiml-fix
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`ProgressCheckTable.tsx` の進捗率クリック時のハンドラー（`handleProgressRateClick`）が、
現在ハードコーディングされたモックMAIMLファイルを表示している。
これを、クリックされたタスクが属するプロジェクトの実際のMAIMLファイルを取得・表示するよう修正する。

## 目的と期待される成果

### 目的
- 進捗率クリック時に実際のプロジェクトMAIMLファイルのPetriNetフロー図をビューアダイアログで表示できるようにする

### 期待される成果
- [ ] 進捗率クリック時に `getProjectMaiml(projectName)` APIを呼び出す
- [ ] 取得したMAIMLコンテンツをビューアダイアログに渡して表示する
- [ ] 二重API呼び出しが発生しない（`fileContent` プロップを利用）
- [ ] モックデータへの依存がなくなる

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] `docs/20260327_1629_進捗率クリック時MAIMLファイル取得修正/PLAN.md` を作成

### Phase 2: ProgressCheckTab.tsx 修正
- [ ] `ProgressCheckTable` コンポーネントに `projectName` プロップを追加して渡す

### Phase 3: ProgressCheckTable.tsx 修正
- [ ] Props インターフェースに `projectName: string` を追加
- [ ] `getProjectMaiml` のインポートを追加
- [ ] `App.useApp()` から `message` を取得するためのインポートを追加
- [ ] `viewerDialogs` の state 型に `fileContent?: string` を追加
- [ ] `handleProgressRateClick` を非同期化して `getProjectMaiml` を呼び出すよう修正
- [ ] `ViewRendererDialog` に `fileContent={dialog.fileContent}` を渡すよう修正

## 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
   - `ProgressCheckTable` に `projectName={selectedProjectName}` を追加
2. `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx`
   - Props 型に `projectName` を追加
   - `handleProgressRateClick` の実装を修正
   - `viewerDialogs` state 型を拡張
   - `ViewRendererDialog` に `fileContent` プロップを渡す

### 新規作成するファイル
1. `docs/20260327_1629_進捗率クリック時MAIMLファイル取得修正/PLAN.md`（本ファイル）

### 影響を受ける機能
- 進捗確認タブ > 進捗率クリック → MAIMLビューアダイアログ表示

## 技術的詳細

### 利用するAPI
- `getProjectMaiml(projectName: string)` → `Promise<ApiResponse<{ maimlContent: string }>>`
  - エンドポイント: `GET /projects/:projectName/maiml`
  - `frontend/src/services/projectApiService.ts` に定義済み

### ViewRendererDialog の fileContent プロップ
- `fileContent` プロップが渡されると、内部でのAPIコール（`getFileContentAsText`）をスキップして直接使用する設計（既存実装）
- 二重APIコールを防ぎパフォーマンス向上につながる

### fileData の path について
- S3の相対パスを設定: `projects/${projectName}/${projectName}.maiml`
- `fileContent` を渡す場合、`path` はファイル名表示・識別用途のみで使用される

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| APIエラー時の画面クラッシュ | 高 | 低 | try-catch で適切にエラーハンドリング |
| プロジェクト名が空の場合 | 中 | 低 | 早期リターンでガード |

## テスト計画

### 手動テスト
- [ ] 進捗確認タブでプロジェクトを選択後、任意のタスクの進捗率をクリック
- [ ] ビューアダイアログが開き、プロジェクトのMAIMLフロー図が表示されること
- [ ] 複数回クリックで複数ダイアログが開くこと
- [ ] ダイアログの閉じるボタンで閉じられること
- [ ] APIエラー時にエラーメッセージが表示されること

## 承認記録
- **計画書提示日時**: 2026-03-27 16:29
- **承認日時**: 2026-03-27 16:29
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-03-27 16:29
完了: （実施後に記入）

### 計画からの変更点
（実施後に記入）
