# タスク計画書: MAIMLバリデーション canBeIgnoredOnUpload対応

## メタデータ
- **作成日時**: 2026-04-23 16:50
- **タスクID**: maiml-validation-ignorable-error
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

前回のバリデーション緩和対応（lenientモードでエラーを警告に降格）では、DB保存時にエラー情報が失われる問題がある。バリデーション結果の再確認機能追加やUI表示との整合性を考慮し、「エラーのまま保持しつつアップロードを許可する」方式に変更する。

## 目的と期待される成果

- [ ] lenientモードでもエラーはerrorsに追加（警告に降格しない）
- [ ] `canBeIgnoredOnUpload: true` フラグでアップロード許可エラーを識別
- [ ] DB保存時のエラー数・状態が実態と一致
- [ ] ValidationPanel.tsxで致命的エラーと編集可能エラーを区別表示
- [ ] 既存テスト26件が引き続きパス（テスト修正含む）

## 実装ステップ

### Phase 1: 型定義の変更
- [ ] `backend/src/types/maimlValidation.ts` に `canBeIgnoredOnUpload?: boolean` を追加
- [ ] `frontend/src/types/maimlValidation.ts` に同フィールドを追加

### Phase 2: バリデーションロジックの変更
- [ ] `backend/src/utils/maimlParser.ts`
  - `validateDocumentStructure()`: lenientモードで creator/vendor/owner/date/id属性を `errors` に追加（`canBeIgnoredOnUpload: true`）
  - `validateMethodStructure()`: lenientモードで method id属性を `errors` に追加
  - warnings配列への降格ロジックを削除

### Phase 3: アップロード判定の変更
- [ ] `backend/src/services/fileAccessService.ts`
  - `fatalErrors` の条件を `severity === 'error' && !canBeIgnoredOnUpload` に変更

### Phase 4: フロントエンド表示の変更
- [ ] `frontend/src/components/editorv2/components/ValidationPanel.tsx`
  - エラーを致命的/編集可能に分類して表示
  - タグの色分け変更（致命的: 赤、編集可能: オレンジ）

### Phase 5: テストの更新と確認
- [ ] `backend/tests/utils/maimlParser.validation.test.ts`
  - lenientモードのテストを `errors` ベースに変更（warningsではなく）
- [ ] テスト実行し全件パス確認

## 変更ファイル一覧
1. `backend/src/types/maimlValidation.ts` - `canBeIgnoredOnUpload` フィールド追加
2. `frontend/src/types/maimlValidation.ts` - 同フィールド追加
3. `backend/src/utils/maimlParser.ts` - lenient時の降格ロジック変更
4. `backend/src/services/fileAccessService.ts` - アップロード判定変更
5. `frontend/src/components/editorv2/components/ValidationPanel.tsx` - 表示分類変更
6. `backend/tests/utils/maimlParser.validation.test.ts` - テスト更新

## リスク
| リスク | 対策 |
|--------|------|
| 既存テスト26件の大部分が変更対象 | lenientモードの期待値を修正してから実行 |
| フロントエンドの型ミスマッチ | BackendとFrontend型定義を同時に変更 |

## 承認記録
- **計画書提示日時**: 2026-04-23 16:50
- **承認日時**: 2026-04-23 17:01（実装完了）

## 11. 実施記録

### 実施日時
開始: 2026-04-23 17:00  
完了: 2026-04-23 17:01

### 実施結果
- Phase 1: `ErrorContent` に `canBeIgnoredOnUpload?: boolean` を追加（backend/frontend両方）
- Phase 2: `maimlParser.ts` でlenient時の降格ロジックを `canBeIgnoredOnUpload=true` のerrorsに変更（uuid欠落/UUID不正は致命的エラーのまま）
- Phase 3: `fileAccessService.ts` のfatalErrors判定を `!canBeIgnoredOnUpload` 条件に変更
- Phase 4: `ValidationPanel.tsx` で致命的エラー・編集可能エラー・警告の3分類表示に変更
- Phase 5: テスト26件全PASS確認（hasFatalError/hasIgnorableErrorヘルパー関数追加、ケース02/03/04/11更新）
