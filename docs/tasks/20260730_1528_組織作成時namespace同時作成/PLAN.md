# タスク計画書: 組織作成時にnamespaceテーブルのレコードを同時作成する

## メタデータ
- **作成日時**: 2026-07-30 15:28
- **タスクID**: 組織作成時namespace同時作成
- **優先度**: 中
- **推定工数**: 2時間
- **ステータス**: ✅ 実装完了（2026-07-30）

---

## 1. タスク概要

`frontend/src/components/Provider/OrganizationManagement.tsx` から組織を新規作成する際、  
`organization` テーブルへのINSERTと同時に `namespace` テーブルへ組織の名前空間URIレコードを1件作成する。

---

## 2. 目的と期待される成果

### 目的
- 組織作成時に名前空間URIを自動的に初期設定する
- 手動での名前空間登録作業を省略する
- 組織と名前空間の整合性を保証する

### 期待される成果
- [x] 組織新規作成と同時に `namespace` テーブルへレコードが1件INSERTされる
- [x] namespace作成失敗時は組織作成もロールバックされる（トランザクション一体化）
- [x] フロントエンド側の変更は不要（バックエンドのトランザクション内で自動作成）

---

## 3. 実装内容

### 変更ファイル

#### 1. `backend/src/repositories/namespaceTermRepository.ts`

**変更内容**: `createNamespaceUri()` と `findUrisByOrganization()` に、pg-promise トランザクション参加用の第2引数 `t?: ITask<unknown>` を追加。

```typescript
// ITask のインポートを追加
import { ITask } from 'pg-promise';

// createNamespaceUri: t を第2引数に追加（オプショナル）
export async function createNamespaceUri(
  data: { organizationId: string; uri: string; userId: string },
  t?: ITask<unknown>
): Promise<string> {
  const conn = t ?? getPgp();
  // ... conn.one / conn.none を使用 ...
}

// findUrisByOrganization: t を第2引数に追加（オプショナル）
export async function findUrisByOrganization(
  organizationId: string,
  t?: ITask<unknown>
): Promise<string[]> {
  const conn = t ?? getPgp();
  // ... conn.any を使用 ...
}
```

- 引数はオプショナルなため、`userService.ts` など既存の呼び出し元は無変更で動作する
- `codeMasterRepository.insertInitialData()` と同じパターンを採用

#### 2. `backend/src/services/organizationService.ts`

**変更内容1**: `pgp.tx()` の内側（step 8 として追加）で namespace URI を登録するコードを追加。

```typescript
// 8. namespace テーブルへ組織URIを自動登録
// URI形式: https://{organizationCd}.Alchemia.co.jp
// 失敗時はトランザクション全体をロールバックする（組織作成と原子性を保証）
logger.info(`[organizationService] 組織URI自動登録を開始: organizationId=${data.organizationId}`);
const orgUri = generateNamespaceUri(data.organizationCd);
const existingUris = await namespaceTermRepository.findUrisByOrganization(data.organizationId, t);
const uniqueUri = existingUris.includes(orgUri) ? `${orgUri}1` : orgUri;
await namespaceTermRepository.createNamespaceUri(
  { organizationId: data.organizationId, uri: uniqueUri, userId },
  t
);
logger.info(`[organizationService] 組織URI自動登録完了: organizationId=${data.organizationId}, uri=${uniqueUri}`);
```

**変更内容2**: `pgp.tx()` の外側にあった旧来の try-catch ブロック（namespace URI 登録を失敗しても組織作成を成功扱いにしていた処理）を削除。

```typescript
// ↓ 削除したコード（tx外・失敗を握りつぶす）
try {
  const orgUri = generateNamespaceUri(data.organizationCd);
  const existingUris = await namespaceTermRepository.findUrisByOrganization(data.organizationId);
  ...
  await namespaceTermRepository.createNamespaceUri(namespaceUriData);
} catch (nsError) {
  logger.warn(...);  // 失敗しても組織作成は成功扱い ← 削除
}
```

---

## 4. 設計上の注意点

### `prefix` テーブルへの登録は行わない

`createNamespaceUri()` はURIのみを `namespace` テーブルに登録する。  
`prefix` テーブルへの登録は実験管理者が Prefix 管理画面から手動で行う（変更なし）。

### 失敗時の扱い

**トランザクション一体化（必須処理として扱う）**

`namespace` テーブルへのINSERTに失敗した場合、`organization` テーブルへのINSERTもロールバックされる。  
例外をキャッチせず、エラーをそのまま `pgp.tx()` に伝播させることでロールバックを実現する。

### 既存コードへの影響

- `userService.ts` 内で `findUrisByOrganization()` と `createNamespaceUri()` を呼び出している箇所は、第2引数がオプショナルなため無変更で動作する。

---

## 5. 承認記録

- **計画書提示日時**: 2026-07-30 15:28
- **承認日時**: 2026-07-30 15:45
- **承認者コメント**: 「以下の部分が移ってないが登録する部分が作成されているならそれを組織作成のトランジションで行うようにする変更だけ入れたい」

---

## 6. 実施記録

### 実施日時
開始: 2026-07-30 15:45  
完了: 2026-07-30 15:47

### 最終的な成果物
- [x] `backend/src/repositories/namespaceTermRepository.ts` - ITask 引数追加
- [x] `backend/src/services/organizationService.ts` - namespace 登録を tx 内（step 8）に移動、旧 try-catch ブロック削除
- [x] TypeScript コンパイルエラーなし確認済み
