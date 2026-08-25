# タスク計画書: チーム登録機能修正

## メタデータ
- **作成日時**: 2026-07-31 14:31
- **タスクID**: チーム登録機能修正
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

チーム登録機能に存在する以下の3つの問題点を修正する。

1. **代表者未メンバー登録**: 代表者（chief_user_id）が `organization_group_user` テーブルに自動登録されないため、メンバー一覧に表示されない
2. **メンバー0人での作成が可能**: メンバーを1人も選択せずにチームを作成できる（代表者自動登録によって問題1と同時に解消）
3. **コンポーネント重複**: `components/namespace/` に残存する `Team*.tsx` 3ファイルを削除し、`components/team/` に統一する

## 目的と期待される成果

- [x] チーム作成時に代表者が必ずメンバー一覧（organization_group_user）に登録される
- [x] メンバー0人のチームが作成できなくなる（代表者が最低1名として保証される）
- [x] `components/namespace/TeamAddDialog.tsx`, `TeamEditDialog.tsx`, `TeamManagementPanel.tsx` が削除される
- [x] `UncertaintyManagement.tsx` が `components/team/` のダイアログを参照するようになる

## 実装ステップ

### Phase 1: バックエンド修正

- [x] `organizationGroupService.ts` の `createOrganizationGroup` トランザクション内で、グループ本体INSERT直後に `chief_user_id` を `organization_group_user` へ自動INSERTする
- [x] `organizationGroupService.ts` の `setOrganizationGroupMembers` で、`userIds` に `chief_user_id` が含まれていない場合でも代表者をメンバーから除外しないよう防御ロジックを追加する（PUT /members 呼び出し時に代表者が消えることを防ぐ）

### Phase 2: フロントエンド修正（TeamAddDialog）

- [x] `frontend/src/components/team/TeamAddDialog.tsx` を修正
  - グループ作成成功後にメンバーAPIを呼ぶ際、代表者（ログインユーザーID）を `userIds` に必ず含める
  - 代表者は UI 上、固定表示（削除不可タグ）として表示する
  - 追加メンバーは引き続き任意で選択可能

### Phase 3: コンポーネント重複解消

- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` のimportを修正
  - `'../namespace/TeamAddDialog'` → `'../team/TeamAddDialog'`
  - `'../namespace/TeamEditDialog'` → `'../team/TeamEditDialog'`
- [x] 参照ゼロになったことを確認後、以下の3ファイルを削除（既に存在しないことを確認）
  - `frontend/src/components/namespace/TeamAddDialog.tsx`
  - `frontend/src/components/namespace/TeamEditDialog.tsx`
  - `frontend/src/components/namespace/TeamManagementPanel.tsx`

## 変更ファイル

### 修正ファイル
1. `backend/src/services/organizationGroupService.ts` - 代表者自動メンバー登録・防御ロジック追加
2. `frontend/src/components/team/TeamAddDialog.tsx` - 代表者メンバー固定表示・送信修正
3. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - import切り替え

### 削除ファイル
1. `frontend/src/components/namespace/TeamAddDialog.tsx`
2. `frontend/src/components/namespace/TeamEditDialog.tsx`
3. `frontend/src/components/namespace/TeamManagementPanel.tsx`

## 技術詳細

### バックエンド実装方針

`createOrganizationGroup` 内のトランザクション処理（`pgp.tx`）を以下のように修正：

```typescript
return pgp.tx(async (t) => {
  // 1. グループ本体 INSERT（既存処理）
  const created = await organizationGroupRepository.create(..., t);

  // 2. 代表者をメンバーに自動登録（新規追加）
  await organizationGroupRepository.insertMember(organizationId, data.organization_group_cd, data.chief_user_id, t);

  // 3. namespace URI 自動登録（既存処理）
  await ensureGroupNamespace(t, {...});

  return created;
});
```

`setOrganizationGroupMembers` の防御ロジック：
- 既存グループの `chief_user_id` を取得
- `userIds` に `chief_user_id` が未含有の場合、自動的に追加してから `setMembers` を呼ぶ

### フロントエンド実装方針

`TeamAddDialog.tsx` では現在ログインユーザー情報を持っていないため、`userId` を props で受け取るか、または `/api/v1/organization-groups/:groupCd/members` の PUT 結果が返ったあとで、グループ作成時に生成された `chief_user_id`（= ログインユーザーID）を members に含めて再送する方法を取る。

最もシンプルな実装：グループ作成API（POST）のレスポンスに `chief_user_id` が含まれているため、それを使って `members` 配列に追加してからPUTする。

## セキュリティ考慮事項
- バックエンドでの代表者自動登録はトランザクション内で実施するため原子性が保証される
- `setOrganizationGroupMembers` での防御ロジックにより、API直接呼び出しでも代表者が消えない

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存チームの代表者がメンバー未登録の状態が残る | 中 | 高 | 本タスクは新規作成フローの修正のみ。既存データはバックフィルスクリプトが別途必要（今回スコープ外） |
| `UncertaintyManagement` でのダイアログ破損 | 中 | 低 | `team/TeamAddDialog` は`namespace/`版と実装が統一されているため影響なし |
| ビルドエラー | 中 | 低 | 削除前に `search_files` で参照ゼロを確認してから削除 |

## テスト計画

- [ ] チーム作成→代表者がメンバー一覧に表示されることを確認
- [ ] メンバー未選択でチーム作成→代表者のみがメンバーとして登録されることを確認
- [ ] メンバーPUT（`/members`）呼び出し時、代表者を除外しても代表者がメンバーから消えないことを確認
- [ ] `UncertaintyManagement` 画面でのチーム作成/編集ダイアログが正常動作することを確認
- [ ] フロントエンドビルドが通ることを確認

## 承認記録
- **計画書提示日時**: 2026-07-31 14:31
- **承認日時**: 2026-07-31 14:33
- **承認者コメント**: 承認します。実装を進めてください

## 実施記録

### 実施日時
開始: 2026-07-31 14:33
完了: 2026-07-31 14:42

### 最終的な成果物

- [x] `backend/src/repositories/organizationGroupRepository.ts` - `insertMemberInTransaction()` メソッドを追加
- [x] `backend/src/services/organizationGroupService.ts` - `createOrganizationGroup` トランザクション内で代表者自動メンバー登録、`setOrganizationGroupMembers` に代表者保護の防御ロジック追加
- [x] `frontend/src/components/team/TeamAddDialog.tsx` - 代表者固定タグ表示・送信時に代表者を含める処理追加
- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - import を `team/` に切り替え
- [x] `frontend/src/components/namespace/TeamAddDialog.tsx` / `TeamEditDialog.tsx` / `TeamManagementPanel.tsx` - 既に存在しないことを確認（削除済み）

### 動作概要
- チーム作成時にバックエンドのトランザクション内で `chief_user_id` が `organization_group_user` に自動 INSERT される
- PUT /members 呼び出し時も `chief_user_id` が userIds に含まれていなければ自動追加される
- フロントエンドのチーム作成ダイアログで代表者（ログインユーザー）が削除不可の青いタグで固定表示される
- メンバー選択ドロップダウンから代表者は除外される
