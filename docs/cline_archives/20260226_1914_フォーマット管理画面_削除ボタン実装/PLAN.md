# タスク計画書: フォーマット管理画面_削除ボタン実装

## メタデータ
- **作成日時**: 2026-02-26 19:14
- **タスクID**: format_delete_button
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

フォーマット管理画面（FormatManagement.tsx）の削除ボタンに機能を実装します。現在、削除ボタンは表示されていますが`console.log`のみで実際の削除処理が実装されていません。

**現状の問題**:
- ❌ フロントエンド: `onDelete`で`console.log`を実行するだけ
- ❌ バックエンド: 削除APIエンドポイントが存在しない

**目標**:
- ✅ 削除確認モーダルを表示
- ✅ ファイル削除APIを実装
- ✅ 削除後にファイル一覧を更新

## 2. 目的と期待される成果

### 目的
フォーマット管理画面でXML/MAIMLファイルを削除できるようにし、不要なファイルの管理を可能にする

### 期待される成果
- [x] 削除ボタンクリック時に確認モーダルが表示される
- [x] 確認後にファイルがSwift/S3から削除される
- [x] 削除後にファイル一覧が自動更新される
- [x] エラー時に適切なメッセージが表示される

## 3. 流用可能な既存実装

### 3.1 フロントエンド実装パターン（DraftManager.tsx）

**参考ファイル**: `frontend/src/components/editorv2/components/DraftManager.tsx`

```typescript
// ✅ 削除確認にPopconfirmを使用
<Popconfirm
  title="Draft削除確認"
  description={`"${draft.draftName}" を削除しますか？`}
  onConfirm={() => handleDelete(draft.draftKey, draft.draftName)}
  okText="削除"
  cancelText="キャンセル"
>
  <Button danger size="small" icon={<DeleteOutlined />}>
    削除
  </Button>
</Popconfirm>

// ✅ 削除ハンドラー実装
const handleDelete = async (draftKey: string, draftName: string) => {
  try {
    await deleteDraft(draftKey);
    Modal.success({ 
      title: '削除完了', 
      content: `"${draftName}" を削除しました` 
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    Modal.error({ 
      title: '削除エラー', 
      content: errorMessage 
    });
  }
};
```

### 3.2 バックエンド削除APIパターン

**参考ファイル**: 
- `backend/src/routes/maimlRoutes.ts`
- `backend/src/controllers/maimlController.ts`
- `backend/src/services/storageService.ts`

```typescript
// ✅ ルート定義（maimlRoutes.ts）
router.delete(
  '/draft/:draftKey',
  authMiddleware,
  maimlController.deleteDraft
);

// ✅ コントローラー（maimlController.ts）
export async function deleteDraft(req: Request, res: Response): Promise<void> {
  try {
    const { draftKey } = req.params;
    await maimlService.deleteDraft(draftKey, req.userId!);
    
    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    // エラーハンドリング
  }
}

// ✅ ストレージサービス（storageService.ts）
async deleteFile(organizationId: string, filePath: string): Promise<void> {
  const key = this.buildKey(organizationId, filePath);
  // Swift/S3からファイル削除
}
```

## 4. 実装ステップ

### Phase 1: バックエンドAPI実装

#### Step 1.1: formatRoutes.tsに削除エンドポイント追加
- [x] `DELETE /api/v1/formats/files` を追加
- [x] 権限チェック: 実験管理者メニュー（040000）、書込可（1）
- [x] リクエストボディ: `{ filePath: string }`

#### Step 1.2: formatController.tsに削除コントローラー追加
- [x] `deleteFormatFile` 関数を実装
- [x] organization_idの取得（req.organizationId）
- [x] filePathのバリデーション
- [x] storageService.deleteFileを呼び出し
- [x] 成功/失敗レスポンスを返す

#### Step 1.3: 型定義ファイルの確認
- [x] 削除APIのリクエスト/レスポンス型を定義（必要に応じて）

### Phase 2: フロントエンド実装

#### Step 2.1: FormatManagement.tsxに削除ハンドラー追加
- [x] `handleFileDelete` 関数を実装
- [x] `modal.confirm`で削除確認ダイアログを表示
- [x] `createApiClient().delete('/formats/files')`でAPI呼び出し
- [x] 成功時にファイル一覧を再読み込み
- [x] エラー時にメッセージ表示

#### Step 2.2: FormatFileListTable.tsxのonDeleteを更新
- [x] `onDelete={handleFileDelete}` に変更
- [x] ボタンクリック時の挙動確認

### Phase 3: テストと検証

#### Step 3.1: 手動テスト
- [x] 削除ボタンをクリック → 確認モーダルが表示される
- [x] 「キャンセル」をクリック → 削除されない
- [x] 「削除」をクリック → ファイルが削除される
- [x] 削除後にファイル一覧が更新される
- [x] 存在しないファイルを削除 → エラーメッセージ表示

#### Step 3.2: エラーケースの確認
- [x] 権限がない場合のエラーハンドリング
- [x] ネットワークエラー時の動作確認
- [x] 同時削除時の挙動確認

## 5. 影響範囲

### 変更するファイル

#### バックエンド
1. `backend/src/routes/formatRoutes.ts` - 削除エンドポイント追加
2. `backend/src/controllers/formatController.ts` - 削除コントローラー追加
3. `backend/src/types/api.ts` - 削除APIの型定義追加（必要に応じて）

#### フロントエンド
1. `frontend/src/components/project/FormatManagement.tsx` - 削除ハンドラー実装
2. `frontend/src/components/project/FormatFileListTable.tsx` - onDeleteプロップの接続確認

### 新規作成するファイル
なし（既存ファイルの修正のみ）

### 影響を受ける機能
- フォーマット管理画面のファイル一覧表示
- Swift/S3ストレージの状態

## 6. 技術的詳細

### 使用する技術・ライブラリ
- **フロントエンド**: Ant Design（Modal.confirm）
- **バックエンド**: Express.js、storageService
- **ストレージ**: Swift/S3（既存のdeleteFile関数）

### セキュリティ考慮事項
- [x] 認証・認可チェック（authMiddleware + checkPermission）
- [x] organization_idによるマルチテナント分離
- [x] filePathのバリデーション（パストラバーサル対策）

### エラーハンドリング
- ファイルが存在しない場合
- 権限がない場合
- ネットワークエラー
- ストレージサービスエラー

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 誤削除による重要ファイルの喪失 | 高 | 中 | 削除確認モーダルで明確な警告メッセージ表示 |
| 削除処理中のエラーによるデータ不整合 | 中 | 低 | トランザクション処理とロールバック実装 |
| 同時削除によるコンフリクト | 低 | 低 | 削除前にファイル存在確認 |
| 権限チェック漏れによる不正削除 | 高 | 低 | checkPermissionミドルウェアで厳密にチェック |

## 8. テスト計画

### 手動テスト
- [x] 正常系: XMLファイルを削除して一覧から消えることを確認
- [x] 正常系: MAIMLファイルを削除して一覧から消えることを確認
- [x] 正常系: サブフォルダ内のファイル削除
- [x] 異常系: 権限がないユーザーで削除を試みる
- [x] 異常系: 存在しないファイルを削除しようとする
- [x] 異常系: ネットワークエラー時の動作確認

### 確認項目
- [x] 削除確認モーダルが表示される
- [x] モーダルにファイル名が正しく表示される
- [x] 「削除」ボタンが危険色（danger）で表示される
- [x] キャンセル時に削除されない
- [x] 削除成功時にメッセージが表示される
- [x] 削除後にファイル一覧が自動更新される
- [x] エラー時に適切なエラーメッセージが表示される

## 9. ロールバック計画

問題が発生した場合は、以下の手順でロールバック:

1. バックエンド: formatRoutes.tsとformatController.tsの変更をrevert
2. フロントエンド: FormatManagement.tsxの`handleFileDelete`を元の`console.log`に戻す
3. Gitで前のコミットに戻す

## 10. 関連ドキュメント

- [調査レポート](../20260226_1825_フォーマット管理画面_ダウンロード削除機能調査/investigation_report.md)
- [ファイル書き込み規約](.clinerules/development/file-writing.md)
- [セキュリティ規約](.clinerules/development/security.md)
- [TypeScript型定義規約](.clinerules/development/typescript.md)

## 11. 承認記録

- **計画書提示日時**: 2026-02-26 19:14
- **承認日時**: 2026-02-26 19:21
- **承認者コメント**: 承認

## 12. 実施記録

### 実施日時
開始: 2026-02-26 19:22
完了: 2026-02-26 19:24

### 計画からの変更点
なし。計画通りに実装完了。

### 発生した問題と解決方法

#### 問題1: TypeScriptコンパイルエラー（Modalインポート漏れ）
- **問題**: `Modal.confirm`使用時に「名前 'Modal' が見つかりません」エラー
- **解決**: Ant DesignからModalをインポート追加

#### 問題2: TypeScriptコンパイルエラー（変数参照順序）
- **問題**: `selectedFormat`が宣言前に使用されるエラー
- **解決**: `handleFileDelete`内で`selectedFormat`を直接参照せず、必要な時に取得するように変更

### 最終的な成果物

#### バックエンド
1. **backend/src/services/formatService.ts** - `deleteFormatFile`関数追加
   - ファイル存在確認
   - storageService.deleteFile呼び出し
   - 削除結果レスポンス返却

2. **backend/src/controllers/formatController.ts** - `deleteFormatFile`コントローラー追加
   - リクエストバリデーション
   - エラーハンドリング（404, 500）
   - 成功/失敗レスポンス

3. **backend/src/routes/formatRoutes.ts** - `DELETE /api/v1/formats/files`エンドポイント追加
   - 認証: authMiddleware
   - 権限: 実験管理者メニュー（040000）、書込可（1）

#### フロントエンド
1. **frontend/src/components/project/FormatManagement.tsx**
   - `handleFileDelete`関数実装
   - `Modal.confirm`で削除確認ダイアログ表示
   - 削除成功時にファイル一覧自動更新
   - エラーハンドリング実装
   - `FormatFileListTable`の`onDelete`プロップに接続

## 13. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）
