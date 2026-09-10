# タスク計画書: DocumentEditDialog Owner部分の改修

## メタデータ
- **作成日時**: 2026-09-10 10:00
- **タスクID**: 20260910_1000_DocumentEditDialog_Owner改修
- **優先度**: 中
- **推定工数**: 3時間（モック1時間 + 本実装2時間）

## タスク概要

DocumentEditDialog の Owner セクションを以下のように改修する：

1. **Ownerの選択式化**: 現状ログインユーザーのみ設定・それ以外は手入力 → 対象プロジェクトに登録されたグループのユーザー一覧から選択式にする
2. **annotation / description の編集可**: Owner選択後、id/uuid/name は自動入力＆変更不可だが、annotation と description は手入力可能にする

## 目的と期待される成果
- [ ] Owner セクションでプロジェクトのグループメンバー一覧から選択できる
- [ ] 選択された Owner の id/uuid/name は自動設定され変更不可
- [ ] annotation/description は選択後に手入力可能
- [ ] モック確認後に本実装を完了させる

## 実装ステップ

### Phase 1: モック作成
- [ ] PLAN.md 作成（完了）
- [ ] MultiObjectEditor.tsx: fromMaster=true でも annotation/description は編集可能にする
- [ ] DocumentEditDialog.tsx: projectId prop 追加、Owner マスタデータをモック固定値でセット
- [ ] PetriNetEditorInner.tsx: DocumentEditDialog に projectId を渡す
- [ ] 動作確認

### Phase 2: 本実装（モック確認後）
- [ ] projectApiService.ts: getProjectGroupMembers(projectId) 関数を追加
- [ ] DocumentEditDialog.tsx: モックデータ→実APIに変更
- [ ] 翻訳ファイル更新（必要に応じて）
- [ ] 動作確認

## 変更ファイル

### Phase 1
1. `frontend/src/components/editorv2/MultiObjectEditor.tsx` - fromMaster 条件変更
2. `frontend/src/components/editorv2/DocumentEditDialog.tsx` - projectId prop・モックOwnerデータ
3. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - projectId prop 追加渡し

### Phase 2
4. `frontend/src/services/projectApiService.ts` - getProjectGroupMembers 追加
5. `frontend/src/components/editorv2/DocumentEditDialog.tsx` - 実API切り替え
6. `frontend/src/locales/ja.json` / `en.json` - 翻訳キー追加（必要時）

## Owner 選択時の DocumentTagData 生成ルール
```ts
{
  tagName: 'Owner',
  id: user.userId,
  uuid: '',            // 追加時は空（手動入力可）
  name: user.userName,
  description: '',     // 手入力可
  annotation: '',      // 手入力可
  fromMaster: true,    // id/uuid/name は変更不可
}
```

## MultiObjectEditor の fromMaster 制御変更
- 現在: fromMaster=true → id/uuid/name/description/annotation すべて disabled
- 変更後: fromMaster=true → id/uuid/name のみ disabled（description/annotation は編集可）

## リスク
| リスク | 対策 |
|--------|------|
| PetriNetEditorInner が projectId を常に持つとは限らない | undefined の場合はモックデータも空にしてフォールバック |
| Owner のマスタデータ取得失敗 | エラー表示＋手動入力フォールバック |

## テスト計画
- [ ] DocumentEditDialog を開き Owner セクションに選択式が表示されること（モック）
- [ ] ユーザーを選択すると id/name/uuid が自動入力されること
- [ ] id/name は編集不可であること
- [ ] description/annotation は編集可能であること
- [ ] 本実装後、実際のプロジェクトグループメンバーが表示されること

## 承認記録
- **承認日時**: 2026-09-10 10:00
- **承認者コメント**: ユーザー承認済み（Act モード切り替え）

## 実施記録（Phase 1-2）

### 実施日時
開始: 2026-09-10 10:00
完了: 2026-09-10 10:30

### 計画からの変更点
- Phase 1（モック）と Phase 2（本実装）を連続して実施した（モック確認前に本実装を行った。以後は段階ごとに確認を取る）
- `forceTerminateProject` 関数のコメント・実装が混在していたため復元処理が必要だった

### 最終的な成果物
- [x] `MultiObjectEditor.tsx` - fromMaster=true でも description/annotation は編集可能に変更
- [x] `DocumentEditDialog.tsx` - projectId prop 追加・プロジェクトグループメンバーから Owner 選択肢を生成
- [x] `PetriNetEditorInner.tsx` - DocumentEditDialog に projectId を渡す
- [x] `projectApiService.ts` - getProjectGroupMembers() 関数を追加
- [x] `ja.json` / `en.json` - ownerUsersLoadFailed 翻訳キーを追加

---

## Phase 3: 動作確認後の不具合修正

### 発覚した問題

#### 問題1: Owner 以外のマスタ（Creator/Vendor/Instrument）でも description/annotation が編集可能になった
- **原因**: `SingleObjectEditor` が `objectKey` を持っておらず、disabled 条件を一律削除したため
- **修正方針**:
  - `SingleObjectEditorProps` に `objectKey` を追加
  - `description` / `annotation` の disabled 条件を `internalData.fromMaster && objectKey !== 'owners'` に変更
  - Owner（objectKey='owners'）のみ fromMaster でも description/annotation 編集可
  - Creator/Vendor/Instrument は fromMaster=true のとき全フィールド編集不可（元の動作に戻す）

#### 問題2: マスタから追加→保存→再編集で fromMaster フラグが消えて全フィールドが編集可能になる
- **原因**: `maimlTypeConverter.ts` のパース関数（convertCreator/convertVendor/convertOwner/convertInstrument）が `fromMaster` を復元しない
- **修正方針（再マッチング方式）**:
  - `DocumentEditDialog.tsx` にて、マスタデータ・Ownerユーザー一覧の両方のロード完了後に再マッチング処理を実行
  - `documentData` の各エントリの id がロードしたマスタの id と一致する場合 → `fromMaster: true` を付与
  - 対象: Creator（creatorsマスタ）・Vendor（vendorsマスタ）・Instrument（instrumentsマスタ）・Owner（groupMembersユーザー一覧）すべて
  - 再マッチングした結果を `MultiObjectEditor` の `initialData` に反映する（`documentData` の state を更新）

### Phase 3 変更ファイル
1. `frontend/src/components/editorv2/MultiObjectEditor.tsx`
   - `SingleObjectEditorProps` に `objectKey` 追加
   - description/annotation の disabled 条件を `objectKey !== 'owners'` で分岐
   - `SingleObjectEditor` 呼び出し箇所に `objectKey` を渡す

2. `frontend/src/components/editorv2/DocumentEditDialog.tsx`
   - マスタデータ・Ownerユーザーのロード完了後に `documentData` 内エントリを再マッチングして `fromMaster` を付与
   - 再マッチング結果を `form` の初期値に反映（`useMultiObjectState` または form state 経由）

### Phase 3 承認記録
- **承認日時**: 2026-09-10
- **承認者コメント**: Act モードにて修正開始承認済み

---

## Phase 4: OwnerID仕様修正と作業者自動追記

### 背景・仕様
- eventLog 等の ownerRef の `@ref` 値は `userId` の `@` を `_` に置換する仕様（`eventlog_structure.md` 2-5節）
- DocumentEditDialog でグループメンバーから Owner を選択する際も同仕様に揃える必要がある（問題3）
- 作業者画面からの操作は `maiml_event_log` テーブルに ownerRef として userId（@→_変換済み）がため込まれており、
  管理者画面での承認時（`writeDataAndEventLog()` / `writeEventLogOnly()`）にまとめて MAIML に書き込む設計（問題4）

### 問題3: Owner の id に `@` が含まれたまま
- **修正**: `getProjectGroupMembers()` の戻り値で `userId.replace(/@/g, '_')` に変換
- **修正**: `documentInitializer.ts` の `generateInitialOwner()` で `userInfo.id.replace(/@/g, '_')` に変換

### 問題4: 作業者操作時の Owner 自動追記（設計誤りの修正含む）
- **当初誤実装**: 作業者操作のたびに直接 S3 に読み書きしていた
- **正しい設計**: `maiml_event_log` に ownerRef としてため込み、承認時にまとめて書き込む
- **書き込みフロー**:
  1. `extractOwnerIdsFromEventLogs()` で eventLog JSON を再帰的にたどり ownerRef の @ref 値を抽出
  2. `organization_user` テーブルから `user_name` を取得（`_→@` 逆変換で検索・フォールバックあり）
  3. `appendOwnerToDocument()` で既存 `<document>` に未記載の id のみ `<owner>` として追記

### Phase 4 変更ファイル（確定）
1. `frontend/src/services/projectApiService.ts`
   - `getProjectGroupMembers()` の `userId` 返却値に `replace(/@/g, '_')` を追加

2. `frontend/src/utils/documentInitializer.ts`
   - `generateInitialOwner()` の `id` に `userInfo.id.replace(/@/g, '_')` を追加

3. `backend/src/utils/maimlDataWriter.ts`
   - `appendOwnerToDocument(maimlXml, ownerId, ownerName)` 関数を追加
   - `extractOwnerIdsFromEventLogs(logJsonArray)` 関数を追加（eventLog JSON から ownerRef @ref 値を再帰抽出）

4. `backend/src/services/maimlWriterService.ts`
   - `writeDataAndEventLog()` / `writeEventLogOnly()` に Owner 追記処理を追加
   - `appendOwnerToDocument()` メソッドを追加（今後は `writeDataAndEventLog` / `writeEventLogOnly` 経由で使用）
   - `OrganizationUserRepository` インポート追加

5. `backend/src/services/progressService.ts`
   - 誤実装（COMMIT 後の直接 appendOwnerToDocument 呼び出し）を削除
   - 関連インポート削除

6. `backend/src/services/experimentDataService.ts`
   - 誤実装（COMMIT 後の直接 appendOwnerToDocument 呼び出し）を削除
   - 関連インポート削除

### Phase 4 承認記録
- **承認日時**: 2026-09-10
- **承認者コメント**: Act モードにて修正承認済み

---

## 実施記録（Phase 3-4）

### 実施日時
開始: 2026-09-10 11:00
完了: 2026-09-10 12:00

### 最終的な成果物

#### Phase 3（不具合修正）
- [x] `MultiObjectEditor.tsx` - `objectKey !== 'owners'` で分岐し Owner のみ description/annotation 編集可、他マスタは fromMaster=true で全フィールド disabled に戻す
- [x] `DocumentEditDialog.tsx` - `useMemo` による再マッチング処理追加（Creator/Vendor/Owner/Instrument 全種対象）

#### Phase 4（OwnerID仕様修正・作業者自動追記）
- [x] `frontend/src/services/projectApiService.ts` - `getProjectGroupMembers()` で `@→_` 変換
- [x] `frontend/src/utils/documentInitializer.ts` - `generateInitialOwner()` で `@→_` 変換
- [x] `backend/src/utils/maimlDataWriter.ts` - `extractOwnerIdsFromEventLogs()` / `appendOwnerToDocument()` 追加
- [x] `backend/src/services/maimlWriterService.ts` - `writeDataAndEventLog()` / `writeEventLogOnly()` に承認時 Owner 追記処理を追加
- [x] `backend/src/services/progressService.ts` - 誤実装削除
- [x] `backend/src/services/experimentDataService.ts` - 誤実装削除

### TypeScript コンパイル結果
- フロントエンド: exit:0（エラーなし）
- バックエンド: exit:0（エラーなし）
