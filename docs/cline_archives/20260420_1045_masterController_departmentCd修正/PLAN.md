# タスク計画書: masterController departmentCd取得元修正

## メタデータ
- **作成日時**: 2026-04-20 10:45
- **タスクID**: masterController_departmentCd修正
- **優先度**: 中
- **推定工数**: 0.1時間

## タスク概要

`backend/src/controllers/masterController.ts` の1096行目において、`departmentCd` を `req.session` から取得しているが、`req.user`（JWTペイロード）に保持するよう修正されたため、取得元を `req.user` に統一する。

## 目的と期待される成果

- [ ] `req.session?.departmentCd` を `req.user?.departmentCd` に変更し、取得元を統一する

## 実装ステップ

- [ ] `backend/src/controllers/masterController.ts` 1096行目を修正

## 変更ファイル

1. `backend/src/controllers/masterController.ts` - departmentCd取得元を `req.session` → `req.user` に変更

## 技術的詳細

### 変更前
```typescript
const departmentCd = req.session?.departmentCd;
```

### 変更後
```typescript
const departmentCd = req.user?.departmentCd;
```

### 根拠
- `JwtPayload`（`backend/src/types/auth.ts`）には `departmentCd?: string` が定義済み
- `req.user` は `JwtPayload` 型であり、認証ミドルウェアによって設定される

## 承認記録
- **計画書提示日時**: 2026-04-20 10:45
- **承認日時**: 2026-04-20 10:46

## 実施記録

### 実施日時
開始: 2026-04-20 10:46
完了: 2026-04-20 10:46

### 最終的な成果物
- [x] `masterController.ts` 修正完了
