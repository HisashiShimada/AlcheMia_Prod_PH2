# タスク計画書: PetriNetEditorInner 組織ID取得方法修正

## メタデータ
- **作成日時**: 2026-03-04 14:49
- **タスクID**: fix-organization-id-retrieval
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`PetriNetEditorInner.tsx` で `localStorage.getItem('currentOrganizationId')` を使用しているが、このキーはアプリケーション全体のどこにも `setItem` されていない。そのため常に `null` が返り、エラーになっている。

正しくは `localStorage.getItem('userInfo')` から JSON.parse して `organizationId` フィールドを取得する必要がある。

## 目的と期待される成果
- [ ] 組織IDの取得エラーを修正する
- [ ] PetriNetEditorInner.tsx内の全5箇所を修正する

## 実装ステップ
- [ ] `PetriNetEditorInner.tsx` 内の5箇所を修正

## 変更ファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 組織ID取得方法修正（5箇所）

## 修正内容

### 誤った実装（5箇所）
```typescript
const currentOrgId = localStorage.getItem('currentOrganizationId');
```

### 正しい実装
```typescript
const userInfoStr = localStorage.getItem('userInfo');
const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
const currentOrgId = userInfo?.organizationId || null;
```

## 承認記録
- **承認日時**: 2026-03-04 14:49（ユーザー承認済み）
