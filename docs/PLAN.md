# タスク計画書: ファイルアップロード プログレスバー実装

## メタデータ
- **作成日時**: 2026-03-25 13:49
- **タスクID**: upload-progress-bar
- **優先度**: 中
- **推定工数**: 1〜2時間

## タスク概要

ユーザーにアップロードの進捗状況を伝えるため、アップロードダイアログにプログレスバーを実装する。アップロード処理完了後は、結果サマリー（成功件数・失敗件数・失敗ファイル名）を表示する。対象は BulkUploadDialog（一括ファイルモード）と FormatUploadDialog（フォルダモード）の両ダイアログで、同一の実装を適用する。

---

## 目的と期待される成果

- [ ] アップロード中に進捗状況をプログレスバーで表示する
- [ ] アップロード処理完了後に、成功件数・失敗件数を表示する
- [ ] 失敗したファイルのファイル名を一覧で表示する
- [ ] 一括ファイルモード（BulkUploadDialog）・フォルダモード（FormatUploadDialog）の両方で対応する

---

## 実装ステップ

### Phase 1: 型定義の追加
- [ ] `frontend/src/types/file.ts` にアップロード結果サマリーの型 `UploadResultSummary` を追加する
  - `successCount`: 成功件数
  - `failureCount`: 失敗件数
  - `failedFileNames`: 失敗したファイル名の配列（`string[]`）

### Phase 2: UIコンポーネント改修（BulkUploadDialog・FormatUploadDialog 共通）
- [ ] アップロード全体の進捗を示す `<Progress>` コンポーネントをダイアログ内に追加する
- [ ] アップロード完了後に結果サマリー state（`UploadResultSummary`）をセットする
- [ ] ダイアログ下部に以下を表示する：
  - 「成功: X 件 / 失敗: Y 件」
  - 失敗した場合、失敗ファイル名を箇条書きで表示

---

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `frontend/src/types/file.ts` | 修正 | `UploadResultSummary` 型追加、`UploadProgressState` 削除、`onFileProgress` 削除 |
| `frontend/src/services/fileAccessService.ts` | 修正 | `uploadFiles()` の戻り値に `failedFileNames: string[]` を追加、`onFileProgress` コールバックを除去 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 修正 | 全体プログレスバー追加、アップロード完了後の成功/失敗件数・失敗ファイル名表示を追加 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | 修正 | 全体プログレスバー追加、アップロード完了後の成功/失敗件数・失敗ファイル名表示を追加 |

---

## UI 仕様

### アップロード前
- 通常通りのダイアログ表示（変更なし）

### アップロード中
- アップロード全体の進捗を示すプログレスバーを1本表示する（完了ファイル数 / 全ファイル数 ベース）
- ローディングスピナーやボタン非活性などの既存の処理は維持する

### アップロード完了後（結果サマリー表示）

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
アップロード結果

成功: 3 件 / 失敗: 2 件

■ 失敗したファイル
  • sample_error1.xml
  • sample_error2.csv
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

| 状態 | 表示内容 |
|---|---|
| 全件成功 | 「成功: X 件 / 失敗: 0 件」のみ表示、失敗一覧は非表示 |
| 一部失敗 | 「成功: X 件 / 失敗: Y 件」＋失敗ファイル名一覧を表示 |
| 全件失敗 | 「成功: 0 件 / 失敗: Y 件」＋失敗ファイル名一覧を表示 |

---

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| 失敗ファイル名の収集ロジックが既存コードと整合しない可能性 | 中 | `Promise.allSettled` の結果から `rejected` のファイル名を抽出する実装で対応 |

---

## テスト計画

- [ ] アップロード中: 全体プログレスバーが進捗に応じて更新されること
- [ ] 全件成功時: 「成功: X 件 / 失敗: 0 件」のみ表示され、失敗一覧が表示されないこと
- [ ] 一部失敗時: 「成功: X 件 / 失敗: Y 件」と失敗ファイル名一覧が表示されること
- [ ] 全件失敗時: 「成功: 0 件 / 失敗: Y 件」と全ファイル名が失敗一覧に表示されること
- [ ] BulkUploadDialog・FormatUploadDialog の両方で上記テストが正常に動作すること

---

## まとめ

アップロード処理完了後の結果サマリー（成功件数・失敗件数・失敗ファイル名）を表示する。BulkUploadDialog・FormatUploadDialog で同一の実装を適用する。

変更対象はフロントエンド **4 ファイル**（型定義・サービス・BulkUploadDialog・FormatUploadDialog）。

| ファイル | 変更内容 |
|---|---|
| `frontend/src/types/file.ts` | `UploadResultSummary` 型追加、`UploadProgressState` 削除、`onFileProgress` 削除 |
| `frontend/src/services/fileAccessService.ts` | `uploadFiles()` の戻り値に `failedFileNames` を追加、`onFileProgress` 除去 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 全体プログレスバー追加、成功/失敗件数・失敗ファイル名のサマリー表示を追加 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | 全体プログレスバー追加、成功/失敗件数・失敗ファイル名のサマリー表示を追加 |
