# タスク計画書: 名前空間URI組織階層グループCD使用修正

## メタデータ
- **作成日時**: 2026-08-24 08:36
- **タスクID**: 名前空間URI組織階層グループCD使用修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

XML宣言部に注入される名前空間URIのドメイン部が、常に `organization.organization_cd`（例: `ORG001-AIML`）固定になっている問題を修正する。

**現状（誤）:**
```
xmlns:test="https://ORG001-AIML.Alchemia.co.jp/{メールアドレスのローカルパート}"
```

**期待値（正）:**
```
xmlns:test="https://{そのプロジェクトに紐づくチームの組織階層グループCD}.Alchemia.co.jp/{メールアドレスのローカルパート}"
```

## 目的と期待される成果

### 目的
名前空間URIのドメイン部が、プロジェクトに紐づくチームの組織階層グループのCDを反映するようにする。

### 期待される成果
- [ ] グループスコープ: `ancestors[0]`（ルートグループCD）がドメイン部に使用され、`ancestors.slice(1)` がパス部に使用される
- [ ] 個人スコープ: ユーザーが最初に所属したグループのCD（`findUserOrgGroupCd()` の結果）がドメイン部に使用される
- [ ] グループ未所属の場合は `organization_cd` にフォールバックする

## 変更内容詳細

### URI形式（変更後）

| スコープ | 変更前 | 変更後 |
|---------|--------|--------|
| グループ（ROOT_GRP → TEAM_A） | `https://ORG001.Alchemia.co.jp/ROOT_GRP/TEAM_A` | `https://ROOT_GRP.Alchemia.co.jp/TEAM_A` |
| グループ（ルートのみ） | `https://ORG001.Alchemia.co.jp/ROOT_GRP` | `https://ROOT_GRP.Alchemia.co.jp` |
| 個人（所属グループ = TEAM_A） | `https://ORG001.Alchemia.co.jp/{メールアドレスのローカルパート}` | `https://TEAM_A.Alchemia.co.jp/{メールアドレスのローカルパート}` |
| 個人（グループ未所属） | `https://ORG001.Alchemia.co.jp/{メールアドレスのローカルパート}` | `https://ORG001.Alchemia.co.jp/{メールアドレスのローカルパート}`（フォールバック） |

## 実装ステップ

### Phase 1: バックエンド修正
- [ ] `backend/src/services/namespaceService.ts` の `getSuggestedUri()` を修正
  - グループスコープ: `ancestors[0]` をドメイン部、`ancestors.slice(1)` をパス部に使用
  - 個人スコープ: `findUserOrgGroupCd()` の結果をドメイン部に使用、null の場合は `organizationCd` にフォールバック

### Phase 2: フロントエンド修正
- [ ] `frontend/src/services/namespaceApiService.ts` の `getOrganizationNamespaces()` を修正
  - グループスコープ取得時に DB 保存の古いURIをそのまま使わず、`fetchSuggestedUri(scopeKey)` で正規URIを取得して上書きする

## 変更ファイル

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/services/namespaceService.ts` | `getSuggestedUri()`: ドメイン部を `organization_cd` → `organization_group_cd` に変更 |
| `frontend/src/services/namespaceApiService.ts` | `getOrganizationNamespaces()`: グループスコープのURI正規化処理を追加 |

## 影響範囲

- **名前空間URI自動生成機能（Prefix追加時の候補URI）**: 変更あり
- **XML宣言部への名前空間URI注入**: 変更あり（`getSuggestedUri()` の結果が変わるため）
- **DB保存済みの既存URI**: 変更なし（DB 保存値は変更しない。新規生成・注入時のみ影響）

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| ユーザーがグループに未所属の場合 | 低 | `organization_cd` にフォールバック |
| `ancestors` が空配列の場合 | 低 | フォールバック処理を追加 |

## 承認記録
- **計画書提示日時**: 2026-08-24 08:36
- **承認日時**: 
- **承認者コメント**: 
