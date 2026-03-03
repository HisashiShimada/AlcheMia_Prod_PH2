# タスク計画書: deleteFormatFile処理の削除

## メタデータ
- **作成日時**: 2026-03-02 19:02
- **タスクID**: deleteFormatFile削除
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

フロントエンドから使用されていない`deleteFormatFile`処理（DELETE /api/v1/formats/files）をバックエンドから削除します。

## 2. 目的と期待される成果

### 目的
- 未使用コードを削除してコードベースをクリーンに保つ
- メンテナンスコストを削減する
- 不要なエンドポイントを削除してセキュリティリスクを軽減する

### 期待される成果
- [ ] formatController.tsからdeleteFormatFile関数を削除
- [ ] formatService.tsからdeleteFormatFile関数を削除
- [ ] formatRoutes.tsからDELETEルート定義を削除
- [ ] 関連するexport文を削除

## 3. 実装ステップ

### Phase 1: コントローラー層の削除
- [ ] `backend/src/controllers/formatController.ts`から`deleteFormatFile`関数を削除
- [ ] export文から`deleteFormatFile`を削除

### Phase 2: サービス層の削除
- [ ] `backend/src/services/formatService.ts`から`deleteFormatFile`関数を削除
- [ ] export文から`deleteFormatFile`を削除

### Phase 3: ルーティング層の削除
- [ ] `backend/src/routes/formatRoutes.ts`からDELETEルート定義を削除（120-133行目付近）

### Phase 4: 動作確認
- [ ] バックエンドがビルドエラーなく起動することを確認
- [ ] 他のformat関連APIが正常に動作することを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/controllers/formatController.ts` - deleteFormatFile関数とexportを削除
2. `backend/src/services/formatService.ts` - deleteFormatFile関数とexportを削除
3. `backend/src/routes/formatRoutes.ts` - DELETEルート定義を削除

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
なし（未使用のため）

## 5. 技術的詳細

### 削除対象の処理
- **エンドポイント**: `DELETE /api/v1/formats/files`
- **権限**: 実験管理者メニュー（040000）、書込可（1）
- **コントローラー**: `formatController.deleteFormatFile`
- **サービス**: `formatService.deleteFormatFile`

### 削除しない処理（残すもの）
- `getFormats()` - フォーマット一覧取得
- `getFormatFiles()` - ファイル一覧取得
- `createFormatSubfolder()` - サブフォルダ作成
- `createFormatFile()` - ファイル作成
- `createFormatFolder()` - フォルダ作成
- `updateFormatFile()` - ファイル更新

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドで実は使用されている | 高 | 低 | 事前調査で未使用を確認済み |
| 他のAPIが依存している | 中 | 低 | service層での依存関係なし |
| ビルドエラー | 低 | 低 | TypeScriptの型チェックで検証 |

## 7. テスト計画

### ユニットテスト
- テストは不要（削除のみ）

### 統合テスト
- [ ] バックエンドが正常にビルドされることを確認
- [ ] 他のformat APIが正常に動作することを確認

### 手動テスト
- [ ] `npm run build`でビルドエラーがないことを確認
- [ ] サーバー起動時にエラーがないことを確認

## 8. ロールバック計画

削除したコードはGitで管理されているため、必要に応じてcommitを戻すことで復元可能です。

```bash
# ロールバック手順
git revert <commit-hash>
```

## 9. 関連ドキュメント

なし

## 10. 承認記録

- **計画書提示日時**: 2026-03-02 19:02
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入予定）

## 11. 実施記録

### 実施日時
開始: （作業開始後に記入）
完了: （作業完了後に記入）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
（実施後に記録）

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）
