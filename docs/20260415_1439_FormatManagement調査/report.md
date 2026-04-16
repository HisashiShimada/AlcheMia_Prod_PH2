# 調査レポート: FormatManagement フォルダ一覧取得不可 / パスにundefined混入

- **調査日時**: 2026-04-15 16:39
- **対象ファイル**: `frontend/src/components/project/FormatManagement.tsx`
- **関連ファイル**:
  - `backend/src/controllers/formatController.ts`
  - `backend/src/services/formatService.ts`
  - `backend/src/controllers/authHelpers.ts`

---

## 1. 問題の概要

デプロイ環境にて以下の2つの問題が発生。

| # | 症状 |
|---|------|
| 1 | フォーマット管理画面でフォルダ一覧が取得できない（0件） |
| 2 | フォルダ作成を実行するとS3パスに `undefined` または `null` が含まれる |

---

## 2. 根本原因

### 2-1. 問題の連鎖

```
organization_user.department_cd = NULL（またはdepartmentテーブルに未登録）
    ↓ ログイン時
authHelpers.ts L126:
  req.session.departmentCd = user.department_cd;  →  null がセットされる
    ↓ フォーマット管理画面アクセス時
formatController.ts L27:
  const departmentCd = req.session!.departmentCd!;  →  null のまま（! は型チェックのみ）
    ↓
formatService.ts:
  const basePath = `formats/${departmentCd}`;  →  "formats/null" または "formats/undefined"
    ↓
S3 (Swift) から "formats/null/..." を検索 → ファイル0件
フォルダ作成も "formats/null/folderName" に作成される
```

### 2-2. コード上の問題箇所

#### `formatController.ts` L27, L80 (全関数共通)
```typescript
// ❌ 問題: Non-null assertion (!) は実行時に null/undefined を防がない
const departmentCd = req.session!.departmentCd!;
```

TypeScriptの `!` (Non-null assertion operator) はコンパイル時の型チェックを通過させるだけです。  
実行時に `departmentCd` が `null` / `undefined` であっても、そのまま後続処理に渡ります。

#### `authHelpers.ts` L126
```typescript
// organization_user.department_cd が NULL の場合、セッションに null がセットされる
req.session.departmentCd = user.department_cd;
```

---

## 3. 起こりうるケース一覧

| ケース | 発生条件 | 症状 |
|--------|----------|------|
| **① `department_cd` が NULL** | `organization_user` テーブルのユーザーに `department_cd` が未設定 | S3パスが `formats/null/...` になる |
| **② `department_cd` が空文字 `''`** | 空文字列で登録されている | S3パスが `formats//...` になり0件 |
| **③ `department` テーブルに対応レコードなし** | `department_cd` の値はあるが `department` テーブルに未登録 → S3上にフォルダが未作成 | S3パスは正しいがフォルダが存在せず0件（**今回発覚したケース**） |
| **④ セッション切れ** | セッションストアからセッションが削除された後の再アクセス | `req.session.departmentCd` が `undefined` → S3パスが `formats/undefined/...` |

---

## 4. 今回の環境で確認されたケース

**ケース③**: ログインユーザーの `department_cd` に値はあるが、  
その組織の `department` テーブルに対応するレコードが登録されておらず、  
S3上に `formats/{departmentCd}/` フォルダが存在しない状態。

---

## 5. 修正方針

### 即時対処（データ修正）

1. 該当ユーザーの組織に `department` テーブルへレコードを登録する
2. S3（Swift）上に以下のフォルダを作成する

```
formats/{departmentCd}/condition/
formats/{departmentCd}/material/
formats/{departmentCd}/result/
```

`departmentService.ts` の部署作成処理が自動でフォルダ作成するので、管理画面から部署を登録することで対応可能。

### コード修正（恒久対応）

#### `formatController.ts` 全関数に `departmentCd` のガード処理を追加

```typescript
// ✅ 修正後
const departmentCd = req.session?.departmentCd;
if (!departmentCd) {
  res.status(401).json({
    success: false,
    error: {
      code: 'E5014',
      message: 'セッションが期限切れです。再ログインしてください。',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown',
    },
  });
  return;
}
```

対象関数：
- `getFormats`
- `getFormatFiles`
- `createFormatFolder`
- `createFormatSubfolder`
- `createFormatFile`
- `updateFormatFileContent`

---

## 6. 補足: `authHelpers.ts` のセッション保存ログ確認方法

バックエンドログで以下を確認することで `departmentCd` がどの値でセットされたか確認できる。

```bash
docker logs mmdpf-backend-1 2>&1 | grep "Session saved successfully"
# 出力例（問題あり）:
# Session saved successfully with departmentCd: null corporationId: null
```
