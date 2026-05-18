# タスク計画書: 重複エラーメッセージ改善（会社管理・マスタ管理・ユーザー管理・ロール管理・組織管理）

## メタデータ
- **作成日時**: 2026-05-13 10:31
- **更新日時**: 2026-05-15 11:43
- **タスクID**: 重複エラーメッセージ改善
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

重複エラー発生時の表示方法を **「保存後 + インライン + トースト」** に統一する。

### 問題1: プロバイダーメニュー「会社管理」

追加モーダルで既存の会社名と重複する名前を登録しようとした際、バックエンドは `DUPLICATE_CORPORATION_NAME`（HTTP 409）を返しているが、フロントエンドの `ERROR_CODE_TO_KEY` にこのコードが未登録のため、汎用メッセージ「保存に失敗しました」しか表示されない。  
また、409エラー時にフォームのインライン表示がない。

### 問題2: データ管理者メニュー「マスタ管理」

Creator / Vendor / Instrument / Attribute の各マスタ追加時に重複 ID/名称が存在する場合、バックエンドは HTTP 409 を返すが、`MasterManagement.tsx` が生 `fetch` API を使用しているため `extractErrorMessage()` が plain Error を正しく処理できず、「エラーが発生しました」（E9999 フォールバック）しか表示されない。

### 問題3: システム管理メニュー「ユーザー管理」

ユーザー追加時にメールアドレスが重複している場合、バックエンドは `USER_ALREADY_EXISTS`（HTTP 409）を返すが、フロントエンドが 409 を特別扱いせず「保存に失敗しました」しか表示されない。  
また、409エラー時にフォームのインライン表示がない。

### 問題4: システム管理メニュー「ロール管理」

ロール追加時に重複する role_cd を入力した場合、`roleService.ts` の `createRole` 関数に重複チェックが実装されていないため、PostgreSQL の一意制約違反が発生して HTTP 500 が返される。フロントエンドは 409 を期待して専用の重複メッセージ分岐を持っているが、500 が返るためその分岐に到達せず「保存に失敗しました」が表示される。

### 問題5: プロバイダーメニュー「組織管理」（追加スコープ）

組織CD 入力中にリアルタイムで API を呼び出して重複チェックを行っている（`useEffect` + `GET /provider/organization/check-cd/:cd`）。  
他の画面と統一するため、リアルタイムチェックを廃止し、保存ボタン押下後の 409 エラー時にインライン + トーストで表示する方式に変更する。

---

## 目的と期待される成果

- [ ] **共通**: 重複エラーの表示方式を「保存後 + インライン（フィールド下）+ トースト」に統一する
- [ ] マスタ（Creator/Vendor/Instrument/Attribute）ID 重複時に `t('masterManagement.messages.idDuplicate')` の翻訳済みメッセージが正しく表示される
- [ ] 他の汎用エラーには影響しない

---

## 実装ステップ

### Phase 1: 会社管理 — インライン表示 + トースト追加

- [ ] `frontend/src/locales/ja.json` の `errors` セクションに `DUPLICATE_CORPORATION_NAME` の翻訳文言を確認（既存なら不要）
- [ ] `frontend/src/locales/en.json` の `errors` セクションに翻訳文言を確認（既存なら不要）
- [ ] `frontend/src/components/Provider/CorporationManagement.tsx` の `handleModalOk` catch ブロックに、`extractErrorCode()` で `DUPLICATE_CORPORATION_NAME` / `E7001` を直接比較し、インライン表示 + トーストを追加

> **実装注記**: `errorMapper.ts` の `ERROR_CODE_TO_KEY` への追加は不要と判断。`extractErrorCode()` で直接コードを比較する方式で実装した。

```typescript
// handleModalOk の catch ブロック（実装済み）
const code = extractErrorCode(error);
if (code === 'DUPLICATE_CORPORATION_NAME' || code === 'E7001') {
  const dupMsg = t('errors.DUPLICATE_CORPORATION_NAME');
  form.setFields([{ name: 'corporationName', errors: [dupMsg] }]);
  messageApi.error(dupMsg);
  return;
}
messageApi.error(extractErrorMessage(error, t('corporationManagement.messages.saveError')));
```

### Phase 2: マスタ管理 — catch ブロックの修正

`MasterManagement.tsx` の `handleModalOk` 内 catch ブロックを修正する。

**修正方針**: plain Error（axios エラーでないもの）は `error.message` をそのまま表示する。

- [ ] `frontend/src/components/DataManagement/MasterManagement.tsx` の `handleModalOk` catch ブロックを修正

```typescript
if (error instanceof Error && !('isAxiosError' in error)) {
  message.error(error.message);
} else {
  message.error(extractErrorMessage(error, t('masterManagement.messages.saveError')));
}
```

### Phase 3: ユーザー管理 — 409 時のインライン表示追加 + エラーメッセージ修正

- [ ] `frontend/src/locales/ja.json` の `userManagement.messages` に `duplicateEmailError` キーを追加：「このメールアドレスは既に使用されています」
- [ ] `frontend/src/locales/en.json` に同キーを追加：「This email address is already in use」
- [ ] `frontend/src/components/SystemManagement/UserManagement.tsx` の `handleModalOk` catch ブロックに 409 時の `form.setFields` によるインライン表示を追加

```typescript
// 409 の場合はメールアドレスフィールドにインラインエラー + トースト
if (axiosError?.response?.status === 409) {
  const dupMsg = t('userManagement.messages.duplicateEmailError');
  form.setFields([{ name: 'mailAddress', errors: [dupMsg] }]);
  message.error(dupMsg);
  return;
}
```

### Phase 4: ロール管理 — バックエンドに重複チェックを追加

`roleService.ts` の `createRole` 関数に重複チェックを追加する。

**修正方針**: `roleRepository.existsById` で role_cd の存在確認を行い、重複時は HTTP 409 + `DUPLICATE_ROLE_CD` を throw する。

- [ ] `backend/src/services/roleService.ts` の `createRole` 関数に重複チェックを追加

```typescript
const exists = await roleRepository.existsById(organizationId, roleData.role);
if (exists) {
  throw {
    statusCode: 409,
    code: 'DUPLICATE_ROLE_CD',
    message: getMessage(lang, 'role.duplicateRoleCd'),
  };
}
```

### Phase 5: 組織管理 — リアルタイムチェック廃止・保存後インライン＋トーストに統一

- [ ] `frontend/src/components/Provider/OrganizationManagement.tsx` の `useEffect`（組織CD重複チェック）を削除
- [ ] `isDuplicateChecking`、`isDuplicate`、`organizationCdValue` の state を削除
- [ ] Input の `onChange` から `setOrganizationCdValue` 呼び出しを削除
- [ ] `handleModalOk` の `isDuplicateChecking || isDuplicate` ガードを削除
- [ ] 保存後 409 時（`DUPLICATE_ORGANIZATION_CD`）: 既存のインライン表示ロジックにトーストも追加

```typescript
if (code === 'DUPLICATE_ORGANIZATION_CD') {
  const dupMsg = t('organizationManagement.form.organizationCdDuplicate');
  form.setFields([{ name: 'organizationCd', errors: [dupMsg] }]);
  messageApi.error(dupMsg);   // ← トースト追加
  return;
}
```

### Phase 6: 動作確認

- [ ] 会社管理: 重複する会社名で登録 → フィールド下に「この会社名は既に使用されています」＋トーストが表示される
- [ ] 会社管理: 空欄で登録 → 「会社名を入力してください」が表示される
- [ ] 会社管理: 50文字超で登録 → 「50文字以内で入力してください」が表示される
- [ ] マスタ管理(Creator): 重複IDで登録 → `idDuplicate` メッセージが表示される
- [ ] マスタ管理(Vendor): 重複IDで登録 → `idDuplicate` メッセージが表示される
- [ ] マスタ管理(Instrument): 重複IDで登録 → `idDuplicate` メッセージが表示される
- [ ] マスタ管理(Attribute): 重複名で登録 → `idDuplicate` メッセージが表示される
- [ ] ユーザー管理: 重複メールアドレスで登録 → フィールド下＋トーストでメッセージが表示される
- [ ] ロール管理: 重複 role_cd で登録 → フィールド下＋トーストで「入力されたIDは既に存在しています」が表示される
- [ ] 組織管理: 重複する組織CDで登録 → 保存後にフィールド下＋トーストでメッセージが表示される（入力中はチェックしない）

---

## 変更ファイル

### 修正
1. `frontend/src/locales/ja.json` — `userManagement.messages.duplicateEmailError` を追加
2. `frontend/src/locales/en.json` — `userManagement.messages.duplicateEmailError` を追加
3. `frontend/src/components/Provider/CorporationManagement.tsx` — `handleModalOk` に `extractErrorCode()` で直接コード比較、インライン＋トースト処理を追加（`errorMapper.ts` 修正は不要と判断）
4. `frontend/src/components/DataManagement/MasterManagement.tsx` — `handleModalOk` の catch ブロックを修正
5. `frontend/src/components/SystemManagement/UserManagement.tsx` — `handleModalOk` に `USER_ALREADY_EXISTS` インライン＋トースト処理を追加
6. `frontend/src/components/Provider/OrganizationManagement.tsx` — リアルタイムチェック削除・保存後トースト追加
7. `backend/src/services/roleService.ts` — `createRole` に重複チェックを追加（HTTP 409 + `DUPLICATE_ROLE_CD`）

---

## 調査結果サマリ

### 各画面の現状と目標

| 画面 | 現状 | 目標 |
|------|------|------|
| 会社管理 | 保存後トーストのみ（メッセージ不正確） | 保存後 + インライン + トースト（正確なメッセージ） |
| マスタ管理 | 保存後トーストのみ（`E9999`フォールバック） | 保存後 + インライン + トースト（正確なメッセージ） |
| ユーザー管理 | 保存後トーストのみ（「保存に失敗しました」） | 保存後 + インライン + トースト（正確なメッセージ） |
| ロール管理 | バックエンドが500を返し処理不能 | バックエンド409対応 + インライン + トースト |
| 組織管理 | 入力中リアルタイム + インライン（トーストなし） | 保存後 + インライン + トースト |
| 部門管理 | 保存後 + インライン + トースト ✅ | 変更不要 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 組織管理のリアルタイムチェック廃止により、UX が若干低下する | 低 | 低 | 保存後に明確なインライン表示が出るため許容範囲 |
| `DUPLICATE_CORPORATION_NAME` マッピング追加により他箇所のメッセージが変わる | 低 | 低 | 変更前に検索確認済み |

---

## 承認記録

- **計画書提示日時**: 2026-05-13 10:31
- **更新日時**: 2026-05-15 11:43
- **承認日時**: 2026-05-15 11:43
- **承認者コメント**: スコープ拡張を承認

## 実施記録

### 実施日時
開始: 2026-05-15 11:43
完了: （作業完了時に記入）

### 計画からの変更点
- `errorMapper.ts` への `DUPLICATE_CORPORATION_NAME` 追加は不要と判断。`CorporationManagement.tsx` にて `extractErrorCode()` で直接コードを比較する方式（`DUPLICATE_CORPORATION_NAME || E7001`）で実装した。

### 最終的な成果物
- [x] `frontend/src/locales/ja.json` 修正（`userManagement.messages.duplicateEmailError` 追加）
- [x] `frontend/src/locales/en.json` 修正（`userManagement.messages.duplicateEmailError` 追加）
- [x] `CorporationManagement.tsx` 修正（`extractErrorCode()` で直接コード比較 + インライン + トースト追加）
- [x] `MasterManagement.tsx` 修正（plain Error の `error.message` 直接表示対応）
- [x] `UserManagement.tsx` 修正（`USER_ALREADY_EXISTS` 時インライン + トースト追加）
- [x] `OrganizationManagement.tsx` 修正（リアルタイムチェック廃止・保存後インライン + トースト統一）
- [x] `backend/src/services/roleService.ts` 修正（`createRole` に `existsById` 重複チェック追加、HTTP 409 + `DUPLICATE_ROLE_CD` を返却）

完了: 2026-05-15 13:41
