# タスク計画書：ユーザ管理 部署NULL時バリデーションエラー修正

## 概要

ユーザ管理画面の編集モーダルで、**部署コードが NULL（未設定）のユーザーを保存しようとすると「入力内容に誤りがあります（E1003）」が表示されてしまう**バグを修正する。

## 原因

### 根本原因

バックエンドの PUT `/systemManagement/user/:userId` ルートで `departmentCd` のバリデーションに `nullable: true` が指定されていない。

```typescript
// backend/src/routes/userRoutes.ts 192-195行目 ← 問題箇所
body('departmentCd')
  .optional()            // ← undefined のみスキップ。null は isString() に渡って失敗する
  .isString()
```

express-validator の `.optional()` はデフォルトで `undefined` のみをスキップし、`null` は通過させない。  
フロントの `handleEdit` で `departmentCd: user.departmentCd`（DB の NULL → JS の `null`）がフォームにセットされ、そのまま保存するとバックエンドに `null` が送られ E1003 が発生する。

### 同様の問題が潜在する箇所

POST ルート（新規作成）の `departmentCd` も同様に `nullable: true` がなく、同条件で問題が発生しうる。

## 修正方針

### 修正1：バックエンド（根本対応）

`PUT /user/:userId` と `POST /user` の `departmentCd` バリデーションに `{ nullable: true }` を追加して `null` を許容する。

```typescript
// 修正後
body('departmentCd')
  .optional({ nullable: true })   // null も許容する
  .isString()
  .withMessage('departmentCd must be a string'),
```

### 修正2：フロントエンド（防御的対応）

`handleEdit` で `departmentCd` に `null` が入っていた場合に `undefined` に変換してから `setFieldsValue` に渡す。  
また `handleModalOk` でリクエストデータを組む際も `null` を `undefined` に変換し、バックエンドに `null` を送らないようにする。

```typescript
// handleEdit 修正後
departmentCd: user.departmentCd ?? undefined,

// handleModalOk 修正後
departmentCd: values.departmentCd ?? undefined,
```

## 修正ファイル一覧

| ファイル | 修正内容 |
|---------|---------|
| `backend/src/routes/userRoutes.ts` | PUT・POST の `departmentCd` に `{ nullable: true }` 追加 |
| `frontend/src/components/SystemManagement/UserManagement.tsx` | `handleEdit` と `handleModalOk` で `departmentCd` の `null → undefined` 変換を追加 |

## 影響範囲

- ユーザ管理画面の「編集」モーダルおよび「追加」モーダルの保存処理
- 既存の動作（部署あり・部署変更・アクティブ変更・ロール変更）には影響なし

## テスト方針

- 部署 NULL のユーザーを編集してロールのみ変更 → 正常に保存できること
- 部署 NULL のユーザーを編集して部署を設定 → 正常に保存できること
- 部署ありのユーザーを編集して部署を削除（未選択に変更） → 正常に保存できること
- 部署ありのユーザーを通常編集 → 従来通り動作すること
