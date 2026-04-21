# 未解決課題まとめ

作成日: 2026-04-21

---

## 課題①: UUID一致アップロード後に「Parentタグ確認」警告が表示されない

### 期待動作
- プロジェクトに既存MAIMLがあり（`project_uuid` が設定済み）、同じUUIDのMAIMLをアップロードした場合  
  → アップロード完了後に「MAIMLファイルを更新しました。手作業で編集した場合は、「Parent」タグが正しく設定されていることを確認してください。」という警告メッセージが表示される

### 実際の動作
- 上記の条件を満たしていても警告メッセージは出ず、「完了」メッセージのみ表示される

### 調査済み内容

| 場所 | 状態 |
|------|------|
| `ProjectManagement.tsx` の `handleUploadComplete` | 実装済み（`hadProjectUuid === true` のとき `message.warning(...)` を呼ぶ） |
| `BulkUploadDialog.tsx` の `onUploadComplete` 呼び出し | 実装済み（`hasMaimlFile: response.hasMaimlFile` を渡す） |
| `fileAccessService.ts` の `uploadFiles()` 戻り値 | **修正済み**（`hasMaimlFile` を追加） |
| `projectService.ts` のプロジェクト一覧マッピング | `project_uuid: row.project_uuid || null` が設定済み |

### 未確認・疑わしい箇所

1. **`hadProjectUuid` の判定ロジック**  
   ```typescript
   const hadProjectUuid = result.hasMaimlFile
     ? (currentProject?.project_uuid != null)
     : false;
   ```
   - `result.hasMaimlFile` が実際に `true` で届いているか（`console.log` で確認要）
   - `currentProject?.project_uuid` が `null` でなく正しい値で取得できているか

2. **`uploadFiles()` の `hasMaimlFile` 計算タイミング**  
   - `successFiles` が空の場合（チャンクアップロード完了後に `successFiles` に追加されない可能性）
   - チャンクアップロード（10MB超）で `.maiml` を上げた場合、`uploadSingleFileWithChunks` の戻り値も `successFiles` に入るか確認要

3. **バックエンドが UUID 不一致時にエラーを返す場合の `failedFileNames` 判定**  
   - UUID不一致でアップロード拒否された場合、`failedCount === files.length` になり例外がスローされる  
   - その場合は `hasMaimlFile` 計算前に throw してしまい、`BulkUploadDialog` の `onUploadComplete` が呼ばれない可能性がある

---

## 課題②: UUID不一致ファイルをアップロードするとエラーにもかかわらず「完了」メッセージが出る

### 期待動作
- アップロードしたMAIMLのUUIDが既存プロジェクトの `project_uuid` と一致しない場合  
  → アップロードは拒否され、**エラーメッセージ**が表示される（「完了」ではない）

### 実際の動作
- アップロード自体はされないが（バックエンドで拒否）、フロントエンドには「完了」メッセージが表示される

### 調査済み内容

| 場所 | 状態 |
|------|------|
| `fileAccessService.ts` の `project_maiml_flg` ベース判定修正 | 修正済み（前セッション） |

### 未確認・疑わしい箇所

1. **バックエンドがエラーを返す形式**  
   - `/files/chunks/init` または `/files/upload` がエラーレスポンス（HTTP 4xx）を返すとき、フロントの `uploadFiles` がどう処理しているか
   - `failedCount === files.length` になっているはずだが、`throw` が `BulkUploadDialog` まで伝播しているか確認要

2. **`BulkUploadDialog.tsx` のエラーハンドリング**  
   - `uploadFiles()` が throw した場合に catch して「エラー」表示するパスになっているか
   - catch ブロックで `onUploadComplete` が呼ばれていないか確認要
   - 現状「完了」が出るということは、何らかの経路で `onUploadComplete({ success: true })` が呼ばれている可能性

3. **チャンクアップロード時の init エラー処理**  
   - `/files/chunks/init` でUUID不一致エラーが返った場合（HTTP 409など）  
   - `withRetry` が 4xx はリトライしないので即 throw するはず  
   - ただし `BulkUploadDialog` が catch してエラー表示するかどうか確認要

---

## 次回セッションで確認すべきデバッグ手順

1. `BulkUploadDialog.tsx` のアップロード完了前後の `console.log` を確認
   - `response.hasMaimlFile` の値
   - エラー時に catch されているか

2. `ProjectManagement.tsx` の `handleUploadComplete` で  
   `result.hasMaimlFile` と `currentProject?.project_uuid` の値をログ確認

3. バックエンドの UUID 不一致時のレスポンス形式（HTTP ステータス・エラーコード）を確認

4. `BulkUploadDialog.tsx` の try-catch 構造と完了メッセージ表示箇所を確認
