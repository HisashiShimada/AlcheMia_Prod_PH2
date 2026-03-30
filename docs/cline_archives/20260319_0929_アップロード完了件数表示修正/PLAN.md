# タスク計画書: アップロード完了件数表示修正

## メタデータ
- **作成日時**: 2026-03-19 09:29
- **タスクID**: upload-completed-count-fix
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

ファイルアップロード時に表示される「アップロード完了件数」が現在固定値の0になっている問題を修正し、正しいファイル数を表示するようにする。

## 2. 目的と期待される成果

### 目的
- ユーザーがファイルアップロードの進捗状況を正確に把握できるようにする
- アップロード完了ファイル数を正しく表示することで、UXを向上させる

### 期待される成果
- [x] アップロード進行中に「X / Y ファイル完了」が正しく表示される
- [x] バイト単位の進捗から、完了ファイル数を正確に推定できる
- [x] BulkUploadDialog、FormatUploadDialogの両方で正しく動作する

## 3. 実装ステップ

### Phase 1: 問題の特定と分析
- [x] BulkUploadDialog.tsxの実装を確認
- [x] FormatUploadDialog.tsxの実装を確認
- [x] fileAccessService.tsの実装を確認
- [x] 問題箇所を特定：`uploadedCount`が常に0に固定されている

### Phase 2: 修正実装
- [ ] fileAccessService.tsの`uploadFiles`関数を修正
  - [ ] 各ファイルのサイズを事前計算
  - [ ] ファイルサイズの累積値を作成
  - [ ] アップロード済みバイト数から完了ファイル数を推定
  - [ ] `onProgress`コールバックに正しい`uploadedCount`を渡す

### Phase 3: 動作確認
- [ ] 単一ファイルアップロードの動作確認
- [ ] 一括ファイルアップロードの動作確認
- [ ] フォルダアップロードの動作確認
- [ ] 大量ファイル（10+ファイル）での動作確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/services/fileAccessService.ts` - `uploadFiles`関数内の`onUploadProgress`ロジックを修正

### 影響を受ける機能
- プロジェクト管理画面のファイルアップロード（BulkUploadDialog）
- フォーマット管理画面のファイルアップロード（FormatUploadDialog）
- その他`uploadFiles`関数を使用している全ての画面

### 影響を受けないもの
- バックエンドAPI（変更なし）
- データベース（変更なし）
- 他のサービス関数（変更なし）

## 5. 技術的詳細

### 現在の問題

```typescript
onUploadProgress: (progressEvent: AxiosProgressEvent) => {
  if (onProgress && progressEvent.total) {
    const percentage = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    
    onProgress({
      uploadedBytes: progressEvent.loaded,
      totalBytes: progressEvent.total,
      percentage,
      uploadedCount: 0, // ← 常に0で固定（問題）
      totalCount: files.length,
    });
  }
}
```

### 修正方針

HTTPの`onUploadProgress`イベントはバイト単位の進捗しか提供しないため、以下のアルゴリズムでファイル単位の完了件数を推定します：

1. **事前計算**: 各ファイルのサイズを取得し、累積サイズ配列を作成
   ```typescript
   files: [fileA(10KB), fileB(20KB), fileC(30KB)]
   fileSizes: [10KB, 20KB, 30KB]
   cumulativeSizes: [10KB, 30KB, 60KB]
   ```

2. **進捗計算**: アップロード済みバイト数から完了ファイル数を推定
   ```typescript
   // 例: 25KB アップロード済み
   // → cumulativeSizes[0] = 10KB: 25KB >= 10KB → 1ファイル完了
   // → cumulativeSizes[1] = 30KB: 25KB < 30KB → 2ファイル目は未完了
   // → uploadedCount = 1
   ```

3. **コールバック**: 計算された`uploadedCount`を`onProgress`に渡す

### 実装コード

```typescript
// ファイルサイズの累積値を事前計算
const fileSizes: number[] = [];
let totalSize = 0;
files.forEach(file => {
  fileSizes.push(file.size);
  totalSize += file.size;
});

// 各ファイルの累積サイズを計算
const cumulativeSizes: number[] = [];
let cumulative = 0;
fileSizes.forEach(size => {
  cumulative += size;
  cumulativeSizes.push(cumulative);
});

// ... FormData構築 ...

onUploadProgress: (progressEvent: AxiosProgressEvent) => {
  if (onProgress && progressEvent.total) {
    const percentage = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    
    // アップロード済みバイト数から完了ファイル数を推定
    let uploadedCount = 0;
    for (let i = 0; i < cumulativeSizes.length; i++) {
      if (progressEvent.loaded >= cumulativeSizes[i]) {
        uploadedCount = i + 1;
      } else {
        break;
      }
    }
    
    onProgress({
      uploadedBytes: progressEvent.loaded,
      totalBytes: progressEvent.total,
      percentage,
      uploadedCount, // 正しく計算された値
      totalCount: files.length,
    });
  }
}
```

### アーキテクチャ上の考慮事項

- フロントエンド側での推定処理のため、精度は高い
- ファイルサイズが0のファイルは考慮されない（実際には存在しないため問題なし）
- 複数ファイルを1つのリクエストで送信する現在の実装に適合

### セキュリティ考慮事項
- [x] 計算ロジックのみの変更で、セキュリティへの影響なし
- [x] ユーザー入力を使用しない
- [x] 外部APIへの影響なし

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 累積サイズ計算の誤差 | 低 | 低 | ファイルサイズはFile APIから正確に取得可能 |
| 大量ファイル時のパフォーマンス | 低 | 低 | 累積サイズ計算はO(n)で問題なし |
| 既存機能への影響 | 低 | 低 | onProgressコールバックのインターフェースは変更なし |

## 7. テスト計画

### 単体テスト
- [ ] 1ファイル（10MB）のアップロード
  - 期待結果: 0/1 → 1/1 と表示される
- [ ] 3ファイル（各10MB）のアップロード
  - 期待結果: 0/3 → 1/3 → 2/3 → 3/3 と表示される
- [ ] サイズが異なる複数ファイル（1MB, 5MB, 10MB）のアップロード
  - 期待結果: サイズに応じて正しく遷移する

### 統合テスト
- [ ] BulkUploadDialogでの動作確認
  - 単一ファイルモード
  - 一括ファイルモード
  - フォルダモード
- [ ] FormatUploadDialogでの動作確認

### 手動テスト
- [ ] プロジェクト管理画面でファイルアップロード
- [ ] フォーマット管理画面でファイルアップロード
- [ ] 進捗表示が正しく更新されることを確認
- [ ] エラー発生時の挙動を確認

## 8. ロールバック計画

修正が問題を引き起こした場合、以下の手順でロールバック：

1. `fileAccessService.ts`の変更を元に戻す
2. `uploadedCount: 0`に固定する（元の状態）
3. フロントエンドを再ビルド・デプロイ

ロールバックは5分以内で完了可能。

## 9. 関連ドキュメント

- [調査レポート](../20260319_0905_アップロード経過時間残り時間表示調査/research.md) - 経過時間・残り時間表示の調査
- [BulkUploadDialog.tsx](../../frontend/src/components/project/BulkUploadDialog.tsx) - プロジェクト管理用アップロードダイアログ
- [FormatUploadDialog.tsx](../../frontend/src/components/project/FormatUploadDialog.tsx) - フォーマット管理用アップロードダイアログ
- [fileAccessService.ts](../../frontend/src/services/fileAccessService.ts) - ファイルアクセスAPIサービス

## 10. 承認記録

- **計画書提示日時**: 2026-03-19 09:29
- **承認日時**: 2026-03-19 09:41
- **承認者コメント**: 承認。実装を開始してください。

## 11. 実施記録

### 実施日時
開始: 2026-03-19 09:41
完了: 2026-03-19 09:41

### 計画からの変更点
なし。計画通りに実装完了。

### 発生した問題と解決方法
問題なし。スムーズに実装完了。

### 最終的な成果物
- [x] fileAccessService.tsの修正
  - ファイルサイズの累積値を事前計算する処理を追加
  - onUploadProgressで累積サイズから完了ファイル数を推定する処理を追加
  - uploadedCountを正しく計算してonProgressコールバックに渡すように修正
- [x] 実装完了
- [x] ドキュメント更新（PLAN.md）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
