# タスク計画書: プロジェクト管理画面 組織階層グループによるフィルタリング

## メタデータ
- **作成日時**: 2026-07-13 15:14
- **タスクID**: project-org-group-filter
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

プロジェクト管理画面（および進捗管理画面）において、部署フィルタを廃止し、組織階層グループ（organization_group）に基づくフィルタリングに切り替える。

具体的には以下のルールを実装する：
- ユーザーが **直接所属しているグループとその配下（子孫）グループ** に属するプロジェクトのみを取得・表示する
- ユーザーが **直接所属しているグループ** に属するプロジェクトのみが **編集可能**
- ユーザーが所属する **配下グループ** のプロジェクトは **閲覧のみ**
- システム管理者（`role_cd = 'ROLE002'`）は **全プロジェクトを取得・編集可能**

## 目的と期待される成果

### 目的
組織が部署管理から組織階層グループ管理に移行したことに伴い、プロジェクトのアクセス制御を新しい階層構造に対応させる。

### 期待される成果
- [ ] SystemAdmin（ROLE002）はすべてのプロジェクトを閲覧・編集できる
- [ ] SystemAdmin以外のユーザーは、自グループ＋配下グループのプロジェクトのみ取得できる
- [ ] 自グループのプロジェクトのみ編集可能（フロントエンドで編集ボタンを制御）
- [ ] ProgressMonitoring.tsx でも同様に絞り込みが効く（バックエンドAPI共通のため自動対応）

## 実装ステップ

### Phase 1: バックエンド — 配下グループ再帰取得

- [ ] `organizationGroupRepository.ts` に `findDescendantCds()` を追加
  - 引数: `organizationId: string, rootCds: string[]`
  - WITH RECURSIVE でルート群それぞれの配下（自身含む）を取得し、重複除去した `string[]` を返す
  - SQLファイル: `backend/src/sql/queries/organization_groups/findDescendantCds.sql`

### Phase 2: バックエンド — projectRepository / SQL 変更

- [ ] `findAllWithDetails.sql` に `visibleGroupCds` によるフィルタ条件を追加
  - `AND ($3::text[] IS NULL OR p.organization_group_cd = ANY($3::text[]))`
  - `$3` が NULL の場合は全件返す（SystemAdmin用）
- [ ] `countAll.sql` に同様の `visibleGroupCds` フィルタを追加
- [ ] `projectRepository.ts` の `findAllWithDetails()` / `countAll()` の引数・型定義を更新
- [ ] 各レコードに `is_editable: boolean` を追加（`organization_group_cd = ANY($4::text[])` で直接所属グループか判定）
  - `findAllWithDetails.sql` の SELECT に `p.organization_group_cd = ANY($4::text[]) AS is_editable` を追加

### Phase 3: バックエンド — projectService / controller 変更

- [ ] `projectService.ts` の `list()` を変更
  - 引数: `organizationGroupCds: string[]`, `roleCd: string` を追加
  - `roleCd === 'ROLE002'` の場合: `visibleGroupCds = null`, `editableGroupCds = null`（全件・全編集可）
  - それ以外:
    1. 直接所属グループから最上位ルート群を算出（他の所属グループの子孫を除外）
    2. ルート群の配下CDを再帰取得 → `visibleGroupCds`
    3. `editableGroupCds = organizationGroupCds`（直接所属グループのみ）
  - `projectRepository.findAllWithDetails()` / `countAll()` に `visibleGroupCds`, `editableGroupCds` を渡す
- [ ] `projectController.ts` の `list()` を変更
  - `req.user.organizationGroupCds` と `req.user.roleCd` をServiceに渡す

### Phase 4: フロントエンド — 型定義変更

- [ ] `frontend/src/types/project.ts` の `Project` インタフェースに `isEditable: boolean` を追加

### Phase 5: フロントエンド — ProjectManagement.tsx の編集ボタン制御

- [ ] `selectedProject?.isEditable === false` の場合、以下を `disabled` にする
  - アップロードボタン
  - リネームボタン
  - 削除ボタン
  - チェックアウト/チェックインボタン
  - 暗号化ボタン
  - 署名/検証ボタン
  - 承認依頼ボタン
  - タスク登録ボタン
  - 公開/非公開ボタン
- [ ] 部署フィルタのラベル変更は不要（既にプロジェクトデータの`organizationGroup`フィールドを使って動的生成しているため、返却プロジェクトに合わせて自動的に変わる）

## 影響範囲

### 変更するファイル
1. `backend/src/repositories/organizationGroupRepository.ts` — `findDescendantCds()` 追加
2. `backend/src/sql/queries/organization_groups/findDescendantCds.sql` — 新規作成
3. `backend/src/sql/queries/projects/findAllWithDetails.sql` — `visibleGroupCds`, `is_editable` フィルタ追加
4. `backend/src/sql/queries/projects/countAll.sql` — `visibleGroupCds` フィルタ追加
5. `backend/src/repositories/projectRepository.ts` — 引数・型・SQLパラメータ更新
6. `backend/src/services/projectService.ts` — グループ絞り込みロジック追加
7. `backend/src/controllers/projectController.ts` — `organizationGroupCds`, `roleCd` 取得・渡し

### 新規作成するファイル
1. `backend/src/sql/queries/organization_groups/findDescendantCds.sql`

### 変更するフロントエンドファイル
1. `frontend/src/types/project.ts` — `Project.isEditable` 追加
2. `frontend/src/components/project/ProjectManagement.tsx` — 編集ボタン制御追加

### 影響を受ける機能
- `GET /api/v1/projects` エンドポイント（ProjectManagement.tsx, ProgressMonitoring.tsx 共通）
- プロジェクト操作系ボタン（UI制御のみ）

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| organizationGroupCds が null/空の場合（グループ未所属ユーザー） | 高 | 中 | 空配列の場合は0件を返す |
| WITH RECURSIVE が大きな階層で遅くなる | 中 | 低 | 階層が深くなりすぎる場合はMAXDEPTHを設定 |
| roleCd が 'ROLE002' 以外のSystemAdmin相当ロールが将来登場した場合 | 低 | 低 | コメントに明記して将来の拡張に備える |
| ProgressMonitoring 画面でフィルタが意図せず変わる | 中 | 中 | 動作確認で明示的にテスト |

## テスト計画

### 手動テスト
- [ ] SystemAdmin（ROLE002）でログイン → 全プロジェクトが表示される、全プロジェクト編集可
- [ ] 一般ユーザー（1グループ所属）でログイン → 自グループ＋配下のプロジェクトのみ表示、自グループのみ編集可（配下は閲覧のみ）
- [ ] 複数グループ所属ユーザー → 各グループ＋配下の合算が表示、直接所属グループのみ編集可
- [ ] グループ未所属ユーザー → 0件表示（エラーにならない）
- [ ] ProgressMonitoring.tsx でも正しく絞り込みされる

## 承認記録

- **計画書提示日時**: 2026-07-13 15:14
- **承認日時**: -
- **承認者コメント**: -

## 実施記録

### 実施日時
開始: -
完了: -

### 計画からの変更点
-

### 発生した問題と解決方法
-

### 最終的な成果物
-
