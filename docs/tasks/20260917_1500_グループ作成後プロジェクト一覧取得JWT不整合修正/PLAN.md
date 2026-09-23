# タスク計画書: グループ作成後プロジェクト一覧取得JWT不整合修正

## メタデータ

- **作成日時**: 2026-09-17 15:30
- **タスクID**: 20260917_1500
- **優先度**: 高
- **推定工数**: 4〜5時間

---

## 1. タスク概要

グループ作成後にプロジェクトを新規作成すると、直後のプロジェクト一覧取得で
新規プロジェクトが表示されない（閲覧不可）かつ **編集権限（is_editable）も付与されない** バグを修正する。

### 再現手順

1. ログイン → 所属グループ `["GROUP-A"]` の JWT が発行される
2. グループ `GROUP-B` を作成 → organization_group_user に (userId, GROUP-B) が登録
3. プロジェクト作成モーダルで `GROUP-B` を選択して新規プロジェクト作成
4. プロジェクト一覧取得 → **新規プロジェクトが表示されない・編集不可** ❌

---

## 2. 根本原因

### 2-1. JWT への organizationGroupCds 格納タイミング

ログイン・PIN認証・トークンリフレッシュ時に DB から所属グループCDを取得して JWT に含める。
`POST /auth/refresh` 時はDBから最新値を取得し直すため最新化される。
`page.tsx` の `handleMenuChange` では**メニュー切替前にリフレッシュ**しているため
メニュー切替時は最新化される。

しかし**グループ作成直後（同一メニュー内）ではリフレッシュが走らず JWT が古いまま**。

### 2-2. プロジェクト一覧・編集権限の判定フロー

```
projectController.list
  organizationGroupCdsList = req.user!.organizationGroupCds  ← JWTから（古い可能性）
  ↓
projectService.list({ organizationGroupCds: ["GROUP-A"], userId })
  ↓
  visibleGroupCds  = GROUP-A とその子孫（GROUP-B は含まれない）
  editableGroupCds = GROUP-A の is_active=true なもの（GROUP-B は含まれない）
  ↓
SQL: GROUP-B のプロジェクトは visibleGroupCds になく閲覧不可・is_editable=false ❌
```

同様に `workerProjectService.listWorkerAccessible` も JWT 由来の `organizationGroupCds` を使用。

---

## 3. 採用修正方針：A（JWT更新）＋B（DB直接参照）の二重対策

| 方針 | 内容 | 採否 |
|------|------|------|
| **A（採用）** | グループ作成 API が新 JWT と organizationGroupCds をレスポンスに含める → FE が localStorage 更新 | ✅ |
| **B（採用）** | projectService / workerProjectService 内で JWT に頼らず DB から最新所属グループを取得 | ✅ |
| C（不採用） | FE でグループ作成後に refreshToken() を呼ぶ → 実装漏れ・他ユーザー操作に対応不可 | ❌ |

**方針AとBを組み合わせる理由**:
- A だけでは「他ユーザーによるグループメンバー追加」（自分が追加された場合）に対応不可
- B だけでは JWT の `organizationGroupCds` が古いまま残り他の用途での誤参照が残る
- 両方実施することで二重に堅牢化する

---

## 4. 実装ステップ

### Step 1: バックエンド — organizationGroupController でグループ作成後に JWT 再発行

**ファイル**: `backend/src/controllers/organizationGroupController.ts`

- [ ] `JwtService` / `RolePermissionRepository` を import
- [ ] グループ作成成功後、`organizationGroupRepository.findByUser(organizationId, userId)` で最新グループCDを取得
- [ ] `jwtService.generateAccessToken(payload)` でアクセストークンのみ再発行（リフレッシュトークンは再発行不要）
- [ ] レスポンスに `accessToken: string` と `organizationGroupCds: string[]` を追加

### Step 2: フロントエンド — グループ作成後に accessToken と userInfo を更新

**ファイル**: `frontend/src/services/organizationGroupApiService.ts`

- [ ] `createOrganizationGroup` 関数でレスポンスに `accessToken` と `organizationGroupCds` が含まれた場合:
  - `setTokenPair(accessToken)`（`authUtils.ts` の既存関数を使用）でアクセストークンを更新
  - `localStorage.getItem('userInfo')` をパースし `organizationGroupCds` フィールドを最新値で上書き
  - `localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))` で保存

### Step 3: バックエンド — projectService.list で DB から最新所属グループを取得

**ファイル**: `backend/src/services/projectService.ts`

- [ ] `!isSystemAdmin` の場合のみ `organizationGroupRepository.findByUser(organizationId, userId)` を呼び出す
- [ ] 取得した最新グループCDを `organizationGroupCds` として以降の visibleGroupCds / editableGroupCds 計算に使用
- [ ] `userId` が undefined の場合は安全に空配列でフォールバック

### Step 4: バックエンド — workerProjectService でも同様に DB 取得

**ファイル**: `backend/src/services/workerProjectService.ts`

- [ ] メソッド冒頭で `organizationGroupRepository.findByUser(organizationId, userId)` を呼び出す
- [ ] 引数の `organizationGroupCds` を内部で上書き（または削除）する
- [ ] `workerProjectController.ts` からの引数渡しも整合（不要になる場合は削除）
- [ ] 型定義 `IWorkerProjectService` / `workerProject.ts` のシグネチャを更新

### Step 5: 型定義・コメント整理

- [ ] `backend/src/types/project.ts` の `ListOptions.organizationGroupCds` に
  `@deprecated DB から直接取得するため使用されていない` コメント追加
- [ ] `backend/src/types/workerProject.ts` の `listWorkerAccessible` シグネチャを更新（引数変更に応じて）

---

## 5. 影響範囲

### バックエンド変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `backend/src/controllers/organizationGroupController.ts` | 修正 | グループ作成後に JWT 再発行・レスポンスに追加 |
| `backend/src/services/projectService.ts` | 修正 | `list` 内で DB から organizationGroupCds を再取得 |
| `backend/src/services/workerProjectService.ts` | 修正 | `listWorkerAccessible` 内で DB から再取得 |
| `backend/src/controllers/workerProjectController.ts` | 修正 | `organizationGroupCds` 引数渡しの整合 |
| `backend/src/types/project.ts` | コメント | `ListOptions.organizationGroupCds` 非推奨コメント |
| `backend/src/types/workerProject.ts` | 修正 | `listWorkerAccessible` シグネチャ更新 |

### フロントエンド変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `frontend/src/services/organizationGroupApiService.ts` | 修正 | グループ作成後に accessToken と userInfo 更新 |

### 変更しないファイル

- `authService.ts`（BE/FE）・`authHelpers.ts`・`jwtService.ts`・`refreshTokenService.ts`
- `projectController.ts`（`organizationGroupCdsList` の渡し方はそのまま残す）
- フロントエンドの認証コンテキスト

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| プロジェクト一覧取得のDBクエリが1回増える（パフォーマンス） | 低 | 高 | `findByUser` は軽量（index使用）のため問題なし |
| `workerProjectController.test.ts` が organizationGroupCds 引数前提で壊れる | 中 | 中 | テストを確認・修正する |
| organizationGroupController での JwtService 初期化（環境変数不足） | 中 | 低 | 既存の authHelpers.ts を参考に実装 |
| 他ユーザー起因のグループ変更は方針A では対応不可 | 中 | 低 | 方針B（DB直接参照）で補完・許容範囲として明記 |

---

## 7. テスト計画

### 手動テスト

- [ ] ログイン → 新規グループ作成 → 新規グループでプロジェクト作成 → 一覧で表示・編集可能
- [ ] 既存グループでのプロジェクト作成・一覧表示・編集が引き続き動作
- [ ] グループ作成後に `localStorage['userInfo'].organizationGroupCds` が更新されていること（DevTools 確認）
- [ ] SystemAdmin は全プロジェクトを閲覧・編集できること

### ユニットテスト確認

- [ ] `backend/tests/controllers/workerProjectController.test.ts` を確認・修正

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-17 15:30
- **承認日時**: 2026-09-17 16:00
- **承認者コメント**: 承認。実装完了。

