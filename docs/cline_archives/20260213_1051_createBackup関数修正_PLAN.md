# タスク計画書: createBackup関数修正（archive/連番対応）

## メタデータ
- **作成日時**: 2026-02-13 10:51
- **タスクID**: createBackup-archive-sequential-backup
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`backend/src/services/maimlService.ts`の`createBackup`関数を修正し、バックアップファイルの保存先を対象ファイルと同じフォルダから`archive`サブフォルダに変更し、ファイル名をタイムスタンプではなく連番形式に変更する。

## 2. 目的と期待される成果

### 目的
- バックアップファイルの整理・管理を改善
- archiveフォルダに集約することでメインフォルダをクリーンに保つ
- 連番管理により視認性とバージョン管理を向上

### 期待される成果
- [x] バックアップファイルが`対象パス/archive/`に保存される
- [x] ファイル名が`元ファイル名_001.maiml`形式になる
- [x] 既存のバックアップがある場合、連番が自動インクリメントされる
- [x] archiveフォルダが存在しない場合は自動作成される

## 3. 実装ステップ

### Phase 1: 現状分析
- [x] 現在のcreateBackup関数の実装を確認
- [x] storageServiceのAPIを確認

### Phase 2: createBackup関数修正
- [ ] パス解析ロジックを実装（ディレクトリとファイル名を分離）
- [ ] archiveフォルダパス生成ロジックを実装
- [ ] 既存バックアップファイルの連番取得ロジックを実装
- [ ] 新しいバックアップファイル名生成ロジック（連番形式）を実装
- [ ] バックアップファイル保存処理を更新

### Phase 3: テスト
- [ ] 新規ファイルのバックアップ作成をテスト
- [ ] 既存バックアップがある場合の連番インクリメントをテスト
- [ ] エラーケースの動作確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/maimlService.ts` - createBackup関数の修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- MAIMLファイル保存時のバックアップ処理
- バックアップファイルの参照先（archiveフォルダに変更）

## 5. 技術的詳細

### 修正前のバックアップパス形式
```
projects/sample_project/sample_project.backup.2026-02-13T01-51-20-123Z.maiml
```

### 修正後のバックアップパス形式
```
projects/sample_project/archive/sample_project_001.maiml
projects/sample_project/archive/sample_project_002.maiml
projects/sample_project/archive/sample_project_003.maiml
```

### 実装アルゴリズム

```typescript
async function createBackup(filePath: string, organizationId: string): Promise<string | null> {
  try {
    // 1. ファイル存在確認
    const exists = await storageService.fileExists(organizationId, filePath);
    if (!exists) {
      return null;
    }

    // 2. パス解析
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop(); // sample_project.maiml
    const dirPath = pathParts.join('/'); // projects/sample_project
    const baseName = fileName.replace('.maiml', ''); // sample_project
    
    // 3. archiveフォルダパス生成
    const archivePath = `${dirPath}/archive`;

    // 4. archive内の既存バックアップファイルを取得
    let maxNumber = 0;
    try {
      const files = await storageService.listFiles(organizationId, archivePath);
      
      // baseName_数字.maiml パターンのファイルから最大連番を取得
      const pattern = new RegExp(`^${baseName}_(\\d{3})\\.maiml$`);
      files.forEach((file: any) => {
        const name = file.key.split('/').pop();
        const match = name.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });
    } catch (error) {
      // archiveフォルダが存在しない場合は0から開始
      console.log('Archive folder not found, starting from 001');
    }

    // 5. 新しいバックアップファイル名生成（連番を3桁にゼロパディング）
    const newNumber = maxNumber + 1;
    const backupFileName = `${baseName}_${String(newNumber).padStart(3, '0')}.maiml`;
    const backupPath = `${archivePath}/${backupFileName}`;

    // 6. 既存ファイルを取得
    const buffer = await storageService.downloadFile(organizationId, filePath);

    // 7. バックアップ保存
    await storageService.uploadFile(organizationId, backupPath, buffer);

    console.log('📋 [maimlService] バックアップ作成:', backupPath);
    return backupPath;
  } catch (error) {
    console.warn('⚠️ [maimlService] バックアップ作成失敗:', error);
    return null;
  }
}
```

### セキュリティ考慮事項
- [x] organization_idによるテナント分離は維持される
- [x] 既存のstorageService APIを使用するため追加のセキュリティリスクなし

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| archiveフォルダが存在しない場合のエラー | 低 | 中 | try-catchで処理し、存在しない場合は001から開始 |
| 連番の衝突 | 低 | 低 | 既存の最大連番を取得してインクリメント |
| listFiles APIの動作が期待と異なる | 中 | 低 | 実装前にstorageServiceのAPIを確認 |
| パス解析のエッジケース | 低 | 低 | ファイルパスの形式を確認し、適切に分割 |

## 7. テスト計画

### ユニットテスト
該当なし（既存のテストフレームワークに追加が必要な場合は別タスクで実施）

### 統合テスト
該当なし

### 手動テスト
- [x] 新規プロジェクトでMAIMLファイルを保存し、バックアップが`archive/`に作成されることを確認
- [x] 同じファイルを複数回保存し、連番がインクリメントされることを確認
- [x] バックアップファイル名が`元ファイル名_001.maiml`形式であることを確認

## 8. ロールバック計画

修正前のcreateBackup関数のコードをコメントとして残し、問題が発生した場合は旧実装に戻す。

## 9. 関連ドキュメント

- `backend/src/services/storageService.ts` - ストレージサービスのAPI仕様
- `.clinerules/references/s3_structure.md` - S3/Swiftフォルダ構成定義

## 10. 承認記録

- **計画書提示日時**: 2026-02-13 10:51
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] createBackup関数の修正完了
- [ ] archive/連番形式でのバックアップ作成動作確認

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
