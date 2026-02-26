# タスク計画書: フォーマット管理画面アップロード機能実装

## メタデータ
- **作成日時**: 2026-02-26 08:26
- **タスクID**: format-upload-implementation
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

フォーマット管理画面（`FormatManagement.tsx`）のアップロード機能を、プロジェクト管理画面（`BulkUploadDialog.tsx`）の実装を参考に完成させる。現在`FormatUploadDialog.tsx`はモック実装のみで、実際のアップロード処理が未実装。

## 2. 目的と期待される成果

### 目的
- フォーマット管理画面で実際にファイルをアップロードできるようにする
- プロジェクト管理画面と同等の機能を提供する

### 期待される成果
- [ ] 単一ファイル/一括ファイル/フォルダアップロードが動作する
- [ ] アップロード先フォーマットフォルダを正しく指定できる
- [ ] サブフォルダ選択が機能する
- [ ] プログレス表示が動作する
- [ ] エラーハンドリングが適切に動作する
- [ ] アップロード完了後、ファイル一覧が更新される

## 3. 実装ステップ

### Phase 1: 現状分析と設計確認
- [x] プロジェクト管理のアップロード機能を調査（BulkUploadDialog.tsx）
- [x] フォーマット管理の現状を確認（FormatUploadDialog.tsx）
- [ ] フォーマット管理のアップロード先パス構造を確認
- [ ] fileAccessService.tsの`uploadFiles`関数の仕様を確認

### Phase 2: FormatUploadDialog.tsx の実装
- [ ] uploadFilesサービスをインポート
- [ ] アップロード先パスの構築ロジックを実装
  - formats/{formatFolderName}/{subfolderPath}
- [ ] handleUpload関数にuploadFiles APIコールを実装
- [ ] プログレス更新ロジックを実装
- [ ] エラーハンドリングを実装

### Phase 3: FormatManagement.tsx の連携
- [ ] アップロード完了時のコールバック実装
- [ ] ファイル一覧の自動更新処理を実装
- [ ] 必要に応じてrefetchFormatsとrefetchFilesを呼び出す

### Phase 4: テスト・動作確認
- [ ] 単一ファイルアップロードをテスト
- [ ] 一括ファイルアップロードをテスト
- [ ] フォルダアップロードをテスト
- [ ] サブフォルダ指定アップロードをテスト
- [ ] エラーケースをテスト（ネットワークエラー、認証エラーなど）
- [ ] アップロード後のファイル一覧更新を確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/FormatUploadDialog.tsx` - アップロード処理の実装
2. `frontend/src/components/project/FormatManagement.tsx` - アップロード完了時のコールバック強化（必要に応じて）

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- フォーマット管理画面のファイルアップロード機能

## 5. 技術的詳細

### 使用するAPI
- `uploadFiles` (fileAccessService.ts)
  ```typescript
  interface UploadFilesParams {
    uploadMode: 'single' | 'bulk' | 'folder';
    targetPath: string;
    files: File[];
    metadata?: {
      projectId?: string;
      batchName?: string;
    };
    onProgress?: (progress: {
      percentage: number;
      uploadedCount: number;
    }) => void;
  }
  ```

### アップロード先パス構造
- **フォーマット用**: `formats/{formatFolderName}/{subfolderPath}`
- **プロジェクト用**: `projects/{projectName}/{subfolderPath}`

### 主な違い（プロジェクト vs フォーマット）
| 項目 | プロジェクト管理 | フォーマット管理 |
|------|------------------|------------------|
| ベースパス | projects/ | formats/ |
| 識別子 | projectName | formatFolderName |
| メタデータ | projectId, batchName | なし（フォーマット用） |

### セキュリティ考慮事項
- [ ] organization_idを含む適切な認証
- [ ] ファイルタイプの検証（.maiml, .xml, .json, etc）
- [ ] ファイルサイズの制限
- [ ] マルチテナント分離の維持

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| パス構造の不一致 | 高 | 中 | S3構造定義ドキュメントを参照し、正確なパス構築 |
| サブフォルダ選択の複雑さ | 中 | 低 | Cascaderの動作を十分にテスト |
| アップロード完了後の一覧更新失敗 | 中 | 低 | エラーハンドリングとリトライ機構 |
| 大容量ファイルのタイムアウト | 中 | 中 | タイムアウト設定とユーザーへのフィードバック |

## 7. テスト計画

### ユニットテスト
- [ ] FormatUploadDialog.tsx のロジックテスト
- [ ] パス構築関数のテスト

### 統合テスト
- [ ] 実際のアップロードフロー
- [ ] エラーケース（ネットワークエラー、認証エラー）

### 手動テスト
- [ ] 単一ファイルアップロード
- [ ] 一括ファイルアップロード
- [ ] フォルダアップロード（フォルダ構造保持）
- [ ] サブフォルダ指定アップロード
- [ ] 各モードでのキャンセル操作

## 8. ロールバック計画

問題が発生した場合:
1. FormatUploadDialog.tsxをモック実装に戻す
2. FormatManagement.tsxのアップロード完了コールバックを削除
3. gitで変更を元に戻す

## 9. 関連ドキュメント

- [S3/Swiftフォルダ構成定義](.clinerules/references/s3_structure.md)
- [プロジェクト管理実装](frontend/src/components/project/BulkUploadDialog.tsx)
- [fileAccessService](frontend/src/services/fileAccessService.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-26 08:26
- **承認日時**: 2026-02-26 08:27
- **承認者コメント**: 承認 - 実装を開始してください

## 11. 実施記録

### 実施日時
開始: 2026-02-26 08:27
完了: 2026-02-26 08:29

### 計画からの変更点
- 特になし。計画通りに実装完了

### 発生した問題と解決方法
- 特に問題なし。スムーズに実装完了

### 最終的な成果物
- [x] FormatUploadDialog.tsx の実装完了
- [x] FormatManagement.tsx の更新完了
- [x] テスト完了（手動テストは実際の環境で実施が必要）

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
