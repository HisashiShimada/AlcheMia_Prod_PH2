# タスク計画書: ロール管理画面リロード時メッセージ未表示バグ修正

## メタデータ
- **作成日時**: 2026-05-14 15:20
- **タスクID**: role-management-reload-message-fix
- **優先度**: 低
- **推定工数**: 0.25時間

## タスク概要

ロール管理画面でリロードボタンをクリックした際に、他の管理画面（部署管理・ユーザー管理等）では表示される「データをリロードしました」というサクセスメッセージが表示されない。

## 原因

2つの問題が重なっている。

### 問題①: handleReload に message.success() が抜けている

`RoleManagement.tsx` の `handleReload` 関数に `message.success()` の呼び出しが存在しない。

```typescript
// 修正前（メッセージなし）
const handleReload = () => {
  if (!selectedMasterInfo) return;
  fetchRoleMasters();
};
```

### 問題②: 翻訳キー roleManagement.messages.reloadSuccess が未定義

`ja.json` / `en.json` の `roleManagement.messages` セクションに `reloadSuccess` キーが存在しない。
他の管理画面（corporationManagement、departmentManagement等）には定義済み。

## 目的と期待される成果

- [x] ロール管理画面でリロードボタン押下時にサクセスメッセージが表示される
- [x] 他の管理画面と一貫した UX になる

## 実装ステップ

- [x] タスク計画書作成
- [x] RoleManagement.tsx の handleReload に message.success() を追加
- [x] ja.json に roleManagement.messages.reloadSuccess を追加
- [x] en.json に roleManagement.messages.reloadSuccess を追加

## 変更ファイル

1. `frontend/src/components/SystemManagement/RoleManagement.tsx` - handleReload にメッセージ追加
2. `frontend/src/locales/ja.json` - reloadSuccess キー追加
3. `frontend/src/locales/en.json` - reloadSuccess キー追加

## リスク

| リスク | 対策 |
|--------|------|
| 翻訳キーの追加漏れ | ja.json / en.json の両方を修正 |

## 承認記録
- **承認日時**: 2026-05-14 15:22
- **承認者コメント**: 修正実装を指示
