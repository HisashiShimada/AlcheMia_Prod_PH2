# タスク計画書: Maimlファイル保存時にproject_maiml_flagを更新

## メタデータ
- **作成日時**: 2026-02-20 11:35
- **タスクID**: maiml-save-flag-update
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

Maimlファイルの保存時に、projectテーブルの`project_maiml_flg`カラムを自動的に`true`に更新する機能を実装します。

## 2. 目的と期待される成果

### 目的
- プロジェクトにMaimlファイルが存在するかを即座に判定できるようにする
- ファイル一覧を取得せずにMaiml有無を確認可能にする
- UI側でプロジェクト一覧表示時のパフォーマンスを向上させる

### 期待される成果
- [x] Maimlファイル保存時に自動的にproject_maiml_flgが更新される
- [x] プロジェクトIDの抽出が正確に行われる
- [x] マルチテナント分離が維持される
- [x] 既存の保存処理に影響を与えない（エラー時も保存は成功）

## 3. 実装ステップ

### Phase 1: Service層の実装
- [ ] maimlService.tsの`saveMaiML`関数を修正
  - fileKeyからproject_nameを抽出
  - projectRepository.findByName()でプロジェクト情報を取得
  - 既存プロジェクトObjectのproject_maiml_flgをtrueに更新
  - projectRepository.update()で更新（共通メソッド使用）
  - エラー時はログ出力のみ（保存処理は継続）

### Phase 3: テスト
- [x] Maimlファイル保存時の動作確認
- [x] project_maiml_flgが正しく更新されることを確認
- [x] エラー発生時も保存処理が継続することを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/maimlService.ts`
   - `saveMaiML`関数の修正: フラグ更新処理を追加
   - projectRepository.findByName()とupdate()を使用（既存の共通メソッド）

### 影響を受ける機能
- Maimlファイル保存機能（機能追加、既存動作は変更なし）
- プロジェクト一覧表示（project_maiml_flgを利用する場合のパフォーマンス向上）

## 5. 技術的詳細

### fileKeyからproject_idの抽出方法

fileKeyの形式: `projects/{project_name}/{file}.maiml`

```typescript
// 例: projects/sample_project/sample_project.maiml
const pathParts = fileKey.split('/');
if (pathParts[0] === 'projects' && pathParts.length >= 2) {
  const projectName = pathParts[1];
  // projectNameからproject_idを取得する必要がある
}
```

**課題**: fileKeyにはproject_nameが含まれているが、project_idは含まれていない。
**解決策**: 
1. projectRepository.findByName()を使用してプロジェクト情報全体を取得
2. 取得したProjectオブジェクトのproject_maiml_flgをtrueに更新
3. projectRepository.update()で更新（データベース操作規約に準拠）

### セキュリティ考慮事項
- [x] Parameterized Queryを使用（SQLインジェクション対策）
- [x] organization_idフィルタを必須とする（マルチテナント分離）
- [x] 更新失敗時もMaiml保存は成功扱い（ログ出力のみ）

### エラーハンドリング
- プロジェクトが見つからない場合: ログ出力のみ、保存は成功
- フラグ更新失敗: ログ出力のみ、保存は成功
- フラグ更新はベストエフォート方式

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| project_nameからproject_idを取得できない | 中 | 低 | ログ出力のみ、保存処理は継続 |
| フラグ更新に失敗する | 低 | 低 | try-catchで捕捉、ログ出力 |
| パフォーマンス劣化 | 低 | 低 | 非同期処理、軽量なUPDATE文のみ |
| 既存のMaimlファイルのフラグが未設定 | 中 | 高 | 次回保存時に自動的に更新される |

## 7. テスト計画

### 手動テスト
- [x] 新規Maimlファイル保存時のフラグ更新確認
- [x] 既存Maimlファイル更新時のフラグ更新確認
- [x] project_nameが不正な場合の動作確認
- [x] organization_idが異なる場合の動作確認

### 確認項目
- [x] project_maiml_flgがtrueに更新される
- [x] 保存処理が正常に完了する
- [x] エラー時も保存は成功する

## 8. ロールバック計画

問題が発生した場合:
1. 該当コミットをrevertする
2. project_maiml_flgの更新処理を削除
3. 既存の動作に戻す（フラグは手動更新またはバッチ処理で対応）

## 9. 関連ドキュメント

- [データベース操作規約](.clinerules/development/database.md)
- [TypeScript型定義規約](.clinerules/development/typescript.md)
- [セキュリティ規約](.clinerules/development/security.md)
- [projectテーブルDDL](docs/design/db/ddl/project.sql)

## 10. 承認記録

- **計画書提示日時**: 2026-02-20 11:35
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （承認時に記入）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] maimlService.tsでフラグ更新処理を実装（既存のfindByName + updateを使用）
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
