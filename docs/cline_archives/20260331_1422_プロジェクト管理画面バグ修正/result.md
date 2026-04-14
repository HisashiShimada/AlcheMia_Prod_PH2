# 修正結果レポート: プロジェクト管理画面バグ修正

- **作成日時**: 2026-03-31 15:01
- **対応者**: Cline

---

## 対応した課題

### 課題1: プロジェクト管理画面のファイル数が常に0件表示

**現象**  
プロジェクト一覧画面でファイル数が固定で `0` と表示される。

**原因**  
`projectService.ts` の `list()` メソッドがファイル数を `0` にハードコードしていた。

**修正内容**  
`backend/src/services/projectService.ts`  
- プロジェクト一覧取得クエリに `file_metadata` テーブルへのサブクエリを追加
- `.keep` ファイル（空フォルダプレースホルダー）をカウントから除外
- `fileCount: 0` → `parseInt(row.file_count, 10) || 0` に変更

---

### 課題2: 公開機能のエラーがシステムエラーダイアログで表示される

**現象**  
公開機能でステータスエラー等が返った際に、ダイアログ内のインラインメッセージではなくシステムエラーダイアログ（`SystemErrorDialog`）が表示される。

**原因**  
バックエンドのエラーコードが `E` プレフィックス形式（例: `E5001`）でなく、別形式で返却されていた。フロントエンドの `ERROR_MESSAGES` マップもキーが不一致だったため、エラーコードが認識されずシステムエラーとして扱われていた。

**修正内容**  
- `backend/src/controllers/projectController.ts` 公開関連エンドポイントのエラーコードを `E` コード形式に統一
- `frontend/src/components/project/MaimlPublishDialog.tsx` の `ERROR_MESSAGES` マップのキーを `E` コード形式に統一し、ダイアログ内の `Alert` としてメッセージが正しく表示されるよう修正
- `frontend/src/components/project/ProjectManagement.tsx` の公開ボタンの `disabled` 条件にステータスチェックを追加（ステータス3：タスク結果レビュー待ち、またはステータス4：プロジェクト完了のみ活性化）

```typescript
// 修正後
disabled={!selectedProject || !(selectedProject?.status === 3 || selectedProject?.status === 4) || publishStatusLoading || isPolling}
```

---

### 追加対応: `file_metadata` アーカイブレコード未登録

**現象**  
MAIML 保存・公開承認時にアーカイブファイルが Swift/S3 に作成されているにもかかわらず、`file_metadata` テーブルにレコードが登録されない。

**原因**  
`insertFileMetadata()` 呼び出し時に `file_metadata` テーブルの `NOT NULL` 制約カラムが未指定で、INSERT がエラーになっていた。エラーは `catch` で握り潰されていたため表面化しなかった。

不足していたカラム:
- `file_size` （`BIGINT NOT NULL`）
- `uploaded_by` （`VARCHAR(100) NOT NULL`）

**修正内容**  

| ファイル | メソッド | 修正内容 |
|---|---|---|
| `backend/src/services/maimlService.ts` | `createBackup()` | `file_size: buffer.length`, `uploaded_by: 'system'` を追加 |
| `backend/src/services/maimlWriterService.ts` | `writeDataAndEventLog()` アーカイブ登録 | `file_size: fileBuffer.length`, `uploaded_by: 'system'` を追加 |
| `backend/src/services/maimlWriterService.ts` | `writeDataAndEventLog()` メインファイル新規登録 | `file_size: Buffer.byteLength(updatedMaiml, 'utf-8')`, `uploaded_by: 'system'` を追加 |

---

## 修正ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `backend/src/services/projectService.ts` | 修正（ファイル数サブクエリ追加） |
| `backend/src/controllers/projectController.ts` | 修正（エラーコード統一） |
| `frontend/src/components/project/MaimlPublishDialog.tsx` | 修正（ERROR_MESSAGES キー統一） |
| `backend/src/services/maimlService.ts` | 修正（file_metadata 登録 NOT NULL 追加） |
| `backend/src/services/maimlWriterService.ts` | 修正（file_metadata 登録 NOT NULL 追加） |

---

## 動作確認結果

- ✅ プロジェクト管理画面でファイル数が正しく表示されることを確認
- ✅ 公開機能のエラー時にダイアログ内 Alert としてメッセージが表示されることを確認
- ✅ MAIML 保存・公開承認時にアーカイブの `file_metadata` レコードが正しく登録されることを確認
