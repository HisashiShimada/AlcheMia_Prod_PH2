# タスク計画書: 名前空間管理 - システム管理者権限対応

## メタデータ
- **作成日時**: 2026-09-03 16:00
- **更新日時**: 2026-09-03 19:30
- **タスクID**: namespace-sysadmin-permission
- **優先度**: 高
- **推定工数**: 3〜4時間
- **対象ブランチ**: `feature/phase2_mock_fujita`

---

## 1. タスク概要

実験管理者メニュー > 名前空間管理画面において、**システム管理者（機能CD `'020000'` 保有ユーザー）でログインした場合の挙動を対応**する。

### 要件（3つ）

| # | 要件 | 状況 |
|---|---|---|
| ① | 各グループノード選択時 → prefix管理・用語管理タブを **編集可能モード** で開く | ✅ 対応済み |
| ② | 組織ノード（companyノード）選択時 → prefix管理・用語管理タブを **編集可能モード** で開く | ✅ 対応済み |
| ③ | 組織内の全ユーザーの個人スコープ → prefix管理・用語管理タブを **閲覧のみ** で開く | ✅ 対応済み |

### 前提として解決が必要な問題

| # | 問題 | 原因 | 状況 |
|---|---|---|---|
| A | company 配下にグループが1件も表示されない | `GET /organization-groups` が `chiefUserId` フィルタで空配列を返す | ✅ 対応済み |
| B | Personal ノードにログインユーザー自身しか表示されない | Personal ノード構築がログインユーザー1人のみ | **今回対応** |
| C | メニュー切り替え後に `isAdminUser` が常に `false` になる | `/auth/refresh` レスポンスに `permissions` が含まれていなかった | ✅ 対応済み |

---

## 2. 問題分析

### 問題Aの根本原因（対応済み）

`GET /organization-groups` が `chiefUserId` / `memberOf` フィルタで system_admin に対して空配列を返していた。
→ `all=true` パラメータを追加し、バックエンドで permissions による system_admin チェックを実施して全件返すよう対応。

### 問題Cの根本原因（対応済み）

`/auth/refresh` API のレスポンスに `permissions` が含まれておらず、メニュー切り替え後の `localStorage['userInfo']` に `permissions` が存在しないため `isAdminUser` 判定が常に `false` になっていた。
→ バックエンド・フロントエンドの `authService.ts` と `types/api.ts` に `permissions` 連携を追加。

### system_admin の判定方法

`roleCd` はユーザーが変更可能なため判定に使用しない。
`permissions` 配列の `functionId === '020000'`（システム管理者メニューの固定機能CD）で判定する。

### 問題Bの根本原因（今回対応）

`UncertaintyManagement.tsx` と `NamespaceMain.tsx` の Personal ノード構築がログインユーザー1人のみを表示する実装になっている。

全ユーザー取得APIは `GET /organization-groups/users` → `getOrgUsersForGroups()`（`organizationGroupApiService.ts`）として既に存在するため、**バックエンド変更不要**。

---

## 3. 影響範囲（累積）

### 対応済みの変更ファイル（8ファイル）

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `backend/src/middleware/organizationGroupValidation.ts` | `all` クエリパラメータのバリデーション追加 |
| 2 | `backend/src/controllers/organizationGroupController.ts` | `all=true` + system_admin 権限チェック分岐追加 |
| 3 | `backend/src/services/authService.ts` | `/auth/refresh` レスポンスに `permissions` 追加 |
| 4 | `frontend/src/services/namespaceApiService.ts` | `getOrganizationGroups` オプションに `all?: boolean` 追加 |
| 5 | `frontend/src/services/authService.ts` | `refreshToken()` 型定義と返却値に `permissions` 追加 |
| 6 | `frontend/src/types/api.ts` | `VerifyPinResponseData.user` に `permissions?: Permission[]` 追加 |
| 7 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `isSysAdmin` 判定・`isViewOnlyForCompany` 修正、useEffect に system_admin 分岐追加 |
| 8 | `frontend/src/components/namespace/NamespaceMain.tsx` | `deriveUserNsRoleFromStorage`・`effectiveViewOnly` 修正、useEffect に sys_admin 分岐追加 |

### 今回追加する変更ファイル（2ファイル）

| # | ファイル | 変更内容 |
|---|---|---|
| 9 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | system_admin 分岐に `getOrgUsersForGroups()` 追加・Personal ノードを全ユーザーで構築 |
| 10 | `frontend/src/components/namespace/NamespaceMain.tsx` | sys_admin 分岐に `getOrgUsersForGroups()` 追加・`setPersonalChildren` に全ユーザーをセット |

### 他ロールへの影響

**影響なし**：system_admin 分岐（`isSysAdmin === true`）の内部のみ変更のため、他ロールは既存ロジックを通る。

---

## 4. 実装ステップ（累積）

### 対応済み
- [x] Step 0: PLAN.md 作成・更新
- [x] Step 1: `UncertaintyManagement.tsx` / `NamespaceMain.tsx` 編集可否フラグ修正
- [x] Step 2: `organizationGroupValidation.ts` に `all` パラメータバリデーション追加
- [x] Step 3: `organizationGroupController.ts` に `all=true` + system_admin チェック分岐追加
- [x] Step 4: `namespaceApiService.ts` に `all` オプション追加
- [x] Step 5: `UncertaintyManagement.tsx` useEffect に system_admin 分岐追加
- [x] Step 6: `NamespaceMain.tsx` useEffect に sys_admin 分岐追加
- [x] Step 7: TypeScript ビルドエラーなし確認
- [x] Step 8: `/auth/refresh` レスポンスに `permissions` 追加（バックエンド・フロントエンド）
- [x] Step 9: `VerifyPinResponseData.user` に `permissions` 追加
- [x] Step 10: system_admin 判定を `permissions.functionId === '020000'` に修正（3箇所）

### 今回実施
- [ ] Step 11: `UncertaintyManagement.tsx` の system_admin 分岐に `getOrgUsersForGroups()` 追加・Personal ノード全ユーザー構築
- [ ] Step 12: `NamespaceMain.tsx` の sys_admin 分岐に `getOrgUsersForGroups()` 追加・`setPersonalChildren` 全ユーザーセット
- [ ] Step 13: TypeScript ビルドエラーがないことを確認

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `getOrgUsersForGroups()` が失敗した場合、Personal が空になる | 低 | 低 | `.catch(() => {})` で空のまま継続（既存パターンと同じ） |
| 他ロールへの誤影響 | 高 | 低 | `isSysAdmin === true` 分岐内のみ変更のため影響なし |

---

## 6. テスト計画（更新版）

| # | 操作 | ロール | 期待結果 | 状況 |
|---|---|---|---|---|
| 1 | 名前空間管理画面を開く | `system_admin` | company 配下に全グループが階層表示される | ✅ 確認済み |
| 2 | グループノードを選択 | `system_admin` | prefix管理・用語管理タブが編集可能 | ✅ 確認済み |
| 3 | companyノードを選択 | `system_admin` | prefix管理・用語管理タブが編集可能 | ✅ 確認済み |
| 4 | `personal-{userId}` ノードを選択 | `system_admin` | prefix管理・用語管理タブが閲覧専用 | ✅ 確認済み |
| 5 | Personal ノードを展開 | `system_admin` | **組織内の全ユーザーが表示される** | 今回確認 |
| 6 | 全ユーザーの個人スコープを選択 | `system_admin` | prefix管理・用語管理タブが閲覧専用 | 今回確認 |
| 7 | 名前空間管理画面を開く | `experiment_admin` | 従来通り（自分が代表/所属するグループのみ表示） | 今回確認 |
| 8 | Personal ノードを展開 | `experiment_admin` | 自分のノードのみ表示（既存と同じ） | 今回確認 |

---

## 7. 承認記録

- **計画書提示日時**: 2026-09-03 16:00
- **承認日時**: 2026-09-03
- **承認者コメント**: バックエンド側でもロール確認を追加してセキュリティを強化すること

---

## 8. 実施記録

### 実施日時
開始: 2026-09-03
完了: （完了時に記入）

### 計画からの変更点
- マージ後の最新ソース調査により問題Aを新たに特定。問題Aの解消を今回スコープに追加。
- 問題C（`/auth/refresh` に `permissions` 未連携）を新たに発見・修正。
- system_admin 判定を `roleCd === 'system_admin'`（不正確）→ `permissions.functionId === '020000'`（正確）に変更。
- 問題B（Personal ノード全ユーザー表示）を今回スコープに追加。
- Step 16: 組織最上位ノード選択時の共有ボタン非表示制御を追加。
- Step 17: 共有ダイアログの表示内容を「選択ノードの上位階層のみ」に限定（既存は全ノード表示）。

### 最終的な成果物
- [x] Step 1〜10: 全グループ表示・編集可否・system_admin 判定修正（完了・動作確認済み）
- [x] Step 11: `UncertaintyManagement.tsx` の system_admin 分岐に `getOrgUsersForGroups()` 追加・Personal ノード全ユーザー構築
- [x] Step 12: `NamespaceMain.tsx` の sys_admin 分岐に `getOrgUsersForGroups()` 追加・`setPersonalChildren` 全ユーザーセット
- [x] Step 13: TypeScript ビルドエラーなし確認（今回変更ファイルに関するエラー 0件）
- [x] Step 14: `NamespaceMain.tsx` の4箇所に `|| nsKey.startsWith('personal-')` 判定追加（system_admin による他ユーザー個人スコープの用語/Prefix が正しく取得されない不具合修正）
- [x] Step 15: `UncertaintyManagement.tsx` の `filteredOrgGroupCds` で `personal-` ノード選択時に `[]` を返すよう修正（他スコープの Prefix 混入バグ修正）
- [x] Step 16: `UncertaintyManagement.tsx` の `showShareButton` に `selectedNsKey !== 'company'` を設定（組織最上位ノード選択時に共有ボタンを非表示）
- [x] Step 17: `UncertaintyManagement.tsx` の `shareScopeNodes` useMemo を祖先ノードのみ返す実装に変更（共有ダイアログに上位階層のみ表示）
- [x] Step 18: `NamespaceMain.tsx` の `shareScopeNodes` useMemo を同様に祖先ノードのみ返す実装に変更（用語管理タブの共有ダイアログに上位階層のみ表示）
- [x] Step 19: グループ代表者ユーザーが左ペインの Personal ノードに代表グループのメンバーを表示（`UncertaintyManagement.tsx`・`NamespaceMain.tsx` の非 system_admin 分岐に `getGroupMembers()` 追加）
- [x] Step 20: ログインユーザー以外の個人スコープ選択時に閲覧専用モードを適用（`UncertaintyManagement.tsx` の `isViewOnlyForCompany`・`NamespaceMain.tsx` の `effectiveViewOnly` を修正）
- [x] Step 21: 個人スコープ選択時の共有ダイアログに、そのユーザーの所属グループ＋祖先を表示（バックエンド `memberOfUser` パラメータ追加・フロントエンド `targetUserGroups` state 追加・`shareScopeNodes` 修正）
