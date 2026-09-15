# タスク計画書: MasterManagement エラーメッセージ改修

## メタデータ
- **作成日時**: 2026-09-14 12:00
- **タスクID**: MasterManagement-ErrorMessage
- **優先度**: 高
- **推定工数**: 1時間

---

## タスク概要

`MasterManagement.tsx` の `handleModalOk` でマスタ登録・更新時に `fetch()` を直接使用しているため、
バックエンド（masterRoute）のバリデーションエラー詳細メッセージがフロントエンドに表示されず、
「追加に失敗しました。」という固定メッセージしか表示されない。

---

## 根本原因

### 原因 1: `handleModalOk` が `fetch()` を直接使用している

`fetch()` は `!response.ok` の場合でもレスポンスボディを自動解析しないため、
バックエンドが返す `{ error: { message: "..." } }` の詳細を手動でパースしない限り取得できない。

現在のコードは `response.ok === false` 時に固定メッセージの `Error` をスローしている：

```typescript
// ❌ 現在の実装（Instrument/Vendor/Creator/Attribute の POST/PUT 全箇所）
if (!response.ok) {
  if (response.status === 409) {
    throw new Error(t('masterManagement.messages.idDuplicate'));
  }
  throw new Error(t('masterManagement.messages.addFailed'));  // ← バリデーション詳細が消える
}
```

`createApiClient`（Axios）を経由すれば、エラー時は `AxiosError` として `response.data.error.message` が
`extractErrorMessage` で正しく取得できる。

### 原因 2: `masterApiService.ts` の `createMaster`/`updateMaster` が AxiosError を潰している

サービス層でも `catch` ブロック内で `throw new Error(...)` に変換しているため、
`extractErrorMessage` が AxiosError として認識できず、バックエンドメッセージを取得できない：

```typescript
// ❌ 現在の実装（masterApiService.ts）
} catch (error) {
  const axiosError = error as AxiosError<...>;
  throw new Error(`API Error: ... - ${axiosError.response?.data?.error?.message || ...}`);
  // ↑ new Error() でラップしているため AxiosError の情報が失われる
}
```

---

## 修正方針

### 修正 1: `MasterManagement.tsx` の `handleModalOk` を `masterApiService` 経由に変更

`fetch()` による直接呼び出しを廃止し、既存の `masterApi.createMaster` / `masterApi.updateMaster` を使用する。

対象箇所（POST/PUT の全マスタ種別）：
- Instrument: masterId='3' の POST/PUT
- Vendor: masterId='2' の POST/PUT
- Creator: masterId='1' の POST/PUT
- Attribute: masterId='4' の POST/PUT

### 修正 2: `masterApiService.ts` の `createMaster`/`updateMaster` が AxiosError をそのまま再スローするよう変更

`catch` ブロック内で `new Error()` にラップせず、`throw error` でそのまま再スローする。
これにより `MasterManagement.tsx` の catch ブロックで `extractErrorMessage` が `AxiosError` として
正しくバックエンドメッセージを取得できるようになる。

---

## 変更ファイル

1. `frontend/src/services/masterApiService.ts`
   - `createMaster` の catch ブロック: `throw new Error(...)` → `throw error`（AxiosError をそのまま再スロー）
   - `updateMaster` の catch ブロック: `throw new Error(...)` → `throw error`（AxiosError をそのまま再スロー）

2. `frontend/src/components/DataManagement/MasterManagement.tsx`
   - `handleModalOk` 内の `fetch()` 直接呼び出しを `masterApi.createMaster` / `masterApi.updateMaster` に置き換え
   - 各マスタ種別（Instrument/Vendor/Creator/Attribute）の POST/PUT 処理を置き換え
   - `apiUrl` / `sessionToken` の取得コードも不要になるため削除
   - `fetch` に依存していた import も整理

---

## 影響範囲

- `MasterManagement.tsx` の登録・更新処理のみ（削除、CSV等は無影響）
- `masterApiService.ts` の createMaster / updateMaster の呼び出し元すべて（既に MasterManagement 以外から呼ばれているか確認済み）

---

## リスク

| リスク | 対策 |
|--------|------|
| Creator マスタの vendorName/instrumentName JSON解析ロジックは維持が必要 | JSON解析部分はそのまま残し、最終的なデータオブジェクトを組み立てた後 `masterApi.createMaster` に渡す |
| Attribute マスタの `resolvedAttributeName` ロジックは維持が必要 | 同上 |
| `updateMaster` の ID 引数は URL エンコードが必要な場合あり（Attribute は name__value 形式） | `masterApiService.ts` 内で既に `encodeURIComponent` 対応済みの `updateMasterStatus` を参考にする。`updateMaster` も同様に対応する |

---

## テスト計画

- [ ] Instrument マスタ新規登録でバリデーションエラーが正しく表示される
- [ ] Vendor マスタ新規登録でバリデーションエラーが正しく表示される
- [ ] Creator マスタ新規登録でバリデーションエラーが正しく表示される
- [ ] Attribute マスタ新規登録でバリデーションエラーが正しく表示される
- [ ] 正常登録・更新・409（ID重複）は引き続き正しく動作する

## 承認記録
- **計画書提示日時**: 2026-09-14 12:00
